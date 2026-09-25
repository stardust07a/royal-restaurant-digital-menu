import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { KategoriliMenu } from "@/lib/menu";
import type { Dil } from "@/lib/tipler";
import { ad, kategoriAciklamasi } from "@/lib/dil";

/**
 * Kategori secim kutulari.
 *
 * Masa menusu de paket siparis gibi once kategori sorar: 59 urunluk tek
 * liste yerine misafir once bolumu seciyor.
 *
 * Metin fotografin USTUNDE degil altindaki beyaz kutuda — fotograf uzerine
 * yazilan metin hicbir gorselde kontrast garantisi vermiyor.
 */
export default async function KategoriKutulari({
  kategoriler,
  dil,
  temelYol,
}: {
  kategoriler: KategoriliMenu[];
  dil: Dil;
  /** "/menu" veya "/siparis" */
  temelYol: string;
}) {
  const t = await getTranslations();

  return (
    <ul className="kart-izgarasi">
      {kategoriler.map((k) => {
        const metin = kategoriAciklamasi(k, dil);
        return (
          <li key={k.id} className="flex min-w-0">
            <Link
              href={`${temelYol}/${k.slug}`}
              className="menu-karti flex min-w-0 w-full flex-col active:bg-surface"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-surface">
                {k.gorsel_url ? (
                  <Image
                    src={k.gorsel_url}
                    alt=""
                    fill
                    sizes="(max-width: 379px) 100vw, (max-width: 640px) 50vw, 240px"
                    className="object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted/40"
                  >
                    R
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col px-3.5 py-3.5 min-[380px]:min-h-32 sm:min-h-36 sm:px-4 sm:py-4">
                <p className="line-clamp-2 break-words text-base font-black leading-snug sm:text-lg">{ad(k, dil)}</p>
                {metin && (
                  <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-muted sm:text-sm">
                    {metin}
                  </p>
                )}
                <p className="mt-auto pt-4 text-xs text-muted">
                  <bdi>{k.urunler.length}</bdi> {t("siparis.urunAdet")}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
