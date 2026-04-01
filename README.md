# AISmartCalendar v2

Class-centric planner with Google Calendar sync, fixed/flexible habits, and deterministic weekly schedule generation.

## Stack

- Next.js (App Router), React, TypeScript, Tailwind
- Supabase (Auth + Postgres + RLS)
- Vercel
- OpenAI (optional in this pivot branch; not required for weekly generator)

## Core v2 Features

- Google Calendar connect + sync into app calendar
- Class management with:
  - class code + class name
  - recurring weekly meeting slots in 15-minute intervals
- Sidebar class dropdown with direct class tabs
- Class-locked assignments:
  - name, due datetime, estimated completion time (15-minute granularity)
- Habits v2:
  - fixed habits (days + start/end)
  - flexible habits (duration + preferred days and/or times per week)
- Unified calendar layers:
  - imported external events
  - classes
  - fixed habits
  - generated weekly blocks
- Deterministic weekly scheduler:
  - Sunday-Saturday planning window
  - strict week order (cannot skip ahead)
  - assignment-minute allocation before due date

## Setup

1. Install

```bash
npm install
```

2. Supabase

- Create project and run `supabase/schema.sql` in SQL editor.
- Ensure auth works for your local/prod domains.

3. Google OAuth (Google Calendar)

Create OAuth client in Google Cloud Console (Web app):
- Authorized redirect URI (local):
  - `http://localhost:3000/api/integrations/google/callback`
- Authorized redirect URI (prod):
  - `https://<your-vercel-domain>/api/integrations/google/callback`

4. Environment (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

5. Run

```bash
npm run dev
```

## Deployment (Vercel)

Set the same env vars in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Then redeploy.

## Important Notes

- Existing v1 tables/routes (today/check-in/reflection) were removed from active app flow.
- If you already had old schema data, run the v2 schema migration in Supabase before using these routes.
