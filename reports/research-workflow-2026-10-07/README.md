# Unified Research Workflow

Local implementation for the approved source-generation research redesign. No commit, push, or deployment was performed.

## Behavior

- A compact Research checkbox and Settings control replace the separate research controls.
- Settings combine web discovery, selected local documents, supplied webpage URLs, optional source review, and exact quotations.
- My sources disables automatic web discovery. Supplied URLs and deliberately kept sources remain usable.
- Review groups passages by source, supports inclusion, exclusion, removal with undo, reading full pages, and additional searches. The collection and choices stay in memory across closing and reopening the panel.
- The reviewed writer uses only selected evidence IDs. Unsupported citations and failed collection leave the previous original and adapted readings intact.
- Explicit source-generation research topics use a dedicated user-topic transport. Automatic contextual lookups retain their restricted query policy. This is not a global relaxation of every application's search caller.

## Bounds

- Explicit topics: 1 to 500 characters, without a subject allowlist.
- Supplied URLs: up to 12 per session.
- Fetched page processing: up to 250,000 extracted characters, selecting relevant exact passages across the page rather than keeping only its first 1,200 characters.
- Evidence: at most 24 passages of at most 1,200 characters each. The original one-click web-research path keeps its existing limits.
- Source excerpts and search snippets are evidence, not independently verified facts. Snippets are distinguished from fetched page text.

## Verification Artifacts

- `browser-flow.cjs` exercises the real panel, engine, document library, and provider adapter with synthetic external search, page content, and AI replies.
- `browser-results.json` records the latest browser run; desktop and mobile screenshots are saved alongside it.
- `../research-sources-regression-2026-10-07/` contains the focused automated regression run.
- `artifacts.json` records synchronized module hashes and host pins. `sync.cjs --check` verifies the relevant existing mirrors.
- `ui-strings.delta.json` records the new English localization keys; untranslated languages retain their normal English fallback.

The preview is loopback-only and serves a fixed asset whitelist. It does not contact live search or AI services and does not validate deployed server behavior or live research quality. The source and server changes require the project's normal build and deployment process before they affect a hosted release.

## Final Checks

- All 10 browser acceptance scenarios passed on the final modules, including real local document import, combined retrieval, pasted evidence, exclusions, removal/undo, safe failures, exact quotations, and desktop/phone keyboard behavior.
- All 42 focused research-engine tests passed after the paragraph-boundary refinement.
- Local-provider bridge tests passed, and module/policy mirror checks passed.
- The broader 43-suite run reached its runner timeout without producing a Vitest results report. It is unverified, not a passing run or evidence of failing assertions. Its runner summary is retained, and final targeted search/privacy and UI checks were run separately.
- Final direct transport smoke passed 15/15 checks in a single Node process, including real client-to-Worker routing, Firebase, R/AI/pi topics, private-context separation, missing-query rejection, and managed-search policy. See `../research-sources-regression-2026-10-07/transport-smoke.json`.
- The final targeted Vitest reruns also timed out during worker startup: four transport suites and two UI suites executed no assertions. Earlier transport behavior checks (83), own-source UI checks (50), and settings/review checks (17) passed; the final browser checks independently exercise the current UI. These are focused results, not a full-suite pass.
