import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiparisUstBar from "@/components/siparis/SiparisUstBar";
import KategoriSeridi from "@/components/siparis/KategoriSeridi";
import UrunKarti from "@/components/siparis/UrunKarti";
import SepeteGitCubugu from "@/components/siparis/SepeteGitCubugu";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";
import { kategorileriHazirla } from "@/lib/menu";
import { kamuMenuSonucuGetir, kamuMenuyuGetir } from "@/lib/kamu-menu";
import { ayarlariGetir, acikMi, restoranAdi } from "@/lib/ayarlar";
import { ad, kategoriAciklamasi } from "@/lib/dil";
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
    menu,
    t("menu.cokSatanlar"),
    t("menu.cokSatanlar"),
  );
  const secili = kategoriler.find((deger) => deger.slug === kategori);
  const baslik = secili ? ad(secili, dil) : t("anasayfa.paketSiparis");
  const aciklamaMetni =
    (secili && kategoriAciklamasi(secili, dil)) ||
    t("anasayfa.paketSiparisAciklama");

  return kamuSayfasiMetadata({
    locale: dil,
    yol: `/siparis/${kategori}`,
    baslik,
    aciklama: aciklamaMetni,
    siteAdi: t("anasayfa.ustBaslik"),
    gorsel: secili?.gorsel_url ?? secili?.urunler[0]?.gorsel_url,
    indeksle: Boolean(secili),
  });
}

/** Kategori sayfalari derleme aninda uretilsin — masada bekleme olmasin. */
export async function generateStaticParams() {
  const kategoriler = kategorileriHazirla(await kamuMenuyuGetir());
  return kategoriler.map((k) => ({ kategori: k.slug }));
}

/** Bir kategorinin urun listesi. */
export default async function KategoriSayfasi({
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
    menuSonucu.veri,
    t("menu.cokSatanlar"),
    t("menu.cokSatanlar"),
  );
  const secili = kategoriler.find((k) => k.slug === kategori);
  if (!secili) notFound();

  const ayarlar = await ayarlariGetir();
  const metin = kategoriAciklamasi(secili, dil);

  return (
    <>
      <SiparisUstBar
        restoranAdi={restoranAdi(ayarlar, locale)}
        acik={acikMi(ayarlar)}
        geriLinki="/siparis"
      />
      <main id="ana-icerik" className="min-h-dvh">
      {menuSonucu.kaynak === "yerel" && (
        <SaltOkunurUyarisi
          whatsappNumarasi={ayarlar.whatsapp_numarasi}
          className="mx-auto mt-4 max-w-lg"
        />
      )}
      <KategoriSeridi kategoriler={kategoriler} aktifSlug={kategori} />

      <div className="mx-auto max-w-lg px-4 pb-28">
        <h1 className="pt-5 text-xl font-bold text-accent">
          {ad(secili, dil)}
        </h1>
        {metin && <p className="mt-1 text-sm text-muted">{metin}</p>}

        <ul className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          {secili.urunler.map((u) => (
            <UrunKarti key={u.id} urun={u} dil={dil} />
          ))}
        </ul>

        {secili.urunler.length === 0 && (
          <p className="py-20 text-center text-muted">{t("menu.bosMenu")}</p>
        )}
      </div>

      <SepeteGitCubugu />
      </main>
    </>
  );
}
