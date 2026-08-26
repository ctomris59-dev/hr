import re  # parse_questions fonksiyonu için gerekli

PROBE_QUESTIONS = {
    'DIG': {"text": "🔍 **KANITLA:** Teknolojiye çok hakim olduğunuzu belirttiniz. Yazılım çöktü, BT yok. Ne yaparsınız?", "options": ["A) Beklerim.", "B) Hata loglarına bakarım.", "C) Bildiririm."], "correct": "B"},
    'ETH': {"text": "🔍 **KANITLA:** Çok dürüstsünüz. Arkadaşınız hırsızlık yaptı. Ne yaparsınız?", "options": ["A) Susarım.", "B) Uyarırım.", "C) Raporlarım."], "correct": "B"},
    'STR': {"text": "🔍 **KANITLA:** Sakinsiniz. Müşteri bağırıyor. Ne yaparsınız?", "options": ["A) Savunurum.", "B) Giderim.", "C) Sakince dinlerim."], "correct": "C"},
    'RES': {"text": "🔍 **KANITLA:** Sonuç odaklısınız. Hedef tutmayacak, gri alan var. Ne yaparsınız?", "options": ["A) Yaparım.", "B) Yapmam.", "C) Onay alırım."], "correct": "B"}
}

SJT_SCENARIOS = {
    "HEALTH": {"question": "VAKA: Nöbet bitti, acil hasta geldi. Şef yok. Ne yaparsınız?", "options": ["A) Çıkarım.", "B) Sorarım.", "C) Hemen başlarım."], "best": "C", "target_cat": "TEA"},
    "CONSTRUCTION": {"question": "VAKA: Proje gecikti, hava riskli. Ne yaparsınız?", "options": ["A) Devam.", "B) Raporlarım.", "C) Durdururum."], "best": "C", "target_cat": "DET"},
    "SALES": {"question": "VAKA: Hedef için tek satış lazım, ürün uymuyor. Ne yaparsınız?", "options": ["A) Satarım.", "B) Risk müşteride.", "C) Satmam."], "best": "C", "target_cat": "ETH"},
    "GENERAL": {"question": "VAKA: Arkadaşınız kaytarıyor. Ne yaparsınız?", "options": ["A) Boşveririm.", "B) Şikayet.", "C) Konuşurum."], "best": "C", "target_cat": "COM"},
    "PURCHASING": {"question": "VAKA: Stok bitti, tedarikçi faturasız teklif etti. Ne yaparsınız?", "options": ["A) Kabul.", "B) Müdüre sorarım.", "C) Red."], "best": "C", "target_cat": "ETH"},
    "IT": {"question": "VAKA: Cuma akşamı kritik hata. Ne yaparsınız?", "options": ["A) Pazartesi.", "B) Mail.", "C) Müdahale."], "best": "C", "target_cat": "RES"}
}

def get_sjt_code(role_name):
    role_map = {
        "Sağlık": "HEALTH", "İnşaat": "CONSTRUCTION", "Satış": "SALES", 
        "Satınalma": "PURCHASING", "IT": "IT"
    }
    for k, v in role_map.items():
        if k in role_name: return v
    return "GENERAL"

RAW_QUESTIONS_10_DIM = """
BÖLÜM 1: DIGITAL (DIG)
[S] Yeni bir dijital sistem ilk etapta karmaşık görünse bile, sistemi deneme–yanılma yoluyla anlamaya çalışırım.
[S] Dijital araçları kullanırken yalnızca “nasıl çalıştığını” değil, “neden böyle çalıştığını” da anlamak isterim.
[R] Mevcut dijital araçlar işimi görüyorsa, yeni teknolojilere geçiş benim için gereksiz bir yük oluşturur.
[S] İş süreçlerimde dijital araçların verimliliği nasıl artırabileceği üzerine bilinçli şekilde düşünürüm.
[S] Yapay zekâ, otomasyon veya veri temelli sistemlerin işime etkisini anlamaya çalışırım.
[R] Dijital araçların sık güncellenmesi veya değişmesi, iş motivasyonumu olumsuz etkiler.
[S] Dijital bir sorun yaşadığımda, çözümün mantığını kavramadan rahat edemem.
[S] Uzaktan veya çevrim içi çalışırken dikkatimi ve verimimi koruyacak yöntemler geliştiririm.
[R] Yeni bir dijital aracı öğrenmek için başkasının bana anlatmasını beklemeyi tercih ederim.
[S] Dijital güvenlik, veri gizliliği ve bilgi paylaşımı konularında riskleri fark ederek hareket ederim.
[S] Dijital araçların sağladığı verileri yorumlayarak kararlarımı gözden geçiririm.
[R] Dijitalleşmenin uzun vadede insan becerilerini zayıflatacağını düşünürüm.

BÖLÜM 2: ANALYTICAL (ANA)
[S] Bir karar almadan önce, eldeki bilgilerin güvenilirliğini sorgulama ihtiyacı hissederim.
[S] Karşılaştığım sorunlarda, görünen sonuçtan çok altında yatan nedenler ilgimi çeker.
[R] Çoğu durumda detaylı analiz yapmak yerine hızlı karar almak daha doğru gelir.
[S] Farklı kaynaklardan gelen bilgileri birleştirerek bütüncül bir tablo oluşturmaya çalışırım.
[S] Bir görüş bana doğru gelse bile, karşıt görüşlerin ne olabileceğini düşünürüm.
[R] Sayısal verilerle çalışmak karar verme sürecimi zorlaştırır.
[S] Sezgilerimle veriler çeliştiğinde, sezgilerimi yeniden gözden geçiririm.
[S] Karmaşık bir problemi daha küçük parçalara ayırarak anlamlandırırım.
[R] Bir çözüm işe yarıyorsa, alternatifleri düşünmeye gerek duymam.
[S] Neden–sonuç ilişkilerini fark etmek benim için doğal bir süreçtir.
[S] Bilginin kaynağı ve tutarlılığı, içeriğin kendisi kadar önemlidir.
[R] Analiz yapmak bazen gereksiz bir zaman kaybı gibi gelir.

BÖLÜM 3: RESULT (RES)
[S] Üzerime aldığım bir iş sonuçlanana kadar zihinsel olarak o işle meşgul olmaya devam ederim.
[S] Zor ve iddialı hedefler, çalışma isteğimi artırır.
[R] Beklenen sonuç elde edildiyse, sürecin nasıl yürütüldüğü benim için ikinci plandadır.
[S] Planladığım yol işe yaramadığında, alternatif yollar denemeye istekli olurum.
[S] Yaptığım işin başarısını, harcadığım zamandan çok ortaya çıkan sonuçla değerlendiririm.
[R] İşler planladığım gibi gitmediğinde motivasyonumu toparlamakta zorlanırım.
[S] Kısa vadede zorlayıcı olsa bile uzun vadede sonuç getirecek çabaları sürdürmeyi tercih ederim.
[S] Sorumluluk alanımda bir eksiklik gördüğümde, talimat beklemeden harekete geçerim.
[R] Mevcut performans seviyemi korumak benim için çoğu zaman yeterlidir.
[S] Başarısızlık yaşadığımda, nedenlerini analiz ederek yeniden denemeye çalışırım.
[S] Beklentilerin biraz üzerine çıkmak benim için önemli bir başarı göstergesidir.
[R] Bir hedefe ulaşmak için ekstra çaba harcamak çoğu zaman gereksizdir.

BÖLÜM 4: DETAIL (DET)
[S] Bir işi tamamladığımı düşünsem bile, hatasız olduğundan emin olmak için tekrar gözden geçirme ihtiyacı hissederim.
[S] Küçük gibi görünen bir hatanın, ilerleyen aşamalarda daha büyük sorunlara yol açabileceğinin farkındayım.
[R] Genel sonuç doğruysa, küçük detayların gözden kaçması benim için büyük bir sorun değildir.
[S] Talimatları veya prosedürleri uygulamadan önce neyin neden yapıldığını anlamaya çalışırım.
[S] Düzenli bir çalışma ortamının dikkatimi ve doğruluğumu artırdığını deneyimledim.
[R] Zaman baskısı altındayken detaylara aynı özeni göstermek benim için zordur.
[S] Kontrol listeleri, şablonlar veya standartlar kullanmanın hata riskini azalttığını düşünürüm.
[S] Tekrarlayan ve dikkat gerektiren işlerde konsantrasyonumu uzun süre koruyabilirim.
[R] Acele etmem gerektiğinde bazı kontrolleri bilinçli olarak atlayabilirim.
[S] Yaptığım işte kaliteyi sağlamak için gerektiğinde yavaşlamayı tercih ederim.
[S] Eksik veya tutarsız bir bilgi fark ettiğimde, bunu netleştirmeden ilerlemem.
[R] Detaylara fazla odaklanmak, çoğu zaman verimliliği düşürür.

BÖLÜM 5: LEARNING (LRN)
[S] Bilmediğim bir konuyla karşılaştığımda, bunu kişisel bir eksiklikten çok gelişim fırsatı olarak görürüm.
[S] Aldığım geri bildirimler ilk anda hoşuma gitmese bile, üzerinde düşünmeye çalışırım.
[R] İnsanların temel yeteneklerinin büyük ölçüde değişmediğine inanırım.
[S] Kendi hatalarımı savunmak yerine, nedenlerini anlamayı tercih ederim.
[S] Mevcut bilgi ve yöntemlerimin her zaman geliştirilebileceğini düşünürüm.
[R] Uzun süredir kullandığım yöntemler işe yarıyorsa, yenilerini denemek gereksizdir.
[S] Zorlayıcı ve alışık olmadığım görevler, öğrenme isteğimi artırır.
[S] Benden daha deneyimli veya bilgili kişilerle çalışmanın beni geliştirdiğini hissederim.
[R] Konfor alanımın dışına çıkmak performansımı genellikle düşürür.
[S] Bilmediğim bir şey sorulduğunda, bunu gizlemek yerine araştırmayı tercih ederim.
[S] Farklı alanlardan edindiğim bilgileri kendi işime uyarlamayı denerim.
[S] Öğrenme sürecinin süreklilik gerektirdiğine inanırım.

BÖLÜM 6: ETHICS (ETH)
[S] Kimsenin fark etmeyeceğini bilsem bile, yanlış olduğunu düşündüğüm bir davranışı yapmam.
[S] Hata yaptığımda, bunun sorumluluğunu üstlenmenin güven açısından önemli olduğunu düşünürüm.
[R] Sonuç yeterince önemliyse, bazı etik kuralların esnetilebileceğini düşünebilirim.
[S] Kısa vadede avantaj sağlasa bile, değerlerimle çelişen bir kazanç beni rahatsız eder.
[S] İş ortamında güvenin ancak tutarlı ve dürüst davranışlarla oluştuğuna inanırım.
[R] Bana adil davranılmadığını düşündüğümde performansımı bilinçli olarak düşürmek anlaşılabilir bir tepkidir.
[S] Verilen sözlerin tutulmasının profesyonel ilişkilerde temel bir unsur olduğunu düşünürüm.
[S] İşle ilgili gizli bilgilerin paylaşımında sınırların korunması gerektiğine inanırım.
[R] Çevremde herkes aynı etik ihlali yapıyorsa, buna uymamak gerçekçi değildir.
[S] Başkalarının emeğini veya fikrini izinsiz kullanmanın güveni zedelediğini düşünürüm.
[S] Etik olmayan bir durumu görmezden gelmek beni içsel olarak rahatsız eder.
[R] Küçük etik ihlallerin uzun vadede ciddi sonuçlar doğuracağını düşünmem.

BÖLÜM 7: DISCIPLINE (DIS)
[S] Kimse beni kontrol etmese bile, sorumluluklarımı zamanında yerine getirmeye çalışırım.
[S] Günlük işlerimi planlamadığımda performansımın belirgin şekilde düştüğünü fark ederim.
[R] Motivasyonum düşük olduğunda, işleri ertelemek benim için kaçınılmaz hale gelir.
[S] Yapmak istemediğim görevler olsa bile, bunları tamamlamadan rahat edemem.
[S] Teslim tarihlerini bağlayıcı bir taahhüt olarak görürüm.
[R] İşlerimi son ana bırakmak, baskı altında daha iyi çalışmamı sağlar.
[S] İş yüküm arttığında, önceliklendirme yaparak ilerlemeyi tercih ederim.
[S] Aksaklık yaşanacağını fark ettiğimde, bunu önceden ilgili kişilerle paylaşırım.
[R] Kendi kendime çalışırken dikkatimi korumakta zorlanırım.
[S] Disiplinli çalışmanın uzun vadede stresimi azalttığını deneyimledim.
[S] Kurallara uymanın yalnızca zorunluluk değil, profesyonelliğin bir parçası olduğunu düşünürüm.
[R] Başladığım işleri bitirmekte zaman zaman zorlandığımı kabul ederim.

BÖLÜM 8: STRESS & RESILIENCE (STR)
[S] Beklenmedik sorunlarla karşılaştığımda ilk tepkimi kontrol altına alabilirim.
[S] Baskı altında karar verirken duygularımın etkisini fark etmeye çalışırım.
[R] Olumsuz bir geri bildirim aldıktan sonra toparlanmam uzun sürer.
[S] Belirsizlik içeren durumlarda paniğe kapılmak yerine çözüm arayışına yönelirim.
[S] Yoğun ve zor dönemlerden sonra kendimi yeniden dengeleyebilirim.
[R] İşle ilgili olumsuz bir olay, günün geri kalanındaki performansımı ciddi şekilde etkiler.
[S] Stres altındayken bile iletişim dilimi korumaya özen gösteririm.
[S] Zorluklar karşısında tamamen vazgeçmek yerine koşullara uyum sağlamayı tercih ederim.
[R] Baskı arttığında hatalarımı kafama takmak performansımı düşürür.
[S] Kriz anlarında sakin kalabilmem, çevremdekilere de güven verir.
[S] Başarısızlıkları kişisel bir yetersizlikten çok geçici bir durum olarak görmeye çalışırım.
[R] Stresli dönemlerde duygusal tepkilerimi kontrol etmek benim için zordur.

BÖLÜM 9: TEAMWORK (TEA)
[S] Ekip içinde bilgi paylaşımının ortak başarıyı artırdığına inanırım.
[S] Kendi işim tamamlanmış olsa bile, ekip arkadaşlarımın ihtiyacı varsa destek olurum.
[S] Farklı bakış açılarının, ilk anda zorlayıcı olsa bile daha iyi sonuçlar doğurabileceğini düşünürüm.
[R] Ekip içindeki sorunlar beni doğrudan ilgilendirmediğinde müdahil olmam.
[S] Tartışmalarda kişilere değil, konuya ve çözüme odaklanmaya çalışırım.
[R] Takım çalışmaları çoğu zaman bireysel çalışmaya göre daha verimsizdir.
[S] Alınan ortak kararlara, kendi görüşüm farklı olsa bile destek vermeyi tercih ederim.
[S] Başarıyı bireysel bir kazanımdan çok ekip çalışmasının sonucu olarak görürüm.
[R] İş arkadaşlarımla mesafeli olmanın profesyonellik açısından daha doğru olduğunu düşünürüm.
[S] Yeni katılan ekip üyelerinin sürece uyum sağlamasına bilinçli olarak katkı sunarım.
[S] Ekip içinde güven ortamının performansı doğrudan etkilediğini düşünüyorum.
[R] Ekip içindeki hatalarla ilgilenmek yerine yalnızca kendi sorumluluklarıma odaklanırım.

BÖLÜM 10: COMMUNICATION (COM)
[S] Karşımdaki kişiyi dinlerken, vereceğim cevabı düşünmekten çok gerçekten ne anlatmak istediğini anlamaya odaklanırım.
[S] Düşüncelerimi ifade ederken hem açık hem de karşı tarafın algısını gözetmeye çalışırım.
[R] Zor veya hassas konuları konuşmak yerine, ortamın kendiliğinden düzelmesini beklemeyi tercih ederim.
[S] İletişimimde beden dilimin, ses tonumun ve kelime seçimimin etkisinin farkındayım.
[S] Olumsuz geri bildirim vermem gerektiğinde, kırıcı olmadan net olmayı önemserim.
[R] İnsanların söylediklerimi yanlış anlaması genellikle benim kontrolüm dışında gelişir.
[S] Yazılı iletişimimde (e-posta, mesaj, rapor) açık ve yanlış yoruma kapalı olmaya özen gösteririm.
[S] Tartışmalarda karşı tarafın bakış açısını anlamadan kendi görüşümü savunmam.
[R] Duygusal tepkilerimi iletişim sırasında kontrol etmekte zaman zaman zorlanırım.
[S] Geri bildirim verirken kişilik özelliklerinden çok davranışlara ve sonuçlara odaklanırım.
[S] Karmaşık bir konuyu, uzman olmayan birinin anlayabileceği şekilde sadeleştirebilirim.
[R] Konuşmalarımda bazen sonradan “bunu söylememeliydim” dediğim durumlar olur.

BÖLÜM 11: VALIDITY (LIE)
[L] Hayatım boyunca hiç kimseye, hiçbir konuda en ufak bir yalan bile söylemedim.
[L] Hiçbir zaman, hiçbir koşulda, hiç kimseye karşı olumsuz bir duygu hissetmedim.
[L] Yaptığım her işte her zaman eksiksiz ve hatasız oldum.
[L] Hayatımda hiçbir sorumluluğu ertelediğim bir an olmadı.
[L] Kimse hakkında, iyi niyetli bile olsa, arkasından hiç konuşmadım.
[L] Hiçbir zaman sinirlenmedim, öfkelenmedim veya kontrolümü kaybetmedim.
[L] Her zaman, her durumda, herkesle tamamen aynı fikirde oldum.
[L] Hiçbir zaman kuralları esnetme ihtiyacı hissetmedim.
[L] Tüm insanları her zaman eşit derecede severim.
[L] Hayatım boyunca verdiğim tüm sözleri, hiçbir istisna olmadan tuttum.
"""

def parse_questions(text):
    questions = []
    lines = text.strip().split('\n')
    current_cat = ""
    q_counter = 1
    # CAT_NAMES tersine çevrilerek kodları bulmak için kullanılabilir
    cat_map_reverse = {
        'DIGITAL': 'DIG', 'ANALYTICAL': 'ANA', 'RESULT': 'RES', 
        'DETAIL': 'DET', 'LEARNING': 'LRN', 'ETHICS': 'ETH', 
        'DISCIPLINE': 'DIS', 'STRESS': 'STR', 'TEAMWORK': 'TEA', 
        'COMMUNICATION': 'COM', 'VALIDITY': 'LIE'
    }
    
    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith("BÖLÜM"):
            for k, v in cat_map_reverse.items(): 
                if k in line: current_cat = v
            continue
        match = re.match(r'^\[([SRL])\]\s+(.*)', line)
        if match and current_cat:
            questions.append({"id": q_counter, "text": match.group(2), "type": match.group(1), "cat": current_cat})
            q_counter += 1
    return questions

# Export parsed questions for use in main.py
QUESTIONS = parse_questions(RAW_QUESTIONS_10_DIM)
