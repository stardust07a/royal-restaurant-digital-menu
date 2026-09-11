"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type MarkaLogosuIcerigiProps = {
  logoUrl?: string | null;
  alt?: string;
  priority?: boolean;
  sizes?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackCrownClassName?: string;
  fallbackTextClassName?: string;
};

/**
 * Logo goruntusunu ve yapilandirilmis logo yuklenemediginde kullanilan R
 * isaretini ortaklastirir. URL degistiginde onceki yukleme hatasini sifirlayarak
 * yeni logo gorselinin tekrar denenmesini saglar.
 */
export function MarkaLogosuIcerigi({
  logoUrl,
  alt = "",
  priority = false,
  sizes = "44px",
  imageClassName = "object-contain",
  fallbackClassName = "flex flex-col items-center justify-center",
  fallbackCrownClassName = "-mb-1 text-[9px] text-[#f4cf76]",
  fallbackTextClassName = "font-black leading-none",
}: MarkaLogosuIcerigiProps) {
  const [gorselHatali, setGorselHatali] = useState(false);

  useEffect(() => {
    setGorselHatali(false);
  }, [logoUrl]);

  return logoUrl && !gorselHatali ? (
    <Image
      src={logoUrl}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={imageClassName}
      onError={() => setGorselHatali(true)}
    />
  ) : (
    <span
      className={fallbackClassName}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    >
      <span aria-hidden className={fallbackCrownClassName}>
        ♛
      </span>
      <span aria-hidden className={fallbackTextClassName} translate="no">
        R
      </span>
    </span>
  );
}

/** Yapilandirilmis logo yuklenemezse kompakt R marka isaretine geri doner. */
export default function MarkaLogosu({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-brand text-white shadow-[0_8px_20px_rgba(8,119,110,.22)]">
      <MarkaLogosuIcerigi logoUrl={logoUrl} />
    </span>
  );
}
