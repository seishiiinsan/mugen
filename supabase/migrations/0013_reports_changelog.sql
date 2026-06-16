-- Mugen — Signalements (bugs/suggestions) + Changelog.
-- À exécuter dans le SQL Editor de Supabase après 0012.
--
-- Modèle d'accès (cf. 0005_groups.sql) :
--   • `reports` est verrouillée (RLS activée, aucune policy) : tout passe par des
--     RPC `security definer`. Les joueurs envoient/listent les leurs ; l'admin
--     (profiles.is_admin, posé en 0012) lit tout et change les statuts.
--   • `changelog` a UNE policy de lecture publique (entrées publiées), pour que
--     la page /changelog s'affiche sans session. L'écriture passe par des RPC
--     admin.

-- ===========================================================================
-- SIGNALEMENTS
-- ===========================================================================
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  category    text not null check (category in ('bug', 'suggestion', 'other')),
  title       text not null check (char_length(trim(title)) between 3 and 120),
  message     text not null check (char_length(trim(message)) between 5 and 4000),
  status      text not null default 'new'
              check (status in ('new', 'in_progress', 'done', 'rejected')),
  page_url    text,
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reports_status_idx  on public.reports (status);
create index if not exists reports_user_idx     on public.reports (user_id);
create index if not exists reports_created_idx   on public.reports (created_at desc);

-- RLS activée, aucune policy : accès direct interdit, tout par RPC ci-dessous.
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- submit_report : un joueur connecté remonte un bug/suggestion.
-- ---------------------------------------------------------------------------
create or replace function public.submit_report(
  p_category text,
  p_title    text,
  p_message  text,
  p_page_url text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  if p_category not in ('bug', 'suggestion', 'other') then
    raise exception 'Catégorie invalide';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Titre trop court';
  end if;
  if char_length(trim(coalesce(p_message, ''))) < 5 then
    raise exception 'Message trop court';
  end if;

  insert into public.reports (user_id, category, title, message, page_url)
    values (v_uid, p_category, trim(p_title), trim(p_message), nullif(trim(coalesce(p_page_url, '')), ''))
    returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- my_reports : les signalements de l'appelant (récents d'abord).
-- ---------------------------------------------------------------------------
create or replace function public.my_reports()
returns table (
  id          uuid,
  category    text,
  title       text,
  message     text,
  status      text,
  page_url    text,
  created_at  timestamptz,
  updated_at  timestamptz
)
language sql security definer set search_path = public stable
as $$
  select r.id, r.category, r.title, r.message, r.status, r.page_url,
         r.created_at, r.updated_at
  from public.reports r
  where r.user_id = auth.uid()
  order by r.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- admin_list_reports : tous les signalements (admin uniquement), + auteur.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_reports()
returns table (
  id          uuid,
  user_id     uuid,
  username    text,
  category    text,
  title       text,
  message     text,
  status      text,
  page_url    text,
  admin_notes text,
  created_at  timestamptz,
  updated_at  timestamptz
)
language sql security definer set search_path = public stable
as $$
  select r.id, r.user_id, pr.username, r.category, r.title, r.message,
         r.status, r.page_url, r.admin_notes, r.created_at, r.updated_at
  from public.reports r
  left join public.profiles pr on pr.id = r.user_id
  where coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  order by r.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- admin_set_report : change le statut et/ou les notes (admin uniquement).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_report(
  p_id     uuid,
  p_status text default null,
  p_notes  text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Réservé aux admins';
  end if;
  if p_status is not null and p_status not in ('new', 'in_progress', 'done', 'rejected') then
    raise exception 'Statut invalide';
  end if;

  update public.reports set
    status      = coalesce(p_status, status),
    admin_notes = case when p_notes is null then admin_notes else nullif(trim(p_notes), '') end,
    updated_at  = now()
  where id = p_id;
  return found;
end;
$$;

grant execute on function public.submit_report(text, text, text, text) to authenticated;
grant execute on function public.my_reports()                          to authenticated;
grant execute on function public.admin_list_reports()                  to authenticated;
grant execute on function public.admin_set_report(uuid, text, text)    to authenticated;

-- ===========================================================================
-- CHANGELOG
-- ===========================================================================
create table if not exists public.changelog (
  id         uuid primary key default gen_random_uuid(),
  version    text,
  title      text not null check (char_length(trim(title)) between 2 and 140),
  body       text not null check (char_length(trim(body)) between 1 and 20000),
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists changelog_published_idx on public.changelog (published, created_at desc);

-- Lecture publique des entrées publiées (la page /changelog n'a pas de session).
alter table public.changelog enable row level security;
drop policy if exists changelog_public_read on public.changelog;
create policy changelog_public_read on public.changelog
  for select to anon, authenticated
  using (published = true);

-- ---------------------------------------------------------------------------
-- admin_list_changelog : toutes les entrées, brouillons inclus (admin only).
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_changelog()
returns table (
  id         uuid,
  version    text,
  title      text,
  body       text,
  published  boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql security definer set search_path = public stable
as $$
  select c.id, c.version, c.title, c.body, c.published, c.created_at, c.updated_at
  from public.changelog c
  where coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  order by c.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- admin_upsert_changelog : crée (p_id null) ou met à jour une entrée (admin).
-- ---------------------------------------------------------------------------
create or replace function public.admin_upsert_changelog(
  p_id        uuid,
  p_version   text,
  p_title     text,
  p_body      text,
  p_published boolean
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Réservé aux admins';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 2 then
    raise exception 'Titre trop court';
  end if;
  if char_length(trim(coalesce(p_body, ''))) < 1 then
    raise exception 'Corps vide';
  end if;

  if p_id is null then
    insert into public.changelog (version, title, body, published)
      values (nullif(trim(coalesce(p_version, '')), ''), trim(p_title), p_body, coalesce(p_published, true))
      returning id into v_id;
  else
    update public.changelog set
      version    = nullif(trim(coalesce(p_version, '')), ''),
      title      = trim(p_title),
      body       = p_body,
      published  = coalesce(p_published, true),
      updated_at = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Entrée introuvable';
    end if;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_delete_changelog : supprime une entrée (admin uniquement).
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_changelog(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Réservé aux admins';
  end if;
  delete from public.changelog where id = p_id;
  return found;
end;
$$;

grant execute on function public.admin_list_changelog()                              to authenticated;
grant execute on function public.admin_upsert_changelog(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_changelog(uuid)                        to authenticated;
