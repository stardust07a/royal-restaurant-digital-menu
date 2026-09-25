"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { menuyuTazele } from "@/lib/admin-eylemleri";
import { fiyatYaz } from "@/lib/sabitler";
import { useAdminDil } from "@/lib/admin-dil";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";

export interface AdminUrun {
  id: string;
  slug: string;
  ad_tr: string;
  ad_ar: string;
  gorsel_url: string | null;
  fiyat_masa: number;
  fiyat_paket: number;
  gramaj: string | null;
  stokta: boolean;
  aktif: boolean;
  sira: number;
}

export interface AdminKategori {
  id: string;
  slug: string;
  ad_tr: string;
  ad_ar: string;
  urunler: AdminUrun[];
}

/**
 * Kategoriye gore gruplu urun listesi.
 *
 * Stok anahtari tek dokunusla calisir: once ekranda degisir (iyimser),
 * sonra veritabanina yazilir. Yazma basarisiz olursa eski haline doner —
 * restoran sahibi kapattigini sandigi bir urunu satmaya devam etmesin.
 */
export default function UrunListesi({
  kategoriler,
}: {
  kategoriler: AdminKategori[];
}) {
  const { m, dil } = useAdminDil();
  const [sorgu, setSorgu] = useState("");
  const [stoklar, setStoklar] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      kategoriler.flatMap((k) => k.urunler.map((u) => [u.id, u.stokta])),
    ),
  );
  const [isleniyor, setIsleniyor] = useState<Set<string>>(new Set());
  const [bozukGorseller, setBozukGorseller] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);

  const gosterilecek = useMemo(() => {
    const q = sorgu.trim().toLocaleLowerCase(dil === "ar" ? "ar" : "tr");
    if (!q) return kategoriler;
    return kategoriler
      .map((k) => ({
        ...k,
        urunler: k.urunler.filter(
          (u) =>
            u.ad_tr.toLocaleLowerCase(dil === "ar" ? "ar" : "tr").includes(q) ||
            u.ad_ar.toLocaleLowerCase(dil === "ar" ? "ar" : "tr").includes(q),
        ),
      }))
      .filter((k) => k.urunler.length > 0);
  }, [dil, sorgu, kategoriler]);

  async function stokDegistir(urun: AdminUrun) {
    const yeniDeger = !stoklar[urun.id];
    setHata(null);
    setStoklar((s) => ({ ...s, [urun.id]: yeniDeger }));
    setIsleniyor((s) => new Set(s).add(urun.id));

    const db = tarayiciIstemcisi();
    const { error } = await db
      .from("urunler")
      .update({ stokta: yeniDeger })
      .eq("id", urun.id);

    setIsleniyor((s) => {
      const y = new Set(s);
      y.delete(urun.id);
      return y;
    });

    if (error) {
      // Geri al — ekranda yanlis bilgi kalmasin
      setStoklar((s) => ({ ...s, [urun.id]: !yeniDeger }));
      console.error("Urun stok durumu guncellenemedi:", error);
      const urunAdi = dil === "ar" ? urun.ad_ar || urun.ad_tr : urun.ad_tr || urun.ad_ar;
      setHata(`"${urunAdi}" ${m("guncellenemedi")}. ${m("islemBasarisiz")}`);
      return;
    }

    await menuyuTazele();
  }

  // Ayni urun birden cok kategoride olabilir; sayac tekil urunleri gostersin.
  const toplamUrun = new Set(kategoriler.flatMap((k) => k.urunler.map((u) => u.id))).size;
  const tukenenSayisi = Object.values(stoklar).filter((v) => !v).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 sm:px-6">
      <div className="flex items-center gap-3 pt-4">
        <input
          type="search"
          name="urun-ara"
          autoComplete="off"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          placeholder={m("urunAra")}
          aria-label={m("urunAra")}
          className="min-h-12 flex-1 rounded-2xl border border-line bg-card px-4 text-base placeholder:text-muted focus:border-brand"
        />
        <Link
          href="/admin/urun/yeni"
          aria-label={m("yeniUrun")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-bg transition active:scale-95"
        >
          +
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {toplamUrun} {m("urunSayisi")} · {tukenenSayisi} {m("tukendi")}
        </p>
        <Link
          href="/admin/toplu-fiyat"
          className="flex min-h-11 items-center rounded-full border border-line px-4 text-xs font-semibold text-muted transition active:scale-95"
        >
          {m("topluFiyat")}
        </Link>
      </div>

      {hata && (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}

      {gosterilecek.map((k) => (
        <section key={k.id} className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-accent">
            {dil === "ar" ? k.ad_ar || k.ad_tr : k.ad_tr || k.ad_ar}
          </h2>

          <ul className="mt-2 flex flex-col gap-2">
            {k.urunler.map((u) => {
              const stokta = stoklar[u.id];
              const gorselUrl = nextGorselUrlDogrula(u.gorsel_url);
              const gorselGoster = Boolean(
                gorselUrl && bozukGorseller[u.id] !== gorselUrl,
              );
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2"
                >
                  <Link
                    href={`/admin/urun/${u.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="relative aspect-4/3 w-16 shrink-0 overflow-hidden rounded-lg bg-line/40">
                      {gorselGoster ? (
                        <Image
                          src={gorselUrl!}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          onError={() =>
                            setBozukGorseller((onceki) => ({
                              ...onceki,
                              [u.id]: gorselUrl!,
                            }))
                          }
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-full w-full items-center justify-center text-xs text-muted/50"
                        >
                          R
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {dil === "ar" ? u.ad_ar || u.ad_tr : u.ad_tr || u.ad_ar}
                        {!u.aktif && (
                          <span className="ms-2 rounded bg-line px-1.5 py-0.5 text-xs font-normal text-muted">
                            {m("yayindaDegil")}
                          </span>
                        )}
                      </p>
                      <p className="fiyat mt-0.5 text-xs text-muted">
                        {m("masa")} {fiyatYaz(u.fiyat_masa)} · {m("paket")}{" "}
                        {fiyatYaz(u.fiyat_paket)}
                      </p>
                    </div>
                  </Link>

                  {/* Hizli stok anahtari */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={stokta}
                    aria-label={`${dil === "ar" ? u.ad_ar || u.ad_tr : u.ad_tr || u.ad_ar} ${m("stokDurumu")}`}
                    disabled={isleniyor.has(u.id)}
                    onClick={() => stokDegistir(u)}
                    className={`relative h-11 w-16 shrink-0 rounded-full transition disabled:opacity-50 ${
                      stokta ? "bg-brand" : "bg-line"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute top-1.5 h-8 w-8 rounded-full bg-bg transition-[inset-inline-start] ${
                        stokta ? "start-[1.875rem]" : "start-1.5"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {gosterilecek.length === 0 && (
        <p className="py-20 text-center text-muted">{m("urunBulunamadi")}</p>
      )}
    </div>
  );
}
