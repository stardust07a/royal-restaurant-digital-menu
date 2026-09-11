/** Tarayicinin sunabildigi UUID/rastgelelik yuzeyinin test edilebilir alt kumesi. */
export interface UuidRastgeleKaynagi {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView | null>(dizi: T) => T;
}

let yedekSayac = 0;

function uuidBicimlendir(baytlar: Uint8Array): string {
  // RFC 4122/9562 UUIDv4 surumu ve varyanti.
  baytlar[6] = (baytlar[6] & 0x0f) | 0x40;
  baytlar[8] = (baytlar[8] & 0x3f) | 0x80;
  const hex = Array.from(baytlar, (bayt) =>
    bayt.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * HTTPS/localhost disindaki mobil LAN sayfalarinda `crypto.randomUUID` yoktur.
 * Varsa native UUID'yi, yoksa getRandomValues'i kullanir. Cok eski veya
 * kisitli bir tarayici `crypto`yu tamamen gizlerse zaman, sayaç ve Math.random
 * karisimindan RFC-gecerli bir UUIDv4 uretir. Bu anahtar yetkilendirme sirri
 * degildir; kaybolan cevabin ayni siparise baglanmasi icin kullanilir.
 */
export function uuidV4Uret(
  kaynak: UuidRastgeleKaynagi | undefined = globalThis.crypto,
): string {
  if (typeof kaynak?.randomUUID === "function") {
    return kaynak.randomUUID();
  }

  const baytlar = new Uint8Array(16);
  if (typeof kaynak?.getRandomValues === "function") {
    kaynak.getRandomValues(baytlar);
    return uuidBicimlendir(baytlar);
  }

  // Idempotency anahtari bir guvenlik tokeni degildir. Sayac, ayni milisaniye
  // icinde uretilen iki anahtarin yalniz zamana dayanmasini engeller.
  yedekSayac = (yedekSayac + 1) >>> 0;
  let durum = (Date.now() ^ yedekSayac ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  for (let i = 0; i < baytlar.length; i++) {
    durum ^= durum << 13;
    durum ^= durum >>> 17;
    durum ^= durum << 5;
    baytlar[i] = (durum ^ Math.floor(Math.random() * 256)) & 0xff;
  }
  return uuidBicimlendir(baytlar);
}
