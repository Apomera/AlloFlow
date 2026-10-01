# Steward decision previews and yearly evidence

## What changed

- Every Steward action opens a focused preview before spending hours. The preview shows its actual capped changes to quality, habitat connection, and community support, plus hours remaining. Apply and Cancel have explicit keyboard focus destinations.
- Each applied action preserves its before/after scores. Campaign years retain their original starting scores, including when multiple actions are applied.
- The year review follows a selected component through learner actions, routine change, the event, difficulty adjustment, and connected effects. These snapshots come from the existing calculations; the campaign equations are unchanged.
- Older saved campaigns disclose unavailable evidence. Their missing start-of-year state is not reconstructed from later scores.
- The interface explains that the scores belong to a simplified strategy game. They are not water measurements or forecasts. Cards have readable labels, larger action controls, and mobile layouts that fit 320 pixels.
- New copy and accessible labels use the existing translation fallback mechanism. English fallback strings are registered separately by the parent task.

## Verification

`node node_modules/vitest/vitest.mjs run tests/watercycle_steward_decisions.test.js --maxWorkers=1 --pool=threads --testTimeout=30000`

Six behavior tests passed: preview/apply agreement at score limits, action constraints, watershed-wide effects, immutable action receipts, annual reconciliation, and legacy saved-state handling.

`node dev-tools/watercycle_steward_decisions_qa.cjs`

Five browser workflow groups passed. Eight scoped axe audits covered the new decision and ledger sections at 1280 and 320 pixels in light and dark themes. No page errors or horizontal overflow occurred. The audits do not claim coverage of every pre-existing Steward control.

`results.json` contains the browser results. Screenshots include all tested theme/width combinations. The desktop decision preview and dark mobile ledger were visually reviewed for hierarchy, contrast, wrapping, and clipping.
