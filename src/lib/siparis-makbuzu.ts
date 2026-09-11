import "server-only";

import type { SiparisTuru } from "./siparis-tipleri";
import {
  anahtarlaMakbuzDogrula,
  anahtarlaMakbuzOlustur,
} from "./siparis-makbuz-cekirdegi";

function sir(): string | null {
  const deger = process.env.SIPARIS_MAKBUZ_SECRET;
  return deger && deger.length >= 32 ? deger : null;
}

export function makbuzYapilandirmasiHazir(): boolean {
  return sir() !== null;
}

/** Token yalnız sipariş numarası/türü/sona erme zamanını doğrular; müşteri verisi içermez. */
export function makbuzOlustur(
  no: string,
  tur: SiparisTuru,
  simdi = Date.now(),
): string {
  const anahtar = sir();
  if (!anahtar) throw new Error("SIPARIS_MAKBUZ_SECRET eksik veya 32 karakterden kisa");
  return anahtarlaMakbuzOlustur(no, tur, anahtar, simdi);
}

export function makbuzDogrula(
  no: string | undefined,
  tur: SiparisTuru,
  token: string | undefined,
  simdi = Date.now(),
): boolean {
  const anahtar = sir();
  return anahtar ? anahtarlaMakbuzDogrula(no, tur, token, anahtar, simdi) : false;
}
