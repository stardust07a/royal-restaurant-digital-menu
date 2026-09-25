"use client";

import { useLocale } from "next-intl";
import type { KategoriliMenu } from "@/lib/menu";
import type { Dil } from "@/lib/tipler";
import { kategoriAciklamasi } from "@/lib/dil";
import UrunKarti from "@/components/siparis/UrunKarti";
import SepeteGitCubugu from "@/components/siparis/SepeteGitCubugu";
import KategoriSeridi from "@/components/siparis/KategoriSeridi";

/**
 * Masa menusunun secili kategori gorunumu.
 *
 * Ustte yapiskan kategori seridi (her biri ayri sayfa), altta o kategorinin
 * urunleri. Urune dokununca masa fiyatli detay ve secenekler acilir; musteri
 * urunu masa sepetine ekleyip masa numarasiyla siparis olusturabilir.
 */
export default function MasaMenusu({
  kategoriler,
  aktifSlug,
  temelYol,
}: {
  kategoriler: KategoriliMenu[];
  aktifSlug: string;
  temelYol: string;
}) {
  const dil = useLocale() as Dil;

  const secili = kategoriler.find((k) => k.slug === aktifSlug);
  const metin = secili ? kategoriAciklamasi(secili, dil) : "";

  return (
    <>
      <KategoriSeridi
        kategoriler={kategoriler}
        aktifSlug={aktifSlug}
        temelYol={temelYol}
      />

      {/* ---------- URUNLER ---------- */}
      <div className="menu-kapsayici pb-20">
        {metin && <p className="mt-4 break-words rounded-2xl bg-surface px-4 py-3 text-sm leading-relaxed text-muted">{metin}</p>}

        <ul className="kart-izgarasi mt-5">
          {(secili?.urunler ?? []).map((u) => (
            <UrunKarti key={u.id} urun={u} dil={dil} tur="masa" temelYol={temelYol} />
          ))}
        </ul>
      </div>

      <SepeteGitCubugu temelYol={temelYol} tur="masa" />
    </>
  );
}
