# Supabase setup and deployment

The works page keeps its Supabase session and uses Row Level Security (RLS) for database writes. Visitors can read works and images, while the configured owner account is the only account allowed to add, edit, or delete them. The PIN is checked by a Supabase Edge Function; it is not included in the website JavaScript. The function exchanges a valid PIN for a one-time Supabase Auth link for the configured owner.

## 1. Create the owner account and database

1. Create a project at [supabase.com](https://supabase.com/).
2. In **Authentication → Users**, create the owner's Auth account. Use an email you control. Public sign-ups should remain disabled.
3. Copy that account's **User UID**.
4. In `supabase-setup.sql`, confirm the `owner_id` UUID matches the owner's UID, then run the full SQL file in **SQL Editor**. This creates the works table, RLS policies, public image bucket, and private PIN-attempt rate-limit table/functions.
5. In **Project Settings → API**, find the Project URL and publishable/anon key. Put these in `supabase-config.js`. Never place the `service_role` key there.

The Auth account is still needed by Supabase, but the website owner signs in with the PIN. The PIN is exchanged server-side for a short-lived, one-time Auth token.

## 2. Set the server-side PIN and allowed website origins

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), open PowerShell in the project folder, and create a private environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

- Set `OWNER_PIN` to a private random numeric PIN of 10–12 digits. Prefer all 12 digits. Do not use a birthday or another easy-to-guess number.
- Set `OWNER_EMAIL` to the exact email of the owner account created in step 1.
- Set `ALLOWED_ORIGINS` to the exact origins where this site will run, comma separated, with no trailing slash. For local testing use `http://localhost:8000`; add your production origin when known.

`.env` is ignored by Git. Never share it, commit it, or put the PIN in `supabase-config.js`, HTML, or JavaScript. The PIN is stored as a Supabase Function secret when deployed.

## 3. Deploy the Edge Function

In PowerShell, run:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set --env-file .env
supabase functions deploy owner-pin-login --no-verify-jwt
```

Replace `YOUR_PROJECT_REF` with the project reference shown in the Supabase project URL or Dashboard. The Supabase CLI supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime; do not copy the service-role key into the website. The function uses the service role only on the server to create the one-time owner sign-in link.

The function allows at most five PIN attempts per client IP in a 15-minute window using the database rate-limit functions created by `supabase-setup.sql`.

### Local-only 4-digit PIN test

The project includes an ignored `.env.local-test` with the requested test PIN `2548`. This PIN is accepted only when the Edge Function connects to a local Supabase host and `ALLOW_SHORT_PIN_FOR_LOCAL_TEST=true`; the hosted Supabase function will reject 4-digit PINs even if that flag is accidentally set. Do not run `supabase secrets set` with this file or deploy this PIN.

For a complete local test, start the local Supabase stack with Docker and Supabase CLI, create a local Auth owner, update the local `site_settings.owner_id` to that local user's UID, and replace `OWNER_EMAIL` in `.env.local-test` with that account's email. Serve the function locally with:

```powershell
supabase start
supabase functions serve owner-pin-login --env-file .env.local-test --no-verify-jwt
```

Temporarily point `supabase-config.js` at the local Supabase API URL and local publishable/anon key, run the static site at `http://localhost:8000`, and restore the production project URL/key afterward. Use a 10–12 digit secret for any hosted environment.

## 4. Run locally and verify

Serve the website over HTTP (opening `file://` does not work reliably with Supabase):

```powershell
py -m http.server 8000
```

Open `http://localhost:8000/works.html`. The PIN login should only work if `http://localhost:8000` is included in `ALLOWED_ORIGINS` and the Edge Function is deployed with the matching secrets.

Test that:

1. Signed-out visitors can view works but do not see add, edit, or delete controls.
2. Entering the correct PIN signs in the owner and enables the controls.
3. Entering an incorrect PIN fails; after five attempts from the same IP, further attempts are rate-limited for 15 minutes.
4. Direct writes from an unauthenticated or non-owner session are rejected by RLS.

## 5. Deploy the static website

Deploy the website folder to a static host such as Netlify, Cloudflare Pages, or GitHub Pages. Add the deployed origin to `ALLOWED_ORIGINS` in `.env`, then update the Supabase Function secret:

```powershell
supabase secrets set --env-file .env
```

Add the production site's URL under **Authentication → URL Configuration → Redirect URLs**. Keep the publishable/anon key in `supabase-config.js`; never publish the service-role key or PIN. Test the production URL in a private browser before sharing with your teacher.

## Notes

- Shared work records and publicly viewable images are stored in Supabase, not in one browser's local storage.
- Images can be read by anyone with the site link; only the owner can upload or delete them.
- Existing works stored in the previous localStorage/IndexedDB version are not migrated automatically.
- The current browser PIN login can be protected by the server-side rate limit, but protect the PIN like a password and rotate it periodically with `supabase secrets set --env-file .env`.
- The Supabase client library is loaded from jsDelivr, so visitors need access to that CDN.
