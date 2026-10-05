# Assignment entry workspace ownership audit

This read-only production audit confirmed delayed Firebase, self-contained and mailbox-hosted assignment entry can overwrite an intentionally cleared workspace while the App stays mounted. Each effect previously checked only its `cancelled` flag. The actual History clear and Canvas workspace clear retire file/project/local-storage hydration operations and the existing automatic opener, but those clears leave the three entry effects mounted. A delayed successful entry then replaces History and queues its first resource; a delayed failure emits feedback belonging to retired work.

The self-contained entry also applied the decoded authoritative learner AI policy after effect cleanup. Hosted entry applied it after a workspace clear. These mutations happen before, or independently of, the later History commit guard.

`entry-workspace-ownership.cjs` evaluates the three current source effect bodies and both actual clear functions, with controlled pending decode/network promises and state-setter adapters. The lifecycle predicates, asynchronous control flow, cancellation and clear behavior are production code. Network, decoding, authentication, storage, React effect registration and state updates are controlled adapters; this is a focused Node behavioral fixture, not a full App/browser test.

- [Original 21-check baseline](baseline-results.json): 12 defects and 9 passing controls.
- [Expanded 30-check baseline](baseline-expanded-results.json): 17 defects and 13 passing controls.
- [Expanded 30-check candidate](candidate-expanded-results.json): all 30 checks pass.
- [Candidate operations](entry-operations.json): exactly three `qr-*` effect replacements. Two `root-reference` operations model the shared generation boundary only for standalone candidate validation; root owns the production definition and authoritative replacement integration.
- [Preparation receipt](prepare-receipt.json): source/candidate hashes and operation scopes.
- [Source before](source-before.txt): original bytes retained.
- [Fixture](entry-workspace-ownership.cjs) and [candidate preparation script](prepare-entry-candidate.cjs).

The proposed shared `workspaceReplacementGenerationRef` changes only when `invalidateLocalDataHydration` marks an authoritative replacement. Each assignment effect captures it and checks it after asynchronous boundaries and before late feedback. Normal boot-time local History hydration is permitted to advance its own generation without retiring an assignment load; the fixture retains that compatibility control for each entry pathway. Root integrates any production changes and runs current-source validation.

The initial candidate invocation exposed a fixture extraction anchor that included the pre-change `let cancelled`/`try` adjacency. The anchor now finds the unchanged Firebase assignment selector and enclosing effect. No behavioral assertion was removed or loosened. Its failure occurred before collection; it is excluded from check totals.

No production files, prior tests, prior reports, Git index, commits, deployments or full builds were changed by this audit agent.

## Accepted saved-homework shelf replacement

The cached `openHomeworkShelf` handler deliberately replaces History. Its original synchronous handler changed the visible role and history before retiring pending/project/file/hydration owners. Even with the three proposed QR guards present, an earlier QR decoder could later overwrite the deliberately opened shelf because the accepted Open action never advanced workspace replacement ownership.

[Shelf fixture](shelf-workspace-ownership.cjs) evaluates the actual Open handler, pending request setter, central invalidation function and self-contained QR effect. [Nine-check baseline](shelf-baseline-results.json) isolates this boundary using the already-guarded QR candidate: four owner-retirement/late QR cases fail, while five current shelf/Directions-first/invalid shelf controls pass. [Candidate report](shelf-candidate-results.json) records the proposal's outcome. [One exact operation](shelf-operations.json) adds pending retirement, silent project-load cancellation, file-intake cancellation and hydration invalidation after the existing valid/nonempty shelf guard and before any role/history setter.

The Open action remains synchronous and uses its already-hydrated cached packet. Persistent shelf-list reads and the saved shelf library remain available across fresh workspaces; this proposal changes only accepted Open ownership. [Preparation receipt](shelf-prepare-receipt.json), [previous handler source](source-before-shelf.jsx) and [preparation script](prepare-shelf-candidate.cjs) are retained. The original 30-check entry suite remains intact; its fixture supports the root's extended central invalidation signature and empty restore/import ownership references without changing any assertion.

## Additional host replacement boundaries

[Host-boundary fixture](host-replacement-boundaries.cjs) authors 16 distinct checks for the actual dialog state binding/wrapper, close guard, central invalidation, pending resource setter, project-load start closure and unmount effect. It supplies fixed render values and stable refs, with state-setter adapters that apply functional updates. The previous host is supported through its original state binding/setter, so root can retain baseline evidence for newly added behavior alongside preserved guards.

The checks cover exact selected-file cleanup, preservation of a newer selection and unrelated busy work, ordinary and functional dialog transitions, shown-once recovery-code confirmation, accepted versus busy-rejected project entry, and silent unmount cancellation. This suite was authored without execution by the audit agent; root owns serial candidate/current/baseline execution and its resulting receipts. Earlier 30 entry and nine shelf assertions remain unchanged.
