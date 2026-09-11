"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useModalOdak } from "@/lib/modal-odak";

interface Bolum {
  id: string;
  etiket: string;
}

/**
 * Sag ustteki bolum menusu (3 cizgi).
 *
 * Ana sayfa uzun; musteri haritaya veya iletisime ulasmak icin sayfanin
 * tamamini kaydirmak zorunda kalmasin diye bolumlere dogrudan atlatir.
 */
export default function BolumMenusu({ bolumler }: { bolumler: Bolum[] }) {
  const t = useTranslations();
  const [acik, setAcik] = useState(false);
  const acanRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalOdak({
    acik,
    dialogRef,
    openerRef: acanRef,
    onKapat: () => setAcik(false),
  });

  function git(id: string) {
    setAcik(false);
    // Panel kapanma gecisi bitsin, sonra kaydir
    window.setTimeout(() => {
      const hareketAz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: hareketAz ? "auto" : "smooth" });
    }, 60);
  }

  return (
    <>
      <button
        ref={acanRef}
        type="button"
        onClick={() => setAcik(true)}
        aria-label={t("anasayfa.bolumler")}
        aria-haspopup="dialog"
        aria-expanded={acik}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card/90 shadow-sm backdrop-blur transition-[background-color,transform] duration-200 hover:bg-white active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {acik && typeof document !== "undefined" && createPortal(
        <div
          ref={dialogRef}
          tabIndex={-1}
          data-modal-katmani="true"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bolum-menusu-baslik"
          className="kaydirma-kapali fixed inset-0 z-50"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("anasayfa.kapat")}
            onClick={() => setAcik(false)}
            className="absolute inset-0 bg-ink/55"
          />

          <nav
            aria-label={t("anasayfa.bolumler")}
            className="absolute inset-y-0 end-0 flex w-80 max-w-[88vw] flex-col rounded-s-3xl border-s border-line bg-bg shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span id="bolum-menusu-baslik" className="etiket text-accent">
                {t("anasayfa.bolumler")}
              </span>
              <button
                type="button"
                onClick={() => setAcik(false)}
                aria-label={t("anasayfa.kapat")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-bg transition-colors duration-200 hover:bg-brand"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <ul className="flex flex-col overflow-y-auto">
              {bolumler.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => git(b.id)}
                    className="mx-3 my-1 flex min-h-14 w-[calc(100%-1.5rem)] items-center rounded-2xl px-4 text-start text-lg font-bold transition-colors duration-200 hover:bg-ink hover:text-bg"
                  >
                    {b.etiket}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
