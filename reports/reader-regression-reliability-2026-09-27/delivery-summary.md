# Delivery regression fixture repair

Base HEAD: `452e7cd230b62f4e192f055826817653d5b997f4`.

The actual host records received resources with `setReceivedDeliveryResources` after successful hydration and hosted-assignment intake. The two extracted test environments omitted that React setter. Their successful production paths therefore threw inside the fixtures and incorrectly entered failure/retry handling. No production runtime bug was identified or changed.

Both fixtures now implement observable received-resource state, including React-style functional updates. Assertions cover latest-snapshot ownership, pending-download reuse, student-safe filtering, clearing an intentionally empty assignment, successful recovery, and retention/non-mutation after malformed, expired, cancelled, partial, or obsolete delivery. Existing failure, retry-budget, and part-consistency checks remain.

## Scope

- `tests/helpers/live_hydration_harness.js`
- `tests/mailbox_activity_only_intake.test.js`
- `tests/live_session_learner_recovery.test.js`
- `tests/live_session_reliability.test.js`

The four-file diff is 31 insertions and 8 deletions. `git diff --check` passed. No production, generated, baseline-ratchet, configuration, or shared-host files were edited; no build, commit, push, or deploy was performed.

## Verification

The same three suites ran with one worker and default timeouts:

```text
node node_modules/vitest/vitest.mjs run tests/mailbox_activity_only_intake.test.js tests/live_session_learner_recovery.test.js tests/live_session_reliability.test.js --maxWorkers=1
```

| Run | Test files reported | Passed | Failed | Result |
| --- | ---: | ---: | ---: | --- |
| Before fixture repair | 3 | 28 | 14 | Expected fixture failures |
| First after-run | 2 | 32 | 1 | Incomplete: first mailbox case exceeded 5 seconds; reliability file did not report |
| Final after-run | 3 | 42 | 0 | Passed, exit 0; 12.87 seconds |

The incomplete run coincided with broad machine slowdown and is retained without changing test timeouts. One rerun then passed: learner recovery 20/20, mailbox intake 13/13, live reliability 9/9. No further test runs were started.

## Evidence and concurrent-work boundary

- `delivery-baseline.json`, `delivery-baseline.log`, `delivery-baseline-evidence.json`
- `delivery-after-incomplete.json`, `delivery-after-incomplete.log`, `delivery-after-incomplete-evidence.json`
- `delivery-after.json`, `delivery-after.log`, `delivery-after-evidence.json`

Evidence records commands, exit codes, counts, and SHA-256 hashes before and after each run for the four fixture files and the host/dock/shared-activity/session-transport inputs. Production inputs were stable during the final successful run. Another owner changed `AlloFlowANTI.txt` between the baseline and after-runs, so this is not an identical-production-byte before/after comparison. The final successful run's exact input hashes are retained for the parent's combined verification.
