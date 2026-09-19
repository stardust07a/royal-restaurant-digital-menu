import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import MasaUstBar from "@/components/menu/MasaUstBar";
import SepetGovdesi from "@/components/siparis/SepetGovdesi";
import { ayarlariGetir, acikMi, kapaliMesaji, restoranAdi } from "@/lib/ayarlar";
import { kamuMenuSonucuGetir } from "@/lib/kamu-menu";
import { masaOturumuGetir } from "@/lib/masa-erisim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Masa siparisi sepeti: teslimat ucreti yok, ad/telefon yerine masa numarasi. */
export default async function MasaSepetSayfasi({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [ayarlar, menuSonucu, masaNo] = await Promise.all([
    ayarlariGetir(),
    kamuMenuSonucuGetir(),
    masaOturumuGetir(),
  ]);
  const acik = acikMi(ayarlar);
  const adi = restoranAdi(ayarlar, locale);

  return (
    <>
      <MasaUstBar baslik={adi} geriLinki="/menu" />
      <main id="ana-icerik" className="min-h-dvh">

      <h1 className="mx-auto max-w-lg px-4 pt-5 text-xl font-bold">
        {t("siparis.masaSiparisi")}
      </h1>

      {!acik && (
        <div className="mx-auto mt-3 max-w-lg px-4">
          <p className="border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
            {kapaliMesaji(ayarlar, locale) || t("siparis.suAnKapali")}
          </p>
        </div>
      )}

      <SepetGovdesi
        restoranAdi={adi}
        servisUcreti={0}
        minimumSiparis={0}
        acik={acik}
        tur="masa"
        masaNo={masaNo ?? ""}
        temelYol="/menu"
        saltOkunur={menuSonucu.kaynak === "yerel"}
        whatsappNumarasi={ayarlar.whatsapp_numarasi}
      />
      </main>
    </>
  );
}
