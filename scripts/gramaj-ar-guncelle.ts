/**
 * Sadece urunlerin gramaj_ar alanini menu-verisi.json'dan gunceller.
 *
 * Tam seed yerine bunun kullanilmasinin sebebi: admin panelinden yapilmis
 * fiyat/ad/fotograf duzenlemeleri korunsun. Bu script baska hicbir kolona
 * dokunmaz.
 *
 *   npm run gramaj:ar
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const KOK = process.cwd();

try {
  process.loadEnvFile(join(KOK, ".env.local"));
} catch {
  // Degerler kabuktan gelmis olabilir
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anahtar) {
  console.error("\n✗ .env.local icinde Supabase bilgileri yok.\n");
  process.exit(1);
}

interface Urun {
  slug: string;
  gramaj_ar?: string | null;
}

const veri = JSON.parse(
  readFileSync(join(KOK, "data", "menu-verisi.json"), "utf8"),
) as { urunler: Urun[] };

const db = createClient(url, anahtar, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const guncellemeler = veri.urunler
  .filter((urun): urun is Urun & { gramaj_ar: string } =>
    Boolean(urun.gramaj_ar?.trim()),
  )
  .map((urun) => ({ slug: urun.slug, gramaj_ar: urun.gramaj_ar.trim() }));
const atlanan = veri.urunler.length - guncellemeler.length;

const { data, error } = await db.rpc("bakim_gramaj_ar_guncelle", {
  p_guncellemeler: guncellemeler,
});
if (error) {
  console.error(`✗ Atomik gramaj guncellemesi basarisiz: ${error.message}`);
  console.error("  Hicbir urun guncellenmedi.");
  process.exit(1);
}

const guncellenen = Number(data ?? 0);
if (!Number.isInteger(guncellenen) || guncellenen !== guncellemeler.length) {
  console.error("✗ RPC beklenmeyen bir guncelleme sayisi dondurdu.");
  process.exit(1);
}
console.log(`\n✓ ${guncellenen} urunun Arapca gramaji tek transaction'da guncellendi.`);
if (atlanan) console.log(`  ${atlanan} urunde gramaj_ar yok, atlandi.`);
