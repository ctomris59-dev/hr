// FHR-COMP-JOB-2.0 — Batch 1: TSO + Yönetim Kurulu + CEO + Strateji
const R = "Dayanıklılık & Stres Yönetimi";
const p=(DIG:number,ANA:number,RES:number,DET:number,LRN:number,ETH:number,DIS:number,STR:number,TEA:number,COM:number)=>({"Dijital Okuryazarlık":DIG,"Analitik Düşünme":ANA,"Sonuç Odaklılık":RES,"Detaylara Özen":DET,"Sürekli Öğrenme":LRN,"Etik ve Uyum":ETH,"Öz-Disiplin":DIS,[R]:STR,"Takım Çalışması":TEA,"İletişim Becerileri":COM});
const w=(DIG:number,ANA:number,RES:number,DET:number,LRN:number,ETH:number,DIS:number,STR:number,TEA:number,COM:number)=>({"Dijital Okuryazarlık":DIG,"Analitik Düşünme":ANA,"Sonuç Odaklılık":RES,"Detaylara Özen":DET,"Sürekli Öğrenme":LRN,"Etik ve Uyum":ETH,"Öz-Disiplin":DIS,[R]:STR,"Takım Çalışması":TEA,"İletişim Becerileri":COM});

export const BATCH1_PROFILES: Record<string,Record<string,number>> = {
"Genel Sekreter":p(4.2,4.6,4.7,4.4,4.6,4.9,4.8,4.6,4.6,4.8),
"Genel Sekreter Yardımcısı":p(4.2,4.5,4.6,4.5,4.5,4.9,4.8,4.5,4.6,4.7),
"Başkanlık Sekreterya Sorumlusu":p(4.1,3.8,4.4,4.9,4.1,4.9,4.9,4.5,4.1,4.8),
"Ticaret Sicil Servisi Müdürü":p(4.3,4.5,4.4,4.9,4.6,5.0,4.9,4.3,4.1,4.4),
"Ticaret Sicil Müdür Yardımcısı":p(4.2,4.4,4.3,4.9,4.5,5.0,4.8,4.2,4.2,4.3),
"Ticaret Sicil Tescil Yetkilisi":p(4.1,4.2,4.0,5.0,4.3,5.0,4.8,4.0,3.9,4.1),
"Kapasite Servis Sorumlusu":p(4.2,4.7,4.4,4.8,4.5,4.7,4.6,4.0,4.0,4.2),
"Kapasite Servis Görevlisi":p(4.0,4.4,4.0,4.7,4.2,4.6,4.5,3.9,3.9,3.8),
"Proje ve Sanayi Sorumlusu":p(4.6,4.7,4.7,4.3,4.8,4.6,4.5,4.5,4.7,4.7),
"Arge Servis Sorumlusu":p(4.8,4.9,4.4,4.4,4.9,4.4,4.3,4.3,4.4,4.2),
"Kalite ve Akreditasyon Sorumlusu":p(4.3,4.6,4.2,5.0,4.6,5.0,4.9,4.1,4.0,4.4),
"Araştırma Servis Sorumlusu":p(4.8,4.9,4.1,4.6,4.9,4.4,4.3,4.2,3.8,4.2),
"Araştırma Servis Görevlisi":p(4.4,4.6,3.9,4.5,4.6,4.2,4.2,4.0,3.7,3.8),
"Muhasebe Servis Sorumlusu":p(4.2,4.7,4.4,5.0,4.1,5.0,4.9,4.2,3.8,3.9),
"Muhasebe Servis Görevlisi":p(4.0,4.3,4.0,5.0,3.8,5.0,4.8,4.0,3.7,3.4),
"Yazı İşleri Servis Sorumlusu":p(4.2,3.7,4.1,5.0,4.0,4.9,4.8,4.2,4.0,4.6),
"Yazı İşleri Servis Görevlisi":p(4.0,3.4,3.9,4.9,3.7,4.8,4.6,4.0,3.9,4.2),
"Dijital Arşivleme Sorumlusu":p(4.8,3.9,4.0,5.0,4.2,4.8,4.8,3.8,3.4,3.4),
"Basın Yayın ve Halkla İlişkiler Sorumlusu":p(4.8,3.9,4.4,4.1,4.7,4.5,4.3,4.5,4.7,5.0),
"Basın Yayın ve Halkla İlişkiler Servis Görevlisi":p(4.6,3.6,4.1,4.4,4.5,4.4,4.2,4.3,4.6,4.9),
"İletişim ve Danışma Sorumlusu":p(4.0,3.5,4.2,4.0,4.1,4.7,4.6,4.5,4.5,5.0),
"Bilgi İşlem Servis Sorumlusu":p(5.0,4.8,4.5,4.6,5.0,4.6,4.5,4.3,4.0,4.1),
"Bakım Onarım Sorumlusu":p(3.3,4.0,4.6,4.5,3.9,4.3,4.7,4.5,4.2,3.5),
"Bakım Onarım Görevlisi":p(3.0,3.5,4.4,4.4,3.5,4.2,4.6,4.4,4.1,3.2),
"Destek Personel Sorumlusu":p(3.4,3.5,4.5,4.3,3.8,4.7,4.8,4.4,4.6,4.2),
"Makam Şoförü":p(3.0,3.2,4.7,4.9,3.2,4.9,5.0,4.9,3.4,4.0),
"Makam Güvenlik":p(3.0,3.8,4.3,5.0,3.4,5.0,5.0,5.0,4.0,3.8),
"Eğitim Sorumlusu":p(4.3,4.0,4.3,4.4,5.0,4.6,4.7,4.2,4.6,5.0),
"Yönetim Kurulu Başkanı":p(3.8,4.4,4.8,3.8,4.5,5.0,4.8,4.7,4.7,4.9),
"Yönetim Kurulu Başkan Yardımcısı":p(3.8,4.3,4.7,3.8,4.4,5.0,4.7,4.6,4.6,4.8),
"Yönetim Kurulu Üyesi":p(3.7,4.2,4.6,3.8,4.3,5.0,4.6,4.5,4.5,4.7),
"İcra Kurulu Başkanı (CEO)":p(4.2,4.6,4.9,4.0,4.7,5.0,4.9,4.8,4.7,4.9),
"İcra Kurulu Başkan Yardımcısı (Deputy CEO)":p(4.2,4.5,4.8,4.1,4.6,5.0,4.8,4.7,4.7,4.8),
"Grup CEO / Global CEO":p(4.3,4.7,4.9,4.0,4.8,5.0,4.9,4.9,4.8,4.9),
"Bölge CEO (EMEA / Americas / APAC)":p(4.2,4.6,4.8,4.1,4.6,5.0,4.8,4.8,4.7,4.9),
"CSO (Chief Strategy Officer)":p(4.4,4.9,4.7,4.1,4.9,4.8,4.7,4.7,4.5,4.8),
"Strateji Başkan Yardımcısı":p(4.4,4.8,4.6,4.2,4.8,4.8,4.6,4.6,4.4,4.7),
"Kurumsal Strateji Direktörü":p(4.5,4.9,4.5,4.3,4.9,4.7,4.6,4.5,4.3,4.6),
"Stratejik Planlama Müdürü":p(4.4,4.8,4.4,4.5,4.8,4.7,4.5,4.4,4.2,4.5),
"Strateji Uzmanı":p(4.5,4.9,4.2,4.7,4.8,4.5,4.4,4.2,4.0,4.3),
"Strateji Analisti":p(4.6,5.0,4.0,4.9,4.8,4.4,4.3,4.1,3.9,4.1),
"Strateji Asistanı":p(4.0,4.1,3.9,4.7,4.3,4.5,4.6,3.9,3.9,4.0)
};

const T={
executive:w(7,12,15,5,10,12,10,11,8,10),governance:w(5,12,13,4,9,15,8,10,10,14),strategy:w(9,18,10,10,14,8,8,7,7,9),
registry:w(8,12,9,18,9,17,12,5,4,6),research:w(13,20,8,13,16,7,7,5,5,6),project:w(10,13,15,8,13,8,8,8,8,9),
admin:w(7,5,9,17,6,14,16,8,7,11),comms:w(8,5,8,8,7,10,10,10,12,22),it:w(20,17,11,12,15,8,7,4,3,3),
maintenance:w(4,9,17,15,8,8,15,10,9,5),security:w(3,6,10,20,5,17,17,16,3,3),driver:w(4,5,15,18,5,15,18,14,2,4),
learning:w(8,8,9,8,22,9,10,6,8,12),accounting:w(8,14,10,20,7,17,13,5,3,3),quality:w(8,12,8,19,11,16,13,5,4,4)};
const cfg:Record<string,{family:string;level:string;confidence:string;template:keyof typeof T;evidence:string[];rationale:string}>={};
const a=(roles:string[],family:string,level:string,confidence:string,template:keyof typeof T,evidence:string[],rationale:string)=>roles.forEach(role=>cfg[role]={family,level,confidence,template,evidence,rationale});
const O="O*NET occupational/work-style benchmark",E="ESCO v1.2.1 skills-occupation crosswalk",P="OPM job analysis + SME validation";
a(["Genel Sekreter"],"TSO Tepe Yönetim","L7","C","executive",[O,E,P],"Oda genel yönetimi; sonuç, etik, dayanıklılık, paydaş ve karar sorumluluğu birlikte kalibre edildi.");
a(["Genel Sekreter Yardımcısı"],"TSO Tepe Yönetim","L6","C","executive",[O,E,P],"Tepe yönetime yakın, nihai karar sorumluluğu Genel Sekreterden daha sınırlı yönetim profili.");
a(["Başkanlık Sekreterya Sorumlusu","Yazı İşleri Servis Sorumlusu","Yazı İşleri Servis Görevlisi","Dijital Arşivleme Sorumlusu"],"TSO İdari Kayıt","L4","C","admin",[E,P],"Kayıt doğruluğu, gizlilik, disiplin ve paydaş iletişimi ağırlıklı yerel iş analizi.");
a(["Ticaret Sicil Servisi Müdürü","Ticaret Sicil Müdür Yardımcısı","Ticaret Sicil Tescil Yetkilisi"],"TSO Sicil ve Mevzuat","L5","B","registry",[O,E,P],"Mevzuat ve resmi kayıt işlerinde hata maliyeti yüksek; detay, etik ve disiplin kritik.");
a(["Kapasite Servis Sorumlusu","Kapasite Servis Görevlisi"],"TSO Kapasite ve Teknik İnceleme","L4","C","research",[E,P],"Teknik veri inceleme ve doğruluk gerektiren TSO-özel composite benchmark.");
a(["Proje ve Sanayi Sorumlusu"],"TSO Proje ve Sanayi","L4","B","project",[O,E,P],"Teslim, koordinasyon, analitik çalışma ve öğrenme çevikliği birlikte ayırt edici.");
a(["Arge Servis Sorumlusu","Araştırma Servis Sorumlusu","Araştırma Servis Görevlisi"],"TSO Araştırma ve Ar-Ge","L4","B","research",[O,E,P],"Analitik düşünme, dijital veri kullanımı ve sürekli öğrenme çekirdek gerekliliklerdir.");
a(["Kalite ve Akreditasyon Sorumlusu"],"TSO Kalite ve Akreditasyon","L4","B","quality",[O,E,P],"Doğruluk, etik-uyum ve disiplin yüksek hata maliyeti nedeniyle kritik.");
a(["Muhasebe Servis Sorumlusu","Muhasebe Servis Görevlisi"],"TSO Muhasebe","L4","B","accounting",[O,E,P],"Finansal kayıt doğruluğu, etik ve güvenilirlik rol başarısının temel belirleyicileri.");
a(["Basın Yayın ve Halkla İlişkiler Sorumlusu","Basın Yayın ve Halkla İlişkiler Servis Görevlisi","İletişim ve Danışma Sorumlusu"],"TSO İletişim","L4","B","comms",[O,E,P],"İletişim ve işbirliği ayırt edici; değişken paydaş ortamı dayanıklılık gerektirir.");
a(["Bilgi İşlem Servis Sorumlusu"],"TSO Bilgi İşlem","L4","B","it",[E,P],"Dijital yeterlilik, problem çözme ve sürekli öğrenme teknik hizmet sürekliliğinin çekirdeğidir.");
a(["Bakım Onarım Sorumlusu","Bakım Onarım Görevlisi","Destek Personel Sorumlusu"],"TSO Operasyonel Destek","L3","C","maintenance",[E,P],"Sonuç, detay, disiplin ve stres altında işlevsellik operasyonel süreklilik için öne çıkar.");
a(["Makam Şoförü"],"TSO Makam Destek","L3","C","driver",[E,P],"Güvenlik, gizlilik, zamanlama, dikkat, disiplin ve stres altında sakinlik temel iş gerekleridir.");
a(["Makam Güvenlik"],"TSO Güvenlik","L3","B","security",["O*NET 33-9032 Security Guards",E,P],"Dependability, integrity, self-control ve stress tolerance sinyalleri temel alındı.");
a(["Eğitim Sorumlusu"],"TSO Eğitim","L4","B","learning",[E,P],"Öğrenme çevikliği, iletişim ve katılımcı koordinasyonu rolü ayırt eder.");
a(["Yönetim Kurulu Başkanı","Yönetim Kurulu Başkan Yardımcısı","Yönetim Kurulu Üyesi"],"Yönetim Kurulu","L7","B","governance",["O*NET 11-1031 Legislators proxy","O*NET 11-1011 Chief Executives",P],"Yönetişim, etik, karar, paydaş iletişimi ve belirsizlik altında işlevsellik ağırlıklı benchmark.");
a(["İcra Kurulu Başkanı (CEO)","İcra Kurulu Başkan Yardımcısı (Deputy CEO)","Grup CEO / Global CEO","Bölge CEO (EMEA / Americas / APAC)"],"CEO / Executive","L7","A","executive",["O*NET 11-1011 Chief Executives",E,P],"Leadership, dependability, integrity, achievement, adaptability ve stress tolerance rol sinyalleri temel alındı.");
a(["CSO (Chief Strategy Officer)","Strateji Başkan Yardımcısı","Kurumsal Strateji Direktörü","Stratejik Planlama Müdürü","Strateji Uzmanı","Strateji Analisti","Strateji Asistanı"],"Strateji","L5","B","strategy",["O*NET 13-1111 Management Analysts proxy","O*NET 11-1011 Chief Executives",E,P],"Mevcut test stratejik bakışı doğrudan ölçmez; iş gerekleri analitik, öğrenme, sonuç, dayanıklılık ve iletişim üzerinden modellenmiştir.");

export const BATCH1_METADATA:Record<string,any>=Object.fromEntries(Object.keys(BATCH1_PROFILES).map(role=>[role,{modelVersion:"FHR-COMP-JOB-2.0",family:cfg[role]?.family||"Unclassified",level:cfg[role]?.level||"L3",confidence:cfg[role]?.confidence||"C",evidence:cfg[role]?.evidence||[P],rationale:cfg[role]?.rationale||"Evidence-informed benchmark; SME validation recommended.",status:"recalibrated-v2",smeValidationRecommended:true}]));
export const BATCH1_WEIGHTS:Record<string,Record<string,number>>=Object.fromEntries(Object.keys(BATCH1_PROFILES).map(role=>[role,{...T[cfg[role]?.template||"admin"]}]));
