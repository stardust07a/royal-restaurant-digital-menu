begin;

-- Paket menusu ve masa QR menusu birbirinden bagimsiz yayinlanabilsin.
alter table public.urunler
  add column if not exists masa_aktif boolean not null default true;

comment on column public.urunler.masa_aktif is
  'Urunun yalnizca masa QR menusunde gorunup gorunmeyecegi';

create or replace function public.admin_urun_masa_durumunu_ayarla(
  p_urun_slug text,
  p_masa_aktif boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' or not public.is_admin() then
    raise exception 'Admin yetkisi gerekli' using errcode = '42501';
  end if;
  if p_urun_slug is null or p_masa_aktif is null then
    raise exception 'Gecersiz masa menu durumu' using errcode = '22023';
  end if;

  update public.urunler
  set masa_aktif = p_masa_aktif
  where slug = p_urun_slug;

  if not found then
    raise exception 'Urun bulunamadi' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.admin_urun_masa_durumunu_ayarla(text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_urun_masa_durumunu_ayarla(text, boolean)
  to authenticated;

create or replace function public.admin_urun_ve_masa_kaydet(
  p_urun_id uuid,
  p_urun jsonb,
  p_cikarilabilirler jsonb,
  p_ekstralar jsonb,
  p_masa_aktif boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_masa_aktif is null then
    raise exception 'Gecersiz masa menu durumu' using errcode = '22023';
  end if;
  v_id := public.admin_urun_kaydet(
    p_urun_id, p_urun, p_cikarilabilirler, p_ekstralar
  );
  update public.urunler set masa_aktif = p_masa_aktif where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.admin_urun_ve_masa_kaydet(uuid, jsonb, jsonb, jsonb, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_urun_ve_masa_kaydet(uuid, jsonb, jsonb, jsonb, boolean)
  to authenticated;

-- Fiyati olmayanlar, kilo ile satilanlar ve butun mangal tavuk masa
-- siparisine uygun degil. Paket menusunde gorunmeye devam ederler.
update public.urunler
set masa_aktif = false
where fiyat_masa = 0
   or lower(coalesce(ad_tr, '')) ~ '(^|[^[:alnum:]])(1|bir)[[:space:]]*(kg|kilo)([^[:alnum:]]|$)'
   or lower(coalesce(gramaj, '')) ~ '(^|[^[:alnum:]])1[[:space:]]*kg([^[:alnum:]]|$)'
   or slug = 'butun-mangal-tavuk';

-- Gramaj yalnizca butun/yarim tavuk ve kilo/yarim kilo urunlerinde kalsin.
update public.urunler
set gramaj = null,
    gramaj_ar = null
where not (
  lower(coalesce(ad_tr, '')) ~ '(butun|bütün|yarim|yarım|kilo|kg)'
  or coalesce(ad_ar, '') ~ '(فروج|نصف|كيلو)'
  or slug in ('kizarmis-tavuk-pilav', 'mangal-tavuk-pilav')
);

-- Tavuk kategorisini yalnizca gercek tavuk urunlerinden yeniden kur.
with tavuk as (
  select id from public.kategoriler where slug = 'tavuk'
), izinli(slug, sira) as (
  values
    ('butun-broasted', 10),
    ('kilo-sis-tavuk', 20),
    ('kilo-tavuk-kebap', 30),
    ('aile-boyu-mansaf', 40),
    ('baharatli-durum', 50),
    ('baharatli-burger', 60),
    ('baharatli-menu', 70),
    ('bir-kilo-izgara-kanat', 80),
    ('bir-kilo-sis-tavuk', 90),
    ('bir-kilo-tavuk-kebap', 100),
    ('butun-mangal-tavuk', 110),
    ('crispy-burger', 120),
    ('crispy-durum', 130),
    ('crispy-menu', 140),
    ('citir-tavuk-menu', 150),
    ('duble-kebap-menu', 160),
    ('duble-kanat-menu', 170),
    ('duble-sis-menu', 180),
    ('duble-zinger-sandvic', 190),
    ('peynirli-zincer', 200),
    ('izgara-kanat-porsiyon', 210),
    ('kanat-menu', 220),
    ('kebap-sandvic', 230),
    ('kebap-menu', 240),
    ('kizarmis-tavuk', 250),
    ('kizarmis-tavuk-pilav', 260),
    ('mangal-tavuk-pilav', 270),
    ('sis-tavuk-sandvic', 280),
    ('sis-tavuk-menu', 290),
    ('sis-tavuk-pilav', 300),
    ('yarim-kilo-sis-tavuk', 310),
    ('yarim-kilo-tavuk-kebap', 320),
    ('yarim-tavuk', 330),
    ('yarim-mangal-tavuk', 340),
    ('yarim-mangal-tavuk-mendi-pilav', 350),
    ('zincer-burger', 360),
    ('zincer-durum', 370),
    ('zincer-menu', 380)
)
delete from public.urun_kategorileri as bag
using tavuk
where bag.kategori_id = tavuk.id
  and not exists (
    select 1
    from izinli
    join public.urunler as u on u.slug = izinli.slug
    where u.id = bag.urun_id
  );

with tavuk as (
  select id from public.kategoriler where slug = 'tavuk'
), izinli(slug, sira) as (
  values
    ('butun-broasted', 10), ('kilo-sis-tavuk', 20),
    ('kilo-tavuk-kebap', 30), ('aile-boyu-mansaf', 40),
    ('baharatli-durum', 50), ('baharatli-burger', 60),
    ('baharatli-menu', 70), ('bir-kilo-izgara-kanat', 80),
    ('bir-kilo-sis-tavuk', 90), ('bir-kilo-tavuk-kebap', 100),
    ('butun-mangal-tavuk', 110), ('crispy-burger', 120),
    ('crispy-durum', 130), ('crispy-menu', 140),
    ('citir-tavuk-menu', 150), ('duble-kebap-menu', 160),
    ('duble-kanat-menu', 170), ('duble-sis-menu', 180),
    ('duble-zinger-sandvic', 190), ('peynirli-zincer', 200),
    ('izgara-kanat-porsiyon', 210), ('kanat-menu', 220),
    ('kebap-sandvic', 230), ('kebap-menu', 240),
    ('kizarmis-tavuk', 250), ('kizarmis-tavuk-pilav', 260),
    ('mangal-tavuk-pilav', 270), ('sis-tavuk-sandvic', 280),
    ('sis-tavuk-menu', 290), ('sis-tavuk-pilav', 300),
    ('yarim-kilo-sis-tavuk', 310), ('yarim-kilo-tavuk-kebap', 320),
    ('yarim-tavuk', 330), ('yarim-mangal-tavuk', 340),
    ('yarim-mangal-tavuk-mendi-pilav', 350), ('zincer-burger', 360),
    ('zincer-durum', 370), ('zincer-menu', 380)
)
insert into public.urun_kategorileri (kategori_id, urun_id, sira)
select tavuk.id, u.id, izinli.sira
from tavuk
join izinli on true
join public.urunler as u on u.slug = izinli.slug
on conflict (kategori_id, urun_id) do update set sira = excluded.sira;

-- Mevcut bir urunden secilen ekstralar o urunun adini, paket fiyatini ve
-- stok durumunu otomatik izlesin.
alter table public.ekstralar
  add column if not exists kaynak_urun_id uuid references public.urunler(id) on delete set null;

create index if not exists ekstralar_kaynak_urun_idx
  on public.ekstralar(kaynak_urun_id);

create or replace function public.ekstra_kaynak_urununu_uygula()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_kaynak public.urunler%rowtype;
begin
  if new.kaynak_urun_id is null then
    select u.* into v_kaynak
    from public.urunler as u
    where u.id <> new.urun_id
      and (
        lower(btrim(u.ad_tr)) = lower(btrim(new.ad_tr))
        or btrim(u.ad_ar) = btrim(new.ad_ar)
      )
    order by u.created_at, u.id
    limit 1;

    if found then
      new.kaynak_urun_id := v_kaynak.id;
    end if;
  else
    select u.* into v_kaynak
    from public.urunler as u
    where u.id = new.kaynak_urun_id and u.id <> new.urun_id;
  end if;

  if v_kaynak.id is not null then
    new.ad_tr := v_kaynak.ad_tr;
    new.ad_ar := v_kaynak.ad_ar;
    new.fiyat := v_kaynak.fiyat_paket;
    new.stokta := v_kaynak.stokta and v_kaynak.aktif;
  end if;
  return new;
end;
$$;

drop trigger if exists ekstra_kaynak_urununu_uygula_tetikleyici on public.ekstralar;
create trigger ekstra_kaynak_urununu_uygula_tetikleyici
before insert or update of ad_tr, ad_ar, fiyat, stokta, kaynak_urun_id
on public.ekstralar
for each row execute function public.ekstra_kaynak_urununu_uygula();

create or replace function public.urun_bagli_ekstralarini_guncelle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.ekstralar
  set ad_tr = new.ad_tr,
      ad_ar = new.ad_ar,
      fiyat = new.fiyat_paket,
      stokta = new.stokta and new.aktif
  where kaynak_urun_id = new.id;
  return new;
end;
$$;

drop trigger if exists urun_bagli_ekstralarini_guncelle_tetikleyici on public.urunler;
create trigger urun_bagli_ekstralarini_guncelle_tetikleyici
after update of ad_tr, ad_ar, fiyat_paket, stokta, aktif
on public.urunler
for each row execute function public.urun_bagli_ekstralarini_guncelle();

update public.ekstralar as e
set kaynak_urun_id = (
  select u.id
  from public.urunler as u
  where u.id <> e.urun_id
    and (
      lower(btrim(u.ad_tr)) = lower(btrim(e.ad_tr))
      or btrim(u.ad_ar) = btrim(e.ad_ar)
    )
  order by u.created_at, u.id
  limit 1
)
where e.kaynak_urun_id is null
  and exists (
    select 1
    from public.urunler as u
    where u.id <> e.urun_id
      and (
        lower(btrim(u.ad_tr)) = lower(btrim(e.ad_tr))
        or btrim(u.ad_ar) = btrim(e.ad_ar)
      )
  );

commit;
