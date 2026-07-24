# Document Remediation Pipeline — Decoupling Plan

> **Historical plan snapshot (2026-07-09):** This May 2026 plan records the pipeline decoupling strategy and early test state from that period. Verify current `doc_pipeline_source.jsx`, tests, and `PIPELINE_ARCHITECTURE.md` before treating phase status, line counts, or remaining tasks below as current.

**Status:** Plan only (not started). Authored 2026-05-28.
**Target:** `doc_pipeline_source.jsx` (~18.6k lines) → build → `doc_pipeline_module.js`.
**Goal:** Make the pipeline instantiable and testable outside the live browser app, so its pure core can be regression-tested against the *real* code (not a mirror), a second maintainer can work safely, and a headless/batch entry point becomes possible later.

---

## Non-goals (explicitly out of scope)

- NOT a rewrite. The 3-layer architecture (deterministic / surgical-AI / full-rewrite + regression-revert) stays exactly as-is.
- NOT full headless end-to-end. The axe-core verification (real iframes), pdf.js extraction (canvas), and Tesseract OCR need a DOM and stay covered by the Playwright e2e suite, not unit tests.
- NOT a change to the live contract until the very end. The monolith wires the pipeline via `createDocPipeline(deps)` + `window.__docPipelineState`; that contract is untouched through Phases 0-3.

---

## What is already in our favor (the good seams)

- **Dependency injection already exists.** `createDocPipeline(deps)` receives `callGemini`, `callGeminiVision`, `callImagen`, `addToast`, `t`, `isRtlLang`, `updateExportPreview`, `getDefaultTitle`. The expensive/external calls are ALREADY injectable, so faking Gemini in a test is trivial.
- **State access is centralized.** `_bindState()` (doc_pipeline_source.jsx ~L154-188) copies ~50 React state fields out of `window.__docPipelineState` into closure vars before each public call. One choke point, not scattered reads.
- **Pure layers are genuinely pure.** Severity rubric + pass-factor, reliability heuristics, the 39 deterministic fixes, ARIA-role correction map, `sanitizeStyleForWCAG`, issue normalization/merge — these take data in and return data out. No DOM required.

## Where the real risk lives (mitigation in parentheses)

1. **Blast radius:** the pipeline backs the whole document feature; the monolith depends on the `deps` + `__docPipelineState` contract. (Keep that contract byte-identical through Phase 3; add the new path alongside it.)
2. **No test net during change:** only the scoring math is currently mirrored in tests. (Phase 0 grows the net on pure functions BEFORE any structural move.)
3. **Headless ceiling:** axe/iframe/canvas can't be unit-tested cleanly. (Accept it; cover those via existing Playwright e2e.)
4. **Global whack-a-mole:** `window.axe`, `window.PDFLib`, `window.__alloPdfAbortSignal`, `window.__lastGroundTruthCharCount`, `window.__lastGroundTruthMethod`. (Phase 3 enumerates and routes them through small accessors.)

---

## Guiding principle

Every change is **additive and behavior-preserving** until the final phase. After each phase: rebuild, diff the built module, run ONE real document through the live app, and confirm the report is identical. Git makes every phase a clean revert.

---

## Phase 0 — Safety net first (no decoupling; do this regardless)

Grow the golden master to cover the pure layers, using the existing mirror pattern (`tests/doc_pipeline_scoring.test.js` already covers rubric + reliability + blend).

- Add tests for the 39 deterministic fixes that are string/regex transforms on HTML (e.g. lang normalization, heading-skip repair, th/scope, skip-link injection, ARIA-role correction map). These are pure string-in/string-out.
- Add tests for `sanitizeStyleForWCAG` contrast/font-floor math.
- Add tests for issue normalization + cross-auditor merge (already extracted per tests/README mapping).

**Verify:** `npm test` green. **Effort:** 1 session. **Risk:** none (test-only).
**Payoff:** regression protection for the parts most likely to change, before touching structure. Also the artifact to show Knowbility/Church.

**Status — STARTED 2026-05-28.** Two golden-master files added (mirror discipline; re-point at real code in Phase 2):
- `tests/doc_pipeline_scoring.test.js` (15 tests): severity rubric + pass-factor, the >12 auditor override, reliability heuristics (SD/SEM/CI/agreement index/consistency heuristic), 50/50 blend incl. the masking case.
- `tests/doc_pipeline_wcag.test.js` (18 tests): WCAG relative-luminance contrast (pins the 4.5:1 AA boundary: #767676 passes, #777777 fails), hexToRgb, ARIA-role correction (lowercase / correct / strip), issue normalization + cross-auditor merge.
Full suite: 10 files / 216 tests green.
REMAINING for full Phase 0 (incremental, optional): more of the 39 deterministic fixes (heading-skip repair, th/scope, skip-link, list-wrap, lang normalization), and the full `sanitizeStyleForWCAG` (font-floor clamp, body-bg detection) beyond its contrast primitive.

## Phase 1 — Optional injected state store (zero contract change)

Make `_s()` prefer an injected store when present, else fall back to the global. One-line behavior-preserving change:

```js
// before: var _s = function(){ return window.__docPipelineState || {}; };
// after:  var _s = function(){ return _injectedState || window.__docPipelineState || {}; };
//         where _injectedState is set only by a new optional createDocPipeline({ state }) arg.
```

The live app passes no `state`, so it keeps using `window.__docPipelineState` exactly as today.

**Verify:** rebuild; built module diff shows only this change; run a real document, confirm identical report. **Effort:** 0.5 session. **Risk:** very low (fallback preserves current behavior).

## Phase 2 — Headless harness + promote pure tests to the real code

Add a thin test helper that instantiates the pipeline with a fake `deps` (stub `callGemini` returning canned JSON) and an injected `state`, under vitest with `happy-dom`. Re-point the Phase 0 tests at the REAL exported functions instead of the hand-mirrors, where they don't touch axe/canvas.

**Verify:** `npm test` green; the real functions produce the same golden values the mirrors asserted. **Effort:** 1-2 sessions. **Risk:** low; discovers any pure function that secretly reads a global (then route it through Phase 3).

## Phase 3 — Route the remaining globals through accessors + bundle CDN deps

Replace direct `window.axe` / `window.PDFLib` / `window.__alloPdf*` reads with small getters that default to the globals but can be injected. Bundle axe-core, pdf.js, Tesseract, pako with local fallbacks instead of 6 hard-coded CDN `<script>` loads (also fixes the "district IT blocks the CDN" reliability gap and the workflow's CDN finding).

**Verify:** rebuild; run a real document end-to-end in the app (axe + tagging must still work); Playwright e2e green. **Effort:** 2-3 sessions. **Risk:** medium — this touches the live verification path, so verify in the real app, not just tests.

## Phase 4 — (Later, optional) extraction / batch entry point

Only once Phases 0-3 are solid AND the pipeline is confirmed as the priority. Expose a browser-runtime batch entry (Puppeteer-class), or split the pure core into its own importable file. Defer until an institution actually needs batch.

---

## Per-phase verification protocol

1. `node _build_doc_pipeline_module.js` (auto-syncs to desktop/web-app/public).
2. `git diff --stat` + eyeball the built-module diff for unexpected changes.
3. `npm test` (vitest) green.
4. Run ONE real document (a scanned PDF, a Spanish worksheet, a complex-table doc) through the live app; confirm the Conformance Report + Audit Report render identically (scores, split tiles, integrity, reliability rows).
5. Before touching the live verification path (Phase 3): `npm run test:e2e` green.

## Rollback

Each phase is one or a few additive commits on a branch. `git revert` or branch-discard restores the prior state with no data migration, because the live `deps` + `__docPipelineState` contract is unchanged until Phase 4.

## Honest effort + sequencing note

Total Phases 0-3: roughly 5-7 focused sessions for a solo maintainer. Phase 0 is worth doing immediately and independently (pure upside, no risk). Phases 1-3 are worth doing once you have decided the pipeline is the center of gravity and/or want a second maintainer or batch mode. If neither is true yet, stop after Phase 0.
