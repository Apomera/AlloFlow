# Track 11: consistent selected-passage context

Prepared an isolated engine improvement so clicked words and drag selections share one
passage-text projection. It preserves line and cell boundaries, removes reader-only
content, and finds the actual selected pane when a DOM range starts on a container.
**394 tests passed across 14 files; five selected baseline cases failed by assertion.**
Shared application source and generated/public mirrors were not edited by this work.
Integration remains pending.

## Baseline and ranked evidence

Prepared HEAD: `13ebcc73f5784436643adc7c12ff8d83d5b29028`.
Final verified HEAD: `286e09850680047d44efcc836075916cf488eff6`.
The reader changed during preparation. The fingerprint guard detected it, and the final
candidate was regenerated from the newer source, preserving its translation-target and
adaptation-control changes. All relevant source fingerprints matched at final verification.
This dirty, concurrently edited checkout does not identify the deployed release.
No applicable `AGENTS.md` was found in the workspace or inspected ancestors.

Paths in the evidence table are relative to
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` and refer to the inspected shared source.

| Priority | Exact source evidence | Classification and observed effect |
| --- | --- | --- |
| P2 | `content_engine_source.jsx:3193`, `content_engine_source.jsx:3232` | Reproduced in jsdom: selecting an English pane via `range.selectNode(section)` leaves endpoints on its parent. The old capture has no passage, uses the saved Spanish language, and sends the pane heading and status label as the selected phrase. |
| P2 | `content_engine_source.jsx:3185`, `content_engine_source.jsx:3215` | Reproduced: the exclusion list omits reader UI/chart markers, hidden/inert content, alerts, and script/style text. Those strings enter the passage and shift the occurrence offsets. |
| P2 | `content_engine_source.jsx:3188`, `content_engine_source.jsx:3220` | Reproduced for both definition and phonics: `textContent` joins text across a BR, producing `money.The river`. Table cells are also absent from the old semantic block selector: a source gap covered by the new candidate tests, not a separate baseline reproduction. |
| P3 | `content_engine_source.jsx:3504` | Reproduced: an explicitly empty `lookupText` falls back to raw menu text and starts an AI definition for reader UI. |
| Follow-up | `content_engine_source.jsx:3265` | Unverified risk retained for a separate batch: the fixed 12,000-character prompt window can omit part of a long selection. This patch does not change prompt clipping. |

`source-reproduction.json` records five expected assertion failures against the frozen,
unchanged engine module, with 19 unrelated cases excluded by the name filter. These are
source-level DOM reproductions with deferred mock providers, not deployed-browser or
live-provider observations. `baseline.json` records all source, dependency, and candidate
hashes; `verification.json` reports `verified: true`.

## Minimal change and existing safeguards

The new engine projection finds actual selected text before choosing its language,
comparison version, and semantic blocks. Text and UTF-16 offsets come from the same
projection. Explicit BRs and block/cell transitions contribute newlines; ordinary inline
formatting contributes no extra spaces. Excluded reader elements contribute no text or
offsets. A selection containing only excluded content does not open Define. An explicitly
empty projected selection cannot fall back to the raw menu text.

Requests retain strings and offsets, not DOM nodes. The saved artifact remains the source
of grade. Retry continues to use its immutable original request after selection or DOM
disappears, and dismissal still rejects late completion. Dictionary/prepared results keep
their independent ownership when AI fails or is disabled. Revise, Explain, and Add to
glossary retain their original raw selection text.

Existing clicked-pane recovery through `data-reading-language` remains intact. No new
renderer language argument or speech signature is introduced. The reader's current
translation-target handling (`view_simplified_source.jsx:2166`) is preserved. Normal word
rendering (`view_simplified_source.jsx:5195`) and the exact renderer
(`view_simplified_source.jsx:5075`) remain their owners' code. Passage audio continues to
consume the captured passage and language (`view_simplified_source.jsx:5510`).

## Focused acceptance coverage

The 26 new cases comprise 24 engine cases and two real reader/engine popup cases:

- Saved grade 3 versus ambient grade 9/French; whole English and Spanish pane selections
  with endpoints outside the pane, while headings/status labels remain excluded.
- Repeated-word definition and phonics context across BRs; consecutive BRs, adjacent
  table cells, inline formatting, partial text endpoints, element child offsets, emoji,
  and combining characters. Every captured selected slice matches its word/phrase.
- Interleaved bilingual content and same-language exact-comparison versions: use the
  first selected passage's language and comparison version, excluding the other pane.
- UI-only selections and an explicitly empty lookup; raw selection text for other tools.
- Dictionary success followed by AI failure, retry after DOM removal and ambient changes,
  preserved request identity, and ignored completion after close.

The combined run also retains existing prepared-help, navigation, cancellation, disabled-AI,
dictionary-cache/race, media deadline, popup speech, and keyboard-focus regression coverage.
`tests.json` records **394 passed, zero failed, zero skipped** in 14 files. The earlier
`focused-tests.json` records 184 passes against the first frozen reader baseline; the final
combined result uses the refreshed candidates in this directory.

The lifecycle and hidden-AI guard suites retain their production-module loaders. Focused
lookup/popup, dictionary, image, and candidate-aware reader suites use candidate overrides.
The popup tests run the actual candidate reader with the candidate engine. Local generated
module checks do not establish deployed-release parity.

Before release, the integrator should manually select whole panes and text spanning line
breaks in the supported browsers, confirm the shown meaning and passage audio, then close
during pending work. Browser-specific selection behavior and pronunciation quality remain
unverified. The table tests validate the projection helper; this batch adds no table-word UI.

## Ownership, dependencies, and integration handoff

Track 11 owns `dev-tools/prepare_reading_lookup_context.cjs`, its new focused test,
the candidate-loader/popup-test updates, and this report directory. Shared engine, reader,
host, dictionary, translation, and generated files remain with the integrator/other owners.
Dependency **06** continues to apply. Track **17** should retain the current pane language
and saved grade contract; this batch adds no translation strings. The previous availability
batch's two keys remain in `../availability/strings.delta.json`. No other session was contacted.

For a checkout matching this baseline, use this directory's four cumulative patches:
`engine.patch`, `reader.patch`, `host.patch`, and `dictionary.patch`. They contain the
pending availability, media, and dictionary work as well as this engine projection change.
They supersede the older cumulative sets; do not stack them with those sets or replace
shared files with the frozen candidate copies.

If the preceding availability bundle has already been integrated, merge only
`engine-context.patch` for the new projection work, after confirming its base. Do not apply
both engine patches. Preserve any newer concurrent work and regenerate/retest candidates
when source fingerprints differ. The shared-file owner should then perform the repository's
normal scoped source/mirror generation and release checks. No deployment is performed here.

All four cumulative patches passed read-only `git apply --check --ignore-space-change -p0`.
Transforms parse successfully and are idempotent. Full patches and the engine-only increment
reproduce the tested candidates in memory; artifact/dependency fingerprints match.

Reproduction command, from the workspace root:

```powershell
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/context/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/context/view_simplified_module.candidate.js'
$env:ADAPTED_HELP_VIEW=$env:ALLO_VIEW_CANDIDATE
$env:ALLO_LOOKUP_HOST_CANDIDATE='reports/lookup-recovery/context/host.candidate.source.js'
$env:ALLO_DICT_CANDIDATE='reports/lookup-recovery/context/dictionary.candidate.source.js'
node node_modules/vitest/vitest.mjs run tests/reading_lookup_context.test.js tests/reading_word_image_ownership.test.js tests/dictionary_lookup_cancellation.test.js tests/dictionary_lookup_race.test.js tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --testTimeout=15000 --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/context/tests.json
node dev-tools/prepare_reading_lookup_context.cjs --verify
```
