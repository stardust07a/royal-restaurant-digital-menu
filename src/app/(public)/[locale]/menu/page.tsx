import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import MasaUstBar from "@/components/menu/MasaUstBar";
import KategoriKutulari from "@/components/menu/KategoriKutulari";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";
import { kategorileriHazirla, type KategoriliMenu } from "@/lib/menu";
import { kamuMenuSonucuGetir } from "@/lib/kamu-menu";
import { ayarlariGetir, restoranAdi } from "@/lib/ayarlar";
import type { Dil } from "@/lib/tipler";
import { kamuSayfasiMetadata } from "@/lib/seo";

/** Menu verisi 60 saniye onbelleklenir; admin degisiklik yapinca tazelenir. */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return kamuSayfasiMetadata({
    locale: locale as Dil,
    yol: "/menu",
    baslik: t("menu.baslik"),
    aciklama: t("anasayfa.masaMenusuAciklama"),
    siteAdi: t("anasayfa.ustBaslik"),
  });
}

/**
 * Masa QR menusu — kategori secimi ve masa siparisi girisi.
 * Misafir urunleri sepetine ekler, son adimda masa numarasini yazar.
 */
export default async function MenuSayfasi({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dil = locale as Dil;
  const t = await getTranslations();

  let kategoriler: KategoriliMenu[] = [];
  let hataVar = false;
  let saltOkunur = false;
  try {
    const menuSonucu = await kamuMenuSonucuGetir();
    saltOkunur = menuSonucu.kaynak === "yerel";
    kategoriler = kategorileriHazirla(
      menuSonucu.veri,
      t("menu.cokSatanlar"),
      t("menu.cokSatanlar"),
    );
  } catch (e) {
    console.error("Masa menusu okunamadi:", e);
    hataVar = true;
  }

  const ayarlar = await ayarlariGetir();

  return (
    <>
      <MasaUstBar
        baslik={restoranAdi(ayarlar, locale)}
        altBaslik={t("menu.baslik")}
        logoUrl={ayarlar.logo_url}
      />
      <main id="ana-icerik" className="min-h-dvh pb-10">
      <section className="mx-4 mt-4 border border-brand-dark bg-brand px-5 py-6 text-white">
        <p className="etiket text-[#ffe0a0]">{t("anasayfa.ustBaslik")}</p>
        <h1 className="mt-2 text-3xl leading-tight font-black">{t("menu.baslik")}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/78">
          {t("anasayfa.masaMenusuAciklama")}
        </p>
      </section>

      {saltOkunur && (
        <SaltOkunurUyarisi
          whatsappNumarasi={ayarlar.whatsapp_numarasi}
          className="mx-auto mt-4 max-w-lg"
        />
      )}

      <div className="mx-auto max-w-lg px-4 py-6">
        {kategoriler.length > 0 ? (
          <KategoriKutulari
            kategoriler={kategoriler}
            dil={dil}
            temelYol="/menu"
          />
        ) : (
          <p className="py-20 text-center text-muted">
            {hataVar ? t("menu.hata") : t("menu.bosMenu")}
          </p>
        )}
      </div>
      </main>
    </>
  );
}
