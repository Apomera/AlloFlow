# Fidelity validation handoff

The September 9 semantic regressions are synthetic engineering evidence. They do not populate the human calibration corpus or certify a screen-reader workflow. The human manifest remains empty until actual observations are imported.

## Human session packet

Use the artifact hashing, environment recording, and independent task procedure in [export assistive-technology acceptance](document-export-at-acceptance.md). Keep each source, exported artifact, automated report, and completed human observation together. Author expected answers from the source before inspecting the output. Leave unperformed tasks as `not-run`.

| Source case to recruit | Task for the reviewer | Evidence to retain |
| --- | --- | --- |
| Reading with a hidden or collapsed section | Read continuously and navigate headings; confirm all intended instructions are available | Missing/repeated passage locations and reader announcements |
| Table with spanning and explicit headers | Find selected values using row and column context | Source cell coordinates, announced headers, incorrect associations |
| Form with defaults, selections, and labels | Identify each field, enter values, change selections, and reset | Initial/reset values, accessible names, keyboard sequence; use a local submission target |
| Fractions, exponents, operators, and equations | Explain each expression using the intended math-reading workflow | Source expression, spoken interpretation, navigation difficulty |
| Multilingual content and bidirectional passages | Read each passage and switch between languages | Language/voice settings, omissions, ordering, pronunciation problems |
| Scanned pages and informative figures | Compare extracted content and descriptions to the source | OCR substitutions, missing content, description usefulness and figure association |

Record the actual browser/reader, screen reader, operating system, versions, tester experience, artifact hashes, and outcome for every session. A changed export needs a new record. PDF form support must be established independently; the existing portable path refuses interactive forms.

## Engineering evidence and remaining scope

`tests/remediation_semantic_fidelity.test.js` exercises hiding, table semantics, form state and label associations, MathML structure, and multilingual wording, plus positive repairs. `tests/e2e/remediation_preservation_review.spec.ts` verifies local browser review navigation and acknowledgment behavior.

The strict gate checks static markup and supported inline stylesheet hiding rules. It cannot establish computed visibility across external styles, scripts, every CSS feature, or reader-specific behavior. MathML structure preservation cannot prove a description is correct or that a reader renders it usefully. Form-state preservation conservatively retains defaults and existing labels; deliberate behavioral changes require separate review.

Rejection locations identify the input for one attempt (pass, chunk, phase, and optional table/cell/link/control/math position). They survive canonical JSON storage and appear in prepared Workbench instructions. They are historical positions, not a complete immutable source model or automatic links into later revisions. Existing hashed table/image references remain independently verified before preview navigation. Rejected candidate text is not retained in public telemetry, so this does not provide a source/candidate side-by-side diff.

## Performance baseline

Run `node reports/document-remediation-semantic-refinements-2026-09-09/benchmark.cjs` from the repository root to measure deterministic strict acceptance on synthetic mixed-content inputs. The report records source SHA-256, Node version, input sizes, warmup, and individual samples. Retain a copy before repeating a run.

Before choosing caching or concurrency changes, collect representative consented documents and measure the full pipeline: extraction, model latency and calls, rejected candidates and retries, export/verification, process memory, and time spent by reviewers. Group results by document type and size. Compare identical source sets and versions; this small local baseline cannot supply production targets or model-quality claims.

The follow-up [performance profile and MCP checks](../reports/document-remediation-performance-2026-09-09/README.md) compare a saved pre-change gate with the optimized gate in jsdom and Chromium. The browser's large synthetic case improved by about 23% through indexing native label associations once per document. This measures deterministic acceptance, not total remediation latency. The local MCP self-test and synthetic policy calibration remain automated evidence; human calibration status is reported separately.

The [follow-up fidelity fixes](../reports/document-remediation-followup-fixes-2026-09-09/README.md) add effective form-name/disabled-state checks, ordered visibility occurrences, internal link-target binding, and prose/math-description protection. Simple default input types, hidden inline formatting, ordinary CSS cascade overrides, and constrained column-header scope corrections are accepted. The final validation runner checks successful process exit and complete per-file results, with stderr retained.

A [rendered-fidelity comparison and 20-case synthetic corpus](rendered-document-fidelity.md) now complement the static gate. Contracts are source-authored and optional in post-export acceptance reports; coverage is limited to selected properties and checkpoints. Synthetic counts remain separate from human calibration.
