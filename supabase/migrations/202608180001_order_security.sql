begin;

-- ON KOSUL: auth.users listesi denetlenmeli, public signup kapatilmali ve
-- beklenmeyen hesaplar silinmelidir. Migration aninda kalan TUM auth
-- kullanicilari mevcut erisimi korumak icin admin yapilir; sonraki hesaplar
-- otomatik eklenmez.
create temporary table order_security_migration_durumu (
  admin_tablosu_ilk_kez boolean not null
) on commit drop;
insert into order_security_migration_durumu (admin_tablosu_ilk_kez)
values (to_regclass('public.admin_kullanicilar') is null);

create table if not exists public.admin_kullanicilar (
  kullanici_id uuid primary key references auth.users(id) on delete cascade,
  eposta text,
  created_at timestamptz not null default now()
);

insert into public.admin_kullanicilar (kullanici_id, eposta)
select id, email from auth.users
where (select admin_tablosu_ilk_kez from order_security_migration_durumu)
on conflict (kullanici_id) do update set eposta = excluded.eposta;

alter table public.admin_kullanicilar enable row level security;
revoke all on table public.admin_kullanicilar from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_kullanicilar
    where kullanici_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Idempotency: eski siparisler null kalabilir; yeni sunucu akisi uc alani da yazar.
alter table public.siparisler add column if not exists siparis_turu text not null default 'paket';
alter table public.siparisler add column if not exists masa_no text;
alter table public.siparisler add column if not exists idempotency_anahtari uuid;
alter table public.siparisler add column if not exists istek_hash text;
alter table public.siparisler add column if not exists idempotency_yaniti jsonb;
alter table public.siparisler drop column if exists whatsapp_acildi;

create unique index if not exists siparisler_idempotency_idx
  on public.siparisler (idempotency_anahtari)
  where idempotency_anahtari is not null;

do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.siparisler'::regclass and conname = 'siparisler_istek_hash_gecerli') then
alter table public.siparisler add constraint siparisler_istek_hash_gecerli
  check (istek_hash is null or istek_hash ~ '^[0-9a-f]{64}$') not valid;
end if;
end $$;
do $$ begin
if not exists (select 1 from pg_constraint where conrelid = 'public.siparisler'::regclass and conname = 'siparisler_idempotency_tutarli') then
alter table public.siparisler add constraint siparisler_idempotency_tutarli
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
alter table public.siparisler add constraint siparisler_yeni_no_bicimi
  check (siparis_no ~ '^R-[0-9]{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$') not valid;
end if;
end $$;

-- Service-role disinda okunamayan, ham IP/telefon icermeyen atomik sayac.
create table if not exists public.siparis_hiz_sinirlari (
  anahtar_hash text primary key check (anahtar_hash ~ '^[0-9a-f]{64}$'),
  pencere_baslangici timestamptz not null,
  istek_sayisi integer not null check (istek_sayisi > 0),
  updated_at timestamptz not null default now()
);
create index if not exists siparis_hiz_sinirlari_updated_idx
  on public.siparis_hiz_sinirlari(updated_at);

alter table public.siparis_hiz_sinirlari enable row level security;
revoke all on table public.siparis_hiz_sinirlari from anon, authenticated;

create or replace function public.siparis_hiz_siniri_kontrol(
  p_anahtar_hash text,
  p_limit integer,
  p_pencere_saniye integer
)
returns boolean
language plpgsql
security definer
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

  -- Indeksli ve sinirli firsatci temizlik: devam eden trafikte tablo kalici
  -- olarak buyumez, tek cagri da uzun bir temizlik isi yapmaz.
  delete from public.siparis_hiz_sinirlari
  where anahtar_hash in (
    select anahtar_hash
    from public.siparis_hiz_sinirlari
    where updated_at < v_simdi - make_interval(
      secs => greatest(p_pencere_saniye * 6, 86400)
    )
    order by updated_at
    limit 25
  );

  insert into public.siparis_hiz_sinirlari as mevcut (
    anahtar_hash, pencere_baslangici, istek_sayisi, updated_at
  ) values (p_anahtar_hash, v_simdi, 1, v_simdi)
  on conflict (anahtar_hash) do update set
    pencere_baslangici = case
      when mevcut.pencere_baslangici <= v_simdi - make_interval(secs => p_pencere_saniye)
        then v_simdi
      else mevcut.pencere_baslangici
    end,
    istek_sayisi = case
      when mevcut.pencere_baslangici <= v_simdi - make_interval(secs => p_pencere_saniye)
        then 1
      else mevcut.istek_sayisi + 1
    end,
    updated_at = v_simdi
  returning istek_sayisi <= p_limit into v_izin;

  return v_izin;
end;
$$;

revoke all on function public.siparis_hiz_siniri_kontrol(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.siparis_hiz_siniri_kontrol(text, integer, integer)
  to service_role;

-- Eski genis authenticated ve anonim siparis politikalarini kaldir.
drop policy if exists "menu_admin_yazar" on public.kategoriler;
drop policy if exists "menu_admin_yazar" on public.urunler;
drop policy if exists "menu_admin_yazar" on public.cikarilabilirler;
drop policy if exists "menu_admin_yazar" on public.ekstralar;
drop policy if exists "menu_admin_yazar" on public.ayarlar;
drop policy if exists "siparis_misafir_ekler" on public.siparisler;
drop policy if exists "siparis_admin_okur" on public.siparisler;
drop policy if exists "siparis_admin_gunceller" on public.siparisler;

create policy "menu_admin_yazar" on public.kategoriler for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_yazar" on public.urunler for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_yazar" on public.cikarilabilirler for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_yazar" on public.ekstralar for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_yazar" on public.ayarlar for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "siparis_admin_okur" on public.siparisler for select to authenticated
  using (public.is_admin());
create policy "siparis_admin_gunceller" on public.siparisler for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke insert on table public.siparisler from anon, authenticated;
grant select, update on table public.siparisler to authenticated;
grant all on table public.siparisler to service_role;

-- Fotograf yazma politikalari da sadece allowlist adminlerine acik.
drop policy if exists "gorsel_admin_yukler" on storage.objects;
drop policy if exists "gorsel_admin_gunceller" on storage.objects;
drop policy if exists "gorsel_admin_siler" on storage.objects;

create policy "gorsel_admin_yukler" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-gorseller' and public.is_admin());
create policy "gorsel_admin_gunceller" on storage.objects for update to authenticated
  using (bucket_id = 'menu-gorseller' and public.is_admin())
  with check (bucket_id = 'menu-gorseller' and public.is_admin());
create policy "gorsel_admin_siler" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-gorseller' and public.is_admin());

commit;
