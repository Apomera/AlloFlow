# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `750a0543b9ec9f9c0243f84e91a019836b421e975f5956fec264286b3fca9917`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 0 |
| Asymmetric extreme-distractor candidates | 0 |
| Advanced direct-recall candidates | 0 |
| Semantic concept-duplicate pairs | 0 |
| Semantic concept-duplicate clusters | 0 |
| Audited anchors with active warnings | 0 |
| Audited anchors with no current warning | 10 |
| Priority docket | 0 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |


## Audited-anchor outcomes

| Audit rank | Item | Status | Current diagnostics |
| ---: | --- | --- | --- |
| 1 | eppp-b006-biological-2 | no-current-warning | -- |
| 2 | eppp-v3-assessment-051 | no-current-warning | -- |
| 3 | eppp-v2-professional-040 | no-current-warning | -- |
| 4 | eppp-v2-assessment-005 | no-current-warning | -- |
| 5 | eppp-v3-intervention-018 | no-current-warning | -- |
| 6 | eppp-b016-social-1 | no-current-warning | -- |
| 7 | eppp-b022-assessment-1 | no-current-warning | -- |
| 8 | eppp-b023-intervention-3 | no-current-warning | -- |
| 9 | eppp-v3-professional-030 | no-current-warning | -- |
| 10 | eppp-v2-professional-030 | no-current-warning | -- |

## Highest-similarity concept candidates

| Pair | Domain | Similarity | Basis | Shared identifiers |
| --- | --- | ---: | --- | --- |


## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
