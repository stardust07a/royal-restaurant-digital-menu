"use client";

import { useEffect, useRef, type RefObject } from "react";

const ODAKLANABILIR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Modal odagini iceride tutar; arka plani inert yapar ve kapanista odagi geri verir. */
export function useModalOdak({
  acik,
  dialogRef,
  openerRef,
  onKapat,
}: {
  acik: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  openerRef: RefObject<HTMLElement | null>;
  onKapat: () => void;
}) {
  const kapatRef = useRef(onKapat);
  kapatRef.current = onKapat;

  useEffect(() => {
    if (!acik) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const oncekiOdak = openerRef.current ?? (document.activeElement as HTMLElement | null);
    const oncekiOverflow = document.body.style.overflow;
    const oncekiOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    const arkaPlan = Array.from(document.body.children)
      .filter((oge): oge is HTMLElement => oge instanceof HTMLElement)
      .filter((oge) => !oge.contains(dialog) && !["SCRIPT", "STYLE"].includes(oge.tagName))
      .map((oge) => ({
        oge,
        inert: oge.inert,
        ariaHidden: oge.getAttribute("aria-hidden"),
      }));
    arkaPlan.forEach(({ oge }) => {
      oge.inert = true;
      oge.setAttribute("aria-hidden", "true");
    });

    dialog.focus({ preventScroll: true });

    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        kapatRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const odaklanabilir = Array.from(
        dialog!.querySelectorAll<HTMLElement>(ODAKLANABILIR),
      ).filter(
        (oge) =>
          !oge.hidden &&
          oge.getAttribute("aria-hidden") !== "true" &&
          oge.getClientRects().length > 0,
      );
      if (odaklanabilir.length === 0) {
        e.preventDefault();
        dialog!.focus();
        return;
      }
      const ilk = odaklanabilir[0];
      const son = odaklanabilir.at(-1)!;
      const etkin = document.activeElement;
      if (etkin === dialog || !dialog!.contains(etkin)) {
        e.preventDefault();
        (e.shiftKey ? son : ilk).focus();
      } else if (e.shiftKey && etkin === ilk) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && etkin === son) {
        e.preventDefault();
        ilk.focus();
      }
    }

    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = oncekiOverflow;
      document.body.style.overscrollBehavior = oncekiOverscroll;
      arkaPlan.forEach(({ oge, inert, ariaHidden }) => {
        oge.inert = inert;
        if (ariaHidden === null) oge.removeAttribute("aria-hidden");
        else oge.setAttribute("aria-hidden", ariaHidden);
      });
      if (oncekiOdak?.isConnected) oncekiOdak.focus({ preventScroll: true });
    };
  }, [acik, dialogRef, openerRef]);
}
