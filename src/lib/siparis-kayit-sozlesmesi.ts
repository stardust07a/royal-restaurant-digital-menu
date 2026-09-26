import type {
  KayitliSiparisBasarisi,
  SiparisTuru,
} from "./siparis-tipleri";
import type { Dil } from "./tipler";

/**
 * Veritabanindaki siparis_hiz_siniri_kontrol RPC'si p_limit icin en fazla
 * 100 kabul eder. Uygulama limitleri bu siniri asarsa RPC insert'ten once
 * 22023 ile hata verir.
 */
export const SIPARIS_RPC_LIMIT_EN_COK = 100;
export const IP_HIZ_LIMITI_PAKET = 30;
export const IP_HIZ_LIMITI_MASA = SIPARIS_RPC_LIMIT_EN_COK;
export const MUSTERI_HIZ_LIMITI_PAKET = 8;
// Bir masa gun boyunca farkli misafirler tarafindan kullanilabilir. Paket
// siparisindeki telefon kovasi kadar dar tutmak, normal masa trafigini
// gereksiz yere on dakika kilitliyordu.
export const MUSTERI_HIZ_LIMITI_MASA = 30;

/** Eski DB CHECK kuralı paket telefonunu boş kabul etmediği için teknik değer. */
export const TELEFON_YOK = "0000000000";

interface SiparisKayitGirdisi {
  siparisNo: string;
  tur: SiparisTuru;
  dil: Dil;
  masaNo: string;
  musteriAd: string;
  musteriTelefon: string;
  kalemler: Record<string, unknown>[];
  araToplam: number;
  servisUcreti: number;
  toplam: number;
  idempotencyAnahtari: string;
  istekHash: string;
  yanit: KayitliSiparisBasarisi;
}

/**
 * siparisler tablosunun masa/paket CHECK sozlesmesini tek yerde kurar.
 * Masa siparisinde musteri alanlari bos string, masa_no dolu ve servis ucreti
 * sifirdir; paket siparisinde ise masa_no kesinlikle null kalir.
 */
export function siparisKayitSatiri(girdi: SiparisKayitGirdisi) {
  const masaSiparisi = girdi.tur === "masa";
  return {
    siparis_no: girdi.siparisNo,
    musteri_ad: masaSiparisi ? "" : girdi.musteriAd,
    musteri_telefon: masaSiparisi
      ? ""
      : girdi.musteriTelefon || TELEFON_YOK,
    dil: girdi.dil,
    kalemler: girdi.kalemler,
    ara_toplam: girdi.araToplam,
    servis_ucreti: masaSiparisi ? 0 : girdi.servisUcreti,
    toplam: girdi.toplam,
    durum: "yeni",
    siparis_turu: girdi.tur,
    masa_no: masaSiparisi ? girdi.masaNo : null,
    idempotency_anahtari: girdi.idempotencyAnahtari,
    istek_hash: girdi.istekHash,
    idempotency_yaniti: girdi.yanit,
  };
}
