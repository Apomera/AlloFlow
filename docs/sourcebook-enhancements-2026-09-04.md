# Sourcebook enhancements — September 4, 2026

Implemented and validated locally. Nothing was deployed or staged.

## Changes

- Saved external assets now await exact source-record verification on import and restore. Commons, its four institutional collection routes, The Met, Art Institute of Chicago, Cleveland Museum, Library of Congress, Wellcome, Getty, and Openverse join the existing SMK, Yale, Rijksmuseum, and Museums Victoria verification paths.
- Verification compares the source record, image renditions, and reuse-rights identity. Imported creator/title/material claims are replaced with source-owned metadata. Commons institutional routes also recheck collection category membership. Unknown providers and failed or changed records are rejected.
- The code-owned shelf can still be reopened offline; imported modifications cannot override its catalog metadata. Saved external assets require a connection to verify before restoration.
- Medium, tags, and source filename now survive manifest serialization. Preparation, notes, and accessibility choices stay associated with their asset keys.
- Reference boards cover every selected asset, up to the existing 48-asset palette limit, across pages of at most 12 images. Multiple pages have explicit download links. The one-page filename remains compatible. Preparation failure prevents an incomplete board; failed crop/study preparation is no longer silently replaced by an unprepared image. Editing the palette invalidates stale download links.
- Find, Compare, Prepare, and Export navigation moves keyboard focus to the relevant controls. Loaded-result filters, collection descriptions, and optional role planning use collapsible sections. The header icon no longer shrinks into a narrow sliver.
- Undo revalidates external records before applying the snapshot and detects intervening palette changes. Failed verification leaves the current palette intact.
- Frequently used import, credit, progress, comparison, and workflow labels use translation helpers. New keys are registered in both English registries. Existing language packs retain their normal fallback behavior for new keys.

## Maintained sources and build

The existing single-file runtime and loader contract are preserved. Provider code is maintained in these fragments under dev-tools/sourcebook:

- commons-provider.js
- smk-and-source-identity.js
- yale-provider.js
- rijks-provider.js
- public-catalog-providers.js
- catalog-verification.js
- reference-board.js

Edit the fragment for code inside a BEGIN/END SOURCEBOOK HELPER block. Interface code outside those blocks remains in stem_lab/stem_tool_sourcebook.js.

Regenerate the runtime and its public mirror:

    node dev-tools/build_sourcebook_helpers.cjs

Verify helper and mirror parity:

    node dev-tools/build_sourcebook_helpers.cjs --check

The new detail lookups reuse existing source normalizers and fixed provider origins. The Art Institute detail endpoint and response shape are also documented in its [official API documentation](https://api.artic.edu/docs/).

## Validation

- 141 focused tests passed across sourcebook_contract.test.js and sourcebook_enhancements.test.js (113 contract checks plus 28 enhancement/recovery checks).
- Twenty-eight Chromium browser scenarios passed in the latest complete run. The original eight cover desktop workflow/focus; complete 13-image output; mobile fit/modal focus restoration; verified undo and changed-rights rejection; failed image preparation; concurrent import edits and retry/undo; explicit board cancellation and retry; cancellation after palette edits.
- Provider tests cover all eight added catalog adapter types and all four Commons institutional categories, changed rights, swapped images, unavailable records, cancellation, authoritative metadata replacement, and preparation retention.
- Reference-board tests cover 1, 12, 13, 25, and 48 images and failure on a later page.
- JavaScript syntax, helper build parity, runtime/public mirror equality, Sourcebook translation-section equality, and scoped whitespace checks passed.
- Browser screenshots: scratch/sourcebook-desktop.png and scratch/sourcebook-mobile.png. Browser image/API fixtures are deterministic; this was not a live-provider availability audit.

Unrelated pre-existing working-tree changes were preserved. No commit or deployment was made in the shared workspace.

## Continued reliability pass

- Imports now compare the latest palette state after catalog verification. If the collection, saved sources, preparation, or title changed while verification was pending, the import stops with a recovery message and preserves those edits. Successful imports take their undo snapshot from the latest state.
- Reference-board preparation has a labelled progress bar and Cancel preparation action. Cancellation aborts image requests when supported, stops later pages, and prevents delayed operations from publishing links or downloading files. Editing the export selection, image preparation, title, or column count also cancels stale preparation. A new attempt is independent of the cancelled operation.
- Failed image preparation names up to three affected sources so users can retry or adjust their selection. Cancelled image requests are not retried.
- Palette mutations now restart verification for external assets missing from the trusted in-memory map, even when a shelf-only edit leaves the external-asset signature unchanged. A regression test reproduces the saved Rijksmuseum image disappearing after saving another asset and verifies its recovery through exact-record verification.
- Six additional English translation keys are registered in both registries. Existing language packs use normal fallbacks.
- Added three board-helper tests, one saved Rijksmuseum UI regression, and three browser cases. APIs/images remain mocked; no live provider availability claims are made.

Final Sourcebook translation-section parity passed. Other tasks are editing the shared registries concurrently; unrelated registry differences were preserved.

## Package export and saved-record recovery

- Offline package preparation now supports cancellation, including from the Find view. Requests use abort signals where supported; later items stop, stale callbacks cannot download or reset a newer operation, and leaving Sourcebook cancels outstanding package work.
- Package operations track the exported assets, their preparation, and the title. Changes cancel an outdated operation before download. Retrying creates a package with the current title, notes, embedded images, and provenance.
- Image failures identify the count and up to three source titles. No partial package is downloaded; a retry can produce the complete package.
- Reproduced a separate data-loss bug: saving a shelf item while external saved-record verification was pending or failed dropped the hidden record from savedAssets. Merge actions now preserve the current palette and provide wait/retry guidance until verification is ready. The guard covers individual saves/removals, comparison/recommendation additions, selected removal, and imports. Explicit whole-palette replacement/clear keeps its existing confirmation behavior.
- Six additional English messages are registered in both Sourcebook translation sections. Other tasks' registry changes remain untouched.
- Validation: 137 focused tests passed. Sixteen browser scenarios passed across a 15-test suite and one additional focused case: five new package cases, two saved-record regressions, and one import/comparison preservation case join the original eight. Mobile cancellation panel reviewed at 390 px with no horizontal overflow; successful downloaded HTML inspected for the latest title/note and every embedded image. The saved-record regressions failed before the guard and passed afterward.
- APIs and images were mocked. No staging, commit, or deployment.

## Delayed search and recommendation refresh

- Confirmed two timing bugs with failing browser regressions: completed searches restored a removed shelf item and dropped a newly imported one, and switching off Save picks to palette during a search still saved its results.
- Recommendation additions now merge into the latest palette collection and verified saved-asset map. This preserves current order, imported sources, and removals, and applies the existing duplicate/capacity checks to the current collection. Preparation and title remain intact.
- Automatic additions require the setting to have been enabled at request start and to still be enabled at completion. This applies to both live searches and recommendation refreshes. Enabling it during a browse-only search takes effect on the next request. Verified results remain available for manual review/save.
- Added five browser regressions: import/removal/reorder during search; both auto-save toggle directions during search; external-source import during delayed recommendation refresh; opt-out during delayed refresh. Provider APIs and the asynchronous curation callback are mocked.
- Existing source identity, rights checks, and offline package behavior remain unchanged. No staging or deployment.

Validation for the delayed-search pass: 137 focused tests and all 21 Chromium browser scenarios passed. Syntax, helper/runtime/public-mirror parity, and scoped whitespace checks passed. No translation or style changes were needed.

## Individual image actions and source recovery

- Single-source downloads and Page Designer transfers share an operation lifecycle. Users can cancel from the main view or mobile detail dialog. A new image action replaces the previous operation; changing the selected image/preparation or leaving Sourcebook cancels pending work before output. Late callbacks cannot complete a cancelled action or clear a newer one.
- Reopening a saved palette first uses the existing strict batch validator. If it fails, bounded per-record checks recover healthy items and list the failed records individually. Imports and undo remain atomic and use their original strict verification. Recovery keeps the 48-asset limit.
- Failed saved records and preparation notes remain stored. Healthy verified sources remain available for export, including while failed records are retried. Retry this source targets only that record; the summary retry targets failed records. Existing palette merge guards remain in place until all saved records are verified.
- Failed images display Image unavailable across previews, palette strips, and comparison images. Cards and the preparation panel provide Retry image and Open source record controls outside inspection buttons. Tile previews also detect image-load failures.
- Twelve new English labels are registered in both Sourcebook registry sections. Current language packs keep normal fallback behavior.
- Added four recovery unit tests and seven browser cases covering partial verification/targeted retry, single-image cancellation and changed preparation for both output types, unmount protection, and mobile image failure recovery. Provider records, image payloads, and Page Designer handoffs are mocked.
- No commit, staging, deployment, or live-provider availability audit.

Validation for individual recovery: 113 contract tests and 28 enhancement/recovery tests passed across completed runs; all 28 Chromium scenarios passed in the final complete browser run. The focused recovery suite was rerun with a 60-second test deadline after host contention caused an existing mocked-provider timeout. Earlier test runs also encountered a transient disk-write error. Final syntax, helper/public parity, Sourcebook translation-section equality, and scoped whitespace checks passed. Reviewed scratch/sourcebook-image-recovery-mobile.png at 390 px: visible placeholder, separate 44 px recovery controls, no nested buttons/links, no horizontal overflow, and successful retry.

## Named palette checkpoints

- Added Palette checkpoints, a collapsed panel available in every workflow view, including an empty palette. Named checkpoints preserve the complete ordered palette, preparation, notes, and palette title. A blank checkpoint name uses the current palette title.
- Checkpoints are portable manifest candidates, not trusted catalog caches. Restore uses the same strict, atomic source verification as imports. Source rights or identity failures leave the current palette and history untouched.
- A successful restore first backs up the current nonempty palette, unless an identical version is already represented in history. The previous version is also available through Undo palette change. Restoring from an empty palette does not create an empty backup.
- History holds at most eight checkpoints and 160,000 serialized characters. Saves and restore backups never evict older entries. A full history asks the user to export and delete an older checkpoint before proceeding. Malformed history is preserved without overwriting it.
- Individual checkpoints can be exported as importable Sourcebook JSON and deleted after confirmation. These files contain source records and preparation; they do not embed image files.
- Restore can be cancelled, and leaving Sourcebook suppresses late completion. Any intervening change to the palette or history prevents a pending restore from replacing newer work.
- Added a maintained palette-history helper, synchronized runtime/public copies, 26 English registry labels, five focused history tests, and seven browser scenarios. Checkpoint data uses the existing Sourcebook tool state and survives closing/reopening the tool through the host's existing persistence mechanism.
- Verified mobile layout at 390 px: wrapped labels, separate controls at least 44 px tall, keyboard-operable disclosure, and no horizontal overflow. Screenshot: scratch/sourcebook-checkpoints-mobile.png.

Final checkpoint validation: all 146 focused tests (113 contract, 28 enhancement/recovery, five checkpoint tests) passed. All 35 Chromium browser scenarios passed in the final full run, including successful restore after cancellation. Syntax, maintained helper freshness, runtime/public byte parity, English Sourcebook registry parity, and scoped whitespace checks passed. Provider APIs and image responses remain mocked; this is not a live-provider availability audit. No staging, commit, or deployment.

## Import and undo lifecycle protection

- Reproduced two bugs with failing browser cases: a completed import and a completed undo both wrote saved palette data after Sourcebook had unmounted.
- Import and undo now share an operation lifecycle with a visible, cancellable status in every workflow view. Cancelling or leaving Sourcebook stops the pending FileReader and sends an abort signal to catalog requests. Late success/error callbacks cannot write palette data, emit obsolete messages, or clear a newer retry, even when a provider ignores the abort signal.
- Import, undo, and checkpoint restore cannot start overlapping verification operations. File-read errors and malformed JSON release the busy state so the user can retry.
- Verification checks the palette and undo target captured at the start. It checks both the latest rendered state and host-published tool data, covering updates published just before React rerenders. Checkpoint restoration uses the same additional host-data check. Newer notes, titles, collection changes, and undo history are preserved.
- Added five English labels and seven browser regressions: import/undo unmount protection, cancelled import/undo with a newer retry, changed undo target, and file-read cancellation/unmount with stale callbacks. Mobile cancellation status reviewed at 390 px; no horizontal overflow and a visible 44 px cancel control.
- Final validation: all 146 focused tests and all 42 Chromium browser scenarios passed. Both unmount regressions failed before the fix and passed afterward. Syntax, helper freshness, runtime/public parity, Sourcebook English registry parity, and scoped whitespace checks passed. Provider/image responses and delayed file reads are mocked. No staging, commit, deployment, or live-provider availability audit.

## Keyboard editing continuity

- Reproduced lost keyboard focus after removing a saved palette card and after moving a card to the end of its available reorder range.
- Palette removal now focuses the next visible card, then the preceding visible card if needed. Removing the final visible card focuses the palette heading. Bulk removal follows the same visible-card behavior; clearing the palette focuses search.
- Reordering keeps focus on the same Earlier/Later button while it remains enabled. At the boundary, focus moves to that card's inspection button. Screen-reader announcements identify the source and its new position out of the palette total.
- Deleting a checkpoint focuses the next available Restore control, or the checkpoint name field when no checkpoints remain. Cancelling checkpoint restore returns focus to its Restore button. Cancelling import/undo returns focus to the active workflow's search or palette-title field.
- Focus changes run after React updates the page. They select only visible, enabled targets, never activate inspection dialogs, and do not override a newer focus choice. The implementation uses no delayed focus timers.
- Added four English strings for the reorder announcement and localized selected-removal labels/confirmation. Added nine keyboard browser cases, including cancelled confirmation, spoken reorder position, mobile removal, and preserving a newer focus choice. Updated an obsolete source-string assertion for the localized removal label.
- Final validation: all 146 focused tests and 23 affected Chromium browser workflows passed. Both original focus regressions failed before the fix and passed afterward. Visual review caught a sticky-tray overlap; focus scrolling now reserves space based on the tray height. All nine keyboard scenarios passed again after that refinement, including an assertion that the mobile focused control sits below the tray. Reviewed scratch/sourcebook-keyboard-mobile.png at 390 px: focused card fully visible, no dialog opened, and no horizontal overflow. Syntax, helper freshness, runtime/public parity, English Sourcebook registry parity, and scoped whitespace checks passed. No staging, commit, or deployment.
