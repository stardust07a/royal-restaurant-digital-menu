import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { guvenlikBasliklariniOlustur } from "./src/lib/guvenlik-basliklari";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const production = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Calisan gelistirme sunucusunun .next dosyalarina dokunmadan dogrulama derlemesi.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: guvenlikBasliklariniOlustur(production) }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
