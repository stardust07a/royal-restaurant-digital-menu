"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Dil, Urun } from "@/lib/tipler";
import { ad, aciklama, gramajYaz, olcuLtrMi } from "@/lib/dil";
import { fiyatYaz } from "@/lib/sabitler";

/**
 * Masa veya paket siparis urun karti — 4:3 fotograf, ad, kisa aciklama,
 * porsiyon/miktar, ilgili akis fiyati ve urun etiketi.
 *
 * Tukenen urun tiklanamaz; metin kontrastini korumak icin yalniz gorseli
 * soluklastirilir ve Link yerine devre disi bir liste ogesi cizilir.
 */
export default function UrunKarti({
  urun,
  dil,
  tur = "paket",
  temelYol = "/siparis",
}: {
  urun: Urun;
  dil: Dil;
  /** Masa menusunde masa fiyati gosterilir */
  tur?: "masa" | "paket";
  temelYol?: string;
}) {
  const t = useTranslations();
  const isim = ad(urun, dil);
  const metin = aciklama(urun, dil);
  const olcu = gramajYaz(urun, dil);

  const govde = (
    <>
      <div className="relative aspect-4/3 w-full overflow-hidden bg-surface">
        {urun.gorsel_url ? (
          <Image
            src={urun.gorsel_url}
            alt=""
            fill
            sizes="(max-width: 379px) 100vw, (max-width: 640px) 50vw, 240px"
            className={`object-cover transition-[transform,opacity,filter] duration-300 group-hover:scale-105 ${
              !urun.stokta ? "grayscale opacity-40" : ""
            }`}
          />
        ) : (
          <span
            aria-hidden
            className={`flex h-full w-full items-center justify-center text-2xl font-bold text-muted/40 ${
              !urun.stokta ? "opacity-40" : ""
            }`}
          >
            R
          </span>
        )}

        {urun.rozet !== "yok" && urun.stokta && (
          <span
            className="etiket absolute start-2 top-2 z-10 block max-w-[calc(100%-1rem)] overflow-hidden text-ellipsis whitespace-nowrap bg-brand px-2 py-1 text-white shadow-sm"
          >
            <bdi>{t(`rozet.${urun.rozet}`)}</bdi>
          </span>
        )}

        {!urun.stokta && (
          <span className="absolute inset-x-0 top-0 bg-danger px-2 py-1 text-center text-xs font-semibold text-white">
            {t("ortak.tukendi")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3.5 py-3">
        <h3 className="break-words font-black leading-snug">{isim}</h3>
        {metin && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-muted">
            {metin}
          </p>
        )}

        {/* Fiyat kendi satirinda: uzun porsiyon/miktar metni onu sikistirip
            "400" ile "₺" arasinda satir kirilmasina yol aciyordu. */}
        <p className="fiyat mt-auto whitespace-nowrap pt-2 text-lg font-bold text-brand-light">
          {fiyatYaz(tur === "masa" ? urun.fiyat_masa : urun.fiyat_paket)}
        </p>
        {/* Porsiyon/miktar her iki menude de gorunur */}
        {olcu && (
          <p
            className={`mt-0.5 text-xs leading-snug text-muted ${olcuLtrMi(olcu) ? "fiyat" : ""}`}
          >
            {olcu}
          </p>
        )}
      </div>
    </>
  );

  if (!urun.stokta) {
    return (
      <li
        aria-disabled="true"
        className="flex cursor-not-allowed flex-col overflow-hidden border border-line bg-surface/40"
      >
        {govde}
      </li>
    );
  }

  return (
    <li className="flex">
      <Link
        href={`${temelYol}/urun/${urun.slug}`}
        className="group flex w-full flex-col overflow-hidden border border-line bg-card active:bg-surface"
      >
        {govde}
      </Link>
    </li>
  );
}
