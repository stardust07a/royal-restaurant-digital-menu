"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { tarayiciIstemcisi } from "@/lib/supabase-tarayici";
import { menuyuTazele } from "@/lib/admin-eylemleri";
import { gorselDogrula, gorselYukle } from "@/lib/gorsel-yukle";
import { adminGorselHataMetni } from "@/lib/admin-gorsel-hatasi";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";
import FotografKirpma from "./FotografKirpma";
import { useAdminDil } from "@/lib/admin-dil";
import { useKaydedilmemisDegisiklik } from "@/lib/kaydedilmemis-degisiklik";

export interface FormKategori {
  id: string | null;
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr: string;
  aciklama_ar: string;
  gorsel_url: string | null;
  aktif: boolean;
  /** Duzenlemede: bu kategoriye bagli urun sayisi. Silme uyarisi icin. */
  urunSayisi: number;
}

export interface FormKategoriSecenegi {
  id: string;
  ad_tr: string;
  ad_ar: string;
}

export interface FormKategoriUrunu {
  id: string;
  kategori_id: string;
  ad_tr: string;
  ad_ar: string;
  aktif: boolean;
  sira: number;
}

/** Kaydetme anında eski sayfa verisinin değişmediğini doğrulamak için kullanılır. */
export interface FormKategoriParmakIzi {
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr: string | null;
  aciklama_ar: string | null;
  gorsel_url: string | null;
  aktif: boolean;
}

/** Turkce karakterleri sadelestirip slug uretir. */
function slugla(ham: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ham
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (h) => harita[h] ?? h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function KategoriFormu({
  baslangic,
  kategoriler = [],
  urunler = [],
  orijinalParmakIzi,
  urunListesiSiniraUlasti = false,
}: {
  baslangic: FormKategori;
  kategoriler?: FormKategoriSecenegi[];
  urunler?: FormKategoriUrunu[];
  orijinalParmakIzi?: FormKategoriParmakIzi;
  urunListesiSiniraUlasti?: boolean;
}) {
  const { m, dil } = useAdminDil();
  const router = useRouter();
  const [k, setK] = useState<FormKategori>(baslangic);
  const [dilSekmesi, setDilSekmesi] = useState<"tr" | "ar">("tr");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gorselHatali, setGorselHatali] = useState(false);
  const [kirpilacak, setKirpilacak] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [urunAramasi, setUrunAramasi] = useState("");
  const baslangicUrunIds = useMemo(
    () => urunler.filter((urun) => urun.kategori_id === baslangic.id).map((urun) => urun.id),
    [baslangic.id, urunler],
  );
  const [seciliUrunIds, setSeciliUrunIds] = useState<string[]>(baslangicUrunIds);
  const [tasimaKategoriId, setTasimaKategoriId] = useState("");
  const dosyaSecici = useRef<HTMLInputElement>(null);
  const fotografDugmesi = useRef<HTMLButtonElement>(null);
  // Dosya secimi, kirpma ve yukleme tek bir islem olsun. State bir render
  // sonra guncellendigi icin ref, hizli cift secimlerde ikinci yuklemeyi de
  // engeller; islem kimligi ise eski bir Promise sonucunun yeni gorseli
  // ezmesini onler.
  const yuklemeKilidi = useRef(false);
  const yuklemeKimligi = useRef(0);
  const formImzasi = JSON.stringify({
    kategori: k,
    seciliUrunIds: [...seciliUrunIds].sort(),
    tasimaKategoriId,
  });
  const { kaydedildi } = useKaydedilmemisDegisiklik(
    formImzasi,
    m("kaydedilmemisUyari"),
  );

  const yeniKayit = k.id === null;
  const kategoriParmakIzi: FormKategoriParmakIzi = orijinalParmakIzi ?? {
    slug: baslangic.slug,
    sira: baslangic.sira,
    ad_tr: baslangic.ad_tr,
    ad_ar: baslangic.ad_ar,
    aciklama_tr: baslangic.aciklama_tr || null,
    aciklama_ar: baslangic.aciklama_ar || null,
    gorsel_url: baslangic.gorsel_url,
    aktif: baslangic.aktif,
  };
  const baslangicSeciliKumesi = useMemo(
    () => new Set(baslangicUrunIds),
    [baslangicUrunIds],
  );
  const seciliUrunKumesi = useMemo(() => new Set(seciliUrunIds), [seciliUrunIds]);
  const baslangicFormImzasi = useMemo(
    () => JSON.stringify({
      kategori: baslangic,
      seciliUrunIds: [...baslangicUrunIds].sort(),
      tasimaKategoriId: "",
    }),
    [baslangic, baslangicUrunIds],
  );
  const degisiklikVar = formImzasi !== baslangicFormImzasi;
  const cikarilanUrunIds = baslangicUrunIds.filter((id) => !seciliUrunKumesi.has(id));
  const guvenliGorselUrl = nextGorselUrlDogrula(k.gorsel_url);
  useEffect(() => {
    setGorselHatali(false);
  }, [guvenliGorselUrl]);
  const gorunenUrunler = useMemo(() => {
    const arama = urunAramasi.trim().toLocaleLowerCase(dil === "ar" ? "ar" : "tr");
    if (!arama) return urunler;
    return urunler.filter((urun) =>
      `${urun.ad_tr} ${urun.ad_ar}`.toLocaleLowerCase(dil === "ar" ? "ar" : "tr").includes(arama),
    );
  }, [dil, urunAramasi, urunler]);
  const kategoriAdlari = useMemo(
    () => new Map(kategoriler.map((kategori) => [
      kategori.id,
      dil === "ar" ? kategori.ad_ar || kategori.ad_tr : kategori.ad_tr || kategori.ad_ar,
    ])),
    [dil, kategoriler],
  );

  function guncelle<T extends keyof FormKategori>(
    alan: T,
    deger: FormKategori[T],
  ) {
    setK((o) => ({ ...o, [alan]: deger }));
  }

  /** Yeni kayitta ad yazildikca slug kendiliginden turetilir. */
  function adDegisti(deger: string) {
    setK((o) => ({
      ...o,
      ad_tr: deger,
      slug: yeniKayit ? slugla(deger) : o.slug,
    }));
  }

  async function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya || yuklemeKilidi.current) return;
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
      const url = await gorselYukle(blob, "kategoriler", k.slug || k.ad_tr);
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

  async function kaydet() {
    if (yuklemeKilidi.current) return;
    setHata(null);
    if (!k.ad_tr.trim()) return setHata(m("adTrZorunlu"));
    if (!k.ad_ar.trim()) return setHata(m("adArZorunlu"));
    if (!k.slug.trim()) return setHata(m("slugZorunlu"));
    if (k.ad_tr.trim().length > 200 || k.ad_ar.trim().length > 200)
      return setHata(m("kategoriAdiCokUzun"));
    if (k.aciklama_tr.length > 2000 || k.aciklama_ar.length > 2000)
      return setHata(m("kategoriAciklamaCokUzun"));
    if (urunListesiSiniraUlasti) return setHata(m("urunListesiSiniraUlasti"));
    if (!yeniKayit && cikarilanUrunIds.length > 0 && !tasimaKategoriId)
      return setHata(m("cikarilanUrunHedefiZorunlu"));

    const kaydedilenImza = formImzasi;
    setKaydediliyor(true);
    const db = tarayiciIstemcisi();

    const satir = {
      slug: k.slug.trim(),
      sira: k.sira,
      ad_tr: k.ad_tr.trim(),
      ad_ar: k.ad_ar.trim(),
      aciklama_tr: k.aciklama_tr.trim() || null,
      aciklama_ar: k.aciklama_ar.trim() || null,
      gorsel_url: k.gorsel_url,
      aktif: k.aktif,
    };

    const urunKategoriDegisiklikleri = yeniKayit
      ? []
      : urunler.flatMap((urun) => {
          const onceSecili = baslangicSeciliKumesi.has(urun.id);
          const simdiSecili = seciliUrunKumesi.has(urun.id);
          if (onceSecili === simdiSecili) return [];
          return [{
            id: urun.id,
            onceki_kategori_id: urun.kategori_id,
            kategori_id: simdiSecili ? k.id! : tasimaKategoriId,
          }];
        });

    const { error } = yeniKayit
      ? await db.from("kategoriler").insert(satir)
      : await db.rpc("admin_kategori_urunlerini_kaydet", {
          p_kategori_id: k.id!,
          p_kategori: satir,
          p_orijinal_kategori: kategoriParmakIzi,
          p_urun_kategorileri: urunKategoriDegisiklikleri,
        });

    if (error) {
      console.error("Kategori kaydedilemedi:", error);
      setHata(
        error.code === "23505"
          ? m("slugKullanimda")
          : error.code === "40001"
            ? error.message === "Kategori kaydi guncel degil"
              ? m("kategoriKaydiDegisti")
              : m("urunListesiDegisti")
            : m("islemBasarisiz"),
      );
      setKaydediliyor(false);
      return;
    }

    kaydedildi(kaydedilenImza);
    await menuyuTazele();
    router.push("/admin/kategoriler");
    router.refresh();
  }

  async function sil() {
    if (!k.id || yuklemeKilidi.current) return;
    if (degisiklikVar) return setHata(m("silmedenOnceDegisiklikleriKaydet"));
    const kategoriAdi = dil === "ar" ? k.ad_ar || k.ad_tr : k.ad_tr || k.ad_ar;
    if (!confirm(`"${kategoriAdi}" ${m("kategoriSilOnay")}`)) return;

    setKaydediliyor(true);
    const db = tarayiciIstemcisi();
    const { error } = await db.rpc("admin_kategori_sil", { p_kategori_id: k.id });

    if (error) {
      console.error("Kategori silinemedi:", error);
      setHata(error.code === "23503" ? m("kategoriSilinemiyorUrunVar") : m("islemBasarisiz"));
      setKaydediliyor(false);
      return;
    }

    kaydedildi();
    await menuyuTazele();
    router.push("/admin/kategoriler");
    router.refresh();
  }

  const kutu =
    "min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base focus:border-brand";

  return (
    <div className="mx-auto max-w-lg px-4 pb-[calc(11rem+env(safe-area-inset-bottom))]">
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

      {/* ---------- KAPAK ---------- */}
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
              {m("kapakYok")}
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
          name="kategori-gorseli"
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
            {k.gorsel_url ? m("kapakDegistir") : m("kapakSec")}
          </button>
          {k.gorsel_url && (
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

      {/* ---------- AD / ACIKLAMA ---------- */}
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
            <span className="text-sm text-muted">{m("kategoriAdi")}</span>
            <input
              name={`kategori-adi-${dilSekmesi}`}
              autoComplete="off"
              value={dilSekmesi === "tr" ? k.ad_tr : k.ad_ar}
              onChange={(e) =>
                dilSekmesi === "tr"
                  ? adDegisti(e.target.value)
                  : guncelle("ad_ar", e.target.value)
              }
              dir={dilSekmesi === "ar" ? "rtl" : "ltr"}
              maxLength={200}
              className={kutu}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{m("kisaAciklama")}</span>
            <textarea
              name={`kategori-aciklama-${dilSekmesi}`}
              autoComplete="off"
              value={
                dilSekmesi === "tr" ? k.aciklama_tr : k.aciklama_ar
              }
              onChange={(e) =>
                guncelle(
                  dilSekmesi === "tr" ? "aciklama_tr" : "aciklama_ar",
                  e.target.value,
                )
              }
              dir={dilSekmesi === "ar" ? "rtl" : "ltr"}
              maxLength={2000}
              rows={3}
              className={kutu}
            />
          </label>
        </div>
      </section>

      {/* ---------- DETAY ---------- */}
      <section className="mt-6 flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">{m("sira")}</span>
          <input
            type="number"
            name="kategori-sirasi"
            autoComplete="off"
            inputMode="numeric"
            value={k.sira}
            onChange={(e) => guncelle("sira", Number(e.target.value))}
            className={kutu}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">{m("slug")}</span>
          <input
            name="kategori-slug"
            value={k.slug}
            onChange={(e) => guncelle("slug", e.target.value)}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            className={kutu}
          />
        </label>
      </section>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-2">
        <div>
          <p className="text-sm">{m("menudeYayinda")}</p>
          <p className="text-xs text-muted">
            {m("kategoriKapatUyari")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={k.aktif}
          aria-label={m("menudeYayinda")}
          onClick={() => guncelle("aktif", !k.aktif)}
          className={`relative h-11 w-16 shrink-0 rounded-full transition ${
            k.aktif ? "bg-brand" : "bg-line"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-1.5 h-8 w-8 rounded-full bg-bg transition-[inset-inline-start] ${
              k.aktif ? "start-[1.875rem]" : "start-1.5"
            }`}
          />
        </button>
      </div>

      {!yeniKayit && (
        <section className="mt-6 rounded-3xl border border-line bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{m("kategoriUrunleri")}</h2>
              <p className="mt-1 text-sm text-muted">{m("kategoriUrunleriIpucu")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
              {seciliUrunIds.length} {m("urunSayisi")}
            </span>
          </div>

          <label className="mt-4 block">
            <span className="sr-only">{m("urunSecimiAra")}</span>
            <input
              type="search"
              name="kategori-urun-ara"
              autoComplete="off"
              value={urunAramasi}
              onChange={(e) => setUrunAramasi(e.target.value)}
              placeholder={m("urunSecimiAra")}
              className={kutu}
            />
          </label>

          <ul className="uzun-liste mt-3 max-h-96 space-y-2 overflow-y-auto pe-1">
            {gorunenUrunler.map((urun) => {
              const secili = seciliUrunKumesi.has(urun.id);
              const mevcutKategori = kategoriAdlari.get(urun.kategori_id) ?? m("bilinmeyenKategori");
              return (
                <li key={urun.id}>
                  <label
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 transition ${
                      secili ? "border-brand bg-brand/10" : "border-line bg-bg"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={secili}
                      onChange={() =>
                        setSeciliUrunIds((onceki) =>
                          secili ? onceki.filter((id) => id !== urun.id) : [...onceki, urun.id],
                        )
                      }
                      className="h-5 w-5 shrink-0 accent-brand"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {dil === "ar" ? urun.ad_ar || urun.ad_tr : urun.ad_tr || urun.ad_ar}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {urun.kategori_id === k.id ? m("buKategori") : mevcutKategori}
                        {!urun.aktif && ` · ${m("yayindaDegil")}`}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {gorunenUrunler.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">{m("urunBulunamadi")}</p>
          )}

          {cikarilanUrunIds.length > 0 && (
            <label className="mt-4 flex flex-col gap-1.5 rounded-2xl border border-accent/40 bg-accent/10 p-3">
              <span className="text-sm font-semibold">
                {cikarilanUrunIds.length} {m("cikarilanUrunleriTasi")}
              </span>
              <select
                name="cikarilan-urun-hedef-kategorisi"
                value={tasimaKategoriId}
                onChange={(e) => setTasimaKategoriId(e.target.value)}
                className={kutu}
              >
                <option value="">{m("kategoriSec")}</option>
                {kategoriler
                  .filter((kategori) => kategori.id !== k.id)
                  .map((kategori) => (
                    <option key={kategori.id} value={kategori.id}>
                      {dil === "ar" ? kategori.ad_ar || kategori.ad_tr : kategori.ad_tr || kategori.ad_ar}
                    </option>
                  ))}
              </select>
              <span className="text-xs text-muted">{m("cikarilanUrunleriTasiIpucu")}</span>
            </label>
          )}
        </section>
      )}

      {urunListesiSiniraUlasti && (
        <p role="alert" className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {m("urunListesiSiniraUlasti")}
        </p>
      )}

      {hata && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {hata}
        </p>
      )}

      {!yeniKayit && (
        <>
          {k.urunSayisi > 0 && (
            <p className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
              {m("buKategoride")} {k.urunSayisi} {m("urunVar")} {m("kategoriUrunUyari")}
            </p>
          )}
          {degisiklikVar && (
            <p className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
              {m("silmedenOnceDegisiklikleriKaydet")}
            </p>
          )}
          <button
            type="button"
            onClick={sil}
            disabled={kaydediliyor || yukleniyor || degisiklikVar || k.urunSayisi > 0 || urunListesiSiniraUlasti}
            className="mt-3 min-h-12 w-full rounded-2xl border border-danger/40 text-sm font-semibold text-danger transition active:scale-[0.98]"
          >
            {m("kategoriyiSil")}
          </button>
        </>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={kaydet}
          disabled={kaydediliyor || yukleniyor || urunListesiSiniraUlasti}
          className="mx-auto flex min-h-13 w-full max-w-lg items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
        >
          {kaydediliyor ? m("kaydediliyor") : m("kaydet")}
        </button>
      </div>
    </div>
  );
}
