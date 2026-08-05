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

### 1.4 A sticky-note *component* already exists (worth reusing)

`annotation_suite_source.jsx` implements sticky notes for annotating a document:
an editable bubble that expands on click and collapses on blur (`:344`), an
AA-contrast pastel colour palette (`:108`), drag support with **keyboard
equivalents** already wired (`:388` — "Use arrow keys to move; hold Shift for a
larger step"), proper `aria-label`s, and a toolbar affordance (`:1186`).

It is **not** collaborative: zero occurrences of `onSnapshot`, `sessionRef`,
`activeSessionCode` or `updateDoc` in the file, and the comments are explicit that
rendering is "purely local", media is "local-only, never network", and persistence is
"no cloud round-trip" (`:38`, `:463-464`).

So the transport is missing, not the note. **Phase 2 should evaluate lifting this
component rather than authoring a note UI from scratch** — the accessibility work
(keyboard drag, labelled bubbles, contrast-checked palette) is the expensive part and
it is already done and shipped.

### 1.5 What does *not* exist

- No communal or shared board of any kind, and nothing student-postable.
- `whiteboard/whiteboard.html` is a **single-user** drawing surface bridged by
  `postMessage` for the AI-drawing-video feature. No shared state, not a candidate.
- `BrainstormPanel` is an AI *generator* producing ideas for the teacher. Students do
  not post to it.
- Other `sticky note` hits in the tree (`sel_hub/sel_tool_advocacy.js`,
  `allobot_source.jsx`) are instructional copy, not components.

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

## 8. Decisions — resolved by inheriting existing infra

An earlier draft of this section posed four "decisions." Aaron's review collapsed three
of them into *inherit what already exists*, and corrected the fourth on a factual error.
Recorded here because the corrections are the design.

### 8.1 Identity — inherit the codename system. Not a decision, and not anonymous.

The board should carry the **same identity model as every other student surface**:
codename to join, nickname displayed, teacher able to see who wrote what — exactly what
live sessions already do when a teacher reviews student work (`studentResponses` rolls
up per student with answered/total progress, `AlloFlowANTI.txt:4244-4252`).

The earlier draft argued for pseudonymity-to-peers on the grounds that students suppress
the questions they are embarrassed by. That reasoning is **wrong for this artifact**. A
Driving Questions Board in project-based learning is a *class-owned* document: students
revisit "my question," claim it when it gets answered, and learn that asking publicly is
a normal academic act. Anonymity undercuts the pedagogy it was supposed to protect.

The safeguarding concern that motivated pseudonymity (a disclosure arriving inside a
question) is already handled by teacher-resolvable identity, which the codename system
provides by construction. Nothing to build, nothing to decide.

### 8.2 Moderation — auto-publish with an AI pre-screen, not a review queue.

"Ugly post" in the earlier draft meant school-inappropriate content. The
teacher-review-queue default it recommended would impose real workload (4 boards × ~25
students × many questions) and kill the liveness that made Jamboard work.

Better, and the primitives exist: **auto-publish, screened on the way in, with teacher
takedown after.** `ai_backend_module.js:1424-1428` already configures Gemini
`safetySettings` across `HARM_CATEGORY_HARASSMENT`, `HATE_SPEECH`,
`SEXUALLY_EXPLICIT` and `DANGEROUS_CONTENT`.

**One real caveat for build time:** those thresholds are `BLOCK_ONLY_HIGH` and they
govern *model output*, which is a different task from judging whether *student input* is
appropriate for a classroom board. A borderline-but-unkind post about a classmate is not
`HARM_CATEGORY_HIGH` and would sail through. So the screen needs its own small
classifier prompt and threshold rather than leaning on the generation safety settings.
Keep `revealPolicy: 'teacher_review'` available as the per-board escape hatch, plus the
per-student hold flag, so a class that abuses auto-publish can be tightened without
punishing everyone.

### 8.3 Data posture — CORRECTED. Canvas provisions the Firebase instance.

The earlier draft claimed student text on the Firebase path would land in "AlloFlow's
Firestore project," making AlloFlow a vendor holding student data. **That is wrong.**
Gemini Canvas injects `__firebase_config` and `__app_id` as globals
(`AlloFlowANTI.txt:3163-3170`); the Firestore instance is Canvas-provisioned per app,
not an AlloFlow-owned project. Prismflow was extricated precisely to keep it that way.

So there is no AlloFlow-held-student-data problem to rule on. The two transports simply
sit in different tenants — Canvas-provisioned Firestore, or the teacher's own Drive via
the mailbox — and both are defensible. Document which holds what; do not gate the build
on it.

### 8.4 Retention — reuse student-work persistence, do not invent a board policy.

Boards should ride the **existing student work / project persistence** rather than
carrying a bespoke retention rule: student work already persists (`storageDB.set(
'allo_student_work', ...)`, `AlloFlowANTI.txt:11250`) and already surfaces to the
teacher device through the live session feed. A board is student work; treat it as such,
and it inherits whatever retention, export and sharing behaviour that path already has.

`expiresAt` still governs when a board stops accepting new posts. That is a board
*state* question, not a data-retention policy.

---

## 9. Rough phasing

- **Phase 0 — the contract.** Write the invariant list (§10.3) and the provider
  interface *before* either backend. Both adapters implement it; the conformance suite
  targets it. Skipping this is how the two paths drift.
- **Phase 1a — mailbox adapter.** `question_board` type in
  `normalizeAssignmentActivityConfig`, items array with server-side size clamping
  against `MAX_DOC_CHARS`, per-item status write. Testable without any UI.
- **Phase 1b — Firebase adapter + rules.** Item subcollection (§10.2) and the
  `firestore.rules` invariants. **Required scope, not deferred** — parity is decided.
  Ships behind the same contract, verified by the same conformance suite as 1a.
- **Phase 2 — student surface.** Join by code, read prompt, post, see own items, see
  approved items. Reuse verdict from the evaluation the spec called for: **§9.1 below.**
- **Phase 3 — teacher surface.** Create board, moderation queue, answered marking,
  open/answered split.
- **Phase 4 — polish.** Export, board-full handling, expiry read-only state.
- **Phase 5 (separate decision).** Clustering and standards linkage from §7.

Phases 1–3 are the minimum that helps the teacher who asked. Phase 1 carries most of
the risk and is independently testable, which is where it should start.

---

### 9.1 Phase 2 reuse verdict: take the palette, leave the component

The spec asked Phase 2 to start by evaluating `NoteBubble` in
`annotation_suite_source.jsx` for reuse. Done — and the answer is narrower than the
earlier draft assumed, which *shrinks* Phase 2 rather than growing it.

`NoteBubble({ a, onChange, onDelete, draggable, onMove })` is genuinely well factored:
it touches only `a.id / a.color / a.content / a.x / a.y` and has no dependency on the
annotation suite's document or page model. Lifting it would be easy.

**But its two most expensive capabilities are both out of scope for a board:**

- **Keyboard-accessible drag** (`onMove`, arrow-key nudging, `wasDraggedRef`) exists to
  position a note on a document. A board has no canvas — §6 rules free-form spatial
  arrangement out of v1 deliberately, because the open/answered split is the value, not
  the arrangement. `a.x / a.y` have no meaning here.
- **Inline editing** (`expanded`, `draft`, textarea, `onChange`) lets the author rewrite
  a note in place. On a board a participant cannot edit after posting — the Firestore
  rule is `allow update: if isHost()`, and the mailbox exposes no participant edit path.
  Allowing it would let approved text be swapped for something else after review.

So the honest verdict: **reuse the visual language, not the component.** Specifically
take `NOTE_COLORS` — four fills already chosen for AA contrast against their own text
colours (`#fef9c3/#713f12`, `#dcfce7/#14532d`, `#dbeafe/#1e3a8a`, `#fce7f3/#831843`) —
and the bubble's general treatment. A board item renders as a static, non-draggable,
non-editable card carrying text, author nickname, and its open/answered state.

That is a much smaller component than `NoteBubble`, and writing it fresh is cheaper and
clearer than importing one and disabling half of it. Colour should carry a *meaning* on a
board (for example open vs answered) rather than being author-chosen decoration.

## 10. Transport parity — Firebase vs mailbox

**Question:** can the board behave identically for the end user on both pathways?

**Identical UX: yes, and the pattern is already proven twice in this repo.** The
mailbox bridge reroutes the Firestore bindings so that "polls, quiz, pictionary and the
whole SessionModal run UNCHANGED over the mailbox" (`AlloFlowANTI.txt:270-282`). The
standards provider is the same shape: one contract, swappable backing. A board should
follow it — one provider interface, two adapters, UI coded against the interface only.

**Identical enforcement: no, not today, and this is the real work.**

`firestore.rules` contains **zero** occurrences of `revealPolicy`, `minParticipants`,
or `word_cloud`. Every guarantee in §1.3 — reveal gating, the k-anonymity floor,
per-response moderation status, participant caps, participant rate limits — is enforced
**server-side in Apps Script only** (`Code.gs`). The Firestore rules govern session and
signaling docs (`:156-191`) and an owner-scoped collection (`:236-237`), nothing about
activities.

The consequence is sharp and safety-relevant: if the Firebase adapter is built by
mirroring client behaviour alone, **held (unapproved) questions would be readable
straight from Firestore by any joined student**, and the reveal gate would be
decoration. For a moderated, pseudonymous board carrying student free text, that is not
an acceptable difference.

### Design rules that follow

1. **Design to the tighter constraint.** Build against the mailbox's limits (85 KB doc,
   250 participants, 120 participant writes/min, 8 activities). Firestore's ceilings are
   far higher, so a board designed for the mailbox runs unmodified on Firebase; the
   reverse silently breaks.
2. **Put the invariants in the contract, not the UI.** Reveal gating and the
   k-anonymity floor are data-access rules. Whichever adapter is active must enforce
   them below the client.
3. **Firebase parity is gated on real `firestore.rules` work** — held items must be
   unreadable by participants, item writes must be attributable and capped, and status
   transitions must be teacher-only.
4. **Prefer mailbox as the default for this feature**, on enforcement grounds alone.
   (An earlier draft also argued this on privacy grounds; that argument is withdrawn —
   see §8.3, the Firebase instance is Canvas-provisioned, not AlloFlow-owned. The
   enforcement gap is independent of that correction and still stands.)

Latency is not a parity concern here. The mailbox's version-delta poll pump plus RTC
nudge is invisible for async posting; it would only matter for continuous presence,
which is out of scope (§6).

### 10.1 DECIDED: both transports are first-class

Aaron's call: full parity, both pathways supported. The rules work is therefore
**required scope, not a later phase**, and the plan below changes accordingly.

### 10.2 The consequence parity forces on the data model

The two transports filter at different granularities, and this is not a detail:

- **Mailbox filters server-side.** `summary.responses` is *computed* in Apps Script
  before anything is sent (`Code.gs:1312`), so a held item never leaves the server. A
  single document with a mixed held/approved map is perfectly safe.
- **Firestore rules gate whole documents, not fields.** A participant permitted to read
  a board document reads *everything in it*. A single doc containing held and approved
  items therefore **cannot** hide the held ones, no matter how the rules are written.

So parity forces the Firebase layout to separate items at document granularity —
`boards/{boardId}/items/{itemId}`, one doc per item, with a rule roughly of the shape
"readable if `status == 'approved'` or `resource.data.uid == request.auth.uid`". The
existing rules already distinguish host from participant (`authed()`,
`isHost()`, `request.resource.data.hostId == request.auth.uid`, `firestore.rules:156-162`),
so the helpers are there to build on.

That layout is **wrong for the mailbox**, where `MAX_DGET_DOCS = 12` caps watched docs
per poll and a doc-per-item would blow straight through it. The mailbox keeps its single
doc with the responses map.

**This divergence is fine, and it is exactly what the provider contract is for.** The
contract says *"give me the items this actor may see."* The mailbox adapter satisfies it
with the server-computed summary; the Firebase adapter satisfies it with a
rules-enforced subcollection query. The UI never learns which. Physical layouts differ;
observable behaviour does not.

### 10.3 Keeping two enforcement implementations honest

Two implementations of the same invariants will drift. Two defences, both cheap:

1. **Write the invariants down once, as the authoritative list**, and have both
   implementations cite it. Minimum set: held items unreadable by peers; an item is
   always readable by its own author; `status` and `answered` writable only by the host;
   item writes attributable to the acting uid and not forgeable; per-student item cap;
   participant cap; participant rate limit.
2. **One conformance suite, run against both adapters.** Same tests, two backends —
   the only real defence against drift, and the pattern the standards provider already
   established in this repo.

Known asymmetry to decide at build time rather than discover: **per-student item caps
and rate limits are awkward in Firestore rules**, which cannot count prior documents
without a maintained counter field. Either carry a per-student counter the rules
validate as monotonic, or accept looser enforcement on that one axis on the Firebase
path and document it explicitly. Do not let it silently differ.

### 10.4 MEASURED after Phase 1b: the asymmetry is bigger than estimated

Writing the rules turned this from an estimate into a fact, and it is worse than the
paragraph above guessed. Firestore rules cannot count sibling documents at all, so
**three** invariants are not enforceable below the client on the Firebase path:

| invariant | mailbox | Firebase rules |
|---|---|---|
| `HELD_HIDDEN_FROM_PEERS` | server-filtered | **enforced** (per-item read rule) |
| `AUTHORSHIP_NOT_FORGEABLE` | signed token | **enforced** (`uid == request.auth.uid`) |
| `STATUS_IS_HOST_ONLY` | admin endpoint | **enforced** (`allow update: if isHost()`) |
| `EXPIRY_IS_READ_ONLY` | server check | **enforced** (`expiresAt > request.time`) |
| `TEXT_IS_SANITIZED` | server normalizer | **bounded** (length only; exact normalization client-side) |
| `ITEM_CAP_PER_STUDENT` | server-enforced | **advisory** — rules cannot count |
| `BOARD_CAP` | server-enforced | **advisory** — rules cannot count |
| `K_ANONYMITY_FLOOR` | server-enforced | **advisory** — cannot count distinct authors |

The safety-critical four are genuinely enforced on both transports. The three advisory
ones are resource-fairness and reveal-timing rather than disclosure risks: a student who
forged past them would see no content they were not already entitled to, and would post
more questions than intended. That is a nuisance, not a leak. Worth stating plainly
because "advisory" sounds worse than it is here.

**Options for a later decision:** accept advisory enforcement on Firebase and say so in
the UI; mediate board writes through a Cloud Function; or keep the mailbox as the
recommended transport for boards while Firebase stays supported. None of this blocks
Phase 2.

### 10.4b CORRECTION: there are THREE enforcement surfaces, not two

Aaron's review caught a wrong assumption underneath §10.2–10.4. I had been treating
"the Firebase path" as one thing whose rules we control. `docs/FIRESTORE_RULES_DEPLOY.md`
is explicit that it is two things:

1. **Gemini Canvas** — the platform injects `__firebase_config` for a **Google-managed
   Canvas project**. Quoting the doc: *"It is not yours, you have no console for it, and
   these rules cannot be deployed there."* Access control is Google's platform policy:
   apps namespaced under `artifacts/{appId}/…` with platform-issued auth.
2. **An owned project** (`prismflow-911fe` today for the demo site; a dedicated project
   for the classroom phase). **This is where `firestore.rules` actually deploys.**

So the enforcement picture for a board is:

| surface | how invariants are enforced | strength |
|---|---|---|
| Mailbox (teacher's Apps Script) | server-side filtering + admin endpoint | **strongest** |
| Firestore on an **owned** project | `firestore.rules` from Phase 1b | **strong**, once deployed |
| Firestore on **Canvas** | platform namespacing + platform auth only | **weakest** |

**The consequence that matters:** on Canvas — today's primary surface — Phase 1b's rules
are inert. A `teacher_review` board's held questions would not be protected at the
database layer, because any authed participant in that app's namespace can read it. That
is the exact leak §10.2 was written to prevent, and on Canvas it cannot be closed with
rules.

**Therefore, for boards specifically: on Canvas, use the mailbox transport.** Not as a
preference — it is the only way to keep the moderation promise on that surface. The
Firestore board adapter is for the owned-project path, where the rules genuinely bind.

Phase 1b is not wasted: it is the ready-made security layer for the owned project the
classroom phase should run on anyway (the deploy doc argues that a Google-managed backend
means no data-processing agreement, no retention control and no audit trail, which a
district will not accept). It just is not the Canvas story.

**Phase 2 consequence:** the UI must not offer `teacher_review` as a promise it cannot
keep. Either the transport is the mailbox, or a board on Canvas-Firestore should say
plainly that held questions are hidden in the interface but not secured in the database.

### 10.5 Verification gap to close before ship

There is no `@firebase/rules-unit-testing` in this repo and no emulator available in the
build environment, so `firestore.rules` has **never been executed** — only mirrored.
`tests/question_board_firebase_adapter.test.js` runs the shared conformance suite
against an executable mirror of the rules (`rulesOracle`) and structurally pins the real
rules file to that mirror, so the design is proven and the two cannot drift silently. It
does **not** prove the rules engine accepts the syntax or evaluates `get()` the way the
mirror assumes. **One emulator run is required before this ships.**

## 11. Open questions for build time

- Does the CacheService → Drive read-through degrade correctly for an *activity* after
  a multi-day eviction? The session doc has an explicit re-seed path; confirm the
  activity path does too, and add one if not.
- Exact byte budget per item after sanitization, measured rather than estimated, to set
  `boardCap` honestly.
- Whether `word_cloud`'s existing client surface can be forked cheaply for the student
  posting view or whether it is too specialized to reuse.
