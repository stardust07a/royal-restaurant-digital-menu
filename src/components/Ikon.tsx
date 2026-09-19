import type { SVGProps } from "react";

/**
 * Arayuzde kullanilan ikonlar.
 *
 * Emoji KULLANILMIYOR: emoji fontu cihaza gore degisiyor, bazi Android ve
 * masaustu tarayicilarda hic cizilmiyordu. SVG her yerde ayni gorunur,
 * renk ve kalinligi tema degiskenlerinden alir.
 *
 * WhatsApp mesajindaki emojiler ayri konu — orasi duz metin ve WhatsApp
 * kendi emoji fontuyla ciziyor, dokunulmadi.
 */
type Props = SVGProps<SVGSVGElement> & { className?: string };

function Govde({ className = "h-4 w-4", children, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Cikarilan malzeme */
export function IkonCikar(p: Props) {
  return (
    <Govde {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Govde>
  );
}

/** Eklenen ekstra */
export function IkonEkle(p: Props) {
  return (
    <Govde {...p}>
      <path d="M12 5v14M5 12h14" />
    </Govde>
  );
}

/** Musteri notu */
export function IkonNot(p: Props) {
  return (
    <Govde {...p}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </Govde>
  );
}

/** Alerjen uyarisi */
export function IkonUyari(p: Props) {
  return (
    <Govde {...p}>
      <path d="M12 9v4M12 17h.01M10.3 3.9L2.4 17.5A1.9 1.9 0 004 20.4h16a1.9 1.9 0 001.6-2.9L13.7 3.9a1.9 1.9 0 00-3.4 0z" />
    </Govde>
  );
}

/** Paket siparis motosikleti */
export function IkonMotor(p: Props) {
  return (
    <Govde {...p}>
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 18h5l2-5h3l2 5M8 13h5l-1.5-3H8M17 13l1-3h3M2 9h6v4H2z" />
    </Govde>
  );
}

/** Telefon */
export function IkonTelefon(p: Props) {
  return (
    <Govde {...p}>
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" />
    </Govde>
  );
}
