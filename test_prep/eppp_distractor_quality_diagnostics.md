# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `f64e3ccbba014265b7ea7f0283ac28609aeaa494a4769231f9af15a4d840ccaf`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 27 |
| Asymmetric extreme-distractor candidates | 31 |
| Advanced direct-recall candidates | 1 |
| Semantic concept-duplicate pairs | 42 |
| Semantic concept-duplicate clusters | 30 |
| Audited anchors with active warnings | 0 |
| Audited anchors with no current warning | 10 |
| Priority docket | 20 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | eppp-v2-cognitive-affective-025 | Bank 6, item 75 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 2 | eppp-v2-cognitive-affective-037 | Bank 6, item 87 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 3 | eppp-v2-cognitive-affective-042 | Bank 6, item 92 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 4 | eppp-v2-cognitive-affective-047 | Bank 6, item 97 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 5 | eppp-v2-professional-044 | Bank 10, item 42 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 6 | eppp-v2-professional-046 | Bank 10, item 44 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-v2-professional-052 | Bank 10, item 50 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-v2-professional-071 | Bank 10, item 69 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-v2-professional-074 | Bank 10, item 89 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-v2-research-011 | Bank 9, item 84 | research | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-v2-social-cultural-029 | Bank 7, item 44 | social-cultural | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v3-assessment-069 | Bank 13, item 99 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-v3-assessment-075 | Bank 14, item 5 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v3-cognitive-affective-047 | Bank 11, item 97 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-v3-cognitive-affective-053 | Bank 12, item 3 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-v3-cognitive-affective-063 | Bank 12, item 13 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v3-intervention-061 | Bank 14, item 71 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-v3-professional-004 | Bank 15, item 24 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-v3-professional-005 | Bank 15, item 25 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-v3-professional-007 | Bank 15, item 27 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |

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
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8593 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.8208 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.8048 | high-tfidf-similarity | — |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8008 | high-tfidf-similarity | — |
| eppp-v2-biological-030 / eppp-v3-biological-011 | biological | 0.7715 | high-tfidf-similarity, shared-acronym | LTP |
| eppp-v2-assessment-010 / eppp-v2-assessment-046 | assessment | 0.7527 | high-tfidf-similarity, shared-acronym | TAT |
| eppp-v2-cognitive-affective-016 / eppp-v3-cognitive-affective-009 | cognitive-affective | 0.7438 | high-tfidf-similarity | — |
| eppp-v2-lifespan-014 / eppp-v3-lifespan-016 | lifespan | 0.7421 | high-tfidf-similarity, shared-rare-hyphenated-term | bler-ros |
| eppp-b024-professional-2 / eppp-v2-professional-079 | professional | 0.7404 | high-tfidf-similarity, shared-rare-hyphenated-term | record-keep |
| eppp-v2-assessment-008 / eppp-v3-assessment-001 | assessment | 0.7342 | high-tfidf-similarity | — |
| eppp-v3-assessment-042 / eppp-v3-assessment-054 | assessment | 0.7308 | high-tfidf-similarity | — |
| eppp-b011-research-2 / eppp-v2-research-032 | research | 0.7209 | high-tfidf-similarity, shared-rare-hyphenated-term | within-subject |
| eppp-b014-professional-2 / eppp-v3-professional-010 | professional | 0.7003 | shared-ethics-standard | standard 6.05 |
| eppp-b021-assessment-1 / eppp-b024-assessment-4 | assessment | 0.6941 | shared-acronym | II |
| eppp-v2-intervention-066 / eppp-v3-intervention-004 | intervention | 0.5768 | shared-rare-hyphenated-term | person-center |
| eppp-v2-assessment-051 / eppp-v3-assessment-014 | assessment | 0.5610 | shared-rare-hyphenated-term | set-shift |
| eppp-b028-social-1 / eppp-v3-social-cultural-048 | social-cultural | 0.5062 | shared-rare-hyphenated-term | self-serv |
| eppp-v2-intervention-024 / eppp-v2-intervention-033 | intervention | 0.5054 | shared-acronym | CPT, PTSD |
| eppp-b012-assessment-2 / eppp-v2-assessment-021 | assessment | 0.4953 | shared-rare-hyphenated-term | split-half |
| eppp-v3-research-011 / eppp-v3-research-017 | research | 0.4920 | shared-acronym, shared-rare-hyphenated-term | ANOVA, one-way |
| eppp-v2-assessment-031 / eppp-v2-assessment-051 | assessment | 0.4630 | shared-rare-hyphenated-term | set-shift |
| eppp-v2-assessment-025 / eppp-v3-assessment-031 | assessment | 0.4374 | shared-rare-hyphenated-term | real-world |
| eppp-b002-research-2 / eppp-b016-research-2 | research | 0.4338 | shared-rare-hyphenated-term | meta-analysi |
| eppp-v2-assessment-055 / eppp-v3-assessment-057 | assessment | 0.4151 | shared-acronym | SEM |
| eppp-v2-lifespan-032 / eppp-v3-lifespan-016 | lifespan | 0.3993 | shared-rare-hyphenated-term | bler-ros |
| eppp-v2-assessment-031 / eppp-v3-assessment-014 | assessment | 0.3725 | shared-rare-hyphenated-term | set-shift |
| eppp-v3-research-013 / eppp-v3-research-017 | research | 0.3645 | shared-acronym | ANOVA |
| eppp-v2-intervention-006 / eppp-v2-intervention-033 | intervention | 0.3347 | shared-acronym | CPT |
| eppp-v2-cognitive-affective-031 / eppp-v3-cognitive-affective-011 | cognitive-affective | 0.3301 | shared-rare-hyphenated-term | transfer-appropriate |
| eppp-v2-lifespan-014 / eppp-v2-lifespan-032 | lifespan | 0.3285 | shared-rare-hyphenated-term | bler-ros |
| eppp-v3-research-011 / eppp-v3-research-013 | research | 0.3172 | shared-acronym | ANOVA |
| eppp-v2-intervention-034 / eppp-v3-intervention-072 | intervention | 0.2960 | shared-acronym | SFBT |
| eppp-b018-assessment-2 / eppp-v3-assessment-057 | assessment | 0.2614 | shared-rare-hyphenated-term | true-score |
| eppp-v2-intervention-024 / eppp-v2-intervention-071 | intervention | 0.2395 | shared-rare-hyphenated-term | evidence-bas |
| eppp-b026-assessment-5 / eppp-v3-assessment-077 | assessment | 0.2390 | shared-rare-hyphenated-term | ninety-five |
| eppp-b012-intervention-2 / eppp-b028-intervention-1 | intervention | 0.2388 | shared-rare-hyphenated-term | harm-reduction |
| eppp-v2-assessment-017 / eppp-v2-assessment-054 | assessment | 0.2192 | shared-rare-hyphenated-term | norm-referenc |
| eppp-b001-assessment-1 / eppp-v2-assessment-006 | assessment | 0.2005 | shared-rare-hyphenated-term | inter-rater |
| eppp-b011-intervention-1 / eppp-v2-intervention-071 | intervention | 0.1998 | shared-rare-hyphenated-term | evidence-bas |
| eppp-b011-intervention-1 / eppp-v2-intervention-024 | intervention | 0.1923 | shared-rare-hyphenated-term | evidence-bas |
| eppp-b018-assessment-2 / eppp-v2-assessment-002 | assessment | 0.1862 | shared-rare-hyphenated-term | true-score |
| eppp-v2-biological-033 / eppp-v3-biological-046 | biological | 0.1532 | shared-rare-hyphenated-term | left-hemisphere |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
