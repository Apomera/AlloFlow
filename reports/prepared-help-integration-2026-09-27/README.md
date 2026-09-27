# Prepared word help: completed local integration

The approved prepared-help changes are integrated into the shared reader. Baseline HEAD: `af3c6b82ab76dad40a5d44f785bf828d1adea86c`. Isolated source checkpoint: `9134ae01676fb5d0c8de58165412f306e788ea26`, including earlier commits `9c57ee3b3`, `b75aa83e4`, `c55cfe16d`, and `9c7c087f5`. The local working tree is not the deployed release.

During verification, concurrent source-research work advanced shared HEAD to `3752fe48d98ee8096e456d766427f3f513a11b25`. Its changed-file list was inspected. The final hash receipt has zero drift across every recorded reader, helper, host, engine, style and adjacent-test input; the passing results remain applicable to those bytes.

## Results and evidence

| Priority / classification | Counterexample | Integrated minimal change and exact location |
| --- | --- | --- |
| P1, reproduced component/browser failure in prior isolated evidence | Hiding, revising, removing, or withdrawing adapted supports while a card is open retained obsolete content or pending audio. Learner changes also needed a boundary. | Require the current accepted, shown entry and current support revision/learner scope; withdraw obsolete cards before paint and clean up owned audio. `view_simplified_source.jsx:4065`, `:4888`, `:4891`; regressions `tests/prepared_word_help_regressions.test.js:346`, `:403`. |
| P1/P2, reproduced exact-context failure in prior isolated evidence | A phrase spanning source paragraphs could highlight intervening translated text or controls. More about this word could infer the wrong occurrence from the last word or list button. | Build ranges only within accepted source text nodes (`view_simplified_source.jsx:1887`); pass the validated passage, exact offsets, phrase, language and prepared explanation to the existing lookup interface (`:5451`). Regressions `tests/prepared_word_help_regressions.test.js:97`, `:259`. |
| P2, reproduced interaction failure in prior isolated evidence | Reactivating the same word did not refocus the card; a second activation of pending pronunciation requested speech again. | Focus each new card activation (`view_simplified_source.jsx:4043`); recognize its assigned audio ID even before playback is ready (`:5018`). Existing scoped close logic at `:4044` stops only card-owned IDs. |
| P2, reproduced component failure in this pass | Open help was visible, but missing from the button's accessible name. | Prepend the same localized visible action while retaining Prepared word help and the exact word (`view_simplified_source.jsx:2041`; regression `tests/prepared_word_help_regressions.test.js:187`). |
| P2, reproduced component failure in this pass | Student preview said to select an underlined word when CSS Highlights were unavailable. | Use the existing truthful no-marks fallback (`view_simplified_source.jsx:4008`; regression `tests/prepared_word_help_regressions.test.js:194`). |
| P2, reproduced Chromium layout failure in this pass | At 320px, a picture plus explanation plus two buttons reduced the explanation to zero width and pushed a control outside the panel. Five of six original layout cases failed readability/containment. | Wrap actions below the explanation, allow text wrapping and constrain control width (`view_simplified_source.jsx:2035`). The six final cases pass with pictures, long translated labels and normal/doubled text size. |

No source/citation rewriting was introduced. Existing exact-occurrence, Unicode, formatted text, links, table fallback, cloze/comparison exclusion, source-pane scope, picture credits, keyboard/touch, Escape/focus return, and no-AI prepared explanation safeguards remain covered. A prepared activation makes neither a sentence-playback call nor an ordinary lookup call in the acceptance fixtures. The optional More action remains separate and appears only where the host accepts it.

## Verification

- **315/315 assertions passed across 11 suites** against the integrated shared reader/current engine, including 58 prepared-help, 58 support-draft transition, and six cache-retention cases. Evidence: `tests.json`.
- **16 Chromium interaction groups**, **eight preview checks**, and **six responsive layout cases** passed, with no page errors. Evidence: `browser-results.json`, `integration-preview-results.json`, `layout-results.json`; screenshots: `prepared-help-phone.png`, `prepared-help-320-large.png`.
- Browser styling uses the app Tailwind configuration and index.css compiled for the reader. Widths 320/390/768px; root text 16/32px. This is a reader fixture, not a full host-shell or installed-desktop visual signoff.
- Shared reader build, root/public byte parity, exact live-loader pins, and scoped whitespace checks pass. Reader SHA-256: `ca2364ecc2e5e6f7bd9ebba26279dff79aae49227bc1615a7ddb1a8dd45ed493`; live reader pin: `ca2364ec` in all three hosts.
- Isolated initial verification had a 10-second setup timeout: eight suites/193 assertions passed, 58 assertions were skipped. That suite passed all 58 on retry with a 30-second setup allowance; the final integrated run used that setup allowance and normal individual-test timeouts. Existing React act warnings remain. The evidence does not imply global CI is green.

Source input snapshots, three-way merge outputs, and hashes are recorded in `integration.json` and `before`, `base`, `incoming`, `merged`. The old base is `452e7cd230b62f4e192f055826817653d5b997f4`. The initial loader guard stopped on a historical URL in a comment. It was narrowed to the live CDN URL. Concurrent research engine/host changes were reviewed or preserved byte-for-byte; an interrupted desktop write was completed with atomic replacement. No external work was rolled back. The shared Git index stayed unchanged.

## Ownership and release handoff

This track changed bounded reader JSX/test hunks, regenerated `view_simplified_module.js` and `desktop/web-app/public/view_simplified_module.js`, and changed only the live reader URL in `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, and `desktop/web-app/src/App.jsx`. The newer editor partial-save confirmation at `view_simplified_source.jsx:1673`, current place-cache helper, support-draft helper, other host code, research engine, catalogs and staged work were preserved. Track04 and Track09 prerequisites were already integrated; future same-file work must merge against these current shared bytes.

The scoped implementation and evidence are committed on `codex/prepared-help-context`; shared integration remains a working-tree delta because these files contain other owners' uncommitted work. Do not replace the shared reader wholesale from that branch or consume the shared staged index. A coordinating release can commit the merged working tree after reviewing other tracks.

**Not verified:** actual screen-reader/voice-control behavior, actual pronunciation or live-provider cancellation, full host/desktop build, and deployed bytes. Browser audio/AI boundaries use callback spies; no live AI request is needed for prepared explanations. No install, push, deployment, app-saved-state operation, or message to another session was performed. Existing `desktop/app-build` output was not rebuilt; it remains a release artifact requiring a separate app build.

Acceptance for a later release: one keyboard/touch activation opens the exact prepared support without reading a sentence or invoking a second lookup; repeated words/formatted phrases stay exact; source-language help cannot appear in a translated pane; hidden/stale/withdrawn supports disappear before paint; Escape returns focus; only owned audio is stopped; both list controls and explanation remain visible at narrow widths/enlarged text; prepared help works with AI and CSS Highlights unavailable. Preserve original passage and citation bytes.

Reproduction commands from the shared workspace:

```powershell
node node_modules/vitest/vitest.mjs run tests/prepared_word_help_regressions.test.js tests/adapted_word_help_ui.test.js tests/reading_gloss_context.test.js tests/reader_polish_b10.test.js tests/adapted_reading_enhancements.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_supports.test.js tests/reader_render_cost.test.js tests/reader_preview_isolation.test.js tests/reading_support_draft_transitions.test.js tests/reader_place_retention.test.js --maxWorkers=1 --no-cache --hookTimeout=30000
$env:PREPARED_HELP_STYLE_DIR=(Get-Location).Path
$env:PREPARED_HELP_OUTPUT_DIR=Join-Path (Get-Location).Path 'reports/prepared-help-integration-2026-09-27'
node reports/prepared-help-integration-2026-09-27/browser-check.cjs
node reports/prepared-help-integration-2026-09-27/browser-check.cjs --preview-probe
node reports/prepared-help-integration-2026-09-27/browser-check.cjs --layout-probe
node reports/prepared-help-integration-2026-09-27/verify.cjs
```

The browser fixture creates disposable loopback/browser state and closes its server. The final verifier checks the recorded inputs and writes only its own receipt; later unrelated host/engine updates will correctly report drift and require review before release.
