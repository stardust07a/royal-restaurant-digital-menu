import type { Dil } from "./tipler";

/**
 * Istemciden sunucuya giden siparis.
 *
 * Dikkat: burada FIYAT YOK. Sunucu butun tutarlari id'ler uzerinden
 * veritabanindan okuyup kendisi hesaplar; localStorage'daki sepete
 * fiyat konusunda guvenilmez.
 */
/** Masa siparisi mi paket siparis mi. */
export type SiparisTuru = "masa" | "paket";

export interface SiparisGirdisi {
  /** Ayni istemci denemesinin iki kez siparis olusturmasini engeller. */
  idempotencyAnahtari: string;
  dil: Dil;
  /** Varsayilan "paket" — masa siparisinde teslimat ucreti ve minimum yok */
  tur: SiparisTuru;
  /** Masa siparisinde zorunlu, pakette bos */
  masaNo?: string;
  /** Masa siparisinde alinmaz */
  musteriAd: string;
  musteriTelefon: string;
  kalemler: {
    urunId: string;
    adet: number;
    cikarilanIdler: string[];
    ekstraIdler: string[];
    not: string;
  }[];
}

/** Mesaj kurulurken kullanilacak, sunucunun dogruladigi kalem. */
export interface OnaylanmisKalem {
  ad: string;
  adet: number;
  toplam: number;
  cikarilanlar: string[];
  ekstralar: { ad: string; fiyat: number }[];
  not: string;
}

export interface KayitliSiparisBasarisi {
  durum: "tamam";
  siparisNo: string;
  kalemler: OnaylanmisKalem[];
  araToplam: number;
  servisUcreti: number;
  toplam: number;
  whatsappNumarasi: string;
}

export type SiparisSonucu =
  | (KayitliSiparisBasarisi & {
      /** Teşekkür sayfasının gerçekten kaydedilmiş siparişten geldiğini kanıtlar. */
      makbuzToken: string;
    })
  | {
      durum: "hata";
      /** Ceviri anahtari — istemci bunu kullaniciya cevirir. */
      kod:
        | "kapali"
        | "sepet_bos"
        | "masa_no_gecersiz"
        | "ad_gecersiz"
        | "telefon_gecersiz"
        | "gecersiz_istek"
        | "cok_fazla_istek"
        | "urun_bulunamadi"
        | "stok_yok"
        | "minimum_alti"
        | "yapilandirma_hatasi"
        | "kayit_hatasi";
      /** Mesajda yerine gececek deger (urun adi, eksik tutar...) */
      deger?: string;
    };
