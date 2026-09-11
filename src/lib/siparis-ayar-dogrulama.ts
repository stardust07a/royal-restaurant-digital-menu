import type { CalismaSaatleri, GunAnahtari } from "./tipler";

export interface KatiSiparisAyarlari {
  whatsapp_numarasi: string;
  servis_ucreti: number;
  minimum_siparis: number;
  siparis_alimi_acik: boolean;
  calisma_saatleri: CalismaSaatleri | null;
}

const GUNLER = new Set<GunAnahtari>([
  "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar",
]);
const SAAT = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function para(deger: unknown): number | null {
  if (typeof deger !== "number" && typeof deger !== "string") return null;
  const sonuc = Number(deger);
  return Number.isFinite(sonuc) && sonuc >= 0 && sonuc <= 99_999_999.99
    ? Math.round(sonuc * 100) / 100
    : null;
}

function saatleriDogrula(deger: unknown): CalismaSaatleri | null | undefined {
  if (deger === null) return null;
  if (!deger || typeof deger !== "object" || Array.isArray(deger)) return undefined;
  const sonuc: CalismaSaatleri = {};
  for (const [gun, ham] of Object.entries(deger)) {
    if (!GUNLER.has(gun as GunAnahtari) || !ham || typeof ham !== "object" || Array.isArray(ham)) {
      return undefined;
    }
    const satir = ham as Record<string, unknown>;
    if (
      typeof satir.acilis !== "string" || !SAAT.test(satir.acilis) ||
      typeof satir.kapanis !== "string" || !SAAT.test(satir.kapanis) ||
      typeof satir.kapali !== "boolean"
    ) {
      return undefined;
    }
    sonuc[gun as GunAnahtari] = {
      acilis: satir.acilis,
      kapanis: satir.kapanis,
      kapali: satir.kapali,
    };
  }
  return sonuc;
}

/** Public gösterim varsayılanlarından bağımsız, mutation için fail-closed ayar sözleşmesi. */
export function katiSiparisAyarlari(deger: unknown): KatiSiparisAyarlari | null {
  if (!deger || typeof deger !== "object" || Array.isArray(deger)) return null;
  const ham = deger as Record<string, unknown>;
  const whatsapp = typeof ham.whatsapp_numarasi === "string"
    ? ham.whatsapp_numarasi.trim()
    : "";
  const servis = para(ham.servis_ucreti);
  const minimum = para(ham.minimum_siparis);
  const saatler = saatleriDogrula(ham.calisma_saatleri);
  if (
    !/^[0-9]{10,15}$/.test(whatsapp) ||
    servis === null || minimum === null ||
    typeof ham.siparis_alimi_acik !== "boolean" ||
    saatler === undefined
  ) {
    return null;
  }
  return {
    whatsapp_numarasi: whatsapp,
    servis_ucreti: servis,
    minimum_siparis: minimum,
    siparis_alimi_acik: ham.siparis_alimi_acik,
    calisma_saatleri: saatler,
  };
}
