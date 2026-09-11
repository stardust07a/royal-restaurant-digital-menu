import type { Metadata } from "next";
import type { Dil } from "./tipler";

export const SITE_ORIGIN = "https://royalrestaurant.com.tr";
export const SITE_URL = new URL(SITE_ORIGIN);

function yolDuzelt(yol: string): string {
  if (!yol || yol === "/") return "";
  return yol.startsWith("/") ? yol : `/${yol}`;
}

export function yerelUrl(locale: Dil, yol = "/"): string {
  return `${SITE_ORIGIN}/${locale}${yolDuzelt(yol)}`;
}

export function dilAlternatifleri(yol = "/") {
  return {
    tr: yerelUrl("tr", yol),
    ar: yerelUrl("ar", yol),
    "x-default": yerelUrl("tr", yol),
  };
}

function guvenliGorsel(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const sonuc = new URL(url);
    return sonuc.protocol === "https:" ? sonuc.href : null;
  } catch {
    return null;
  }
}

export function kamuSayfasiMetadata({
  locale,
  yol,
  baslik,
  aciklama,
  siteAdi,
  gorsel,
  anaSayfa = false,
  indeksle = true,
}: {
  locale: Dil;
  yol?: string;
  baslik: string;
  aciklama: string;
  siteAdi: string;
  gorsel?: string | null;
  anaSayfa?: boolean;
  indeksle?: boolean;
}): Metadata {
  const sayfaYolu = yol ?? "/";
  const url = yerelUrl(locale, sayfaYolu);
  const paylasimBasligi = anaSayfa ? baslik : `${baslik} — ${siteAdi}`;
  const paylasimGorseli = guvenliGorsel(gorsel);

  return {
    title: paylasimBasligi,
    description: aciklama,
    alternates: {
      canonical: url,
      languages: dilAlternatifleri(sayfaYolu),
    },
    robots: { index: indeksle, follow: indeksle },
    openGraph: {
      type: "website",
      url,
      title: paylasimBasligi,
      description: aciklama,
      siteName: siteAdi,
      locale: locale === "ar" ? "ar_TR" : "tr_TR",
      alternateLocale: locale === "ar" ? ["tr_TR"] : ["ar_TR"],
      ...(paylasimGorseli ? { images: [{ url: paylasimGorseli }] } : {}),
    },
    twitter: {
      card: paylasimGorseli ? "summary_large_image" : "summary",
      title: paylasimBasligi,
      description: aciklama,
      ...(paylasimGorseli ? { images: [paylasimGorseli] } : {}),
    },
  };
}

/** JSON-LD icinde HTML/script sonlandirmayi engelleyen sunucu serilestirmesi. */
export function guvenliJsonLd(deger: unknown): string {
  return JSON.stringify(deger)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function mutlakHttpsUrl(url: string | null | undefined): string | null {
  return guvenliGorsel(url);
}
