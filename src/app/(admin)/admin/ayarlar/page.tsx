import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import AdminUstBar from "@/components/admin/AdminUstBar";
import AyarlarFormu from "@/components/admin/AyarlarFormu";
import type { Ayarlar } from "@/lib/tipler";
import AdminVeriHatasi from "@/components/admin/AdminVeriHatasi";
import { AYARLAR as VARSAYILAN } from "@/lib/sabitler";
import { nextGorselUrlDogrula } from "@/lib/guvenli-url";

export const dynamic = "force-dynamic";

export default async function AyarlarSayfasi() {
  const db = await sunucuIstemcisi();
  const { data, error } = await db
    .from("ayarlar")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("Admin ayarlari okunamadi:", error ?? "Ayar satiri bulunamadi");
    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="ayarlar" />
        <AdminVeriHatasi />
      </main>
    );
  }

  const ayarlar: Ayarlar = {
    ...(data as Ayarlar),
    logo_url: nextGorselUrlDogrula((data as Partial<Ayarlar>).logo_url),
    telefon_ikonu:
      (data as Partial<Ayarlar>).telefon_ikonu ?? VARSAYILAN.telefonIkonu,
    whatsapp_ikonu:
      (data as Partial<Ayarlar>).whatsapp_ikonu ?? VARSAYILAN.whatsappIkonu,
    instagram_ikonu:
      (data as Partial<Ayarlar>).instagram_ikonu ?? VARSAYILAN.instagramIkonu,
    tiktok_ikonu:
      (data as Partial<Ayarlar>).tiktok_ikonu ?? VARSAYILAN.tiktokIkonu,
    facebook_ikonu:
      (data as Partial<Ayarlar>).facebook_ikonu ?? VARSAYILAN.facebookIkonu,
    telefon_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).telefon_ikon_url,
    ),
    whatsapp_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).whatsapp_ikon_url,
    ),
    instagram_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).instagram_ikon_url,
    ),
    tiktok_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).tiktok_ikon_url,
    ),
    facebook_ikon_url: nextGorselUrlDogrula(
      (data as Partial<Ayarlar>).facebook_ikon_url,
    ),
    servis_ucreti: Number(data.servis_ucreti ?? 60),
    minimum_siparis: Number(data.minimum_siparis ?? 200),
  };

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="ayarlar" />
      <AyarlarFormu baslangic={ayarlar} />
    </main>
  );
}
