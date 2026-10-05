# Bridge Lab: matching evidence to a claim

October 4, 2026. Changes remain uncommitted.

## Student experience

The Earthquake notebook now has an optional keyboard-accessible disclosure, **Match evidence to your claim**, beside the existing explanation field. Three cards connect a time window, a numerical reading, units and a sentence starter:

- **Whole event · 0–24 s:** peak relative motion in cm. The value stays fixed while the student scrubs through time.
- **At one moment:** kinetic plus elastic energy in J/kg at the exact inspected time, shown to three decimal places.
- **Across an interval:** damping loss in J/kg between the chronological pinned and inspected times. If the interval tool is closed, a prompt replaces the interval readings. Coincident endpoints show zero loss and an explanation.

Decorative rails show each window within the same 0–24 s timeline. The cards sit side by side on wider screens and stack on phones and narrow print views. Labels, times and numerical values provide the information without relying on colour or graphics. The disclosure starts closed so students can use the notebook at their own pace.

Printed rails use borders so their time windows remain visible when the report removes background colours.

A is the selected notebook reference; B is the current experiment. Both use the time windows shown in the scaffold, independent of the selected 3D scene or guided reference. Without a saved trial, the scaffold shows current evidence and explains how to add reference A. It identifies inputs and preserves small nonzero readings with scientific notation.

Sentence starters guide the student's writing. A final question links the observation to ground interaction, elastic storage or damping using the existing energy map and interval balance. The scaffold does not write a claim, change settings, save a trial or evaluate correctness. Existing prediction, explanation, guide and scene notes remain separate.

The current-draft section of the printed report includes the same evidence. Saved trial notes remain with their recorded inputs and times. When the live earthquake model is disabled, a report with saved trials recalculates current evidence from the current inputs, following the existing comparison. The report uses the assumed vibration model and modal energy per kilogram; it does not predict bridge damage or safety.

The energy-accounting caption now explains that changing experiment inputs can change its scale, so students should compare numerical values across experiments.

## Verification

- Complete immersive interaction suite: 159 passed, including four new source, time-window, small-value and print checks.
- Twelve real-WebGL browser workflows: three new evidence-guide workflows plus nine accounting, route and paired-interval regressions.
- After the print-only rail adjustment, all four guide interaction checks and the three guide browser workflows passed again. The final captures use this source.
- Browser checks cover 1000 px and 320 px layouts, keyboard disclosure, reference changes, stable event peaks, zero-length intervals, tiny readings, labelled 2D, printed draft and graphics loss/recovery with scene A selected.
- Canonical/public source mirrors and 1,231 literal English fallbacks in both registries verified; source parsed.
- Desktop, phone, print and graphics-fallback captures reviewed; overflow and JavaScript-error checks passed.
- Independent read-only review checked source attribution, shared time, chronological intervals, model wording and accessibility.
- Scoped whitespace checks passed. No staging or commits.

Run report verification: node reports/bridgelab-claim-evidence-2026-10-04/verify.cjs

- [Desktop evidence guide](bridge-1000-claim-evidence.png)
- [Phone evidence guide](bridge-320-claim-evidence.png)
- [Desktop printed draft](bridge-1000-print-claim-evidence.png)
- [Phone printed draft](bridge-320-print-claim-evidence.png)
- [Graphics fallback evidence guide](bridge-844-fallback-claim-evidence.png)
