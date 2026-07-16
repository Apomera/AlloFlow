# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `7bfb736b4e43c033451266dec98e4e621c790c9702b93bafb17d9acea549867e`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 206 |
| Asymmetric extreme-distractor candidates | 402 |
| Advanced direct-recall candidates | 34 |
| Semantic concept-duplicate pairs | 364 |
| Semantic concept-duplicate clusters | 140 |
| Audited anchors with active warnings | 5 |
| Audited anchors with no current warning | 5 |
| Priority docket | 20 |

## Priority docket

| Rank | Item | Location | Domain | Diagnostics | Editorial reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | eppp-v2-professional-040 | Bank 10, item 38 | professional | semantic-concept-duplicate-candidate | Three distractors contain stacked extreme modifiers, and fee splitting is repeated elsewhere in the bank. |
| 2 | eppp-b016-social-1 | Bank 3, item 61 | social-cultural | semantic-concept-duplicate-candidate | A direct definition is paired with all, only, and every cues in the distractors. |
| 3 | eppp-b022-assessment-1 | Bank 4, item 65 | assessment | semantic-concept-duplicate-candidate | The test name in the stem maps directly to the only option repeating personality, adult, and inventory. |
| 4 | eppp-v3-professional-030 | Bank 15, item 50 | professional | asymmetric-extreme-distractors | A direct test-security definition is contrasted with categorically inappropriate actions instead of adjacent ethical distinctions. |
| 5 | eppp-v2-professional-030 | Bank 10, item 28 | professional | semantic-concept-duplicate-candidate | Extreme distractors make the key obvious, and the theoretical-orientation claim needs source-level adjudication. |
| 6 | eppp-v3-intervention-066 | Bank 14, item 76 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-v3-intervention-002 | Bank 14, item 12 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-v2-professional-050 | Bank 10, item 48 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-v3-intervention-010 | Bank 14, item 20 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-v2-assessment-059 | Bank 8, item 84 | assessment | asymmetric-extreme-distractors, advanced-direct-recall, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-v2-professional-045 | Bank 10, item 43 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v2-cognitive-affective-031 | Bank 6, item 81 | cognitive-affective | unique-key/stem-lexical-leakage, advanced-direct-recall, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-b024-professional-1 | Bank 5, item 13 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v2-assessment-026 | Bank 8, item 51 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-v2-cognitive-affective-039 | Bank 6, item 89 | cognitive-affective | unique-key/stem-lexical-leakage, advanced-direct-recall, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-v3-intervention-067 | Bank 14, item 77 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v3-social-cultural-002 | Bank 12, item 17 | social-cultural | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-v2-intervention-006 | Bank 9, item 4 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-v2-social-cultural-047 | Bank 7, item 62 | social-cultural | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, advanced-direct-recall | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-v3-assessment-041 | Bank 13, item 71 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |

## Audited-anchor outcomes

| Audit rank | Item | Status | Current diagnostics |
| ---: | --- | --- | --- |
| 1 | eppp-b006-biological-2 | no-current-warning | -- |
| 2 | eppp-v3-assessment-051 | no-current-warning | -- |
| 3 | eppp-v2-professional-040 | active-warning | semantic-concept-duplicate-candidate |
| 4 | eppp-v2-assessment-005 | no-current-warning | -- |
| 5 | eppp-v3-intervention-018 | no-current-warning | -- |
| 6 | eppp-b016-social-1 | active-warning | semantic-concept-duplicate-candidate |
| 7 | eppp-b022-assessment-1 | active-warning | semantic-concept-duplicate-candidate |
| 8 | eppp-b023-intervention-3 | no-current-warning | -- |
| 9 | eppp-v3-professional-030 | active-warning | asymmetric-extreme-distractors |
| 10 | eppp-v2-professional-030 | active-warning | semantic-concept-duplicate-candidate |

## Highest-similarity concept candidates

| Pair | Domain | Similarity | Basis | Shared identifiers |
| --- | --- | ---: | --- | --- |
| eppp-b007-assessment-1 / eppp-b025-assessment-4 | assessment | 1.0000 | high-tfidf-similarity, shared-acronym | T- |
| eppp-pilot-assessment-1 / eppp-b017-assessment-1 | assessment | 1.0000 | high-tfidf-similarity | — |
| eppp-v2-biological-003 / eppp-v3-biological-017 | biological | 1.0000 | high-tfidf-similarity, shared-acronym | B1 |
| eppp-v2-cognitive-affective-015 / eppp-v3-cognitive-affective-007 | cognitive-affective | 0.9591 | high-tfidf-similarity, shared-rare-hyphenated-term | dual-proces |
| eppp-v2-intervention-044 / eppp-v3-intervention-064 | intervention | 0.9585 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-v3-intervention-002 / eppp-v3-intervention-066 | intervention | 0.9514 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-b015-professional-2 / eppp-b028-professional-2 | professional | 0.9488 | high-tfidf-similarity | — |
| eppp-v2-lifespan-011 / eppp-v3-lifespan-002 | lifespan | 0.9354 | high-tfidf-similarity | — |
| eppp-b015-social-1 / eppp-b027-social-2 | social-cultural | 0.9232 | high-tfidf-similarity, shared-rare-hyphenated-term | induced-compliance |
| eppp-v3-intervention-064 / eppp-v3-intervention-066 | intervention | 0.9084 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-v2-cognitive-affective-031 / eppp-v3-cognitive-affective-011 | cognitive-affective | 0.9043 | high-tfidf-similarity, shared-rare-hyphenated-term | transfer-appropriate |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-010 | lifespan | 0.8962 | high-tfidf-similarity | — |
| eppp-v2-intervention-072 / eppp-v3-intervention-070 | intervention | 0.8916 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | ERP, OCD, first-line |
| eppp-b015-professional-1 / eppp-v3-professional-062 | professional | 0.8882 | high-tfidf-similarity | — |
| eppp-b004-professional-2 / eppp-v3-professional-055 | professional | 0.8842 | high-tfidf-similarity, shared-ethics-standard | standard 3.05 |
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8802 | high-tfidf-similarity | — |
| eppp-v2-biological-028 / eppp-v3-biological-019 | biological | 0.8800 | high-tfidf-similarity, shared-acronym | EEG |
| eppp-v2-cognitive-affective-007 / eppp-v3-cognitive-affective-011 | cognitive-affective | 0.8786 | high-tfidf-similarity, shared-rare-hyphenated-term | transfer-appropriate |
| eppp-b007-cognitive-2 / eppp-b024-cognitive-2 | cognitive-affective | 0.8749 | high-tfidf-similarity, shared-rare-hyphenated-term | weapon-focu |
| eppp-b023-professional-1 / eppp-v3-professional-062 | professional | 0.8737 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8734 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v2-intervention-044 / eppp-v3-intervention-066 | intervention | 0.8707 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-v2-research-003 / eppp-v3-research-002 | research | 0.8696 | high-tfidf-similarity | — |
| eppp-v3-intervention-002 / eppp-v3-intervention-064 | intervention | 0.8642 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-v2-biological-008 / eppp-v3-biological-002 | biological | 0.8609 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | DMN, mind-wander, self-referential |
| eppp-v3-assessment-002 / eppp-v3-assessment-061 | assessment | 0.8516 | high-tfidf-similarity | — |
| eppp-b020-professional-4 / eppp-b024-professional-1 | professional | 0.8452 | high-tfidf-similarity | — |
| eppp-b013-intervention-2 / eppp-b026-intervention-2 | intervention | 0.8416 | high-tfidf-similarity | — |
| eppp-v2-lifespan-015 / eppp-v3-lifespan-013 | lifespan | 0.8376 | high-tfidf-similarity, shared-acronym | ZPD |
| eppp-v2-professional-010 / eppp-v3-professional-011 | professional | 0.8291 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-046 / eppp-v3-cognitive-affective-061 | cognitive-affective | 0.8289 | high-tfidf-similarity | — |
| eppp-v2-intervention-044 / eppp-v3-intervention-002 | intervention | 0.8284 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-v2-cognitive-affective-059 / eppp-v3-cognitive-affective-013 | cognitive-affective | 0.8262 | high-tfidf-similarity, shared-rare-hyphenated-term | cannon-bard |
| eppp-b026-social-2 / eppp-v3-social-cultural-050 | social-cultural | 0.8259 | high-tfidf-similarity, shared-rare-hyphenated-term | the-face |
| eppp-v2-social-cultural-009 / eppp-v3-social-cultural-008 | social-cultural | 0.8251 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-007 / eppp-v2-cognitive-affective-039 | cognitive-affective | 0.8249 | high-tfidf-similarity, shared-rare-hyphenated-term | transfer-appropriate |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8205 | high-tfidf-similarity | — |
| eppp-b007-assessment-1 / eppp-b012-assessment-1 | assessment | 0.8202 | high-tfidf-similarity, shared-acronym | T- |
| eppp-b012-assessment-1 / eppp-b025-assessment-4 | assessment | 0.8202 | high-tfidf-similarity, shared-acronym | T- |
| eppp-v2-cognitive-affective-050 / eppp-v3-cognitive-affective-060 | cognitive-affective | 0.8200 | high-tfidf-similarity | — |
| eppp-v2-assessment-045 / eppp-v3-assessment-010 | assessment | 0.8199 | high-tfidf-similarity | — |
| eppp-v2-intervention-066 / eppp-v3-intervention-003 | intervention | 0.8118 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-003 | research | 0.8112 | high-tfidf-similarity | — |
| eppp-v3-biological-001 / eppp-v3-biological-034 | biological | 0.8108 | high-tfidf-similarity | — |
| eppp-v3-lifespan-010 / eppp-v3-lifespan-051 | lifespan | 0.8063 | high-tfidf-similarity | — |
| eppp-v2-professional-050 / eppp-v3-professional-001 | professional | 0.8058 | high-tfidf-similarity, shared-ethics-standard | standard 3.04 |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.8026 | high-tfidf-similarity | — |
| eppp-v2-research-028 / eppp-v3-research-003 | research | 0.8006 | high-tfidf-similarity | — |
| eppp-v3-research-016 / eppp-v3-research-022 | research | 0.7977 | high-tfidf-similarity | — |
| eppp-v2-research-029 / eppp-v3-research-009 | research | 0.7976 | high-tfidf-similarity | — |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
