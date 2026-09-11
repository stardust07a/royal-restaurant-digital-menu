-- =====================================================================
-- Royal Restaurant - Veritabani semasi
-- Supabase panelinde: SQL Editor > yeni sorgu > bu dosyayi yapistir > Run
-- =====================================================================

-- ---------- KATEGORILER ----------
create table if not exists kategoriler (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  sira        int not null default 0,
  ad_tr       text not null,
  ad_ar       text not null,
  aciklama_tr text,
  aciklama_ar text,
  gorsel_url  text,
  aktif       boolean not null default true,
  created_at  timestamptz default now()
);

-- ---------- URUNLER ----------
create table if not exists urunler (
  id          uuid primary key default gen_random_uuid(),
  kategori_id uuid references kategoriler(id) on delete restrict,
  slug        text unique not null,
  sira        int not null default 0,
  ad_tr       text not null,
  ad_ar       text not null,
  aciklama_tr text,
  aciklama_ar text,
  gorsel_url  text,
  fiyat_masa  numeric(10,2) not null,   -- masa QR menusu
  fiyat_paket numeric(10,2) not null,   -- paket siparis menusu
  gramaj      text,                      -- her iki menude de gosterilir
  gramaj_ar   text,                      -- "180 g شاورما + ..." — bos ise gramaj kullanilir
  kalori      int,
  alerjenler  text[] not null default '{}',
  rozet       text not null default 'yok',
  stokta      boolean not null default true,
  aktif       boolean not null default true,
  created_at  timestamptz default now(),
  constraint rozet_gecerli check (
    rozet in ('yok','cok_satan','yeni','acili','sefin_onerisi')
  ),
  constraint fiyat_pozitif check (fiyat_masa >= 0 and fiyat_paket >= 0)
);

create index if not exists urunler_kategori_idx on urunler(kategori_id, sira);

-- Sema daha once kurulmus projeler icin: eksik kolonu ekle.
alter table urunler add column if not exists gramaj_ar text;

-- Eski ON DELETE CASCADE yabanci anahtarini ayni adla RESTRICT olarak kur.
-- pg_constraint uzerinden bulmak, farkli kurulumlarda varsayilan ad degisse
-- bile yalnizca urunler.kategori_id iliskisini degistirmemizi saglar.
do $$
declare
  v_fk_adi text;
begin
  select c.conname into v_fk_adi
  from pg_constraint as c
  where c.conrelid = 'public.urunler'::regclass
    and c.contype = 'f'
    and c.confrelid = 'public.kategoriler'::regclass
    and c.conkey = array[(
      select a.attnum from pg_attribute as a
      where a.attrelid = 'public.urunler'::regclass
        and a.attname = 'kategori_id'
        and not a.attisdropped
    )]
  limit 1;

  if v_fk_adi is not null then
    execute format('alter table public.urunler drop constraint %I', v_fk_adi);
  else
    v_fk_adi := 'urunler_kategori_id_fkey';
  end if;

  execute format(
    'alter table public.urunler add constraint %I foreign key (kategori_id) references public.kategoriler(id) on delete restrict',
    v_fk_adi
  );
end;
$$;

-- ---------- CIKARILABILIRLER (ucretsiz) ----------
create table if not exists cikarilabilirler (
  id      uuid primary key default gen_random_uuid(),
  urun_id uuid references urunler(id) on delete cascade,
  sira    int not null default 0,
  ad_tr   text not null,
  ad_ar   text not null
);

create index if not exists cikarilabilirler_urun_idx on cikarilabilirler(urun_id, sira);

-- ---------- EKSTRALAR (ucretli) ----------
create table if not exists ekstralar (
  id      uuid primary key default gen_random_uuid(),
  urun_id uuid references urunler(id) on delete cascade,
  sira    int not null default 0,
  ad_tr   text not null,
  ad_ar   text not null,
  fiyat   numeric(10,2) not null default 0,
  stokta  boolean not null default true
);

create index if not exists ekstralar_urun_idx on ekstralar(urun_id, sira);

-- ---------- SIPARISLER ----------
create table if not exists siparisler (
  id               uuid primary key default gen_random_uuid(),
  siparis_no       text unique not null,
  musteri_ad       text not null,
  musteri_telefon  text not null,
  dil              text not null default 'tr',
  kalemler         jsonb not null,
  ara_toplam       numeric(10,2) not null,
  servis_ucreti    numeric(10,2) not null,
  toplam           numeric(10,2) not null,
  durum            text not null default 'yeni',
  idempotency_anahtari uuid,
  istek_hash       text,
  idempotency_yaniti jsonb,
  created_at       timestamptz default now(),
  constraint durum_gecerli check (
    durum in ('yeni','onaylandi','hazirlaniyor','yolda','teslim','iptal')
  )
);

create index if not exists siparisler_tarih_idx on siparisler(created_at desc);

-- Masa siparisi / paket siparis ayrimi. Masa siparisinde servis ucreti yok,
-- ad-telefon-adres alinmaz; onun yerine musteri masa numarasini yazar.
alter table siparisler add column if not exists siparis_turu text not null default 'paket';
alter table siparisler add column if not exists masa_no text;
alter table siparisler add column if not exists idempotency_anahtari uuid;
alter table siparisler add column if not exists istek_hash text;
alter table siparisler add column if not exists idempotency_yaniti jsonb;
alter table siparisler drop column if exists whatsapp_acildi;
create unique index if not exists siparisler_idempotency_idx
  on siparisler(idempotency_anahtari) where idempotency_anahtari is not null;
alter table siparisler drop constraint if exists siparis_turu_gecerli;
alter table siparisler add constraint siparis_turu_gecerli
  check (siparis_turu in ('masa','paket'));

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.siparisler'::regclass and conname = 'siparisler_istek_hash_gecerli') then
alter table siparisler add constraint siparisler_istek_hash_gecerli
  check (istek_hash is null or istek_hash ~ '^[0-9a-f]{64}$') not valid;
end if;
end $$;
do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.siparisler'::regclass and conname = 'siparisler_idempotency_tutarli') then
alter table siparisler add constraint siparisler_idempotency_tutarli
  check (
    (idempotency_anahtari is null and istek_hash is null and idempotency_yaniti is null)
    or
    (idempotency_anahtari is not null and istek_hash is not null
      and idempotency_yaniti is not null and jsonb_typeof(idempotency_yaniti) = 'object')
  ) not valid;
end if;
end $$;
do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.siparisler'::regclass and conname = 'siparisler_yeni_no_bicimi') then
alter table siparisler add constraint siparisler_yeni_no_bicimi
  check (siparis_no ~ '^R-[0-9]{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$') not valid;
end if;
end $$;

-- ---------- AYARLAR (tek satir) ----------
create table if not exists ayarlar (
  id                  int primary key default 1,
  restoran_ad_tr      text,
  restoran_ad_ar      text,
  logo_url            text,
  whatsapp_numarasi   text,
  telefon             text,
  adres_tr            text,
  adres_ar            text,
  harita_linki        text,
  instagram           text,
  tiktok              text,
  facebook            text,
  telefon_ikonu       text not null default '📞',
  whatsapp_ikonu      text not null default '💬',
  instagram_ikonu     text not null default '📸',
  tiktok_ikonu        text not null default '🎵',
  facebook_ikonu      text not null default '👍',
  telefon_ikon_url    text,
  whatsapp_ikon_url   text,
  instagram_ikon_url  text,
  tiktok_ikon_url     text,
  facebook_ikon_url   text,
  servis_ucreti       numeric(10,2) not null default 60,
  minimum_siparis     numeric(10,2) not null default 200,
  siparis_alimi_acik  boolean not null default true,
  calisma_saatleri    jsonb,
  kapali_mesaji_tr    text,
  kapali_mesaji_ar    text,
  -- Ana sayfa metinleri (admin panelden duzenlenir; bos ise ceviri dosyasi)
  hero_baslik_tr      text,
  hero_baslik_ar      text,
  hero_alt_tr         text,
  hero_alt_ar         text,
  hakkimizda_baslik_tr text,
  hakkimizda_baslik_ar text,
  hakkimizda_metin_tr  text,
  hakkimizda_metin_ar  text,
  constraint tek_satir check (id = 1)
);

-- Sema daha once kurulmus projeler icin eksik kolonlari ekle
alter table ayarlar add column if not exists hero_baslik_tr text;
alter table ayarlar add column if not exists hero_baslik_ar text;
alter table ayarlar add column if not exists hero_alt_tr text;
alter table ayarlar add column if not exists hero_alt_ar text;
alter table ayarlar add column if not exists hakkimizda_baslik_tr text;
alter table ayarlar add column if not exists hakkimizda_baslik_ar text;
alter table ayarlar add column if not exists hakkimizda_metin_tr text;
alter table ayarlar add column if not exists hakkimizda_metin_ar text;
alter table ayarlar add column if not exists telefon_ikonu text not null default '📞';
alter table ayarlar add column if not exists whatsapp_ikonu text not null default '💬';
alter table ayarlar add column if not exists instagram_ikonu text not null default '📸';
alter table ayarlar add column if not exists tiktok_ikonu text not null default '🎵';
alter table ayarlar add column if not exists facebook_ikonu text not null default '👍';
alter table ayarlar add column if not exists telefon_ikon_url text;
alter table ayarlar add column if not exists whatsapp_ikon_url text;
alter table ayarlar add column if not exists instagram_ikon_url text;
alter table ayarlar add column if not exists tiktok_ikon_url text;
alter table ayarlar add column if not exists facebook_ikon_url text;

update public.ayarlar set
  telefon_ikonu = case when char_length(btrim(telefon_ikonu)) between 1 and 4 then btrim(telefon_ikonu) else '📞' end,
  whatsapp_ikonu = case when char_length(btrim(whatsapp_ikonu)) between 1 and 4 then btrim(whatsapp_ikonu) else '💬' end,
  instagram_ikonu = case when char_length(btrim(instagram_ikonu)) between 1 and 4 then btrim(instagram_ikonu) else '📸' end,
  tiktok_ikonu = case when char_length(btrim(tiktok_ikonu)) between 1 and 4 then btrim(tiktok_ikonu) else '🎵' end,
  facebook_ikonu = case when char_length(btrim(facebook_ikonu)) between 1 and 4 then btrim(facebook_ikonu) else '👍' end;

alter table public.ayarlar
  drop constraint if exists ayarlar_iletisim_ikonlari_gecerli;

alter table public.ayarlar
  add constraint ayarlar_iletisim_ikonlari_gecerli check (
    char_length(btrim(telefon_ikonu)) between 1 and 4
    and char_length(btrim(whatsapp_ikonu)) between 1 and 4
    and char_length(btrim(instagram_ikonu)) between 1 and 4
    and char_length(btrim(tiktok_ikonu)) between 1 and 4
    and char_length(btrim(facebook_ikonu)) between 1 and 4
  ) not valid;

alter table public.ayarlar
  validate constraint ayarlar_iletisim_ikonlari_gecerli;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ayarlar'::regclass
      and conname = 'ayarlar_iletisim_logo_url_gecerli'
  ) then
    alter table public.ayarlar
      add constraint ayarlar_iletisim_logo_url_gecerli check (
        (telefon_ikon_url is null or
          (char_length(telefon_ikon_url) <= 2048 and telefon_ikon_url ~ '^https://[^[:space:]]+$'))
        and (whatsapp_ikon_url is null or
          (char_length(whatsapp_ikon_url) <= 2048 and whatsapp_ikon_url ~ '^https://[^[:space:]]+$'))
        and (instagram_ikon_url is null or
          (char_length(instagram_ikon_url) <= 2048 and instagram_ikon_url ~ '^https://[^[:space:]]+$'))
        and (tiktok_ikon_url is null or
          (char_length(tiktok_ikon_url) <= 2048 and tiktok_ikon_url ~ '^https://[^[:space:]]+$'))
        and (facebook_ikon_url is null or
          (char_length(facebook_ikon_url) <= 2048 and facebook_ikon_url ~ '^https://[^[:space:]]+$'))
      );
  end if;
end $$;

-- ---------- ADMIN ALLOWLIST ----------
create table if not exists admin_kullanicilar (
  kullanici_id uuid primary key references auth.users(id) on delete cascade,
  eposta text,
  created_at timestamptz not null default now()
);

-- Hesaplar otomatik yetkilendirilmez. Ilk admin ADIM-2-KURULUM.md'deki
-- komutla eklenir. Mevcut kurulum migration'i ise eski Auth hesaplarini korur.

create or replace function is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_kullanicilar where kullanici_id = auth.uid()
  );
$$;
revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated, service_role;

-- ---------- ATOMIK SIPARIS HIZ SINIRI ----------
create table if not exists siparis_hiz_sinirlari (
  anahtar_hash text primary key check (anahtar_hash ~ '^[0-9a-f]{64}$'),
  pencere_baslangici timestamptz not null,
  istek_sayisi integer not null check (istek_sayisi > 0),
  updated_at timestamptz not null default now()
);
create index if not exists siparis_hiz_sinirlari_updated_idx
  on siparis_hiz_sinirlari(updated_at);

create or replace function siparis_hiz_siniri_kontrol(
  p_anahtar_hash text, p_limit integer, p_pencere_saniye integer
)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_simdi timestamptz := clock_timestamp();
  v_izin boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Bu fonksiyon yalnizca service_role tarafindan cagrilabilir'
      using errcode = '42501';
  end if;
  if p_anahtar_hash !~ '^[0-9a-f]{64}$'
     or p_limit < 1 or p_limit > 100
     or p_pencere_saniye < 1 or p_pencere_saniye > 86400 then
    raise exception 'Gecersiz hiz siniri parametresi' using errcode = '22023';
  end if;

  -- Her cagri az miktarda 24 saatten eski kaydi temizler. updated_at indeksi
  -- sayesinde tablo trafik devam ederken sinirsiz buyumez.
  delete from siparis_hiz_sinirlari
  where anahtar_hash in (
    select anahtar_hash
    from siparis_hiz_sinirlari
    where updated_at < v_simdi - make_interval(
      secs => greatest(p_pencere_saniye * 6, 86400)
    )
    order by updated_at
    limit 25
  );

  insert into siparis_hiz_sinirlari as mevcut
    (anahtar_hash, pencere_baslangici, istek_sayisi, updated_at)
  values (p_anahtar_hash, v_simdi, 1, v_simdi)
  on conflict (anahtar_hash) do update set
    pencere_baslangici = case
      when mevcut.pencere_baslangici <= v_simdi - make_interval(secs => p_pencere_saniye) then v_simdi
      else mevcut.pencere_baslangici end,
    istek_sayisi = case
      when mevcut.pencere_baslangici <= v_simdi - make_interval(secs => p_pencere_saniye) then 1
      else mevcut.istek_sayisi + 1 end,
    updated_at = v_simdi
  returning istek_sayisi <= p_limit into v_izin;
  return v_izin;
end;
$$;
revoke all on function siparis_hiz_siniri_kontrol(text, integer, integer)
  from public, anon, authenticated;
grant execute on function siparis_hiz_siniri_kontrol(text, integer, integer)
  to service_role;

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================
alter table kategoriler       enable row level security;
alter table urunler           enable row level security;
alter table cikarilabilirler  enable row level security;
alter table ekstralar         enable row level security;
alter table ayarlar           enable row level security;
alter table siparisler        enable row level security;
alter table admin_kullanicilar enable row level security;
alter table siparis_hiz_sinirlari enable row level security;
revoke all on table admin_kullanicilar from anon, authenticated;
revoke all on table siparis_hiz_sinirlari from anon, authenticated;

-- Not: Postgres "create policy if not exists" desteklemez. Bu dosyanin ikinci
-- kez calistirilabilmesi icin her politika once dusuruluyor.

-- Menu verisi: herkes okur, sadece allowlist'teki admin yazar
drop policy if exists "menu_herkes_okur" on kategoriler;
drop policy if exists "menu_herkes_okur" on urunler;
drop policy if exists "menu_herkes_okur" on cikarilabilirler;
drop policy if exists "menu_herkes_okur" on ekstralar;
drop policy if exists "menu_herkes_okur" on ayarlar;

create policy "menu_herkes_okur" on kategoriler      for select using (true);
create policy "menu_herkes_okur" on urunler          for select using (true);
create policy "menu_herkes_okur" on cikarilabilirler for select using (true);
create policy "menu_herkes_okur" on ekstralar        for select using (true);
create policy "menu_herkes_okur" on ayarlar          for select using (true);

drop policy if exists "menu_admin_yazar" on kategoriler;
drop policy if exists "menu_admin_yazar" on urunler;
drop policy if exists "menu_admin_yazar" on cikarilabilirler;
drop policy if exists "menu_admin_yazar" on ekstralar;
drop policy if exists "menu_admin_yazar" on ayarlar;

create policy "menu_admin_yazar" on kategoriler for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "menu_admin_yazar" on urunler for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "menu_admin_yazar" on cikarilabilirler for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "menu_admin_yazar" on ekstralar for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "menu_admin_yazar" on ayarlar for all to authenticated
  using (is_admin()) with check (is_admin());

-- Siparisler: anon dogrudan ekleyemez; yalniz sunucu service-role ile ekler.
drop policy if exists "siparis_misafir_ekler"   on siparisler;
drop policy if exists "siparis_admin_okur"      on siparisler;
drop policy if exists "siparis_admin_gunceller" on siparisler;

create policy "siparis_admin_okur" on siparisler for select to authenticated
  using (is_admin());
create policy "siparis_admin_gunceller" on siparisler for update to authenticated
  using (is_admin()) with check (is_admin());
revoke insert on table siparisler from anon, authenticated;
grant select, update on table siparisler to authenticated;
grant all on table siparisler to service_role;

-- ---------- Varsayilan ayar satiri ----------
insert into ayarlar (
  id, restoran_ad_tr, restoran_ad_ar, whatsapp_numarasi, telefon,
  harita_linki, instagram, tiktok, servis_ucreti, minimum_siparis,
  calisma_saatleri, kapali_mesaji_tr, kapali_mesaji_ar
) values (
  1, 'Royal Restaurant', 'مطعم رويال', '905434888828', '+905434888828',
  'https://maps.app.goo.gl/9CuXKfBbRWqNaqGD8',
  'https://www.instagram.com/royalrestaurant.tr',
  'https://www.tiktok.com/@royalrestaurants1',
  60, 200,
  '{"pazartesi":{"acilis":"11:00","kapanis":"23:00","kapali":false},
    "sali":{"acilis":"11:00","kapanis":"23:00","kapali":false},
    "carsamba":{"acilis":"11:00","kapanis":"23:00","kapali":false},
    "persembe":{"acilis":"11:00","kapanis":"23:00","kapali":false},
    "cuma":{"acilis":"11:00","kapanis":"23:00","kapali":false},
    "cumartesi":{"acilis":"11:00","kapanis":"23:00","kapali":false},
    "pazar":{"acilis":"11:00","kapanis":"23:00","kapali":false}}'::jsonb,
  'Şu anda kapalıyız. Çalışma saatlerimizde tekrar bekleriz.',
  'نحن مغلقون حالياً. نرحب بكم في ساعات العمل.'
) on conflict (id) do nothing;

-- ---------- Fotograf deposu ----------
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'menu-gorseller', 'menu-gorseller', true, 8388608,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Depo politikalari: kova "public" olsa bile storage.objects uzerinde RLS
-- aciktir. Politika olmadan admin panelinden fotograf YUKLENEMEZ.
drop policy if exists "gorsel_herkes_okur"    on storage.objects;
drop policy if exists "gorsel_admin_yukler"   on storage.objects;
drop policy if exists "gorsel_admin_gunceller" on storage.objects;
drop policy if exists "gorsel_admin_siler"    on storage.objects;

create policy "gorsel_herkes_okur" on storage.objects
  for select using (bucket_id = 'menu-gorseller');

create policy "gorsel_admin_yukler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-gorseller' and public.is_admin());

create policy "gorsel_admin_gunceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-gorseller' and public.is_admin())
  with check (bucket_id = 'menu-gorseller' and public.is_admin());

create policy "gorsel_admin_siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-gorseller' and public.is_admin());

-- Faz 4A: Yonetici yazma islemleri tek bir veritabani transaction'i icinde
-- dogrulanir. NOT VALID kisitlar mevcut veriyi taramadan yeni yazmalari korur.

-- =====================================================================
-- Phase 4A: admin yazmalarini atomik RPC'lere tasir, yeni yazilar icin
-- muhafazakar veri sinirlari ve Storage dosya kurallari ekler.
-- CHECK ... NOT VALID eski satirlari taramaz; migration sonrasi tum yeni
-- insert/update islemlerinde yine de zorunlu olarak uygulanir.
-- =====================================================================

-- ---------- Muhafazakar tablo sinirlari ----------
do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.kategoriler'::regclass and conname = 'kategoriler_bicim_gecerli') then
alter table public.kategoriler add constraint kategoriler_bicim_gecerli check (
  char_length(slug) between 1 and 160
  and slug = btrim(slug)
  and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  and sira between 0 and 100000
  and char_length(btrim(ad_tr)) between 1 and 200
  and char_length(btrim(ad_ar)) between 1 and 200
  and (aciklama_tr is null or char_length(aciklama_tr) <= 2000)
  and (aciklama_ar is null or char_length(aciklama_ar) <= 2000)
  and (
    gorsel_url is null
    or (char_length(gorsel_url) <= 2048 and gorsel_url ~ '^https://[^[:space:]]+$')
  )
) not valid;
end if;
end $$;

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.urunler'::regclass and conname = 'urunler_bicim_gecerli') then
alter table public.urunler add constraint urunler_bicim_gecerli check (
  kategori_id is not null
  and char_length(slug) between 1 and 160
  and slug = btrim(slug)
  and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  and sira between 0 and 100000
  and char_length(btrim(ad_tr)) between 1 and 200
  and char_length(btrim(ad_ar)) between 1 and 200
  and (aciklama_tr is null or char_length(aciklama_tr) <= 4000)
  and (aciklama_ar is null or char_length(aciklama_ar) <= 4000)
  and (
    gorsel_url is null
    or (char_length(gorsel_url) <= 2048 and gorsel_url ~ '^https://[^[:space:]]+$')
  )
  and fiyat_masa between 0 and 99999999.99
  and fiyat_paket between 0 and 99999999.99
  and (gramaj is null or char_length(gramaj) <= 500)
  and (gramaj_ar is null or char_length(gramaj_ar) <= 500)
  and (kalori is null or kalori between 0 and 100000)
  and cardinality(alerjenler) <= 32
) not valid;
end if;
end $$;

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.cikarilabilirler'::regclass and conname = 'cikarilabilirler_bicim_gecerli') then
alter table public.cikarilabilirler
  add constraint cikarilabilirler_bicim_gecerli check (
    urun_id is not null
    and sira between 0 and 1000
    and char_length(btrim(ad_tr)) between 1 and 200
    and char_length(btrim(ad_ar)) between 1 and 200
  ) not valid;
end if;
end $$;

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.ekstralar'::regclass and conname = 'ekstralar_bicim_gecerli') then
alter table public.ekstralar add constraint ekstralar_bicim_gecerli check (
  urun_id is not null
  and sira between 0 and 1000
  and char_length(btrim(ad_tr)) between 1 and 200
  and char_length(btrim(ad_ar)) between 1 and 200
  and fiyat between 0 and 99999999.99
) not valid;
end if;
end $$;

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.ayarlar'::regclass and conname = 'ayarlar_bicim_gecerli') then
alter table public.ayarlar add constraint ayarlar_bicim_gecerli check (
  (restoran_ad_tr is null or char_length(restoran_ad_tr) <= 200)
  and (restoran_ad_ar is null or char_length(restoran_ad_ar) <= 200)
  and (logo_url is null or (char_length(logo_url) <= 2048 and logo_url ~ '^https://[^[:space:]]+$'))
  and (
    whatsapp_numarasi is null
    or (char_length(whatsapp_numarasi) between 10 and 15 and whatsapp_numarasi ~ '^[0-9]+$')
  )
  and (
    telefon is null
    or (char_length(telefon) between 3 and 32 and telefon ~ '^[0-9+() .-]+$')
  )
  and (adres_tr is null or char_length(adres_tr) <= 1000)
  and (adres_ar is null or char_length(adres_ar) <= 1000)
  and (harita_linki is null or (char_length(harita_linki) <= 2048 and harita_linki ~ '^https://[^[:space:]]+$'))
  and (instagram is null or (char_length(instagram) <= 2048 and instagram ~ '^https://[^[:space:]]+$'))
  and (tiktok is null or (char_length(tiktok) <= 2048 and tiktok ~ '^https://[^[:space:]]+$'))
  and (facebook is null or (char_length(facebook) <= 2048 and facebook ~ '^https://[^[:space:]]+$'))
  and servis_ucreti between 0 and 99999999.99
  and minimum_siparis between 0 and 99999999.99
  and (calisma_saatleri is null or jsonb_typeof(calisma_saatleri) = 'object')
  and (kapali_mesaji_tr is null or char_length(kapali_mesaji_tr) <= 2000)
  and (kapali_mesaji_ar is null or char_length(kapali_mesaji_ar) <= 2000)
  and (hero_baslik_tr is null or char_length(hero_baslik_tr) <= 500)
  and (hero_baslik_ar is null or char_length(hero_baslik_ar) <= 500)
  and (hero_alt_tr is null or char_length(hero_alt_tr) <= 1000)
  and (hero_alt_ar is null or char_length(hero_alt_ar) <= 1000)
  and (hakkimizda_baslik_tr is null or char_length(hakkimizda_baslik_tr) <= 500)
  and (hakkimizda_baslik_ar is null or char_length(hakkimizda_baslik_ar) <= 500)
  and (hakkimizda_metin_tr is null or char_length(hakkimizda_metin_tr) <= 5000)
  and (hakkimizda_metin_ar is null or char_length(hakkimizda_metin_ar) <= 5000)
) not valid;
end if;
end $$;

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.siparisler'::regclass and conname = 'siparisler_bicim_gecerli') then
alter table public.siparisler add constraint siparisler_bicim_gecerli check (
  char_length(btrim(siparis_no)) between 1 and 64
  and dil in ('tr', 'ar')
  and case
    when jsonb_typeof(kalemler) = 'array'
      then jsonb_array_length(kalemler) between 1 and 50
    else false
  end
  and ara_toplam between 0 and 99999999.99
  and servis_ucreti between 0 and 99999999.99
  and toplam between 0 and 99999999.99
  and toplam = ara_toplam + servis_ucreti
  and (istek_hash is null or char_length(istek_hash) between 32 and 128)
  and (
    idempotency_yaniti is null
    or jsonb_typeof(idempotency_yaniti) = 'object'
  )
  and (
    (siparis_turu = 'masa'
      and musteri_ad = '' and musteri_telefon = ''
      and char_length(btrim(coalesce(masa_no, ''))) between 1 and 10
      and servis_ucreti = 0)
    or
    (siparis_turu = 'paket'
      and char_length(btrim(musteri_ad)) between 2 and 60
      and musteri_telefon ~ '^[0-9]{10,15}$'
      and masa_no is null)
  )
) not valid;
end if;
end $$;

-- ---------- Urun + secenekleri tek atomik yazma ----------
create or replace function public.admin_urun_kaydet(
  p_urun_id uuid,
  p_urun jsonb,
  p_cikarilabilirler jsonb,
  p_ekstralar jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_kategori_id uuid;
  v_slug text;
  v_ad_tr text;
  v_ad_ar text;
  v_aciklama_tr text;
  v_aciklama_ar text;
  v_gorsel_url text;
  v_gramaj text;
  v_gramaj_ar text;
  v_rozet text;
  v_sira_n numeric;
  v_fiyat_masa numeric;
  v_fiyat_paket numeric;
  v_kalori_n numeric;
  v_kalori integer;
  v_stokta boolean;
  v_aktif boolean;
  v_alerjenler text[];
  v_alerjen_json jsonb;
  v_etkilenen integer;
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli' using errcode = '42501';
  end if;
  if jsonb_typeof(p_urun) is distinct from 'object'
     or jsonb_typeof(p_cikarilabilirler) is distinct from 'array'
     or jsonb_typeof(p_ekstralar) is distinct from 'array' then
    raise exception 'Gecersiz urun payload bicimi' using errcode = '22023';
  end if;
  if jsonb_array_length(p_cikarilabilirler) > 100
     or jsonb_array_length(p_ekstralar) > 100 then
    raise exception 'Secenek sayisi siniri asildi' using errcode = '22023';
  end if;

  if jsonb_typeof(p_urun->'kategori_id') is distinct from 'string'
     or jsonb_typeof(p_urun->'slug') is distinct from 'string'
     or jsonb_typeof(p_urun->'ad_tr') is distinct from 'string'
     or jsonb_typeof(p_urun->'ad_ar') is distinct from 'string'
     or jsonb_typeof(p_urun->'sira') is distinct from 'number'
     or jsonb_typeof(p_urun->'fiyat_masa') is distinct from 'number'
     or jsonb_typeof(p_urun->'fiyat_paket') is distinct from 'number'
     or jsonb_typeof(p_urun->'alerjenler') is distinct from 'array'
     or jsonb_typeof(p_urun->'rozet') is distinct from 'string'
     or jsonb_typeof(p_urun->'stokta') is distinct from 'boolean'
     or jsonb_typeof(p_urun->'aktif') is distinct from 'boolean' then
    raise exception 'Urun zorunlu alanlari gecersiz' using errcode = '22023';
  end if;
  if (p_urun ? 'aciklama_tr' and jsonb_typeof(p_urun->'aciklama_tr') not in ('string','null'))
     or (p_urun ? 'aciklama_ar' and jsonb_typeof(p_urun->'aciklama_ar') not in ('string','null'))
     or (p_urun ? 'gorsel_url' and jsonb_typeof(p_urun->'gorsel_url') not in ('string','null'))
     or (p_urun ? 'gramaj' and jsonb_typeof(p_urun->'gramaj') not in ('string','null'))
     or (p_urun ? 'gramaj_ar' and jsonb_typeof(p_urun->'gramaj_ar') not in ('string','null'))
     or (p_urun ? 'kalori' and jsonb_typeof(p_urun->'kalori') not in ('number','null')) then
    raise exception 'Urun istege bagli alanlari gecersiz' using errcode = '22023';
  end if;

  begin
    v_kategori_id := (p_urun->>'kategori_id')::uuid;
  exception when invalid_text_representation then
    raise exception 'Kategori kimligi gecersiz' using errcode = '22023';
  end;
  if not exists (select 1 from public.kategoriler where id = v_kategori_id) then
    raise exception 'Kategori bulunamadi' using errcode = '22023';
  end if;

  v_slug := btrim(p_urun->>'slug');
  v_ad_tr := btrim(p_urun->>'ad_tr');
  v_ad_ar := btrim(p_urun->>'ad_ar');
  v_aciklama_tr := nullif(btrim(coalesce(p_urun->>'aciklama_tr', '')), '');
  v_aciklama_ar := nullif(btrim(coalesce(p_urun->>'aciklama_ar', '')), '');
  v_gorsel_url := nullif(btrim(coalesce(p_urun->>'gorsel_url', '')), '');
  v_gramaj := nullif(btrim(coalesce(p_urun->>'gramaj', '')), '');
  v_gramaj_ar := nullif(btrim(coalesce(p_urun->>'gramaj_ar', '')), '');
  v_rozet := p_urun->>'rozet';
  v_sira_n := (p_urun->>'sira')::numeric;
  v_fiyat_masa := round((p_urun->>'fiyat_masa')::numeric, 2);
  v_fiyat_paket := round((p_urun->>'fiyat_paket')::numeric, 2);
  v_stokta := (p_urun->>'stokta')::boolean;
  v_aktif := (p_urun->>'aktif')::boolean;
  if jsonb_typeof(p_urun->'kalori') = 'number' then
    v_kalori_n := (p_urun->>'kalori')::numeric;
    if v_kalori_n <> trunc(v_kalori_n) or v_kalori_n not between 0 and 100000 then
      raise exception 'Kalori gecersiz' using errcode = '22023';
    end if;
    v_kalori := v_kalori_n::integer;
  end if;

  if char_length(v_slug) not between 1 and 160
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(v_ad_tr) not between 1 and 200
     or char_length(v_ad_ar) not between 1 and 200
     or char_length(coalesce(v_aciklama_tr, '')) > 4000
     or char_length(coalesce(v_aciklama_ar, '')) > 4000
     or char_length(coalesce(v_gramaj, '')) > 500
     or char_length(coalesce(v_gramaj_ar, '')) > 500
     or v_sira_n <> trunc(v_sira_n) or v_sira_n not between 0 and 100000
     or v_fiyat_masa not between 0 and 99999999.99
     or v_fiyat_paket not between 0 and 99999999.99
     or v_rozet not in ('yok','cok_satan','yeni','acili','sefin_onerisi')
     or (v_gorsel_url is not null and
       (char_length(v_gorsel_url) > 2048 or v_gorsel_url !~ '^https://[^[:space:]]+$')) then
    raise exception 'Urun alan sinirlari gecersiz' using errcode = '22023';
  end if;

  v_alerjen_json := p_urun->'alerjenler';
  if jsonb_array_length(v_alerjen_json) > 32
     or exists (
       select 1 from jsonb_array_elements(v_alerjen_json) as a(deger)
       where jsonb_typeof(deger) is distinct from 'string'
          or char_length(btrim(deger #>> '{}')) not between 1 and 80
     ) then
    raise exception 'Alerjen listesi gecersiz' using errcode = '22023';
  end if;
  v_alerjenler := array(
    select btrim(deger) from jsonb_array_elements_text(v_alerjen_json) as a(deger)
  );

  if exists (
    select 1 from jsonb_array_elements(p_cikarilabilirler) as c(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or (deger ? 'id' and jsonb_typeof(deger->'id') not in ('string','null'))
       or (jsonb_typeof(deger->'id') = 'string' and
           (deger->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
       or jsonb_typeof(deger->'ad_tr') is distinct from 'string'
       or jsonb_typeof(deger->'ad_ar') is distinct from 'string'
       or char_length(btrim(deger->>'ad_tr')) not between 1 and 200
       or char_length(btrim(deger->>'ad_ar')) not between 1 and 200
  ) or exists (
    select 1
    from jsonb_array_elements(p_cikarilabilirler) as c(deger)
    group by lower(btrim(deger->>'ad_tr')) having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_cikarilabilirler) as c(deger)
    where jsonb_typeof(deger->'id') = 'string'
    group by deger->>'id' having count(*) > 1
  ) then
    raise exception 'Cikarilabilir listesi gecersiz' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_ekstralar) as e(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or (deger ? 'id' and jsonb_typeof(deger->'id') not in ('string','null'))
       or (jsonb_typeof(deger->'id') = 'string' and
           (deger->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
       or jsonb_typeof(deger->'ad_tr') is distinct from 'string'
       or jsonb_typeof(deger->'ad_ar') is distinct from 'string'
       or jsonb_typeof(deger->'fiyat') is distinct from 'number'
       or jsonb_typeof(deger->'stokta') is distinct from 'boolean'
       or char_length(btrim(deger->>'ad_tr')) not between 1 and 200
       or char_length(btrim(deger->>'ad_ar')) not between 1 and 200
       or (deger->>'fiyat')::numeric not between 0 and 99999999.99
  ) or exists (
    select 1
    from jsonb_array_elements(p_ekstralar) as e(deger)
    group by lower(btrim(deger->>'ad_tr')) having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_ekstralar) as e(deger)
    where jsonb_typeof(deger->'id') = 'string'
    group by deger->>'id' having count(*) > 1
  ) then
    raise exception 'Ekstra listesi gecersiz' using errcode = '22023';
  end if;

  if p_urun_id is null then
    insert into public.urunler (
      kategori_id, slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar,
      gorsel_url, fiyat_masa, fiyat_paket, gramaj, gramaj_ar, kalori,
      alerjenler, rozet, stokta, aktif
    ) values (
      v_kategori_id, v_slug, v_sira_n::integer, v_ad_tr, v_ad_ar,
      v_aciklama_tr, v_aciklama_ar, v_gorsel_url, v_fiyat_masa,
      v_fiyat_paket, v_gramaj, v_gramaj_ar, v_kalori, v_alerjenler,
      v_rozet, v_stokta, v_aktif
    ) returning id into v_id;
  else
    update public.urunler set
      kategori_id = v_kategori_id, slug = v_slug, sira = v_sira_n::integer,
      ad_tr = v_ad_tr, ad_ar = v_ad_ar, aciklama_tr = v_aciklama_tr,
      aciklama_ar = v_aciklama_ar, gorsel_url = v_gorsel_url,
      fiyat_masa = v_fiyat_masa, fiyat_paket = v_fiyat_paket,
      gramaj = v_gramaj, gramaj_ar = v_gramaj_ar, kalori = v_kalori,
      alerjenler = v_alerjenler, rozet = v_rozet, stokta = v_stokta,
      aktif = v_aktif
    where id = p_urun_id;
    get diagnostics v_etkilenen = row_count;
    if v_etkilenen <> 1 then
      raise exception 'Urun bulunamadi' using errcode = '22023';
    end if;
    v_id := p_urun_id;
  end if;

  -- Istemcinin gonderdigi mevcut alt satir kimlikleri bu urune ait olmali.
  -- Boylece baska urunun satiri tasinamaz ve normal kayit mevcut kimlikleri
  -- koruyarak kalici sepet referanslarini bozmaz.
  if exists (
    select 1
    from jsonb_array_elements(p_cikarilabilirler) as c(deger)
    left join public.cikarilabilirler as mevcut
      on mevcut.id = (deger->>'id')::uuid and mevcut.urun_id = v_id
    where jsonb_typeof(deger->'id') = 'string' and mevcut.id is null
  ) then
    raise exception 'Cikarilabilir kimligi bu urune ait degil' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_ekstralar) as e(deger)
    left join public.ekstralar as mevcut
      on mevcut.id = (deger->>'id')::uuid and mevcut.urun_id = v_id
    where jsonb_typeof(deger->'id') = 'string' and mevcut.id is null
  ) then
    raise exception 'Ekstra kimligi bu urune ait degil' using errcode = '22023';
  end if;

  delete from public.cikarilabilirler as mevcut
  where mevcut.urun_id = v_id
    and not exists (
      select 1 from jsonb_array_elements(p_cikarilabilirler) as c(deger)
      where jsonb_typeof(deger->'id') = 'string'
        and (deger->>'id')::uuid = mevcut.id
    );
  update public.cikarilabilirler as mevcut set
    sira = g.siralama::integer,
    ad_tr = btrim(g.deger->>'ad_tr'),
    ad_ar = btrim(g.deger->>'ad_ar')
  from jsonb_array_elements(p_cikarilabilirler) with ordinality
    as g(deger, siralama)
  where jsonb_typeof(g.deger->'id') = 'string'
    and mevcut.id = (g.deger->>'id')::uuid
    and mevcut.urun_id = v_id;
  insert into public.cikarilabilirler (urun_id, sira, ad_tr, ad_ar)
  select v_id, siralama::integer, btrim(deger->>'ad_tr'), btrim(deger->>'ad_ar')
  from jsonb_array_elements(p_cikarilabilirler) with ordinality as c(deger, siralama)
  where jsonb_typeof(deger->'id') is distinct from 'string';

  delete from public.ekstralar as mevcut
  where mevcut.urun_id = v_id
    and not exists (
      select 1 from jsonb_array_elements(p_ekstralar) as e(deger)
      where jsonb_typeof(deger->'id') = 'string'
        and (deger->>'id')::uuid = mevcut.id
    );
  update public.ekstralar as mevcut set
    sira = g.siralama::integer,
    ad_tr = btrim(g.deger->>'ad_tr'),
    ad_ar = btrim(g.deger->>'ad_ar'),
    fiyat = round((g.deger->>'fiyat')::numeric, 2),
    stokta = (g.deger->>'stokta')::boolean
  from jsonb_array_elements(p_ekstralar) with ordinality as g(deger, siralama)
  where jsonb_typeof(g.deger->'id') = 'string'
    and mevcut.id = (g.deger->>'id')::uuid
    and mevcut.urun_id = v_id;
  insert into public.ekstralar (urun_id, sira, ad_tr, ad_ar, fiyat, stokta)
  select v_id, siralama::integer, btrim(deger->>'ad_tr'), btrim(deger->>'ad_ar'),
         round((deger->>'fiyat')::numeric, 2), (deger->>'stokta')::boolean
  from jsonb_array_elements(p_ekstralar) with ordinality as e(deger, siralama)
  where jsonb_typeof(deger->'id') is distinct from 'string';

  return v_id;
end;
$$;

-- ---------- Toplu fiyatlari tek set tabanli yazma ----------
create or replace function public.admin_toplu_fiyat_guncelle(p_guncellemeler jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_beklenen integer;
  v_etkilenen integer;
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli' using errcode = '42501';
  end if;
  if jsonb_typeof(p_guncellemeler) is distinct from 'array' then
    raise exception 'Gecersiz toplu fiyat payload bicimi' using errcode = '22023';
  end if;
  v_beklenen := jsonb_array_length(p_guncellemeler);
  if v_beklenen not between 1 and 500 then
    raise exception 'Toplu fiyat satir sayisi gecersiz' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_guncellemeler) as g(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'id') is distinct from 'string'
       or (deger->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(deger->'fiyat_masa') is distinct from 'number'
       or jsonb_typeof(deger->'fiyat_paket') is distinct from 'number'
       or (deger->>'fiyat_masa')::numeric not between 0 and 99999999.99
       or (deger->>'fiyat_paket')::numeric not between 0 and 99999999.99
  ) or (
    select count(distinct deger->>'id') <> count(*)
    from jsonb_array_elements(p_guncellemeler) as g(deger)
  ) then
    raise exception 'Toplu fiyat satirlari gecersiz' using errcode = '22023';
  end if;

  with girdi as (
    select (deger->>'id')::uuid as id,
           round((deger->>'fiyat_masa')::numeric, 2) as fiyat_masa,
           round((deger->>'fiyat_paket')::numeric, 2) as fiyat_paket
    from jsonb_array_elements(p_guncellemeler) as g(deger)
  ), yazilan as (
    update public.urunler as u set
      fiyat_masa = g.fiyat_masa,
      fiyat_paket = g.fiyat_paket
    from girdi as g
    where u.id = g.id
    returning u.id
  )
  select count(*) into v_etkilenen from yazilan;
  if v_etkilenen <> v_beklenen then
    raise exception 'Toplu fiyat urun listesi guncel degil' using errcode = '40001';
  end if;
  return v_etkilenen;
end;
$$;

-- ---------- Kategori sirasini tek atomik yazma ----------
create or replace function public.admin_kategori_sirala(p_siralar jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_beklenen integer;
  v_mevcut integer;
  v_etkilenen integer;
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli' using errcode = '42501';
  end if;
  if jsonb_typeof(p_siralar) is distinct from 'array' then
    raise exception 'Gecersiz kategori sirasi payload bicimi' using errcode = '22023';
  end if;
  v_beklenen := jsonb_array_length(p_siralar);
  if v_beklenen not between 1 and 500 then
    raise exception 'Kategori sirasi satir sayisi gecersiz' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_siralar) as s(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'id') is distinct from 'string'
       or (deger->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(deger->'sira') is distinct from 'number'
       or (deger->>'sira')::numeric <> trunc((deger->>'sira')::numeric)
       or (deger->>'sira')::numeric not between 1 and 500
  ) or (
    select count(distinct deger->>'id') <> count(*)
        or count(distinct deger->>'sira') <> count(*)
        or min((deger->>'sira')::integer) <> 1
        or max((deger->>'sira')::integer) <> count(*)
    from jsonb_array_elements(p_siralar) as s(deger)
  ) then
    raise exception 'Kategori sirasi satirlari gecersiz' using errcode = '22023';
  end if;

  lock table public.kategoriler in share row exclusive mode;
  select count(*) into v_mevcut from public.kategoriler;
  if v_mevcut <> v_beklenen then
    raise exception 'Kategori listesi guncel degil' using errcode = '40001';
  end if;

  with girdi as (
    select (deger->>'id')::uuid as id, (deger->>'sira')::integer as sira
    from jsonb_array_elements(p_siralar) as s(deger)
  ), yazilan as (
    update public.kategoriler as k set sira = g.sira
    from girdi as g
    where k.id = g.id
    returning k.id
  )
  select count(*) into v_etkilenen from yazilan;
  if v_etkilenen <> v_beklenen then
    raise exception 'Kategori kimlikleri guncel degil' using errcode = '40001';
  end if;
  return v_etkilenen;
end;
$$;

-- RPC'ler yalniz oturumlu rolde gorunur; fonksiyon icindeki is_admin kontrolu
-- authenticated fakat allowlist disi hesaplari da reddeder.
revoke all on function public.admin_urun_kaydet(uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_toplu_fiyat_guncelle(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.admin_kategori_sirala(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_urun_kaydet(uuid, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.admin_toplu_fiyat_guncelle(jsonb)
  to authenticated;
grant execute on function public.admin_kategori_sirala(jsonb)
  to authenticated;

-- ---------- Kategori ve urun atamalarini tek atomik yazma ----------
create or replace function public.admin_kategori_urunlerini_kaydet(
  p_kategori_id uuid,
  p_kategori jsonb,
  p_orijinal_kategori jsonb,
  p_urun_kategorileri jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slug text;
  v_ad_tr text;
  v_ad_ar text;
  v_aciklama_tr text;
  v_aciklama_ar text;
  v_gorsel_url text;
  v_sira_n numeric;
  v_sira integer;
  v_aktif boolean;
  v_beklenen integer;
  v_kategori_beklenen integer;
  v_kilitlenen integer;
  v_etkilenen integer;
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli' using errcode = '42501';
  end if;
  if p_kategori_id is null
     or jsonb_typeof(p_kategori) is distinct from 'object'
     or jsonb_typeof(p_orijinal_kategori) is distinct from 'object'
     or jsonb_typeof(p_urun_kategorileri) is distinct from 'array' then
    raise exception 'Gecersiz kategori payload bicimi' using errcode = '22023';
  end if;

  v_beklenen := jsonb_array_length(p_urun_kategorileri);
  if v_beklenen not between 0 and 2000 then
    raise exception 'Urun kategori satir sayisi gecersiz' using errcode = '22023';
  end if;

  if jsonb_typeof(p_kategori->'slug') is distinct from 'string'
     or jsonb_typeof(p_kategori->'sira') is distinct from 'number'
     or jsonb_typeof(p_kategori->'ad_tr') is distinct from 'string'
     or jsonb_typeof(p_kategori->'ad_ar') is distinct from 'string'
     or jsonb_typeof(p_kategori->'aktif') is distinct from 'boolean'
     or (p_kategori ? 'aciklama_tr' and jsonb_typeof(p_kategori->'aciklama_tr') not in ('string', 'null'))
     or (p_kategori ? 'aciklama_ar' and jsonb_typeof(p_kategori->'aciklama_ar') not in ('string', 'null'))
     or (p_kategori ? 'gorsel_url' and jsonb_typeof(p_kategori->'gorsel_url') not in ('string', 'null')) then
    raise exception 'Kategori alanlari gecersiz' using errcode = '22023';
  end if;

  if jsonb_typeof(p_orijinal_kategori->'slug') is distinct from 'string'
     or jsonb_typeof(p_orijinal_kategori->'sira') is distinct from 'number'
     or jsonb_typeof(p_orijinal_kategori->'ad_tr') is distinct from 'string'
     or jsonb_typeof(p_orijinal_kategori->'ad_ar') is distinct from 'string'
     or jsonb_typeof(p_orijinal_kategori->'aktif') is distinct from 'boolean'
     or not (p_orijinal_kategori ? 'aciklama_tr')
     or not (p_orijinal_kategori ? 'aciklama_ar')
     or not (p_orijinal_kategori ? 'gorsel_url')
     or jsonb_typeof(p_orijinal_kategori->'aciklama_tr') not in ('string', 'null')
     or jsonb_typeof(p_orijinal_kategori->'aciklama_ar') not in ('string', 'null')
     or jsonb_typeof(p_orijinal_kategori->'gorsel_url') not in ('string', 'null') then
    raise exception 'Kategori parmak izi gecersiz' using errcode = '22023';
  end if;

  v_slug := btrim(p_kategori->>'slug');
  v_ad_tr := btrim(p_kategori->>'ad_tr');
  v_ad_ar := btrim(p_kategori->>'ad_ar');
  v_aciklama_tr := nullif(btrim(coalesce(p_kategori->>'aciklama_tr', '')), '');
  v_aciklama_ar := nullif(btrim(coalesce(p_kategori->>'aciklama_ar', '')), '');
  v_gorsel_url := nullif(btrim(coalesce(p_kategori->>'gorsel_url', '')), '');
  v_sira_n := (p_kategori->>'sira')::numeric;
  v_aktif := (p_kategori->>'aktif')::boolean;

  if char_length(v_slug) not between 1 and 160
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(v_ad_tr) not between 1 and 200
     or char_length(v_ad_ar) not between 1 and 200
     or char_length(coalesce(v_aciklama_tr, '')) > 2000
     or char_length(coalesce(v_aciklama_ar, '')) > 2000
     or v_sira_n <> trunc(v_sira_n)
     or v_sira_n not between 0 and 100000
     or (v_gorsel_url is not null and
       (char_length(v_gorsel_url) > 2048 or v_gorsel_url !~ '^https://[^[:space:]]+$')) then
    raise exception 'Kategori alan sinirlari gecersiz' using errcode = '22023';
  end if;
  v_sira := v_sira_n::integer;

  if exists (
    select 1
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'id') is distinct from 'string'
       or jsonb_typeof(deger->'onceki_kategori_id') is distinct from 'string'
       or jsonb_typeof(deger->'kategori_id') is distinct from 'string'
       or (deger->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or (deger->>'onceki_kategori_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or (deger->>'kategori_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) or (
    select count(distinct deger->>'id') <> count(*)
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
  ) then
    raise exception 'Urun kategori satirlari gecersiz' using errcode = '22023';
  end if;

  -- Urun yazmalari ve kategori silme ile ayni tablo-kilit sirasini koru.
  -- Urun tablosu once kilitlenir; sonra kaynak/hedef kategoriler UUID
  -- sirasiyla KEY SHARE ile kilitlenir. Boylece kategori silme, urun yazimi
  -- veya FK kontrolu arasinda ters sirali bir kilitlenme olusmaz.
  lock table public.urunler in share row exclusive mode;

  with dahil_kategoriler as (
    select p_kategori_id as id
    union
    select (deger->>'onceki_kategori_id')::uuid
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
    union
    select (deger->>'kategori_id')::uuid
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
  )
  select count(*) into v_kategori_beklenen from dahil_kategoriler;

  perform k.id
  from public.kategoriler as k
  where k.id in (
    select p_kategori_id
    union
    select (deger->>'onceki_kategori_id')::uuid
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
    union
    select (deger->>'kategori_id')::uuid
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
  )
  order by k.id
  for key share;
  get diagnostics v_kilitlenen = row_count;
  if v_kilitlenen <> v_kategori_beklenen then
    raise exception 'Kategori veya urun listesi guncel degil' using errcode = '40001';
  end if;

  update public.kategoriler as k set
    slug = v_slug,
    sira = v_sira,
    ad_tr = v_ad_tr,
    ad_ar = v_ad_ar,
    aciklama_tr = v_aciklama_tr,
    aciklama_ar = v_aciklama_ar,
    gorsel_url = v_gorsel_url,
    aktif = v_aktif
  where k.id = p_kategori_id
    and k.slug is not distinct from p_orijinal_kategori->>'slug'
    and k.sira::text = p_orijinal_kategori->>'sira'
    and k.ad_tr is not distinct from p_orijinal_kategori->>'ad_tr'
    and k.ad_ar is not distinct from p_orijinal_kategori->>'ad_ar'
    and k.aciklama_tr is not distinct from p_orijinal_kategori->>'aciklama_tr'
    and k.aciklama_ar is not distinct from p_orijinal_kategori->>'aciklama_ar'
    and k.gorsel_url is not distinct from p_orijinal_kategori->>'gorsel_url'
    and k.aktif = (p_orijinal_kategori->>'aktif')::boolean;
  get diagnostics v_etkilenen = row_count;
  if v_etkilenen <> 1 then
    raise exception 'Kategori kaydi guncel degil' using errcode = '40001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
    left join public.urunler as u on u.id = (deger->>'id')::uuid
    where u.id is null
  ) then
    raise exception 'Kategori veya urun listesi guncel degil' using errcode = '40001';
  end if;

  with girdi as (
    select (deger->>'id')::uuid as id,
           (deger->>'onceki_kategori_id')::uuid as onceki_kategori_id,
           (deger->>'kategori_id')::uuid as kategori_id
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
  ), yazilan as (
    update public.urunler as u set kategori_id = g.kategori_id
    from girdi as g
    where u.id = g.id
      and u.kategori_id = g.onceki_kategori_id
    returning u.id
  )
  select count(*) into v_etkilenen from yazilan;

  if v_etkilenen <> v_beklenen then
    raise exception 'Urun listesi guncel degil' using errcode = '40001';
  end if;
  return v_etkilenen;
end;
$$;

revoke all on function public.admin_kategori_urunlerini_kaydet(uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_kategori_urunlerini_kaydet(uuid, jsonb, jsonb, jsonb)
  to authenticated;

-- Kategori, içindeki ürünler taşınmadan silinemez. Ürün tablosu kilidi aynı
-- anda yapılan atamaları bitirir veya engeller; böylece cascade hiçbir ürünü
-- beklenmedik biçimde silemez.
create or replace function public.admin_kategori_sil(p_kategori_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli' using errcode = '42501';
  end if;
  if p_kategori_id is null then
    raise exception 'Kategori kimligi gecersiz' using errcode = '22023';
  end if;

  -- Urun tablosunu once kilitlemek, INSERT/UPDATE ve kategori atama RPC'leriyle
  -- ayni sirayi kullanir. Dolayisiyla FK KEY SHARE beklerken ters kilitlenme
  -- olusmaz; lock sonrasi kontrol de urun kaybi olmadan atomik kalir.
  lock table public.urunler in share row exclusive mode;

  perform 1 from public.kategoriler where id = p_kategori_id for update;
  if not found then
    raise exception 'Kategori bulunamadi' using errcode = '40001';
  end if;

  if exists (select 1 from public.urunler where kategori_id = p_kategori_id) then
    raise exception 'Kategoride urun var' using errcode = '23503';
  end if;

  delete from public.kategoriler where id = p_kategori_id;
end;
$$;

revoke all on function public.admin_kategori_sil(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_kategori_sil(uuid)
  to authenticated;

-- ---------- Service-role atomik bakim islemleri ----------
create or replace function public.bakim_menu_yukle(
  p_menu jsonb,
  p_sifirla boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kategori_sayisi integer;
  v_urun_sayisi integer;
  v_cikarilabilir_sayisi integer;
  v_ekstra_sayisi integer;
  v_ayar_sayisi integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role gerekli' using errcode = '42501';
  end if;
  if p_sifirla is null
     or jsonb_typeof(p_menu) is distinct from 'object'
     or jsonb_typeof(p_menu->'kategoriler') is distinct from 'array'
     or jsonb_typeof(p_menu->'urunler') is distinct from 'array'
     or not (p_menu ? 'ayarlar')
     or jsonb_typeof(p_menu->'ayarlar') not in ('object','null') then
    raise exception 'Gecersiz menu payload bicimi' using errcode = '22023';
  end if;
  v_kategori_sayisi := jsonb_array_length(p_menu->'kategoriler');
  v_urun_sayisi := jsonb_array_length(p_menu->'urunler');
  if v_kategori_sayisi not between 1 and 500
     or v_urun_sayisi not between 1 and 2000 then
    raise exception 'Menu payload satir sayisi gecersiz' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_menu->'kategoriler') as k(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'slug') is distinct from 'string'
       or jsonb_typeof(deger->'sira') is distinct from 'number'
       or jsonb_typeof(deger->'ad_tr') is distinct from 'string'
       or jsonb_typeof(deger->'ad_ar') is distinct from 'string'
       or jsonb_typeof(deger->'aktif') is distinct from 'boolean'
       or (deger ? 'aciklama_tr' and jsonb_typeof(deger->'aciklama_tr') not in ('string','null'))
       or (deger ? 'aciklama_ar' and jsonb_typeof(deger->'aciklama_ar') not in ('string','null'))
       or (deger ? 'gorsel_url' and jsonb_typeof(deger->'gorsel_url') not in ('string','null'))
       or char_length(btrim(deger->>'slug')) not between 1 and 160
       or (deger->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or (deger->>'sira')::numeric <> trunc((deger->>'sira')::numeric)
       or (deger->>'sira')::numeric not between 0 and 100000
       or char_length(btrim(deger->>'ad_tr')) not between 1 and 200
       or char_length(btrim(deger->>'ad_ar')) not between 1 and 200
       or char_length(coalesce(deger->>'aciklama_tr', '')) > 2000
       or char_length(coalesce(deger->>'aciklama_ar', '')) > 2000
       or (nullif(btrim(coalesce(deger->>'gorsel_url', '')), '') is not null and
           (char_length(deger->>'gorsel_url') > 2048 or
            (deger->>'gorsel_url') !~ '^https://[^[:space:]]+$'))
  ) or (
    select count(distinct deger->>'slug') <> count(*)
    from jsonb_array_elements(p_menu->'kategoriler') as k(deger)
  ) then
    raise exception 'Kategori payload satirlari gecersiz' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_menu->'urunler') as u(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'kategori_slug') is distinct from 'string'
       or jsonb_typeof(deger->'slug') is distinct from 'string'
       or jsonb_typeof(deger->'sira') is distinct from 'number'
       or jsonb_typeof(deger->'ad_tr') is distinct from 'string'
       or jsonb_typeof(deger->'ad_ar') is distinct from 'string'
       or jsonb_typeof(deger->'fiyat_masa') is distinct from 'number'
       or jsonb_typeof(deger->'fiyat_paket') is distinct from 'number'
       or jsonb_typeof(deger->'alerjenler') is distinct from 'array'
       or jsonb_typeof(deger->'rozet') is distinct from 'string'
       or jsonb_typeof(deger->'stokta') is distinct from 'boolean'
       or jsonb_typeof(deger->'aktif') is distinct from 'boolean'
       or jsonb_typeof(deger->'cikarilabilirler') is distinct from 'array'
       or jsonb_typeof(deger->'ekstralar') is distinct from 'array'
       or (deger ? 'aciklama_tr' and jsonb_typeof(deger->'aciklama_tr') not in ('string','null'))
       or (deger ? 'aciklama_ar' and jsonb_typeof(deger->'aciklama_ar') not in ('string','null'))
       or (deger ? 'gorsel_url' and jsonb_typeof(deger->'gorsel_url') not in ('string','null'))
       or (deger ? 'gramaj' and jsonb_typeof(deger->'gramaj') not in ('string','null'))
       or (deger ? 'gramaj_ar' and jsonb_typeof(deger->'gramaj_ar') not in ('string','null'))
       or (deger ? 'kalori' and jsonb_typeof(deger->'kalori') not in ('number','null'))
  ) then
    raise exception 'Urun payload bicimi gecersiz' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_menu->'urunler') as u(deger)
    where char_length(btrim(deger->>'slug')) not between 1 and 160
       or (deger->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or char_length(btrim(deger->>'kategori_slug')) not between 1 and 160
       or (deger->>'sira')::numeric <> trunc((deger->>'sira')::numeric)
       or (deger->>'sira')::numeric not between 0 and 100000
       or char_length(btrim(deger->>'ad_tr')) not between 1 and 200
       or char_length(btrim(deger->>'ad_ar')) not between 1 and 200
       or char_length(coalesce(deger->>'aciklama_tr', '')) > 4000
       or char_length(coalesce(deger->>'aciklama_ar', '')) > 4000
       or char_length(coalesce(deger->>'gramaj', '')) > 500
       or char_length(coalesce(deger->>'gramaj_ar', '')) > 500
       or (deger->>'fiyat_masa')::numeric not between 0 and 99999999.99
       or (deger->>'fiyat_paket')::numeric not between 0 and 99999999.99
       or (deger->>'rozet') not in ('yok','cok_satan','yeni','acili','sefin_onerisi')
       or jsonb_array_length(deger->'alerjenler') > 32
       or jsonb_array_length(deger->'cikarilabilirler') > 100
       or jsonb_array_length(deger->'ekstralar') > 100
       or (jsonb_typeof(deger->'kalori') = 'number' and
           ((deger->>'kalori')::numeric <> trunc((deger->>'kalori')::numeric)
            or (deger->>'kalori')::numeric not between 0 and 100000))
       or (nullif(btrim(coalesce(deger->>'gorsel_url', '')), '') is not null and
           (char_length(deger->>'gorsel_url') > 2048 or
            (deger->>'gorsel_url') !~ '^https://[^[:space:]]+$'))
       or not exists (
         select 1 from jsonb_array_elements(p_menu->'kategoriler') as k(kat)
         where kat->>'slug' = deger->>'kategori_slug'
       )
  ) or (
    select count(distinct deger->>'slug') <> count(*)
    from jsonb_array_elements(p_menu->'urunler') as u(deger)
  ) then
    raise exception 'Urun payload alanlari gecersiz' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_menu->'urunler') as u(urun)
    cross join lateral jsonb_array_elements(urun->'alerjenler') as a(deger)
    where jsonb_typeof(deger) is distinct from 'string'
       or char_length(btrim(deger #>> '{}')) not between 1 and 80
  ) or exists (
    select 1
    from jsonb_array_elements(p_menu->'urunler') as u(urun)
    cross join lateral jsonb_array_elements(urun->'cikarilabilirler') as c(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'ad_tr') is distinct from 'string'
       or jsonb_typeof(deger->'ad_ar') is distinct from 'string'
       or char_length(btrim(deger->>'ad_tr')) not between 1 and 200
       or char_length(btrim(deger->>'ad_ar')) not between 1 and 200
  ) or exists (
    select 1
    from jsonb_array_elements(p_menu->'urunler') as u(urun)
    cross join lateral jsonb_array_elements(urun->'ekstralar') as e(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'ad_tr') is distinct from 'string'
       or jsonb_typeof(deger->'ad_ar') is distinct from 'string'
       or jsonb_typeof(deger->'fiyat') is distinct from 'number'
       or jsonb_typeof(deger->'stokta') is distinct from 'boolean'
       or char_length(btrim(deger->>'ad_tr')) not between 1 and 200
       or char_length(btrim(deger->>'ad_ar')) not between 1 and 200
       or (deger->>'fiyat')::numeric not between 0 and 99999999.99
  ) then
    raise exception 'Menu alt satirlari gecersiz' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_menu->'urunler') as u(urun)
    cross join lateral jsonb_array_elements(urun->'cikarilabilirler') as c(deger)
    group by urun->>'slug', lower(btrim(deger->>'ad_tr'))
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_menu->'urunler') as u(urun)
    cross join lateral jsonb_array_elements(urun->'ekstralar') as e(deger)
    group by urun->>'slug', lower(btrim(deger->>'ad_tr'))
    having count(*) > 1
  ) then
    raise exception 'Menu alt satir adlari tekrar ediyor' using errcode = '22023';
  end if;
  if jsonb_typeof(p_menu->'ayarlar') = 'object' and (
       not coalesce(jsonb_typeof(p_menu#>'{ayarlar,restoran_ad_tr}') in ('string','null'), false)
       or not coalesce(jsonb_typeof(p_menu#>'{ayarlar,restoran_ad_ar}') in ('string','null'), false)
       or not coalesce(jsonb_typeof(p_menu#>'{ayarlar,whatsapp_numarasi}') in ('string','null'), false)
       or not coalesce(jsonb_typeof(p_menu#>'{ayarlar,telefon}') in ('string','null'), false)
       or not coalesce(jsonb_typeof(p_menu#>'{ayarlar,harita_linki}') in ('string','null'), false)
       or not coalesce(jsonb_typeof(p_menu#>'{ayarlar,instagram}') in ('string','null'), false)
       or not coalesce(jsonb_typeof(p_menu#>'{ayarlar,tiktok}') in ('string','null'), false)
       or char_length(coalesce(p_menu#>>'{ayarlar,restoran_ad_tr}', '')) > 200
       or char_length(coalesce(p_menu#>>'{ayarlar,restoran_ad_ar}', '')) > 200
       or (nullif(btrim(coalesce(p_menu#>>'{ayarlar,whatsapp_numarasi}', '')), '') is not null and
           (char_length(p_menu#>>'{ayarlar,whatsapp_numarasi}') not between 10 and 15 or
            (p_menu#>>'{ayarlar,whatsapp_numarasi}') !~ '^[0-9]+$'))
       or char_length(coalesce(p_menu#>>'{ayarlar,telefon}', '')) > 32
       or (nullif(btrim(coalesce(p_menu#>>'{ayarlar,harita_linki}', '')), '') is not null and
           (char_length(p_menu#>>'{ayarlar,harita_linki}') > 2048 or
            (p_menu#>>'{ayarlar,harita_linki}') !~ '^https://[^[:space:]]+$'))
       or (nullif(btrim(coalesce(p_menu#>>'{ayarlar,instagram}', '')), '') is not null and
           (char_length(p_menu#>>'{ayarlar,instagram}') > 2048 or
            (p_menu#>>'{ayarlar,instagram}') !~ '^https://[^[:space:]]+$'))
       or (nullif(btrim(coalesce(p_menu#>>'{ayarlar,tiktok}', '')), '') is not null and
           (char_length(p_menu#>>'{ayarlar,tiktok}') > 2048 or
            (p_menu#>>'{ayarlar,tiktok}') !~ '^https://[^[:space:]]+$'))
     ) then
    raise exception 'Menu ayar payload satiri gecersiz' using errcode = '22023';
  end if;

  lock table public.kategoriler, public.urunler, public.cikarilabilirler,
    public.ekstralar, public.ayarlar in share row exclusive mode;
  if p_sifirla then
    -- Acik yikici mod: eski kimlikler ve operasyonel stok/yayin durumu
    -- kasitli olarak atilir, payload sifirdan kurulur.
    delete from public.urunler;
    delete from public.kategoriler;
  end if;

  insert into public.kategoriler (
    slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar, gorsel_url, aktif
  )
  select btrim(k->>'slug'), (k->>'sira')::integer, btrim(k->>'ad_tr'),
         btrim(k->>'ad_ar'), nullif(btrim(coalesce(k->>'aciklama_tr','')), ''),
         nullif(btrim(coalesce(k->>'aciklama_ar','')), ''),
         nullif(btrim(coalesce(k->>'gorsel_url','')), ''), (k->>'aktif')::boolean
  from jsonb_array_elements(p_menu->'kategoriler') as kaynak(k)
  -- Normal mod mevcut UUID, icerik ve aktif durumuna dokunmaz.
  on conflict (slug) do nothing;
  get diagnostics v_kategori_sayisi = row_count;

  insert into public.urunler (
    kategori_id, slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar,
    gorsel_url, fiyat_masa, fiyat_paket, gramaj, gramaj_ar, kalori,
    alerjenler, rozet, stokta, aktif
  )
  select k.id, btrim(u->>'slug'), (u->>'sira')::integer, btrim(u->>'ad_tr'),
         btrim(u->>'ad_ar'), nullif(btrim(coalesce(u->>'aciklama_tr','')), ''),
         nullif(btrim(coalesce(u->>'aciklama_ar','')), ''),
         nullif(btrim(coalesce(u->>'gorsel_url','')), ''),
         round((u->>'fiyat_masa')::numeric, 2),
         round((u->>'fiyat_paket')::numeric, 2),
         nullif(btrim(coalesce(u->>'gramaj','')), ''),
         nullif(btrim(coalesce(u->>'gramaj_ar','')), ''),
         case when jsonb_typeof(u->'kalori') = 'number' then (u->>'kalori')::integer end,
         array(select btrim(x) from jsonb_array_elements_text(u->'alerjenler') as a(x)),
         u->>'rozet', (u->>'stokta')::boolean, (u->>'aktif')::boolean
  from jsonb_array_elements(p_menu->'urunler') as kaynak(u)
  join public.kategoriler as k on k.slug = u->>'kategori_slug'
  -- Normal mod mevcut urunun admin tarafindan degistirilmis alanlarini,
  -- stok/yayin durumunu ve UUID'sini korur.
  on conflict (slug) do nothing;
  get diagnostics v_urun_sayisi = row_count;
  if exists (
    select 1 from jsonb_array_elements(p_menu->'urunler') as p(deger)
    left join public.urunler as u on u.slug = p.deger->>'slug'
    where u.id is null
  ) then
    raise exception 'Menu urun-kategori eslesmesi eksik' using errcode = '22023';
  end if;

  insert into public.cikarilabilirler (urun_id, sira, ad_tr, ad_ar)
  select dbu.id, c.sira::integer, btrim(c.deger->>'ad_tr'), btrim(c.deger->>'ad_ar')
  from jsonb_array_elements(p_menu->'urunler') as p(urun)
  join public.urunler as dbu on dbu.slug = p.urun->>'slug'
  cross join lateral jsonb_array_elements(p.urun->'cikarilabilirler')
    with ordinality as c(deger, sira)
  where p_sifirla or not exists (
    select 1 from public.cikarilabilirler as mevcut
    where mevcut.urun_id = dbu.id
  );
  get diagnostics v_cikarilabilir_sayisi = row_count;

  insert into public.ekstralar (urun_id, sira, ad_tr, ad_ar, fiyat, stokta)
  select dbu.id, e.sira::integer, btrim(e.deger->>'ad_tr'),
         btrim(e.deger->>'ad_ar'), round((e.deger->>'fiyat')::numeric, 2),
         (e.deger->>'stokta')::boolean
  from jsonb_array_elements(p_menu->'urunler') as p(urun)
  join public.urunler as dbu on dbu.slug = p.urun->>'slug'
  cross join lateral jsonb_array_elements(p.urun->'ekstralar')
    with ordinality as e(deger, sira)
  where p_sifirla or not exists (
    select 1 from public.ekstralar as mevcut
    where mevcut.urun_id = dbu.id
  );
  get diagnostics v_ekstra_sayisi = row_count;

  -- Ayar kimlik bilgileri de yalniz acik sifirlama modunda degistirilir.
  if p_sifirla and jsonb_typeof(p_menu->'ayarlar') = 'object' then
    update public.ayarlar set
      restoran_ad_tr = nullif(btrim(coalesce(p_menu#>>'{ayarlar,restoran_ad_tr}','')), ''),
      restoran_ad_ar = nullif(btrim(coalesce(p_menu#>>'{ayarlar,restoran_ad_ar}','')), ''),
      whatsapp_numarasi = nullif(btrim(coalesce(p_menu#>>'{ayarlar,whatsapp_numarasi}','')), ''),
      telefon = nullif(btrim(coalesce(p_menu#>>'{ayarlar,telefon}','')), ''),
      harita_linki = nullif(btrim(coalesce(p_menu#>>'{ayarlar,harita_linki}','')), ''),
      instagram = nullif(btrim(coalesce(p_menu#>>'{ayarlar,instagram}','')), ''),
      tiktok = nullif(btrim(coalesce(p_menu#>>'{ayarlar,tiktok}','')), '')
    where id = 1;
    get diagnostics v_ayar_sayisi = row_count;
    if v_ayar_sayisi <> 1 then
      raise exception 'Ayarlar satiri bulunamadi' using errcode = '22023';
    end if;
  end if;

  return jsonb_build_object(
    'kategori_sayisi', v_kategori_sayisi,
    'urun_sayisi', v_urun_sayisi,
    'cikarilabilir_sayisi', v_cikarilabilir_sayisi,
    'ekstra_sayisi', v_ekstra_sayisi,
    'mod', case when p_sifirla then 'sifirla' else 'eksikleri_tamamla' end
  );
end;
$$;

create or replace function public.bakim_gramaj_ar_guncelle(p_guncellemeler jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_beklenen integer;
  v_etkilenen integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role gerekli' using errcode = '42501';
  end if;
  if jsonb_typeof(p_guncellemeler) is distinct from 'array' then
    raise exception 'Gecersiz gramaj payload bicimi' using errcode = '22023';
  end if;
  v_beklenen := jsonb_array_length(p_guncellemeler);
  if v_beklenen not between 0 and 500 or exists (
    select 1 from jsonb_array_elements(p_guncellemeler) as g(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'slug') is distinct from 'string'
       or jsonb_typeof(deger->'gramaj_ar') is distinct from 'string'
       or (deger->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or char_length(btrim(deger->>'gramaj_ar')) not between 1 and 500
  ) or (
    select count(distinct deger->>'slug') <> count(*)
    from jsonb_array_elements(p_guncellemeler) as g(deger)
  ) then
    raise exception 'Gramaj payload satirlari gecersiz' using errcode = '22023';
  end if;

  with girdi as (
    select deger->>'slug' as slug, btrim(deger->>'gramaj_ar') as gramaj_ar
    from jsonb_array_elements(p_guncellemeler) as g(deger)
  ), yazilan as (
    update public.urunler as u set gramaj_ar = g.gramaj_ar
    from girdi as g where u.slug = g.slug returning u.id
  )
  select count(*) into v_etkilenen from yazilan;
  if v_etkilenen <> v_beklenen then
    raise exception 'Gramaj urun listesi DB ile eslesmiyor' using errcode = '40001';
  end if;
  return v_etkilenen;
end;
$$;

create or replace function public.bakim_temizlik(
  p_sluglar jsonb,
  p_test_siparisleri jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slug_sayisi integer;
  v_siparis_sayisi integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role gerekli' using errcode = '42501';
  end if;
  if jsonb_typeof(p_sluglar) is distinct from 'array'
     or jsonb_typeof(p_test_siparisleri) is distinct from 'array'
     or jsonb_array_length(p_sluglar) > 100
     or jsonb_array_length(p_test_siparisleri) > 100 then
    raise exception 'Gecersiz temizlik payload bicimi' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_sluglar) as s(deger)
    where jsonb_typeof(deger) is distinct from 'object'
       or jsonb_typeof(deger->'eski') is distinct from 'string'
       or jsonb_typeof(deger->'yeni') is distinct from 'string'
       or (deger->>'eski') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or (deger->>'yeni') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ) or (
    select count(distinct deger->>'eski') <> count(*)
        or count(distinct deger->>'yeni') <> count(*)
    from jsonb_array_elements(p_sluglar) as s(deger)
  ) or exists (
    select 1 from jsonb_array_elements(p_test_siparisleri) as s(deger)
    where jsonb_typeof(deger) is distinct from 'string'
       or char_length(btrim(deger #>> '{}')) not between 1 and 64
  ) then
    raise exception 'Temizlik payload satirlari gecersiz' using errcode = '22023';
  end if;

  with girdi as (
    select deger->>'eski' as eski, deger->>'yeni' as yeni
    from jsonb_array_elements(p_sluglar) as s(deger)
  ), yazilan as (
    update public.urunler as u set slug = g.yeni
    from girdi as g where u.slug = g.eski returning u.id
  )
  select count(*) into v_slug_sayisi from yazilan;

  with silinen as (
    delete from public.siparisler as s
    where s.siparis_no in (
      select btrim(deger) from jsonb_array_elements_text(p_test_siparisleri) as x(deger)
    )
    returning s.id
  )
  select count(*) into v_siparis_sayisi from silinen;

  return jsonb_build_object(
    'slug_sayisi', v_slug_sayisi,
    'siparis_sayisi', v_siparis_sayisi
  );
end;
$$;

revoke all on function public.bakim_menu_yukle(jsonb, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.bakim_gramaj_ar_guncelle(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.bakim_temizlik(jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.bakim_menu_yukle(jsonb, boolean)
  to service_role;
grant execute on function public.bakim_gramaj_ar_guncelle(jsonb)
  to service_role;
grant execute on function public.bakim_temizlik(jsonb, jsonb)
  to service_role;
