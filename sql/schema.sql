-- Krankengeschichte App - Datenbankschema für Supabase
-- Diesen kompletten Inhalt im Supabase Dashboard unter "SQL Editor" -> "New query" einfügen und ausführen.

-- Tabelle für die Krankengeschichte-Einträge
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  entry_date date not null,
  triggers text,
  activities text,
  symptoms text[] not null default '{}',
  symptoms_other text,
  medications text,
  notes text,
  pain_location text,
  body_points jsonb not null default '[]',
  entry_time time,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Falls die Tabelle schon vor diesen Feldern erstellt wurde (bestehende Installation):
alter table public.entries add column if not exists entry_time time;
alter table public.entries add column if not exists attachments jsonb not null default '[]';
alter table public.entries add column if not exists activities text;

create index if not exists entries_owner_id_idx on public.entries(owner_id);
create index if not exists entries_entry_date_idx on public.entries(entry_date);

-- Tabelle für eingeladene Beobachter (Personen, die die Einträge einer anderen Person nur lesen dürfen)
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, invited_email)
);

create index if not exists shares_owner_id_idx on public.shares(owner_id);
create index if not exists shares_invited_email_idx on public.shares(lower(invited_email));

-- Automatisches Update von updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- Row Level Security aktivieren
alter table public.entries enable row level security;
alter table public.shares enable row level security;

-- Eigentümer/in darf alle eigenen Einträge sehen und verwalten
drop policy if exists "owner full access on entries" on public.entries;
create policy "owner full access on entries"
  on public.entries
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Eingeladene Beobachter/innen dürfen Einträge NUR LESEN (kein Insert/Update/Delete)
drop policy if exists "observers read shared entries" on public.entries;
create policy "observers read shared entries"
  on public.entries
  for select
  using (
    exists (
      select 1 from public.shares s
      where s.owner_id = entries.owner_id
        and lower(s.invited_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Eigentümer/in verwaltet die Liste der eingeladenen Beobachter/innen
drop policy if exists "owner manages shares" on public.shares;
create policy "owner manages shares"
  on public.shares
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Beobachter/innen dürfen sehen, zu welchen Konten sie eingeladen wurden
drop policy if exists "observers see own invites" on public.shares;
create policy "observers see own invites"
  on public.shares
  for select
  using (lower(invited_email) = lower(auth.jwt() ->> 'email'));

-- Storage-Bucket für Foto-Anhänge zu Einträgen (privat - Zugriff nur über die
-- Row-Level-Security-Regeln unten, nicht öffentlich abrufbar).
insert into storage.buckets (id, name, public)
values ('entry-photos', 'entry-photos', false)
on conflict (id) do nothing;

-- Eigentümer/in darf im eigenen Ordner (Pfad beginnt mit der eigenen User-ID)
-- Fotos hochladen, ansehen und löschen.
drop policy if exists "owner manage own photos" on storage.objects;
create policy "owner manage own photos"
  on storage.objects
  for all
  using (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Eingeladene Beobachter/innen dürfen Fotos aus dem Ordner der Person, die sie
-- eingeladen hat, nur ansehen.
drop policy if exists "observers view shared photos" on storage.objects;
create policy "observers view shared photos"
  on storage.objects
  for select
  using (
    bucket_id = 'entry-photos'
    and exists (
      select 1 from public.shares s
      where s.owner_id::text = (storage.foldername(name))[1]
        and lower(s.invited_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- WICHTIG: Damit sich niemand außer dir selbst registrieren kann, im Supabase
-- Dashboard unter Authentication -> Providers -> Email die Option
-- "Allow new users to sign up" deaktivieren, NACHDEM du dein eigenes Konto
-- angelegt hast. Eingeladene Beobachter/innen legst du dann manuell unter
-- Authentication -> Users -> "Add user" an (gleiche E-Mail wie in shares).
