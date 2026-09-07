# Basic math: connecting schedule questions to intervals

This seventh refinement pass focuses on Time & Schedule Lab's Schedule Planner.

- **Questions and relevant times stay together.** The question and its input now appear before the wide schedule table on phones. Relevant events have a visible marker and a “For this question” label. Duration questions identify one event; free-time questions identify the two neighboring events; whole-plan questions include every event.
- **The requested result waits for the learner.** The table withholds the current event duration or gap, and the total-span summary withholds the requested span. For a 24-hour conversion question, the relevant starting time remains in 12-hour form until the worked explanation or a correct answer is shown. Other schedule information remains available for reasoning.
- **An optional worked interval connects representations.** Learners can reveal friendly time jumps, proportional arcs, a text list of jump endpoints, and their sum. A correct answer also reveals this explanation. Opening it does not award points or mark the question solved; wrong answers remain retryable. A new question or schedule starts without the old worked answer.
- **Midnight remains explicit.** Worked jumps preserve absolute chronological order and attach “next day” to the appropriate endpoints. For the overnight observation, 11:30 PM → midnight → 12:15 AM becomes 30 + 15 = 45 minutes.
- **Phone readability is independent of SVG scaling.** Endpoint times are regular text beneath the diagram, with day labels that wrap. A visible sideways-scroll cue helps learners discover the table's length and gap columns. Existing dark and high-contrast treatments are retained.

## Verification

All 62 interaction and regression tests passed. All 18 final activity/theme browser cases passed runtime, automated accessibility, and 320-pixel page-reflow checks. Syntax, source/public byte equality, and scoped whitespace checks passed. Final results: `final-tests.json` and `final-browser-results.json` in the evidence folder.

Nine new interaction tests cover relevant rows, answer withholding, optional reveal without progress awards, free intervals, requested 24-hour conversion, total span including gaps, midnight ordering, question resets, retries, and stale worked-example isolation. Existing time parsing, challenge scoring, unique-solve protection, and elapsed-time behavior remain covered.

The browser fixtures use actual application styles, local React, English strings, and the tool module. Six activities are rendered in default, dark, and high-contrast themes at desktop and phone sizes, with automated WCAG A/AA checks and 320-pixel reflow checks. Phone screenshots were inspected directly; that review prompted the regular-text endpoint labels and table-scroll cue. The initial audit was also clean; one initial test selector targeted the unrelated progress summary and was corrected to scope to Schedule Planner.

Evidence and reproducible scripts are under `scratch/basic-math-pass7/`, including before-pass source, test results, browser audit results, and screenshots. The source/public pair is synchronized and 16 new English strings are registered. No broad build, staging, commit, or deployment was performed. Unrelated concurrent changes were preserved. These are component checks and do not establish classroom learning outcomes or full deployed-app coverage.
