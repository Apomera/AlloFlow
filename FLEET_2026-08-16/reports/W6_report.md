# Lane W6 — Docs sync (run inline by the coordinator, at Aaron's request)

**Status:** complete. Guide now 13 chapters, rebuilt, byte-checked, task-path coverage intact.

## Absorbed

**Lane 9 (the gap L11 flagged).** Swept all chapters for the old names first: zero stale hits —
L11's deployment-hedged prose never named "Create Resource" or "Manage local storage", so the
work was additive, not corrective:

- **Find a tool** documented in Prepare a lesson (what it filters vs what creates, the
  "A filter is on: showing 8 of 22" honesty contract, dismissal only from an inert state).
- **Toasts / Messages log** documented in Troubleshooting ("If a message disappeared before
  you finished reading it" → the header lightbulb's Messages list).

**Wave 2.**
- **Worksheet vs Print/Save as PDF** (L8/E4's plain-language answer) and the **fill-in-the-blank
  worksheet** (W5's printable cloze, incl. the any-language claim its tests back) added to
  Prepare a lesson's delivery-testing section.
- **W7's AI gating** documented in Troubleshooting: what the "✨ AI extras: off" pill means
  (nothing is broken; the sims work; click for the three ways to turn AI on, Canvas first).

**Two new chapters**, both now that their surfaces have settled:
- `12-adventure-mode.md` — the assignment switch (default on, so shared lessons keep behaving),
  the two conditions for student visibility, lesson-scoped resume (with the honest note that
  pre-update saves carry no lesson tag), the gloss-language change, and graded-work guidance.
  Placed after Live sessions; added to the "running a live class" reading path.
- `13-math-fluency.md` — where it lives, the Ctrl+K door W3 built (with the real aliases:
  "math minute", "CBM probe"...), the offer-before-acting behaviour, who can reach it, and the
  deliberate maze launch card. Placed before Specialist reference; added to the accessibility/
  specialist reading path.

## Labels L11 could not confirm

Confirmed from `ui_strings.js` and used: **Find a tool** (`sidebar.tool_finder_title`) and the
Messages/Ideas tabs. The help-search and tour labels remain generic in the chapters — still no
single authoritative string surfaced, and generic descriptions remain safer than guessed names.

## Pipeline

- Manifest: 2 entries inserted positionally (not appended), summaries in house style; both
  chapters added to task paths (the reachability test enforces this and caught the omission).
- One cross-reference name fixed to the canonical "Specialist and product reference" (the
  consistent-name test caught my variant — the gate works).
- Two hardcoded 30s test timeouts raised to 240s: the link-resolution walk legitimately takes
  ~46s at 13 chapters on this machine under load; the 30s ceiling was sized for fewer chapters
  and an idle disk. Same class as the doc_pipeline parity-test timeout W5 filed.
- `build_teacher_guide.cjs`: clean build + clean `--check`, 13 chapters / 21 files.

## `lastVerified` — the decision prepared for Aaron

Recommendation: **bump it to 2026-08-16 at the next deploy.** L11 held it because wave-1
verification was source-only; since then W2 browser-verified the surfaces the manual's
step-by-step claims lean on hardest (Universal Settings' Translations control, the toast
placement and Messages log, the guided banner, the language-deck verdicts), and this lane's
two new chapters describe behaviour pinned by fresh test suites (adventure_lesson_scope,
math_fluency_palette_reachability). That meets the stamp's bar in my judgment. It is one word
in `guide.json` plus a rebuild — left un-bumped so the call stays Aaron's.

## Honest gaps

- The two new chapters are verified against reports, tests, and source — not against a running
  app. Same caveat L11 recorded for its Universal Settings chapter.
- W7's teacher-surface disable sweep is deferred (see W7's report); the Troubleshooting copy
  documents only what shipped (the STEM pill and setup panel), so nothing in the manual
  overclaims.
