# Steward connected effects

The annual planning view now has an optional “Explore connected effects” guide. Four selectable diagrams connect source places to affected places. Each diagram shows current scores, exact strict thresholds, capped benefits, and relevant action previews. The passage-and-shade connection shows both required conditions.

The guide checks the campaign’s real predicates without applying effects. Preview, Cancel, Apply and year-end handlers match the frozen preceding Water Cycle runtime. Selection preserves the campaign, learner notes and awards. Missing or ambiguous saved scores are reported as unavailable.

## Validation

- 84 focused tests passed across connections, decisions and history.
- 2185 browser checks passed, including 14 recorded native actions and 13 boundary cases.
- 8 scoped accessibility audits passed with zero violations; no runtime errors.
- 9 mounted-DOM screenshots cover action preview, desktop, phone, narrow host, dark, high contrast, forced colors and 150% zoom.

The browser fixture mounts the actual React renderer and native controls. It seeds campaign inputs for deterministic checks; model results come from the runtime. The fixed-seed action sequence is compared with frozen source e4fc1f8963506efd5d03dbab7cf4ce6204403f513899ff5fbedd225bbf57720c. Translation fallbacks are used in the fixture. Screenshots cover this guide’s DOM.

Conditions shown now or after an immediate action can change before their year-end check. Routine changes, events and difficulty adjustments happen first; earlier connected effects can change later conditions. Game scores describe the teaching campaign.

## Source and evidence

Final source: ad07af85cc74677dacb388dd27a29b5d874fc498773f6688a62953bccaa42a0a. Both installed copies match. The source proof adds only a read-only helper/export, scoped styles, the renderer and one annual insertion. Removing these additions reproduces the preceding source exactly. Existing model and handler bytes are preserved.

The verifier reconstructs the preceding source from the Hydro readability snapshot and Storm readout report, then applies this report’s four additions. It checks artifact hashes, runtime copies and saved test/browser receipts.

Run node reports/watercycle-steward-connections/verify.cjs from the repository. Use --snapshot-only to inspect historical evidence after future source changes.

No changes were committed.
