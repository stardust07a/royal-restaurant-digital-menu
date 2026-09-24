export type Dil = "tr" | "ar";

export type Rozet = "yok" | "cok_satan" | "yeni" | "acili" | "sefin_onerisi";

export interface Kategori {
  id: string;
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
  gorsel_url?: string | null;
  aktif: boolean;
}

export interface Secenek {
  id: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
}

export interface Ekstra extends Secenek {
  fiyat: number;
  stokta: boolean;
}

export interface Urun {
  id: string;
  kategori_id: string;
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
  gorsel_url?: string | null;
  /** Masa QR menusunde gosterilen fiyat */
  fiyat_masa: number;
  /** Paket siparis menusunde gosterilen fiyat */
  fiyat_paket: number;
  /** "180 g" / "330 ml" - HER IKI menude de gosterilir */
  gramaj?: string | null;
  /** Arapca gramaj. Bos ise gramaj kullanilir ("180 g" gibi sade birimler
   *  iki dilde de ayni; sadece "... döner + ... patates" gibi metinler cevrilir. */
  gramaj_ar?: string | null;
  kalori?: number | null;
  alerjenler: string[];
  rozet: Rozet;
  stokta: boolean;
  aktif: boolean;
  /** Yalnizca masa QR menusunde gorunur; paket menusunu etkilemez. */
  masa_aktif: boolean;
  cikarilabilirler?: Secenek[];
  ekstralar?: Ekstra[];
}

/** Sepette tutulan cikarilan malzeme */
export interface SepetSecenek {
  id: string;
  ad_tr: string;
  ad_ar: string;
}

/** Sepette tutulan ucretli ekstra */
export interface SepetEkstra extends SepetSecenek {
  fiyat: number;
}

/**
 * Sepetteki tek bir satir.
 *
 * Fiyatlar burada sadece ANLIK GOSTERIM icin tutulur. Siparis gonderilirken
 * sunucu id'ler uzerinden fiyatlari veritabanindan yeniden okur ve toplami
 * kendisi hesaplar — localStorage'daki tutara guvenilmez.
 */
export interface SepetKalemi {
  satirId: string;
  urunId: string;
  slug: string;
  ad_tr: string;
  ad_ar: string;
  birimFiyat: number;
  adet: number;
  cikarilanlar: SepetSecenek[];
  ekstralar: SepetEkstra[];
  not: string;
}

/** ayarlar tablosunun tek satiri */
export interface Ayarlar {
  restoran_ad_tr: string | null;
  restoran_ad_ar: string | null;
  logo_url: string | null;
  whatsapp_numarasi: string | null;
  telefon: string | null;
  adres_tr: string | null;
  adres_ar: string | null;
  harita_linki: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  /** Ana sayfadaki iletisim kartlarinda gosterilen, admin tarafindan duzenlenebilir simgeler */
  telefon_ikonu: string | null;
  whatsapp_ikonu: string | null;
  instagram_ikonu: string | null;
  tiktok_ikonu: string | null;
  facebook_ikonu: string | null;
  /** Admin tarafindan yuklenen iletisim marka gorselleri. Bos/gecersizse simge yedegi kullanilir. */
  telefon_ikon_url: string | null;
  whatsapp_ikon_url: string | null;
  instagram_ikon_url: string | null;
  tiktok_ikon_url: string | null;
  facebook_ikon_url: string | null;
  servis_ucreti: number;
  minimum_siparis: number;
  siparis_alimi_acik: boolean;
  calisma_saatleri: CalismaSaatleri | null;
  kapali_mesaji_tr: string | null;
  kapali_mesaji_ar: string | null;
  /** Ana sayfa metinleri — bos ise ceviri dosyasindaki varsayilan kullanilir */
  hero_baslik_tr: string | null;
  hero_baslik_ar: string | null;
  hero_alt_tr: string | null;
  hero_alt_ar: string | null;
  hakkimizda_baslik_tr: string | null;
  hakkimizda_baslik_ar: string | null;
  hakkimizda_metin_tr: string | null;
  hakkimizda_metin_ar: string | null;
}

export type GunAnahtari =
  | "pazartesi"
  | "sali"
  | "carsamba"
  | "persembe"
  | "cuma"
  | "cumartesi"
  | "pazar";

export interface GunSaati {
  acilis: string;
  kapanis: string;
  kapali: boolean;
}

export type CalismaSaatleri = Partial<Record<GunAnahtari, GunSaati>>;

export type SiparisDurum =
  | "yeni"
  | "onaylandi"
  | "hazirlaniyor"
  | "yolda"
  | "teslim"
  | "iptal";
