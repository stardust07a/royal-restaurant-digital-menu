/**
 * Sabit restoran bilgileri.
 * NOT: Bunlarin tamami ilerde Supabase'deki "ayarlar" tablosundan gelecek.
 * Admin panel yazilana kadar buradan okunuyor.
 */
export const AYARLAR = {
  adTr: "Royal Restaurant",
  adAr: "مطعم رويال",
  whatsapp: "905434888828",
  telefon: "+905434888828",
  telefonGosterim: "0543 488 88 28",
  harita: "https://maps.app.goo.gl/9CuXKfBbRWqNaqGD8",
  instagram: "https://www.instagram.com/royalrestaurant.tr",
  tiktok: "https://www.tiktok.com/@royalrestaurants1",
  telefonIkonu: "📞",
  whatsappIkonu: "💬",
  instagramIkonu: "📸",
  tiktokIkonu: "🎵",
  facebookIkonu: "👍",
  servisUcreti: 60,
  minimumSiparis: 200,
  paraSimgesi: "₺",
} as const;

/**
 * Kurus hassasiyetine yuvarlar.
 * Ekstra fiyatlari toplanirken float artigi birikmesin diye her ara adimda
 * bu fonksiyondan gecirilir.
 */
export function kurus(tutar: number): number {
  return Math.round(tutar * 100) / 100;
}

/** 1234.5 -> "1.234,50 TL" */
export function fiyatYaz(tutar: number): string {
  return (
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(tutar) + " " + AYARLAR.paraSimgesi
  );
}
