-- 11.09.2026 tarihinde restoran sahibi tarafindan onaylanan 15 menu urunu.
-- Tekrar calistirilabilir: urun slug'i veya iki dildeki ayni ad zaten varsa
-- ikinci bir kayit acmaz; secenekleri de ayni urune ikinci kez eklemez.
begin;

-- Bu iki kategori eski canli veride bulunabilir, fakat temiz bir kurulumda
-- bulunmayabilir. Mevcut kayitlara dokunmadan yalnizca eksikleri tamamla.
insert into public.kategoriler (
  slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar, gorsel_url, aktif
)
values
  (
    'izgaralar', 6, 'İzgaralar', 'قسم المشاوي',
    'Kebap, şiş ve karışık ızgara çeşitleri',
    'كباب وشيش ومشاوي مشكلة',
    'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/karisik-menu-1788811272908.webp',
    true
  ),
  (
    'tavuk', 7, 'Tavuk', 'قسم الفروج',
    'Izgara ve çevirme tavuk çeşitleri',
    'دجاج مشوي وعلى الفحم',
    'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/kizarmis-tavuk-1788811316119.webp',
    true
  )
on conflict (slug) do nothing;

do $$
begin
  if (
    select count(*)
    from public.kategoriler
    where slug in ('ana-yemekler', 'sandvicler', 'izgaralar', 'tavuk')
  ) <> 4 then
    raise exception 'Onayli urunler icin gerekli kategoriler eksik.';
  end if;
end;
$$;

with onayli_urunler(
  kategori_slug, slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar,
  fiyat, gramaj, gramaj_ar, alerjenler, gorsel_url
) as (
  values
    ('ana-yemekler', 'aile-boyu-mansaf', 12, 'Aile Boyu Mansaf', 'منسف عائلي', 'Aile paylaşımına uygun büyük porsiyon mansaf.', 'منسف عائلي بحجم كبير للمشاركة.', 800::numeric, 'Aile boyu', 'حجم عائلي', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/kizarmis-tavuk-pilav-1788811357126.webp'),
    ('sandvicler', 'uzun-ekmek-crispy-sandvic', 16, 'Uzun Ekmek Crispy Sandviç', 'كريسبي صمون طويل', 'Uzun ekmekte çıtır tavuk sandviç.', 'ساندويش دجاج كريسبي في صمون طويل.', 225::numeric, '1 adet', '1 قطعة', array['gluten','yumurta']::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/crispy-durum-1788810779788.webp'),
    ('tavuk', 'yarim-mangal-tavuk-mendi-pilav', 1, 'Yarım Mangal Tavuk + Mendi Pilav', 'نصف دجاج فحم مع أرز مندي', 'Mangalda pişmiş yarım tavuk ve mendi pilavı.', 'نصف دجاج مشوي على الفحم مع أرز مندي.', 400::numeric, 'Yarım tavuk + pilav', 'نصف دجاجة + أرز مندي', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/mangal-tavuk-pilav-1788811370911.webp'),
    ('izgaralar', 'yarim-kilo-tavuk-kebap', 1, 'Yarım Kilo Tavuk Kebap', 'نص كيلو كباب دجاج', '500 g ızgara tavuk kebap.', 'نصف كيلو كباب دجاج مشوي.', 300::numeric, '500 g', '500 غ', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/kebap-menu-1788811162827.webp'),
    ('izgaralar', 'yarim-kilo-sis-tavuk', 2, 'Yarım Kilo Şiş Tavuk', 'نص كيلو شيش طاووق', '500 g ızgara şiş tavuk.', 'نصف كيلو شيش طاووق مشوي.', 300::numeric, '500 g', '500 غ', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/sis-tavuk-menu-1788811024260.webp'),
    ('izgaralar', 'bir-kilo-sis-tavuk', 3, 'Bir Kilo Şiş Tavuk', 'شيش طاووق وزن كيلو', '1 kg ızgara şiş tavuk.', 'كيلو شيش طاووق مشوي.', 550::numeric, '1 kg', '1 كيلو', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/sis-tavuk-pilav-1788811239792.webp'),
    ('tavuk', 'bir-kilo-izgara-kanat', 2, 'Bir Kilo Izgara Kanat', 'كيلو جناح مشوي', '1 kg ızgara tavuk kanat.', 'كيلو أجنحة دجاج مشوية.', 550::numeric, '1 kg', '1 كيلو', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/kanat-menu-1788811260291.webp'),
    ('tavuk', 'butun-mangal-tavuk', 3, 'Bütün Mangal Tavuk', 'فروج على الفحم', 'Kömür ateşinde pişmiş bütün tavuk.', 'فروج كامل مشوي على الفحم.', 550::numeric, '1 bütün tavuk', 'فروج كامل', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/kizarmis-tavuk-1788811316119.webp'),
    ('tavuk', 'izgara-kanat-porsiyon', 4, 'Izgara Kanat Porsiyon (250 g / 5 Adet)', 'أجنحة دجاج مشوي', '250 g, 5 adet ızgara tavuk kanat.', 'وجبة 250 غرام، 5 قطع أجنحة دجاج مشوية.', 225::numeric, '250 g / 5 adet', '250 غ / 5 قطع', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/duble-kanat-menu-1789118678210.webp'),
    ('tavuk', 'butun-broasted', 5, 'Bütün Broasted (8 Parça)', 'بروستد كامل', '8 parça çıtır broasted tavuk.', 'بروستد كامل مقرمش، 8 قطع.', 800::numeric, '8 parça', '8 قطع', array['gluten']::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/citir-tavuk-menu-1788811102774.webp'),
    ('sandvicler', 'duble-zinger-sandvic', 17, 'Duble Zinger Sandviç', 'سندويش زنجر دبل', 'Çift porsiyon zinger tavuk sandviç.', 'ساندويش زنجر دبل.', 220::numeric, 'Duble', 'دبل', array['gluten','yumurta']::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/peynirli-zincer-1789118533734.webp'),
    ('sandvicler', 'duble-spicy-sandvic', 18, 'Duble Spicy Sandviç', 'سندويش سبايسي دبل', 'Çift porsiyon baharatlı çıtır tavuk sandviç.', 'ساندويش دجاج سبايسي دبل.', 220::numeric, 'Duble', 'دبل', array['gluten']::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/baharatli-durum-1788810706192.webp'),
    ('izgaralar', 'bir-kilo-tavuk-kebap', 4, 'Bir Kilo Tavuk Kebap (10 Şiş)', 'كباب فروج', '1 kg tavuk kebap, 10 şiş.', 'كيلو كباب دجاج، 10 أسياخ.', 550::numeric, '1 kg / 10 şiş', '1 كيلو / 10 أسياخ', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/kebap-pilav-1788811298794.webp'),
    ('izgaralar', 'bir-kilo-karisik-izgara', 5, 'Bir Kilo Karışık Izgara', 'كيلو مشكل مشاوي', '1 kg karışık ızgara çeşitleri.', 'كيلو مشكل مشاوي.', 550::numeric, '1 kg', '1 كيلو', array[]::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/karisik-menu-1788811272908.webp'),
    ('sandvicler', 'parmak-doner', 19, 'Parmak Döner', 'أصبع شاورما', 'Atıştırmalık küçük döner porsiyonu.', 'قطعة شاورما صغيرة مناسبة كوجبة خفيفة.', 100::numeric, '1 adet', '1 قطعة', array['gluten']::text[], 'https://pscuxsmjdhpsbxafzmzf.supabase.co/storage/v1/object/public/menu-gorseller/urunler/doner-1788810619604.webp')
)
insert into public.urunler (
  kategori_id, slug, sira, ad_tr, ad_ar, aciklama_tr, aciklama_ar,
  gorsel_url, fiyat_masa, fiyat_paket, gramaj, gramaj_ar, kalori,
  alerjenler, rozet, stokta, aktif
)
select
  k.id, o.slug, o.sira, o.ad_tr, o.ad_ar, o.aciklama_tr, o.aciklama_ar,
  o.gorsel_url, o.fiyat, o.fiyat, o.gramaj, o.gramaj_ar, null,
  o.alerjenler, 'yok', true, true
from onayli_urunler o
join public.kategoriler k on k.slug = o.kategori_slug
where not exists (
  select 1
  from public.urunler u
  where u.slug = o.slug
     or lower(btrim(u.ad_tr)) = lower(btrim(o.ad_tr))
     or btrim(u.ad_ar) = btrim(o.ad_ar)
)
on conflict (slug) do nothing;

-- Yerel menu sablonlariyla ayni davranis icin secenekleri, halen kullanilan
-- karsilastirma urunlerinden kopyala. Böylece fiyat/icerik tek kaynakta kalir.
with sablonlar(hedef_slug, kaynak_slug, cikar_kopyala, ekstra_kopyala) as (
  values
    ('aile-boyu-mansaf', 'mangal-tavuk-pilav', false, true),
    ('uzun-ekmek-crispy-sandvic', 'crispy-durum', true, true),
    ('yarim-mangal-tavuk-mendi-pilav', 'mangal-tavuk-pilav', true, true),
    ('yarim-kilo-tavuk-kebap', 'mangal-tavuk-pilav', false, true),
    ('yarim-kilo-sis-tavuk', 'mangal-tavuk-pilav', false, true),
    ('bir-kilo-sis-tavuk', 'mangal-tavuk-pilav', false, true),
    ('bir-kilo-izgara-kanat', 'mangal-tavuk-pilav', false, true),
    ('butun-mangal-tavuk', 'mangal-tavuk-pilav', true, true),
    ('izgara-kanat-porsiyon', 'mangal-tavuk-pilav', true, true),
    ('butun-broasted', 'mangal-tavuk-pilav', true, true),
    ('duble-zinger-sandvic', 'crispy-durum', true, true),
    ('duble-spicy-sandvic', 'crispy-durum', true, true),
    ('bir-kilo-tavuk-kebap', 'mangal-tavuk-pilav', false, true),
    ('bir-kilo-karisik-izgara', 'mangal-tavuk-pilav', false, true),
    ('parmak-doner', 'doner', true, true)
)
insert into public.cikarilabilirler (urun_id, sira, ad_tr, ad_ar)
select hedef.id, c.sira, c.ad_tr, c.ad_ar
from sablonlar s
join public.urunler hedef on hedef.slug = s.hedef_slug
join public.urunler kaynak on kaynak.slug = s.kaynak_slug
join public.cikarilabilirler c on c.urun_id = kaynak.id
where s.cikar_kopyala
  and not exists (
    select 1 from public.cikarilabilirler mevcut
    where mevcut.urun_id = hedef.id
      and lower(btrim(mevcut.ad_tr)) = lower(btrim(c.ad_tr))
      and btrim(mevcut.ad_ar) = btrim(c.ad_ar)
  );

with sablonlar(hedef_slug, kaynak_slug, ekstra_kopyala) as (
  values
    ('aile-boyu-mansaf', 'mangal-tavuk-pilav', true),
    ('uzun-ekmek-crispy-sandvic', 'crispy-durum', true),
    ('yarim-mangal-tavuk-mendi-pilav', 'mangal-tavuk-pilav', true),
    ('yarim-kilo-tavuk-kebap', 'mangal-tavuk-pilav', true),
    ('yarim-kilo-sis-tavuk', 'mangal-tavuk-pilav', true),
    ('bir-kilo-sis-tavuk', 'mangal-tavuk-pilav', true),
    ('bir-kilo-izgara-kanat', 'mangal-tavuk-pilav', true),
    ('butun-mangal-tavuk', 'mangal-tavuk-pilav', true),
    ('izgara-kanat-porsiyon', 'mangal-tavuk-pilav', true),
    ('butun-broasted', 'mangal-tavuk-pilav', true),
    ('duble-zinger-sandvic', 'crispy-durum', true),
    ('duble-spicy-sandvic', 'crispy-durum', true),
    ('bir-kilo-tavuk-kebap', 'mangal-tavuk-pilav', true),
    ('bir-kilo-karisik-izgara', 'mangal-tavuk-pilav', true),
    ('parmak-doner', 'doner', true)
)
insert into public.ekstralar (urun_id, sira, ad_tr, ad_ar, fiyat, stokta)
select hedef.id, e.sira, e.ad_tr, e.ad_ar, e.fiyat, e.stokta
from sablonlar s
join public.urunler hedef on hedef.slug = s.hedef_slug
join public.urunler kaynak on kaynak.slug = s.kaynak_slug
join public.ekstralar e on e.urun_id = kaynak.id
where s.ekstra_kopyala
  and not exists (
    select 1 from public.ekstralar mevcut
    where mevcut.urun_id = hedef.id
      and lower(btrim(mevcut.ad_tr)) = lower(btrim(e.ad_tr))
      and btrim(mevcut.ad_ar) = btrim(e.ad_ar)
  );

commit;
