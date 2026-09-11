/**
 * Royal Restaurant — menu verisi yukleyici
 * =========================================
 *
 * data/menu-verisi.json dosyasini okuyup Supabase'e basar.
 *
 *   npm run seed          normal yukleme (guvenli, tekrar tekrar calistirilabilir)
 *   npm run seed:kuru     hicbir sey yazmaz, sadece veriyi denetler ve rapor verir
 *   npm run seed:sifirla  once TUM menu verisini siler, sonra sifirdan yukler
 *
 * Calismasi icin .env.local dosyasinda su iki deger olmali:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     (RLS'i asar — sadece bu script kullanir)
 *
 * Tum DB yazimi bakim_menu_yukle RPC'sinde tek transaction olarak yapilir.
 * Normal calisma yalniz eksik slug'lari ekler; mevcut UUID, admin icerigi,
 * aktif/stokta ve secenek satirlarini korur. Bos secenek tablosu varsa ilk
 * sablonu kurar. Yalniz --sifirla tum menuyu silip JSON'dan ayni transaction
 * icinde yeniden kurar.
 *
 * Siparisler tablosuna hicbir kosulda dokunulmaz.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------- tipler

interface SecenekSablonu {
  ad_tr: string;
  ad_ar: string;
}

interface EkstraSablonu extends SecenekSablonu {
  fiyat: number;
}

interface KategoriGirdisi {
  slug: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
  gorsel_url?: string | null;
}

interface UrunGirdisi {
  slug: string;
  kategori: string;
  sira: number;
  ad_tr: string;
  ad_ar: string;
  aciklama_tr?: string | null;
  aciklama_ar?: string | null;
  gorsel_url?: string | null;
  fiyat_masa: number;
  fiyat_paket: number;
  gramaj?: string | null;
  gramaj_ar?: string | null;
  kalori?: number | null;
  alerjenler?: string[];
  rozet?: string;
  stokta?: boolean;
  cikarilabilir?: string;
  ekstra?: string;
}

interface MenuVerisi {
  restoran?: Record<string, string>;
  ayarlar?: Record<string, unknown>;
  cikarilabilir_sablonlari: Record<string, SecenekSablonu[] | string>;
  ekstra_sablonlari: Record<string, EkstraSablonu[] | string>;
  kategoriler: KategoriGirdisi[];
  urunler: UrunGirdisi[];
}

// ---------------------------------------------------------------- sabitler

const GECERLI_ROZETLER = [
  "yok",
  "cok_satan",
  "yeni",
  "acili",
  "sefin_onerisi",
] as const;

/** Bilinen alerjenler. Listede olmayan bir deger uyari uretir, hata degil. */
const BILINEN_ALERJENLER = [
  "gluten",
  "sut",
  "yumurta",
  "susam",
  "findik",
  "soya",
  "hardal",
  "balik",
];

const KOK = process.cwd();
const VERI_YOLU = join(KOK, "data", "menu-verisi.json");

// ---------------------------------------------------------------- yardimcilar

const renk = {
  yesil: (s: string) => `\x1b[32m${s}\x1b[0m`,
  kirmizi: (s: string) => `\x1b[31m${s}\x1b[0m`,
  sari: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gri: (s: string) => `\x1b[90m${s}\x1b[0m`,
  kalin: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function baslik(metin: string): void {
  console.log("\n" + renk.kalin(metin));
}

function adim(metin: string): void {
  console.log(`  ${renk.yesil("✓")} ${metin}`);
}

function uyari(metin: string): void {
  console.log(`  ${renk.sari("!")} ${metin}`);
}

/**
 * Kurus hassasiyetine yuvarlar. numeric(10,2) sutunlarina yazmadan once
 * float artiklarini temizler (ornegin 0.1 + 0.2).
 */
function kurusaYuvarla(deger: number): number {
  return Math.round(deger * 100) / 100;
}

/** Bos string yerine null yazar — DB'de "" ile null karisikligi olmasin. */
function bosuNull(deger: string | null | undefined): string | null {
  if (deger === null || deger === undefined) return null;
  const kirpik = deger.trim();
  return kirpik === "" ? null : kirpik;
}

/**
 * Sablon tablosundan bir sablonu okur.
 * "_aciklama" gibi metin alanlari ve tanimsiz sablonlar bos dizi doner —
 * urunlerde kullanilan "yok" sablonu cikarilabilir tablosunda tanimli degil.
 */
function sablonOku<T>(
  tablo: Record<string, T[] | string> | undefined,
  ad: string | undefined,
): T[] {
  if (!tablo || !ad || ad === "yok") return [];
  const sablon = tablo[ad];
  return Array.isArray(sablon) ? sablon : [];
}

/** .env.local dosyasini okur. Node 20.12+ yerlesik ozelligini kullanir. */
function ortamiYukle(): void {
  try {
    process.loadEnvFile(join(KOK, ".env.local"));
  } catch {
    // Dosya yoksa sorun degil — degerler kabuktan gelmis olabilir.
    // Eksiklik kontrolu asagida yapiliyor.
  }
}

function istemciOlustur(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anahtar = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anahtar) {
    console.error(renk.kirmizi("\n✗ Supabase bilgileri bulunamadi.\n"));
    console.error("  .env.local dosyasi olusturup su iki satiri doldur:\n");
    console.error("    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co");
    console.error("    SUPABASE_SERVICE_ROLE_KEY=eyJ...\n");
    console.error(
      renk.gri("  Degerler: Supabase paneli > Project Settings > API Keys\n"),
    );
    process.exit(1);
  }

  if (anahtar.length < 100) {
    console.error(
      renk.kirmizi(
        "\n✗ SUPABASE_SERVICE_ROLE_KEY cok kisa gorunuyor. Yanlis degeri mi kopyaladin?\n",
      ),
    );
    console.error(
      renk.gri(
        "  Bu, 'anon public' degil 'service_role secret' anahtari olmali.\n",
      ),
    );
    process.exit(1);
  }

  return createClient(url, anahtar, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Supabase hatasini okunabilir bir mesaja cevirip programi durdurur. */
function hatayiBildir(nerede: string, hata: { message: string; hint?: string | null; details?: string | null }): never {
  console.error(renk.kirmizi(`\n✗ ${nerede} basarisiz.`));
  console.error(`  ${hata.message}`);
  if (hata.details) console.error(renk.gri(`  ${hata.details}`));
  if (hata.hint) console.error(renk.gri(`  Ipucu: ${hata.hint}`));

  if (/relation .* does not exist/i.test(hata.message)) {
    console.error(
      renk.sari(
        "\n  Tablolar henuz olusmamis. Once supabase/sema.sql dosyasini\n" +
          "  Supabase panelindeki SQL Editor'de calistir.\n",
      ),
    );
  }
  process.exit(1);
}

// ---------------------------------------------------------------- denetim

/**
 * Veriyi Supabase'e dokunmadan once denetler. Sema kisitlarini (rozet degeri,
 * negatif fiyat, tekrarli slug) burada yakalamak, yarim yuklemeden iyidir.
 */
function veriyiDenetle(veri: MenuVerisi): { hatalar: string[]; uyarilar: string[] } {
  const hatalar: string[] = [];
  const uyarilar: string[] = [];

  if (!Array.isArray(veri.kategoriler) || veri.kategoriler.length === 0) {
    hatalar.push("kategoriler dizisi bos veya eksik.");
  }
  if (!Array.isArray(veri.urunler) || veri.urunler.length === 0) {
    hatalar.push("urunler dizisi bos veya eksik.");
  }
  if (hatalar.length > 0) return { hatalar, uyarilar };

  // Kategori slug'lari benzersiz mi
  const kategoriSluglari = new Set<string>();
  for (const k of veri.kategoriler) {
    if (!k.slug) {
      hatalar.push(`Kategori "${k.ad_tr ?? "?"}" icin slug yok.`);
      continue;
    }
    if (kategoriSluglari.has(k.slug)) {
      hatalar.push(`Kategori slug'i tekrar ediyor: "${k.slug}".`);
    }
    kategoriSluglari.add(k.slug);
  }

  // Urunler
  const urunSluglari = new Set<string>();
  for (const u of veri.urunler) {
    const kim = u.slug || u.ad_tr || "?";

    if (!u.slug) {
      hatalar.push(`Urun "${kim}" icin slug yok.`);
    } else if (urunSluglari.has(u.slug)) {
      hatalar.push(`Urun slug'i tekrar ediyor: "${u.slug}".`);
    }
    if (u.slug) urunSluglari.add(u.slug);

    if (!kategoriSluglari.has(u.kategori)) {
      hatalar.push(
        `Urun "${kim}" tanimsiz bir kategoriye bagli: "${u.kategori}".`,
      );
    }

    const rozet = u.rozet ?? "yok";
    if (!GECERLI_ROZETLER.includes(rozet as (typeof GECERLI_ROZETLER)[number])) {
      hatalar.push(
        `Urun "${kim}" gecersiz rozet tasiyor: "${rozet}". ` +
          `Gecerli degerler: ${GECERLI_ROZETLER.join(", ")}.`,
      );
    }

    for (const alan of ["fiyat_masa", "fiyat_paket"] as const) {
      const fiyat = u[alan];
      if (typeof fiyat !== "number" || Number.isNaN(fiyat)) {
        hatalar.push(`Urun "${kim}" icin ${alan} sayi degil.`);
      } else if (fiyat < 0) {
        hatalar.push(`Urun "${kim}" icin ${alan} negatif.`);
      } else if (fiyat === 0) {
        uyarilar.push(`Urun "${kim}" icin ${alan} sifir.`);
      }
    }

    for (const alerjen of u.alerjenler ?? []) {
      if (!BILINEN_ALERJENLER.includes(alerjen)) {
        uyarilar.push(`Urun "${kim}" bilinmeyen alerjen tasiyor: "${alerjen}".`);
      }
    }

    if (!u.gorsel_url) {
      uyarilar.push(`Urun "${kim}" icin fotograf yok.`);
    }

    // Sablon adi verilmis ama sablon tabloda yoksa sessizce bos gecmesin
    if (
      u.cikarilabilir &&
      u.cikarilabilir !== "yok" &&
      !Array.isArray(veri.cikarilabilir_sablonlari?.[u.cikarilabilir])
    ) {
      hatalar.push(
        `Urun "${kim}" tanimsiz cikarilabilir sablonu istiyor: "${u.cikarilabilir}".`,
      );
    }
    if (
      u.ekstra &&
      u.ekstra !== "yok" &&
      !Array.isArray(veri.ekstra_sablonlari?.[u.ekstra])
    ) {
      hatalar.push(
        `Urun "${kim}" tanimsiz ekstra sablonu istiyor: "${u.ekstra}".`,
      );
    }
  }

  return { hatalar, uyarilar };
}

// ---------------------------------------------------------------- atomik yukleme

/** Scriptte denetlenmis JSON'u DB RPC'sinin dar ve acik sozlesmesine cevirir. */
function menuPayloaduOlustur(veri: MenuVerisi) {
  const kategoriler = veri.kategoriler.map((k) => ({
    slug: k.slug,
    sira: k.sira ?? 0,
    ad_tr: k.ad_tr.trim(),
    ad_ar: k.ad_ar.trim(),
    aciklama_tr: bosuNull(k.aciklama_tr),
    aciklama_ar: bosuNull(k.aciklama_ar),
    gorsel_url: bosuNull(k.gorsel_url),
    aktif: true,
  }));
  const urunler = veri.urunler.map((u) => ({
    kategori_slug: u.kategori,
    slug: u.slug,
    sira: u.sira ?? 0,
    ad_tr: u.ad_tr.trim(),
    ad_ar: u.ad_ar.trim(),
    aciklama_tr: bosuNull(u.aciklama_tr),
    aciklama_ar: bosuNull(u.aciklama_ar),
    gorsel_url: bosuNull(u.gorsel_url),
    fiyat_masa: kurusaYuvarla(u.fiyat_masa),
    fiyat_paket: kurusaYuvarla(u.fiyat_paket),
    gramaj: bosuNull(u.gramaj),
    gramaj_ar: bosuNull(u.gramaj_ar),
    kalori: u.kalori ?? null,
    alerjenler: u.alerjenler ?? [],
    rozet: u.rozet ?? "yok",
    stokta: u.stokta ?? true,
    aktif: true,
    cikarilabilirler: sablonOku<SecenekSablonu>(
      veri.cikarilabilir_sablonlari,
      u.cikarilabilir,
    ).map((s) => ({ ad_tr: s.ad_tr.trim(), ad_ar: s.ad_ar.trim() })),
    ekstralar: sablonOku<EkstraSablonu>(
      veri.ekstra_sablonlari,
      u.ekstra,
    ).map((s) => ({
      ad_tr: s.ad_tr.trim(),
      ad_ar: s.ad_ar.trim(),
      fiyat: kurusaYuvarla(s.fiyat ?? 0),
      stokta: true,
    })),
  }));
  const r = veri.restoran;
  const whatsapp = (r?.whatsapp ?? "").replace(/[^0-9]/g, "");
  const ayarlar = r
    ? {
        restoran_ad_tr: bosuNull(r.ad_tr),
        restoran_ad_ar: bosuNull(r.ad_ar),
        whatsapp_numarasi: whatsapp || null,
        telefon: bosuNull(r.telefon),
        harita_linki: bosuNull(r.harita),
        instagram: bosuNull(r.instagram),
        tiktok: bosuNull(r.tiktok),
      }
    : null;
  return { kategoriler, urunler, ayarlar };
}

function sonucSayisi(data: unknown, alan: string): number {
  if (!data || typeof data !== "object") return 0;
  const deger = (data as Record<string, unknown>)[alan];
  return typeof deger === "number" && Number.isInteger(deger) ? deger : 0;
}

async function atomikMenuYukle(
  db: SupabaseClient,
  payload: ReturnType<typeof menuPayloaduOlustur>,
  sifirla: boolean,
): Promise<void> {
  baslik(sifirla ? "Yikici atomik menu sifirlama" : "Guvenli eksik veri tamamlama");
  const { data, error } = await db.rpc("bakim_menu_yukle", {
    p_menu: payload,
    p_sifirla: sifirla,
  });
  if (error) hatayiBildir("Atomik menu yukleme", error);

  const kategoriSayisi = sonucSayisi(data, "kategori_sayisi");
  const urunSayisi = sonucSayisi(data, "urun_sayisi");
  const cikarilabilirSayisi = sonucSayisi(data, "cikarilabilir_sayisi");
  const ekstraSayisi = sonucSayisi(data, "ekstra_sayisi");
  if (sifirla) {
    adim(`${kategoriSayisi} kategori sifirdan yazildi`);
    adim(`${urunSayisi} urun sifirdan yazildi`);
    adim(`${cikarilabilirSayisi} cikarilabilir sifirdan yazildi`);
    adim(`${ekstraSayisi} ekstra sifirdan yazildi`);
  } else {
    adim(`${kategoriSayisi} eksik kategori eklendi`);
    adim(`${urunSayisi} eksik urun eklendi`);
    adim(`${cikarilabilirSayisi} cikarilabilir satiri bos urunlere eklendi`);
    adim(`${ekstraSayisi} ekstra satiri bos urunlere eklendi`);
    console.log(
      renk.gri(
        "    Mevcut UUID, fiyat/icerik, aktif/stokta ve secenek satirlari korundu.",
      ),
    );
  }
  if (sifirla && payload.ayarlar) {
    adim("Restoran bilgileri guncellendi");
    console.log(
      renk.gri(
        "    (servis ucreti, minimum siparis ve calisma saatleri korundu)",
      ),
    );
  } else if (sifirla) {
    uyari("JSON'da restoran blogu yok, ayarlar atlandi");
  }

  const stokDisi = payload.urunler.filter((u) => !u.stokta);
  if (sifirla && stokDisi.length > 0) {
    uyari(
      `${stokDisi.length} urun stok disi isaretli: ` +
        stokDisi.map((u) => u.slug).join(", "),
    );
  }
}

async function ozetiYazdir(db: SupabaseClient): Promise<void> {
  baslik("Veritabani durumu");

  const tablolar = ["kategoriler", "urunler", "cikarilabilirler", "ekstralar"];
  for (const tablo of tablolar) {
    const { count, error } = await db
      .from(tablo)
      .select("*", { count: "exact", head: true });
    if (error) hatayiBildir(`${tablo} sayimi`, error);
    console.log(`  ${tablo.padEnd(18)} ${renk.kalin(String(count ?? 0))} satir`);
  }
}

// ---------------------------------------------------------------- ana akis

async function main(): Promise<void> {
  const bayraklar = process.argv.slice(2);
  const kuruCalistir = bayraklar.includes("--kuru");
  const sifirla = bayraklar.includes("--sifirla");

  console.log(renk.kalin("\nRoyal Restaurant — menu yukleyici"));
  console.log(renk.gri(`Kaynak: ${VERI_YOLU}`));

  // 1. Veriyi oku
  let veri: MenuVerisi;
  try {
    veri = JSON.parse(readFileSync(VERI_YOLU, "utf8")) as MenuVerisi;
  } catch (e) {
    console.error(renk.kirmizi("\n✗ menu-verisi.json okunamadi."));
    console.error(`  ${(e as Error).message}\n`);
    process.exit(1);
  }

  // 2. Denetle
  baslik("Veri denetimi");
  const { hatalar, uyarilar } = veriyiDenetle(veri);

  for (const u of uyarilar) uyari(u);

  if (hatalar.length > 0) {
    console.error(
      renk.kirmizi(`\n✗ ${hatalar.length} hata bulundu, hicbir sey yazilmadi:\n`),
    );
    for (const h of hatalar) console.error(`  • ${h}`);
    console.error("");
    process.exit(1);
  }
  adim(
    `${veri.kategoriler.length} kategori, ${veri.urunler.length} urun — yapisal sorun yok`,
  );
  const payload = menuPayloaduOlustur(veri);

  if (kuruCalistir) {
    console.log(
      renk.sari("\n--kuru verildi: veritabanina hicbir sey yazilmadi.\n"),
    );
    return;
  }

  // 3. Baglan ve yaz
  ortamiYukle();
  const db = istemciOlustur();

  if (sifirla) {
    console.log(
      renk.sari(
        "\n--sifirla verildi: mevcut kategori ve urunler silinecek.\n" +
          "Kategori/urun/secenek UUID'leri ile aktif/stokta durumu JSON'a gore " +
          "sifirlanacak. Siparisler tablosuna dokunulmayacak.",
      ),
    );
  }

  await atomikMenuYukle(db, payload, sifirla);
  await ozetiYazdir(db);

  console.log(
    renk.yesil(
      renk.kalin(
        sifirla
          ? "\n✓ Menu yikici sifirlama ile yeniden kuruldu.\n"
          : "\n✓ Eksik menu verisi guvenle tamamlandi; mevcut veriler korundu.\n",
      ),
    ),
  );
}

main().catch((e: unknown) => {
  console.error(renk.kirmizi("\n✗ Beklenmeyen hata:"));
  console.error(e);
  process.exit(1);
});
