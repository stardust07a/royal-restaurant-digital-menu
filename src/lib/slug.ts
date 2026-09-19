/** Yeni urun ve kategori adresleri icin Turkce adi URL'ye uygun hale getirir. */
export function slugla(ham: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ham
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (harf) => harita[harf] ?? harf)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
