begin;

-- =====================================================================
-- Phase 4A: admin yazmalarini atomik RPC'lere tasir, yeni yazilar icin
-- muhafazakar veri sinirlari ve Storage dosya kurallari ekler.
-- CHECK ... NOT VALID eski satirlari taramaz; migration sonrasi tum yeni
-- insert/update islemlerinde yine de zorunlu olarak uygulanir.
-- =====================================================================

-- Eski kurulumlarda bu migration'in kullandigi bazi kolonlar henuz yoktu.
-- Constraint ve RPC tanimlarindan once idempotent olarak tamamlanir; boylece
-- sema.sql'i bastan calistirmadan da migration zinciri guvenle ilerler.
alter table public.urunler add column if not exists gramaj_ar text;
alter table public.ayarlar add column if not exists facebook text;
alter table public.ayarlar add column if not exists hero_baslik_tr text;
alter table public.ayarlar add column if not exists hero_baslik_ar text;
alter table public.ayarlar add column if not exists hero_alt_tr text;
alter table public.ayarlar add column if not exists hero_alt_ar text;
alter table public.ayarlar add column if not exists hakkimizda_baslik_tr text;
alter table public.ayarlar add column if not exists hakkimizda_baslik_ar text;
alter table public.ayarlar add column if not exists hakkimizda_metin_tr text;
alter table public.ayarlar add column if not exists hakkimizda_metin_ar text;
alter table public.siparisler add column if not exists siparis_turu text not null default 'paket';
alter table public.siparisler add column if not exists masa_no text;
alter table public.siparisler add column if not exists idempotency_anahtari uuid;
alter table public.siparisler add column if not exists istek_hash text;
alter table public.siparisler add column if not exists idempotency_yaniti jsonb;

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

-- ---------- Storage sunucu tarafli dosya sinirlari ----------
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'menu-gorseller', 'menu-gorseller', true, 8388608,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
