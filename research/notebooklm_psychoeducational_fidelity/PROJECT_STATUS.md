# Project Status

Checkpoint date: 2026-08-24  
Stage: pre-pilot design and first-case drafting  
NotebookLM outputs collected: 0

## Completed in the first build

- Isolated research-project directory.
- AI governance and human-accountability charter.
- Prospective protocol and preregistration draft.
- Scientific decision and protocol-deviation logs.
- Claim-level support, error, omission, citation, and severity codebook.
- Machine-readable case and gold-ledger schemas.
- Blank data-collection and human-intervention tables.
- Analysis and sample-size simulation plan.
- Initial evidence map and manuscript shell.
- Eight-case pilot matrix and synthetic-case review standard.
- First complete draft pilot case with seven source documents and 27 gold-ledger entries.
- Local structural validator.

## Validation state

The local validator confirms that required project files exist, JSON parses, CSV headers are unique, case source paths resolve, case and ledger IDs agree, ledger IDs are unique, and every ledger source locator refers to a declared source.

The validator is structural. It does not replace professional review of case realism, psychometrics, simulated eligibility logic, cultural fairness, or severity judgments.

## Proposed defaults awaiting human approval

1. Generate a standardized eight-section full report.
2. Compare standard and guardrail prompts.
3. Use three clean repetitions per case-condition.
4. Use 6-8 pilot cases and at least 24 confirmatory cases, with the final count selected by simulation.
5. Use jurisdiction-neutral, study-defined decision rules informed by federal principles but explicitly not presented as real eligibility rules.
6. Require two qualified case reviewers and independent double-coding of all pilot outputs.

## Immediate human contribution requested

Review `case_blueprints/pilot-01/` and identify any professional, psychometric, cultural, linguistic, or practical problems. The draft must not be run through NotebookLM until a qualified human approves the case and ledger.

## Next AI-led work after review

1. Revise Pilot 01 from expert feedback.
2. Build case-rendering and cryptographic-hash scripts.
3. Create pilot cases 02-08 and their ledgers.
4. Create rater training examples and a calibration set.
5. Implement sample-size simulation and frozen analysis scripts.
6. Prepare a registration-ready protocol package.

