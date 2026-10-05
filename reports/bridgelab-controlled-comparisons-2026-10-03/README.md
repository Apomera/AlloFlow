# Bridge Lab controlled comparison actions

October 3, 2026. Changes remain uncommitted.

## Experiment workflow

When several earthquake settings differ from a saved reference and damping or response mode differs, the comparison table now offers two actions:

- **Isolate damping change** keeps current damping and matches the response mode and ground-motion inputs to the saved reference.
- **Isolate response mode change** keeps the current mode and matches damping and ground-motion inputs to the saved reference.

An action is disabled if its chosen variable already matches the reference. The controls disappear once only one setting differs. They preserve predictions, explanations, scene writing, pinned time, inspected time, the interval disclosure, reference records and current view. Motion pauses. Scene comparison selects the current experiment and uses the same saved reference as the notebook comparison instead of an older captured pair. The action does not enable scene comparison or change the static bridge design.

Printed reports show the resulting changed settings without action controls. The existing multi-variable explanation remains in reports where multiple inputs differ. Buttons have at least 44 px height and wrap on phones; keyboard activation and a completion announcement are supported.

The single-mode physics model and energy accounting are unchanged. Isolating an input supports comparisons within this illustrative model and does not establish bridge safety.

## Verification

- Seven focused unit checks passed; 133 unrelated interaction checks were skipped.
- Seven browser workflows passed: controlled comparisons at desktop and 320 px, saved earthquake investigations at both sizes, notebook save/restore/print at both sizes and graphics recovery.
- Parsed source; identical canonical/public mirrors; 1,172 English fallback values match both registries.
- Desktop and phone controls inspected; browser horizontal-overflow checks passed.
- Scoped whitespace and staged-file checks completed; no staging or commits.

Run verification: node reports/bridgelab-controlled-comparisons-2026-10-03/verify.cjs

- [Desktop controlled comparison](bridge-1000-controlled-comparison.png)
- [Phone controlled comparison](bridge-320-controlled-comparison.png)
