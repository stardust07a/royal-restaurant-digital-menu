import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiparisUstBar from "@/components/siparis/SiparisUstBar";
import SepetGovdesi from "@/components/siparis/SepetGovdesi";
import { ayarlariGetir, acikMi, kapaliMesaji, restoranAdi } from "@/lib/ayarlar";
import { kamuMenuSonucuGetir } from "@/lib/kamu-menu";

export const revalidate = 60;
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Sepet, musteri bilgisi (sadece ad + telefon) ve WhatsApp gonderimi. */
export default async function SepetSayfasi({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [ayarlar, menuSonucu] = await Promise.all([
    ayarlariGetir(),
    kamuMenuSonucuGetir(),
  ]);
  const acik = acikMi(ayarlar);
  const kapaliNot = kapaliMesaji(ayarlar, locale);
  const adi = restoranAdi(ayarlar, locale);

  return (
    <>
      <SiparisUstBar restoranAdi={adi} acik={acik} geriLinki="/siparis" />
      <main id="ana-icerik" className="min-h-dvh">

      <h1 className="mx-auto max-w-3xl px-4 pt-6 text-2xl font-black">
        {t("ortak.sepet")}
      </h1>

      {!acik && (
        <div className="mx-auto mt-3 max-w-3xl px-4">
          <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
            {kapaliNot || t("siparis.suAnKapali")}
          </p>
        </div>
      )}

      <SepetGovdesi
        restoranAdi={adi}
        servisUcreti={ayarlar.servis_ucreti}
        minimumSiparis={ayarlar.minimum_siparis}
        acik={acik}
        saltOkunur={menuSonucu.kaynak === "yerel"}
        whatsappNumarasi={ayarlar.whatsapp_numarasi}
      />
      </main>
    </>
  );
}
