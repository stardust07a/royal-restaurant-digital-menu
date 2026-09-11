import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { guvenlikBasliklariniOlustur } from "./src/lib/guvenlik-basliklari";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const production = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
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
