# Reader place persistence (track 03)

Implementation baseline: `fd4044c862ed9b345b340d69cb1411a19c09dafb`.
The user authorized implementation and explicitly selected the current source
contract for the track 01/12 dependency. This work does not change the host's
role/profile/nickname identity or contact other sessions.

## Ownership and integration

- `reader_place_store.js` owns validation, page-session drafts, persistence
  results, cross-tab writing, and retention limits.
- `view_simplified_source.jsx` owns reader lifetime, status/copy, retry, and
  answer/bookmark interactions. Answer updates are field patches.
- `_build_view_simplified_module.js` embeds the adapter ahead of the reader,
  producing the root and desktop/public reader bundles without a new CDN load.
- `AlloFlowANTI.txt` remains the authority for `readingLearnerKey`. Track 12 must
  preserve this scope on future identity work, and must not claim anonymous
  drafts for a named profile. Future shared-reader work in track 01 must retain
  these integration points and rebuild both generated reader files together.

## API and lifetime

`createReadingPlaceStore({ getStorage, getLocks })` supplies `load(scope)`,
`save(scope, patch)`, and `peek(scope)`. Scope contains the unchanged learner,
item ID, and exact-text fingerprint, plus canonical text for an additional
equality check on new records. Legacy v1 rows remain readable. A new record
whose checksum collides with saved different text fails without claiming or
overwriting the old work.

`save` updates the page-session draft synchronously and returns a promise with
one terminal status:

| Status | Meaning |
| --- | --- |
| `saved` | The current accepted draft completed a localStorage write. |
| `session-only` | An unnamed reader or isolated preview intentionally retains work in memory only. |
| `failed` | Durable persistence failed; the accepted draft remains in page memory. |

Results include `place`, `reason`, `medium`, `draftRevision`,
`persistedRevision`, and `retained: 'page-session'`. `load`/`peek` also expose
`ready` and `saving` lifecycle states. `load` distinguishes corruption/denied
access from empty storage via its failure reason and reports earlier-version
work via `revised`, including answer-only work.

Named and unnamed session drafts survive reader unmount/remount, reading
switches, and modes while this page remains loaded. Preview drafts belong to
the preview component and disappear when it closes. A real reload discards
session drafts and restores only committed records. No storage outcome implies
cloud synchronization or indefinite browser retention.

## Failure and concurrency behavior

- Storage reads validate the root, rows, bookmark, paragraph, timestamps,
  response sections, and string fields. Valid data is safe to render even when
  other fields are malformed. A corrupt store blocks writes and retains its
  existing bytes; repair/reset is not performed automatically.
- Web Locks serialize the complete v1 store's read/modify/write operation across
  participating tabs. Without this API, saving fails visibly and retains the
  draft; there is no unsafe localStorage locking fallback.
- Independent answer fields merge with the latest committed row. Conflicting
  edits to the same answer or bookmark preserve the local draft and remote save.
  The UI offers retry and selectable answers to copy; it does not silently
  choose a winner. Position is a last-interaction hint, not authored work.
- Storage events refresh clean fields; they never replace dirty answer fields.
  Removal of a previously observed authored record produces a conflict instead
  of silently resurrecting it. Eviction of a position-only record does not
  prevent a later new answer or bookmark from being saved.
- The serialization protocol coordinates tabs running this implementation.
  Older open readers do not participate in Web Locks; deployment must account
  for old pages remaining open.

## Budgets

The existing 80-record global cap remains, but only position-only records can
be evicted automatically. Bookmarks and nonempty answers are protected across
learners. If every slot is protected, the new draft receives a capacity failure.

Each answer field is limited to 16,000 UTF-16 code units for durable saving;
the serialized store is limited to 1,500,000 code units. These are application
budgets, not promises about browser quota. Larger typed/pasted text stays
editable and copyable in memory without truncation. A failed write preserves
the previous durable bytes.

## Verification targets

`tests/reader_place_persistence.test.js` covers quota/read denial, malformed
roots and rows, capacity, independent and conflicting tab edits, recovery,
size budgets, anonymous lifetime, identity, and exact-text mismatch.
`tests/reader_place_review_adapt.test.js` includes reader UI failure/retry,
mode/remount/reload, malformed answer rendering, preview, and storage-event
coverage alongside the existing successful reading workflows.

## Completed implementation handoff — 2026-09-26

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
Final checked HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb`.
Changes remain uncommitted in the shared checkout; unrelated work was preserved.
No deployment, publication, push, or live student-data operation was performed.

Exact files owned by this change (paths relative to the workspace above):

1. `reader_place_store.js` (new)
2. `view_simplified_source.jsx`
3. `_build_view_simplified_module.js`
4. `view_simplified_module.js` (generated)
5. `desktop/web-app/public/view_simplified_module.js` (generated)
6. `ui_strings.js`
7. `desktop/web-app/public/ui_strings.js`
8. `tests/reader_place_persistence.test.js` (new)
9. `tests/reader_place_review_adapt.test.js`
10. `docs/reader-place-persistence-contract.md` (new)

Executed successfully:

```text
node _build_view_simplified_module.js

node node_modules/vitest/vitest.mjs run tests/reader_place_persistence.test.js tests/reader_place_review_adapt.test.js tests/reader_i18n.test.js --maxWorkers=1
58 tests passed across 3 files on the final source, including eviction recovery.

node node_modules/vitest/vitest.mjs run tests/reader_keyboard_a11y.test.js tests/view_simplified_wcag_a11y.test.js tests/view_simplified_dialog_a11y.test.js tests/reader_render_cost.test.js tests/novak_reading_navigation.test.js tests/reading_preservation.test.js tests/reader_display_menu.test.js tests/reading_role_consistency.test.js --maxWorkers=1
151 tests passed across 8 files before the final position-only eviction guard change.
```

The first focused run passed 57 tests; it is superseded by the final 58-test run,
not added to the totals. Scoped `git diff --check` was clean. No real-browser
multi-tab or deployed-release validation was run: tab serialization/conflicts
were exercised with separate store instances sharing a serialized lock fixture,
and rendered UI behavior was exercised in jsdom.

Final SHA-256 parity:

- Both reader bundles:
  `75FE836617B8113A2E78F0DC7F069E6246F0EB99570EE3AD91FA54CF2C68EBBD`
- Both translation files:
  `FD202330676F597DC783325384A2B3300956B2EA2BACBFDD4DAFDE6E4C1F0A19`

Reader-file ownership is released for integration. Integrate the adapter,
builder, reader source, tests, both generated copies, and both translation
copies together. The current host learner/version contract is unchanged;
no additional track 01/12 permission gate remains. Subsequent shared-reader
changes should rerun the focused suites and rebuild the paired bundles.

## Follow-up enhancement handoff

The user subsequently requested continued enhancements. Conflict review,
explicit saved/draft choices, page-session recovery copies, and readable copy
text are prepared and tested. To avoid overlapping the integration owner's
shared reader work, the helper/test updates are in place and the new shared UI
is a bounded candidate patch. See
[`reports/reader-place-recovery-enhancement/README.md`](../reports/reader-place-recovery-enhancement/README.md)
for exact files, validation, and integration steps. The original bundle hashes
above describe the completed first fix, not this pending UI enhancement.

## Page lifetime and storage recovery follow-up

The subsequent user-authorized pass adds page-wide reload protection, scoped
readable downloads, explicit exact-record removal/repair, and actionable size
diagnostics. The helper changes are in place; new shared UI is a bounded
candidate for the active integration owner. The earlier conflict-review UI is
already present in shared source. See
[`reports/reader-place-lifecycle-enhancement/README.md`](../reports/reader-place-lifecycle-enhancement/README.md)
for API additions, ownership release, eight executed real-Chromium cases,
final regression counts, and separately reproduced surrounding test failures.

## Recovery-copy restore and cleanup increment

The next user-authorized increment adds reviewed restoration of retained copies
as unsaved drafts, explicit confirmation before durable saving, and removal of
individual recovery copies after acknowledgment. It preserves displaced work,
rejects stale/scoped reviews, and clears unnecessary unload warnings. Because
track 01 is validating the previous assembled batch, this helper/UI/test change
is entirely isolated; the shared helper was restored to its previous checksum.
See [`reports/reader-place-copy-controls/README.md`](../reports/reader-place-copy-controls/README.md)
for the atomic three-file increment, exact bases, and 171 passing tests plus
nine executed Chromium checks.
