import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiparisUstBar from "@/components/siparis/SiparisUstBar";
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
    yol: `/siparis/urun/${slug}`,
    baslik: urun ? ad(urun, dil) : t("anasayfa.paketSiparis"),
    aciklama:
      (urun && aciklama(urun, dil)) || t("anasayfa.paketSiparisAciklama"),
    siteAdi: t("anasayfa.ustBaslik"),
    gorsel: urun?.gorsel_url,
    indeksle: Boolean(urun),
  });
}

/** 59 urun sayfasi derleme aninda uretilir; sonra 60 sn'de bir tazelenir. */
export async function generateStaticParams() {
  const sluglar = await kamuUrunSluglari();
  return sluglar.map((slug) => ({ slug }));
}

/** Paket siparis urun detayi: cikarilacaklar, ekstralar, not, adet. */
export default async function UrunSayfasi({
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
      <SiparisUstBar
        restoranAdi={restoranAdi(ayarlar, locale)}
        acik={acikMi(ayarlar)}
        geriLinki={kategori ? `/siparis/${kategori.slug}` : "/siparis"}
      />
      <main id="ana-icerik" className="min-h-dvh">
      <UrunDetay
        urun={urun}
        kategoriSlug={kategori?.slug ?? ""}
        acik={acikMi(ayarlar)}
        saltOkunur={
          urunSonucu.kaynak === "yerel" || menuSonucu.kaynak === "yerel"
        }
        whatsappNumarasi={ayarlar.whatsapp_numarasi}
      />
      </main>
    </>
  );
}
