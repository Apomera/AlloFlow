# Memory Aid and Applied Challenge integration review — 2026-09-04

The earlier review was partly outdated. Its core ownership and submission concerns still applied, so this update prioritizes those boundaries and closes several remaining integration gaps.

## Already present

- Both views receive the host translator and have substantial translation namespaces.
- Memory Aid already routes its print action through the resource-sheet renderer and isolates private retrieval history by profile/tab.
- Applied Challenge now uses schema 6. Its document export already includes the evidence ledger, validation cycles, stress test, feedback question, role/audience, and phase supports.
- Applied Challenge already has optional organizer disclosure, progress indicators, typed HTML export, and submission import helpers.
- Both resources were already in the normal submission whitelist. However, the host still submitted their canonical resource objects.

## Implemented

- Added a shared StudioResponse boundary. Actual learner work goes to the existing student-response autosave store, with saving/saved/error status. Teacher templates and history no longer receive learner edits through these two views.
- Added an explicit teacher preview that resets independently, never submits or autosaves its work, and does not write Memory Aid private practice history.
- Kept teacher authoring and learner controls separate. Applied Challenge learners' fields are disabled in teacher authoring; phase prompts and family/agency/depth settings remain editable. Memory Aid visual approval is available in Edit.
- Added allowlisted, bounded submission adapters. Resource content contains response fields, not teacher facts/source excerpts or embedded media. Flat response entries retain compatibility with submission review; Applied Challenge imports its structured validation/self-check evidence as well.
- Preserved title, timestamps, metadata, and additional history data when the active resource is smaller than its history row.
- Passed explicit runtime-AI capabilities and null providers. An explicit restriction cannot fall back to a global provider. Existing playback functions remain connected.
- Removed Applied Challenge source excerpts from nested student-pack resources while retaining teacher-project data.
- Added explicit worksheet/reference/portfolio print entry points, export-selection toggles, and Applied Challenge section navigation with focus movement and current-step semantics.
- Full-document learner exports project the separate responses onto the template without changing it.
- Added Applied Challenge to the standard source rebuild sequence and a read-only generated-module freshness check. Rebuilt the local app and affected runtime mirrors.
- Added translation keys with English fallback for new controls. Existing locale files were preserved.

## Validation

- 205 focused tests covered the existing resource suites and the new boundary, migration, submission, export-selection, keyboard, and accessibility checks. The export-selection test inspects rendered content and table-of-contents links, rather than internal export metadata.
- Generated App JSX parses successfully.
- All seven affected runtime/string mirrors match their root files.
- Both resource source/build freshness checks pass.
- Host-prop validation reports no missing-prop candidates; module registration reports no missing producers.
- Accessibility automation excludes color-contrast checks in jsdom. At that stage, a browser audit and live mailbox delivery were not performed; the follow-up browser results are recorded below.

## Follow-up enhancements implemented

- Added a resource read-aloud registry for Memory Aid and Applied Challenge, connected to the existing durable audio service and karaoke store. Clips have stable field IDs, language, reference scope, and text fingerprints. Saved clips survive serialization/hydration; editing one field invalidates its clip independently.
- Added Edit-only Save TTS, cancellation, ready/stale/missing/corrupt states, per-field regeneration and downloads, and keyboard-operable read-along highlighting. Applied prompt playback moves focus to the corresponding workspace phase. Changing resources or leaving Edit cancels pending preparation.
- Saved reference clips remain playable with runtime AI disabled. Learner writing uses device speech without entering the teacher-reference store. Memory recall reads only the cue; it cannot enumerate hidden facts or private attempts.
- Added allowlisted audio portability with channel budgets: 128 KiB of decoded reference audio for homework/QR resources, 384 KiB for live/student-pack resources, and no reference audio in submissions. These are per-resource budgets shared across nested studios, not a promise that the whole pack fits in one QR code. Existing local project storage retains its normal durable store limits. Only current, valid reference clips travel; student recordings, legacy unidentified clips, quarantine entries, corrupt payloads, and stale text are excluded. The pack sanitizer restores validated clips after broader cloud sanitization.
- Accessibility Lab handoff now opens the actual studio renderer in an isolated student preview. Preview edits remain temporary and do not reach autosave or submission.
- Added translator-backed audio labels/statuses with English fallback, logical text alignment, visible focus states, and 44px audio controls. Browser checks cover RTL and reduced-motion settings. Memory Aid and Applied headers, plus Memory Aid recall instructions, now stack their actions at phone widths.
- Applied module generation now writes atomically, avoiding recurring partial/direct-write failures in this Windows workspace.

### Follow-up validation

- Broad regression run: 342 of 343 checks passed across 14 suites. The remaining failure is in unchanged Leveled Text playback code/tests: the test expects `tts-unavailable`, but the current fallback path reports `browser-tts-unavailable`. It reproduced in an isolated rerun. Neither that helper nor that test was modified by this update.
- Final checks after the responsive changes: all 126 checks passed across five affected suites, including all 17 new studio audio/preview tests. New coverage includes canonical-only synthesis, persistence/hydration, independent invalidation, repeated text with distinct IDs, restricted-AI saved playback, cancellation on role/resource changes, phase focus, nested delivery privacy, translation fallback, and RTL accessibility.
- Real Chromium checks of both authentic preview renderers at 390px width: no horizontal overflow, browser errors, or axe violations in either LTR or RTL (four checks, including color contrast). Reduced-motion preference was enabled. The captured Memory Aid layout was visually reviewed and its cramped header/recall layout corrected.
- Local development app build completed, generated JSX parses, all seven affected runtime/string mirrors match, both studio source freshness checks pass, all 209 module consumers have producers, and 63 view scans report no missing-prop candidates.

### Remaining limits

New UI strings use the existing translation mechanism with English fallback; new human-reviewed translations across every supported locale are not claimed. Audio service/persistence and delivery payloads were tested locally. External AI providers and live mailbox transmission were not exercised, and assistive-technology testing was automated rather than a manual screen-reader session.

Legacy work already embedded in a resource is preserved. Subsequent learner edits use the separate response document; preview reset starts with blank learner fields. Existing private retrieval attempts remain excluded from submission adapters.

Changes are local; nothing was published or deployed.

## Subsequent workflow pass

Focus mode, save recovery, text backups, audio pacing, teacher sharing checks, and Spanish/French/Arabic workflow translations are documented in [Studio workflow enhancements](STUDIO_WORKFLOW_ENHANCEMENTS_2026-09-04.md), along with the final local validation results and remaining external checks.
