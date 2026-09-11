"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { KategoriliMenu } from "@/lib/menu";
import type { Dil } from "@/lib/tipler";
import { ad, kategoriAciklamasi } from "@/lib/dil";
import UrunKarti from "./UrunKarti";

/** Bu uzunluktan kisa sorgularda arama yapilmaz. */
const EN_AZ_HARF = 2;

/**
 * Kategori kartlari + arama.
 *
 * Arama kutusuna yazilinca kategori kartlarinin yerini sonuc listesi alir.
 * Hem Turkce hem Arapca urun adlarinda arar — musteri hangi dilde yazarsa
 * yazsin bulsun.
 */
export default function KategoriVeArama({
  kategoriler,
}: {
  kategoriler: KategoriliMenu[];
}) {
  const dil = useLocale() as Dil;
  const t = useTranslations();
  const [sorgu, setSorgu] = useState("");

  const sonuclar = useMemo(() => {
    const q = sorgu.trim().toLocaleLowerCase("tr");
    if (q.length < EN_AZ_HARF) return null;

    return kategoriler
      .flatMap((k) => k.urunler)
      .filter(
        (u) =>
          u.ad_tr.toLocaleLowerCase("tr").includes(q) ||
          u.ad_ar.toLowerCase().includes(q),
      );
  }, [sorgu, kategoriler]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      {/* ---------- ARAMA ---------- */}
      <div className="relative mt-5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          name="urun-ara"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          placeholder={t("ortak.araYerTutucu")}
          aria-label={t("ortak.ara")}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="min-h-14 w-full border border-line bg-card ps-12 pe-4 text-base text-ink transition-colors duration-200 placeholder:text-muted hover:border-brand focus:border-brand"
        />
      </div>

      {/* ---------- SONUCLAR ---------- */}
      {sonuclar !== null ? (
        sonuclar.length > 0 ? (
          <ul className="mt-5 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            {sonuclar.map((u) => (
              <UrunKarti key={u.id} urun={u} dil={dil} />
            ))}
          </ul>
        ) : (
          <p className="mt-12 text-center text-muted">
            {t("siparis.sonucYok")}
          </p>
        )
      ) : (
        /* ---------- KATEGORI KUTULARI ----------
           Metin fotografin USTUNDE degil, altindaki beyaz kutuda duruyor:
           fotograf uzerindeki yazi hicbir gorselde kontrast garantisi vermiyor. */
        <ul className="mt-5 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          {kategoriler.map((k) => {
            const metin = kategoriAciklamasi(k, dil);
            return (
              <li key={k.id} className="flex min-w-0">
                <Link
                  href={`/siparis/${k.slug}`}
                  className="flex min-w-0 w-full flex-col overflow-hidden border border-line bg-card transition-colors duration-200 hover:border-brand active:bg-surface"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-surface">
                    {k.gorsel_url ? (
                      <Image
                        src={k.gorsel_url}
                        alt=""
                        fill
                        sizes="(max-width: 379px) 100vw, (max-width: 640px) 50vw, 240px"
                        className="object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted/40"
                      >
                        R
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col px-3 py-3">
                    <p className="break-words text-base font-black leading-snug">{ad(k, dil)}</p>
                    {metin && (
                      <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-muted">
                        {metin}
                      </p>
                    )}
                    <p className="mt-auto pt-4 text-xs text-muted">
                      <bdi>{k.urunler.length}</bdi> {t("siparis.urunAdet")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
