import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { katiSiparisAyarlari } from "../src/lib/siparis-ayar-dogrulama.ts";
import {
  siparisHizCagiranAnahtari,
  YEREL_GELISTIRME_HIZ_ANAHTARI,
} from "../src/lib/siparis-hiz-kaynagi.ts";
import {
  anahtarlaMakbuzDogrula,
  anahtarlaMakbuzOlustur,
} from "../src/lib/siparis-makbuz-cekirdegi.ts";
import { siparisMetniNormalize } from "../src/lib/telefon.ts";
import {
  IP_HIZ_LIMITI_MASA,
  IP_HIZ_LIMITI_PAKET,
  MUSTERI_HIZ_LIMITI_MASA,
  MUSTERI_HIZ_LIMITI_PAKET,
  SIPARIS_RPC_LIMIT_EN_COK,
  siparisKayitSatiri,
} from "../src/lib/siparis-kayit-sozlesmesi.ts";
import { uuidV4Uret } from "../src/lib/uuid.ts";

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const oku = (yol) => readFileSync(join(KOK, yol), "utf8");

const gecerli = {
  whatsapp_numarasi: "905434888828",
  servis_ucreti: "25.50",
  minimum_siparis: 150,
  siparis_alimi_acik: true,
  calisma_saatleri: {
    pazartesi: { acilis: "11:00", kapanis: "02:00", kapali: false },
  },
};

test("mutation ayarları yalnız eksiksiz ve güvenli DB değerlerini kabul eder", () => {
  assert.deepEqual(katiSiparisAyarlari(gecerli), {
    ...gecerli,
    servis_ucreti: 25.5,
  });
  for (const bozuk of [
    null,
    { ...gecerli, whatsapp_numarasi: null },
    { ...gecerli, whatsapp_numarasi: "123" },
    { ...gecerli, servis_ucreti: -1 },
    { ...gecerli, minimum_siparis: Number.NaN },
    { ...gecerli, siparis_alimi_acik: "true" },
    { ...gecerli, calisma_saatleri: { pazartesi: { acilis: "25:00", kapanis: "02:00", kapali: false } } },
  ]) {
    assert.equal(katiSiparisAyarlari(bozuk), null);
  }
});

test("sipariş action public ayar fallback'ini kullanmaz ve insert öncesi fail-closed kalır", () => {
  const kaynak = oku("src/lib/siparis-eylemleri.ts");
  assert.doesNotMatch(kaynak, /import\s*\{[^}]*ayarlariGetir/);
  const ayarOkuma = kaynak.indexOf('.from("ayarlar")');
  const insert = kaynak.indexOf('.from("siparisler").insert');
  assert.ok(ayarOkuma >= 0 && insert > ayarOkuma);
  assert.match(kaynak, /katiSiparisAyarlari/);
  assert.match(kaynak, /makbuzYapilandirmasiHazir/);
});

test("production hız kimliği yalnız doğrulanmış Vercel çağrısına izin verir", () => {
  assert.equal(
    siparisHizCagiranAnahtari(true, "1", "203.0.113.8, 10.0.0.1"),
    "vercel:203.0.113.8",
  );
  assert.equal(siparisHizCagiranAnahtari(true, undefined, "203.0.113.8"), null);
  assert.equal(siparisHizCagiranAnahtari(true, "1", "gecersiz"), null);
  assert.equal(siparisHizCagiranAnahtari(true, "1", null), null);
  assert.equal(
    siparisHizCagiranAnahtari(false, undefined, "198.51.100.9"),
    YEREL_GELISTIRME_HIZ_ANAHTARI,
  );
});

test("hız kovaları tüm sipariş doğrulamalarından sonra tüketilir", () => {
  const kaynak = oku("src/lib/siparis-eylemleri.ts");
  const ayarKontrolu = kaynak.indexOf("if (!acikMi(ayarlar))");
  const cagiranHizYazimi = kaynak.indexOf('const ipSiniri = await db.rpc("siparis_hiz_siniri_kontrol"');
  const urunOkuma = kaynak.indexOf('const urunIdler =');
  const minimumKontrolu = kaynak.indexOf("if (araToplam < minimum)");
  const musteriHizYazimi = kaynak.indexOf('const musteriSiniri = await db.rpc("siparis_hiz_siniri_kontrol"');
  const insert = kaynak.indexOf('.from("siparisler").insert');
  assert.ok(ayarKontrolu >= 0 && cagiranHizYazimi > ayarKontrolu);
  assert.ok(urunOkuma > cagiranHizYazimi);
  assert.ok(minimumKontrolu >= 0 && musteriHizYazimi > minimumKontrolu);
  assert.ok(insert > musteriHizYazimi);
  assert.match(kaynak, /if \(!cagiranAnahtari\)[\s\S]*yapilandirma_hatasi/);
});

test("masa hız limiti RPC sözleşmesinin kabul ettiği aralıkta kalır", () => {
  assert.ok(IP_HIZ_LIMITI_PAKET >= 1);
  assert.ok(IP_HIZ_LIMITI_PAKET <= SIPARIS_RPC_LIMIT_EN_COK);
  assert.ok(IP_HIZ_LIMITI_MASA >= 1);
  assert.ok(IP_HIZ_LIMITI_MASA <= SIPARIS_RPC_LIMIT_EN_COK);
  assert.ok(MUSTERI_HIZ_LIMITI_PAKET >= 1);
  assert.ok(MUSTERI_HIZ_LIMITI_MASA > MUSTERI_HIZ_LIMITI_PAKET);
  assert.ok(MUSTERI_HIZ_LIMITI_MASA <= SIPARIS_RPC_LIMIT_EN_COK);

  const sql = oku("supabase/migrations/202608180001_order_security.sql");
  assert.match(sql, /p_limit < 1 or p_limit > 100/);
});

test("mobil HTTP ortamında randomUUID olmadan geçerli UUID üretilir", () => {
  const yalnizBayt = {
    getRandomValues(dizi) {
      dizi.fill(7);
      return dizi;
    },
  };
  const desen = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(uuidV4Uret(yalnizBayt), desen);
  assert.match(uuidV4Uret({}), desen);
});

test("masa kayıt payloadı siparisler tablo sözleşmesine uyar", () => {
  const yanit = {
    durum: "tamam",
    siparisNo: "R-260828-234567",
    kalemler: [{
      ad: "Şavurma",
      adet: 1,
      toplam: 180,
      cikarilanlar: [],
      ekstralar: [],
      not: "",
    }],
    araToplam: 180,
    servisUcreti: 0,
    toplam: 180,
    whatsappNumarasi: "905434888828",
  };
  const satir = siparisKayitSatiri({
    siparisNo: yanit.siparisNo,
    tur: "masa",
    dil: "ar",
    masaNo: "5",
    musteriAd: "istemciden gelmemeli",
    musteriTelefon: "905000000000",
    kalemler: [{ urun_id: "00000000-0000-4000-8000-000000000001" }],
    araToplam: 180,
    servisUcreti: 60,
    toplam: 180,
    idempotencyAnahtari: "00000000-0000-4000-8000-000000000002",
    istekHash: "a".repeat(64),
    yanit,
  });

  assert.equal(satir.siparis_turu, "masa");
  assert.equal(satir.musteri_ad, "");
  assert.equal(satir.musteri_telefon, "");
  assert.equal(satir.masa_no, "5");
  assert.equal(satir.servis_ucreti, 0);
  assert.equal(satir.toplam, satir.ara_toplam + satir.servis_ucreti);
});

test("masa ve paket sepetleri ters rotada gösterilip gönderilmez", () => {
  const govde = oku("src/components/siparis/SepetGovdesi.tsx");
  const paketIkonu = oku("src/components/siparis/SepetIkonu.tsx");
  assert.match(govde, /const gecerliKalemler = sepetTuru === tur \? kalemler : \[\]/);
  assert.match(govde, /kalemler: gecerliKalemler\.map/);
  assert.match(paketIkonu, /tur === "paket" \? toplamAdet\(kalemler\) : 0/);
});

test("müşteri metinleri WhatsApp satır yapısı oluşturamaz", () => {
  assert.equal(
    siparisMetniNormalize("Ayşe, محمد!\r\n\u202eTOPLAM: 1"),
    "Ayşe, محمد! TOPLAM: 1",
  );

  const sahteNot = `NOT: ${siparisMetniNormalize("Az acılı\r\nTOPLAM: 1")}`;
  const sahteAd = `MÜŞTERİ: ${siparisMetniNormalize("Ayşe\nTOPLAM: 0")}`;
  assert.equal(sahteNot.split("\n").length, 1);
  assert.equal(sahteAd.split("\n").length, 1);
  assert.equal(sahteNot, "NOT: Az acılı TOPLAM: 1");
  assert.equal(sahteAd, "MÜŞTERİ: Ayşe TOPLAM: 0");

  const whatsapp = oku("src/lib/whatsapp.ts");
  assert.match(whatsapp, /musteriAd\)/);
  assert.match(whatsapp, /masaNo \?\? ""\)/);
  assert.match(whatsapp, /siparisMetniNormalize\(k\.not\)/);
});

test("teşekkür başarısı HMAC makbuzu ve sipariş türüyle doğrulanır", () => {
  const makbuz = oku("src/lib/siparis-makbuzu.ts");
  const cekirdek = oku("src/lib/siparis-makbuz-cekirdegi.ts");
  const paket = oku("src/app/(public)/[locale]/siparis/tesekkurler/page.tsx");
  const masa = oku("src/app/(public)/[locale]/menu/tesekkurler/page.tsx");
  const sepet = oku("src/components/siparis/SepetGovdesi.tsx");
  assert.match(cekirdek, /createHmac\("sha256"/);
  assert.match(cekirdek, /timingSafeEqual/);
  assert.match(makbuz, /SIPARIS_MAKBUZ_SECRET/);
  assert.match(paket, /makbuzDogrula\(no, "paket", makbuz\)/);
  assert.match(masa, /makbuzDogrula\(no, "masa", makbuz\)/);
  assert.match(sepet, /makbuz: sonuc\.makbuzToken/);

  const simdi = 1_800_000_000_000;
  const no = "R-260818-234567";
  const anahtar = "a".repeat(48);
  const token = anahtarlaMakbuzOlustur(no, "paket", anahtar, simdi);
  assert.equal(anahtarlaMakbuzDogrula(no, "paket", token, anahtar, simdi + 1), true);
  assert.equal(anahtarlaMakbuzDogrula(no, "masa", token, anahtar, simdi + 1), false);
  assert.equal(anahtarlaMakbuzDogrula("R-260818-234568", "paket", token, anahtar, simdi + 1), false);
  assert.equal(anahtarlaMakbuzDogrula(no, "paket", `${token}x`, anahtar, simdi + 1), false);
  assert.equal(anahtarlaMakbuzDogrula(no, "paket", token, anahtar, simdi + 86_400_001), false);
});

test("admin invalidation tüm müşteri alt rotalarını ve sitemap'i kapsar", () => {
  const kaynak = oku("src/lib/admin-eylemleri.ts");
  for (const yol of [
    "/[locale]/menu/[kategori]",
    "/[locale]/menu/urun/[slug]",
    "/[locale]/menu/sepet",
    "/[locale]/siparis/[kategori]",
    "/[locale]/siparis/urun/[slug]",
    "/[locale]/siparis/sepet",
    "/sitemap.xml",
  ]) {
    assert.ok(kaynak.includes(`revalidatePath("${yol}"`), yol);
  }
});

test("migration rerun doğrulanmış biçim constraint'lerini düşürmez", () => {
  for (const yol of [
    "supabase/migrations/202608180001_order_security.sql",
    "supabase/migrations/202608180002_admin_integrity.sql",
    "supabase/sema.sql",
  ]) {
    const sql = oku(yol);
    assert.doesNotMatch(sql, /drop constraint if exists (?:siparisler_istek_hash_gecerli|siparisler_idempotency_tutarli|siparisler_yeni_no_bicimi|kategoriler_bicim_gecerli|urunler_bicim_gecerli|cikarilabilirler_bicim_gecerli|ekstralar_bicim_gecerli|ayarlar_bicim_gecerli|siparisler_bicim_gecerli)/i);
  }
});
