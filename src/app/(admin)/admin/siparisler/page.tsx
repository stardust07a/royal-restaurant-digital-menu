import { sunucuIstemcisi } from "@/lib/supabase-sunucu";
import AdminUstBar from "@/components/admin/AdminUstBar";
import SiparisListesi, {
  type AdminSiparis,
} from "@/components/admin/SiparisListesi";
import SiparisOzeti from "@/components/admin/SiparisOzeti";
import YeniSiparisUyarisi from "@/components/admin/YeniSiparisUyarisi";
import { kurus } from "@/lib/sabitler";
import AdminVeriHatasi from "@/components/admin/AdminVeriHatasi";

export const dynamic = "force-dynamic";

/** Son 200 siparis yeter — daha eskisi icin filtre gerekir. */
const LIMIT = 200;

type AdminKalem = AdminSiparis["kalemler"][number];

function gecerliPara(deger: unknown): number {
  const sayi = Number(deger);
  return Number.isFinite(sayi) && sayi >= 0 ? sayi : 0;
}

/** Eski anon insert doneminden kalmis keyfi JSON admin render'ini cokertmesin. */
function kalemleriTemizle(deger: unknown): AdminSiparis["kalemler"] {
  if (!Array.isArray(deger)) return [];

  const sonuc: AdminKalem[] = [];
  for (const ham of deger.slice(0, 30)) {
    if (!ham || typeof ham !== "object" || Array.isArray(ham)) continue;
    const kayit = ham as Record<string, unknown>;
    const adTr = typeof kayit.ad_tr === "string" ? kayit.ad_tr.trim() : "";
    const adet = kayit.adet;
    if (!adTr || typeof adet !== "number" || !Number.isInteger(adet) || adet < 1 || adet > 99) {
      continue;
    }

    const cikarilanlar = Array.isArray(kayit.cikarilanlar)
      ? kayit.cikarilanlar.slice(0, 20).flatMap((hamCikan) => {
          if (!hamCikan || typeof hamCikan !== "object" || Array.isArray(hamCikan)) return [];
          const cikan = hamCikan as Record<string, unknown>;
          if (typeof cikan.ad_tr !== "string" || !cikan.ad_tr.trim()) return [];
          return [{
            ad_tr: cikan.ad_tr.trim().slice(0, 200),
            ad_ar: typeof cikan.ad_ar === "string" ? cikan.ad_ar.trim().slice(0, 200) : undefined,
          }];
        })
      : [];

    const ekstralar = Array.isArray(kayit.ekstralar)
      ? kayit.ekstralar.slice(0, 20).flatMap((hamEkstra) => {
          if (!hamEkstra || typeof hamEkstra !== "object" || Array.isArray(hamEkstra)) return [];
          const ekstra = hamEkstra as Record<string, unknown>;
          if (typeof ekstra.ad_tr !== "string" || !ekstra.ad_tr.trim()) return [];
          return [{
            ad_tr: ekstra.ad_tr.trim().slice(0, 200),
            ad_ar: typeof ekstra.ad_ar === "string" ? ekstra.ad_ar.trim().slice(0, 200) : undefined,
            fiyat: gecerliPara(ekstra.fiyat),
          }];
        })
      : [];

    sonuc.push({
      ad_tr: adTr.slice(0, 200),
      ad_ar: typeof kayit.ad_ar === "string" ? kayit.ad_ar.trim().slice(0, 200) : undefined,
      adet,
      birim_fiyat: gecerliPara(kayit.birim_fiyat),
      cikarilanlar,
      ekstralar,
      not: typeof kayit.not === "string" ? kayit.not.trim().slice(0, 200) : undefined,
    });
  }
  return sonuc;
}

export default async function SiparislerSayfasi() {
  const db = await sunucuIstemcisi();

  const { data, error } = await db
    .from("siparisler")
    .select(
      "id, siparis_no, musteri_ad, musteri_telefon, dil, kalemler, ara_toplam, servis_ucreti, toplam, durum, siparis_turu, masa_no, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error("Admin siparisleri okunamadi:", error);
    return (
      <main id="admin-ana-icerik" className="min-h-dvh">
        <AdminUstBar baslikAnahtari="siparisler" />
        <AdminVeriHatasi />
      </main>
    );
  }

  const siparisler = (data ?? []).map(
    (s): AdminSiparis => ({
      ...s,
      kalemler: kalemleriTemizle(s.kalemler),
      ara_toplam: Number(s.ara_toplam),
      servis_ucreti: Number(s.servis_ucreti),
      toplam: Number(s.toplam),
    }),
  );

  // ---- ozet: bugun ve son 7 gun ----
  const simdi = Date.now();
  const gun = 24 * 60 * 60 * 1000;
  const iptalDegil = siparisler.filter((s) => s.durum !== "iptal");

  const bugunku = iptalDegil.filter(
    (s) => new Date(s.created_at).toDateString() === new Date().toDateString(),
  );
  const haftalik = iptalDegil.filter(
    (s) => simdi - new Date(s.created_at).getTime() <= 7 * gun,
  );

  const ciro = (liste: AdminSiparis[]) =>
    kurus(liste.reduce((t, s) => kurus(t + s.toplam), 0));

  // ---- en cok satanlar (son 7 gun) ----
  // Iki dilli sayim: panel Arapcaysa urun adi da Arapca gorunmeli
  const satisAdetleri = new Map<
    string,
    { ad_tr: string; ad_ar?: string; adet: number }
  >();
  for (const s of haftalik) {
    for (const k of s.kalemler) {
      const mevcut = satisAdetleri.get(k.ad_tr);
      satisAdetleri.set(k.ad_tr, {
        ad_tr: k.ad_tr,
        ad_ar: k.ad_ar ?? mevcut?.ad_ar,
        adet: (mevcut?.adet ?? 0) + k.adet,
      });
    }
  }
  const enCokSatan = [...satisAdetleri.values()]
    .sort((a, b) => b.adet - a.adet)
    .slice(0, 5);

  return (
    <main id="admin-ana-icerik" className="min-h-dvh">
      <AdminUstBar baslikAnahtari="siparisler" />

      <YeniSiparisUyarisi ilkSiparisNo={siparisler[0]?.siparis_no ?? null} />

      <SiparisOzeti
        bugunCiro={ciro(bugunku)}
        bugunAdet={bugunku.length}
        haftaCiro={ciro(haftalik)}
        haftaAdet={haftalik.length}
        enCokSatan={enCokSatan}
      />

      <SiparisListesi siparisler={siparisler} />
    </main>
  );
}
