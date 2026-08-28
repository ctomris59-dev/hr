export type CompetencyCode = "DIG" | "ANA" | "RES" | "DET" | "LRN" | "ETH" | "DIS" | "STR" | "TEA" | "COM";
export type DevelopmentLevel = 1 | 2 | 3 | 4;
export type InterventionType = "Mikro Öğrenme" | "Uygulamalı Eğitim" | "İş Üstünde Uygulama" | "Gelişim Projesi" | "Koçluk / Mentorluk" | "Liderlik Uygulaması";

export interface DevelopmentIntervention {
  id: string;
  competencyCode: CompetencyCode;
  competencyLabel: string;
  level: DevelopmentLevel;
  levelLabel: "Temel" | "Uygulama" | "İleri" | "Liderlik";
  type: InterventionType;
  name: string;
  duration: string;
  description: string;
  evidenceMechanisms: string[];
  transferTask: string;
  successMetric: string;
  reassessDays: number;
  evidenceBasis: string;
}

export const DEVELOPMENT_EVIDENCE_REFERENCES = [
  { key: "distributed-retrieval", label: "Aralıklı tekrar + geri çağırma uygulaması", reference: "Dunlosky et al., 2013" },
  { key: "feedback", label: "Hedefe dönük geri bildirim", reference: "Hattie & Timperley, 2007" },
  { key: "goal-setting", label: "Spesifik hedef + ilerleme takibi", reference: "Locke & Latham, 2002" },
  { key: "training-transfer", label: "Uygulama, geri bildirim ve işe transfer tasarımı", reference: "Salas et al., 2012" },
] as const;

const LABELS: Record<CompetencyCode, string> = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: "Dayanıklılık & Stres Yönetimi",
  TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
};

const BLUEPRINTS: Record<CompetencyCode, {
  micro: string; workshop: string; practice: string; project: string; coaching: string; leadership: string;
  transfer: string; metric: string;
}> = {
  DIG: {
    micro: "Dijital Çalışma Temelleri ve Güvenli AI Kullanımı",
    workshop: "Excel, Veri Görselleştirme ve Dijital Verimlilik",
    practice: "Tekrarlayan Bir İşi No-Code / AI ile İyileştirme",
    project: "Departman Dijital Süreç İyileştirme Sprinti",
    coaching: "Dijital Çalışma Alışkanlıkları Mentorluğu",
    leadership: "Dijital Dönüşüm İçin Liderlik ve Teknoloji Kararları",
    transfer: "Haftalık yapılan bir işi seç, mevcut süreyi ölç, güvenli bir dijital yöntemle iyileştir ve önce/sonra çıktısını kaydet.",
    metric: "En az %15 süre/hata azalması veya doğrulanmış bir süreç iyileştirmesi.",
  },
  ANA: {
    micro: "Problem Tanımlama, Hipotez ve Kanıt",
    workshop: "Kök Neden Analizi ve Veriyle Karar Verme",
    practice: "Gerçek İş Problemi Üzerinde 5 Why + Pareto Uygulaması",
    project: "Veri Temelli İyileştirme Vakası",
    coaching: "Analitik Muhakeme Review Görüşmeleri",
    leadership: "Belirsizlik Altında Analitik Karar ve Senaryo Tasarımı",
    transfer: "Gerçek bir iş problemini veri, hipotez, alternatif açıklama ve sonuç bölümleriyle analiz et.",
    metric: "Yönetici tarafından doğrulanan analiz; en az 2 alternatif hipotez ve ölçülebilir aksiyon.",
  },
  RES: {
    micro: "Hedefi Çıktıya Çevirme ve Önceliklendirme",
    workshop: "OKR/KPI, Milestone ve İcra Disiplini",
    practice: "Haftalık Öncelik ve Taahhüt Döngüsü",
    project: "90 Günlük Sonuç Hızlandırma Projesi",
    coaching: "Hedef Takip ve Engel Kaldırma Koçluğu",
    leadership: "Execution Management ve Hesap Verebilirlik Ritmi",
    transfer: "Bir hedefi haftalık çıktılara, sahiplerine ve başarı göstergelerine bölerek takip et.",
    metric: "Planlanan kritik çıktıların en az %85'i zamanında tamamlanmış ve sapmalar gerekçelendirilmiş olmalı.",
  },
  DET: {
    micro: "Hata Türleri, Kontrol Noktaları ve Checklist Tasarımı",
    workshop: "Kalite Güvencesi, Proofing ve Hata Önleme",
    practice: "Kritik İş İçin İki Aşamalı Kontrol Rutini",
    project: "Hata Kaynağı Azaltma ve Süreç Standardizasyonu",
    coaching: "Detay-Kalite Review Mentorluğu",
    leadership: "Kalite Kültürü ve Sistematik Hata Önleme",
    transfer: "Sık hata oluşan bir çıktıya checklist, ikinci kontrol ve hata kayıt mekanizması uygula.",
    metric: "Seçilen süreçte 6-8 hafta içinde tekrarlayan hata oranında ölçülebilir düşüş.",
  },
  LRN: {
    micro: "Öğrenmeyi Öğrenme: Geri Çağırma ve Aralıklı Tekrar",
    workshop: "Deliberate Practice ve Geri Bildirimle Öğrenme",
    practice: "4 Haftalık Öğrenme Günlüğü ve Retrieval Rutini",
    project: "Yeni Bir Yetkinliği İş Çıktısına Dönüştürme",
    coaching: "Gelişim Refleksiyonu ve Öğrenme Koçluğu",
    leadership: "Öğrenen Takım Ritüelleri ve Bilgi Paylaşım Sistemi",
    transfer: "Yeni öğrendiğin bir yöntemi 4 hafta boyunca aralıklı uygula, hatırlama testi ve iş örneğiyle kanıtla.",
    metric: "En az 4 uygulama kaydı, 2 geri bildirim döngüsü ve doğrulanmış iş çıktısı.",
  },
  ETH: {
    micro: "Etik Karar Verme, Çıkar Çatışması ve KVKK Temelleri",
    workshop: "Etik İkilemler, Uyum ve Vaka Analizi",
    practice: "Etik Risk Kontrol Listesi ile Karar Review",
    project: "Departman Uyum Risk Haritası",
    coaching: "Etik Karar ve Uyum Mentorluğu",
    leadership: "Speak-Up Kültürü, Etik Liderlik ve Kontrol Ortamı",
    transfer: "Gerçek bir iş kararını paydaş, risk, mevzuat/politika ve çıkar çatışması açısından yapılandırılmış olarak değerlendir.",
    metric: "Belgelenmiş risk değerlendirmesi ve gerekli kontrol/eskalasyon adımlarının uygulanması.",
  },
  DIS: {
    micro: "Odak, Zaman Bloklama ve Uygulama Niyetleri",
    workshop: "Öncelik Yönetimi ve Kişisel İş Sistemi",
    practice: "14 Günlük Odak ve Taahhüt Takibi",
    project: "Kişisel İş Akışı ve Teslimat Güvenilirliği İyileştirmesi",
    coaching: "Öz-Yönetim ve Alışkanlık Koçluğu",
    leadership: "Yönetici Olarak Öncelik, Delegasyon ve Çalışma Ritmi",
    transfer: "İki haftalık planında günlük en önemli çıktıyı önceden belirle ve gerçekleşme/sapma nedenini kaydet.",
    metric: "Planlanan kritik taahhütlerin en az %85 gerçekleşmesi ve gecikme nedenlerinde azalma.",
  },
  STR: {
    micro: "Stres Tepkisini Tanıma ve İş Yükü Düzenleme",
    workshop: "Baskı Altında Duygu Düzenleme ve Problem Çözme",
    practice: "Yoğun Dönem İçin Recovery + İş Yükü Planı",
    project: "Takım İş Yükü ve Dayanıklılık İyileştirme Sprinti",
    coaching: "Dayanıklılık, Sınır Koyma ve Enerji Yönetimi Koçluğu",
    leadership: "Krizde Liderlik, Kapasite ve Sürdürülebilir Performans",
    transfer: "Yoğun bir iş döneminde tetikleyici, kontrol edilebilir alan, destek ihtiyacı ve recovery planını haftalık izle.",
    metric: "Planlı iş yükü uygulaması, zamanında eskalasyon ve 6 hafta boyunca sürdürülebilir teslimat göstergeleri.",
  },
  TEA: {
    micro: "Takım Sözleşmesi, Güven ve İşbirliği Temelleri",
    workshop: "Çatışma Yönetimi ve Psikolojik Güvenlik",
    practice: "Yapılandırılmış Takım Retro ve Aksiyon Takibi",
    project: "Fonksiyonlar Arası İşbirliği Projesi",
    coaching: "Takım İçi İşbirliği ve Çatışma Mentorluğu",
    leadership: "Yüksek Performanslı Takım Sistemleri ve Güven İklimi",
    transfer: "Bir ekip çalışmasında rol, beklenti, karar yöntemi ve çatışma çözüm kuralını açıkça belirleyip retro yap.",
    metric: "En az 2 retro, net aksiyon sahipliği ve ekip/yönetici tarafından doğrulanan işbirliği iyileşmesi.",
  },
  COM: {
    micro: "Aktif Dinleme ve Mesajı Netleştirme",
    workshop: "Geri Bildirim, Zor Görüşmeler ve İkna",
    practice: "SBI Geri Bildirim ve Dinleme Uygulaması",
    project: "Kritik Paydaş İletişim Planı",
    coaching: "İletişim Davranışı Gözlem ve Geri Bildirim Koçluğu",
    leadership: "Executive Communication, Etkileme ve Zor Diyaloglar",
    transfer: "Gerçek bir görüşmede amaç, hedef kitle, ana mesaj ve beklenen aksiyonu önceden tanımla; sonrasında geri bildirim al.",
    metric: "En az 3 gerçek görüşme uygulaması ve yönetici/peer tarafından doğrulanan davranış örnekleri.",
  },
};

const LEVEL_LABEL: Record<DevelopmentLevel, DevelopmentIntervention["levelLabel"]> = { 1: "Temel", 2: "Uygulama", 3: "İleri", 4: "Liderlik" };
const STAGES: Array<{ key: keyof typeof BLUEPRINTS[CompetencyCode]; level: DevelopmentLevel; type: InterventionType; duration: string; mechanisms: string[]; prefix: string; reassessDays: number }> = [
  { key: "micro", level: 1, type: "Mikro Öğrenme", duration: "45-60 dk", mechanisms: ["geri çağırma", "aralıklı tekrar"], prefix: "Temel kavram + kısa uygulama", reassessDays: 30 },
  { key: "workshop", level: 2, type: "Uygulamalı Eğitim", duration: "4 saat", mechanisms: ["aktif uygulama", "geri bildirim"], prefix: "Vaka, pratik ve geri bildirim", reassessDays: 45 },
  { key: "practice", level: 2, type: "İş Üstünde Uygulama", duration: "2-4 hafta", mechanisms: ["işe transfer", "aralıklı uygulama", "geri bildirim"], prefix: "Gerçek iş üzerinde davranış pratiği", reassessDays: 60 },
  { key: "project", level: 3, type: "Gelişim Projesi", duration: "6-8 hafta", mechanisms: ["aktif uygulama", "işe transfer", "hedef takibi"], prefix: "Ölçülebilir iş çıktısı", reassessDays: 75 },
  { key: "coaching", level: 3, type: "Koçluk / Mentorluk", duration: "6 hafta", mechanisms: ["geri bildirim", "hedef takibi", "yansıtma"], prefix: "Gözlem + refleksiyon + tekrar", reassessDays: 75 },
  { key: "leadership", level: 4, type: "Liderlik Uygulaması", duration: "8-12 hafta", mechanisms: ["işe transfer", "geri bildirim", "hedef takibi"], prefix: "Sistem/takım düzeyinde uygulama", reassessDays: 90 },
];

export const DEVELOPMENT_LIBRARY: DevelopmentIntervention[] = (Object.keys(BLUEPRINTS) as CompetencyCode[]).flatMap((code) => {
  const blueprint = BLUEPRINTS[code];
  return STAGES.map((stage, index) => ({
    id: `${code}-${String(index + 1).padStart(2, "0")}`,
    competencyCode: code,
    competencyLabel: LABELS[code],
    level: stage.level,
    levelLabel: LEVEL_LABEL[stage.level],
    type: stage.type,
    name: String(blueprint[stage.key]),
    duration: stage.duration,
    description: `${stage.prefix}. ${LABELS[code]} gelişimini pasif içerik tüketimi yerine uygulama ve doğrulanabilir iş kanıtıyla destekler.`,
    evidenceMechanisms: stage.mechanisms,
    transferTask: blueprint.transfer,
    successMetric: blueprint.metric,
    reassessDays: stage.reassessDays,
    evidenceBasis: "FutureHR kanıta dayalı tasarım: aktif uygulama/işe transfer, hedefe dönük geri bildirim, aralıklı tekrar veya hedef takibi bileşenlerinden en az ikisini içerir.",
  }));
});

export function findDevelopmentIntervention(id: string) {
  return DEVELOPMENT_LIBRARY.find((item) => item.id === id);
}

export function interventionsForCompetency(codeOrLabel: string, maxLevel: DevelopmentLevel = 4) {
  const needle = String(codeOrLabel || "").toLocaleLowerCase("tr-TR");
  return DEVELOPMENT_LIBRARY.filter((item) =>
    item.level <= maxLevel && (item.competencyCode.toLocaleLowerCase("tr-TR") === needle || item.competencyLabel.toLocaleLowerCase("tr-TR") === needle)
  );
}

export function recommendedInterventions(codeOrLabel: string, actual: number, expected: number, limit = 3) {
  const gap = Math.max(0, Number(expected || 0) - Number(actual || 0));
  const preferredLevel: DevelopmentLevel = gap >= 1.2 ? 2 : gap >= 0.7 ? 3 : 2;
  const candidates = interventionsForCompetency(codeOrLabel, 4);
  return candidates
    .sort((a, b) => Math.abs(a.level - preferredLevel) - Math.abs(b.level - preferredLevel) || a.level - b.level)
    .slice(0, limit);
}

export function learningEvidenceForEmployee(employeeName: string, assignments: any[]) {
  return (assignments || [])
    .filter((item: any) => item.employee === employeeName && item.status === "Tamamlandı")
    .map((item: any) => {
      const intervention = findDevelopmentIntervention(item.trainingId);
      return {
        trainingId: item.trainingId,
        trainingName: item.trainingName || intervention?.name || "Gelişim müdahalesi",
        competency: item.competencyCode || intervention?.competencyCode || null,
        level: item.developmentLevel || intervention?.level || null,
        completedAt: item.completedAt || null,
        transferEvidence: item.transferEvidence || null,
        managerVerified: Boolean(item.managerVerified),
        reassessDueAt: item.reassessDueAt || null,
      };
    });
}
