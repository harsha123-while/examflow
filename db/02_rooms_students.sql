create table if not exists public.rooms (
  id serial primary key,
  name text not null unique,
  block text not null,
  capacity int not null check (capacity > 0),
  active boolean not null default true
);

create table if not exists public.students (
  id serial primary key,
  roll_no text not null unique,
  name text not null,
  department text not null,
  section text not null,
  user_id uuid references auth.users(id)
);

alter table public.rooms enable row level security;
alter table public.students enable row level security;

drop policy if exists "rooms read" on public.rooms;
create policy "rooms read" on public.rooms
  for select to authenticated using (true);

drop policy if exists "rooms admin write" on public.rooms;
create policy "rooms admin write" on public.rooms
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "students read" on public.students;
create policy "students read" on public.students
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','incharge'))
  );

drop policy if exists "students admin write" on public.students;
create policy "students admin write" on public.students
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

grant select, insert, update, delete on public.rooms, public.students to authenticated;
grant usage, select on all sequences in schema public to authenticated;