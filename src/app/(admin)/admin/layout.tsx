import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Cairo, Playfair_Display } from "next/font/google";
import AltNav from "@/components/admin/AltNav";
import AdminIcerigeAtla from "@/components/admin/AdminIcerigeAtla";
import { AdminDilSaglayici } from "@/lib/admin-dil";
import IlerlemeCubugu from "@/components/IlerlemeCubugu";
import "../../globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Royal Admin",
  // Panel arama motorlarina kapali
  robots: { index: false, follow: false },
};

/**
 * Admin panel yerlesimi.
 *
 * Panel tek dilli (Turkce) oldugu icin [locale] agacinin disinda duruyor;
 * middleware /admin yolunu next-intl yonlendirmesinden muaf tutuyor.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="tr"
      dir="ltr"
      className={`${jakarta.variable} ${cairo.variable} ${playfair.variable}`}
    >
      <body className="bg-bg text-ink antialiased">
        <AdminDilSaglayici>
          <AdminIcerigeAtla />
          <IlerlemeCubugu />
          {children}
          <AltNav />
        </AdminDilSaglayici>
      </body>
    </html>
  );
}
