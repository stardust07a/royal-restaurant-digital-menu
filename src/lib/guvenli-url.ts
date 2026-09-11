/** Tarayıcıya verilecek genel bağlantıları yalnız güvenli HTTPS olarak kabul eder. */
export function httpsUrlDogrula(ham: string | null | undefined): string | null {
  const temiz = ham?.trim();
  if (!temiz) return null;

  try {
    const url = new URL(temiz);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** next.config.ts images.remotePatterns ile birebir uyumlu uzak gorsel URL'si. */
export function nextGorselUrlDogrula(
  ham: string | null | undefined,
): string | null {
  const guvenli = httpsUrlDogrula(ham);
  if (!guvenli) return null;
  const { hostname, port } = new URL(guvenli);
  if (port) return null;
  const izinli =
    hostname === "images.unsplash.com" ||
    hostname === "images.pexels.com" ||
    hostname.endsWith(".supabase.co");
  return izinli ? guvenli : null;
}

/**
 * Sipariş sonrası tekrar-deneme bağlantısı yalnız wa.me'nin dar URL biçimidir.
 * sessionStorage istemci tarafından değiştirilebildiği için burada yeniden doğrulanır.
 */
export function whatsappUrlDogrula(ham: string | null | undefined): string | null {
  const guvenli = httpsUrlDogrula(ham);
  if (!guvenli) return null;

  const url = new URL(guvenli);
  if (
    url.hostname !== "wa.me" ||
    url.port ||
    url.hash ||
    !/^\/[0-9]{10,15}$/.test(url.pathname)
  ) {
    return null;
  }

  const anahtarlar = [...url.searchParams.keys()];
  if (anahtarlar.some((anahtar) => anahtar !== "text") || anahtarlar.length > 1) {
    return null;
  }
  return url.toString();
}
