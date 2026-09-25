"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { menuyuTazele } from "@/lib/admin-eylemleri";
import { useAdminDil } from "@/lib/admin-dil";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";

export interface AdminKategoriSatiri {
  id: string;
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  gorsel_url: string | null;
  aktif: boolean;
  urunSayisi: number;
}

/**
 * Kategori listesi ve sirasi.
 *
 * Sira ↑↓ dugmeleriyle degistirilir; her tasima iki satirin "sira" degerini
 * takas edip veritabanina yazar. Menude kategoriler bu alana gore diziliyor.
 */
export default function KategoriListesi({
  kategoriler,
}: {
  kategoriler: AdminKategoriSatiri[];
}) {
  const { m, dil } = useAdminDil();
  const router = useRouter();
  const [liste, setListe] = useState(kategoriler);
  const [bozukGorseller, setBozukGorseller] = useState<Record<string, string>>({});
  const [isleniyor, setIsleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function tasi(i: number, yon: -1 | 1) {
    const hedef = i + yon;
    if (hedef < 0 || hedef >= liste.length || isleniyor) return;

    const yeni = [...liste];
    [yeni[i], yeni[hedef]] = [yeni[hedef], yeni[i]];
    // Sira degerlerini bastan numaralandir — esit degerler karisiklik yaratir
    const numarali = yeni.map((k, j) => ({ ...k, sira: j + 1 }));
    setListe(numarali);
    setIsleniyor(true);
    setHata(null);

    const db = tarayiciIstemcisi();
    const { error } = await db.rpc("admin_kategori_sirala", {
      p_siralar: numarali.map((k) => ({ id: k.id, sira: k.sira })),
    });

    setIsleniyor(false);
    if (error) {
      setListe(liste); // geri al
      console.error("Kategori sirasi kaydedilemedi:", error);
      setHata(`${m("siraKaydedilemedi")}. ${m("islemBasarisiz")}`);
      return;
    }

    await menuyuTazele();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 sm:px-6">
      <Link
        href="/admin/kategori/yeni"
        className="mt-4 flex min-h-13 items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98]"
      >
        {m("yeniKategori")}
      </Link>

      {hata && (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}

      {liste.length === 0 ? (
        <p className="py-20 text-center text-muted">
          {m("kategoriYok")}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {liste.map((k, i) => {
            const kategoriAdi = dil === "ar" ? k.ad_ar || k.ad_tr : k.ad_tr || k.ad_ar;
            const ikincilAd = dil === "ar" ? k.ad_tr : k.ad_ar;
            const gorselUrl = nextGorselUrlDogrula(k.gorsel_url);
            const gorselGoster = Boolean(gorselUrl && bozukGorseller[k.id] !== gorselUrl);
            return (
            <li
              key={k.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2"
            >
              <Link
                href={`/admin/kategori/${k.id}`}
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
                          [k.id]: gorselUrl!,
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
                    {kategoriAdi}
                    {!k.aktif && (
                      <span className="ms-2 rounded bg-line px-1.5 py-0.5 text-xs font-normal text-muted">
                        {m("yayindaDegil")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {ikincilAd ? `${ikincilAd} · ` : ""}{k.urunSayisi} {m("urunSayisi")}
                  </p>
                </div>
              </Link>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => tasi(i, -1)}
                  disabled={i === 0 || isleniyor}
                  aria-label={`${kategoriAdi} ${m("yukariTasi")}`}
                  className="flex h-11 min-h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => tasi(i, 1)}
                  disabled={i === liste.length - 1 || isleniyor}
                  aria-label={`${kategoriAdi} ${m("asagiTasi")}`}
                  className="flex h-11 min-h-11 w-11 items-center justify-center rounded-lg border border-line text-muted disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
