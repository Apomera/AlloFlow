# CircuitTool visual audit

Run the final audit from the repository root:

```text
node reports/circuit-visual-polish-2026-09-28/visual-check.cjs
```

The script retains all four onboarding workflows and adds five visual states at 1280, 390, and 320 pixels:

- Entire Simple hero and first-use guide: `[data-circuit-bench]`.
- Working 9 V bulb-and-switch circuit, with the parts shelf and schematic in one capture and inspector/readings in a second capture.
- Saved guided evidence after the live circuit has changed: `.circuit-lessons`.
- Open workbench guide: `.circuit-workspace-guide`.
- Completed target feedback: `[aria-labelledby="circuit-challenges-title"]`.

Each state runs axe at every width, checks document overflow, records primary-action sizes with a 44 × 44 px minimum, and checks keyboard focus visibility. Reduced motion remains enabled and primary-action transition durations are checked. The script saves 18 focused screenshots rather than a full-page image of the entire tool. Offscreen regions use page-sized capture bounds plus a specific clip.

`visual-results.json` includes the exact SHA-256 of the source injected into Chromium, plus the source hash at the end and whether the file changed during the audit. Source bytes are read once, so concurrent source edits cannot mislabel a capture.

`--baseline` puts its outputs in `baseline/` and reports style issues without failing on them. Behavior errors still fail. The initial baseline used SHA-256 `8bd4f6d605e0180e5147a0e7cf70f07943800ffe16aabcdcdee23a2a9ef39191`. It is partial: the first workflow passed, but an offscreen screenshot exceeded Playwright's default viewport bounds. The audit script was corrected to use the page bounds with the same focused clip. Root owns the final rerun and visual review after CSS changes. Prior onboarding evidence was not modified.
