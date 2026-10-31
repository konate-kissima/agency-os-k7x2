-- Agency OS : schéma Supabase (à exécuter dans l'éditeur SQL de TON projet, pas celui de Germaine ni de Gaston)
-- Tables de type document : id texte + data jsonb. RLS activée partout, accès réservé aux membres listés.

create table if not exists public.membres (
  email text primary key
);
alter table public.membres enable row level security;

-- Chaque utilisateur connecté ne peut lire que sa propre ligne (suffisant pour est_membre)
drop policy if exists membres_lecture_perso on public.membres;
create policy membres_lecture_perso on public.membres for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Fonction SECURITY INVOKER (pas definer) : elle respecte la RLS de l'appelant
create or replace function public.est_membre() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.membres m where lower(m.email) = lower(auth.jwt() ->> 'email'));
$$;

do $$
declare t text;
begin
  foreach t in array array['prospects','calls','clients','settings','content'] loop
    execute format('create table if not exists public.%I (id text primary key, data jsonb not null default ''{}''::jsonb, updated_at timestamptz not null default now())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_membres', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.est_membre()) with check (public.est_membre())', t||'_membres', t);
  end loop;
end $$;

-- Mise à jour partielle (fusion jsonb) : invoker, liste blanche de tables
create or replace function public.fusion_doc(t text, doc_id text, patch jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if t not in ('prospects','calls','clients','settings','content') then raise exception 'table non autorisée'; end if;
  execute format('insert into public.%I (id, data) values ($1, $2) on conflict (id) do update set data = public.%I.data || $2, updated_at = now()', t, t) using doc_id, patch;
end $$;
revoke all on function public.fusion_doc(text,text,jsonb) from public, anon;
grant execute on function public.fusion_doc(text,text,jsonb) to authenticated;

-- Temps réel
alter publication supabase_realtime add table public.prospects, public.calls, public.clients, public.settings, public.content;

-- Ajoute-toi comme membre (remplace l'email), puis crée ton utilisateur dans Authentication > Users
-- et DÉSACTIVE l'inscription libre (Authentication > Sign In / Providers > Email > "Allow new users to sign up" = off).
-- insert into public.membres (email) values ('ton-email@exemple.fr');
