import {
  gorselHataKodu,
  type GorselHataKodu,
} from "./gorsel-yukle";
import type { MetinAnahtari } from "./admin-dil";

const HATA_ANAHTARLARI: Record<GorselHataKodu, MetinAnahtari> = {
  tur_gecersiz: "gorselTurGecersiz",
  boyut_gecersiz: "gorselBoyutGecersiz",
  icerik_uyusmuyor: "gorselIcerikUyusmuyor",
  yukleme_hatasi: "gorselYuklemeHatasi",
};

/** Gorsel katmaninin tipli hata kodunu adminin secili diline cevirir. */
export function adminGorselHataMetni(
  hata: unknown,
  cevir: (anahtar: MetinAnahtari) => string,
): string {
  const kod = gorselHataKodu(hata);
  return cevir(kod ? HATA_ANAHTARLARI[kod] : "gorselIslemHatasi");
}
