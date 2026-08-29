-- Keep the application identity row idempotently synchronized with Supabase
-- Auth. The trigger never copies secrets or raw auth credentials.
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    nullif(split_part(new.email, '@', 1), ''),
    'Nameplate user'
  );

  insert into public.user_account (id, email, full_name, phone, status, created_at, updated_at)
  values (new.id, coalesce(new.email, ''), display_name, new.phone, 'active', now(), now())
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    full_name = excluded.full_name,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
  after insert or update of email, phone, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_sync();

revoke all on function public.handle_auth_user_sync() from public;
grant execute on function public.handle_auth_user_sync() to supabase_auth_admin;
