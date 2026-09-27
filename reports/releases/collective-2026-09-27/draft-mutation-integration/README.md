# Draft mutation integration candidate

This packages the latest completed Track04 increment from `C:/Users/cabba/AppData/Local/Temp/alloflow-reader-drafts-04/reports/reader-drafts-04/combined-integration.patch` against current shared reader source `c9625901a41c5a48c86faf6255bc1e3b867607f7c8c953d8b656c65a3a8f0121` at local HEAD `1a5067ab673408d8bf33fc6998ab843696043859`. It is separate from the earlier partial-save safeguard already integrated in the reader follow-up.

`source-tests.patch` contains only:

- `view_simplified_source.jsx`: refresh clean cached drafts from the current exact occurrence; resolve deferred editor targets against current entries; confirm Save/Pin/Remove results against the current source fingerprint and exact requested mutation; invalidate obsolete save completion when the owner changes away and back.
- `tests/reading_support_draft_transitions.test.js`: eleven additional clean-cache/current-target cases.
- `tests/reading_support_mutation_confirmation.test.js`: the owner's 31-case confirmation/owner-lifetime suite.

All three hunks applied strictly in memory with zero fuzz. Exact preimages and candidate hashes are in `manifest.json`. No production files, generated reader, host pins or Git state were written. No tests, builds or browser checks ran in this preparation. The isolated owner's 299 unit and 50 browser checks are historical evidence in `INTEGRATION-HANDOFF.md`, not validation of the assembled release.

## Integration

Apply only the source/test patch to the current combined reader, preserving prepared-help, lookup, vocabulary and preview changes. The patch touches `ReadingGlossEditor`; the separate preview-scroll patch touches the modal and is independent. If the preview patch applies first, the whole-reader preimage hash changes intentionally; recheck the editor hunk rather than copying this candidate file over it.

Regenerate with the current `_build_view_simplified_module.js` and its new `dev-tools/lib/reader_compiler.cjs` dependency, retaining both reader helpers. Synchronize root/public output and derive the reader pin from the resulting combined bytes. No isolated generated files or `96a52607` pin should be imported.

The patch adds three optional safe-fallback copy keys. Their existing catalog state should be checked by the integrator:

- `simplified.gloss_support_no_longer_available`: `This word support is no longer available. Review the current supports.`
- `simplified.gloss_remove_unconfirmed`: `The save did not confirm this removal. Review the support and try again.`
- `simplified.gloss_pin_unconfirmed`: `The save did not confirm the pin change. Review the support and try again.`

Use the exact source fallbacks as authority if a key above was subsequently refined. No catalogs were edited by this preparation.

## Current-source validation tools

`draft-browser.cjs` and `host-browser.cjs` are copies of the owner's final browser checks with bounded path/output changes: their root resolves to this shared checkout; outputs stay in this report directory; eight current production input hashes are captured before/after and drift fails the check. They never use the isolated generated reader. Run them sequentially after the final reader build and mirror synchronization:

```text
node node_modules/vitest/vitest.mjs run tests/reading_support_draft_transitions.test.js tests/reading_support_mutation_confirmation.test.js tests/reading_support_draft_host.test.js tests/reading_support_curation.test.js tests/reading_gloss_editor_usability.test.js tests/reading_support_picture_ui.test.js tests/reader_place_lifecycle.test.js --maxWorkers=1
node reports/releases/collective-2026-09-27/draft-mutation-integration/draft-browser.cjs
node reports/releases/collective-2026-09-27/draft-mutation-integration/host-browser.cjs
node dev-tools/check_reader_release.cjs
```

The draft checker writes a local fixture HTML and a JSON receipt, opens a disposable browser profile, and exercises draft decisions/native reload/owner changes against the real generated editor. The host checker extracts current production callbacks, serializer/storage/hydrator functions; an intercepted loopback-shaped URL supplies a disposable fixture without starting a server. It writes a separate JSON receipt and uses disposable IndexedDB. Neither uses an application account, live learner data or deployed services. Browser/module dependencies must already be installed. Unit runners may write their normal caches.

Required behavior: malformed or wrong-source responses cannot clear a draft, continue navigation or report a successful Pin/Remove; exact valid confirmations can. A-to-B-to-A owner transitions cannot let an older success/failure overwrite newer wording. Clean drafts and deferred targets reflect current supports. Confirmed explanation/picture/pin/removal changes survive verified storage and reload. In-memory confirmation and durable-storage receipts remain distinct.
