-- Phase 1: additive preparation. Safe to apply while the legacy app is live.
alter table public.users
  add column if not exists auth_user_id uuid unique
  references auth.users(id) on delete cascade;

create index if not exists users_auth_user_id_idx
  on public.users(auth_user_id);
