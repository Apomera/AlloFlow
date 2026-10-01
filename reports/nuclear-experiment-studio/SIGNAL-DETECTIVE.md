# Signal detective — 2026-09-29

Nuclear Lab now has an optional investigation that connects the distance and shielding introductions. A fixed source produces a lower detector signal after two changes. Learners predict what caused the drop, choose comparison tests, and explain the evidence.

## Learner experience

- The studio offers Signal detective in a closed panel. Starting it opens a separate experience with the existing workspace navigation.
- Learners can move closer while keeping the lead, remove the lead while keeping the distance, or undo both changes.
- Selecting a plan preserves the last measured reading. Running a comparison updates the scene, announces the result, and records a notebook row.
- After a recorded test, two bars compare its expected signal with the mystery reading on a shared 0–100% scale. Text labels, values, and an accessible chart description accompany the bars. A short sentence identifies what stayed fixed.
- A next-step shortcut prepares the missing separate comparison and focuses the Run button. Preparing a test preserves the last reading, notebook, notes, and earned discoveries.
- Once both effects are checked, an explanation shortcut focuses the question. It does not submit an answer or award progress.
- Undoing both changes restores the original reading, but does not count as checking either effect separately. Repeated tests update their row.
- Both single-factor comparisons are required before explaining the result. An incorrect explanation can be revised.
- After a supported explanation, the comparison controls fold into a keyboard-accessible review panel.
- Progress and the optional takeaway remain saved while reviewing an introduction, changing workspace views, or restarting the tests. The six introductory discoveries retain their existing progress count.
- Measured distance and shielding appear in readable text alongside the diagram. Forced colors use system colors for diagram labels and outlines.

## Model

The investigation combines the existing inverse-square distance model with the lab's lead attenuation coefficient for its 1 MeV gamma teaching model. Relative expected signal is **100 × exp(−μ × lead thickness) / distance²**, with distance in metres relative to the original 1 m setup and thickness in centimetres. The existing lead coefficient is 0.771 cm⁻¹.

The original unshielded 1 m setup is 100%. The 2 m setup with 2 cm lead gives 5.3%; moving to 1 m while keeping the lead gives 21.4%; removing the lead while keeping 2 m gives 25.0%.

The model notes link to [OSHA's explanation of distance and shielding](https://www.osha.gov/ionizing-radiation/control-prevention) and [NIST's exponential attenuation law](https://physics.nist.gov/PhysRefData/XrayMassCoef/chap2.html). This combination is a teaching model using the tool's existing coefficient. It omits detector background and photons scattered into the detector.

## Verification

- **61 unit tests passed**, including evidence requirements, malformed saved state, notebook retention, actual versus planned setups, progress preservation, folded controls, next-step focus, chart scale, explanation navigation, and synchronized translation fallbacks.
- **All 17 browser scenarios passed in one run:** 13 studio scenarios and 4 investigation scenarios. The investigation checks cover keyboard focus and reopening, saved notes, measured bar proportions, preparing tests without recording evidence, 320px with larger text, reduced motion, light/dark themes, forced colors, and targeted axe scans using the real app stylesheet.
- An isolated mutation replaced inverse-square distance with inverse distance. The browser check rejected 10.7% in place of 5.3%.
- A second isolated mutation counted undoing both changes as one isolated effect. The browser check rejected the false evidence count. Both mutation runs confirmed that production source was untouched.
- A third isolated mutation made the setup shortcut record the proposed comparison immediately. The browser check rejected 25.0% in place of the previous measured 21.4%. Production source stayed untouched.
- The integration verifier and its negative cases passed: four source mirrors, active keys in four registries, production loading, and preservation of the earlier lesson implementation.
- Scoped whitespace checks passed. Screenshots of the guided comparison, 320px completion screen, light theme, and forced colors were visually reviewed. All four module copies and 333 active translation keys match. A separate comparison against this turn's baseline confirmed that all code outside the studio was preserved.

The changes are local and uncommitted. Unrelated workspace and registry edits were preserved.
