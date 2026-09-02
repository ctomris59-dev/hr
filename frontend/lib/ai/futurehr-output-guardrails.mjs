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
function arrays(root, key) {
  const found = [];
  const visit = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    for (const [k, child] of Object.entries(v)) {
      if (k === key && Array.isArray(child)) found.push(child);
      visit(child);
    }
  };
  visit(root);
  return found;
}
function findObject(root, key) {
  let match = null;
  const visit = (v) => {
    if (match || !v || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (const item of v) visit(item); return; }
    for (const [k, child] of Object.entries(v)) {
      if (k === key && child && typeof child === 'object' && !Array.isArray(child)) { match = child; return; }
      visit(child);
      if (match) return;
    }
  };
  visit(root);
  return match;
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

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function fold(value) {
  return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
}
function normalizeGap(item) {
  if (!item || typeof item !== 'object') return null;
  const label = String(item.label || item.competency || item.competencyLabel || item.yetkinlik || item.competency_name || '').trim();
  const actual = finite(item.actual ?? item.current ?? item.currentScore ?? item.mevcut ?? item.score);
  const target = finite(item.target ?? item.expected ?? item.targetScore ?? item.hedef ?? item.required);
  const declaredGap = finite(item.gap);
  const gap = declaredGap ?? (actual !== null && target !== null ? target - actual : null);
  if (!label || fold(label) === 'yetkinlik' || actual === null || target === null) return null;
  return { label, actual, target, gap };
}
function trainingTitleFromAction(action) {
  if (!action || typeof action !== 'object') return '';
  const kind = String(action.kind || action.actionKind || '');
  if (kind !== 'prepare_training_assignment') return '';
  const direct = String(action.trainingName || action.title || '').trim();
  if (direct && !/eğitim atama taslağı/i.test(direct)) return direct;
  const description = String(action.description || '').trim();
  const match = description.match(/^(.+?)\s+için\s+atama\s+taslağ/i);
  return match ? match[1].trim() : '';
}

function trainingRecommendation(out, q, ctx) {
  const asksTraining = /(hangi.*eğitim|hangi.*egitim|eğitim(?:leri)?\s+(?:almalı|almali|öner|oner)|ne.*eğitim|ne.*egitim|gelişim.*(?:öner|oner)|gelisim.*(?:öner|oner)|yetkinlik.*geliştir|yetkinlik.*gelistir)/i.test(q);
  if (!asksTraining) return false;

  const catalogInterventions = [
    ...arrays(ctx, 'recommendedInterventions').flat(),
    ...arrays(ctx, 'trainingAdvice').flat(),
  ]
    .filter((item) => item && typeof item === 'object' && item.alreadyCompleted !== true)
    .map((item) => ({ ...item, name: String(item.name || item.trainingName || '').trim() }))
    .filter((item) => item.name);

  const preparedInterventions = arrays(ctx, 'preparedActions').flat()
    .map((action) => ({
      name: trainingTitleFromAction(action),
      source: 'preparedAction',
      route: action?.route || '/egitim',
    }))
    .filter((item) => item.name);

  const interventions = [...catalogInterventions, ...preparedInterventions]
    .filter((item, index, rows) => rows.findIndex((row) => fold(row.name) === fold(item.name)) === index)
    .slice(0, 3);

  const rawGaps = arrays(ctx, 'competencyGaps').flat();
  const gaps = rawGaps.map(normalizeGap).filter(Boolean)
    .filter((item, index, rows) => rows.findIndex((row) => fold(row.label) === fold(item.label)) === index)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 4);

  if (interventions.length) {
    const details = interventions.map((item, index) => {
      const competency = String(item.competency || item.competencyLabel || '').trim();
      const gap = finite(item.gap);
      const duration = String(item.duration || '').trim();
      const reassessDays = finite(item.reassessDays);
      const parts = [`${index + 1}) ${item.name}${competency ? ` — ${competency}` : ''}`];
      if (gap !== null && gap > 0) parts.push(`açık ${gap}`);
      if (duration) parts.push(duration);
      if (reassessDays !== null && reassessDays > 0) parts.push(`${reassessDays} gün sonra yeniden ölçüm`);
      return parts.join(' · ');
    });
    const gapSummary = gaps.length
      ? ` Ölçülmüş öncelikli açıklar: ${gaps.slice(0, 3).map((gap) => `${gap.label} ${gap.actual} → ${gap.target}`).join('; ')}.`
      : ' Yetkinlik ad/skor ayrıntıları bu güvenli bağlamda eksik olduğundan skor uydurulmadı.';

    setAnswer(
      out,
      `FutureHR kayıtlarına göre önerilen gelişim müdahaleleri: ${details.join('; ')}.${gapSummary} Tamamlanmış eğitimler gerekçesiz tekrar önerilmedi.`,
      gaps.length ? 'yüksek' : 'orta',
      gaps.length
        ? 'Eğitim adları kayıtlı gelişim danışmanı veya hazırlanmış eğitim atama kanıtından; açıklar ölçülmüş rol-yetkinlik verisinden alındı.'
        : 'Eğitim adları hazırlanmış FutureHR eğitim atama kanıtından güvenli biçimde kurtarıldı; yetkinlik skorları eksik olduğu için tahmin edilmedi.',
    );

    out.recommendations = interventions.map((item, index) => ({
      title: item.name,
      why: String(item.competency || item.competencyLabel || gaps[index]?.label || 'Kayıtlı gelişim ihtiyacı') + ' için gelişim müdahalesi.',
      evidence: gaps[index]
        ? `${gaps[index].label}: ${gaps[index].actual} → ${gaps[index].target}`
        : 'FutureHR hazırlanmış eğitim atama/gelişim danışmanı kaydı',
      route: '/egitim',
    }));
    out.nextActions = [
      { label: 'Eğitim atama taslağı hazırla', route: '/egitim', actionKind: 'prepare_training_assignment' },
      { label: 'Gelişim planını aç', route: '/gelisim', actionKind: 'open_development' },
    ];
    const existingEvidence = Array.isArray(out.evidenceSources) ? out.evidenceSources : [];
    const evidence = [];
    if (gaps.length) evidence.push({
      label: 'Rol & Yetkinlik Açıkları',
      detail: gaps.slice(0, 3).map((gap) => `${gap.label}: ${gap.actual} → ${gap.target}`).join(' · '),
      route: '/rol-mimarisi',
      domain: 'development',
      confidence: 'yüksek',
      value: `${gaps.length} doğrulanmış açık`,
    });
    evidence.push({
      label: 'FutureHR Eğitim Önerisi',
      detail: `${interventions.length} kayıtlı/ hazırlanmış gelişim müdahalesi`,
      route: '/egitim',
      domain: 'development',
      confidence: gaps.length ? 'yüksek' : 'orta',
      value: interventions.map((item) => item.name).join(', '),
    });
    out.evidenceSources = [...existingEvidence, ...evidence].slice(0, 6);
    out.evidenceGaps = gaps.length ? [] : ['Yetkinlik adı ve mevcut/hedef skor alanları güvenli bağlamda eksik.'];
    out.guardrail = 'Eğitim adı yalnız FutureHR gelişim danışmanı veya hazırlanmış eğitim atama kaydından alınır; eksik yetkinlik adı/skoru tahmin edilmez.';
    return true;
  }

  if (gaps.length) {
    setAnswer(
      out,
      `Ölçülmüş gelişim açıkları: ${gaps.slice(0, 3).map((gap) => `${gap.label} (${gap.actual} → ${gap.target})`).join(', ')}. Bu açıklarla eşleşen kayıtlı veya hazırlanmış eğitim müdahalesi bulunamadı; eğitim adı uydurulmadı.`,
      'orta',
      'Yetkinlik açıkları doğrulanabilir; ancak FutureHR eğitim kütüphanesi/atama kaydında eşleşen müdahale görünmüyor.',
    );
    out.nextActions = [{ label: 'Eğitim kütüphanesini aç', route: '/egitim', actionKind: 'open_training' }];
    return true;
  }

  if (rawGaps.length) {
    setAnswer(
      out,
      'FutureHR gelişim açığı sinyali taşıyor; ancak yetkinlik adı ile mevcut/hedef skor alanları bu bağlamda eksik. “Yetkinlik (— → —)” şeklinde sahte ayrıntı gösterilmeyecek. Rol Mimarisi ve son değerlendirme veri eşleşmesi kontrol edilmeli.',
      'düşük',
      'Eksik yetkinlik alanları nedeniyle doğrulanabilir açık ayrıntısı üretilemedi.',
    );
    out.nextActions = [
      { label: 'Rol mimarisini aç', route: '/rol-mimarisi', actionKind: 'open_development' },
      { label: 'Gelişim planını aç', route: '/gelisim', actionKind: 'open_development' },
    ];
    return true;
  }

  return false;
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

  trainingRecommendation(out, q, ctx);

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

  const latest = findObject(ctx, 'latest');
  const previous = findObject(ctx, 'previous');
  if (latest && previous && /(pulse|katılım|iyi gidiyor)/i.test(q)) {
    const lp = Number(latest.participation), pp = Number(previous.participation);
    if (Number.isFinite(lp) && Number.isFinite(pp) && lp < pp - 20) {
      setAnswer(out, `Pulse skoru yükselmiş olsa bile katılım ${pp}'den ${lp}'e düştüğü için iyileşme sonucu temkinli yorumlanmalıdır. Önce katılım düşüşünün örneklem etkisi incelenmeli.`, 'orta', 'Katılım oranı ciddi düşmüş.');
    }
  }

  const lowest = findObject(ctx, 'lowestDriver');
  const lowestLabel = String(lowest?.label || '').toLocaleLowerCase('tr-TR');
  const lowestAverage = Number(lowest?.average);
  if (lowest && lowestLabel.includes('iş yükü') && Number.isFinite(lowestAverage) && lowestAverage < 3 && (q.includes('iş yükü') || q.includes('öncelik') || q.includes('deneyim'))) {
    setAnswer(out, `İş Yükü sürücüsü ${lowestAverage} ile düşük. Öncelik iş yükünü artırmak değil; aşırı yükü azaltmak, kapasiteyi dengelemek ve yeniden pulse ölçümü yapmaktır.`, 'yüksek', 'En düşük deneyim sürücüsü iş yükü.');
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
