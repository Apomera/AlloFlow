# Draft Preregistration

Status: incomplete pre-pilot draft; do not register until all `[TO FREEZE]` fields are resolved.

## Study title

Factual Fidelity of NotebookLM-Generated Psychoeducational Evaluation Reports: An AI-Led, Human-Audited Synthetic Benchmark

## Study type

Controlled repeated-generation evaluation using expert-validated synthetic cases.

## Primary research question

Under the frozen standard-prompt workflow, what proportion of factual and interpretive atomic claims in NotebookLM-generated psychoeducational report drafts are unsupported or contradicted by the study-provided sources and gold-standard claim ledger?

## Primary outcome

The number of atomic factual or interpretive claims coded `UNSUPPORTED` or `CONTRADICTED`, divided by the number of claims eligible for source-fidelity coding.

## Primary estimand

The marginal probability that an eligible claim is unsupported or contradicted under the standard-prompt workflow for the confirmatory synthetic-case population.

## Primary analysis

A mixed-effects logistic regression with random intercepts for case and output. The standard-prompt marginal probability and 95% confidence interval will be reported. A case-cluster bootstrap will be used as a sensitivity analysis.

## Secondary condition

Within each case, compare a standard report-generation prompt with a source-constrained guardrail prompt. Three clean repetitions per case-condition are proposed.

## Confirmatory hypotheses

- H1 is estimation-focused: unsupported or contradicted claims may occur under a source-grounded workflow, and their rate will be estimated with uncertainty.
- H2: error probability increases from direct extraction to synthesis to interpretation or simulated eligibility reasoning.
- H3: the guardrail prompt reduces the unsupported-or-contradicted claim probability relative to the standard prompt.
- H4: some cited claims are not fully entailed by their cited passages.
- H5: missingness, temporal complexity, and informant disagreement increase uncertainty-handling failures.

## Sampling plan

- Pilot cases: `[TO FREEZE; working target 6-8]`.
- Confirmatory cases: `[TO FREEZE; minimum proposed 24]`.
- Prompt conditions: `[TO FREEZE; currently 2]`.
- Repetitions: `[TO FREEZE; currently 3 per case-condition]`.
- Case-strata allocation: `[TO FREEZE]`.

Confirmatory sample size will be chosen before confirmatory collection using simulation-based precision planning that accounts for claims nested in outputs and outputs nested in cases. Pilot cases and outputs will not enter confirmatory performance estimates.

## Inclusion criteria for cases

1. Entirely synthetic and nonidentifiable.
2. Conforms to the frozen case schema.
3. Contains no secure test items or proprietary scoring algorithms.
4. Has a complete, independently reviewed truth ledger.
5. Meets prespecified realism and internal-consistency criteria.
6. Uses only permitted source content.

## Exclusion criteria for cases

1. Accidental inclusion of real or identifiable information.
2. Unresolved contradictions not designated as an intentional case feature.
3. Score or rule errors discovered before output collection.
4. Validator determination that the case is implausible or misleading.

Post-output discovery of a case defect will be handled through the frozen deviation rules rather than unlogged deletion.

## Output collection

- One student per isolated notebook.
- Study-provided sources only.
- No discovered sources, web research, or imported Gemini chat context.
- One scored prompt per clean run.
- Exact output and citations captured before transformation.
- Collection order randomized or counterbalanced.
- Product, account, date, settings, and visible model metadata recorded.

## Missing, refused, or truncated outputs

`[TO FREEZE: primary-denominator rule and sensitivity analyses]`

## Annotation

- Atomic claim segmentation under the frozen codebook.
- Human verification of all primary labels.
- All pilot reports double-coded.
- At least `[TO FREEZE; proposed 25%]` of confirmatory reports independently double-coded.
- Third-reviewer adjudication for primary disagreements and major/critical severity.
- AI preliminary coding, if used, retained as a separate field and never substituted for the final human code.

## Secondary outcomes

1. Supported and partially supported claim proportions.
2. Report-level major or critical error.
3. Required-element omissions and their severity.
4. Numerical, attributional, and temporal accuracy.
5. Citation entailment and citation coverage.
6. Missingness and disagreement handling.
7. Study-defined eligibility concordance.
8. Recommendation-to-evidence linkage.
9. Across-run reproducibility.
10. Embedded AI-process intervention and correction measures.

## Exclusions during analysis

`[TO FREEZE after pilot; must distinguish platform failure, nonclaim text, duplicate claims, and genuinely unscorable claims]`

## Multiplicity

`[TO FREEZE: one primary estimand; specify which secondary hypotheses receive confirmatory testing and the correction method, if any]`

## Robustness and sensitivity analyses

- Case-cluster bootstrap.
- Alternative handling of partially supported claims.
- Alternative handling of truncated or refused outputs.
- Analysis restricted to independently double-coded reports.
- Report-level aggregation to reduce claim-volume weighting.
- Exclusion of simulated eligibility sections to evaluate drafting-only performance.

## Exploratory analyses

Unless promoted and frozen before confirmatory collection, subgroup analyses by grade, referral question, source count, report length, case complexity, and error subtype will be exploratory.

## Embedded AI-process audit

The AI research agent's visible contributions will be prospectively logged. Human interventions will be recorded by stage, type, estimated minutes, disposition, and reason. This component is descriptive and will not support causal efficiency claims without a comparator.

## Data and code availability

Synthetic cases, ledgers, prompts, raw outputs, codebook, annotation data, analysis code, and provenance logs will be shared when legally and contractually permitted. Release timing may be delayed until confirmatory collection is complete to reduce benchmark contamination.

## Ethics

`[TO FREEZE following institutional determination, particularly for expert reviewers/coders and human time-tracking data]`

