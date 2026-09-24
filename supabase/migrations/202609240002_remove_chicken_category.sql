begin;

-- Tavuk kategorisi kaldirilir; urunler mevcut diger kategorilerinde kalir.
-- Eski tek-kategori kolonu bu kategoriye bakiyorsa once guvenli bir mevcut
-- kategori bagina, o da yoksa Ana Yemekler'e tasinir.
with tavuk as (
  select id from public.kategoriler where slug = 'tavuk'
)
update public.urunler as u
set kategori_id = coalesce(
  (
    select uk.kategori_id
    from public.urun_kategorileri as uk
    join public.kategoriler as k on k.id = uk.kategori_id
    where uk.urun_id = u.id
      and k.slug <> 'tavuk'
    order by k.sira, k.id
    limit 1
  ),
  (select id from public.kategoriler where slug = 'ana-yemekler')
)
where u.kategori_id = (select id from tavuk);

delete from public.urun_kategorileri
where kategori_id = (select id from public.kategoriler where slug = 'tavuk');

delete from public.kategoriler
where slug = 'tavuk';

commit;
