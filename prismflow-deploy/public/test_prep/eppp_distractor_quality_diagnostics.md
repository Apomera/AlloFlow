# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `8e66573d6bfc0f8545cd2c8b12616b30d747295657e321a242abe6c586280285`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 186 |
| Asymmetric extreme-distractor candidates | 384 |
| Advanced direct-recall candidates | 30 |
| Semantic concept-duplicate pairs | 333 |
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
| 4 | eppp-v3-professional-030 | Bank 15, item 50 | professional | semantic-concept-duplicate-candidate | A direct test-security definition is contrasted with categorically inappropriate actions instead of adjacent ethical distinctions. |
| 5 | eppp-v2-professional-030 | Bank 10, item 28 | professional | semantic-concept-duplicate-candidate | Extreme distractors make the key obvious, and the theoretical-orientation claim needs source-level adjudication. |
| 6 | eppp-v3-intervention-067 | Bank 14, item 77 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-v3-assessment-041 | Bank 13, item 71 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-v2-intervention-025 | Bank 9, item 23 | intervention | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, advanced-direct-recall | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-b014-assessment-2 | Bank 3, item 34 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-v2-intervention-020 | Bank 9, item 18 | intervention | asymmetric-extreme-distractors, advanced-direct-recall, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-v3-cognitive-affective-061 | Bank 12, item 11 | cognitive-affective | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v3-intervention-069 | Bank 14, item 79 | intervention | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-b019-intervention-2 | Bank 4, item 16 | intervention | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v3-cognitive-affective-059 | Bank 12, item 9 | cognitive-affective | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-b018-cognitive-2 | Bank 3, item 91 | cognitive-affective | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-b020-assessment-1 | Bank 4, item 27 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v3-assessment-062 | Bank 13, item 92 | assessment | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-b024-assessment-3 | Bank 5, item 8 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-b011-social-1 | Bank 2, item 81 | social-cultural | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-b016-professional-2 | Bank 3, item 72 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |

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
| 9 | eppp-v3-professional-030 | active-warning | semantic-concept-duplicate-candidate |
| 10 | eppp-v2-professional-030 | active-warning | semantic-concept-duplicate-candidate |

## Highest-similarity concept candidates

| Pair | Domain | Similarity | Basis | Shared identifiers |
| --- | --- | ---: | --- | --- |
| eppp-b007-assessment-1 / eppp-b025-assessment-4 | assessment | 1.0000 | high-tfidf-similarity, shared-acronym | T- |
| eppp-pilot-assessment-1 / eppp-b017-assessment-1 | assessment | 1.0000 | high-tfidf-similarity | — |
| eppp-v2-biological-003 / eppp-v3-biological-017 | biological | 1.0000 | high-tfidf-similarity, shared-acronym | B1 |
| eppp-v2-intervention-044 / eppp-v3-intervention-064 | intervention | 0.9599 | high-tfidf-similarity, shared-acronym | IPT |
| eppp-v2-cognitive-affective-015 / eppp-v3-cognitive-affective-007 | cognitive-affective | 0.9591 | high-tfidf-similarity, shared-rare-hyphenated-term | dual-proces |
| eppp-b015-professional-2 / eppp-b028-professional-2 | professional | 0.9489 | high-tfidf-similarity | — |
| eppp-v2-lifespan-011 / eppp-v3-lifespan-002 | lifespan | 0.9349 | high-tfidf-similarity | — |
| eppp-b015-social-1 / eppp-b027-social-2 | social-cultural | 0.9238 | high-tfidf-similarity, shared-rare-hyphenated-term | induced-compliance |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-010 | lifespan | 0.8951 | high-tfidf-similarity | — |
| eppp-v2-intervention-072 / eppp-v3-intervention-070 | intervention | 0.8930 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | ERP, OCD, first-line |
| eppp-b015-professional-1 / eppp-v3-professional-062 | professional | 0.8886 | high-tfidf-similarity | — |
| eppp-b004-professional-2 / eppp-v3-professional-055 | professional | 0.8856 | high-tfidf-similarity, shared-ethics-standard | standard 3.05 |
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8795 | high-tfidf-similarity | — |
| eppp-v2-biological-028 / eppp-v3-biological-019 | biological | 0.8793 | high-tfidf-similarity, shared-acronym | EEG |
| eppp-v2-cognitive-affective-007 / eppp-v3-cognitive-affective-011 | cognitive-affective | 0.8759 | high-tfidf-similarity, shared-rare-hyphenated-term | transfer-appropriate |
| eppp-b007-cognitive-2 / eppp-b024-cognitive-2 | cognitive-affective | 0.8740 | high-tfidf-similarity, shared-rare-hyphenated-term | weapon-focu |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8731 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-b023-professional-1 / eppp-v3-professional-062 | professional | 0.8729 | high-tfidf-similarity | — |
| eppp-v2-research-003 / eppp-v3-research-002 | research | 0.8710 | high-tfidf-similarity | — |
| eppp-v2-biological-008 / eppp-v3-biological-002 | biological | 0.8607 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | DMN, mind-wander, self-referential |
| eppp-v3-assessment-002 / eppp-v3-assessment-061 | assessment | 0.8507 | high-tfidf-similarity | — |
| eppp-b013-intervention-2 / eppp-b026-intervention-2 | intervention | 0.8411 | high-tfidf-similarity | — |
| eppp-v2-lifespan-015 / eppp-v3-lifespan-013 | lifespan | 0.8390 | high-tfidf-similarity, shared-acronym | ZPD |
| eppp-v2-professional-010 / eppp-v3-professional-011 | professional | 0.8317 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-046 / eppp-v3-cognitive-affective-061 | cognitive-affective | 0.8301 | high-tfidf-similarity | — |
| eppp-b026-social-2 / eppp-v3-social-cultural-050 | social-cultural | 0.8284 | high-tfidf-similarity, shared-rare-hyphenated-term | the-face |
| eppp-v2-cognitive-affective-059 / eppp-v3-cognitive-affective-013 | cognitive-affective | 0.8282 | high-tfidf-similarity, shared-rare-hyphenated-term | cannon-bard |
| eppp-v2-social-cultural-009 / eppp-v3-social-cultural-008 | social-cultural | 0.8262 | high-tfidf-similarity | — |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8201 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-050 / eppp-v3-cognitive-affective-060 | cognitive-affective | 0.8199 | high-tfidf-similarity | — |
| eppp-b007-assessment-1 / eppp-b012-assessment-1 | assessment | 0.8198 | high-tfidf-similarity, shared-acronym | T- |
| eppp-b012-assessment-1 / eppp-b025-assessment-4 | assessment | 0.8198 | high-tfidf-similarity, shared-acronym | T- |
| eppp-v2-assessment-045 / eppp-v3-assessment-010 | assessment | 0.8181 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-003 | research | 0.8131 | high-tfidf-similarity | — |
| eppp-v2-intervention-066 / eppp-v3-intervention-003 | intervention | 0.8123 | high-tfidf-similarity | — |
| eppp-v3-biological-001 / eppp-v3-biological-034 | biological | 0.8112 | high-tfidf-similarity | — |
| eppp-v3-lifespan-010 / eppp-v3-lifespan-051 | lifespan | 0.8048 | high-tfidf-similarity | — |
| eppp-v2-research-028 / eppp-v3-research-003 | research | 0.8038 | high-tfidf-similarity | — |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.7993 | high-tfidf-similarity | — |
| eppp-v3-research-016 / eppp-v3-research-022 | research | 0.7989 | high-tfidf-similarity | — |
| eppp-v2-research-029 / eppp-v3-research-009 | research | 0.7980 | high-tfidf-similarity | — |
| eppp-b010-intervention-2 / eppp-v3-intervention-062 | intervention | 0.7961 | high-tfidf-similarity | — |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.7933 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-v2-assessment-022 / eppp-v3-assessment-061 | assessment | 0.7880 | high-tfidf-similarity | — |
| eppp-v2-lifespan-035 / eppp-v3-lifespan-006 | lifespan | 0.7873 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-014 | research | 0.7852 | high-tfidf-similarity | — |
| eppp-v2-social-cultural-043 / eppp-v3-social-cultural-004 | social-cultural | 0.7840 | high-tfidf-similarity | — |
| eppp-v2-assessment-020 / eppp-v3-assessment-002 | assessment | 0.7817 | high-tfidf-similarity | — |
| eppp-v2-professional-023 / eppp-v3-professional-019 | professional | 0.7784 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v2-research-028 | research | 0.7760 | high-tfidf-similarity | — |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
