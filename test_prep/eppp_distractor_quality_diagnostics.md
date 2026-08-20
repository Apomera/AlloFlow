# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `cc37a146d6a9f9590917b3a134d4aae6b737ca2548040919c842f8483e4fae18`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 40 |
| Asymmetric extreme-distractor candidates | 54 |
| Advanced direct-recall candidates | 1 |
| Semantic concept-duplicate pairs | 51 |
| Semantic concept-duplicate clusters | 36 |
| Audited anchors with active warnings | 0 |
| Audited anchors with no current warning | 10 |
| Priority docket | 20 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | eppp-v3-intervention-067 | Bank 14, item 77 | intervention | unique-key/stem-lexical-leakage, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 2 | eppp-v2-assessment-070 | Bank 8, item 95 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 3 | eppp-v2-cognitive-affective-008 | Bank 6, item 58 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 4 | eppp-v2-cognitive-affective-010 | Bank 6, item 60 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 5 | eppp-v2-cognitive-affective-022 | Bank 6, item 72 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 6 | eppp-v2-cognitive-affective-025 | Bank 6, item 75 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-v2-cognitive-affective-026 | Bank 6, item 76 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-v2-cognitive-affective-037 | Bank 6, item 87 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-v2-cognitive-affective-042 | Bank 6, item 92 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-v2-cognitive-affective-047 | Bank 6, item 97 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-v2-cognitive-affective-061 | Bank 7, item 11 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v2-intervention-065 | Bank 9, item 63 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-v2-intervention-070 | Bank 9, item 68 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v2-lifespan-045 | Bank 8, item 10 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-v2-lifespan-050 | Bank 8, item 15 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-v2-professional-031 | Bank 10, item 29 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v2-professional-034 | Bank 10, item 32 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-v2-professional-038 | Bank 10, item 36 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-v2-professional-039 | Bank 10, item 37 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-v2-professional-044 | Bank 10, item 42 | professional | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |

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
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8712 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8609 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.8141 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8019 | high-tfidf-similarity | — |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.8017 | high-tfidf-similarity | — |
| eppp-v2-biological-030 / eppp-v3-biological-011 | biological | 0.7652 | high-tfidf-similarity, shared-acronym | LTP |
| eppp-v2-assessment-010 / eppp-v2-assessment-046 | assessment | 0.7527 | high-tfidf-similarity, shared-acronym | TAT |
| eppp-v2-cognitive-affective-016 / eppp-v3-cognitive-affective-009 | cognitive-affective | 0.7509 | high-tfidf-similarity | — |
| eppp-v2-lifespan-014 / eppp-v3-lifespan-016 | lifespan | 0.7450 | high-tfidf-similarity, shared-rare-hyphenated-term | bler-ros |
| eppp-b024-professional-2 / eppp-v2-professional-079 | professional | 0.7369 | high-tfidf-similarity, shared-rare-hyphenated-term | record-keep |
| eppp-v2-assessment-008 / eppp-v3-assessment-001 | assessment | 0.7339 | high-tfidf-similarity | — |
| eppp-v3-assessment-042 / eppp-v3-assessment-054 | assessment | 0.7237 | high-tfidf-similarity | — |
| eppp-b022-social-1 / eppp-v3-social-cultural-052 | social-cultural | 0.7222 | high-tfidf-similarity | — |
| eppp-b011-research-2 / eppp-v2-research-032 | research | 0.7137 | shared-rare-hyphenated-term | within-subject |
| eppp-b021-assessment-1 / eppp-b024-assessment-4 | assessment | 0.6969 | shared-acronym | II |
| eppp-b014-professional-2 / eppp-v3-professional-010 | professional | 0.6936 | shared-ethics-standard | standard 6.05 |
| eppp-v2-intervention-066 / eppp-v3-intervention-004 | intervention | 0.5752 | shared-rare-hyphenated-term | person-center |
| eppp-v2-assessment-051 / eppp-v3-assessment-014 | assessment | 0.5633 | shared-rare-hyphenated-term | set-shift |
| eppp-v2-intervention-024 / eppp-v2-intervention-033 | intervention | 0.4974 | shared-acronym | CPT, PTSD |
| eppp-b012-assessment-2 / eppp-v2-assessment-021 | assessment | 0.4958 | shared-rare-hyphenated-term | split-half |
| eppp-v3-research-011 / eppp-v3-research-017 | research | 0.4874 | shared-acronym, shared-rare-hyphenated-term | ANOVA, one-way |
| eppp-b028-social-1 / eppp-v3-social-cultural-048 | social-cultural | 0.4828 | shared-rare-hyphenated-term | self-serv |
| eppp-v2-assessment-031 / eppp-v2-assessment-051 | assessment | 0.4618 | shared-rare-hyphenated-term | set-shift |
| eppp-b002-research-2 / eppp-b016-research-2 | research | 0.4170 | shared-rare-hyphenated-term | meta-analysi |
| eppp-v2-assessment-055 / eppp-v3-assessment-057 | assessment | 0.4167 | shared-acronym | SEM |
| eppp-v2-lifespan-032 / eppp-v3-lifespan-016 | lifespan | 0.4040 | shared-rare-hyphenated-term | bler-ros |
| eppp-v2-assessment-031 / eppp-v3-assessment-014 | assessment | 0.3686 | shared-rare-hyphenated-term | set-shift |
| eppp-v3-research-013 / eppp-v3-research-017 | research | 0.3515 | shared-acronym | ANOVA |
| eppp-v3-intervention-010 / eppp-v3-intervention-067 | intervention | 0.3458 | shared-acronym | PTSD |
| eppp-b010-research-1 / eppp-v2-research-031 | research | 0.3420 | shared-rare-hyphenated-term | effect-size |
| eppp-v2-intervention-006 / eppp-v2-intervention-033 | intervention | 0.3404 | shared-acronym | CPT |
| eppp-v2-lifespan-014 / eppp-v2-lifespan-032 | lifespan | 0.3331 | shared-rare-hyphenated-term | bler-ros |
| eppp-v2-cognitive-affective-031 / eppp-v3-cognitive-affective-011 | cognitive-affective | 0.3296 | shared-rare-hyphenated-term | transfer-appropriate |
| eppp-b007-social-1 / eppp-v3-social-cultural-048 | social-cultural | 0.3164 | shared-rare-hyphenated-term | self-serv |
| eppp-b007-social-1 / eppp-b028-social-1 | social-cultural | 0.3144 | shared-rare-hyphenated-term | self-serv |
| eppp-v3-research-011 / eppp-v3-research-013 | research | 0.3132 | shared-acronym | ANOVA |
| eppp-v2-intervention-034 / eppp-v3-intervention-072 | intervention | 0.2937 | shared-acronym | SFBT |
| eppp-b016-research-2 / eppp-v3-research-030 | research | 0.2750 | shared-rare-hyphenated-term | meta-analysi |
| eppp-b018-assessment-2 / eppp-v3-assessment-057 | assessment | 0.2636 | shared-rare-hyphenated-term | true-score |
| eppp-b012-intervention-2 / eppp-b028-intervention-1 | intervention | 0.2374 | shared-rare-hyphenated-term | harm-reduction |
| eppp-b026-assessment-5 / eppp-v3-assessment-077 | assessment | 0.2355 | shared-rare-hyphenated-term | ninety-five |
| eppp-b004-lifespan-2 / eppp-b028-lifespan-2 | lifespan | 0.2342 | shared-rare-hyphenated-term | identity-statu |
| eppp-v2-assessment-017 / eppp-v2-assessment-054 | assessment | 0.2182 | shared-rare-hyphenated-term | norm-referenc |
| eppp-b002-research-2 / eppp-v2-research-031 | research | 0.2079 | shared-rare-hyphenated-term | effect-size |
| eppp-b001-assessment-1 / eppp-v2-assessment-006 | assessment | 0.2007 | shared-rare-hyphenated-term | inter-rater |
| eppp-b002-research-2 / eppp-v3-research-030 | research | 0.1980 | shared-rare-hyphenated-term | meta-analysi |
| eppp-b018-assessment-2 / eppp-v2-assessment-002 | assessment | 0.1880 | shared-rare-hyphenated-term | true-score |
| eppp-b025-social-2 / eppp-v3-social-cultural-002 | social-cultural | 0.1856 | shared-rare-hyphenated-term | stereotype-threat |
| eppp-b005-cognitive-1 / eppp-v3-cognitive-affective-039 | cognitive-affective | 0.1798 | shared-rare-hyphenated-term | self-determination |
| eppp-v2-biological-033 / eppp-v3-biological-046 | biological | 0.1514 | shared-rare-hyphenated-term | left-hemisphere |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
