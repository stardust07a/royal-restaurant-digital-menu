import type { Ayarlar, CalismaSaatleri, GunAnahtari } from "./tipler";

/**
 * Calisma saati hesabi — saf mantik, veritabanina dokunmaz.
 * Supabase'den ayri durmasi test edilebilmesi icin.
 */

/** Restoranin bulundugu saat dilimi. */
const SAAT_DILIMI = "Europe/Istanbul";

/** Intl'in dondurdugu Ingilizce gun adlarini tablo anahtarlarina cevirir. */
const GUN_ESLESMESI: Record<string, GunAnahtari> = {
  Monday: "pazartesi",
  Tuesday: "sali",
  Wednesday: "carsamba",
  Thursday: "persembe",
  Friday: "cuma",
  Saturday: "cumartesi",
  Sunday: "pazar",
};

const GUN_SIRASI: GunAnahtari[] = [
  "pazartesi",
  "sali",
  "carsamba",
  "persembe",
  "cuma",
  "cumartesi",
  "pazar",
];

/** "11:00" -> 660 (gun basindan itibaren dakika). Bozuk deger icin null. */
function dakikaya(saat: string | undefined): number | null {
  if (!saat || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(saat)) return null;
  const parcalar = saat.split(":");
  const s = Number(parcalar[0]);
  const d = Number(parcalar[1]);
  return s * 60 + d;
}

/** Istanbul saatiyle verilen anin gunu ve gun icindeki dakikasi. */
function simdiIstanbul(simdi: Date): { gun: GunAnahtari; dakika: number } {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: SAAT_DILIMI,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(simdi);

  const bul = (tur: string) =>
    parcalar.find((p) => p.type === tur)?.value ?? "";

  const gun = GUN_ESLESMESI[bul("weekday")] ?? "pazartesi";
  // Bazi ortamlarda gece yarisi 24 olarak gelir
  const saat = Number(bul("hour")) % 24;
  const dakika = Number(bul("minute"));

  return { gun, dakika: saat * 60 + dakika };
}

/** Bir onceki gunun anahtari — gece yarisini asan mesailer icin. */
function oncekiGun(gun: GunAnahtari): GunAnahtari {
  const i = GUN_SIRASI.indexOf(gun);
  return GUN_SIRASI[(i - 1 + GUN_SIRASI.length) % GUN_SIRASI.length];
}

function gunIcindeAcik(
  saatler: CalismaSaatleri,
  gun: GunAnahtari,
  dakika: number,
): boolean {
  const bugun = saatler[gun];
  if (!bugun || bugun.kapali) return false;

  const acilis = dakikaya(bugun.acilis);
  let kapanis = dakikaya(bugun.kapanis);
  if (acilis === null || kapanis === null) return false;

  // 11:00 - 02:00 gibi gece yarisini asan mesai
  if (kapanis <= acilis) kapanis += 24 * 60;

  return dakika >= acilis && dakika < kapanis;
}

/**
 * Restoran su anda siparis aliyor mu?
 *
 * Once admin panelindeki "siparis alimini kapat" anahtarina bakar, sonra
 * calisma saatlerine. Gece yarisini asan mesai desteklenir: 11:00-02:00
 * tanimli bir gunde saat 01:00 hala o gunun mesaisi sayilir.
 *
 * Calisma saatleri hic tanimli degilse acik kabul edilir — yeni kurulumda
 * restoranin hic siparis alamamasi, yanlislikla acik gorunmesinden kotudur.
 */
export function acikMi(
  ayarlar: Pick<Ayarlar, "siparis_alimi_acik" | "calisma_saatleri">,
  simdi: Date = new Date(),
): boolean {
  if (!ayarlar.siparis_alimi_acik) return false;

  const saatler = ayarlar.calisma_saatleri;
  if (!saatler || Object.keys(saatler).length === 0) return true;

  const { gun, dakika } = simdiIstanbul(simdi);

  if (gunIcindeAcik(saatler, gun, dakika)) return true;

  // Dun gece basmis, bugune sarkmis bir mesai olabilir.
  return gunIcindeAcik(saatler, oncekiGun(gun), dakika + 24 * 60);
}
