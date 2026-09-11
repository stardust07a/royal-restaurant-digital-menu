import { getTranslations } from "next-intl/server";
import type { CalismaSaatleri, GunAnahtari } from "@/lib/tipler";

const GUNLER: GunAnahtari[] = [
  "pazartesi",
  "sali",
  "carsamba",
  "persembe",
  "cuma",
  "cumartesi",
  "pazar",
];

/** Istanbul saatiyle bugunun anahtari — satiri vurgulamak icin. */
function bugununAnahtari(): GunAnahtari {
  const ad = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
  }).format(new Date());

  const eslesme: Record<string, GunAnahtari> = {
    Monday: "pazartesi",
    Tuesday: "sali",
    Wednesday: "carsamba",
    Thursday: "persembe",
    Friday: "cuma",
    Saturday: "cumartesi",
    Sunday: "pazar",
  };
  return eslesme[ad] ?? "pazartesi";
}

export default async function CalismaSaatleriTablosu({
  saatler,
}: {
  saatler: CalismaSaatleri | null;
}) {
  const t = await getTranslations();
  if (!saatler || Object.keys(saatler).length === 0) return null;

  const bugun = bugununAnahtari();

  return (
    <table className="kart-derinlik mt-5 w-full overflow-hidden rounded-3xl border-separate border-spacing-0 border border-line/70 bg-card px-4 text-sm">
      <tbody>
        {GUNLER.map((g) => {
          const gun = saatler[g];
          const bugunMu = g === bugun;
          return (
            <tr
              key={g}
              className={`${g !== "pazar" ? "border-b border-line" : ""} ${bugunMu ? "font-bold text-brand" : ""}`}
            >
              <th
                scope="row"
                className="py-3 text-start font-inherit font-normal"
              >
                <span className={bugunMu ? "font-bold" : ""}>
                  {t(`gun.${g}`)}
                </span>
              </th>
              <td className="fiyat py-3 text-end">
                {!gun || gun.kapali ? (
                  <span className="text-danger">{t("ortak.kapali")}</span>
                ) : (
                  `${gun.acilis} – ${gun.kapanis}`
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
