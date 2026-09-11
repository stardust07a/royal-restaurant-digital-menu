"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function GenelHata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ortak");
  useEffect(() => console.error("Kamu sayfasi yuklenemedi:", error), [error]);

  return (
    <main id="ana-icerik" className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div role="alert" aria-live="assertive" className="w-full max-w-sm border border-danger/40 bg-danger/10 p-6">
        <h1 className="text-balance text-xl font-bold">{t("beklenmeyenHata")}</h1>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-13 w-full bg-brand px-5 font-bold text-bg transition-colors duration-200 hover:bg-brand-dark"
        >
          {t("tekrarDene")}
        </button>
      </div>
    </main>
  );
}
