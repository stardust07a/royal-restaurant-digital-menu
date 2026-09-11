const KOVA = "menu-gorseller";

/**
 * Yalniz bu uygulamanin public Storage kovasindaki dosya yolunu ayiklar.
 * Elle girilmis veya baska Supabase projesindeki bir URL asla silme hedefine
 * donusmez.
 */
export function gorselDepoYolu(
  hamUrl: string | null | undefined,
  izinliKlasor: "urunler" | "kategoriler" | "ayarlar",
  projeUrl: string | undefined,
): string | null {
  if (!hamUrl || !projeUrl || hamUrl.includes("/../")) return null;
  try {
    const url = new URL(hamUrl);
    const proje = new URL(projeUrl);
    if (
      url.protocol !== "https:" ||
      proje.protocol !== "https:" ||
      url.hostname !== proje.hostname ||
      url.port ||
      proje.port
    ) {
      return null;
    }
    const onEk = `/storage/v1/object/public/${KOVA}/`;
    if (!url.pathname.startsWith(onEk)) return null;
    const yol = decodeURIComponent(url.pathname.slice(onEk.length));
    if (!yol.startsWith(`${izinliKlasor}/`) || yol.includes("..")) return null;
    return yol;
  } catch {
    return null;
  }
}
