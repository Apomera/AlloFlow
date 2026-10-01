# Signal detective: review saved readings

September 29, 2026

## What changed

After recording two distinct tests, learners can choose a saved test to review its diagram and signal. The scene, comparison bars, setup description, and highlighted notebook row follow that choice.

- The selector offers only recorded tests, with their signal percentages.
- Reviewing keeps the next planned test, saved evidence, prediction, notes, and completed introductions intact.
- Running a new test displays its result immediately, even when an older result was being reviewed.
- Repeated runs update the existing row and retain one record per test.
- The selected review survives leaving and revisiting the investigation. Restart clears it while keeping an earned takeaway.
- The setup caption now says “Saved test,” so reviewing an older result is clear.
- The selector supports keyboard use, larger text, and forced colors. The current notebook row also has a visible marker and an accessible current-state attribute.

## Verification

- **92 unit tests passed**, including review gating, unchanged plans and evidence, newly run readings, invalid review targets, resume, restart, and retained notes.
- **All six signal detective browser scenarios passed.** They cover the existing investigation flow and the new review behavior on desktop and at 320px, with larger text, reduced motion, light and dark palettes, and forced colors.
- Keyboard review keeps focus on the selector. The mobile target is at least 44px high, and the tested views have no horizontal overflow.
- Accessibility audits reported no WCAG A/AA violations in the tested workspace views.
- An isolated mutation that ignored the review choice was rejected: the test expected the saved 21.4% reading and received the latest 25.0% reading. Production source remained unchanged by the mutation check.
- The four tool copies match and parse. All **422 active studio translation keys** match across their four registries.
- Static self-tests reject mirror drift, registry drift, a missing production loader mapping, and altered original lessons.
- Code outside the studio fragment matches the baseline captured before this pass. Scoped whitespace checks pass.
- The local preview was restarted after the workspace session changed. Its served module includes the saved-reading selector.

## Preview and evidence

[Try signal detective](http://127.0.0.1:51985/__harness?experience=signal&intro=16)

- [Desktop review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/signal-review-desktop.png)
- [Mobile review in the light palette](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/signal-review-mobile-light.png)
- [Mobile review in forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/signal-review-mobile-forced.png)
- [Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/signal-review-unit.json)
- [Mutation check](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/mutation-signal-review-reading.txt)

Changes remain uncommitted.
