# Prospective Study Protocol

Version: 0.1-draft  
Date: 2026-08-23  
Protocol state: pre-pilot; not frozen  
Data state: no NotebookLM study outputs collected

## 1. Working title

**Factual Fidelity of NotebookLM-Generated Psychoeducational Evaluation Reports: An AI-Led, Human-Audited Synthetic Benchmark**

## 2. Background and rationale

NotebookLM is a document-grounded generative AI workflow that presents source citations and is intended to answer from user-selected materials. Existing evaluations show that its performance varies by domain and task complexity. High performance on constrained retrieval or guideline questions does not establish reliable performance on long-form psychoeducational reports, which combine factual extraction, numerical transcription, attribution, longitudinal synthesis, interpretation of discrepant informants, and potentially consequential recommendations or classification language.

Related research has evaluated professional ratings of AI-written psychological reports and surveyed school psychologists' use of AI in report writing. A source-level, claim-by-claim evaluation of NotebookLM-generated psychoeducational reports was not identified during the initial literature scan. The proposed study addresses that gap with synthetic records whose facts, missing information, contradictions, and decision rules are explicitly known.

## 3. Objectives

### 3.1 Primary objective

Estimate the factual fidelity of NotebookLM-generated psychoeducational report drafts under a dated, reproducible, standard-prompt workflow using expert-validated synthetic student records.

### 3.2 Secondary objectives

1. Describe the frequency and severity of consequential errors and omissions.
2. Evaluate numerical, attributional, temporal, citation, and uncertainty-handling performance.
3. Evaluate output reproducibility across repeated clean runs.
4. Compare the standard prompt with a source-constrained guardrail prompt.
5. Explore whether performance varies with case complexity and source characteristics.
6. Prospectively document the contributions, errors, limitations, and human oversight required when an AI research agent assists with study design, implementation, analysis, and manuscript drafting.

## 4. Research questions

### RQ1: Source fidelity

What proportion of atomic factual or interpretive claims in NotebookLM-generated reports are fully supported, partially supported, unsupported, or contradicted by the synthetic source packet and truth ledger?

### RQ2: Consequential failures

What proportion of reports contain at least one major or critical factual error, interpretive overreach, or omission?

### RQ3: Error distribution

How do error rates differ across report sections and task demands, including extraction, cross-source synthesis, interpretation, eligibility simulation, and recommendations?

### RQ4: Citations

How often do NotebookLM citations point to evidence that supports the associated claim, and how often are factual claims left without adequate source support?

### RQ5: Abstention and uncertainty

When information is deliberately absent, ambiguous, or conflicting, does NotebookLM preserve that uncertainty or fill the gap with unsupported content?

### RQ6: Reproducibility

How stable are factual claims, errors, omissions, and simulated eligibility conclusions across repeated clean runs using identical source packets and prompts?

### RQ7: Prompt condition

Does a source-constrained guardrail prompt reduce unsupported or contradicted claims relative to a realistic standard prompt?

### RQ8: Embedded AI-process audit

What human interventions are required to convert AI-produced research materials into a protocol, dataset, analysis, and manuscript that the human investigator judges fit for scientific submission?

## 5. Prospective hypotheses

These hypotheses are provisional until the confirmatory registration is frozen.

- **H1:** Unsupported or contradicted claims will occur at a nonzero rate under the standard-prompt workflow.
- **H2:** The probability of an error will increase across the task hierarchy from direct extraction to cross-source synthesis to interpretation or simulated eligibility reasoning.
- **H3:** Reports generated with the guardrail prompt will have a lower unsupported-or-contradicted claim rate than reports generated with the standard prompt.
- **H4:** Presence of a citation will not guarantee that the cited passage fully supports the associated claim.
- **H5:** Cases containing deliberate missingness, temporal changes, or informant disagreement will show more uncertainty-handling failures than straightforward cases.

H1 is primarily an estimation question; inferential emphasis will be placed on the estimated rate and uncertainty interval rather than rejection of a zero-error null. H2-H5 will be tested only if retained in the frozen registration.

## 6. Study design

This is a controlled synthetic-case evaluation with repeated NotebookLM generations. The planned design has two stages:

### 6.1 Pilot stage

- Develop and validate a small, deliberately heterogeneous case set.
- Test source rendering, prompt execution, output capture, claim segmentation, codebook usability, rater burden, and analysis scripts.
- Revise the materials using pilot findings.
- Exclude pilot outputs from confirmatory performance estimates.

Initial working target: 6-8 pilot cases, two prompt conditions, and three clean repetitions per condition.

### 6.2 Confirmatory stage

- Freeze case-generation rules, prompts, outcomes, exclusions, sample size, and analysis scripts before collecting confirmatory outputs.
- Use new cases not exposed during prompt or codebook development.
- Generate reports in randomized order across cases, conditions, and repetitions.

The confirmatory case count will be selected before data collection using simulation-based precision planning. The planning target is a useful confidence interval around the standard-prompt claim-level error rate while accounting for claims nested within outputs and outputs nested within cases. A minimum of 24 confirmatory cases is proposed, subject to pilot-derived annotation burden and design-effect estimates. The final number must be approved and registered before confirmatory collection.

## 7. Units of analysis

- **Case:** one synthetic student evaluation scenario and its complete source packet.
- **Output:** one NotebookLM-generated report produced from one clean run for a specified case and prompt condition.
- **Atomic claim:** the smallest independently judgeable factual or interpretive assertion in an output.
- **Required element:** a truth-ledger item that the report is expected to include or qualify.
- **Citation link:** one association between an output claim and a NotebookLM source citation.

The case, not the individual claim, is the primary sampling unit. Statistical models and uncertainty estimates must account for nested observations.

## 8. Synthetic case corpus

### 8.1 Intended population of cases

Cases will simulate common school-age psychoeducational evaluations without representing real students. The corpus will vary:

- Grade and developmental level.
- Referral question.
- Academic and cognitive pattern.
- Attention, behavior, social-emotional, and adaptive information.
- Educational and intervention history.
- Language-learning and cultural context.
- Informant agreement and disagreement.
- Completeness of information.
- Numerical and temporal complexity.

### 8.2 Source-packet components

Each case will contain a realistic subset of:

- Referral statement.
- Record review and educational history.
- Developmental or family interview notes.
- Teacher interview or rating summary.
- Student interview summary when developmentally appropriate.
- Classroom observation notes.
- Intervention and progress-monitoring records.
- Attendance or grade summary.
- Fictional cognitive and academic score tables.
- Fictional behavior, adaptive, or executive-function score tables.
- Explicit study-defined eligibility rules when eligibility language is tested.

### 8.3 Exclusions and protections

- No real, pseudonymized, or deidentified student records.
- No secure test items, response protocols, copyrighted manual passages, or proprietary scoring algorithms.
- "Raw data" in this study means unpolished narrative notes, observations, records, and already-scored fictional tables—not actual item responses from protected instruments.
- Instrument names will be fictional or generic unless documented permission supports another approach.
- Simulated eligibility is a rule-following benchmark and not a substitute for a multidisciplinary real-world determination.

### 8.4 Case construction

Each case begins as a structured case object conforming to `schemas/case.schema.json`. Human-readable source documents are rendered from that object. A separate claim ledger records all facts, allowable interpretations, required qualifications, deliberate missingness, conflicts, and high-risk decision points.

The AI research agent may draft cases, but at least two qualified human reviewers should independently evaluate case coherence, realism, internal consistency, cultural and linguistic plausibility, score interpretation, and absence of unintended clues. Disagreements are adjudicated and logged. Reviewer number is provisional pending feasibility.

### 8.5 Deliberate challenge features

The confirmatory corpus should include prespecified examples of:

- Similar but nonidentical numbers.
- Multiple dates and changes over time.
- Parent-teacher disagreement.
- Strengths coexisting with weaknesses.
- Missing demographic, developmental, or intervention information.
- Statements that must remain attributed rather than generalized.
- Information in tables that is absent from surrounding prose.
- Distractor facts that should not drive conclusions.
- Rules for which evidence is and is not sufficient for a simulated conclusion.

Challenge density will be bounded so cases remain realistic rather than adversarial puzzles.

## 9. NotebookLM workflow

### 9.1 Platform definition

The study evaluates the user-facing NotebookLM workflow available on the collection dates. For every run, researchers will record the displayed product name, account tier, access date, region if relevant, visible model information, settings, source-selection state, and any platform changes.

The manuscript will not infer an undisclosed model snapshot. If exact model or retrieval configuration is unavailable, it will be reported as unavailable.

### 9.2 Isolation

- One synthetic student per notebook.
- No web research, discovered sources, Gemini chat context, or external-source features.
- Only study-provided sources selected.
- A clean notebook or equivalently validated isolated context for every output.
- No corrective follow-up prompts in the scored generation.
- Raw output preserved before any formatting or claim segmentation.

### 9.3 Prompt conditions

#### Standard prompt, draft v0.1

> Using only the selected sources, draft a complete psychoeducational evaluation report for this student. Organize it into Reason for Referral, Background and Educational History, Evaluation Procedures, Behavioral Observations, Assessment Results, Integrated Summary, Study-Defined Eligibility Conclusion, and Recommendations. Use clear professional language suitable for a school team and family.

#### Guardrail prompt, draft v0.1

> Using only the selected sources, draft a complete psychoeducational evaluation report for this student. Organize it into Reason for Referral, Background and Educational History, Evaluation Procedures, Behavioral Observations, Assessment Results, Integrated Summary, Study-Defined Eligibility Conclusion, and Recommendations. Do not add facts, causes, diagnoses, scores, or conclusions that are not supported by the selected sources. Preserve all numbers exactly. Keep parent, teacher, student, record, and examiner statements attributed to the correct source. When information is missing, conflicting, or insufficient, state that explicitly rather than resolving it by assumption. Apply only the study-defined eligibility rules provided in the sources. Link every recommendation to an identified need or strength. Provide source citations for factual and interpretive claims.

Prompt wording will be revised during the pilot and then frozen. Prompt development history will be retained.

### 9.4 Repetitions and order

Three clean repetitions per case-condition are proposed. Collection order will be randomized or counterbalanced. If multiple accounts are used, case-condition runs will be balanced across accounts and account will be retained as metadata. Repetitions are used to quantify workflow stability, not treated as independent cases.

### 9.5 Output capture

For each output, preserve:

- Exact prompt.
- Exact source bundle and cryptographic hashes.
- Raw generated text.
- Citation markers and cited passages when exportable.
- Date and collection order.
- Account code and product settings.
- Refusals, truncations, timeouts, or interface errors.
- Screenshots or exports necessary to audit citation behavior.

## 10. Outcomes

### 10.1 Primary outcome

**Unsupported-or-contradicted claim proportion under the standard prompt:** number of atomic claims coded unsupported or contradicted divided by all factual and interpretive atomic claims eligible for source-fidelity coding.

Correct general knowledge that is absent from the source packet is coded unsupported for the source-fidelity outcome, but its real-world truth status is separately noted where relevant.

### 10.2 Key secondary outcomes

- Fully supported and partially supported claim proportions.
- Reports containing at least one major or critical error.
- Required-element omission proportion.
- Reports containing at least one major or critical omission.
- Numerical exact-match accuracy.
- Attribution accuracy.
- Temporal accuracy.
- Citation entailment precision.
- Citation coverage of eligible claims.
- Correct acknowledgment of deliberately missing information.
- Correct representation of informant disagreement.
- Study-defined eligibility concordance.
- Recommendation-to-evidence linkage.
- Reproducibility of conclusions and errors across runs.
- Difference in fidelity outcomes between prompt conditions.

### 10.3 Embedded process outcomes

- Human intervention count by project stage and intervention type.
- Human review time.
- AI artifact disposition: accepted, minor revision, major revision, rejected, or deferred.
- AI-originated citation, methodological, coding, analysis, and interpretation errors detected.
- Protocol deviations attributable to AI limitations or human decisions.
- Manuscript sections requiring substantive human revision.

## 11. Annotation and adjudication

Outputs will be segmented into atomic claims without altering the original text. Trained human coders will compare each claim with the complete source packet and truth ledger using `CODEBOOK.md`.

- All pilot outputs will be independently double-coded.
- At least 25% of confirmatory outputs will be independently double-coded; the fraction will increase if reliability is inadequate.
- A qualified third reviewer will adjudicate disagreements affecting primary outcomes or major/critical severity.
- Coders will be masked to case hypotheses and output repetition. Prompt-condition masking will be attempted, but may be incomplete because guardrail outputs can contain identifiable citation or uncertainty patterns.
- AI-assisted preliminary segmentation or coding, if used, will be visibly labeled and will not replace human judgment.

Reliability will be reported with category-appropriate statistics and raw agreement. Krippendorff's alpha or another prespecified chance-corrected statistic will be selected before confirmatory registration. Rare-event prevalence will be considered when interpreting reliability coefficients.

## 12. Statistical analysis

The analysis is estimation-first.

### 12.1 Descriptive estimation

- Report claim-level and report-level outcome estimates with 95% uncertainty intervals.
- Report results overall, by error type, severity, report section, case complexity, and prompt condition.
- Display case-level distributions so a high volume of claims in a few cases cannot obscure heterogeneity.

### 12.2 Primary model

A mixed-effects logistic regression is provisionally planned for the binary unsupported-or-contradicted claim outcome. The model will include random intercepts for case and output. The standard-prompt marginal error probability will be estimated from the model. Cluster bootstrap estimates at the case level will be used as a sensitivity analysis.

### 12.3 Prompt comparison

If retained as confirmatory, prompt condition will be a fixed effect in the mixed model. The estimand will be the marginal risk difference and risk ratio for unsupported-or-contradicted claims, with confidence intervals. Statistical significance alone will not determine practical importance.

### 12.4 Severity and report-level analyses

Report-level major-or-critical failure will be analyzed using paired or mixed methods appropriate to the final design. Severity distributions will be reported rather than collapsed into a single unvalidated weighted score unless a weighting scheme is preregistered and justified.

### 12.5 Missing outputs

Refusals, truncations, and platform failures are outcomes, not silently excluded observations. The confirmatory registration will define whether each is included in the primary denominator and will include sensitivity analyses under alternative assumptions.

### 12.6 Multiplicity and exploration

One primary outcome and one primary standard-prompt estimand will be designated. Secondary comparisons will be labeled and multiplicity handling prespecified. All post-registration analyses not listed as confirmatory will be labeled exploratory.

## 13. Bias and validity considerations

- **Synthetic-case bias:** cases may be cleaner or more rule-bound than real evaluations.
- **Case-generator bias:** AI-generated cases may reflect the same stereotypes or stylistic regularities being evaluated.
- **Rater subjectivity:** interpretive support and severity require professional judgment.
- **Platform drift:** NotebookLM can change without a public version identifier.
- **Prompt sensitivity:** estimates apply to the tested prompts.
- **Interface dependence:** citation and source-selection behavior may differ by account or product configuration.
- **Construct separation:** unsupported claims, incorrect claims, omissions, poor recommendations, and legal or clinical errors are related but not interchangeable.
- **Ecological validity:** a raw AI draft is a safety benchmark; most practitioners would edit before use.
- **Jurisdictional limitation:** eligibility rules differ across jurisdictions and teams.

## 14. Ethics, privacy, and test security

The synthetic-output phase does not intentionally involve human participant data. A formal institutional determination will nevertheless be requested if required. Human expert review, coder participation, time tracking, surveys, or interviews may constitute human-subjects activity and must receive appropriate institutional review before collection.

Only synthetic, nonidentifiable materials will be uploaded to NotebookLM. The protocol does not authorize later upload of real student data. Any future external-validation study using real records would require a separate protocol, data-governance review, and institution-approved environment.

## 15. Open-science and reproducibility plan

Subject to institutional and publisher requirements, the project will release:

- Protocol and registrations.
- Synthetic case specifications and source packets.
- Truth ledgers with an appropriate release schedule that prevents contamination during collection.
- Frozen prompts.
- Raw NotebookLM outputs where platform terms permit.
- Annotation codebook and deidentified coder decisions.
- Analysis code, computational environment details, and tests.
- Decision, deviation, and AI-use logs.

The study will distinguish exact computational reproducibility from platform replication, because proprietary model behavior may change.

## 16. Dissemination and authorship

The AI research agent will be disclosed as a tool, not an author. Human authorship will reflect actual scientific contributions and responsibility. The final manuscript will follow the target journal's AI-use, authorship, data-sharing, and reporting policies.

## 17. Stop/go criteria before pilot

Pilot collection may begin only after:

1. Human approval of this protocol's scope.
2. Domain-expert approval of the construct map and exclusion of secure content.
3. Completion of the case and claim-ledger schemas.
4. Completion of the error codebook and rater training examples.
5. Confirmation of NotebookLM access and permitted data workflow.
6. Institutional determination regarding human reviewers and process-audit data.

