# Current classroom candidate validation

Status: focused local validation completed on October 3. The final classroom batch passed 61 host/save/audio checks and 24 storage acknowledgement/bootstrap checks; Evolution passed 126 unique current-source checks. Both isolated browser journeys passed. See the [complete report](../README.md) for exact evidence and limits. The report-local helper separately passed six Node mutation/stability checks; those six are excluded from the 211 application checks.

The [final before receipt](candidate-before-complete-20261003.json) and [final after receipt](candidate-after-complete-20261003.json) identify candidate `5b94e0e0fb9050550a5e08c42adca2d93c9bad833b68a972d7e4d407d96121b2` at HEAD `b86093eb51350a2386e08f229ebd24254ef1a9ac`: all 76 selected inputs unchanged and all 14 declared module/host pairs identical. Current global CI remains unverified. Earlier receipts recording shared translation drift and failed browser attempts are retained; they do not supersede this final run.

The release helper reads an explicit file list, fingerprints every selected input twice, records Git HEAD and declared byte-parity pairs, then compares the same inputs after validation. It cannot run commands or infer a passing CI result. It writes only a fresh JSON receipt in this directory. The selected scope must include the source, generated modules, host copies, relevant tests, test helpers and runner configuration used by the particular validation.

Reuse existing verifiers rather than replacing their contracts:

- `dev-tools/check_reader_release.cjs --json` checks canonical reader compilation in memory, both reader outputs, all three host copies and exact reader loader pins, with fingerprints and HEAD rechecked.
- `dev-tools/check_source_pair_drift.js` checks the three existing duplicate source pairs, normalizing CRLF/LF. Do not pass `--fix` during validation.
- `dev-tools/check_deploy_mirror.cjs` compares all existing root/public pairs. It reads about 2 GB across roughly 8,000 pairs and should wait for a coordinated runner window. `--fast` is not a byte-parity gate.
- Scoped unit/browser validation remains separate from these static consistency checks. A passing reader consistency manifest does not establish save/reload or student-delivery behavior.

Once the integration owner freezes the selected scope, create `candidate-scope.json` with `schemaVersion: 1`, explicit `inputs` and optional `parityPairs`. Include this helper, scope JSON and helper tests as selected inputs. Capture before the authorized validation and compare after it:

```text
node reports/classroom-reliability-2026-10-01/release/candidate_receipt.cjs capture --spec reports/classroom-reliability-2026-10-01/release/candidate-scope.json --output reports/classroom-reliability-2026-10-01/release/candidate-before.json
node dev-tools/check_reader_release.cjs --json
node dev-tools/check_source_pair_drift.js
[integration owner chooses the scoped unit/browser commands]
node reports/classroom-reliability-2026-10-01/release/candidate_receipt.cjs compare --baseline reports/classroom-reliability-2026-10-01/release/candidate-before.json --output reports/classroom-reliability-2026-10-01/release/candidate-after.json
```

Keep each command's exact arguments, exit status, output filename and before/after candidate fingerprints together. If a selected input or HEAD changes, retain the invalidated receipt and repeat the affected checks against a fresh baseline. Existing report filenames are never overwritten by this helper.

Historical CI evidence remains historical: `reports/alloflow-resume-2026-10-01/ci-readonly/README.md` describes a failed run at `407f36e2dbb1b7c0990d5365c96731e34378756d`. It establishes neither failure nor success of the current candidate. No current global-CI green claim is made. The large-batch deployment check in `dev-tools/check_changed_tests.cjs` delegates batches above 120 files to CI and exits 0; that exit is not evidence that CI has passed.

Automated acceptance now covers synthetic teacher save/reopen, local student delivery and response reload, native narration completion, keyboard navigation/Stop, reflow, and cross-origin native device-bridge acknowledgement/restore. The complete hosted app, actual classroom transport/provider, Google Canvas partition, manual screen readers, native zoom, exports, installer and released bytes remain separate acceptance fields. The headless native-zoom probe is blocked, not passed. No build, deployment or current global-CI green claim is made.
