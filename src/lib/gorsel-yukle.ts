"use client";

import { tarayiciIstemcisi } from "./supabase-tarayici";
import { gorselDepoYolu } from "./gorsel-depo-yolu";

/** sema.sql'de olusturulan herkese acik depo. */
const KOVA = "menu-gorseller";

export const GORSEL_EN_COK_BAYT = 8 * 1024 * 1024;

const GORSEL_UZANTILARI = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type DesteklenenGorselTuru = keyof typeof GORSEL_UZANTILARI;

export type GorselHataKodu =
  | "tur_gecersiz"
  | "boyut_gecersiz"
  | "icerik_uyusmuyor"
  | "yukleme_hatasi";

/** UI katmani bu kodu secili dile cevirir; teknik hata metni kullaniciya sizmaz. */
export class GorselYuklemeHatasi extends Error {
  readonly kod: GorselHataKodu;

  constructor(
    kod: GorselHataKodu,
    neden?: unknown,
  ) {
    super(kod, neden === undefined ? undefined : { cause: neden });
    this.kod = kod;
    this.name = "GorselYuklemeHatasi";
  }
}

export function gorselHataKodu(hata: unknown): GorselHataKodu | null {
  return hata instanceof GorselYuklemeHatasi ? hata.kod : null;
}

/** Tum admin gorsel yuklemelerinde ortak tip, imza ve boyut kontrolu. */
export async function gorselDogrula(blob: Blob): Promise<DesteklenenGorselTuru> {
  if (!(blob.type in GORSEL_UZANTILARI)) {
    throw new GorselYuklemeHatasi("tur_gecersiz");
  }
  if (blob.size <= 0 || blob.size > GORSEL_EN_COK_BAYT) {
    throw new GorselYuklemeHatasi("boyut_gecersiz");
  }

  const tur = blob.type as DesteklenenGorselTuru;
  const baslik = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const jpeg = baslik[0] === 0xff && baslik[1] === 0xd8 && baslik[2] === 0xff;
  const png =
    baslik[0] === 0x89 &&
    baslik[1] === 0x50 &&
    baslik[2] === 0x4e &&
    baslik[3] === 0x47 &&
    baslik[4] === 0x0d &&
    baslik[5] === 0x0a &&
    baslik[6] === 0x1a &&
    baslik[7] === 0x0a;
  const webp =
    String.fromCharCode(...baslik.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...baslik.slice(8, 12)) === "WEBP";
  const imzaGecerli =
    (tur === "image/jpeg" && jpeg) ||
    (tur === "image/png" && png) ||
    (tur === "image/webp" && webp);
  if (!imzaGecerli) {
    throw new GorselYuklemeHatasi("icerik_uyusmuyor");
  }
  return tur;
}

/** Turkce harfleri sadelestirip dosya adina uygun hale getirir. */
function dosyaAdiTemizle(ham: string): string {
  const eslesme: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return (
    ham
      .replace(/[çğıöşüÇĞİÖŞÜ]/g, (h) => eslesme[h] ?? h)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "gorsel"
  );
}

/**
 * Dogrulanmis gorseli Storage'a yukler ve herkese acik adresini doner.
 *
 * Dosya adina zaman damgasi ekleniyor: ayni urunun fotografi degistiginde
 * tarayici onbellegi eski gorseli gostermesin.
 */
export async function gorselYukle(
  blob: Blob,
  klasor: "urunler" | "kategoriler" | "ayarlar",
  adIpucu: string,
): Promise<string> {
  const mime = await gorselDogrula(blob);
  const uzanti = GORSEL_UZANTILARI[mime];
  const db = tarayiciIstemcisi();
  const yol = `${klasor}/${dosyaAdiTemizle(adIpucu)}-${Date.now()}.${uzanti}`;

  const { error } = await db.storage.from(KOVA).upload(yol, blob, {
    contentType: mime,
    upsert: true,
  });

  if (error) throw new GorselYuklemeHatasi("yukleme_hatasi", error);

  const { data } = db.storage.from(KOVA).getPublicUrl(yol);
  return data.publicUrl;
}

/** Bilinen kendi Storage dosyamizi siler; yabanci URL'lerde sessizce atlar. */
export async function gorselSil(
  url: string | null | undefined,
  izinliKlasor: "urunler" | "kategoriler" | "ayarlar",
): Promise<boolean> {
  const yol = gorselDepoYolu(
    url,
    izinliKlasor,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  if (!yol) return false;
  const { error } = await tarayiciIstemcisi().storage.from(KOVA).remove([yol]);
  if (error) throw new GorselYuklemeHatasi("yukleme_hatasi", error);
  return true;
}
