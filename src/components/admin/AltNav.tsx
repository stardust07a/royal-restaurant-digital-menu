"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminDil, type MetinAnahtari } from "@/lib/admin-dil";

/** Alt navigasyon — telefon oncelikli panelin ana gezinme cubugu. */
const SEKMELER: { yol: string; anahtar: MetinAnahtari; ikon: string }[] = [
  {
    yol: "/admin",
    anahtar: "navUrunler",
    ikon: "M4 7h16M4 12h16M4 17h10",
  },
  {
    yol: "/admin/kategoriler",
    anahtar: "navKategori",
    ikon: "M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v5H4v-5zm9 0h7v5h-7v-5z",
  },
  {
    yol: "/admin/siparisler",
    anahtar: "navSiparis",
    ikon: "M6 2l1.5 4h9L18 2M3 6h18l-1.7 10.2a2 2 0 01-2 1.8H7.7a2 2 0 01-2-1.8L4 6z",
  },
  {
    yol: "/admin/ayarlar",
    anahtar: "navAyarlar",
    ikon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 004.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H22a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z",
  },
  {
    yol: "/admin/qr",
    anahtar: "navQr",
    ikon: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3v3h-3v-3zm3-3h3v3h-3v-3z",
  },
];

export default function AltNav() {
  const yol = usePathname();
  const { m } = useAdminDil();

  // Giris ekraninda gezinme cubugu gosterilmez
  if (yol === "/admin/giris") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {SEKMELER.map((s) => {
          // /admin/kategori... yollari Kategori sekmesine ait; Urunler sekmesi
          // yalnizca /admin ve /admin/urun* icin aktif olmali.
          const aktif =
            s.yol === "/admin"
              ? yol === "/admin" ||
                yol.startsWith("/admin/urun") ||
                yol.startsWith("/admin/toplu-fiyat")
              : s.yol === "/admin/kategoriler"
                ? yol.startsWith("/admin/kategori")
                : yol.startsWith(s.yol);

          return (
            <li key={s.yol} className="flex-1">
              <Link
                href={s.yol}
                aria-current={aktif ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition ${
                  aktif ? "text-brand" : "text-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={s.ikon} />
                </svg>
                {m(s.anahtar)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
