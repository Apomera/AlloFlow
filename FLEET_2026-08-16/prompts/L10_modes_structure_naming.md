You are **Lane 10** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L10**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: modes, structure, and naming

Your lane is the most heterogeneous: one real grading bug, several structural questions about
where features live, and one naming problem. Handle the bug first, since it is the only item
here that produces a wrong answer for a student.

## Files you own

- `lingua_practice_module.js` and the language deck practice path
- `educator_evaluation_source.jsx` (builder `node _build_educator_evaluation_module.js`),
  `educator_evaluation_standalone.js`, `_build_educator_evaluation_apps_script.js`
- `adventure_source.jsx` (plus its byte-identical twin `desktop/web-app/src/adventure_source.jsx`),
  `adventure_handlers_source.jsx`, `adventure_session_handlers_source.jsx`
- `student_analytics_module.js` and the student view panel
- `video_studio_module.js` — **plain JS, no source pair, edit directly**
- `math_fluency_module.js` — **plain JS, no source pair, edit directly**
- The family mode surface

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`.

`adventure_source.jsx` is a duplicated source: copy any edit to `desktop/web-app/src/` and run
`node dev-tools/check_source_pair_drift.js`. There is also a dedicated builder,
`node _build_adventure_module.js`, with a `--check` mode used by the gate.

**Do not touch `stem_lab/` files** without checking `git status --short -- stem_lab/` first;
other sessions work there frequently. C5 below is deliberately scoped as analysis, not surgery.

## Scope

**C2 — Language deck practice marks correct answers wrong.** Aaron picked what he believes was
the right answer in multiple-choice practice mode and the app said it was wrong, and he recalls
the audio feedback and the visual verdict disagreeing with each other. That mismatch is the
strongest clue: two code paths are deciding correctness independently, and they disagree. Find
both and make one of them the single source of truth.

This codebase has a documented family of bugs that produce exactly this symptom, so check these
specifically: an answer index stored separately from the answer text so shuffling desynchronizes
them; options shuffled at draw time rather than at generation time, so the correct index points
at a moved item; and grading functions held in state, which get stripped by serialization and
silently fail. Also check for a second question bank shadowing the first. Once fixed, add a
test that would have caught it.

**C3 — Educator evaluation mode.** It currently reads like a local-only prototype rather than
a usable tool. Aaron says it was modified toward a real secondary QR code path, intended so a
principal could set it up themselves without district IT provisioning anything, in contrast to
the more involved Drive-based storage path. He believes ChatGPT worked on this and does not
know whether it landed correctly, and he is clear that right now it is not obvious how to use
it or whether it is a demo or ready. Establish what actually exists, then make the state
unambiguous: it should be clear from the app how to use it and what it is. If the QR path works,
document it in the UI and remove the prototype framing. If it does not work, say so plainly in
your report rather than dressing it up. Aaron's requirement is that it be usable from the app.

**C4 — Adventure mode should be conditional.** The student panel always offers "resume
adventure" and "start new adventure." Aaron's concern is twofold and both parts are real.
First, a teacher whose lesson has no adventure content may feel obliged to include it merely
because it is there. Second, and worse, with browser local storage a student can resume an
adventure from a *previous* lesson and stop attending to the current one. Make adventure mode
appear only when the current lesson actually includes it, and scope "resume" to the current
lesson rather than to whatever is in storage. The second half matters more than the first.

**C4b — Student view panel review.** It has not been looked at in a while and may be behind
the rest of the app. Review it and improve what is clearly outdated. Keep this proportionate;
C2 and C4 are the priorities in the student area.

**C5 — STEM Lab versus the math tools (analysis, not surgery).** Aaron's observation: STEM Lab
has outgrown being a mode inside the math tool, and separately, the math fluency features are
buried where nobody finds them. He floated moving math fluency into STEM Lab and is unsure. He
is also unsure whether the math generation UI is well designed.

STEM Lab is large, actively worked on by other sessions, and a restructuring there is not
something to start inside a ten-agent parallel run. **Deliver an analysis and a recommendation,
not a migration.** Cover: what the current coupling actually is, what discoverability problem
math fluency really has and whether relocation or navigation fixes it, and what a separation
would cost. Small, safe, clearly-good discoverability improvements that do not move files are
in scope; a restructure is not.

**C6 — Video Studio.** The IT helper screen-recording tool now exists standalone, so its demo
version inside Video Studio is redundant. Remove it, after confirming the standalone version
genuinely covers the same ground. Separately, Aaron finds the Video Studio UI overloaded, "not
terrible, but a little bit like too much, too many things," and thinks guiding the user through
it would help. Simplify what you can and consider a light guided path through the main flow.

**C7 — Rename "Visual Support".** It reads as an umbrella term that could mean many things,
when what it actually does is generate images. Aaron wants a clearer name and has not landed
on one; he floated "visual imagery" and "image creator," rejected plain "image creation" as
inaccurate, and noted the code already calls it something like images. Pick a name that says
what it does without overclaiming, and check it does not collide with Visual Organizer, which
is the confusion he is trying to resolve. Change user-facing copy only, leave code identifiers
alone, and list the changed `ui_strings.js` keys in your report for Lane 5.

**N8 — Family mode audit.** It has not been checked against recent features. Audit coverage and
fix what is clearly missing or broken. Report the gaps you do not close.

## Notes

- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Do not deploy, push, or commit. Aaron batches that himself.
- No em dashes in user-facing text.
- Write `FLEET_2026-08-16/reports/L10_report.md` as you go, per RULES section 6.
