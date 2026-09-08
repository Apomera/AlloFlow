# CoasterLab boarding details - 2026-09-08

Boarding gates now have deck-mounted posts, base plates, anchor bolts, hinges, lower rails, and four vertical members per panel. The complete panels use the existing dispatch pivots, preserving opening and closing behavior. The six posts meet the platform surface at local y=0.55.

Bay plates identify BAY 01, 02, and 03 on both platform edges. Each plate has independent front-facing surfaces on both sides so numbers never appear reversed. Shared canvas textures keep the cream-on-dark lettering consistent across themes. Station Explorer's Platform hint now points learners to the numbered bays.

FX Lite hides the small anchor bolts while retaining posts, framed gates, and bay labels. Existing station dimensions, camera bounds, and coaster analysis are unchanged.

Validation:
- Chromium/Three.js browser test passed (2.4 minutes): grounded posts, finite geometry transforms, front-facing plates, daylight/neon/blueprint rendering, FX Lite, phone framing, unchanged analysis, dispatch opening and closing, and zero page/shader errors.
- 236 regression checks passed on the first run. Two checks depended on an existing comment phrase; restoring that phrase made both pass on targeted rerun (238 total passing checks).
- Desktop daylight/neon and phone captures reviewed visually.
- JavaScript syntax and targeted whitespace checks passed.
- Canonical and desktop copies are byte-identical UTF-8 LF. SHA-256: dca210094a1b04562a2bb1109251b4893c8f823afb84d744098a638944289e40.

Browser spec: `tests/e2e/coaster-boarding-details.spec.ts`.
Screenshots: `scratch/coaster-boarding-details/`.
