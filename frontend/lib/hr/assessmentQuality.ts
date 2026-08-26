import type { AssessmentQuestion } from "@/app/data/questions";

export interface AssessmentQualityResult {
  score: number;
  band: "Yüksek" | "Orta" | "Dikkatle İncele";
  completeness: number;
  qualityItemCompleteness: number;
  idealizedSelfPresentation: number;
  dominantResponseShare: number;
  reverseItemDifference: number;
  secondsPerItem: number | null;
  flags: string[];
  note: string;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]): number {
  if (!values.length) return 0;
  const avg = mean(values);
  return mean(values.map((value) => Math.pow(value - avg, 2)));
}

const AGREE_RISK_WEIGHTS: Record<number, number> = {
  1: 0,
  2: 0.05,
  3: 0.2,
  4: 0.65,
  5: 1,
};

const DISAGREE_RISK_WEIGHTS: Record<number, number> = {
  1: 1,
  2: 0.65,
  3: 0.2,
  4: 0.05,
  5: 0,
};

function idealizationRisk(question: AssessmentQuestion, value: number): number {
  const direction = question.qualityDirection || "AGREE_RISK";
  return direction === "DISAGREE_RISK"
    ? DISAGREE_RISK_WEIGHTS[value] ?? 0
    : AGREE_RISK_WEIGHTS[value] ?? 0;
}

/**
 * Yanıt Kalitesi Endeksi
 *
 * Bir yalan tespit aracı, dürüstlük puanı veya psikolojik tanı değildir.
 * Yalnızca değerlendirme verisinin ne kadar dikkatle yorumlanması gerektiğine
 * ilişkin yardımcı sinyaller üretir:
 * - çekirdek ve yanıt-kalitesi maddelerinin tamamlanması,
 * - çift yönlü idealize kendini sunma örüntüsü,
 * - tek seçeneğe yığılma / straight-lining,
 * - normal ve ters maddeler arasındaki belirgin uyuşmazlık,
 * - olağandışı hızlı tamamlama.
 *
 * Eşikler ürün içi kalite kontrol eşikleridir; norm çalışması yapıldığında
 * gerçek örneklem dağılımına göre yeniden kalibre edilmelidir.
 */
export function calculateAssessmentQuality(
  questions: AssessmentQuestion[],
  answers: Record<number, number>,
  durationSeconds: number | null
): AssessmentQualityResult {
  const coreQuestions = questions.filter((question) => question.category !== "LIE");
  const qualityQuestions = questions.filter((question) => question.category === "LIE");

  const answeredCore = coreQuestions.filter((question) =>
    Number.isFinite(answers[question.id])
  );
  const answeredQuality = qualityQuestions.filter((question) =>
    Number.isFinite(answers[question.id])
  );
  const coreValues = answeredCore.map((question) => answers[question.id]);

  const completeness = coreQuestions.length
    ? answeredCore.length / coreQuestions.length
    : 0;
  const qualityItemCompleteness = qualityQuestions.length
    ? answeredQuality.length / qualityQuestions.length
    : 0;

  // Yeni maddeler iki yönlü anahtarlanır:
  // AGREE_RISK: kusursuzluk iddiasına yüksek katılım risk sinyalidir.
  // DISAGREE_RISK: olağan insan hatasını kategorik biçimde reddetmek risk sinyalidir.
  // Böylece "tüm maddelere 1 verme" gibi önceki paradoks oluşmaz.
  const idealizationRisks = answeredQuality.map((question) =>
    idealizationRisk(question, answers[question.id])
  );
  const idealizedSelfPresentation = idealizationRisks.length
    ? Math.round(mean(idealizationRisks) * 100)
    : 0;

  const responseCounts = new Map<number, number>();
  coreValues.forEach((value) =>
    responseCounts.set(value, (responseCounts.get(value) || 0) + 1)
  );
  const dominantCount = Math.max(0, ...Array.from(responseCounts.values()));
  const dominantResponseShare = coreValues.length
    ? dominantCount / coreValues.length
    : 0;
  const coreVariance = variance(coreValues);

  const categories = Array.from(
    new Set(coreQuestions.map((question) => question.category))
  );
  const reverseDifferences: number[] = [];
  categories.forEach((category) => {
    const standard = coreQuestions
      .filter(
        (question) => question.category === category && question.type === "S"
      )
      .map((question) => answers[question.id])
      .filter((value) => Number.isFinite(value));
    const reversed = coreQuestions
      .filter(
        (question) => question.category === category && question.type === "R"
      )
      .map((question) => answers[question.id])
      .filter((value) => Number.isFinite(value))
      .map((value) => 6 - value);
    if (standard.length && reversed.length) {
      reverseDifferences.push(Math.abs(mean(standard) - mean(reversed)));
    }
  });
  const reverseItemDifference = reverseDifferences.length
    ? mean(reverseDifferences)
    : 0;

  const answeredTotal = answeredCore.length + answeredQuality.length;
  const secondsPerItem =
    durationSeconds && answeredTotal ? durationSeconds / answeredTotal : null;

  const flags: string[] = [];
  let penalty = 0;

  if (completeness < 1) {
    const missingShare = 1 - completeness;
    penalty += Math.min(40, missingShare * 80);
    flags.push(
      `Çekirdek maddelerin %${Math.round(completeness * 100)} kadarı yanıtlandı.`
    );
  }

  if (qualityItemCompleteness < 0.8) {
    penalty += Math.min(12, (0.8 - qualityItemCompleteness) * 30);
    flags.push("Yanıt-kalitesi maddelerinin önemli bir bölümü eksik.");
  }

  if (idealizedSelfPresentation >= 60) {
    penalty += Math.min(25, (idealizedSelfPresentation - 50) * 0.5);
    flags.push("İdealize edilmiş kendini sunma sinyali yüksek.");
  } else if (idealizedSelfPresentation >= 42) {
    penalty += 5;
    flags.push("İdealize edilmiş kendini sunma sinyali orta düzeyde.");
  }

  if (dominantResponseShare >= 0.7) {
    penalty += 18;
    flags.push("Yanıtlar tek bir seçeneğe olağandışı ölçüde yığılmış.");
  } else if (dominantResponseShare >= 0.6) {
    penalty += 8;
    flags.push("Yanıt dağılımı sınırlı çeşitlilik gösteriyor.");
  }

  if (coreVariance < 0.35) {
    penalty += 12;
    flags.push("Çekirdek maddelerde yanıt varyansı çok düşük.");
  } else if (coreVariance < 0.55) {
    penalty += 5;
  }

  if (reverseItemDifference >= 1.25) {
    penalty += 15;
    flags.push("Normal ve ters maddeler arasında belirgin uyuşmazlık var.");
  } else if (reverseItemDifference >= 0.9) {
    penalty += 6;
  }

  if (secondsPerItem !== null && secondsPerItem < 3.5) {
    penalty += 15;
    flags.push("Tamamlama hızı olağandışı yüksek.");
  } else if (secondsPerItem !== null && secondsPerItem < 5) {
    penalty += 7;
    flags.push("Tamamlama hızı hızlı; sonuçlar dikkatle yorumlanmalı.");
  }

  const score = Math.round(Math.max(0, Math.min(100, 100 - penalty)));
  const band: AssessmentQualityResult["band"] =
    score >= 80 ? "Yüksek" : score >= 60 ? "Orta" : "Dikkatle İncele";

  return {
    score,
    band,
    completeness: Math.round(completeness * 100),
    qualityItemCompleteness: Math.round(qualityItemCompleteness * 100),
    idealizedSelfPresentation,
    dominantResponseShare: Math.round(dominantResponseShare * 100),
    reverseItemDifference: Number(reverseItemDifference.toFixed(2)),
    secondsPerItem: secondsPerItem === null ? null : Number(secondsPerItem.toFixed(1)),
    flags,
    note:
      "Yanıt Kalitesi Endeksi yalnızca veri kalitesi sinyalidir; yalan, dürüstlük veya manipülasyon ölçümü değildir ve işe alım, terfi ya da ücret kararında tek başına kullanılamaz.",
  };
}

// Eski kayıtları/çağrıları bozmamak için geriye dönük uyumluluk.
// Yön metadata'sı bulunmadığından eski fonksiyon yalnızca tek yönlü idealizasyon
// sinyali üretebilir; yeni değerlendirmelerde calculateAssessmentQuality kullanılır.
export function calculateResponseConsistency(answers: number[]) {
  const valid = answers.filter(
    (value) => Number.isFinite(value) && value >= 1 && value <= 5
  );
  const idealization = valid.length
    ? Math.round(mean(valid.map((value) => AGREE_RISK_WEIGHTS[value] ?? 0)) * 100)
    : 100;
  const score = Math.max(0, 100 - idealization);
  return {
    score,
    band:
      score >= 75 ? "Tutarlı" : score >= 55 ? "Dikkatle İncele" : "Düşük Güven",
    note:
      "Bu geriye dönük uyumluluk çıktısı yalnızca idealize edilmiş kendini sunma sinyalidir; dürüstlük ölçümü değildir.",
  };
}
