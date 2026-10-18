# LearnSphere

Responsive learning platform using HTML5, CSS3, Bootstrap 5, vanilla JavaScript, Bootstrap Icons, and Chart.js. Phase 1 adds a real Supabase Auth integration while preserving the existing dashboard, catalog, course pages, notes, quizzes, and profile experience.

## Run locally
1. Open Terminal in the project folder: `cd ~/Downloads/LearnSphere` (adjust the path if needed).
2. Create local configuration: `cp config.js.example config.js`.
3. Follow the Supabase setup below and edit `config.js`.
4. Start the server: `python3 -m http.server 8000`.
5. Visit `http://localhost:8000`. Do not open HTML files directly with `file://`.

CDN assets require internet access.

## Phase 1 authentication
- Email/password registration with name metadata and email confirmation support.
- Email/password login and Google OAuth.
- Password reset and password update flow.
- Persistent Supabase sessions, sign out, and app-page sign-in guard once configured.
- Redirect target validation to avoid external open redirects.
- Until a valid `config.js` is added, existing app pages remain available in demo mode.

## Supabase setup
1. Create a project at https://supabase.com/dashboard.
2. In project API/Connect settings, copy the Project URL and publishable key (or legacy `anon` key).
3. Copy `config.js.example` to `config.js` and replace both placeholders. These are browser values; never use a `service_role` key, database password, or secret in client code.
4. In Supabase Authentication → URL Configuration, set Site URL to `http://localhost:8000` and add redirect URLs `http://localhost:8000/**` and `http://localhost:8000/auth.html`.
5. Enable Email authentication and configure confirmation emails.
6. For Google, create an OAuth client in https://console.cloud.google.com/, add the callback URL shown in Supabase to authorized redirect URIs, then add the Google client ID and secret in Supabase Auth → Google provider settings. Use `http://localhost:8000` as an authorized JavaScript origin if requested.
7. Configure email provider/templates for confirmation and recovery emails. Provider UI labels may change, so follow the current Supabase provider guide if needed.

## Pages
- `index.html` — public landing page
- `auth.html` — register, login, Google OAuth, password recovery
- `dashboard.html` — dashboard and activity chart
- `courses.html` — 12-course catalog with filters and sorting
- `course.html?id=c1` — course overview and curriculum
- `learn.html?id=c1` — lesson navigation, progress, lesson notes
- `quiz.html` — five-question quiz and best score
- `notes.html` — searchable and editable notes
- `profile.html` — profile, preferences, data export/reset

## What is not implemented yet
Enrollment approvals, admin roles and dashboard, course/subject/lesson authoring, secure PDF storage, hosted video integration, and cloud-synced progress are later phases. In Phase 1, existing course progress, enrollment, notes, profile settings, and quiz results still use browser `localStorage`; they are not yet synced between devices or users. Do not use browser storage or frontend role flags as secure authorization. Phase 2 should move enrollment and progress into database tables protected by Supabase Row Level Security (RLS).


## Account-specific Supabase persistence (Phase 2)

The app now stores signed-in student state in `public.user_learning_state`, keyed by
the authenticated Supabase UUID. The JSONB state document preserves the current
app's data shape for enrollments, lesson completion/progress, notes, best quiz
scores, and profile preferences. `public.quiz_attempts` stores a separate history
row for each submitted quiz. Both tables have Row Level Security policies that
restrict access to the authenticated owner.

### Apply the migration

1. Open Supabase Dashboard → SQL Editor.
2. Run `supabase/migrations/20261018_account_specific_persistence.sql`.
3. Reload the app and sign in. Verify that the migration succeeded if the app
   displays a data-loading error.
4. Test with two real accounts and verify each sees only their own data.

### Data migration caveat

Old shared `localStorage` values are not automatically imported. They cannot be
safely attributed to a user. The app uses UUID-namespaced browser cache keys for
signed-in users and loads the authoritative state from Supabase. If you need to
keep old data, export it while signed in as the account that owns it and migrate
only after confirming its owner. Existing demo seed notes and demo enrollments
are not copied into new authenticated accounts.

### Important limitations

- The current enrollment, notes, progress, and profile records are stored inside
  each user's `user_learning_state.state` JSON document rather than normalized
  into separate relational tables. RLS protects the entire document by owner.
- This project currently enrolls immediately in the client; no admin-approval
  workflow was present in the inspected source to preserve or test.
- Quiz attempt rows are owner-protected, but grading still runs in browser code
  because question answer keys are in `quiz-content.js`. A determined user can
  tamper with client-side grading. For high-integrity scores, move questions and
  grading to a trusted Edge Function or database function.
- The migration has not been applied to your live Supabase project by this code
  change. Apply it manually and complete two-account verification.
