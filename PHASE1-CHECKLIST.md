# Phase 1 checklist
- [ ] Create Supabase project.
- [ ] Copy `config.js.example` to `config.js`, then set project URL and publishable/anon key.
- [ ] Allow localhost URL/redirects in Supabase Auth URL configuration.
- [ ] Enable Email and configure confirmation email.
- [ ] Configure Google OAuth and callback URL.
- [ ] Run `python3 -m http.server 8000`.
- [ ] Test email registration/confirmation, login, logout, Google, and password reset.
- [ ] Verify direct visits to app pages redirect to sign-in when signed out.

The app stays in demo mode until valid Supabase values are present in `config.js`.
