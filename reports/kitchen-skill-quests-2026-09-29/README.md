# Kitchen interaction and visual enhancements

Added optional skill quests for preparation, pan exploration, and sauce finishing. Quest steps follow accepted recipe actions and the current cooking model. Selecting a quest and opening a tool do not create cooking evidence or advance time. Mouse, touch, and equivalent keyboard cooking methods share the same progress rules.

The compact panel starts collapsed, moves with the expanded kitchen, and provides observations and prerequisite-aware tool routes. Supplied rescue preparation earns no learner progress. Replay exploration is read-only. A new splash or released tomato juice requires another fold and sauce check; quest completion indicates practice, not dish quality or physical proficiency.

This change also includes the preceding kitchen work: live movement coaching, an illustrated ingredient field guide, detailed cookware and ingredient materials, observable cooking surfaces, and prepared mushroom and tomato shapes. All assets remain local and are mirrored in the desktop runtime.

Validation on 2026-09-29:

- All 27 kitchen unit suites passed: 299 tests. After the final prerequisite refinement, all 15 quest tests passed, including one additional prerequisite case (300 distinct tests across the runs).
- The quest browser check exercised a real 3D mushroom turn and circular mixing gesture, keyboard preparation and sauce inspection, progress restoration, the expanded kitchen, a 320px layout, and graphics-loss fallback.
- Three axe scans passed with zero violations: completed quest, 320px text view, and graphics-loss fallback.
- JavaScript syntax, local asset references, whitespace checks, and all 32 recipe runtime files matching the desktop mirror passed.
- The preceding visual, ingredient, gesture, cooking-surface, and prepared-food checks are reproducible with the corresponding `dev-tools/kitchen_recipe_*_qa.cjs` scripts. Raw results and screenshots are local verification artifacts.

Run the new browser check with `node dev-tools/kitchen_recipe_quests_qa.cjs` while the local Kitchen Studio preview server is running. Set `KITCHEN_RECIPE_URL` or `KITCHEN_QA_OUT` to override its URL or output directory.

The submitted-cook browser replay check also passed: historical quest observations follow the chosen replay frame, both tool launch methods stay locked, and saved cooking evidence is unchanged.
