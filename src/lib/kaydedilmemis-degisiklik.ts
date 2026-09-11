"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Form degisikliklerini yenileme/kapatma ve gercek baglanti tiklamalarinda
 * korur. Next router icin kararsiz dahili API kullanmaz; programatik kaydetme
 * yonlendirmeleri `kaydedildi` ile once temizlenir.
 */
export function useKaydedilmemisDegisiklik(
  guncelImza: string,
  uyariMetni: string,
) {
  const [kayitliImza, setKayitliImza] = useState(guncelImza);
  const degisiklikVar = guncelImza !== kayitliImza;
  const degisiklikRef = useRef(degisiklikVar);
  const guncelRef = useRef(guncelImza);
  const uyariRef = useRef(uyariMetni);

  degisiklikRef.current = degisiklikVar;
  guncelRef.current = guncelImza;
  uyariRef.current = uyariMetni;

  useEffect(() => {
    function kapanis(e: BeforeUnloadEvent) {
      if (!degisiklikRef.current) return;
      e.preventDefault();
      e.returnValue = uyariRef.current;
    }

    function baglantiTiklamasi(e: MouseEvent) {
      if (
        !degisiklikRef.current ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        !(e.target instanceof Element)
      ) {
        return;
      }

      const baglanti = e.target.closest<HTMLAnchorElement>("a[href]");
      if (!baglanti || baglanti.target === "_blank" || baglanti.hasAttribute("download")) {
        return;
      }

      const hedef = new URL(baglanti.href, window.location.href);
      if (hedef.href === window.location.href) return;
      if (window.confirm(uyariRef.current)) return;

      e.preventDefault();
      e.stopPropagation();
    }

    window.addEventListener("beforeunload", kapanis);
    document.addEventListener("click", baglantiTiklamasi, true);
    return () => {
      window.removeEventListener("beforeunload", kapanis);
      document.removeEventListener("click", baglantiTiklamasi, true);
    };
  }, []);

  const kaydedildi = useCallback((imza?: string) => {
    const yeniKayitliImza = imza ?? guncelRef.current;
    degisiklikRef.current = guncelRef.current !== yeniKayitliImza;
    setKayitliImza(yeniKayitliImza);
  }, []);

  return { degisiklikVar, kaydedildi };
}
