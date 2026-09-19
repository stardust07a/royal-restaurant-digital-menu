import AdminUstBar from "@/components/admin/AdminUstBar";
import QrUretici from "@/components/admin/QrUretici";
import { MASA_SAYISI, masaQrImzasi } from "@/lib/masa-erisim";

export const dynamic = "force-dynamic";

export default function QrSayfasi() {
  const masaImzalari = Array.from({ length: MASA_SAYISI }, (_, i) =>
    masaQrImzasi(String(i + 1)) ?? "",
  );
  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="qrBaslik" />
      <QrUretici masaImzalari={masaImzalari} />
    </main>
  );
}
