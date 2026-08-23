# Migrating this app to your own Supabase project

Target project: `sizxlgxdawklesbkxmfb` (`https://sizxlgxdawklesbkxmfb.supabase.co`)

Everything in this folder is a complete export of the current backend:

| File | What it is |
| --- | --- |
| `01_schema_public.sql` | All tables, enums, functions, triggers, RLS policies, grants, indexes |
| `02_auth_users.sql` | All 27 accounts (`auth.users` + `auth.identities`) **including password hashes**, so people keep their existing passwords |
| `03_data_public.sql` | All app data — profiles, categories, items, QR pages, business pages, products, scans, permissions, UPI payments, scan history |
| `05_storage_files.csv` + `05_copy_storage_files.mjs` | The 64 uploaded files (images, videos, PDFs, avatars) and a script that copies them into the new bucket |
| `06_rewrite_storage_urls.sql` | Rewrites every stored file URL from the old host to the new one |

## Important: this project is a Vite + React app, not Next.js

The snippets you pasted (`@supabase/ssr`, `utils/supabase/server.ts`, `middleware.ts`,
`NEXT_PUBLIC_*`) are for Next.js and do not apply here. This app uses a single browser
client at `src/integrations/supabase/client.ts`, which reads `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`. Nothing in the app code has to change — only which
project those two variables point at.

That switch is a platform-level action I cannot perform from the chat: the `.env` file
and the client file are managed by Lovable Cloud. See step 6.

---

## Step-by-step

### 1. Run the schema
In the new project → **SQL Editor** → paste and run `01_schema_public.sql`.

### 2. Enable required extensions (if the schema run complains)
```sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
```
`pgcrypto` is required — `set_qr_password` / `verify_qr_password` use `crypt()` and `gen_salt()`.

### 3. Migrate the accounts
Run `02_auth_users.sql`. It temporarily removes the `on_auth_user_created` trigger,
loads users and identities (password hashes included), then puts the trigger back.
Everyone can sign in with the same email + password afterwards.

### 4. Load the app data
Run `03_data_public.sql`.

### 5. Copy the uploaded files
```bash
cd supabase-migration
npm install @supabase/supabase-js
NEW_SUPABASE_URL=https://sizxlgxdawklesbkxmfb.supabase.co \
NEW_SERVICE_KEY=sb_secret_xxxxxxxxxxxx \
node 05_copy_storage_files.mjs
```
It creates the public `uploads` bucket and copies all 64 files with the exact same paths.
Then run `06_rewrite_storage_urls.sql` in the SQL editor.

### 6. Point the app at the new project
In Lovable: open the Supabase integration and connect your own project
(`sizxlgxdawklesbkxmfb`) instead of the managed Cloud backend. Lovable then rewrites
`.env` with the new `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
(`sb_publishable_9C53mB5TJqUxlusG-Z4hmA_Gx0-BSon`) and regenerates
`src/integrations/supabase/types.ts`. Do not hand-edit those files.

### 7. Redeploy the edge functions
Three functions live in `supabase/functions/`: `verify-recaptcha`, `resolve-upi`,
`get-analytics`. Deploy them to the new project:
```bash
supabase link --project-ref sizxlgxdawklesbkxmfb
supabase functions deploy verify-recaptcha --no-verify-jwt
supabase functions deploy resolve-upi --no-verify-jwt
supabase functions deploy get-analytics --no-verify-jwt
```

### 8. Re-add the secrets (Edge Functions → Secrets)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
You must add these yourself:

- `RECAPTCHA_SECRET_KEY`
- `RECAPTCHA_SITE_KEY`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GA_SERVICE_ACCOUNT_EMAIL`
- `GA_PRIVATE_KEY`
- `GA_PROPERTY_ID`

And in the app's build env: `VITE_RECAPTCHA_SITE_KEY`, `VITE_GOOGLE_MAPS_API_KEY`.

### 9. Google sign-in (manual, dashboard only)
**Authentication → Providers → Google**
- Enable Google: **ON**
- **Client ID / Client Secret**: your Web application OAuth credentials from Google Cloud Console
- **Authorized Client IDs**: add your **Android** OAuth client ID (needed for the Flutter APK's native ID-token sign-in)
- **Skip nonce check**: ON (required for the Android ID-token exchange)

In **Google Cloud Console → Credentials → your Web client**, add the redirect URI:
```
https://sizxlgxdawklesbkxmfb.supabase.co/auth/v1/callback
```

**Authentication → URL Configuration**
- Site URL: your published app URL
- Redirect URLs: add the published URL, the Lovable preview URL, `http://localhost:8080/**`, and your app URLs with `/**`

**Authentication → Providers → Email**: keep "Confirm email" set the same as today (currently off, users are auto-confirmed), otherwise existing flows will break.

**Authentication → Policies / Password**: turn on "Leaked password protection" (HIBP) to match the current hardened setup.

### 10. Storage policies
The `uploads` bucket must be **public** with authenticated users allowed to upload.
The script creates it public; add the write policies in **Storage → Policies** if uploads fail.

### 11. Verify
- Sign in with an existing email + password, and with Google
- Open a public QR page `/p/{id}`, a store `/store/{slug}`, and `/pay?code={code}`
- Check images, PDFs and videos load (that confirms steps 5 + 6)
- Scan a QR and confirm analytics still record

---

## What could not be exported automatically
- **Old service-role key / DB password** — not accessible on Lovable Cloud, which is why the file copy uses the public bucket URLs instead.
- **Realtime publication settings** — re-enable realtime for any table you need it on.
- **Auth email templates and rate limits** — copy manually if you customised them.
