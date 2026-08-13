# School-wide rollups — design scope

**Status:** DESIGN ONLY. Nothing here is built. · **Date:** 2026-08-13
**Prerequisite reading:** `SCHOOL_SERVER_ARCHITECTURE.md` (the tiers and the core rule),
`DATA_PRIVACY_POSTURE.md` (what the current system does and does not store).

> **On FERPA language.** This document describes engineering controls. It is not legal
> advice and does not make a compliance claim. Per house rule, the FERPA determination
> belongs to the district and its counsel — this design exists to give them something
> narrow enough to say yes to.

---

## 1. What this is for, and the one decision that shapes everything

An administrator wants building- or district-level visibility: are screeners actually
being run, how many students are below benchmark, is anyone growing.

There are two completely different products that answer that, and they share almost no
architecture:

| | **Aggregate rollups** (this doc) | **Identified records** (NOT this doc) |
|---|---|---|
| What leaves the teacher device | counts and distributions | per-student rows |
| Student identity | none — never created | persistent, cross-classroom |
| What AlloFlow becomes | a classroom tool that reports totals | a student information system |
| Who is data processor | the school | **you** |
| Obligations | school's existing ones | DPA, retention policy, access control, audit log, breach procedure |

The current system has no student identity to aggregate on. Names are dropdown-curated
codenames (adjective + animal), scoped to a session; "Purple Otter" in one class has no
relationship to "Purple Otter" in another. Individual cross-classroom monitoring is not
a missing feature — it would mean *creating* an identity layer that was deliberately left
out.

**This design does the first column only.** It is additive and reverses none of the
existing posture. If the district genuinely needs the second column, that is a legitimate
requirement, but it is a separate product decision to take with their privacy officer, not
an extension of the LAN work.

---

## 2. The architectural rule that does the real work

> **Aggregation happens on the teacher's device. Per-student rows never leave it.**

Everything else is secondary. The boundary is enforced by *what is transmitted*, not by
what a server promises to do with what it receives. A compromise of the School Box yields
counts, because counts are all that were ever sent — the same reasoning that makes the
existing WebRTC design defensible ("a complete compromise of the backend would yield none
of it, because it was never there").

This also means the rollup is honest about its source: `probeHistory` already lives on the
teacher device (localStorage + project file), and the session roster leaf is explicitly
"TRANSPORT, not storage." The rollup reads the local bank, reduces it, and emits the
reduction.

---

## 3. Where it runs — mapping to existing tiers

| Tier | Role in this design |
|---|---|
| **Desktop (schoolbox-lan)** | **Source of truth.** Stable origin, durable `probeHistory`, already the "main local surface." The rollup is computed here. |
| **School Box (district-server)** | **Destination.** School-owned, firewalled, already a docker compose stack (nginx + pocketbase) with a private API token concept (`configurePrivateApiToken`) and a smoke-tested session API. |
| **Gemini Canvas** | **Not a source.** Throwaway origin, no durable local bank, storage only via the bridge popup. May *read* a rollup the box serves; must never originate one. |
| **byo-firebase** | Out of scope for v1. If a district wants it there, it is their tenant and their rules. |

New surface on the box: `POST /api/rollups` and `GET /api/rollups`, alongside the existing
`/api/lan-sessions`. Same auth model (teacher token), same firewall posture, no internet
exposure required.

---

## 4. The privacy controls, in the order they matter

### 4.1 Small-cell suppression — the one that is always got wrong

An aggregate is not automatically de-identified. "1 of 3 third-graders below benchmark" is
a student record with extra steps.

- **Minimum cell size `k`.** Any cell with `0 < n < k` is suppressed and reported as
  `null` with a reason code, never as a number and never as zero. Education reporting
  commonly uses k = 10; some states use 5. **Configurable per district, defaulting to the
  stricter value, and never disableable below a floor.**
- **Complementary suppression.** Suppressing one cell while publishing the row total and
  the other cells lets the suppressed value be derived by subtraction. When any cell in a
  group is suppressed, a second cell (the next smallest) must be suppressed too, or the
  total withheld. This must be in the reducer, not left to the reader.
- **No deltas at small n.** Publishing a weekly series lets a reader difference two
  snapshots and isolate the student who joined or left. Either publish only current-state
  aggregates, or suppress any period where the denominator changed by less than `k`.

Small groups are exactly where a school psychologist works, so **expect heavy suppression
and treat that as the design working.** If a building's numbers are too small to report
without suppression, that is the honest answer, not a bug to engineer around.

### 4.2 A fixed, validated schema — inherit the existing discipline

The session system already allowlists every student-writable field (`SESSION_TIER1_LEAVES`)
to enums, numbers, timestamps and generated IDs, with no free text anywhere. The rollup
payload gets the same treatment: a declared schema, a validator that runs **before
transmit**, and rejection (not truncation, not sanitisation) of anything unexpected.

The probe record it reduces is already this shape —
`{ activity, correct, total, accuracy, itemsPerMin, elapsed, grade, form, at }` — numbers
and enum-ish strings. Nothing in it is free text, which is why this is tractable at all.

### 4.3 No identifiers, including the ones that feel harmless

- No codenames. No student IDs. No per-student rows at any n.
- No teacher identity beyond a **building-scoped, salted, rotatable** submitter id — enough
  to answer "has this classroom reported this week", not enough to build a staff
  performance record. The salt lives on the box, held by the school.
- No timestamps finer than the reporting period. A submission time of `09:14:07` alongside
  a class of six is a re-identification vector.

### 4.4 Teacher consent is explicit and inspectable

Opt-in per teacher, off by default, revocable, and — the part that matters — the teacher
can **see the exact payload before it sends**. Not a description of it; the JSON. A privacy
control nobody can inspect is a promise, and this codebase already prefers mechanisms to
promises.

### 4.5 Retention

Bounded on the box, default short (a term), configured by the school. The existing session
TTL (6h) is the precedent: things expire unless someone decides otherwise.

---

## 5. Build order — fidelity first, outcomes second

**Phase 1 — implementation fidelity. No student data at all.**

The insight worth acting on: much of what an administrator actually wants is not student
outcomes but whether the programme is being run. *How many screeners were administered
this month. How many classrooms are active. Which tools are in use.* Those are counts of
**staff activity**, and they contain no student data whatsoever — no suppression needed, no
FERPA surface, nothing to argue about.

This is the whole first release. It is genuinely useful to an administrator, it exercises
the entire transport (payload schema, validator, token, box endpoint, admin view), and it
can ship while the outcome question is still being discussed with the district.

**Phase 2 — suppressed outcome aggregates.**

Adds the reducer and the suppression rules from §4.1: counts at/below benchmark by grade
and domain, growth distribution over a window. Everything Phase 1 built is reused; the new
code is the reducer and its suppression tests.

**Phase 3 — admin view.** A read-only page served by the box. Renders `null` cells as
"suppressed — group too small", never as zero, never as a blank that reads as zero.

**Not in any phase:** per-student rows, cross-school federation, LMS/grade integration,
anything that creates a persistent student identity. Those are the second column of §1.

---

## 6. What must be tested, because policy is not a control

- The reducer never emits a cell with `0 < n < k`. Property test over random cohorts.
- Complementary suppression holds: no suppressed value is recoverable from the published
  siblings plus the total. Assert by attempting the subtraction.
- The validator rejects an unknown field rather than dropping it silently.
- No free-text field can appear in a payload — the same assertion the throttle telemetry
  already makes about prompt/text/content/response/body.
- Opt-out actually stops transmission (drive the real toggle, assert no request).
- A payload contains no value that appears in the source `probeHistory` as a name.

---

## 7. Open questions for the district, not for engineering

1. What `k`? (Recommend 10; accept 5 with a written rationale; never lower.)
2. Reporting period — term, month, week? Shorter periods make differencing easier.
3. Who may read the admin view, and is that access logged?
4. Retention on the box.
5. Does the district want Phase 2 at all, once they see how much Phase 1 answers?

That last one is worth asking early. It may be the whole project.
