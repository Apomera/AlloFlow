# Classroom delivery enhancements

Completed 2026-09-19 (local time). Source changes only; no deployment or installer build.

Teachers now see what a saved homework link contains: the opening reading, matching original, and validated saved word-support counts. The summary uses the delivered packet and includes no original passage or gloss definitions. Unavailable or reduced readings receive explicit guidance.

Link conversion carries the saved resource selection instead of silently using all History. Older links require reselection before conversion. If selected resources have been deleted, packet creation stops with guidance; intentional activity-only links still work.

Cold student opens wait for the deferred reader, retain the packet through module failure/retry, and open once when ready. A successful manual History selection cancels the pending open immediately; failed opens retain recovery. Stale callbacks and teacher-mode transitions cannot override the newer selection.

The stale intake tests now run the current production host handlers. Canonical and both desktop source copies have matching changed regions and pass Babel parsing. Generated root/public modules match, and loader version pins match their generated contents. The live-session-dock pin mismatch discovered during validation was repaired after confirming its root/public files matched.

Validation:

- 115/115 targeted tests pass across 12 files, combining the latest result for each suite. See [validation-summary.json](validation-summary.json).
- 4 delivery-dialog browser scenarios pass: desktop and 320px layout, keyboard controls, saved IDs, escaped titles, and legacy link behavior. No horizontal overflow, page errors, or external requests. See [browser QA](BROWSER_QA.md). That UI run preceded the final deleted-selection builder guard; generated-runtime contract tests cover the guard.
- 10 local classroom-journey checks pass: production original open, educator curation, browser reload, selected-resource pack, delayed student opening, separate student context, narrow-screen reading, and document output. Exact original and curated supports survive. See [journey evidence](../novak-classroom-journey/README.md).
- Scoped whitespace check passes. [Source integrity](source-integrity.json) records synchronized regions; absent optional app-build paths were not created.

Limits: the journey uses a clearly labeled mocked model response and a preauthored adapted reading. It exercises integrated production components and handlers, not the entire application or real cloud/mailbox transport. Live model quality, assistive-technology testing, installation, and classroom use remain unverified by this pass. Adjacent host-handler extraction assertions and a worker-startup timeout observed by the intake review are documented in the handoff and are outside these final targeted suites.

Concurrent working-tree changes were preserved. No commit, push, publication, or deployment was made.
