# Candidate pipeline: how a person becomes a profile

This traces one person from the moment they show up to a rush event to the
moment the chapter deliberates on them, across every collection and endpoint
involved. It exists so a future session doesn't have to re-derive the wiring
from scratch.

## The core idea

There is no signup step and no `candidates` collection. A person becomes
"real" in the system the first time any of three independent forms writes a
document keyed on their (normalized, lowercased) **email**:

1. Rush check-in (`/rush-checkin`), usually the actual entry point in
   practice, since it happens before someone decides to apply.
2. Application (`/application`)
3. An evaluation (`/admin/rush-evals`, `/admin/invitational-evals`)

Every downstream read (eval picker, deliberation view) re-joins these
collections on the fly, by email, every time it's requested. Nothing is
denormalized into a single "profile" document. This means no migration is
ever needed when a new source is added, but it also means every read endpoint
that wants "all known people" has to remember to union all the sources
itself, a spot easy to silently miss (see "Known gaps" below).

## Everything hinges on `activeCycle`

All three forms gate on `useActiveCycle()` (`src/lib/activeCycle.ts`), which
reads `chapterSettings.activeCycle` from Sanity. If that field is empty:

- `/application` shows "Applications aren't open yet."
- `/rush-checkin` renders nothing (no cycle, no form).
- `/admin/rush-evals` and `/admin/invitational-evals` show "No active cycle
  is set. An admin needs to choose one in Sanity Studio under 'Chapter
  Settings'." and never even call `/api/eval-roster`.

If the eval pages ever look empty, check this first before suspecting the
roster join. (As of this writing, `chapterSettings.activeCycle` is `null` in
production Sanity, which is very likely why nothing shows up.)

## Step 1: Rush check-in

Route: `src/routes/rush-checkin.tsx`. Mobile-friendly form, gated on
`useActiveCycle()` and on today's date matching a Sanity `rushEvent`.

- First-timer (checkbox checked): free-text preferred name and email.
- Returning rushee: `NameCombobox` (`src/components/NameCombobox.tsx`) search
  list, sourced from `GET /api/rushees` (name and `_id` only, no emails
  exposed publicly).

On submit, `POST /api/rush-checkin` (`api/rush-checkin.ts`):

- First-timer: inserts a new doc into **`rushees`**: `{ name, email,
  createdAt }`. This collection is the person-identity registry. It is
  not cycle-scoped, since the same human might rush again next semester.
- Either path: inserts one doc into **`rushCheckins`**: `{ eventId,
  eventName, eventDate, cycle, rusheeId, name, email, isFirstEvent,
  submittedAt }`. This is the actual per-event, per-cycle attendance record,
  and it's what other endpoints should query when they want "who's been
  showing up this cycle."

`GET /api/rushees` only returns `{_id, name}` (`api/rushees.ts`), deliberately
no email, since it's an unauthenticated public endpoint used by the search
combo on both `/rush-checkin` and `/application`.

## Step 2: Application

Route: `src/routes/application.tsx`. Also gated on `useActiveCycle()`, loads
its question set from Sanity (`getApplicationQuestions`). The Name field is
the same `NameCombobox`, sourced from the same public `/api/rushees` list.
Selecting a match sets an optional `rusheeId` alongside the free-typed name.

On submit, `POST /api/apply` (`api/apply.ts`) inserts into **`applications`**:
`{ cycle, name, email, answers, rusheeId?, submittedAt, status: 'new' }`.
`rusheeId` is stored as a Mongo `ObjectId` reference back to `rushees` when
present, but nothing currently reads it back out. It's there for future
joins, not consumed yet.

## Step 3: Evaluations

Routes: `/admin/rush-evals` and `/admin/invitational-evals`, both thin
wrappers around `src/components/admin/EvalForm.tsx` with a different
`formType` (`'rushEval'` or `'invitationalEval'`). Also admin-gated
(`AdminGate`) and cycle-gated.

The "who are you evaluating" dropdown is populated by
`GET /api/eval-roster?cycle=...` (`api/eval-roster.ts`), which is the one
place that unions all three sources into a single roster, keyed by email:

```
applications  (hasApplication: true, wins on name conflicts)
  -> rushCheckins  (fills in anyone who's shown up but not applied/evaluated)
    -> evaluations  (fills in anyone only known because someone already scored them)
```

Rubric criteria themselves come from Sanity (`getEvalCriteria(cycle,
formType)`, an `evalCriterion` document type), not from Mongo.

Submitting to `POST /api/evaluations` (`api/evaluations.ts`) does an
**upsert** keyed on `{ formType, cycle, applicantEmail, evaluatorEmail }` into
**`evaluations`**, one evaluation per brother, per applicant, per form, per
cycle. Re-opening the form after already scoring someone edits that same doc
instead of creating a duplicate (`EvalForm.tsx` finds "my prior eval" this
way too, via `GET /api/evaluations?formType=&cycle=&applicantEmail=`).

## Step 4: Deliberation

`GET /api/deliberate?cycle=...` (`api/deliberate.ts`) builds the final
per-person view the chapter argues over, joining only `applications` and
`evaluations` by email, computing per-form and overall average scores,
sorted best-first.

## Known gaps / things to check if something looks empty

- **`/api/deliberate` does not include `rushCheckins`.** Someone who's
  checked in to rush events and been evaluated, but never submitted an
  application, will still show up here (their evaluations exist in
  `evaluations`, so `ensure()` picks them up via the evaluations loop), but
  someone who's only checked in and hasn't been scored or applied yet is
  invisible on this table. Worth revisiting once real rush data starts
  flowing in.
- **`rushees` has no `cycle` field by design** (identity, not attendance).
  Don't add cycle filtering to queries against it directly; filter
  `rushCheckins` instead, which does carry `cycle`.
- **The active cycle is a single global value**, not a per-form or
  per-collection setting. If it's unset, essentially every form on the site
  goes dark simultaneously. Check Sanity Studio, Chapter Settings, first.
- Mongo access has two parallel patterns right now: the shared helper
  `api/_lib/mongo.ts` (`getDb()`, `normalizeEmail()`) used by the newer
  eval/deliberate/roster endpoints, and a locally-duplicated cached
  `MongoClient` in `api/apply.ts`, `api/upload.ts`, `api/rush-checkin.ts`,
  and `api/rushees.ts`. Functionally equivalent, just not consolidated yet.
