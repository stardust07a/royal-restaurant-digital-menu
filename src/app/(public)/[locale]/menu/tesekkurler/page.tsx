import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import TesekkurGovdesi from "@/components/siparis/TesekkurGovdesi";
import { makbuzDogrula } from "@/lib/siparis-makbuzu";

/** Siparis numarasi her istekte farkli; bu sayfa onbelleklenmez. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TesekkurlerSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ no?: string; makbuz?: string }>;
}) {
  const { locale } = await params;
  const { no, makbuz } = await searchParams;
  if (!makbuzDogrula(no, "masa", makbuz)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("siparis");

  return (
    <main id="ana-icerik" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/15 text-brand">
        <svg
          viewBox="0 0 24 24"
          className="h-10 w-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-bold">{t("masaTesekkurler")}</h1>

      <p className="mt-3 text-muted">
          {t("siparisNo")}:{" "}
          <span className="fiyat font-bold text-accent">#{no}</span>
      </p>

      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
        {t("masaWhatsappHatirlatma")}
      </p>

      <div className="mt-10 flex w-full max-w-sm flex-col">
        <TesekkurGovdesi />

        <Link
          href="/menu"
          className="mt-3 flex min-h-13 items-center justify-center rounded-2xl bg-brand px-6 font-semibold text-bg transition active:scale-[0.98]"
        >
          {t("menuyeDon")}
        </Link>
      </div>
    </main>
  );
}
