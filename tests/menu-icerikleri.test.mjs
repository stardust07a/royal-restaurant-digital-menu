import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const menu = JSON.parse(readFileSync(new URL("../data/menu-verisi.json", import.meta.url), "utf8"));

function urun(slug) {
  const bulunan = menu.urunler.find((aday) => aday.slug === slug);
  assert.ok(bulunan, `${slug} urunu bulunamadi`);
  return bulunan;
}

function secenekler(slug) {
  const kayit = urun(slug);
  return kayit.cikarilabilir === "yok"
    ? []
    : menu.cikarilabilir_sablonlari[kayit.cikarilabilir];
}

test("yedek menudeki tum kategorilerin iki dilde kisa aciklamasi vardir", () => {
  for (const kategori of menu.kategoriler) {
    assert.ok(kategori.aciklama_tr?.trim(), `${kategori.slug}: Turkce aciklama eksik`);
    assert.ok(kategori.aciklama_ar?.trim(), `${kategori.slug}: Arapca aciklama eksik`);
  }
});

test("Suriye usulu tavuk savurma yalniz gercek sandvic malzemelerini gosterir", () => {
  assert.deepEqual(
    secenekler("doner").map((secenek) => [secenek.ad_tr, secenek.ad_ar]),
    [
      ["Sarımsak sosu", "ثومية"],
      ["Turşu", "مخلل خيار"],
    ],
  );
  assert.match(urun("doner").aciklama_tr, /Suriye usulü.*sarımsak sosu.*turşu/i);
  assert.doesNotMatch(urun("doner").aciklama_tr, /patates/i);
  assert.match(urun("doner").aciklama_ar, /شاورما دجاج سورية.*ثومية.*مخلل خيار/);
  assert.doesNotMatch(urun("doner").aciklama_ar, /بطاطا/);
});

test("genel sandvic, burger ve menu kaliplari artik kullanilmaz", () => {
  const eskiSablonlar = new Set([
    "durum_sandvic",
    "burger",
    "tavuk_izgara",
    "salata",
    "menu_combo",
  ]);
  for (const kayit of menu.urunler) {
    assert.equal(eskiSablonlar.has(kayit.cikarilabilir), false, `${kayit.slug} eski sablonu kullaniyor`);
  }
  for (const sablon of eskiSablonlar) {
    assert.equal(sablon in menu.cikarilabilir_sablonlari, false, `${sablon} silinmemis`);
  }
});

test("pisirilmis baharatlar cikarilabilir secenek olarak sunulmaz", () => {
  for (const slug of [
    "butun-broasted",
    "butun-mangal-tavuk",
    "yarim-mangal-tavuk",
    "kizarmis-tavuk",
    "yarim-tavuk",
    "izgara-kanat-porsiyon",
  ]) {
    const adlar = secenekler(slug).map((secenek) => secenek.ad_tr);
    assert.equal(adlar.includes("Baharat"), false, `${slug}: baharat sonradan cikarilamaz`);
    assert.equal(adlar.includes("Acı"), false, `${slug}: pisirilmis aci sonradan cikarilamaz`);
    assert.equal(adlar.includes("Limon"), false, `${slug}: varsayilan limon secenegi olmamali`);
  }
});

test("tum cikarilabilir secenekler iki dilde doludur", () => {
  for (const [sablon, satirlar] of Object.entries(menu.cikarilabilir_sablonlari)) {
    if (sablon.startsWith("_")) continue;
    assert.ok(Array.isArray(satirlar), `${sablon} dizi olmali`);
    for (const satir of satirlar) {
      assert.ok(satir.ad_tr?.trim(), `${sablon}: Turkce ad eksik`);
      assert.ok(satir.ad_ar?.trim(), `${sablon}: Arapca ad eksik`);
    }
  }
});
