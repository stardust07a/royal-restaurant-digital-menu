begin;

-- Ana sayfadaki iletisim kartlarinin simgelerini admin panelinden
-- degistirilebilir yapar. IF NOT EXISTS sayesinde tekrar calistirilabilir.
alter table public.ayarlar
  add column if not exists telefon_ikonu text not null default '📞',
  add column if not exists whatsapp_ikonu text not null default '💬',
  add column if not exists instagram_ikonu text not null default '📸',
  add column if not exists tiktok_ikonu text not null default '🎵',
  add column if not exists facebook_ikonu text not null default '👍';

-- Onceki 32 karakterlik surumden kalan uzun/bos degerleri guvenli
-- varsayilanlara dondur. Boylece 4 Unicode kod noktasi siniri dogrulanabilir.
update public.ayarlar set
  telefon_ikonu = case
    when char_length(btrim(telefon_ikonu)) between 1 and 4 then btrim(telefon_ikonu)
    else '📞'
  end,
  whatsapp_ikonu = case
    when char_length(btrim(whatsapp_ikonu)) between 1 and 4 then btrim(whatsapp_ikonu)
    else '💬'
  end,
  instagram_ikonu = case
    when char_length(btrim(instagram_ikonu)) between 1 and 4 then btrim(instagram_ikonu)
    else '📸'
  end,
  tiktok_ikonu = case
    when char_length(btrim(tiktok_ikonu)) between 1 and 4 then btrim(tiktok_ikonu)
    else '🎵'
  end,
  facebook_ikonu = case
    when char_length(btrim(facebook_ikonu)) between 1 and 4 then btrim(facebook_ikonu)
    else '👍'
  end;

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

-- PostgREST'in yeni kolonlari beklemeden tanimasi icin sema onbellegini yenile.
notify pgrst, 'reload schema';

commit;
