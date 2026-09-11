import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const oku = (yol) => readFileSync(join(KOK, yol), "utf8");
const migrationDizini = join(KOK, "supabase", "migrations");
const migrationDosyalari = readdirSync(migrationDizini)
  .filter((ad) => ad.endsWith(".sql"))
  .sort();
const migrationlar = migrationDosyalari.map((ad) => ({
  ad,
  sql: readFileSync(join(migrationDizini, ad), "utf8"),
}));
const migration1 = oku("supabase/migrations/202608180001_order_security.sql");
const migration2 = oku("supabase/migrations/202608180002_admin_integrity.sql");
const migration3 = oku("supabase/migrations/202609110001_category_product_assignment.sql");
const migration4 = oku("supabase/migrations/202609110002_approved_menu_additions.sql");
const sema = oku("supabase/sema.sql");

function fonksiyon(sql, ad) {
  const baslangic = sql.indexOf(`create or replace function public.${ad}`);
  assert.notEqual(baslangic, -1, `${ad} fonksiyonu bulunamadı`);
  const bitis = sql.indexOf("\n$$;", baslangic);
  assert.notEqual(bitis, -1, `${ad} fonksiyonu kapanmıyor`);
  return sql.slice(baslangic, bitis + 4);
}

function bosluksuz(metin) {
  return metin.replace(/\s+/g, " ").trim();
}

test("migration dosyaları transaction sınırı içinde çalışır", () => {
  assert.ok(migrationDosyalari.includes("202609110001_category_product_assignment.sql"));
  assert.ok(migrationDosyalari.includes("202609110002_approved_menu_additions.sql"));
  for (const { ad, sql } of migrationlar) {
    assert.match(
      sql,
      /^(?:(?:\s+)|(?:--[^\r\n]*(?:\r?\n|$)))*begin;\s/i,
      `${ad} transaction ile başlamıyor`,
    );
    assert.match(sql, /commit;\s*$/i, `${ad} transaction ile bitmiyor`);
  }
});

test("onaylı menü migration'ı kategorileri önce ve tekrar güvenli biçimde ekler", () => {
  const kategoriEkle = migration4.indexOf("insert into public.kategoriler");
  const kategoriDenetle = migration4.indexOf("do $$");
  const urunEkle = migration4.indexOf("insert into public.urunler");

  assert.ok(kategoriEkle >= 0);
  assert.ok(kategoriEkle < kategoriDenetle);
  assert.ok(kategoriDenetle < urunEkle);
  assert.match(
    migration4,
    /insert into public\.kategoriler[\s\S]*?'izgaralar', 6[\s\S]*?'tavuk', 7[\s\S]*?on conflict \(slug\) do nothing;/i,
  );
  assert.match(
    migration4,
    /insert into public\.urunler[\s\S]*?where not exists \([\s\S]*?u\.slug = o\.slug[\s\S]*?lower\(btrim\(u\.ad_tr\)\) = lower\(btrim\(o\.ad_tr\)\)[\s\S]*?btrim\(u\.ad_ar\) = btrim\(o\.ad_ar\)[\s\S]*?on conflict \(slug\) do nothing;/i,
  );
  assert.match(
    migration4,
    /insert into public\.cikarilabilirler[\s\S]*?not exists \([\s\S]*?mevcut\.urun_id = hedef\.id/i,
  );
  assert.match(
    migration4,
    /insert into public\.ekstralar[\s\S]*?not exists \([\s\S]*?mevcut\.urun_id = hedef\.id/i,
  );
});

test("onaylı menü migration'ı yalnız kararlaştırılan ürünleri içerir", () => {
  for (const slug of [
    "aile-boyu-mansaf",
    "uzun-ekmek-crispy-sandvic",
    "yarim-mangal-tavuk-mendi-pilav",
    "yarim-kilo-tavuk-kebap",
    "yarim-kilo-sis-tavuk",
    "bir-kilo-sis-tavuk",
    "bir-kilo-izgara-kanat",
    "butun-mangal-tavuk",
    "izgara-kanat-porsiyon",
    "butun-broasted",
    "duble-zinger-sandvic",
    "duble-spicy-sandvic",
    "bir-kilo-tavuk-kebap",
    "bir-kilo-karisik-izgara",
    "parmak-doner",
  ]) {
    assert.ok(migration4.includes(`'${slug}'`), `${slug} migration'da bulunamadı`);
  }
  assert.doesNotMatch(migration4, /زنجر صمن فاهيتا/);
  assert.doesNotMatch(migration4, /شاورما فرط 300/);
  assert.doesNotMatch(migration4, /سندويش كباب دجاج/);
});

test("kategori içinden ürün atama RPC'si yetkili ve atomiktir", () => {
  const govde = fonksiyon(migration3, "admin_kategori_urunlerini_kaydet");
  assert.match(govde, /security definer/i);
  assert.match(govde, /set search_path = public, pg_temp/i);
  assert.match(govde, /auth\.role\(\).*authenticated[\s\S]*public\.is_admin\(\)/i);
  assert.match(govde, /update public\.kategoriler[\s\S]*update public\.urunler/i);
  assert.match(govde, /p_orijinal_kategori[\s\S]*k\.aciklama_tr is not distinct from p_orijinal_kategori->>'aciklama_tr'/i);
  assert.match(govde, /not \(p_orijinal_kategori \? 'gorsel_url'\)/i);
  assert.match(govde, /v_beklenen not between 0 and 2000/i);
  assert.match(govde, /char_length\(coalesce\(v_aciklama_tr, ''\)\) > 2000/i);
  assert.match(govde, /onceki_kategori_id[\s\S]*u\.kategori_id = g\.onceki_kategori_id/i);
  assert.match(govde, /jsonb_typeof\(deger->'kategori_id'\) is distinct from 'string'/i);
  assert.match(govde, /lock table public\.urunler in share row exclusive mode[\s\S]*perform k\.id[\s\S]*order by k\.id[\s\S]*for key share[\s\S]*update public\.kategoriler/i);
  assert.match(govde, /v_kilitlenen <> v_kategori_beklenen[\s\S]*errcode = '40001'/i);
  assert.match(govde, /v_etkilenen <> v_beklenen[\s\S]*errcode = '40001'/i);
  assert.match(
    migration3,
    /revoke all on function public\.admin_kategori_urunlerini_kaydet\(uuid, jsonb, jsonb, jsonb\)[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration3,
    /grant execute on function public\.admin_kategori_urunlerini_kaydet\(uuid, jsonb, jsonb, jsonb\)[\s\S]*to authenticated/i,
  );
  assert.equal(
    bosluksuz(fonksiyon(sema, "admin_kategori_urunlerini_kaydet")),
    bosluksuz(govde),
    "kategori ürün atama RPC'si şema ile migration arasında farklı",
  );
});

test("ürün kategori yabancı anahtarı doğrudan cascade silmeye izin vermez", () => {
  assert.match(sema, /kategori_id uuid references kategoriler\(id\) on delete restrict/i);
  assert.doesNotMatch(sema, /kategori_id uuid references kategoriler\(id\) on delete cascade/i);
  for (const sql of [migration3, sema]) {
    assert.match(sql, /from pg_constraint as c[\s\S]*c\.confrelid = 'public\.kategoriler'::regclass/i);
    assert.match(sql, /alter table public\.urunler add constraint %I foreign key \(kategori_id\)[\s\S]*on delete restrict/i);
  }
});

test("kategori formu ürünleri kategori içinden topluca yönetir", () => {
  const form = oku("src/components/admin/KategoriFormu.tsx");
  assert.match(form, /type="checkbox"/);
  assert.match(form, /cikarilanUrunIds\.length > 0 && !tasimaKategoriId/);
  assert.match(form, /admin_kategori_urunlerini_kaydet/);
  assert.match(form, /p_orijinal_kategori: kategoriParmakIzi/);
  assert.match(form, /error\.message === "Kategori kaydi guncel degil"[\s\S]*kategoriKaydiDegisti/);
  assert.match(form, /name=\{`kategori-adi-\$\{dilSekmesi\}`\}[\s\S]*maxLength=\{200\}/);
  assert.match(form, /<textarea[\s\S]*name=\{`kategori-aciklama-\$\{dilSekmesi\}`\}[\s\S]*maxLength=\{2000\}/);
  assert.match(form, /onceki_kategori_id: urun\.kategori_id/);
  assert.match(form, /kategori_id: simdiSecili \? k\.id! : tasimaKategoriId/);
  assert.match(form, /admin_kategori_sil/);
  assert.match(form, /nextGorselUrlDogrula\(k\.gorsel_url\)/);
  assert.match(form, /const kategoriAdi = dil === "ar" \? k\.ad_ar \|\| k\.ad_tr : k\.ad_tr \|\| k\.ad_ar/);
  assert.match(form, /confirm\(`"\$\{kategoriAdi\}"/);
  assert.match(form, /<ul className="uzun-liste mt-3 max-h-96 space-y-2 overflow-y-auto pe-1">/);
  assert.match(form, /disabled=\{kaydediliyor \|\| yukleniyor \|\| degisiklikVar \|\| k\.urunSayisi > 0 \|\| urunListesiSiniraUlasti\}/);
  assert.doesNotMatch(form, /\.from\("kategoriler"\)\.delete\(\)/);
});

test("kategori silme RPC'si ürün varsa cascade silmeyi engeller", () => {
  const govde = fonksiyon(migration3, "admin_kategori_sil");
  assert.match(govde, /security definer/i);
  assert.match(govde, /set search_path = public, pg_temp/i);
  assert.match(govde, /auth\.role\(\).*authenticated[\s\S]*public\.is_admin\(\)/i);
  assert.match(govde, /lock table public\.urunler in share row exclusive mode[\s\S]*for update/i);
  assert.match(govde, /exists \(select 1 from public\.urunler where kategori_id = p_kategori_id\)[\s\S]*errcode = '23503'/i);
  assert.match(govde, /delete from public\.kategoriler where id = p_kategori_id/i);
  assert.match(migration3, /revoke all on function public\.admin_kategori_sil\(uuid\)[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(migration3, /grant execute on function public\.admin_kategori_sil\(uuid\)[\s\S]*to authenticated/i);
  assert.equal(bosluksuz(fonksiyon(sema, "admin_kategori_sil")), bosluksuz(govde));
});

test("kategori düzenleme en fazla 2000 ürün yükler ve sınır aşımını bildirir", () => {
  const sayfa = oku("src/app/(admin)/admin/kategori/[id]/page.tsx");
  assert.match(sayfa, /\.select\("id, kategori_id, ad_tr, ad_ar, aktif, sira", \{ count: "exact" \}\)[\s\S]*\.limit\(2000\)/);
  assert.match(sayfa, /urunListesiSonucu\.count \?\? 0\) > 2000/);
  assert.match(sayfa, /urunListesiSiniraUlasti=\{urunListesiSiniraUlasti\}/);
});

test("kategori düzenleme başlığı ve silme uyarısı yönetici dilini kullanır", () => {
  const sayfa = oku("src/app/(admin)/admin/kategori/[id]/page.tsx");
  const form = oku("src/components/admin/KategoriFormu.tsx");
  const ustBar = oku("src/components/admin/AdminUstBar.tsx");
  const dil = oku("src/lib/admin-dil.tsx");
  assert.match(sayfa, /baslikTr=\{data\.ad_tr\}[\s\S]*baslikAr=\{data\.ad_ar\}/);
  assert.match(ustBar, /dil === "ar"[\s\S]*baslikAr \|\| baslikTr/);
  assert.match(form, /const kategoriAdi = dil === "ar" \? k\.ad_ar \|\| k\.ad_tr : k\.ad_tr \|\| k\.ad_ar/);
  assert.match(dil, /kategoriUrunUyari: \[[\s\S]*Kategori, içinde ürün varken silinemez/);
  assert.doesNotMatch(dil, /kategoriUrunUyari: \[[\s\S]*ürünler de silinir/);
});

test("SECURITY DEFINER fonksiyonları sabit search_path ve rol koruması kullanır", () => {
  const adminFonksiyonlari = [
    "admin_urun_kaydet",
    "admin_toplu_fiyat_guncelle",
    "admin_kategori_sirala",
  ];
  const bakimFonksiyonlari = [
    "bakim_menu_yukle",
    "bakim_gramaj_ar_guncelle",
    "bakim_temizlik",
  ];

  for (const ad of adminFonksiyonlari) {
    const govde = fonksiyon(migration2, ad);
    assert.match(govde, /security definer/i);
    assert.match(govde, /set search_path = public, pg_temp/i);
    assert.match(govde, /auth\.role\(\).*authenticated[\s\S]*public\.is_admin\(\)/i);
  }
  for (const ad of bakimFonksiyonlari) {
    const govde = fonksiyon(migration2, ad);
    assert.match(govde, /security definer/i);
    assert.match(govde, /set search_path = public, pg_temp/i);
    assert.match(govde, /auth\.role\(\).*service_role/i);
  }

  const tumGovdeler = [...adminFonksiyonlari, ...bakimFonksiyonlari]
    .map((ad) => fonksiyon(migration2, ad))
    .join("\n");
  assert.doesNotMatch(tumGovdeler, /\bexecute\s+(?:format|\()/i);
});

test("RPC yürütme izinleri en dar gerekli rollere verilir", () => {
  for (const ad of ["admin_urun_kaydet", "admin_toplu_fiyat_guncelle", "admin_kategori_sirala"]) {
    assert.match(migration2, new RegExp(`revoke all on function public\\.${ad}\\([\\s\\S]*?from public, anon, authenticated, service_role`, "i"));
    assert.match(migration2, new RegExp(`grant execute on function public\\.${ad}\\([\\s\\S]*?to authenticated`, "i"));
  }
  for (const ad of ["bakim_menu_yukle", "bakim_gramaj_ar_guncelle", "bakim_temizlik"]) {
    assert.match(migration2, new RegExp(`revoke all on function public\\.${ad}\\([\\s\\S]*?from public, anon, authenticated, service_role`, "i"));
    assert.match(migration2, new RegExp(`grant execute on function public\\.${ad}\\([\\s\\S]*?to service_role`, "i"));
  }
});

test("admin ürün kaydı alt satır UUID ve ekstra stok durumunu koruyan güncelleme yapar", () => {
  const govde = fonksiyon(migration2, "admin_urun_kaydet");
  assert.match(govde, /mevcut\.id = \(g\.deger->>'id'\)::uuid/i);
  assert.match(govde, /update public\.ekstralar[\s\S]*stokta = \(g\.deger->>'stokta'\)::boolean/i);
  assert.doesNotMatch(govde, /delete from public\.ekstralar\s+where urun_id = v_id\s*;/i);
});

test("bakım scriptleri DB yazılarını atomik RPC'lere bırakır", () => {
  const seed = oku("scripts/seed.ts");
  const gramaj = oku("scripts/gramaj-ar-guncelle.ts");
  const temizlik = oku("scripts/temizlik.ts");
  assert.match(seed, /\.rpc\("bakim_menu_yukle"/);
  assert.match(gramaj, /\.rpc\("bakim_gramaj_ar_guncelle"/);
  assert.match(temizlik, /\.rpc\("bakim_temizlik"/);
  assert.doesNotMatch(seed, /\.from\("(?:urunler|kategoriler|cikarilabilirler|ekstralar)"\)\s*\.delete\(/s);
});

test("ayarlar formu boş isteğe bağlı değerleri null olarak saklar", () => {
  const form = oku("src/components/admin/AyarlarFormu.tsx");
  assert.match(form, /whatsapp_numarasi:\s*whatsapp \|\| null/);
  assert.match(form, /telefon:\s*kirpilmisVeyaNull\(a\.telefon\)/);
  assert.match(form, /harita_linki:\s*kirpilmisVeyaNull\(a\.harita_linki\)/);
  assert.equal((form.match(/\.select\("id"\)\s*\.single\(\)/g) ?? []).length, 1);
  assert.match(
    form,
    /\.select\(\s*"id, telefon_ikon_url, whatsapp_ikon_url, instagram_ikon_url, tiktok_ikon_url, facebook_ikon_url"/,
  );
  assert.doesNotMatch(form, /trim\(\)\.slice\(0, 32\)/);
  assert.match(form, /nextGorselUrlDogrula\(ayarlar\.telefon_ikon_url\)/);
});

test("eski şema migration zinciri gerekli kolonları kullanmadan önce ekler", () => {
  assert.match(migration1, /add column if not exists siparis_turu text not null default 'paket'/i);
  assert.match(migration1, /add column if not exists masa_no text/i);
  assert.match(migration2, /add column if not exists gramaj_ar text/i);
  assert.match(migration2, /add column if not exists facebook text/i);
  assert.ok(
    migration2.indexOf("add column if not exists gramaj_ar text") <
      migration2.indexOf("and (gramaj_ar is null"),
  );
});

test("hız limiti yalnız doğrulanmış Vercel IP başlığına güvenir", () => {
  const eylemler = oku("src/lib/siparis-eylemleri.ts");
  const kaynak = oku("src/lib/siparis-hiz-kaynagi.ts");
  assert.match(kaynak, /if \(!production\) return YEREL_GELISTIRME_HIZ_ANAHTARI/);
  assert.match(kaynak, /if \(vercel !== "1"\) return null/);
  assert.match(eylemler, /headers\(\)\)\.get\("x-vercel-forwarded-for"\)/);
  assert.doesNotMatch(`${eylemler}\n${kaynak}`, /TRUST_PROXY_HEADERS/);
  assert.doesNotMatch(eylemler, /basliklar\.get\("(?:x-forwarded-for|cf-connecting-ip|x-real-ip)"\)/);
});

test("migration ve canonical şemadaki RPC tanımları aynı kalır", () => {
  for (const ad of [
    "admin_urun_kaydet",
    "admin_toplu_fiyat_guncelle",
    "admin_kategori_sirala",
    "bakim_menu_yukle",
    "bakim_gramaj_ar_guncelle",
    "bakim_temizlik",
  ]) {
    assert.equal(bosluksuz(fonksiyon(sema, ad)), bosluksuz(fonksiyon(migration2, ad)), `${ad} şema ile migration arasında farklı`);
  }
});
