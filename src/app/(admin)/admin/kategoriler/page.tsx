import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import AdminUstBar from "@/components/admin/AdminUstBar";
import KategoriListesi, {
  type AdminKategoriSatiri,
} from "@/components/admin/KategoriListesi";
import AdminVeriHatasi from "@/components/admin/AdminVeriHatasi";

export const dynamic = "force-dynamic";

export default async function KategorilerSayfasi() {
  const db = await sunucuIstemcisi();

  const { data, error } = await db
    .from("kategoriler")
    .select("id, slug, sira, ad_tr, ad_ar, gorsel_url, aktif, urunler(id)")
    .order("sira", { ascending: true });

  if (error) {
    console.error("Admin kategorileri okunamadi:", error);
    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="kategoriler" />
        <AdminVeriHatasi />
      </main>
    );
  }

  const kategoriler = (data ?? []).map(
    (k): AdminKategoriSatiri => ({
      id: k.id,
      slug: k.slug,
      sira: k.sira ?? 0,
      ad_tr: k.ad_tr,
      ad_ar: k.ad_ar,
      gorsel_url: k.gorsel_url,
      aktif: k.aktif,
      urunSayisi: (k.urunler ?? []).length,
    }),
  );

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="kategoriler" geriLinki="/admin" />
      <KategoriListesi kategoriler={kategoriler} />
    </main>
  );
}
