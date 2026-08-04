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
2. **The student owns the log.** The full ledger is visible to the student in plain
   language before submission, every session. Submitting it is an explicit act. There is
   no hidden channel that reports on a student behind their back.
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

## 12. Open questions for Aaron (SME judgment, not engineering)

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

---

*Design principle in one line: make honest work easy to demonstrate and dishonest work
expensive to hide — and never build the button that accuses a child.*
