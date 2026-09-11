# Buradan başla

Bu klasör **çalışmaya hazır**. Kod yazmanı beklemiyorum — sen sadece 4 adımı yapacaksın.

---

## 1. Node.js kurulu mu?

Kurulu değilse: [nodejs.org](https://nodejs.org) → büyük yeşil "LTS" butonuna bas → indir → kur.

## 2. Claude Code'u kur

Bu klasörün içine gir, boş bir yere **Shift + sağ tık** → "Terminalde aç" (veya "PowerShell penceresini burada aç").

Açılan siyah ekrana yaz:

```
npm install -g @anthropic-ai/claude-code
```

Bir kere yapılır, bir daha gerekmez.

## 3. Paketleri yükle

Aynı siyah ekranda:

```
npm install
```

2-3 dakika sürer. Bittiğinde siteyi görmek istersen:

```
npm run dev
```

Sonra tarayıcıda **http://localhost:3000** adresini aç. Dil seçme penceresi ve ana sayfa çıkacak.

Durdurmak için siyah ekranda **Ctrl + C**.

## 4. Claude Code'u aç

```
claude
```

Açılınca **tek cümle** yaz:

```
CLAUDE.md dosyasını oku. Kurulum (1. adım) bitti.
Şimdi 2. adıma geç: Supabase şeması ve seed script'i.
```

Gerisi ona kalmış. Sen "tamam", "devam et", "şunu düzelt" demen yeterli.

---

## Bu klasörde ne var?

| Dosya / Klasör | Ne işe yarar |
|---|---|
| `CLAUDE.md` | Projenin tarifi. Claude Code her açılışta otomatik okur. **Silme.** |
| `data/menu-verisi.json` | 59 ürünlük menü, fiyatlar, ekstralar, fotoğraf linkleri |
| `supabase/sema.sql` | Veritabanı kurulum dosyası |
| `messages/tr.json` · `ar.json` | Türkçe ve Arapça metinler |
| `src/` | Sitenin kodu |
| `.env.local.example` | Supabase şifrelerinin gireceği şablon |

---

## Supabase (2. adımdan önce)

1. [supabase.com](https://supabase.com) → ücretsiz hesap aç → yeni proje
2. Sol menü **SQL Editor** → yeni sorgu → `supabase/sema.sql` dosyasının içeriğini yapıştır → **Run**
3. Sol menü **Settings → API** → üç değeri kopyala
4. `.env.local.example` dosyasının adını `.env.local` yap, değerleri içine yapıştır

Bu adımlarda takılırsan Claude Code'a sor, elinden tutar.

---

## Takıldığın yerde

Bir şey bozulursa Claude Code'a hata metnini olduğu gibi yapıştır. Çözer.

Telefonda kötü görünen bir sayfa olursa: ekran görüntüsü al, Claude Code penceresine sürükle, "bu böyle görünüyor, düzelt" yaz.
