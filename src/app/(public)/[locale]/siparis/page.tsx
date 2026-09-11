import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiparisUstBar from "@/components/siparis/SiparisUstBar";
import KategoriVeArama from "@/components/siparis/KategoriVeArama";
import SepeteGitCubugu from "@/components/siparis/SepeteGitCubugu";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";
import { kategorileriHazirla, type KategoriliMenu } from "@/lib/menu";
import { kamuMenuSonucuGetir } from "@/lib/kamu-menu";
import { ayarlariGetir, acikMi, kapaliMesaji, restoranAdi } from "@/lib/ayarlar";
import { fiyatYaz } from "@/lib/sabitler";
import { kamuSayfasiMetadata } from "@/lib/seo";
import type { Dil } from "@/lib/tipler";

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
    yol: "/siparis",
    baslik: t("anasayfa.paketSiparis"),
    aciklama: t("anasayfa.paketSiparisAciklama"),
    siteAdi: t("anasayfa.ustBaslik"),
  });
}

/** Paket siparis giris sayfasi: arama + kategori kartlari. */
export default async function SiparisSayfasi({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  let kategoriler: KategoriliMenu[] = [];
  let hataVar = false;
  let saltOkunur = false;
  try {
    const menuSonucu = await kamuMenuSonucuGetir();
    saltOkunur = menuSonucu.kaynak === "yerel";
    // Manuel etiketli "Onerilenler" sanal kategorisi listenin basinda
    kategoriler = kategorileriHazirla(
      menuSonucu.veri,
      t("menu.cokSatanlar"),
      t("menu.cokSatanlar"),
    );
  } catch (e) {
    console.error("Siparis menusu okunamadi:", e);
    hataVar = true;
  }

  const ayarlar = await ayarlariGetir();
  const acik = acikMi(ayarlar);
  const kapaliNot = kapaliMesaji(ayarlar, locale);

  return (
    <>
      <SiparisUstBar
        restoranAdi={restoranAdi(ayarlar, locale)}
        acik={acik}
        logoUrl={ayarlar.logo_url}
      />
      <main id="ana-icerik" className="min-h-dvh">
      <section className="mx-4 mt-4 border border-brand-dark bg-brand px-5 py-6 text-white">
        <p className="etiket text-[#ffe0a0]">{t("anasayfa.ustBaslik")}</p>
        <h1 className="mt-2 text-3xl leading-tight font-black">{t("anasayfa.paketSiparis")}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/78">
          {t("anasayfa.paketSiparisAciklama")}
        </p>
      </section>

      {saltOkunur && (
        <SaltOkunurUyarisi
          whatsappNumarasi={ayarlar.whatsapp_numarasi}
          className="mx-auto mt-4 max-w-lg"
        />
      )}

      {/* Kapaliyken musteri bosuna sepet doldurmasin diye en ustte uyari */}
      {!acik && (
        <div className="mx-auto mt-4 max-w-lg px-4">
          <p className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
            {kapaliNot || t("siparis.suAnKapali")}
          </p>
        </div>
      )}

      <section
        aria-label={t("siparis.paketKosullariBaslik")}
        className="mx-auto mt-4 max-w-lg px-4"
      >
        <div className="border border-line bg-card px-4 py-3 text-sm">
          <p className="font-semibold text-ink">
            {t("siparis.paketKosullari", {
              ucret: fiyatYaz(ayarlar.servis_ucreti),
              minimum: fiyatYaz(ayarlar.minimum_siparis),
            })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("siparis.adresOnBilgi")}
          </p>
        </div>
      </section>

      {kategoriler.length > 0 ? (
        <KategoriVeArama kategoriler={kategoriler} />
      ) : (
        <p className="mx-auto max-w-lg px-4 py-20 text-center text-muted">
          {hataVar ? t("menu.hata") : t("menu.bosMenu")}
        </p>
      )}

      <SepeteGitCubugu />
      </main>
    </>
  );
}
