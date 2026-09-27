# Track 03 follow-up: conflict review and readable recovery

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
Checked base HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb`.

The user requested continued enhancements after the first persistence fix.
During this pass, coordination identified possible overlap with integrator 01.
Accordingly, only the uncontested helper/tests were changed in place; the shared
reader and translation delta is an isolated candidate and bounded patch.
Nothing was deployed, published, pushed, staged, or committed. Other work was
preserved, including concurrent translation additions.

## Behavior

- Review this page's draft alongside the current saved work before choosing.
- Explicitly use the saved work or save the reviewed local draft instead.
- Retain the version replaced as a recovery copy in this exact learner/version's
  page-session memory. Recovery copies never enter localStorage, never transfer
  across learners or text versions, and disappear on a real reload.
- Check both reviewed answer/bookmark snapshots inside the write lock. Reject
  stale choices without overwriting intervening edits or newly typed text.
  Position-only scrolling does not invalidate an answer review.
- Invalidate earlier queued autosaves after a choice so they cannot recreate a
  removed record that the reader explicitly chose to leave removed.
- Provide plain-text recovery with section names, questions, answers, and the
  bookmark snippet instead of exposing JSON. Unnamed readers can copy their
  temporary work too. Do not show this extra control before any work exists.
- Focus the review panel when opened and return focus to the persistence status
  after choosing or cancelling. Cancel never writes to durable storage.

## Files changed directly in this pass

1. `reader_place_store.js`: additive `review(scope)` and
   `resolve(scope, reviewed, 'local' | 'saved')` APIs; `recoveryCopies` in results;
   snapshot checks and queued-save invalidation.
2. `tests/reader_place_persistence.test.js`: conflict choices, intervening edits,
   deleted records, quota during resolution, recovery lifetime, and scope tests.
3. `docs/reader-place-persistence-contract.md`: link to this follow-up handoff.

No direct edits were made in this pass to `view_simplified_source.jsx`, the
shared builder, either generated reader bundle, or either `ui_strings.js` copy.
Shared UI ownership remains with the integration owner. The helper's additive
API remains compatible with the earlier reader UI.

## Isolated handoff artifacts in this directory

- `ui-replacement.jsx`: replacement only for the persistence UI function block.
- `strings.json`: changed/new English entries under `simplified`.
- `prepare.cjs`: prepares candidates without writing any shared files.
- `view_simplified_source.jsx`, `view_simplified_module.js`, `ui_strings.js`:
  generated candidates for testing, not replacements to copy wholesale over
  concurrently edited canonical files.
- `shared-ui.patch`: bounded delta for canonical reader source and root strings.
- `candidate-inputs.json`: SHA-256 hashes of the inputs used to prepare it.
- `conflict-ui.test.js`, `vitest.config.mjs`: candidate and integration checks.
- `README.md`: this handoff.

## Integration sequence

1. Preserve the helper/test changes already in the checkout. Confirm shared
   reader ownership before applying `shared-ui.patch`. Recheck the patch against
   current source; the preparation script fails if its function anchors moved.
2. Apply the bounded source/string delta while preserving other owners' edits.
   Update `desktop/web-app/public/ui_strings.js` from the merged root translation
   source, then run `node _build_view_simplified_module.js` to rebuild both reader
   bundles with the updated helper.
3. Run this directory's suite against the integrated files by setting
   `ALLO_READING_RECOVERY_UI_ROOT=./` for that process, then running the Vitest
   command below. Without that setting, it tests the isolated candidate.
4. Verify both reader copies and both translation copies match. Re-run source
   drift checks required by the integration lane. No deployment is included.

## Executed validation

```text
node reports/reader-place-recovery-enhancement/prepare.cjs
node node_modules/vitest/vitest.mjs run --config reports/reader-place-recovery-enhancement/vitest.config.mjs
git --no-optional-locks apply --check reports/reader-place-recovery-enhancement/shared-ui.patch
```

The complete candidate run passed 135 tests across 8 files: 32 store tests,
7 new candidate UI cases, and 96 existing reader runtime/localization cases.
The patch application check succeeded without applying it. An initial broader
run caught an extra empty copy control before the passage; that issue was fixed
and the complete candidate suite passed afterward. Counts are from the final
combined run, not a sum of repeated executions.

Validation uses jsdom and separate store instances with a serialized lock
fixture. No live-app state, deployed release, or real-browser multi-tab session
was exercised. The existing reader localization suite checks canonical strings;
the additional candidate UI test checks every new fallback/recovery string
against the candidate language source.

The earlier generated reader bundles remain at SHA-256
`75FE836617B8113A2E78F0DC7F069E6246F0EB99570EE3AD91FA54CF2C68EBBD`.
The follow-up UI is ready for the integration owner; it is not yet in those
shared bundles. Track 03 is not holding shared reader/UI-string ownership.
