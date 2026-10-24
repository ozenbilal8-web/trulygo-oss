begin;

-- Keep the preflight and constraint replacement in one transaction. The lock
-- closes the gap where a newly reserved slug could otherwise be inserted
-- between the conflict check and the replacement constraints.
lock table public.link_requests, public.channel_links
in share row exclusive mode;

do $$
declare
  link_request_conflicts bigint;
  channel_link_conflicts bigint;
begin
  select count(*)
  into link_request_conflicts
  from public.link_requests
  where lower(requested_slug) in (
    'admin',
    's',
    'dashboard',
    'signal',
    'login',
    'register',
    'v',
    'privacy',
    'terms',
    'not-approved',
    'api',
    'auth',
    'static',
    'opengraph-image',
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma',
    'kanal-linki-olusturma',
    'link-kisaltma',
    'anket-olusturucu',
    'cerez-politikasi',
    'acik-riza-metni',
    'kvkk-basvurusu',
    'forgot-password',
    'reset-password'
  );

  select count(*)
  into channel_link_conflicts
  from public.channel_links
  where lower(slug) in (
    'admin',
    's',
    'dashboard',
    'signal',
    'login',
    'register',
    'v',
    'privacy',
    'terms',
    'not-approved',
    'api',
    'auth',
    'static',
    'opengraph-image',
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma',
    'kanal-linki-olusturma',
    'link-kisaltma',
    'anket-olusturucu',
    'cerez-politikasi',
    'acik-riza-metni',
    'kvkk-basvurusu',
    'forgot-password',
    'reset-password'
  );

  if link_request_conflicts > 0 or channel_link_conflicts > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'Public route reserved slug conflicts found. link_requests=%s, channel_links=%s. No rows were changed.',
        link_request_conflicts,
        channel_link_conflicts
      ),
      hint = 'Run the read-only preflight query and resolve conflicts before retrying.';
  end if;
end;
$$;

alter table public.link_requests
drop constraint if exists link_requests_requested_slug_seo_reserved_check;

alter table public.link_requests
add constraint link_requests_requested_slug_seo_reserved_check
check (
  requested_slug is null
  or lower(requested_slug) not in (
    'admin',
    's',
    'dashboard',
    'signal',
    'login',
    'register',
    'v',
    'privacy',
    'terms',
    'not-approved',
    'api',
    'auth',
    'static',
    'opengraph-image',
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma',
    'kanal-linki-olusturma',
    'link-kisaltma',
    'anket-olusturucu',
    'cerez-politikasi',
    'acik-riza-metni',
    'kvkk-basvurusu',
    'forgot-password',
    'reset-password'
  )
)
not valid;

alter table public.link_requests
validate constraint link_requests_requested_slug_seo_reserved_check;

alter table public.channel_links
drop constraint if exists channel_links_slug_seo_reserved_check;

alter table public.channel_links
add constraint channel_links_slug_seo_reserved_check
check (
  lower(slug) not in (
    'admin',
    's',
    'dashboard',
    'signal',
    'login',
    'register',
    'v',
    'privacy',
    'terms',
    'not-approved',
    'api',
    'auth',
    'static',
    'opengraph-image',
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma',
    'kanal-linki-olusturma',
    'link-kisaltma',
    'anket-olusturucu',
    'cerez-politikasi',
    'acik-riza-metni',
    'kvkk-basvurusu',
    'forgot-password',
    'reset-password'
  )
)
not valid;

alter table public.channel_links
validate constraint channel_links_slug_seo_reserved_check;

commit;
