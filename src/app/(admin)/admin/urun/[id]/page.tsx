import { notFound } from "next/navigation";
import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import AdminUstBar from "@/components/admin/AdminUstBar";
import UrunFormu, { type FormUrun } from "@/components/admin/UrunFormu";

export const dynamic = "force-dynamic";

/** Cikarilabilir / ekstra satirlarinin ortak sekli. */
interface SecenekSatiri {
  id: string;
  sira: number | null;
  ad_tr: string;
  ad_ar: string;
  fiyat?: number | null;
  stokta?: boolean | null;
}

/** Bos form — "yeni" adresinde kullanilir. */
function bosUrun(kategoriId: string): FormUrun {
  return {
    id: null,
    kategori_id: kategoriId,
    slug: "",
    sira: 0,
    ad_tr: "",
    ad_ar: "",
    aciklama_tr: "",
    aciklama_ar: "",
    gorsel_url: null,
    fiyat_masa: 0,
    fiyat_paket: 0,
    gramaj: "",
    gramaj_ar: "",
    kalori: null,
    alerjenler: [],
    rozet: "yok",
    stokta: true,
    aktif: true,
    cikarilabilirler: [],
    ekstralar: [],
  };
}

export default async function UrunDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await sunucuIstemcisi();

  const { data: kategoriler } = await db
    .from("kategoriler")
    .select("id, ad_tr, ad_ar")
    .order("sira", { ascending: true });

  const kategoriListesi = kategoriler ?? [];

  if (id === "yeni") {
    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="yeniUrunBaslik" geriLinki="/admin" />
        <UrunFormu
          baslangic={bosUrun(kategoriListesi[0]?.id ?? "")}
          kategoriler={kategoriListesi}
        />
      </main>
    );
  }

  const { data } = await db
    .from("urunler")
    // "*": sema ile kod arasindaki gecikmeye dayanikli olsun
    .select(
      `
      *,
      cikarilabilirler ( id, sira, ad_tr, ad_ar ),
      ekstralar ( id, sira, ad_tr, ad_ar, fiyat, stokta )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const baslangic: FormUrun = {
    id: data.id,
    kategori_id: data.kategori_id ?? "",
    slug: data.slug,
    sira: data.sira ?? 0,
    ad_tr: data.ad_tr,
    ad_ar: data.ad_ar,
    aciklama_tr: data.aciklama_tr ?? "",
    aciklama_ar: data.aciklama_ar ?? "",
    gorsel_url: data.gorsel_url,
    fiyat_masa: Number(data.fiyat_masa),
    fiyat_paket: Number(data.fiyat_paket),
    gramaj: data.gramaj ?? "",
    gramaj_ar: data.gramaj_ar ?? "",
    kalori: data.kalori,
    alerjenler: data.alerjenler ?? [],
    rozet: data.rozet ?? "yok",
    stokta: data.stokta,
    aktif: data.aktif,
    // "*" secimi ic içe iliskileri any yapiyor; siralama icin tip veriliyor
    cikarilabilirler: ((data.cikarilabilirler ?? []) as SecenekSatiri[])
      .sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0))
      .map((c) => ({ id: c.id, ad_tr: c.ad_tr, ad_ar: c.ad_ar })),
    ekstralar: ((data.ekstralar ?? []) as SecenekSatiri[])
      .sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0))
      .map((e) => ({
        id: e.id,
        ad_tr: e.ad_tr,
        ad_ar: e.ad_ar,
        fiyat: Number(e.fiyat ?? 0),
        stokta: e.stokta ?? true,
      })),
  };

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikTr={data.ad_tr} baslikAr={data.ad_ar} geriLinki="/admin" />
      <UrunFormu baslangic={baslangic} kategoriler={kategoriListesi} />
    </main>
  );
}
