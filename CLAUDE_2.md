# BrickKasa — Kişisel LEGO Koleksiyon Takip Uygulaması

Kişisel kullanım için LEGO koleksiyon takibi (Aşama 1) ve genel fiyat düşüşü takibi (Aşama 2). Açık kaynak yayınlanabilir, ticari amaç yok.
Hem PC hem mobilden kullanılacak (responsive web + PWA, gerekirse APK). Arayüz dili: **Türkçe**. Kod, değişken adları ve commit mesajları: **İngilizce**.

## Teknoloji

- **Next.js (App Router) + TypeScript** — tek repo, frontend + API route'ları birlikte
- **Tailwind CSS** — mobil öncelikli (mobile-first) tasarım
- **Turso (libSQL, SQLite uyumlu) + Drizzle ORM** — geliştirmede lokal SQLite dosyası (`file:local.db`), yayında Turso. Bağlantı `TURSO_DATABASE_URL` ve `TURSO_AUTH_TOKEN` ile; kod iki ortamda da aynı çalışmalı.
- **Dağıtım: Vercel (ücretsiz Hobby planı)** — GitHub'a push edilince otomatik yayın. Bilgisayar kapalıyken de 7/24 erişilebilir olmalı. **Hedef: aylık maliyet sıfır**; ücretsiz plan limitlerini aşacak tasarımdan kaçın.
  - Vercel fonksiyonlarının süre limiti olduğu için **büyük katalog içe aktarma (Rebrickable CSV) Vercel'de çalışmaz**: kullanıcının bilgisayarında çalışan bir script (`npm run catalog:import`) ile doğrudan Turso'ya yazılır.
  - Rebrickable/Brickset istekleri kısa tutulur ve sonuçları Turso'ya cache'lenir.
- **Mobil erişim:**
  - **Birincil: PWA** — manifest, ikonlar, service worker; Android'de "Uygulamayı yükle" ile tam ekran, kendi ikonuyla çalışmalı.
  - **Yedek plan: APK** — PWA yetersiz kalırsa aynı PWA'dan PWABuilder veya Bubblewrap ile APK üretilir (Play Store gerekmez, elle kurulur). Bunun için PWA kriterlerini eksiksiz karşıla (geçerli manifest, HTTPS, service worker, 192px ve 512px ikonlar) ki dönüşüm sorunsuz olsun.
- **Kimlik doğrulama zorunlu:** Uygulama internete açık olacağı için tek kullanıcılı basit bir giriş (şifre + oturum çerezi) olmalı. Giriş yapmadan hiçbir sayfa veya API route'u erişilebilir olmamalı.

## Dış veri kaynakları

- **Rebrickable API v3** (`REBRICKABLE_API_KEY`): setler, set envanterleri, parçalar, renkler, alternatif modeller ve MOC'lar.
  - Set envanteri: `/api/v3/lego/sets/{set_num}/parts/` — `is_spare` alanı yedek (fazlalık) parçaları işaretler
  - Alternatif buildler: `/api/v3/lego/sets/{set_num}/alternates/`
  - MOC envanteri: `/api/v3/lego/mocs/{moc_num}/parts/`
  - Rate limit var (~1 istek/sn): tüm yanıtlar veritabanına cache'lenmeli, aynı veri tekrar çekilmemeli.
  - **Tam katalog gerekli:** Koleksiyon ekranlarında sahip OLUNMAYAN setler de görüneceği için tüm setler, temalar ve minifigürler veritabanında olmalı. Bunun için Rebrickable'ın toplu CSV indirmeleri (sets, themes, minifigs, inventories, parts, colors) kullanılır; bilgisayardan çalıştırılan `catalog:import` scriptiyle Turso'ya yazılır ve periyodik olarak tekrar çalıştırılarak güncellenir. Turso ücretsiz plan depolama limitine dikkat: sadece gerekli tablo ve sütunlar aktarılır.
  - **Aşamalı, tema bazlı aktarım:**
    - Hafif veriler (temalar, set listesi, minifigür listesi, renkler) her zaman tamamen aktarılır. Küçük olduklarından sorun çıkmaz ve tüm temaların koleksiyon ilerlemesi ile filtreleri için gereklidir.
    - Ağır veriler (set parça envanterleri, set–minifigür eşleşmeleri) **tema tema, otomatik bir sırayla** aktarılır. Kullanıcı tema seçmek veya tek tek komut çalıştırmakla uğraşmaz.
    - **Sıra:** önce **Marvel** (tüm alt temalarıyla), ardından kalan temalar kendiliğinden (örn. set sayısı çok olandan aza). Öncelik listesi bir config dosyasında durur, ileride değiştirilebilir.
    - İlerleme bir tabloda (`import_queue`: tema, durum, son güncelleme) tutulur. Script her çalıştığında kaldığı yerden devam eder; yarıda kesilirse veri bozulmaz (idempotent, tema başına transaction).
    - **Otomasyon:** Bir GitHub Actions zamanlanmış iş akışı (örn. her gece) scripti çalıştırıp sıradaki temaları Turso'ya aktarır; bilgisayarın açık olması gerekmez. Tüm temalar bitince aynı iş akışı periyodik olarak Rebrickable'daki yeni setleri ve değişiklikleri günceller. Gerekirse `npm run catalog:import` ile elle de tetiklenebilir.
    - Turso ücretsiz depolama limitine yaklaşılırsa aktarım durur ve uygulamada uyarı gösterilir (hata vererek çökmez).
    - Aktarılmamış bir temadan set eklenirse o setin envanteri anında Rebrickable API'den çekilip cache'lenir; kullanıcı hiçbir zaman "veri yok" ile karşılaşmaz. API sadece eksik/güncel detaylar için.
- **Brickset API v3** (`BRICKSET_API_KEY`): setlerin piyasaya çıkış/emeklilik (exit) tarihleri.
  - Tarih yoksa "bilinmiyor" göster; kullanıcı tahmini tarihi elle girebilsin (manuel değer API değerinin önüne geçer).
- **Görseller:** İndirilip repoya konmaz; API'nin verdiği görsel URL'leri kullanılır. README'de Rebrickable ve Brickset'e atıf yapılır.
- API anahtarları `.env.local` içinde; `.env.example` repoda olur, gerçek anahtarlar asla commit edilmez.

## Temel kavramlar (önemli)

Bir parça her zaman **parça numarası + renk** ikilisiyle tanımlanır. Aynı parça farklı renkte farklı kayıttır.

- **Toplam parça havuzu** = sahip olunan setlerin tüm parçaları (yedekler dahil) − eksik parçalar + elle eklenen gevşek parçalar
- **Fazlalık havuzu** = setlerden gelen yedek parçalar (`is_spare`) + çok modlu setlerde seçilen moda göre artan parçalar + elle eklenen gevşek parçalar
- Çok modlu setlerde (örn. Back to the Future DeLorean) toplam parça değişmez; sadece hangi parçaların "fazlalık" sayılacağı seçilen moda göre değişir.

## Veri modeli (taslak)

Cache tabloları (dış API'den):
- `catalog_themes` — id, parent_id, name (Rebrickable tema hiyerarşisi: ana tema → alt tema)
- `catalog_sets` — set_num, name, year, theme_id, subtheme (Brickset), num_parts, img_url, launch_date, exit_date, exit_date_manual
- `catalog_minifigs` — fig_num, name, num_parts, img_url
- `set_minifigs` — set_num, fig_num, quantity (hangi setten hangi figürler çıkıyor)
- `catalog_parts` — part_num, name, img_url
- `catalog_colors` — color_id, name, rgb
- `set_inventory` — set_num, part_num, color_id, quantity, is_spare

Kullanıcı tabloları:
- `owned_sets` — id, set_num, acquired_at, build_mode_id (nullable), status (kutuda/yapıldı/söküldü), notes. Aynı setten birden fazla olabilir.
- `missing_parts` — owned_set_id, part_num, color_id, quantity
- `loose_parts` — part_num, color_id, quantity, note (setten bağımsız elle eklenenler)
- `build_modes` — id, set_num, name (örn. "Part II – Uçan mod")
- `build_mode_leftovers` — build_mode_id, part_num, color_id, quantity (bu mod yapıldığında artan parçalar; elle tanımlanır)
- `wishlist` — set_num, priority, note, added_at
- `custom_collections` — id, name, description, cover_img (kullanıcının elle tanımladığı seriler, örn. "Marvel Modular")
- `custom_collection_items` — collection_id, set_num veya fig_num

Toplamlar view veya sorgu ile hesaplanır, ayrı tabloda saklanmaz.

## Özellikler

1. **Set ekleme:** Set numarasıyla ara (örn. `10300-1`) → bilgiler ve envanter çekilip cache'lenir → koleksiyona eklenir.
2. **Eksik parça işaretleme:** Set eklerken veya sonradan, envanterden parça seçip eksik adedi gir. Ayrı "Eksikler" sayfası, sete göre gruplu.
3. **Mod seçimi:** Set için `build_modes` tanımlıysa, eklerken/düzenlerken "Hangi modu yaptın?" diye sor; seçime göre fazlalık havuzu güncellenir.
4. **Parça envanteri:** Toplam havuz ve fazlalık havuzu ayrı sekmelerde; parça/renk/kategoriye göre filtre ve arama; toplam parça sayısı.
5. **Alternatif buildler:** Bir setin alternatiflerini ve MOC'ları listele; seçilen havuza (toplam / fazlalık) göre yapılabilirlik yüzdesi ve eksik parça listesi.
6. **Emeklilik tarihi:** Her set kartının altında; emekliliğe yakın olanlar (örn. 6 ay içinde) vurgulu.
7. **İstek listesi:** Comic Geeks tarzı; öncelik, not, emeklilik tarihine göre sıralama.
8. **Koleksiyon ilerlemesi (League of Legends skin koleksiyonu mantığı):** Uygulamanın ana hissi bu olmalı.
   - Her tema, alt tema ve özel koleksiyon için "**3 / 4 toplandı — %75**" gibi sayaç ve ilerleme çubuğu.
   - Koleksiyon sayfasında serinin TÜM setleri grid halinde görünür: sahip olunanlar renkli, olmayanlar gri/soluk (kilitli skin gibi), istek listesindekiler ayrı rozetle.
   - Otomatik koleksiyonlar Rebrickable tema hiyerarşisinden gelir (örn. Marvel → alt temalar). Katalogda tek bir tema olarak geçmeyen seriler (örn. Marvel Modular binaları) için **özel koleksiyon** oluşturulup setler elle seçilir.
   - Ana sayfada genel özet: toplam set, toplam parça, toplam minifigür, en çok ilerlenen koleksiyonlar.
9. **Minifigür koleksiyonu:**
   - Sahip olunan setlerden gelen minifigürler otomatik olarak koleksiyona eklenir (`set_minifigs` üzerinden).
   - Collectible Minifigures (CMF) serileri: her seri için "**8 / 12 toplandı — %67**". Tek tek figür eklenebilir (paketten çıkan figür).
   - Figürler için de aynı gri/renkli grid görünümü.
10. **Filtreleme ve sıralama (LoL koleksiyon filtresi gibi):** Tüm koleksiyon ekranlarında ortak filtre çubuğu.
   - Filtreler: tema / alt tema (çoklu seçim), yıl aralığı, sahiplik (sahip olunan / olmayan / istek listesi), durum (piyasada / emekli / yakında emekli), parça sayısı aralığı, isim veya set numarası araması.
   - Sıralama: isim, yıl, parça sayısı, emeklilik tarihi, eklenme tarihi.
   - Filtre durumu URL'de tutulur (paylaşılabilir/yer imi eklenebilir, geri tuşu çalışır).

## Geliştirme sırası (Aşama 1: LEGO)

1. Proje iskeleti, Tailwind, Drizzle + libSQL (lokal dosya), `.env.example`, basit giriş sistemi
2. Rebrickable CSV katalog içe aktarma: hafif veriler + Marvel envanterleri, otomatik tema kuyruğu (`import_queue`) + API istemcisi ve cache katmanı
3. Set arama/ekleme + sahip olunan setler listesi
4. Koleksiyon ekranları: tema ilerlemesi (x / y, %), gri/renkli grid, ortak filtre çubuğu
5. Özel koleksiyonlar (örn. Marvel Modular)
6. Minifigür koleksiyonu + CMF seri ilerlemesi
7. Parça envanteri (toplam + fazlalık)
8. Eksik parça takibi
9. Çok modlu setler (`build_modes`, mod seçimi)
10. Brickset entegrasyonu + emeklilik tarihleri
11. İstek listesi
12. Alternatif build / MOC eşleştirme
13. PWA (manifest, ikonlar, service worker), Turso + Vercel'e dağıtım, kalan temaları aktaran GitHub Actions zamanlanmış iş akışı, veritabanı yedekleme scripti, README
14. (Gerekirse) PWABuilder/Bubblewrap ile APK üretimi

Her adım bitince çalışır durumda olmalı ve commit atılmalı.

## Aşama 2: Fiyat Takibi modülü

LEGO kısmı (Aşama 1, adım 1–14) kullanılır hale gelmeden bu modüle **başlanmaz**. Aynı uygulamanın içinde ayrı bir bölüm ("Fiyat Takibi") olarak yapılır; aynı giriş, veritabanı ve bildirim altyapısını kullanır.

**Amaç:** Aynı ürünü birden fazla siteden ekleyip fiyat düştüğünde bildirim almak. Kişisel kullanım, satış yok.

- **Genel amaçlı:** Sadece LEGO değil, herhangi bir ürün takip edilebilir. Bir ürün isteğe bağlı olarak bir LEGO setine (`set_num`) bağlanır; bağlıysa set kartında ve istek listesinde fiyatlar ve "fiyat düştü" rozeti görünür.
- **Siteler:** Amazon.com.tr, LEGO Türkiye, Hepsiburada, Trendyol, n11, Müller, Amazon.de, LEGO.de.
- **Site adaptörleri:** Her site için ayrı, bağımsız bir adaptör (URL → fiyat, stok, para birimi). Bir sitenin yapısı değişince sadece o adaptör bozulur, gerisi çalışmaya devam eder. Yeni site eklemek tek dosya eklemek kadar kolay olmalı.
- **Önce kendi kodumuz:** Fiyat çekme mümkün olduğunca kendi kodumuzla yapılır. Bir site kendi kodumuzla güvenilir şekilde çekilemiyorsa hazır servis (örn. Keepa) sadece o boşluk için düşünülür; ücretli bir servis eklemeden önce mutlaka kullanıcıya sorulur.
- **Nerede çalışır:** Fiyat kontrolü Vercel'de DEĞİL, **GitHub Actions zamanlanmış iş akışında** (örn. günde birkaç kez) çalışır; bilgisayar kapalıyken de çalışır. LEGO tarafından tamamen bağımsızdır; fiyat çekme hata verse bile uygulama etkilenmez.
- **Sitelere saygılı:** İstekler arasında bekleme, makul User-Agent, gereksiz tekrar yok. Engellenen veya bozulan bir ürün linki "kontrol edilemiyor" olarak işaretlenir ve kullanıcıya gösterilir; script çökmez.
- **Para birimi:** TL ve EUR fiyatlar ayrı saklanır. Karşılaştırma için EUR fiyatlar ücretsiz bir kur kaynağıyla (örn. TCMB günlük kurları) TL'ye çevrilerek de gösterilir.
- **Bildirimler — tek kanal:** Tüm bildirimler (fiyat düşüşü, LEGO emeklilik uyarıları vb.) **tek bir kanaldan**, uygulamanın kendi **Web Push (PWA) bildirimleriyle** gelir (Android). Bildirimi GitHub Actions'taki iş gönderir (`web-push`, VAPID anahtarları).
- **Bildirim kuralları (ürün başına):** herhangi bir düşüş / belirli bir fiyatın altına inme / yüzde X düşüş / en düşük fiyat rekoru. Aynı düşüş için tekrar bildirim gönderilmez.
- **Fiyat geçmişi:** Ürün sayfasında site site fiyat grafiği ve en düşük fiyat.
- **Turso yazma limiti:** Fiyat kaydı sadece fiyat **değiştiğinde** yazılır, her kontrolde değil.

Veri modeli (taslak):
- `tracked_products` — id, name, img_url, set_num (nullable), notes, created_at
- `product_listings` — id, product_id, site, url, currency, status (aktif / kontrol edilemiyor), last_checked_at, last_price
- `price_history` — listing_id, price, in_stock, recorded_at (sadece değişimde)
- `price_alerts` — product_id, type (any_drop / below / percent / all_time_low), value, last_notified_price
- `push_subscriptions` — endpoint, keys, device_name

Geliştirme sırası (Aşama 2):
15. Veri modeli + ürün ve link ekleme ekranı (LEGO setine bağlama dahil)
16. Site adaptörü altyapısı + ilk adaptörler (LEGO TR, LEGO.de), sonra diğer siteler tek tek
17. GitHub Actions zamanlanmış fiyat kontrolü
18. Web Push bildirimleri + bildirim kuralları
19. Fiyat geçmişi grafiği, istek listesi ve set kartı entegrasyonu
20. Kur çevirisi ve siteler arası karşılaştırma

## Kurallar

- Mobil öncelikli tasarım; her ekran telefonda da rahat kullanılmalı.
- Dış API çağrıları sadece sunucu tarafında (API route / server action); anahtarlar istemciye sızmamalı.
- Veritabanı şeması değişikliklerinde Drizzle migration kullan.
- Kullanıcıya görünen tüm metinler Türkçe.
- **Uygulama hiçbir yapay zeka API'si (Claude, OpenAI vb.) kullanmaz.** Çalışırken ücretli bir servise bağımlı olmamalı; tek dış bağlantılar ücretsiz Rebrickable ve Brickset API'leri, Aşama 2'de takip edilen mağaza sayfaları ve ücretsiz kur kaynağıdır.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — migration + production build
- `npm run typecheck` / `npm run lint`
- `npm run db:generate` — şema değişikliğinden Drizzle migration üret; `npm run db:migrate` — uygula
- `npm run db:backup` / `npm run db:restore -- <dosya>` — kullanıcı verisi yedeği
- `npm run catalog:import` — Rebrickable CSV aktarımı (`--light-only`, `--max-rows=N`)
- `npm run catalog:brickset` — Brickset tarih senkronu
- `npm run prices:check` — fiyat kontrolü + bildirim (GitHub Actions)
- `npm run notify:retirements` — emeklilik bildirimleri
- `npm run secrets:push` — `.env.local` → GitHub Actions secret'ları
- `npx tsx scripts/price-test.ts <url>` — bir mağaza adaptörünü dene
