"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Ogenin ust kenari ekranin bu oranina girince belirir. */
const ESIK_ORANI = 0.92;

/**
 * Gorunur alana girince icerigi yumusakca belirtir.
 *
 * Tasarim kararlari:
 *
 * 1. Gizleme CSS'te DEGIL, JS'te yapilir. Boylece JS calismazsa icerik
 *    tam gorunur kalir — animasyon hicbir kosulda iceriği yutmaz.
 * 2. IntersectionObserver yerine pasif scroll dinleyicisi kullanilir.
 *    IO, sayfa kare uretmeyen ortamlarda (arka plan sekmesi, gizli panel)
 *    hic tetiklenmeyebiliyor; boyle bir durumda icerik kalici olarak
 *    gorunmez kalirdi. Konum hesabi rAF ile sinirlanip tek seferlik.
 * 3. framer-motion yerine CSS: ~35 kB yerine birkac satir, ve animasyon
 *    yalnizca transform + opacity uzerinde (compositor dostu).
 */
export default function Belirme({
  children,
  gecikme = 0,
  className = "",
}: {
  children: ReactNode;
  /** ms cinsinden gecikme — art arda gelen ogeleri kademelendirmek icin */
  gecikme?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const oge = ref.current;
    if (!oge) return;

    // Hareket azaltilmissa hic gizleme
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let bitti = false;

    const goster = () => {
      if (bitti) return;
      bitti = true;
      oge.classList.remove("gizle");
      oge.classList.add("icerde");
      window.removeEventListener("scroll", kontrol);
      window.removeEventListener("resize", kontrol);
      clearTimeout(emniyet);
    };

    // requestAnimationFrame KULLANILMIYOR: sayfa kare uretmedigi durumlarda
    // (arka plan sekmesi, gorunmeyen panel) rAF hic calismiyor ve icerik
    // gizli kaliyordu. 7 oge icin dogrudan olcum zaten ucuz.
    function kontrol() {
      if (oge!.getBoundingClientRect().top < window.innerHeight * ESIK_ORANI) {
        goster();
      }
    }

    // Ekranda zaten gorunuyorsa gizlemeye hic gerek yok
    if (oge.getBoundingClientRect().top < window.innerHeight * ESIK_ORANI) {
      return;
    }

    oge.classList.add("gizle");
    window.addEventListener("scroll", kontrol, { passive: true });
    window.addEventListener("resize", kontrol, { passive: true });

    // Son emniyet: her ihtimale karsi icerik kalici olarak gizli kalmasin.
    const emniyet = window.setTimeout(goster, 8000);

    return () => {
      window.removeEventListener("scroll", kontrol);
      window.removeEventListener("resize", kontrol);
      clearTimeout(emniyet);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`belir ${className}`}
      style={
        gecikme
          ? ({ "--belir-gecikme": `${gecikme}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
