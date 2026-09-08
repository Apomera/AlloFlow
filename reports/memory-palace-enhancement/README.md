# Memory Palace enhancement

The standalone Method of Loci activity now has a more legible 3D environment and a clearer guided practice interface.

## Changes

- Permanent room landmarks with four distinct geometric silhouettes, illuminated thresholds, gallery paneling and light strips, a compass plaza, and paths from the hub to each room. Landmark ticks use instanced geometry to limit draw calls; no new external assets or services are required.
- Distance fog clears in overview so room geometry remains readable, and returns during the walk.
- Architectural artwork for unfurnished frames and contrast-aware route-number badges.
- Named route destinations, larger touch targets, visited-stop markers, visible keyboard focus, and reduced-motion and forced-color support.
- Expandable long mnemonic cues in a bounded scrolling panel; short cues stay compact. Added practice guidance accommodates visual imagery, sounds, feelings, and verbal cues.
- Completion tracks stops actually visited in this walk. Jumping to the end no longer claims the whole route was visited. Starting another walk resets that count and returns keyboard focus to the scene.
- Placement mode clears the map and cue overlays so learners can click floor locations. Recall continues to hide answer-bearing cues and destination labels.
- Source changes are mirrored in `desktop/web-app/public/memory_palace_module.js`.

## Review

The `before` and `after` folders contain desktop scene captures. The `after` folder also includes mobile, pasture, and space previews.

Regenerate screenshots with `node dev-tools/memory_palace_visual_qa.cjs`.

Logic regression command:

`npx vitest run tests/memory_palace.test.js tests/collaborative_memory_palace.test.js --maxWorkers=1`

Real WebGL regression command:

`npx playwright test tests/e2e/17-memory-palace-gl.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line`

The scene suite uses deterministic software WebGL without video capture. New checks cover landmarks, truthful progress, long cues on small screens, and recall concealment. An initial map-overlay placement regression was corrected and the affected placement tests rerun.

Changes are local workspace changes; publishing was not part of this task.

## Room experience follow-up

- Added Room view (button or R): inspect the current room from its doorway and resume the same memory stop. Keyboard focus and normal camera zoom return to the guided scene. Overview works directly from free roam.
- Added coffered gallery ceilings, automatically hidden in overhead map view and restored for exploration.
- Added Begin walk with route-size context, plus Visit remaining stops at the end of an incomplete walk; previously visited stops remain recorded.
- Short cues remain readable at narrow widths and increased text size; expanded long cues reset when moving to a different stop.
- Added desktop room.png and mobile-room.png previews in the after folder.
- Browser verification: all 18 real WebGL scenarios passed, including the four new room-view and practice-flow checks.

## Touch and input refinement

- Room exploration now includes four native, keyboard-accessible step and turn buttons with at least 44px touch targets. Steps respect existing room walls, turns are predictable 30-degree increments, and Resume stop preserves the guided position.
- Room status can wrap to two lines, with a bounded control group above the route dock. The mobile-look-left.png preview demonstrates inspecting a wall memory on a portrait screen.
- Keyboard walking uses elapsed frame time and normalizes diagonal speed. Movement stops when scene focus is lost, the window blurs, a panel opens, or rendering pauses.
- Canvas dragging captures the primary pointer, handles touch cancellation, and releases capture on teardown. Cancelled drags cannot accidentally place a memory. Browser modifier shortcuts and composition input are left available.
- Free-roam status no longer reveals nearby answer labels during recall.
- Logic verification: 124 tests passed. All 21 browser scenarios passed across the full run and targeted reruns. The caption scenario now waits for rendered camera and typography state, replacing a timing-sensitive fixed delay.
- Desktop and mobile screenshots were regenerated and visually reviewed. Standalone and desktop source files match.

## Gallery visual refinement

- Warm limestone and plaster tones replace the all-over cool floor tint; room colors remain in runners, thresholds, frames, and route markers.
- Shared arched landmark panels and inset ceiling light panels create stronger architectural depth, with no new real-time lights, shadow maps, or external assets. Ceiling details hide with the canopy in overview.
- Soft radial picture-light washes replace the rectangular glow. Lower fog and balanced lighting preserve wall and frame detail.
- Higher-resolution numbered cards use four deterministic abstract compositions, fine double borders, and clear serif route numbers. Generated and student-supplied images still replace these placeholders normally.
- Refined focus panels and navigation surfaces maintain keyboard focus, reduced-motion and forced-color treatments.
- Portrait guided framing includes room for the frame molding and captions, respects wall boundaries, and refits when the viewport changes. Free exploration keeps its camera position during resize, and manual zoom remains available.
- Updated room, walk, overview, and mobile captures have been visually reviewed. The portrait preview now shows the entire memory frame and its caption.

Verification for the gallery refinement: 124 logic tests passed. All 22 browser scenarios passed across the main run and targeted reruns, including the new portrait camera test. Source syntax, whitespace, and desktop mirror equality were verified.

## Display and journey-map polish

- Brass gallery frame cases now surround a slimmer colored inlay. The inlay retains the existing focus, loading, and recall-result colors. A shared ring geometry adds one mesh per gallery frame; open-air themes keep their original framing.
- Cream gallery caption plaques use dark text, fine edging, and a small room-color marker. High-contrast mode retains its black background and yellow lettering, and caption refreshes preserve the plaque treatment when text settings change.
- Journey destinations are numbered rows with wrapping labels, clear visited/current states, and room headers whose SVG symbols echo the 3D landmarks. The panel uses available height above the dock and scrolls when needed.
- Consistent decorative SVG icons replace the map, home, and navigation glyphs while native button names and actions remain intact.
- Cue prose is larger and lighter, with more line spacing to distinguish it from the heading and route metadata.
- The visual-review script now also captures mobile-overview.png. Gallery, overhead-map, and portrait views were reviewed during this pass.

Verification for display and map polish: all 124 logic tests and all 22 real WebGL browser scenarios passed. The final desktop and portrait journey-map captures were visually reviewed; source syntax, whitespace, and desktop mirror equality were checked.

## Entrance and wayfinding refinement

- Added an eight-point brass compass rose, a dark central stone inlay, and a mosaic perimeter to the hub. Repeated details use instanced meshes and sit flush with the plaza.
- Framed the entrance orb with three static brass armillary rings and matching plinth collars. The opening camera now includes more of the plinth base and plaza.
- Added subtle vertical threshold lights to gallery doorways.
- Room-name plaques sit above doorways during the walk and move to room centers in overview. Existing room focus, relationship highlights, and typography scaling remain active.
- Extended the existing canopy/overview browser check to verify both room-sign positions and their restoration on returning to exploration.

Entrance verification: 124 logic tests and 9 targeted browser scenarios passed. The three scene/navigation scenarios also passed after the final camera adjustment. Desktop and portrait entrance previews can be refreshed with `node dev-tools/memory_palace_visual_qa.cjs --entry`.

## Atmosphere and motion refinement

- Stars, entrance sparkles, and dust share a soft circular texture. The orb halo is smaller and quieter, with transparent edges that remove the square particle appearance.
- Room runners now have a finer woven pattern, subtle edge shading, double stitched borders, and restrained directional chevrons.
- Baked contact shading along gallery floor edges grounds the walls without new lights or real-time shadow maps.
- Guided position and look transitions now use elapsed time to preserve the 60 Hz pace across different frame rates. Reduced-motion navigation remains immediate; existing pause timing and wall-aware free movement remain intact. Dust drift and halo rotation also use time-based motion.
- Regenerated and reviewed desktop room, entrance, overview, open-air theme, and portrait room captures. Standalone and desktop module copies match.

Atmosphere verification: all 124 logic checks and all 22 real WebGL browser scenarios passed. Source syntax, whitespace, and desktop mirror equality were verified.

## Picture display and lighting refinement

- Gallery frames now have warm ivory inserts and fine light/dark inner bevels. Artwork dimensions and the status-colored inlay remain unchanged, preserving existing focus, loading, and recall feedback.
- Picture lights now use a slim brass cylindrical hood, two support arms, and a warm underside diffuser. Shared fixture geometry replaces the fully glowing front bar without adding scene lights.
- Active room lighting and doorway accents stay steady. The active stop marker and frame inlay retain their existing focus animation and reduced-motion behavior.
- Desktop stop, room, and portrait stop previews were regenerated and visually reviewed; the full frame and caption remain visible on mobile.
- Removed an obsolete source-string assertion for the old pulsing-light variable; existing active-room light positioning and portal-state checks remain.

Display-lighting verification: all 124 logic tests and 11 targeted real WebGL scenarios passed, including complete-route navigation, multilingual captions, recall concealment, portrait framing, touch exploration, and teardown. Source syntax, whitespace, and desktop mirror equality were verified.
