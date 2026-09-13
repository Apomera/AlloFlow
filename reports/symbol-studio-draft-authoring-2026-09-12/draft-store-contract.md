# Symbol Studio draft store contract

The draft-store helper lives inside the Symbol Studio IIFE in `symbol_studio_module.js`, before the component. Its tests extract this production implementation directly; it has no React or localStorage dependency.

- Database: `alloSymbolStudioDrafts`, version 1; object store: `drafts`, keyPath `profileId`.
- `createSymbolStudioDraftStore({indexedDB?, openTimeoutMs?, transactionTimeoutMs?})` returns `read(profileId)`, `write(profileId,payload)`, and `remove(profileId)`.
- `read` resolves `null` for a missing row; otherwise it resolves `{version:1,profileId,updatedAt,payload}`. A corrupt row rejects and is left unchanged.
- `write` captures a sanitized snapshot when called and resolves its envelope only when the IndexedDB transaction completes. A successful put request alone does not report success.
- `remove` resolves `true` after the deletion transaction completes.
- A shared FIFO per learner orders reads, writes, and deletes across factory instances. Different learners do not share the JavaScript operation queue. IndexedDB still applies its own transaction locking.
- Open and transaction deadlines default to 5 seconds and can be overridden up to 15 seconds. Timed-out transactions are aborted; late successful open requests are closed. Failed opens can be retried. Version changes release cached connections.
- There is no in-memory persistence claim or localStorage fallback. The component owns session recovery, save-status UI, hydration races, and deciding whether to replace a corrupt row.

## Validation

`normalizeSymbolStudioDraftPayload(payload)` returns an independent snapshot of supported authoring fields. Missing section fields remain absent. Input strings retain whitespace. Unknown fields and transient playback, loading, and learner-response state are omitted.

Board cells and sequence/QuickBoard items require `id` and `label`; image defaults to null. Board pages require `id` and `words`; title defaults to an empty string and columns to 4. Story pages require `id` and `text`; image defaults to null and imagePrompt to an empty string. The component must clamp active indexes to the actual restored arrays.

Limits: 64 cells per board page, 24 board pages, 12 sequence items, 12 story pages with 2,000 characters per page. QuickBoards retain all 4 choice items, 8 calming items, 10 sensory items, 10 Ask Me items, 8 Body Check items, and 8 transition items. Portable images use data:image or HTTP(S); recorded audio uses base64 data:audio. Aggregate normalized JSON is limited to 25 MiB UTF-8. Over-limit data is rejected, never truncated.

Draft sections are board, sequence, story, and quickBoards. Board identity, appearance, AAC fields, asset/concept references, and FCT metadata are preserved. Sequence completion is preserved. Generated audio references, busy flags, timers, choice selections, earned tokens, pain-response state, and current transition-response step are omitted.

Error codes: `invalid-profile`, `invalid-draft`, `too-large`, `corrupt-draft`, `unavailable`, `open-failed`, `open-timeout`, `blocked`, `transaction-failed`, `transaction-timeout`, and `quota-exceeded`. All store methods return Promise rejections for errors; the standalone normalizer throws.

## Verification

`tests/symbol_studio_draft_store.test.js` uses a VM and a deterministic injected IndexedDB adapter. It separates request success from commit, tests abort and retry, open and transaction deadlines, late callbacks, per-learner isolation, write/delete ordering, input snapshotting, malformed records, portable media, and byte bounds. The browser agent separately verifies the integration against actual IndexedDB.
