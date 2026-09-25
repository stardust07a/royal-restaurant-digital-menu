"use client";

import { fiyatYaz } from "@/lib/sabitler";
import { useAdminDil } from "@/lib/admin-dil";

/**
 * Ciro ozeti ve en cok satanlar.
 *
 * Sunucu bileseninden ayrildi: metinler dil secimine gore degismeli,
 * sunucu ciktisi ise secimi bilemiyor.
 */
export default function SiparisOzeti({
  bugunCiro,
  bugunAdet,
  haftaCiro,
  haftaAdet,
  enCokSatan,
}: {
  bugunCiro: number;
  bugunAdet: number;
  haftaCiro: number;
  haftaAdet: number;
  enCokSatan: { ad_tr: string; ad_ar?: string; adet: number }[];
}) {
  const { m, dil } = useAdminDil();
  const ad = (k: { ad_tr: string; ad_ar?: string }) =>
    dil === "ar" ? k.ad_ar?.trim() || k.ad_tr : k.ad_tr;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mt-4 flex gap-3">
        <div className="flex-1 border border-line px-4 py-3">
          <p className="text-xs text-muted">{m("bugun")}</p>
          <p className="fiyat mt-0.5 font-bold text-brand-light">
            {fiyatYaz(bugunCiro)}
          </p>
          <p className="text-xs text-muted">
            {bugunAdet} {m("siparisAdet")}
          </p>
        </div>
        <div className="flex-1 border border-line px-4 py-3">
          <p className="text-xs text-muted">{m("son7Gun")}</p>
          <p className="fiyat mt-0.5 font-bold text-brand-light">
            {fiyatYaz(haftaCiro)}
          </p>
          <p className="text-xs text-muted">
            {haftaAdet} {m("siparisAdet")}
          </p>
        </div>
      </div>

      {enCokSatan.length > 0 && (
        <section className="mt-3 border border-line px-4 py-3">
          <h2 className="text-xs text-muted">{m("enCokSatan")}</h2>
          <ol className="mt-2 flex flex-col gap-1 text-sm">
            {enCokSatan.map((u) => (
              <li key={u.ad_tr} className="flex justify-between gap-3">
                <span className="truncate">{ad(u)}</span>
                <span className="fiyat shrink-0 text-muted">
                  {u.adet} {m("adet")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
