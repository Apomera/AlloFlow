You are **Lane W1** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md` in full, then `FLEET_2026-08-16/WAVE2_PLAN.md`.
Your lane ID for locks and reports is **W1**. You continue and complete wave 1's Lane 5, whose
partial report is `FLEET_2026-08-16/reports/L5_report.md` — read it; its method notes about
translator aliases and scanner limits are load-bearing.

## Your mission: finish localization, unblock the gate, propagate everything

You are the wave's critical path. Ten other lanes generated roughly 150 new or changed
`ui_strings.js` keys and every one of them is English-only until you land.

## Files you own

- `ui_strings.js` + `desktop/web-app/public/ui_strings.js` mirror — you are the primary owner
  this wave, but W3 and W5 may still add keys under lock, so keep using
  `fleet_lock.cjs acquire ui_strings.js --lane=W1` and re-Read after acquiring.
- `help_strings.js` (exclusive)
- `lang/**` and the `desktop/web-app/public/lang/` mirror; `lang/manifest.json` via
  `node dev-tools/update_lang_manifest.cjs`
- `dev-tools/i18n/**`, including `cmd_keys_en.json`

## Tasks, in order

**1. Unblock the gate. Do this first — every session benefits.**
`npm run verify:gate` fails at `check_cmd_i18n`: ~21 `cmd.*` keys exist in
`allo_commands_source.jsx` (they were there at HEAD; wave 1's L7 added a few more) and are
missing from the manifest. Run `node dev-tools/i18n/extract_cmd_keys.cjs`, then translate the
new keys across the packs per the existing cmd-i18n process (`dev-tools/i18n/merge_cmd_keys.cjs`
— read `check_cmd_i18n.cjs`'s header for the exact contract). Verify `npm run verify:gate` now
proceeds past `check_cmd_i18n`, and report which check (if any) it fails at afterward.

**2. Finish S2 — help strings.** Wave 1 stopped mid-task here. The standard from the original
prompt stands: verify each entry against actual behavior, remove or correct wrong entries
(worse than none), add entries for uncovered features, 3rd-4th grade reading level. Two
specific adds requested by other lanes: `universal_translations` (L4 built the control and
referenced the key; the entry must describe the Automatic / None / named-language choices) and
entries for the renamed surfaces below. L11's `docs/teacher-guide/COVERAGE.md` is a useful
coverage spine. Also sweep `help_strings.js` for the old names: "Visual Support" → "Lesson
Images", "Simplified" → adapted-text phrasing (but NOT the STEM fraction/map/APA senses — L3's
report lists the five false positives to leave).

**3. Propagate every wave-1 key to the packs (S2b).** Each lane's report ends with a "for
Lane 5" list. Collect them all:

- **L1:** `glossary.empty_*` (7), `games.crossword.rtl_note`, print keys; plus the **G3 rename
  derivation**: all 63 packs still carry "Glossary & Language Selection" in 3 keys each
  (189 values). L1's report section G3 documents the derivation rule and warns about the
  hybrid half-English packs — read it before scripting the split.
- **L3:** 16 keys (adapted-text values, measured-level chip, cloze passage_form, finder note).
- **L4:** 8 keys (`universal.translations*`, `output.translation_*`) — `{language}`, `{output}`,
  `{target}` placeholders must survive translation.
- **L7:** 10 keys (`voice_control.*`, `bot.mic_*`) — `{action}`, `{topic}` placeholders.
- **L8:** 9 keys (`export_preview.format_help_*`, actions, `workbench_help`).
- **L9:** ~55 keys (its report has the full grouped list: `guided`, `sidebar.tool_finder_*`,
  `hints`, `tour`, `canvas_settings`, `platform_diag`, `storage`, `pdf_audit`, `universal`).
- **L10:** 8 values (Lesson Images renames + adventure keys), plus make
  `FLASHCARD_NO_ANSWER` ("Translation unavailable", currently hardcoded in
  `AlloFlowANTI.txt` — add a key and read it via `t()` under lock, or file to W5 if you judge
  the ANTI edit out of scope).
- **L8 also filed:** the exported quiz renders literal keys `output.quiz_mcq` and
  `output.quiz_reflection` plus an `undefined` reflection prompt — missing `t()` coverage on the
  export path. Fix the missing entries; if the defect is in `doc_pipeline_source.jsx` (W5's
  lock list), file it to W5 with specifics.

Check `lang/*_HANDOFF.md` before touching partially-translated packs with human owners.
Hand-translated content outranks machine rebuilds. Packs are `JSON.parse`d — malformed = hard
failure. Run `node dev-tools/check_lang_json.cjs` after every batch, regenerate the manifest,
mirror to `desktop/web-app/public/lang/`.

**4. Resume S1 where wave 1 left it.** The remaining `AlloFlowANTI.txt` clusters are mapped in
L5's report (storage manager ~59 findings, AlloHaven ~39, workspace tabs ~27, long tail ~294).
Continue by panel, complete panels only, priority by teacher traffic. This is the elastic task:
do as much as fits, report the honest remainder with the scanner's number.

## Verification

- `node dev-tools/scan_shell_i18n.cjs` before/after numbers in your report.
- `npm run verify:gate` — after your task 1, this must get past `check_cmd_i18n`. Report where
  it lands.
- `JSON.parse` on `ui_strings.js` and every touched pack after every burst.
- No em dashes in any user-facing value. Brand names do-not-translate. Placeholders survive.

Write `FLEET_2026-08-16/reports/W1_report.md` incrementally, leading with the gate status.
