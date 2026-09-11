"use client";

import { useTranslations } from "next-intl";

export default function SaltOkunurUyarisi({
  whatsappNumarasi,
  className = "",
}: {
  whatsappNumarasi?: string | null;
  className?: string;
}) {
  const t = useTranslations("menu");
  const temiz = (whatsappNumarasi ?? "").replace(/[^0-9]/g, "");
  const whatsappGecerli = temiz.length >= 10 && temiz.length <= 15;

  return (
    <aside
      role="status"
      className={`border border-accent/50 bg-accent/10 px-4 py-3 text-sm text-ink ${className}`}
    >
      <p className="leading-relaxed">{t("saltOkunur")}</p>
      {whatsappGecerli && (
        <a
          href={`https://wa.me/${temiz}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4"
        >
          {t("whatsappIletisim")}
        </a>
      )}
    </aside>
  );
}
