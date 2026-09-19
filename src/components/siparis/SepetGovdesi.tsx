"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Dil } from "@/lib/tipler";
import { ad } from "@/lib/dil";
import { fiyatYaz, kurus } from "@/lib/sabitler";
import {
  useSepet,
  araToplamHesapla,
  satirToplami,
} from "@/lib/sepet";
import { siparisMesaji, whatsappBaglantisi } from "@/lib/whatsapp";
import { siparisOlustur } from "@/lib/siparis-eylemleri";
import { telefonGecerliMi } from "@/lib/telefon";
import { uuidV4Uret } from "@/lib/uuid";
import { IkonCikar, IkonEkle, IkonNot } from "@/components/Ikon";
import SaltOkunurUyarisi from "@/components/menu/SaltOkunurUyarisi";

/** WhatsApp'a gecis icin taniman sure; sonra tesekkur sayfasina gecilir. */
const YONLENDIRME_MS = 1500;

/** Tesekkur sayfasinin "WhatsApp acilmadiysa" dugmesi icin. */
const WA_ANAHTARI = "royal_son_whatsapp";

export default function SepetGovdesi({
  restoranAdi,
  servisUcreti,
  minimumSiparis,
  acik,
  tur = "paket",
  masaNo = "",
  temelYol = "/siparis",
  saltOkunur = false,
  whatsappNumarasi,
}: {
  restoranAdi: string;
  servisUcreti: number;
  minimumSiparis: number;
  acik: boolean;
  /** Masa siparisinde teslimat ucreti ve minimum yok; ad/telefon yerine masa no */
  tur?: "masa" | "paket";
  /** QR oturumundan gelen, misafirin degistiremedigi masa numarasi. */
  masaNo?: string;
  temelYol?: string;
  saltOkunur?: boolean;
  whatsappNumarasi?: string | null;
}) {
  const dil = useLocale() as Dil;
  const t = useTranslations();
  const router = useRouter();

  const kalemler = useSepet((d) => d.kalemler);
  const sepetTuru = useSepet((d) => d.tur);
  const adetAyarla = useSepet((d) => d.adetAyarla);
  const sil = useSepet((d) => d.sil);
  const temizle = useSepet((d) => d.temizle);

  const [baglandi, setBaglandi] = useState(false);
  const masaSiparisi = tur === "masa";
  const [telefon, setTelefon] = useState("");
  const [telefonDokunuldu, setTelefonDokunuldu] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  /** WhatsApp'a gecerken ekrani kaplayan bekleme perdesi */
  const [perde, setPerde] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // Ag cevabi kaybolursa ayni anahtarla yeniden deneme ayni siparisi dondurur.
  const idempotencyAnahtari = useRef<string | null>(null);

  useEffect(() => setBaglandi(true), []);

  // Zustand tek sepet saklar. Kullanici diger akisin sepet URL'sini elle
  // acarsa kalemler yanlis fiyat/tur ile gosterilmesin veya gonderilmesin.
  const gecerliKalemler = sepetTuru === tur ? kalemler : [];

  // Sepet localStorage'dan gelene kadar bos gosterme — yenilemede
  // "sepetiniz bos" yanip sonmesin.
  if (!baglandi) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5" aria-busy="true">
        <span role="status" className="sr-only">{t("ortak.yukleniyor")}</span>
        {[0, 1].map((i) => (
          <div key={i} aria-hidden className="kart-derinlik mb-3 rounded-3xl border border-line/70 bg-card p-4">
            <span className="parilti block h-4 w-2/3 rounded-full bg-surface" />
            <span className="parilti mt-3 block h-3 w-full rounded-full bg-surface" />
            <span className="parilti mt-5 block h-11 w-32 rounded-2xl bg-surface" />
          </div>
        ))}
      </div>
    );
  }

  // "Sepetiniz bos" ekrani, siparis gonderilirken GOSTERILMEZ: sepet
  // temizlendikten sonra WhatsApp acilana kadar gecen birkac saniye boyunca
  // musteri bos sepet gorup siparisi gitmedi saniyordu.
  if (gecerliKalemler.length === 0 && !gonderiliyor) {
    return (
      <div className="px-4 py-20 text-center">
        {saltOkunur && (
          <SaltOkunurUyarisi
            whatsappNumarasi={whatsappNumarasi}
            className="mx-auto mb-6 max-w-lg text-start"
          />
        )}
        <p className="text-muted">{t("siparis.sepetBos")}</p>
        <Link
          href={temelYol}
          className="mt-6 inline-flex min-h-12 items-center bg-brand px-6 font-semibold text-bg transition-colors duration-200 hover:bg-brand-dark"
        >
          {t("siparis.menuyeDon")}
        </Link>
      </div>
    );
  }

  const araToplam = araToplamHesapla(gecerliKalemler);
  const gecerliServis = masaSiparisi ? 0 : servisUcreti;
  const toplam = kurus(araToplam + gecerliServis);
  const eksik = masaSiparisi ? 0 : kurus(minimumSiparis - araToplam);
  const minimumAltinda = eksik > 0;
  const telefonGecerli = telefonGecerliMi(telefon);
  const telefonHatasiGoster = telefonDokunuldu && !telefonGecerli;
  const gonderilebilir =
    acik &&
    !saltOkunur &&
    !minimumAltinda &&
    !gonderiliyor &&
    (masaSiparisi
      ? masaNo.trim().length > 0
      : telefonGecerli);

  async function gonder() {
    if (saltOkunur) return;
    setHata(null);
    setGonderiliyor(true);

    try {
      idempotencyAnahtari.current ??= uuidV4Uret();
      const sonuc = await siparisOlustur({
        idempotencyAnahtari: idempotencyAnahtari.current,
        dil,
        tur,
        masaNo: masaNo.trim(),
        musteriTelefon: telefon.trim(),
        kalemler: gecerliKalemler.map((k) => ({
          urunId: k.urunId,
          adet: k.adet,
          cikarilanIdler: k.cikarilanlar.map((c) => c.id),
          ekstraIdler: k.ekstralar.map((e) => e.id),
          not: k.not,
        })),
      });

      if (sonuc.durum === "hata") {
        setHata(t(`siparis.hata.${sonuc.kod}`, { deger: sonuc.deger ?? "" }));
        setGonderiliyor(false);
        return;
      }

      // Mesaj sunucunun dogruladigi tutarlarla kurulur
      const mesaj = siparisMesaji({
        restoranAdi,
        siparisNo: sonuc.siparisNo,
        tur,
        masaNo: masaNo.trim(),
        kalemler: sonuc.kalemler,
        araToplam: sonuc.araToplam,
        servisUcreti: sonuc.servisUcreti,
        toplam: sonuc.toplam,
        musteriTelefon: telefon.trim(),
        etiket: (anahtar, degerler) =>
          t(`whatsapp.${anahtar}`, degerler ?? {}),
      });

      const baglanti = whatsappBaglantisi(sonuc.whatsappNumarasi, mesaj);

      // WhatsApp acilmazsa tesekkur sayfasindan tekrar denenebilsin
      try {
        sessionStorage.setItem(WA_ANAHTARI, baglanti);
      } catch {
        // Gizli sekmede sessionStorage kapali olabilir; akis bozulmasin.
      }

      // Perde once acilir: sepet temizlenirken ekranda bosluk gorunmesin
      setPerde(true);
      temizle();

      window.location.href = baglanti;
      window.setTimeout(
        () => {
          const sorgu = new URLSearchParams({
            no: sonuc.siparisNo,
            makbuz: sonuc.makbuzToken,
          });
          router.replace(`${temelYol}/tesekkurler?${sorgu.toString()}`);
        },
        YONLENDIRME_MS,
      );
    } catch (e) {
      console.error("Siparis gonderilemedi:", e);
      setHata(t("siparis.hata.kayit_hatasi"));
      setGonderiliyor(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-40">
      {saltOkunur && (
        <SaltOkunurUyarisi
          whatsappNumarasi={whatsappNumarasi}
          className="mt-4"
        />
      )}
      {/* ---------- WHATSAPP BEKLEME PERDESI ---------- */}
      {perde && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 px-8 text-center text-white backdrop-blur"
        >
          <span
            aria-hidden
            className="h-12 w-12 animate-spin rounded-full border-3 border-white/20 border-t-[#f4cf76]"
          />
          <p className="text-lg font-bold">{t("siparis.whatsappAciliyor")}</p>
          <p className="max-w-sm text-sm text-white/65">
            {t(
              masaSiparisi
                ? "siparis.masaWhatsappAciliyorAlt"
                : "siparis.whatsappAciliyorAlt",
            )}
          </p>
        </div>
      )}

      {/* ---------- KALEMLER ---------- */}
      <ul className="mt-4 flex flex-col gap-3">
        {gecerliKalemler.map((k) => (
          <li
            key={k.satirId}
            className="kart-derinlik rounded-3xl border border-line/70 bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <h2 className="min-w-0 flex-1 font-semibold leading-snug">
                {ad(k, dil)}
              </h2>
              <span className="fiyat shrink-0 font-bold text-brand-light">
                {fiyatYaz(satirToplami(k))}
              </span>
            </div>

            {/* Secimler kucuk ve gri — satiri bogmasin */}
            {k.cikarilanlar.length > 0 && (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted">
                <IkonCikar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                <span>
                  {t("siparis.cikan")}:{" "}
                  {k.cikarilanlar.map((c) => ad(c, dil)).join(", ")}
                </span>
              </p>
            )}
            {k.ekstralar.length > 0 && (
              <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted">
                <IkonEkle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <span>
                  {t("siparis.ekstra")}:{" "}
                  {k.ekstralar
                    .map((e) => `${ad(e, dil)} (+${fiyatYaz(e.fiyat)})`)
                    .join(", ")}
                </span>
              </p>
            )}
            {k.not && (
              <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted">
                <IkonNot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{k.not}</span>
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface/70 p-0.5">
                <button
                  type="button"
                  onClick={() => adetAyarla(k.satirId, k.adet - 1)}
                  aria-label={t("siparis.azalt")}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold transition active:bg-line"
                >
                  −
                </button>
                <span className="fiyat w-7 text-center font-bold">
                  {k.adet}
                </span>
                <button
                  type="button"
                  onClick={() => adetAyarla(k.satirId, k.adet + 1)}
                  aria-label={t("siparis.artir")}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold transition active:bg-line"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => sil(k.satirId)}
                aria-label={t("siparis.kaldir")}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition active:bg-line/50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* ---------- TOPLAMLAR ---------- */}
      <dl className="kart-derinlik mt-6 rounded-3xl border border-line/70 bg-card p-5">
        <div className="flex justify-between text-sm">
          <dt className="text-muted">{t("siparis.araToplam")}</dt>
          <dd className="fiyat">{fiyatYaz(araToplam)}</dd>
        </div>
        {!masaSiparisi && (
          <div className="mt-2 flex justify-between text-sm">
            <dt className="text-muted">{t("siparis.servisUcreti")}</dt>
            <dd className="fiyat">{fiyatYaz(gecerliServis)}</dd>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-lg font-bold">
          <dt>{t("siparis.toplam")}</dt>
          <dd className="fiyat text-brand-light">{fiyatYaz(toplam)}</dd>
        </div>
      </dl>

      {minimumAltinda && (
        <p className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
          {t("siparis.minimumUyari", {
            tutar: fiyatYaz(minimumSiparis),
            eksik: fiyatYaz(eksik),
          })}
        </p>
      )}

      {!masaSiparisi && (
        <p className="mt-3 border-s-2 border-brand ps-3 text-xs leading-relaxed text-muted">
          {t("siparis.adresOnBilgi")}
        </p>
      )}

      {/* Masa numarasi QR oturumundan gelir. Paket siparisinde yalniz telefon alinir. */}
      {masaSiparisi ? (
        <section className="mt-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{t("siparis.masaNo")}</span>
            <div className="flex min-h-15 w-full items-center justify-center rounded-2xl border border-line bg-card px-4 text-2xl font-bold text-ink shadow-sm" dir="ltr">
              <span className="fiyat">{masaNo}</span>
            </div>
          </div>
        </section>
      ) : (
      <section className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{t("siparis.telefon")}</span>
          <input
            type="tel"
            name="musteri-telefon"
            inputMode="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            onBlur={() => setTelefonDokunuldu(true)}
            autoComplete="tel"
            spellCheck={false}
            maxLength={20}
            dir="ltr"
            aria-invalid={telefonHatasiGoster}
            aria-describedby="telefon-yardim"
            className="min-h-12 rounded-2xl border border-line bg-card px-4 text-start text-base text-ink focus:border-brand"
          />
          <span
            id="telefon-yardim"
            role={telefonHatasiGoster ? "alert" : undefined}
            className={`text-xs ${telefonHatasiGoster ? "text-danger" : "text-muted"}`}
          >
            {telefonHatasiGoster
              ? t("siparis.hata.telefon_gecersiz")
              : t("siparis.telefonIpucu")}
          </span>
        </label>
      </section>
      )}

      {hata && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink"
        >
          {hata}
        </p>
      )}

      {/* ---------- GONDER ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-bg/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-12px_32px_rgba(16,43,40,.08)] backdrop-blur-xl">
        <button
          type="button"
          onClick={gonder}
          disabled={!gonderilebilir}
          className="mx-auto flex min-h-15 w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-lg font-black text-white shadow-[0_12px_28px_rgba(8,119,110,.22)] transition-[background-color,transform] duration-200 hover:bg-brand-dark active:scale-[0.99] disabled:bg-line disabled:text-muted disabled:shadow-none"
        >
          {saltOkunur
            ? t("menu.saltOkunurKisa")
            : gonderiliyor
            ? t("ortak.yukleniyor")
            : !acik
              ? t("siparis.suAnKapali")
              : t(
                  masaSiparisi
                    ? "siparis.masaWhatsappGonder"
                    : "siparis.whatsappGonder",
                )}
        </button>
      </div>
    </div>
  );
}
