# Advanced math UI clarity — September 19, 2026

Continued the STEM Lab navigation review with Calculus, Algebra Solver, Inequality Grapher, Function Grapher, and Graphing Calculator.

## Applied changes

- Calculus: renamed Discover to Fundamental theorem and Inquiry to Explore derivatives. Six activities remain visible in a responsive grid.
- Algebra: renamed Builder to Equation builder, Scale to Balance equations, and Tutor to AI tutor. Five activities remain visible in a responsive grid.
- Inequality: renamed 2D Graph to Coordinate plane, including the keyboard shortcut legend. Added an accessible name to the mode selector. Both graph modes remain available.
- All three selectors have wrapping labels and a minimum button height of 44 pixels. Existing state keys, calculations, panel associations, and keyboard navigation are unchanged.
- Function Grapher and Graphing Calculator were inspected in source and left unchanged in this focused pass. Their graph controls and calculator/sidebar organization merit a separate, deeper interaction review.

## Validation

- 37 existing tests passed across six suites: calculus/algebra/inequality tab accessibility, calculus challenge correctness, algebra grading, and inequality engine.
- Component browser harness passed nine tool/theme combinations (default, dark, high contrast), each at 1120, 375, and 320 pixels: 27 viewport checks.
- All 13 activity tabs opened and had associated panels. Home, End, and ArrowRight navigation passed in every theme. Increased text spacing did not overflow the selectors. No browser runtime errors occurred.
- Source and desktop public tool mirrors match. Existing label-specific calculus test updated.
- Browser evidence: scratch/advanced-math-ui-clarity-2026-09-19/verification.json and PNG captures. Checks use the existing component harness with mocked application context, not a full deployed app session.

## Limits

New label keys use the existing translation helper with English fallbacks. The subsequent graphing UI pass resolved the catalog write issue and added these English keys to both source and public catalogs. Other languages continue to use the English fallbacks until translated. No deployment was performed.
