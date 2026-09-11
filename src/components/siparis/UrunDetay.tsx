"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Dil, Urun } from "@/lib/tipler";
import { ad, aciklama, gramajYaz, olcuLtrMi } from "@/lib/dil";
import { fiyatYaz, kurus } from "@/lib/sabitler";
import { useSepet } from "@/lib/sepet";
import { IkonUyari } from "@/components/Ikon";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";

const NOT_SINIRI = 200;
const ADET_SINIRI = 99;

/** Bolum basligi + ince cizgi — CLAUDE.md'deki "── BASLIK ──" duzeni. */
function BolumBasligi({ metin, ipucu }: { metin: string; ipucu?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-3 border-b border-rule pb-2">
      <h2 className="etiket text-ink">{metin}</h2>
      {ipucu && <span className="text-xs text-muted">{ipucu}</span>}
    </div>
  );
}

/**
 * Paket siparis urun detayi: cikarilacaklar, ekstralar, not.
 * Buton tutari (birim fiyat + secili ekstralar) x adet olarak anlik guncellenir.
 */
export default function UrunDetay({
  urun,
  kategoriSlug,
  acik,
  tur = "paket",
  temelYol = "/siparis",
  saltOkunur = false,
  whatsappNumarasi,
}: {
  urun: Urun;
  kategoriSlug: string;
  acik: boolean;
  /** Masa menusunde masa fiyati, pakette paket fiyati gosterilir */
  tur?: "masa" | "paket";
  temelYol?: string;
  saltOkunur?: boolean;
  whatsappNumarasi?: string | null;
}) {
  const dil = useLocale() as Dil;
  const t = useTranslations();
  const router = useRouter();
  const ekle = useSepet((d) => d.ekle);

  const [cikarilanlar, setCikarilanlar] = useState<Set<string>>(new Set());
  const [ekstralar, setEkstralar] = useState<Set<string>>(new Set());
  const [not, setNot] = useState("");
  const [adet, setAdet] = useState(1);

  const isim = ad(urun, dil);
  const metin = aciklama(urun, dil);
  const olcu = gramajYaz(urun, dil);
  const temelFiyat = tur === "masa" ? urun.fiyat_masa : urun.fiyat_paket;

  const seciliEkstralar = useMemo(
    () => (urun.ekstralar ?? []).filter((e) => ekstralar.has(e.id)),
    [urun.ekstralar, ekstralar],
  );

  const birimFiyat = useMemo(
    () =>
      kurus(
        temelFiyat +
          seciliEkstralar.reduce((toplam, e) => kurus(toplam + e.fiyat), 0),
      ),
    [temelFiyat, seciliEkstralar],
  );

  const tutar = kurus(birimFiyat * adet);

  function degistir(kume: Set<string>, id: string): Set<string> {
    const yeni = new Set(kume);
    if (yeni.has(id)) yeni.delete(id);
    else yeni.add(id);
    return yeni;
  }

  function sepeteEkle() {
    if (!urun.stokta || !acik || saltOkunur) return;
    ekle({
      urunId: urun.id,
      slug: urun.slug,
      ad_tr: urun.ad_tr,
      ad_ar: urun.ad_ar,
      birimFiyat: temelFiyat,
      adet,
      cikarilanlar: (urun.cikarilabilirler ?? [])
        .filter((c) => cikarilanlar.has(c.id))
        .map((c) => ({ id: c.id, ad_tr: c.ad_tr, ad_ar: c.ad_ar })),
      ekstralar: seciliEkstralar.map((e) => ({
        id: e.id,
        ad_tr: e.ad_tr,
        ad_ar: e.ad_ar,
        fiyat: e.fiyat,
      })),
      not: not.trim(),
    }, tur);
    // Musteri secmeye devam edebilsin diye kategori listesine geri don
    router.push(`${temelYol}/${kategoriSlug}`);
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-4 pb-40">
        {saltOkunur && (
          <SaltOkunurUyarisi
            whatsappNumarasi={whatsappNumarasi}
            className="mt-4"
          />
        )}
        {/* ---------- FOTOGRAF ---------- */}
        <div className="relative mt-4 aspect-4/3 w-full overflow-hidden rounded-3xl bg-line/40">
          {urun.gorsel_url ? (
            <Image
              src={urun.gorsel_url}
              alt={isim}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 512px"
              className={`object-cover ${!urun.stokta ? "grayscale opacity-40" : ""}`}
            />
          ) : (
            <span
              aria-hidden
              className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted/40"
            >
              R
            </span>
          )}
          {!urun.stokta && (
            <span className="absolute inset-x-0 top-0 bg-danger px-3 py-2 text-center text-sm font-semibold text-white">
              {t("ortak.tukendi")}
            </span>
          )}
        </div>

        {/* ---------- BASLIK ---------- */}
        <div className="mt-4 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 break-words text-2xl font-bold leading-snug">
            {isim}
          </h1>
          <span className="fiyat shrink-0 text-2xl font-bold text-brand-light">
            {fiyatYaz(temelFiyat)}
          </span>
        </div>

        <p className="mt-1 break-words text-sm text-muted">
          {/* Porsiyon/miktar her iki menude de gorunur */}
          {olcu && (
            <span className={olcuLtrMi(olcu) ? "fiyat" : ""}>{olcu}</span>
          )}
          {olcu && metin && " · "}
          {metin}
        </p>

        {urun.alerjenler.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-accent">
            <IkonUyari className="h-4 w-4 shrink-0" />
            {urun.alerjenler
              .map((k) => (t.has(`alerjen.${k}`) ? t(`alerjen.${k}`) : k))
              .join(", ")}
          </p>
        )}

        {/* ---------- 1. CIKARILACAKLAR ---------- */}
        {(urun.cikarilabilirler ?? []).length > 0 && (
          <section>
            <BolumBasligi
              metin={t("siparis.cikarilacaklar")}
              ipucu={t("siparis.ucretsiz")}
            />
            <ul className="flex flex-wrap gap-2">
              {urun.cikarilabilirler!.map((c) => {
                const secili = cikarilanlar.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={secili}
                      onClick={() =>
                        setCikarilanlar((k) => degistir(k, c.id))
                      }
                      className={`flex min-h-11 items-center border px-4 text-sm transition-[border-color,background-color,color] duration-200 ${
                        secili
                          ? "border-danger bg-danger/10 text-danger line-through"
                          : "border-line text-ink hover:border-rule"
                      }`}
                    >
                      {ad(c, dil)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---------- 2. EKSTRALAR ---------- */}
        {(urun.ekstralar ?? []).length > 0 && (
          <section>
            <BolumBasligi metin={t("siparis.ekstralar")} />
            <ul className="flex flex-col gap-2">
              {urun.ekstralar!.map((e) => {
                const secili = ekstralar.has(e.id);
                const tukendi = !e.stokta;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      disabled={tukendi}
                      aria-pressed={secili}
                      onClick={() => setEkstralar((k) => degistir(k, e.id))}
                      className={`flex min-h-12 w-full items-center gap-3 border px-4 text-start transition-[border-color,background-color] duration-200 ${
                        tukendi
                          ? "cursor-not-allowed border-line bg-surface/30"
                          : secili
                            ? "border-brand bg-brand/10"
                            : "border-line bg-card hover:border-rule"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          secili
                            ? "border-brand bg-brand text-bg"
                            : "border-muted"
                        }`}
                      >
                        {secili && (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{ad(e, dil)}</span>
                      <span className="fiyat shrink-0 text-sm font-semibold text-brand-light">
                        +{fiyatYaz(e.fiyat)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---------- 3. NOT ---------- */}
        <section>
          <BolumBasligi metin={t("siparis.not")} />
          <textarea
            name="siparis-notu"
            value={not}
            onChange={(e) => setNot(e.target.value.slice(0, NOT_SINIRI))}
            placeholder={t("siparis.notYerTutucu")}
            rows={3}
            maxLength={NOT_SINIRI}
            autoComplete="off"
            aria-label={t("siparis.not")}
            className="w-full resize-none rounded-2xl border border-line bg-card p-4 text-base text-ink placeholder:text-muted focus:border-brand"
          />
          <p className="fiyat mt-1 text-end text-xs text-muted">
            {not.length}/{NOT_SINIRI}
          </p>
        </section>
      </div>

      {/* ---------- ADET + SEPETE EKLE ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex items-center gap-1 rounded-2xl border border-line bg-card p-1">
            <button
              type="button"
              onClick={() => setAdet((a) => Math.max(1, a - 1))}
              disabled={saltOkunur || !urun.stokta || adet <= 1}
              aria-label={t("siparis.azalt")}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold text-ink transition active:bg-line disabled:opacity-30"
            >
              −
            </button>
            <span className="fiyat w-8 text-center text-lg font-bold">
              {adet}
            </span>
            <button
              type="button"
              onClick={() => setAdet((a) => Math.min(ADET_SINIRI, a + 1))}
              disabled={saltOkunur || !urun.stokta || adet >= ADET_SINIRI}
              aria-label={t("siparis.artir")}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold text-ink transition active:bg-line disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={sepeteEkle}
            disabled={saltOkunur || !acik || !urun.stokta}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 bg-brand px-4 font-bold text-bg transition-[background-color,transform] duration-200 hover:bg-brand-dark active:scale-[0.99] disabled:bg-line disabled:text-muted"
          >
            {saltOkunur ? (
              t("menu.saltOkunurKisa")
            ) : !urun.stokta ? (
              t("ortak.tukendi")
            ) : acik ? (
              <>
                <span className="truncate">{t("siparis.sepeteEkle")}</span>
                <span aria-hidden className="shrink-0">
                  —
                </span>
                {/* whitespace-nowrap: "150" ile "₺" alt alta dusuyordu */}
                <span className="fiyat shrink-0 whitespace-nowrap">
                  {fiyatYaz(tutar)}
                </span>
              </>
            ) : (
              t("siparis.suAnKapali")
            )}
          </button>
        </div>
      </div>
    </>
  );
}
