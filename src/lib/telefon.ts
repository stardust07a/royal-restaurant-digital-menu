/**
 * Sipariş alanlarını tek satırlı, Unicode NFC biçimine getirir.
 * Satır/kontrol/biçim karakterleri WhatsApp mesaj yapısını değiştiremez.
 */
export function siparisMetniNormalize(ham: string): string {
  return ham
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Telefon numarasini saklama ve karsilastirma icin yalnizca rakamlara indirger. */
export function telefonNormalize(ham: string): string {
  return ham.replace(/[^0-9]/g, "");
}

/** E.164 uzunluk sinirlarini kapsayan, ulke kodundan bagimsiz temel kontrol. */
export function telefonGecerliMi(ham: string): boolean {
  const guvenli = siparisMetniNormalize(ham);
  if (!/^[0-9+().\-\s]+$/u.test(guvenli)) return false;
  const rakamlar = telefonNormalize(guvenli);
  return rakamlar.length >= 10 && rakamlar.length <= 15;
}
