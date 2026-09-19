import type { MetadataRoute } from "next";
import { kamuMenuyuGetir } from "@/lib/kamu-menu";
import { kategorileriHazirla } from "@/lib/menu";
import { dilAlternatifleri, yerelUrl } from "@/lib/seo";
import type { Dil } from "@/lib/tipler";

const DILLER: Dil[] = ["tr", "ar"];

function girdiler(
  yol: string,
  priority: number,
  changeFrequency: "daily" | "weekly" | "monthly",
): MetadataRoute.Sitemap {
  return DILLER.map((locale) => ({
    url: yerelUrl(locale, yol),
    alternates: { languages: dilAlternatifleri(yol) },
    changeFrequency,
    priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const menu = await kamuMenuyuGetir();
  const kategoriler = kategorileriHazirla(menu);
  const urunSluglari = [...new Set(menu.flatMap((kategori) => kategori.urunler.map((urun) => urun.slug)))];

  return [
    ...girdiler("/", 1, "weekly"),
    ...girdiler("/siparis", 0.9, "daily"),
    ...kategoriler.flatMap((kategori) => [
      ...girdiler(`/siparis/${kategori.slug}`, 0.8, "daily"),
    ]),
    ...urunSluglari.flatMap((slug) => [
      ...girdiler(`/siparis/urun/${slug}`, 0.7, "daily"),
    ]),
  ];
}
