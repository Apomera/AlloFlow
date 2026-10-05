# Dissection Lab: evidence beside explanations

October 2, 2026

The explanation checkpoint now shows the saved response to the action being explained. Learners can compare its tissue changes, open the full review, and return to their explanation.

## Improvements

- **Evidence at the decision point.** The checkpoint shows the matching action, recorded outcome, and input method. A later hydration action or another selected history record does not replace the pending explanation’s evidence.
- **Visible comparisons.** Clarity, exposure, stability, and risk show before/after numbers, paired bars, and plain descriptions of the change. Higher risk receives a caution treatment. Text explains the direction as well as color.
- **A complete review path.** “Read full response” selects the matching record and focuses its response heading. “Return to explanation” restores focus to the prompt. Reading, opening definitions, and navigating preserve answers, procedure state, notes, scores, and identification credit.
- **Clear handling of missing records.** Invalid or incomplete pairs remain “Not recorded.” Missing or truncated history explains that the detailed response is unavailable. Supported input is identified only when the saved action records it.
- **Guidance when useful.** Optional definitions explain the four measures. Evidence appears during explanation, while planning, performance, quizzes, and timed practicals retain their existing tasks.

The comparison helper now derives values from its supplied action record. This keeps the checkpoint and full history review independent. Score formulas and learning gates are unchanged.

## Verification

- **32 distinct local Chromium scenarios passed:** 18 for the new checkpoint and 14 existing review scenarios. Follow-up runs strengthened the keyboard assertion and checked the final missing-history wording. No retries, skipped cases, or flaky results.
- **349 regression tests passed:** canvas loop 3, reference workbench 149, workspace bands 106, and broad improvements 91.
- Five scoped checkpoint axe audits found **zero violations**. Phone, tablet, desktop, narrow embedded large-text/high-contrast, and forced-color layouts had no clipped text, clipped controls, or horizontal overflow. Controls were at least **48 pixels** tall; text was at least **14 pixels**, or **16 pixels** with large text enabled.
- A genuine six-action journey checks every saved response, including the second pin placement. Separate checks cover Undo, wrong-answer retention, duplicate timestamps, repeated actions, direct input, missing records, and partial values.
- Both renderer copies are byte-identical, parse successfully, and retain LF line endings. Final source SHA-256: `44b73ddc5643e15f318d7a58ea123e9d18b923896041bfbf930181773bcb9b1d`.

## Screenshots and results

- [Desktop checkpoint](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-reflection-evidence-2026-10-02/desktop-checkpoint.png)
- [Phone checkpoint](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-reflection-evidence-2026-10-02/phone-checkpoint.png)
- [Large-text evidence and definitions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-reflection-evidence-2026-10-02/embedded-large-evidence-expanded.png)
- [Genuine second-pin response](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-reflection-evidence-2026-10-02/journey-second-pin.png)
- [Verification data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-reflection-evidence-2026-10-02/verification.json)

Checks use the local renderer in GlHarness. The main browser run preceded a copy-only refinement from “was saved” to “is available”; three targeted browser checks verified that final wording. Existing review screenshots were captured in this report’s `previous-feedback` folder. Changes remain uncommitted.
