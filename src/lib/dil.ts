import type { Dil } from "./tipler";

/** ad_tr / ad_ar ciftini tasiyan her kayit. */
interface Adli {
  ad_tr: string;
  ad_ar: string;
}

/** aciklama_tr / aciklama_ar ciftini tasiyan her kayit. */
interface Aciklamali {
  slug?: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
}

/**
 * Kaydin secili dildeki adini verir.
 * Arapca karsilik bos birakilmissa Turkcesine duser — musteri bos kutu gormesin.
 */
export function ad(kayit: Adli, dil: Dil): string {
  if (dil === "ar") return kayit.ad_ar?.trim() || kayit.ad_tr;
  return kayit.ad_tr;
}

/** Kaydin secili dildeki aciklamasi. Yoksa bos string. */
export function aciklama(kayit: Aciklamali, dil: Dil): string {
  const secili = dil === "ar" ? kayit.aciklama_ar : kayit.aciklama_tr;
  return secili?.trim() || "";
}

/**
 * Kategori kartlarinda gosterilecek kisa aciklama.
 *
 * "Menuler" kategorisindeki "Patates ve icecek dahil" metni butun menu
 * urunleri icin gecerli bir ayrinti degil. Supabase'deki eski kayit silinmese
 * bile kategori kartinda ve kategori basliginda yanlis bir genelleme olarak
 * gorunmemesi icin yalnizca bu kategori ozetini gizliyoruz. Urunlerin kendi
 * aciklama ve gramaj bilgilerine dokunulmaz.
 */
export function kategoriAciklamasi(kayit: Aciklamali, dil: Dil): string {
  if (kayit.slug === "menuler") return "";
  return aciklama(kayit, dil);
}

/** gramaj / gramaj_ar ciftini tasiyan kayit. */
interface Gramajli {
  gramaj?: string | null;
  gramaj_ar?: string | null;
}

/**
 * Secili dildeki gramaj metni.
 *
 * "180 g" gibi sade birimler iki dilde de ayni oldugu icin gramaj_ar bos
 * birakilir ve Turkce alana dusulur. Yalnizca "180 g döner + 150 g patates"
 * gibi kelime iceren gramajlarin Arapcasi ayrica tutulur.
 */
export function gramajYaz(kayit: Gramajli, dil: Dil): string {
  if (dil === "ar") return kayit.gramaj_ar?.trim() || kayit.gramaj?.trim() || "";
  return kayit.gramaj?.trim() || "";
}

/**
 * Olcu metnine ".fiyat" sinifi verilmeli mi?
 *
 * ".fiyat" direction:ltr uyguluyor. "180 g" gibi saf olculerde dogru, ama
 * "شاورما 180 غ + بطاطا 150 غ" gibi Arapca kelime iceren metinlerde iki yonlu
 * metin algoritmasini bozup sayilari satirin yanlis ucuna atiyordu.
 * Arapca harf varsa sinif verilmez, metin dogal RTL akisinda kalir.
 */
export function olcuLtrMi(metin: string): boolean {
  return !/[؀-ۿ]/.test(metin);
}
