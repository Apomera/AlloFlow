# Semantic fidelity refinements

Implemented locally after the follow-up authorization. No deployment, live model call, or human acceptance claim was made.

## Changes

- Strict repairs now reject newly hidden source content detected through HTML/ARIA attributes, supported inline styles, and static stylesheet selectors.
- Existing data-table roles, header cells, multi-cell scope declarations, and valid explicit header associations are protected. Consistent header-ID renaming remains accepted. A one-cell table may correct its scope without inventing a relationship to another cell.
- Forms preserve values, selections, state constraints, submission destinations, existing label associations, and existing ARIA names. Adding an accessible name to an unlabeled field remains permitted.
- MathML preserves operators and expression structure while allowing added descriptions. Multilingual wording regressions verify the existing Unicode-aware reading-order check.
- Selected failures carry a bounded source position, including exact changed table cells. The canonical browser/desktop evidence schema, pass aggregation, saved project fields, review UI, and prepared Workbench instructions retain it. Invalid location payloads are discarded; source/candidate text is not added to telemetry.
- The policy version advanced to `20260909-2`. Pipeline/review modules and desktop public mirrors were rebuilt, and local runner packaging was refreshed.

Locations are historical positions in the input for one attempt, qualified by pass/chunk/phase. They are not immutable source identities or automatic navigation targets in a later revision. Existing hashed table/image reference navigation remains independently checked. This refinement does not add a source/candidate side-by-side comparison.

## Evidence

| Check | Result | Artifact |
| --- | --- | --- |
| Baseline synthetic probes | 13 failures reproduced; 8 cases already passed | [Before](before.json) |
| Initial focused run | 82 passed; one legitimate one-cell scope correction rejected, subsequently fixed | [Initial tests](first-tests.json) |
| Final focused regressions | 130 passed across 8 files | [Final tests](final-tests.json) |
| Public report contract | 21 passed | [Report tests](report-tests.json) |
| Chromium review/keyboard suite | 13 passed, with requests intercepted locally | [Browser tests](browser-tests.json) |
| Generated modules | Both public mirrors exactly match | [Bundle verification](bundle-verification.json) |

The final regressions include the rebuilt shipping pipeline, source-preservation gates, positive repairs, bounded serialization, stale section-review evidence ownership, source references, and build parity. Scoped `git diff --check` passed.

## Timing baseline

[The local benchmark](timing-baseline.json) records three measured trials after one warmup at each size, with the exact source hash and Node version. This is deterministic strict acceptance in jsdom using repeated synthetic mixed-content blocks; it excludes model calls, export, and human review.

| Input size | Mixed-content blocks | Median acceptance time |
| --- | --- | --- |
| 3,166 bytes | 10 | 1.28 seconds |
| 31,336 bytes | 100 | 2.27 seconds |
| 125,236 bytes | 400 | 44.63 seconds |

The large synthetic case identifies a profiling target. Its samples ranged from 23.0 to 49.3 seconds during concurrent host work, so this is not a production latency estimate, a comparison against the previous implementation, or evidence that caching/concurrency would help. Profile DOM traversal and label/reference collection on representative documents before choosing an optimization.

## Human validation and limits

[The validation handoff](../../docs/document-remediation-fidelity-validation.md) supplies a six-category human session matrix and connects it to the existing artifact-hash and screen-reader protocol. No human observations were created, and the calibration manifest remains empty.

Static visibility checks cannot cover all external CSS, dynamic scripts, or reader-specific behavior. Preserving MathML structure does not prove correct spoken math or descriptive text. Existing form labels and behavior are protected conservatively. These checks retain originals when they detect drift; they do not establish complete accessibility or fidelity.
