# Standard Showcase camera views

Showcase now includes a compact, accessible **Perspective / Front / Side / Top** row above the existing image and exit actions. Each control has a 44 px target and reports its selected state with `aria-pressed`. It works in both Meadow and Studio and fits a 320 px viewport. The existing focus trap, keyboard orbit controls, Escape behavior, high contrast and reduced motion remain available.

Front looks from +Z, Side from +X, and Top from +Y with screen-up toward −Z. These are deliberate directions of the existing perspective camera. Orbiting from a standard view returns to the Perspective angle before rotating, so Top never produces an inert orbit control. Selecting Perspective resets the familiar three-quarter angle.

Framing projects every selected bounding-box corner into the camera basis, accounts for its depth, and fits it into space clear of the caption, orbit buttons and footer. It refits on resize and look/view changes. The camera's position, quaternion, up vector, field of view and far plane, plus fog and the dock state, restore exactly on exit. No mesh or STL data is changed.

Production edits are limited to `stem_lab/stem_tool_geometryworld_builder.js` and its identical desktop mirror.

## Verification

- Syntax passed and **40 focused builder / Print Lab integration tests passed** (`showcase-views-tests.json`).
- `verify-showcase-views.cjs` passed actual React + WebGL checks for **16 combinations**: four views × two looks × 1180 × 860 desktop / 320 × 700 phone.
- Every bounding corner remained inside the clear presentation area, with no clipping or horizontal overflow. All view buttons remained hit-testable and measured at least 44 px.
- Top's world direction and up vector were checked numerically. Button and keyboard orbit behavior returned to Perspective; opposite orbit steps restored their initial framing.
- The asymmetric pavilion contains **65 selected blocks**, including slabs, a quarter wedge and a pitched wedge roof. Its exported STL has **314 triangles**. The exact SHA-256 stayed `a756f1f2bc9d3fd6898ef9de033f7c753636f4fbd71edc627f653bade2409073` across every presentation change and exit.
- Blocks, shapes, rotations, positions, scale, selection and undo/redo history stayed unchanged. Camera position, quaternion, up, FOV, far plane, fog and dock state restored exactly after Escape.
- Actual Save image produced a valid **41,576-byte PNG**, at the renderer's **306 × 633** resolution.
- No page, console or shader errors were observed. Results: `showcase-views-results.json`.

Visually reviewed screenshots:

- `showcase-views-desktop-top.png`
- `showcase-views-phone-top.png`
- `showcase-views-phone-perspective.png`

The independent combined workspace verifier covers the surrounding touch and placement controls on the final shared source.


## Seamless Studio ground refinement

The finite Studio floor previously ended before the fog fully concealed its edge, producing a visible trapezoid behind the creation. The decorative floor now starts at 600 × 600 world units and grows during each Showcase fit. Its half-extent is at least the camera-to-creation distance plus the farthest view-frustum corner at the full-fog depth, with an additional radius + 10 margin. By the triangle inequality, every visible frustum point before full fog stays inside that extent on both world-floor axes. Resizing, changing view and changing look all recompute this conservative bound.

The floor remains **two triangles**. Only its decorative geometry size/scale changes; selected meshes and STL data do not.

Verification via `verify-studio-floor.cjs` passed on the existing **150-block pitched pavilion** at 1440 × 900 and 390 × 844, in Perspective and Top. All full-fog frustum corners remained **140.5–244.3 world units inside** the floor perimeter. The exact 634-triangle STL hash stayed `4320e16c857d3aa501d4035ce761621748cd45e75d65d9417947f9263cb2fb1a`; blocks, selection history, camera position/quaternion/up/FOV/far and fog restored exactly. No page, console or shader errors occurred. The focused **40 builder / Print Lab tests passed** again.

Both actual-render screenshots were visually inspected and show a continuous ivory backdrop with no floor edge: `studio-seamless-desktop.png` and `studio-seamless-phone.png`. Machine-readable results are in `studio-floor-results.json`; focused tests are in `studio-floor-tests.json`.
