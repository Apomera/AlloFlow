# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `0016b0238d5eaf695b530d53ba0cc35eb1a9caaef5d7ed8d242fc60941e2307a`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 56 |
| Asymmetric extreme-distractor candidates | 116 |
| Advanced direct-recall candidates | 4 |
| Semantic concept-duplicate pairs | 71 |
| Semantic concept-duplicate clusters | 42 |
| Audited anchors with active warnings | 2 |
| Audited anchors with no current warning | 8 |
| Priority docket | 20 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | eppp-v2-professional-040 | Bank 10, item 38 | professional | semantic-concept-duplicate-candidate | Three distractors contain stacked extreme modifiers, and fee splitting is repeated elsewhere in the bank. |
| 2 | eppp-v2-professional-030 | Bank 10, item 28 | professional | semantic-concept-duplicate-candidate | Extreme distractors make the key obvious, and the theoretical-orientation claim needs source-level adjudication. |
| 3 | eppp-b017-lifespan-2 | Bank 3, item 78 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 4 | eppp-b019-intervention-3 | Bank 4, item 17 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 5 | eppp-b020-cognitive-1 | Bank 4, item 22 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 6 | eppp-b021-assessment-4 | Bank 4, item 48 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-b021-cognitive-1 | Bank 4, item 38 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-b021-intervention-4 | Bank 4, item 52 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-b021-lifespan-2 | Bank 4, item 44 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-b022-intervention-2 | Bank 4, item 70 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-b022-professional-3 | Bank 4, item 75 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-b023-biological-1 | Bank 4, item 77 | biological | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-b023-intervention-2 | Bank 4, item 91 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-b023-professional-2 | Bank 4, item 94 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-b024-biological-2 | Bank 4, item 98 | biological | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-b024-cognitive-1 | Bank 4, item 99 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-b024-intervention-1 | Bank 5, item 10 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-b024-lifespan-2 | Bank 5, item 5 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-b025-cognitive-2 | Bank 5, item 19 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-b025-professional-2 | Bank 5, item 34 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |

## Audited-anchor outcomes

| Audit rank | Item | Status | Current diagnostics |
| ---: | --- | --- | --- |
| 1 | eppp-b006-biological-2 | no-current-warning | -- |
| 2 | eppp-v3-assessment-051 | no-current-warning | -- |
| 3 | eppp-v2-professional-040 | active-warning | semantic-concept-duplicate-candidate |
| 4 | eppp-v2-assessment-005 | no-current-warning | -- |
| 5 | eppp-v3-intervention-018 | no-current-warning | -- |
| 6 | eppp-b016-social-1 | no-current-warning | -- |
| 7 | eppp-b022-assessment-1 | no-current-warning | -- |
| 8 | eppp-b023-intervention-3 | no-current-warning | -- |
| 9 | eppp-v3-professional-030 | no-current-warning | -- |
| 10 | eppp-v2-professional-030 | active-warning | semantic-concept-duplicate-candidate |

## Highest-similarity concept candidates

| Pair | Domain | Similarity | Basis | Shared identifiers |
| --- | --- | ---: | --- | --- |
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8739 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8584 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v3-biological-001 / eppp-v3-biological-034 | biological | 0.8202 | high-tfidf-similarity | — |
| eppp-v3-lifespan-010 / eppp-v3-lifespan-051 | lifespan | 0.8124 | high-tfidf-similarity | — |
| eppp-v2-intervention-066 / eppp-v3-intervention-003 | intervention | 0.8116 | high-tfidf-similarity | — |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.8093 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8074 | high-tfidf-similarity | — |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.8008 | high-tfidf-similarity | — |
| eppp-v2-lifespan-035 / eppp-v3-lifespan-006 | lifespan | 0.7833 | high-tfidf-similarity | — |
| eppp-v2-biological-030 / eppp-v3-biological-011 | biological | 0.7640 | high-tfidf-similarity, shared-acronym | LTP |
| eppp-v2-cognitive-affective-009 / eppp-v3-cognitive-affective-008 | cognitive-affective | 0.7589 | high-tfidf-similarity, shared-rare-hyphenated-term | pre-exist |
| eppp-v2-cognitive-affective-016 / eppp-v3-cognitive-affective-009 | cognitive-affective | 0.7544 | high-tfidf-similarity | — |
| eppp-v2-lifespan-014 / eppp-v3-lifespan-016 | lifespan | 0.7455 | high-tfidf-similarity, shared-rare-hyphenated-term | bler-ros |
| eppp-v2-assessment-010 / eppp-v2-assessment-046 | assessment | 0.7426 | high-tfidf-similarity, shared-acronym | TAT |
| eppp-v2-assessment-008 / eppp-v3-assessment-001 | assessment | 0.7345 | high-tfidf-similarity | — |
| eppp-b024-professional-2 / eppp-v2-professional-079 | professional | 0.7284 | high-tfidf-similarity, shared-rare-hyphenated-term | record-keep |
| eppp-b022-social-1 / eppp-v3-social-cultural-052 | social-cultural | 0.7226 | high-tfidf-similarity | — |
| eppp-v3-lifespan-003 / eppp-v3-lifespan-009 | lifespan | 0.7220 | high-tfidf-similarity | — |
| eppp-b011-research-2 / eppp-v2-research-032 | research | 0.7180 | shared-rare-hyphenated-term | within-subject |
| eppp-b014-professional-2 / eppp-v3-professional-010 | professional | 0.6954 | shared-ethics-standard | standard 6.05 |
| eppp-b021-assessment-1 / eppp-b024-assessment-4 | assessment | 0.6912 | shared-acronym | II |
| eppp-v2-social-cultural-034 / eppp-v3-social-cultural-013 | social-cultural | 0.6628 | shared-rare-hyphenated-term | self-esteem |
| eppp-b024-assessment-4 / eppp-v3-assessment-008 | assessment | 0.6551 | shared-acronym | BDI-II, II |
| eppp-b021-assessment-1 / eppp-v3-assessment-008 | assessment | 0.6003 | shared-acronym | II |
| eppp-v2-intervention-066 / eppp-v3-intervention-004 | intervention | 0.5770 | shared-rare-hyphenated-term | person-center |
| eppp-v2-assessment-051 / eppp-v3-assessment-014 | assessment | 0.5670 | shared-rare-hyphenated-term | set-shift |
| eppp-b012-assessment-2 / eppp-v3-assessment-011 | assessment | 0.5627 | shared-rare-hyphenated-term | split-half |
| eppp-v2-assessment-021 / eppp-v3-assessment-011 | assessment | 0.5606 | shared-rare-hyphenated-term | split-half |
| eppp-v3-cognitive-affective-010 / eppp-v3-cognitive-affective-017 | cognitive-affective | 0.5224 | shared-rare-hyphenated-term | yerkes-dodson |
| eppp-b002-professional-2 / eppp-v2-professional-030 | professional | 0.5061 | shared-ethics-standard, shared-rare-hyphenated-term | standard 10.01, third-party |
| eppp-v2-intervention-024 / eppp-v2-intervention-033 | intervention | 0.4954 | shared-acronym | CPT, PTSD |
| eppp-b012-assessment-2 / eppp-v2-assessment-021 | assessment | 0.4827 | shared-rare-hyphenated-term | split-half |
| eppp-v3-research-011 / eppp-v3-research-017 | research | 0.4814 | shared-acronym, shared-rare-hyphenated-term | ANOVA, one-way |
| eppp-b028-social-1 / eppp-v3-social-cultural-048 | social-cultural | 0.4750 | shared-rare-hyphenated-term | self-serv |
| eppp-v2-assessment-031 / eppp-v2-assessment-051 | assessment | 0.4558 | shared-rare-hyphenated-term | set-shift |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-017 | cognitive-affective | 0.4484 | shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v2-intervention-024 / eppp-v3-intervention-050 | intervention | 0.4416 | shared-acronym | PTSD |
| eppp-v3-intervention-007 / eppp-v3-intervention-075 | intervention | 0.4249 | shared-acronym | ACT |
| eppp-v2-assessment-055 / eppp-v3-assessment-057 | assessment | 0.4159 | shared-acronym | SEM |
| eppp-b002-research-2 / eppp-b016-research-2 | research | 0.4105 | shared-rare-hyphenated-term | meta-analysi |
| eppp-v2-intervention-016 / eppp-v3-intervention-007 | intervention | 0.4074 | shared-acronym | ACT |
| eppp-v2-lifespan-032 / eppp-v3-lifespan-016 | lifespan | 0.4018 | shared-rare-hyphenated-term | bler-ros |
| eppp-v2-assessment-031 / eppp-v3-assessment-014 | assessment | 0.3698 | shared-rare-hyphenated-term | set-shift |
| eppp-v3-research-013 / eppp-v3-research-017 | research | 0.3436 | shared-acronym | ANOVA |
| eppp-v2-intervention-006 / eppp-v2-intervention-033 | intervention | 0.3383 | shared-acronym | CPT |
| eppp-b010-research-1 / eppp-v2-research-031 | research | 0.3356 | shared-rare-hyphenated-term | effect-size |
| eppp-v2-lifespan-014 / eppp-v2-lifespan-032 | lifespan | 0.3316 | shared-rare-hyphenated-term | bler-ros |
| eppp-v3-cognitive-affective-041 / eppp-v3-cognitive-affective-044 | cognitive-affective | 0.3234 | shared-rare-hyphenated-term | post-event |
| eppp-v3-research-011 / eppp-v3-research-013 | research | 0.3156 | shared-acronym | ANOVA |
| eppp-b007-social-1 / eppp-v3-social-cultural-048 | social-cultural | 0.3093 | shared-rare-hyphenated-term | self-serv |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
