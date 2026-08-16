You are **Lane 3** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L3**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: adapted text, cloze, and grade level correctness

Everything in your lane is about the app telling the truth about difficulty and language.

## Files you own

- `phase_n_misc_helpers_source.jsx` (cloze) — builder `node _build_phase_n_misc_helpers_module.js`
- The standards finder surface (locate it; `tests/standards_surprise_me.test.js` is a lead)
- Reading-level analysis helpers (locate them; search for readability, Flesch, Lexile, grade band)

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`,
`generate_dispatcher_source.jsx`.

`generate_dispatcher_source.jsx` is shared with Lane 4. **You own grade-level and reading-level
directives in it; Lane 4 owns translation directives.** Take the lock, re-read, edit promptly,
release.

## Scope

**L1 — Cloze shows the wrong language.** In a non-English lesson (Aaron tested Spanish), the
user types the correct **English** term into a cloze blank and the app displays the **Spanish**
term back. Aaron's judgment: showing the Spanish term when the user typed English is clearly
wrong. Showing only the English term is the simple fix; showing both is acceptable and he is
open to it. **Decide and implement.** Consider that a cloze exercise in a Spanish lesson may
legitimately want the Spanish term as the answer, in which case the real bug is that the
answer key and the accepted input have drifted apart. Work out which of those two situations
is actually happening before choosing the fix, because they call for different repairs. Record
the reasoning.

**L3 — "Simplified" should read "Adapted text" in user-facing copy.** Aaron is explicit: keep
`simplified` in code identifiers, state keys, and internal APIs where changing it would cause
breakage for no benefit. Change only what the user sees. He specifically named the Generate
Resource full-pack plan display, which still says "Simplified". Sweep for other user-facing
occurrences: `ui_strings.js` values (under lock), help strings if any, export labels, plan
summaries. If a string key is named `simplified`, leave the key and change the value. Note
that Lane 5 is doing a broader localization sweep and will propagate your changed English
values into the language packs, so leave a clear list of changed keys in your report.

**L4 — Cloze printable.** Aaron wonders whether cloze mode should be printable, possibly
surfaced in Document Builder when leveled text is detected. Assess feasibility, and implement
if it is a reasonable extension of the printable path that already exists for other
activities. Do not build a second printing mechanism. If it does not fit cleanly, say so and
describe what it would take.

**C1 — Reading level overshoot.** Aaron consistently sees a 5th grade request come back at
roughly 7th grade, worse when web research is enabled. His own read is that the model
underestimates the complexity of what it is producing. He explicitly does **not** want a
regenerate-until-it-passes loop, because the latency cost is not worth it and most users
revise with adapted text anyway. So the realistic options are prompt-side: sharpening the
grade-level directive, giving concrete sentence-length and syllable constraints rather than a
grade label alone, and checking whether the research pass reintroduces source vocabulary after
the leveling step. That last one is worth checking first, since it would explain why research
makes it worse. The repo already computes text complexity somewhere; find it and see whether
the result is being surfaced or silently discarded. A cheap, honest win would be reporting the
measured level to the user rather than hiding the gap. Implement what you judge best within
the no-regeneration-loop constraint, and write up anything larger.

**N7 — Standards finder uses the wrong grade level.** The target standards finder reads the
grade level from Universal Settings. When the user is working inside the source material
generator, which has its own grade level, that is wrong: with source text at 5th grade and
Universal Settings at 3rd, the user gets 3rd grade standards while plainly expecting 5th.
Aaron's preferred direction is that it should follow the grade level of the section the user
is in, and he is open to also letting the user adjust it directly. The clean design is a
resolution order (section-local grade if present, otherwise Universal Settings) plus a visible,
editable grade control on the finder so the user can always see and override what it is using.
Implement that unless you find a reason it breaks another caller. Check every call site of the
standards finder before changing the resolution order.

**T3 — Lesson plan language inconsistency.** Aaron suspects lesson plan generation does not
reliably honor a non-English output language. Confirm whether it is true before fixing. If the
lesson plan path builds its prompt differently from the other generators, that is the likely
cause. Lane 4 is building the translation settings contract; code against the language
directive as it exists today, note the dependency in your report, and do not stall waiting for
Lane 4.

## Notes

- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- Do not state contested science as fact, and no em dashes in user-facing text.
- Write `FLEET_2026-08-16/reports/L3_report.md` as you go, per RULES section 6.
