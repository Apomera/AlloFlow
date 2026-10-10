# Research Collection Outcomes

Local implementation, 2026-10-09. No commit, push, or deployment.

## Scope

- Preserve a pasted draft when only some selected excerpts fit in the collection or source limit.
- Distinguish accepted entries, duplicates, previously removed sources, total capacity, per-source capacity, and invalid entries with structured action outcomes.
- Describe newly accepted unread links separately from readable passages. These links remain unavailable for writing until readable text is collected.
- Show successfully collected evidence alongside a later preparation error, without losing earlier work.

The existing numeric `merge` return is preserved. The optional accumulator is returned separately from the evidence packet, never stored in student metadata or supplied as writing evidence. Counters reconcile with attempted entries; unread links are a subset of accepted entries. Preparation aggregates document/search/page stages, including a later page failure. Cancelled results retain their previous shape.

The UI validates the structured counts and retains identity-based fallback for older engines. An unsupported or malformed outcome cannot justify clearing a pasted draft. Partial additions keep the draft; duplicates already in the collection do not make an otherwise complete addition partial.

No changes were made to the 24-entry collection limit, four entries per source, bounded excerpt size, search-topic freedom, privacy permissions, or basic on/off research path. No automatic retries or extra provider calls were added.

## Verification

- Focused engine/UI checks: 119/119 passed (57 engine, 62 review UI). See `collection-ui-tests.json`.
- Adjacent checks: 151/151 passed across settings, source generation, query transport, local bridge, relevance, citation coverage, student-safe projection, and own-source RAG/citation behavior. See `adjacent-tests.json`.
- Canonical browser checks: 25/25 passed (six collection-outcome scenarios, seven recovery regressions, and twelve layout/keyboard/privacy/basic-research regressions). See `browser-results.json`, `recovery-results.json`, and `layout-results.json`. No browser errors or external requests were observed.
- All five new mobile screenshots were inspected, including partial additions and partial URL failure at 320px and link-only feedback at 390px. Feedback and Generate remain visible without overlap.
- Independent read-only review found no blocking behavioral/privacy/compatibility issue. Its one minor activity-copy inconsistency was corrected before the final browser build.
- Existing ContentEngine and MiscPanels source/runtime mirrors were synchronized. Root CDN pins are `280f9beb` and `c022b461`; desktop hosts now use local module references and those paths were preserved. See `artifacts.json` and `sync.cjs --check`.

Eight labels were registered in both English catalogs, with runtime English fallbacks. Other language packs were not translated. Browser fixtures use synthetic provider data; no live-provider evaluation, full application build, or physical assistive-technology session is claimed.

One initial pin synchronization encountered a temporary Windows file-open error. Retrying after the final rebuild succeeded. The focused new tests passed on their first run.

The final artifact check initially rejected desktop hosts after their references changed from versioned CDN URLs to local module paths. The check now accepts the exact local references in desktop hosts while still requiring root CDN pins and byte-identical module mirrors. No host paths were rewritten to accommodate the check.

## Reproduction

Run from the repository root:

```text
node reports/research-collection-outcomes-2026-10-09/sync.cjs --check
node reports/research-collection-outcomes-2026-10-09/run-browser.cjs
node reports/research-collection-outcomes-2026-10-09/run-browser.cjs recovery-regression.cjs
node reports/research-collection-outcomes-2026-10-09/run-browser.cjs layout-regression.cjs
```

The browser runners start a temporary loopback fixture and stop it when verification completes. A separate synthetic preview was started at `http://127.0.0.1:55934/`; it uses simulated provider responses and does not represent a production deployment.
