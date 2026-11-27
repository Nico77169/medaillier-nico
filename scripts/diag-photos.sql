with items as (select token_id, data from collection where token_id not like '\_%'),
files as (select name, split_part(name,'/',2) fn from storage.objects where bucket_id='photos'),
ff as (select distinct regexp_replace(fn,'_(f|b)_[0-9]+\.\w+$','') tid, substring(fn from '_(f|b)_[0-9]+\.\w+$') side from files where fn ~ '_(f|b)_[0-9]+\.\w+$')
select json_build_object(
 'lignes', (select count(*) from items),
 'avec_face', (select count(*) from items where coalesce(data->>'f','')<>''),
 'face_serveur', (select count(*) from items where data->>'f' like 'sb:%'),
 'face_attente_tel', (select count(*) from items where data->>'f' like 'idb:%'),
 'disney_lignes', (select count(*) from items where token_id like 'd%'),
 'disney_avec_face', (select count(*) from items where token_id like 'd%' and coalesce(data->>'f','')<>''),
 'fichiers_serveur', (select count(*) from files),
 'pieces_avec_fichier_face', (select count(*) from ff where side='f'),
 'pieces_sans_face_mais_fichier', (select count(*) from ff where side='f' and tid not in (select token_id from items where coalesce(data->>'f','')<>'')),
 'disney_sans_face_mais_fichier', (select count(*) from ff where side='f' and tid like 'd%' and tid not in (select token_id from items where coalesce(data->>'f','')<>'')),
 'face_pointe_vers_fichier_absent', (select count(*) from items i where i.data->>'f' like 'sb:%' and not exists (select 1 from storage.objects o where o.bucket_id='photos' and 'sb:'||o.name=i.data->>'f')),
 'colonnes', (select string_agg(column_name,',') from information_schema.columns where table_name='collection'),
 'derniere_modif_photos', (select max(created_at) from storage.objects where bucket_id='photos')
) as r;
