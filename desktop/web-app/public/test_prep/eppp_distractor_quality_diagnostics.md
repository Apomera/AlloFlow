# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `635ef27ea526a6bd6e4c4626514ab6ab1ce1e77ab00d097782657c8048d81f42`

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
| Asymmetric extreme-distractor candidates | 27 |
| Advanced direct-recall candidates | 0 |
| Semantic concept-duplicate pairs | 0 |
| Semantic concept-duplicate clusters | 0 |
| Audited anchors with active warnings | 0 |
| Audited anchors with no current warning | 10 |
| Priority docket | 20 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | eppp-v2-professional-008 | Bank 10, item 6 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 2 | eppp-v2-cognitive-affective-037 | Bank 6, item 87 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 3 | eppp-v2-professional-011 | Bank 10, item 9 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 4 | eppp-v2-professional-044 | Bank 10, item 42 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 5 | eppp-v2-professional-046 | Bank 10, item 44 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 6 | eppp-v2-professional-071 | Bank 10, item 69 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-v2-professional-074 | Bank 10, item 89 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-v3-assessment-069 | Bank 13, item 99 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-v3-assessment-075 | Bank 14, item 5 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-v3-cognitive-affective-047 | Bank 11, item 97 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-v3-cognitive-affective-053 | Bank 12, item 3 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v3-cognitive-affective-063 | Bank 12, item 13 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-v3-intervention-061 | Bank 14, item 71 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v3-professional-004 | Bank 15, item 24 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-v3-professional-005 | Bank 15, item 25 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-v3-professional-007 | Bank 15, item 27 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v3-professional-008 | Bank 15, item 28 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-v3-professional-012 | Bank 15, item 32 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-v3-professional-016 | Bank 15, item 36 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-v3-professional-018 | Bank 15, item 38 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |

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
