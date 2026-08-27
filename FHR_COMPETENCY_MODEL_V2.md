# FutureHR Role Competency Benchmark — FHR-COMP-JOB-2.0

## Amaç
FutureHR rol yetkinlik profilleri; yetkinlik testi sonuçlarını pozisyon gerekleriyle karşılaştırmak, rol uyumu, gelişim alanı, kariyer hazırlığı ve yetenek analizi için kanıta dayalı bir benchmark sağlar.

Bu benchmark bir klinik/psikometrik norm veya tek başına işe alma/terfi kararı değildir. Yüksek riskli kararlarda kurumun güncel iş analizi ve konu uzmanı (SME) doğrulaması gerekir.

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

`STR` artık yalnızca Dayanıklılık & Stres Yönetimi anlamına gelir. Eski `Stratejik Bakış` etiketi geriye dönük teknik uyumluluk dışında kullanılmaz. Stratejik düşünme gelecekte ayrı bir liderlik/yönetici assessment boyutu olarak ele alınmalıdır.

## Kaynak mimarisi
### 1. O*NET
Mesleklerin görev, work-style ve iş karakteristiği verileri rol ailesi ve ayırt edici davranış gereklilikleri için birincil uluslararası referanstır.
- https://www.onetonline.org/
- https://www.onetcenter.org/

Örnek doğrudan referanslar:
- 11-1011.00 Chief Executives
- 33-9032.00 Security Guards
- 13-1111.00 Management Analysts (strateji/analiz proxy)
- 13-1041.00 Compliance Officers (mevzuat/uyum proxy)
- 13-2011.00 Accountants and Auditors
- 27-3031.00 Public Relations Specialists

### 2. ESCO v1.2.1
Avrupa meslek sınıflandırması, ISCO bağlantıları ve Skills-Occupations Matrix; O*NET eşleşmesinin doğrudan olmadığı Türkiye/Avrupa rollerinde ikinci doğrulama katmanıdır.
- https://esco.ec.europa.eu/
- https://esco.ec.europa.eu/en/about-esco/publications/publication/skills-occupations-matrix-tables

### 3. U.S. OPM Job Analysis
Rol görevleri ile yetkinlikler arasında açık bağlantı kurulması, önem/kritiklik değerlendirmesi ve SME doğrulaması için metodolojik çerçevedir.
- https://www.opm.gov/policy-data-oversight/assessment-and-selection/job-analysis/

OPM yaklaşımındaki Importance, Need at Entry ve Distinguishing Value mantığı FutureHR'ın rol ağırlığı ve şirket kalibrasyon sürecine metodolojik temel sağlar.

## Hedef puan ölçeği
FutureHR 1.0–5.0 ölçeğini 0.1 hassasiyetle korur.

- 3.0–3.4: role katkı sağlar, sınırlı ayırt edicilik
- 3.5–3.9: düzenli iş gerekliliği
- 4.0–4.3: rol başarısı için önemli
- 4.4–4.6: çok önemli / güçlü beklenti
- 4.7–4.8: kritik yetkinlik
- 4.9: rolün ayırt edici çekirdek gereklerinden biri
- 5.0: istisnai; hata/uyumsuzluk/güvenlik maliyetinin çok yüksek olduğu temel gereklilik

Ondalık değerler ampirik olarak '4.7 kesin bilimsel gerçek' anlamına gelmez. Bunlar occupational evidence + rol ailesi + kıdem/seviye + görev bağlamının FutureHR kalibrasyonuyla üretilmiş benchmark değerleridir.

## Ağırlıklandırma
Her rol yalnızca 10 hedef puan tutmaz; rolün ayırt edici yetkinlikleri için toplamı %100 olan ağırlık seti de bulunur.

Bu nedenle örneğin bir strateji analistinde ANA/DET açığı ile COM açığı aynı etkiyi yaratmak zorunda değildir. Rol uyumu FHR-COMP-JOB-2.0 ağırlıklarıyla hesaplanır; recalibre edilmemiş roller geçiş sürecinde eşit ağırlıklı davranışı korur.

## Kanıt güveni
- A: güçlü/doğrudan occupational eşleşme
- B: güçlü composite/proxy eşleşme
- C: yerel veya kuruma özgü rol; SME doğrulaması daha önemlidir

Örneğin CEO için O*NET doğrudan eşleşmesi güçlüdür (A). Ticaret Sicil veya Kapasite Servisi gibi TSO-özel rollerde composite benchmark ve yerel iş analizi gerekir (B/C).

## Şirket kalibrasyonu
FutureHR benchmark şirket için başlangıç profilidir. Kurum aşağıdaki yöntemle kendi rol hedefini kalibre edebilir:
1. Güncel görev ve sorumlulukların doğrulanması
2. Rol sahibi + yönetici + İK/OD temsilcisinden SME puanlaması
3. Yetkinlik önem ve ayırt edicilik değerlendirmesi
4. FutureHR benchmark ile fark analizi
5. Anlamlı sapmalarda gerekçe kaydı
6. Belirli periyotlarda yeniden doğrulama

Benchmark ile şirket hedefi arasındaki sapma audit edilebilir olmalıdır.

## Batch planı
1. TSO + CEO / Strateji — **v2 recalibrated**
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

## Sürümleme
Model değişiklikleri `FHR-COMP-JOB-x.y` ile sürümlenir. Her rol profili için model sürümü, aile, seviye, evidence confidence, kaynaklar, gerekçe ve SME doğrulama durumu saklanır.
