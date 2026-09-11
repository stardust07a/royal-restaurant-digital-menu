"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Bulunamadi() {
  const t = useTranslations("ortak");
  return (
    <main id="ana-icerik" className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-balance text-2xl font-bold">{t("sayfaBulunamadi")}</h1>
        <Link
          href="/"
          className="mt-6 flex min-h-13 items-center justify-center bg-brand px-5 font-bold text-bg transition-colors duration-200 hover:bg-brand-dark"
        >
          {t("anaSayfayaDon")}
        </Link>
      </div>
    </main>
  );
}
