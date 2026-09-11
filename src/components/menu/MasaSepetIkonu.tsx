"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSepet, toplamAdet } from "@/lib/sepet";

/**
 * Masa menusundeki sepet dugmesi.
 *
 * Sepet paket siparise aitse gosterilmez — masa ve paket sepetleri ayri
 * tutuluyor, karisik gorunmesin.
 */
export default function MasaSepetIkonu() {
  const t = useTranslations("ortak");
  const kalemler = useSepet((d) => d.kalemler);
  const tur = useSepet((d) => d.tur);
  const [baglandi, setBaglandi] = useState(false);

  useEffect(() => setBaglandi(true), []);

  const adet = baglandi && tur === "masa" ? toplamAdet(kalemler) : 0;

  return (
    <Link
      href="/menu/sepet"
      aria-label={t("sepet")}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-card text-ink shadow-sm transition-[border-color,transform] duration-200 hover:border-brand active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 2l1.5 4h9L18 2M3 6h18l-1.7 10.2a2 2 0 01-2 1.8H7.7a2 2 0 01-2-1.8L4 6z" />
        <circle cx="9" cy="21" r="1" />
        <circle cx="17" cy="21" r="1" />
      </svg>

      {adet > 0 && (
        <span className="fiyat absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg bg-brand px-1 text-[0.68rem] font-black text-white shadow-sm">
          {adet}
        </span>
      )}
    </Link>
  );
}
