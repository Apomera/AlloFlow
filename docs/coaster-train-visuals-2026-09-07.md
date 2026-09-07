# CoasterLab train visual refinement — 2026-09-07

The train now uses shared beveled car bodies and individual upholstered seats with outer shells and headrests. Higher resolution wheels have metallic outer rings; the lead car has visible headlight bezels, a bumper, and a small grille. Theme colors extend to the seat shells and metalwork. Far-side row plates no longer display reversed lettering.

Train view in the Build introduction frames the front car and enters Scene focus. Keyboard focus moves to Restore panels, including on narrow screens, so editing remains easy to return to. The camera uses physical car bounds rather than including the headlight beam. Close inspection has a lower minimum camera distance while whole-coaster framing retains its existing minimum.

FX Lite hides the extra wheel rings and grille along with the existing optional effects. The simulation, train spacing, restraint selection, row telemetry, and reduced-motion behavior retain their existing implementation.

Validation:
- 262 unit tests passed across the CoasterLab and camera framing suites.
- Real Chromium/Three.js browser coverage checks keyboard entry, all four themes, analysis invariance, FX Lite, eight-car selection, portrait framing, and returning to Build.
- Desktop daylight/neon and phone screenshots inspected visually.
- Canonical and desktop copies match byte for byte; targeted git diff whitespace check passed.

Browser spec: `tests/e2e/coaster-train-visuals.spec.ts`.
Final screenshot folder: `scratch/coaster-train-final/`.
