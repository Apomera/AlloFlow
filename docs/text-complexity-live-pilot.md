# Text-complexity live-provider pilot

This pilot reports two questions separately:

1. **Transport reliability:** did every bounded provider call complete, and were throttling and retries handled correctly?
2. **Calibration quality:** did the English passages measure near the educator-requested grade band?

A transport pass is not a calibration pass. Flesch-Kincaid is only one quantitative signal; it does not establish standards alignment, factual quality, knowledge demands, or suitability for a learner.

## Safety defaults

- The command is a zero-network dry run unless `--execute` is supplied.
- It uses a fixed synthetic water-cycle topic and accepts no student or lesson text.
- Credentials come only from environment variables. There is no API-key command-line option.
- The default smoke test is three sequential logical calls. The command caps a run at 12 logical calls and 24 raw HTTP attempts, including retries.
- Search, citations, images, and provider fan-out are disabled.
- Generated passages stay in memory. Reports retain measurements, retry/latency counts, and fingerprints—not passage text, keys, URLs, headers, prompts, or raw errors.

## Dry run

```powershell
node dev-tools/run_text_complexity_live_pilot.cjs
```

The default plan requests 250-word informative English passages at Grades 5, 8, and 12. They are internally calibrated to Grades 3, 5, and 8 while retaining the requested grade as the educator-facing instructional target.

Use `--json` to inspect the scrubbed report shape without making calls.

## Live canary

Set only the credential for the provider being tested in the current shell. Never put a key in a command argument or report.

```powershell
$env:GEMINI_API_KEY = '<dedicated test key>'
node dev-tools/run_text_complexity_live_pilot.cjs --execute --backend gemini --model gemini-3-flash-preview
```

Supported cloud variables are `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY`. `ALLOFLOW_PILOT_API_KEY` is an explicit provider-agnostic override. Firebase's `REACT_APP_API_KEY` is never treated as an AI-provider key.

For a local OpenAI-compatible endpoint, provide the endpoint and exact installed model:

```powershell
node dev-tools/run_text_complexity_live_pilot.cjs --execute --backend ollama --base-url http://localhost:11434 --model '<installed-model>'
```

To retain a scrubbed report:

```powershell
node dev-tools/run_text_complexity_live_pilot.cjs --execute --output calibration-runs/canary.json
```

`calibration-runs/` is local-only. Review every report before sharing it.

## Bounded benchmark

The smoke test is too small to justify retuning the calibration ladder. A provisional repeated canary fits under the hard cap:

```powershell
node dev-tools/run_text_complexity_live_pilot.cjs --execute --repetitions 3 --max-calls 9
```

The stronger checked-in empirical matrix uses Grades 2, 5, 8, and 11; two synthetic scenarios; three repetitions; and citations off. Thresholds must be frozen before the first call. Research/citations are a separate paired supplement and are valid only when provider grounding is actually observed.

Do not regenerate until a score passes. Infrastructure failures may resume, but quality misses must remain in the sample.

## Interpretation

- `transportPassed` requires every planned logical sample to succeed.
- Within-target, overshoot, and undershoot rates remain separate.
- A one-repetition canary always reports `insufficient-sample`.
- Provider/model identity must stay pinned. A different fallback model invalidates model-specific calibration claims.
- Non-English output receives no English Flesch-Kincaid verdict.
- Use body-only measurements that exclude titles, references, support notices, and AI-assistance disclosures before changing calibration policy.

The readiness audit on 2026-08-20 found no cloud-provider credential and no running supported local endpoint. No live call or cost was incurred during implementation; missing cloud credentials block before transport.
