import { redirect } from "@/i18n/navigation";
import { masaOturumuGetir } from "@/lib/masa-erisim";

export const dynamic = "force-dynamic";

/** Masa menusu sadece masadaki QR ile acilan oturumda kullanilir. */
export default async function MasaMenuYerlesimi({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const masaNo = await masaOturumuGetir();
  if (!masaNo) {
    const { locale } = await params;
    redirect({ href: "/", locale: locale === "ar" ? "ar" : "tr" });
  }
  return children;
}
