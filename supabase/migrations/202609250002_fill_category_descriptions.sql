begin;

update public.kategoriler
set
  aciklama_tr = coalesce(
    nullif(btrim(aciklama_tr), ''),
    case slug
      when 'burger' then 'Et ve tavuk burger çeşitleri'
      when 'icecekler' then 'Soğuk içecek ve ayran çeşitleri'
      when 'menuler' then 'Patatesli doyurucu menüler'
    end
  ),
  aciklama_ar = coalesce(
    nullif(btrim(aciklama_ar), ''),
    case slug
      when 'burger' then 'برغر اللحم والدجاج'
      when 'icecekler' then 'مشروبات باردة ولبن عيران'
      when 'menuler' then 'وجبات مشبعة مع البطاطا'
    end
  )
where slug in ('burger', 'icecekler', 'menuler')
  and (
    nullif(btrim(aciklama_tr), '') is null
    or nullif(btrim(aciklama_ar), '') is null
  );

commit;
