import { supabase } from "./supabase";
import type { Ekstra, Kategori, Rozet, Secenek, Urun } from "./tipler";
import { nextGorselUrlDogrula } from "./guvenli-url";

/** Bir kategori ve altindaki urunler — menu sayfalarinin calistigi sekil. */
export interface KategoriliMenu extends Kategori {
  urunler: Urun[];
}

/**
 * PostgREST numeric sutunlari cogu zaman sayi dondurur ama surum farkinda
 * metin de gelebiliyor. Fiyat hesaplarinin float'a takilmamasi icin
 * tek kapidan geciriyoruz.
 */
function sayi(deger: unknown): number {
  const n = typeof deger === "number" ? deger : Number(deger);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * Menunun tamamini kategori sirasina gore getirir.
 *
 * Hem masa QR menusu hem paket siparis menusu ayni veriyi kullanir —
 * aralarindaki tek fark hangi fiyat alaninin gosterildigi. Bu yuzden
 * fiyat_masa ve fiyat_paket birlikte cekilir, secim sayfada yapilir.
 *
 * Cikarilabilir ve ekstralar burada cekilmez; onlar sadece paket siparis
 * urun detayinda gerekiyor ve menu listesini gereksiz sisirirlerdi.
 */
export async function menuyuGetir(): Promise<KategoriliMenu[]> {
  const db = supabase();
  const { data: kategoriVerisi, error: kategoriHatasi } = await db
    .from("kategoriler")
    .select("id, slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar, gorsel_url, aktif")
    .eq("aktif", true)
    .order("sira", { ascending: true });

  if (kategoriHatasi) {
    throw new Error(`Menu okunamadi: ${kategoriHatasi.message}`);
  }

  const kategoriKimlikleri = (kategoriVerisi ?? []).map((k) => k.id as string);
  if (kategoriKimlikleri.length === 0) return [];

  const { data: bagVerisi, error: bagHatasi } = await db
    .from("urun_kategorileri")
    // Urun alani yildiz kalir; sonradan eklenen kolonlar menu sorgusunu kirmaz.
    .select("kategori_id, sira, urunler!inner(*)")
    .in("kategori_id", kategoriKimlikleri)
    .eq("urunler.aktif", true)
    .order("sira", { ascending: true });

  if (bagHatasi) throw new Error(`Menu urunleri okunamadi: ${bagHatasi.message}`);

  const urunleriKategoriyeGore = new Map<string, Urun[]>();
  for (const bag of bagVerisi ?? []) {
    const ham = bag.urunler as unknown as Record<string, unknown> | null;
    if (!ham) continue;
    const urun: Urun = {
      id: ham.id as string,
      kategori_id: ham.kategori_id as string,
      slug: ham.slug as string,
      // Siralama artik kategori-urun bagina aittir.
      sira: (bag.sira as number) ?? 0,
      ad_tr: ham.ad_tr as string,
      ad_ar: ham.ad_ar as string,
      aciklama_tr: (ham.aciklama_tr as string) ?? null,
      aciklama_ar: (ham.aciklama_ar as string) ?? null,
      gorsel_url: nextGorselUrlDogrula(ham.gorsel_url as string | null),
      fiyat_masa: sayi(ham.fiyat_masa),
      fiyat_paket: sayi(ham.fiyat_paket),
      gramaj: (ham.gramaj as string) ?? null,
      gramaj_ar: (ham.gramaj_ar as string) ?? null,
      kalori: (ham.kalori as number) ?? null,
      alerjenler: (ham.alerjenler as string[]) ?? [],
      rozet: ((ham.rozet as string) ?? "yok") as Rozet,
      stokta: (ham.stokta as boolean) ?? true,
      aktif: (ham.aktif as boolean) ?? true,
      masa_aktif: (ham.masa_aktif as boolean) ?? true,
    };
    const liste = urunleriKategoriyeGore.get(bag.kategori_id as string) ?? [];
    liste.push(urun);
    urunleriKategoriyeGore.set(bag.kategori_id as string, liste);
  }

  return (kategoriVerisi ?? [])
    .map((k): KategoriliMenu => {
      const urunler = urunleriKategoriyeGore.get(k.id as string) ?? [];

      return {
        id: k.id as string,
        slug: k.slug as string,
        sira: k.sira ?? 0,
        ad_tr: k.ad_tr as string,
        ad_ar: k.ad_ar as string,
        aciklama_tr: k.aciklama_tr ?? null,
        aciklama_ar: k.aciklama_ar ?? null,
        gorsel_url: nextGorselUrlDogrula(k.gorsel_url),
        aktif: k.aktif ?? true,
        urunler,
      };
    })
    .filter((k) => k.urunler.length > 0);
}

/** Sanal "Onerilenler" kategorisinin geriye uyumlu dahili adres eki. */
export const COK_SATAN_SLUG = "cok-satanlar";

/**
 * Menunun basina eklenen sanal "Onerilenler" kategorisi.
 *
 * Veritabaninda boyle bir kategori yok; rozeti "cok_satan" olan urunler
 * bir araya getiriliyor. Rozet manuel bir oneridir, satis olcumu degildir;
 * onerilen urunler kolay bulunsun diye listenin basinda durur. Urun yoksa
 * null doner.
 */
export function cokSatanlarKategorisi(
  kategoriler: KategoriliMenu[],
  adTr = "Önerilenler",
  adAr = "مقترحاتنا",
): KategoriliMenu | null {
  const urunler = [
    ...new Map(
      kategoriler
        .flatMap((k) => k.urunler)
        .filter((u) => u.rozet === "cok_satan")
        .map((u) => [u.id, u]),
    ).values(),
  ];

  if (urunler.length === 0) return null;

  return {
    id: COK_SATAN_SLUG,
    slug: COK_SATAN_SLUG,
    sira: -1,
    ad_tr: adTr,
    ad_ar: adAr,
    aciklama_tr: "En çok tercih edilen ürünler",
    aciklama_ar: "المنتجات الأكثر طلباً",
    // Kapak olarak ilk urunun fotografi
    gorsel_url: urunler.find((u) => u.gorsel_url)?.gorsel_url ?? null,
    aktif: true,
    urunler,
  };
}

/** Sanal kategori dahil, gosterime hazir kategori listesi. */
export function kategorileriHazirla(
  kategoriler: KategoriliMenu[],
  adTr?: string,
  adAr?: string,
): KategoriliMenu[] {
  const cokSatan = cokSatanlarKategorisi(kategoriler, adTr, adAr);
  return cokSatan ? [cokSatan, ...kategoriler] : kategoriler;
}

/** Masa QR menusunde kapatilan veya fiyati olmayan urunleri gizler. */
export function masaMenusunuFiltrele(kategoriler: KategoriliMenu[]): KategoriliMenu[] {
  return kategoriler
    .map((kategori) => ({
      ...kategori,
      urunler: kategori.urunler.filter(
        (urun) => urun.masa_aktif !== false && urun.fiyat_masa > 0,
      ),
    }))
    .filter((kategori) => kategori.urunler.length > 0);
}

/**
 * Tek bir urunu cikarilabilirleri ve ekstralariyla birlikte getirir.
 * Paket siparis urun detay sayfasi icin — menu listelerinde bu kadari gerekmez.
 *
 * Urun yoksa veya yayindan kaldirilmissa null doner.
 */
export async function urunGetir(slug: string): Promise<Urun | null> {
  const { data, error } = await supabase()
    .from("urunler")
    .select(
      `
      *,
      cikarilabilirler ( id, sira, ad_tr, ad_ar ),
      ekstralar!ekstralar_urun_id_fkey ( id, sira, ad_tr, ad_ar, fiyat, stokta )
    `,
    )
    .eq("slug", slug)
    .eq("aktif", true)
    .maybeSingle();

  if (error) throw new Error(`Urun okunamadi: ${error.message}`);
  if (!data) return null;

  const cikarilabilirler = ((data.cikarilabilirler ?? []) as Record<
    string,
    unknown
  >[])
    .map(
      (c): Secenek => ({
        id: c.id as string,
        sira: (c.sira as number) ?? 0,
        ad_tr: c.ad_tr as string,
        ad_ar: c.ad_ar as string,
      }),
    )
    .sort((a, b) => a.sira - b.sira);

  const ekstralar = ((data.ekstralar ?? []) as Record<string, unknown>[])
    .map(
      (e): Ekstra => ({
        id: e.id as string,
        sira: (e.sira as number) ?? 0,
        ad_tr: e.ad_tr as string,
        ad_ar: e.ad_ar as string,
        fiyat: sayi(e.fiyat),
        stokta: (e.stokta as boolean) ?? true,
      }),
    )
    .sort((a, b) => a.sira - b.sira);

  return {
    id: data.id,
    kategori_id: data.kategori_id,
    slug: data.slug,
    sira: data.sira ?? 0,
    ad_tr: data.ad_tr,
    ad_ar: data.ad_ar,
    aciklama_tr: data.aciklama_tr ?? null,
    aciklama_ar: data.aciklama_ar ?? null,
    gorsel_url: nextGorselUrlDogrula(data.gorsel_url),
    fiyat_masa: sayi(data.fiyat_masa),
    fiyat_paket: sayi(data.fiyat_paket),
    gramaj: data.gramaj ?? null,
    gramaj_ar: data.gramaj_ar ?? null,
    kalori: data.kalori ?? null,
    alerjenler: data.alerjenler ?? [],
    rozet: (data.rozet ?? "yok") as Rozet,
    stokta: data.stokta ?? true,
    aktif: data.aktif ?? true,
    masa_aktif: data.masa_aktif ?? true,
    cikarilabilirler,
    ekstralar,
  };
}

/** Statik uretim icin tum urun slug'lari. */
export async function urunSluglari(): Promise<string[]> {
  const { data, error } = await supabase()
    .from("urunler")
    .select("slug")
    .eq("aktif", true);

  if (error) throw new Error(`Slug listesi okunamadi: ${error.message}`);
  return (data ?? []).map((u) => u.slug as string);
}
