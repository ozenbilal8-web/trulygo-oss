do $$
declare
  link_request_conflicts bigint;
  channel_link_conflicts bigint;
begin
  select count(*)
  into link_request_conflicts
  from public.link_requests
  where lower(requested_slug) in (
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma'
  );

  select count(*)
  into channel_link_conflicts
  from public.channel_links
  where lower(slug) in (
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma'
  );

  if link_request_conflicts > 0 or channel_link_conflicts > 0 then
    raise notice
      'Existing SEO reserved slug conflicts found. link_requests=%, channel_links=%. No rows were changed.',
      link_request_conflicts,
      channel_link_conflicts;
  end if;
end;
$$;

alter table public.link_requests
add constraint link_requests_requested_slug_seo_reserved_check
check (
  requested_slug is null
  or lower(requested_slug) not in (
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma'
  )
)
not valid;

alter table public.channel_links
add constraint channel_links_slug_seo_reserved_check
check (
  lower(slug) not in (
    'link-vitrini',
    'bitly-alternatifi',
    'utm-link-olusturucu',
    'qr-kod-olusturucu',
    'whatsapp-link-olusturucu',
    'kampanya-linki-olusturma'
  )
)
not valid;
