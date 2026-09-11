"use server";

import { revalidatePath } from "next/cache";
import { sunucuIstemcisi } from "./supabase-sunucu";

/**
 * Admin bir degisiklik yaptiginda musteriye acik sayfalari tazeler.
 *
 * Menu sayfalari ISR ile 60 saniye onbelleklenir; bu cagri olmadan bir fiyat
 * degisikligi bir dakika boyunca eski gorunurdu.
 */
export async function menuyuTazele(): Promise<
  { durum: "tamam" } | { durum: "atlanildi"; neden: "yetkisiz" | "dogrulanamadi" }
> {
  try {
    const db = await sunucuIstemcisi();
    const {
      data: { user },
      error: oturumHatasi,
    } = await db.auth.getUser();
    if (oturumHatasi || !user) return { durum: "atlanildi", neden: "yetkisiz" };

    const { data: adminMi, error } = await db.rpc("is_admin");
    if (error) {
      console.error("Menu onbellegi icin admin yetkisi dogrulanamadi:", error.message);
      return { durum: "atlanildi", neden: "dogrulanamadi" };
    }
    if (!adminMi) return { durum: "atlanildi", neden: "yetkisiz" };

    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/menu", "page");
    revalidatePath("/[locale]/menu/[kategori]", "page");
    revalidatePath("/[locale]/menu/urun/[slug]", "page");
    revalidatePath("/[locale]/menu/sepet", "page");
    revalidatePath("/[locale]/siparis", "page");
    revalidatePath("/[locale]/siparis/[kategori]", "page");
    revalidatePath("/[locale]/siparis/urun/[slug]", "page");
    revalidatePath("/[locale]/siparis/sepet", "page");
    revalidatePath("/sitemap.xml");
    return { durum: "tamam" };
  } catch (e) {
    console.error("Menu onbellegi tazelenemedi:", e);
    return { durum: "atlanildi", neden: "dogrulanamadi" };
  }
}
