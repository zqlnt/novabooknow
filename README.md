# Nova Org front shell

Institution management interface for Nova Education — dashboard, calendar, and information views with local or Supabase-backed data.

## Quick start (local)

```bash
npm run dev
```

Opens at http://localhost:3000 in **local database** mode (data saved in the browser).

Or open `index.html` directly — no build required for local mock mode.

## Connect Supabase

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a project and note:

- **Project URL** (Settings → API)
- **anon / publishable key** (public — safe for the browser)
- Never put the **service-role key** in this app

### 2. Apply the database schema

Run the SQL in either location:

- `supabase-schema.sql` (root), or
- `supabase/migrations/20260711000000_nova_org_schema.sql`

In the Supabase **SQL editor**, paste and run the full file. This creates tables, seed data, RLS policies, and the Nova organisation.

### 3. Create an Auth user and membership

1. In Supabase **Authentication → Users**, create a user (email + password).
2. Copy the user's UUID.
3. Run in the SQL editor (replace the UUID):

```sql
insert into public.organisation_members(organisation_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', 'YOUR-AUTH-USER-UUID', 'owner')
on conflict (organisation_id, user_id) do nothing;
```

### 4. Configure the app

**Option A — Deploy with environment variables (recommended)**

Copy `.env.example` to `.env`, fill in your values, then:

```bash
export $(grep -v '^#' .env | xargs)   # or set vars in your host dashboard
npm run build
```

**Option B — Manual connection in the UI**

Open the app → **Data connection** (lock icon) → choose **Supabase** → enter URL, anon key, organisation ID → **Sign in** with your Auth user.

## Deploy

The app is a static site. Build injects `config.js` from environment variables.

| Platform | Config file | Build command |
|----------|-------------|---------------|
| [Render](https://render.com) | `render.yaml` | `npm run build` |
| [Netlify](https://netlify.com) | `netlify.toml` | `npm run build` |
| [Vercel](https://vercel.com) | `vercel.json` | `npm run build` |

### Environment variables (all platforms)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes (for Supabase) | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes (for Supabase) | Public anon / publishable key |
| `NOVA_ORGANISATION_ID` | No | Defaults to Nova seed org UUID |
| `NOVA_PROVIDER` | No | Set to `supabase` when URL + key are set |

### Render

1. New **Static Site** → connect repo or upload folder.
2. Build command: `npm run build`
3. Publish directory: `.` (project root)
4. Add the environment variables above in the Render dashboard.

### Netlify / Vercel

Connect the repo; build settings are read from `netlify.toml` / `vercel.json`. Add the same environment variables in the project settings.

## Security

- Browser uses the **anon key** only; RLS enforces organisation access.
- Users must **sign in** via Supabase Auth to read or write live data.
- Do not commit `.env` or expose the service-role key.

## Project layout

```
index.html              Main app (single-file UI)
config.js               Generated deploy config (from env)
supabase-schema.sql     Full schema + seed data
supabase/migrations/    Migration copy for Supabase CLI
scripts/build-config.js Build step for static hosts
render.yaml             Render static site config
netlify.toml            Netlify config
vercel.json             Vercel config
```
