# AISmartCalendar

Calendar-aware AI productivity assistant for college students. Plan assignments, habits (including workouts and gym), and get daily action plans and weekly reflections.

## Stack

- **Next.js** (App Router), React, TypeScript, Tailwind
- **Supabase** — auth and PostgreSQL
- **OpenAI API** — task breakdown, daily plans, weekly reflections
- **Vercel** — deployment

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - Run the SQL in `supabase/schema.sql` in the SQL Editor (creates tables and RLS).
   - In Authentication > URL Configuration, add redirect URL: `http://localhost:3000/auth/callback` (and your production URL later).
   - In Settings > API copy the project URL and anon key.

3. **Environment**

   Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign up, add classes/assignments/habits, then use **Today** to generate a daily plan and **Check-in** for daily notes. **Reflection** gives an AI weekly summary.

## Deploy to Vercel

1. Push this repo to GitHub and connect it in [Vercel](https://vercel.com).
2. Add the same env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`.
3. In Supabase Authentication > URL Configuration, add your Vercel URL (e.g. `https://your-app.vercel.app/auth/callback`) as a redirect URL.
4. Deploy.

## Features

- **Classes** — manual schedule (e.g. Mon/Wed 10am).
- **Assignments** — due date, course, notes; “Break down with AI” for subtasks.
- **Habits** — e.g. Gym, Workout, Reading; duration and optional preferred time. The daily plan schedules 1–2 habits around academics.
- **Today** — AI-generated daily plan with study blocks (prioritized by due date) and 1–2 habits.
- **Check-in** — short daily reflection (how it went, blockers).
- **Reflection** — AI weekly summary (supportive, no guilt).

Guidance, not guilt. No streaks or punishment.
