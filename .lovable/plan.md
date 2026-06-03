## Goals

1. Capture a reason whenever a member is marked Absent.
2. Show a "Habitual Absentees" list alongside the Achievers (≥3 absences in the current quarter).
3. Convert the Achievers page from monthly to quarterly (Q1–Q4).

## 1. Absence reason

**Database**
- Add a nullable `reason` text column to `public.attendance` via migration.

**Attendance UI (`AttendancePage.tsx`)**
- When the user clicks "Mark Absent" (or auto-close marks remaining members), open a dialog with:
  - Radio/select options: Sick, Travel, Work, Family, Other
  - Free-text input shown when "Other" is selected (required if Other)
- Submit calls a new `markAttendance(member_id, date, "Absent", reason)`; reason is saved on the row.
- For the bulk "Close Attendance" action, ask once for a default reason (e.g. "Not specified") applied to all auto-absences, with the option to edit individually later.
- Display the reason in the attendance table next to the Absent badge (small muted text or tooltip).
- Allow editing the reason via a small pencil icon for existing Absent rows.

**Queries (`lib/queries.ts`)**
- Update `markAttendance` and `bulkMarkAbsent` signatures to accept an optional `reason`.

## 2. Habitual Absentees (quarterly)

- On the Achievers page, add a new section "Habitual Absentees — Q{n} {year}" listing every choir member with ≥3 Absent records within the active quarter's date range.
- Each row shows: name, part, absence count, attendance %, and the most recent reason(s) (comma-joined, truncated).
- Sorted by absence count descending.
- Styled with destructive accent (red tint) to contrast with the achievers' accent styling.

## 3. Quarterly Achievers

- Replace the monthly `<input type="month">` with a quarter selector: a year input + a Q1/Q2/Q3/Q4 dropdown (default = current quarter).
- Helper in `lib/dateUtils.ts`: `getSundaysInQuarter(year, quarter)` returning all Sundays in that quarter; `currentQuarter()` returning `{ year, quarter }`.
- Reuse existing achiever logic (perfect attendance, top 3, best by part) but compute over quarter Sundays up to today.
- Header label: "Outstanding Members — Q{n} {year}".

## Technical notes

- Migration is additive (nullable column) — no backfill needed; existing rows render with "—" for reason.
- Reason dialog uses existing shadcn `Dialog` + `RadioGroup` components; no new dependencies.
- Quarter math: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec.
- Reports/Excel/PDF exports are out of scope for this change (can be a follow-up if you want the reason column included in exports).

## Files touched

- `supabase/migrations/*` — add `reason` column
- `src/lib/queries.ts` — extend mark/bulk signatures
- `src/lib/dateUtils.ts` — quarter helpers
- `src/components/AttendancePage.tsx` — reason dialog + display
- `src/components/AchieversPage.tsx` — quarter selector + habitual absentees section