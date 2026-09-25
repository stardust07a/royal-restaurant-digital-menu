"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { menuyuTazele } from "@/lib/admin-eylemleri";
import { gorselSil, gorselYukle } from "@/lib/gorsel-yukle";
import { adminGorselHataMetni } from "@/lib/admin-gorsel-hatasi";
import { kurus } from "@/lib/sabitler";
import { sosyalUrlDogrula, type SosyalPlatform } from "@/lib/sosyal-url";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";
import type { Ayarlar, CalismaSaatleri, GunAnahtari } from "@/lib/tipler";
import { useAdminDil, type MetinAnahtari } from "@/lib/admin-dil";
import { useKaydedilmemisDegisiklik } from "@/lib/kaydedilmemis-degisiklik";
import SifreDegistirFormu from "@/components/admin/SifreDegistirFormu";

const GUNLER: { kod: GunAnahtari; anahtar: MetinAnahtari }[] = [
  { kod: "pazartesi", anahtar: "pazartesi" },
  { kod: "sali", anahtar: "sali" },
  { kod: "carsamba", anahtar: "carsamba" },
  { kod: "persembe", anahtar: "persembe" },
  { kod: "cuma", anahtar: "cuma" },
  { kod: "cumartesi", anahtar: "cumartesi" },
  { kod: "pazar", anahtar: "pazar" },
];

const VARSAYILAN_GUN = { acilis: "11:00", kapanis: "23:00", kapali: false };

const ILETISIM_LOGOLARI = [
  { alan: "telefon_ikon_url", etiket: "telefonIkonu", ad: "telefon" },
  { alan: "whatsapp_ikon_url", etiket: "whatsappIkonu", ad: "whatsapp" },
  { alan: "instagram_ikon_url", etiket: "instagramIkonu", ad: "instagram" },
  { alan: "tiktok_ikon_url", etiket: "tiktokIkonu", ad: "tiktok" },
  { alan: "facebook_ikon_url", etiket: "facebookIkonu", ad: "facebook" },
] as const;

type IletisimLogoAlani = (typeof ILETISIM_LOGOLARI)[number]["alan"];

function kirpilmisVeyaNull(deger: string | null | undefined): string | null {
  const kirpilmis = deger?.trim();
  return kirpilmis ? kirpilmis : null;
}

function iletisimLogoDegerleri(
  ayarlar: Ayarlar,
): Pick<Ayarlar, IletisimLogoAlani> {
  return {
    telefon_ikon_url: nextGorselUrlDogrula(ayarlar.telefon_ikon_url),
    whatsapp_ikon_url: nextGorselUrlDogrula(ayarlar.whatsapp_ikon_url),
    instagram_ikon_url: nextGorselUrlDogrula(ayarlar.instagram_ikon_url),
    tiktok_ikon_url: nextGorselUrlDogrula(ayarlar.tiktok_ikon_url),
    facebook_ikon_url: nextGorselUrlDogrula(ayarlar.facebook_ikon_url),
  };
}

function iletisimLogoKolonuEksik(error: {
  code?: string;
  message?: string;
}): boolean {
  const mesaj = error.message?.toLocaleLowerCase("tr") ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    [
      "telefon_ikon_url",
      "whatsapp_ikon_url",
      "instagram_ikon_url",
      "tiktok_ikon_url",
      "facebook_ikon_url",
    ].some((kolon) => mesaj.includes(kolon))
  );
}

export default function AyarlarFormu({ baslangic }: { baslangic: Ayarlar }) {
  const { m } = useAdminDil();
  const router = useRouter();
  const [a, setA] = useState<Ayarlar>(baslangic);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [logoGorselHatali, setLogoGorselHatali] = useState(false);
  const [bozukIletisimLogolari, setBozukIletisimLogolari] = useState<
    Partial<Record<IletisimLogoAlani, string>>
  >({});
  const [logoYukleniyor, setLogoYukleniyor] = useState(false);
  const [iletisimLogosuYukleniyor, setIletisimLogosuYukleniyor] =
    useState<IletisimLogoAlani | null>(null);
  const logoSecici = useRef<HTMLInputElement>(null);
  // Dosya secicileri ve Kaydet ayni anda calisamasin. State bir render sonra
  // guncellendigi icin ref, iki hizli secimin ayni anda yuklemeye baslamasini
  // da engeller.
  const yuklemeKilidi = useRef(false);
  const kayitliIletisimLogolari = useRef(iletisimLogoDegerleri(baslangic));
  const logoPreviewUrl = nextGorselUrlDogrula(a.logo_url);
  useEffect(() => {
    setLogoGorselHatali(false);
  }, [logoPreviewUrl]);
  const formImzasi = JSON.stringify(a);
  const { kaydedildi } = useKaydedilmemisDegisiklik(
    formImzasi,
    m("kaydedilmemisUyari"),
  );

  function guncelle<K extends keyof Ayarlar>(alan: K, deger: Ayarlar[K]) {
    setA((o) => ({ ...o, [alan]: deger }));
  }

  const saatler: CalismaSaatleri = a.calisma_saatleri ?? {};

  function gunGuncelle(gun: GunAnahtari, yama: Partial<typeof VARSAYILAN_GUN>) {
    const mevcut = saatler[gun] ?? VARSAYILAN_GUN;
    guncelle("calisma_saatleri", {
      ...saatler,
      [gun]: { ...mevcut, ...yama },
    });
  }

  /**
   * Logo kirpilmadan yuklenir — logolarin en boy orani cesitli oluyor,
   * 4:3'e zorlamak onlari bozardi.
   */
  async function logoSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya || yuklemeKilidi.current) return;
    e.target.value = "";
    yuklemeKilidi.current = true;
    setLogoYukleniyor(true);
    setHata(null);
    try {
      const url = await gorselYukle(dosya, "ayarlar", "logo");
      guncelle("logo_url", url);
    } catch (err) {
      setHata(adminGorselHataMetni(err, m));
    } finally {
      yuklemeKilidi.current = false;
      setLogoYukleniyor(false);
    }
  }

  async function iletisimLogosuSecildi(
    e: React.ChangeEvent<HTMLInputElement>,
    alan: IletisimLogoAlani,
    adIpucu: string,
  ) {
    const dosya = e.target.files?.[0];
    if (!dosya || yuklemeKilidi.current) return;
    e.target.value = "";
    yuklemeKilidi.current = true;
    setIletisimLogosuYukleniyor(alan);
    setHata(null);
    try {
      const url = await gorselYukle(dosya, "ayarlar", `${adIpucu}-logo`);
      const guvenliUrl = nextGorselUrlDogrula(url);
      if (!guvenliUrl) {
        setHata(m("gorselYuklemeHatasi"));
        return;
      }
      const oncekiUrl = nextGorselUrlDogrula(a[alan]);
      const kayitliUrl = kayitliIletisimLogolari.current[alan];
      guncelle(alan, guvenliUrl);
      // Kaydetmeden once ayni alan icin bir kez daha dosya secildiyse ilk
      // gecici yukleme artik hicbir ayar satirinca kullanilmayacak.
      if (oncekiUrl && oncekiUrl !== kayitliUrl && oncekiUrl !== guvenliUrl) {
        void gorselSil(oncekiUrl, "ayarlar").catch((silmeHatasi) => {
          console.error("Gecici iletisim logosu silinemedi:", silmeHatasi);
        });
      }
    } catch (err) {
      setHata(adminGorselHataMetni(err, m));
    } finally {
      yuklemeKilidi.current = false;
      setIletisimLogosuYukleniyor(null);
    }
  }

  async function kaydet() {
    if (yuklemeKilidi.current) return;
    setHata(null);
    setMesaj(null);
    const sosyalAlanlar: Array<[SosyalPlatform, string | null]> = [
      ["instagram", a.instagram],
      ["tiktok", a.tiktok],
      ["facebook", a.facebook],
    ];
    const gecersizSosyal = sosyalAlanlar.find(
      ([platform, url]) => url?.trim() && !sosyalUrlDogrula(url, platform),
    );
    if (gecersizSosyal) {
      setHata(m("sosyalUrlGecersiz"));
      return;
    }
    const gecersizIletisimLogosu = ILETISIM_LOGOLARI.some(
      ({ alan }) => a[alan]?.trim() && !nextGorselUrlDogrula(a[alan]),
    );
    if (gecersizIletisimLogosu) {
      setHata(m("gorselYuklemeHatasi"));
      return;
    }
    const kaydedilenImza = formImzasi;
    setKaydediliyor(true);

    const whatsapp = (a.whatsapp_numarasi ?? "").replace(/[^0-9]/g, "");

    const temelAyarlar = {
      restoran_ad_tr: a.restoran_ad_tr,
      restoran_ad_ar: a.restoran_ad_ar,
      logo_url: a.logo_url,
      whatsapp_numarasi: whatsapp || null,
      telefon: kirpilmisVeyaNull(a.telefon),
      adres_tr: a.adres_tr,
      adres_ar: a.adres_ar,
      harita_linki: kirpilmisVeyaNull(a.harita_linki),
      instagram: kirpilmisVeyaNull(
        sosyalUrlDogrula(a.instagram, "instagram"),
      ),
      tiktok: kirpilmisVeyaNull(sosyalUrlDogrula(a.tiktok, "tiktok")),
      facebook: kirpilmisVeyaNull(
        sosyalUrlDogrula(a.facebook, "facebook"),
      ),
      servis_ucreti: kurus(a.servis_ucreti),
      minimum_siparis: kurus(a.minimum_siparis),
      siparis_alimi_acik: a.siparis_alimi_acik,
      calisma_saatleri: a.calisma_saatleri,
      kapali_mesaji_tr: a.kapali_mesaji_tr,
      kapali_mesaji_ar: a.kapali_mesaji_ar,
      hero_baslik_tr: a.hero_baslik_tr,
      hero_baslik_ar: a.hero_baslik_ar,
      hero_alt_tr: a.hero_alt_tr,
      hero_alt_ar: a.hero_alt_ar,
      hakkimizda_baslik_tr: a.hakkimizda_baslik_tr,
      hakkimizda_baslik_ar: a.hakkimizda_baslik_ar,
      hakkimizda_metin_tr: a.hakkimizda_metin_tr,
      hakkimizda_metin_ar: a.hakkimizda_metin_ar,
    };
    const iletisimLogolari = iletisimLogoDegerleri(a);

    const db = tarayiciIstemcisi();
    let sonuc = await db
      .from("ayarlar")
      .update({ ...temelAyarlar, ...iletisimLogolari })
      .eq("id", 1)
      .select(
        "id, telefon_ikon_url, whatsapp_ikon_url, instagram_ikon_url, tiktok_ikon_url, facebook_ikon_url",
      )
      .single();
    let error = sonuc.error;

    // Migration henuz calistirilmadiysa mevcut ayarlar yine kaydedilsin;
    // yalnizca yeni ikon alanlari icin yonlendirici bir uyari gosterilir.
    if (error && iletisimLogoKolonuEksik(error)) {
      const eskiSemaSonucu = await db
        .from("ayarlar")
        .update(temelAyarlar)
        .eq("id", 1)
        .select("id")
        .single();
      error = eskiSemaSonucu.error;

      if (!error && eskiSemaSonucu.data?.id === 1) {
        setKaydediliyor(false);
        // Eski sema temel alanlari kaydetti, logo URL kolonlarini kaydetmedi.
        // Logo secimleri migration tamamlanana kadar kaydedilmemis kalir.
        kaydedildi(
          JSON.stringify({ ...a, ...kayitliIletisimLogolari.current }),
        );
        await menuyuTazele();
        setHata(m("iletisimIkonlariMigrationGerekli"));
        router.refresh();
        return;
      }
    }

    setKaydediliyor(false);

    const logoSatiriDogrulandi =
      sonuc.data?.id === 1 &&
      ILETISIM_LOGOLARI.every(
        ({ alan }) =>
          nextGorselUrlDogrula(sonuc.data?.[alan]) === iletisimLogolari[alan],
      );

    if (error || !logoSatiriDogrulandi) {
      console.error("Admin ayarlari kaydedilemedi:", error);
      setHata(m("islemBasarisiz"));
      return;
    }

    const eskiLogolar = kayitliIletisimLogolari.current;
    kayitliIletisimLogolari.current = iletisimLogolari;
    const kullanilmayaDevamEdenler = new Set(
      Object.values(iletisimLogolari).filter((url): url is string => Boolean(url)),
    );
    await Promise.allSettled(
      ILETISIM_LOGOLARI.map(({ alan }) =>
        eskiLogolar[alan] &&
        eskiLogolar[alan] !== iletisimLogolari[alan] &&
        !kullanilmayaDevamEdenler.has(eskiLogolar[alan])
          ? gorselSil(eskiLogolar[alan], "ayarlar")
          : Promise.resolve(false),
      ),
    );
    kaydedildi(kaydedilenImza);
    await menuyuTazele();
    setMesaj(m("ayarlarKaydedildi"));
    router.refresh();
  }

  const kutu =
    "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base focus:border-brand";
  const herhangiBirYukleme =
    logoYukleniyor || iletisimLogosuYukleniyor !== null;

  function Alan({
    etiket,
    deger,
    alan,
    tur = "text",
    dir,
    maxCodePoints,
  }: {
    etiket: string;
    deger: string | null;
    alan: keyof Ayarlar;
    tur?: string;
    dir?: "rtl" | "ltr";
    maxCodePoints?: number;
  }) {
    const telefonAlani = alan === "whatsapp_numarasi" || alan === "telefon";
    const urlAlani =
      alan === "harita_linki" ||
      alan === "instagram" ||
      alan === "tiktok" ||
      alan === "facebook";
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">{etiket}</span>
        <input
          type={telefonAlani ? "tel" : urlAlani ? "url" : tur}
          name={String(alan)}
          autoComplete="off"
          inputMode={telefonAlani ? "tel" : urlAlani ? "url" : undefined}
          spellCheck={telefonAlani || urlAlani ? false : undefined}
          value={deger ?? ""}
          dir={dir}
          // Bir Unicode kod noktasi UTF-16'da iki birim kaplayabilir. Yerel
          // maxLength yalniz kaba sinirdir; asagidaki kontrol kesin sinirdir.
          maxLength={maxCodePoints ? maxCodePoints * 2 : undefined}
          onChange={(e) => {
            if (
              maxCodePoints &&
              Array.from(e.target.value).length > maxCodePoints
            ) {
              return;
            }
            guncelle(alan, e.target.value as Ayarlar[typeof alan]);
          }}
          className={kutu}
        />
      </label>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-[calc(11rem+env(safe-area-inset-bottom))]">
      {/* ---------- LOGO ---------- */}
      <section className="pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("logo")}
        </h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-card">
            {logoPreviewUrl && !logoGorselHatali ? (
              <Image
                src={logoPreviewUrl}
                alt=""
                fill
                sizes="80px"
                className="object-contain"
                onError={() => setLogoGorselHatali(true)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-accent">
                R
              </span>
            )}
          </div>
          <input
            ref={logoSecici}
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp"
            onChange={logoSecildi}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => logoSecici.current?.click()}
            disabled={herhangiBirYukleme}
            className="min-h-12 flex-1 rounded-2xl border border-line bg-card text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
          >
            {logoYukleniyor ? m("yukleniyor") : m("logoYukle")}
          </button>
        </div>
      </section>

      {/* ---------- RESTORAN ---------- */}
      <section className="mt-6 flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("restoran")}
        </h2>
        <Alan etiket={m("adTr")} deger={a.restoran_ad_tr} alan="restoran_ad_tr" />
        <Alan
          etiket={m("adAr")}
          deger={a.restoran_ad_ar}
          alan="restoran_ad_ar"
          dir="rtl"
        />
        <Alan
          etiket={m("whatsappNo")}
          deger={a.whatsapp_numarasi}
          alan="whatsapp_numarasi"
          dir="ltr"
        />
        <Alan etiket={m("telefon")} deger={a.telefon} alan="telefon" dir="ltr" />
        <Alan etiket={m("adresTr")} deger={a.adres_tr} alan="adres_tr" />
        <Alan etiket={m("adresAr")} deger={a.adres_ar} alan="adres_ar" dir="rtl" />
        <Alan
          etiket={m("haritaLinki")}
          deger={a.harita_linki}
          alan="harita_linki"
          dir="ltr"
        />
        <Alan
          etiket="Instagram"
          deger={a.instagram}
          alan="instagram"
          tur="url"
          dir="ltr"
        />
        <Alan
          etiket="TikTok"
          deger={a.tiktok}
          alan="tiktok"
          tur="url"
          dir="ltr"
        />
        <Alan
          etiket="Facebook"
          deger={a.facebook}
          alan="facebook"
          tur="url"
          dir="ltr"
        />
      </section>

      {/* ---------- ILETISIM LOGOLARI ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("iletisimIkonlari")}
        </h2>
        <p className="mt-1 text-xs text-muted">{m("iletisimIkonlariIpucu")}</p>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {ILETISIM_LOGOLARI.map(({ alan, etiket, ad }) => {
            const onizleme = nextGorselUrlDogrula(a[alan]);
            const onizlemeGoster = Boolean(
              onizleme && bozukIletisimLogolari[alan] !== onizleme,
            );
            const yukleniyor = iletisimLogosuYukleniyor === alan;
            return (
              <li key={alan} className="rounded-2xl border border-line bg-card p-3">
                <p className="text-sm font-semibold">{m(etiket)}</p>
                <div className="relative mt-2 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-bg">
                  {onizlemeGoster ? (
                    <Image
                      src={onizleme!}
                      alt=""
                      fill
                      sizes="180px"
                      className="object-contain p-4"
                      onError={() =>
                        setBozukIletisimLogolari((onceki) => ({
                          ...onceki,
                          [alan]: onizleme!,
                        }))
                      }
                    />
                  ) : (
                    <span className="px-3 text-center text-xs text-muted">
                      {m("fotografYok")}
                    </span>
                  )}
                </div>
                <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line px-2 text-center text-xs font-semibold active:bg-surface">
                  <input
                    type="file"
                    name={`${ad}-logo`}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => iletisimLogosuSecildi(e, alan, ad)}
                    className="sr-only"
                    disabled={herhangiBirYukleme}
                  />
                  {yukleniyor
                    ? m("yukleniyor")
                    : onizleme
                      ? m("fotografDegistir")
                      : m("fotografSec")}
                </label>
                {onizleme && (
                  <button
                    type="button"
                    onClick={() => guncelle(alan, null)}
                    disabled={herhangiBirYukleme}
                    aria-label={`${m(etiket)} ${m("kaldir")}`}
                    className="mt-1 min-h-11 w-full rounded-xl text-xs font-semibold text-danger active:bg-danger/10 disabled:opacity-50"
                  >
                    {m("kaldir")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- SIPARIS ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("siparisBaslik")}
        </h2>
        <div className="mt-3 flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">{m("servisUcreti")}</span>
            <input
              type="number"
              name="teslimat-ucreti"
              autoComplete="off"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={a.servis_ucreti}
              onChange={(e) =>
                guncelle("servis_ucreti", Number(e.target.value))
              }
              className={kutu}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">{m("minimumSiparis")}</span>
            <input
              type="number"
              name="minimum-siparis"
              autoComplete="off"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={a.minimum_siparis}
              onChange={(e) =>
                guncelle("minimum_siparis", Number(e.target.value))
              }
              className={kutu}
            />
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-2">
          <div>
            <p className="text-sm">{m("siparisAlimiAcik")}</p>
            <p className="text-xs text-muted">
              {m("siparisAlimiIpucu")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={a.siparis_alimi_acik}
            aria-label={m("siparisAlimiAcik")}
            onClick={() =>
              guncelle("siparis_alimi_acik", !a.siparis_alimi_acik)
            }
            className={`relative h-11 w-16 shrink-0 rounded-full transition ${
              a.siparis_alimi_acik ? "bg-brand" : "bg-line"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-1.5 h-8 w-8 rounded-full bg-bg transition-[inset-inline-start] ${
                a.siparis_alimi_acik ? "start-[1.875rem]" : "start-1.5"
              }`}
            />
          </button>
        </div>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("kapaliMesajiTr")}</span>
          <textarea
            name="kapali-mesaji-tr"
            autoComplete="off"
            value={a.kapali_mesaji_tr ?? ""}
            onChange={(e) => guncelle("kapali_mesaji_tr", e.target.value)}
            rows={2}
            className="w-full resize-none rounded-2xl border border-line bg-card p-4 text-base focus:border-brand"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("kapaliMesajiAr")}</span>
          <textarea
            name="kapali-mesaji-ar"
            autoComplete="off"
            value={a.kapali_mesaji_ar ?? ""}
            onChange={(e) => guncelle("kapali_mesaji_ar", e.target.value)}
            dir="rtl"
            rows={2}
            className="w-full resize-none rounded-2xl border border-line bg-card p-4 text-base focus:border-brand"
          />
        </label>
      </section>

      {/* ---------- ANA SAYFA METINLERI ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("anaSayfaMetinleri")}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {m("anaSayfaIpucu")}
        </p>

        <div className="mt-3 flex flex-col gap-3">
          <Alan
            etiket={m("heroBaslikTr")}
            deger={a.hero_baslik_tr}
            alan="hero_baslik_tr"
          />
          <Alan
            etiket={m("heroBaslikAr")}
            deger={a.hero_baslik_ar}
            alan="hero_baslik_ar"
            dir="rtl"
          />
          <Alan
            etiket={m("heroAltTr")}
            deger={a.hero_alt_tr}
            alan="hero_alt_tr"
          />
          <Alan
            etiket={m("heroAltAr")}
            deger={a.hero_alt_ar}
            alan="hero_alt_ar"
            dir="rtl"
          />
          <Alan
            etiket={m("hakkimizdaBaslikTr")}
            deger={a.hakkimizda_baslik_tr}
            alan="hakkimizda_baslik_tr"
          />
          <Alan
            etiket={m("hakkimizdaBaslikAr")}
            deger={a.hakkimizda_baslik_ar}
            alan="hakkimizda_baslik_ar"
            dir="rtl"
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{m("hakkimizdaMetinTr")}</span>
            <textarea
              name="hakkimizda-metni-tr"
              autoComplete="off"
              value={a.hakkimizda_metin_tr ?? ""}
              onChange={(e) => guncelle("hakkimizda_metin_tr", e.target.value)}
              rows={4}
              className="w-full resize-none border border-line bg-card p-4 text-base focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{m("hakkimizdaMetinAr")}</span>
            <textarea
              name="hakkimizda-metni-ar"
              autoComplete="off"
              value={a.hakkimizda_metin_ar ?? ""}
              onChange={(e) => guncelle("hakkimizda_metin_ar", e.target.value)}
              dir="rtl"
              rows={4}
              className="w-full resize-none border border-line bg-card p-4 text-base focus:border-brand"
            />
          </label>
        </div>
      </section>

      {/* ---------- CALISMA SAATLERI ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("calismaSaatleri")}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {GUNLER.map((g) => {
            const gun = saatler[g.kod] ?? VARSAYILAN_GUN;
            return (
              <li
                key={g.kod}
                className="rounded-2xl border border-line bg-card p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{m(g.anahtar)}</span>
                  <button
                    type="button"
                    onClick={() => gunGuncelle(g.kod, { kapali: !gun.kapali })}
                    aria-pressed={gun.kapali}
                    className={`flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition ${
                      gun.kapali
                        ? "bg-danger/20 text-danger"
                        : "border border-line text-muted"
                    }`}
                  >
                    {gun.kapali ? m("kapali") : m("acik")}
                  </button>
                </div>

                {!gun.kapali && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="time"
                      name={`${g.kod}-acilis`}
                      autoComplete="off"
                      value={gun.acilis}
                      onChange={(e) =>
                        gunGuncelle(g.kod, { acilis: e.target.value })
                      }
                      aria-label={`${m(g.anahtar)} ${m("acilis")}`}
                      className="fiyat min-h-11 flex-1 rounded-xl border border-line bg-bg px-3 text-sm focus:border-brand"
                    />
                    <span className="text-muted">–</span>
                    <input
                      type="time"
                      name={`${g.kod}-kapanis`}
                      autoComplete="off"
                      value={gun.kapanis}
                      onChange={(e) =>
                        gunGuncelle(g.kod, { kapanis: e.target.value })
                      }
                      aria-label={`${m(g.anahtar)} ${m("kapanis")}`}
                      className="fiyat min-h-11 flex-1 rounded-xl border border-line bg-bg px-3 text-sm focus:border-brand"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">
          {m("geceMesaisiIpucu")}
        </p>
      </section>

      <SifreDegistirFormu />

      {hata && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}
      {mesaj && (
        <p
          role="status"
          aria-live="polite"
          className="mt-6 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand-light"
        >
          {mesaj}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor || herhangiBirYukleme}
          className="mx-auto flex min-h-13 w-full max-w-lg items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
        >
          {kaydediliyor ? m("kaydediliyor") : m("kaydet")}
        </button>
      </div>
    </div>
  );
}
