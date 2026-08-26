export type QuestionType = "S" | "R" | "L";
export type CompetencyCode = "DIG" | "ANA" | "RES" | "DET" | "LRN" | "ETH" | "DIS" | "STR" | "TEA" | "COM" | "LIE";

export interface AssessmentQuestion {
  id: number;
  text: string;
  type: QuestionType;
  category: CompetencyCode;
}

export const ASSESSMENT_VERSION = "FHR-COMP-1.1";

export const COMPETENCY_LABELS: Record<Exclude<CompetencyCode, "LIE">, string> = {
  DIG: "Dijital Okuryazarlık",
  ANA: "Analitik Düşünme",
  RES: "Sonuç Odaklılık",
  DET: "Detaylara Özen",
  LRN: "Sürekli Öğrenme",
  ETH: "Etik ve Uyum",
  DIS: "Öz-Disiplin",
  STR: "Stratejik Bakış",
  TEA: "Takım Çalışması",
  COM: "İletişim Becerileri",
};

// Eski ekranlarla geriye dönük uyumluluk için tutuluyor. Yeni değerlendirme akışı
// davranışsal senaryoları assessmentDesign.ts üzerinden kullanır.
export const PROBE_QUESTIONS = {
  DIG: { text: "Dijital bir veri kaynağında çelişkili sonuçlar gördünüz. İlk adımınız ne olur?", options: ["Kaynağı doğrularım", "Sonucu doğrudan kullanırım", "Birinin söylemesini beklerim"], correct: "Kaynağı doğrularım" },
  ETH: { text: "Kısa vadeli hedef için prosedür dışı bir çözüm önerildi. Ne yaparsınız?", options: ["Uygularım", "Riski görünür kılıp uygun onay sürecini izlerim", "Görmezden gelirim"], correct: "Riski görünür kılıp uygun onay sürecini izlerim" },
  STR: { text: "Acil bir talep uzun vadeli önceliği bozuyor. Ne yaparsınız?", options: ["Sadece acil olana yönelirim", "Kısa ve uzun vadeli etkileri birlikte değerlendiririm", "Kararı ertelerim"], correct: "Kısa ve uzun vadeli etkileri birlikte değerlendiririm" },
  RES: { text: "Hedefe giden ilk yöntem çalışmadı. Ne yaparsınız?", options: ["Vazgeçerim", "Alternatif yol denerim", "Hedefi düşürürüm"], correct: "Alternatif yol denerim" },
};

export const SJT_SCENARIOS = {
  GENERAL: { question: "VAKA: Ekipte bir sorun ortak sonucu etkiliyor. Ne yaparsınız?", options: ["Yalnız kendi işime odaklanırım", "Tarafları dinleyip ortak çözüm ararım", "Doğrudan şikâyet ederim"], best: "Tarafları dinleyip ortak çözüm ararım", target_cat: "TEA" },
};

export const getSjtCode = (_roleName: string): string => "GENERAL";

// 120 yetkinlik maddesi + 10 yanıt kalitesi maddesi = 130 çekirdek soru.
export const CANDIDATE_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: "Yeni bir dijital sistem ilk etapta karmaşık görünse bile, sistemi deneme–yanılma yoluyla anlamaya çalışırım.", type: "S", category: "DIG" },
  { id: 2, text: "Dijital araçları kullanırken yalnızca nasıl çalıştığını değil, neden böyle çalıştığını da anlamak isterim.", type: "S", category: "DIG" },
  { id: 3, text: "Mevcut dijital araçlar işimi görüyorsa, yeni teknolojilere geçiş benim için gereksiz bir yük oluşturur.", type: "R", category: "DIG" },
  { id: 4, text: "İş süreçlerimde dijital araçların verimliliği nasıl artırabileceği üzerine bilinçli şekilde düşünürüm.", type: "S", category: "DIG" },
  { id: 5, text: "Yapay zekâ, otomasyon veya veri temelli sistemlerin işime etkisini anlamaya çalışırım.", type: "S", category: "DIG" },
  { id: 6, text: "Dijital araçların sık güncellenmesi veya değişmesi, iş motivasyonumu olumsuz etkiler.", type: "R", category: "DIG" },
  { id: 7, text: "Dijital bir sorun yaşadığımda, çözümün mantığını kavramadan rahat edemem.", type: "S", category: "DIG" },
  { id: 8, text: "Dijital ortamda bir bilgiye ulaştığımda, kaynağın güvenilirliğini ve güncelliğini kontrol ederim.", type: "S", category: "DIG" },
  { id: 9, text: "Yeni bir dijital aracı öğrenmek için başkasının bana anlatmasını beklemeyi tercih ederim.", type: "R", category: "DIG" },
  { id: 10, text: "Dijital güvenlik, veri gizliliği ve bilgi paylaşımı konularında riskleri fark ederek hareket ederim.", type: "S", category: "DIG" },
  { id: 11, text: "Dijital araçların sağladığı verileri yorumlayarak kararlarımı gözden geçiririm.", type: "S", category: "DIG" },
  { id: 12, text: "Dijital içerik veya dosya paylaşırken erişim yetkisi, yeniden kullanım ve telif sınırlarını dikkate alırım.", type: "S", category: "DIG" },

  { id: 13, text: "Bir karar almadan önce, eldeki bilgilerin güvenilirliğini sorgulama ihtiyacı hissederim.", type: "S", category: "ANA" },
  { id: 14, text: "Karşılaştığım sorunlarda, görünen sonuçtan çok altında yatan nedenler ilgimi çeker.", type: "S", category: "ANA" },
  { id: 15, text: "Çoğu durumda detaylı analiz yapmak yerine hızlı karar almak daha doğru gelir.", type: "R", category: "ANA" },
  { id: 16, text: "Farklı kaynaklardan gelen bilgileri birleştirerek bütüncül bir tablo oluşturmaya çalışırım.", type: "S", category: "ANA" },
  { id: 17, text: "Bir görüş bana doğru gelse bile, karşıt görüşlerin ne olabileceğini düşünürüm.", type: "S", category: "ANA" },
  { id: 18, text: "Sayısal verilerle çalışmak karar verme sürecimi zorlaştırır.", type: "R", category: "ANA" },
  { id: 19, text: "Sezgilerimle veriler çeliştiğinde, sezgilerimi yeniden gözden geçiririm.", type: "S", category: "ANA" },
  { id: 20, text: "Karmaşık bir problemi daha küçük parçalara ayırarak anlamlandırırım.", type: "S", category: "ANA" },
  { id: 21, text: "Bir çözüm işe yarıyorsa, alternatifleri düşünmeye gerek duymam.", type: "R", category: "ANA" },
  { id: 22, text: "Neden–sonuç ilişkilerini fark etmek benim için doğal bir süreçtir.", type: "S", category: "ANA" },
  { id: 23, text: "Bilginin kaynağı ve tutarlılığı, içeriğin kendisi kadar önemlidir.", type: "S", category: "ANA" },
  { id: 24, text: "Analiz yapmak bazen gereksiz bir zaman kaybı gibi gelir.", type: "R", category: "ANA" },

  { id: 25, text: "Üzerime aldığım bir iş sonuçlanana kadar zihinsel olarak o işle meşgul olmaya devam ederim.", type: "S", category: "RES" },
  { id: 26, text: "Zor ve iddialı hedefler, çalışma isteğimi artırır.", type: "S", category: "RES" },
  { id: 27, text: "Beklenen sonuç elde edildiyse, sürecin nasıl yürütüldüğü benim için ikinci plandadır.", type: "R", category: "RES" },
  { id: 28, text: "Planladığım yol işe yaramadığında, alternatif yollar denemeye istekli olurum.", type: "S", category: "RES" },
  { id: 29, text: "Yaptığım işin başarısını, harcadığım zamandan çok ortaya çıkan sonuçla değerlendiririm.", type: "S", category: "RES" },
  { id: 30, text: "İşler planladığım gibi gitmediğinde motivasyonumu toparlamakta zorlanırım.", type: "R", category: "RES" },
  { id: 31, text: "Kısa vadede zorlayıcı olsa bile uzun vadede sonuç getirecek çabaları sürdürmeyi tercih ederim.", type: "S", category: "RES" },
  { id: 32, text: "Sorumluluk alanımda bir eksiklik gördüğümde, talimat beklemeden harekete geçerim.", type: "S", category: "RES" },
  { id: 33, text: "Mevcut performans seviyemi korumak benim için çoğu zaman yeterlidir.", type: "R", category: "RES" },
  { id: 34, text: "Başarısızlık yaşadığımda, nedenlerini analiz ederek yeniden denemeye çalışırım.", type: "S", category: "RES" },
  { id: 35, text: "Beklentilerin biraz üzerine çıkmak benim için önemli bir başarı göstergesidir.", type: "S", category: "RES" },
  { id: 36, text: "Bir hedefe ulaşmak için ekstra çaba harcamak çoğu zaman gereksizdir.", type: "R", category: "RES" },

  { id: 37, text: "Bir işi tamamladığımı düşünsem bile, hatasız olduğundan emin olmak için tekrar gözden geçirme ihtiyacı hissederim.", type: "S", category: "DET" },
  { id: 38, text: "Küçük gibi görünen bir hatanın, ilerleyen aşamalarda daha büyük sorunlara yol açabileceğinin farkındayım.", type: "S", category: "DET" },
  { id: 39, text: "Genel sonuç doğruysa, küçük detayların gözden kaçması benim için büyük bir sorun değildir.", type: "R", category: "DET" },
  { id: 40, text: "Talimatları veya prosedürleri uygulamadan önce neyin neden yapıldığını anlamaya çalışırım.", type: "S", category: "DET" },
  { id: 41, text: "Düzenli bir çalışma ortamının dikkatimi ve doğruluğumu artırdığını deneyimledim.", type: "S", category: "DET" },
  { id: 42, text: "Zaman baskısı altındayken detaylara aynı özeni göstermek benim için zordur.", type: "R", category: "DET" },
  { id: 43, text: "Kontrol listeleri, şablonlar veya standartlar kullanmanın hata riskini azalttığını düşünürüm.", type: "S", category: "DET" },
  { id: 44, text: "Tekrarlayan ve dikkat gerektiren işlerde konsantrasyonumu uzun süre koruyabilirim.", type: "S", category: "DET" },
  { id: 45, text: "Acele etmem gerektiğinde bazı kontrolleri bilinçli olarak atlayabilirim.", type: "R", category: "DET" },
  { id: 46, text: "Yaptığım işte kaliteyi sağlamak için gerektiğinde yavaşlamayı tercih ederim.", type: "S", category: "DET" },
  { id: 47, text: "Eksik veya tutarsız bir bilgi fark ettiğimde, bunu netleştirmeden ilerlemem.", type: "S", category: "DET" },
  { id: 48, text: "Detaylara fazla odaklanmak, çoğu zaman verimliliği düşürür.", type: "R", category: "DET" },

  { id: 49, text: "Bilmediğim bir konuyla karşılaştığımda, bunu kişisel bir eksiklikten çok gelişim fırsatı olarak görürüm.", type: "S", category: "LRN" },
  { id: 50, text: "Aldığım geri bildirimler ilk anda hoşuma gitmese bile, üzerinde düşünmeye çalışırım.", type: "S", category: "LRN" },
  { id: 51, text: "İnsanların temel yeteneklerinin büyük ölçüde değişmediğine inanırım.", type: "R", category: "LRN" },
  { id: 52, text: "Kendi hatalarımı savunmak yerine, nedenlerini anlamayı tercih ederim.", type: "S", category: "LRN" },
  { id: 53, text: "Mevcut bilgi ve yöntemlerimin her zaman geliştirilebileceğini düşünürüm.", type: "S", category: "LRN" },
  { id: 54, text: "Uzun süredir kullandığım yöntemler işe yarıyorsa, yenilerini denemek gereksizdir.", type: "R", category: "LRN" },
  { id: 55, text: "Zorlayıcı ve alışık olmadığım görevler, öğrenme isteğimi artırır.", type: "S", category: "LRN" },
  { id: 56, text: "Benden daha deneyimli veya bilgili kişilerle çalışmanın beni geliştirdiğini hissederim.", type: "S", category: "LRN" },
  { id: 57, text: "Konfor alanımın dışına çıkmak performansımı genellikle düşürür.", type: "R", category: "LRN" },
  { id: 58, text: "Bilmediğim bir şey sorulduğunda, bunu gizlemek yerine araştırmayı tercih ederim.", type: "S", category: "LRN" },
  { id: 59, text: "Farklı alanlardan edindiğim bilgileri kendi işime uyarlamayı denerim.", type: "S", category: "LRN" },
  { id: 60, text: "Öğrenme sürecinin süreklilik gerektirdiğine inanırım.", type: "S", category: "LRN" },

  { id: 61, text: "Kimsenin fark etmeyeceğini bilsem bile, yanlış olduğunu düşündüğüm bir davranışı yapmam.", type: "S", category: "ETH" },
  { id: 62, text: "Hata yaptığımda, bunun sorumluluğunu üstlenmenin güven açısından önemli olduğunu düşünürüm.", type: "S", category: "ETH" },
  { id: 63, text: "Sonuç yeterince önemliyse, bazı etik kuralların esnetilebileceğini düşünebilirim.", type: "R", category: "ETH" },
  { id: 64, text: "Kısa vadede avantaj sağlasa bile, değerlerimle çelişen bir kazanç beni rahatsız eder.", type: "S", category: "ETH" },
  { id: 65, text: "İş ortamında güvenin ancak tutarlı ve dürüst davranışlarla oluştuğuna inanırım.", type: "S", category: "ETH" },
  { id: 66, text: "Bana adil davranılmadığını düşündüğümde performansımı bilinçli olarak düşürmek anlaşılabilir bir tepkidir.", type: "R", category: "ETH" },
  { id: 67, text: "Verilen sözlerin tutulmasının profesyonel ilişkilerde temel bir unsur olduğunu düşünürüm.", type: "S", category: "ETH" },
  { id: 68, text: "İşle ilgili gizli bilgilerin paylaşımında sınırların korunması gerektiğine inanırım.", type: "S", category: "ETH" },
  { id: 69, text: "Çevremde herkes aynı etik ihlali yapıyorsa, buna uymamak gerçekçi değildir.", type: "R", category: "ETH" },
  { id: 70, text: "Başkalarının emeğini veya fikrini izinsiz kullanmanın güveni zedelediğini düşünürüm.", type: "S", category: "ETH" },
  { id: 71, text: "Etik olmayan bir durumu görmezden gelmek beni içsel olarak rahatsız eder.", type: "S", category: "ETH" },
  { id: 72, text: "Küçük etik ihlallerin uzun vadede ciddi sonuçlar doğuracağını düşünmem.", type: "R", category: "ETH" },

  { id: 73, text: "Kimse beni kontrol etmese bile, sorumluluklarımı zamanında yerine getirmeye çalışırım.", type: "S", category: "DIS" },
  { id: 74, text: "Günlük işlerimi planlamadığımda performansımın belirgin şekilde düştüğünü fark ederim.", type: "S", category: "DIS" },
  { id: 75, text: "Motivasyonum düşük olduğunda, işleri ertelemek benim için kaçınılmaz hale gelir.", type: "R", category: "DIS" },
  { id: 76, text: "Yapmak istemediğim görevler olsa bile, bunları tamamlamadan rahat edemem.", type: "S", category: "DIS" },
  { id: 77, text: "Teslim tarihlerini bağlayıcı bir taahhüt olarak görürüm.", type: "S", category: "DIS" },
  { id: 78, text: "İşlerimi son ana bırakmak, baskı altında daha iyi çalışmamı sağlar.", type: "R", category: "DIS" },
  { id: 79, text: "İş yüküm arttığında, önceliklendirme yaparak ilerlemeyi tercih ederim.", type: "S", category: "DIS" },
  { id: 80, text: "Aksaklık yaşanacağını fark ettiğimde, bunu önceden ilgili kişilerle paylaşırım.", type: "S", category: "DIS" },
  { id: 81, text: "Kendi kendime çalışırken dikkatimi korumakta zorlanırım.", type: "R", category: "DIS" },
  { id: 82, text: "Disiplinli çalışmanın uzun vadede stresimi azalttığını deneyimledim.", type: "S", category: "DIS" },
  { id: 83, text: "Kurallara uymanın yalnızca zorunluluk değil, profesyonelliğin bir parçası olduğunu düşünürüm.", type: "S", category: "DIS" },
  { id: 84, text: "Başladığım işleri bitirmekte zaman zaman zorlandığımı kabul ederim.", type: "R", category: "DIS" },

  { id: 85, text: "Karar alırken kısa vadeli sonuçların uzun vadeli etkilerini de düşünürüm.", type: "S", category: "STR" },
  { id: 86, text: "Günlük işlerimin kurumun daha büyük hedefleriyle nasıl bağlantılı olduğunu sorgularım.", type: "S", category: "STR" },
  { id: 87, text: "Acil sorunları çözmek gerektiğinde uzun vadeli öncelikleri ikinci plana atmak çoğu zaman kaçınılmazdır.", type: "R", category: "STR" },
  { id: 88, text: "Belirsizlikte tek bir tahmine bağlı kalmak yerine farklı senaryoları değerlendiririm.", type: "S", category: "STR" },
  { id: 89, text: "Müşteri, teknoloji, mevzuat veya rekabetteki değişimlerin işimize olası etkilerini takip ederim.", type: "S", category: "STR" },
  { id: 90, text: "Bir karar bugünkü hedefi karşılıyorsa, gelecekte doğurabileceği sonuçları ayrıca düşünmeye gerek duymam.", type: "R", category: "STR" },
  { id: 91, text: "Kaynakları kullanırken hangi faaliyetlerin stratejik önceliklere en çok katkı verdiğini dikkate alırım.", type: "S", category: "STR" },
  { id: 92, text: "Bir sorunu yalnız bulunduğu bölüm içinde değil, diğer süreçlere etkisiyle birlikte değerlendiririm.", type: "S", category: "STR" },
  { id: 93, text: "İş yükü yoğun olduğunda büyük resmi düşünmek yerine yalnızca önümdeki işleri tamamlamaya odaklanırım.", type: "R", category: "STR" },
  { id: 94, text: "Farklı seçenekleri değerlendirirken olası fırsatları ve riskleri birlikte düşünürüm.", type: "S", category: "STR" },
  { id: 95, text: "Bugünkü kararların birkaç ay veya yıl sonraki etkilerini öngörmeye çalışırım.", type: "S", category: "STR" },
  { id: 96, text: "Stratejik düşünmenin yalnızca üst yönetimin işi olduğunu, kendi rolümde buna ihtiyaç olmadığını düşünürüm.", type: "R", category: "STR" },

  { id: 97, text: "Ekip içinde bilgi paylaşımının ortak başarıyı artırdığına inanırım.", type: "S", category: "TEA" },
  { id: 98, text: "Kendi işim tamamlanmış olsa bile, ekip arkadaşlarımın ihtiyacı varsa destek olurum.", type: "S", category: "TEA" },
  { id: 99, text: "Farklı bakış açılarının, ilk anda zorlayıcı olsa bile daha iyi sonuçlar doğurabileceğini düşünürüm.", type: "S", category: "TEA" },
  { id: 100, text: "Bir ekip sorunu ortak sonucu etkiliyor olsa bile görev tanımım dışında kalıyorsa görmezden gelmeyi tercih ederim.", type: "R", category: "TEA" },
  { id: 101, text: "Tartışmalarda kişilere değil, konuya ve çözüme odaklanmaya çalışırım.", type: "S", category: "TEA" },
  { id: 102, text: "Takım çalışmaları çoğu zaman bireysel çalışmaya göre daha verimsizdir.", type: "R", category: "TEA" },
  { id: 103, text: "Ortak bir karara katılmasam bile, çekincelerimi açıkça ifade ettikten sonra alınan kararı yapıcı biçimde uygulamaya çalışırım.", type: "S", category: "TEA" },
  { id: 104, text: "Başarıyı bireysel bir kazanımdan çok ekip çalışmasının sonucu olarak görürüm.", type: "S", category: "TEA" },
  { id: 105, text: "Ekip arkadaşlarımla yalnızca görev gerektirdiğinde iletişim kurmanın yeterli olduğunu düşünürüm.", type: "R", category: "TEA" },
  { id: 106, text: "Yeni katılan ekip üyelerinin sürece uyum sağlamasına bilinçli olarak katkı sunarım.", type: "S", category: "TEA" },
  { id: 107, text: "Ekip içinde güven ortamının performansı doğrudan etkilediğini düşünüyorum.", type: "S", category: "TEA" },
  { id: 108, text: "Ekip içindeki hatalarla ilgilenmek yerine yalnızca kendi sorumluluklarıma odaklanırım.", type: "R", category: "TEA" },

  { id: 109, text: "Karşımdaki kişiyi dinlerken, vereceğim cevabı düşünmekten çok gerçekten ne anlatmak istediğini anlamaya odaklanırım.", type: "S", category: "COM" },
  { id: 110, text: "Düşüncelerimi ifade ederken hem açık hem de karşı tarafın algısını gözetmeye çalışırım.", type: "S", category: "COM" },
  { id: 111, text: "Zor veya hassas konuları konuşmak yerine, ortamın kendiliğinden düzelmesini beklemeyi tercih ederim.", type: "R", category: "COM" },
  { id: 112, text: "İletişimimde beden dilimin, ses tonumun ve kelime seçimimin etkisinin farkındayım.", type: "S", category: "COM" },
  { id: 113, text: "Olumsuz geri bildirim vermem gerektiğinde, kırıcı olmadan net olmayı önemserim.", type: "S", category: "COM" },
  { id: 114, text: "İnsanların söylediklerimi yanlış anlaması genellikle benim kontrolüm dışında gelişir.", type: "R", category: "COM" },
  { id: 115, text: "Yazılı iletişimimde e-posta, mesaj veya raporu açık ve yanlış yoruma kapalı yazmaya özen gösteririm.", type: "S", category: "COM" },
  { id: 116, text: "Tartışmalarda karşı tarafın bakış açısını anlamadan kendi görüşümü savunmam.", type: "S", category: "COM" },
  { id: 117, text: "Duygusal tepkilerimi iletişim sırasında kontrol etmekte zaman zaman zorlanırım.", type: "R", category: "COM" },
  { id: 118, text: "Geri bildirim verirken kişilik özelliklerinden çok davranışlara ve sonuçlara odaklanırım.", type: "S", category: "COM" },
  { id: 119, text: "Karmaşık bir konuyu, uzman olmayan birinin anlayabileceği şekilde sadeleştirebilirim.", type: "S", category: "COM" },
  { id: 120, text: "Konuşmalarımda bazen sonradan bunu söylememeliydim dediğim durumlar olur.", type: "R", category: "COM" },

  { id: 121, text: "Hayatım boyunca hiç kimseye, hiçbir konuda en ufak bir yalan bile söylemedim.", type: "L", category: "LIE" },
  { id: 122, text: "Hiçbir zaman, hiçbir koşulda, hiç kimseye karşı olumsuz bir duygu hissetmedim.", type: "L", category: "LIE" },
  { id: 123, text: "Yaptığım her işte her zaman eksiksiz ve hatasız oldum.", type: "L", category: "LIE" },
  { id: 124, text: "Hayatımda hiçbir sorumluluğu ertelediğim bir an olmadı.", type: "L", category: "LIE" },
  { id: 125, text: "Kimse hakkında, iyi niyetli bile olsa, arkasından hiç konuşmadım.", type: "L", category: "LIE" },
  { id: 126, text: "Hiçbir zaman sinirlenmedim, öfkelenmedim veya kontrolümü kaybetmedim.", type: "L", category: "LIE" },
  { id: 127, text: "Her zaman, her durumda, herkesle tamamen aynı fikirde oldum.", type: "L", category: "LIE" },
  { id: 128, text: "Hiçbir zaman kuralları esnetme ihtiyacı hissetmedim.", type: "L", category: "LIE" },
  { id: 129, text: "Tüm insanları her zaman eşit derecede severim.", type: "L", category: "LIE" },
  { id: 130, text: "Hayatım boyunca verdiğim tüm sözleri, hiçbir istisna olmadan tuttum.", type: "L", category: "LIE" },
];
