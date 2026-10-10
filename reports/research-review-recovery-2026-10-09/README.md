# Research Review Recovery

Implemented locally on 2026-10-09. No commit, push, or deployment.

## Changes

- Unsent public-query, URL, title, and pasted-text fields survive closing/reopening review and remounting the same editor. This uses the existing in-memory editor session, not browser storage. Changing the topic clears the draft, including while review is closed. Reloading the application does not preserve these drafts.
- A successful paste clears its text fields only when the returned collection contains a newly added passage. Duplicate, capacity-limited, cancelled, and failed additions keep the draft. Collection actions announce added-passage counts or no additions in the visible footer; writing is not reported as evidence collection.
- Research settings and review use the existing shared, reference-counted body scroll lock. Closing one dialog cannot unlock another modal; the previous overflow style is restored when the final owner closes.
- Keyboard focus filtering honors controls disabled by a fieldset. Collection completion repairs focus lost when the initiating button disables itself, while leaving deliberate focus changes alone. This fixes Escape becoming ineffective after adding a passage.

No new automatic search, provider call, persistence API, topic restriction, or student-sharing permission was added. Existing source-review limits and underlying retrieval/generation behavior are unchanged.

## Verification

- 56/56 focused UI checks passed: 43 review and 13 settings. This includes 15 new regression cases beyond the prior UX pass. See `ui-tests.json`.
- 64/64 completed adjacent checks passed across own-source toggle wiring, delayed module loading, lesson controls, and research-query transport. See `adjacent-completed.json` for the preserved completed run.
- Seven new canonical-module Chromium scenarios passed, including duplicate/full collection recovery, topic-scoped drafts, no storage/provider activity while typing, scroll isolation, and ordinary arbitrary-topic research. See `browser-results.json`.
- Twelve prior browser scenarios passed against the updated module, covering privacy/selection behavior, keyboard focus, and six desktop/mobile/short viewport sizes. See `layout-results.json`.
- Phone draft-restoration, capacity-feedback, and existing layout screenshots were inspected. Source content remains separate from the persistent actions, without horizontal overflow or footer overlap.
- MiscPanels SHA-256: `6307aa752ca35f36aadafac2170a39300d79b0033180d510faf51a08ce6a26a9`. Existing runtime mirrors and three host pins were synchronized. Unrelated host differences were preserved. See `artifacts.json` and `sync.cjs --check`.

## Reproduction

- `node reports/research-review-recovery-2026-10-09/run-browser.cjs`
- `node reports/research-review-recovery-2026-10-09/run-browser.cjs layout-regression.cjs`
- `node reports/research-review-recovery-2026-10-09/start-preview.cjs` starts a hidden loopback-only preview and records its URL in `preview.json`.

Browser fixtures simulate search, page retrieval, and AI replies using canonical modules. They use no live providers or production data. Four labels were registered in both English catalogs with runtime English fallbacks; other languages were not translated.

## Failed Attempts And Limits

The first focus-filter test exposed a selector compatibility problem; querying candidates then filtering effective `:disabled` state passed both the inherited-fieldset and existing keyboard tests. The initial new browser run exposed the real completion-focus bug, which was fixed and covered by regression tests. Two subsequent fixture corrections awaited a committed topic change and allowed value assertions on correctly collapsed draft fields.

One module-pin synchronization encountered a temporary Windows file-open error; the retry and final parity check succeeded. Interrupted tool sessions were resumed from saved outputs. A supplementary five-file adjacent-test rerun failed during Node memory allocation before assertions and was stopped; it is not counted as a pass. The preserved four-file completed report is the basis for the 64 adjacent checks above.

No full application build, live-provider evaluation, or physical assistive-technology session was performed.
