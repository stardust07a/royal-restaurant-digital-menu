import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const MASA_SAYISI = 15;
export const MASA_CEREZI = "royal_masa_oturumu";
export const MASA_OTURUM_SANIYE = 2 * 60 * 60;

function sir(): string | null {
  return process.env.MASA_QR_SECRET || process.env.SIPARIS_MAKBUZ_SECRET || null;
}

export function masaNumarasiGecerli(deger: string): boolean {
  return /^(?:[1-9]|1[0-5])$/.test(deger);
}

function imzala(metin: string): string | null {
  const anahtar = sir();
  if (!anahtar) return null;
  return createHmac("sha256", anahtar).update(metin).digest("hex");
}

function imzaEsit(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Basili QR uzun omurludur; masa siparisi icin yine kisa oturum acilir. */
export function masaQrImzasi(masaNo: string): string | null {
  if (!masaNumarasiGecerli(masaNo)) return null;
  return imzala(`royal-masa-qr:v1:${masaNo}`);
}

export function masaQrGecerli(masaNo: string, imza: string): boolean {
  const beklenen = masaQrImzasi(masaNo);
  return Boolean(beklenen && imzaEsit(imza, beklenen));
}

export function masaOturumuOlustur(masaNo: string): string | null {
  if (!masaNumarasiGecerli(masaNo)) return null;
  const bitis = Math.floor(Date.now() / 1000) + MASA_OTURUM_SANIYE;
  const govde = `v1.${masaNo}.${bitis}`;
  const imza = imzala(`royal-masa-oturum:${govde}`);
  return imza ? `${govde}.${imza}` : null;
}

export function masaOturumuDogrula(deger: string | undefined): string | null {
  const eslesme = /^v1\.(\d{1,2})\.(\d{10})\.([0-9a-f]{64})$/.exec(deger ?? "");
  if (!eslesme || !masaNumarasiGecerli(eslesme[1])) return null;
  const bitis = Number(eslesme[2]);
  if (!Number.isSafeInteger(bitis) || bitis <= Math.floor(Date.now() / 1000)) return null;
  const beklenen = imzala(`royal-masa-oturum:v1.${eslesme[1]}.${eslesme[2]}`);
  return beklenen && imzaEsit(eslesme[3], beklenen) ? eslesme[1] : null;
}

export async function masaOturumuGetir(): Promise<string | null> {
  const depo = await cookies();
  return masaOturumuDogrula(depo.get(MASA_CEREZI)?.value);
}
