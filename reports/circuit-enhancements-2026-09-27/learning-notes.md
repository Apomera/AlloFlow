# Circuit learning enhancements

## Changes

- Ohm quiz choices are repaired in their displayed decimal units. Each generated question has four positive, distinct choices and one exact correct answer, including the smallest supported current answers.
- Choices use a Fisher–Yates shuffle. Grading and answered-question feedback compare the chosen numeric option exactly with the stored answer. Existing saved questions keep their numeric schema, so a saved 0.007 A choice for a 0.006 A answer is now marked incorrect.
- Investigation comparisons and notebook entries use the shared current formatter. A 1 V to 2 V change across 10 kΩ now reads 100 µA, 200 µA, and +100 µA.

## Verification

Command:

```powershell
node node_modules/vitest/vitest.mjs run tests/circuit_learning_regressions.test.js tests/circuit_learning.test.js tests/circuit_time_lab.test.js --maxWorkers=1
```

Result: **3 files passed; 34 tests passed.**

The new regression suite checks all 148 parameter pairs across all eight question families, each with four distractor patterns (592 generated questions). Mounted React tests exercise generated and saved quiz choices, score/streak/XP updates, and saving a baseline, changing the supply, and recording precise notebook evidence.

`learning-probes.cjs` extracts production functions and expressions. Run it to refresh `learning-results.json`; its assertions check distinct quiz choices, exact grading, and the small-current comparison display. Product files are read only by the probe.

Source changes were restricted to the quiz generator/scoring and investigation current formatter. Deployment mirror synchronization is handled by the coordinating agent after all source edits.
