# AlloFlow MCP refinement study protocol (v1)

Status: prospective protocol scaffold, frozen before any effectiveness-eligible run.

This study asks one narrow question: **does AlloFlow's canonical evidence-gated
refinement loop improve accessibility outcomes over the same canonical primary
remediation pass without auto-continuation?** It does not test whether MCP as a
wire protocol causes better content. MCP is the control surface through which the
same engine is operated.

## Evidence classes

Every run must be assigned exactly one evidence class before execution:

1. `infrastructure_only`: scripted/synthetic model, self-test, dry run, or missing
   blinded expert review. It can establish that the pipeline and measurement
   harness work, but not remediation effectiveness.
2. `development_descriptive`: live model on a document previously used to build or
   tune AlloFlow. It can estimate cost, variance, failure modes, and likely effect,
   but it is not confirmatory evidence.
3. `prospective_confirmatory`: live model on a prospectively frozen, pipeline-held-
   out document, with locked blinded specialist adjudication and all integrity
   checks passing.

Automated axe, Equal Access, veraPDF, score, and artifact-binding results are
surrogate outcomes. They never become expert-confirmed outcomes merely because
several engines agree.

## Frozen conditions

- `primary-one-shot`: the canonical primary remediation pass with
  `autoContinue=false`. This includes deterministic safeguards and is not a
  model-free baseline.
- `gated-loop`: the same primary pass followed by the production canonical loop
  with `autoContinue=true`, at most three rounds, including accept/revert,
  keep-best, verification binding, and plateau control.
- `deterministic-only` and `ungated-loop`: declared future ablations. They are
  blocked unless separately hashed adapters implement them. The study runner must
  never weaken the production controller to manufacture an ablation.

Shared settings must match exactly between paired conditions. The runner records
source, driver, loaded module, vendor, options, model, endpoint, output, evidence,
and protocol hashes. A primary/fallback model substitution is an engine change and
must be visible in the result, not silently pooled.

The current local MCP transport sends no Gemini `generationConfig`: temperature,
top-p, top-k, and seed are provider defaults even where a pipeline call site asks
for temperature zero. Version 1 therefore records `temperatureControlled=false`
and `seedControlled=false`, uses three nested stochastic repetitions, and makes no
claim of deterministic model scoring.

The driver also logs fallback use but does not yet return a complete per-call actual-model trace
(`actualModelTraceComplete=false`). Until such tracing exists, an effectiveness-eligible run must
configure `ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL` equal to `ALLOFLOW_MCP_GEMINI_MODEL`. A run with
different primary/fallback models remains valid engineering or descriptive evidence, but it is
excluded from confirmatory effectiveness analysis because its actual model identity is ambiguous.

## Development calibration pilot

The six pinned documents in `development-pilot.json` cover narrative, Spanish,
deep hierarchy, table, figure/redaction, and multi-column cases (107 pages total).
All six—and all 16 documents in the current corpus—are `development_exposed`.
They appeared in the 1,068-page round-10 sweep and/or other remediation rounds.

The pilot is 6 documents x 2 conditions x 3 repetitions = 36 planned runs. It is
for debugging randomization, artifact binding, reviewer packets, scoring, runtime,
and variance. Its effect estimates must be labeled descriptive.

No provider call is authorized by merely creating a plan. Live execution requires
the runner's explicit execution confirmation and run cap. A scripted loopback run
may be used to validate orchestration, but is always `infrastructure_only`.

## Prospective confirmatory corpus

After protocol, code, prompt, and engine hashes are frozen, an independent curator
will acquire 12 new, public or clearly licensed PDFs: three in each stratum below.
Three or four should be Spanish-language documents, cross-stratified rather than a
separate convenience sample.

1. Narrative/deep hierarchy
2. Multi-column/reading order
3. Table-heavy
4. Figure or scan

Four additional interactive-form or signed/legal-record cases are analyzed only
for correct refusal/escalation unless every condition validly supports them.

Eligibility is decided without condition output: stable PDF; hash verified; 1–75
pages for the primary analysis; no confidential or personal data; supported
reviewer language; rights cleared or an approved URL+hash-only local-use posture;
at least one expert-confirmed remediable issue; no exact or near duplicate; and no
prior exposure in repository history, issues, prompts, plans, or run artifacts.
Encrypted/corrupt, active-content-hazard, signed/legal, and interactive-form files
are excluded from the primary analysis. Documents over 75 pages form a separate
stress cohort. All variants in a document family remain in one partition.

“Held out” means held out from this pipeline's development. It does not assert
that a foundation model never encountered a publicly available document.

## Allocation and blinding

- Generate a fresh 256-bit allocation seed after the candidate pool is locked.
- Commit only `SHA256(seed)` and the specified algorithm before execution.
- Rank condition order per document and replicate by
  `SHA256(seed || document_id || replicate_id || condition_id)`.
- Store the seed and condition map outside the reviewer workspace.
- Copy source and candidate artifacts into a reviewer packet under opaque random
  IDs unrelated to filenames, paths, order, or conditions.
- Independently randomize artifact order for each reviewer.
- Withhold conditions, automated scores, MCP transcript, loop decisions, model
  usage, latency, and cost until ratings and adjudication are locked.

Each run executes in a workspace containing only the assigned input, frozen engine
files, and condition tooling. Existing AlloFlow plans, outputs, verification
reports, and round notes are prohibited because they leak prior answers.

## Human outcomes

Two PDF-accessibility specialists independently review each source and candidate;
a third specialist resolves disagreements. Reviewers record item-level judgments
before seeing automated evidence.

Primary artifact outcome:

`safe_material_resolution_rate = resolved baseline material issues / baseline material issues`

If a candidate introduces any material accessibility, content-fidelity, privacy,
security, or functional defect, its primary outcome is zero. “Material” and issue
severity are fixed in the reviewer manual before calibration.

Secondary expert outcomes include introduced-defect count, reading-order error,
tag/tree correctness, table semantics, alternative-text appropriateness, form
behavior where eligible, correction time, and reviewer confidence. Screen-reader
user task success is a separate user study, not inferred from specialist review.

Secondary automated outcomes include exact-artifact binding, verification state,
axe and Equal Access findings, rule-level veraPDF result, text recall, table
structure, delivery refusal, accepted/reverted/plateau rounds, elapsed time, model
calls, retries, tokens where available, and estimated cost.

## Analysis

The document is the independent unit. Repetitions are first aggregated within the
source-document hash; checklist items, pages, validator rules, and model calls are
not independent samples. The primary contrast is paired `gated-loop -
primary-one-shot` across prospective documents, with a document-level bootstrap
95% interval and the full distribution reported. Development and safety cohorts
are separate. Scripted/synthetic observations are excluded from effect estimates.

No confirmatory interval or effectiveness claim is emitted with fewer than 12
eligible prospective documents, missing condition pairs, option/model/engine
drift, missing expert adjudication, duplicate/aliased artifact hashes, or broken
source/output/evidence bindings. Secondary outcomes are exploratory and reported
with denominators and missingness rather than a single blended compliance score.

## Claim boundary

A successful study may support: “On a prospectively frozen corpus, AlloFlow's
evidence-gated loop improved blinded expert-rated safe remediation outcomes over
its one-shot primary pass, under the recorded model and settings.”

It cannot by itself support “MCP improves quality,” “fully automatic PDF/UA/WCAG
compliance,” “independent AI auditors,” or superiority over commercial products.
Competitor claims require separately executed baselines on the same eligible
sources and the same blinded review protocol.
