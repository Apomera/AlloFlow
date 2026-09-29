# Storm Lab and Steward visual refinement

The mode shells now share a warm paper, teal, and forest palette with their experiment and decision panels. Storm Lab has clearer heading hierarchy, readable control labels and values, a larger scene, and separated action rows on small screens. Steward has consistent place cards, more readable score tiles, forest action buttons, and clearer campaign summaries.

The changes are presentation only. Existing model inputs, calculations, actions, and stored evidence are unchanged.

## Verification

Run `node dev-tools/watercycle_mode_visual_polish_qa.cjs`.

- 18 full-mode browser and axe checks: Storm Lab, Steward setup, and Steward year at 1280, 390, and 320 pixels in light and dark themes.
- Zero axe violations and browser errors.
- No horizontal page overflow.
- All four Storm header buttons have separate, non-overlapping bounds.
- Storm scene remains near the top: above 500 pixels on desktop and 760 pixels on small screens.
- Two additional high-contrast Steward setup audits pass at 1280 and 320 pixels. Run `node dev-tools/watercycle_mode_visual_polish_qa.cjs --contrast-only`; details are in `results-contrast.json`.

The commit retains `storm-light-320.png` and `steward-year-dark-320.png` as representative screenshots. Other theme and viewport captures are generated locally by the script. Full check details are in `results.json`.
