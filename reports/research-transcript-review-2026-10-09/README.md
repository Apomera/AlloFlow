# Transcript Review Refinement

Local implementation and verification completed, 2026-10-09.

Scope: video capability/progress feedback and explicit transcript excerpt reselection inside existing research review. Full transcripts remain in a bounded memory-only review cache, separate from saved research packets, writer prompts and student exports. Existing evidence limits and provider/privacy guards remain unchanged.

No timestamp/clip implementation, live-provider call, commit, push or deployment.

## Behavior

- Video actions show provider, role, managed-policy or module-unavailable guidance before activation. An available connection shows transcription-specific progress; a following webpage resets it to collection progress. Cancellation remains live.
- A private in-memory review session retains at most three validated transcripts of at most 200,000 characters each. The cache survives close/reopen and editor remount under the same host owner, is cleared on topic change, and is not written to browser storage, research packets, writer evidence or student/export metadata. Reloading the page or evicting an old entry requires a new explicit transcription request.
- Transcript callbacks are staged until the current collection result arrives. Cancelled, outdated and post-completion callbacks cannot populate the cache; successful earlier results in a partially failed collection remain available with its preserved packet.
- The chooser shows eight exact candidate passages per page with local text filtering. Draft choices survive filtering and pagination but change the evidence collection only on Apply. Reset restores the current collection selection. Full transcripts are not automatically supplied to the writer.
- Replacement is atomic and only affects AI transcript rows for that video. Other evidence, source exclusions and retained passage exclusions remain intact. Limits remain 1,200 characters per passage, four passages per source and 24 per review. The UI prevents clearing the last video-only row; the existing remove-source command remains available.
- AI transcript caveats are retained. No timestamps, verified-caption claims or relaxed policy decisions were added.

## Verification

- 340 distinct tests passed across ten suites: engine/review147, review/settings/transcript UI121, relevance/student projection/reader/export72. Receipts: `engine-tests.json` (146 initial engine tests), `final-ui-video-tests.json` (36 final transcript UI +64 final video tests), `regression-recovery-tests.json` (113), and the three completed suites in `regression-tests.json` (44). Repeated cases are counted once; the final video file supersedes its earlier63-case run.
- Final canonical browser verification: 10/10 passed on ContentEngine `c24d7626` and MiscPanels `80da1b78`, with no page errors or unexpected external requests. It covers four unavailable configurations, progress/cancellation, local pagination/filter/reselection, writing with only chosen evidence, close/reopen/topic reset, source exclusions, ordinary webpages, and mixed video/webpage progress. See `browser-results.json`.
- Desktop and 320/390px screenshots were inspected. Controls, passage text and persistent selection footer remain within bounds without overlap or horizontal overflow. An initial browser helper attempted to clear page-one selections while still on page two; that fixture error was corrected without weakening product assertions and is retained in `browser-fixture-initial.json`.
- Independent read-only cache/lifecycle/privacy audit found the last-row selection edge, fixed before the final build; no remaining blocker reported.
- ContentEngine and MiscPanels builds completed and existing source/runtime mirrors plus root CDN pins synchronized. Desktop hosts retain local module paths. A transient Windows source-mirror file-open failure succeeded on retry.
- 21 English catalog entries registered; other locales use existing fallbacks.

The supplementary regression batch hit `ENOSPC` after 44 passing tests; three suites could not write their startup cache. That unsuccessful full run is retained as `regression-tests.json`, not counted as a complete passing batch. All three interrupted suites subsequently passed (113 tests) in `regression-recovery-tests.json`. Windows process-startup failures and a lost browser session also required bounded retries; only completed results are counted. No user files or unrelated caches were removed. Final scoped whitespace and runtime/source mirror checks passed.

Reproduction: `node reports/research-transcript-review-2026-10-09/sync.cjs --check` verifies module parity. Browser fixtures use canonical modules with synthetic provider responses, not live Gemini or production data.

Run `node reports/research-transcript-review-2026-10-09/run-browser.cjs` to repeat the browser scenarios. `start-preview.cjs` launches a separate hidden local preview. Final preview: http://127.0.0.1:49809/ (HTTP200 verified; `user-preview.json` records the persistent preview separately from temporary browser-run servers).
