"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { fiyatYaz } from "@/lib/sabitler";
import { telefonGecerliMi, telefonNormalize } from "@/lib/telefon";
import { IkonCikar, IkonEkle, IkonNot, IkonTelefon } from "@/components/Ikon";
import { useAdminDil, type MetinAnahtari } from "@/lib/admin-dil";

const DURUMLAR: { kod: string; anahtar: MetinAnahtari; renk: string }[] = [
  { kod: "yeni", anahtar: "durumYeni", renk: "bg-brand text-bg" },
  { kod: "onaylandi", anahtar: "durumOnaylandi", renk: "bg-brand/20 text-brand-light" },
  { kod: "hazirlaniyor", anahtar: "durumHazirlaniyor", renk: "bg-accent/20 text-accent" },
  { kod: "yolda", anahtar: "durumYolda", renk: "bg-accent text-bg" },
  { kod: "teslim", anahtar: "durumTeslim", renk: "bg-line text-muted" },
  { kod: "iptal", anahtar: "durumIptal", renk: "bg-danger/20 text-danger" },
];

interface Kalem {
  ad_tr: string;
  /** Siparis aninda kaydedilen Arapca ad — panel Arapcaysa bu gosterilir */
  ad_ar?: string;
  adet: number;
  birim_fiyat: number;
  cikarilanlar?: { ad_tr: string; ad_ar?: string }[];
  ekstralar?: { ad_tr: string; ad_ar?: string; fiyat: number }[];
  not?: string;
}

export interface AdminSiparis {
  id: string;
  siparis_no: string;
  musteri_ad: string;
  musteri_telefon: string;
  dil: string;
  kalemler: Kalem[];
  ara_toplam: number;
  servis_ucreti: number;
  toplam: number;
  durum: string;
  siparis_turu?: string;
  masa_no?: string | null;
  created_at: string;
}

function tarihYaz(ham: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ham));
}

export default function SiparisListesi({
  siparisler,
}: {
  siparisler: AdminSiparis[];
}) {
  const { m, dil } = useAdminDil();
  const router = useRouter();

  /**
   * Siparis kaydindaki iki dilli adlardan panelin diline uyani secer.
   * Kayit ANI donduruldugu icin urun sonradan yeniden adlandirilsa bile
   * siparis o gunku adiyla gorunur — bilerek boyle.
   */
  const ad = (k: { ad_tr: string; ad_ar?: string }) =>
    dil === "ar" ? k.ad_ar?.trim() || k.ad_tr : k.ad_tr;
  const [acikId, setAcikId] = useState<string | null>(null);
  const [durumlar, setDurumlar] = useState<Record<string, string>>(() =>
    Object.fromEntries(siparisler.map((s) => [s.id, s.durum])),
  );
  const [hata, setHata] = useState<string | null>(null);

  async function durumDegistir(id: string, yeni: string) {
    const eski = durumlar[id];
    setDurumlar((d) => ({ ...d, [id]: yeni }));
    setHata(null);

    const db = tarayiciIstemcisi();
    const { error } = await db
      .from("siparisler")
      .update({ durum: yeni })
      .eq("id", id);

    if (error) {
      setDurumlar((d) => ({ ...d, [id]: eski }));
      console.error("Siparis durumu guncellenemedi:", error);
      setHata(`${m("durum")}: ${m("guncellenemedi")}. ${m("islemBasarisiz")}`);
      return;
    }
    router.refresh();
  }

  if (siparisler.length === 0) {
    return (
      <p className="px-4 py-20 text-center text-muted">{m("siparisYok")}</p>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      {hata && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {siparisler.map((s) => {
          const acik = acikId === s.id;
          const durum =
            DURUMLAR.find((d) => d.kod === durumlar[s.id]) ?? DURUMLAR[0];
          const paketSiparisi = s.siparis_turu !== "masa";
          const telefon = telefonNormalize(s.musteri_telefon);
          const telefonGecerli = paketSiparisi && telefonGecerliMi(telefon);

          return (
            <li
              key={s.id}
              className="overflow-hidden rounded-2xl border border-line bg-card"
            >
              <button
                type="button"
                onClick={() => setAcikId(acik ? null : s.id)}
                aria-expanded={acik}
                className="flex w-full items-center gap-3 p-3 text-start"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="fiyat font-bold text-accent">
                      #{s.siparis_no}
                    </span>
                    <span className="truncate text-sm">
                      {s.siparis_turu === "masa"
                        ? `${m("masaNo")} ${s.masa_no ?? ""}`
                        : s.musteri_ad}
                    </span>
                    {s.dil === "ar" && (
                      <span className="rounded bg-line px-1.5 text-xs text-muted">
                        AR
                      </span>
                    )}
                  </p>
                  <p className="fiyat mt-0.5 text-xs text-muted">
                    {tarihYaz(s.created_at)} · {fiyatYaz(s.toplam)}
                  </p>
                </div>

                {/* Masa / paket ayrimi tek bakista gorunsun */}
                <span
                  className={`etiket shrink-0 px-2 py-1 ${
                    s.siparis_turu === "masa"
                      ? "bg-accent/15 text-accent"
                      : "bg-line text-muted"
                  }`}
                >
                  {s.siparis_turu === "masa"
                    ? m("masaSiparisi")
                    : m("paketSiparisi")}
                </span>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${durum.renk}`}
                >
                  {m(durum.anahtar)}
                </span>
              </button>

              {acik && (
                <div className="border-t border-line px-3 pb-3 pt-3">
                  <ul className="flex flex-col gap-2">
                    {s.kalemler.map((k, i) => (
                      <li key={i} className="text-sm">
                        <p className="flex justify-between gap-2">
                          <span>
                            {ad(k)} × {k.adet}
                          </span>
                          <span className="fiyat text-muted">
                            {fiyatYaz(k.birim_fiyat)}
                          </span>
                        </p>
                        {(k.cikarilanlar ?? []).length > 0 && (
                          <p className="flex items-start gap-1.5 text-xs text-muted">
                            <IkonCikar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                            <span>
                              {k.cikarilanlar!.map(ad).join(", ")}
                            </span>
                          </p>
                        )}
                        {(k.ekstralar ?? []).length > 0 && (
                          <p className="flex items-start gap-1.5 text-xs text-muted">
                            <IkonEkle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                            <span>
                              {k.ekstralar!
                                .map((e) => `${ad(e)} (+${fiyatYaz(e.fiyat)})`)
                                .join(", ")}
                            </span>
                          </p>
                        )}
                        {k.not && (
                          <p className="flex items-start gap-1.5 text-xs text-accent">
                            <IkonNot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{k.not}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-3 border-t border-line pt-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">{m("araToplam")}</dt>
                      <dd className="fiyat">{fiyatYaz(s.ara_toplam)}</dd>
                    </div>
                    {paketSiparisi && (
                      <div className="flex justify-between">
                        <dt className="text-muted">{m("servis")}</dt>
                        <dd className="fiyat">{fiyatYaz(s.servis_ucreti)}</dd>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between font-bold">
                      <dt>{m("toplam")}</dt>
                      <dd className="fiyat text-brand-light">
                        {fiyatYaz(s.toplam)}
                      </dd>
                    </div>
                  </dl>

                  {telefonGecerli && (
                    <a
                      href={`tel:${telefon}`}
                      className="mt-3 flex min-h-12 items-center justify-center gap-2 border border-brand/50 text-sm font-semibold text-brand-light transition-colors duration-200 hover:bg-brand hover:text-bg"
                    >
                      <IkonTelefon className="h-4 w-4" />
                      <span className="fiyat">{s.musteri_telefon}</span>
                    </a>
                  )}

                  <p className="mt-4 text-xs text-muted">{m("durum")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DURUMLAR.map((d) => (
                      <button
                        key={d.kod}
                        type="button"
                        onClick={() => durumDegistir(s.id, d.kod)}
                        aria-pressed={durumlar[s.id] === d.kod}
                        className={`flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition ${
                          durumlar[s.id] === d.kod
                            ? d.renk
                            : "border border-line text-muted"
                        }`}
                      >
                        {m(d.anahtar)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
