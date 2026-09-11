import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Plus_Jakarta_Sans, Cairo, Playfair_Display } from "next/font/google";
import { routing, yon } from "@/i18n/routing";
import IlerlemeCubugu from "@/components/IlerlemeCubugu";
import { SITE_URL } from "@/lib/seo";
import "../../globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("baslik"),
    description: t("aciklama"),
    metadataBase: SITE_URL,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    // iOS Safari metindeki telefon/tarih benzeri dizileri kendiliginden <a>
    // etiketine sariyor. Bunu React hydration'dan once yaptigi icin sunucu
    // ciktisiyla uyusmazlik hatasi olusuyordu. Arama baglantilarini zaten
    // elle koyuyoruz, otomatik algilamaya gerek yok.
    formatDetection: { telephone: false, date: false, address: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const ortak = await getTranslations({ locale, namespace: "ortak" });

  return (
    <html
      lang={locale}
      dir={yon(locale)}
      className={`${jakarta.variable} ${cairo.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg text-ink antialiased">
        <NextIntlClientProvider>
          <a href="#ana-icerik" className="icerige-atla">
            {ortak("icerigeAtla")}
          </a>
          <IlerlemeCubugu />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
