import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oku = (...parcalar) => readFileSync(new URL(`../${parcalar.join("/")}`, import.meta.url), "utf8");

test("admin ayarlarinda mevcut sifre dogrulanarak yeni sifre kaydedilir", () => {
  const form = oku("src", "components", "admin", "SifreDegistirFormu.tsx");
  const ayarlar = oku("src", "components", "admin", "AyarlarFormu.tsx");

  assert.match(ayarlar, /<SifreDegistirFormu\s*\/>/);
  assert.match(form, /auth\.signInWithPassword/);
  assert.match(form, /auth\.updateUser\(\{[\s\S]*password:\s*yeniSifre/);
  assert.match(form, /minLength=\{10\}/);
});

test("alerjen temizligi yalniz mevcut urun alerjenlerini bosaltir", () => {
  const migration = oku("supabase", "migrations", "202609250001_clear_product_allergens.sql");
  assert.match(migration, /update public\.urunler/i);
  assert.match(migration, /set alerjenler = '\{\}'::text\[\]/i);
  assert.doesNotMatch(migration, /drop\s+(?:table|column)/i);
});

test("paket siparis gorseli kirpilmadan kare alanda gosterilir", () => {
  const sayfa = oku("src", "app", "(public)", "[locale]", "page.tsx");
  assert.match(sayfa, /aspect-square[\s\S]*paket-siparis-kurye\.png|paket-siparis-kurye\.png[\s\S]*aspect-square/);
  assert.match(sayfa, /className="object-contain transition-transform/);
});
