# Track 03 — restore and remove retained recovery copies

Completed isolated implementation and validation on 2026-09-26.
Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
Start/final checked HEAD: `6b63e76e862125e87422f02a54ed60beac68e8fb`.
The deployment baseline is not inferred from this local checkout.

The previous lifecycle/storage recovery UI is now present in shared source.
The user requested further enhancements. During this pass the coordinator
reserved the shared helper for track 01's assembled validation, so this entire
new increment is isolated in this directory. The initially edited helper was
captured here, then restored byte-for-byte to its previous integration input.
No new root test remains to run against an older helper accidentally.

## Behavior

- Review an individual recovery copy beside the current draft before acting.
- Restore readable answers and the bookmark into the page's draft. Preserve
  displaced current work in another recovery copy. The selected copy remains
  available too.
- A named learner must explicitly choose **Save restored work**. Typing,
  scrolling, retry calls without confirmation, and older queued saves cannot
  silently publish the restored draft. Failed writes retain the restored text;
  normal conflict checks prevent overwriting a newer edit from another tab.
- Reject restore reviews if the current authored draft, selected copy, learner,
  or exact passage changes. Raw malformed records are never parsed into state
  by this feature. Copies with no readable authored work cannot be restored.
- Remove one reviewed recovery copy only after the UI acknowledgment that it
  has been kept elsewhere or is no longer needed. Current answers, bookmarks,
  durable bytes, and other copies remain unchanged. Stale indices cannot
  remove a different copy.
- Stop the unload warning when its last cause is removed. Restored unsaved
  drafts and work in other readings continue to protect the page.
- Scope review panels to the current learner and exact version; preserve
  preview guards; focus the panel on opening and the persistence status on
  closing. Every new English label/reason is registered in the candidate catalog.

## Integration contract and ownership

`increment.patch` includes exactly the helper, reader-source, and root-catalog
delta. Apply these together. The source calls the new helper APIs, so a UI-only
merge is incomplete. The helper remains backward-compatible for old callers:

- `reviewRecovery(scope, index)` returns a scoped copy/draft review snapshot.
- `changeRecovery(scope, reviewed, 'restore' | 'remove')` changes only page memory.
- `save(scope, patch, { confirmRecovery: true })` explicitly permits a restored
  draft to enter the existing durable-save path. The third argument is optional
  for all previous workflows.

Existing saved/session-only/failed result statuses remain. New reasons are
`recovered-draft`, `recovery-changed`, and `recovery-empty`. The first means
durable saving has not been attempted for this restored draft; the UI explicitly
describes that condition instead of implying a failed browser write.

Track 12's host-owned learner identity, existing v1 keys, exact-text check,
protected retention, and anonymous non-persistence are unchanged. No imported
file format, cross-profile migration, storage reset, or cloud service was added.

Captured bases and candidate helper SHA-256 values:

| File | SHA-256 |
| --- | --- |
| Shared/base helper | `b1861d25b5466d829b05e115cba776bd8d9cc419d12598d473ff1b6b20a9d2fc` |
| Candidate helper | `f3f1b718ae496003fecf365f070e4ef98c4efcceb5e6b11761cea44e047a75ae` |
| Captured reader source | `afe7ba74c50f3ce9663855883c43289dd8f4e9e7b05d331be80284687dae4995` |
| Captured root catalog | `0fcbf04d06c67f460d41e92a910fef8aa104a49bf912981121cf32ccbce6d3a2` |

`input-hashes.json` records these inputs and the unchanged support-draft helper.
Shared `reader_place_store.js` was verified at the base hash after all tests.
The patch passed `git apply --check --whitespace=error-all` against current
shared files without applying it. This pass has no net helper/reader/catalog,
builder, generated-bundle, host, or shared-test edits. Only this report directory
and the contract's handoff link are changed by the completed increment.

Track 01 can apply the bounded patch after its current checkpoint, preserving
other changes. Do not copy the full captured/candidate reader over current
source. Merge the catalog into the desktop/public mirror; retain both helper
dependencies in `_build_view_simplified_module.js`; rebuild both reader bundles.
Track 17 can translate the entries listed in `strings.json`.

## Verification

```text
node reports/reader-place-copy-controls/prepare.cjs
node node_modules/vitest/vitest.mjs run --config reports/reader-place-copy-controls/vitest.config.mjs --reporter=default --reporter=json --outputFile=reports/reader-place-copy-controls/test-results.json
node reports/reader-place-copy-controls/browser-check.cjs
git --no-optional-locks apply --check --whitespace=error-all reports/reader-place-copy-controls/increment.patch
```

**171 tests passed across 9 files** on the final isolated candidate:

- 53 helper tests: 32 persistence, 13 lifecycle, 8 restore/cleanup.
- 18 UI recovery tests, including new review, restore, cleanup, focus, scope,
  stale typing, explicit-save, and string-registration cases.
- 100 existing reader-place, keyboard, display, render-cost, and sentence-link
  checks against the candidate bundle.

**All 9 Chromium checks passed**, including the 8 prior storage/reload cases
and a new real rendered-reader round trip: remove saved work, retain its copy,
restore as a draft, edit without saving, explicitly save, remove reviewed
copies, verify the unload guard clears, then reload without changing the save.
Earlier checks include real Web Locks, storage events, quota exhaustion,
conflicting tabs, native unload dialogs, exact-version bookmark separation,
and an actual recovery-file download. Results are in `test-results.json` and
`browser-results.json`.

The tests use captured reader/helper inputs. Existing helper suites are copied
into this directory with only their helper-loader path changed. The report's
`recovery-restore.test.js` is the new helper suite. UI/browser fixture preparation
extends the prior recovery fixtures without modifying them or shared tests.
The complete canonical localization suite was not rerun in this pass; all new
recovery strings were checked directly against the candidate catalog.

For integrated validation set both process environment variables:

```text
ALLO_READING_RECOVERY_UI_ROOT=./
ALLO_READING_PLACE_HELPER=reader_place_store.js
```

Then run the suite and browser commands above against the rebuilt artifacts.
Recheck hashes/parity afterward. Successful candidate checks are not a claim
about unrelated newer shared edits or the deployed application.

No deployment, server, install, Git mutation, live-app state change, or message
to another chat was performed. Chromium used disposable contexts and
intercepted localhost fixtures. Browser-controlled unload prompts remain best
effort; legacy tabs still do not participate in Web Locks. Both limitations
from the prior persistence contract remain.
