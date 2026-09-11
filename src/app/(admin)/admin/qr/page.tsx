import AdminUstBar from "@/components/admin/AdminUstBar";
import QrUretici from "@/components/admin/QrUretici";

export default function QrSayfasi() {
  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="qrBaslik" />
      <QrUretici />
    </main>
  );
}
