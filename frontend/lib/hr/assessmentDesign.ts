import type { AssessmentQuestion, CompetencyCode } from "@/app/data/questions";

export interface ValidationScenarioOption {
  id: string;
  label: string;
  score: 1 | 2 | 3 | 4;
}

export interface ValidationScenario {
  id: string;
  title: string;
  prompt: string;
  competencies: Exclude<CompetencyCode, "LIE">[];
  options: ValidationScenarioOption[];
}

export interface ScenarioEvidence {
  scenarioId: string;
  selectedOptionId: string;
  score: number;
  maxScore: number;
  competencies: string[];
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded<T>(items: T[], seedText: string): T[] {
  const random = mulberry32(hashSeed(seedText));
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

/**
 * Kontrollü randomizasyon:
 * - aynı yetkinliğin maddeleri arka arkaya gelmez,
 * - her yetkinlik tur içinde dengeli dağılır,
 * - yanıt-kalitesi maddeleri testin sonuna blok halinde yığılmaz,
 * - aynı seed aynı sırayı üretir; böylece denetim izi korunur.
 */
export function buildControlledQuestionOrder(
  questions: AssessmentQuestion[],
  seed: string
): AssessmentQuestion[] {
  const validity = shuffleSeeded(
    questions.filter((question) => question.category === "LIE"),
    `${seed}:validity`
  );

  const categoryCodes = Array.from(
    new Set(
      questions
        .filter((question) => question.category !== "LIE")
        .map((question) => question.category)
    )
  );

  const buckets = new Map<string, AssessmentQuestion[]>();
  categoryCodes.forEach((category) => {
    buckets.set(
      category,
      shuffleSeeded(
        questions.filter((question) => question.category === category),
        `${seed}:${category}`
      )
    );
  });

  const coreOrder: AssessmentQuestion[] = [];
  let round = 0;
  while (coreOrder.length < questions.length - validity.length) {
    const roundCategories = shuffleSeeded(categoryCodes, `${seed}:round:${round}`);
    for (const category of roundCategories) {
      const bucket = buckets.get(category) || [];
      const next = bucket.shift();
      if (!next) continue;
      const previous = coreOrder[coreOrder.length - 1];
      if (previous?.category === next.category) {
        const alternativeCategory = roundCategories.find((candidate) => {
          const candidateBucket = buckets.get(candidate) || [];
          return candidate !== category && candidateBucket.length > 0;
        });
        if (alternativeCategory) {
          const alternativeBucket = buckets.get(alternativeCategory)!;
          const alternative = alternativeBucket.shift();
          if (alternative) coreOrder.push(alternative);
        }
      }
      coreOrder.push(next);
    }
    round += 1;
  }

  const combined = [...coreOrder];
  validity.forEach((question, index) => {
    const idealPosition = Math.min(
      combined.length,
      Math.round(((index + 1) * coreOrder.length) / (validity.length + 1)) + index
    );
    combined.splice(idealPosition, 0, question);
  });

  return combined.slice(0, questions.length);
}

export const VALIDATION_SCENARIOS: ValidationScenario[] = [
  {
    id: "digital-source-conflict",
    title: "Dijital veri doğrulama",
    prompt:
      "Kullandığınız raporlama ekranında satış rakamı ile kaynak sistemdeki rakam birbirini tutmuyor. Yönetim toplantısına 20 dakika var. Ne yaparsınız?",
    competencies: ["DIG", "ANA", "DET"],
    options: [
      { id: "a", label: "Sunum gecikmesin diye raporlama ekranındaki rakamı kullanırım.", score: 1 },
      { id: "b", label: "İki kaynağın zaman damgasını ve veri akışını kontrol edip farkı not düşerim.", score: 4 },
      { id: "c", label: "En yüksek görünen rakamı seçerim; toplantıda açıklamak daha kolay olur.", score: 1 },
      { id: "d", label: "Rakamı sunumdan tamamen çıkarır, nedenini araştırmayı sonraya bırakırım.", score: 2 },
    ],
  },
  {
    id: "ethics-target-pressure",
    title: "Etik baskı altında karar",
    prompt:
      "Çeyrek hedefinin tutması için bir işlem prosedür dışı biçimde bu aya yazılabilir. İşlem şirkete kısa vadede avantaj sağlayacak. Nasıl ilerlersiniz?",
    competencies: ["ETH", "RES"],
    options: [
      { id: "a", label: "Hedef önemli olduğu için işlemi bu aya yazarım.", score: 1 },
      { id: "b", label: "Riski görünür kılar, prosedüre uygun alternatif veya gerekli onay yolunu ararım.", score: 4 },
      { id: "c", label: "Kararı başka bir çalışana bırakırım.", score: 2 },
      { id: "d", label: "Hiçbir seçenek üretmeden işlemi reddederim.", score: 3 },
    ],
  },
  {
    id: "resilience-pressure-recovery",
    title: "Baskı altında toparlanma",
    prompt:
      "Kritik bir teslimden kısa süre önce önemli bir hata ortaya çıkıyor. Zaman daralıyor ve ekipte gerilim yükseliyor. Nasıl ilerlersiniz?",
    competencies: ["STR", "RES", "COM"],
    options: [
      { id: "a", label: "Panik büyümeden hızlıca birini sorumlu tutar ve ilk çözümü uygularım.", score: 1 },
      { id: "b", label: "Durumu kısa biçimde netleştirir, öncelikleri ayırır, iletişim tonunu korur ve uygulanabilir bir çözüm planı oluştururum.", score: 4 },
      { id: "c", label: "Önce hatayı kimin yaptığını kesinleştirir, sonra çözüm ararım.", score: 1 },
      { id: "d", label: "Gerilimi azaltmak için sorunu tamamen üstlenir ve ekiple paylaşmam.", score: 2 },
    ],
  },
  {
    id: "team-constructive-disagreement",
    title: "Yapıcı görüş ayrılığı",
    prompt:
      "Ekip toplantısında çoğunluk bir çözümü destekliyor ancak siz önemli bir risk görüyorsunuz. Kararın bugün verilmesi gerekiyor. Ne yaparsınız?",
    competencies: ["TEA", "COM"],
    options: [
      { id: "a", label: "Uyumu bozmamak için itiraz etmem.", score: 1 },
      { id: "b", label: "Riski somut gerekçelerle açıklar, alternatif önerir ve karar verildikten sonra uygulamayı desteklerim.", score: 4 },
      { id: "c", label: "Karar yanlışsa sorumluluk almamak için toplantı tutanağına itirazımı yazdırırım.", score: 2 },
      { id: "d", label: "Çoğunluğu ikna edene kadar kararı geciktiririm.", score: 2 },
    ],
  },
  {
    id: "deadline-quality-balance",
    title: "Sonuç ve kalite dengesi",
    prompt:
      "Teslim tarihine az kaldı ve ekip son kontrolde önemli fakat düzeltilebilir bir hata buldu. Tam düzeltme teslimi geciktirebilir. Ne yaparsınız?",
    competencies: ["RES", "DET", "DIS"],
    options: [
      { id: "a", label: "Tarih kaçmasın diye hatayı olduğu gibi bırakırım.", score: 1 },
      { id: "b", label: "Hatanın etkisini değerlendirir, kritik kontrolü tamamlar ve gerekiyorsa kapsam/süre değişikliğini paydaşla netleştiririm.", score: 4 },
      { id: "c", label: "Teslimi süresiz erteler, tüm ürünü baştan kontrol ederim.", score: 2 },
      { id: "d", label: "Hatanın sorumlusunu bulmadan ilerlemem.", score: 1 },
    ],
  },
  {
    id: "learning-feedback-transfer",
    title: "Geri bildirimden öğrenme",
    prompt:
      "Yeni bir araçla hazırladığınız çalışma ikinci kez benzer bir hata nedeniyle geri dönüyor. Ne yaparsınız?",
    competencies: ["LRN", "DIS", "DIG"],
    options: [
      { id: "a", label: "Araç bana uygun değil diye eski yönteme dönerim.", score: 1 },
      { id: "b", label: "Hata örüntüsünü inceler, geri bildirim ister ve tekrarını önleyecek kısa bir kontrol yöntemi oluştururum.", score: 4 },
      { id: "c", label: "Bir çalışma arkadaşından işi benim yerime tamamlamasını isterim.", score: 1 },
      { id: "d", label: "Bu kez hatayı düzeltir ama yöntemi değiştirmem.", score: 2 },
    ],
  },
];

export function selectValidationScenarios(seed: string, count = 4): ValidationScenario[] {
  return shuffleSeeded(VALIDATION_SCENARIOS, `${seed}:scenarios`).slice(0, count);
}

export function summarizeScenarioEvidence(
  scenarios: ValidationScenario[],
  answers: Record<string, string>
) {
  const evidence: ScenarioEvidence[] = scenarios.map((scenario) => {
    const selectedOptionId = answers[scenario.id] || "";
    const option = scenario.options.find((candidate) => candidate.id === selectedOptionId);
    return {
      scenarioId: scenario.id,
      selectedOptionId,
      score: option?.score || 0,
      maxScore: 4,
      competencies: scenario.competencies,
    };
  });
  const answered = evidence.filter((item) => item.selectedOptionId);
  const total = answered.reduce((sum, item) => sum + item.score, 0);
  const max = answered.reduce((sum, item) => sum + item.maxScore, 0);
  return {
    evidence,
    answeredCount: answered.length,
    alignmentPercent: max > 0 ? Math.round((total / max) * 100) : 0,
    note:
      "Davranışsal senaryolar temel yetkinlik puanını değiştirmez; self-report sonuçlarını destekleyen ayrı bir kanıt katmanıdır.",
  };
}
