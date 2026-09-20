# Allobot save privacy — 2026-09-19

## Result

Saving advice now copies the displayed answer without calling AI again. The prior save action sent both the preceding question and answer to Gemini for another summary; this extra disclosure and rewrite have been removed. The button is labelled Save advice to History. The preceding question is excluded by default and can be included with an explicit checkbox and preview.

Saved advice preserves its existing inline links and a bounded list of supplied source URLs/titles plus retrieval time. The saved text identifies this as an evidence snapshot, not a new verification. Raw search snippets, lookup queries and generated research summaries are not copied into the new evidence metadata. Unsupported URLs are dropped from the appended source list; source titles are escaped. The displayed answer itself is preserved as shown.

Failures return a retryable error and retain the conversation; diagnostics contain a fixed code rather than answer/question/provider content. Duplicate in-flight saves are blocked in the control. A missing shared helper still permits plain-text saving without AI, while blank advice is rejected.

## Storage inspection

This pass inspected saveFullChat and saveUDLAdvice in host_handlers_source.jsx, handleDeleteHistoryItem there, handleClearHistory and the sequenced offline-history write effect in AlloFlowANTI.txt, and the existing device recovery snapshot removal path. Live chat, History entries, recovery snapshots, downloaded exports and provider records are distinct copies. The privacy disclosure now explicitly mentions recovery snapshots and exports.

Deleting History changes the active workspace; it is not a promise to erase older recovery snapshots, downloaded files, or provider records. The offline History effect writes through the existing sequenced storage queue to allo_offline_history when enabled. Other configured storage/sync effects may also run after setHistory. This change does not disable those configured persistence destinations, erase user data, or claim a completed cloud-deletion audit.

## Browser evidence

Run from the repository root: node reports/allobot-save-privacy-2026-09-19/browser-check.cjs

Chromium checks at 1280px and 320px load the actual built chat/privacy, save controls and host handlers. The control is visually checked with focused CSS, then the actual UDLGuideModal is mounted to exercise its message-to-save-handler integration. Both viewports verify answer-only defaults, explicit question preview/inclusion, preserved sources, keyboard activation, retryable failure and no private question in the default record. No AI calls or network requests occurred; all network routes were intercepted and all data was synthetic. The focused save control had no checked axe violations or horizontal overflow. This is a module/workflow harness, not a deployed full-host or cloud persistence test.

## Shared workspace and broader checks

The host source/module, host loaders and History panel already contained other tasks' changes. Only the saveUDLAdvice source region and selected module cache keys were changed by this pass; generated host modules incorporate the current shared source. Concurrent quiz delivery/feedback edits were preserved. Desktop host loaders use local module URLs and were not changed. All affected generated public mirrors are checked separately.

The broader regression report has five pre-existing host-contract failures: resetCanvasWorkspaceSettings no longer matches the old extraction-shim pattern; useOwnSources/setUseOwnSources are unused host getters; and three host preview assertions require an absent literal render configuration. preexisting-contracts.json records the same conditions before this pass's loader edits and after. The originally stale host-module hash was refreshed; the remaining first test failure is the existing shim assertion, not that hash.

Changes remain uncommitted because shared files contain other active work. No push, deployment, provider-key use, tenant-policy change or deletion of user data occurred. Baseline copies are local audit aids and should remain outside any scoped commit.

## Final focused validation

81 focused tests passed, including 10 new save/privacy cases. The earlier broader run had 117 passing and five pre-existing host-contract failures as described above. Both final Chromium scenarios passed with zero AI/network calls; three generated public mirrors and CDN hashes match. Public-query and source-pair gates and scoped whitespace checks passed.
