import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import UrunListesi, {
  type AdminKategori,
} from "@/components/admin/UrunListesi";
import AdminUstBar from "@/components/admin/AdminUstBar";
import AdminVeriHatasi from "@/components/admin/AdminVeriHatasi";

/** Panel her zaman guncel veriyi gostermeli; onbelleklenmez. */
export const dynamic = "force-dynamic";

export default async function AdminUrunlerSayfasi() {
  const db = await sunucuIstemcisi();

  // Yayindan kaldirilmis urunler de listelenir — admin onlari geri acabilmeli.
  const { data, error } = await db
    .from("kategoriler")
    .select(
      `
      id, slug, sira, ad_tr, ad_ar,
      urunler ( id, slug, sira, ad_tr, ad_ar, gorsel_url,
                fiyat_masa, fiyat_paket, gramaj, stokta, aktif )
    `,
    )
    .order("sira", { ascending: true })
    .order("sira", { referencedTable: "urunler", ascending: true });

  if (error) {
    console.error("Admin urunleri okunamadi:", error);
    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="navUrunler" />
        <AdminVeriHatasi />
      </main>
    );
  }

  const kategoriler = (data ?? []).map(
    (k): AdminKategori => ({
      id: k.id,
      slug: k.slug,
      ad_tr: k.ad_tr,
      ad_ar: k.ad_ar,
      urunler: (k.urunler ?? []).map((u) => ({
        ...u,
        fiyat_masa: Number(u.fiyat_masa),
        fiyat_paket: Number(u.fiyat_paket),
      })),
    }),
  );

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="navUrunler" />
      <UrunListesi kategoriler={kategoriler} />
    </main>
  );
}
