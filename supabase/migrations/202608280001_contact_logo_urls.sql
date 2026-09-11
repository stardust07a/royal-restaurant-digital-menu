begin;

-- Iletisim kartlarinda adminin yukledigi gercek marka gorselleri kullanilir.
-- Eski metin simgeleri geriye donuk ve migration-oncesi yedek olarak korunur.
alter table public.ayarlar
  add column if not exists telefon_ikon_url text,
  add column if not exists whatsapp_ikon_url text,
  add column if not exists instagram_ikon_url text,
  add column if not exists tiktok_ikon_url text,
  add column if not exists facebook_ikon_url text;

-- Daha once elle yazilmis gecersiz deger varsa public sayfaya tasinmasin.
update public.ayarlar set
  telefon_ikon_url = case
    when telefon_ikon_url ~ '^https://[^[:space:]]+$' and char_length(telefon_ikon_url) <= 2048
      then telefon_ikon_url else null end,
  whatsapp_ikon_url = case
    when whatsapp_ikon_url ~ '^https://[^[:space:]]+$' and char_length(whatsapp_ikon_url) <= 2048
      then whatsapp_ikon_url else null end,
  instagram_ikon_url = case
    when instagram_ikon_url ~ '^https://[^[:space:]]+$' and char_length(instagram_ikon_url) <= 2048
      then instagram_ikon_url else null end,
  tiktok_ikon_url = case
    when tiktok_ikon_url ~ '^https://[^[:space:]]+$' and char_length(tiktok_ikon_url) <= 2048
      then tiktok_ikon_url else null end,
  facebook_ikon_url = case
    when facebook_ikon_url ~ '^https://[^[:space:]]+$' and char_length(facebook_ikon_url) <= 2048
      then facebook_ikon_url else null end;

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

notify pgrst, 'reload schema';

commit;
