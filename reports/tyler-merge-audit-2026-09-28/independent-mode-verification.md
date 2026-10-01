# Independent-mode verification

- Candidate: `C:/tmp/tyler_integration_candidate`
- Run date: September 28, 2026 (America/New_York)
- Start time: 23:55:23
- Duration: 18.02 seconds
- Result: **1 test file passed; 8 tests passed; exit code 0.**
- JSON: `independent-mode-verification.json`

## Test repair

`tests/independent_mode_surfaces.test.js` contained an exact-string assertion written before Family mode was excluded from the teacher grading dashboard. The actual host correctly routes Family mode to `LearnerProgressView`. Only this stale test was changed; application source was unchanged.

The repaired test locates the actual `AlloFlowANTI.txt` guards attached to `TeacherDashboard` and `LearnerProgressView`, requires exactly one route for each component, and evaluates those guards across all eight combinations of Teacher, Independent, and Family flags in both `dashboard` and `input` views (16 cases). School staff see grading; learners see progress; neither dashboard component is shown in the input view. This retains the original Independent-mode check and adds Family and non-dashboard coverage.

## Exact command

Run from `C:/tmp/tyler_integration_candidate`:

```powershell
node node_modules/vitest/vitest.mjs run tests/independent_mode_surfaces.test.js --pool=threads --maxWorkers=1 --no-cache --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-independent-mode-verification.json
```

The JSON result was copied into this report directory after the original run; no repeat run was needed.
