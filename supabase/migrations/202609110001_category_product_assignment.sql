begin;

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

-- Kategori ayrintisindan yapilan kategori ve urun atamalarini tek transaction
-- icinde kaydeder. Her urunun kategori_id degeri dolu kalir; istemci sadece
-- hedef kategorileri gonderir.
drop function if exists public.admin_kategori_urunlerini_kaydet(uuid, jsonb, jsonb);

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

notify pgrst, 'reload schema';

commit;
