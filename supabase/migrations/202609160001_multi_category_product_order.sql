begin;

-- Bir urun birden fazla kategoride yer alabilir. Sira, urunun kendisinde
-- degil kategori-urun baginda tutulur; boylece ayni urun her kategoride
-- farkli bir konumda gosterilebilir.
create table if not exists public.urun_kategorileri (
  kategori_id uuid not null references public.kategoriler(id) on delete cascade,
  urun_id uuid not null references public.urunler(id) on delete cascade,
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (kategori_id, urun_id),
  constraint urun_kategorileri_sira_gecerli check (sira between 0 and 100000)
);

create index if not exists urun_kategorileri_kategori_sira_idx
  on public.urun_kategorileri(kategori_id, sira, urun_id);
create index if not exists urun_kategorileri_urun_idx
  on public.urun_kategorileri(urun_id, kategori_id);

-- Mevcut tekil kategori baglarini kaybetmeden ilk uyelikleri kur.
insert into public.urun_kategorileri (kategori_id, urun_id, sira)
select u.kategori_id, u.id, u.sira
from public.urunler as u
where u.kategori_id is not null
on conflict (kategori_id, urun_id) do nothing;

-- Yeni urun veya ana kategori degisikligi, ana kategori uyeligini garanti eder.
create or replace function public.urun_ana_kategorisini_esle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.kategori_id is not null then
    insert into public.urun_kategorileri (kategori_id, urun_id, sira)
    values (new.kategori_id, new.id, new.sira)
    on conflict (kategori_id, urun_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists urun_ana_kategorisini_esle_tetikleyici on public.urunler;
create trigger urun_ana_kategorisini_esle_tetikleyici
after insert or update of kategori_id on public.urunler
for each row execute function public.urun_ana_kategorisini_esle();

alter table public.urun_kategorileri enable row level security;
drop policy if exists "menu_herkes_okur" on public.urun_kategorileri;
create policy "menu_herkes_okur" on public.urun_kategorileri
  for select using (true);
drop policy if exists "menu_admin_yazar" on public.urun_kategorileri;
create policy "menu_admin_yazar" on public.urun_kategorileri
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.urun_kategorileri to anon, authenticated;
grant insert, update, delete on public.urun_kategorileri to authenticated;
grant all on public.urun_kategorileri to service_role;

-- Kategori bilgisi, uyelikler ve kategoriye ozel siralar tek transaction'da.
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
     or not (p_orijinal_kategori ? 'gorsel_url') then
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
       or jsonb_typeof(deger->'sira') is distinct from 'number'
       or (deger->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or (deger->>'sira')::numeric <> trunc((deger->>'sira')::numeric)
       or (deger->>'sira')::numeric not between 0 and 100000
  ) or (
    select count(distinct deger->>'id') <> count(*)
    from jsonb_array_elements(p_urun_kategorileri) as g(deger)
  ) then
    raise exception 'Urun kategori satirlari gecersiz' using errcode = '22023';
  end if;

  lock table public.urunler, public.urun_kategorileri in share row exclusive mode;

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

  if (
    select count(*)
    from public.urunler as u
    join jsonb_array_elements(p_urun_kategorileri) as g(deger)
      on u.id = (g.deger->>'id')::uuid
  ) <> v_beklenen then
    raise exception 'Urun listesi guncel degil' using errcode = '40001';
  end if;

  -- Secimden cikarilan bir urun kategorisiz kalamaz.
  if exists (
    select 1
    from public.urun_kategorileri as mevcut
    where mevcut.kategori_id = p_kategori_id
      and not exists (
        select 1 from jsonb_array_elements(p_urun_kategorileri) as g(deger)
        where (g.deger->>'id')::uuid = mevcut.urun_id
      )
      and not exists (
        select 1 from public.urun_kategorileri as diger
        where diger.urun_id = mevcut.urun_id
          and diger.kategori_id <> p_kategori_id
      )
  ) then
    raise exception 'Urun en az bir kategoride olmali' using errcode = '23503';
  end if;

  -- Ana kategorisi kaldirilan urunun ana kategorisini kalan ilk uyelige tasi.
  with kaldirilan as (
    select mevcut.urun_id
    from public.urun_kategorileri as mevcut
    where mevcut.kategori_id = p_kategori_id
      and not exists (
        select 1 from jsonb_array_elements(p_urun_kategorileri) as g(deger)
        where (g.deger->>'id')::uuid = mevcut.urun_id
      )
  ), yedek as (
    select distinct on (uk.urun_id) uk.urun_id, uk.kategori_id
    from public.urun_kategorileri as uk
    join public.kategoriler as k on k.id = uk.kategori_id
    join kaldirilan as x on x.urun_id = uk.urun_id
    where uk.kategori_id <> p_kategori_id
    order by uk.urun_id, k.sira, uk.sira, uk.kategori_id
  )
  update public.urunler as u
  set kategori_id = y.kategori_id
  from yedek as y
  where u.id = y.urun_id and u.kategori_id = p_kategori_id;

  delete from public.urun_kategorileri as mevcut
  where mevcut.kategori_id = p_kategori_id
    and not exists (
      select 1 from jsonb_array_elements(p_urun_kategorileri) as g(deger)
      where (g.deger->>'id')::uuid = mevcut.urun_id
    );

  insert into public.urun_kategorileri (kategori_id, urun_id, sira)
  select p_kategori_id, (g.deger->>'id')::uuid, (g.deger->>'sira')::integer
  from jsonb_array_elements(p_urun_kategorileri) as g(deger)
  on conflict (kategori_id, urun_id) do update set sira = excluded.sira;

  return v_beklenen;
end;
$$;

revoke all on function public.admin_kategori_urunlerini_kaydet(uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_kategori_urunlerini_kaydet(uuid, jsonb, jsonb, jsonb)
  to authenticated;

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

  lock table public.urunler, public.urun_kategorileri in share row exclusive mode;
  perform 1 from public.kategoriler where id = p_kategori_id for update;
  if not found then
    raise exception 'Kategori bulunamadi' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.urun_kategorileri where kategori_id = p_kategori_id
  ) then
    raise exception 'Kategoride urun var' using errcode = '23503';
  end if;
  delete from public.kategoriler where id = p_kategori_id;
end;
$$;

revoke all on function public.admin_kategori_sil(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_kategori_sil(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
