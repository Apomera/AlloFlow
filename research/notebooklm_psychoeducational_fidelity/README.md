# NotebookLM Psychoeducational Report Fidelity Study

Status: prospective protocol development; no study outputs have been collected.

## Working title

**Factual Fidelity of NotebookLM-Generated Psychoeducational Evaluation Reports: An AI-Led, Human-Audited Synthetic Benchmark**

## Purpose

This project evaluates how faithfully NotebookLM transforms synthetic psychoeducational source records into report text. It also prospectively documents the use of an AI research agent to help design, operationalize, analyze, and draft the study.

The primary scientific object is the NotebookLM report-generation workflow. The embedded AI-process audit is secondary and descriptive unless a separate comparison condition is later added.

## Governing principles

1. The human investigator remains responsible for every scientific and publication decision.
2. Study hypotheses, scoring rules, exclusions, and confirmatory analyses will be frozen before confirmatory NotebookLM outputs are examined.
3. Synthetic cases will be auditable against explicit truth ledgers and will contain no real student information or secure test items.
4. NotebookLM will not receive the gold-standard claim ledgers.
5. An AI system may assist with preliminary organization or coding, but it will not be the sole judge of another AI system's accuracy.
6. All visible prompts, outputs, scripts, data transformations, and human overrides will be logged to the extent permitted by the tools.
7. Findings will be stated as performance of a dated, specified workflow rather than as a permanent property of NotebookLM or RAG systems generally.

## Project structure

- `PROTOCOL.md` — prospective scientific protocol.
- `PREREGISTRATION.md` — registration-ready summary and frozen-analysis fields.
- `AI_GOVERNANCE.md` — permitted AI roles, human decision gates, and disclosure rules.
- `DECISION_LOG.md` — chronological record of substantive design decisions.
- `CODEBOOK.md` — claim, error, omission, citation, and severity definitions.
- `references/EVIDENCE_MAP.md` — starting evidence base and research gap.
- `schemas/` — machine-readable case and claim-ledger specifications.
- `data/templates/` — blank manifests for cases, outputs, claims, omissions, and human interventions.
- `analysis/README.md` — planned statistical and reproducibility workflow.
- `manuscript/MANUSCRIPT.md` — prospective manuscript shell.
- `provenance/` — observable AI-activity and protocol-deviation logs.

## Study stages

1. Protocol and governance drafting.
2. Domain-expert review of constructs and synthetic-case plans.
3. Pilot case generation and codebook calibration.
4. Confirmatory preregistration freeze.
5. Controlled NotebookLM output collection.
6. Blinded or partially blinded human claim annotation.
7. Preregistered analysis and sensitivity analyses.
8. AI-assisted manuscript drafting followed by full human verification.

## Current boundaries

- Reader preference or acceptability ratings are outside the primary study.
- Real or deidentified student records are outside the current protocol.
- Automated scoring of proprietary psychological test items is outside the current protocol.
- Eligibility conclusions, if tested, will use explicit study-defined rules and will not represent real-world eligibility determinations.

