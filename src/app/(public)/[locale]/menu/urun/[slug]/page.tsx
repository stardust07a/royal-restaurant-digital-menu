import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import MasaUstBar from "@/components/menu/MasaUstBar";
import UrunDetay from "@/components/siparis/UrunDetay";
import {
  kamuMenuSonucuGetir,
  kamuUrunGetir,
  kamuUrunSonucuGetir,
  kamuUrunSluglari,
} from "@/lib/kamu-menu";
import { ayarlariGetir, acikMi, restoranAdi } from "@/lib/ayarlar";
import { ad, aciklama } from "@/lib/dil";
import { kamuSayfasiMetadata } from "@/lib/seo";
import type { Dil } from "@/lib/tipler";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const dil = locale as Dil;
  const [t, urun] = await Promise.all([
    getTranslations({ locale }),
    kamuUrunGetir(slug),
  ]);

  return kamuSayfasiMetadata({
    locale: dil,
    yol: `/menu/urun/${slug}`,
    baslik: urun ? ad(urun, dil) : t("menu.baslik"),
    aciklama:
      (urun && aciklama(urun, dil)) || t("anasayfa.masaMenusuAciklama"),
    siteAdi: t("anasayfa.ustBaslik"),
    gorsel: urun?.gorsel_url,
    indeksle: false,
  });
}

export async function generateStaticParams() {
  const sluglar = await kamuUrunSluglari();
  return sluglar.map((slug) => ({ slug }));
}

/** Masa menusu urun detayi — MASA fiyatiyla siparis verilir. */
export default async function MasaUrunSayfasi({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const urunSonucu = await kamuUrunSonucuGetir(slug);
  const urun = urunSonucu.veri;
  if (!urun) notFound();

  const [menuSonucu, ayarlar] = await Promise.all([
    kamuMenuSonucuGetir(),
    ayarlariGetir(),
  ]);
  const kategoriler = menuSonucu.veri;
  const kategori = kategoriler.find((k) => k.id === urun.kategori_id);

  return (
    <>
      <MasaUstBar
        baslik={restoranAdi(ayarlar, locale)}
        geriLinki={kategori ? `/menu/${kategori.slug}` : "/menu"}
      />
      <main id="ana-icerik" className="min-h-dvh">
      <UrunDetay
        urun={urun}
        kategoriSlug={kategori?.slug ?? ""}
        acik={acikMi(ayarlar)}
        tur="masa"
        temelYol="/menu"
        saltOkunur={
          urunSonucu.kaynak === "yerel" || menuSonucu.kaynak === "yerel"
        }
        whatsappNumarasi={ayarlar.whatsapp_numarasi}
      />
      </main>
    </>
  );
}
