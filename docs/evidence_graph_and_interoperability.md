# AlloFlow Evidence Graph and Inquiry Interoperability

Status: Evidence Graph schema v2 / generator v1.1.0  
Implemented: 2026-07-23; integrity and recovery revision: 2026-07-25

## Purpose

The Evidence Graph is a derived, bounded view of the existing Inquiry Portfolio. It does not replace lane-specific records and does not infer whether a claim is true. Its job is to make learner-authored reasoning relationships inspectable across scientific, engineering, humanistic, civic, qualitative, and creative work.

The graph deliberately keeps different objects distinct:

- scientific claims, model snapshots, measurements, and reproducibility receipts;
- engineering design claims, criteria, and test results;
- humanistic positions, source context, excerpts, annotations, and alternative readings;
- cross-tool artifacts, learner interpretations, uncertainty notes, and provenance.

Raw source text, structure files, sequences, audio payloads, and direct identifiers are not copied into the graph.

## Schema

Each graph contains:

- `schemaVersion`
- `generatorVersion`
- `snapshotId` (stable for the same portfolio content)
- `generatedAt` (derived from the portfolio revision time, not wall-clock render time)
- `questionNodeId`
- `nodes[]`
- `edges[]`
- `claimViews[]`
- `diagnostics[]`
- `status`

Node types:

- `question`
- `claim`
- `humanities_position`
- `design_claim`
- `source`
- `evidence`
- `tool_artifact`
- `annotation`
- `test_result`
- `model`

Relationship types:

- `supports`
- `complicates`
- `contradicts`
- `contextualizes`
- `derivedFrom`
- `requiresWarrant`
- `frames`

Argument relationships point from the evidence object to the claim or position. `derivedFrom` records provenance without treating provenance as argumentative support.

## Rigor diagnostics

The graph reports, but does not grade:

- claims without explicit support;
- supporting links without warrants;
- inquiries without complicating or contradictory evidence;
- evidence that has been collected but not connected to an argument;
- missing, ambiguous, duplicate, or self-referential record identifiers;
- cycles in `derivedFrom` provenance;
- duplicate citation records.

The Research Hub’s existing argument audit incorporates missing-warrant and unlinked-evidence counts. These prompts are revision aids, not automated evaluation.

## Interoperability exports

The Research Hub can download:

1. **Evidence Graph JSON** — AlloFlow’s bounded graph representation.
2. **W3C Web Annotation JSON-LD** — close-reading annotations represented as `AnnotationPage` / `Annotation` objects with `TextualBody` bodies and `TextQuoteSelector` targets.
3. **CSL-JSON** — source and tool-citation records for citation processors.
4. **RO-Crate 1.3 metadata** — `ro-crate-metadata.json` describing the inquiry entities, graph edges, and provenance. The metadata file should be kept with the portfolio and artifact files it describes.
5. **Complete interoperability bundle** — a validated, bounded JSON object containing all four representations plus a privacy-redacted portable portfolio for round-trip import.

Exports are checked before download. The graph and annotation-page identities are content-stable; `exportedAt` records the separate act of downloading a bundle. JSON Schemas live in `docs/schemas/` for the graph, portfolio, and bundle.

## Repair, import, and recovery

The Evidence Workbench lets learners add, revise, or remove explicit relationships without deleting the underlying claim or evidence. Warrant prompts adapt to the selected developmental level.

Portfolio and bundle imports are previewed before mutation. Learners choose **merge** or **replace**, and AlloFlow writes a recovery snapshot first. Import accepts portfolio schema versions 1–6 and migrates recognized fields into the current v6 substrate. Unknown future schemas fail closed.

Large audio and image data URLs are first saved inline, then copied to IndexedDB and replaced in localStorage with stable media references. If IndexedDB is unavailable, the original localStorage behavior remains. Missing detached media is reported without discarding textual records.

## Citation fidelity

CSL-JSON export supports structured names, issued/accessed dates, container title, publisher and place, DOI, ISBN, ISSN, volume, issue, page/locator, language, and URL. Duplicate DOI, normalized URL, or title/date records are reported and deduplicated at export.

The RO-Crate export is metadata, not a ZIP archive. It does not silently copy source texts or large tool payloads into the crate.

## Extension rule

New tools should continue to emit a Tool Integration Contract capture. If a capture contains annotations, use a bounded annotation bundle with stable annotation and source-record identifiers. If a tool can identify the claim being annotated, it may include `targetClaimId`; otherwise AlloFlow must leave the annotation unlinked rather than infer a relationship.

