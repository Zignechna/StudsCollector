# StudsCollector

Kişisel LEGO koleksiyon takip uygulaması: setler, minifigürler, parça envanteri, eksik parçalar, çok modlu setler, istek listesi, emeklilik tarihleri, alternatif build / MOC eşleştirme ve mağazalar arası **fiyat takibi** (Web Push bildirimli).

PC ve telefonda çalışır (responsive web + PWA). Arayüz Türkçedir.

> Kurulum adımları (API anahtarları, Turso, Vercel) için: **[KURULUM.md](KURULUM.md)**

## Özellikler

- **Koleksiyon ilerlemesi** — her tema / alt tema / özel koleksiyon için "3 / 4 toplandı — %75". Sahip olmadığın setler kilitli (gri) görünür.
- **Ortak filtre çubuğu** — tema (çoklu), yıl aralığı, sahiplik, durum (piyasada / yakında emekli / emekli), parça sayısı, arama, sıralama. Filtreler URL'de tutulur.
- **Set ekleme** — numara veya isimle ara; parça listesi ve minifigürler otomatik gelir (katalogda yoksa Rebrickable API'den çekilip cache'lenir).
- **Eksik parçalar** — set sayfasında parça bazında işaretle; ayrı "Eksikler" sayfası, Rebrickable CSV dışa aktarımı.
- **Çok modlu setler** — her mod için artan parçaları bir kez tanımla, kopya başına hangi modu yaptığını seç.
- **Parça envanteri** — toplam havuz ve fazlalık havuzu; renk / kategori filtresi; gevşek parça ekleme.
- **Minifigürler** — setlerden otomatik; CMF serileri için seri ilerlemesi; tek figür ekleme.
- **Alternatif build / MOC** — seçilen havuza göre yapılabilirlik yüzdesi ve eksik parça listesi.
- **Emeklilik tarihleri** — Brickset'ten; yoksa elle tahmini tarih girilebilir. 6 ay içinde emekli olacaklar vurgulanır.
- **İstek listesi** — öncelik, not, emeklilik ve fiyat sıralaması.
- **Fiyat takibi** — LEGO Türkiye (lego.tr), LEGO.de, Amazon.com.tr, Amazon.de, Hepsiburada, Trendyol, n11, Müller. Kural bazlı bildirimler (herhangi düşüş / hedef fiyat / yüzde / en düşük rekor), fiyat geçmişi grafiği, TCMB kuru ile EUR→TL.
- **PWA** — Android'de "Uygulamayı yükle"; çevrimdışı sayfa; Web Push bildirimleri.
- **Giriş zorunlu** — tek kullanıcılı şifre + imzalı oturum çerezi; şifre uygulama içinden değiştirilebilir.

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM · Turso (libSQL) · Vercel (Hobby) · GitHub Actions · web-push

Hedef aylık maliyet: **0 TL**. Uygulama hiçbir yapay zeka API'si veya ücretli servis kullanmaz.

## Mimari

| Parça | Nerede çalışır |
| --- | --- |
| Web uygulaması + API route'ları | Vercel |
| Veritabanı | Turso (geliştirmede `local.db` SQLite dosyası) |
| Rebrickable CSV katalog aktarımı | GitHub Actions (her gece) veya `npm run catalog:import` |
| Brickset tarih senkronu + emeklilik bildirimleri | GitHub Actions (her gece) |
| Fiyat kontrolü + fiyat bildirimleri | GitHub Actions (günde 3 kez) |
| Haftalık şifreli yedek | GitHub Actions artifact |

Katalog aktarımı tema tema ilerler: önce **Marvel** (tüm alt temaları), sonra Collectible Minifigures, ardından kalan temalar set sayısı çoktan aza. Öncelik listesi: [`config/import-priority.json`](config/import-priority.json). İlerleme `import_queue` tablosunda; script yarıda kesilse bile kaldığı yerden devam eder. Turso depolama limitine yaklaşılırsa aktarım durur ve uygulamada uyarı görünür.

Fiyat adaptörleri: [`src/lib/price/adapters/`](src/lib/price/adapters) — her site ayrı dosya. Yeni site eklemek: bir adaptör dosyası + `index.ts` ve `sites.ts` kaydı.

## Komutlar

```bash
npm run dev               # geliştirme sunucusu (http://localhost:3000)
npm run build             # migration + production build
npm run start             # production sunucusu
npm run typecheck         # TypeScript kontrolü
npm run lint              # ESLint

npm run db:generate       # şema değişikliğinden Drizzle migration üret
npm run db:migrate        # migration'ları uygula (lokal veya Turso)
npm run db:studio         # Drizzle Studio
npm run db:backup         # kullanıcı verisini backups/ altına JSON olarak yedekle
npm run db:restore -- <dosya.json>   # yedekten geri yükle

npm run catalog:import    # Rebrickable CSV aktarımı (hafif veriler + sıradaki temalar)
npm run catalog:import -- --light-only        # sadece hafif veriler
npm run catalog:import -- --max-rows=50000    # bu çalıştırmada yazılacak satır üst sınırı
npm run catalog:brickset  # sahip olunan / istek listesindeki setlerin Brickset tarihleri
npm run prices:check      # fiyat kontrolü + bildirimler (normalde GitHub Actions)
npm run notify:retirements # emekliliği yaklaşan istek listesi setleri için bildirim
npm run secrets:push      # .env.local değerlerini GitHub Actions secret'larına yükle
npm run icons:generate    # PWA ikonlarını yeniden üret
npx tsx scripts/price-test.ts <url>   # bir mağaza linkinin adaptörünü dene
```

## Ortam değişkenleri

`.env.example` dosyasına bak. Gerçek değerler `.env.local` içinde durur ve asla commit edilmez.

## APK (gerekirse)

Uygulama PWA kriterlerini karşılar (geçerli manifest, HTTPS, service worker, 192/512 px ve maskable ikonlar). PWA yetmezse:

1. https://www.pwabuilder.com adresine Vercel adresini gir.
2. **Package for stores → Android → Generate** ile APK'yı indir.
3. APK'yı telefona kopyalayıp kur (Play Store gerekmez; "bilinmeyen kaynaklar" izni ister).

## Bilinen sınırlamalar

- **LEGO.de** bot koruması arkasında; bazı kontrollerde `403` dönebilir. Link o turda "kontrol edilemiyor" olarak işaretlenir ve bir sonraki çalıştırmada yeniden denenir.
- **Amazon** sık sık robot doğrulaması ister; bu durumda link "kontrol edilemiyor" görünür. Ücretli bir servis (ör. Keepa) eklenmeden önce kullanıcıya sorulur.
- Brickset ücretsiz anahtar günde ~100 sorgu verir; tarihler 30 günde bir yenilenir.

## Atıf

- Set, parça, minifigür, tema verileri ve görseller: **[Rebrickable](https://rebrickable.com)** (API ve toplu CSV indirmeleri).
- Piyasaya çıkış ve emeklilik tarihleri: **[Brickset](https://brickset.com)**.
- Döviz kurları: **[TCMB](https://www.tcmb.gov.tr)**.

LEGO® LEGO Group'un ticari markasıdır. Bu proje LEGO Group, Rebrickable veya Brickset ile bağlantılı değildir; kişisel ve ticari olmayan bir açık kaynak projedir.

## Lisans

MIT
