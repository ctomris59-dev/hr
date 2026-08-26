export interface ConsistencyResult {
  score: number;
  band: "Tutarlı" | "Dikkatle İncele" | "Düşük Güven";
  note: string;
}

/**
 * Bu gösterge bir yalan tespit aracı değildir ve kişilik/klinik tanı üretmez.
 * Yalnızca LIE kategorisindeki maddelerde aşırı uç cevapların yoğunluğunu
 * işaretleyen basit bir yanıt-kalitesi sinyalidir. İşe alım/terfi kararı için
 * tek başına kullanılamaz.
 */
export function calculateResponseConsistency(answers: number[]): ConsistencyResult {
  if (!answers.length) {
    return { score: 0, band: "Düşük Güven", note: "Tutarlılık maddesi bulunamadı." };
  }
  const valid = answers.filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  if (!valid.length) {
    return { score: 0, band: "Düşük Güven", note: "Geçerli tutarlılık yanıtı bulunamadı." };
  }

  const extremeShare = valid.filter((value) => value === 1 || value === 5).length / valid.length;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / valid.length;
  const lowVariancePenalty = variance < 0.15 ? 20 : variance < 0.3 ? 8 : 0;
  const extremePenalty = Math.max(0, (extremeShare - 0.6) * 80);
  const score = Math.round(Math.max(0, Math.min(100, 100 - lowVariancePenalty - extremePenalty)));
  const band = score >= 75 ? "Tutarlı" : score >= 55 ? "Dikkatle İncele" : "Düşük Güven";
  return {
    score,
    band,
    note: "Yanıt tutarlılığı yalnızca veri kalitesi göstergesidir; dürüstlük veya manipülasyon ölçümü değildir.",
  };
}
