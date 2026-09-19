begin;

-- Menu urunlerinde icecek dahil degil. Yalnizca eski menu aciklamalarindaki
-- yanlis ibareleri temizle; bagimsiz satilan iceceklere ve fiyatlara dokunma.
update public.urunler
set aciklama_tr = replace(aciklama_tr, ' + içecek', ''),
    aciklama_ar = replace(aciklama_ar, ' ومشروب', ''),
    gramaj = replace(gramaj, ' + 330 ml içecek', ''),
    gramaj_ar = replace(replace(gramaj_ar, ' + مشروب 330 مل', ''), ' + مشروب 330مل', '')
where slug in (
  'citir-tavuk-menu', 'karisik-menu', 'cheese-burger-menu', 'hamburger-menu',
  'sis-tavuk-menu', 'zincer-menu', 'duble-kanat-menu', 'duble-sis-menu',
  'duble-doner-menu', 'doner-extra-menu', 'duble-kebap-menu',
  'icli-kofte-menu', 'crispy-menu', 'doner-menu', 'kanat-menu',
  'baharatli-menu', 'kebap-menu'
);

update public.kategoriler
set aciklama_tr = 'Patates dahil',
    aciklama_ar = 'مع بطاطا'
where slug = 'menuler'
  and (aciklama_tr like '%içecek%' or aciklama_ar like '%مشروب%');

-- "Icecegi 1L yap" bir icecegin dahil oldugunu varsayiyordu.
delete from public.ekstralar
where ad_tr = 'İçeceği 1L yap' and ad_ar = 'مشروب ١ لتر';

commit;
