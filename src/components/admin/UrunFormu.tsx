"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { menuyuTazele } from "@/lib/admin-eylemleri";
import { gorselDogrula, gorselYukle } from "@/lib/gorsel-yukle";
import { adminGorselHataMetni } from "@/lib/admin-gorsel-hatasi";
import { kurus, fiyatYaz } from "@/lib/sabitler";
import FotografKirpma from "./FotografKirpma";
import { useAdminDil, type MetinAnahtari } from "@/lib/admin-dil";
import { useKaydedilmemisDegisiklik } from "@/lib/kaydedilmemis-degisiklik";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";
import { slugla } from "@/lib/slug";

const ALERJENLER: { kod: string; anahtar: MetinAnahtari }[] = [
  { kod: "gluten", anahtar: "alerjenGluten" },
  { kod: "sut", anahtar: "alerjenSut" },
  { kod: "yumurta", anahtar: "alerjenYumurta" },
  { kod: "susam", anahtar: "alerjenSusam" },
  { kod: "findik", anahtar: "alerjenFindik" },
  { kod: "soya", anahtar: "alerjenSoya" },
  { kod: "hardal", anahtar: "alerjenHardal" },
  { kod: "balik", anahtar: "alerjenBalik" },
];

const ROZETLER: { kod: string; anahtar: MetinAnahtari }[] = [
  { kod: "yok", anahtar: "rozetYok" },
  { kod: "cok_satan", anahtar: "rozetCokSatan" },
  { kod: "yeni", anahtar: "rozetYeni" },
  { kod: "acili", anahtar: "rozetAcili" },
  { kod: "sefin_onerisi", anahtar: "rozetSefinOnerisi" },
];

/** Masa ve paket fiyati arasindaki fark bu yuzdeyi asarsa uyarilir. */
const FARK_UYARI_ESIGI = 40;

export interface FormSecenek {
  id?: string;
  ad_tr: string;
  ad_ar: string;
}

export interface FormEkstra extends FormSecenek {
  fiyat: number | "";
  stokta: boolean;
}

interface EkstraAdayi {
  id: string;
  ad_tr: string;
  ad_ar: string;
  fiyat_paket: number;
  stokta: boolean;
}

export interface FormUrun {
  id: string | null;
  kategori_id: string;
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr: string;
  aciklama_ar: string;
  gorsel_url: string | null;
  fiyat_masa: number;
  fiyat_paket: number;
  gramaj: string;
  gramaj_ar: string;
  kalori: number | null;
  alerjenler: string[];
  rozet: string;
  stokta: boolean;
  aktif: boolean;
  masa_aktif: boolean;
  cikarilabilirler: FormSecenek[];
  ekstralar: FormEkstra[];
}

export default function UrunFormu({
  baslangic,
  kategoriler,
  ekstraAdaylari = [],
}: {
  baslangic: FormUrun;
  kategoriler: { id: string; ad_tr: string; ad_ar: string }[];
  ekstraAdaylari?: EkstraAdayi[];
}) {
  const { m, dil } = useAdminDil();
  const router = useRouter();
  const [u, setU] = useState<FormUrun>(baslangic);
  const [masaFiyatGirdisi, setMasaFiyatGirdisi] = useState(String(baslangic.fiyat_masa));
  const [paketFiyatGirdisi, setPaketFiyatGirdisi] = useState(String(baslangic.fiyat_paket));
  const [dilSekmesi, setDilSekmesi] = useState<"tr" | "ar">("tr");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gorselHatali, setGorselHatali] = useState(false);
  const [kirpilacak, setKirpilacak] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const dosyaSecici = useRef<HTMLInputElement>(null);
  const fotografDugmesi = useRef<HTMLButtonElement>(null);
  // Dosya secimi, kirpma ve yukleme tek bir islem olsun. State bir render
  // sonra guncellendigi icin ref, hizli cift secimlerde ikinci yuklemeyi de
  // engeller; islem kimligi ise eski bir Promise sonucunun yeni gorseli
  // ezmesini onler.
  const yuklemeKilidi = useRef(false);
  const yuklemeKimligi = useRef(0);
  const guvenliGorselUrl = nextGorselUrlDogrula(u.gorsel_url);
  useEffect(() => {
    setGorselHatali(false);
  }, [guvenliGorselUrl]);
  const formImzasi = JSON.stringify({ u, masaFiyatGirdisi, paketFiyatGirdisi });
  const { kaydedildi } = useKaydedilmemisDegisiklik(
    formImzasi,
    m("kaydedilmemisUyari"),
  );

  const yeniKayit = u.id === null;

  function guncelle<K extends keyof FormUrun>(alan: K, deger: FormUrun[K]) {
    setU((o) => ({ ...o, [alan]: deger }));
  }

  function adDegisti(deger: string) {
    setU((onceki) => ({
      ...onceki,
      ad_tr: deger,
      slug: yeniKayit ? slugla(deger) : onceki.slug,
    }));
  }

  function fiyatGirdisiDegisti(alan: "fiyat_masa" | "fiyat_paket", ham: string) {
    const metin = /^0\d+$/.test(ham) ? String(Number(ham)) : ham;
    if (alan === "fiyat_masa") setMasaFiyatGirdisi(metin);
    else setPaketFiyatGirdisi(metin);
    if (metin !== "" && Number.isFinite(Number(metin))) {
      guncelle(alan, Number(metin));
    }
  }

  /** Masa ve paket fiyati arasindaki yuzde fark — yanlis giris yakalanir. */
  const fiyatFarki = useMemo(() => {
    if (u.fiyat_masa <= 0) return null;
    return Math.round(((u.fiyat_paket - u.fiyat_masa) / u.fiyat_masa) * 100);
  }, [u.fiyat_masa, u.fiyat_paket]);

  // ---------------------------------------------------------- fotograf

  async function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya || yuklemeKilidi.current) return;
    // Ayni dosya tekrar secilebilsin
    e.target.value = "";
    const islemKimligi = ++yuklemeKimligi.current;
    yuklemeKilidi.current = true;
    setYukleniyor(true);
    setHata(null);
    try {
      await gorselDogrula(dosya);
      if (islemKimligi !== yuklemeKimligi.current) return;
      setKirpilacak(URL.createObjectURL(dosya));
    } catch (e) {
      if (islemKimligi === yuklemeKimligi.current) {
        setHata(adminGorselHataMetni(e, m));
        yuklemeKilidi.current = false;
        setYukleniyor(false);
      }
    }
  }

  async function kirpmaTamam(blob: Blob) {
    if (!yuklemeKilidi.current || !kirpilacak) return;
    const islemKimligi = yuklemeKimligi.current;
    if (kirpilacak) URL.revokeObjectURL(kirpilacak);
    setKirpilacak(null);
    setHata(null);
    try {
      const url = await gorselYukle(blob, "urunler", u.slug || u.ad_tr);
      if (islemKimligi === yuklemeKimligi.current) {
        guncelle("gorsel_url", url);
      }
    } catch (e) {
      if (islemKimligi === yuklemeKimligi.current) {
        setHata(adminGorselHataMetni(e, m));
      }
    } finally {
      if (islemKimligi === yuklemeKimligi.current) {
        yuklemeKilidi.current = false;
        setYukleniyor(false);
      }
    }
  }

  function kirpmayiIptalEt() {
    if (kirpilacak) URL.revokeObjectURL(kirpilacak);
    yuklemeKimligi.current += 1;
    yuklemeKilidi.current = false;
    setKirpilacak(null);
    setYukleniyor(false);
  }

  // ---------------------------------------------------------- kaydet

  async function kaydet() {
    if (yuklemeKilidi.current) return;
    setHata(null);

    if (!u.ad_tr.trim()) return setHata(m("adTrZorunlu"));
    if (!u.ad_ar.trim()) return setHata(m("adArZorunlu"));
    if (!u.kategori_id) return setHata(m("kategoriSecilmeli"));
    if (!u.slug.trim()) return setHata(m("slugZorunlu"));
    if (!masaFiyatGirdisi.trim() || !paketFiyatGirdisi.trim())
      return setHata(m("fiyatZorunlu"));
    if (u.fiyat_masa < 0 || u.fiyat_paket < 0)
      return setHata(m("fiyatNegatif"));
    if (u.ekstralar.some((ekstra) => ekstra.ad_tr.trim() && ekstra.fiyat === ""))
      return setHata(m("fiyatZorunlu"));

    const kaydedilenImza = formImzasi;
    setKaydediliyor(true);
    const db = tarayiciIstemcisi();

    const satir = {
      kategori_id: u.kategori_id,
      slug: u.slug.trim(),
      sira: u.sira,
      ad_tr: u.ad_tr.trim(),
      ad_ar: u.ad_ar.trim(),
      aciklama_tr: u.aciklama_tr.trim() || null,
      aciklama_ar: u.aciklama_ar.trim() || null,
      gorsel_url: u.gorsel_url,
      fiyat_masa: kurus(u.fiyat_masa),
      fiyat_paket: kurus(u.fiyat_paket),
      gramaj: u.gramaj.trim() || null,
      gramaj_ar: u.gramaj_ar.trim() || null,
      kalori: u.kalori,
      alerjenler: u.alerjenler,
      rozet: u.rozet,
      stokta: u.stokta,
      aktif: u.aktif,
    };

    const cikarilanlar = u.cikarilabilirler
      .filter((c) => c.ad_tr.trim())
      .map((c) => ({
        id: c.id ?? null,
        ad_tr: c.ad_tr.trim(),
        ad_ar: c.ad_ar.trim() || c.ad_tr.trim(),
      }));

    const ekstralar = u.ekstralar
      .filter((e) => e.ad_tr.trim())
      .map((e) => ({
        id: e.id ?? null,
        ad_tr: e.ad_tr.trim(),
        ad_ar: e.ad_ar.trim() || e.ad_tr.trim(),
        fiyat: kurus(Number(e.fiyat)),
        stokta: e.stokta,
      }));

    // Urun ve iki secenek listesi PostgreSQL icinde tek transaction olarak
    // yazilir. Herhangi bir alt satir hatasi ana urunu de geri alir.
    const { error } = await db.rpc("admin_urun_ve_masa_kaydet", {
      p_urun_id: u.id,
      p_urun: satir,
      p_cikarilabilirler: cikarilanlar,
      p_ekstralar: ekstralar,
      p_masa_aktif: u.masa_aktif,
    });
    if (error) return kaydetmeHatasi(error);

    kaydedildi(kaydedilenImza);
    await menuyuTazele();
    router.push("/admin");
    router.refresh();
  }

  function kaydetmeHatasi(hata: { code?: string }) {
    console.error("Urun islemi tamamlanamadi:", hata);
    setHata(hata.code === "23505" ? m("slugKullanimda") : m("islemBasarisiz"));
    setKaydediliyor(false);
  }

  async function sil() {
    if (!u.id || yuklemeKilidi.current) return;
    const urunAdi = dil === "ar" ? u.ad_ar || u.ad_tr : u.ad_tr || u.ad_ar;
    if (!confirm(`"${urunAdi}" ${m("silOnay")}`)) return;

    setKaydediliyor(true);
    const db = tarayiciIstemcisi();
    const { error } = await db.from("urunler").delete().eq("id", u.id);
    if (error) return kaydetmeHatasi(error);

    kaydedildi();
    await menuyuTazele();
    router.push("/admin");
    router.refresh();
  }

  // ---------------------------------------------------------- gorunum

  const metinKutusu =
    "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base focus:border-brand";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] sm:px-6">
      {kirpilacak && (
        <FotografKirpma
          kaynak={kirpilacak}
          acanRef={fotografDugmesi}
          onTamam={kirpmaTamam}
          onIptal={() => {
            kirpmayiIptalEt();
          }}
          onHata={(hata) => {
            kirpmayiIptalEt();
            setHata(adminGorselHataMetni(hata, m));
          }}
        />
      )}

      {/* ---------- FOTOGRAF ---------- */}
      <section className="pt-4">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl border border-line bg-card">
          {guvenliGorselUrl && !gorselHatali ? (
            <Image
              src={guvenliGorselUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
              onError={() => setGorselHatali(true)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted">
              {m("fotografYok")}
            </span>
          )}
          {yukleniyor && (
            <span className="absolute inset-0 flex items-center justify-center bg-bg/80 text-sm">
              {m("yukleniyor")}
            </span>
          )}
        </div>

        <input
          ref={dosyaSecici}
          type="file"
          name="urun-gorseli"
          accept="image/jpeg,image/png,image/webp"
          onChange={dosyaSecildi}
          disabled={yukleniyor}
          className="hidden"
        />
        <div className="mt-2 flex gap-2">
          <button
            ref={fotografDugmesi}
            type="button"
            onClick={() => dosyaSecici.current?.click()}
            disabled={yukleniyor}
            className="min-h-12 flex-1 rounded-2xl border border-line bg-card text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
          >
            {u.gorsel_url ? m("fotografDegistir") : m("fotografSec")}
          </button>
          {u.gorsel_url && (
            <button
              type="button"
              onClick={() => guncelle("gorsel_url", null)}
              disabled={yukleniyor}
              className="min-h-12 rounded-2xl border border-line px-4 text-sm text-danger transition active:scale-[0.98] disabled:opacity-50"
            >
              {m("kaldir")}
            </button>
          )}
        </div>
      </section>

      {/* ---------- AD / ACIKLAMA (TR | AR) ---------- */}
      <section className="mt-6">
        <div className="flex gap-1 rounded-2xl border border-line bg-card p-1">
          {(["tr", "ar"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDilSekmesi(d)}
              aria-pressed={dilSekmesi === d}
              className={`min-h-11 flex-1 rounded-xl text-sm font-semibold transition ${
                dilSekmesi === d ? "bg-brand text-bg" : "text-muted"
              }`}
            >
              {d === "tr" ? m("turkce") : m("arapca")}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{m("urunAdi")}</span>
            <input
              name={`urun-adi-${dilSekmesi}`}
              autoComplete="off"
              value={dilSekmesi === "tr" ? u.ad_tr : u.ad_ar}
              onChange={(e) =>
                dilSekmesi === "tr"
                  ? adDegisti(e.target.value)
                  : guncelle("ad_ar", e.target.value)
              }
              dir={dilSekmesi === "ar" ? "rtl" : "ltr"}
              className={metinKutusu}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{m("kisaAciklama")}</span>
            <textarea
              name={`urun-aciklama-${dilSekmesi}`}
              autoComplete="off"
              value={dilSekmesi === "tr" ? u.aciklama_tr : u.aciklama_ar}
              onChange={(e) =>
                guncelle(
                  dilSekmesi === "tr" ? "aciklama_tr" : "aciklama_ar",
                  e.target.value,
                )
              }
              dir={dilSekmesi === "ar" ? "rtl" : "ltr"}
              rows={3}
              className="w-full resize-none rounded-2xl border border-line bg-card p-4 text-base focus:border-brand"
            />
          </label>
        </div>
      </section>

      {/* ---------- FIYATLAR ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("fiyatlar")}
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">{m("masaFiyati")}</span>
            <input
              type="number"
              name="masa-fiyati"
              autoComplete="off"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={masaFiyatGirdisi}
              onChange={(e) => fiyatGirdisiDegisti("fiyat_masa", e.target.value)}
              className={metinKutusu}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">{m("paketFiyati")}</span>
            <input
              type="number"
              name="paket-fiyati"
              autoComplete="off"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={paketFiyatGirdisi}
              onChange={(e) => fiyatGirdisiDegisti("fiyat_paket", e.target.value)}
              className={metinKutusu}
            />
          </label>
        </div>

        {fiyatFarki !== null && (
          <p
            className={`mt-2 text-sm ${
              Math.abs(fiyatFarki) > FARK_UYARI_ESIGI
                ? "text-danger"
                : "text-muted"
            }`}
          >
            {m("fiyatFarkiOnek")}{" "}
            <span className="fiyat font-semibold">
              {fiyatFarki > 0 ? "+" : ""}
              {fiyatFarki}%
            </span>{" "}
            {m("fiyatFarkiSonek")} ({fiyatYaz(u.fiyat_masa)} → {fiyatYaz(u.fiyat_paket)})
            {Math.abs(fiyatFarki) > FARK_UYARI_ESIGI && ` — ${m("kontrolEt")}`}
          </p>
        )}
      </section>

      {/* ---------- DETAYLAR ---------- */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {m("detaylar")}
        </h2>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">{m("gramajTr")}</span>
            <input
              name="porsiyon-miktar-tr"
              autoComplete="off"
              spellCheck={false}
              value={u.gramaj}
              onChange={(e) => guncelle("gramaj", e.target.value)}
              placeholder="180 g"
              className={metinKutusu}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">{m("kalori")}</span>
            <input
              type="number"
              name="kalori"
              autoComplete="off"
              inputMode="numeric"
              min={0}
              value={u.kalori ?? ""}
              onChange={(e) =>
                guncelle(
                  "kalori",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={metinKutusu}
            />
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("gramajAr")}</span>
          <input
            name="porsiyon-miktar-ar"
            autoComplete="off"
            spellCheck={false}
            value={u.gramaj_ar}
            onChange={(e) => guncelle("gramaj_ar", e.target.value)}
            placeholder={m("gramajArIpucu")}
            dir="rtl"
            className={metinKutusu}
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("kategori")}</span>
          <select
            name="kategori"
            autoComplete="off"
            value={u.kategori_id}
            onChange={(e) => guncelle("kategori_id", e.target.value)}
            className={metinKutusu}
          >
            <option value="">{m("sec")}</option>
            {kategoriler.map((k) => (
              <option key={k.id} value={k.id}>
                {dil === "ar" ? k.ad_ar || k.ad_tr : k.ad_tr || k.ad_ar}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm text-muted">{m("rozet")}</span>
          <select
            name="urun-etiketi"
            autoComplete="off"
            value={u.rozet}
            onChange={(e) => guncelle("rozet", e.target.value)}
            className={metinKutusu}
          >
            {ROZETLER.map((r) => (
              <option key={r.kod} value={r.kod}>
                {m(r.anahtar)}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-4 text-sm text-muted">{m("alerjenler")}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {ALERJENLER.map((a) => {
            const secili = u.alerjenler.includes(a.kod);
            return (
              <li key={a.kod}>
                <button
                  type="button"
                  aria-pressed={secili}
                  onClick={() =>
                    guncelle(
                      "alerjenler",
                      secili
                        ? u.alerjenler.filter((x) => x !== a.kod)
                        : [...u.alerjenler, a.kod],
                    )
                  }
                  className={`flex min-h-11 items-center rounded-full border px-4 text-sm transition active:scale-95 ${
                    secili
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-line bg-card text-muted"
                  }`}
                >
                  {m(a.anahtar)}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          <Anahtar
            etiket={m("stokta")}
            acik={u.stokta}
            degistir={(v) => guncelle("stokta", v)}
          />
          <Anahtar
            etiket={m("menudeYayinda")}
            acik={u.aktif}
            degistir={(v) => guncelle("aktif", v)}
          />
          <Anahtar
            etiket={m("masaMenusundeGoster")}
            acik={u.masa_aktif}
            degistir={(v) => guncelle("masa_aktif", v)}
          />
        </div>
      </section>

      {/* ---------- CIKARILABILIRLER ---------- */}
      <SatirDuzenleyici
        baslik={m("cikarilabilirler")}
        ipucu={m("ucretsiz")}
        satirlar={u.cikarilabilirler}
        degistir={(s) => guncelle("cikarilabilirler", s)}
        bosSatir={{ ad_tr: "", ad_ar: "" }}
      />

      {/* ---------- EKSTRALAR ---------- */}
      <SatirDuzenleyici
        baslik={m("ekstralar")}
        ipucu={m("ucretli")}
        satirlar={u.ekstralar}
        degistir={(s) => guncelle("ekstralar", s as FormEkstra[])}
        bosSatir={{ ad_tr: "", ad_ar: "", fiyat: "", stokta: true }}
        fiyatli
        urunAdaylari={ekstraAdaylari.filter((aday) => aday.id !== u.id)}
      />

      {hata && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}

      {!yeniKayit && (
        <button
          type="button"
          onClick={sil}
          disabled={kaydediliyor || yukleniyor}
          className="mt-6 min-h-12 w-full rounded-2xl border border-danger/40 text-sm font-semibold text-danger transition active:scale-[0.98] disabled:opacity-50"
        >
          {m("urunuSil")}
        </button>
      )}

      {/* ---------- KAYDET ---------- */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor || yukleniyor}
          className="mx-auto flex min-h-13 w-full max-w-3xl items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
        >
          {kaydediliyor ? m("kaydediliyor") : m("kaydet")}
        </button>
      </div>
    </div>
  );
}

/** Etiketli acma/kapama anahtari. */
function Anahtar({
  etiket,
  acik,
  degistir,
}: {
  etiket: string;
  acik: boolean;
  degistir: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-2">
      <span className="text-sm">{etiket}</span>
      <button
        type="button"
        role="switch"
        aria-checked={acik}
        aria-label={etiket}
        onClick={() => degistir(!acik)}
        className={`relative h-11 w-16 rounded-full transition ${
          acik ? "bg-brand" : "bg-line"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1.5 h-8 w-8 rounded-full bg-bg transition-[inset-inline-start] ${
            acik ? "start-[1.875rem]" : "start-1.5"
          }`}
        />
      </button>
    </div>
  );
}

/** Cikarilabilir / ekstra satirlarini ekle-sil-sirala. */
function SatirDuzenleyici({
  baslik,
  ipucu,
  satirlar,
  degistir,
  bosSatir,
  fiyatli = false,
  urunAdaylari = [],
}: {
  baslik: string;
  ipucu: string;
  satirlar: FormSecenek[];
  degistir: (s: FormSecenek[]) => void;
  bosSatir: FormSecenek | FormEkstra;
  fiyatli?: boolean;
  urunAdaylari?: EkstraAdayi[];
}) {
  const { m, dil } = useAdminDil();

  function satirGuncelle(i: number, alan: string, deger: string | number) {
    degistir(
      satirlar.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)),
    );
  }

  function tasi(i: number, yon: -1 | 1) {
    const hedef = i + yon;
    if (hedef < 0 || hedef >= satirlar.length) return;
    const yeni = [...satirlar];
    [yeni[i], yeni[hedef]] = [yeni[hedef], yeni[i]];
    degistir(yeni);
  }

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          {baslik}
        </h2>
        <span className="text-xs text-muted">({ipucu})</span>
      </div>

      {fiyatli && urunAdaylari.length > 0 && (
        <label className="mt-3 block">
          <span className="block text-sm text-muted">{m("ekstraUrunSec")}</span>
          <select
            value=""
            onChange={(e) => {
              const secilen = urunAdaylari.find((aday) => aday.id === e.target.value);
              if (!secilen) return;
              const yeniEkstra: FormEkstra = {
                ad_tr: secilen.ad_tr,
                ad_ar: secilen.ad_ar,
                fiyat: secilen.fiyat_paket,
                stokta: secilen.stokta,
              };
              degistir([...satirlar, yeniEkstra]);
            }}
            className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-card px-3 text-base"
          >
            <option value="">{m("ekstraUrunSec")}</option>
            {urunAdaylari.map((aday) => (
              <option key={aday.id} value={aday.id}>
                {dil === "ar" ? aday.ad_ar || aday.ad_tr : aday.ad_tr || aday.ad_ar}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">{m("ekstraUrunKopyaIpucu")}</span>
        </label>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {satirlar.map((s, i) => (
          <li
            key={s.id ?? `yeni-${i}`}
            className="rounded-2xl border border-line bg-card p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                name={`${baslik}-${i}-ad-tr`}
                aria-label={`${baslik} ${i + 1} ${m("turkce")}`}
                autoComplete="off"
                value={s.ad_tr}
                onChange={(e) => satirGuncelle(i, "ad_tr", e.target.value)}
                placeholder={m("turkce")}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm focus:border-brand"
              />
              <input
                name={`${baslik}-${i}-ad-ar`}
                aria-label={`${baslik} ${i + 1} العربية`}
                autoComplete="off"
                value={s.ad_ar}
                onChange={(e) => satirGuncelle(i, "ad_ar", e.target.value)}
                placeholder="العربية"
                dir="rtl"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm focus:border-brand"
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              {fiyatli && (
                <input
                  type="number"
                  name={`${baslik}-${i}-fiyat`}
                  autoComplete="off"
                  aria-label={`${baslik} ${i + 1} ${m("fiyat")}`}
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={(s as FormEkstra).fiyat}
                  onChange={(e) =>
                    satirGuncelle(i, "fiyat", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder={m("fiyat")}
                  className="fiyat min-h-11 w-28 rounded-xl border border-line bg-bg px-3 text-sm focus:border-brand"
                />
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => tasi(i, -1)}
                disabled={i === 0}
                aria-label={`${dil === "ar" ? s.ad_ar || s.ad_tr || i + 1 : s.ad_tr || s.ad_ar || i + 1} ${m("yukariTasi")}`}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-muted disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => tasi(i, 1)}
                disabled={i === satirlar.length - 1}
                aria-label={`${dil === "ar" ? s.ad_ar || s.ad_tr || i + 1 : s.ad_tr || s.ad_ar || i + 1} ${m("asagiTasi")}`}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-muted disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => degistir(satirlar.filter((_, j) => j !== i))}
                aria-label={`${dil === "ar" ? s.ad_ar || s.ad_tr || i + 1 : s.ad_tr || s.ad_ar || i + 1} ${m("satiriSil")}`}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-danger"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => degistir([...satirlar, { ...bosSatir }])}
        className="mt-2 min-h-12 w-full rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition active:scale-[0.98]"
      >
        {m("satirEkle")}
      </button>
    </section>
  );
}
