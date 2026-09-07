# Main 24 resources: learning-resource quality pass

Date: 2026-09-07. Scope: the current local working tree, following the September 4 review and implemented refinements. Existing Concept Sort/game work and earlier timer, identity and Activities fixes were preserved.

## Implemented improvements

- **DBQ completion:** the overall counter now includes every displayed analysis, source-reliability, corroboration, perspective, synthesis and current rubric response. Whitespace does not count as an answer; stale rubric entries cannot increase the counter. The authored-claim and fallback comparison-table modes count their own visible fields. Screen readers receive the numeric progress semantics.
- **DBQ option accessibility:** reliability/bias buttons expose their selected state. Reliability choices wrap within narrower cards.
- **DBQ printing:** source prose, questions, prompts, titles and rubric text remain literal text in the generated HTML. Source hyperlinks are restricted to valid HTTP(S) URLs and safely encoded. Four headings now evaluate their translation calls, instead of printing JavaScript-like placeholders. Empty sentence-starter arrays no longer print an undefined suggestion.
- **DBQ typography:** ordinary inline tab, badge and progress-label sizes use rem so that shared typography scaling can affect them. Print layout sizes remain separate from the live interface settings.
- **Sequence Builder:** keyboard reorder buttons now show up/down arrows instead of question marks. The image-regeneration control becomes visible on keyboard focus as well as pointer hover.

## Coverage of the eight assigned entries

| Resource | Review and verification |
| --- | --- |
| Assessment / Quiz | Reviewed typography and existing canonical answer-key/mode behavior. The answer-key and mode-preset regression suites passed; no additional confirmed defect was changed. |
| Concept Sort | Preserved ongoing edits and earlier canonical-type repairs. Existing dialog accessibility regressions passed. |
| Sequence Builder | Reviewed displayed editing controls and improved their visible cues. Earlier async ownership/history and topic-mode integration regressions passed. |
| Activities | Preserved structured Discussion/Jigsaw editing and learner projection. Existing main-24 runtime cases passed. |
| Adventure | All 12 existing runtime cases passed across the initial batch and isolated rerun. The deterministic builder check also passed directly; earlier combined runs hit timing limits under concurrent load. |
| Interview / Persona | Existing session-artifact and runtime suites passed, preserving learner/resource isolation. |
| DBQ | Implemented the confirmed completion, printable-content and selected-state issues above; added six focused runtime regressions. Earlier timer and reward regressions passed. |
| STEAM Lab / Math entry | Inspected the entry view and passed lifecycle/null-content regressions. Individual plugins were outside this pass. |

The typography scan found no other explicit inline font-family overrides in these eight main view sources. Math problem headings use the `font-serif` utility, so the shared typography work must cover utility font-family overrides. Its one fixed inline size belongs to a verification emoji and was kept as an icon size. Root owns shared typography settings/CSS and the final combined verification.

## Files

- `view_dbq_source.jsx`, `view_dbq_module.js`, and its desktop/public mirror.
- `view_timeline_source.jsx`, `view_timeline_module.js`, and its desktop/public mirror.
- `tests/main24_learning_quality.test.js`.

## Verification

- Both scoped module builders completed, producing identical root and desktop/public modules.
- **121 distinct tests passed across 11 files**, combining the initial batch and focused reruns. The initial batch passed 119/121: one new print fixture needed its document stream opened before writing a complete HTML page, and one existing Adventure subprocess check exceeded its timeout. The corrected DBQ file passed all 6 tests. The isolated Adventure subprocess test subsequently passed; its direct builder check also reported that generated outputs are current.
- Suites: `main24_learning_quality`, `main24_learning_refinements`, `quiz_answer_key_single_source`, `quiz_mode_presets`, `concept_sort_dialog_a11y`, `timeline_topic_mode_integration`, `persona_session_artifact`, `persona_runtime_deep_dive`, `adventure_runtime_regressions`, `math_state_lifecycle`, and `math_view_null_content` (all `.test.js`).

No deployment or commit was performed. Provider calls, live class transport, a full print-preview visual inspection and a manual screen-reader walkthrough were not part of this bounded pass.
