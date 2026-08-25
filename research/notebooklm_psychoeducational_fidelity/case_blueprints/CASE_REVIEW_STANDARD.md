# Synthetic Case Development and Review Standard

Version: 0.1-draft

## 1. Required characteristics

Every case must be:

- Entirely synthetic.
- Internally coherent except for explicitly labeled disagreement or missingness.
- Plausible for the stated age, grade, educational setting, and referral question.
- Sufficiently detailed for the requested report sections.
- Free of real identifiers, secure test content, copyrighted manual text, and proprietary scoring algorithms.
- Traceable from every source statement to a structured fact or intentional narrative element.
- Paired with a complete claim ledger before NotebookLM collection.

## 2. Score-table rules

- Use fictional instrument names or generic measure descriptions.
- State the synthetic score scale, center, dispersion, and interpretive bands in a source available to NotebookLM when those bands matter.
- Keep cross-score comparisons psychometrically plausible.
- Do not imply that a single score establishes a disability or diagnosis.
- Mark confidence intervals, validity cautions, or noncomparability when the case logic requires them.
- Confirm every number in the rendered source against the structured case object.

## 3. Narrative-source rules

- Distinguish direct observation from informant report.
- Give each informant a stable identity and role.
- Associate claims with dates or periods when temporal interpretation matters.
- Avoid stereotypes as shortcuts for referral, diagnosis, family participation, behavior, or educational access.
- Include strengths and contextual information without manufacturing a uniformly positive narrative.
- Write disagreements as plausible differences in setting, demand, opportunity, perspective, or time—not random contradictions.

## 4. Missingness rules

Deliberate missingness must be documented in the private ledger and must matter to a plausible conclusion. The source packet should not contain meta-language that tells NotebookLM it is being tested.

For each missing element, specify:

- What is absent.
- Why a careful report should notice or qualify the absence.
- Which conclusions remain permissible.
- Which conclusions become insufficiently supported.
- Severity if the model fills the gap by assumption.

## 5. Study-defined decision rules

Any eligibility or classification rule used in the benchmark must:

- Be included verbatim in the NotebookLM source packet.
- Be labeled as a study-defined simulation rather than legal or clinical advice.
- Specify required evidence, exclusionary or contextual considerations, and an insufficient-evidence outcome.
- Avoid claiming universal alignment with IDEA, DSM, or any state rule.
- Be reviewed by qualified school-psychology experts before use.

## 6. Independent review domains

Each reviewer evaluates:

1. Developmental and educational plausibility.
2. Referral-to-data coherence.
3. Numerical and psychometric plausibility.
4. Informant and temporal consistency.
5. Cultural and linguistic fairness.
6. Adequacy of strengths and contextual factors.
7. Validity of study-defined conclusions and prohibited inferences.
8. Completeness of the claim ledger.
9. Absence of PII and secure content.
10. Likely real-world report-writing relevance.

## 7. Approval rule, provisional

A case is approved only when:

- All deterministic validation checks pass.
- At least two qualified reviewers recommend approval or approval with resolved minor revisions.
- Every disagreement affecting the truth ledger is adjudicated.
- The final rendered sources are rechecked after revision.
- The case and source-bundle hashes are recorded.

This approval rule is provisional until reviewer availability is confirmed.

