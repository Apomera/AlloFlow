# Research Source Refinements

Local follow-up, 2026-10-09. No commit, push, or deployment.

## Scope

- Passage-level inclusion inside the existing Supporting excerpts disclosure, including mixed source-selection state.
- Source-scoped removal undo, preserving subsequent collection, selection, and private-sharing changes.
- Order-independent public evidence when a pasted source and a fetched page share a URL.
- Permission-aware bibliography labels for private pasted sources with public URLs, including stale-record links-only fallback.

Teacher research data remains private working data. Source-detail permission does not redact information already incorporated in instructional prose or recall distributed copies. No additional research or model requests are introduced.

## Verification

- 240 focused unit checks passed, including 21 new regressions: 80 projection/reader/adaptation/export (`helper-regressions.json`), 84 pipeline/student transport (`pipeline-transport-tests.json`), 50 collection/generation (`source-review-tests.json`), and 26 review controls (`review-ui-tests.json`).
- Eight canonical browser scenarios passed (`browser-results.json`), covering ordinary arbitrary-topic web research, mixed-state keyboard selection, passage exclusion across searches and writing, Undo after later additions and sharing edits, private bibliography labels, and 1280/390/320px layouts. No page errors or unexpected network requests occurred.
- Desktop and 320px screenshots were visually inspected. Expanded passage controls fit the scrolling dialog without overlap or horizontal overflow.
- The first browser attempt reached generation but its privacy assertion used a missing preview-only callback. `browser-fixture-attempt.json` preserves that attempt; the fixture was corrected to use the actual `recordSourceProvenance` contract and the complete rerun passed. No application change was required for this fixture issue.
- An initial engine test attempt stopped before assertions on a sandbox temporary-cache permission error; the approved unsandboxed run passed. The previous report's `vitest-startup.cjs` extends worker startup in memory only, without dependency changes.
- Three module families and existing mirrors/pins were synchronized with `sync.cjs`; `--check` passed. `artifacts.json` records exact tested hashes. Scoped whitespace checks passed, and an independent read-only review found no new regressions in selection or Undo.

Synthetic browser fixtures do not exercise live search, model providers, a full application build, or physical assistive technology. The preview serves canonical modules and the existing synthetic research fixture, not a deployed application.

Preview: http://127.0.0.1:51237 (`preview.json` records the hidden loopback server).

## Compatibility

The existing one-level Undo remains one level: another deliberate removal replaces the previous pending undo. At collection capacity, Undo leaves the collection unchanged and reports that it cannot restore the source; it never evicts later additions. Refreshed source data takes precedence over an old removal snapshot.

Historical bibliography labels are corrected only when an existing source record identifies a safe title; legacy public references without such metadata remain links-only. Stale records never restore excerpts. Bibliography cleanup preserves instructional prose, bilingual sections, printed references, and code examples.

`strings.cjs` registers two English labels and writes `ui-strings.delta.json` for localization. Other locales use the existing English fallback until translated. Existing unrelated workspace changes were preserved.
