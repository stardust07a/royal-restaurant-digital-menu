"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSepet, toplamAdet, araToplamHesapla } from "@/lib/sepet";
import { fiyatYaz } from "@/lib/sabitler";

/**
 * Sepette urun varken sayfanin altinda duran gecis cubugu.
 *
 * Musteri urun eklendikten sonra kategori listesine donuyor; sepete gitmek
 * icin ust bardaki kucuk ikonu bulmak zorunda kalmasin diye buyuk ve sabit
 * bir hedef veriliyor.
 *
 * Sepet localStorage'dan geldigi icin sunucuda bilinmez; cubuk ancak istemci
 * baglandiktan sonra cizilir (hydration uyusmazligi olmasin).
 */
export default function SepeteGitCubugu({
  temelYol = "/siparis",
  tur = "paket",
}: {
  temelYol?: string;
  /** Sepet turu farkliysa cubuk gosterilmez — masa/paket karismasin */
  tur?: "masa" | "paket";
} = {}) {
  const t = useTranslations();
  const kalemler = useSepet((d) => d.kalemler);
  const sepetTuru = useSepet((d) => d.tur);
  const [baglandi, setBaglandi] = useState(false);

  useEffect(() => setBaglandi(true), []);

  if (!baglandi || kalemler.length === 0 || sepetTuru !== tur) return null;

  const adet = toplamAdet(kalemler);
  const tutar = araToplamHesapla(kalemler);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-bg/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-12px_32px_rgba(16,43,40,.08)] backdrop-blur-xl">
      <Link
        href={`${temelYol}/sepet`}
        className="mx-auto flex min-h-15 max-w-lg items-center gap-3 rounded-2xl bg-brand px-4 font-black text-white shadow-[0_12px_28px_rgba(8,119,110,.22)] transition-[background-color,transform] duration-200 hover:bg-brand-dark active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="fiyat flex h-8 min-w-8 items-center justify-center rounded-xl bg-white px-1.5 text-brand"
        >
          {adet}
        </span>
        <span className="flex-1 text-start">{t("siparis.sepeteGit")}</span>
        <span className="fiyat whitespace-nowrap">{fiyatYaz(tutar)}</span>
      </Link>
    </div>
  );
}
