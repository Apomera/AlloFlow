# Process Provenance ("Portfolio of Process") — Design

**Date:** 2026-08-04 · **Status:** DESIGN — nothing built · **Owner:** Aaron Pomeranz
**Companion reading:** the never-decides principle in Dispro Analyzer and Diagnosis vs.
Eligibility; the student AI policy already carried by assignment shares.

---

## 1. The problem, stated the way we mean to solve it

Students use AI on homework. The damage is not the AI use — scaffolded AI help is often
exactly what a struggling student needs — it is that unsupervised AI use is **invisible**,
so honest scaffolding and wholesale outsourcing look identical when the finished artifact
is all a teacher can see.

The ed-tech industry's dominant answer, AI *detection*, interrogates the artifact and
guesses. It is empirically unreliable, biased against multilingual writers, and
unappealable. We refuse that road entirely.

**Our answer: make the process visible instead of interrogating the product.** AlloFlow
is already the environment where scaffolded AI use happens under teacher-set policy. If
assigned work is done *in* AlloFlow, the session can carry an honest, student-visible
record of how the work came to be — when it was worked on, how it evolved, which AI
supports were used and for what, and whether the student can explain their own work.

The reframe that matters: this is not surveillance bolted onto homework. It is a
**portfolio of process** the student assembles and submits knowingly — the same way a
math teacher asks for shown work. AI use stops being a secret to hide and becomes a
legitimate, visible part of the record.

## 2. Non-negotiable constraints (encode these as tests, not intentions)

1. **The system never accuses.** No cheating score, no integrity flag, no "likely AI"
   verdict — not in the UI, not in the data model, not in a prompt. The teacher view
   presents *observations*; judgment belongs to humans who know the child. (Same
   contract as Dispro Analyzer: thresholds and decisions are never ours.)
2. **The student sees the log.** The full ledger is visible to the student in plain
   language before submission, every session. There is no hidden channel that reports on
   a student behind their back.
   **AMENDED 2026-08-05 (Aaron).** This previously read "the student *owns* the log" and
   required an explicit consent checkbox at submit. That was wrong on the ethics: minors
   give **assent**, not consent, and a decision this complex cannot be meaningfully
   expressed by a checkbox at submit time. Consent is obtained from **parents**, outside
   the app, as part of the pilot. Real assent is likewise gathered outside the app.
   The checkbox is therefore removed, not weakened: a pseudo-choice is worse than none,
   because a visible decline reads as concealment (see 15.7). What replaces it is an
   **explanation** — what a teacher can see, why, and a reminder to use AlloFlow's own
   supports or a trusted adult rather than outside sites. Transparency is undiminished;
   only the illusory gate is gone. Confirm with Dr. Howorth before pilot (§12.7).
3. **No biometrics, ever.** No keystroke-dynamics identity claims, no webcam, no face or
   typing "fingerprinting." Proving *who* typed is out of scope by principle; the
   comprehension checkpoint (§6) is the identity-adjacent mechanism, and it is
   pedagogical, not forensic.
4. **Honest cryptography claims only.** Client-side logs can be made tamper-*evident*
   (hash chain + anchors), never tamper-*proof*. Every surface that mentions integrity
   uses the word "tamper-evident" and never implies more. (§7)
5. **FERPA posture unchanged.** The ledger is an education record. It travels in the
   student project JSON the platform already uses — student to teacher, hand to hand —
   with the existing live-session Firebase write as an *optional* timestamp anchor. No
   new cloud surface, no third-party analytics, no egress beyond what the assignment's
   AI policy already permits.
6. **Respects the assignment's AI policy.** The ledger *records* AI interactions; the
   existing per-share student AI policy *governs* them. Provenance never unlocks AI a
   teacher disabled, and never blocks AI a teacher allowed.
7. **Opt-in per assignment, visible to families.** A provenance-gated assignment says so
   on the student's screen in student-readable language, with a family-facing
   explanation available (Parenting Lab has the voice for this).

## 3. What the ledger can and cannot establish — the honesty table

This table ships in the teacher documentation verbatim. Overclaiming here is how a tool
becomes an accusation machine.

| Question | Can provenance answer it? |
|---|---|
| Did the work evolve incrementally or arrive in large chunks? | **Yes** — edit cadence + paste events with sizes are the strongest signals available. |
| How long, and when, did the student engage? | **Yes** — session timeline, idle gaps, resume points. |
| Which AlloFlow AI supports were used, when, for what? | **Yes, exactly** — this is the legitimizing half: "asked AlloBot to explain #2" becomes visible and honorable. |
| Were checkpoints answered with AI off? | **Yes** — checkpoint events record the policy state they ran under. |
| Was the log edited after the fact? | **Detectable if attempted sloppily** (broken hash chain / mismatched anchor); expensive but possible to fake well. Tamper-evident, not tamper-proof. |
| Did the student retype answers from ChatGPT on a phone? | **No.** Careful retyping defeats paste detection. Cadence anomalies may *hint*; hints are not findings and are never labeled. |
| Who was physically at the keyboard? | **No, and we will not try.** See constraint 3. The checkpoint asks the better question: can the submitter explain the work? |

## 4. Architecture overview

```
student session (student mode, assignment loaded)
  └─ ProvenanceLedger (new module: allo_provenance_module.js)
       • subscribes to input surfaces (editor fields, paste events)
       • subscribes to the AI call layer (which support, prompt hash, response hash)
       • subscribes to assignment lifecycle (open/step/submit)
       • buffers to durable device storage (crash-safe, namespace `provenance_buffer`)
       • event stream → hash chain (§7)
  ├─ Checkpoint generator (§6): questions FROM the student's artifact, answered AI-off
  ├─ Student review surface: "Your work story" — plain-language ledger view + consent
  │    to include it, shown at save/submit
  ├─ Transport: embedded in the existing student project JSON (save/load/submit path
  │    already shipping); optional live-session anchor write (timestamp + chain head)
  └─ Teacher view: submission inbox gains a "Process" panel — summaries and timeline,
       zero verdicts
```

Reuse map (all existing): student mode + assignment directions/progress ctx caps;
`saveStudentWork` / project JSON; submission inbox module; live-session Firebase writes;
per-share student AI policy; durable device storage bridge; the command layer's
sanitization discipline for anything AI-adjacent.

## 5. Event schema (draft v1)

Append-only array `ledger.events`; every event `{ t, type, ...fields, h }` where `t` is
ms since session start (wall-clock only at session boundaries), and `h` is the chain
hash (§7). Content is **metadata-first**: we log *shapes* of activity, hashes of texts —
not continuous keystroke transcripts.

```jsonc
{ "type": "session",    "action": "start|resume|end", "wallClock": "ISO-8601",
  "assignmentId": "…", "policy": { "studentAi": "off|scaffold|open" } }

{ "type": "edit",       "field": "answer_3", "chars": +42, "len": 318 }
  // sampled per ~15s bucket, not per keystroke; direction + magnitude only

{ "type": "paste",      "field": "answer_3", "chars": 412, "sourceHint": "external|intra-app" }
  // intra-app = clipboard content matches text already present in this session

{ "type": "ai",         "support": "allobot|glossary|simplified|read_aloud|…",
  "promptHash": "…", "responseHash": "…", "promptPreview": "first 120 chars",
  "insertedToWork": false }
  // insertedToWork flips true if a later paste matches the responseHash

{ "type": "checkpoint", "id": "cp2", "aiState": "off", "durationSec": 74,
  "answerHash": "…", "generatedFrom": "answer_3@rev5" }

{ "type": "revision",   "field": "answer_3", "rev": 5, "textHash": "…", "len": 301 }
  // periodic snapshot hashes → the revision curve without storing every draft
```

Explicit non-events: no raw keystroke log, no screenshots, no URL/app monitoring outside
AlloFlow, no camera/mic. If it isn't in the schema, the student review surface can
truthfully say it isn't collected.

## 6. Comprehension checkpoints — the "authenticate my own ability" mechanism

Aaron's instinct, made pedagogical: at teacher-chosen moments (end of assignment, or
after N% progress), AlloFlow generates 1–3 short questions **from the student's own
artifact** — "You wrote this paragraph; explain why you chose this example," "Your
answer to #4 uses the word *erosion* — what does it mean here?" Answered with AI off
(recorded in the event), untimed by default (accommodations matter), and graded by the
*teacher*, not the machine.

Why this beats forensics: understanding cannot be pasted. A student who outsourced the
work faces questions about choices they never made; a student who used AI as scaffold
answers easily — which is precisely the distinction that matters. This is assessment
*for* learning wearing a provenance hat.

Generator constraints: questions come from the student's text via the standard model-
agnostic AI path under the *teacher's* policy; generated questions are shown to the
teacher for edit/veto when composing the assignment (same review-before-run culture as
the command layer); reading level follows the assignment's grade setting; TTS available
(checkpoints must not become a reading-fluency trap for the students scaffolding exists
to serve).

## 7. Integrity design — tamper-evident, said plainly

- Each event carries `h = SHA-256(prevH ‖ canonicalJSON(event))`; the chain head changes
  if any historical event is altered, reordered, or dropped.
- **Anchors** make the chain hard to rewrite silently: (a) on save/submit, the chain
  head is embedded in the project JSON alongside a wall-clock stamp; (b) when a live
  session is active, the head is also written through the existing session write path —
  a timestamp the student's device cannot backdate; (c) heads are additionally kept in
  durable device storage so a "rebuilt" ledger no longer matches the device's own trail.
- **The honest limit, stated everywhere integrity is mentioned:** everything above runs
  on a device the student controls. A sufficiently determined person can fabricate a
  plausible ledger. Anchors raise the cost from "edit a JSON file" to "forge a
  consistent multi-anchor history," and the checkpoint (§6) is independent of all of it.
  The claim we print: *"This record is tamper-evident, not tamper-proof. It documents
  process; it does not convict anyone."*

## 8. Teacher view — observations, never verdicts

A "Process" panel on each submission in the existing inbox:

- **Timeline strip**: sessions, durations, gaps.
- **Revision curve**: length over time with paste events marked (size-scaled).
- **AI interaction list**: which supports, when, prompt previews — presented as the
  *scaffolding record*, in the same visual register as "used the glossary," because it
  is the same kind of fact.
- **Checkpoints**: the student's answers beside the artifact excerpts they were
  generated from, for the teacher to read.
- **Integrity line**: "chain verified against N anchors" or "could not be verified" —
  with the §7 disclaimer inline, and *no styling that codes it as an alarm.*

Banned from this view, permanently: percentages, scores, red flags, the word "cheating,"
any ranking of students by any ledger-derived quantity. Test-pinned, like the eligibility
tool's banned answers.

## 9. Threat model — what we mitigate and what we absorb

| Threat | Response |
|---|---|
| Paste-in from external AI | Recorded as paste events with sizes; visible in the curve. Not blocked — recorded. |
| Careful retyping from a second device | **Absorbed.** Cadence may look odd; we do not label it. Checkpoints are the real counter. |
| Editing the saved JSON ledger | Breaks the chain/anchors → "could not be verified." |
| Rebuilding a fake ledger wholesale | Expensive (multi-anchor consistency); absorbed beyond that. Checkpoints are the counter. |
| Sibling/friend does the work in-app | **Absorbed** (no identity claims). Checkpoints under classroom follow-up are the counter. |
| Teacher over-reads a hint as proof | Mitigated by design: no hints are surfaced as findings; docs lead with the honesty table; UI language reviewed for accusation-neutrality. |
| Coerced consent (student can't really refuse) | Named openly: this is an *assignment requirement* like "show your work," set by the teacher, disclosed to families — not a covert term of service. |

## 10. Data lifecycle

Collected: during provenance-enabled assignments in student mode only. Stored: device
(durable namespace) until save/submit; then inside the project JSON wherever that JSON
already goes. Optional anchor: existing session write path. Retention: the teacher's
copy is an education record under existing school policy; a "clear my local buffer"
control ships with the student surface. Nothing leaves the device that the student has
not seen rendered in their review surface.

## 11. Phases

- **P0 — Ledger core**: `allo_provenance_module.js` (pure event/chain logic, heavily
  unit-tested), wired to editor + paste + AI-layer + lifecycle events in student mode;
  durable buffer; embed-in-JSON on save. *No teacher UI yet.*
- **P1 — Student review surface**: "Your work story" panel + consent-at-submit + clear-
  buffer control. Ships with P0 or not at all (constraint 2).
- **P2 — Teacher process panel** in the submission inbox (+ chain verification).
- **P3 — Checkpoints**: generator + teacher edit/veto at assignment composition + AI-off
  answer flow.
- **P4 — Anchoring**: live-session head writes; verification against multi-anchors.
- **P5 — Policy & family surface**: assignment-composer toggle, student-readable
  disclosure, family explainer (Parenting Lab voice).

Each phase carries its constraint tests (never-accuse pins, schema-only collection pins,
disclaimer-presence pins) the way today's agentic work pinned its privacy invariants.

## 12. Open questions for Aaron — RESOLVED 2026-08-04 (Aaron accepted recommendations)

1. **Default**: off; enabled per assignment by the teacher.
2. **Checkpoints**: end-of-assignment by default; mid-work gates optional per assignment.
3. **Teacher first-view**: the one-line process summary ("4 sessions · 62 min · 2 AI
   supports · checkpoints attached"), expanding on demand.
4. **Student-facing name**: **"Work Story"** (working title; Aaron may veto).
5. **District policy review** happens before any pilot classroom.
6. **Accommodation note is mandatory** in teacher docs (speech-to-text = paste-like
   bursts; AT must never read as an anomaly).

**OPEN — for Dr. Sarah Howorth at the planned meeting (added 2026-08-05).** These come
out of the §15 support-event work and the constraint-2 amendment. They are consent and
assent questions, which is why they are hers and not ours:

7. Does removing the submit-time checkbox satisfy **assent** expectations for the pilot,
   given that parent **consent** is obtained separately and outside the app?
8. Should the student-facing explanation appear once per assignment, once per session,
   or at first use only? (Repetition buys informedness at the cost of being ignored.)
9. Does progress-monitoring data collected through the **support lane** (§15.4) need
   naming in the IEP or 504 document, or does it ride existing progress-monitoring
   authorization?
10. What language should the "use AlloFlow's supports or a trusted adult" nudge carry so
    that it reads as guidance and not as a warning against getting help?

## 13. Where this lives — one coach, one ledger, one artifact pattern

Added after Aaron's cohesion critique: features earn usage only if they are one story.
This section is that story, and it is mostly *unification of things that already exist*.

### 13.1 One coach, many postures

There is exactly one agent in AlloFlow: **AlloBot**. The Screen Coach, spotlight/where-is,
demo autopilot, plan cards, voice loop, and checkpoints are not products — they are
AlloBot's *capabilities*. Every coaching surface presents as AlloBot; nothing gets a
second mascot or a second entry point to learn.

What changes per audience is **posture**, and the governing principle is:

> **Socratic about the lesson, direct about the tool.**
> Productive struggle belongs to the learning objective — never to the UI. Concept
> struggle is signal; navigation friction is noise.

| Audience | Content questions ("what does erosion mean?") | Navigation questions ("where do I submit?") | Process questions ("how do I run X?") |
|---|---|---|---|
| Student | Socratic, governed by the assignment's AI policy — never hands over assignment answers | **Direct** + spotlight the control + offer to open it | Direct guided steps (read directions / next step commands already exist) |
| Educator | Direct with cited depth | Direct + spotlight | Guided sequences: explain → spotlight tour → *or* watch a Demo Autopilot run → or a plan card that does it with consent |
| Independent learner | Socratic-leaning hybrid | Direct + spotlight | Direct guided steps |

Most of this router's targets exist today (help mode, show-me mode, `whereIs`, 155
commands, tours, demo runs). The cohesion work is **one intent split — concept |
navigation | process — at the top of AlloBot's routing**, not new machinery. That split
is a prerequisite phase for provenance's student surface, because checkpoints and
coaching must not blur: coaching helps you work; checkpoints ask you to explain your
work with coaching off.

### 13.2 One ledger, two lenses — and a wall between them

Aaron's MTSS insight, adopted: the same event ledger serves two different consumers,
and the second may matter more than the first.

- **Integrity lens** (this doc's §8): assignments, submission inbox, "did the work
  evolve honestly."
- **Support-fade lens** (MTSS/RTI): the coach's scaffolding is a *prompt hierarchy*
  (errorless-learning style: full model → guided → hint → independent). Recording the
  prompt level a student needed, per task over weeks, is **progress-monitoring data of
  response to intervention** — precisely what Tier 2/3 teams lack. A Work Story showing
  AI-scaffold use fading across a month *is* the intervention evidence. Schema change:
  `ai` events gain `promptLevel: "model|guided|hint|none"`, and support-fade summaries
  feed the existing Leadership Hub MTSS module (team-facing, never-decides, like every
  other admin surface).

**The wall (hard constraint 8, test-pinned like the others):** the support lens and the
integrity lens must never share a view, a summary, or a visual register. A student who
needs heavy scaffolding must never *render* as a suspicious student. Separate consumers
(submission inbox vs. MTSS dashboard), separate summaries computed from the same events,
and the integrity view never displays prompt-level or support-quantity data at all.
Conflating "needs help" with "might be cheating" is the equity failure this design
exists to avoid, so it gets its own pin.

### 13.3 One artifact pattern

The platform already established the pattern with Persona artifacts (2026-07-20):
**student work = re-importable JSON (source of truth) + a human-readable "permanent
product" page** downloaded alongside it. The Work Story follows it exactly: ledger +
chain head ride the project JSON; the student-readable Work Story page renders from it
(and is what families see). AlloHaven's permanent-product surface is the precedent and
a natural place for students to *keep* their Work Stories as things they made — process
as a artifact of pride, not a compliance receipt.

### 13.4 Revised phase order (cohesion first)

- **P-1 (new, before P0): the intent router** — concept | navigation | process split in
  AlloBot, applying "Socratic about the lesson, direct about the tool" per audience.
  Ships value immediately (navigation coaching for everyone) and provenance inherits it.
- P0–P5 as §11, plus: `promptLevel` in the schema from day one (P0), support-fade
  summary + MTSS feed as **P6**, behind the §13.2 wall from its first commit.

1. **Default posture**: provenance off unless a teacher enables it per assignment
   (recommended), or a school-level default?
2. **Checkpoint cadence**: end-of-assignment only, or mid-work gates? (Mid-work is
   stronger evidence and more intrusive.)
3. **What the teacher sees first**: full panel, or a one-line summary that expands?
   (Recommendation: one line — "4 sessions · 62 min · 2 AI supports · checkpoints
   attached" — so the default reading is process, not suspicion.)
4. **Student-facing name**: "Work story"? "Process portfolio"? Naming will shape whether
   students experience this as theirs. (Not "integrity report.")
5. **District alignment**: does this need review against local academic-integrity policy
   language before a pilot classroom sees it?
6. **Accommodation interactions**: any IEP/504 scenarios where cadence/timing data could
   be misread (e.g., speech-to-text users show paste-like bursts)? Likely needs an
   explicit note in the teacher docs — your call on wording.

## 13.5 Checkpoint UI invariants (P3 — binding on the wiring phase)

Adversarial review (2026-08-04) surfaced harms that code alone cannot prevent. The
module now enforces what it can; these are the rules the UI must satisfy, each to be
test-pinned when the surface lands:

1. **Never blocks.** Not a modal, no progress gate, no countdown, no visible clock.
   Dismissible to "later" unlimited times, recording nothing a teacher sees. A blocking
   quiz inside homework ends the session for an anxious or PDA-profile student.
2. **The work stays visible and editable** throughout, with the source span highlighted.
   A checkpoint on a cleared screen is a working-memory test wearing a comprehension hat.
3. **All four response modes ship together** — text, audio, choice, point — and answering
   in the home language is permitted unless the objective is English production. Written
   production alone measures expressive language, spelling and English proficiency.
4. **One-tap escape hatch** beside every question: "This question doesn't fit my work."
   Voids that checkpoint, routes the question to the teacher as a generator-quality
   report, is never counted or shown as a refusal. (The §6 promise of teacher edit/veto
   at composition is impossible — the artifact doesn't exist yet — so composition
   approves question *types* and this is the student-side check.)
5. **Teacher view renders the answer first and alone**, beside the source excerpt, above
   the fixed line: *"A short or unclear answer is not evidence of anything. It is a
   reason to talk with the student."* Duration is never shown beside an answer.
6. **Banned permanently** (extends §8): duration beside an answer, answer word/character
   counts, any class-level checkpoint column, and any sort or rank on a checkpoint field.
7. **No egress when policy forbids it.** If the assignment's AI policy is off, generate
   locally from the template bank — never send student writing out. Where generation does
   run, the student and family disclosures say so verbatim.
8. **Accommodations are never suppressed.** The AI-off state pauses generative answer
   help only; read-aloud, glossary, translation, simplified text and input aids stay on,
   and the checkpoint UI says which remain available.

## 14. P1 wiring map (scouted 2026-08-04; view half already shipped)

Shipped so far: P0 ledger core, P2 teacher panel view-model, and P1's **view half** —
`buildWorkStoryModel` / `describeCollection` (student-language narration; the "what we
keep" disclosure is *generated from the event schema*, drift-pinned by test). Remaining
is the ANTI surgery, which must land as ONE commit so collection never exists without
the surface (the inertness test flips from "no references" to the full-wiring pins in
the same change):

1. **Loader**: lazy `__alloLazyProvenance` following the existing `loadModule` pattern;
   loads only when student mode + a provenance-enabled assignment is active.
2. **Session lifecycle**: ledger created where the assignment becomes active
   (`assignmentDirections` adoption); `session start/resume/end` from visibility +
   load/unload; durable buffer via the storage bridge (`provenance_buffer`).
3. **Edit/paste hooks**: student response inputs only (the assignment answer surfaces —
   NOT teacher fields); `noteEdit` on input deltas, paste handler records size +
   intra-app detection (compare against session-known AI response hashes).
4. **AI hook**: wrap at the ctx capability layer (where student-facing helpers invoke
   `localCallGemini` @~3486) — record support name + prompt/response hashes +
   `promptLevel`; policy comes from the share's `studentAiPolicy` (24 references —
   already threaded).
5. **Work Story surface**: renders `buildWorkStoryModel` output; lives beside the
   student's save/submit controls; consent checkbox default-unchecked; "clear my
   buffer" control.
6. **Embed**: `attachProvenance` inside `initiateSaveStudentProject` (@~32947) — ONLY
   when the consent box is checked at that moment.
7. **Flip the inertness test** in `tests/provenance_ledger.test.js` to assert the six
   wiring points instead of absence.

---

## 15. Support events — the ledger's real unit (scoped 2026-08-05; NOT built)

**Status: design only.** Nothing in this section is implemented. It supersedes the
*spine* of the attribution work committed 2026-08-05 (`f04974fcb`), which remains
correct but narrow, for the reasons below.

### 15.1 The mistake this corrects

The ledger records *AI calls*. The thing worth recording is *support received*. Those
are not the same population, and in AlloFlow they barely overlap.

The evidence is in our own vocabulary. `CHECKPOINT_ALWAYS_ALLOWED` names eight
supports:

```
read_aloud, glossary, translate, simplified,
spellcheck, word_prediction, speech_to_text, magnify
```

Exactly **one** of those eight (`translate`) travels through `callGemini`. Read-aloud
is speech synthesis. Magnify is presentation. Spellcheck is the browser. Word
prediction is the keyboard. We wrote a vocabulary describing scaffolding, then attached
it to a network boundary that cannot see seven-eighths of it.

This costs each lens differently:

- **Integrity** was over-counting: a translation logged identically to a request to
  write a paragraph. Fixed within AI calls by `f04974fcb`.
- **Support-fade (MTSS/RTI)** was near-useless and still is. A fade record that sees
  only AI is blind to most of what an IEP actually specifies. A team asking "does this
  student need less scaffolding over time?" gets an answer drawn from a minority of the
  scaffolding.

Scaffolding is also **per-tool rather than centralized**. Only the tool knows it gave a
sentence frame. Inferring support at a shared chokepoint is the same category of error
as inferring paste origin from a length jump: the inference site lacks the information,
so it guesses, and the guess lands on a child.

### 15.2 The change

**A `support` event any tool can emit.**

```
support: { kind, level, insertedToWork?, assistiveTech? }
```

`kind` uses the existing vocabulary, extended as tools are instrumented. `level` reuses
`PROMPT_LEVELS` (`model | guided | hint | none`), which is the errorless-learning
hierarchy and was never an AI concept — it describes a word bank or a frame as
naturally as a chatbot turn.

`noteSupport(kind, level, opts)` on the ledger, exposed on `window` beside the existing
declaration hook, so loaded modules and STEM tools can emit without importing anything.

`callGemini` becomes one *source* of support events rather than the spine. The
declare-then-consume mechanism from `f04974fcb` survives for that path only: it exists
solely because a network wrapper cannot see its caller, and a self-declaring tool has
no such problem.

### 15.3 What we do NOT record (extends constraint 1 and §5)

The tempting version of this feature logs *what the scaffold said*. It must not.

- **No scaffold content.** Not the frame text, not the glossary definition, not the
  simplified passage, not the chatbot's reply. Record that a scaffold of a kind was
  provided at a level. If we ever need to prove *which* frame appeared, hash it.
- **Reason:** content turns a scaffolding record into a readable transcript of a child
  struggling, and that document will eventually be read by someone it was not written
  for. It also breaks the metadata-only spine carrying the FERPA posture (constraint 5).
- The existing `promptPreview` (120 chars, support lens only, stripped from submission
  exports) remains the sole exception and does not widen here.

### 15.4 Constraint 8, restated as populations

Hard constraint 8 currently separates the two lenses by **fields**. That is too weak
once most scaffolds are non-AI. The correct rule separates by **population**:

> **Integrity sees only what went INTO the work.** Support sees everything that helped
> the student.

The discriminator already exists in the schema: `insertedToWork`.

- A word bank does not make an essay non-original. Nor does read-aloud, magnify, or
  translating the prompt. These are invisible to the integrity lens entirely.
- A generative helper whose output the student inserted is visible to both.

Two consequences worth stating plainly:

1. **Broad scaffold logging makes the integrity panel quieter, not noisier.** Almost
   everything newly recorded routes away from it.
2. **The near-miss that produced this rule.** During `f04974fcb` a per-support *name*
   map was briefly placed in the integrity summary. That lists which accommodations a
   child leans on inside a panel about integrity: "needs help" rendered in the register
   of "might be cheating", constraint 8's exact failure. Caught before commit. The wall
   test that should have caught it passed by accident, because the field was named
   `aiBySupport` and the capital S walked through a `not.toContain('support')` check.
   That assertion is now case-insensitive. **A substring pin guarding a design
   constraint is only as strong as its casing.**

### 15.5 Coverage must be stated, never implied

Instrumentation will be partial for a long time, and **two of the eight named supports
can never be recorded at all** (verified 2026-08-05, zero occurrences in either ANTI
copy):

- `spellcheck` — not an AlloFlow feature; the browser default on every text field.
- `word_prediction` — OS keyboard behaviour, same class.

They sit in the vocabulary as though tracked. They are not, and no future work changes
that.

A record implying completeness while being partial is harmful in **both** directions:

- **Integrity:** absence gets read as evidence. "No supports recorded" must never be
  available as a claim about a student.
- **MTSS:** under-counted support makes a student look more independent than they are —
  a record capable of influencing a fading decision or a service level.

Both summaries must therefore carry an explicit coverage statement naming what is
observed, what is not yet instrumented, and what is permanently unobservable. Binding
requirement, not later polish.

### 15.6 Instrumentation map (scouted 2026-08-05)

| Tier | Supports | Seam | Cost |
|---|---|---|---|
| Single chokepoint | `read_aloud` | `window.AlloSpeechPlayer` (ANTI ~4721, 6 refs) — a singleton built to replace ~20 scattered `speak()` sites; covers browser TTS, Kokoro, Piper and Gemini TTS at one point | Low |
| Single chokepoint | `translate` | already labelled at the leveled-text path | Done |
| Single chokepoint | `speech_to_text` | `SpeechRecognition` (11 refs) | Low |
| Feature-local | `glossary`, `simplified`, `explain_content`, `allobot` | scattered; one at a time | Medium |
| Needs checking | `magnify` | `fontSize`/`zoom` has 131 hits, mostly unrelated; an in-app control may or may not exist | Unknown |
| Never observable | `spellcheck`, `word_prediction` | none exists | Document only |

15.2 through 15.5 are self-contained and require no tool to be instrumented. Tier 1 is
the proof the shape works.

### 15.7 Decisions (Aaron, 2026-08-05)

All three resolved. Recorded with the reasoning, because the reasoning is the part that
will matter when someone revisits this.

**1. One ledger, with support events BUCKETED.** Neither of the options originally posed.
Support events are far more frequent than AI calls (read-aloud alone could be 60 in a
session), so chaining each one spends CPU and payload on events nobody would ever forge.
But splitting into two records loses the ordered timeline the fade lens depends on.
Bucketing resolves both: aggregate support events into ~15s windows exactly as `noteEdit`
already does, so 60 read-aloud requests become a handful of `read_aloud ×7` entries in one
timeline. Reuses machinery that already exists and is already tested.

**2. No consent checkbox. An explanation instead.** See the constraint-2 amendment (§2.2).
Minors give assent, not consent; parents consent, outside the app, as part of the pilot.
A checkbox at submit is a pseudo-choice on a decision a student is not positioned to make,
and it carries a specific harm: **an opt-out that can be noticed is not a free choice**, so
a visible decline reads as concealment. Worse, the students most likely to decline are the
ones the support lane exists to serve.

What ships in its place is instructional rather than pseudo-legal: a plain-language
explanation of what a teacher can see and why, plus a reminder to use AlloFlow's own
supports or a trusted adult rather than other online services. That does something the
checkbox never could — it gives the student a reason to prefer the supports we can
actually see and account for. Final wording to Dr. Howorth (§12.7–12.10).

**3. Track WHICH supports were used. Bind the presentation, not the collection.**
Reversed from the earlier recommendation, and the earlier reasoning was wrong. It assumed
a reader who defaults to skepticism, and that assumption did all the work.

If read-aloud is in a student's IEP, using it during a checkpoint is expected and
appropriate: not a caveat on the answer, but evidence the plan was followed. Suppressing
it creates an **accommodation-compliance gap** — a later reader cannot tell whether
accommodations were provided at all. And "we won't record this because a teacher might
misread it" is paternalism; everywhere else this design answers misreading by fixing the
framing, not by withholding the fact.

So collection is full. Presentation is bound, at the DATA layer rather than the view
(view-only walls were already found to be fiction — see the §13 note):

- The **support export** keeps full fidelity, counts included. A checkpoint window is
  precisely when the fade lens most wants to know what was active.
- The **checkpoint's own record** carries a list of supports *provided*, never a tally.
  "Read-aloud available and used", not `read_aloud ×3`. Counts live only in the support
  export, so the integrity-facing document is *structurally incapable* of rendering a
  frequency beside a correct answer.

This mirrors real assessment practice: a protocol documents that accommodations were
provided per the plan. It does not attach a tally of how often the student used the
reader. The first protects the validity of the administration; the second characterizes
the child.

### 15.8 Phase placement

Slots as **P7**, after P6 (MTSS lane), because P6 is the consumer that makes it worth
having. Nothing in P0–P5 depends on it, and `f04974fcb` stays correct within its
narrower scope until this supersedes it.

---

*Design principle in one line: make honest work easy to demonstrate and dishonest work
expensive to hide — and never build the button that accuses a child.*
