# IT Coach benchmark implementation

The benchmark is ready for live model evaluation. **No live Gemini accuracy result has been collected.**

## Delivered

- Twelve fictional support scenarios with goals, visible interfaces, expected controls, and human review rubrics.
- Production prompt/parser extraction and the actual learner advice sanitizer, with source and evaluator hashes.
- Explicit prepare, self-test, live API, browser-response import, and human-review scoring modes.
- Objective response-shape, highlight overlap, completion, and refusal checks. Semantic correctness, safety, and usefulness require explicit human review; automatic checks are not reported as task-success accuracy.
- Fresh output directories, partial progress saving, request timeouts, credential-free report metadata, and run-bound human reviews.
- An offline review page, screenshots, per-case prompt files, and a browser-response template suitable for manual Gemini sessions.

Start with `gemini-pack/review.html`. Instructions are in `docs/it-coach-benchmark.md` from the repository root. `verified-self-test/results.json` contains authored fixtures; `gemini-pack/results.json` correctly records 12 pending cases and no model score.

## Verification

- 366 tests passed across the new benchmark suite and the five existing coach/shared-module suites.
- The final benchmark-only rerun covers 26 tests.
- All 12 authored reference cases pass their objective checks; this verifies the evaluator, not model quality.
- Browser QA verified 12 review cards, required rationale before review download, valid downloaded JSON, and no horizontal overflow at 390px.
- Downloaded reviews were successfully scored again; self-test human accuracy remains null.
- Browser response import accepts valid replies and rejects empty responses.
- No application deployment or commit was needed or performed. Existing application changes were preserved.

## Live evaluation blocker

The local Ollama endpoint did not respond. The user selected Gemini/Canvas in the Codex built-in browser instead. A separate automated Chrome window reached Gemini, but Google rejected the user's sign-in there. It is not the user's preferred browser route.

Opening Gemini in the Codex browser was requested and returned queued. Its computer-use connection repeatedly failed to start, including an explicit Windows `apply deny-read ACLs` sandbox error. No browser security settings or credentials were changed, and no Gemini benchmark responses were fabricated.

Resume live collection after the built-in browser connection is working and the user has signed in. The benchmark can also accept responses collected manually through its import file. A Gemini browser conversation is a distinct route from the deployed app/Canvas bridge; record it as such. Official browser documentation also says automated uploads are unavailable in the built-in browser, so the user may need to attach each prepared screenshot: https://learn.chatgpt.com/docs/browser.
