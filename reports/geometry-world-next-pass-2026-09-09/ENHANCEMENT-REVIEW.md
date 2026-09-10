# Geometry World: next enhancement review

This pass reviews the current implementation after the material, landscape, Studio, and print-workflow improvements. The strongest next gains are continuity, camera composition, and responsiveness. Additional scenery should follow those improvements so the creation remains the focal point.

## Corrections completed in this pass

| Finding | User impact | Correction |
| --- | --- | --- |
| Changing quality rebuilds the landscape while Studio holds a visibility snapshot of the old landscape. | Scenery can appear inside an isolated Studio presentation. | Preserve the visibility state and update the Studio restoration entry when scenery is replaced. |
| Selection glow layers use delayed callbacks that outlive the selection/world. | Old highlights can appear after a reset or during Showcase. | Own and cancel the timers, and guard delayed work against stale scenes and presentation state. |
| New dust motes bypass Studio's initial visibility snapshot. | Decorative particles can enter an otherwise clean presentation. | Suppress new ambient dust during Showcase. |
| Photo uses the composer whenever one exists, including Saver mode. | A saved photo can use effects disabled in the live view. | Choose the same rendering path as the active quality setting. |
| Saver still draws a separate faint edge object for every floor cell. | The 25-by-25 sandbox floor can spend hundreds of draw calls on almost invisible lines. | Suppress ground edge children in Saver; retain cell shading and build outlines. |
| The standalone selected-build STL fallback emits block units. | A one-block cube advertised as 5 mm downloads with 1-unit extents. | Apply the same millimetres-per-block scale used by Print Lab, including retained custom scale. |
| Removing the final selected block leaves its measurement in the UI. | A nonexistent selection still offers Showcase and measurement actions. | Clear only the stale student-selection result when that selection disappears. |
| Measuring the ground can replace the dock summary while a student creation stays selected. | Displayed size can describe the ground while Print and Showcase act on the creation. | Use the retained creation for dock count, print envelope, and Showcase caption; preserve the independent measurement inspector. |

The corrections above are implemented and verified. They improve the current experience; the larger proposals below remain recommendations.

## Recommended next work, in order

### 1. Make a build reliably resumable

The editable JSON export is already shape- and rotation-aware, but it is manual. Local storage currently covers preferences, lesson libraries, and lesson progress; it does not provide a durable recovery snapshot of the live student build. The complete Print Lab return project lives in a window variable. Print Lab deliberately consumes its pending payload on mount and keeps imported bytes and editable source in component memory, so leaving that tool can lose the model and Revise action while small form defaults remain.

Introduce a versioned local project draft and a separate resumable Print Lab draft. Store compact block data and source identity rather than Three.js objects; coalesce successful edit mutations into writes. Preserve lesson identity, shape, rotation, selection, camera, and physical print scale. Offer a clear Restore/Discard choice and a visible saved state. Keep the existing portable JSON export.

Acceptance: recover after reload; restore the correct lesson and geometry; resume Print Lab after ordinary navigation; retain custom scale; prevent a stale handoff from replacing a different project; handle storage failure without claiming the build is saved. Clearing a world and beginning a new project need explicit recovery semantics.

### 2. Frame the selected creation while building

Showcase already fits the selected geometry and restores the prior camera. The ordinary Front/Side/Top presets instead use the lesson focus and fixed radius multipliers. The scene overview lists authored lesson structures, and the student-selection actions offer Showcase, measurements, and clear selection. There is no equivalent selection-framing action that keeps the learner in the build workflow.

Add a **Focus creation** action for the live selection. Fit its transformed bounds against the actual camera field of view, aspect ratio, and space occupied by controls. Keep an obvious return to the previous camera. Use the same focus for repeatable editing views.

Acceptance: short, tall, wide, off-centre, and rotated fractional builds remain visible at desktop and phone sizes; camera transitions release held input and honor reduced motion; framing changes no block, history, measurement, or export geometry.

### 3. Give the creation more room on phones

The inspected 390-by-844 measurement view places a roughly 300-pixel inspector above a scene with movement controls, build actions, a shape tray, and a material tray. The controls are usable individually, but together leave relatively little unobstructed space for reading the creation.

Give the inspector compact and expanded states. The compact state should retain the selected build name, principal dimensions, and occupied volume; layer exploration and equation comparison can expand on demand. Reserve safe camera margins for whichever panels are open. Check 320-pixel phones and short landscape screens as part of the design, not only after desktop work.

Acceptance: primary measurements remain readable; the creation stays visible; every tool remains keyboard and touch accessible; expanding and dismissing the inspector preserves selection and focus. The cited phone screenshot predates the latest surface art pass and is used here only as evidence of the control layout.

### 4. Refresh selection analysis when the build changes

The builder refreshes its selection every 250 ms. It calls the full connected measurement before checking whether the resulting signature changed. The signature prevents repeated STL generation, but it does not prevent repeated connected-block traversal. The separate retained-summary cache only avoids duplicate work during React rendering.

Introduce a scene mutation revision covering place, remove, undo, redo, import, reset, and metadata changes. Invalidate analysis on that revision or a changed selection. Retain discovery of newly attached blocks; a cache based only on the old selection's coordinates would miss those additions.

Acceptance: an idle selection does not repeatedly traverse the build; connected additions, disconnected remnants, removals, rotations, material changes, and engine replacement update correctly; closing the inspector does not reopen it. Measure this on representative low-end hardware before claiming an FPS benefit.

### 5. Keep visual quality and motion preferences independent

The lifecycle audit also identified motion-policy work for a future focused pass: NPC bobbing is not uniformly gated by the ambient-motion setting, and an explicit Detailed setting can re-enable ambient motion despite the operating system's reduced-motion preference.

Treat texture/shadow quality separately from optional animation. A learner should be able to choose rich materials and lighting with restrained motion. Preserve movement required for navigation and learning while reducing decorative motion, automatic camera movement, and ambient effects according to the user's preference.

Acceptance: compare Auto, Saver, Balanced, and Detailed with reduced motion both on and off; include NPCs, dust, foliage/cloud motion, view transitions, and Showcase orbit. Any explicit in-app motion override should be clear and separate from graphics quality.

## Visual direction after these foundations

Keep the pine-and-ivory interface, natural material detail, and quiet Studio stage. The next visual work should improve composition and the legibility of the user's creation: more usable viewport space, consistent selected-build framing, and restrained surface detail that survives Saver and phone rendering. Ground-edge suppression is deliberately narrow; a wholesale instanced-block rewrite would have to preserve mutable per-block AO/tint, mesh identity, raycasts, layer visibility, cleanup, history, and exact STL extraction.

A further bounded graphics candidate is a quality-dependent budget for active torch lights. Each torch currently creates its own PointLight even in Saver. Retain each torch's visible emissive appearance while measuring a limited set of active lights; verify the result before choosing numerical caps.

Print size, profile fit, topology feedback, exact exported geometry, editable source, and the geometry-to-Print-Lab return path already exist. The next print-workflow investment should preserve and resume that work, rather than add another overlapping export interface.

## Final verification

199 tests passed across 14 focused files. Both Geometry World source files and their desktop copies parse and match byte-for-byte. The Print Lab source also matches its desktop copy.

The actual WebGL comparison held the camera, quality setting, and scene constant and toggled only floor edges: **1,514 → 912 draw calls**, saving **602 (39.8%)**. The scene retained 12,626 rendered triangles. This is a draw-call result for this view, not an FPS claim.

The browser verified unchanged block/edge buffers and object identities, placement raycast, edit history, and exact STL through Saver/Balanced changes inside and outside Studio. The 31,784-byte pavilion STL also matches the preceding art pass's SHA-256. No browser, console, or shader errors were reported. Root visually inspected the final Saver screenshot.

Standalone STL tests verify default 5 mm and retained 12.5 mm scales, vertex-by-vertex, while preserving normals and the unscaled editable handoff. Selection tests cover removal, partial edits, unrelated measurements, changed selection, and dock/export consistency. Lifecycle tests cover delayed effects, reset, teardown, Studio restoration, dust, Photo rendering, and floor-edge scope.

[Final Saver preview](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-next-pass-2026-09-09/saver-floor-edges-off.png>) · [Browser evidence](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-next-pass-2026-09-09/saver-ground-edge-results.json>) · [Test counts and source hashes](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-next-pass-2026-09-09/enhancement-review-summary.json>)

The earlier ground-edge test report records a test-fixture syntax failure. It is superseded by [the successful final ground-edge run](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-next-pass-2026-09-09/ground-edge-tests-final.json>); the final aggregation rejects failed or incomplete runs.

Supporting reviews: [Visual lifecycle audit](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-next-pass-2026-09-09/VISUAL-STATE-LIFECYCLE.md>) and the supporting flow/performance notes in this directory.
