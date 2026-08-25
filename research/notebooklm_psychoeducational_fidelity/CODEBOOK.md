# Output Annotation Codebook

Version: 0.1-draft  
Status: pre-pilot; examples and decision rules require domain-expert calibration

## 1. Purpose

This codebook separates source fidelity, real-world correctness, completeness, citation behavior, and professional consequence. These constructs must not be collapsed into a single informal "hallucination" judgment.

## 2. Annotation units

### 2.1 Atomic claim

An atomic claim is the smallest output span that asserts one independently judgeable proposition.

Split a sentence when different parts could receive different support labels.

Example:

> The student earned a standard score of 82 and therefore has a reading disability.

Segment as:

1. The student earned a standard score of 82.
2. The score establishes that the student has a reading disability.

Do not segment headings, transitions, generic cautions, or purely stylistic language unless they assert something about the case.

### 2.2 Required element

A required element is a fact, qualification, uncertainty, conflict, or conclusion listed in the gold-standard ledger as necessary for the relevant report section. Omissions are coded against required elements, not inferred from report length.

### 2.3 Citation link

A citation link pairs a claim with the source passage that NotebookLM presents as support. One claim may have zero, one, or multiple citations.

## 3. Claim eligibility

| Code | Label | Definition |
|---|---|---|
| ELIGIBLE | Source-fidelity claim | A factual, quantitative, attributed, temporal, interpretive, eligibility, or recommendation claim about the case. |
| NONCASE | General statement | General professional knowledge not presented as a case fact. Code separately for relevance and potential harm. |
| STYLE | Nonpropositional text | Heading, transition, formatting phrase, or other text with no independently judgeable proposition. |
| UNSCORABLE | Cannot be adjudicated | A source or ledger defect prevents a defensible judgment. Requires a reason and adjudication. |

## 4. Source-support labels

Each eligible claim receives exactly one primary support label.

### SUPPORTED

Every material component of the claim is entailed by the source packet and ledger. Accurate paraphrases and explicitly permitted inferences qualify.

### PARTIALLY_SUPPORTED

The central claim has support, but a material qualifier, scope, attribution, certainty level, comparison, or causal implication is unsupported or misstated.

Example pattern: a teacher reported a behavior, but the output generalizes it across all settings.

### UNSUPPORTED

The source packet neither supports nor directly contradicts the claim. This includes plausible or generally true information introduced without case evidence when the output presents it as applying to the student.

### CONTRADICTED

The claim conflicts with the source packet, ledger, or a deterministic calculation from them.

### CONFLICT_PRESERVED

The output accurately states that sources disagree or that the evidence is ambiguous. This is a supported claim and also receives this secondary flag.

## 5. Primary outcome mapping

Primary error numerator:

`UNSUPPORTED + CONTRADICTED`

Primary denominator:

All `ELIGIBLE` claims except claims formally adjudicated `UNSCORABLE`.

`PARTIALLY_SUPPORTED` is not included in the primary numerator but will be included in a prespecified sensitivity analysis.

The manuscript may use "unsupported-or-contradicted claim rate" for this outcome. It should not call every omission, stylistic defect, or weak recommendation a hallucination.

## 6. Claim task-demand classification

| Code | Task demand | Definition |
|---|---|---|
| EXTRACT | Direct extraction | Restates one explicit source fact. |
| NUMERIC | Numerical handling | Transcribes, compares, classifies, or calculates quantitative information. |
| ATTRIBUTE | Attribution | Identifies who reported, observed, or concluded something. |
| TEMPORAL | Temporal integration | Represents dates, sequence, change, duration, or current versus historical status. |
| SYNTHESIZE | Cross-source synthesis | Combines two or more sources without going beyond them. |
| INTERPRET | Interpretation | Draws a professional meaning from facts or patterns. |
| ELIGIBILITY | Study-defined eligibility | Applies explicit study-provided decision rules. |
| RECOMMEND | Recommendation | Proposes an action, support, accommodation, intervention, or monitoring step. |

Multiple secondary task-demand flags may be recorded, but one dominant task demand is required for modeling.

## 7. Error-type flags

An unsupported, contradicted, or partially supported claim may receive one or more error-type flags:

- `NUMBER_TRANSCRIPTION`
- `NUMBER_COMPARISON`
- `NUMBER_CALCULATION`
- `SCORE_CLASSIFICATION`
- `SOURCE_ATTRIBUTION`
- `TEMPORAL_SEQUENCE`
- `CURRENT_VS_HISTORICAL`
- `IDENTITY_OR_CASE_CONTAMINATION`
- `SCOPE_GENERALIZATION`
- `CERTAINTY_INFLATION`
- `CAUSAL_OVERREACH`
- `DIAGNOSTIC_OVERREACH`
- `ELIGIBILITY_RULE_ERROR`
- `CONFLICT_ERASURE`
- `MISSINGNESS_FILL_IN`
- `STRENGTH_OR_NEED_MISCHARACTERIZATION`
- `RECOMMENDATION_NOT_LINKED`
- `RECOMMENDATION_CONTRAINDICATED`
- `OTHER_SPECIFIED`

`OTHER_SPECIFIED` requires a text explanation.

## 8. Real-world truth and source fidelity

Source fidelity and external correctness are coded separately:

| External-truth code | Meaning |
|---|---|
| TRUE | Independently true or valid under the study rules. |
| FALSE | Independently false or invalid under the study rules. |
| DEBATABLE | Depends on professional judgment or contested assumptions. |
| NOT_CHECKED | External truth was not evaluated. |

A generally true statement can be `UNSUPPORTED` when it was not grounded in the provided sources. A source-supported statement can still be externally problematic if the synthetic source itself intentionally contains a reported belief or inaccurate historical claim; accurate attribution is therefore important.

## 9. Omission coding

Each required ledger element receives one code for each applicable output:

| Code | Meaning |
|---|---|
| PRESENT_ACCURATE | Included with the required meaning and qualification. |
| PRESENT_INCOMPLETE | Included but missing a material qualifier or component. |
| ABSENT | Not represented in the applicable report section or elsewhere appropriately. |
| NOT_APPLICABLE | Ledger rule indicates the element was not required for this output. |
| UNSCORABLE | Output or source defect prevents judgment. |

Omission type flags:

- `FACT`
- `STRENGTH`
- `NEED`
- `CONFLICT`
- `MISSINGNESS_OR_LIMITATION`
- `NUMERIC_RESULT`
- `VALIDITY_QUALIFICATION`
- `ELIGIBILITY_RULE`
- `RECOMMENDATION_LINK`

## 10. Citation coding

For each claim eligible for citation review:

| Code | Meaning |
|---|---|
| CITED_FULL | At least one cited passage fully supports the claim. |
| CITED_PARTIAL | Cited material supports only part of the claim or lacks a material qualifier. |
| CITED_NONE | Citation is present but does not support the claim. |
| CITED_WRONG_SOURCE | Evidence exists elsewhere, but the presented citation is incorrect. |
| UNCITED | No citation is presented for a claim expected to be cited. |
| CITATION_UNAVAILABLE | Interface or export prevents citation inspection. |

Citation entailment precision:

`CITED_FULL links / all inspectable citation links`

Citation coverage:

`eligible claims with at least one inspectable citation / claims expected to be cited`

## 11. Recommendation linkage

| Code | Meaning |
|---|---|
| DIRECTLY_LINKED | Recommendation is traceable to an identified case strength, need, or study rule. |
| PLAUSIBLE_GENERIC | Recommendation may be generally reasonable but is not specifically supported by the case. |
| UNSUPPORTED | Recommendation assumes an unestablished need, diagnosis, resource, or causal mechanism. |
| CONTRAINDICATED | Recommendation conflicts with case evidence or an explicit study rule. |
| NOT_A_RECOMMENDATION | Claim is not a recommendation. |

## 12. Severity

Severity reflects plausible consequence if the draft were trusted without correction. It does not measure how surprising or obvious the error is.

| Level | Label | Operational definition |
|---:|---|---|
| 0 | None | No error or omission. |
| 1 | Minor | Wording or detail error unlikely to change understanding, decisions, or services. |
| 2 | Moderate | Materially reduces accuracy or clarity but is unlikely by itself to change an eligibility or major service decision. |
| 3 | Major | Could plausibly change understanding of the student's profile, a high-stakes conclusion, intervention priority, accommodation, or service recommendation. |
| 4 | Critical | Could plausibly produce serious harm, a fundamentally incorrect simulated eligibility conclusion, identity contamination, or a dangerous or clearly inappropriate recommendation. |

All level 3 or 4 labels require independent review and adjudication. Raters judge plausible impact within the synthetic scenario, not legal liability.

## 13. Uncertainty-handling probes

For each ledger item deliberately marked missing, ambiguous, or conflicting, code:

- `PRESERVED_EXPLICITLY`
- `PRESERVED_IMPLICITLY`
- `IGNORED`
- `RESOLVED_WITH_SUPPORT`
- `RESOLVED_BY_ASSUMPTION`
- `MISREPRESENTED`

## 14. Report-level flags

Each output receives:

- Any unsupported or contradicted claim: yes/no.
- Any major or critical error: yes/no.
- Any major or critical omission: yes/no.
- Simulated eligibility conclusion correct: yes/no/not applicable/unscorable.
- Output complete: yes/partial/no.
- Refused: yes/no.
- Truncated: yes/no.
- Platform or citation capture failure: yes/no.

## 15. Rater workflow

1. Read the complete case ledger and source packet.
2. Inspect the untouched raw output.
3. Segment the output into atomic claims without paraphrasing it.
4. Mark claim eligibility.
5. Assign source-support and task-demand codes.
6. Add error-type, external-truth, recommendation, and severity codes where applicable.
7. Inspect and code citations.
8. Score every required ledger element for omission.
9. Complete report-level flags.
10. Record uncertainty and request adjudication rather than guessing.

## 16. Pilot calibration targets

Before confirmatory coding:

- Develop examples for every support category and severity level.
- Double-code all pilot outputs.
- Identify recurrent boundary disagreements.
- Revise rules without consulting confirmatory outputs.
- Set the reliability statistic and minimum acceptable value.
- Freeze the codebook and retain this draft for provenance.

