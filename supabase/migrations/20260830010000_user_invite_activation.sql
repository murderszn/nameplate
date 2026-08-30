-- Activate invited application memberships when Supabase confirms the Auth user.
-- Identity stays owned by auth.users; this trigger only projects safe profile
-- fields and invitation state into the application schema.
create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  display_name text;
  projected_status public.user_status_t;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    nullif(split_part(new.email, '@', 1), ''),
    'Nameplate user'
  );
  projected_status := case
    when new.email_confirmed_at is null then 'invited'::public.user_status_t
    else 'active'::public.user_status_t
  end;

  insert into public.user_account (id, email, full_name, phone, status, created_at, updated_at)
  values (new.id, coalesce(new.email, ''), display_name, new.phone, projected_status, now(), now())
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    full_name = excluded.full_name,
    status = case
      when public.user_account.status = 'suspended' then public.user_account.status
      else excluded.status
    end,
    updated_at = now();

  if new.email_confirmed_at is not null then
    update public.membership
    set status = 'active', updated_at = now()
    where user_id = new.id
      and status = 'invited'
      and deleted_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
  after insert or update of email, phone, raw_user_meta_data, email_confirmed_at on auth.users
  for each row execute function public.handle_auth_user_sync();

revoke all on function public.handle_auth_user_sync() from public;
grant execute on function public.handle_auth_user_sync() to supabase_auth_admin;
