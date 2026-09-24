import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import MasaUstBar from "@/components/menu/MasaUstBar";
import MasaMenusu from "@/components/menu/MasaMenusu";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";
import { kategorileriHazirla, masaMenusunuFiltrele } from "@/lib/menu";
import { kamuMenuSonucuGetir, kamuMenuyuGetir } from "@/lib/kamu-menu";
import { ayarlariGetir, restoranAdi } from "@/lib/ayarlar";
import { ad, aciklama } from "@/lib/dil";
import { kamuSayfasiMetadata } from "@/lib/seo";
import type { Dil } from "@/lib/tipler";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; kategori: string }>;
}): Promise<Metadata> {
  const { locale, kategori } = await params;
  const dil = locale as Dil;
  const [t, menu] = await Promise.all([
    getTranslations({ locale }),
    kamuMenuyuGetir(),
  ]);
  const kategoriler = kategorileriHazirla(
    masaMenusunuFiltrele(menu),
    t("menu.cokSatanlar"),
    t("menu.cokSatanlar"),
  );
  const secili = kategoriler.find((deger) => deger.slug === kategori);
  const baslik = secili ? ad(secili, dil) : t("menu.baslik");
  const aciklamaMetni =
    (secili && aciklama(secili, dil)) || t("anasayfa.masaMenusuAciklama");

  return kamuSayfasiMetadata({
    locale: dil,
    yol: `/menu/${kategori}`,
    baslik,
    aciklama: aciklamaMetni,
    siteAdi: t("anasayfa.ustBaslik"),
    gorsel: secili?.gorsel_url ?? secili?.urunler[0]?.gorsel_url,
    indeksle: false,
  });
}

export async function generateStaticParams() {
  const kategoriler = kategorileriHazirla(masaMenusunuFiltrele(await kamuMenuyuGetir()));
  return kategoriler.map((k) => ({ kategori: k.slug }));
}

/** Masa menusunde tek kategorinin urunleri ve masa sepetine ekleme akisi. */
export default async function MenuKategoriSayfasi({
  params,
}: {
  params: Promise<{ locale: string; kategori: string }>;
}) {
  const { locale, kategori } = await params;
  setRequestLocale(locale);
  const dil = locale as Dil;
  const t = await getTranslations();

  const menuSonucu = await kamuMenuSonucuGetir();
  const kategoriler = kategorileriHazirla(
    masaMenusunuFiltrele(menuSonucu.veri),
    t("menu.cokSatanlar"),
    t("menu.cokSatanlar"),
  );
  const secili = kategoriler.find((k) => k.slug === kategori);
  if (!secili) notFound();

  const ayarlar = await ayarlariGetir();

  return (
    <>
      <MasaUstBar
        baslik={ad(secili, dil)}
        altBaslik={restoranAdi(ayarlar, locale)}
        geriLinki="/menu"
      />
      <main id="ana-icerik" className="min-h-dvh">
        <h1 className="sr-only">{ad(secili, dil)}</h1>
        {menuSonucu.kaynak === "yerel" && (
          <SaltOkunurUyarisi
            whatsappNumarasi={ayarlar.whatsapp_numarasi}
            className="mx-auto mt-4 max-w-lg"
          />
        )}
        <MasaMenusu
          kategoriler={kategoriler}
          aktifSlug={kategori}
          temelYol="/menu"
        />
      </main>
    </>
  );
}
