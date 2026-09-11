import { createHmac, timingSafeEqual } from "node:crypto";
import type { SiparisTuru } from "./siparis-tipleri";

const MAKBUZ_SURUMU = "v1";
const MAKBUZ_OMRU_MS = 24 * 60 * 60 * 1000;
const SIPARIS_NO = /^R-[0-9]{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

function imza(no: string, tur: SiparisTuru, sonaErme: number, anahtar: string): string {
  return createHmac("sha256", anahtar)
    .update(`${MAKBUZ_SURUMU}|${no}|${tur}|${sonaErme}`, "utf8")
    .digest("base64url");
}

export function anahtarlaMakbuzOlustur(
  no: string,
  tur: SiparisTuru,
  anahtar: string,
  simdi = Date.now(),
): string {
  const sonaErme = simdi + MAKBUZ_OMRU_MS;
  return `${MAKBUZ_SURUMU}.${sonaErme}.${imza(no, tur, sonaErme, anahtar)}`;
}

export function anahtarlaMakbuzDogrula(
  no: string | undefined,
  tur: SiparisTuru,
  token: string | undefined,
  anahtar: string,
  simdi = Date.now(),
): boolean {
  if (!no || !SIPARIS_NO.test(no) || !token) return false;
  const parcalar = token.split(".");
  if (parcalar.length !== 3 || parcalar[0] !== MAKBUZ_SURUMU) return false;
  const sonaErme = Number(parcalar[1]);
  if (!Number.isSafeInteger(sonaErme) || sonaErme < simdi || sonaErme > simdi + MAKBUZ_OMRU_MS) {
    return false;
  }
  const beklenen = Buffer.from(imza(no, tur, sonaErme, anahtar), "utf8");
  const gelen = Buffer.from(parcalar[2], "utf8");
  return gelen.length === beklenen.length && timingSafeEqual(gelen, beklenen);
}
