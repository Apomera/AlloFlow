# AlloFlow Evidence Graph and Inquiry Interoperability

Status: Evidence Graph schema v1 / generator v1.0.0  
Implemented: 2026-07-23

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
- `generatedAt`
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
- evidence that has been collected but not connected to an argument.

The Research Hub’s existing argument audit incorporates missing-warrant and unlinked-evidence counts. These prompts are revision aids, not automated evaluation.

## Interoperability exports

The Research Hub can download:

1. **Evidence Graph JSON** — AlloFlow’s bounded graph representation.
2. **W3C Web Annotation JSON-LD** — close-reading annotations represented as `AnnotationPage` / `Annotation` objects with `TextualBody` bodies and `TextQuoteSelector` targets.
3. **CSL-JSON** — source and tool-citation records for citation processors.
4. **RO-Crate 1.3 metadata** — `ro-crate-metadata.json` describing the inquiry entities, graph edges, and provenance. The metadata file should be kept with the portfolio and artifact files it describes.
5. **Complete interoperability bundle** — a bounded JSON object containing all four representations.

The RO-Crate export is metadata, not a ZIP archive. It does not silently copy source texts or large tool payloads into the crate.

## Extension rule

New tools should continue to emit a Tool Integration Contract capture. If a capture contains annotations, use a bounded annotation bundle with stable annotation and source-record identifiers. If a tool can identify the claim being annotated, it may include `targetClaimId`; otherwise AlloFlow must leave the annotation unlinked rather than infer a relationship.

