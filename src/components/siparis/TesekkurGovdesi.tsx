"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { whatsappUrlDogrula } from "@/lib/guvenli-url";

/** SepetGovdesi'nin biraktigi WhatsApp baglantisi. */
const WA_ANAHTARI = "royal_son_whatsapp";

/**
 * Tesekkur sayfasinin istemci parcasi.
 *
 * WhatsApp bazi tarayicilarda kendiliginden acilmiyor (acilir pencere
 * engeli, uygulama yuklu degil). Baglantiyi elde tutup manuel bir dugme
 * sunuyoruz — siparis kaydedildi ama restorana ulasmadi durumu olmasin.
 */
export default function TesekkurGovdesi() {
  const t = useTranslations("siparis");
  const [baglanti, setBaglanti] = useState<string | null>(null);

  useEffect(() => {
    try {
      setBaglanti(whatsappUrlDogrula(sessionStorage.getItem(WA_ANAHTARI)));
    } catch {
      // sessionStorage kapaliysa dugme gosterilmez, sorun degil.
    }
  }, []);

  if (!baglanti) return null;

  return (
    <>
      <p className="mt-8 text-sm text-muted">{t("whatsappAcilmadiMi")}</p>
      <a
        href={baglanti}
        className="mt-3 flex min-h-13 items-center justify-center rounded-2xl border border-brand/50 px-6 font-semibold text-brand-light transition active:scale-[0.98]"
      >
        {t("whatsappTekrarAc")}
      </a>
    </>
  );
}
