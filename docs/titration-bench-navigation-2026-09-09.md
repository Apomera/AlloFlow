# Titration bench navigation — September 9, 2026

The bench now uses three illustrated cards for Full apparatus, Flask close-up, and Burette close-up. Each card includes a brief description, a visible selected border/check, and an accessible name and description. The SVG pictures are decorative apparatus icons; they do not represent live readings. Cards sit side by side on desktop and become horizontal rows on phones.

A separate Bench aids row exposes Explore colors and Measure volume from every close-up. Inspect addition is also available when the 3D bench is ready. Choosing an aid opens its matching close-up and shows the companion panel. The active aid has a gold highlight. A separate Live curve/Color guide/Reading lens control explicitly reports whether its panel is shown or hidden.

Direct launch retains the existing tool behavior: color previews do not change experiment data, the volume mark survives switching between aids, and the addition inspector remains a static illustration. Inspect addition now focuses its timeline, exposes an aria-controls relationship, and returns focus to its launcher on Escape or Return to live view. The other tools retain their existing focus and close behavior.

No chemistry engine, saved-record format, renderer, dependency, or animation loop changed. Source/public copies are identical. New English navigation strings are registered in the titration catalog; translations remain follow-up work.

## Validation

- All 100 targeted tests passed: 74 immersive/measurement tests, 15 motion/persistence tests, and 11 internationalization checks.
- A real Chromium fixture verified fresh mobile defaults, card names/descriptions/selected states, direct touch launches, matching close-ups, companion panel visibility, volume-mark retention, notebook and experiment preservation, stable viewer identity, native keyboard card activation, focus handoff, Escape, and addition-inspector return controls.
- All 24 WCAG axe scans passed across the three apparatus views in both 3D and 2D at 1200, 760, 360, and 320 pixel widths. No horizontal overflow or page errors were observed.
- Direct color and volume tools worked after WebGL context loss. The unavailable 3D addition inspector was omitted. Forced-colors keyboard selection and clean unmount were checked.
- Desktop, phone, and active-aid screenshots were visually inspected. Syntax, source/public byte parity, navigation English-fallback matching, and scoped whitespace checks passed.

The browser harness uses the actual widget, React, Three.js, and application styles in a local fixture. These are component-level checks, not a deployed-platform, complete accessibility, or physical-device audit. No deployment was performed.

## Evidence

Run `node reports/chemistry-refinement-2026-09-06/titration-navigation-browser.cjs` to repeat the browser checks. The same directory contains `titration-navigation-browser-results.json`, `titration-navigation-tests.json`, and desktop/mobile/active JPEG screenshots.
