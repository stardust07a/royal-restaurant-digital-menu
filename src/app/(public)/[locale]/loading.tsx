"use client";

import { useTranslations } from "next-intl";
import { UrunIzgaraIskeleti } from "@/components/Iskelet";

export default function Yukleniyor() {
  const t = useTranslations("ortak");
  return (
    <main id="ana-icerik" className="min-h-dvh bg-bg" aria-busy="true">
      <span role="status" aria-live="polite" className="sr-only">
        {t("yukleniyor")}
      </span>
      <header aria-hidden className="flex min-h-[68px] items-center gap-3 border-b border-line/70 bg-bg px-3 py-2.5">
        <span className="parilti h-11 w-11 rounded-2xl bg-surface" />
        <span className="flex flex-1 flex-col gap-2">
          <span className="parilti h-4 w-32 rounded-full bg-surface" />
          <span className="parilti h-2.5 w-20 rounded-full bg-surface" />
        </span>
        <span className="parilti h-11 w-18 rounded-2xl bg-surface" />
        <span className="parilti h-11 w-11 rounded-2xl bg-surface" />
      </header>
      <div className="mx-auto max-w-lg px-4 py-4">
        <div aria-hidden className="mb-5 rounded-3xl bg-ink p-5">
          <span className="parilti block h-3 w-24 rounded-full bg-white/15" />
          <span className="parilti mt-4 block h-8 w-4/5 rounded-xl bg-white/15" />
          <span className="parilti mt-3 block h-3 w-full rounded-full bg-white/10" />
        </div>
        <UrunIzgaraIskeleti />
      </div>
    </main>
  );
}
