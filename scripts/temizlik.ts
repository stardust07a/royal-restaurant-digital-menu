/**
 * Yayin oncesi tek seferlik temizlik:
 *   1. "crespi-*" slug yazim hatalarini "crispy-*" olarak duzeltir
 *   2. Test siparislerini siler
 *
 *   npm run temizlik
 *   npm run temizlik -- --kuru
 *
 * Yerel JSON ayni dizindeki benzersiz gecici dosyada hazirlanir. DB RPC'si
 * basarili olmadan kaynak degismez; basaridan sonra atomik rename kullanilir.
 */

import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const KOK = process.cwd();
const kuruCalistir = process.argv.slice(2).includes("--kuru");
const veriDizini = resolve(join(KOK, "data"));
const veriYolu = resolve(join(veriDizini, "menu-verisi.json"));
const geciciYol = resolve(
  join(
    veriDizini,
    `.menu-verisi.temizlik-${process.pid}-${Date.now()}-${randomUUID()}.tmp`,
  ),
);

/** Duzeltilecek slug'lar: yanlis -> dogru */
const SLUG_DUZELTME: Record<string, string> = {
  "crespi-durum": "crispy-durum",
  "crespi-burger": "crispy-burger",
  "crespi-menu": "crispy-menu",
};

/** Silinecek test siparisleri */
const TEST_SIPARISLERI = ["R794", "Y663", "Z748"];

function geciciYoluDogrula(yol: string): void {
  const kok = veriDizini.toLocaleLowerCase("en-US");
  const ebeveyn = resolve(dirname(yol)).toLocaleLowerCase("en-US");
  const kaynak = veriYolu.toLocaleLowerCase("en-US");
  const hedef = resolve(yol).toLocaleLowerCase("en-US");
  const ad = basename(yol);
  if (
    ebeveyn !== kok ||
    hedef === kaynak ||
    !ad.startsWith(".menu-verisi.temizlik-") ||
    !ad.endsWith(".tmp")
  ) {
    throw new Error(`Gecici dosya guvenlik denetimi basarisiz: ${yol}`);
  }
}

function geciciDosyayiSil(): void {
  geciciYoluDogrula(geciciYol);
  if (existsSync(geciciYol)) unlinkSync(geciciYol);
}

// ---------------------------------------------------------------- 1. slug

const veri = JSON.parse(readFileSync(veriYolu, "utf8")) as {
  urunler: { slug: string }[];
};

let jsonDegisti = 0;
for (const urun of veri.urunler) {
  const dogru = SLUG_DUZELTME[urun.slug];
  if (dogru) {
    urun.slug = dogru;
    jsonDegisti++;
  }
}
const yeniJson = JSON.stringify(veri, null, 2) + "\n";

if (kuruCalistir) {
  console.log(`Kuru calisma: JSON'da ${jsonDegisti} slug duzeltilecekti.`);
  console.log(
    `Kuru calisma: DB'de ${Object.keys(SLUG_DUZELTME).length} slug eslesmesi ` +
      `ve ${TEST_SIPARISLERI.length} test siparisi denetlenecekti.`,
  );
  console.log("Kaynak, gecici dosya ve veritabani degistirilmedi.");
  process.exit(0);
}

try {
  process.loadEnvFile(join(KOK, ".env.local"));
} catch {
  /* degerler kabuktan gelmis olabilir */
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anahtar) {
  console.error("\n✗ .env.local icinde Supabase bilgileri yok. Kaynak degismedi.\n");
  process.exit(1);
}
const db = createClient(url, anahtar, {
  auth: { persistSession: false, autoRefreshToken: false },
});

geciciYoluDogrula(geciciYol);
writeFileSync(geciciYol, yeniJson, { encoding: "utf8", flag: "wx" });
console.log(`Gecici JSON hazirlandi: ${geciciYol}`);

let sonuc: unknown;
try {
  const rpc = await db.rpc("bakim_temizlik", {
    p_sluglar: Object.entries(SLUG_DUZELTME).map(([eski, yeni]) => ({ eski, yeni })),
    p_test_siparisleri: TEST_SIPARISLERI,
  });
  if (rpc.error) throw new Error(rpc.error.message);
  sonuc = rpc.data;
} catch (hata) {
  geciciDosyayiSil();
  console.error(`\n✗ Atomik DB temizligi basarisiz: ${(hata as Error).message}`);
  console.error("  DB yazimi tamamlanmadi; gecici dosya silindi, kaynak degismedi.");
  process.exit(1);
}

try {
  geciciYoluDogrula(geciciYol);
  renameSync(geciciYol, veriYolu);
} catch (hata) {
  console.error(`\n✗ DB basarili fakat JSON devreye alinamadi: ${(hata as Error).message}`);
  console.error(`  Kaynak degismedi; kurtarma icin gecici dosya korundu: ${geciciYol}`);
  process.exit(1);
}

const sayilar = sonuc && typeof sonuc === "object"
  ? sonuc as Record<string, unknown>
  : {};
const slugSayisi = Number(sayilar.slug_sayisi ?? 0);
const siparisSayisi = Number(sayilar.siparis_sayisi ?? 0);
if (!Number.isInteger(slugSayisi) || !Number.isInteger(siparisSayisi)) {
  console.error("✗ Bakim RPC'si beklenmeyen bir sonuc dondurdu.");
  process.exit(1);
}
console.log(`menu-verisi.json: ${jsonDegisti} slug atomik olarak devreye alindi.`);
console.log(`DB: ${slugSayisi} slug tek transaction'da duzeltildi.`);
console.log(`${siparisSayisi} test siparisi ayni transaction'da silindi.`);

const { count } = await db
  .from("siparisler")
  .select("*", { count: "exact", head: true });
console.log(`Veritabaninda kalan siparis: ${count ?? 0}`);
