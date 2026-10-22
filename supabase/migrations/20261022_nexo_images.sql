-- NEXO: imagens publicadas são públicas; fontes e arquivos privados exigem buckets separados.
create table if not exists public.nexo_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.nexo_admins enable row level security;
-- Sem políticas públicas: somente service_role consulta e administra a lista.
create table if not exists public.nexo_lesson_images (
 id uuid primary key default gen_random_uuid(),
 lesson_index integer not null check (lesson_index between 0 and 1000),
 image_url text not null,
 prompt text not null,
 alt_text text not null,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id)
);
alter table public.nexo_lesson_images enable row level security;
create policy "Imagens publicadas visíveis" on public.nexo_lesson_images for select to anon,authenticated using (true);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('nexo-lesson-images','nexo-lesson-images',true,10485760,array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
-- Não conceder INSERT/UPDATE/DELETE públicos. Apenas a função protegida, com service_role.
-- Após criar sua conta no Supabase Auth, cadastrar exclusivamente o UUID autorizado:
-- insert into public.nexo_admins(user_id) values ('UUID-DA-CONTA-AUTORIZADA');
