"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useModalOdak } from "@/lib/modal-odak";

/**
 * Mekan/yemek fotograflari.
 *
 * Bir goresele dokununca tam ekran acilir. Sepet ve menu panelleriyle ayni
 * mantik: karartma + ESC/dokunusla kapatma.
 */
export default function Galeri({ gorseller }: { gorseller: string[] }) {
  const t = useTranslations("anasayfa");
  const [acik, setAcik] = useState<number | null>(null);
  const acanRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalOdak({
    acik: acik !== null,
    dialogRef,
    openerRef: acanRef,
    onKapat: () => setAcik(null),
  });

  if (gorseller.length === 0) return null;

  return (
    <>
      <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {gorseller.map((src, i) => (
          <li key={src} className="flex">
            <button
              type="button"
              onClick={(e) => {
                acanRef.current = e.currentTarget;
                setAcik(i);
              }}
              aria-label={`${t("galeri")} ${i + 1}`}
              aria-haspopup="dialog"
              className="kart-derinlik group relative aspect-square w-full overflow-hidden rounded-3xl border border-white transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 240px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {acik !== null && typeof document !== "undefined" && createPortal(
        <div
          ref={dialogRef}
          tabIndex={-1}
          data-modal-katmani="true"
          role="dialog"
          aria-modal="true"
          aria-labelledby="galeri-dialog-baslik"
          className="kaydirma-kapali fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
        >
          <h2 id="galeri-dialog-baslik" className="sr-only">
            {t("galeri")} {acik + 1}
          </h2>
          {/* Karartma ayri bir dugme: tiklanabilir div yerine gercek denetim */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("kapat")}
            onClick={() => setAcik(null)}
            className="absolute inset-0 bg-ink/90"
          />

          <div className="pointer-events-none relative aspect-4/3 w-full max-w-3xl">
            <Image
              src={gorseller[acik]}
              alt={`${t("galeri")} ${acik + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <button
            type="button"
            onClick={() => setAcik(null)}
            aria-label={t("kapat")}
            className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-bg text-ink shadow-lg transition-colors duration-200 hover:bg-brand hover:text-bg"
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
        </div>,
        document.body,
      )}
    </>
  );
}
