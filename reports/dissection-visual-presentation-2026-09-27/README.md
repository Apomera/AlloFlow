# Dissection Lab visual refinement

## Changes

- Light and material effects now follow the existing specimen outlines, including orientation and movement transforms. Broad ellipse masks previously painted visible patches on the tray.
- Contact shadows and preservation-fluid shading fade smoothly in both directions. Their gradients now use the same proportions as their ellipses.
- The frog has softer highlights and stronger shading around its flanks.
- The stage uses a lighter frame, a quieter tray, and a clearer specimen heading.
- Essentials leaves more space for anatomy by hiding the detailed system legend, instrument bay, duplicate orientation panels, tray grid, and redundant progress stripe. Labels, the access corridor, and the calibrated direction/scale card remain visible. Advanced and fullscreen retain the detailed guidance.
- Removed the older decorative scale marking that overlapped the calibrated scale card.

## Visual review

Screenshots use the real module in Chromium with the app stylesheet. The gallery covers all seven specimens, internal frog and eye views, and a 390 px phone viewport.

| View | Before | After |
| --- | --- | --- |
| Frog surface | [Before](before/frog-skin.png) | [After](after/frog-skin.png) |
| Frog organs | [Before](before/frog-organs.png) | [After](after/frog-organs.png) |
| Perch | [Before](before/perch-skin.png) | [After](after/perch-skin.png) |
| Heart | [Before](before/sheepHeart-skin.png) | [After](after/sheepHeart-skin.png) |
| Eye | [Before](before/sheepEye-organs.png) | [After](after/sheepEye-organs.png) |
| Crayfish | [Before](before/crayfish-skin.png) | [After](after/crayfish-skin.png) |
| Earthworm | [Before](before/earthworm-skin.png) | [After](after/earthworm-skin.png) |
| Pig | [Before](before/pig-skin.png) | [After](after/pig-skin.png) |
| Phone | [Before](before/phone.png) | [After](after/phone.png) |

## Verification

- Canvas lifecycle and workspace tests: **109 passed** (`unit-results.json`).
- Final visual/browser checks: **11 passed** (`final-browser-tests.log`), including all specimens, phone/high-contrast presentation, illumination boundaries, Advanced mode, and fullscreen.
- Mouse incision, touch incision, and probe feedback: **3 passed** (`browser-tests.log`).
- JavaScript syntax checks and scoped whitespace checks passed.
- Canonical and desktop Dissection Lab files match byte for byte.

The browser gallery verifies rendering and layout, rather than comparing pixels against a fixed image baseline. The lighting regression separately compares pixels inside and outside the frog while changing illumination in dorsal and ventral views.
