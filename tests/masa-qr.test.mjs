import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const kok = dirname(dirname(fileURLToPath(import.meta.url)));
const oku = (yol) => readFileSync(join(kok, yol), "utf8");

test("ana sayfa coklu kategori urunlerini tekillestirir ve masa menusu linki sunmaz", () => {
  const ana = oku("src/app/(public)/[locale]/page.tsx");
  assert.match(ana, /new Map\(kategoriler\.flatMap\(\(k\) => k\.urunler\)/);
  assert.doesNotMatch(ana, /href=["']\/menu["']/);
});

test("admin urun listesi belirsiz embed yerine kategori baglarini ayri okur", () => {
  const admin = oku("src/app/(admin)/admin/page.tsx");
  assert.match(admin, /from\("urun_kategorileri"\)/);
  assert.match(admin, /from\("urunler"\)/);
  assert.match(admin, /sira: bag\.sira/);
});

test("masa QR akisi 15 imzali koddan oturum acar ve menuyu korur", () => {
  const qr = oku("src/app/(admin)/admin/qr/page.tsx");
  const erisim = oku("src/lib/masa-erisim.ts");
  const rota = oku("src/app/masa/[no]/route.ts");
  const middleware = oku("src/middleware.ts");
  const siparis = oku("src/lib/siparis-eylemleri.ts");
  const sepet = oku("src/components/siparis/SepetGovdesi.tsx");
  const sepetSayfasi = oku("src/app/(public)/[locale]/menu/sepet/page.tsx");
  assert.match(erisim, /MASA_SAYISI = 15/);
  assert.match(qr, /MASA_SAYISI/);
  assert.match(rota, /masaQrGecerli\(no, imza\)/);
  assert.match(rota, /httpOnly: true/);
  assert.match(middleware, /menuEslesmesi.*masaOturumuGecerli\(request\)/s);
  assert.match(siparis, /girdi\.masaNo !== qrMasaNo/);
  assert.match(sepetSayfasi, /masaNo=\{masaNo \?\? ""\}/);
  assert.doesNotMatch(sepet, /setMasaNo/);
});

test("urun formu mevcut urunu ekstra secebilir ve fiyati bosaltabilir", () => {
  const form = oku("src/components/admin/UrunFormu.tsx");
  assert.match(form, /ekstraAdaylari/);
  assert.match(form, /urunAdaylari\.find/);
  assert.match(form, /masaFiyatGirdisi/);
  assert.match(form, /paketFiyatGirdisi/);
  assert.match(form, /if \(metin !== ""/);
  assert.match(form, /if \(!masaFiyatGirdisi\.trim\(\) \|\| !paketFiyatGirdisi\.trim\(\)\)/);
});

test("ornek menu verisinde icecek dahil iddiasi bulunmaz", () => {
  const menu = JSON.parse(oku("data/menu-verisi.json"));
  for (const urun of menu.urunler) {
    for (const alan of ["aciklama_tr", "aciklama_ar", "gramaj", "gramaj_ar"]) {
      assert.doesNotMatch(urun[alan] ?? "", /içecek|مشروب/i, `${urun.slug}.${alan}`);
    }
  }
  assert.equal(JSON.stringify(menu.ekstra_sablonlari).includes("İçeceği 1L yap"), false);
});
