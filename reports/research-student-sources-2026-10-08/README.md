# Student Research Sources

Local implementation started 2026-10-08; final verification 2026-10-09. No commit, push, or deployment.

## Experience

- The reading has a compact Sources disclosure. Students can inspect available source titles, links, evidence types, and exact saved passages without seeing the teacher's research controls or activity.
- Inline citations open the corresponding source, with keyboard focus and a return-to-reading action. Several passages can belong to one source; the panel does not claim that every passage independently proves the clicked sentence.
- Search snippets, page excerpts, AI-linked notes, and document passages are labeled separately. Basic or older readings fall back to reference links without invented excerpts.
- Student exports retain approved web excerpts in a separately labeled source section outside the narrated reading. Private source appendices are projected through the same permission-aware boundary.
- The teacher can explicitly share a private source's name and supporting excerpts from source review. Imported documents and pasted text default to unshared, including pasted text accompanied by a web URL.
- This permission covers source details. The reading itself may contain information derived from the source and still needs teacher review before sharing. Previously distributed copies cannot be recalled by changing the setting.

## Data And Privacy

- `TextPipelineHelpers.studentSources` / `AlloModules.StudentSources` creates a bounded, whitelisted record of cited sources. It excludes teacher queries, research activity, unused passages, private document names/locations, and unapproved excerpts.
- Records bind to the complete instructional body. Ordinary edits discard stale excerpt associations; adaptation rebinds only after the existing citation-conservation checks succeed. Adapted prose is labeled synthesis, not exact quotation. Citation conservation is not a factual or semantic-entailment check.
- The student delivery paths sanitize the actual delivered text, including after live-session truncation and legacy encoded-data decoding. Raw research reports and private appendices are removed. Teacher provenance signatures and stale private snapshots do not travel to students.
- Teacher cloud history retains teacher working data. Student records never depend on the teacher device's cached document viewer.
- Private appendix headings, including colon variants and nested headings, cannot create a public boundary inside a trailing private report. Missing helpers fail closed for private evidence.
- Document-only reference appendices are separated from instructional prose and default narration.

## Verification

Detailed machine-readable results are stored alongside this file. Final browser checks use canonical modules after synchronization, not the earlier report-local candidates.

- Projection: 22 tests passed (`projection-tests-final.json`), including literal private-heading examples in fenced code.
- Source collection, generated provenance, and teacher review controls: 61 tests passed (`source-review-tests-final.json`).
- Reader: 14 tests passed (`reader-tests-final.json`). The canonical browser run passed 10 scenarios at desktop and 390/320px phone widths (`browser-results.json`); refreshed screenshots were visually inspected.
- Pipeline, Firestore, and student transport: 118 relevant assertions passed in `pipeline-tests.json`. That earlier combined report also contains 45 passing mailbox checks and one test-harness failure. The corrected full mailbox/student-transport rerun passed 61/61 (mailbox 46, student transport 15) in `transport-mailbox-tests-final.json`; the exact direct mailbox/privacy smoke also passed.
- Exports: 13 tests passed; citation resilience: 18 tests passed (`artifact-export-tests-final.json`). That run also identified two adaptation fixtures missing the new explicit sharing permission. The fixture was corrected without weakening assertions; the separate full adaptation rerun passed 25/25 in `adaptation-tests-final.json`.
- Across these completed runs, 317 distinct focused unit checks passed; repeated transport checks are counted only once. The 10 browser scenarios are additional.
- `sync.cjs --check` passed for all eight runtime module families, existing mirrors, and their loader pins. Scoped `git diff --check` passed.
- Earlier Windows sandbox/cache and worker-startup failures occurred before assertions. Approved unsandboxed retries are recorded separately. `vitest-startup.cjs` extends worker startup only, in memory; dependencies and assertion timeouts are unchanged. Failed or partial attempts are not counted as passing runs.

## Artifacts And Limits

`sync.cjs` updates only the eight affected module families, existing mirrors, their loader pins, and the new dispatcher dependency in the three hosts. `artifacts.json` records exact hashes. `strings.cjs` registers the 18 new English labels; `ui-strings.delta.json` is the localization handoff. Other languages use the existing English fallbacks until translated.

Browser fixtures use synthetic readings and sources, not live search or AI. No live provider evaluation, production deployment, full application build, or assistive-technology session was performed. Existing unrelated workspace changes were preserved. No new research requests or model calls were introduced.

Synthetic local preview: http://127.0.0.1:54775. `preview.json` records its process and address; this is not the full application or a deployed build.
