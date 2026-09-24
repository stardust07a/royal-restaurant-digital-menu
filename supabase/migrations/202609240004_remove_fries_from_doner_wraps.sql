begin;

update public.urunler
set aciklama_tr = case slug
      when 'doner' then 'Suriye usulü tavuk şavurma; lavaşta sarımsak sosu ve turşu.'
      when 'duble-doner' then 'Çift porsiyon Suriye usulü tavuk şavurma; lavaşta sarımsak sosu ve turşu.'
      when 'parmak-doner' then 'Küçük boy Suriye usulü tavuk şavurma; sarımsak sosu ve turşu.'
    end,
    aciklama_ar = case slug
      when 'doner' then 'شاورما دجاج سورية في خبز الصاج مع ثومية ومخلل خيار.'
      when 'duble-doner' then 'شاورما دجاج سورية دبل في خبز الصاج مع ثومية ومخلل خيار.'
      when 'parmak-doner' then 'أصبع شاورما دجاج سورية مع ثومية ومخلل خيار.'
    end
where slug in ('doner', 'duble-doner', 'parmak-doner');

delete from public.cikarilabilirler as c
using public.urunler as u
where c.urun_id = u.id
  and u.slug in ('doner', 'duble-doner', 'parmak-doner')
  and (
    lower(btrim(c.ad_tr)) = 'patates'
    or btrim(c.ad_ar) = 'بطاطا مقلية'
  );

commit;
