# Own-source integration verification

- Candidate: `C:/tmp/tyler_integration_candidate`
- Run date: September 28, 2026 (America/New_York)
- Start time: 23:40:00
- Duration: 53.85 seconds
- Result: **4 test files passed; 24 tests passed; exit code 0.**

## Exact command

Run from `C:/tmp/tyler_integration_candidate`:

```powershell
node node_modules/vitest/vitest.mjs run tests/tyler_guided_own_sources_integration.test.js tests/own_source_sidebar_prop_chain.test.js tests/own_source_documents_only.test.js tests/own_source_lesson_controls.test.js --pool=threads --maxWorkers=1 --no-cache --hookTimeout=60000 --testTimeout=30000
```

## Suites

| Suite | Passed tests |
| --- | ---: |
| `tests/tyler_guided_own_sources_integration.test.js` | 3 |
| `tests/own_source_sidebar_prop_chain.test.js` | 1 |
| `tests/own_source_documents_only.test.js` | 9 |
| `tests/own_source_lesson_controls.test.js` | 11 |
| **Total** | **24** |

The new integration suite evaluates the actual `AlloFlowANTI.txt` host callback and renders the generated `SourceInputShellView` with the real `SourceInputPanel` and `SourceGenPanel`. It verifies the Guided Mode doorway, source choices across Guided Mode exit, disabled AI-permission rows, empty-selection generation blocking, and documents-only/web-search exclusivity. Existing suites cover forwarded settings, source-selection behavior, imports, document-only generation, and citation handling.

## Captured terminal summary

```text
RUN  v4.1.5 C:/tmp/tyler_integration_candidate
Test Files  4 passed (4)
     Tests  24 passed (24)
Start at  23:40:00
Duration  53.85s (transform 2.45s, setup 2.08s, import 5.05s, tests 9.61s, environment 34.17s)
```

No JSON report was requested for this run. This note records the original terminal result; tests were not rerun to create it. No application or test source edits were required by this verification. No build, commit, or deployment was performed by the verification agent.
