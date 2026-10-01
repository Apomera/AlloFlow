# Browser verification of the Tyler integration candidate

Candidate: `C:/tmp/tyler_integration_candidate`.

## Full application

Five targeted Playwright tests passed on the final rerun (3.2 minutes). Together with the unchanged accessibility and Student-entry tests that passed in the initial run, seven distinct launch-pad tests passed:

- Teacher, Student, Family, and Specialist role cards, including the full Teacher workspace alternative.
- Accessible names and descriptions come from the visible role-card text.
- Enter on Specialist opens the educator dialog, moves focus inside it, exposes BehaviorLens and Report Writer, and persists the Specialist role.
- Enter on Student expands its class-entry choices while staying on Start.
- The full Teacher workspace survives reload.
- Family can switch to Specialist, access its tools, and retain that role after reload.
- Guided Teacher can switch to Specialist without keeping Guided Mode active, access its tools, and retain Specialist after reload.

Actual storage attachments in [the passing result](launch-pad-e2e.json) show:

| Scenario | Saved session role | Saved session workspace | Separate Teacher preference |
| --- | --- | --- | --- |
| Fresh Specialist | specialist | null | unset |
| Full Teacher after reload | teacher | full | full |
| Family → Specialist after reload | specialist | null | unset |
| Guided Teacher → Specialist after reload | specialist | null | guided |

The separate Guided preference is preserved for returning to Teacher; it does not leave Guided Mode active in Specialist.

### Initial failures and corrections

The [initial result](launch-pad-e2e-initial.json) is retained. Three tests passed and four failed. Two transition assertions incorrectly expected Specialist's workspace field to equal `full`; that field is intentionally `null` for roles other than Teacher. The Teacher reload test used an outdated textbox name; it now verifies the visible Teacher header, absence of Guided Mode and Start, and the saved full-workspace choice. The first Specialist storage callback timed out without returning a mismatched value while many tools and unrelated browser suites were loading. Its unchanged role assertion passed with a longer callback budget and lighter artifact capture. No application code was changed to resolve these test failures.

The final rerun used one worker, no retries, a 20-minute overall bound, and no video or trace capture. [Runner output](launch-pad-e2e.log) records progress. The retained initial accessibility and Student-entry checks were not repeated because their assertions and the application had not changed.

### What was loaded

The harness bundles the actual generated `desktop/web-app/src/App.jsx` with installed React, Firebase, and Lucide dependencies. It serves the candidate's `desktop/web-app/public` files under `/app/` on a random loopback port. The existing application loader therefore requests local candidate modules. [The full-app report](e2e-report.json) records the host hash and hashes of 39 fetched assets. The boot probe had no page errors.

All requests outside the loopback origin were blocked. No production services, Google accounts, AI connections, or real learner records were used. Tailwind CSS was generated from the candidate sources using its existing configuration. This verifies the generated local application; it does not certify a deployed release or external integrations.

## Private labels

Seven Chromium checks passed against the actual generated `teacher_module.js` in a minimal React host with a fictional class. [Results and the fetched module hash](labels-report.json) cover:

- Refused save keeps the draft, reports failure, and leaves durable storage unchanged.
- Retrying successfully saves and clears the error.
- Refused clear leaves the old label visible and reports failure.
- Refused label deletion prevents deleting the associated learner.
- Reload retains a label after a refused clear.
- Successful clear remains cleared after reload.
- Replacing the learner ID discards an obsolete draft rather than assigning it to the replacement learner.

The label tests use genuine browser localStorage, with targeted `setItem` and `removeItem` refusal injected only for the private-label key. This is a component-level browser test; role transitions above were exercised in the full application.

The [mutation selftest passed](labels-selftest-report.json): the first refused-save check failed as expected when the served artifact was deliberately changed in memory to ignore a failed durable write. Afterwards, both on-disk teacher artifacts still had SHA-256 `b9a8adf0f9d708fb74a1a5fb33474d2ca1b931b0af7620d9dcb4ea90654f00fb`. All label checks and the selftest completed with no page errors.

The visible failure states were also inspected: [refused save](label-save-refused.png) and [refused clear](label-clear-refused.png).

## Reproduction

From the candidate checkout:

```powershell
node dev-tools/tyler-merge-browser.cjs e2e "Specialist|full Teacher"
node dev-tools/tyler-merge-browser.cjs labels
node dev-tools/tyler-merge-browser.cjs labels-selftest
```

The helper closes its own Chromium process and loopback server. It writes evidence to this directory, never commits or deploys, and never changes application source files. The selftest serves an intentionally broken teacher artifact from memory; the on-disk artifact remains untouched.
