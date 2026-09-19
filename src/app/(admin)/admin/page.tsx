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
  // Coklu kategori bagindan sonra iki tablo arasinda birden fazla FK yolu
  // bulunur. Ayri sorgular hem belirsiz embed hatasini onler hem de tum
  // urunleri atandiklari tum kategorilerde eksiksiz gosterir.
  const [kategoriSonucu, urunSonucu, bagSonucu] = await Promise.all([
    db.from("kategoriler")
      .select("id, slug, sira, ad_tr, ad_ar")
      .order("sira", { ascending: true }),
    db.from("urunler")
      .select("id, kategori_id, slug, sira, ad_tr, ad_ar, gorsel_url, fiyat_masa, fiyat_paket, gramaj, stokta, aktif")
      .order("sira", { ascending: true }),
    db.from("urun_kategorileri")
      .select("kategori_id, urun_id, sira")
      .order("sira", { ascending: true }),
  ]);

  if (kategoriSonucu.error || urunSonucu.error || bagSonucu.error) {
    console.error("Admin urunleri okunamadi:", kategoriSonucu.error ?? urunSonucu.error ?? bagSonucu.error);
    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="navUrunler" />
        <AdminVeriHatasi />
      </main>
    );
  }

  const urunHaritasi = new Map((urunSonucu.data ?? []).map((urun) => [urun.id, urun]));
  const kategoriler = (kategoriSonucu.data ?? []).map(
    (k): AdminKategori => ({
      id: k.id,
      slug: k.slug,
      ad_tr: k.ad_tr,
      ad_ar: k.ad_ar,
      urunler: (bagSonucu.data ?? [])
        .filter((bag) => bag.kategori_id === k.id)
        .flatMap((bag) => {
          const urun = urunHaritasi.get(bag.urun_id);
          return urun ? [{
            ...urun,
            sira: bag.sira,
            fiyat_masa: Number(urun.fiyat_masa),
            fiyat_paket: Number(urun.fiyat_paket),
          }] : [];
        }),
    }),
  );

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="navUrunler" />
      <UrunListesi kategoriler={kategoriler} />
    </main>
  );
}
