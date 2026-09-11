import { isIP } from "node:net";

export const YEREL_GELISTIRME_HIZ_ANAHTARI = "yerel-gelistirme";

/**
 * Production varsayılan olarak yalnız Vercel'in platform başlığıyla çalışır.
 * Local/test ortamı istemci başlıklarını yok sayıp herkesçe paylaşılan
 * muhafazakâr kovayı kullanır.
 */
export function siparisHizCagiranAnahtari(
  production: boolean,
  vercel: string | undefined,
  vercelForwardedFor: string | null,
): string | null {
  if (!production) return YEREL_GELISTIRME_HIZ_ANAHTARI;
  if (vercel !== "1") return null;

  const ip = vercelForwardedFor?.split(",")[0]?.trim();
  return ip && isIP(ip) ? `vercel:${ip}` : null;
}
