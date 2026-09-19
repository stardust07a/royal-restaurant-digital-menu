"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAdminDil } from "@/lib/admin-dil";

/** Baski kalitesi icin yuksek cozunurluk. */
const QR_BOYUT = 1024;

/**
 * Masa menusu QR kodu.
 *
 * Adres tarayicidan okunur — geliştirme sirasinda localhost, yayinda gercek
 * alan adi cikar. Boylece elle guncelleme gerekmez.
 */
export default function QrUretici({ masaImzalari }: { masaImzalari: string[] }) {
  const { dil, m } = useAdminDil();
  const [seciliMasa, setSeciliMasa] = useState(1);
  const [adres, setAdres] = useState("");
  const [pngUrl, setPngUrl] = useState("");
  const [hata, setHata] = useState(false);

  useEffect(() => {
    const imza = masaImzalari[seciliMasa - 1];
    setAdres(imza ? `${window.location.origin}/masa/${seciliMasa}?imza=${imza}` : "");
  }, [masaImzalari, seciliMasa]);

  useEffect(() => {
    if (!adres) return;
    let iptal = false;
    setHata(false);
    setPngUrl("");
    QRCode.toDataURL(adres, {
      width: QR_BOYUT,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0B1416", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!iptal) setPngUrl(url);
      })
      .catch((error: unknown) => {
        console.error("QR kodu olusturulamadi:", error);
        if (!iptal) setHata(true);
      });
    return () => {
      iptal = true;
    };
  }, [adres]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <p className="mt-4 text-sm text-muted">{m("qrMasaSecIpucu")}</p>
      <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label={m("qrMasaSecIpucu")}>
        {masaImzalari.map((_, i) => (
          <button
            key={i + 1}
            type="button"
            onClick={() => setSeciliMasa(i + 1)}
            aria-pressed={seciliMasa === i + 1}
            className={`min-h-12 rounded-xl border font-bold ${seciliMasa === i + 1 ? "border-brand bg-brand text-white" : "border-line bg-card"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm text-muted">{m("masaNo")} {seciliMasa} · {m("qrAdres")}</span>
        <input
          type="url"
          name="qr-adresi"
          value={adres}
          readOnly
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base focus:border-brand"
        />
      </label>
      <p className="mt-1 text-xs text-muted">
        {m("qrAdresIpucu")}
      </p>

      {!masaImzalari[seciliMasa - 1] && (
        <p role="alert" className="mt-3 text-sm text-danger">{m("qrYapilandirmaHatasi")}</p>
      )}

      {hata && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
        >
          {m("qrOlusturmaHatasi")}
        </p>
      )}

      {pngUrl && (
        <>
          <div className="mt-6 rounded-3xl bg-white p-6">
            {/* QR beyaz zemin gerektirir; next/image data URL'i optimize edemez */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pngUrl}
              alt={m("qrBaslik")}
              width={QR_BOYUT}
              height={QR_BOYUT}
              className="h-auto w-full"
            />
          </div>

          <a
            href={pngUrl}
            download={`royal-masa-${seciliMasa}-qr.png`}
            className="mt-4 flex min-h-13 items-center justify-center rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98]"
          >
            {m("pngIndir")}
          </a>

          <button
            type="button"
            onClick={() =>
              yazdir(pngUrl, adres, {
                dil,
                baslik: `${m("qrBaskiBaslik")} — ${m("masaNo")} ${seciliMasa}`,
                menuEtiketi: `${m("masaNo")} ${seciliMasa}`,
              })
            }
            className="mt-3 flex min-h-13 w-full items-center justify-center rounded-2xl border border-brand/50 font-semibold text-brand-light transition active:scale-[0.98]"
          >
            {m("a5Baski")}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Baskiya hazir A5 sayfayi yeni pencerede acar.
 *
 * Ayri bir PDF kutuphanesi eklemek yerine tarayicinin yazdirma penceresi
 * kullaniliyor: "PDF olarak kaydet" secenegi zaten orada ve sayfa boyutu
 * @page kuralindan geliyor.
 */
function yazdir(
  pngUrl: string,
  adres: string,
  metin: { dil: "tr" | "ar"; baslik: string; menuEtiketi: string },
) {
  const pencere = window.open("", "_blank");
  if (!pencere) return;
  const guvenliPng = htmlKacir(pngUrl);
  const guvenliAdres = htmlKacir(adres);
  const guvenliBaslik = htmlKacir(metin.baslik);
  const guvenliMenu = htmlKacir(metin.menuEtiketi);
  const yon = metin.dil === "ar" ? "rtl" : "ltr";

  pencere.document.write(`<!doctype html>
<html lang="${metin.dil}" dir="${yon}"><head><meta charset="utf-8"><title>${guvenliBaslik}</title>
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, sans-serif; background:#fff; color:#0B1416;
         width:148mm; height:210mm; display:flex; flex-direction:column;
         align-items:center; justify-content:center; gap:8mm; padding:14mm; }
  .marka { font-size:11mm; font-weight:800; letter-spacing:.5mm; }
  .cizgi { width:30mm; height:1mm; background:#C9962F; border-radius:1mm; }
  .baslik { font-size:7mm; font-weight:600; }
  .baslik span { display:block; font-size:6mm; color:#555; margin-top:1mm; }
  img { width:88mm; height:88mm; }
  .adres { font-size:3.4mm; color:#666; word-break:break-all; text-align:center; }
</style></head>
<body>
  <div class="marka">ROYAL RESTAURANT</div>
  <div class="cizgi"></div>
  <div class="baslik">${guvenliMenu}</div>
  <img src="${guvenliPng}" width="1024" height="1024" alt="">
  <div class="adres">${guvenliAdres}</div>
</body></html>`);

  pencere.document.close();
  pencere.focus();
  const qr = pencere.document.querySelector("img");
  if (qr?.complete) pencere.print();
  else qr?.addEventListener("load", () => pencere.print(), { once: true });
}

function htmlKacir(deger: string): string {
  const eslesme: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return deger.replace(/[&<>"']/g, (karakter) => eslesme[karakter]);
}
