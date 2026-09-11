"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { KategoriliMenu } from "@/lib/menu";
import type { Dil } from "@/lib/tipler";
import { ad } from "@/lib/dil";

/**
 * Urun listesi sayfalarinin ustundeki yapiskan, yatay kaydirmali kategori
 * seridi. Her kategori ayri bir sayfa oldugu icin bunlar baglanti;
 * tek is, acilista aktif kategoriyi gorunur hale getirmek.
 */
export default function KategoriSeridi({
  kategoriler,
  aktifSlug,
  temelYol = "/siparis",
}: {
  kategoriler: KategoriliMenu[];
  aktifSlug: string;
  temelYol?: string;
}) {
  const dil = useLocale() as Dil;
  const t = useTranslations("menu");
  const aktifCip = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    aktifCip.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [aktifSlug]);

  return (
    <nav
      aria-label={t("kategoriGezintisi")}
      className="sticky top-[68px] z-20 border-b border-line bg-bg/90 backdrop-blur"
    >
      <ul className="kaydir-gizle flex items-center gap-2 overflow-x-auto px-4 py-2">
        {kategoriler.map((k) => {
          const aktif = k.slug === aktifSlug;
          return (
            <li key={k.id}>
              <Link
                ref={aktif ? aktifCip : undefined}
                href={`${temelYol}/${k.slug}`}
                aria-current={aktif ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-[background-color,color,border-color] duration-200 ${
                  aktif
                    ? "border-brand bg-brand text-white shadow-sm"
                    : "border-line bg-card text-muted hover:border-brand hover:text-brand-dark active:bg-surface"
                }`}
              >
                {ad(k, dil)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
