# StudsCollector — Kurulum Rehberi (adım adım)

Bu dosya, uygulamanın çalışması için **senin** yapman gereken her şeyi sırayla anlatır.
Kodla ilgili her şey hazır; sadece hesap açıp anahtarları kopyalaman gerekiyor.

---

## 1. Rebrickable API anahtarı (ücretsiz)

1. https://rebrickable.com/signup/ adresine git, ücretsiz hesap aç, e-postanı onayla.
2. Giriş yaptıktan sonra sağ üstte profil simgesine tıkla → **Settings**.
3. Üstteki sekmelerden **API**'ye tıkla.
4. **Generate new API Key** butonuna bas.
5. Çıkan uzun anahtarı kopyala → aşağıdaki `.env.local` dosyasında `REBRICKABLE_API_KEY=` satırına yapıştır.

## 2. Brickset API anahtarı (ücretsiz)

1. https://brickset.com/signup adresinden hesap aç.
2. https://brickset.com/tools/webservices/requestkey sayfasına git.
3. Formu doldur. Kullanım amacı olarak şunu yazabilirsin:
   `Personal, non-commercial LEGO collection tracker (open source).`
4. Anahtar e-postana gelir (birkaç dakika – birkaç gün sürebilir).
5. Anahtarı `.env.local` dosyasında `BRICKSET_API_KEY=` satırına yapıştır.

> Brickset anahtarı gelmeden de uygulama çalışır; sadece emeklilik tarihleri "bilinmiyor" görünür
> (elle tarih girebilirsin).

## 3. Turso veritabanı (ücretsiz)

1. https://turso.tech adresine git → **Sign up** / **Login** → **Continue with GitHub**.
2. Panelde **Databases** → **Create Database**.
   - Name: `studscollector`
   - Location / Region: listede **Avrupa'daki herhangi bir bölge** (ör. "Europe (Ireland)" / `aws-eu-west-1`).
     Avrupa yoksa herhangi biri olur — kişisel kullanımda fark hissedilmez.
   - **Create** de.
3. Açılan veritabanı sayfasında:
   - **URL**'yi kopyala (`libsql://studscollector-KULLANICIADIN.turso.io` gibi görünür)
     → `.env.local` içinde `TURSO_DATABASE_URL=` satırına yapıştır.
   - **Create Token** (veya "Generate Token") butonuna bas → Expiration: **Never**, izin: **Read & Write**
     → çıkan uzun token'ı `TURSO_AUTH_TOKEN=` satırına yapıştır.

## 4. `.env.local` dosyasını doldur

Proje klasöründe (`C:\Users\Gökay\LEGO takip uygulaması`) `.env.local` dosyası var.
Not Defteri ile aç, ilgili satırlarda `=` işaretinden sonra (boşluk bırakmadan) değerleri yapıştır, kaydet.

```
REBRICKABLE_API_KEY=...
BRICKSET_API_KEY=...
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Diğer satırlara (şifre, oturum anahtarı, bildirim anahtarları) **dokunma** — onları ben ürettim.
Bu dosya GitHub'a asla gönderilmez (`.gitignore` içinde).

## 5. Turso'ya tabloları kur ve katalog aktarımını başlat

Proje klasöründe bir terminal aç (klasörde boş yere Shift + sağ tık → "Terminalde aç") ve sırayla:

```
npm run db:migrate
npm run catalog:import
```

İlki tabloları oluşturur, ikincisi temaları/setleri/figürleri ve Marvel envanterlerini aktarır.
Kalan temaları her gece GitHub Actions otomatik aktarır.

## 6. GitHub Actions'ı aç ve anahtarları gönder

Gece çalışan otomatik işler (katalog aktarımı, fiyat kontrolü, yedek) GitHub'a henüz gönderilmedi,
çünkü bunun için GitHub hesabına bir izin (workflow) vermen gerekiyor. Proje klasöründeki terminalde:

```
gh auth refresh -h github.com -s workflow
git push
```

İlk komut tarayıcıda GitHub'ı açar: ekrandaki kodu gir ve **Authorize** de. İkinci komut iş akışlarını yükler.

Sonra aynı terminalde:

```
npm run secrets:push
```

Bu komut `.env.local` içindeki değerleri GitHub reposunun **Secrets** bölümüne yükler.
Böylece gece çalışan katalog aktarımı ve fiyat kontrolü bilgisayarın kapalıyken de çalışır.

## 7. Vercel'e yayınla (ücretsiz, 7/24 erişim)

1. https://vercel.com → **Sign Up** → **Continue with GitHub** (plan: **Hobby**).
2. **Add New… → Project** → listeden **StudsCollector** reposunu bul → **Import**.
3. **Environment Variables** bölümünü aç ve `.env.local` dosyasındaki **tüm satırları** ekle
   (dosyanın içeriğini kopyalayıp ilk kutuya yapıştırırsan Vercel hepsini tek seferde tanır).
4. **Deploy** de. Birkaç dakika sonra `https://studscollector-xxx.vercel.app` gibi bir adres verir.
5. Telefonda bu adresi Chrome ile aç → menü (⋮) → **Uygulamayı yükle** / **Ana ekrana ekle**.
6. Uygulamada **Ayarlar → Bildirimler → Bu cihazda aç** ile fiyat/emeklilik bildirimlerini etkinleştir.

## 8. Giriş şifresi

İlk şifre `.env.local` içindeki `APP_PASSWORD` satırındadır.
Uygulamada **Ayarlar → Şifre değiştir** bölümünden istediğin zaman değiştirebilirsin.

---

Sorun olursa: `npm run dev` ile bilgisayarda http://localhost:3000 adresinden de çalıştırabilirsin.
