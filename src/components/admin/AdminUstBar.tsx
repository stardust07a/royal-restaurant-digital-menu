"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { useAdminDil, type MetinAnahtari } from "@/lib/admin-dil";

/**
 * Panel sayfalarinin ust bari: baslik, geri oku, dil degistirme ve cikis.
 *
 * Baslik ya duz metin (urun/kategori adi gibi veriden gelen) ya da bir ceviri
 * anahtari olabilir; anahtar verilirse secili dile cevrilir.
 */
export default function AdminUstBar({
  baslik,
  baslikTr,
  baslikAr,
  baslikAnahtari,
  geriLinki,
}: {
  baslik?: string;
  baslikTr?: string;
  baslikAr?: string;
  baslikAnahtari?: MetinAnahtari;
  geriLinki?: string;
}) {
  const router = useRouter();
  const { dil, dilDegistir, m } = useAdminDil();

  async function cikis() {
    const db = tarayiciIstemcisi();
    await db.auth.signOut();
    router.replace("/admin/giris");
    router.refresh();
  }

  const hedefDil = dil === "tr" ? "ar" : "tr";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex min-h-[68px] w-full max-w-5xl items-center gap-2 px-4 py-3">
      {geriLinki && (
        <Link
          href={geriLinki}
          aria-label={m("geri")}
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-line transition-colors duration-200 hover:border-rule"
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
      )}

      <h1 className="min-w-0 flex-1 truncate text-lg font-bold">
        {baslikAnahtari
          ? m(baslikAnahtari)
          : baslikTr || baslikAr
            ? dil === "ar"
              ? baslikAr || baslikTr
              : baslikTr || baslikAr
            : baslik}
      </h1>

      <button
        type="button"
        onClick={() => dilDegistir(hedefDil)}
        aria-label={`${m("dil")}: ${m(hedefDil === "ar" ? "arapca" : "turkce")}`}
        className="flex min-h-11 shrink-0 items-center border border-line px-3 text-sm font-medium transition-colors duration-200 hover:border-rule"
      >
        {hedefDil === "ar" ? "العربية" : "Türkçe"}
      </button>

      <button
        type="button"
        onClick={cikis}
        aria-label={m("cikisYap")}
        className="flex h-11 w-11 shrink-0 items-center justify-center border border-line text-muted transition-colors duration-200 hover:border-rule hover:text-ink"
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
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
      </div>
    </header>
  );
}
