# Student Sources Reader QA

Reader source: `view_simplified_source.jsx`.
Focused tests: `tests/student_sources_reader.test.js`.

The compact Sources disclosure shows artifact-owned public evidence only, with source titles, domains, exact supplied passages, evidence labels, and links to public pages. Document excerpts require the separate student-sharing permission. Private document titles are localized to Teacher-provided source. No research report, excluded-source list, or search history is read by the component.

Inline citations open and focus the matching source, not a claimed sentence-level verification. Back to reading and Escape restore focus. Document fragments are intercepted even on modified/auxiliary clicks to avoid falling through to legacy cached-document viewers. Basic research uses the helper's links-only fallback; unrelated legacy references keep their original renderer after publicText cleaning.

## Final Verification (2026-10-09)

- 14 focused reader tests passed: `reader-tests-final.json`. An initial sandbox run stopped before assertions on an EPERM temporary-file rename; the approved unsandboxed retry passed. `vitest-startup.cjs` raised worker startup timeouts in memory only; dependencies were not changed.
- 10 browser scenarios passed against the canonical full SimplifiedView, helper, and packaged lucide icons: `browser-results.json`. They cover exact page text, approved/denied documents, Ctrl-click protection, snippets, AI notes, keyboard/focus, basic links-only fallback, raw-parentheses citations, mixed printed/web references, and 1280/390/320px layouts.
- No external network requests or AI/audio requests occurred in those source interactions.
- Desktop, 390px, and 320px screenshots were visually inspected; no source-panel overflow or overlap was found. The final run refreshed `student-sources-*.png`, including the collapsed desktop disclosure.
- This final verification made no product-source changes. Runtime synchronization and host pins are owned by the root task.

## Preview Build Scope

The synthetic local preview is `http://127.0.0.1:54775` (PID 35640; `preview.json` is authoritative). It serves canonical root modules, not the report-local candidates retained from earlier diagnostic runs. The earlier preview process was no longer running; the existing `start-preview.cjs` restarted it hidden on loopback. No live research, AI provider, production data, or deployment is involved.

Canonical SHA-256 hashes recorded by the final browser run:

- `text_pipeline_helpers_module.js`: `c009fc5a95668011290116e289ed0300e4535f6b82cc3309c320e71769e36136`
- `view_simplified_module.js`: `bb0684ba46204eecf4c2f2f849867f1061402824f6b2766f1f631e7f32d9e6be`

## Integration Notes

The shared helper now recognizes generated `Your Document References` and `Research Review` appendices, excludes them from reading/narration, and preserves literal heading examples inside fenced code. Mixed bibliographies retain plain printed references after privacy cleaning. Protected-original snapshots are not rewritten by the reader; student transport/export boundaries own that projection.

Source evidence is not a claim of factual verification. This UI does not expose raw research reports, excluded sources, or search history. Private-source sharing permission controls source names/excerpts, not facts already included in the instructional reading. No commit, push, or deployment was performed by this verification subtask.
