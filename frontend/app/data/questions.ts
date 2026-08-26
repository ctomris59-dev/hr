export type QuestionType = "S" | "R" | "L";
export type CompetencyCode =
  | "DIG"
  | "ANA"
  | "RES"
  | "DET"
  | "LRN"
  | "ETH"
  | "DIS"
  | "STR"
  | "TEA"
  | "COM"
  | "LIE";
export type QualityDirection = "AGREE_RISK" | "DISAGREE_RISK";

export interface AssessmentQuestion {
  id: number;
  text: string;
  type: QuestionType;
  category: CompetencyCode;
  qualityDirection?: QualityDirection;
}

export const ASSESSMENT_VERSION = "FHR-COMP-1.2";

export const COMPETENCY_LABELS: Record<Exclude<CompetencyCode, "LIE">, string> = {
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

// STR kodu geriye dönük veri uyumluluğu için korunur. FHR-COMP-1.2 itibarıyla
// bu kod Stratejik Bakış değil Dayanıklılık & Stres Yönetimi yapısını temsil eder.
// Stratejik Bakış ileride yönetici/liderlik ek envanterinin ayrı boyutu olacaktır.
export const PROBE_QUESTIONS = {
  DIG: {
    text: "Dijital bir veri kaynağında çelişkili sonuçlar gördünüz. İlk adımınız ne olur?",
    options: ["Kaynağı doğrularım", "Sonucu doğrudan kullanırım", "Birinin söylemesini beklerim"],
    correct: "Kaynağı doğrularım",
  },
  ETH: {
    text: "Kısa vadeli hedef için prosedür dışı bir çözüm önerildi. Ne yaparsınız?",
    options: ["Uygularım", "Riski görünür kılıp uygun onay sürecini izlerim", "Görmezden gelirim"],
    correct: "Riski görünür kılıp uygun onay sürecini izlerim",
  },
  STR: {
    text: "Yoğun baskı altında beklenmedik bir hata ortaya çıktı ve ekipte gerilim yükseldi. İlk yaklaşımınız ne olur?",
    options: [
      "Hızla birini sorumlu tutarım",
      "Durumu netleştirip öncelikleri belirler, sakin bir iletişimle çözüm planı kurarım",
      "Bir süre karar vermem",
    ],
    correct: "Durumu netleştirip öncelikleri belirler, sakin bir iletişimle çözüm planı kurarım",
  },
  RES: {
    text: "Hedefe giden ilk yöntem çalışmadı. Ne yaparsınız?",
    options: ["Vazgeçerim", "Alternatif yol denerim", "Hedefi düşürürüm"],
    correct: "Alternatif yol denerim",
  },
};

export const SJT_SCENARIOS = {
  GENERAL: {
    question: "VAKA: Ekipte bir sorun ortak sonucu etkiliyor. Ne yaparsınız?",
    options: ["Yalnız kendi işime odaklanırım", "Tarafları dinleyip ortak çözüm ararım", "Doğrudan şikâyet ederim"],
    best: "Tarafları dinleyip ortak çözüm ararım",
    target_cat: "TEA",
  },
};

export const getSjtCode = (_roleName: string): string => "GENERAL";

type CoreCategory = Exclude<CompetencyCode, "LIE">;
type QuestionRow = [number, string, QuestionType];

const makeQuestions = (
  category: CoreCategory,
  rows: QuestionRow[]
): AssessmentQuestion[] => rows.map(([id, text, type]) => ({ id, text, type, category }));

const makeQualityQuestions = (
  rows: Array<[number, string, QualityDirection]>
): AssessmentQuestion[] =>
  rows.map(([id, text, qualityDirection]) => ({
    id,
    text,
    type: "L",
    category: "LIE",
    qualityDirection,
  }));

// 120 yetkinlik maddesi + 10 çift yönlü yanıt-kalitesi maddesi = 130 çekirdek soru.
export const CANDIDATE_QUESTIONS: AssessmentQuestion[] = [
  ...makeQuestions("DIG", [
    [1, "Yeni bir dijital sistem ilk etapta karmaşık görünse bile, sistemi deneme–yanılma yoluyla anlamaya çalışırım.", "S"],
    [2, "Dijital araçları kullanırken yalnızca nasıl çalıştığını değil, neden böyle çalıştığını da anlamak isterim.", "S"],
    [3, "Mevcut dijital araçlar işimi görüyorsa, yeni teknolojilere geçiş benim için gereksiz bir yük oluşturur.", "R"],
    [4, "İş süreçlerimde dijital araçların verimliliği nasıl artırabileceği üzerine bilinçli şekilde düşünürüm.", "S"],
    [5, "Yapay zekâ, otomasyon veya veri temelli sistemlerin işime etkisini anlamaya çalışırım.", "S"],
    [6, "Dijital araçların sık güncellenmesi veya değişmesi, iş motivasyonumu olumsuz etkiler.", "R"],
    [7, "Dijital bir sorun yaşadığımda, çözümün mantığını kavramadan rahat edemem.", "S"],
    [8, "Dijital ortamda bir bilgiye ulaştığımda, kaynağın güvenilirliğini ve güncelliğini kontrol ederim.", "S"],
    [9, "Yeni bir dijital aracı öğrenmek için başkasının bana anlatmasını beklemeyi tercih ederim.", "R"],
    [10, "Dijital güvenlik, veri gizliliği ve bilgi paylaşımı konularında riskleri fark ederek hareket ederim.", "S"],
    [11, "Dijital araçların sağladığı verileri yorumlayarak kararlarımı gözden geçiririm.", "S"],
    [12, "Dijital içerik veya dosya paylaşırken erişim yetkisi, yeniden kullanım ve telif sınırlarını dikkate alırım.", "S"],
  ]),
  ...makeQuestions("ANA", [
    [13, "Bir karar almadan önce, eldeki bilgilerin güvenilirliğini sorgulama ihtiyacı hissederim.", "S"],
    [14, "Karşılaştığım sorunlarda, görünen sonuçtan çok altında yatan nedenler ilgimi çeker.", "S"],
    [15, "Çoğu durumda detaylı analiz yapmak yerine hızlı karar almak daha doğru gelir.", "R"],
    [16, "Farklı kaynaklardan gelen bilgileri birleştirerek bütüncül bir tablo oluşturmaya çalışırım.", "S"],
    [17, "Bir görüş bana doğru gelse bile, karşıt görüşlerin ne olabileceğini düşünürüm.", "S"],
    [18, "Sayısal verilerle çalışmak karar verme sürecimi zorlaştırır.", "R"],
    [19, "Sezgilerimle veriler çeliştiğinde, sezgilerimi yeniden gözden geçiririm.", "S"],
    [20, "Karmaşık bir problemi daha küçük parçalara ayırarak anlamlandırırım.", "S"],
    [21, "Bir çözüm işe yarıyorsa, alternatifleri düşünmeye gerek duymam.", "R"],
    [22, "Neden–sonuç ilişkilerini fark etmek benim için doğal bir süreçtir.", "S"],
    [23, "Bilginin kaynağı ve tutarlılığı, içeriğin kendisi kadar önemlidir.", "S"],
    [24, "Analiz yapmak bazen gereksiz bir zaman kaybı gibi gelir.", "R"],
  ]),
  ...makeQuestions("RES", [
    [25, "Üzerime aldığım bir iş sonuçlanana kadar zihinsel olarak o işle meşgul olmaya devam ederim.", "S"],
    [26, "Zor ve iddialı hedefler, çalışma isteğimi artırır.", "S"],
    [27, "Beklenen sonuç elde edildiyse, sürecin nasıl yürütüldüğü benim için ikinci plandadır.", "R"],
    [28, "Planladığım yol işe yaramadığında, alternatif yollar denemeye istekli olurum.", "S"],
    [29, "Yaptığım işin başarısını, harcadığım zamandan çok ortaya çıkan sonuçla değerlendiririm.", "S"],
    [30, "İşler planladığım gibi gitmediğinde motivasyonumu toparlamakta zorlanırım.", "R"],
    [31, "Kısa vadede zorlayıcı olsa bile uzun vadede sonuç getirecek çabaları sürdürmeyi tercih ederim.", "S"],
    [32, "Sorumluluk alanımda bir eksiklik gördüğümde, talimat beklemeden harekete geçerim.", "S"],
    [33, "Mevcut performans seviyemi korumak benim için çoğu zaman yeterlidir.", "R"],
    [34, "Başarısızlık yaşadığımda, nedenlerini analiz ederek yeniden denemeye çalışırım.", "S"],
    [35, "Beklentilerin biraz üzerine çıkmak benim için önemli bir başarı göstergesidir.", "S"],
    [36, "Bir hedefe ulaşmak için ekstra çaba harcamak çoğu zaman gereksizdir.", "R"],
  ]),
  ...makeQuestions("DET", [
    [37, "Bir işi tamamladığımı düşünsem bile, hatasız olduğundan emin olmak için tekrar gözden geçirme ihtiyacı hissederim.", "S"],
    [38, "Küçük gibi görünen bir hatanın, ilerleyen aşamalarda daha büyük sorunlara yol açabileceğinin farkındayım.", "S"],
    [39, "Genel sonuç doğruysa, küçük detayların gözden kaçması benim için büyük bir sorun değildir.", "R"],
    [40, "Talimatları veya prosedürleri uygulamadan önce neyin neden yapıldığını anlamaya çalışırım.", "S"],
    [41, "Düzenli bir çalışma ortamının dikkatimi ve doğruluğumu artırdığını deneyimledim.", "S"],
    [42, "Zaman baskısı altındayken detaylara aynı özeni göstermek benim için zordur.", "R"],
    [43, "Kontrol listeleri, şablonlar veya standartlar kullanmanın hata riskini azalttığını düşünürüm.", "S"],
    [44, "Tekrarlayan ve dikkat gerektiren işlerde konsantrasyonumu uzun süre koruyabilirim.", "S"],
    [45, "Acele etmem gerektiğinde bazı kontrolleri bilinçli olarak atlayabilirim.", "R"],
    [46, "Yaptığım işte kaliteyi sağlamak için gerektiğinde yavaşlamayı tercih ederim.", "S"],
    [47, "Eksik veya tutarsız bir bilgi fark ettiğimde, bunu netleştirmeden ilerlemem.", "S"],
    [48, "Detaylara fazla odaklanmak, çoğu zaman verimliliği düşürür.", "R"],
  ]),
  ...makeQuestions("LRN", [
    [49, "Bilmediğim bir konuyla karşılaştığımda, bunu kişisel bir eksiklikten çok gelişim fırsatı olarak görürüm.", "S"],
    [50, "Aldığım geri bildirimler ilk anda hoşuma gitmese bile, üzerinde düşünmeye çalışırım.", "S"],
    [51, "İnsanların temel yeteneklerinin büyük ölçüde değişmediğine inanırım.", "R"],
    [52, "Kendi hatalarımı savunmak yerine, nedenlerini anlamayı tercih ederim.", "S"],
    [53, "Mevcut bilgi ve yöntemlerimin her zaman geliştirilebileceğini düşünürüm.", "S"],
    [54, "Uzun süredir kullandığım yöntemler işe yarıyorsa, yenilerini denemek gereksizdir.", "R"],
    [55, "Zorlayıcı ve alışık olmadığım görevler, öğrenme isteğimi artırır.", "S"],
    [56, "Benden daha deneyimli veya bilgili kişilerle çalışmanın beni geliştirdiğini hissederim.", "S"],
    [57, "Konfor alanımın dışına çıkmak performansımı genellikle düşürür.", "R"],
    [58, "Bilmediğim bir şey sorulduğunda, bunu gizlemek yerine araştırmayı tercih ederim.", "S"],
    [59, "Farklı alanlardan edindiğim bilgileri kendi işime uyarlamayı denerim.", "S"],
    [60, "Öğrenme sürecinin süreklilik gerektirdiğine inanırım.", "S"],
  ]),
  ...makeQuestions("ETH", [
    [61, "Kimsenin fark etmeyeceğini bilsem bile, yanlış olduğunu düşündüğüm bir davranışı yapmam.", "S"],
    [62, "Hata yaptığımda, bunun sorumluluğunu üstlenmenin güven açısından önemli olduğunu düşünürüm.", "S"],
    [63, "Sonuç yeterince önemliyse, bazı etik kuralların esnetilebileceğini düşünebilirim.", "R"],
    [64, "Kısa vadede avantaj sağlasa bile, değerlerimle çelişen bir kazanç beni rahatsız eder.", "S"],
    [65, "İş ortamında güvenin ancak tutarlı ve dürüst davranışlarla oluştuğuna inanırım.", "S"],
    [66, "Bana adil davranılmadığını düşündüğümde performansımı bilinçli olarak düşürmek anlaşılabilir bir tepkidir.", "R"],
    [67, "Verilen sözlerin tutulmasının profesyonel ilişkilerde temel bir unsur olduğunu düşünürüm.", "S"],
    [68, "İşle ilgili gizli bilgilerin paylaşımında sınırların korunması gerektiğine inanırım.", "S"],
    [69, "Çevremde herkes aynı etik ihlali yapıyorsa, buna uymamak gerçekçi değildir.", "R"],
    [70, "Başkalarının emeğini veya fikrini izinsiz kullanmanın güveni zedelediğini düşünürüm.", "S"],
    [71, "Etik olmayan bir durumu görmezden gelmek beni içsel olarak rahatsız eder.", "S"],
    [72, "Küçük etik ihlallerin uzun vadede ciddi sonuçlar doğuracağını düşünmem.", "R"],
  ]),
  ...makeQuestions("DIS", [
    [73, "Kimse beni kontrol etmese bile, sorumluluklarımı zamanında yerine getirmeye çalışırım.", "S"],
    [74, "Günlük işlerimi planlamadığımda performansımın belirgin şekilde düştüğünü fark ederim.", "S"],
    [75, "Motivasyonum düşük olduğunda, işleri ertelemek benim için kaçınılmaz hale gelir.", "R"],
    [76, "Yapmak istemediğim görevler olsa bile, bunları tamamlamadan rahat edemem.", "S"],
    [77, "Teslim tarihlerini bağlayıcı bir taahhüt olarak görürüm.", "S"],
    [78, "İşlerimi son ana bırakmak, baskı altında daha iyi çalışmamı sağlar.", "R"],
    [79, "İş yüküm arttığında, önceliklendirme yaparak ilerlemeyi tercih ederim.", "S"],
    [80, "Aksaklık yaşanacağını fark ettiğimde, bunu önceden ilgili kişilerle paylaşırım.", "S"],
    [81, "Kendi kendime çalışırken dikkatimi korumakta zorlanırım.", "R"],
    [82, "Disiplinli çalışmanın uzun vadede stresimi azalttığını deneyimledim.", "S"],
    [83, "Kurallara uymanın yalnızca zorunluluk değil, profesyonelliğin bir parçası olduğunu düşünürüm.", "S"],
    [84, "Başladığım işleri bitirmekte zaman zaman zorlandığımı kabul ederim.", "R"],
  ]),
  ...makeQuestions("STR", [
    [85, "Beklenmedik sorunlarla karşılaştığımda ilk tepkimi kontrol altına alabilirim.", "S"],
    [86, "Baskı altında karar verirken duygularımın etkisini fark etmeye çalışırım.", "S"],
    [87, "Olumsuz bir geri bildirim aldıktan sonra toparlanmam uzun sürer.", "R"],
    [88, "Belirsizlik içeren durumlarda paniğe kapılmak yerine çözüm arayışına yönelirim.", "S"],
    [89, "Yoğun ve zor dönemlerden sonra kendimi yeniden dengeleyebilirim.", "S"],
    [90, "İşle ilgili olumsuz bir olay, günün geri kalanındaki performansımı ciddi şekilde etkiler.", "R"],
    [91, "Stres altındayken bile iletişim dilimi korumaya özen gösteririm.", "S"],
    [92, "Zorluklar karşısında tamamen vazgeçmek yerine koşullara uyum sağlamayı tercih ederim.", "S"],
    [93, "Baskı altında yaptığım bir hatadan sonra dikkatimi yeniden işe vermekte zorlanırım.", "R"],
    [94, "Kriz anlarında baskı artsa bile sakinliğimi koruyabilirim.", "S"],
    [95, "Başarısızlıkları kişisel bir yetersizlikten çok geçici bir durum olarak görmeye çalışırım.", "S"],
    [96, "Stresli dönemlerde duygusal tepkilerimi kontrol etmek benim için zordur.", "R"],
  ]),
  ...makeQuestions("TEA", [
    [97, "Ekip içinde bilgi paylaşımının ortak başarıyı artırdığına inanırım.", "S"],
    [98, "Kendi işim tamamlanmış olsa bile, ekip arkadaşlarımın ihtiyacı varsa destek olurum.", "S"],
    [99, "Farklı bakış açılarının, ilk anda zorlayıcı olsa bile daha iyi sonuçlar doğurabileceğini düşünürüm.", "S"],
    [100, "Bir ekip sorunu ortak sonucu etkiliyor olsa bile görev tanımım dışında kalıyorsa görmezden gelmeyi tercih ederim.", "R"],
    [101, "Tartışmalarda kişilere değil, konuya ve çözüme odaklanmaya çalışırım.", "S"],
    [102, "Takım çalışmaları çoğu zaman bireysel çalışmaya göre daha verimsizdir.", "R"],
    [103, "Ortak bir karara katılmasam bile, çekincelerimi açıkça ifade ettikten sonra alınan kararı yapıcı biçimde uygulamaya çalışırım.", "S"],
    [104, "Başarıyı bireysel bir kazanımdan çok ekip çalışmasının sonucu olarak görürüm.", "S"],
    [105, "Ekip arkadaşlarımla yalnızca görev gerektirdiğinde iletişim kurmanın yeterli olduğunu düşünürüm.", "R"],
    [106, "Yeni katılan ekip üyelerinin sürece uyum sağlamasına bilinçli olarak katkı sunarım.", "S"],
    [107, "Ekip içinde güven ortamının performansı doğrudan etkilediğini düşünüyorum.", "S"],
    [108, "Ekip içindeki hatalarla ilgilenmek yerine yalnızca kendi sorumluluklarıma odaklanırım.", "R"],
  ]),
  ...makeQuestions("COM", [
    [109, "Karşımdaki kişiyi dinlerken, vereceğim cevabı düşünmekten çok gerçekten ne anlatmak istediğini anlamaya odaklanırım.", "S"],
    [110, "Düşüncelerimi ifade ederken hem açık hem de karşı tarafın algısını gözetmeye çalışırım.", "S"],
    [111, "Zor veya hassas konuları konuşmak yerine, ortamın kendiliğinden düzelmesini beklemeyi tercih ederim.", "R"],
    [112, "İletişimimde beden dilimin, ses tonumun ve kelime seçimimin etkisinin farkındayım.", "S"],
    [113, "Olumsuz geri bildirim vermem gerektiğinde, kırıcı olmadan net olmayı önemserim.", "S"],
    [114, "İnsanların söylediklerimi yanlış anlaması genellikle benim kontrolüm dışında gelişir.", "R"],
    [115, "Yazılı iletişimimde e-posta, mesaj veya raporu açık ve yanlış yoruma kapalı yazmaya özen gösteririm.", "S"],
    [116, "Tartışmalarda karşı tarafın bakış açısını anlamadan kendi görüşümü savunmam.", "S"],
    [117, "Duygusal tepkilerimi iletişim sırasında kontrol etmekte zaman zaman zorlanırım.", "R"],
    [118, "Geri bildirim verirken kişilik özelliklerinden çok davranışlara ve sonuçlara odaklanırım.", "S"],
    [119, "Karmaşık bir konuyu, uzman olmayan birinin anlayabileceği şekilde sadeleştirebilirim.", "S"],
    [120, "Konuşmalarımda bazen sonradan bunu söylememeliydim dediğim durumlar olur.", "R"],
  ]),
  ...makeQualityQuestions([
    [121, "İş yaşamım boyunca önemli bir sorumluluğu hiçbir zaman ertelemedim.", "AGREE_RISK"],
    [122, "Zaman zaman bir işi ertelediğim olmuştur.", "DISAGREE_RISK"],
    [123, "Yoğun baskı altında bile hiçbir zaman sabırsız veya kırıcı davranmadım.", "AGREE_RISK"],
    [124, "Bazen bir konuşmadan sonra sözlerimi daha iyi seçebilirdim diye düşündüğüm olur.", "DISAGREE_RISK"],
    [125, "Yaptığım işlerde hiçbir zaman bir hata yaptığımı gizleme ya da olduğundan küçük gösterme isteği duymadım.", "AGREE_RISK"],
    [126, "Yoğun dönemlerde dikkatim zaman zaman dağılabilir.", "DISAGREE_RISK"],
    [127, "Bir kurala uymanın zor olduğu hiçbir durumda onu esnetmeyi aklımdan geçirmedim.", "AGREE_RISK"],
    [128, "Bazen ilk değerlendirmemin eksik ya da yanlış olduğunu sonradan fark ederim.", "DISAGREE_RISK"],
    [129, "Verdiğim önemli sözlerin tamamını, hiçbir istisna olmadan planladığım zamanda yerine getirdim.", "AGREE_RISK"],
    [130, "Nadiren de olsa verdiğim bir sözü planladığım zamanda yerine getiremediğim olmuştur.", "DISAGREE_RISK"],
  ]),
];
