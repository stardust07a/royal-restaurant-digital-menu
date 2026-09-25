import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import DilDegistir from "@/components/DilDegistir";
import MasaSepetIkonu from "./MasaSepetIkonu";
import MarkaLogosu from "./MarkaLogosu";

/** Masa menusu sayfalarinin ortak ust bari. */
export default async function MasaUstBar({
  baslik,
  altBaslik,
  geriLinki,
  logoUrl,
}: {
  baslik: string;
  altBaslik?: string;
  geriLinki?: string;
  logoUrl?: string | null;
}) {
  const t = await getTranslations("ortak");

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/92 shadow-[0_8px_24px_rgba(16,43,40,.06)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[68px] w-full max-w-7xl items-center gap-2 px-3 py-2.5 sm:px-5">
      {geriLinki ? (
        <>
          <Link
            href={geriLinki}
            aria-label={t("geri")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-card shadow-sm transition-[border-color,transform] duration-200 hover:border-brand active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 rtl:-scale-x-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black leading-tight sm:text-base">{baslik}</p>
            {altBaslik && <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-muted">{altBaslik}</p>}
          </div>
        </>
      ) : (
        <Link
          href="/"
          aria-label={t("anaSayfayaDon")}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          <MarkaLogosu logoUrl={logoUrl} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black leading-tight sm:text-base">{baslik}</span>
            {altBaslik && (
              <span className="mt-0.5 block truncate text-[0.68rem] font-semibold text-muted">
                {altBaslik}
              </span>
            )}
          </span>
        </Link>
      )}

      <DilDegistir />
      <MasaSepetIkonu />
      </div>
    </header>
  );
}
