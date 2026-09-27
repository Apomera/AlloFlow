# Reader role and audio regression fixture reliability

Completed 2026-09-27 against HEAD `452e7cd230b62f4e192f055826817653d5b997f4`, with concurrent domain work in the shared checkout. This task edited only the two assigned tests and `reader-*` evidence in this directory. No production files, generated modules, host files, catalogs, baselines, Git index/history, builds, or deployments were changed by this task.

## Repairs

- `tests/instructional_role_ui.test.js`: compile the canonical reader with `reader_place_store.js` and `reader_support_drafts.js`, in the same order as `_build_view_simplified_module.js`. Other views retain their existing assembly. This exercises current source without depending on concurrently generated reader outputs.
- `tests/karaoke_tts_review_runtime.test.js`: parse the bounded host region with the already installed Babel parser and evaluate only the requested variable declaration. The old slice also executed the following unrelated `window.__alloReadAloudProfileRevision` assignment, which required `_aiConfig` and `GEMINI_MODELS`. Missing or unexpected helper declarations still fail explicitly. No new configuration stub or error swallowing was added.

All existing role, input, WAV encoding, routing, cancellation, and audio provenance assertions remain unchanged. The same real helper bodies and production modules are exercised. No product bug was exposed by these two fixture repairs.

## Before and after

The same focused command was used for both runs:

```text
node node_modules/vitest/vitest.mjs run tests/instructional_role_ui.test.js tests/karaoke_tts_review_runtime.test.js --maxWorkers=1 --configLoader native --reporter=json --outputFile=<report>
```

- Before: 30 passed, 1 failed, 9 blocked/skipped by the reader setup failure. The role suite reported `createReadingPlaceStore is not defined`; the actual WAV encoding test reported `_aiConfig is not defined`.
- After: **40 passed, 0 failed, 0 skipped** — all 9 role checks and all 31 audio checks.
- Scoped `git diff --check` passed. Git emitted only a CRLF-to-LF advisory for the audio test. Vitest emitted the existing package module-type warning.

Evidence: `reader-before-tests.json`, `reader-before-tests.log`, `reader-after-tests.json`, and `reader-after-tests.log`.

## Input identity and concurrent work

`reader-inputs-before.json`, `reader-inputs-after-edit.json`, and `reader-inputs-after-tests.json` record SHA-256 values for 16 selected input files, including the host, canonical reader/helpers, role view fragments, production audio modules, both tests, setup, and configuration. All 16 recorded inputs were stable across the passing run. This is a boundary hash check, not proof that no transient concurrent write occurred between observations.

The host changed between the baseline and passing-run setup:

- Baseline `AlloFlowANTI.txt`: `5dca71fc6ee9cee776d5b65522a728099632604418f02a3d7fd9eca1216d0d54`.
- Passing-run `AlloFlowANTI.txt`: `10efb52ce77d7ae5dc0f45153463a7f865ae03d504d77eb30dd82b1d2b270d94`.

This task did not edit the host. The two intended test edits were the only other differences among the recorded inputs. Generated reader bundles are deliberately not test inputs. The passing result establishes focused behavior for the recorded final inputs; it does not establish global CI, browser, live-provider, or deployed behavior.

The full-host drift is distinct from the audio helper bodies. Declaration-only comparison against committed HEAD, using the test's CRLF-to-LF normalization, found both current helpers unchanged:

- `_encodeReadAloudBridgeAudio`: `29cf17bcdae7a5c84eec65f86ca9c647bceba89e1c437dbc9754430bef08a7a3`.
- `_synthSentenceForStore`: `fde71e77b6d95dc851adcc7c399b8fd654323b322db1e92a6fb145466349f3d4`.

The source used for that comparison still matched the passing-run full-host hash. The baseline host bytes were not copied, and its hash matches neither raw HEAD nor HEAD with CRLF line endings. Therefore the evidence proves HEAD-to-final helper equality and final-run input stability, but cannot independently reconstruct the exact earlier working host or assert that its drift was only cache pins. No tests were rerun because of that unrelated full-file drift. `reader-validation-summary.json` records these comparisons and before/after counts.

Parent owns combined verification and any scoped commit. No additional test or production scope is proposed here.
