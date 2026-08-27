# FutureHR Role Competency Benchmark — FHR-COMP-JOB-2.1

## Durum
**178 / 178 kanonik katalog rolü FHR-COMP-JOB-2.1 kapsamında rol bazında açık hedef profillere geçirilmiştir.**

Bu sürümde önemli mimari değişiklik şudur: kanonik rollerin hedef puanları artık family-average veya otomatik level formülüyle üretilmez. Her kanonik rol için 10 yetkinliğin hedef puanları açık ve sabit bir katalogda tutulur. Rol ailesi, seviye ve occupational evidence; puanların açıklanması, criticality ağırlıkları ve audit metadata için kullanılır.

Her rol için:
- 10 kanonik yetkinlikte 0,1 hassasiyetli hedef puan,
- toplamı %100 olan rol yetkinlik ağırlıkları,
- rol ailesi,
- organizasyon seviyesi (L1–L7),
- kanıt güven seviyesi (A/B/C),
- occupational evidence,
- kalibrasyon gerekçesi,
- SME doğrulama gereksinimi
saklanır.

## Amaç
FutureHR rol yetkinlik profilleri; yetkinlik testi sonuçlarını pozisyon gerekleriyle karşılaştırmak, rol uyumu, gelişim alanı, kariyer hazırlığı, yetenek analizi ve halefiyet karar desteği için kanıta dayalı bir benchmark sağlar.

Bu benchmark klinik/psikometrik norm değildir ve tek başına işe alma, terfi, işten çıkarma veya ücret kararı üretmez. Yüksek etkili insan kararlarında kurumun güncel iş analizi ve konu uzmanı (SME) doğrulaması gerekir.

## Kanonik 10 yetkinlik
- DIG — Dijital Okuryazarlık
- ANA — Analitik Düşünme
- RES — Sonuç Odaklılık
- DET — Detaylara Özen
- LRN — Sürekli Öğrenme
- ETH — Etik ve Uyum
- DIS — Öz-Disiplin
- STR — Dayanıklılık & Stres Yönetimi
- TEA — Takım Çalışması
- COM — İletişim Becerileri

`STR` yalnızca **Dayanıklılık & Stres Yönetimi** anlamına gelir. Eski `Stratejik Bakış` etiketi geriye dönük teknik veri uyumluluğu dışında yeni hedef puan üretiminde kullanılmaz. Stratejik düşünme, mevcut FHR-COMP-1.2 testinin ölçmediği ayrı bir liderlik/yönetici assessment boyutu olarak ele alınmalıdır.

## Kanıt mimarisi
### 1. O*NET 30.3
O*NET meslek görevleri, occupational information ve Work Styles verileri rol ailelerinin davranışsal gerekliliklerini kalibre etmek için birincil uluslararası referanstır. Work Styles içindeki Impact ve Distinctiveness yaklaşımı, bir özelliğin yalnızca olumlu olmasını değil, ilgili işin performansında ne kadar önemli ve ayırt edici olduğunu yorumlamak için kullanılır.

Başlıca family referansları:
- Chief Executives
- Human Resources Managers / Specialists
- Financial Managers / Accountants and Auditors / Financial Analysts
- Purchasing Managers
- General and Operations Managers / Industrial Engineers
- Sales Managers / Marketing Managers
- Computer and Information Systems Managers / Software Developers / Data Scientists
- Lawyers / Compliance Officers
- Public Relations Managers / Specialists
- Administrative Services Managers / Executive Administrative Assistants

Kaynaklar:
- https://www.onetonline.org/
- https://www.onetcenter.org/dictionary/30.3/text/work_styles.html

### 2. ESCO v1.2.1
ESCO Skills–Occupations Matrix ve ISCO bağlantıları, O*NET ile bire bir eşleşmeyen Avrupa/Türkiye rolleri için ikinci referans ve crosswalk katmanıdır.

Kaynak:
- https://esco.ec.europa.eu/en/about-esco/publications/publication/skills-occupations-matrix-tables

### 3. U.S. OPM Job Analysis
OPM yaklaşımı görevler ile yetkinlikler arasında açık iş ilişkisi kurulmasını, önem/kritiklik değerlendirmesini, SME katılımını ve yöntemin dokümante edilmesini önerir. FutureHR'ın şirket kalibrasyon katmanı bu ilkelere dayanır.

Kaynaklar:
- https://www.opm.gov/policy-data-oversight/assessment-and-selection/job-analysis/
- https://www.opm.gov/frequently-asked-questions/assessment-policy-faq/job-analysis/what-is-a-job-analysis/

## FHR-COMP-JOB-2.1 kalibrasyon yaklaşımı
Kanonik roller için nihai hedef şu katmanların uzman değerlendirmesiyle belirlenir:
1. **Occupational evidence** — O*NET/ESCO rol veya en yakın proxy verisi
2. **İş ailesi** — rolün temel çalışma karakteristiği
3. **Organizasyon seviyesi** — sorumluluk, karar ve kapsam
4. **Role-specific task context** — alt uzmanlığın gerçek iş gerekleri
5. **Profile-shape review** — tüm yetkinliklerin gereksiz biçimde 4,5+ sıkışmasının önlenmesi
6. **SME validation** — şirketin gerçek görev tanımıyla son doğrulama

**Önemli:** v2.1'de 178 kanonik rol için nihai hedefler otomatik family-average formülünden hesaplanmaz; explicit curated catalog içinde tutulur. Family ve level modelleri bilinmeyen şirket rollerinde fallback, ağırlık ve evidence metadata katmanında kullanılır.

## Pozisyon alias / kanonik rol mimarisi
Şirketler aynı işi farklı adlarla tanımlayabildiği için FutureHR önce pozisyon adını kanonik role çözer.

Örnekler:
- `İnsan Kaynakları Müdürü` → `İK Müdürü`
- `HR Manager` → `İK Müdürü`
- `Human Resources Director` → `İK Direktörü`
- `Finance Manager` → `Finans Müdürü`
- `Software Developer` → `Yazılım Mühendisi`
- `Data Scientist` → `Veri Analisti / Data Scientist`

Resolver sırası:
1. bire bir kanonik ad,
2. tanımlı alias,
3. kontrollü normalize edilmiş eşleşme,
4. eşleşme yoksa family + level fallback.

Alias ile bulunan rol **exact benchmark** kabul edilir; family-average'a düşmez. Resolver ayrıca kullanılan kanonik pozisyonu, eşleşme yöntemini ve alias kullanılıp kullanılmadığını döndürür. Böylece audit edilebilirlik korunur.

## Hedef puan ölçeği
FutureHR 1,0–5,0 ölçeğini **0,1 hassasiyetle** korur.

- 3,0–3,4: role katkı sağlar, sınırlı ayırt edicilik
- 3,5–3,9: düzenli iş gerekliliği
- 4,0–4,3: rol başarısı için önemli
- 4,4–4,6: çok önemli / güçlü beklenti
- 4,7–4,8: kritik yetkinlik
- 4,9: rolün ayırt edici çekirdek gereklerinden biri
- 5,0: istisnai; hata/uyumsuzluk/güvenlik maliyetinin çok yüksek olduğu temel gereklilik

Ondalık değerler “4,7 bilimsel olarak kesin gerçek” anlamına gelmez. Bu değerler occupational evidence + rol içeriği + seviye + FutureHR kalibrasyon mantığı ile oluşturulan referans benchmark'lardır.

## Profil sıkışmasını önleme ilkesi
Bir yönetici rolü, yalnızca kıdemli olduğu için 10 boyutun tamamında 4,5–5,0 olmak zorunda değildir. Profilin rolü ayırt etmesi gerekir.

Örnek mantık:
- İK Müdürü: ETH/COM/TEA yüksek, DIG/LRN/DET/ANA rol ihtiyacına göre farklılaşır.
- Data Scientist: ANA/DIG/DET/LRN çok yüksek olabilir; COM/TEA daha orta-yüksek kalabilir.
- Muhasebe Uzmanı: DET/ETH/DIS çok yüksek; liderlik benzeri sosyal boyutların aynı seviyede olması gerekmez.
- CEO: RES/COM/STR yüksek; DET teknik uzman seviyesinin altında olabilir.

Bu nedenle v2.1 katalogda “her şey yüksek” yerine **rol şekli** korunur.

## Seviyeler
- L1 — Başlangıç / Destek
- L2 — Uzman / Profesyonel
- L3 — Kıdemli Uzman / Sorumlu / Süpervizör
- L4 — Müdür / Takım Lideri
- L5 — Direktör / Fonksiyon Lideri
- L6 — Başkan Yardımcısı / Üst Fonksiyon Yönetimi
- L7 — C-Level / Tepe Yönetim

Seviye tüm yetkinlikleri otomatik artırmaz. Bir uzman DET veya ANA boyutunda üst yöneticiden daha yüksek hedefe sahip olabilir.

## Rol aileleri
1. TSO + Yönetim Kurulu + CEO / Strateji
2. İnsan Kaynakları
3. Finans & Muhasebe
4. Satın Alma & Tedarik Zinciri
5. Operasyon & Üretim
6. Satış & Pazarlama
7. BT & Dijital
8. Hukuk & Uyum
9. Kurumsal İletişim & Sürdürülebilirlik
10. Denetim / Risk / Kalite
11. İdari İşler & Destek

TSO'ya özgü `Ticaret Sicil`, `Kapasite`, `Proje ve Sanayi` vb. roller tek bir uluslararası mesleğe zorla eşlenmez; composite benchmark + ESCO crosswalk + yerel SME doğrulaması yaklaşımı kullanılır.

## Ağırlıklandırma
Her kanonik rol için 10 yetkinliğin toplamı %100 olan **criticality/weight** seti bulunur. Ağırlıklar rol ailesinin occupational importance yapısı ve explicit rol hedeflerinin criticality sinyalinden türetilir.

Bu nedenle örneğin:
- Data Scientist için ANA/DIG/DET/LRN,
- Satış Müdürü için RES/COM/STR,
- Muhasebe için DET/ETH/ANA,
- Uyum için ETH/DET/ANA,
- Üretim için RES/DET/DIS/STR
aynı ağırlıkta değildir.

Rol uyumu ve kariyer hazırlığı düz 10'lu ortalama yerine bu rol ağırlıklarıyla hesaplanır. Alias ile eşleşen pozisyonda ağırlıklar da kanonik rol üzerinden alınır.

## Kanıt güveni
- **A:** güçlü/doğrudan occupational eşleşme
- **B:** güçlü composite/proxy eşleşme
- **C:** yerel, jenerik veya kuruma özgü rol; SME doğrulaması daha önemlidir

Confidence, kişinin işe uygunluğunun güven skoru değildir; rol benchmark'ının dış kaynaklarla eşleşme gücünü ifade eder.

## Şirket kalibrasyonu
FutureHR benchmark şirket için başlangıç profilidir. Kurum:
1. Güncel görev ve sorumlulukları doğrular
2. Rol sahibi + yönetici + İK/OD temsilcisinden SME girdisi alır
3. Yetkinlik importance/criticality değerlendirmesi yapar
4. FutureHR benchmark ile fark analizi yapar
5. Anlamlı sapmalarda gerekçe kaydeder
6. Organizasyon veya iş değiştiğinde profili yeniden doğrular

Benchmark ile şirket hedefi arasındaki sapma audit edilebilir olmalıdır.

## Kullanım sınırları
- Tek başına işe alma, işten çıkarma, terfi veya ücret kararı üretmez.
- Test sonucu kişinin potansiyelini kesin tahmin eden doğrulanmış prediktif model olarak sunulmaz.
- Kritik kararlar insan değerlendirmesi, performans verisi, iş analizi ve organizasyon bağlamı ile birlikte ele alınır.
- Gerçek müşteri verisi biriktikçe kriter geçerliği, performans korelasyonu ve rol bazlı norm çalışmaları ayrıca yürütülmelidir.

## Sürümleme
Model değişiklikleri `FHR-COMP-JOB-x.y` ile sürümlenir. Her rol için model sürümü, aile, seviye, evidence confidence, kaynaklar, gerekçe ve SME doğrulama bilgisi saklanır.

Mevcut katalog sürümü: **FHR-COMP-JOB-2.1 — 178/178 kanonik rol explicit curated profile + alias-aware resolution.**
