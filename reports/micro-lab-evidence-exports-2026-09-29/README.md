# Micro Lab: export evidence and find recoverable work

Resistance comparisons and quiz attempts now have evidence downloads. Home finds recoverable Growth trials, while restored IDs and microscope estimates receive stricter validation.

## What changed

- **Resistance comparison downloads:** The TXT report identifies A and B, shows shared-round counts and differences, and includes both full saved histories with their original settings and notes. CSV separates shared-round counts from each snapshot's ending counts. Share differences use percentage points; extinct shares remain undefined. Reversing A and B reverses the differences. Both exports preserve the live culture, playback, saved snapshots, notes, and review selection.
- **Quiz evidence:** Download the current attempt before starting a new quiz. A submitted report includes every original answer and its original score, followed by separate checked, unchecked, or unanswered practice evidence. An incomplete attempt exports strict valid working choices without scores, solutions, explanations, or practice outcomes. Downloads preserve answers and XP, announce success or failure locally, and support retry.
- **Growth recovery on Home:** A valid removed trial counts as recoverable work while the active saved-trial count stays unchanged. Home prioritizes a shortcut to review that trial. It opens the recovery action without restoring anything. A full imported notebook opens the focusable recovery panel so the capacity limit remains visible.
- **Restored IDs:** Growth reserves retained valid IDs and the removed-trial ID before repairing damaged or duplicate IDs. Restored selections and Resistance comparison choices must refer to valid original IDs. A missing ID cannot silently bind to a newly repaired record. Explicit learner selection can establish the repaired record's stable identity, which survives subsequent notebook changes and JSON reloads.
- **Microscope input:** Decimal and scientific notation follow the native number field's syntax. Hexadecimal, whitespace-wrapped, leading-plus, and trailing-dot spellings remain unfinished drafts. Positive nanometer values that convert to zero cannot become checked evidence. Valid current and previous results remain intact while an invalid working estimate is corrected.
- **Focus:** Quiz transition callbacks cancel after another action, navigation, or remount, including actions on the shared tabs and topic-library control. Growth headings and the recovery panel receive the same visible focus outline as its controls.

## Evidence limits

Resistance comparisons align saved observations at their latest shared round. The snapshots may belong to the same run, and their differences do not identify a causal setting. Quiz evidence describes one attempt; practice never changes its original score. Growth recovery retains only the most recently removed trial and ends when another trial is removed, a new trial is successfully saved, or Keep removal is chosen.

## Validation

- **320 unit checks passed across 13 files**, including 43 new cases for exports, restored identities, recovery navigation, focus cancellation, and decimal estimates.
- **20 Chromium scenarios passed without retries or skips.** Seven new scenarios verify downloaded TXT and CSV content, keyboard focus, unchanged saved evidence, JSON reloads, Growth recovery, and microscope correction. Thirteen existing scenarios cover saved-work recovery, guided resume actions, and Growth inspection downloads. The browser used the local working tree.
- Reviewed four phone screenshots at widths from 320 to 390 pixels. Comparison controls and tables, quiz download feedback, Home recovery, and microscope errors remain readable without clipping.
- Canonical and desktop runtime files match byte for byte. Both Micro Lab translation namespaces match, with 1,605 extracted keys, no missing entries, and no stale changed fallbacks. JavaScript syntax and scoped whitespace checks passed.

Machine-readable results: [validation summary](validation-summary.json), [unit results](unit-results.json), [browser results](browser-results.json), and [translation audit](translation-audit.json).

Phone views: [Resistance comparison](resistance-comparison-export-phone.png), [quiz evidence](quiz-evidence-export-phone.png), [Growth recovery](growth-recovery-home-phone.png), and [microscope validation](microscope-decimal-validation-phone.png).
