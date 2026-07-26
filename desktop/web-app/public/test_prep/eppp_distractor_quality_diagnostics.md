# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `03586ff75bd15266c2b8d959c09f2499e06755cebe9a0a26d9f0da4a1fd6df86`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 65 |
| Asymmetric extreme-distractor candidates | 130 |
| Advanced direct-recall candidates | 7 |
| Semantic concept-duplicate pairs | 114 |
| Semantic concept-duplicate clusters | 58 |
| Audited anchors with active warnings | 2 |
| Audited anchors with no current warning | 8 |
| Priority docket | 20 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | eppp-v2-professional-040 | Bank 10, item 38 | professional | semantic-concept-duplicate-candidate | Three distractors contain stacked extreme modifiers, and fee splitting is repeated elsewhere in the bank. |
| 2 | eppp-v2-professional-030 | Bank 10, item 28 | professional | semantic-concept-duplicate-candidate | Extreme distractors make the key obvious, and the theoretical-orientation claim needs source-level adjudication. |
| 3 | eppp-b009-biological-1 | Bank 2, item 45 | biological | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 4 | eppp-b009-social-2 | Bank 2, item 50 | social-cultural | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 5 | eppp-b010-social-1 | Bank 2, item 65 | social-cultural | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 6 | eppp-b012-biological-1 | Bank 2, item 93 | biological | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-b012-biological-2 | Bank 2, item 94 | biological | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-b012-cognitive-1 | Bank 2, item 95 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-b012-intervention-1 | Bank 3, item 3 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-b014-intervention-1 | Bank 3, item 35 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-b016-lifespan-1 | Bank 3, item 63 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-b017-lifespan-1 | Bank 3, item 77 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-b017-lifespan-2 | Bank 3, item 78 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-b019-intervention-1 | Bank 4, item 15 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-b019-intervention-3 | Bank 4, item 17 | intervention | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-b019-lifespan-2 | Bank 4, item 11 | lifespan | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-b020-cognitive-1 | Bank 4, item 22 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-b021-assessment-3 | Bank 4, item 47 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-b021-assessment-4 | Bank 4, item 48 | assessment | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-b021-cognitive-1 | Bank 4, item 38 | cognitive-affective | asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |

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
| eppp-b007-assessment-1 / eppp-b025-assessment-4 | assessment | 1.0000 | high-tfidf-similarity, shared-acronym | T- |
| eppp-v2-biological-003 / eppp-v3-biological-017 | biological | 1.0000 | high-tfidf-similarity, shared-acronym | B1 |
| eppp-v2-lifespan-011 / eppp-v3-lifespan-002 | lifespan | 0.9317 | high-tfidf-similarity | — |
| eppp-b015-social-1 / eppp-b027-social-2 | social-cultural | 0.9235 | high-tfidf-similarity, shared-rare-hyphenated-term | induced-compliance |
| eppp-v2-intervention-072 / eppp-v3-intervention-070 | intervention | 0.9051 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | ERP, OCD, first-line |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-010 | lifespan | 0.8882 | high-tfidf-similarity | — |
| eppp-v2-biological-028 / eppp-v3-biological-019 | biological | 0.8780 | high-tfidf-similarity, shared-acronym | EEG |
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8756 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8585 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v3-assessment-002 / eppp-v3-assessment-061 | assessment | 0.8514 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-059 / eppp-v3-cognitive-affective-013 | cognitive-affective | 0.8456 | high-tfidf-similarity, shared-rare-hyphenated-term | cannon-bard |
| eppp-b007-assessment-1 / eppp-b012-assessment-1 | assessment | 0.8330 | high-tfidf-similarity, shared-acronym | T- |
| eppp-b012-assessment-1 / eppp-b025-assessment-4 | assessment | 0.8330 | high-tfidf-similarity, shared-acronym | T- |
| eppp-v2-assessment-045 / eppp-v3-assessment-010 | assessment | 0.8283 | high-tfidf-similarity | — |
| eppp-v3-biological-001 / eppp-v3-biological-034 | biological | 0.8163 | high-tfidf-similarity | — |
| eppp-v2-intervention-066 / eppp-v3-intervention-003 | intervention | 0.8157 | high-tfidf-similarity | — |
| eppp-v3-lifespan-010 / eppp-v3-lifespan-051 | lifespan | 0.8105 | high-tfidf-similarity | — |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8098 | high-tfidf-similarity | — |
| eppp-v2-research-028 / eppp-v3-research-003 | research | 0.8081 | high-tfidf-similarity | — |
| eppp-v3-research-016 / eppp-v3-research-022 | research | 0.8027 | high-tfidf-similarity | — |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.8006 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.7995 | high-tfidf-similarity | — |
| eppp-v2-assessment-022 / eppp-v3-assessment-061 | assessment | 0.7934 | high-tfidf-similarity | — |
| eppp-v2-assessment-020 / eppp-v3-assessment-002 | assessment | 0.7897 | high-tfidf-similarity | — |
| eppp-v2-social-cultural-043 / eppp-v3-social-cultural-004 | social-cultural | 0.7870 | high-tfidf-similarity | — |
| eppp-v2-lifespan-035 / eppp-v3-lifespan-006 | lifespan | 0.7867 | high-tfidf-similarity | — |
| eppp-v2-professional-023 / eppp-v3-professional-019 | professional | 0.7815 | high-tfidf-similarity | — |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-051 | lifespan | 0.7794 | high-tfidf-similarity | — |
| eppp-v2-biological-030 / eppp-v3-biological-011 | biological | 0.7612 | high-tfidf-similarity, shared-acronym | LTP |
| eppp-v2-cognitive-affective-009 / eppp-v3-cognitive-affective-008 | cognitive-affective | 0.7550 | high-tfidf-similarity, shared-rare-hyphenated-term | pre-exist |
| eppp-v2-cognitive-affective-016 / eppp-v3-cognitive-affective-009 | cognitive-affective | 0.7548 | high-tfidf-similarity | — |
| eppp-v2-lifespan-001 / eppp-v3-lifespan-017 | lifespan | 0.7502 | high-tfidf-similarity | — |
| eppp-v2-lifespan-014 / eppp-v3-lifespan-016 | lifespan | 0.7399 | high-tfidf-similarity, shared-rare-hyphenated-term | bler-ros |
| eppp-v2-assessment-020 / eppp-v3-assessment-061 | assessment | 0.7384 | high-tfidf-similarity | — |
| eppp-v2-assessment-008 / eppp-v3-assessment-001 | assessment | 0.7359 | high-tfidf-similarity | — |
| eppp-v2-assessment-010 / eppp-v2-assessment-046 | assessment | 0.7322 | high-tfidf-similarity, shared-acronym | TAT |
| eppp-b004-social-1 / eppp-b027-social-1 | social-cultural | 0.7284 | high-tfidf-similarity | — |
| eppp-b024-professional-2 / eppp-v2-professional-079 | professional | 0.7279 | high-tfidf-similarity, shared-rare-hyphenated-term | record-keep |
| eppp-v2-lifespan-011 / eppp-v3-lifespan-049 | lifespan | 0.7216 | high-tfidf-similarity | — |
| eppp-v3-lifespan-003 / eppp-v3-lifespan-009 | lifespan | 0.7214 | high-tfidf-similarity | — |
| eppp-b022-social-1 / eppp-v3-social-cultural-052 | social-cultural | 0.7204 | high-tfidf-similarity | — |
| eppp-b005-cognitive-1 / eppp-v3-cognitive-affective-039 | cognitive-affective | 0.7162 | shared-rare-hyphenated-term | self-determination |
| eppp-b011-research-2 / eppp-v2-research-032 | research | 0.7145 | shared-rare-hyphenated-term | within-subject |
| eppp-v3-cognitive-affective-041 / eppp-v3-cognitive-affective-052 | cognitive-affective | 0.7082 | shared-rare-hyphenated-term | post-event |
| eppp-v2-biological-003 / eppp-v2-biological-005 | biological | 0.6998 | shared-acronym | B1 |
| eppp-v2-biological-005 / eppp-v3-biological-017 | biological | 0.6998 | shared-acronym | B1 |
| eppp-b022-assessment-4 / eppp-v3-assessment-013 | assessment | 0.6981 | shared-acronym | WISC-V |
| eppp-b014-professional-2 / eppp-v3-professional-010 | professional | 0.6961 | shared-ethics-standard | standard 6.05 |
| eppp-b021-assessment-1 / eppp-b024-assessment-4 | assessment | 0.6921 | shared-acronym | II |
| eppp-v2-assessment-010 / eppp-v2-assessment-012 | assessment | 0.6662 | shared-acronym | TAT |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
