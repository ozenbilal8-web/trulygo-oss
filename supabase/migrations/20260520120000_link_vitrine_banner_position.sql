-- Banner görselinin object-position değerini (yüzde olarak) saklayan iki yeni
-- sütun. Kullanıcı düzenleme ekranında banner görselini sürükleyerek hangi
-- bölgesinin görüneceğini ayarlayabiliyor; ayarlanan değer 0-100 aralığında
-- yüzde olarak burada saklanır ve hem public /v/[handle] hem de panel
-- önizlemesinde aynı pozisyon kullanılır.
--
-- Varsayılan değer 50/50 (yani standart `object-position: center center`).
-- 0-100 aralığını DB seviyesinde garanti altına almak için check constraint
-- ekliyoruz; uygulama tarafı (server action) aynı doğrulamayı zaten yapıyor
-- ama RLS kullanan başka bir client direct update yapsa dahi DB tarafı
-- güvenlik halkası olarak kalsın.

alter table public.link_vitrines
add column if not exists banner_position_x numeric not null default 50,
add column if not exists banner_position_y numeric not null default 50;

alter table public.link_vitrines
drop constraint if exists link_vitrines_banner_position_x_check;

alter table public.link_vitrines
add constraint link_vitrines_banner_position_x_check
check (banner_position_x >= 0 and banner_position_x <= 100);

alter table public.link_vitrines
drop constraint if exists link_vitrines_banner_position_y_check;

alter table public.link_vitrines
add constraint link_vitrines_banner_position_y_check
check (banner_position_y >= 0 and banner_position_y <= 100);

-- Public /v/[handle] sayfası anon rolü ile okuyor; banner_url'ye select hakkı
-- 20260514170000_link_vitrine_banners.sql ile zaten verilmişti, aynı şekilde
-- yeni pozisyon sütunlarına da anon select hakkı veriyoruz.
grant select (
  banner_position_x,
  banner_position_y
)
on table public.link_vitrines to anon;
