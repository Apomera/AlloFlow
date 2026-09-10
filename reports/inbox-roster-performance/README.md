# Submission Inbox roster performance — September 9, 2026

Submission Inbox previously scanned the student-name array for every case-insensitive roster match. A visible submission can request the match more than once, so large queues repeatedly lowercased and compared the same roster names.

The existing roster memo now builds a `Map` from lowercase names to the first matching roster name. Student-name enumeration also moves inside that memo. Per-name matching uses the index while retaining the existing direct-key precedence, first-match ordering, normalized-name ambiguity rules, and explicit confirmation for fuzzy matches. The index is rebuilt when the roster prop changes, using the existing memo boundary.

## Browser evidence

The probe imports synthetic JSON submissions through the actual generated Inbox's file input and compares it with commit `52ee51a6a`. Each queue contains one submission per synthetic student, with uppercase submitted names and mixed-case roster names. Both versions use production React in the same isolated Chromium page, at 4× CPU throttling, with the component's inline styles.

| Queue/roster size | Name-lowercasing calls per update, before | After |
| --- | ---: | ---: |
| 40 | 3,320 | 120 |
| 300 | 180,900 | 900 |

The counter observes lowercasing calls for synthetic learner names during an entire update, including work outside the replaced search. Counter collection runs separately from timing. All 340 imported row texts matched exactly. Replacing each roster also preserved unknown-name badges, required fuzzy-match confirmation, and the confirmed button state.

The first timing run was noisy: median time for four updates was 17.2 → 13.1 ms for 40 students and 66.6 → 228.9 ms for 300 students, with individual samples ranging up to 1,184 ms. Those results do not establish a larger-queue latency improvement. They are retained in [browser-initial.json](browser-initial.json). The deterministic improvement is the reduction in repeated name processing; these component measurements do not establish whole-app startup or field INP changes.


A follow-up ran after the concurrent test process ended, using three warmups and five alternating measurements per version. Median time for four updates was **28.4 → 8.0 ms** for 40 students and **379.8 → 215.1 ms** for 300. The repeated work reduction and row/confirmation parity were identical. The high variability between runs still limits timing claims; see [browser.json](browser.json) for every sample.

## Validation

**53 distinct tests passed across eight files.** Two setup timeouts passed with a longer setup allowance; the accessibility check passed unchanged when run alone after exceeding its fixed 15-second timeout in the broader run. All original and rerun results are retained.

New tests cover case-insensitive matching, direct-key precedence, empty roster assignments, case collisions, non-English names, normalized-name ambiguity, roster replacement, and bounded normalization work. Existing Inbox import, accessibility, translation, identity, and AlloSheet review coverage is included in the test reports. The initial test run's two setup-hook timeouts and their targeted rerun are retained separately.

Generated source/module mirrors and the main shell CDN version are synchronized. Desktop shell URLs remain local. No push, deployment, or installer was produced.

## Reproduce

```powershell
node dev-tools/inbox_roster_performance.cjs
node node_modules/vitest/vitest.mjs run tests/submission_inbox_roster_performance.test.js tests/submission_identity_foundation.test.js tests/submission_inbox_a11y.test.js tests/submission_inbox_i18n.test.js tests/submission_inbox_work_evidence.test.js tests/submission_inbox_allosheet_handoff.test.js tests/submission_inbox_allosheet_review_runtime.test.js tests/submission_response_manifest.test.js --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
```

The probe reads its baseline module from Git; `INBOX_BASELINE_REF` can override the baseline. It does not use real student records or invoke grading services.
