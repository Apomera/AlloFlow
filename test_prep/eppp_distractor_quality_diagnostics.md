# EPPP distractor-quality diagnostics

Reviewed: 2026-07-16  
Analysis: eppp-distractor-diagnostics-v1  
Input SHA-256: `770e0b210fc4c1439073bbac80f1fef8a92a1a83ac26a5731241f065ba152412`

## Interpretation

Diagnostics identify candidates for human editorial review; they do not assert that an item is inaccurate or cause the generator to fail.

> Lexical and TF-IDF heuristics are triage aids, not psychometric calibration, item-response analysis, or independent expert validation.

The all/none-of-the-above prohibition remains a hard gate. The four diagnostic categories below are warnings and do not fail the release.

## Summary

| Metric | Result |
| --- | ---: |
| Items scanned | 1500 |
| Forbidden all/none aggregate choices | 0 |
| Unique key/stem lexical-leakage candidates | 166 |
| Asymmetric extreme-distractor candidates | 339 |
| Advanced direct-recall candidates | 23 |
| Semantic concept-duplicate pairs | 287 |
| Semantic concept-duplicate clusters | 128 |
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
| 6 | eppp-b017-biological-1 | Bank 3, item 73 | biological | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 7 | eppp-b020-social-1 | Bank 4, item 24 | social-cultural | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 8 | eppp-v3-professional-073 | Bank 15, item 93 | professional | unique-key/stem-lexical-leakage, asymmetric-extreme-distractors | Combined warning score places this item in the next bounded editorial-review docket. |
| 9 | eppp-v2-assessment-064 | Bank 8, item 89 | assessment | unique-key/stem-lexical-leakage, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 10 | eppp-v2-cognitive-affective-015 | Bank 6, item 65 | cognitive-affective | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 11 | eppp-b004-professional-2 | Bank 1, item 80 | professional | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 12 | eppp-v3-professional-055 | Bank 15, item 75 | professional | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 13 | eppp-b028-intervention-2 | Bank 5, item 95 | intervention | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 14 | eppp-v2-social-cultural-009 | Bank 7, item 24 | social-cultural | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 15 | eppp-b010-intervention-2 | Bank 2, item 72 | intervention | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 16 | eppp-v3-intervention-062 | Bank 14, item 72 | intervention | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 17 | eppp-v3-social-cultural-055 | Bank 12, item 70 | social-cultural | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 18 | eppp-v2-cognitive-affective-001 | Bank 6, item 51 | cognitive-affective | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 19 | eppp-v3-cognitive-affective-001 | Bank 11, item 51 | cognitive-affective | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |
| 20 | eppp-b020-intervention-2 | Bank 4, item 31 | intervention | asymmetric-extreme-distractors, semantic-concept-duplicate-candidate | Combined warning score places this item in the next bounded editorial-review docket. |

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
| eppp-v2-cognitive-affective-015 / eppp-v3-cognitive-affective-007 | cognitive-affective | 0.9593 | high-tfidf-similarity, shared-rare-hyphenated-term | dual-proces |
| eppp-v2-lifespan-011 / eppp-v3-lifespan-002 | lifespan | 0.9348 | high-tfidf-similarity | — |
| eppp-b015-social-1 / eppp-b027-social-2 | social-cultural | 0.9236 | high-tfidf-similarity, shared-rare-hyphenated-term | induced-compliance |
| eppp-v2-intervention-072 / eppp-v3-intervention-070 | intervention | 0.8967 | high-tfidf-similarity, shared-acronym, shared-rare-hyphenated-term | ERP, OCD, first-line |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-010 | lifespan | 0.8944 | high-tfidf-similarity | — |
| eppp-b004-professional-2 / eppp-v3-professional-055 | professional | 0.8887 | high-tfidf-similarity, shared-ethics-standard | standard 3.05 |
| eppp-v2-biological-028 / eppp-v3-biological-019 | biological | 0.8796 | high-tfidf-similarity, shared-acronym | EEG |
| eppp-v2-lifespan-021 / eppp-v2-lifespan-025 | lifespan | 0.8796 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-007 / eppp-v3-cognitive-affective-011 | cognitive-affective | 0.8748 | high-tfidf-similarity, shared-rare-hyphenated-term | transfer-appropriate |
| eppp-b007-cognitive-2 / eppp-b024-cognitive-2 | cognitive-affective | 0.8732 | high-tfidf-similarity, shared-rare-hyphenated-term | weapon-focu |
| eppp-v2-cognitive-affective-019 / eppp-v3-cognitive-affective-010 | cognitive-affective | 0.8725 | high-tfidf-similarity, shared-rare-hyphenated-term | yerkes-dodson |
| eppp-v3-assessment-002 / eppp-v3-assessment-061 | assessment | 0.8520 | high-tfidf-similarity | — |
| eppp-b013-intervention-2 / eppp-b026-intervention-2 | intervention | 0.8420 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-059 / eppp-v3-cognitive-affective-013 | cognitive-affective | 0.8312 | high-tfidf-similarity, shared-rare-hyphenated-term | cannon-bard |
| eppp-v2-professional-010 / eppp-v3-professional-011 | professional | 0.8305 | high-tfidf-similarity | — |
| eppp-v2-social-cultural-009 / eppp-v3-social-cultural-008 | social-cultural | 0.8253 | high-tfidf-similarity | — |
| eppp-v2-assessment-045 / eppp-v3-assessment-010 | assessment | 0.8213 | high-tfidf-similarity | — |
| eppp-b007-assessment-1 / eppp-b012-assessment-1 | assessment | 0.8203 | high-tfidf-similarity, shared-acronym | T- |
| eppp-b012-assessment-1 / eppp-b025-assessment-4 | assessment | 0.8203 | high-tfidf-similarity, shared-acronym | T- |
| eppp-v2-cognitive-affective-050 / eppp-v3-cognitive-affective-060 | cognitive-affective | 0.8196 | high-tfidf-similarity | — |
| eppp-b012-lifespan-1 / eppp-v3-lifespan-053 | lifespan | 0.8194 | high-tfidf-similarity | — |
| eppp-v3-biological-001 / eppp-v3-biological-034 | biological | 0.8167 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-003 | research | 0.8137 | high-tfidf-similarity | — |
| eppp-v2-intervention-066 / eppp-v3-intervention-003 | intervention | 0.8116 | high-tfidf-similarity | — |
| eppp-v3-lifespan-010 / eppp-v3-lifespan-051 | lifespan | 0.8035 | high-tfidf-similarity | — |
| eppp-v2-research-028 / eppp-v3-research-003 | research | 0.8019 | high-tfidf-similarity | — |
| eppp-b018-professional-1 / eppp-b027-professional-2 | professional | 0.7995 | high-tfidf-similarity | — |
| eppp-v2-research-029 / eppp-v3-research-009 | research | 0.7990 | high-tfidf-similarity | — |
| eppp-v3-research-016 / eppp-v3-research-022 | research | 0.7985 | high-tfidf-similarity | — |
| eppp-b010-intervention-2 / eppp-v3-intervention-062 | intervention | 0.7982 | high-tfidf-similarity | — |
| eppp-v2-assessment-063 / eppp-v3-assessment-013 | assessment | 0.7967 | high-tfidf-similarity, shared-acronym | WISC-V |
| eppp-v2-lifespan-035 / eppp-v3-lifespan-006 | lifespan | 0.7885 | high-tfidf-similarity | — |
| eppp-v2-assessment-022 / eppp-v3-assessment-061 | assessment | 0.7876 | high-tfidf-similarity | — |
| eppp-v2-social-cultural-043 / eppp-v3-social-cultural-004 | social-cultural | 0.7843 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v3-research-014 | research | 0.7837 | high-tfidf-similarity | — |
| eppp-v2-assessment-020 / eppp-v3-assessment-002 | assessment | 0.7819 | high-tfidf-similarity | — |
| eppp-v2-professional-023 / eppp-v3-professional-019 | professional | 0.7775 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-v2-research-028 | research | 0.7757 | high-tfidf-similarity | — |
| eppp-v2-lifespan-022 / eppp-v3-lifespan-051 | lifespan | 0.7735 | high-tfidf-similarity | — |
| eppp-pilot-research-1 / eppp-b005-research-2 | research | 0.7702 | high-tfidf-similarity | — |
| eppp-b025-intervention-4 / eppp-v3-intervention-020 | intervention | 0.7661 | high-tfidf-similarity | — |
| eppp-v2-biological-030 / eppp-v3-biological-011 | biological | 0.7590 | high-tfidf-similarity, shared-acronym | LTP |
| eppp-v2-lifespan-005 / eppp-v2-lifespan-054 | lifespan | 0.7566 | high-tfidf-similarity | — |
| eppp-v3-social-cultural-008 / eppp-v3-social-cultural-055 | social-cultural | 0.7526 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-016 / eppp-v3-cognitive-affective-009 | cognitive-affective | 0.7516 | high-tfidf-similarity | — |
| eppp-v2-cognitive-affective-009 / eppp-v3-cognitive-affective-008 | cognitive-affective | 0.7514 | high-tfidf-similarity, shared-rare-hyphenated-term | pre-exist |
| eppp-v2-professional-024 / eppp-v3-professional-003 | professional | 0.7513 | high-tfidf-similarity, shared-ethics-standard | standard 2.01 |

## Diagnostic criteria

- **Unique key/stem lexical leakage:** The key has at least one meaningful stem token absent from every distractor; overlap counts are retained to help editors distinguish direct category echoes from weaker lexical signals.
- **Asymmetric extreme distractors:** At least two distractors contain absolute or extreme cue words while the keyed option contains none.
- **Advanced direct recall:** An item labeled advanced uses a direct definition or complete-the-statement prompt pattern.
- **Semantic concept duplicates:** Same-domain pairs are queued by high TF-IDF similarity or by a sufficiently similar shared acronym, ethics-standard number, or rare hyphenated identifier.
