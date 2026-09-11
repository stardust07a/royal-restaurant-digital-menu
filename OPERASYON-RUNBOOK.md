# Royal Restaurant operasyon runbook

Bu belge staging, production, yedekleme ve geri dönüş adımlarının tek kaynağıdır.
Canonical proje kökü **`D:\royamenu`** dizinidir. `royal-restaurant/` yalnız
arşivdir; oradan build, migration veya deploy yapılmaz.

## 1. Ortamlar ve sırlar

Staging ve production ayrı Supabase projeleri, ayrı Vercel projeleri ve ayrı
alan adları kullanmalıdır. Production verisini staging'e kopyalarken müşteri
adı, telefon, not ve sipariş içeriklerini anonimleştir.

Her deploy ortamında şunları tanımla:

| Değişken | Kapsam | Not |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Tarayıcı + sunucu | Ortama ait Supabase HTTPS URL'si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tarayıcı + sunucu | RLS ile sınırlandırılmış anon anahtar |
| `SUPABASE_SERVICE_ROLE_KEY` | Yalnız sunucu | Asla `NEXT_PUBLIC_` adıyla veya istemci kodunda kullanma |
| `SIPARIS_MAKBUZ_SECRET` | Yalnız sunucu | En az 32 karakter rastgele HMAC anahtarı; teşekkür makbuzlarını doğrular |

Production sipariş mutation'ı yalnız `VERCEL=1` ortamında, platformun yazdığı
geçerli `x-vercel-forwarded-for` IP'si varsa çalışır. İkisi yoksa sipariş yazmadan
`yapilandirma_hatasi` ile kapanır. Genel proxy başlıkları ve elle açılabilen güven
bayrağı yoktur. Local/test geliştirmede tüm istemci IP başlıkları yok sayılır;
herkesin paylaştığı dar bir `yerel-gelistirme` kovası kullanılır. Başka sağlayıcıya
geçmeden önce o platforma özel doğrulanmış başlık entegrasyonu kodlanmalıdır.
Hız kovaları ancak ayar, ürün, seçenek, stok ve minimum tutar doğrulamasından sonra
tüketilir; rastgele ürün kimlikleri bir telefon veya masa kovasını kilitleyemez.

Sırları repoya, CI loguna, ekran görüntüsüne veya destek mesajına koyma.
Anahtar sızıntısında önce Supabase'de anahtarı döndür, sonra deploy ortamını
güncelle ve eski deploy'ları devre dışı bırak.

## 2. Her değişiklikten önce

1. Terminalin `D:\royamenu` kökünde olduğunu doğrula.
2. `npm ci` ve `npm run check` çalıştır.
3. Staging Supabase'in günlük/native yedeğinin başarılı olduğunu doğrula.
4. Production değişikliği öncesi yeni bir Supabase backup/PITR noktası oluştur
   veya sağlayıcının doğrulanmış son backup kimliğini kaydet. PITR yoksa şifreli
   mantıksal dump'ı repo dışında sakla ve geri yükleme denemesi yap.
5. Şunları değişiklik kaydına yaz: backup kimliği/zamanı, commit SHA, migration
   dosyaları, uygulayan kişi ve planlanan geri dönüş kararı.

Yedek yalnız oluşturulduğu için geçerli sayılmaz. En az staging ortamında geri
yüklenip kategori, ürün, ayar ve sipariş sayıları kontrol edilmiş olmalıdır.

## 3. Zorunlu rollout sırası

Bu sıra staging'de eksiksiz denenmeden production'a geçme:

1. `supabase/migrations/202608180001_order_security.sql` uygula.
2. `admin_kullanicilar` allowlist'inde en az bir doğrulanmış Auth kullanıcı
   UUID'si bulunduğunu SQL Editor'dan kontrol et; eksikse kullanıcıyı ekle.
3. Aynı admin hesabıyla giriş ve `is_admin()` sonucunu doğrula.
4. `supabase/migrations/202608180002_admin_integrity.sql` uygula.
5. Migration doğrulama sorgularını `supabase/ADIM-2-KURULUM.md` üzerinden çalıştır.
6. Uygulamayı ancak bundan sonra deploy et.

İkinci migration tamamlanmadan yeni admin arayüzünü deploy etme: arayüz atomik
RPC'leri çağırır ve fonksiyonlar yoksa yazmalar başarısız olur. Allowlist
doğrulanmadan ikinci migration'a geçme: admin erişimini kilitleyebilirsin.

## 4. Staging kabul testi

Deployment URL'sini gizli pencere ve gerçek mobil cihazda kontrol et:

- `/tr` ve `/ar` açılır; dil değişimi, RTL ve logo çalışır.
- Ana sayfa görselleri yüklenir, Google Maps iframe'i açılır. Tarayıcı konsolunda
  CSP ihlali yoktur.
- `/tr/menu` üzerinden masa seçimi, ürün seçenekleri, sepet ve masa siparişi
  çalışır; masa siparişine teslimat ücreti eklenmez.
- `/tr/siparis` teslimat ücretini ve minimum siparişi erken gösterir; telefon
  doğrulaması geçersiz numarayı engeller.
- Paket siparişi DB'ye bir kez kaydolur, WhatsApp açılır ve teslimat konumunun
  WhatsApp'ta gönderilmesi gerektiği görünür. Tekrar deneme çift sipariş üretmez.
- Başarılı siparişin imzalı teşekkür URL'si açılır; token silinmiş, değiştirilmiş
  veya başka sipariş numarasıyla eşleştirilmiş URL başarı iddiası göstermez.
- Admin giriş/çıkış, ürün kaydı, seçenek UUID'leri, ekstra stok durumu, kategori
  sıralama, toplu fiyat, ayarlar ve görsel yükleme çalışır.
- Admin olmayan authenticated kullanıcı admin RPC'lerinden `42501` alır; anon
  kullanıcı doğrudan sipariş veya admin yazması yapamaz.
- Response headers içinde CSP, `nosniff`, referrer policy, permissions policy,
  XFO ve production'da HSTS bulunur; `x-powered-by` bulunmaz.

Sipariş testlerini açıkça işaretlenmiş staging verisiyle yap. Production smoke
testi gerekiyorsa tek kontrollü sipariş oluştur, kaydını ve WhatsApp metnini
doğrula, ardından onaylı bakım yöntemiyle kaldır.

## 5. Build ve CI sınırı

GitHub Actions yalnız `npm ci` ve `npm run check` çalıştırır. `next build`, bazı
sunucu bileşenleri statik üretim sırasında gerçek Supabase menü/ayar verisini
okuduğu için sırsız CI'da güvenilir değildir. Production sırlarını CI'a ekleyip
bu sınırı aşma.

Build, staging/production deploy sağlayıcısında o ortama ait değişkenlerle
çalıştırılır. Build başarısı smoke test yerine geçmez. İleride veri erişimi
build'den ayrılır veya güvenli yerel fixture eklenirse CI build adımı ayrıca
etkinleştirilebilir.

### CSP ve ISR kararı

Kamu sayfaları Next 15 SSG/ISR önbelleğini kullanır. Next'in nonce tabanlı CSP
modeli nonce'ın her istekte üretilmesini ve sayfanın dinamik render edilmesini
gerektirir; bunu kök yerleşime eklemek mevcut ISR davranışını kaldırır. Bu nedenle
production `script-src` şimdilik Next hydration ve sayfadaki güvenli JSON-LD için
`'unsafe-inline'` içerir. `'unsafe-eval'` production politikasında kesinlikle yoktur
ve testle korunur; `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` ve
`frame-ancestors 'none'` kısıtları etkindir. Nonce'a geçiş ancak önbellek/performans
kararı, staging build ve CSP smoke testi birlikte planlandığında yapılmalıdır.

## 6. Rollback ve olay yönetimi

1. Yeni trafik/veri bozulması varsa sipariş alımını admin ayarından kapat ve
   olay zamanını kaydet.
2. Yalnız uygulama hatasında önceki doğrulanmış deploy'a dön. DB migration'ını
   körlemesine geri alma; eski deploy'un yeni şemayla uyumunu kontrol et.
3. Migration hatasında tercih edilen yol ileri-düzeltme migration'ıdır.
   `SECURITY DEFINER`, RLS, constraint veya tablo değişikliklerini elle drop
   etmek güvenlik açığı ya da veri kaybı oluşturabilir.
4. Veri geri yüklemek zorundaysan olaydan sonraki geçerli siparişleri ayrı dışa
   aktar, onaylı backup/PITR noktasını yeni bir projeye geri yükle, sayım ve smoke
   testlerini yap, ardından kontrollü geçiş planla. Kod rollback'i DB verisini
   geri getirmez.
5. Service-role sızıntısında anahtarı hemen döndür; RLS'nin service role'u
   sınırlamadığını varsay. Erişim loglarını ve bakım RPC çağrılarını incele.

Olay kapatılırken kök neden, etkilenen sipariş aralığı, kullanılan backup,
uygulanan migration/deploy kimliği ve tekrarını önleyen test belgelenir.
