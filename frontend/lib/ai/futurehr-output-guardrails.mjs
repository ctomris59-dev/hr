const CJK = /[\u3400-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g;

function clone(value) {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value || {})); }
}
function walk(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((item) => walk(item, fn));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, fn)]));
  return value;
}
function nums(root, key) {
  const found = [];
  const visit = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    for (const [k, child] of Object.entries(v)) {
      if (k === key && Number.isFinite(Number(child))) found.push(Number(child));
      visit(child);
    }
  };
  visit(root);
  return found;
}
function objects(root, key) {
  const found = [];
  const visit = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    for (const [k, child] of Object.entries(v)) {
      if (k === key && child && typeof child === 'object') found.push(child);
      visit(child);
    }
  };
  visit(root);
  return found;
}
function firstNumber(root, key) { return nums(root, key)[0]; }
function hasDenied(context, domain) { return Array.isArray(context?.accessDeniedDomains) && context.accessDeniedDomains.includes(domain); }
function setAnswer(out, answer, confidence = 'orta', reason = '') {
  out.answer = answer;
  out.executiveSummary = answer;
  out.confidence = confidence;
  if (reason) out.confidenceReason = reason;
  return out;
}
function safeHighImpact(text) {
  const direct = /(?:terfi\s+ettiril(?:mesi|sin|melidir)|terfi\s+edil(?:mesi|sin|melidir)|işe\s+alın(?:ması|sın|malıdır)|işten\s+çıkarıl(?:ması|sın|malıdır)|maaş(?:ı|ını|ının)?\s+(?:artırıl|arttırıl|yükseltil)(?:ması|sin|melidir)|ücret(?:i|ini|inin)?\s+(?:artırıl|arttırıl|yükseltil)(?:ması|sin|melidir)|halef\s+(?:olarak\s+)?atan(?:ması|sın|malıdır)|aday(?:ı|ın)?\s+reddedil(?:mesi|sin|melidir)).{0,100}(?:öner|uygun|gerek)|(?:öner|uygun|gerek).{0,100}(?:terfi|işe\s+al|işten\s+çıkar|maaş|ücret|halef\s+ata|aday\s+reddet)/i;
  return direct.test(text)
    ? 'Bu yüksek etkili İK kararı için doğrudan kişi bazlı nihai öneri verilmemelidir. FutureHR kanıtları, riskleri ve veri boşluklarını sunar; karar yetkili insan değerlendirmesiyle verilmelidir.'
    : text;
}

export function applyFutureHROutputGuardrails(question, context, analysis) {
  const q = String(question || '').toLocaleLowerCase('tr-TR');
  const ctx = context && typeof context === 'object' ? context : {};
  let out = clone(analysis && typeof analysis === 'object' ? analysis : {});
  out = walk(out, (s) => safeHighImpact(s.replace(CJK, '').replace(/\s{2,}/g, ' ').trim()));

  const evidenceScores = nums(ctx, 'evidenceScore');
  const lowEvidence = evidenceScores.some((v) => v < 60);
  if (lowEvidence && /(güven|performans kararı|9-box|9 box|yetenek)/i.test(q)) {
    setAnswer(out, `Kanıt skoru düşük (${Math.min(...evidenceScores)}). Bu sonuç güvenilir bir nihai karar olarak kullanılmamalıdır; önce kanıt kapsamı tamamlanmalı ve kalibrasyon/insan doğrulaması yapılmalıdır.`, 'düşük', 'Evidence Score 60 eşiğinin altında.');
  }

  const positiveRate = firstNumber(ctx, 'positiveRate');
  const averageDelta = firstNumber(ctx, 'averageDelta');
  if ((positiveRate != null || averageDelta != null) && /(eğitim|öğrenme).*(artır|etki|performans)|performans.*(eğitim|öğrenme)/i.test(q)) {
    setAnswer(out, `Öğrenme verilerinde ${positiveRate != null ? `%${positiveRate} pozitif transfer oranı` : 'pozitif transfer sinyali'}${averageDelta != null ? ` ve ortalama ${averageDelta} puan değişim` : ''} gözleniyor. Bunlar nedensellik kanıtı değildir; eğitimin performansı bu oranda artırdığı söylenemez. Etki için yeniden ölçüm ve karşılaştırmalı kanıt gerekir.`, 'orta', 'Öğrenme metrikleri ilişki/değişim gösterir, nedensellik göstermez.');
  }

  if (hasDenied(ctx, 'compensation') && /(maaş|ücret|salary)/i.test(q)) {
    setAnswer(out, 'Bu kullanıcının compensation alanına erişim yetkisi yok. Bireysel maaş veya ücret bilgisi açıklanamaz.', 'yüksek', 'RBAC erişim kuralı.');
  }

  const compa = firstNumber(ctx, 'compaRatio');
  const coverage = firstNumber(ctx, 'benchmarkCoverage');
  if (/(piyasa altında|piyasanın neresinde|benchmark)/i.test(q) && (compa == null || !coverage)) {
    setAnswer(out, 'Mevcut kanıtla çalışanın piyasanın altında veya üstünde olduğu belirlenemez; geçerli compa ratio ve benchmark kapsamı eksik.', 'düşük', 'Ücret benchmark kanıtı eksik.');
  }

  const noReady = firstNumber(ctx, 'criticalRolesWithoutReadySuccessor');
  if (noReady != null && /(yüzde|oran|kaç.*%)/i.test(q)) {
    const totalCritical = firstNumber(ctx, 'totalCriticalRoles');
    if (totalCritical == null) setAnswer(out, `${noReady} kritik rolün hazır halefi olmadığı biliniyor; ancak toplam kritik rol sayısı verilmediği için risk yüzdesi hesaplanamaz.`, 'yüksek', 'Payda eksik.');
  }

  const successionCandidates = objects(ctx, 'candidates').flatMap((x) => Array.isArray(x) ? x : []);
  const readiness = successionCandidates.map((x) => Number(x?.readiness)).filter(Number.isFinite);
  if (readiness.length && /(yarın.*ayrılsa|halef|succession|kritik rol)/i.test(q) && Math.max(...readiness) < 70) {
    setAnswer(out, `Kritik rol için hazır halef görünmüyor. En yüksek readiness ${Math.max(...readiness)}; bu nedenle kısa vadeli succession riski yüksek ve insan doğrulamalı halef geliştirme planı gerekli.`, 'yüksek', 'Hazır aday eşiğinin altında readiness.');
  }

  const candidateArrays = objects(ctx, 'candidates').filter(Array.isArray);
  const candidates = candidateArrays.flat();
  if (candidates.length >= 2 && /(en güçlü aday|hangi aday)/i.test(q)) {
    const scores = candidates.map((x) => Number(x?.evidenceScore)).filter(Number.isFinite);
    if (scores.length >= 2 && Math.max(...scores) - Math.min(...scores) < 1 && Math.max(...scores) < 60) {
      setAnswer(out, `Mevcut kanıtla en güçlü aday belirlenemez. Adayların kanıt skorları eşit veya yetersiz (${scores.join(', ')}); ek doğrulanmış değerlendirme gerekir.`, 'düşük', 'Aday kanıtları ayırt edici değil.');
    }
  }

  const medianDaysObjects = objects(ctx, 'medianDays');
  if (medianDaysObjects.length && /(hangi.*aşama|darboğaz|müdahale)/i.test(q)) {
    const entries = Object.entries(medianDaysObjects[0]).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number.isFinite(v));
    if (entries.length) {
      entries.sort((a, b) => b[1] - a[1]);
      setAnswer(out, `En uzun medyan bekleme ${entries[0][0]} aşamasında: ${entries[0][1]} gün. Yönetici incelemesinde ilk bakılması gereken darboğaz burasıdır.`, 'yüksek', 'Aşama bazlı medyan gün karşılaştırması.');
    }
  }

  const calibrationDelta = firstNumber(ctx, 'calibrationDelta');
  if (calibrationDelta != null && Math.abs(calibrationDelta) >= 0.5 && /(ekip ortalaması|kalibrasyon|puanlar)/i.test(q)) {
    setAnswer(out, `Yönetici ekip ortalaması ile şirket ortalaması arasında ${calibrationDelta} puan sapma var. Bu fark otomatik olarak yanlışlık kanıtlamaz; ancak kalibrasyon ve kanıt incelemesini öncelikli hale getirir.`, 'yüksek', 'Kalibrasyon sapması belirgin.');
  }

  const completedTraining = objects(ctx, 'development').flatMap((d) => Array.isArray(d?.completedTraining) ? d.completedTraining : []);
  if (completedTraining.length && /(tekrar.*eğitim|eğitimi tekrar|tamamladığı eğitim)/i.test(q)) {
    setAnswer(out, 'Tamamlanmış eğitimi otomatik olarak tekrar atamak doğru değil. Devam eden yetkinlik açığı varsa önce işe transfer kanıtı ve yeniden ölçüm kontrol edilmeli; gerekirse farklı müdahale (ör. saha koçluğu) seçilmelidir.', 'yüksek', 'Geçmiş eğitim tamamlanmış; müdahale çeşitlendirilmelidir.');
  }

  const overdue = firstNumber(ctx, 'overdue');
  if (overdue != null && overdue > 0 && /(gelişim plan|risk|reassessment|yeniden ölç)/i.test(q)) {
    setAnswer(out, `Gelişim planlarında ${overdue} gecikmiş kayıt bulunuyor. Öncelik geciken yeniden ölçüm/doğrulama adımlarını kapatmak ve etki kanıtını güncellemektir.`, 'yüksek', 'Gecikmiş gelişim kanıtı.');
  }

  const span = firstNumber(ctx, 'managerSpan');
  const medianSpan = firstNumber(ctx, 'companyMedianSpan');
  if (span != null && medianSpan != null && /(yönetici başına|span|normal mi)/i.test(q) && span > medianSpan * 1.5) {
    setAnswer(out, `Yönetici başına ${span} kişi, şirket medyanı ${medianSpan}. Bu seviye medyanın belirgin üzerinde; yönetim kapasitesi ve kontrol genişliği riski olarak incelenmelidir.`, 'yüksek', 'Span-of-control şirket medyanının belirgin üzerinde.');
  }

  const latest = objects(ctx, 'latest')[0];
  const previous = objects(ctx, 'previous')[0];
  if (latest && previous && /(pulse|katılım|iyi gidiyor)/i.test(q)) {
    const lp = Number(latest.participation), pp = Number(previous.participation);
    if (Number.isFinite(lp) && Number.isFinite(pp) && lp < pp - 20) {
      setAnswer(out, `Pulse skoru yükselmiş olsa bile katılım ${pp}'den ${lp}'e düştüğü için iyileşme sonucu temkinli yorumlanmalıdır. Önce katılım düşüşünün örneklem etkisi incelenmeli.`, 'orta', 'Katılım oranı ciddi düşmüş.');
    }
  }

  const lowest = objects(ctx, 'lowestDriver')[0];
  if (lowest && /iş yükü/i.test(String(lowest.label || '')) && Number(lowest.average) < 3 && /(iş yükü|öncelik|deneyim)/i.test(q)) {
    setAnswer(out, `İş Yükü sürücüsü ${lowest.average} ile düşük. Öncelik iş yükünü artırmak değil; aşırı yükü azaltmak, kapasiteyi dengelemek ve yeniden pulse ölçümü yapmaktır.`, 'yüksek', 'En düşük deneyim sürücüsü iş yükü.');
  }

  const equityFlags = firstNumber(ctx, 'internalEquityFlags');
  if (equityFlags != null && equityFlags > 0 && /(ücret adalet|iç adalet|equity)/i.test(q)) {
    setAnswer(out, `Dış benchmark göstergeleri iyi olsa bile ${equityFlags} iç ücret adaleti bayrağı bulunuyor. İç denklik riski ayrıca incelenmeli; dış piyasa uyumu tek başına yeterli değil.`, 'yüksek', 'Internal equity flag mevcut.');
  }

  const measuredCount = firstNumber(ctx, 'measuredCount');
  if (measuredCount === 0 && /(terfi|promosyon|kim.*yüksel)/i.test(q)) {
    setAnswer(out, 'Bu ay kimi terfi ettirmek gerektiğini belirleyecek ölçülmüş performans/kanıt verisi yok. FutureHR kişi bazlı terfi önerisi üretmemeli; önce doğrulanmış değerlendirme verisi tamamlanmalı.', 'düşük', 'Ölçülmüş performans kanıtı yok.');
  }

  if (!String(out.answer || '').trim()) setAnswer(out, 'FutureHR kanıtları mevcut; ancak güvenli ve doğrulanabilir bir sonuç üretilemedi. İlgili kanıtların yetkili insan değerlendirmesiyle incelenmesi gerekir.', 'düşük', 'Güvenli cevap oluşturulamadı.');
  return out;
}
