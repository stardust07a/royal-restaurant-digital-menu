import { supabase } from "./supabase";
import type { Ayarlar } from "./tipler";
import { AYARLAR as VARSAYILAN } from "./sabitler";
import { nextGorselUrlDogrula } from "./guvenli-url";

// Acik/kapali hesabi saf mantik oldugu icin ayri dosyada durur.
export { acikMi } from "./calisma-saatleri";

/**
 * ayarlar tablosunun tek satirini getirir.
 *
 * Tablo okunamazsa sabitler.ts'teki varsayilanlara duser — teslimat ucreti ve
 * minimum siparis gibi degerler olmadan siparis sayfasi calisamaz.
 */
export async function ayarlariGetir(): Promise<Ayarlar> {
  const { data, error } = await supabase()
    .from("ayarlar")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Ayarlar okunamadi:", error.message);
    return {
      restoran_ad_tr: VARSAYILAN.adTr,
      restoran_ad_ar: VARSAYILAN.adAr,
      logo_url: null,
      whatsapp_numarasi: VARSAYILAN.whatsapp,
      telefon: VARSAYILAN.telefon,
      adres_tr: null,
      adres_ar: null,
      harita_linki: VARSAYILAN.harita,
      instagram: VARSAYILAN.instagram,
      tiktok: VARSAYILAN.tiktok,
      facebook: null,
      telefon_ikonu: VARSAYILAN.telefonIkonu,
      whatsapp_ikonu: VARSAYILAN.whatsappIkonu,
      instagram_ikonu: VARSAYILAN.instagramIkonu,
      tiktok_ikonu: VARSAYILAN.tiktokIkonu,
      facebook_ikonu: VARSAYILAN.facebookIkonu,
      telefon_ikon_url: null,
      whatsapp_ikon_url: null,
      instagram_ikon_url: null,
      tiktok_ikon_url: null,
      facebook_ikon_url: null,
      servis_ucreti: VARSAYILAN.servisUcreti,
      minimum_siparis: VARSAYILAN.minimumSiparis,
      siparis_alimi_acik: true,
      calisma_saatleri: null,
      kapali_mesaji_tr: null,
      kapali_mesaji_ar: null,
      hero_baslik_tr: null,
      hero_baslik_ar: null,
      hero_alt_tr: null,
      hero_alt_ar: null,
      hakkimizda_baslik_tr: null,
      hakkimizda_baslik_ar: null,
      hakkimizda_metin_tr: null,
      hakkimizda_metin_ar: null,
    };
  }

  return {
    ...(data as Ayarlar),
    logo_url: nextGorselUrlDogrula((data as Partial<Ayarlar>).logo_url),
    // Yeni kolonlar migration calistirilmamis eski kurulumlarda data'da yoktur.
    // Bu durumda kamu sayfasi yine guvenli varsayilan simgelerle acilir.
    telefon_ikonu:
      (data as Partial<Ayarlar>).telefon_ikonu ?? VARSAYILAN.telefonIkonu,
    whatsapp_ikonu:
      (data as Partial<Ayarlar>).whatsapp_ikonu ?? VARSAYILAN.whatsappIkonu,
    instagram_ikonu:
      (data as Partial<Ayarlar>).instagram_ikonu ?? VARSAYILAN.instagramIkonu,
    tiktok_ikonu:
      (data as Partial<Ayarlar>).tiktok_ikonu ?? VARSAYILAN.tiktokIkonu,
    facebook_ikonu:
      (data as Partial<Ayarlar>).facebook_ikonu ?? VARSAYILAN.facebookIkonu,
    telefon_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).telefon_ikon_url,
    ),
    whatsapp_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).whatsapp_ikon_url,
    ),
    instagram_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).instagram_ikon_url,
    ),
    tiktok_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).tiktok_ikon_url,
    ),
    facebook_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).facebook_ikon_url,
    ),
    servis_ucreti: Number(data.servis_ucreti ?? VARSAYILAN.servisUcreti),
    minimum_siparis: Number(data.minimum_siparis ?? VARSAYILAN.minimumSiparis),
  };
}

/** Kapali oldugunda musteriye gosterilecek mesaj. Yoksa bos string. */
export function kapaliMesaji(ayarlar: Ayarlar, dil: string): string {
  const metin =
    dil === "ar" ? ayarlar.kapali_mesaji_ar : ayarlar.kapali_mesaji_tr;
  return metin?.trim() || "";
}

/**
 * Ana sayfa metni: admin doldurduysa onu, doldurmadiysa cevirideki
 * varsayilani dondurur. Restoran sahibi metni panelden degistirebilsin diye.
 */
export function ayarMetni(
  ayarlar: Ayarlar,
  alan:
    | "hero_baslik"
    | "hero_alt"
    | "hakkimizda_baslik"
    | "hakkimizda_metin",
  dil: string,
  varsayilan: string,
): string {
  const anahtar = `${alan}_${dil === "ar" ? "ar" : "tr"}` as keyof Ayarlar;
  const deger = ayarlar[anahtar];
  return typeof deger === "string" && deger.trim() ? deger.trim() : varsayilan;
}

/** Secili dildeki restoran adi. */
export function restoranAdi(ayarlar: Ayarlar, dil: string): string {
  if (dil === "ar") return ayarlar.restoran_ad_ar || VARSAYILAN.adAr;
  return ayarlar.restoran_ad_tr || VARSAYILAN.adTr;
}
