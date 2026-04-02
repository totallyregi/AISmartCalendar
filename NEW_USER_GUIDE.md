# AISmartCalendar - New User Guide

This guide explains how to use the web application from start to finish as a new user, including all main features and the recommended workflow.

---

## 1) What This App Does

AISmartCalendar helps you plan your week by combining:

- Your fixed commitments (classes, fixed habits, personal events, imported calendar events)
- Your flexible work (assignments and flexible habits)
- AI scheduling suggestions you can review before applying

It is designed so you can plan safely in the AI workspace first, then apply only what you want to your main calendar.

---

## 2) First-Time Setup (Start Here)

### Step 1: Sign up / Log in

- Open the app.
- Create an account or sign in.
- After login, you enter the protected app area with the left sidebar.

### Step 2: Understand the Sidebar

You can navigate to:

- `Calendar` - your main (applied/fixed) calendar
- `AI Calendar` - planning workspace for generated suggestions
- `Classes` - class sections and meeting times
- `Habits` - fixed and flexible habits
- `To-do List` - assignments board/list
- `Preferences` - scheduler settings, timezone, work windows

The sidebar can be collapsed/expanded using the arrow button.

---

## 3) Preferences (Set Before Generating AI Plans)

Go to `Preferences` and configure:

## Daily workload limits

- Min daily hours
- Preferred daily hours
- Max daily hours
- Max consecutive hours
- Break minutes

These values influence how aggressively AI fills your day.

## Timezone

- Default is `America/Chicago` (New Orleans / US Central).
- You can change it anytime.
- All scheduling and displayed local times use this timezone.

## Preferred work days

- Pick which weekdays are valid workdays for assignment planning behavior.

## Preferred work windows

Add windows per day using:

- `Day` placeholder
- `Start Time` placeholder
- `End Time` placeholder

You can add multiple windows to the same day (for example, 9:00-12:00 and 14:00-17:00).  
AI can schedule work inside those allowed windows while respecting busy events.

---

## 4) Classes

Go to `Classes` to add each class section:

- Class code and class name
- One or more weekly meeting slots
- Day dropdown uses full weekday names
- Time is in 12-hour format (AM/PM)

Class meetings appear as fixed events in your calendar.

You can:

- Edit class details
- Delete classes
- Open individual class pages

---

## 5) Habits

Go to `Habits` and choose between two types.

## A) Fixed Habit

Use this for routines at exact times (for example, gym every Monday 8 PM).

- Add fixed slots (day + start + end)
- Appears as recurring fixed events

## B) Flexible Habit

Use this for habits AI should place dynamically.

Required setup:

- Duration (hours + minutes, 15-minute increments)
- Preference mode:
  - `Preferred days`
  - `Times per week`

### Flexible mode: Preferred days

- Select specific days
- Add preferred hour windows by day

### Flexible mode: Times per week

- Enter how many sessions per week
- AI distributes sessions across days
- Supports values greater than 7 (multiple sessions on some days)

Important: the form enforces valid combinations so data persists correctly.

---

## 6) Assignments (To-do List)

Go to `To-do List` to manage assignments:

- Add assignment name
- Set due date/time
- Set estimated/remaining workload
- Track status (`not_started`, `in_progress`, `done`)

When an assignment is deleted, related AI/applied calendar blocks for that assignment are also removed.

---

## 7) Main Calendar vs AI Calendar

## Main Calendar (`Calendar`)

This is your real calendar state:

- Classes
- Fixed habits
- Flexible habits that were applied
- Assignments that were applied
- Personal events
- Imported external events

Generated drafts are not shown as "generated" here; events use semantic colors.

## AI Calendar (`AI Calendar`)

This is your planning sandbox:

- Generate suggestions for the current/next week flow
- Review draft blocks before applying
- Drafts use the generated color while still temporary

Once applied, they become normal event types.

---

## 8) AI Scheduling Workflow (Recommended Weekly Flow)

1. Configure `Preferences` first.
2. Keep `Classes` and `Habits` up to date.
3. Add/update `Assignments`.
4. Open `AI Calendar`.
5. Click generate for the target week.
6. Review suggested blocks in:
   - Month cells (inline previews + dots)
   - Day details timeline
7. Apply AI schedule to Calendar when satisfied.
8. Open `Calendar` to see applied results.

The generator avoids overlapping with existing busy events (including applied blocks and personal events).

If deadlines are tight and not all assignment work fits preferred windows, the app may schedule in broader available slots or show a warning if not fully schedulable.

---

## 9) Calendar UI Features

## Month grid

- Day cells show color dots by source
- Inline event previews show `time + title`
- Previews are color-coded by event type
- Previews are sorted earliest-to-latest by local timezone
- `+N more` appears when a day has more events than preview limit

## Day details panel

Select a date to see full itemized timeline:

- Source badge
- Start/end time
- Event title
- Edit/delete actions (where supported)

---

## 10) Personal Events

From the main calendar header, use `Add personal event` to add one-off events.

These events:

- Block scheduling time as busy
- Show on calendar and in day details
- Can be edited/deleted

---

## 11) Google Calendar Integration

In `Calendar`, use the Google connection card to:

- Connect account
- Sync imported events
- Disconnect integration

Imported events are treated as busy time and are visible in calendar views.

---

## 12) Colors and Event Types

Legend colors represent:

- External
- Class
- Fixed habit
- Flexible habit
- Assignment
- Personal
- Generated (AI draft view only)

This keeps planning vs applied states visually clear.

---

## 13) Mobile Usage

The app is responsive and supports phone usage:

- Sidebar is toggleable
- Sidebar can overlay content on smaller screens
- Calendar is horizontally scrollable on small devices for readability

Tip: collapse sidebar while reviewing calendar details on a phone.

---

## 14) Common Best Practices

- Save `Preferences` before generating AI plans.
- Keep assignment `remaining_minutes` accurate for better planning.
- Use realistic work windows per day.
- Apply drafts only after review in AI Calendar.
- Re-generate when priorities change.

---

## 15) Quick Troubleshooting

- **No schedule generated**: check if preferences and work windows are configured.
- **Too little planned before due date**: increase availability windows or reduce conflicting events.
- **Unexpected event crowding**: review existing applied blocks, personal events, and imported events.
- **Flexible habit duplicates**: applied flexible habits are tracked to avoid duplicate regeneration for the same week.

---

## 16) End-to-End Example (One Week)

1. Add classes (Mon/Wed lectures).
2. Add fixed habit (Gym Tue/Thu 8 PM).
3. Add flexible habit (Reading 1 hour, preferred days Mon-Fri, 6 PM-8 PM).
4. Add assignments with due dates and estimates.
5. Set preferences:
   - Preferred daily 3h
   - Max daily 5h
   - Work windows for each day
6. Generate AI schedule in AI Calendar.
7. Review and adjust drafts if needed.
8. Apply to main Calendar.
9. Execute tasks during the week.
10. Update remaining assignment minutes and regenerate as needed.

---

If you want, I can also generate a shorter `QUICK_START.md` (2-3 minute setup) and keep this file as the full manual.
