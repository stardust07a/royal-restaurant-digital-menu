"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { acikMi } from "./ayarlar";
import { kurus, fiyatYaz } from "./sabitler";
import { siparisMetniNormalize, telefonGecerliMi, telefonNormalize } from "./telefon";
import { masaOturumuGetir } from "./masa-erisim";
import { katiSiparisAyarlari } from "./siparis-ayar-dogrulama";
import { siparisHizCagiranAnahtari } from "./siparis-hiz-kaynagi";
import {
  IP_HIZ_LIMITI_MASA,
  IP_HIZ_LIMITI_PAKET,
  MUSTERI_HIZ_LIMITI_MASA,
  MUSTERI_HIZ_LIMITI_PAKET,
  siparisKayitSatiri,
} from "./siparis-kayit-sozlesmesi";
import {
  makbuzOlustur,
  makbuzYapilandirmasiHazir,
} from "./siparis-makbuzu";
import { yoneticiIstemcisi } from "./supabase-yonetici";
import type {
  KayitliSiparisBasarisi,
  SiparisGirdisi,
  SiparisSonucu,
  OnaylanmisKalem,
} from "./siparis-tipleri";

const NOT_EN_COK = 200;
const ADET_EN_COK = 99;
const KALEM_EN_COK = 30;
const SECENEK_SATIR_EN_COK = 20;
const SECENEK_TOPLAM_EN_COK = 100;
const ISTEK_BAYT_EN_COK = 50 * 1024;
const HIZ_PENCERESI_SANIYE = 10 * 60;
const NUMARA_DENEMESI = 10;
const UUID_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIPARIS_ALFABESI = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Okunabilir, gun bazli ve eski dort karakterli alandan cok daha genis. */
function siparisNoUret(): string {
  const tarih = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replaceAll("-", "");
  const rastgele = randomBytes(6);
  let son = "";
  for (let i = 0; i < 6; i++) {
    son += SIPARIS_ALFABESI[rastgele[i] % SIPARIS_ALFABESI.length];
  }
  return `R-${tarih}-${son}`;
}

function sha256(deger: string): string {
  return createHash("sha256").update(deger, "utf8").digest("hex");
}

/** Production'da doğrulanmış Vercel çağıranı yoksa mutation fail-closed kalır. */
async function hizSiniriCagiranAnahtari(): Promise<string | null> {
  const production = process.env.NODE_ENV === "production";
  const vercelBasligi = production && process.env.VERCEL === "1"
    ? (await headers()).get("x-vercel-forwarded-for")
    : null;
  return siparisHizCagiranAnahtari(
    production,
    process.env.VERCEL,
    vercelBasligi,
  );
}

function paraGecerli(deger: unknown): deger is number {
  return typeof deger === "number" && Number.isFinite(deger) && deger >= 0;
}

/** DB'den donen JSON'a tip beyan etmek yerine tum kullanilan alanlari denetler. */
function basariliSonucMu(deger: unknown): deger is KayitliSiparisBasarisi {
  if (!deger || typeof deger !== "object") return false;
  const sonuc = deger as Record<string, unknown>;
  if (
    sonuc.durum !== "tamam" ||
    typeof sonuc.siparisNo !== "string" ||
    !/^R-[0-9]{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(sonuc.siparisNo) ||
    !Array.isArray(sonuc.kalemler) ||
    sonuc.kalemler.length < 1 ||
    sonuc.kalemler.length > KALEM_EN_COK ||
    !paraGecerli(sonuc.araToplam) ||
    !paraGecerli(sonuc.servisUcreti) ||
    !paraGecerli(sonuc.toplam) ||
    kurus(sonuc.araToplam + sonuc.servisUcreti) !== kurus(sonuc.toplam) ||
    typeof sonuc.whatsappNumarasi !== "string" ||
    sonuc.whatsappNumarasi.length > 32
  ) {
    return false;
  }

  let kalemToplami = 0;
  let secenekToplami = 0;
  for (const hamKalem of sonuc.kalemler) {
    if (!hamKalem || typeof hamKalem !== "object") return false;
    const kalem = hamKalem as Record<string, unknown>;
    const adet = kalem.adet;
    if (
      typeof kalem.ad !== "string" ||
      kalem.ad.length < 1 ||
      kalem.ad.length > 200 ||
      typeof adet !== "number" ||
      !Number.isInteger(adet) ||
      adet < 1 ||
      adet > ADET_EN_COK ||
      !paraGecerli(kalem.toplam) ||
      typeof kalem.not !== "string" ||
      kalem.not.length > NOT_EN_COK ||
      !Array.isArray(kalem.cikarilanlar) ||
      kalem.cikarilanlar.length > SECENEK_SATIR_EN_COK ||
      kalem.cikarilanlar.some((ad) => typeof ad !== "string" || ad.length > 200) ||
      !Array.isArray(kalem.ekstralar) ||
      kalem.ekstralar.length > SECENEK_SATIR_EN_COK
    ) {
      return false;
    }
    secenekToplami += kalem.cikarilanlar.length + kalem.ekstralar.length;
    if (secenekToplami > SECENEK_TOPLAM_EN_COK) return false;
    for (const hamEkstra of kalem.ekstralar) {
      if (!hamEkstra || typeof hamEkstra !== "object") return false;
      const ekstra = hamEkstra as Record<string, unknown>;
      if (
        typeof ekstra.ad !== "string" ||
        ekstra.ad.length < 1 ||
        ekstra.ad.length > 200 ||
        !paraGecerli(ekstra.fiyat)
      ) {
        return false;
      }
    }
    kalemToplami = kurus(kalemToplami + kalem.toplam);
  }
  return kalemToplami === kurus(sonuc.araToplam);
}

async function oncekiBasariliSonuc(
  db: ReturnType<typeof yoneticiIstemcisi>,
  idempotencyAnahtari: string,
  istekHash: string,
  tur: SiparisGirdisi["tur"],
): Promise<SiparisSonucu | null> {
  const { data, error } = await db
    .from("siparisler")
    .select("istek_hash, idempotency_yaniti")
    .eq("idempotency_anahtari", idempotencyAnahtari)
    .maybeSingle();
  if (error) {
    console.error("Idempotency kaydi okunamadi:", error.message);
    return { durum: "hata", kod: "kayit_hatasi" };
  }
  if (!data) return null;
  if (data.istek_hash !== istekHash || !basariliSonucMu(data.idempotency_yaniti)) {
    return { durum: "hata", kod: "gecersiz_istek" };
  }
  return {
    ...data.idempotency_yaniti,
    makbuzToken: makbuzOlustur(data.idempotency_yaniti.siparisNo, tur),
  };
}

/**
 * Siparisi kaydeder ve WhatsApp mesaji icin dogrulanmis tutarlari doner.
 * Fiyatlar service-role istemcisiyle veritabanindan yeniden okunur; istemcinin
 * fiyatlarina guvenilmez. Service-role anahtari sadece bu sunucu modulundedir.
 */
export async function siparisOlustur(girdi: SiparisGirdisi): Promise<SiparisSonucu> {
  // ---------- 1. Boyut ve bicim dogrulamasi ----------
  let istekMetni = "";
  try {
    istekMetni = JSON.stringify(girdi);
  } catch {
    return { durum: "hata", kod: "gecersiz_istek" };
  }
  if (
    !girdi ||
    typeof girdi !== "object" ||
    new TextEncoder().encode(istekMetni).byteLength > ISTEK_BAYT_EN_COK ||
    typeof girdi.idempotencyAnahtari !== "string" ||
    !UUID_DESENI.test(girdi.idempotencyAnahtari) ||
    (girdi.dil !== "tr" && girdi.dil !== "ar") ||
    (girdi.tur !== "masa" && girdi.tur !== "paket") ||
    !Array.isArray(girdi.kalemler) ||
    girdi.kalemler.length < 1 ||
    girdi.kalemler.length > KALEM_EN_COK
  ) {
    return { durum: "hata", kod: "gecersiz_istek" };
  }

  let secenekSayisi = 0;
  for (const kalem of girdi.kalemler) {
    if (
      !kalem ||
      typeof kalem !== "object" ||
      typeof kalem.urunId !== "string" ||
      !UUID_DESENI.test(kalem.urunId) ||
      !Array.isArray(kalem.ekstraIdler) ||
      !Array.isArray(kalem.cikarilanIdler) ||
      kalem.ekstraIdler.length > SECENEK_SATIR_EN_COK ||
      kalem.cikarilanIdler.length > SECENEK_SATIR_EN_COK ||
      kalem.ekstraIdler.some((id) => typeof id !== "string" || !UUID_DESENI.test(id)) ||
      kalem.cikarilanIdler.some((id) => typeof id !== "string" || !UUID_DESENI.test(id)) ||
      new Set(kalem.ekstraIdler).size !== kalem.ekstraIdler.length ||
      new Set(kalem.cikarilanIdler).size !== kalem.cikarilanIdler.length ||
      typeof kalem.not !== "string" ||
      kalem.not.length > NOT_EN_COK ||
      !Number.isInteger(kalem.adet) ||
      kalem.adet < 1 ||
      kalem.adet > ADET_EN_COK
    ) {
      return { durum: "hata", kod: "gecersiz_istek" };
    }
    secenekSayisi += kalem.ekstraIdler.length + kalem.cikarilanIdler.length;
  }
  if (secenekSayisi > SECENEK_TOPLAM_EN_COK) {
    return { durum: "hata", kod: "gecersiz_istek" };
  }

  const cagiranAnahtari = await hizSiniriCagiranAnahtari();
  if (!cagiranAnahtari) {
    console.error("Siparis hiz siniri icin desteklenen production proxy yapilandirmasi yok.");
    return { durum: "hata", kod: "yapilandirma_hatasi" };
  }

  // Makbuz sirri ve service-role istemcisi yoksa mutation baslamadan fail-closed.
  if (!makbuzYapilandirmasiHazir()) {
    console.error("Siparis makbuz yapilandirmasi eksik.");
    return { durum: "hata", kod: "yapilandirma_hatasi" };
  }
  let db: ReturnType<typeof yoneticiIstemcisi>;
  try {
    db = yoneticiIstemcisi();
  } catch (hata) {
    console.error("Siparis service-role istemcisi olusturulamadi:", hata);
    return { durum: "hata", kod: "yapilandirma_hatasi" };
  }

  const masaSiparisi = girdi.tur === "masa";
  let ad = "";
  let telefon = "";
  let masaNo = "";
  if (masaSiparisi) {
    // Istemciden gonderilen masa numarasina guvenilmez; yalniz imzali QR
    // oturumunun bagladigi masa siparise yazilir.
    const qrMasaNo = await masaOturumuGetir();
    if (!qrMasaNo || girdi.masaNo !== qrMasaNo) {
      return { durum: "hata", kod: "masa_no_gecersiz" };
    }
    masaNo = qrMasaNo;
  } else {
    if (typeof girdi.musteriTelefon !== "string") {
      return { durum: "hata", kod: "gecersiz_istek" };
    }
    // Siparis kaydi eski DB sozlesmesi geregi bos ad kabul etmiyor.
    // Musteriden ad istenmez; veritabaninda gercek kisi adi olmayan etiket tutulur.
    ad = girdi.dil === "ar" ? "طلب خارجي" : "Paket Sipariş";
    const guvenliTelefon = siparisMetniNormalize(girdi.musteriTelefon);
    if (guvenliTelefon && !telefonGecerliMi(guvenliTelefon)) {
      return { durum: "hata", kod: "telefon_gecersiz" };
    }
    telefon = guvenliTelefon ? telefonNormalize(guvenliTelefon) : "";
  }

  const istekHash = sha256(istekMetni);
  const onceki = await oncekiBasariliSonuc(
    db,
    girdi.idempotencyAnahtari,
    istekHash,
    girdi.tur,
  );
  if (onceki) return onceki;

  // ---------- 2. Mutation icin kati ayarlar ----------
  // Public ayarlariGetir() goruntuleme varsayilanlarina dusebilir. Siparis
  // yazimi ise ayni tabloyu service-role ile okuyup tum gerekli alanlari
  // dogrular; hata, eksik satir veya bozuk degerde insert'e kadar ilerlemez.
  const ayarSonucu = await db
    .from("ayarlar")
    .select(
      "whatsapp_numarasi, servis_ucreti, minimum_siparis, siparis_alimi_acik, calisma_saatleri",
    )
    .eq("id", 1)
    .maybeSingle();
  if (ayarSonucu.error || !ayarSonucu.data) {
    console.error("Siparis ayarlari okunamadi:", ayarSonucu.error?.message ?? "ayar satiri yok");
    return { durum: "hata", kod: "yapilandirma_hatasi" };
  }
  const ayarlar = katiSiparisAyarlari(ayarSonucu.data);
  if (!ayarlar) {
    console.error("Siparis ayarlari gecersiz veya eksik.");
    return { durum: "hata", kod: "yapilandirma_hatasi" };
  }
  if (!acikMi(ayarlar)) return { durum: "hata", kod: "kapali" };

  // ---------- 3. Guvenilir cagiran hiz siniri ----------
  // Bu kova musteri alanlarina bagli degildir; pahali urun sorgularindan once
  // DB'yi korur ve baska bir telefon/masa hedeflenerek tuketilemez.
  const ipLimiti = masaSiparisi ? IP_HIZ_LIMITI_MASA : IP_HIZ_LIMITI_PAKET;
  const ipSiniri = await db.rpc("siparis_hiz_siniri_kontrol", {
    p_anahtar_hash: sha256(`v4|cagiran|${girdi.tur}|${cagiranAnahtari}`),
    p_limit: ipLimiti,
    p_pencere_saniye: HIZ_PENCERESI_SANIYE,
  });
  if (ipSiniri.error) {
    console.error("Cagiran hiz siniri calismadi:", ipSiniri.error.message);
    return { durum: "hata", kod: "kayit_hatasi" };
  }
  if (!ipSiniri.data) return { durum: "hata", kod: "cok_fazla_istek" };

  // ---------- 4. Guncel fiyatlari oku ----------
  const urunIdler = [...new Set(girdi.kalemler.map((k) => k.urunId))];
  const ekstraIdler = [...new Set(girdi.kalemler.flatMap((k) => k.ekstraIdler))];
  const cikarilanIdler = [...new Set(girdi.kalemler.flatMap((k) => k.cikarilanIdler))];
  const { data: urunler, error: urunHatasi } = await db
    .from("urunler")
    .select("id, ad_tr, ad_ar, fiyat_masa, fiyat_paket, stokta, aktif")
    .in("id", urunIdler);
  if (urunHatasi) {
    console.error("Siparis urunleri okunamadi:", urunHatasi.message);
    return { durum: "hata", kod: "kayit_hatasi" };
  }

  const ekstraSonucu = ekstraIdler.length
    ? await db.from("ekstralar").select("id, urun_id, ad_tr, ad_ar, fiyat, stokta").in("id", ekstraIdler)
    : { data: [], error: null };
  const cikarilanSonucu = cikarilanIdler.length
    ? await db.from("cikarilabilirler").select("id, urun_id, ad_tr, ad_ar").in("id", cikarilanIdler)
    : { data: [], error: null };
  if (ekstraSonucu.error || cikarilanSonucu.error) {
    console.error("Siparis secenekleri okunamadi:", ekstraSonucu.error?.message ?? cikarilanSonucu.error?.message);
    return { durum: "hata", kod: "kayit_hatasi" };
  }

  const ekstraVerisi = ekstraSonucu.data ?? [];
  const cikarilanVerisi = cikarilanSonucu.data ?? [];
  const urunHaritasi = new Map(urunler?.map((u) => [u.id as string, u]) ?? []);
  const ekstraHaritasi = new Map(ekstraVerisi.map((e) => [e.id as string, e]));
  const cikarilanHaritasi = new Map(cikarilanVerisi.map((c) => [c.id as string, c]));
  const arapca = girdi.dil === "ar";
  const adSec = (k: { ad_tr: string; ad_ar: string }) => (arapca ? k.ad_ar || k.ad_tr : k.ad_tr);

  // ---------- 5. Kalemleri dogrula ve hesapla ----------
  const onaylanmis: OnaylanmisKalem[] = [];
  const kayitKalemleri: Record<string, unknown>[] = [];
  let araToplam = 0;
  for (const kalem of girdi.kalemler) {
    const urun = urunHaritasi.get(kalem.urunId);
    if (!urun || !urun.aktif) return { durum: "hata", kod: "urun_bulunamadi" };
    if (!urun.stokta) return { durum: "hata", kod: "stok_yok", deger: adSec(urun) };

    const seciliEkstralar = [];
    for (const id of kalem.ekstraIdler) {
      const ekstra = ekstraHaritasi.get(id);
      if (!ekstra || ekstra.urun_id !== urun.id) return { durum: "hata", kod: "urun_bulunamadi", deger: adSec(urun) };
      if (!ekstra.stokta) return { durum: "hata", kod: "stok_yok", deger: adSec(ekstra) };
      seciliEkstralar.push(ekstra);
    }
    const seciliCikarilanlar = [];
    for (const id of kalem.cikarilanIdler) {
      const cikarilan = cikarilanHaritasi.get(id);
      if (!cikarilan || cikarilan.urun_id !== urun.id) return { durum: "hata", kod: "urun_bulunamadi", deger: adSec(urun) };
      seciliCikarilanlar.push(cikarilan);
    }

    const birim = kurus(Number(masaSiparisi ? urun.fiyat_masa : urun.fiyat_paket));
    const ekstraToplami = seciliEkstralar.reduce((t, e) => kurus(t + Number(e.fiyat)), 0);
    const satirToplami = kurus((birim + ekstraToplami) * kalem.adet);
    araToplam = kurus(araToplam + satirToplami);
    const not = siparisMetniNormalize(kalem.not);
    onaylanmis.push({
      ad: adSec(urun), adet: kalem.adet, toplam: satirToplami,
      cikarilanlar: seciliCikarilanlar.map(adSec),
      ekstralar: seciliEkstralar.map((e) => ({ ad: adSec(e), fiyat: kurus(Number(e.fiyat)) })),
      not,
    });
    kayitKalemleri.push({
      urun_id: urun.id, ad_tr: urun.ad_tr, ad_ar: urun.ad_ar,
      adet: kalem.adet, birim_fiyat: birim,
      cikarilanlar: seciliCikarilanlar.map((c) => ({ ad_tr: c.ad_tr, ad_ar: c.ad_ar })),
      ekstralar: seciliEkstralar.map((e) => ({ ad_tr: e.ad_tr, ad_ar: e.ad_ar, fiyat: kurus(Number(e.fiyat)) })),
      not,
    });
  }

  const minimum = masaSiparisi ? 0 : kurus(ayarlar.minimum_siparis);
  if (araToplam < minimum) {
    return { durum: "hata", kod: "minimum_alti", deger: fiyatYaz(kurus(minimum - araToplam)) };
  }
  // Paket teslimat ucreti adres goruldukten sonra restoran tarafindan eklenir.
  // Kaydedilen ve WhatsApp'a giden uygulama toplamına otomatik ucret eklenmez.
  const servisUcreti = 0;
  const toplam = araToplam;

  // ---------- 6. Musteriye bagli atomik hiz siniri ----------
  // Ayar, urun, secenek, stok ve minimum kontrolleri tamamlanmadan hicbir
  // saldirgan-kontrollu musteri kovasi tuketilmez.
  const musteriAnahtari = masaSiparisi
    ? `masa:${masaNo.toLocaleLowerCase("tr")}`
    : `telefon:${telefon || "yok"}`;
  const musteriLimiti = masaSiparisi
    ? MUSTERI_HIZ_LIMITI_MASA
    : MUSTERI_HIZ_LIMITI_PAKET;
  const musteriSiniri = await db.rpc("siparis_hiz_siniri_kontrol", {
    p_anahtar_hash: sha256(`v3|musteri|${cagiranAnahtari}|${musteriAnahtari}`),
    p_limit: musteriLimiti,
    p_pencere_saniye: HIZ_PENCERESI_SANIYE,
  });
  if (musteriSiniri.error) {
    console.error("Musteri hiz siniri calismadi:", musteriSiniri.error.message);
    return { durum: "hata", kod: "kayit_hatasi" };
  }
  if (!musteriSiniri.data) return { durum: "hata", kod: "cok_fazla_istek" };

  // ---------- 7. Idempotent kayit ----------
  for (let deneme = 0; deneme < NUMARA_DENEMESI; deneme++) {
    const siparisNo = siparisNoUret();
    const yanit: KayitliSiparisBasarisi = {
      durum: "tamam", siparisNo, kalemler: onaylanmis, araToplam,
      servisUcreti, toplam, whatsappNumarasi: ayarlar.whatsapp_numarasi,
    };
    const { error } = await db.from("siparisler").insert(siparisKayitSatiri({
      siparisNo,
      tur: girdi.tur,
      dil: girdi.dil,
      masaNo,
      musteriAd: ad,
      musteriTelefon: telefon,
      kalemler: kayitKalemleri,
      araToplam,
      servisUcreti,
      toplam,
      idempotencyAnahtari: girdi.idempotencyAnahtari,
      istekHash,
      yanit,
    }));
    if (!error) {
      return {
        ...yanit,
        makbuzToken: makbuzOlustur(siparisNo, girdi.tur),
      };
    }
    if (error.code !== "23505") {
      console.error("Siparis kaydedilemedi:", error.message);
      return { durum: "hata", kod: "kayit_hatasi" };
    }
    const paralelSonuc = await oncekiBasariliSonuc(
      db,
      girdi.idempotencyAnahtari,
      istekHash,
      girdi.tur,
    );
    if (paralelSonuc) return paralelSonuc;
  }

  console.error("Benzersiz siparis numarasi uretilemedi.");
  return { durum: "hata", kod: "kayit_hatasi" };
}
