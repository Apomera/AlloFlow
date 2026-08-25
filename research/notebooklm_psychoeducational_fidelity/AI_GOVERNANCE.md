# AI Governance and Human Accountability Charter

Version: 0.1-draft  
Status: prospective; to be reviewed before pilot data collection

## 1. Governance model

The project uses an **AI-led, human-accountable** workflow. "AI-led" means that an AI research agent may produce first drafts and implement approved procedures. It does not mean that the AI is an investigator, author, accountable decision-maker, or independent validator.

The human investigator must understand, approve, and accept responsibility for the protocol, data, analyses, interpretations, citations, manuscript, and publication submission.

## 2. Permitted AI contributions

Subject to human review, the research agent may:

- Search and synthesize literature.
- Draft research questions, hypotheses, protocols, preregistrations, and manuscript text.
- Propose synthetic-case structures and generate auditable draft cases from approved specifications.
- Create data schemas, collection forms, scoring aids, analysis code, tests, tables, and figures.
- Perform deterministic data validation and preregistered statistical analyses.
- Generate preliminary claim segmentation or annotation suggestions.
- Maintain decision, activity, change, and provenance logs.
- Prepare revisions and responses to peer review.

## 3. Prohibited or nondelegable functions

The AI may not:

- Be listed as an author.
- Provide IRB approval, exempt-status determinations, institutional permission, consent, or legal advice.
- Certify that a synthetic case is professionally valid without qualified human review.
- Serve as the sole accuracy coder or final adjudicator of NotebookLM outputs.
- Fabricate, alter, suppress, or selectively omit observations or analyses.
- Change confirmatory outcomes or exclusions after outcome inspection without logging a protocol deviation.
- Represent unverified citations, calculations, quotations, or claims as checked.
- Submit a manuscript or make external representations without explicit human authorization.

## 4. Required human decision gates

The human investigator must explicitly approve the following before the project advances:

1. Final research questions and estimands.
2. Synthetic-case construct map and realism criteria.
3. Pilot protocol.
4. Confirmatory sample size and power or precision rationale.
5. Frozen prompts, source-packet rules, outcome definitions, and exclusions.
6. Rater training and reliability procedure.
7. Any protocol amendment after registration.
8. Final data lock.
9. Interpretation of findings.
10. Final manuscript and disclosure statement.

## 5. Independence safeguards

- The case truth ledger is stored separately from the files provided to NotebookLM.
- Confirmatory outcomes and models are specified before confirmatory output review.
- Human raters receive a condition-masked output identifier when feasible.
- Raters judge claims against source packets and ledgers, not against an AI-generated reference report.
- Any AI-assisted annotation is labeled as preliminary and is independently reviewed by a qualified human.
- Statistical scripts are tested against simulated fixtures with known expected results.
- Exploratory analyses are clearly separated from confirmatory analyses.

## 6. Prospective process audit

The embedded process audit will record observable project actions beginning with creation of this repository. It will not claim access to private model reasoning. Logged evidence may include:

- User instructions and visible AI responses.
- Files created or modified.
- Sources consulted.
- Code and commands executed.
- AI proposals accepted, modified, deferred, or rejected.
- Human intervention category and estimated time.
- Citation, methodological, coding, or writing errors found during review.
- Protocol deviations and corrective actions.

## 7. Publication disclosure

The manuscript will identify the AI product, displayed model or model family when available, provider, access dates, interaction mode, and substantive uses. If an exact model snapshot or system configuration is unavailable, that limitation will be stated.

Provisional disclosure:

> OpenAI Codex was used prospectively to assist with literature synthesis, protocol development, synthetic-data infrastructure, statistical programming, analysis documentation, and manuscript drafting. All scientific decisions were reviewed and approved by the human investigator. Qualified human reviewers validated the synthetic cases and final output classifications. The human author verified the data, analyses, citations, interpretations, and final manuscript and accepts responsibility for the work.

The disclosure will be revised to meet the policy of the target journal at submission.

## 8. Authorship

Authorship will be based on actual human contributions and accountability, not position or necessity. Human contributors who make substantial contributions and meet the target journal's authorship requirements will be considered for authorship. Other contributions will be acknowledged with permission.

