# Federal/Maine guide browser validation — October 4, 2026

**PASS: three distinct targeted scenarios** on the frozen activity: one new keyboard/link/participant-work workflow, the retained 52-score/state-survival scenario, and the unchanged actual-app public-entry/educator-gate scenario. Each invocation used the original synchronous stylesheet setup, a 120-second per-test limit, one worker, and zero automatic retries. The existing 37-scenario specification is a byte-exact prefix; one scenario was appended. The full 38-scenario matrix was not rerun.

The new scenario opens and closes the Case and Reasoning disclosures with native keyboard controls, checks all three informational headings and all six official link targets/new-tab protections, verifies horizontal containment at 320×740 and 844×390 dark and 1366×900 light, and confirms exact literal finding/Q8/Q9/summary work survives reading the guide, reloading between layout captures, a case switch, and export. The guide has no participant fields. Before/after exports preserve the complete caseWork and reviewed records and worksheet schema. Two actual active-panel axe scans recorded **zero violations**; these are scoped automated checks.

The actual-host runs used the immutable tested snapshot **5cff82b2** and bundle **69c86008**, serving frozen activity **fec6407e**. A prelaunch whole-current-host guard stopped before any browser invocation after unrelated shared-host drift to **90a8fd75**. That stopped guard is retained in the first host directory and is not counted as a test attempt. The replacement guards checked exact immutable served bytes and the specific borrowed route-reader region against the tested snapshot. Current whole-host hashes, including **d6e6bcf5** before recovery, remain separate observations; no rebuild followed the drift.

The first actual-host invocation **timed out** at the unchanged 120-second cumulative limit during the final ungated page close. Its trace records all 17 expectations completed without error. That invocation remains a failure with raw JSON, screenshots, videos, trace and [diagnosis](host-timeout-analysis.json) retained. Exactly one justified recovery reran the original test body and setup with the same limit, one worker and zero automatic retries. The final passing host invocation is `host-only-02`; the three distinct targeted scenarios are final coverage, not a claim that all passed on their first attempt.

See [validation summary](validation-summary.json), [module result](module-focused-01/result.json), [module raw archive proof](module-focused-01/archive-proof.json), [final actual-host result](host-only-02/result.json), [final host raw archive proof](host-only-02/archive-proof.json), [initial host timeout](host-only-01/result.json), [initial host raw archive proof](host-only-01/archive-proof.json), and [bounded recovery prelaunch guard](host-only-02/prelaunch-guard.json).

Actual expanded screenshots:

- [Case, 320×740 dark](module-focused-01/browser/jurisdiction-case-320x740-dark.png)
- [Case, 844×390 dark](module-focused-01/browser/jurisdiction-case-844x390-dark.png)
- [Case, 1366×900 light](module-focused-01/browser/jurisdiction-case-1366-light.png)
- [Reasoning, 1366×900 light](module-focused-01/browser/jurisdiction-reasoning-1366-light.png)

Actual accessibility records: [Case, 320 dark](module-focused-01/browser/axe-jurisdiction-case-320-dark.json) and [Reasoning, 1366 light](module-focused-01/browser/axe-jurisdiction-reasoning-1366-light.json). The separate source/legal review establishes the content jurisdiction distinction; this browser evidence verifies behavior and links. Print was not re-audited in this interface pass. No Git mutation, commit, push, deployment, or full app build was performed by validation.
