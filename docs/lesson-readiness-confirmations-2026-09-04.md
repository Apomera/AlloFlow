# Lesson-specific readiness confirmations - 2026-09-04

Implemented locally; not deployed.

## Changes

Manual readiness confirmations previously lived in one unscoped localStorage object. A different lesson could inherit those confirmations. They now belong to a fingerprint of the current source, selected Guided steps, learning goal, and Guided-created History resources.

- Reopening the same materials restores the manual confirmations.
- Changes to the source, resource contents/configuration, resource IDs, selected path, or learning goal reopen manual checks. Undoing a change does not silently restore earlier confirmations.
- Changes to unrelated History entries do not invalidate the reviewed lesson.
- Pending resource hydration pauses restoration and persistence rather than overwriting the saved checks with an incomplete context.
- Older unscoped confirmations are discarded. Only known check IDs with literal true values are accepted from storage.
- Automatically recorded evidence stays checked and is not presented as an editable checkbox. Manual controls are locked while generation is busy or resources are unavailable.
- Storage failures are visible. The current session retains its checkbox values, and the stale stored record is removed when possible to prevent an older confirmation from reappearing.

The readiness record stores a local change-detection fingerprint and check IDs, not a duplicate copy of lesson text. The fingerprint is not a security or authentication mechanism. Existing Guided progress and project formats remain unchanged.

## Validation

- Guided Mode regression results: reports/classroom-review-2026-09-04/readiness-regression.json.
- Added 13 regression cases covering persistence, legacy data, source/resource/settings/goal changes, undo, unrelated History, hydration, malformed values, storage failure, and locked controls.
- Browser results: readiness-browser.json in the same directory. Checks include keyboard confirmation, source-change invalidation, the finish gate, storage-failure recovery, and mobile layout.
- A focused automated accessibility scan covers the readiness region: readiness-axe.json. Screenshot: readiness-mobile.png.

## Limits

The browser harness mounts the real built GuidedModeBanner and GuidedModeConfig; it does not exercise the whole application, live AI, or exported files. The change detector covers the source and Guided-created History records. Document Builder edits that have not been written back to History, changes made to downloaded files, and external delivery settings still require the teacher's review. New copy uses English and the existing localization fallback; additional translations are not included.
