# Anatomy inspection workspace — 2026-09-09

Focus model now opens a dedicated inspection layout for the included 3D body views. Desktop places a larger body canvas beside the regional, zoom, and angle controls. Phones use compact model selectors and a stacked layout. Model-source details and notes remain available after leaving focus mode.

Entering focus moves keyboard focus to the model. Escape exits the included-body inspection workspace and restores focus to the Focus model button. The camera, zoom, region, lighting choice, and renderer stay intact across the transition. Clinical, imported-model, and 2D focus modes keep their previous layouts and receive the appropriate exit instruction.

Close-ups use a smaller shadow-camera region, improving surface detail without enlarging the existing shadow map. Whole-body views restore the original shadow bounds.

## Validation

- Real Chromium WebGL inspection test passed: desktop column placement, view and renderer retention, Escape and button exit, restored keyboard focus, compact controls, phone angle changes, and no horizontal overflow at 390 px.
- 36 existing anatomy interface/model regression tests passed.
- Scoped Axe checks of the focus hint, toggle, model selectors, and camera toolbar found zero WCAG A/AA violations in light, dark, and high-contrast themes. This is not a whole-app audit.
- No browser page errors. JavaScript syntax and diff whitespace checks passed.
- Inspected desktop.png and phone.png; dark.png captures the dark-theme layout. The refined desktop screenshot was reviewed again after improving shadows.

Test: tests/e2e/anatomy-focus-studio.spec.ts. Evidence: accessibility.json, desktop.png, dark.png, phone.png.
