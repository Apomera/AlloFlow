# Calibration modernization and source-reference regressions

Calibration no longer calculates a historical50/50 blend or derives an expert score from veraPDF check counts. The evaluator calls the current repository's audit completeness predicates, headline/distribution functions, shared AccessibilityEvidence verification policy, and shared PDF validator/delivery policy. Fidelity observations remain explicit.

Added13 clearly labeled synthetic policy snapshots for mixed education documents: worksheets, readings, score tables, scans, forms, and figures. They cover complete/partial/unavailable audits, below-target results, numeric/OCR concerns, provisional rounds, and bound/failed/unavailable/unbound PDF validation.

The committed human corpus remains empty. Import requires actual artifact bytes matching the observation hash. Completed human findings additionally require the same reviewed artifact hash and explicit reviewer/time/notes/independence metadata. Missing review stays unreviewed. The importer does not authenticate reviewer identity; reports say this. It rejects synthetic promotion, mismatched artifacts, pending or validator-only review, duplicate IDs, and retired score flags. Dry-run performs validation without writing.

Reports separate synthetic expectations from declared human calibration. Human metrics include false-ready outcomes, unnecessary review, per-layer disagreements, and missed reviewed findings. Empty/unreviewed corpora have null human metrics. No live provider, human review, or usability validation was performed by this work.

Validation:39/39 focused calibration tests passed. Actual CLI reports are calibration-human-report.json (empty corpus, null human metrics) and calibration-synthetic-report.json (13synthetic cases, no expectation mismatches). Evidence: calibration-tests.json.

Added runtime tests for the root-owned remediation_review_helpers.js covering stable sidecar IDs, JSON roundtrip, valid header/format/alt changes, unsafe table/image changes, ambiguous duplicates, nested ownership, inventory bounds, parser/digest failures, and no source/DOM/model mutation. The helper itself was not edited by this agent. Evidence: review-helper-tests.json.
