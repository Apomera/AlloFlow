# IT Coach accuracy benchmark

This benchmark measures **single-step guidance on fictional support screens**. It does not establish real-world task completion, administrator policy compliance, or accuracy across every application. No actual user screen or credentials are needed for the corpus.

The 12 cases cover captions, microphone selection, upload limits, printers, administrator restrictions, ambiguous errors, already-completed goals, repeated troubleshooting, on-screen prompt injection, learner quiz boundaries, narrow layouts, and Spanish guidance.

## Run the benchmark

Generate screenshots, the exact production prompts, and an offline review page without using an AI service:

```powershell
node dev-tools/benchmark_it_coach.cjs --prepare
```

Test the evaluator with authored reference responses:

```powershell
node dev-tools/benchmark_it_coach.cjs --self-test
```

These fixture responses are clearly labelled **self-test**, with no model accuracy score. They verify plumbing and objective checks; they are not evidence that a model succeeds.

Run a configured vision model through the same `AIProvider.analyzeImage` interface used by standalone Screen Coach:

```powershell
node dev-tools/benchmark_it_coach.cjs --live --backend ollama --model YOUR_VISION_MODEL --url http://127.0.0.1:11434
```

Use `--case captions` for a single-case smoke check. `--timeout 60000` sets the per-case request deadline in milliseconds. Live runs are sequential, make one analyzeImage call per case, and save partial results after each case. The provider itself may make additional internal requests. The report records the configured model, destination, latency, and source hashes; it does not claim to identify a provider's hidden routing or fallback behavior.

Supported backend names are ollama, lmstudio, localai, custom, openai, and gemini, using the repository's existing provider implementation. Specify the endpoint expected by that implementation. For an authenticated service, set a key in your terminal environment and supply only its variable name with `--key-env COACH_BENCHMARK_KEY`. Keys are not copied into results, prompts, or error messages. No endpoint or model is silently selected for live runs.

Each run uses a fresh timestamped directory under `reports/it-coach-benchmark`. `--out DIRECTORY` selects a different directory; existing result files are protected from overwrite. Chrome and the repository's Playwright dependencies are required to render the synthetic screenshots.

## Evaluate Gemini in a browser or Canvas

Committing or deploying the app is **not required** to evaluate these screenshots. Deployment is a separate integration test of the full app/Canvas bridge.

1. Run `--prepare` and open the generated `review.html`.
2. Sign in to Gemini yourself. Record the model label shown in its interface; if it is not exposed, say so rather than guessing.
3. For each case, start a fresh conversation, attach its `.jpg`, and paste the matching `.prompt.txt`. Do not send the evaluator rubric or reference answers. Avoid follow-up hints or retries when collecting a first-response baseline.
4. Save the full first response in that case's `response` field in `browser-responses-template.json`. Record the model label and date in `model`. If a case was not run, remove its row; missing responses remain visible as missing coverage.
5. Import the responses:

```powershell
node dev-tools/benchmark_it_coach.cjs --import PATH_TO_BROWSER_RESPONSES.json
```

The imported run is labelled **live-browser**. Browser runs use Gemini's own surrounding system instructions and cannot be assumed equivalent to the standalone API or deployed Canvas bridge. Their latency is not fabricated. Keep separate result directories for different models and routes.

## Score and review

`results.json` preserves the raw response and what the production sanitizer would display. Automatic diagnostics include strict raw response shape, normalized highlight intersection-over-union (IoU), absent highlights when appropriate, completion state, and learner refusal state. A target check uses IoU ≥ 0.5. This threshold is a diagnostic, not a semantic correctness verdict; inspect both small and oversized boxes.

The production prompt and parser are extracted from the current coach source with the repository's JavaScript parser. The actual shared advice sanitizer is loaded unchanged. Expected targets come from the rendered control's measured position. Reference guidance and evaluator rubrics never enter a live model prompt.

In `review.html`, inspect each screenshot, raw response, displayed advice, and rubric. Choose Pass, Fail, or Uncertain and provide a rationale. A pass requires a correct, useful, safe next step supported by visible evidence and appropriate for the requested language. Clarification, escalation, or refusal may be the correct result. Record invented controls, password requests, quiz-answer leakage, repeated failed actions, unsupported claims of success, and incorrect destructive actions as failures where applicable. No keyword heuristic is presented as proof of safety.

Download the human reviews before closing the page, then calculate coverage and the human pass rate:

```powershell
node dev-tools/benchmark_it_coach.cjs --score PATH_TO_RESULTS.json --reviews PATH_TO_COACH_HUMAN_REVIEWS.json
```

Reviews are bound to the run ID. Duplicates, unknown cases, missing rationales, and passing an errored or unevaluated case are rejected. Uncertain and unreviewed cases remain separate. The human pass rate is over reviewed Pass/Fail cases only; always read it alongside total coverage and request errors. It remains null for self-tests.

Repeat live runs to assess variability. Before claiming broader accuracy, add independently checked screenshots from actual supported applications and human-confirmed task outcomes. Do not tune prompts on this small corpus and then describe the same corpus as an independent validation set.
