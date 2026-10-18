-- LearnSphere account-specific persistence
-- Apply this migration in Supabase SQL Editor or with the Supabase CLI.
-- Private learning state is one JSONB document per authenticated UUID. The app's
-- existing UI can keep its current data shape while cloud storage becomes per-user.
create table if not exists public.user_learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_learning_state_state_object check (jsonb_typeof(state) = 'object')
);

alter table public.user_learning_state enable row level security;

drop policy if exists "Students read own learning state" on public.user_learning_state;
create policy "Students read own learning state"
  on public.user_learning_state for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Students create own learning state" on public.user_learning_state;
create policy "Students create own learning state"
  on public.user_learning_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Students update own learning state" on public.user_learning_state;
create policy "Students update own learning state"
  on public.user_learning_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Quiz history is stored as separate immutable attempt rows.
create table if not exists public.quiz_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  lesson_index integer not null check (lesson_index >= 0),
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0 and score <= max_score),
  correct_count integer not null check (correct_count >= 0 and correct_count <= max_score),
  incorrect_count integer not null check (incorrect_count >= 0 and incorrect_count <= max_score),
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_course_lesson_idx
  on public.quiz_attempts (user_id, course_id, lesson_index, completed_at desc);

alter table public.quiz_attempts enable row level security;

drop policy if exists "Students read own quiz attempts" on public.quiz_attempts;
create policy "Students read own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Students insert own quiz attempts" on public.quiz_attempts;
create policy "Students insert own quiz attempts"
  on public.quiz_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Intentionally no student UPDATE or DELETE policies for quiz attempts.
-- IMPORTANT: scores are currently computed in browser JavaScript because the
-- existing quiz questions live in a client-side file. For tamper-proof grading,
-- move question answer keys and grading into an Edge Function/database function.

drop policy if exists "Students delete own learning state" on public.user_learning_state;
create policy "Students delete own learning state"
  on public.user_learning_state for delete to authenticated
  using ((select auth.uid()) = user_id);
