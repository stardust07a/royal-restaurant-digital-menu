import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const oku = (...parcalar) => readFileSync(join(KOK, ...parcalar), "utf8");

test("kategori silme uyarisi kategoriye ozel metni kullanir", () => {
  const form = oku("src", "components", "admin", "KategoriFormu.tsx");
  assert.match(form, /confirm\(`\"\$\{kategoriAdi\}\" \$\{m\("kategoriSilOnay"\)\}`\)/);
});

test("Arapca kategori listesi Arapca adi ve guvenli gorseli kullanir", () => {
  const liste = oku("src", "components", "admin", "KategoriListesi.tsx");
  assert.match(liste, /dil === "ar" \? k\.ad_ar \|\| k\.ad_tr/);
  assert.match(liste, /nextGorselUrlDogrula\(k\.gorsel_url\)/);
  assert.match(liste, /aria-label=\{`\$\{kategoriAdi\} \$\{m\("yukariTasi"\)\}`\}/);
  assert.match(liste, /aria-label=\{`\$\{kategoriAdi\} \$\{m\("asagiTasi"\)\}`\}/);
});

test("admin ve ana sayfa gorselleri guvenli URL ile 404 yedegine doner", () => {
  const ustBar = oku("src", "components", "admin", "AdminUstBar.tsx");
  const ayarlar = oku("src", "components", "admin", "AyarlarFormu.tsx");
  const urunFormu = oku("src", "components", "admin", "UrunFormu.tsx");
  const urunListesi = oku("src", "components", "admin", "UrunListesi.tsx");
  const iletisim = oku("src", "components", "menu", "IletisimGorseli.tsx");
  const anaSayfa = oku("src", "app", "(public)", "[locale]", "page.tsx");

  assert.match(ustBar, /aria-label=\{`\$\{m\("dil"\)\}: \$\{m\(hedefDil === "ar" \? "arapca" : "turkce"\)\}`\}/);
  assert.match(ayarlar, /nextGorselUrlDogrula\(a\.logo_url\)/);
  assert.match(urunFormu, /nextGorselUrlDogrula\(u\.gorsel_url\)/);
  assert.match(urunListesi, /nextGorselUrlDogrula\(u\.gorsel_url\)/);
  assert.match(iletisim, /onError=\{\(\) => setGorselHatali\(true\)\}/);
  assert.match(iletisim, /setGorselHatali\(false\)/);
  assert.match(anaSayfa, /imageClassName="object-contain"/);
  assert.doesNotMatch(anaSayfa, /imageClassName="[^"]*object-cover/);
});

test("kategori formu gorsel 404 durumunu URL degisince sifirlar", () => {
  const form = oku("src", "components", "admin", "KategoriFormu.tsx");
  assert.match(form, /const \[gorselHatali, setGorselHatali\] = useState\(false\)/);
  assert.match(form, /useEffect\(\(\) => \{\s*setGorselHatali\(false\);\s*\}, \[guvenliGorselUrl\]\)/);
  assert.match(form, /guvenliGorselUrl && !gorselHatali/);
  assert.match(form, /onError=\{\(\) => setGorselHatali\(true\)\}/);
});

test("urun listesi aktif admin dilinde ad ve stok anahtari etiketi kullanir", () => {
  const liste = oku("src", "components", "admin", "UrunListesi.tsx");
  const sayfa = oku("src", "app", "(admin)", "admin", "page.tsx");
  assert.match(liste, /const \{ m, dil \} = useAdminDil\(\)/);
  assert.match(liste, /dil === "ar" \? u\.ad_ar \|\| u\.ad_tr : u\.ad_tr \|\| u\.ad_ar/);
  assert.match(liste, /aria-label=\{`\$\{dil === "ar" \? u\.ad_ar \|\| u\.ad_tr : u\.ad_tr \|\| u\.ad_ar\} \$\{m\("stokDurumu"\)\}`\}/);
  assert.match(sayfa, /id, slug, sira, ad_tr, ad_ar,/);
});

test("urun sayfasi basligi dili ve gorsel yuklerken silme kilidi guvenlidir", () => {
  const sayfa = oku("src", "app", "(admin)", "admin", "urun", "[id]", "page.tsx");
  const form = oku("src", "components", "admin", "UrunFormu.tsx");
  assert.match(sayfa, /\.select\("id, ad_tr, ad_ar"\)/);
  assert.match(sayfa, /<AdminUstBar baslikTr=\{data\.ad_tr\} baslikAr=\{data\.ad_ar\}/);
  assert.match(form, /disabled=\{kaydediliyor \|\| yukleniyor\}[\s\S]*m\("urunuSil"\)/);
});

test("urun ve kategori fotograf yuklemeleri cift islemi ve eski sonucu engeller", () => {
  for (const dosya of ["UrunFormu.tsx", "KategoriFormu.tsx"]) {
    const form = oku("src", "components", "admin", dosya);
    assert.match(form, /const yuklemeKilidi = useRef\(false\)/);
    assert.match(form, /const yuklemeKimligi = useRef\(0\)/);
    assert.match(form, /if \(!dosya \|\| yuklemeKilidi\.current\) return/);
    assert.match(form, /islemKimligi !== yuklemeKimligi\.current/);
    assert.match(form, /disabled=\{yukleniyor\}/);
    assert.match(form, /if \(yuklemeKilidi\.current\) return;/);
  }
});

test("kategori sira dugmeleri en az 44 piksel ve urun satiri eylemleri ad veya sira tasir", () => {
  const liste = oku("src", "components", "admin", "KategoriListesi.tsx");
  const urunFormu = oku("src", "components", "admin", "UrunFormu.tsx");
  assert.match(liste, /className="flex h-11 min-h-11 w-11/);
  assert.match(urunFormu, /dil === "ar" \? s\.ad_ar \|\| s\.ad_tr \|\| i \+ 1/);
  assert.match(urunFormu, /m\("yukariTasi"\)/);
  assert.match(urunFormu, /m\("asagiTasi"\)/);
  assert.match(urunFormu, /m\("satiriSil"\)/);
});

test("ayarlar iletisim logosu kaldirma dugmesi aktif dilde baglam tasir", () => {
  const ayarlar = oku("src", "components", "admin", "AyarlarFormu.tsx");
  assert.match(ayarlar, /aria-label=\{`\$\{m\(etiket\)\} \$\{m\("kaldir"\)\}`\}/);
});
