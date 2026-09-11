"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { menuyuTazele } from "@/lib/admin-eylemleri";
import { fiyatYaz, kurus } from "@/lib/sabitler";
import { useAdminDil } from "@/lib/admin-dil";

export interface TopluUrun {
  id: string;
  ad_tr: string;
  kategori_id: string;
  fiyat_masa: number;
  fiyat_paket: number;
}

type Yontem = "yuzde" | "sabit";
type Hedef = "ikisi" | "masa" | "paket";

/**
 * Kategori bazli toplu fiyat guncelleme.
 *
 * Uygulamadan once her urunun eski/yeni fiyati listelenir — yanlis bir zam
 * 59 urunu birden bozabilir, onizleme olmadan calistirilmamali.
 */
export default function TopluFiyat({
  kategoriler,
  urunler,
}: {
  kategoriler: { id: string; ad_tr: string }[];
  urunler: TopluUrun[];
}) {
  const { m } = useAdminDil();
  const router = useRouter();
  const [kategoriId, setKategoriId] = useState("hepsi");
  const [yontem, setYontem] = useState<Yontem>("yuzde");
  const [hedef, setHedef] = useState<Hedef>("ikisi");
  const [deger, setDeger] = useState(0);
  const [uyguluyor, setUyguluyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);

  const kapsam = useMemo(
    () =>
      kategoriId === "hepsi"
        ? urunler
        : urunler.filter((u) => u.kategori_id === kategoriId),
    [kategoriId, urunler],
  );

  /** Tek bir fiyata secili yontemi uygular; negatife dusmez. */
  function yeniFiyat(eski: number): number {
    const ham =
      yontem === "yuzde" ? eski * (1 + deger / 100) : eski + deger;
    return kurus(Math.max(0, ham));
  }

  const onizleme = useMemo(
    () =>
      kapsam.map((u) => ({
        ...u,
        yeniMasa:
          hedef === "paket" ? u.fiyat_masa : yeniFiyat(u.fiyat_masa),
        yeniPaket:
          hedef === "masa" ? u.fiyat_paket : yeniFiyat(u.fiyat_paket),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kapsam, hedef, yontem, deger],
  );

  const degisenSayisi = onizleme.filter(
    (u) => u.yeniMasa !== u.fiyat_masa || u.yeniPaket !== u.fiyat_paket,
  ).length;

  async function uygula() {
    if (degisenSayisi === 0) return;
    if (
      !confirm(
        `${degisenSayisi} ${m("topluFiyatOnay")}`,
      )
    )
      return;

    setUyguluyor(true);
    setHata(null);
    setSonuc(null);

    const db = tarayiciIstemcisi();
    const guncellemeler = onizleme
      .filter(
        (u) => u.yeniMasa !== u.fiyat_masa || u.yeniPaket !== u.fiyat_paket,
      )
      .map((u) => ({
        id: u.id,
        fiyat_masa: u.yeniMasa,
        fiyat_paket: u.yeniPaket,
      }));
    const { data, error } = await db.rpc("admin_toplu_fiyat_guncelle", {
      p_guncellemeler: guncellemeler,
    });
    if (error) {
      console.error("Toplu fiyat guncellenemedi:", error);
      setHata(m("islemBasarisiz"));
      setUyguluyor(false);
      return;
    }
    const basarili = Number(data ?? 0);

    await menuyuTazele();
    setUyguluyor(false);
    setSonuc(`${basarili} ${m("fiyatGuncellendi")}`);
    setDeger(0);
    router.refresh();
  }

  const kutu =
    "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base focus:border-brand";

  return (
    <div className="mx-auto max-w-lg px-4 pb-[calc(11rem+env(safe-area-inset-bottom))]">
      <section className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("kategori")}</span>
          <select
            name="kategori"
            autoComplete="off"
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
            className={kutu}
          >
            <option value="hepsi">{m("tumUrunler")} ({urunler.length})</option>
            {kategoriler.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad_tr} (
                {urunler.filter((u) => u.kategori_id === k.id).length})
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-1.5 text-sm text-muted">{m("hangiFiyat")}</p>
          <div className="flex gap-1 rounded-2xl border border-line bg-card p-1">
            {(
              [
                ["ikisi", m("ikisi")],
                ["masa", m("masa")],
                ["paket", m("paket")],
              ] as const
            ).map(([kod, ad]) => (
              <button
                key={kod}
                type="button"
                onClick={() => setHedef(kod)}
                aria-pressed={hedef === kod}
                className={`min-h-11 flex-1 rounded-xl text-sm font-semibold transition ${
                  hedef === kod ? "bg-brand text-bg" : "text-muted"
                }`}
              >
                {ad}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm text-muted">{m("yontem")}</p>
          <div className="flex gap-1 rounded-2xl border border-line bg-card p-1">
            {(
              [
                ["yuzde", m("yuzde")],
                ["sabit", m("sabitTutar")],
              ] as const
            ).map(([kod, ad]) => (
              <button
                key={kod}
                type="button"
                onClick={() => setYontem(kod)}
                aria-pressed={yontem === kod}
                className={`min-h-11 flex-1 rounded-xl text-sm font-semibold transition ${
                  yontem === kod ? "bg-brand text-bg" : "text-muted"
                }`}
              >
                {ad}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">
            {yontem === "yuzde"
              ? m("zamOrani")
              : m("eklenecekTutar")}
          </span>
          <input
            type="number"
            name="fiyat-degisimi"
            autoComplete="off"
            inputMode="decimal"
            step={yontem === "yuzde" ? "1" : "0.01"}
            value={deger}
            onChange={(e) => setDeger(Number(e.target.value))}
            className={`${kutu} fiyat`}
          />
        </label>
      </section>

      {/* ---------- ONIZLEME ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("onizleme")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {degisenSayisi === 0
            ? m("degisecekYok")
            : `${degisenSayisi} ${m("degisecekSayisi")}`}
        </p>

        {degisenSayisi > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {onizleme
              .filter(
                (u) =>
                  u.yeniMasa !== u.fiyat_masa || u.yeniPaket !== u.fiyat_paket,
              )
              .map((u) => (
                <li
                  key={u.id}
                  className="rounded-2xl border border-line bg-card p-3 text-sm"
                >
                  <p className="truncate font-semibold">{u.ad_tr}</p>
                  <div className="mt-1 flex gap-4 text-xs">
                    <span className="text-muted">
                      {m("masa")}:{" "}
                      <span className="fiyat line-through">
                        {fiyatYaz(u.fiyat_masa)}
                      </span>{" "}
                      <span className="fiyat text-brand-light">
                        {fiyatYaz(u.yeniMasa)}
                      </span>
                    </span>
                    <span className="text-muted">
                      {m("paket")}:{" "}
                      <span className="fiyat line-through">
                        {fiyatYaz(u.fiyat_paket)}
                      </span>{" "}
                      <span className="fiyat text-brand-light">
                        {fiyatYaz(u.yeniPaket)}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {hata && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}
      {sonuc && (
        <p
          role="status"
          aria-live="polite"
          className="mt-6 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand-light"
        >
          {sonuc}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={uygula}
          disabled={uyguluyor || degisenSayisi === 0}
          className="mx-auto flex min-h-13 w-full max-w-lg items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
        >
          {uyguluyor ? m("uygulaniyor") : `${m("uygula")} (${degisenSayisi} ${m("urunSayisi")})`}
        </button>
      </div>
    </div>
  );
}
