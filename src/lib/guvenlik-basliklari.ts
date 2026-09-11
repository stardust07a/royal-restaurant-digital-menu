/**
 * Next 15 nonce tabanlı CSP için her istekte nonce üretimi ve dinamik render
 * gerekir. Kamu sayfalarının SSG/ISR önbelleğini korumak için script-src
 * unsafe-inline şimdilik gereklidir; unsafe-eval ise yalnız geliştirmededir.
 */
export function icerikGuvenlikPolitikasi(production: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${production ? "" : " ws:"}`,
    "frame-src https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function guvenlikBasliklariniOlustur(production: boolean) {
  return [
    { key: "Content-Security-Policy", value: icerikGuvenlikPolitikasi(production) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
    ...(production
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
  ];
}
