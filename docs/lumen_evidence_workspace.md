# Lumen Evidence Workspace

Status: active implementation, July 2026. Discover Sources, safe page import, local document import, active-source controls, labels, and exact-passage viewing are implemented.

Lumen is now an evidence workspace with distinct modes rather than a single expanding screen:

- **Study Sources** retrieves passages locally, requests a constrained synthesis from the configured AI provider, validates every returned evidence ID, and displays only cited claims.
- **Analyze Data** preserves Lumen's existing quantitative compendium, uncertainty grammar, charting, benchmark provenance, and export gates.
- **Conduct Inquiry** remains in Research Hub for now. A later phase can bridge it to the shared evidence-project model without rewriting its mature inquiry pedagogy.

## Implementation boundaries

The quantitative implementation remains in `stem_lab/stem_tool_lumen.js`. Source study is split into:

- `stem_lab/stem_lumen_evidence.js` — pure schema, passage chunking, deterministic lexical retrieval, prompt construction, response validation, staleness, migrations, and durable project storage.
- `stem_lab/stem_lumen_documents.js` — local document routing, deterministic extractor adapter, provenance construction, EPUB spine reader, and fail-closed import rules.
- `stem_lab/stem_lumen_study.js` — React Study Sources experience and provider-neutral orchestration.
- `desktop/web-app/functions/web_source_fetch.js` and `desktop/runtime/web-source-fetch.cjs` — byte-identical DNS-pinned, redirect-revalidating public-page import boundary.
- `docs/lumen_discover_sources.md` — web discovery, candidate/import boundary, privacy disclosure and acceptance contract.
- `docs/lumen_deep_dive_2026-07-16.md` — current NotebookLM comparison, product assessment, and prioritized improvement roadmap.

These files are separate browser globals because STEM plugins are loaded asynchronously. `stem_tool_lumen.js` can register before either supporting script and shows an honest loading state until both arrive.

## Evidence project schema

```text
EvidenceProject
  schemaVersion
  id, title, activeMode
  retrievalLabel
  sources[] { active, labels[], file provenance }
  evidenceNodes[]
  claims[]
  artifacts[]
  audit[]
  createdAt, updatedAt
```

A source retains its content hash, version, locator, import method, text, active state, and normalized labels. Passage nodes retain a source/version binding, stable content-derived ID, heading, line range, character range, and hash. Updating a source replaces its passage nodes and marks dependent claims and notes stale while preserving its active state and labels.

## Grounded-answer pipeline

1. Normalize and chunk sources locally.
2. Rank passages locally with deterministic lexical retrieval.
3. Send only the selected passages and the learner's question to the configured AI provider.
4. Treat passage content as untrusted data, not prompt instructions.
5. Require every structured claim to include evidence IDs and an exact supporting excerpt.
6. Reject missing excerpts, unknown evidence IDs, and excerpts that do not occur in the cited passages.
7. Construct the displayed answer from validated claims only; discard any uncited free-answer field.
8. Preserve an explicit insufficient-evidence refusal.

This pipeline works with Canvas-provided Gemini access, user API keys, Firebase/desktop configurations, and local models because retrieval, citation identity, validation, and persistence belong to AlloFlow rather than a hosted AI service.

## Source scope, labels, and passage inspection

Each source has a persistent active switch. An optional label filter narrows the current study scope further and also filters the visible source list. `retrieve()` admits passages only from active sources that match the current label. `buildGroundedPrompt()` repeats the same eligibility check so an excluded passage supplied accidentally by a caller still cannot enter an AI prompt.

Active/label changes are organizational state, not source-content changes, so they do not stale saved claims or notes. Content refreshes preserve those controls while still versioning the source and staling its dependents. Version-1 projects migrate with every source active, normalized de-duplicated labels, and an invalid saved filter cleared.

Retrieved evidence and citation chips can open a keyboard-focusable stored-passage viewer. It shows exact highlighted snapshot text with surrounding context, line and character positions, source version, import/fetch time, content hash, and the original public link when available. It never refetches the page merely to inspect a citation.

## Local document import

Study Sources imports PDF, DOCX, PPTX, XLSX/XLS/XLSB/ODS, TXT, Markdown, CSV, and EPUB locally. Binary formats reuse AlloFlow's existing document pipeline; EPUB reuses its local ZIP dependency path. File bytes are not sent to AI or retained in the project. Only the normalized text snapshot and bounded provenance metadata enter the evidence graph.

Page, slide, sheet, and EPUB-section boundaries become structured evidence locators. A damaged page, encrypted/unreadable Office file, truncated workbook, malformed/expansive EPUB, unsupported type, or size/character-limit violation fails closed and creates no partial source. Replacing a file with the same name versions the existing source while preserving its active state and labels. See `docs/lumen_local_documents.md` for the complete contract.

## Web discovery and import

Discover Sources searches through the environment's provider-neutral search path, normalizes up to ten public HTTP(S) candidates, and requires explicit human selection. Candidate titles, URLs and snippets remain outside `sources[]` and can never support a claim. Only a successfully retrieved page snapshot that passes URL/DNS validation, redirect revalidation, text content checks, byte/time limits, and the readable-text minimum enters `upsertSource`, where it is hashed, versioned, and chunked locally. Hosted and explicit Functions environments prefer the authenticated `/api/sourceFetchProxy`; the bundled desktop app uses the same safety core through its private loopback runtime.

The UI discloses search/import network egress and warns against learner names, private information and signed/tokenized links. Search audit events retain only a query hash. See `docs/lumen_discover_sources.md` for the full contract.

## Storage and privacy

Projects use AlloFlow's compressed IndexedDB/device-storage helper, with a bounded localStorage fallback. The storage key hashes the role/profile scope so a learner name is not written into the key. The ordinary STEM Lab persistence whitelist now includes Lumen Data state as well.

Importing a discovered page sends its selected public URL to the configured page-import service and returns a readable snapshot to the device. The importer sends no browser cookies or authorization state. Local retrieval sends nothing off-device; a later AI request contains only the locally selected passages. URL and supported file imports carry a title/locator/type record into Lumen only while a content signature still matches, preventing stale provenance from being attached after manual edits.

Study Sources permits eight AI requests per open session and applies a short repeat-request cooldown. Its bounded audit events retain hashes, evidence IDs, outcome codes, and timestamps, but not the learner's raw question text.

## Initial release acceptance contract

- Exact evidence IDs remain stable for unchanged source content.
- Source changes version the source and stale dependent artifacts.
- Retrieval is deterministic and can operate without AI.
- Inactive or label-excluded sources never enter retrieval or prompt payloads.
- Active state, labels, and label scope survive schema migration and durable storage.
- Citation controls open the exact stored passage and source version with keyboard focus.
- Local files preserve format, size, last-modified time, extraction method, part count, version, content fingerprint, and page/slide/sheet/section context.
- A partial, truncated, encrypted, unreadable, oversized, or unsupported document never contributes evidence.
- Missing support excerpts, unknown citations, and fabricated excerpts are rejected.
- Insufficient source support produces a refusal rather than outside-knowledge completion.
- Existing quantitative Lumen tests and honesty gates remain intact.
- Study Sources is reachable from the Learning Hub; the Educator Hub opens the Lumen mode chooser.
- Search snippets remain candidate metadata and never enter the evidence-node pipeline.
- A discovered result becomes a source only after full readable page text is fetched, normalized and hashed.
- Unsafe/private URL targets, credentials and duplicate canonical URLs are refused.
- Every redirect is re-resolved and pinned to approved public addresses; text, time, byte, and redirect ceilings fail closed.
- A first-party safety rejection is never bypassed through the legacy web-text helper.
- The Firebase route requires ID-token/App-Check authentication; the desktop route remains private-loopback and same-origin.
- The complete search → select → import interaction passes automated accessibility coverage.

## Deliberately deferred

- Embeddings and hosted vector databases
- Drive/Classroom synchronization
- Collaborative projects
- Agentic multi-hop Deep Research and automatic source selection
- Full Research Hub schema migration
- Cross-source contradiction and coverage analytics
