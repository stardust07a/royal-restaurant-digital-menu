# Royal Restaurant Dijital Menü ve Sipariş Sistemi

Royal Restaurant için geliştirilmiş, Türkçe ve Arapça destekli dijital restoran menüsü ve sipariş yönetim uygulamasıdır.

## Özellikler

- Türkçe ve Arapça arayüz, RTL desteği
- Masa menüsü ve masa numarasıyla sipariş oluşturma
- Paket siparişi ve WhatsApp üzerinden sipariş tamamlama
- Ürün, kategori, fiyat, stok ve görsel yönetimi
- Kategori içinden toplu ürün atama ve taşıma
- Sipariş takip ekranı
- QR menü oluşturma
- Çalışma saatleri, iletişim bilgileri ve sosyal medya yönetimi
- Mobil, tablet ve masaüstü uyumlu tasarım

## Kullanılan Teknolojiler

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase / PostgreSQL
- next-intl

## Kurulum

```bash
npm install
```

`.env.local.example` dosyasını `.env.local` adıyla kopyalayın ve Supabase bilgilerinizi ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SIPARIS_MAKBUZ_SECRET=
```

Supabase SQL Editor içinde `supabase/sema.sql` dosyasını yeni kurulum için çalıştırın. Mevcut kurulumlarda `supabase/migrations` klasöründeki migration dosyalarını tarih sırasıyla uygulayın.

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Önemli Sayfalar

- `/tr` — Türkçe ana sayfa
- `/ar` — Arapça ana sayfa
- `/tr/menu` — Masa menüsü
- `/tr/siparis` — Paket siparişi
- `/admin/giris` — Yönetici girişi

## Kontroller

```bash
npm run check
npm run build
```

Gizli anahtarlar, `.env.local`, yerel yedekler ve derleme dosyaları Git deposuna dahil edilmez.

