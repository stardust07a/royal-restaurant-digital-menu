begin;

update public.urunler
set ad_tr = 'Tavuk Şiş ile Pilav',
    ad_ar = 'شيش طاووق مع الأرز',
    aciklama_tr = 'Izgara tavuk şiş ve pilav; yanında sarımsak sosu ve turşu.',
    aciklama_ar = 'شيش طاووق مشوي مع الأرز، يقدم مع الثومية ومخلل الخيار.',
    gramaj = null,
    gramaj_ar = null
where slug = 'bir-kilo-sis-tavuk';

commit;
