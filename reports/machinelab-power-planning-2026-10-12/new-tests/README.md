# Native planning calculation tests

The final evidence is `run-03/final.json`: **111 passing cases**, five serial native Vitest processes, each with an observed exit code of zero. The full assertion inventory executed each case exactly once. Source and public mirror remained `19b5d0f85931b68081c2e64cee39d26cbfc63d0b721704cecb2f747f18c7131c` before and after every child.

The test groups cover independent physics (18), energy visualization (8), calculation practice (40), state integrity (16), and saved records and export (29). Expected values are computed independently from load, movement, efficiency, duration and power fixtures. All six stations exercise all four new skills.

## Preserved earlier attempts

- `run-01`: the physics child exited 1 with 17 passing cases and one failed test fixture. The intended overflow example used `Number.MAX_VALUE × 0.5`, which remains finite. The fixture was corrected to multiply by 2. No production change resulted from this failure. The original test and runner bytes are preserved in `test-snapshot.txt` and `runner-snapshot.cjs`; their hashes match the attempt manifest.
- `run-02`: the corrected 110-case suite passed all five processes on source `dfe755b4aeadd75321c0506e5af778f8d3e85c7c70b051ce1ce2f6e85c684146`. Review subsequently found that a required efficiency just above 100% could display as 100% in the worked solution and record. This candidate is superseded. The original passing test and runner bytes are preserved with matching manifest hashes.
- `run-03`: after the precision fix, an additional regression verifies the same exact above-100% value in the worked solution, saved record and clipboard export. All 111 cases passed on the final source.

Native JSON receipts and process logs are retained unchanged. A receipt alone is insufficient: use its observed process exit and source/test hash bindings in `processes.json`, together with the final exactly-once inventory.

To reproduce from the repository root, choose a fresh output directory:

```powershell
node reports/machinelab-power-planning-2026-10-12/run-new-tests.cjs reports/machinelab-power-planning-2026-10-12/new-tests/reproduction
```

The runner refuses to overwrite prior evidence. `--resume` accepts only already-successful, hash-matching process results.
