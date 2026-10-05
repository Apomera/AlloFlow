# Pending resource ownership after removal — October 3, 2026

This follow-up reviews current production after the previous transfer-decode race fix. The initial host triplet is byte-identical at SHA256 `b017b9ca7df4d830ed3933fa4efaaf0508d29415601f72156b93f4a415d2b4b2`; canonical/public SessionTransport match `ea9ec09e09ee4c00cb16494590b11b8e12ddbbb1e0143335fba1284c691ee795`. Other chats edit this checkout. This worker has changed only this report-local review and regression/config; no production source or runner.

## New confirmed source path

Successful delivery now checks captured pending collector identity at `AlloFlowANTI.txt:25674`, queues an automatic open at 25692 and retires its collector at 25693. Later removal at 25652–25661 marks current transfer records and filters both lists. The already completed receipt no longer has a pending collector, and this removal branch never cancels `pendingQrAssignmentResource` or its opening generation.

The real opening effect beginning at 36743 captures that resource and its generation. With unsaved reading-support edits it defers `openWhenReady(true)`. After confirmation, the `if (!afterDraftConfirmation && !isContextCurrent())` guard deliberately bypasses history-context checking, then restores the captured resource. The real draft session in `reader_support_drafts.js` checks only its queued dialog identity before running the original steps. Removing the resource does not retire either ownership, so confirmation can open removed content even after the History filter has rendered. This is a different lifecycle stage from the previous decode fix. Concurrent authoring can shift later line numbers; regression extraction uses unique source anchors.

There are two shorter pre-cleanup orderings: finish delivery then remove within one React batch, so the first effect sees removed content still pending; or remove a waiting resource then emit module-registry readiness before React cleanup, so the original callback still sees the previous context. A synchronous pending-owner guard is required, because waiting for effect cleanup leaves those windows open.

An unrelated removal also changes the history array. The current effect then rejects `isContextCurrent()` and removes its registry listener in `onModuleChange`, leaving another still-shared pending resource stranded. The fix must preserve that valid pending ownership while tolerating the harmless History-only change, without relaxing workspace navigation guards.

The actual learner Clear history action at 36240–36250 clears History/generated content/view but leaves pending automatic ownership intact. Its deferred draft callback uses the same bypass. This action is distinct from the Canvas workspace-clear helper at 35239; the learner HistoryPanel invokes it at `view_history_panel_source.jsx:1133`.

## Minimal integration direction

Use a request token in React state and a synchronous ref owning that token. Derive the existing `pendingQrAssignmentResource` name from `request.resource`, and preserve the existing named setter API for direct/functional callers. A direct non-null assignment starts a new token, even when the exact resource object matches an older assignment; an unchanged functional updater keeps its token. This avoids React's A-to-null-to-the-same-A batch identity bailout.

Keep the existing opening-generation ref declaration in its restore-wrapper region so older focused extraction remains compatible. The early setter closure can use it after rendering completes. The effect must capture the request token and require exact current ref identity as well as generation, including deferred confirmation callbacks. Success clears only the captured token/resource, preserving a newer request queued by the opener itself.

Removal should synchronously clear only a matching current resource ID through the functional setter; unrelated removal keeps the current token. Clear history/workspace actions should explicitly retire pending ownership. Permit a History-only context change for the same live pending token while keeping the existing input/view/role/session navigation guards. Do not add global resource tombstones or reset unrelated transfers.

## Prepared mounted actual-source regressions

`pending-resource-removal.test.js` mounts real React state/effects extracted from the current host: pending state block, mailbox receiver, real chunk helpers, restore wrapper, context construction, pending opener and Clear history. It uses the real ReaderSupportDrafts session and SessionTransport projection. Resource decoding and module readiness are deterministic; the resource opener is observed through a module spy. The fixture does not execute the entire App, network transport or rendered resource view.

Eight cases cover dirty-draft removal before cleanup; lazy-readiness removal before cleanup; delivery/removal in one batch; unrelated removal after committed History change; fresh same-ID/new-RID sharing; same-ID replacement retiring an older callback; actual Clear history; and exact-object A-to-null-to-A ownership. In the two pre-cleanup cases and replacement/clear/ABA cases, the no-restore assertion executes inside `act` before queued state renders. Source/config authoring is complete, and **no test was run by this worker**.

The distinct jsdom project is `pending-resource-removal.vitest.config.js`, one worker with normal timeouts and no shared setup. The authored fixture/config hashes are `967e9a089f5d4e80080099a35d424fdcfd60bd285005244acd47eb51ea8bef30` / `ee9212834b9f07e6db0e7bc3243dd6fc852fba9f83e5f6d7f4cb9914d577e183`. Root may run `node node_modules/vitest/vitest.mjs run --config reports/classroom-reliability-next-2026-10-03/pending-resource-removal.vitest.config.js --maxWorkers=1 --reporter=json --outputFile=reports/classroom-reliability-next-2026-10-03/pending-resource-baseline.json`. `ALLO_ANTI_CANDIDATE` can select a guarded host candidate; `SESSION_TRANSPORT_CANDIDATE` selects its transport if needed. Baseline/candidate/current validation and source integration belong to root.

## Other audit limits

The previous transfer identity/removal changes remain present; no new decode-retirement defect was found. Parts/applied count caps remain 16/256, transfer removal marker count is 256 with conservative overflow retirement, and pending/failure records remain five-minute TTL-limited without independent count caps. That capacity limitation was already documented in the prior pass and is not a new finding here.

RTC's student `dc.onmessage` at the current 37252–37257 invokes the receiver without checking `cancelled` or current holder identity, although cleanup at 37273 marks cancellation and closes the peer. A queued obsolete channel callback could therefore start collection in a replacement current store rather than fail the captured-store guard. This is a source-backed candidate for a later targeted stale-handler regression, not an executed browser failure; no transport redesign or extra patch is proposed in this pass.
