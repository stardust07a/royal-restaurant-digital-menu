import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import DilDegistir from "@/components/DilDegistir";
import Belirme from "@/components/Belirme";
import { MarkaLogosuIcerigi } from "@/components/menu/MarkaLogosu";
import IletisimGorseli from "@/components/menu/IletisimGorseli";
import BolumMenusu from "@/components/anasayfa/BolumMenusu";
import Galeri from "@/components/anasayfa/Galeri";
import CalismaSaatleriTablosu from "@/components/anasayfa/CalismaSaatleriTablosu";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";
import { kamuMenuSonucuGetir } from "@/lib/kamu-menu";
import { ayarlariGetir, acikMi, restoranAdi, ayarMetni } from "@/lib/ayarlar";
import { ad, kategoriAciklamasi } from "@/lib/dil";
import { AYARLAR as VARSAYILAN, fiyatYaz } from "@/lib/sabitler";
import { sosyalGosterim, sosyalUrlDogrula } from "@/lib/sosyal-url";
import { httpsUrlDogrula } from "@/lib/guvenli-url";
import {
  guvenliJsonLd,
  kamuSayfasiMetadata,
  mutlakHttpsUrl,
  SITE_ORIGIN,
  yerelUrl,
} from "@/lib/seo";
import type { Dil, Urun } from "@/lib/tipler";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dil = locale as Dil;
  const t = await getTranslations({ locale });

  return kamuSayfasiMetadata({
    locale: dil,
    baslik: t("site.baslik"),
    aciklama: t("site.aciklama"),
    siteAdi: t("anasayfa.ustBaslik"),
    anaSayfa: true,
  });
}

/** Google Haritalar gomulu cerceve — API anahtari gerektirmeyen bicim. */
function haritaGomme(adres: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(adres)}&output=embed`;
}

/** Eski/veri tabani disi degerler kart boyutunu bozamaz. */
function iletisimIkonu(deger: string | null, varsayilan: string): string {
  const ikon = deger?.trim() || varsayilan;
  return Array.from(ikon).slice(0, 4).join("");
}

export default async function AnaSayfa({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dil = locale as Dil;
  const t = await getTranslations();

  const [ayarlar, menuSonucu] = await Promise.all([
    ayarlariGetir(),
    kamuMenuSonucuGetir(),
  ]);
  const kategoriler = menuSonucu.veri;
  const saltOkunur = menuSonucu.kaynak === "yerel";
  const acik = acikMi(ayarlar);
  const adi = restoranAdi(ayarlar, locale);
  const tumUrunler = [
    ...new Map(kategoriler.flatMap((k) => k.urunler).map((u) => [u.id, u])).values(),
  ];

  // Öne çıkanlar: cok satan rozetli urunler
  const oneCikanlar: Urun[] = tumUrunler
    .filter((u) => u.rozet === "cok_satan" && u.stokta)
    .slice(0, 10);

  // Menudeki tekrarsiz fotograflar — kapak, menu kartlari ve galeri buradan
  const fotograflar = [
    ...new Set(tumUrunler.map((u) => u.gorsel_url).filter(Boolean)),
  ] as string[];

  const kapakGorseli = fotograflar[0] ?? null;
  const menuKapaklari = [fotograflar[1]];
  const galeri = fotograflar.slice(3, 9);

  const adres = dil === "ar" ? ayarlar.adres_ar : ayarlar.adres_tr;
  const haritaLinki = httpsUrlDogrula(ayarlar.harita_linki);
  const telefon = ayarlar.telefon ?? "";
  const whatsapp = (ayarlar.whatsapp_numarasi ?? "").replace(/[^0-9]/g, "");
  const logo = ayarlar.logo_url?.trim() || null;
  const instagram = sosyalUrlDogrula(ayarlar.instagram, "instagram");
  const tiktok = sosyalUrlDogrula(ayarlar.tiktok, "tiktok");
  const facebook = sosyalUrlDogrula(ayarlar.facebook, "facebook");
  const sosyalProfiller = [
    {
      platform: "Instagram",
      url: instagram,
      ikonUrl: ayarlar.instagram_ikon_url,
      simge: iletisimIkonu(ayarlar.instagram_ikonu, VARSAYILAN.instagramIkonu),
    },
    {
      platform: "TikTok",
      url: tiktok,
      ikonUrl: ayarlar.tiktok_ikon_url,
      simge: iletisimIkonu(ayarlar.tiktok_ikonu, VARSAYILAN.tiktokIkonu),
    },
    {
      platform: "Facebook",
      url: facebook,
      ikonUrl: ayarlar.facebook_ikon_url,
      simge: iletisimIkonu(ayarlar.facebook_ikonu, VARSAYILAN.facebookIkonu),
    },
  ].filter(
    (profil): profil is {
      platform: string;
      url: string;
      ikonUrl: string | null;
      simge: string;
    } => Boolean(profil.url),
  );

  const restoranKimligi = `${SITE_ORIGIN}/#restaurant`;
  const menuKimligi = `${yerelUrl(dil, "/siparis")}#menu`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": restoranKimligi,
        name: adi,
        url: yerelUrl(dil),
        ...(telefon ? { telephone: telefon } : {}),
        ...(adres
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: adres,
              },
            }
          : {}),
        ...(mutlakHttpsUrl(logo) ? { logo: mutlakHttpsUrl(logo) } : {}),
        ...(sosyalProfiller.length > 0
          ? { sameAs: sosyalProfiller.map((profil) => profil.url) }
          : {}),
        hasMenu: { "@id": menuKimligi },
      },
      {
        "@type": "Menu",
        "@id": menuKimligi,
        name: t("menu.baslik"),
        url: yerelUrl(dil, "/siparis"),
        inLanguage: dil === "ar" ? "ar" : "tr",
        hasMenuSection: kategoriler.map((kategori) => ({
          "@type": "MenuSection",
          name: ad(kategori, dil),
          ...(kategoriAciklamasi(kategori, dil)
            ? { description: kategoriAciklamasi(kategori, dil) }
            : {}),
          hasMenuItem: kategori.urunler.map((urun) => ({
            "@type": "MenuItem",
            name: ad(urun, dil),
            url: yerelUrl(dil, `/siparis/urun/${urun.slug}`),
            ...((dil === "ar" ? urun.aciklama_ar : urun.aciklama_tr)
              ? {
                  description:
                    dil === "ar" ? urun.aciklama_ar : urun.aciklama_tr,
                }
              : {}),
            ...(mutlakHttpsUrl(urun.gorsel_url)
              ? { image: mutlakHttpsUrl(urun.gorsel_url) }
              : {}),
            offers: {
              "@type": "Offer",
              price: urun.fiyat_paket,
              priceCurrency: "TRY",
              availability: urun.stokta
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          })),
        })),
      },
    ],
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: guvenliJsonLd(jsonLd) }}
    />
    <main id="ana-icerik">
      {saltOkunur && (
        <SaltOkunurUyarisi
          whatsappNumarasi={ayarlar.whatsapp_numarasi}
          className="mx-auto mt-4 max-w-3xl"
        />
      )}
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[92svh] overflow-hidden bg-ink px-5 pb-10 pt-24 text-bg sm:min-h-[88svh] sm:px-8">
        {kapakGorseli && (
          <Image
            src={kapakGorseli}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,44,40,.42)_0%,rgba(5,35,32,.82)_55%,rgba(5,27,25,.98)_100%)]"
        />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold tracking-[0.16em] text-white backdrop-blur" translate="no">
            ROYAL
          </span>
          <div className="flex items-center gap-2 text-ink">
          <DilDegistir />
          <BolumMenusu
            bolumler={[
              { id: "menuler", etiket: t("anasayfa.menuler") },
              { id: "hakkimizda", etiket: t("anasayfa.hakkimizda") },
              { id: "one-cikanlar", etiket: t("anasayfa.oneCikanlar") },
              { id: "galeri", etiket: t("anasayfa.galeri") },
              { id: "konum", etiket: t("anasayfa.konumSaatler") },
              { id: "iletisim", etiket: t("anasayfa.iletisim") },
            ]}
          />
          </div>
        </div>

        <div className="relative z-[1] mx-auto flex w-full max-w-3xl flex-col items-center justify-end pt-10 text-center">
          <div className="hero-logo-gir relative mb-5 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-accent/80 bg-white shadow-[0_18px_60px_rgba(0,0,0,.35)] sm:h-40 sm:w-40">
            <MarkaLogosuIcerigi
              logoUrl={logo}
              alt={t("anasayfa.logoAlt", { ad: adi })}
              priority
              sizes="160px"
              imageClassName="object-contain"
              fallbackClassName="flex flex-col items-center justify-center text-brand"
              fallbackCrownClassName="-mb-1 text-[18px] text-accent"
              fallbackTextClassName="text-4xl font-black leading-none"
            />
          </div>

          <div className="hero-metin-gir">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <p className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink">
                <span
                  aria-hidden
                  className={`inline-block h-2.5 w-2.5 rounded-full ${acik ? "bg-emerald-500" : "bg-danger"}`}
                />
                {acik ? t("ortak.acik") : t("ortak.kapali")}
              </p>
            </div>
            <h1 className="mx-auto max-w-2xl text-balance text-[2.65rem] leading-[1.02] font-black text-white drop-shadow-sm sm:text-6xl">
              {ayarMetni(ayarlar, "hero_baslik", locale, t("anasayfa.baslik"))}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/82 sm:text-lg">
              {ayarMetni(ayarlar, "hero_alt", locale, t("anasayfa.altBaslik"))}
            </p>
          </div>

          <div className="hero-eylem-gir mt-8 w-full max-w-md">
          <Link
            href="/siparis"
            className="flex min-h-15 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-extrabold text-white shadow-[0_14px_34px_rgba(0,0,0,.25)] transition-[background-color,transform] duration-200 hover:bg-[#b17c0b] active:scale-[0.98]"
          >
            {t("anasayfa.paketSiparis")}
            <span aria-hidden className="rtl:-scale-x-100">→</span>
          </Link>
          </div>
        </div>
      </section>

      {/* ================= BILGI SERIDI ================= */}
      <section className="relative z-10 -mt-1 bg-brand px-4 py-4 text-white shadow-[0_12px_30px_rgba(8,119,110,.2)]">
        <ul className="mx-auto grid max-w-3xl grid-cols-3 gap-2 text-center">
          {[
            ["🌍", t("anasayfa.ozellik1")],
            ["🍽️", t("anasayfa.ozellik2")],
            ["💬", t("anasayfa.ozellik3")],
          ].map(([ikon, o]) => (
            <li key={o} className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-white/10 px-2 py-2.5">
              <span aria-hidden className="text-lg">{ikon}</span>
              <span className="text-[0.68rem] leading-tight font-bold sm:text-xs">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ================= IKI MENU ================= */}
      <section id="menuler" className="scroll-mt-4 bg-surface/70 px-5 py-18 sm:px-6">
        <Belirme className="mx-auto max-w-3xl">
          <p className="etiket text-accent">{t("anasayfa.menuler")}</p>
          <h2 className="mt-2 max-w-xl text-3xl leading-tight font-black sm:text-4xl">
            {t("anasayfa.menulerBaslik")}
          </h2>
          <ul className="mt-8 grid gap-5">
            {[
              {
                href: "/siparis" as const,
                baslik: t("anasayfa.paketSiparis"),
                metin: t("anasayfa.paketSiparisAciklama"),
                eylem: t("anasayfa.paketMenusunuAc"),
                gorsel: menuKapaklari[0],
              },
            ].map((k) => (
              <li key={k.href} className="flex min-w-0">
                <Link
                  href={k.href}
                  className="kart-derinlik kart-yuksel group flex min-w-0 w-full flex-col overflow-hidden rounded-3xl border border-white/80 bg-card"
                >
                  <div className="relative aspect-[5/3] w-full overflow-hidden bg-surface">
                    {k.gorsel && (
                      <Image
                        src={k.gorsel}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 340px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                    <span className="absolute bottom-3 start-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-ink shadow-sm">
                      🛵
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-5">
                    <p className="text-xl font-black">{k.baslik}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{k.metin}</p>
                    <span className="mt-5 flex items-center gap-2 text-sm font-extrabold text-brand">
                      {k.eylem}
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 rtl:-scale-x-100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Belirme>
      </section>

      {/* ================= HAKKIMIZDA ================= */}
      <section id="hakkimizda" className="relative scroll-mt-4 overflow-hidden bg-ink px-5 py-18 text-white sm:px-6">
        <Belirme className="relative mx-auto max-w-3xl">
          <p className="etiket text-[#d7aa48]">{t("anasayfa.hakkimizda")}</p>
          <h2 className="mt-4 max-w-2xl text-3xl leading-[1.15] font-black sm:text-4xl">
            {ayarMetni(
              ayarlar,
              "hakkimizda_baslik",
              locale,
              t("anasayfa.hakkimizdaBaslik"),
            )}
          </h2>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/72">
            {ayarMetni(
              ayarlar,
              "hakkimizda_metin",
              locale,
              t("anasayfa.hakkimizdaMetin"),
            )}
          </p>
        </Belirme>
      </section>

      {/* ================= ÖNE ÇIKANLAR ================= */}
      {oneCikanlar.length > 0 && (
        <section id="one-cikanlar" className="scroll-mt-4 py-18">
          <div className="mx-auto max-w-3xl px-6">
            <p className="etiket text-accent">{t("anasayfa.oneCikanlar")}</p>
            <h2 className="mt-2 text-3xl font-black">{t("anasayfa.oneCikanlarBaslik")}</h2>
          </div>

          {/* Yatay kaydirmali serit */}
          <ul className="kaydir-gizle mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
            {oneCikanlar.map((u, i) => (
              <li key={u.id} className="w-44 shrink-0 snap-start">
                {/* Kademeli giris: her kart 60 ms sonra belirir */}
                <Belirme gecikme={i * 60} className="h-full">
                <Link
                  href={`/siparis/urun/${u.slug}`}
                  className="kart-derinlik kart-yuksel group flex h-full flex-col overflow-hidden rounded-2xl border border-line/70 bg-card active:bg-surface"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-surface">
                    {u.gorsel_url ? (
                      <Image
                        src={u.gorsel_url}
                        alt=""
                        fill
                        sizes="176px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-full w-full items-center justify-center text-xl font-bold text-muted/40"
                      >
                        R
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-3.5 py-3">
                    <p className="text-sm font-semibold leading-snug">
                      {ad(u, dil)}
                    </p>
                    <p className="fiyat mt-auto whitespace-nowrap pt-2 font-bold text-brand">
                      {fiyatYaz(u.fiyat_paket)}
                    </p>
                  </div>
                </Link>
                </Belirme>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ================= GALERİ ================= */}
      {galeri.length > 0 && (
        <section id="galeri" className="scroll-mt-4 bg-surface/70 px-6 py-18">
          <Belirme className="mx-auto max-w-3xl">
            <p className="etiket text-accent">{t("anasayfa.galeri")}</p>
            <h2 className="mt-2 text-3xl font-black">{t("anasayfa.galeriBaslik")}</h2>
            <Galeri gorseller={galeri} />
          </Belirme>
        </section>
      )}

      {/* ================= KONUM & SAATLER ================= */}
      <section id="konum" className="scroll-mt-4 px-5 py-18 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="etiket text-accent">{t("anasayfa.konumSaatler")}</p>
          <h2 className="mt-2 text-3xl font-black">{t("anasayfa.konumBaslik")}</h2>

          {adres && <p className="mt-4 text-lg leading-snug">{adres}</p>}

          {adres && (
            <div className="kart-derinlik mt-6 aspect-4/3 w-full overflow-hidden rounded-3xl border border-line sm:aspect-[16/9]">
              <iframe
                src={haritaGomme(adres)}
                title={t("anasayfa.konumSaatler")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full"
                suppressHydrationWarning
              />
            </div>
          )}

          {haritaLinki && (
            <a
              href={haritaLinki}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-ink px-6 font-bold text-white transition-[background-color,transform] duration-200 hover:bg-brand active:scale-[0.99]"
            >
              <span aria-hidden>📍</span>
              {t("anasayfa.yolTarifi")}
            </a>
          )}

          <CalismaSaatleriTablosu saatler={ayarlar.calisma_saatleri} />
        </div>
      </section>

      {/* ================= İLETİŞİM ================= */}
      <section id="iletisim" className="scroll-mt-4 bg-brand px-5 py-18 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="etiket text-[#ffe0a0]">{t("anasayfa.iletisim")}</p>
          <h2 className="mt-2 text-3xl font-black">{t("anasayfa.iletisimBaslik")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            {t("anasayfa.iletisimAlt")}
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {telefon && (
              <li>
                <a
                  href={`tel:${telefon}`}
                  className="group flex min-h-36 flex-col justify-between rounded-3xl border border-white/16 bg-white/10 p-4 backdrop-blur transition-[background-color,transform] duration-200 hover:bg-white/16 active:scale-[0.98]"
                >
                  <span aria-hidden className="relative flex h-11 w-11 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl bg-white text-lg leading-none shadow-sm">
                    <IletisimGorseli
                      url={ayarlar.telefon_ikon_url}
                      simge={iletisimIkonu(ayarlar.telefon_ikonu, VARSAYILAN.telefonIkonu)}
                    />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-white/65">{t("siparis.telefon")}</span>
                    <bdi dir="ltr" className="fiyat mt-1 block text-sm font-extrabold text-white">{AYARLAR_GOSTERIM(telefon)}</bdi>
                  </span>
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-36 flex-col justify-between rounded-3xl border border-white/16 bg-white/10 p-4 backdrop-blur transition-[background-color,transform] duration-200 hover:bg-white/16 active:scale-[0.98]"
                >
                  <span aria-hidden className="relative flex h-11 w-11 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl bg-[#25D366] text-lg leading-none shadow-sm">
                    <IletisimGorseli
                      url={ayarlar.whatsapp_ikon_url}
                      simge={iletisimIkonu(ayarlar.whatsapp_ikonu, VARSAYILAN.whatsappIkonu)}
                    />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-white/65">WhatsApp</span>
                    <bdi dir="ltr" className="fiyat mt-1 block text-sm font-extrabold text-white">{AYARLAR_GOSTERIM(whatsapp)}</bdi>
                  </span>
                </a>
              </li>
            )}
            {sosyalProfiller.map(({ platform, url, ikonUrl, simge }) => (
              <li key={platform}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-36 flex-col justify-between rounded-3xl border border-white/16 bg-white/10 p-4 backdrop-blur transition-[background-color,transform] duration-200 hover:bg-white/16 active:scale-[0.98]"
                >
                  <span aria-hidden className="relative flex h-11 w-11 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl bg-white text-lg leading-none shadow-sm">
                    <IletisimGorseli url={ikonUrl} simge={simge} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-white/65">{platform}</span>
                    <bdi dir="ltr" className="mt-1 block break-all text-sm font-extrabold text-white">
                      {sosyalGosterim(
                        url,
                        t("anasayfa.sosyalProfil", { platform }),
                      )}
                    </bdi>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-ink px-6 py-10 text-center text-white">
        <p className="etiket text-accent">{adi}</p>
        {/* min-h-11: dokunma hedefi 44px altina dusmesin */}
        <div className="mt-2 flex justify-center gap-2">
          <Link
            href="/siparis"
            className="flex min-h-11 items-center px-3 text-sm text-white/75 underline underline-offset-4 transition-colors duration-200 hover:text-white"
          >
            {t("anasayfa.paketSiparis")}
          </Link>
        </div>
        <p className="fiyat mt-6 text-xs text-white/45">
          © {new Date().getFullYear()} {adi}
        </p>
      </footer>
    </>
  );
}

/** "905434888828" -> "0543 488 88 28" */
function AYARLAR_GOSTERIM(ham: string): string {
  const s = ham.replace(/[^0-9]/g, "").replace(/^90/, "0");
  if (s.length !== 11) return ham;
  return `${s.slice(0, 4)} ${s.slice(4, 7)} ${s.slice(7, 9)} ${s.slice(9)}`;
}
