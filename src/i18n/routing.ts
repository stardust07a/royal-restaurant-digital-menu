import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "ar"],
  defaultLocale: "tr",
});

export type Locale = (typeof routing.locales)[number];

/** Arapca sagdan sola. Yeni dil eklenirse buraya da eklenmeli. */
export const RTL_DILLER: Locale[] = ["ar"];

export function yon(locale: string): "rtl" | "ltr" {
  return RTL_DILLER.includes(locale as Locale) ? "rtl" : "ltr";
}
