# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `49a5ba11349c691cb405d5186b18ec7e63da616bc434d15f456a01c25080764b`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 141 |
| Asymmetric extreme-distractor candidates | 295 |
| Advanced direct-recall candidates | 18 |
| Semantic concept-duplicate pairs | 240 |
| Semantic concept-duplicate clusters | 120 |
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
| 6 | eppp-b012-professional-1 | Bank 3, item 7 | professional | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-v3-assessment-032 | Bank 13, item 62 | assessment | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-b024-professional-4 | Bank 5, item 16 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-b025-assessment-2 | Bank 5, item 25 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-pilot-assessment-1 | Bank 1, item 5 | assessment | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-v2-assessment-023 | Bank 8, item 48 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v2-cognitive-affective-014 | Bank 6, item 64 | cognitive-affective | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-v2-cognitive-affective-036 | Bank 6, item 86 | cognitive-affective | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v2-professional-054 | Bank 10, item 52 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-v2-professional-062 | Bank 10, item 60 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-v2-social-cultural-048 | Bank 7, item 63 | social-cultural | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v3-assessment-079 | Bank 14, item 9 | assessment | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-v3-professional-060 | Bank 15, item 80 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-v3-professional-070 | Bank 15, item 90 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-v2-assessment-058 | Bank 8, item 83 | assessment | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |

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
| eppp-v2-lifespan-011 / eppp-v3-lifespan-002 | lifespan | 0.9348 | high-tfidf-similarity | — |
| eppp-b015-social-1 / eppp-b027-social-2 | social-cultural | 0.9236 | high-tfidf-similarity, shared-rare-hyphenated-term | induced-compliance |
| eppp-v2-intervention-072 / eppp-v3-intervention-070 | intervention | 0.9011 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | ERP, OCD, first-line |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-010 | lifespan | 0.8923 | high-tfidf-similarity | — |
| eppp-v2-biological-028 / eppp-v3-biological-019 | biological | 0.8816 | high-tfidf-similarity, shared-acronym | EEG |
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8783 | high-tfidf-similarity | — |
| eppp-b007-cognitive-2 / eppp-b024-cognitive-2 | cognitive-affective | 0.8720 | high-tfidf-similarity, shared-rare-hyphenated-term | weapon-focu |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8707 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v3-assessment-002 / eppp-v3-assessment-061 | assessment | 0.8519 | high-tfidf-similarity | — |
| eppp-b013-intervention-2 / eppp-b026-intervention-2 | intervention | 0.8450 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-059 / eppp-v3-cognitive-affective-013 | cognitive-affective | 0.8349 | high-tfidf-similarity, shared-rare-hyphenated-term | cannon-bard |
| eppp-v2-professional-010 / eppp-v3-professional-011 | professional | 0.8317 | high-tfidf-similarity | — |
| eppp-v2-assessment-045 / eppp-v3-assessment-010 | assessment | 0.8261 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-050 / eppp-v3-cognitive-affective-060 | cognitive-affective | 0.8225 | high-tfidf-similarity | — |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8215 | high-tfidf-similarity | — |
| eppp-b007-assessment-1 / eppp-b012-assessment-1 | assessment | 0.8209 | high-tfidf-similarity, shared-acronym | T- |
| eppp-b012-assessment-1 / eppp-b025-assessment-4 | assessment | 0.8209 | high-tfidf-similarity, shared-acronym | T- |
| eppp-v3-biological-001 / eppp-v3-biological-034 | biological | 0.8163 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-003 | research | 0.8160 | high-tfidf-similarity | — |
| eppp-v2-intervention-066 / eppp-v3-intervention-003 | intervention | 0.8111 | high-tfidf-similarity | — |
| eppp-v3-lifespan-010 / eppp-v3-lifespan-051 | lifespan | 0.8080 | high-tfidf-similarity | — |
| eppp-v2-research-028 / eppp-v3-research-003 | research | 0.8079 | high-tfidf-similarity | — |
| eppp-v3-research-016 / eppp-v3-research-022 | research | 0.8009 | high-tfidf-similarity | — |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.7996 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.7969 | high-tfidf-similarity | — |
| eppp-v2-research-029 / eppp-v3-research-009 | research | 0.7966 | high-tfidf-similarity | — |
| eppp-v2-assessment-022 / eppp-v3-assessment-061 | assessment | 0.7869 | high-tfidf-similarity | — |
| eppp-v2-lifespan-035 / eppp-v3-lifespan-006 | lifespan | 0.7867 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-014 | research | 0.7840 | high-tfidf-similarity | — |
| eppp-v2-social-cultural-043 / eppp-v3-social-cultural-004 | social-cultural | 0.7828 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v2-research-028 | research | 0.7827 | high-tfidf-similarity | — |
| eppp-v2-assessment-020 / eppp-v3-assessment-002 | assessment | 0.7814 | high-tfidf-similarity | — |
| eppp-v2-professional-023 / eppp-v3-professional-019 | professional | 0.7811 | high-tfidf-similarity | — |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-051 | lifespan | 0.7781 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-b005-research-2 | research | 0.7739 | high-tfidf-similarity | — |
| eppp-b025-intervention-4 / eppp-v3-intervention-020 | intervention | 0.7710 | high-tfidf-similarity | — |
| eppp-v2-biological-030 / eppp-v3-biological-011 | biological | 0.7586 | high-tfidf-similarity, shared-acronym | LTP |
| eppp-v2-lifespan-005 / eppp-v2-lifespan-054 | lifespan | 0.7586 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-016 / eppp-v3-cognitive-affective-009 | cognitive-affective | 0.7538 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-009 / eppp-v3-cognitive-affective-008 | cognitive-affective | 0.7516 | high-tfidf-similarity, shared-rare-hyphenated-term | pre-exist |
| eppp-v2-professional-024 / eppp-v3-professional-003 | professional | 0.7509 | high-tfidf-similarity, shared-ethics-standard | standard 2.01 |
| eppp-v2-lifespan-001 / eppp-v3-lifespan-017 | lifespan | 0.7436 | high-tfidf-similarity | — |
| eppp-b019-professional-1 / eppp-v2-professional-051 | professional | 0.7426 | high-tfidf-similarity, shared-ethics-standard | standard 9.01 |
| eppp-v2-lifespan-014 / eppp-v3-lifespan-016 | lifespan | 0.7396 | high-tfidf-similarity, shared-rare-hyphenated-term | bler-ros |
| eppp-v2-assessment-008 / eppp-v3-assessment-001 | assessment | 0.7359 | high-tfidf-similarity | — |
| eppp-b005-professional-2 / eppp-b012-professional-1 | professional | 0.7357 | high-tfidf-similarity, shared-ethics-standard | standard 3.10 |
| eppp-b004-social-1 / eppp-b027-social-1 | social-cultural | 0.7353 | high-tfidf-similarity | — |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
