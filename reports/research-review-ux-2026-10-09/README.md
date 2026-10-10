# Research Review UX

Local implementation, 2026-10-09. No commit, push, or deployment.

## Scope

- Separate scrolling review content from a persistent Generate/selection/status/Undo footer.
- Consolidate source selection into one native checkbox, with exact selected-passage counts.
- Quiet excluded-source highlights without dimming readable text or hiding supporting passages.
- Distinguish source use for writing from sharing source names/excerpts with students.
- Restore keyboard focus after removal, Undo, and research cancellation.
- Keep long feedback scrollable without covering the primary action on short screens.

The main Research toggle, settings behavior, student Sources view, evidence/privacy rules, and provider requests are unchanged.

## Verification

- Focused review/settings UI checks: 41/41 passed (33 review, 8 settings), including mixed passage selection, independent student sharing, removal/Undo focus, and cancellation with no enabled discovery/generation action. See `ui-tests.json`.
- Adjacent regression checks: 65/65 passed across own-source toggle wiring, delayed module loading, lesson controls, AI permission, and research-query transport. See `adjacent-tests.json`.
- Canonical-module Chromium checks: 12/12 passed, with zero page errors or external requests. These cover arbitrary public topics in ordinary one-click research, selection persistence, private-source projection, keyboard focus, and footer layout at 1280x900, 390x844, 320x640, 844x400, 320x320, and 375x375. See `browser-results.json`.
- Desktop, phone, scrolled form, and short-screen error/Undo screenshots were visually inspected. Content scrolls above the footer; Generate and Undo remain reachable. The smallest full-page captures include the background page outside the viewport; geometry assertions independently verify the visible dialog.
- Runtime parity: MiscPanels SHA-256 `8a96620ac45717c7504699e6ee8cf84310633a84baa640414611a12056a26fff`, matching existing runtime mirrors and all three host pins. See `artifacts.json`; rerun `node reports/research-review-ux-2026-10-09/sync.cjs --check` for a read-only check.
- Scoped `git diff --check` passed.

## Reproduction

- Run the two UI suites and five adjacent suites named in their JSON reports with Vitest. The existing `reports/research-student-sources-2026-10-08/vitest-startup.cjs` loader extends only worker startup allowance, not assertion timeouts.
- Run `node reports/research-review-ux-2026-10-09/run-browser.cjs` for a self-contained preview/browser check. Its preview is stopped on completion.
- Run `node reports/research-review-ux-2026-10-09/start-preview.cjs` to leave a hidden loopback-only preview open. The current URL is written to `preview.json`.

## Verification Limits

Initial Windows sandbox test attempts failed before assertions because Vitest could not rename its temporary cache. The adjacent-test retry outside that sandbox passed. An earlier focused UI run passed 40 tests; a subsequent attempt exited in native Node before all tests ran. Only completed final reports count as final verification.

The sandbox could not find the installed Chromium, and interrupted tool sessions dropped detached previews. The self-contained runner avoids that preview lifetime dependency. One browser attempt passed ten scenarios before an ambiguous test selector found a hidden history entry; targeting the visible alert corrected the fixture, and all twelve scenarios passed afterward. Browser fixtures simulate providers and use no production data.

Twelve new labels are registered in both English catalogs, with runtime English fallbacks; other language packs were not translated in this pass. No live-provider evaluation, full application build, physical assistive-technology session, commit, push, or deployment was performed.
