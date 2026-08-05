# Driving Questions Board — specification

**Status:** proposal, nothing built. Written 2026-08-05.
**Origin:** a teacher looking for a free Jamboard replacement — a communal sticky-note
board where students post questions for each unit, and the class tracks which ones
have been answered. Four boards, one per unit, alive for the length of each unit.

The headline finding of the investigation below: **this is a third activity type on an
existing durable collaboration primitive, not a new subsystem.** The mailbox already
carries pseudonymous, moderated, teacher-offline async activities. Word Cloud is
structurally the same thing (many students post short text, everyone sees the
aggregate, teacher gates the reveal).

---

## 1. What already exists

Every claim here was read out of the code, not assumed.

### 1.1 The codename system

`generateSessionCode` (`AlloFlowANTI.txt:8556`) mints a 5-character code over a
31-symbol confusable-stripped alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`) — about
28.6M codes, deliberately raised from 4 characters to blunt drive-by enumeration, and
still readable aloud to a class. Students join by code or QR; no account, no roster
upload, no district SSO. That is exactly the entry path a question board wants.

### 1.2 The mailbox is a real backend, not a relay

`apps_script/session_mailbox/Code.gs` is a Google Apps Script service running under
the teacher's own Google account. It exposes a v7 document store (`dget`/`dset`/
`dpatch`/`ddel`), and the host transparently reroutes the Firestore bindings onto it
(`AlloFlowANTI.txt:270-282`). Session doc and WebRTC signaling docs both reroute, so
polls, quiz, pictionary and the whole SessionModal "run UNCHANGED over the mailbox."
`onSnapshot` is emulated by a version-delta poll pump plus an instant `{kind:'sdocv'}`
nudge over the existing RTC data channels.

Consequences that matter for this feature:

- **It is free.** The teacher's Google account is the whole backend. No Firebase
  project, no billing, no per-seat cost.
- **It has a role model already.** Actors carry `admin` vs `participant` secrets, and
  the server branches on `actor.role === 'teacher'` for rate limits
  (`Code.gs:373`, `:813`).
- **It has rate limiting already.** `RATE_LIMIT_MSGS = 900` teacher writes/min,
  `PARTICIPANT_WRITES_PER_MIN = 120` (`Code.gs:37,41`).

### 1.3 The durable activity primitive — the important part

`Code.gs:901` opens a section commented: *"v10+: durable, assignment-scoped
collaboration sidecars. Word Cloud and Rating share the same pseudonymous response map
and mailbox lifecycle; **neither depends on a teacher browser being online**."*

`normalizeAssignmentActivityConfig` (`Code.gs:919`) already validates and normalizes an
activity config with these fields:

| field | meaning | current values |
|---|---|---|
| `activityId` | identity | `AC-<uuid>` |
| `type` | activity kind | `word_cloud`, `rating` |
| `delivery` | sync model | `shared_async` |
| `prompt` | the question posed | ≤240 chars, control chars stripped |
| `revealPolicy` | **moderation gate** | `teacher_review` (default) or `auto_publish` |
| `minParticipants` | **k-anonymity floor** | clamped 3–10 |
| `responseLimit` | posts per student | `1` |
| `expiresAt` | lifecycle | timestamp |

Storage is a **Drive file** per activity (`findAssignmentActivityFile(packId,
activityId)`, `assignmentActivityFileName`, `Code.gs:1066-1083`) with a CacheService
read-through layer keyed `as:<packId>:<activityId>` (`Code.gs:1190-1198`). Drive is the
durable tier; cache is the fast tier. This is the single most important finding: the
data survives cache eviction, browser closure, and overnight.

`state.responses` is a map keyed by pseudonymous uid, one row per actor. Re-submitting
overwrites that actor's row — the comment at `Code.gs:1272` is explicit that this is
for "a retry or deliberate change." Participant count is capped by
`MAX_ACTIVITY_PARTICIPANTS = 250` (`Code.gs:1267`).

**Per-response moderation already exists**: `Code.gs:1338-1340` sets
`state.responses[uid].status` on an individual response, erroring `no-response` if
absent. There is already a notion of *held* vs *approved* responses (`Code.gs:1154`).

**Privacy is already differentiated by type**: `Code.gs:1312` returns
`summary.responses = []` for `rating` — individual ratings are never exposed — while
word-cloud responses are mapped out. Students see their own row via `summary.own`
(`Code.gs:1211`).

### 1.4 What does *not* exist

- No sticky-note board, question board, or parking lot anywhere in the tree.
- `whiteboard/whiteboard.html` is a **single-user** drawing surface bridged by
  `postMessage` for the AI-drawing-video feature. No shared state, not a candidate.
- `BrainstormPanel` is an AI *generator* producing ideas for the teacher. Students do
  not post to it.

---

## 2. The delta — what actually has to be built

Four gaps between `word_cloud` and a Driving Questions Board.

### 2.1 One row per student is the wrong shape (the real work)

Today the schema is *one response row per pseudonymous actor*, and re-submitting
overwrites. A student posts **many** questions across a unit, and an earlier question
must not be destroyed by a later one.

Two options:

**Option A — array inside the row (recommended).** `responses[uid].items = [{id, text,
status, createdAt, answeredAt}]`. Keeps the existing map shape, the participant cap,
the pseudonymous keying, and the moderation plumbing. Requires a per-item cap and a
size guard (see §3).

**Option B — a separate item map.** `state.items = { <itemId>: {uid, text, status} }`.
Cleaner conceptually, but abandons the `responses`-keyed helpers that Word Cloud and
Rating share, so more of the existing code stops applying.

Recommend A. It is the smaller change and it inherits the most.

### 2.2 Lifetime measured in weeks, not a class period

`expiresAt` already exists; it simply has to be set to the end of the unit rather than
the end of a lesson. The Drive-backed store already survives that span. What needs
checking during build: whether anything else in the assignment lifecycle assumes a
short horizon, and whether the CacheService read-through degrades gracefully to Drive
after eviction over a weekend (the bridge already carries a `lastSessionDoc` /
`reseedAt` re-seed path for the session doc, `AlloFlowANTI.txt:~290`, but the activity
path is separate and needs its own verification).

### 2.3 An "answered" state

Moderation status today is approve/hold. A questions board needs a third axis the
teacher drives during the unit: **open → answered**, ideally with an optional link to
the resource or lesson that answered it. This is additive to the existing per-response
`status` write at `Code.gs:1338`.

This is the feature the teacher explicitly asked for and the one a sticky note
physically cannot do.

### 2.4 Four boards

`MAX_ASSIGNMENT_ACTIVITIES = 8` (`Code.gs:45`). Four units fit inside the existing cap
with headroom. No change needed — worth stating because it is the kind of limit that
usually bites late.

---

## 3. Hard constraints the design must respect

These are server-enforced today and will reject a naive implementation.

| constraint | value | source | implication |
|---|---|---|---|
| Document ceiling | 85 KB | `MAX_DOC_CHARS`, `Code.gs:32` | A board is **not** unbounded. At ~120 chars/question plus metadata, budget roughly 400–500 questions per board. Needs an explicit cap and a graceful "board full" state. |
| Patch fields | 60 | `MAX_PATCH_FIELDS`, `Code.gs:43` | Never write a board as one field per question. |
| JSON depth | 12 | `MAX_JSON_DEPTH`, `Code.gs:44` | Fine for Option A; do not nest deeper. |
| Participants | 250 | `MAX_ACTIVITY_PARTICIPANTS`, `Code.gs:45` | Fine for a class; not a schoolwide board. |
| Participant writes | 120/min | `PARTICIPANT_WRITES_PER_MIN`, `Code.gs:41` | Fine for typing; a paste-storm will throttle. Client needs a friendly throttled state. |
| Watched docs/poll | 12 | `MAX_DGET_DOCS`, `Code.gs:33` | Four boards open at once is fine. |
| Resources on session doc | forbidden | `AlloFlowANTI.txt:280` | Images on notes do **not** ride this channel. See §6. |

**The 85 KB ceiling is the single most important design constraint** and should shape
the UI from the start: short questions, a visible cap, and a teacher-side archive path
for answered questions rather than infinite accretion.

---

## 4. Proposed data model

```
config (validated in normalizeAssignmentActivityConfig)
  v: 1
  activityId: "AC-<uuid>"
  type: "question_board"          // NEW
  delivery: "shared_async"
  prompt: "<the unit's driving question>"   // ≤240 chars, existing sanitizer
  revealPolicy: "teacher_review" | "auto_publish"
  minParticipants: 3..10
  itemsPerStudent: 1..10          // NEW (replaces responseLimit:1 for this type)
  boardCap: <int>                 // NEW, server-clamped against MAX_DOC_CHARS
  expiresAt: "<unit end>"

state (Drive file, cache read-through)
  packId, activityId
  responses: {
    "<pseudonymous uid>": {
      updatedAt: <ts>,
      items: [
        { id: "Q-<short>", text: "<≤200 chars, sanitized>",
          status: "held" | "approved" | "rejected",
          answered: false | { at: <ts>, note?: "<≤240>", resourceId?: "<id>" },
          createdAt: <ts> }
      ]
    }
  }
```

Reuse without modification: pseudonymous uid keying, the control-character stripper and
length clamps used on `prompt`, the participant cap check, the per-response status
write, the `summary.own` echo, the `as:` cache key scheme, and the Drive file lifecycle.

---

## 5. Flows

**Teacher creates a board.** From the unit's assignment: prompt, reveal policy,
items-per-student, expiry. Gets the existing 5-char code plus a QR. Nothing new in the
join path.

**Student posts.** Opens code → sees the driving question → types a question →
submits. Their own items are always visible to them (`summary.own`). Under
`teacher_review`, others' items appear only once approved; under `auto_publish` they
appear immediately and the `minParticipants` floor still gates the aggregate view.

**Teacher moderates.** A queue of held items; approve, reject, or edit-then-approve.
Existing per-response status write extended to per-item.

**During the unit.** Teacher marks items answered, optionally attaching the resource
that answered them. The board visibly divides into open and answered.

**Unit ends.** `expiresAt` passes. Board goes read-only; teacher can export the
open/answered split as a record of what the unit actually covered.

---

## 6. Deliberately out of scope for v1

- **Images and drawings on notes.** The 85 KB ceiling forbids it and resources
  deliberately do not ride this channel (`AlloFlowANTI.txt:280`). Text only.
- **Free-form spatial dragging.** Jamboard's canvas is not the value here; the answered
  /open split is. Clustering (§7) beats manual arrangement pedagogically and costs less.
- **Cross-class or schoolwide boards.** 250-participant cap.
- **Live cursors / presence.** The poll-pump plus nudge is right for async posting and
  wrong for continuous presence.

---

## 7. Why AlloFlow's version would beat a sticky note (phase 2, not v1)

Only worth building after v1 is real, but this is the reason the feature belongs here
rather than in Google Slides:

- **Cluster near-duplicate questions.** Twenty students ask the same thing five ways.
- **Map questions to standards** using the shipped CCSS knowledge graph, so a teacher
  can see which student questions touch what they are accountable for and which are
  enrichment.
- **Flag unanswered questions as the unit closes** — the bookkeeping a physical board
  cannot do.
- **Turn an answered question into a generated resource** via the existing Blueprint
  path.

Each of these must be clearly marked as AI suggestion, never as an automatic
reclassification of a student's words. A student's question is their words; the system
may group and route, not rewrite.

---

## 8. Decisions needed from Aaron before build

1. **Anonymity model.** Recommended: pseudonymous to peers, resolvable to the teacher.
   Students will not post the question they are embarrassed by if their name is on it,
   and that is usually the valuable one. But you own this call as a school psych. Note
   the primitive is already pseudonymous by construction, so *fully* teacher-resolvable
   identity would be the thing requiring new work, not anonymity.
2. **Default reveal policy.** `teacher_review` is the safer default and already the
   server default. Confirm you want it defaulted on for this type.
3. **Data posture.** Student-authored free text lands in a Drive file under the
   teacher's own Google account. That is a materially *better* posture than a shared
   Firebase project, but it is still student-generated content at rest and should be
   ruled on explicitly rather than inherited.
4. **Retention.** What happens to a board after the unit — auto-delete at some horizon,
   or keep as the teacher's record?

---

## 9. Rough phasing

- **Phase 1 — server.** `question_board` type in `normalizeAssignmentActivityConfig`,
  items array with server-side size clamping against `MAX_DOC_CHARS`, per-item status
  write. Testable without any UI.
- **Phase 2 — student surface.** Join by code, read prompt, post, see own items, see
  approved items.
- **Phase 3 — teacher surface.** Create board, moderation queue, answered marking,
  open/answered split.
- **Phase 4 — polish.** Export, board-full handling, expiry read-only state.
- **Phase 5 (separate decision).** Clustering and standards linkage from §7.

Phases 1–3 are the minimum that helps the teacher who asked. Phase 1 carries most of
the risk and is independently testable, which is where it should start.

---

## 10. Open questions for build time

- Does the CacheService → Drive read-through degrade correctly for an *activity* after
  a multi-day eviction? The session doc has an explicit re-seed path; confirm the
  activity path does too, and add one if not.
- Exact byte budget per item after sanitization, measured rather than estimated, to set
  `boardCap` honestly.
- Whether `word_cloud`'s existing client surface can be forked cheaply for the student
  posting view or whether it is too specialized to reuse.
