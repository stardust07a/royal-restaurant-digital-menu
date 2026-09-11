export type SosyalPlatform = "instagram" | "tiktok" | "facebook";

const PLATFORM_ALANLARI: Record<SosyalPlatform, readonly string[]> = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  facebook: ["facebook.com", "fb.com"],
};

/** Yalnizca HTTPS ve beklenen sosyal platform alan adlarini kabul eder. */
export function sosyalUrlDogrula(
  ham: string | null | undefined,
  platform: SosyalPlatform,
): string | null {
  const deger = ham?.trim();
  if (!deger) return null;

  try {
    const url = new URL(deger);
    const alan = url.hostname.toLowerCase().replace(/\.$/, "");
    const izinli = PLATFORM_ALANLARI[platform].some(
      (kok) => alan === kok || alan.endsWith(`.${kok}`),
    );
    if (url.protocol !== "https:" || !izinli || url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Dogrulanmis profil URL'sinden gorunur hesap adini guvenle turetir. */
export function sosyalGosterim(url: string, yedek: string): string {
  try {
    const yol = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    if (!yol) return yedek;
    const hesap = decodeURIComponent(yol).replace(/^@+/, "");
    const genelYollar = new Set(["profile.php", "share", "reel", "watch", "groups"]);
    if (
      genelYollar.has(hesap.toLowerCase()) ||
      !/^[\p{L}\p{N}._-]{1,64}$/u.test(hesap)
    ) {
      return yedek;
    }
    return `@${hesap}`;
  } catch {
    return yedek;
  }
}
