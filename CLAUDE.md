# Royal Restaurant — Dijital Menü & Sipariş Sistemi

Bu dosya Claude Code'un projeyi anlaması için hazırlandı. Kod yazmadan önce tamamını oku.

---

## Proje nedir

Royal Restaurant için 4 parçalı bir web uygulaması:

1. **Tanıtım sitesi** — tek sayfa (`/`)
2. **Masa QR menüsü ve sipariş** — `/menu` — masa sepeti ve masa numarasıyla sipariş, **masa fiyatı**
3. **Paket sipariş menüsü** — `/siparis` — siparişi kaydeder, ardından WhatsApp'ı açar, **paket fiyatı**
4. **Admin panel** — `/admin` — her şeyi tek yerden yönetir, telefondan kullanılabilir

**Kritik kural:** Ürün verisi tek kaynaktadır. Admin bir ürünü düzenlediğinde her iki menüde de yansır. Sadece `fiyat_masa` ve `fiyat_paket` alanları ayrıdır.

---

## Teknoloji

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** — PostgreSQL + Storage (fotoğraf) + Auth (admin girişi)
- **next-intl** — TR/AR çeviri ve RTL
- **zustand** + `persist` middleware — sepet (localStorage)
- **framer-motion** — geçişler
- **react-easy-crop** — admin fotoğraf kırpma
- **qrcode** — QR üretimi
- Deploy: **Vercel**, alan adı: `royalrestaurant.com.tr`

---

## Restoran bilgileri

| Alan | Değer |
|---|---|
| Ad (TR) | Royal Restaurant |
| Ad (AR) | مطعم رويال |
| WhatsApp | +90 543 488 88 28 |
| Telefon | +90 543 488 88 28 |
| Harita | https://maps.app.goo.gl/9CuXKfBbRWqNaqGD8 |
| Instagram | https://www.instagram.com/royalrestaurant.tr |
| TikTok | https://www.tiktok.com/@royalrestaurants1 |
| Teslimat ücreti | 60 ₺ (sabit, admin'den değişir; masa siparişine uygulanmaz) |
| Minimum sipariş | 200 ₺ (admin'den değişir) |
| Para birimi | ₺ (TRY) |
| Çalışma saatleri | Admin panelden yönetilir |

---

## Tema

**Beyaz, keskin, editoryal.** Referans: ui-ux-pro-max "Minimalist Monochrome" (mobil, light enforced). Turkuaz tek vurgu rengi olarak korunur.

Kurallar:
- **Sıfır köşe yarıçapı.** Derinlik gölgeyle değil, çizgiyle kurulur (1px saç teli / 2–4px yapısal).
- **Gölge yok** (strictly 2D).
- Beyaz zeminde her metin en az **4.5:1** kontrast.

```css
--color-bg:          #FFFFFF;  /* sayfa zemini */
--color-card:        #FFFFFF;  /* kart — ayrım çizgiyle */
--color-surface:     #F5F5F5;  /* girinti / ikincil yüzey */
--color-line:        #E5E5E5;  /* saç teli çizgi */
--color-rule:        #0A0A0A;  /* yapısal kalın çizgi */
--color-ink:         #0A0A0A;  /* ana metin — 19.8:1 */
--color-muted:       #525252;  /* ikincil metin — 7.4:1 */
--color-brand:       #0F766E;  /* turkuaz, birincil eylem — 5.1:1 */
--color-brand-dark:  #0B544E;
--color-brand-light: #0F766E;  /* beyaz zeminde metin/fiyat rengi */
--color-accent:      #8A6A16;  /* bakır vurgu — 5.4:1 */
--color-danger:      #B4231A;  /* 6.4:1 */
```

**Not:** `#14B8A6` beyaz üzerinde 2.4:1 kalıyor, metin için kullanılamaz. Turkuaz her yerde `#0F766E` olarak kullanılır.

Yarıçaplar `globals.css` içinde `@theme` ile sıfırlanır (`--radius-xs … --radius-4xl: 0`); bileşenlerdeki `rounded-*` sınıfları tek yerden nötrlenir. `rounded-full` hariç tutulur — anahtar topuzu ve sayı rozetleri daire kalır.

Font: gövde `Plus Jakarta Sans`, **başlıklar `Playfair Display`** (editoryal/lüks karakter buradan gelir). Arapça için **mutlaka ayrı font**: `Cairo`, satır yüksekliği 1.85. Playfair'in Arapça glifi yok; `html[dir="ltr"]` ile sınırlandırılmıştır.

Ana sayfa, ayarlardaki `logo_url` görselini kullanır ve yoksa `R` gösterir. Menü üst barındaki `R`, tekrar logo isteği oluşturmayan bilinçli kompakt marka yedeğidir. Admin logo yüklemesi JPG, PNG ve WebP dosyalarını doğrulanmış MIME türü ve uzantısıyla Supabase Storage'a kaydeder.

---

## Diller ve RTL

İki dil: **Türkçe (tr)** ve **Arapça (ar)**.

- URL yapısı: `/tr/siparis`, `/ar/siparis`
- Arapça seçildiğinde `<html dir="rtl" lang="ar">`
- Tailwind'de **mantıksal özellikler kullan**: `ps-4`, `pe-4`, `ms-2`, `me-2`, `text-start`, `text-end`.
  `pl-4`, `pr-4`, `left-0`, `right-0` **kullanma** — RTL'de kırılır.
- İkon yönleri de dönmeli (geri oku, chevron).
- Sayısal fiyatlar Arapça sayfada da **Latin rakamla** yazılır (₺180), Arap-Hint rakamıyla değil.

İlk ziyarette zorunlu tam ekran dil kapısı yoktur. `next-intl` locale yönlendirmesi/tarayıcı algılama başlangıç dilini belirler; üst bardaki kalıcı dil düğmesiyle dil her zaman değiştirilebilir.

---

## Veritabanı şeması (Supabase)

```sql
-- KATEGORİLER
create table kategoriler (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sira int not null default 0,
  ad_tr text not null,
  ad_ar text not null,
  aciklama_tr text,
  aciklama_ar text,
  gorsel_url text,
  aktif boolean not null default true,
  created_at timestamptz default now()
);

-- ÜRÜNLER
create table urunler (
  id uuid primary key default gen_random_uuid(),
  kategori_id uuid references kategoriler(id) on delete cascade,
  slug text unique not null,
  sira int not null default 0,
  ad_tr text not null,
  ad_ar text not null,
  aciklama_tr text,
  aciklama_ar text,
  gorsel_url text,
  fiyat_masa numeric(10,2) not null,   -- masa QR menüsünde gösterilir
  fiyat_paket numeric(10,2) not null,  -- paket sipariş menüsünde gösterilir
  gramaj text,                          -- "180 g" / "330 ml" — HER İKİ MENÜDE de gösterilir
  kalori int,
  alerjenler text[] default '{}',
  rozet text default 'yok',             -- yok|cok_satan|yeni|acili|sefin_onerisi
  stokta boolean not null default true,
  aktif boolean not null default true,
  created_at timestamptz default now()
);

-- ÇIKARILABİLİRLER (ücretsiz)
create table cikarilabilirler (
  id uuid primary key default gen_random_uuid(),
  urun_id uuid references urunler(id) on delete cascade,
  sira int not null default 0,
  ad_tr text not null,
  ad_ar text not null
);

-- EKSTRALAR (ücretli)
create table ekstralar (
  id uuid primary key default gen_random_uuid(),
  urun_id uuid references urunler(id) on delete cascade,
  sira int not null default 0,
  ad_tr text not null,
  ad_ar text not null,
  fiyat numeric(10,2) not null default 0,
  stokta boolean not null default true
);

-- SİPARİŞLER
create table siparisler (
  id uuid primary key default gen_random_uuid(),
  siparis_no text unique not null,      -- "R-260818-AB3K9Q"
  musteri_ad text not null,
  musteri_telefon text not null,
  dil text not null default 'tr',
  kalemler jsonb not null,              -- [{urun_id, ad_tr, ad_ar, adet, birim_fiyat, cikarilanlar[], ekstralar[], not}]
  ara_toplam numeric(10,2) not null,
  servis_ucreti numeric(10,2) not null,
  toplam numeric(10,2) not null,
  durum text not null default 'yeni',   -- yeni|onaylandi|hazirlaniyor|yolda|teslim|iptal
  idempotency_anahtari uuid,
  istek_hash text,
  idempotency_yaniti jsonb,
  created_at timestamptz default now()
);

-- AYARLAR (tek satır)
create table ayarlar (
  id int primary key default 1,
  restoran_ad_tr text, restoran_ad_ar text,
  logo_url text,
  whatsapp_numarasi text,
  telefon text, adres_tr text, adres_ar text, harita_linki text,
  instagram text, tiktok text, facebook text,
  servis_ucreti numeric(10,2) default 60,
  minimum_siparis numeric(10,2) default 200,
  siparis_alimi_acik boolean default true,
  calisma_saatleri jsonb,
  kapali_mesaji_tr text, kapali_mesaji_ar text,
  constraint tek_satir check (id = 1)
);
```

**RLS politikaları:**
- `kategoriler`, `urunler`, `cikarilabilirler`, `ekstralar`, `ayarlar` → herkese **okuma** (anon), yazma sadece `admin_kullanicilar` allowlist'i
- `siparisler` → anon doğrudan yazamaz; server action service-role ile ekler, sadece allowlist adminleri okur/günceller
- Sipariş hız sınırı: müşteri kovası 8/10 dk; paket IP kovası 30/10 dk; restoran NAT'ındaki masa siparişleri için ayrı masa IP kovası 120/10 dk.

**Admin veri bütünlüğü:** Ürün ile çıkarılabilir/ekstra seçenekleri
`admin_urun_kaydet`, toplu fiyat değişiklikleri `admin_toplu_fiyat_guncelle`,
kategori sırası `admin_kategori_sirala` PostgreSQL RPC'leriyle tek transaction
içinde yazılır. Bu `SECURITY DEFINER` fonksiyonlar yalnız `authenticated` rolüne
açıktır ve ayrıca `is_admin()` allowlist kontrolü yapar. Doğrudan çok adımlı
istemci yazmaları ekleme. Storage `menu-gorseller` bucket'ı en fazla 8 MB ve
yalnız JPG/PNG/WebP kabul eder. Mevcut kurulum rollout sırası:
`202608180001_order_security.sql` → admin allowlist kontrolü →
`202608180002_admin_integrity.sql` → uygulama deploy'u.

Seed ve tek seferlik bakım scriptleri tablo tablo yazmaz. `bakim_menu_yukle`,
`bakim_gramaj_ar_guncelle` ve `bakim_temizlik` RPC'leri yalnız `service_role`
rolüne açıktır; payload doğrulaması ve bütün DB değişiklikleri tek transaction
içinde yapılır. Normal seed yalnız eksik kategori/ürünleri ve tamamen boş seçenek
tablolarını tamamlar; mevcut UUID, admin içeriği, `aktif`/`stokta` ve seçenekleri
korur. Yalnız `seed:sifirla` yıkıcı tam yenilemedir. Normal admin ürün kaydı da
mevcut çıkarılabilir/ekstra UUID'lerini ve ekstra stok durumunu korur; alt
satırları körlemesine silip yeniden ekleme. Temizlik scripti JSON'u ancak DB RPC
başarısından sonra aynı dizindeki geçici dosyadan atomik rename ile değiştirir.

---

## Başlangıç verisi

`menu-verisi.json` dosyasında 59 ürün, 5 kategori, çıkarılabilir ve ekstra şablonları hazır.

`scripts/seed.ts` yaz — bu JSON'u okuyup Supabase'e bassın. Şablon mantığı: her ürünün `cikarilabilir` ve `ekstra` alanı bir şablon adı taşıyor (`durum_sandvic`, `burger`, `menu_combo`, `tavuk_izgara`, `salata`, `yok`). Seed sırasında bu şablonlar açılıp ilgili ürün için satırlara dönüştürülsün.

Not: JSON'da `fiyat_masa` ve `fiyat_paket` şu an aynı. `teyit_edilecekler` listesindeki maddeler restoran sahibiyle netleşecek.

---

## Paket sipariş akışı

### 1. Kategori listesi (`/siparis`)
- Üstte: kompakt `R` marka yedeği, restoran adı, **Açık/Kapalı rozeti**, dil butonu, sepet ikonu (rozet: ürün sayısı)
- Arama kutusu (TR ve AR isimlerde arar)
- Kategori kartları (fotoğraf + isim)

### 2. Ürün listesi (`/siparis/[kategori]`)
- Yapışkan (sticky) kategori şeridi — yatay kaydırmalı
- Ürün kartı: fotoğraf (4:3), ad, kısa açıklama, **porsiyon/miktar**, paket fiyatı, ürün etiketi
- Tükenen ürün: %40 opaklık, üzerinde "Tükendi / نفذ" etiketi, tıklanamaz

### 3. Ürün detay (`/siparis/urun/[slug]`)
Üç bölüm, sırasıyla:

```
[ Fotoğraf 4:3 ]
Royal Döner                              ₺200
320 g · Bol etli özel Royal döner
⚠️ Gluten, Süt

── İÇİNDEN ÇIKAR ─────────────  (ücretsiz, çoklu seçim)
── EKSTRALAR ─────────────────  (ücretli, çoklu seçim, +₺XX)
── NOT ───────────────────────  (serbest metin, max 200 karakter)

           [ − ]  1  [ + ]
      [ SEPETE EKLE — ₺240 ]
```

Buton tutarı = (birim fiyat + seçili ekstralar) × adet. Anlık güncellenir.

### 4. Sepet (`/siparis/sepet`)
- Kalem satırları: ad, adet ±, "olmasın" seçimleri/ekstralar/not küçük gri yazıyla, silme
- Ara toplam → teslimat ücreti (60 ₺) → **TOPLAM**
- Minimum tutar altındaysa: "Minimum sipariş 200 ₺. 45 ₺ daha ekleyin." — buton pasif
- **Müşteri formu: SADECE Ad Soyad + Telefon.** Adres alanı YOK.
- `[ Siparişi Kaydet ve WhatsApp'ı Aç ]`

### 5. Gönderim
1. Sunucuda fiyat/istek doğrulaması, atomik hız sınırı ve idempotency kontrolü
2. Service-role ile `siparisler` tablosuna insert, okunabilir geniş `siparis_no` üret (örn. `R-260818-AB3K9Q`)
3. Mesaj metnini oluştur
4. Doğrulanmış mesajla `https://wa.me/...` bağlantısını aç
5. Sepeti temizle ve teşekkür sayfasına yönlendir; müşteri teslimatı tamamlamak için WhatsApp mesajına konumunu veya açık adresini ekleyip mesajı gönderir

---

## WhatsApp mesaj formatı

**Önemli:** Adres alanı formda veya veritabanında yok. Sipariş önce kaydedilir; mesaj müşteriden teslimat konumunu ya da açık adresini WhatsApp'ta ekleyip göndermesini açıkça ister.

### Türkçe
```
ROYAL RESTAURANT — PAKET SİPARİŞ
Sipariş No: #R-260818-AB3K9Q
12.08.2026 · 19:42

━━━━━━━━━━━━━━━━━━━━
1) Royal Döner × 2 ........... 400 ₺
   - Olmasın: Soğan, Turşu
   + Ekstra: Kaşar peyniri (+40 ₺)
   * Not: Az acılı olsun

2) Büyük Ayran × 2 ........... 100 ₺
━━━━━━━━━━━━━━━━━━━━
Ara Toplam ............. 580 ₺
Teslimat Ücreti ........ 60 ₺
TOPLAM ................. 640 ₺
━━━━━━━━━━━━━━━━━━━━

Müşteri: Ahmet Yılmaz
Telefon: 0543 488 88 28

TESLİMAT KONUMU / ADRESİ:
(Lütfen konumunuzu paylaşın veya açık adresinizi yazıp gönderin)
```

### Arapça
Aynı yapı, tüm etiketler ve ürün isimleri Arapça. Son satır:
```
موقع / عنوان التوصيل:
(يرجى مشاركة موقعك أو كتابة عنوانك الواضح ثم إرسال الرسالة)
```

Ürün isimleri müşterinin seçtiği dile göre gelir (`ad_tr` / `ad_ar`).

**Uzunluk koruması:** Mesaj 1500 karakteri aşarsa kısa formata geç (ürün adı + adet + fiyat, çıkarılan/ekstra detayını "detaylar için #R-260818-AB3K9Q" ile değiştir).

---

## Masa QR menüsü (`/menu`)

Tek ortak QR — masa numarası yok.

Paket menüsüyle aynı veri ve sıralama, masa siparişine uygun sunum:
- Masa sepeti vardır; ürün seçilir, özelleştirilir ve masa numarasıyla sipariş kaydedilip WhatsApp açılır
- Teslimat ücreti ve minimum paket sipariş tutarı uygulanmaz
- **`fiyat_masa`** gösterilir
- **Porsiyon/miktar burada da gösterilir** (paket menüsünde olduğu gibi)
- Alerjen ve kalori bilgisi daha belirgin
- Ürün detayı tıklanınca detay sayfası — fotoğraf, tam açıklama, porsiyon/miktar, alerjenler ve masa sepetine ekleme
- Tükenen ürün: "Bugün yok / غير متوفر اليوم"
- Sayfa altında: "Paket sipariş vermek için 👉" → `/siparis` linki

---

## Admin panel (`/admin`)

Telefon öncelikli tasarım. Alt navigasyon çubuğu: Ürünler · Siparişler · Ayarlar · QR

### Giriş
Supabase Auth, e-posta + şifre. Middleware ile `/admin/*` korunur.

### Kategoriler
Ekle / düzenle / sil, kapak fotoğrafı (4:3 kırpma), TR|AR sekmeli ad ve açıklama, sıra (↑↓), yayın anahtarı. Kategori silinince ürünleri de silinir (`on delete cascade`) — form bunu ürün sayısıyla birlikte uyarır.

### Ürünler
- Kategoriye göre gruplu liste, arama
- Her satırda **hızlı stok anahtarı** (toggle) — tek dokunuş, sayfa yenilenmeden
- Ürün formu:
  - Ad + açıklama: **TR | AR sekmeli**
  - **Masa Fiyatı** ve **Paket Fiyatı** yan yana, aralarında fark yüzdesi gösterilir (yanlış giriş yakalanır)
  - Porsiyon/miktar, kalori, alerjenler (çoklu seçim), ürün etiketi
  - Fotoğraf: dosya seç → **4:3 kırpma çerçevesi** açılır (react-easy-crop) → kırpılmış hali 1200×900 olarak Supabase Storage'a WebP yüklenir
  - İçinden çıkar / olmasın seçenekleri: satır ekle/sil/sırala
  - Ekstralar: ad (TR/AR) + fiyat, ekle/sil/sırala
- Sürükle-bırak sıralama
- **Birden fazla ürünün fiyatını güncelle:** kategori seç → "%X zam" veya "sabit +Y ₺" → önizleme → uygula

### Siparişler
- Liste, en yeni üstte, durum rozetleri
- Detay: kalemler, notlar, müşteri ad/telefon (tıkla-ara), toplam
- Durum değiştirme
- Günlük/haftalık ciro özeti, en çok satan ürünler

### Ayarlar
Restoran adı (TR/AR), **logo yükleme**, WhatsApp numarası, telefon, adres, harita linki, doğrulanmış sosyal medya bağlantıları, teslimat ücreti, minimum sipariş, **çalışma saatleri (gün gün açılış/kapanış + kapalı işareti)**, sipariş alımını geçici kapat anahtarı, kapalı mesajı (TR/AR).

### QR
`/menu` için QR üret → PNG indir + baskıya hazır A5 PDF (logo + "Menü / القائمة" başlığı + QR).

---

## Ana sayfa (`/`)

Tek sayfa, yukarıdan aşağı:

1. **Hero** — yaklaşık ekran yüksekliğinde editoryal alan; ayarlardaki logo (`R` yedeği), restoran adı, açık/kapalı durumu ve iki büyük buton: `Masa Menü & Sipariş` / `Paket Sipariş`
2. **Hakkımızda** — kısa metin + görsel
3. **Öne çıkanlar** — `rozet = 'cok_satan'` olan ürünler, yatay kaydırmalı kartlar
4. **Galeri** — mekân/yemek fotoğrafları
5. **Konum & Saatler** — gömülü harita, adres, çalışma saatleri tablosu, "Yol Tarifi Al" butonu
6. **İletişim** — tıkla-ara, WhatsApp, Instagram, TikTok
7. **Footer**

---

## Kod kuralları

- **Mobil öncelikli.** 390px genişlikte tasarla, sonra büyüt.
- Dokunma hedefleri **en az 44×44px**.
- Görseller `next/image`, WebP, lazy load. LCP hedefi 2 sn altı.
- Server Components varsayılan; sepet ve form gibi etkileşimli parçalar `'use client'`.
- Fiyat hesaplamaları **kuruş hassasiyetinde** — float hatası olmasın, integer kuruş kullan veya `toFixed(2)` ile normalize et.
- Menü verisi ISR ile önbelleklensin (`revalidate: 60`); admin değişiklik yapınca `revalidatePath` ile anında tazelensin.
- Tüm metinler çeviri dosyalarında (`messages/tr.json`, `messages/ar.json`) — koda gömülü Türkçe metin bırakma.
- Ortam değişkenleri `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SIPARIS_MAKBUZ_SECRET`. Son ikisi yalnız sunucudadır; makbuz sırrı en az 32 karakter rastgele olmalıdır.
- Production sipariş mutation'ı yalnız doğrulanmış Vercel ortamı (`VERCEL=1`) ve geçerli platform `x-vercel-forwarded-for` IP'siyle çalışır; aksi durumda yazmadan kapanır. Local/test istemci başlıklarını yok sayan paylaşımlı geliştirme kovası kullanır. Genel proxy güven bayrağı yoktur.
- `menuyuTazele` dahil admin server action'ları kendi içinde `is_admin()` doğrulaması yapmalı; sadece middleware'e güvenme.

---

## Yapılış sırası

1. Next.js + Tailwind + Supabase kurulumu, tema değişkenleri, `next-intl` ve RTL altyapısı
2. Veritabanı şeması + RLS + `seed.ts` ile `menu-verisi.json`'u yükle
3. Masa QR menüsü (`/menu`) — en basiti, veri katmanı burada oturur
4. Paket sipariş: ürün detay 3 bölüm → sepet → WhatsApp gönderimi
5. Admin panel: giriş → ürün CRUD → fotoğraf kırpma-yükleme → ayarlar → siparişler → QR
6. Ana sayfa
7. Cila: animasyonlar, hız, gerçek telefonda Arapça RTL testi

---

## Kabul kriterleri

- [ ] Arapça sayfada tüm layout RTL, hiçbir yerde bozuk hizalama yok
- [ ] İlk girişte zorunlu dil kapısı çıkmıyor; kalıcı dil düğmesi çalışıyor
- [ ] Sepet sayfa yenilendiğinde kaybolmuyor
- [ ] Admin'de bir ürünün adını değiştirince hem `/menu` hem `/siparis` güncelleniyor
- [ ] Masa ve paket fiyatları doğru menülerde görünüyor
- [ ] Porsiyon/miktar bilgisi her iki menüde de görünüyor
- [ ] Sipariş formunda adres alanı yok, sadece ad + telefon
- [ ] Paket siparişi kaydediliyor, WhatsApp açılıyor ve mesaj konum/açık adres eklenmesini açıkça istiyor
- [ ] Sipariş veritabanına kaydediliyor ve admin panelde görünüyor
- [ ] Minimum 200 ₺ altında sipariş verilemiyor
- [ ] Teslimat ücreti 60 ₺ yalnız paket siparişi toplamına ekleniyor
- [ ] Restoran kapalıyken sipariş butonu pasif
- [ ] Stok anahtarı kapatılan ürün her iki menüde de "tükendi" görünüyor
- [ ] Admin panel telefonda rahat kullanılıyor
- [ ] Fotoğraf yüklerken 4:3 kırpma çalışıyor
- [ ] Logo admin panelden değiştirilebiliyor
- [ ] Lighthouse mobil performans skoru 90+
