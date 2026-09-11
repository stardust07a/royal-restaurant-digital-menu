import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import AdminUstBar from "@/components/admin/AdminUstBar";
import TopluFiyat, { type TopluUrun } from "@/components/admin/TopluFiyat";

export const dynamic = "force-dynamic";

export default async function TopluFiyatSayfasi() {
  const db = await sunucuIstemcisi();

  const [{ data: kategoriler }, { data: urunler }] = await Promise.all([
    db.from("kategoriler").select("id, ad_tr").order("sira"),
    db
      .from("urunler")
      .select("id, ad_tr, kategori_id, fiyat_masa, fiyat_paket")
      .order("sira"),
  ]);

  const liste: TopluUrun[] = (urunler ?? []).map((u) => ({
    id: u.id,
    ad_tr: u.ad_tr,
    kategori_id: u.kategori_id ?? "",
    fiyat_masa: Number(u.fiyat_masa),
    fiyat_paket: Number(u.fiyat_paket),
  }));

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="topluFiyatBaslik" geriLinki="/admin" />
      <TopluFiyat kategoriler={kategoriler ?? []} urunler={liste} />
    </main>
  );
}
