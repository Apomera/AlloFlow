# Wave 2 — Integration and completion

**Date:** 2026-08-16 · **Coordinator:** same as wave 1 · **Base:** wave 1 complete (see
`reports/L1..L11`), ~270 modified files, ideally committed before this wave launches.

Wave 1 was breadth. Wave 2 is convergence: finish the two incomplete lanes, land the work
that was deliberately held, translate everything, verify visually what wave 1 could only
verify structurally, and clear the one gate failure that is masking all others.

**RULES.md still governs.** Same lock protocol (`dev-tools/fleet_lock.cjs`), same
no-commit/no-deploy rule, same report format, reports to `FLEET_2026-08-16/reports/W<N>_report.md`.
One addition to the hot-file list, learned from wave 1: **`doc_pipeline_source.jsx`** is now
lock-protected alongside the original four.

## Lanes

| Lane | Mission | Key files |
|---|---|---|
| W1 | i18n completion: help strings, cmd manifest, propagate every wave-1 key to 63 packs | `ui_strings.js` (owner), `help_strings.js`, `lang/**`, `dev-tools/i18n/**` |
| W2 | Theme apply + visual verification sweep of every unverified visual claim from wave 1 | `app_styles_source.jsx`, probe harnesses, screenshots |
| W3 | L10 completion (C5 analysis, N8 family mode) + mode-gate leak + math fluency discoverability | `view_header_source.jsx`, `allo_commands_source.jsx`, family mode surfaces |
| W4 | Test-prep content QA: clear the 67 findings, rebuild `test_prep_hub_module.js` | `test_prep/**`, `dev-tools/review_non_eppp_against_eppp.cjs` (read) |
| W5 | Loose ends: the cross-lane requests no wave-1 lane could take | `generate_dispatcher_source.jsx` (lock), `AlloFlowANTI.txt` (lock), `doc_pipeline_source.jsx` (lock), `adventure_handlers_source.jsx` |
| W6 | Docs sync: absorb L9/L10/wave-2 changes into the teacher manual; runs LAST | `docs/teacher-guide/**` |

## Sequencing

- W1, W3, W4, W5 start immediately, in parallel.
- W2 starts immediately but runs its **apply sequence last**, after W3 and W5 report done
  (the generated theme block snapshots the token union across view files; applying while
  they edit re-stales it).
- W6 starts only after W1, W2, W3, W5 have final reports.

## Duplicate-lane guard (new rule, learned in wave 1)

Lane 10 ran **twice**, concurrently — two agents both believed they were L10 and both wrote
into the same report and the same source files. Nothing was lost only because both used Edit
rather than Write. Wave-2 rule: **on startup, check whether `reports/W<N>_report.md` already
exists with content you did not write.** If it does, you are a duplicate: STOP, append a note
to `CROSS_LANE_REQUESTS.md`, and do not proceed. Aaron: launch each W prompt exactly once.
Mid-run, before concluding "another session did this" about W-lane-shaped changes, consider a
duplicate of your own lane; merge as an addendum, never rewrite another agent's section.

## The gate unblock (W1, first task, benefits everyone)

`npm run verify:gate` fails at `check_cmd_i18n` for every session until
`node dev-tools/i18n/extract_cmd_keys.cjs` regenerates the manifest and the ~21 new keys
are translated across the packs. W1 does this first so every other lane gets a clean gate.

## Aaron's manual test list (nothing here is agent-verifiable)

Collected from every wave-1 report, in priority order, ~20 minutes total:

1. **Spanish read-aloud** (L6/V3) — pick any Spanish text, listen. Was permanently broken.
2. **Cold Kokoro start** (L6/V2) — fresh page load, first TTS request in English. Should work first try.
3. **Kokoro download pill** (L6/V1) — should be a small bottom-center pill, never a full-screen takeover, and nothing at all if the model is cached.
4. **Dark mode: typography panel + narrator dropdown** (L2/D1-D2) — open both in dark mode, with your OS in LIGHT mode (that combination was the broken one).
5. **AlloBot X mid-narration** (L7/A3) — start Read This Page on browser voice, dismiss AlloBot mid-sentence. Narration must continue.
6. **"Build a lesson" by voice** (L7/A2) — should offer, not yank you to Quick Start.
7. **Guided mode → History** (L9/N2) — click History during a guided run. It should open, with a "still running" strip.
8. **Toast position** (L9/D4) — generate something; toasts should be top-center; lightbulb should hold the message log.
9. **Crossword print** (L1/G7) — Ctrl+P from the crossword modal; check the grid, clues, and the answer-key page.
10. **Reading level** (L3/C1) — generate the same 5th-grade topic short (<600 words), long, and long+research. The new measured-level chip tells you the answer without Check Level.
11. **Cloze in Spanish lesson** (L3/L1) — type the English term; expect "cell (célula)", your answer preserved.
12. **iPhone: Kokoro in the voice list** (L6/V5) — should now appear (or appear disabled with a reason).
13. **Language deck practice** (L10/C2) — right answer should be green AND chime. Was contradicting itself.

## Commit checkpoint (Aaron, not agents)

Before wave 2 if possible. Pathspec only; never `git add -A`; read `git diff --cached
--name-only` as its own command first. Remember `fc0cbcdcd` and `6a9eb11c3` already contain
Lane 8's doc_pipeline work under unrelated messages — do not revert them casually.
