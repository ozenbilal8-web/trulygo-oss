create table if not exists public.signal_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  link_vitrine_id uuid references public.link_vitrines(id) on delete set null,
  title text not null,
  description text,
  slug text not null,
  status text not null default 'draft',
  show_results_to_voters boolean not null default false,
  show_in_link_vitrine boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  closed_at timestamptz,
  constraint signal_surveys_title_not_blank_check check (btrim(title) <> ''),
  constraint signal_surveys_title_length_check check (char_length(title) <= 100),
  constraint signal_surveys_description_length_check check (description is null or char_length(description) <= 240),
  constraint signal_surveys_slug_format_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'
  ),
  constraint signal_surveys_status_check check (status in ('draft', 'published', 'closed'))
);

create unique index if not exists signal_surveys_slug_key
on public.signal_surveys (lower(slug));

create index if not exists signal_surveys_user_updated_idx
on public.signal_surveys (user_id, updated_at desc);

create index if not exists signal_surveys_public_slug_idx
on public.signal_surveys (slug)
where status in ('published', 'closed');

create index if not exists signal_surveys_link_vitrine_idx
on public.signal_surveys (link_vitrine_id, published_at desc)
where status = 'published' and show_in_link_vitrine = true;

create table if not exists public.signal_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.signal_surveys(id) on delete cascade,
  question_text text not null,
  position integer not null,
  question_type text not null default 'main',
  parent_question_id uuid references public.signal_questions(id) on delete cascade,
  parent_option_id uuid,
  created_at timestamptz not null default now(),
  constraint signal_questions_text_not_blank_check check (btrim(question_text) <> ''),
  constraint signal_questions_text_length_check check (char_length(question_text) <= 240),
  constraint signal_questions_position_check check (position > 0),
  constraint signal_questions_type_check check (question_type in ('main', 'branch')),
  constraint signal_questions_parent_shape_check check (
    (
      question_type = 'main'
      and parent_question_id is null
      and parent_option_id is null
    )
    or (
      question_type = 'branch'
      and parent_question_id is not null
      and parent_option_id is not null
    )
  )
);

create unique index if not exists signal_questions_main_position_key
on public.signal_questions (survey_id, position)
where question_type = 'main';

create unique index if not exists signal_questions_one_branch_per_parent_key
on public.signal_questions (parent_question_id)
where question_type = 'branch';

create index if not exists signal_questions_survey_idx
on public.signal_questions (survey_id, question_type, position);

create table if not exists public.signal_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.signal_questions(id) on delete cascade,
  option_text text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint signal_options_text_not_blank_check check (btrim(option_text) <> ''),
  constraint signal_options_text_length_check check (char_length(option_text) <= 120),
  constraint signal_options_position_check check (position > 0),
  unique (id, question_id)
);

create unique index if not exists signal_options_question_position_key
on public.signal_options (question_id, position);

alter table public.signal_questions
drop constraint if exists signal_questions_parent_option_question_fk;

alter table public.signal_questions
add constraint signal_questions_parent_option_question_fk
foreign key (parent_option_id, parent_question_id)
references public.signal_options(id, question_id)
on delete cascade;

create table if not exists public.signal_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.signal_surveys(id) on delete cascade,
  voter_token_hash text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signal_responses_survey_completed_idx
on public.signal_responses (survey_id, completed_at);

create index if not exists signal_responses_voter_token_hash_idx
on public.signal_responses (survey_id, voter_token_hash)
where voter_token_hash is not null;

create table if not exists public.signal_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.signal_responses(id) on delete cascade,
  survey_id uuid not null references public.signal_surveys(id) on delete cascade,
  question_id uuid not null references public.signal_questions(id) on delete cascade,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  constraint signal_answers_option_question_fk
    foreign key (option_id, question_id)
    references public.signal_options(id, question_id)
    on delete cascade,
  unique (response_id, question_id)
);

create index if not exists signal_answers_survey_question_idx
on public.signal_answers (survey_id, question_id);

create index if not exists signal_answers_option_idx
on public.signal_answers (option_id);

create or replace function public.set_signal_surveys_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_signal_surveys_updated_at on public.signal_surveys;

create trigger set_signal_surveys_updated_at
before update on public.signal_surveys
for each row
execute function public.set_signal_surveys_updated_at();

alter table public.signal_surveys enable row level security;
alter table public.signal_questions enable row level security;
alter table public.signal_options enable row level security;
alter table public.signal_responses enable row level security;
alter table public.signal_answers enable row level security;

drop policy if exists signal_surveys_select_own_or_public on public.signal_surveys;
create policy signal_surveys_select_own_or_public
on public.signal_surveys
for select
to authenticated
using (
  user_id = (select auth.uid())
  or status in ('published', 'closed')
);

drop policy if exists signal_surveys_select_public on public.signal_surveys;
create policy signal_surveys_select_public
on public.signal_surveys
for select
to anon
using (status in ('published', 'closed'));

drop policy if exists signal_surveys_insert_own on public.signal_surveys;
create policy signal_surveys_insert_own
on public.signal_surveys
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists signal_surveys_update_own on public.signal_surveys;
create policy signal_surveys_update_own
on public.signal_surveys
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists signal_surveys_delete_own on public.signal_surveys;
create policy signal_surveys_delete_own
on public.signal_surveys
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists signal_questions_select_own_or_published on public.signal_questions;
create policy signal_questions_select_own_or_published
on public.signal_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_questions.survey_id
      and (
        signal_surveys.user_id = (select auth.uid())
        or signal_surveys.status = 'published'
      )
  )
);

drop policy if exists signal_questions_select_published on public.signal_questions;
create policy signal_questions_select_published
on public.signal_questions
for select
to anon
using (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_questions.survey_id
      and signal_surveys.status = 'published'
  )
);

drop policy if exists signal_questions_insert_own_parent on public.signal_questions;
create policy signal_questions_insert_own_parent
on public.signal_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_questions.survey_id
      and signal_surveys.user_id = (select auth.uid())
  )
);

drop policy if exists signal_questions_update_own_parent on public.signal_questions;
create policy signal_questions_update_own_parent
on public.signal_questions
for update
to authenticated
using (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_questions.survey_id
      and signal_surveys.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_questions.survey_id
      and signal_surveys.user_id = (select auth.uid())
  )
);

drop policy if exists signal_questions_delete_own_parent on public.signal_questions;
create policy signal_questions_delete_own_parent
on public.signal_questions
for delete
to authenticated
using (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_questions.survey_id
      and signal_surveys.user_id = (select auth.uid())
  )
);

drop policy if exists signal_options_select_own_or_published on public.signal_options;
create policy signal_options_select_own_or_published
on public.signal_options
for select
to authenticated
using (
  exists (
    select 1
    from public.signal_questions
    join public.signal_surveys on signal_surveys.id = signal_questions.survey_id
    where signal_questions.id = signal_options.question_id
      and (
        signal_surveys.user_id = (select auth.uid())
        or signal_surveys.status = 'published'
      )
  )
);

drop policy if exists signal_options_select_published on public.signal_options;
create policy signal_options_select_published
on public.signal_options
for select
to anon
using (
  exists (
    select 1
    from public.signal_questions
    join public.signal_surveys on signal_surveys.id = signal_questions.survey_id
    where signal_questions.id = signal_options.question_id
      and signal_surveys.status = 'published'
  )
);

drop policy if exists signal_options_insert_own_parent on public.signal_options;
create policy signal_options_insert_own_parent
on public.signal_options
for insert
to authenticated
with check (
  exists (
    select 1
    from public.signal_questions
    join public.signal_surveys on signal_surveys.id = signal_questions.survey_id
    where signal_questions.id = signal_options.question_id
      and signal_surveys.user_id = (select auth.uid())
  )
);

drop policy if exists signal_options_update_own_parent on public.signal_options;
create policy signal_options_update_own_parent
on public.signal_options
for update
to authenticated
using (
  exists (
    select 1
    from public.signal_questions
    join public.signal_surveys on signal_surveys.id = signal_questions.survey_id
    where signal_questions.id = signal_options.question_id
      and signal_surveys.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.signal_questions
    join public.signal_surveys on signal_surveys.id = signal_questions.survey_id
    where signal_questions.id = signal_options.question_id
      and signal_surveys.user_id = (select auth.uid())
  )
);

drop policy if exists signal_options_delete_own_parent on public.signal_options;
create policy signal_options_delete_own_parent
on public.signal_options
for delete
to authenticated
using (
  exists (
    select 1
    from public.signal_questions
    join public.signal_surveys on signal_surveys.id = signal_questions.survey_id
    where signal_questions.id = signal_options.question_id
      and signal_surveys.user_id = (select auth.uid())
  )
);

drop policy if exists signal_responses_insert_published on public.signal_responses;
create policy signal_responses_insert_published
on public.signal_responses
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_responses.survey_id
      and signal_surveys.status = 'published'
  )
);

drop policy if exists signal_responses_select_owner_or_public_results on public.signal_responses;
create policy signal_responses_select_owner_or_public_results
on public.signal_responses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_responses.survey_id
      and (
        signal_surveys.user_id = (select auth.uid())
        or (
          signal_surveys.status = 'published'
          and signal_surveys.show_results_to_voters = true
        )
      )
  )
);

drop policy if exists signal_answers_insert_published on public.signal_answers;
create policy signal_answers_insert_published
on public.signal_answers
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.signal_responses
    join public.signal_surveys on signal_surveys.id = signal_responses.survey_id
    where signal_responses.id = signal_answers.response_id
      and signal_responses.survey_id = signal_answers.survey_id
      and signal_surveys.status = 'published'
  )
);

drop policy if exists signal_answers_select_owner_or_public_results on public.signal_answers;
create policy signal_answers_select_owner_or_public_results
on public.signal_answers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.signal_surveys
    where signal_surveys.id = signal_answers.survey_id
      and (
        signal_surveys.user_id = (select auth.uid())
        or (
          signal_surveys.status = 'published'
          and signal_surveys.show_results_to_voters = true
        )
      )
  )
);

revoke all on table public.signal_surveys from anon, authenticated;
grant select (
  id,
  link_vitrine_id,
  title,
  description,
  slug,
  status,
  show_results_to_voters,
  show_in_link_vitrine,
  created_at,
  updated_at,
  published_at,
  closed_at
) on table public.signal_surveys to anon;
grant select, insert, update, delete on table public.signal_surveys to authenticated;

revoke all on table public.signal_questions from anon, authenticated;
grant select (
  id,
  survey_id,
  question_text,
  position,
  question_type,
  parent_question_id,
  parent_option_id,
  created_at
) on table public.signal_questions to anon;
grant select, insert, update, delete on table public.signal_questions to authenticated;

revoke all on table public.signal_options from anon, authenticated;
grant select (
  id,
  question_id,
  option_text,
  position,
  created_at
) on table public.signal_options to anon;
grant select, insert, update, delete on table public.signal_options to authenticated;

revoke all on table public.signal_responses from anon, authenticated;
grant insert (
  id,
  survey_id,
  voter_token_hash,
  completed_at
) on table public.signal_responses to anon, authenticated;
grant select (
  id,
  survey_id,
  completed_at,
  created_at
) on table public.signal_responses to anon, authenticated;

revoke all on table public.signal_answers from anon, authenticated;
grant insert (
  id,
  response_id,
  survey_id,
  question_id,
  option_id
) on table public.signal_answers to anon, authenticated;
grant select (
  id,
  response_id,
  survey_id,
  question_id,
  option_id,
  created_at
) on table public.signal_answers to anon, authenticated;

revoke all on function public.set_signal_surveys_updated_at() from public;
