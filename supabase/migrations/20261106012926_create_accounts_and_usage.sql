-- Accounts and daily check counts. Checked addresses are never stored here:
-- the site promises that, so usage is a number per person per day and nothing more.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  created_at timestamptz not null default now()
);

create table public.daily_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  checks integer not null default 0 check (checks >= 0),
  primary key (user_id, day)
);

alter table public.profiles enable row level security;
alter table public.daily_usage enable row level security;

-- People can read their own rows. Nobody writes from the browser, so a visitor
-- can't change their plan or reset their count.
revoke all on public.profiles, public.daily_usage from anon, authenticated;
grant select on public.profiles, public.daily_usage to authenticated;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Read own usage" on public.daily_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Every new sign-in gets a profile, named from Google or the email address.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1), ''),
      initcap(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[._-].*$', ''))
    )
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adds one check for the signed-in person today and returns today's total.
create function public.record_check()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;

  insert into public.daily_usage (user_id, checks)
  values ((select auth.uid()), 1)
  on conflict (user_id, day) do update set checks = public.daily_usage.checks + 1
  returning checks into total;

  return total;
end;
$$;

revoke execute on function public.record_check() from public, anon;
grant execute on function public.record_check() to authenticated;
