# Nucleus builder: comparison flow

September 29, 2026

## What changed

The builder now guides learners from building nuclei to reviewing their saved comparisons, then to explaining the particle changes.

- A saved pair unlocks a shortcut to the comparison notebook.
- A partial comparison offers a return to the next build. It opens the controls and keeps the current draft intact.
- Once all three target nuclei are saved, the guide leads to the comparisons. Their next action leads to the explanation.
- An incorrect explanation offers a shortcut back to the same selected comparison. Completed work offers a shortcut to review the explanation.
- Each jump focuses the destination heading and scrolls its section into view. The mobile explanation landing includes its stage label, question, and answer choices.

Navigation preserves the draft, saved counts, selected comparison, prediction, notes, and earned progress. Saving remains an explicit action.

## Verification

- **81 unit tests passed**, including shortcut gating, focus, reopening collapsed controls, and state preservation.
- **All six nucleus browser scenarios passed** on the final source. They cover desktop and 320px layouts, keyboard operation, larger text, reduced motion, light and dark palettes, forced colors, saved work, and accessibility checks.
- The other **17 introduction and signal detective browser scenarios passed** in the full suite. Its new mobile flow scenario exposed the explanation scrolling issue; the six nucleus scenarios were repeated after that fix.
- Accessibility audits reported no WCAG A/AA violations in the tested workspace views.
- An isolated mutation that made the return shortcut replace Carbon-13 with Nitrogen-15 was rejected by the draft preservation assertion. Production source was unchanged by the mutation check.
- The four tool copies match and parse. All **412 active studio translation keys** match across the four registries.
- Static self-tests reject mirror drift, registry drift, a missing production loader mapping, and changes to the pre-existing lessons.
- Code outside the studio fragment matches the baseline captured before this pass. Scoped whitespace checks pass.
- The running preview serves the final scrolling change.

## Preview and evidence

[Open the nucleus builder](http://127.0.0.1:52674/__harness?experience=nucleus&intro=14)

- [Mobile comparison view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-flow-mobile-compare.png)
- [Mobile explanation in forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-flow-mobile-explain-forced.png)
- [Unit test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-flow-unit.json)
- [Mutation check log](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/mutation-nucleus-flow-draft.txt)

Changes remain uncommitted.
