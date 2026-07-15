# Lumen Evidence Workspace

Status: initial implementation, July 2026.

Lumen is now an evidence workspace with distinct modes rather than a single expanding screen:

- **Study Sources** retrieves passages locally, requests a constrained synthesis from the configured AI provider, validates every returned evidence ID, and displays only cited claims.
- **Analyze Data** preserves Lumen's existing quantitative compendium, uncertainty grammar, charting, benchmark provenance, and export gates.
- **Conduct Inquiry** remains in Research Hub for now. A later phase can bridge it to the shared evidence-project model without rewriting its mature inquiry pedagogy.

## Implementation boundaries

The quantitative implementation remains in `stem_lab/stem_tool_lumen.js`. Source study is split into:

- `stem_lab/stem_lumen_evidence.js` — pure schema, passage chunking, deterministic lexical retrieval, prompt construction, response validation, staleness, migrations, and durable project storage.
- `stem_lab/stem_lumen_study.js` — React Study Sources experience and provider-neutral orchestration.

These files are separate browser globals because STEM plugins are loaded asynchronously. `stem_tool_lumen.js` can register before either supporting script and shows an honest loading state until both arrive.

## Evidence project schema

```text
EvidenceProject
  schemaVersion
  id, title, activeMode
  sources[]
  evidenceNodes[]
  claims[]
  artifacts[]
  audit[]
  createdAt, updatedAt
```

A source retains its content hash, version, locator, import method, and text. Passage nodes retain a source/version binding, stable content-derived ID, heading, line range, character range, and hash. Updating a source replaces its passage nodes and marks dependent claims and notes stale.

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

## Storage and privacy

Projects use AlloFlow's compressed IndexedDB/device-storage helper, with a bounded localStorage fallback. The storage key hashes the role/profile scope so a learner name is not written into the key. The ordinary STEM Lab persistence whitelist now includes Lumen Data state as well.

No source is sent during import or retrieval. An AI request contains only the locally selected passages. URL and supported file imports carry a title/locator/type record into Lumen only while a content signature still matches, preventing stale provenance from being attached after manual edits.

Study Sources permits eight AI requests per open session and applies a short repeat-request cooldown. Its bounded audit events retain hashes, evidence IDs, outcome codes, and timestamps, but not the learner's raw question text.

## Initial release acceptance contract

- Exact evidence IDs remain stable for unchanged source content.
- Source changes version the source and stale dependent artifacts.
- Retrieval is deterministic and can operate without AI.
- Missing support excerpts, unknown citations, and fabricated excerpts are rejected.
- Insufficient source support produces a refusal rather than outside-knowledge completion.
- Existing quantitative Lumen tests and honesty gates remain intact.
- Study Sources is reachable from the Learning Hub; the Educator Hub opens the Lumen mode chooser.

## Deliberately deferred

- Embeddings and hosted vector databases
- Drive/Classroom synchronization
- Collaborative projects
- Automatic open-web ingestion
- Full Research Hub schema migration
- Cross-source contradiction and coverage analytics
