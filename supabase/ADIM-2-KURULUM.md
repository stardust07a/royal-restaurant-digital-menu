# Adım 2 — Veritabanı kurulumu

Bu adım iki parçadan oluşuyor:

- **A.** Tabloları oluştur (`sema.sql` dosyasını Supabase'de çalıştır)
- **B.** Menüyü yükle (`npm run seed` ile 74 ürünü bas)

Toplam 10 dakika. Sırayla git, atlama.

---

## A. Tabloları oluştur

### A1. Supabase panelinde projene gir

[supabase.com/dashboard](https://supabase.com/dashboard) → az önce açtığın projeye tıkla.

### A2. SQL Editor'ü aç

Sol taraftaki dikey menüde **SQL Editor** yazan simgeye bas.
Açılan ekranda **+ New query** (veya "New SQL snippet") butonuna tıkla.
Karşına boş, geniş bir yazı alanı gelecek.

### A3. sema.sql dosyasının içeriğini yapıştır

Bilgisayarında `D:\royamenu\supabase\sema.sql` dosyasını Not Defteri ile aç.

- `Ctrl + A` → hepsini seç
- `Ctrl + C` → kopyala
- Supabase'deki boş yazı alanına tıkla → `Ctrl + V` → yapıştır

### A4. Çalıştır

Sağ alttaki yeşil **Run** butonuna bas (veya `Ctrl + Enter`).

Birkaç saniye sürer. Altta **Success. No rows returned** yazması gerekiyor.
Bu doğru sonuç — bu dosya tablo oluşturuyor, veri okumuyor.

### A5. İlk admin hesabını yetkilendir

Supabase → **Authentication → Users** bölümünden admin hesabını oluştur. Ardından
SQL Editor'de e-posta adresini değiştirerek şu komutu bir kez çalıştır:

```sql
insert into public.admin_kullanicilar (kullanici_id, eposta)
select id, email from auth.users where lower(email) = lower('admin@example.com')
on conflict (kullanici_id) do update set eposta = excluded.eposta;
```

Komut `0 rows` etkilediyse e-posta eşleşmemiştir; paneli açmadan önce düzelt.
Güvenlik migration'ı çalıştırıldığı anda zaten var olan Auth kullanıcıları erişim
kaybı olmaması için otomatik olarak admin listesine alınır. Yeni `sema.sql`
kurulumunda ise hesaplar otomatik yetkilendirilmez; yukarıdaki komut zorunludur.

### A6. Tabloların geldiğini gör

Sol menüden **Table Editor**'e geç. Şu 8 tabloyu görmelisin:

```
ayarlar                 kategoriler      urunler
cikarilabilirler        ekstralar        siparisler
admin_kullanicilar      siparis_hiz_sinirlari
```

`ayarlar` tablosunda Royal Restaurant ayar satırını, `admin_kullanicilar`
tablosunda yetkilendirdiğin hesabı görürsün. Menü tabloları şimdilik boş —
onları B bölümünde dolduracağız. Hız sınırı tablosu ilk sipariş denemesine kadar
boş kalır.

> **Not:** Bu dosyayı yanlışlıkla iki kez çalıştırırsan hiçbir şey bozulmaz.
> Tekrar çalıştırılabilir şekilde yazıldı.

### Mevcut kurulumu güncelleme sırası

1. **Migration'dan önce zorunlu Auth denetimi yap.** Supabase → Authentication →
   Providers → Email altında public kullanıcı kaydını kapat. SQL Editor'de:

   ```sql
   select id, email, created_at, last_sign_in_at
   from auth.users
   order by created_at;
   ```

   Listedeki her hesabı doğrula; beklenmeyen hesapları Authentication → Users
   ekranından sil. Migration kalan **tüm mevcut Auth kullanıcılarını** erişimi
   korumak için admin yapar, bu nedenle bu denetim atlanamaz.

   Eski anonim sipariş döneminden kalan bozuk JSON kayıtlarını da denetle:

   ```sql
   select id, siparis_no, created_at, jsonb_typeof(kalemler) as kalemler_turu
   from public.siparisler
   where jsonb_typeof(kalemler) is distinct from 'array'
      or case when jsonb_typeof(kalemler) = 'array' then
           jsonb_array_length(kalemler) = 0
           or exists (
             select 1
             from jsonb_array_elements(kalemler) as satir(kalem)
             where jsonb_typeof(kalem) is distinct from 'object'
                or jsonb_typeof(kalem->'ad_tr') is distinct from 'string'
                or jsonb_typeof(kalem->'adet') is distinct from 'number'
                or jsonb_typeof(kalem->'birim_fiyat') is distinct from 'number'
                or jsonb_typeof(kalem->'cikarilanlar') is distinct from 'array'
                or jsonb_typeof(kalem->'ekstralar') is distinct from 'array'
                or case
                     when jsonb_typeof(kalem->'cikarilanlar') = 'array' then
                       exists (
                         select 1
                         from jsonb_array_elements(kalem->'cikarilanlar')
                           as cikanlar(cikan)
                         where jsonb_typeof(cikan) is distinct from 'object'
                            or jsonb_typeof(cikan->'ad_tr')
                               is distinct from 'string'
                       )
                     else false
                   end
                or case
                     when jsonb_typeof(kalem->'ekstralar') = 'array' then
                       exists (
                         select 1
                         from jsonb_array_elements(kalem->'ekstralar')
                           as ekstra_satirlari(ekstra)
                         where jsonb_typeof(ekstra) is distinct from 'object'
                            or jsonb_typeof(ekstra->'ad_tr')
                               is distinct from 'string'
                            or jsonb_typeof(ekstra->'fiyat')
                               is distinct from 'number'
                            or case
                                 when jsonb_typeof(ekstra->'fiyat') = 'number'
                                 then not (
                                   (ekstra->>'fiyat')::numeric >= 0
                                   and (ekstra->>'fiyat')::numeric < 100000000
                                 )
                                 else false
                               end
                       )
                     else false
                   end
           )
         else false end
   order by created_at;
   ```

   Sonuçları önce dışa aktar; gerekli kayıtları düzelt veya yönetim kararına göre
   kaldır. Uygulama eski bozuk kalemleri güvenli biçimde atlar, fakat bu kalemler
   satış özetine katılmaz.
2. Vercel'de `SUPABASE_SERVICE_ROLE_KEY` bulunduğunu doğrula ve kısa bir bakım
   aralığı başlat.
3. Supabase SQL Editor'de önce
   `supabase/migrations/202608180001_order_security.sql` dosyasını çalıştır.
4. `admin_kullanicilar` içinde denetlediğin hesapların tamamını doğrula.
5. Ardından `supabase/migrations/202608180002_admin_integrity.sql` dosyasını
   çalıştır. Dosya tek transaction içindedir; herhangi bir adım hata verirse
   tamamı geri alınır. Ürün + seçenek kaydı, toplu fiyat ve kategori sırası bu
   migration ile atomik yönetici RPC'lerine taşınır.
6. İletişim kartlarına gerçek logo görselleri yükleyebilmek için
   `supabase/migrations/202608280001_contact_logo_urls.sql` dosyasını çalıştır.
   `202608270001_contact_icons.sql` eski emoji alanlarını ekleyen geriye dönük
   migration'dır; yeni logo yükleme ekranı için gereken dosya `202608280001`dir.
7. Kategori ekranından ürünleri topluca seçebilmek için
   `supabase/migrations/202609110001_category_product_assignment.sql` dosyasını
   çalıştır. Bu migration kategori–ürün atamasını atomik yapar ve ürün bulunan
   bir kategorinin yanlışlıkla silinmesini engeller.
8. Sonra `supabase/migrations/202609110002_approved_menu_additions.sql`
   dosyasını çalıştır. Bu migration onaylanan 15 ürünü ve eksikse `İzgaralar`
   ile `Tavuk` kategorilerini Türkçe/Arapça içerikleriyle ekler. Kategori veya
   ürün zaten varsa üzerine yazmaz; slug ile Türkçe/Arapça ad kontrolleri
   sayesinde tekrar çalıştırıldığında kopya oluşturmaz.
9. RPC ve Storage sınırlarını doğrula:

   ```sql
   select proname
   from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in (
       'admin_urun_kaydet',
       'admin_toplu_fiyat_guncelle',
       'admin_kategori_sirala',
       'admin_kategori_urunlerini_kaydet',
       'admin_kategori_sil',
       'bakim_menu_yukle',
       'bakim_gramaj_ar_guncelle',
       'bakim_temizlik'
     )
   order by proname;

   select file_size_limit, allowed_mime_types
   from storage.buckets
   where id = 'menu-gorseller';
   ```

   Sekiz RPC satırı ile `8388608` bayt ve yalnız `image/jpeg`, `image/png`,
   `image/webp` görülmelidir. `admin_*` RPC'leri yalnız allowlist adminlerinin
   oturum rolüne; `bakim_*` RPC'leri yalnız gizli `service_role` anahtarına
   açıktır.
10. Yeni uygulama kodunu deploy et. Admin hesabıyla bir ürün kaydı, bir toplu
   fiyat güncellemesi ve kategori sıra değişimini; ardından bir masa ve bir
   paket siparişini prova et.

Migration dosyası yanlışlıkla tekrar çalıştırılırsa Auth kullanıcılarını ikinci
kez topluca admin yapmaz. Toplu aktarım yalnız `admin_kullanicilar` tablosunun
migration başında bulunmadığı ilk uygulamada çalışır. Sonraki adminler A5'teki
e-posta bazlı komutla açıkça eklenmelidir.

Migration uygulanmadan yeni kod siparişleri güvenli biçimde durdurur; eski kodu
yeni politikalarla çalıştırmak ise anon insert kapandığı için sipariş alamaz.
İkinci migration uygulanmadan yeni admin kodundaki RPC çağrıları da bulunamaz.
Bu nedenle sıra kesin olarak **180001 → admin allowlist kontrolü → 180002 →
280001 → 202609110001 → 202609110002 → uygulama deploy'u** olmalıdır; bu
aralıkta checkout bilerek bakımda sayılır. Eski emoji kolonlarına ihtiyaç duyan
bir kurulumda geriye dönük `202608270001` dosyasını `202608280001`den önce
çalıştır.

`202608180002_admin_integrity.sql` içindeki biçim kısıtları `NOT VALID` olarak
eklenir. Böylece migration geçmiş satırları tarayıp kurulumu durdurmaz, fakat
yeni ve güncellenen satırlara URL, metin uzunluğu, fiyat/sıra, ayar ve sipariş
biçimi sınırlarını hemen uygular. Daha sonra bu kısıtları `VALIDATE CONSTRAINT`
ile doğrulamadan önce eski veriyi ayrıca denetle. Sınırlar mevcut 74 ürünlük seed
verisinin değerlerinden daha geniş ve geriye dönük uyumlu seçilmiştir.
Migration'lar kısıtı adına göre yalnız eksikse ekler; daha önce doğrulanmış bir
kısıtı düşürüp yeniden `NOT VALID` durumuna getirmez.

Bu migration dosyaları bu depoda hazırlanır; hiçbir geliştirme komutu uzaktaki
Supabase projesine otomatik olarak uygulamaz.

---

## B. Menüyü yükle

### B1. Supabase anahtarlarını al

Supabase panelinde sol altta **Project Settings** (dişli çark) → **API Keys**
(bazı sürümlerde sadece **API**).

Supabase'den üç değer, ayrıca uygulama için bir rastgele makbuz sırrı lazım:

| Panelde adı | Neye benzer |
|---|---|
| **Project URL** | `https://abcdefgh.supabase.co` |
| **anon public** | `eyJ...` ile başlayan çok uzun yazı |
| **service_role** `secret` | `eyJ...` ile başlayan başka bir uzun yazı |

`service_role` anahtarı gizlidir; yanındaki **Reveal** / göz simgesine basınca görünür.

### B2. .env.local dosyasını oluştur

`D:\royamenu` klasöründe `.env.local.example` dosyasını bul.

- Üzerine sağ tık → **Kopyala**, sonra boş yere sağ tık → **Yapıştır**
- Oluşan kopyanın adını `.env.local` yap (baştaki nokta dahil, `.example` kısmı gitsin)
- Not Defteri ile aç, dört değeri yapıştır:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SIPARIS_MAKBUZ_SECRET=BURAYA_RASTGELE_GIZLI_DEGERI_YAPISTIR
```

`=` işaretinin etrafında boşluk **bırakma**, tırnak **koyma**.

> `.env.local` dosyası `.gitignore` içinde — kimseyle paylaşılmaz.
> `service_role` anahtarı veritabanının ana şifresi gibidir, hiçbir yere yapıştırma.
> `SIPARIS_MAKBUZ_SECRET` yalnız başarılı siparişlerin teşekkür makbuzunu
> imzalar. En az 32 karakterlik rastgele bir değer olmalı ve yalnız sunucuda
> tutulmalıdır; eksikse sipariş yazımı bilinçli olarak kapalı kalır.

Production sipariş mutation'ı yalnız Vercel'in otomatik `VERCEL=1` ortamı ve
platformun yazdığı geçerli `x-vercel-forwarded-for` IP'siyle çalışır. Eksik veya
geçersizse veritabanına yazmadan yapılandırma hatası döner. Local/test ortamında
istemci proxy başlıkları yok sayılır ve paylaşımlı geliştirme kovası kullanılır.
Sağlayıcı değişirse doğrulanmış, sağlayıcıya özel entegrasyon ayrıca kodlanmalıdır.

`SUPABASE_SERVICE_ROLE_KEY` veya `SIPARIS_MAKBUZ_SECRET` eksikse sipariş server
action'ı bilinçli olarak güvenli yapılandırma hatası döndürür. Anon
istemciye sessizce düşmek RLS korumasını delme riskini geri getireceği için bu
fail-closed davranış korunmalıdır.

### B3. Önce prova yap

Terminalde (`D:\royamenu` klasöründe):

```bash
npm run seed:kuru
```

Bu komut **veritabanına hiçbir şey yazmaz**. Sadece JSON dosyasını denetler:
eksik kategori, tekrarlanan ürün adı, geçersiz fiyat gibi sorunları önceden
yakalar. Sonunda `7 kategori, 74 urun — yapisal sorun yok` yazmalı.

Fotoğrafı olmayan 7 içecek için uyarı verecek — bu normal, sorun değil.

### B4. Gerçek yükleme

```bash
npm run seed
```

Beklenen çıktı:

```
 Guvenli eksik veri tamamlama
  ✓ 7 eksik kategori eklendi
  ✓ 74 eksik urun eklendi
  ✓ ... cikarilabilir satiri bos urunlere eklendi
  ✓ ... ekstra satiri bos urunlere eklendi
    Mevcut UUID, fiyat/icerik, aktif/stokta ve secenek satirlari korundu.

✓ Eksik menu verisi guvenle tamamlandi; mevcut veriler korundu.
```

### B5. Kontrol et

Supabase → **Table Editor** → `urunler` tablosu. 74 satır görmelisin.

---

## Komut özeti

| Komut | Ne yapar |
|---|---|
| `npm run seed:kuru` | Sadece denetler, yazmaz. Şüphelendiğinde bunu çalıştır. |
| `npm run seed` | Yükler. Tekrar tekrar çalıştırılabilir, kopya oluşturmaz. |
| `npm run seed:sifirla` | Tüm menüyü siler, sıfırdan yükler. Siparişlere dokunmaz. |

`npm run seed` **güvenli ve tamamlayıcıdır**: yalnız JSON'da olup DB'de olmayan
kategori ve ürün slug'larını ekler. Mevcut kategori/ürün UUID'lerini, admin
tarafından değiştirilmiş fiyat ve içeriği, `aktif`/`stokta` durumlarını ve
mevcut seçenek UUID/stoklarını değiştirmez. Bir ürünün çıkarılabilir veya
ekstra tablosu tamamen boşsa yalnız o boş tabloyu başlangıç şablonuyla doldurur.
Bu eklemelerin tamamı tek `bakim_menu_yukle` transaction'ındadır.

`npm run seed:sifirla` **açıkça yıkıcıdır**: ürün, kategori ve seçenekleri
siler; UUID'leri ve operasyonel `aktif`/`stokta` durumlarını JSON'a göre
sıfırdan oluşturur. Silme ve yeniden yükleme yine aynı transaction'da olduğu
için hata halinde eski menü geri gelir. Siparişlere dokunmaz.

`npm run gramaj:ar` ile `npm run temizlik` komutlarının DB yazıları set tabanlı
bakım RPC'lerinde atomiktir. `npm run temizlik -- --kuru` dosya veya DB yazmaz.
Gerçek temizlik yeni JSON'u aynı `data` dizinindeki benzersiz geçici dosyada
hazırlar; DB başarılı olursa atomik rename yapar, DB hatasında yalnız doğrulanmış
geçici dosyayı siler ve kaynak JSON'u değiştirmez.

DB transaction'ı ile yerel dosya rename'i tek bir dağıtık transaction değildir.
RPC yanıtı ağda kaybolursa DB commit etmiş olsa bile script bunu kesin bilemez ve
kaynak JSON'u değiştirmeden çıkar. Bu durumda önce DB'deki üç slug ile test
siparişlerini denetle, sonra `npm run temizlik` komutunu yeniden çalıştır;
bakım RPC'si set tabanlı ve tekrar çalıştırılabilir olduğundan kalan yerel adımı
güvenle tamamlar. DB başarılı olup rename başarısızsa scriptin yazdığı geçici
dosya yolunu koru ve içeriğini inceleyerek devreye al.

`npm run seed:sifirla` komutunu yalnız menüde artık olmaması gereken ürünleri
temizlemek ve tüm kimlik/operasyonel durumu bilinçli sıfırlamak istediğinde kullan.

---

## Bir şeyler ters giderse

| Hata | Sebep ve çözüm |
|---|---|
| `Supabase bilgileri bulunamadi` | `.env.local` yok veya adı yanlış. B2'ye dön. Dosya adının `.env.local.txt` olmadığından emin ol. |
| `SUPABASE_SERVICE_ROLE_KEY cok kisa gorunuyor` | `service_role` yerine başka bir değer kopyalanmış. B1'e dön. |
| `relation "urunler" does not exist` | A bölümü çalışmamış. `sema.sql`'i tekrar çalıştır. |
| `Invalid API key` | URL veya anahtar yanlış kopyalanmış. Başında/sonunda boşluk kalmış olabilir. |

Takıldığın yerde hata metnini olduğu gibi Claude Code'a yapıştır.
