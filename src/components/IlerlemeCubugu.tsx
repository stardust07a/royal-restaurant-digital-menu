"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Sayfanin en ustunde ince ilerleme cubugu.
 *
 * Sunucuda uretilen sayfalara gecerken kisa bir bekleme oluyor ve ekranda
 * hicbir sey degismedigi icin uygulama "kasiyor" gibi hissettiriyordu.
 * Bu cubuk, dokunuldugu anda geri bildirim veriyor.
 *
 * NEDEN loading.tsx DEGIL: loading.tsx segmenti Suspense/streaming moduna
 * sokuyor, DOM'da iki <main> olusuyor ve sayfa tiklanamaz hale geliyordu.
 * Bu cozum sayfa agacina hic dokunmuyor — sadece baglantı tiklamalarini
 * dinleyip yol degisince kapaniyor.
 */
const GECIKME_MS = 120; // bu sureden kisa gecislerde cubuk hic gorunmesin
const EMNIYET_MS = 8000; // takilirsa kendiliginden kapansin

export default function IlerlemeCubugu() {
  const yol = usePathname();
  const [gorunur, setGorunur] = useState(false);
  const zamanlayicilar = useRef<number[]>([]);

  function temizle() {
    zamanlayicilar.current.forEach((z) => clearTimeout(z));
    zamanlayicilar.current = [];
  }

  // Yol degistiginde gecis bitmistir
  useEffect(() => {
    temizle();
    setGorunur(false);
  }, [yol]);

  useEffect(() => {
    function tiklama(e: MouseEvent) {
      // Yeni sekme / indirme / degistirici tuslar bizim isimiz degil
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const hedef = (e.target as HTMLElement | null)?.closest("a");
      if (!hedef) return;
      if (hedef.target === "_blank" || hedef.hasAttribute("download")) return;

      const adres = hedef.getAttribute("href");
      if (!adres || adres.startsWith("#")) return;

      // Sadece uygulama ici gezinme
      let hedefYol: string;
      try {
        const u = new URL(hedef.href, window.location.href);
        if (u.origin !== window.location.origin) return;
        hedefYol = u.pathname + u.search;
      } catch {
        return;
      }
      if (hedefYol === window.location.pathname + window.location.search) return;

      temizle();
      zamanlayicilar.current.push(
        window.setTimeout(() => setGorunur(true), GECIKME_MS),
        window.setTimeout(() => setGorunur(false), EMNIYET_MS),
      );
    }

    document.addEventListener("click", tiklama, { capture: true });
    return () => {
      document.removeEventListener("click", tiklama, { capture: true });
      temizle();
    };
  }, []);

  if (!gorunur) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-line"
    >
      <span className="ilerleme block h-full w-1/3 bg-brand" />
      <span className="sr-only">…</span>
    </div>
  );
}
