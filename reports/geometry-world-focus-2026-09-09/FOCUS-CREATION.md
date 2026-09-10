# Geometry World: focus the creation

This pass makes the selected creation easier to inspect while continuing to build. It also separates optional world motion from graphics quality.

## Focus creation

Select a student build and choose **Focus creation** in Free Build Studio. The dock collapses, the measurement inspector closes, and temporary measurement graphics clear. The selected blocks remain selected.

The camera uses the transformed bounds of the actual block geometry, including rotated fractional shapes. It fits those bounds into a clear rectangle between the visible editing controls. The fit accounts for perspective depth, field of view, zoom, aspect ratio, camera height, and clipping planes. It keeps the ordinary camera projection, so placement raycasts use the same coordinate system.

A compact **Previous view** control restores the saved camera position, orientation, up vector, field of view, far plane, fog distances, and dock expansion state. Repeated focusing retains the original return view. The transition lasts half a second and becomes immediate with reduced motion.

Passive keyboard focus keeps placement previews and picking available without letting gravity or FOV easing undo the framing. Walking/flying mode is preserved. Deliberate movement or looking takes over from the camera transition. Resizing refits the creation until the learner takes manual control. Scene resets, Home, guided tours, evidence views, Showcase, and engine cleanup release the focus state and its pending animation callbacks.

Focus is an editing aid, separate from the existing Meadow/Studio Showcase. It changes no block, material, rotation, measurement value, edit history, or exported triangle.

## Motion and graphics quality

Detailed graphics now honor the operating system's reduced-motion preference without dropping the chosen material, shadow, and resolution settings. Optional NPC bobbing, patrol, rotation, blinking, pulses, and answer particles stop while interaction and answered-state cues remain available. Existing dust is removed when optional motion is disabled.

This pass also fixes an answered-NPC rendering exception: a later function-scoped THREE declaration could leave THREE undefined before color construction.

The OS preference is sampled on initialization and graphics-profile application. Live media-query listening and camera head bob/shake remain outside this pass. Broader automatic project recovery and persistent Print Lab drafts remain future work.

## Verification

254 tests passed across 13 focused files. Both Geometry World source files parse and match their desktop copies byte-for-byte.

The final actual-browser pass checked desktop 1440×900, phone 390×844, and narrow phone 320×700. Projected geometry stayed inside the clear area, and the return control stayed separate from touch look settings. It verified released input and velocity, passive walking-mode stability, deliberate navigation takeover, exact Previous view, focused resize, fog/cycle suspension, and full-size bounds during the placement pop. Desktop and narrow-phone screenshots were visually inspected.

Showcase Top and the Print Lab roundtrip passed: 45 selected blocks produced the same 15,684-byte STL, and returning restored the complete 46-block fixture with exact selection, history, and camera. No browser, console, or shader errors were reported.

The initial browser report records the velocity and narrow-screen issues discovered during development. The final report supersedes it after both corrections. The verified phone layout keeps all primary edit controls; its available drawing area is necessarily smaller than desktop.

[Desktop preview](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-focus-2026-09-09/focus-final-offcenter-1440x900.png>) · [Phone preview](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-focus-2026-09-09/focus-final-offcenter-320x700.png>) · [Browser QA](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-focus-2026-09-09/FOCUS-CAMERA-QA.md>) · [Tests and source hashes](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-focus-2026-09-09/focus-pass-summary.json>)

[Camera-fit derivation](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-focus-2026-09-09/CAMERA-FIT-REVIEW.md>) · [Reduced-motion changes](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-focus-2026-09-09/REDUCED-MOTION.md>)
