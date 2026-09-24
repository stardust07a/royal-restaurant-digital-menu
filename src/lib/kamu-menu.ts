import "server-only";

import { cache } from "react";
import menuVerisi from "../../data/menu-verisi.json";
import {
  menuyuGetir,
  urunGetir,
  urunSluglari,
  type KategoriliMenu,
} from "./menu";
import type { Ekstra, Rozet, Secenek, Urun } from "./tipler";

interface YerelSecenek {
  ad_tr: string;
  ad_ar: string;
}

interface YerelEkstra extends YerelSecenek {
  fiyat: number;
}

interface YerelKategori {
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
  gorsel_url?: string | null;
}

interface YerelUrun {
  slug: string;
  kategori: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
  gorsel_url?: string | null;
  fiyat_masa: number;
  fiyat_paket: number;
  gramaj?: string | null;
  gramaj_ar?: string | null;
  kalori?: number | null;
  alerjenler?: string[];
  rozet?: string;
  stokta?: boolean;
  masa_aktif?: boolean;
  cikarilabilir?: string;
  ekstra?: string;
}

interface YerelMenuVerisi {
  cikarilabilir_sablonlari: Record<string, YerelSecenek[] | string>;
  ekstra_sablonlari: Record<string, YerelEkstra[] | string>;
  kategoriler: YerelKategori[];
  urunler: YerelUrun[];
}

const GECERLI_ROZETLER = new Set<Rozet>([
  "yok",
  "cok_satan",
  "yeni",
  "acili",
  "sefin_onerisi",
]);

const yerelVeri = menuVerisi as YerelMenuVerisi;

export type KamuMenuKaynagi = "supabase" | "yerel";

export interface KamuOkumaSonucu<T> {
  veri: T;
  kaynak: KamuMenuKaynagi;
}

function sayi(deger: unknown): number {
  const sonuc = typeof deger === "number" ? deger : Number(deger);
  return Number.isFinite(sonuc) ? Math.round(sonuc * 100) / 100 : 0;
}

function rozet(deger: string | undefined): Rozet {
  return GECERLI_ROZETLER.has(deger as Rozet) ? (deger as Rozet) : "yok";
}

function sablonOku<T>(
  tablo: Record<string, T[] | string>,
  sablonAdi: string | undefined,
): T[] {
  if (!sablonAdi || sablonAdi === "yok") return [];
  const sablon = tablo[sablonAdi];
  return Array.isArray(sablon) ? sablon : [];
}

function kategoriKimligi(slug: string): string {
  return `yerel-kategori:${slug}`;
}

function temelUrun(u: YerelUrun): Urun {
  const miktarKorunur =
    /(bütün|butun|yarım|yarim|kilo|kg)/iu.test(u.ad_tr) ||
    /(فروج|نصف|كيلو)/u.test(u.ad_ar) ||
    ["kizarmis-tavuk-pilav", "mangal-tavuk-pilav"].includes(u.slug);
  const masaIcinUygun =
    sayi(u.fiyat_masa) > 0 &&
    !/(^|\s)(1|bir)\s*(kg|kilo)(\s|$)/iu.test(`${u.ad_tr} ${u.gramaj ?? ""}`) &&
    u.slug !== "butun-mangal-tavuk";

  return {
    id: `yerel-urun:${u.slug}`,
    kategori_id: kategoriKimligi(u.kategori),
    slug: u.slug,
    sira: u.sira ?? 0,
    ad_tr: u.ad_tr,
    ad_ar: u.ad_ar,
    aciklama_tr: u.aciklama_tr ?? null,
    aciklama_ar: u.aciklama_ar ?? null,
    gorsel_url: u.gorsel_url ?? null,
    fiyat_masa: sayi(u.fiyat_masa),
    fiyat_paket: sayi(u.fiyat_paket),
    gramaj: miktarKorunur ? (u.gramaj ?? null) : null,
    gramaj_ar: miktarKorunur ? (u.gramaj_ar ?? null) : null,
    kalori: u.kalori ?? null,
    alerjenler: u.alerjenler ?? [],
    rozet: rozet(u.rozet),
    stokta: u.stokta ?? true,
    aktif: true,
    masa_aktif: u.masa_aktif ?? masaIcinUygun,
  };
}

function yerelMenuyuOlustur(): KategoriliMenu[] {
  const urunler = yerelVeri.urunler.map(temelUrun);

  return yerelVeri.kategoriler
    .map((kategori): KategoriliMenu => ({
      id: kategoriKimligi(kategori.slug),
      slug: kategori.slug,
      sira: kategori.sira ?? 0,
      ad_tr: kategori.ad_tr,
      ad_ar: kategori.ad_ar,
      aciklama_tr: kategori.aciklama_tr ?? null,
      aciklama_ar: kategori.aciklama_ar ?? null,
      gorsel_url: kategori.gorsel_url ?? null,
      aktif: true,
      urunler: urunler
        .filter((urun) => urun.kategori_id === kategoriKimligi(kategori.slug))
        .sort((a, b) => a.sira - b.sira),
    }))
    .filter((kategori) => kategori.urunler.length > 0)
    .sort((a, b) => a.sira - b.sira);
}

function yerelUrunuOlustur(slug: string): Urun | null {
  const kaynak = yerelVeri.urunler.find((urun) => urun.slug === slug);
  if (!kaynak) return null;

  const cikarilabilirler: Secenek[] = sablonOku(
    yerelVeri.cikarilabilir_sablonlari,
    kaynak.cikarilabilir,
  ).map((secenek, sira) => ({
    id: `yerel-cikarilabilir:${kaynak.slug}:${sira}`,
    sira,
    ad_tr: secenek.ad_tr,
    ad_ar: secenek.ad_ar,
  }));

  const ekstralar: Ekstra[] = sablonOku(
    yerelVeri.ekstra_sablonlari,
    kaynak.ekstra,
  ).map((ekstra, sira) => ({
    id: `yerel-ekstra:${kaynak.slug}:${sira}`,
    sira,
    ad_tr: ekstra.ad_tr,
    ad_ar: ekstra.ad_ar,
    fiyat: sayi(ekstra.fiyat),
    stokta: true,
  }));

  return { ...temelUrun(kaynak), cikarilabilirler, ekstralar };
}

function fallbackUyarisi(islem: string, hata: unknown): void {
  const neden = hata instanceof Error ? hata.message : String(hata);
  console.warn(
    `[public-menu] ${islem} Supabase'den okunamadi; data/menu-verisi.json kullaniliyor: ${neden}`,
  );
}

/**
 * Yalnizca public sayfa, metadata ve statik uretim okumasi icindir.
 * Siparis mutation'i ve admin kodu bu modulu import etmez; onlar DB
 * dogrulamasinda fail-closed kalir.
 */
export const kamuMenuSonucuGetir = cache(async function kamuMenuSonucuGetir(): Promise<
  KamuOkumaSonucu<KategoriliMenu[]>
> {
  try {
    return { veri: await menuyuGetir(), kaynak: "supabase" };
  } catch (hata) {
    fallbackUyarisi("menu", hata);
    return { veri: yerelMenuyuOlustur(), kaynak: "yerel" };
  }
});

/** Kaynak bilgisine ihtiyaci olmayan sitemap/statik okuma kolayligi. */
export const kamuMenuyuGetir = cache(async function kamuMenuyuGetir(): Promise<
  KategoriliMenu[]
> {
  return (await kamuMenuSonucuGetir()).veri;
});

/** Public urun detayi icin DB kesintisinde yerel, salt-okunur kopya. */
export const kamuUrunSonucuGetir = cache(async function kamuUrunSonucuGetir(
  slug: string,
): Promise<KamuOkumaSonucu<Urun | null>> {
  try {
    return { veri: await urunGetir(slug), kaynak: "supabase" };
  } catch (hata) {
    fallbackUyarisi(`urun (${slug})`, hata);
    return { veri: yerelUrunuOlustur(slug), kaynak: "yerel" };
  }
});

export const kamuUrunGetir = cache(async function kamuUrunGetir(
  slug: string,
): Promise<Urun | null> {
  return (await kamuUrunSonucuGetir(slug)).veri;
});

/** Public generateStaticParams/sitemap icin DB kesintisinde yerel slug'lar. */
export const kamuUrunSluglari = cache(async function kamuUrunSluglari(): Promise<string[]> {
  try {
    return await urunSluglari();
  } catch (hata) {
    fallbackUyarisi("urun slug listesi", hata);
    return yerelVeri.urunler.map((urun) => urun.slug);
  }
});
