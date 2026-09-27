# Track 13 — received original evidence

2026-09-27. Baseline: `af3c6b82ab76dad40a5d44f785bf828d1adea86c`. Final observed HEAD: `3752fe48d98ee8096e456d766427f3f513a11b25`. A concurrent source-research commit moved HEAD during validation. The delivery codecs, saved-assignment callback, Mailbox receiver and recipient wrapper are byte-identical between that baseline and the current source after line-ending normalization. This is local source/fixture evidence; the deployed release was not checked.

## Implemented changes

The received description now consistently follows a validated original in the supplied resource bundle. It does not search teacher History or another device's cache.

| Priority | Reproduced defect | Fix and evidence |
| --- | --- | --- |
| P2 | A valid matching original could be listed as included while the capability description called its text unavailable and reported zero supports/pictures, because the adaptation retained an older unavailable flag. | shared_activity_source.jsx:321 accepts the validated received pair as evidence. Its support/picture counts then come from that same original. |
| P2 | The description could report an older original role copied into the adaptation, despite receiving the current original alongside it. | shared_activity_source.jsx:368 reads the paired original's role. Captured-only descriptions still use their owned source metadata. |
| P2 | A resource containing old text/snapshot fields plus an unresolved asset reference could qualify as a received original. | shared_activity_source.jsx:312 and :400 exclude unresolved asset/manifest references from matching-original evidence. |

Eight behavioral fixtures were added at tests/connected_reading_delivery.test.js:253. Four failed before the fix; the others confirmed existing rejection of wrong-family, wrong-unit, truncated and unavailable originals. A React fixture at tests/connected_delivery_followup.test.js:105 checks the visible message and count as the original arrives and is removed.

## Safeguards and nonfindings

Matching still requires the existing source family, lesson unit, exact source text, valid snapshot and supported-original contract. Removing the original removes the paired evidence and changes the description revision. Source resources are not mutated. A captured snapshot can still be reported independently when it is valid; it does not become a separately received resource.

The route matrix and serialized preview contract in README.md remain unchanged. No payload fields, media export permissions, privacy exclusions, audio claims, image budgets, citation behavior or role assignments were changed. This is a description fix, not a change to the student's reading selection or educator authorization. Dependencies 01/02/08 retain their source/identity/support contracts; coordination with 14 for portable audio remains separate.

## Validation

- **282 tests passed in 16 files**, run beginning 11:11:00 local tool output; duration 20.88 seconds. The command is the runtime suite recorded in HYDRATION.md, with nine additional tests in its existing files.
- **16 isolated Chromium cases passed**, no page errors. The added case checks original arrival, current role and removal against the real received-details component. Existing cold-open, refresh, embedded offline reopen, saved-asset, Mailbox and audio fixtures remain passing.
- SharedActivity rebuilt; source build function, root module and public mirror match exactly. Scoped whitespace checks passed.
- After HEAD moved, the four host delivery regions used by the fixtures were compared with the earlier committed baseline and were unchanged. The existing hydration host patch still applies exactly.

Browser fixtures use disposable profiles, intercepted fixture URLs and an in-memory asset backend. They do not establish live-backend behavior, deployed-shell offline boot, physical audibility or release status. Runtime summaries continue to distinguish audio bytes from verified playback.

Evidence: paired-source-baseline.json, paired-source-validation.json and browser-results.json. Earlier reports retain their own historical counts.

## Ownership and integration

This pass changed only shared_activity_source.jsx, its root/public generated pair, connected-reading/UI tests, the isolated browser fixture, the Work Log and this report directory. No shared host, shared reader, locale, loader pin, Git state or deployed app was changed by this track. Other owners' work and the earlier hydration fixes were preserved.

Integrator 01 should include the updated SharedActivity bytes in the normal mirror/pin release process. No new host change is needed for this received-pair fix. The earlier hydration-host-integration.patch remains **pending**; it is a separate local-autosave requirement described in HYDRATION.md. Its prior nine candidate tests are historical evidence, not newly counted in the 282 runtime tests here. No other sessions were contacted.
