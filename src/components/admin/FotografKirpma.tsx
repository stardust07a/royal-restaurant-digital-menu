"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { useAdminDil } from "@/lib/admin-dil";
import { useModalOdak } from "@/lib/modal-odak";

/** Menu fotograflarinin hedef olculeri — kartlar 4:3 gosteriyor. */
const HEDEF_GENISLIK = 1200;
const HEDEF_YUKSEKLIK = 900;
const WEBP_KALITE = 0.85;

/**
 * Secilen fotografi 4:3 cerceveyle kirpar ve 1200x900 WebP uretir.
 *
 * Kirpma tarayicida yapiliyor: yuklenen dosya kucultulmus halde gidiyor,
 * boylece hem depolama hem de telefondan yukleme suresi kucuk kaliyor.
 */
export default function FotografKirpma({
  kaynak,
  acanRef,
  onTamam,
  onIptal,
  onHata,
}: {
  /** Secilen dosyanin object URL'i */
  kaynak: string;
  acanRef: RefObject<HTMLElement | null>;
  onTamam: (webp: Blob) => void;
  onIptal: () => void;
  onHata: (hata: unknown) => void;
}) {
  const { m } = useAdminDil();
  const [kirpma, setKirpma] = useState({ x: 0, y: 0 });
  const [yakinlik, setYakinlik] = useState(1);
  const [alan, setAlan] = useState<Area | null>(null);
  const [isleniyor, setIsleniyor] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalOdak({
    acik: true,
    dialogRef,
    openerRef: acanRef,
    onKapat: () => {
      if (!isleniyor) onIptal();
    },
  });

  const kirpmaBitti = useCallback((_: Area, pikselAlani: Area) => {
    setAlan(pikselAlani);
  }, []);

  async function uygula() {
    if (!alan || isleniyor) return;
    setIsleniyor(true);
    try {
      const blob = await kirpilmisWebp(kaynak, alan);
      onTamam(blob);
    } catch (hata) {
      console.error("Fotograf kirpilamadi:", hata);
      onHata(hata);
    } finally {
      setIsleniyor(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fotograf-kirpma-baslik"
      data-modal-katmani="true"
      className="kaydirma-kapali fixed inset-0 z-50 flex flex-col bg-bg"
    >
      <h2 id="fotograf-kirpma-baslik" className="sr-only">
        {m("fotografKirpmaBaslik")}
      </h2>
      <div className="relative flex-1">
        <Cropper
          image={kaynak}
          crop={kirpma}
          zoom={yakinlik}
          aspect={HEDEF_GENISLIK / HEDEF_YUKSEKLIK}
          onCropChange={setKirpma}
          onZoomChange={setYakinlik}
          onCropComplete={kirpmaBitti}
          showGrid
        />
      </div>

      <div className="border-t border-line bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        <label className="flex items-center gap-3">
          <span className="text-sm text-muted">{m("yakinlastir")}</span>
          <input
            type="range"
            name="fotograf-yakinlastirma"
            aria-label={m("yakinlastir")}
            min={1}
            max={3}
            step={0.01}
            value={yakinlik}
            onChange={(e) => setYakinlik(Number(e.target.value))}
            className="h-11 flex-1 accent-[var(--color-brand)]"
          />
        </label>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={onIptal}
            disabled={isleniyor}
            className="min-h-13 flex-1 rounded-2xl border border-line font-semibold text-muted transition active:scale-[0.98] disabled:text-muted/50"
          >
            {m("vazgec")}
          </button>
          <button
            type="button"
            onClick={uygula}
            disabled={!alan || isleniyor}
            className="min-h-13 flex-1 rounded-2xl bg-brand font-bold text-bg transition active:scale-[0.98] disabled:bg-line disabled:text-muted"
          >
            {isleniyor ? m("haziriliyor") : m("kirpKullan")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Kirpma alanini 1200x900 tuvale cizip WebP blob dondurur. */
function kirpilmisWebp(kaynak: string, alan: Area): Promise<Blob> {
  return new Promise((cozumle, reddet) => {
    const resim = new Image();
    resim.crossOrigin = "anonymous";
    resim.onerror = () => reddet(new Error("Fotoğraf okunamadı."));
    resim.onload = () => {
      const tuval = document.createElement("canvas");
      tuval.width = HEDEF_GENISLIK;
      tuval.height = HEDEF_YUKSEKLIK;

      const ctx = tuval.getContext("2d");
      if (!ctx) return reddet(new Error("Tuval oluşturulamadı."));

      ctx.drawImage(
        resim,
        alan.x,
        alan.y,
        alan.width,
        alan.height,
        0,
        0,
        HEDEF_GENISLIK,
        HEDEF_YUKSEKLIK,
      );

      tuval.toBlob(
        (blob) =>
          blob
            ? cozumle(blob)
            : reddet(new Error("Fotoğraf dönüştürülemedi.")),
        "image/webp",
        WEBP_KALITE,
      );
    };
    resim.src = kaynak;
  });
}
