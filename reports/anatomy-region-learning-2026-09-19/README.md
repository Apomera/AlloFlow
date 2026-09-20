# Region-aware anatomy learning — 2026-09-19

The included Surface and Blueprint viewers now offer an Explore this region panel. Camera jumps open relevant starting points for Head, Torso, Hand, and Feet; Whole body offers starting points in the current system. Cards reuse existing structure names, learner-level descriptions, and system labels.

Open in Blueprint selects the requested structure, clears obstructing search/study filters, resolves its system and anterior/posterior diagram, and raises detail only when necessary. A card explains any required detail increase before selection. The camera returns to a full-body frame so the selected pin is visible. Existing notes and progress are preserved, and the existing Read action opens the full explanation.

The panel follows region changes without rebuilding the model. Whole body defaults to a collapsed panel, and region jumps expand it. It is scoped to the Explore tab and included body views; 2D, Clinical Atlas, and local-model controls remain outside its scope. Desktop Focus model lays the cards across a full-width row; phones stack them.

Validation:
- 34 tests passed across anatomy_region_learning, anatomy_structure_browser, and anatomy_view_model_refinement.
- anatomy-region-learning Playwright scenario passed using the real local GLB/WebGL viewer.
- Verified automatic region updates, retained camera on lighting changes, keyboard activation, cross-system selection, anterior/posterior resolution, detail increases, visible Blueprint markers, reset behavior, and mobile layout.
- Scoped Axe checks of the panel reported zero violations in light, dark, and high-contrast themes. This is not a whole-application audit.
- Desktop and phone screenshots visually reviewed. No browser page errors or horizontal overflow in the tested phone layout.
- The first browser attempt found an ambiguous test selector for a structure shared by two groups; the selector was scoped to the intended group and the full scenario passed on rerun.
- JavaScript syntax, scoped whitespace checks, and source/runtime mirror hashes passed.

Evidence: desktop.png, phone-panel.png, accessibility.json.
