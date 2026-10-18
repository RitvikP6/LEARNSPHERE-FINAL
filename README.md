# LearnSphere â€” Project Guide

**LearnSphere** is a responsive learning management system (LMS) built with HTML, CSS, Bootstrap 5, vanilla JavaScript, Bootstrap Icons, and Chart.js. It includes a course catalog, course/lesson navigation, Knowledge Check quizzes, notes, a student dashboard, profile settings, and Supabase authentication/cloud persistence.

> **Status note:** This README documents the project files and intended setup. SQL files must still be run in your own Supabase project, and account isolation must be verified by testing two separate accounts. A successful local build does not prove the live Supabase setup is correct.

## Contents

- [Features](#features)
- [Project file guide](#project-file-guide)
- [Requirements and local setup](#requirements-and-local-setup)
- [Connect LearnSphere to Supabase](#connect-learnsphere-to-supabase)
- [Configure `config.js`](#configure-configjs)
- [SQL files: what to run](#sql-files-what-to-run)
- [Authentication setup](#authentication-setup)
- [How account-specific storage works](#how-account-specific-storage-works)
- [Run and troubleshoot](#run-and-troubleshoot)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Two-account test checklist](#two-account-test-checklist)

## Features

### Student-facing features

- Landing page and responsive layout.
- Email/password registration and login, with support for email confirmation.
- Google sign-in through Supabase Auth, when configured in Supabase.
- Password recovery and password update flow.
- Persistent Supabase authentication session and sign-out.
- Dashboard with learning/activity summary and chart.
- Course catalog with course search/filter/sort UI and course overview pages.
- Course workspace with subject/lesson navigation, lesson completion/progress, and lesson notes.
- Knowledge Check quiz interface, score display, answer feedback, and best-score display.
- Notes page with searching/editing behavior.
- Profile/preferences and data export/reset UI.
- Account-specific cloud state for signed-in users after the database migration has been applied.
- Quiz-attempt history in a separate Supabase table.
- Learning Room UI/media/resource code has been removed. `learn.html` remains as a compatibility redirect for old links; use `workspace.html` for course learning.

### Account-specific data

The current implementation stores a user's enrollments, lesson progress, notes, best quiz scores, and profile preferences in that user's row in `public.user_learning_state`. Individual quiz submissions are stored in `public.quiz_attempts`. Both tables use Row Level Security (RLS) policies based on the authenticated Supabase UUID.

The course catalog/content is shared application content; student activity and preferences should be private to each account.

## Project file guide

| File or folder | Purpose |
|---|---|
| `index.html` | Public landing page and entry point. |
| `auth.html` | Registration, login, Google OAuth, and password recovery UI. |
| `auth.js` | Authentication page behavior and sign-in/sign-up flows. |
| `auth-client.js` | Shared Supabase authentication/session helper used by app pages. |
| `config.js` | Local Supabase project URL and browser-safe publishable/anon key. You create or edit this file for your project. |
| `config.js.example` | Safe template to copy to `config.js`. |
| `app.js` | Main application logic, page rendering, course state, notes, progress, quiz persistence, and cloud-state handling. |
| `style.css` | Shared responsive styling. |
| `dashboard.html` | Student dashboard page. |
| `courses.html` | Course catalog and discovery page. |
| `course.html` | Course overview page; supports a course ID such as `?id=c1`. |
| `workspace.html` | Learning workspace for subjects, lessons, completion, and notes. |
| `learn.html` | Compatibility redirect for older Learning Room/lesson links; not the active workspace. |
| `mycourses.html` | My Courses page. |
| `quiz.html` | Knowledge Check quiz page. |
| `quiz-content.js` | Quiz question/answer configuration used by the client-side quiz. Review its schema before adding questions. |
| `lesson-content.js` | Lesson content/configuration used by the learning interface, where included in the project version. |
| `notes.html` | Notes interface. |
| `profile.html` | Profile and preferences interface. |
| `workspace.html` | Active learning workspace; use this rather than the retired Learning Room. |
| `supabase/migrations/20261018_account_specific_persistence.sql` | Creates account-owned cloud state and quiz-attempt tables plus RLS policies. **Required for cloud persistence.** |
| `supabase/migrations/20261018_remove_learning_room_state.sql` | Optional cleanup migration for the retired Learning Room's `ls_recent` state key. It makes a backup before removing that key. It is not required to connect Supabase. |
| `PHASE1-CHECKLIST.md` | Project checklist for the initial authentication phase. |
| `.gitignore` | Excludes local configuration such as `config.js` from Git. Keep this behavior. |

> File lists can differ slightly between project ZIP versions. Use the files actually present in your downloaded ZIP. Do not create duplicate files just because a file is mentioned in this guide.

## Requirements and local setup

- A modern browser.
- Python 3 for the simple local HTTP server (or another static web server).
- A Supabase account/project.
- Internet access for Supabase and CDN-loaded libraries.

1. Extract the LearnSphere ZIP into a project folder, for example `~/Downloads/LearnSphere`.
2. Open Terminal and move into that folder:

   ```bash
   cd ~/Downloads/LearnSphere
   ```

3. Create your local config file from the template:

   ```bash
   cp config.js.example config.js
   ```

   If `config.js` already exists, back it up before replacing it.

4. Edit `config.js` as explained below.
5. Start the local server:

   ```bash
   python3 -m http.server 8000
   ```

6. Open `http://localhost:8000` in your browser. **Do not open the HTML files with a `file://` URL.**

## Connect LearnSphere to Supabase

### 1. Create or open a Supabase project

1. Visit <https://supabase.com/dashboard> and open your project (or create one).
2. In the project **Connect** or **Settings â†’ API** area, copy:
   - Project URL, for example `https://YOUR-PROJECT-REF.supabase.co`
   - Publishable key, or the legacy `anon` key if that is what your project provides.
3. Do not copy the database password or `service_role` key into the frontend.

### 2. Set up `config.js`

Open `config.js` in your editor. It should have this shape, with your own project's values:

```js
window.LEARNSPHERE_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
```

Replace both placeholder strings. Keep the property names exactly as shown. Do not add `service_role` keys, private API keys, or database passwords here. The publishable/anon key is designed for browser use, but it must be protected by correct RLS policies.

`config.js.example` is the template; `config.js` is the active local configuration file loaded by the app. If you change projects, update the URL and key together so they belong to the same Supabase project.

### 3. Run the required SQL migration

The essential migration is:

`supabase/migrations/20261018_account_specific_persistence.sql`

You can apply it through the Supabase Dashboard:

1. Open **Supabase Dashboard â†’ SQL Editor**.
2. Choose a new query.
3. Open the SQL migration file from your extracted LearnSphere folder in a text editor.
4. Copy the **entire file contents** and paste them into the SQL Editor.
5. Run the query.
6. Confirm there are no SQL errors.
7. In **Table Editor**, confirm these tables exist:
   - `public.user_learning_state`
   - `public.quiz_attempts`
8. Check that RLS is enabled on both tables.

Do not copy only part of the migration. Do not create a second version of these tables manually if the migration already created them. If a query fails, read the error and inspect the existing schema before rerunning or altering anything.

### 4. Optional retired Learning Room cleanup migration

`supabase/migrations/20261018_remove_learning_room_state.sql` is **optional** and is not needed to connect authentication or cloud persistence. It backs up affected rows into `public.learning_room_state_cleanup_backup_20261018`, then removes the old `ls_recent` key from `user_learning_state.state`. Only run it if you specifically want that old Learning Room state cleaned up and have reviewed the SQL. It is designed not to delete enrollments, notes, scores, or progress, but always review database changes before running them.

### 5. Configure local authentication URLs

In Supabase Dashboard, open **Authentication â†’ URL Configuration**:

- Set **Site URL** to `http://localhost:8000` while developing locally.
- Add `http://localhost:8000/**` to Redirect URLs.
- Add `http://localhost:8000/auth.html` if the dashboard expects the exact callback/redirect page.
- If you also use `http://127.0.0.1:3000`, add the exact URLs you use for that local server too. `localhost` and `127.0.0.1` are different hostnames, and port `8000` and port `3000` are different origins.

For production, add your real HTTPS domain and the redirect URLs used by your deployed app.

### 6. Enable email authentication

In Supabase **Authentication â†’ Providers** (or the current equivalent):

1. Enable Email authentication.
2. Configure confirmation emails and password recovery settings as needed.
3. Check the email templates and redirect URLs if confirmation/recovery links return to the wrong page.

### 7. Configure Google sign-in (optional)

1. In Google Cloud Console, create or select an OAuth client.
2. In Supabase Authentication â†’ Providers â†’ Google, enable Google and enter the client ID and client secret supplied by Google.
3. Copy the callback URL displayed by Supabase and add it to Google's **Authorized redirect URIs**.
4. If Google asks for an authorized JavaScript origin, add the local origin you use, such as `http://localhost:8000`.
5. Save the settings and test Google login from `auth.html`.

Do not put the Google client secret into `config.js` or any browser JavaScript. Supabase stores the provider secret.

## SQL files: what to run

| SQL file | Required? | What it does |
|---|---|---|
| `supabase/migrations/20261018_account_specific_persistence.sql` | **Yes, for account-specific cloud data** | Creates `user_learning_state` and `quiz_attempts`, adds an index, enables RLS, and creates policies so signed-in users can read/write only their own learning-state row and read/insert their own quiz attempts. |
| `supabase/migrations/20261018_remove_learning_room_state.sql` | No â€” optional cleanup | Backs up affected user state rows, then removes the retired `ls_recent` key. Not required for Supabase setup. Review before running. |

The SQL file is already included in the project ZIP. You do not need to invent a new SQL schema for the setup described here.

## How account-specific storage works

- Supabase Auth supplies the authenticated user's UUID.
- `public.user_learning_state.user_id` is the primary key and references `auth.users(id)`.
- Each row's `state` JSON document contains the current app's personal state shape (such as enrollments, progress, notes, best quiz scores, and preferences).
- `public.quiz_attempts` stores separate submitted quiz attempts, including course/lesson identifiers, score, answer data, and timestamps.
- RLS policies compare the row owner to `auth.uid()` so one authenticated student cannot read another student's rows through the normal Supabase API.
- The app uses a UUID-specific browser cache key for signed-in users, but Supabase should remain the authoritative persistent source.

### Existing localStorage data

Old shared `localStorage` data is not automatically assigned to a user because the app cannot safely determine which account owns it. If you need to keep old data, export it while signed in as the account that owns it, verify ownership, and migrate it deliberately. Do not import ambiguous shared data into whichever account logs in first.

## Run and troubleshoot

### Session verification error

If the app says it could not verify your session:

1. Check that `config.js` contains the correct URL and publishable/anon key from the same project.
2. Confirm the Supabase project is available and your network works.
3. Confirm the local server is running and you are using the same origin you configured in Supabase.
4. Open browser DevTools â†’ Console and read the first actual error. `Failed to fetch` often indicates connectivity, URL, or browser-origin issues; a missing-table or permission error usually points to SQL/RLS setup.
5. Sign in again after confirming the configuration. Do not disable RLS as a workaround.

### Cloud data load error

- Confirm `public.user_learning_state` and `public.quiz_attempts` exist.
- Confirm the migration ran successfully.
- Confirm the user is signed in and has a valid Supabase session.
- Inspect the exact database error and RLS policy configuration.

### Google login returns to the wrong URL

Check Supabase URL Configuration, Google OAuth redirect URI, and the URL used by the local server. Add the exact local origin/redirect URL that the app uses.

## Security notes

- Never place the Supabase `service_role` key or database password in `config.js`, HTML, JavaScript, or a public repository.
- Keep RLS enabled on private tables. Do not solve permission errors by turning RLS off.
- Use the authenticated UUID, not a display name or email address, to identify the owner of personal data.
- Client-side flags are not secure admin authorization.
- Quiz grading currently happens in browser JavaScript because question content/answer keys are client-side. RLS protects quiz-attempt ownership but does **not** make client-calculated scores tamper-proof. For high-integrity scores, move answer keys and grading to a trusted server-side function.
- Do not assume admin approval, admin course management, protected PDF storage, or hosted video features exist unless they have been implemented and separately verified in your current project version.

## Known limitations

- Enrollments, notes, progress, and profile preferences currently live together in a per-user JSONB state document rather than separate relational tables.
- The current implementation does not provide a verified admin-approval workflow; the inspected project enrolls immediately in the client.
- Quiz scores are client-calculated and can be manipulated by a determined user until grading moves server-side.
- Old shared localStorage values are not automatically migrated.
- The SQL migration has to be run manually in the user's Supabase project. It has not been applied automatically by downloading this project.
- A successful setup must still be validated with two separate authenticated accounts.

## Two-account test checklist

After configuring Supabase and running the required migration:

1. Sign in as **Account A**.
2. Enroll in a course, complete a quiz, save a note, and record lesson progress.
3. Sign out.
4. Sign in as **Account B**.
5. Confirm Account A's personal enrollments, scores, notes, and progress are not shown.
6. Create separate learning data for Account B and sign out.
7. Sign back in as Account A and confirm only Account A's data is restored.
8. Repeat after refreshing the browser and navigating between pages.
9. Inspect the Supabase API/Database behavior and verify RLS prevents cross-account reads and writes.

Do not consider account isolation verified until these tests pass with two different authenticated Supabase users.