-- Mevcut tahmini alerjen işaretlerini temizle. Alan ve admin seçimleri kalır;
-- restoran sahibi doğrulanmış bilgileri ürün bazında yeniden seçebilir.
begin;

update public.urunler
set alerjenler = '{}'::text[]
where cardinality(alerjenler) > 0;

commit;
