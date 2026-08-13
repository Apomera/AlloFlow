# Refinement study runner

This directory runs a reproducible comparison between AlloFlow's canonical primary remediation
pass and its full evidence-gated refinement loop. It is an experiment harness, not a production
policy fork.

## Safety defaults

- The CLI only **plans** unless `--execute` is present. Planning does not load the remediation
  driver, contact a provider, or inspect a key file.
- Live execution requires an explicit `GEMINI_API_KEY` in the current process. The runner sets
  `ALLOFLOW_MCP_NO_KEY_FILES=1` before loading anything, so it cannot silently consume the
  maintainer demo file or an `ALLOFLOW_MCP_ENV_PATH`.
- Execution also requires the exact `--confirm <studyId>` and an explicit `--max-runs N` ceiling.
  Use one or more `--only-run <runId>` flags for a small pilot.
- Runs are sequential. Secrets are redacted from logs and records; credentials are never stored.
- Prospective held-out execution additionally requires a secret 256-bit hexadecimal
  `randomizationSeed` (or `ALLOFLOW_STUDY_ALLOCATION_SEED`). Only its SHA-256 commitment is
  printed; the seed and condition map must stay outside reviewer workspaces.

## Conditions

| Configuration ID | Protocol condition | Meaning |
| --- | --- | --- |
| `primary-one-shot` | `one_shot` | Real canonical primary pass with `autoContinue:false` |
| `gated-loop` | `gated_loop` | Real canonical controller with `autoContinue:true` |
| `deterministic-only` | `deterministic_only` | Adapter-required experimental ablation |
| `ungated-loop` | `ungated_loop` | Adapter-required experimental ablation |

The primary pass includes production deterministic safeguards; it is not a model-free baseline.
The production driver exposes no truthful deterministic-only mode. Likewise, the runner refuses
to disable accept/revert or evidence gates in place. Those two ablations require an explicit,
hash-pinned adapter exporting:

```js
module.exports = {
  metadata: {
    condition: 'ungated-loop',
    policy: 'experimental-ungated-ablation',
    version: '1.0.0'
  },
  async run({ driver, driverOptions, callbacks }) {
    // Return a driver-compatible remediation result.
  }
};
```

This keeps experimental policy visibly separate from the shipping controller.

## Plan first

From the repository root:

```bash
node mcp-testing/refinement-study/run.cjs mcp-testing/refinement-study/example.study.json
```

The plan reports exact source hashes, exact driver options, condition readiness, randomized run
order, provider classification, and the exact `studyId`/run IDs needed for authorization. The plan
contains the private `blindId`-to-condition allocation map: do not commit it or copy it into a reviewer
workspace; store exported plans under the ignored `private/` directory. The
checked-in example may refer to a generated test fixture that exists only after its E2E setup;
replace it with real absolute or config-relative source paths for a study.

The pinned development calibration manifest is accepted directly:

```bash
node mcp-testing/refinement-study/run.cjs \
  mcp-testing/refinement-study/development-pilot.json
```

Its `documents[]` entries are converted to study sources, `sharedOptions` are applied identically
to both conditions, and every declared byte length and SHA-256 is checked before a plan is emitted.
The command should report 36 ready runs and remains plan-only.

Canonical source partitions are:

- `development_pilot`
- `development_retrospective`
- `safety`
- `prospective_held_out`

Only prospectively reserved documents can support a confirmatory effectiveness estimate. Existing
corpus work should not be relabeled held-out after it informed development.

## Execute a bounded pilot

After reviewing the plan:

```bash
node mcp-testing/refinement-study/run.cjs path/to/study.json \
  --execute \
  --confirm exact-study-id-from-plan \
  --max-runs 2 \
  --only-run exact-run-id-1 \
  --only-run exact-run-id-2
```

Use `--resume` only for a failed/incomplete matching run. A checkpoint is accepted only when its
source hash, condition, and exact-options hash match. Completed immutable results are skipped.
`maxRunMinutes` is passed to the driver's actual deadline controller; it is not a display-only
setting.

Provider evidence is classified before execution without a network probe:

- no explicit credential: plan only;
- loopback/scripted or non-official compatible endpoint: infrastructure evidence only;
- live Google Gemini endpoint: potentially effectiveness-eligible only when the endpoint and model
  settings are recorded and the primary/fallback model IDs are identical. The driver does not yet
  return a complete per-call actual-model trace; differing fallback configuration is descriptive
  engineering evidence only.

Classification does not make automated scores ground truth. Effectiveness requires blinded expert
review and, ideally, prospective held-out documents.

## Artifacts

Each condition run writes into its internal run directory:

- `study-record.json`: mutable progress, timings, redacted logs, errors, and resume state;
- `checkpoint.json`: the latest driver checkpoint, bound to source/condition/options;
- `output.html` and optionally `output.pdf`, each SHA-256 recorded;
- `verification-evidence.json`: immutable automated evidence bound to the output;
- `result.json`: immutable `alloflow.mcp-refinement-result/v1` analysis record.

Reviewer-facing copies are placed under `reviewer-packets/<blindId>/`. They contain only a neutral
candidate filename and a minimal hash manifest—no condition, score, run path, round log, or model
metadata. Keep the internal result directories away from reviewers until adjudication closes.

Expert judgments are never inferred from automated validators. Create a separate annotation file
using the `blindId` join key and `subjectSha256`, hash that file, and attach its hash during analysis.
The raw `result.json` remains immutable. Start from `expert-annotation.template.json`; the annotation
must include `baselineMaterialIssueCount`, `criticalSeriousIssuesResolved`, and
`materialDefectsIntroduced` so the preregistered safe-material-resolution outcome has a valid
denominator and penalty. Leave fields `null` until reviewers adjudicate them; never copy automated
issue counts into expert fields.

### Join blinded annotations for analysis

Fill every field in `expert-annotation.template.json`. `baselineAdjudicationSha256` must identify
the same source-baseline adjudication for both conditions. Compute the canonical content
commitment before saving the final file:

```powershell
node mcp-testing/refinement-study/expert-annotations.mjs --commit path/to/annotation.json
node mcp-testing/refinement-study/expert-annotations.mjs --validate path/to/annotation.json
```

Put the first command's digest in `contentCommitmentSha256`, then validate. Analysis code loads
immutable `result.json` records with `loadResultRecords`, joins annotation paths using
`joinExpertAnnotations`, and passes the returned in-memory `records` to
`analyzeRefinementStudy`. The join never rewrites a result or annotation file. Confirmatory
intervals remain unavailable below 12 eligible prospective held-out source documents;
development records are reported separately as descriptive evidence.
## Reproducibility notes

The record fingerprints the headless driver, every driver-exported runtime module, the canonical
pipeline source, the vendor manifest, and a deterministic aggregate build hash. It also records
Node/OS/architecture/Playwright and provider/model settings. A user-supplied anonymous
`ALLOFLOW_STUDY_SITE_ID` may identify a site; hostnames are intentionally not collected.

AI conditions are stochastic. Use multiple repetitions, preregister a prospective held-out set,
and have at least two blinded accessibility specialists adjudicate reading order, tables, forms,
alternative text, introduced defects, and material issues resolved.

Version 1 runs each condition independently. Because the current Gemini transport exposes no model
seed, the one-shot and gated conditions do not share identical model randomness or a common cached
primary pass. Their paired contrast therefore includes baseline-audit/primary-pass sampling variance,
not continuation variance alone. Reusing a primary checkpoint across conditions would create a new
branched protocol and must not be improvised during this study.
