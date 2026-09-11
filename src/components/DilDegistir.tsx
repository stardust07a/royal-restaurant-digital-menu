"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/** Ust barda duran kucuk dil degistirme dugmesi. */
export default function DilDegistir() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const hedef = locale === "tr" ? "ar" : "tr";
  const etiket = hedef === "ar" ? "العربية" : "Türkçe";

  function degistir() {
    localStorage.setItem("royal_dil", hedef);
    document.documentElement.lang = hedef;
    document.documentElement.dir = hedef === "ar" ? "rtl" : "ltr";
    router.replace(pathname, { locale: hedef });
  }

  return (
    <button
      onClick={degistir}
      aria-label={etiket}
      className="min-h-11 rounded-2xl border border-line bg-card/90 px-3 text-sm font-bold text-ink shadow-sm backdrop-blur transition-[border-color,background-color,transform] duration-200 hover:border-brand hover:bg-white active:scale-95"
    >
      {etiket}
    </button>
  );
}
