# Nucleus builder: notice the particle change

September 29, 2026

## Learner experience

Each saved comparison now offers a short “which count changed?” check. The learner chooses the proton or neutron count using the paired numbers and particle dots.

- A wrong choice gives a hint using the actual counts: both carbon nuclei have 6 protons, or the carbon-to-nitrogen pair has 8 neutrons each.
- A correct choice reveals the isotope or element takeaway and folds the choices into a compact summary.
- Keyboard focus moves to that summary when the choices fold. Learners can reopen it to review their choice.
- The pair switches use the nucleus names: Carbon-12 → Carbon-14 and Carbon-14 → Nitrogen-15.
- Each pair remembers its own response when switching comparisons or revisiting the builder.
- Restart clears the checks while keeping the earned takeaway and other introductions.

These checks are optional practice. They preserve the current draft, saved counts, notes, prediction, and completed introductions. The main explanation still requires the three saved target nuclei.

## Verification

- **86 unit tests passed**, including count-specific feedback, independent responses, focus after folding, malformed saved choices, restart, and preservation of existing work.
- **All eight nucleus browser scenarios passed.** Coverage includes desktop, 320px layouts, keyboard navigation, larger text, reduced motion, light and dark palettes, forced colors, resume behavior, and the existing builder-to-half-life flow.
- The tested workspace views have no WCAG A/AA violations reported by axe. The new answer buttons and review summaries meet the 44px target checked in the mobile scenario.
- An isolated mutation that marked every answer correct was rejected: the browser test expected retry feedback and received correct feedback. The mutation did not change production source.
- The four tool copies match and parse. All **419 active studio translation keys** match across their four registries.
- Static self-tests reject source and registry drift, a missing production loader mapping, and changes to the original lessons.
- Code outside the studio fragment matches the baseline captured before this pass. Scoped whitespace checks pass.
- The live preview serves the final comparison check and feedback styling.

## Preview and evidence

[Try the nucleus builder](http://127.0.0.1:52674/__harness?experience=nucleus&intro=15)

- [Desktop comparison takeaway](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-noticing-desktop.png)
- [Mobile check in the light palette](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-noticing-mobile-light.png)
- [Mobile check in forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-noticing-mobile-forced.png)
- [Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/nucleus-noticing-unit.json)
- [Mutation log](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/nuclear-experiment-studio/mutation-nucleus-noticing-answer.txt)

Changes remain uncommitted.
