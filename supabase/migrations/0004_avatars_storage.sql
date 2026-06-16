-- Mugen — avatars storage bucket.
-- À exécuter dans le SQL Editor de Supabase après 0003.
-- Bucket public en lecture ; chaque joueur n'écrit que dans son dossier <uid>/.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lecture publique des avatars.
drop policy if exists "Avatars lisibles par tous" on storage.objects;
create policy "Avatars lisibles par tous"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Écriture limitée au dossier de l'utilisateur (avatars/<uid>/...).
drop policy if exists "Avatar : envoi dans son dossier" on storage.objects;
create policy "Avatar : envoi dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Avatar : maj de son dossier" on storage.objects;
create policy "Avatar : maj de son dossier"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Avatar : suppression de son dossier" on storage.objects;
create policy "Avatar : suppression de son dossier"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
