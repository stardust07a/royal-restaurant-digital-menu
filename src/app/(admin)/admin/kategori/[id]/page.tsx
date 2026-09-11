import { notFound } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import AdminUstBar from "@/components/admin/AdminUstBar";
import KategoriFormu, {
  type FormKategori,
  type FormKategoriParmakIzi,
  type FormKategoriSecenegi,
  type FormKategoriUrunu,
} from "@/components/admin/KategoriFormu";

export const dynamic = "force-dynamic";

export default async function KategoriDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await sunucuIstemcisi();

  if (id === "yeni") {
    // Yeni kategori listenin sonuna eklensin
    const { data: sonuncu } = await db
      .from("kategoriler")
      .select("sira")
      .order("sira", { ascending: false })
      .limit(1)
      .maybeSingle();

    const bos: FormKategori = {
      id: null,
      slug: "",
      sira: (sonuncu?.sira ?? 0) + 1,
      ad_tr: "",
      ad_ar: "",
      aciklama_tr: "",
      aciklama_ar: "",
      gorsel_url: null,
      aktif: true,
      urunSayisi: 0,
    };

    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="yeniKategoriBaslik" geriLinki="/admin/kategoriler" />
        <KategoriFormu baslangic={bos} />
      </main>
    );
  }

  const [kategoriSonucu, kategoriListesiSonucu, urunListesiSonucu] =
    await Promise.all([
      db
        .from("kategoriler")
        .select(
          "id, slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar, gorsel_url, aktif, urunler(id)",
        )
        .eq("id", id)
        .maybeSingle(),
      db.from("kategoriler").select("id, ad_tr, ad_ar").order("sira"),
      db
        .from("urunler")
        .select("id, kategori_id, ad_tr, ad_ar, aktif, sira", { count: "exact" })
        .order("ad_tr")
        .limit(2000),
    ]);

  const data = kategoriSonucu.data;

  if (!data) notFound();

  const baslangic: FormKategori = {
    id: data.id,
    slug: data.slug,
    sira: data.sira ?? 0,
    ad_tr: data.ad_tr,
    ad_ar: data.ad_ar,
    aciklama_tr: data.aciklama_tr ?? "",
    aciklama_ar: data.aciklama_ar ?? "",
    gorsel_url: data.gorsel_url,
    aktif: data.aktif,
    urunSayisi: (data.urunler ?? []).length,
  };
  const kategoriler = (kategoriListesiSonucu.data ?? []) as FormKategoriSecenegi[];
  const urunler = (urunListesiSonucu.data ?? []) as FormKategoriUrunu[];
  const urunListesiSiniraUlasti = (urunListesiSonucu.count ?? 0) > 2000;
  const orijinalParmakIzi: FormKategoriParmakIzi = {
    slug: data.slug,
    sira: data.sira ?? 0,
    ad_tr: data.ad_tr,
    ad_ar: data.ad_ar,
    aciklama_tr: data.aciklama_tr,
    aciklama_ar: data.aciklama_ar,
    gorsel_url: data.gorsel_url,
    aktif: data.aktif,
  };

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar
        baslikTr={data.ad_tr}
        baslikAr={data.ad_ar}
        geriLinki="/admin/kategoriler"
      />
      <KategoriFormu
        baslangic={baslangic}
        kategoriler={kategoriler}
        urunler={urunler}
        orijinalParmakIzi={orijinalParmakIzi}
        urunListesiSiniraUlasti={urunListesiSiniraUlasti}
      />
    </main>
  );
}
