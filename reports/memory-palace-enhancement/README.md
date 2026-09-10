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

## All-background environment upgrade

- All three supported backgrounds now have deterministic panoramic scenery on a single sky mesh, with no external image requests or added background animation.
- Gallery: layered twilight hills, a crescent moon, a warmer horizon, and fine stars complement the existing limestone interiors.
- Pasture: soft clouds, rolling hills, distant tree lines, textured meadow grass, warmer stone terraces, and gentler daylight replace the plain, washed-out field.
- Space: a blue-violet nebula band, denser distant stars, a fixed ringed planet, and panelled orbital platforms establish a distinct setting.
- Outdoor platforms have visible depth. Room accents, route paths, authored memory locations, and recall behavior remain consistent across themes.
- Added `node dev-tools/memory_palace_visual_qa.cjs --themes` to capture entrance, room, overview, mobile entrance, and mobile stop views for every background. All 15 theme views were generated; desktop environments, rooms/maps, and portrait views were visually reviewed.
- Added real WebGL coverage for each theme's stable sky texture across study, mobile resizing, overview, and recall, plus disposal when the scene is destroyed. The placement check now waits for the rendered overview under reduced motion and projects each known room center into screen coordinates, verifying every room and the unplaceable hub instead of relying on a sparse click grid.

All-background verification: 124 logic tests passed. All 25 real WebGL scenarios passed across the full suite and targeted reruns (21 initial passes, three corrected theme checks, and the precise placement check). Syntax, desktop mirror equality, and patch whitespace were verified.

## Outdoor exhibit and room-edge refinement

- Outdoor memory displays now have slim posts and floor footings, extending the existing student-built display support. Posts sit behind caption plaques and do not change authored memory positions.
- Pasture rooms have low stone-colored planters, soil inserts, and faceted shrubs beyond the far room edge, leaving the guided route clear.
- Space rooms have steady inset edge-light segments, batched into one instanced mesh per room. The deck remains open for exploration.
- Both outdoor themes now have two brass supports connecting their landmark medallions to the existing plinths.
- Entrance pedestal finishes now suit each theme: warm stone in the gallery, pale limestone in the pasture, and dark blue metal in space.

Environment-detail verification: all 124 logic checks and eight targeted WebGL browser scenarios passed, including all three theme lifecycles, the complete route, multilingual captions, recall, touch exploration, and portrait framing. All theme previews were regenerated; outdoor room views, the gallery entrance, and portrait display supports were visually reviewed. Syntax, whitespace, and desktop mirror equality passed.

## Plaza and approach-path refinement

- Broad room-color bands no longer cover the compass plaza. Thin radial inlays lead from the compass area to the plaza boundary, maintaining each room's wayfinding color.
- Room approaches now use shared environment-specific paving, transverse joints, fine edging, and a narrow colored center inlay. The approaches extend from the hub boundary to each doorway with a small overlap at both ends.
- All path details remain flush with the surface and do not change movement or placement rules.
- Floor stop rings have a thinner profile and smoother circular geometry while preserving their active and reduced-motion states.

Path-polish verification: all 124 logic checks and eight targeted WebGL scenarios passed, covering placement in every room, the full walk, landmarks, touch exploration, portrait framing, and all three theme lifecycles. Final theme previews were regenerated and the plaza, approach alignment, overhead map, and portrait entrance were visually reviewed. Source syntax, whitespace, and desktop mirror equality were checked.

## Destination gateway refinement

- Pasture rooms now have warm pergola-style gateways with short cross-members; space rooms have metal portal frames. Both have footings and steady inset edge lights.
- Outdoor room-name signs sit closer to their gateway headers during the walk and retain their existing room-center positions in overview.
- Each entrance echoes the room's permanent landmark using shared symbol geometry, a dark medallion backing, and a fine brass rim. These place markers contain no memory answers.
- Gallery lintels now use warm stone with a narrow active-color inlay, preserving the existing room highlight feedback in a quieter treatment.

Gateway verification: 124 logic checks and nine targeted real WebGL scenarios passed, including room-sign restoration in overview, the full walk, multilingual captions, recall concealment, touch navigation, portrait framing, and all three theme lifecycles. The visual harness now supports `--gateways` for close approach views in each setting.

## Study-card clarity refinement

- The study card now has a compact landmark symbol beside its heading, matching the room symbols used by the journey map. The route dock also uses this symbol in place of a color-only dot.
- Room metadata has a lighter weight and more line spacing. The mnemonic sits in a separate reading area with a subtle background and a room-color edge.
- Reading-area padding is outside the clamped text element, avoiding partially visible extra lines when a long cue is collapsed.
- Decorative SVGs remain hidden from assistive technology and are reused until the room symbol changes. Existing accessible room names, cue controls, recall concealment, and scene navigation remain intact.
- The visual harness supports `--cues` for collapsed, expanded, and enlarged-text portrait cue previews.

Study-card verification: 124 logic checks and 11 targeted WebGL scenarios passed in the implementation pass. The preview helper now waits for the remounted canvas before moving to a stop. Collapsed, expanded, and enlarged-text portrait previews were regenerated and visually reviewed. The enlarged cue was also scrolled to its end and successfully collapsed through its visible control. The additional end-of-cue capture is `after/mobile-cue-large-text-end.png`.

## Ground-contact shading refinement

- Added soft stationary shading beneath the entrance pedestal in every theme, plus outdoor landmark bases, gateway feet, display stands, and pasture planters.
- Floor shading is clipped in each room before rotation so it stops at terrace edges. Planter shading sits on the meadow beneath the terrace level.
- All contact shades are batched into one mesh with one shared 128-pixel texture. The mesh does not intercept placement clicks and introduces no shadow maps, lights, or animation.
- The existing all-theme lifecycle checks now also verify disposal of the shared shading texture and geometry.

Contact-shading verification: all 124 logic checks and eight real WebGL scenarios passed, covering all three environment lifecycles and resource disposal, room placement, the complete walk, multilingual captions, recall concealment, and portrait framing. All three gateway previews and all 15 theme previews were regenerated. The pasture gateway, gallery entrance, space mobile entrance, and pasture mobile stop were visually reviewed. Source syntax, desktop mirror equality, and patch whitespace passed.

## Outdoor display finish refinement

- Pasture frames now use warm matte wood-toned cases and cream caption plaques. Space frames use blue-gray metal cases, silver-toned picture lights, and dark rectangular caption plates. Room and entrance signs use the same environment-specific plaque treatments.
- Both outdoor themes now share the gallery frame profile: a slim room-color status inlay, a recessed insert, and fine light-and-dark inner bevels. The existing focus, recall, and loading colors remain on the inlay.
- Outdoor exhibits have solid matching case backs for free exploration. Wall-shadow textures are now reserved for gallery displays.
- Caption rebuilds retain their setting-specific appearance when reading preferences change, including the existing high-contrast treatment. Geometry and finish materials are shared across stops.

Outdoor-frame verification: all 124 logic checks and nine real WebGL scenarios passed, including multilingual/high-contrast captions, portrait framing, room exploration, placement, complete-route navigation, recall concealment, and the lifecycle of every environment. All 15 theme previews were regenerated; both outdoor mobile stops and the space room were visually reviewed. Source syntax, desktop mirror equality, and patch whitespace passed.

## Journey-map visit progress

- Added a single SVG checkmark for visited destinations and an arrow for the current stop, with visit status included in each button's accessible name. Removed the older CSS checkmark that otherwise created a duplicate row.
- Each room now shows a segmented progress strip and an explicit visited count. Skipped stops stay unvisited; these markers describe route visits rather than recall mastery.
- Reduced competing borders and room-heading weight while retaining a clear current-stop outline, numbered destinations, wrapping labels, and 44-pixel touch targets.
- Added a browser scenario for jumping past a stop and returning to it. The visual helper now supports --journey for desktop, mobile, and enlarged-text previews, including a check that the last destination remains reachable by scrolling.

Journey-map verification: final combined logic run passed all 124 checks. All nine selected WebGL scenarios passed across the initial run and final rerun (eight initial passes; the new skipped-stop test passed after correcting its sample-room count, alongside two layout checks). The final three layout/map checks ran after removing the duplicate CSS marker. Desktop, mobile, and enlarged-text screenshots were visually reviewed, and the enlarged-text final destination was reached through scrolling. Syntax, mirror equality, and whitespace passed. Two collaborative checks failed in the first logic run with stack-trace-only diagnostics; all seven passed in isolation and all 124 passed together on the final run.

## Grouped navigation dock

- Grouped previous/next controls around a centered room name and route progress summary. On phones this becomes a full-width top row, preserving more space for room names.
- Room, Map, and Route form a consistent exploration row; Map now has a visible label. Zoom out, zoom level, zoom in, reset, and Help stay together in the utility row. Desktop groups have subtle separators.
- The compact dock uses three rows, including at 320 pixels with enlarged text. Existing dock-height measurement continues to position cue cards, help, and route panels above it. Controls retain 44-pixel minimum touch targets.
- Added --dock visual captures at 390 and 320 pixels with enlarged text, checking control bounds and that the zoom pair remains together.

Grouped-dock verification: all 124 logic checks passed after updating the source assertion for the new room-badge parent. Eight targeted WebGL scenarios passed; compact control/focus behavior and long/short cue layouts passed again after the final Help-button placement. Desktop and mobile walkthrough previews were regenerated, and the final 320-pixel enlarged-text screenshot was visually reviewed. Automated 390/320-pixel checks confirmed 44-pixel targets, horizontal containment, and the paired zoom controls. Syntax, desktop mirror equality, and whitespace passed.

## Room exploration control refinement

- Split free-roam status into a room heading and quieter nearby-stop/direction guidance. The existing recall concealment and live announcements remain in place.
- Added shared SVG icons: curved arrows distinguish turning from forward/backward steps. Step buttons have a slightly brighter surface, and Resume stop uses a consistent rectangular control.
- Wall guidance receives an amber reading surface and border, with a forced-colors override. The route compass now uses a matching SVG arrow.
- Below 360 pixels, Resume stop gets its own row and movement controls use a two-column layout to prevent fragmented words with enlarged text.
- Added --explore preview checks for enlarged text at 320 pixels: touch target sizes, horizontal containment, dock separation, and returning to the guided study card.

Exploration-control verification: all 124 logic checks and nine real WebGL scenarios passed, covering touch steps/turns, wall collisions, returning to the same stop, focus-loss movement cancellation, touch cancellation, recall concealment, and all three environment lifecycles. Standard desktop/mobile previews were regenerated. After the final narrow-screen CSS adjustment, the 320-pixel enlarged-text bounds, touch targets, dock separation, and Resume interaction passed again, and the final screenshot was visually reviewed. Syntax, desktop mirror equality, and whitespace passed.

## Route completion clarity

- Added a visit-progress bar with accessible values and distinct map/check icons for reaching the final stop versus visiting every stop. Existing visit counts and guidance remain visible.
- Placed Close in the header, softened the reading text, and made Visit remaining stops the first action when gaps remain. Walk again retains its visit-reset behavior.
- Completion cards have bounded height and scroll at larger text sizes. The final cue is hidden while the completion summary is visible; dismissing the summary restores that cue.
- Added progress-value and cue-restoration checks to the existing completion browser scenario. The --completion visual capture covers desktop and 320-pixel enlarged-text states, remaining-stop navigation, and dismissal.

Completion-card verification: all 124 logic checks passed in the final diagnostic run. The same source-contract check returned stack-trace-only failures in two earlier runs (the second took 5.17 seconds); the final combined run passed without code changes to that check. Six initial WebGL scenarios passed, followed by five final scenarios for dismissal/cue restoration, route restart, skipped stops, short/long cues, and room entry after the overlay adjustment. Narrow-screen captures verified partial/full states, remaining-stop navigation, dismissal, and final-cue restoration. Final completion screenshot, syntax, mirror equality, and whitespace were reviewed.

## Numbered display artwork refinement

- Enriched the four fixed placeholder-card motifs with layered architectural arches, a shaded orbital form, faceted peaks, and translucent waves. The palette still takes its accent from the room.
- Added deterministic fine grain, inset corner details, and a central ink wash with subtle numeral shadow, preserving the large cream route number and separate add affordance.
- Long route numbers now shrink to fit the numeral area. Busy-state artwork retains its existing ellipsis and reload affordance. No remote assets or new animation are involved; textures retain their existing dimensions.
- Added --cards captures covering all four motifs across gallery, pasture, and space.

Numbered-art verification: all 124 logic checks and seven real WebGL scenarios passed, including multilingual captions, the complete walk, recall concealment, portrait framing, and all three environment lifecycles. All four card variants were captured and visually reviewed in portrait views across the three settings. Source syntax, desktop mirror equality, and patch whitespace passed.

## Entrance globe and pedestal refinement

- Replaced the overbright plain orb finish with a lower-glow blue celestial globe, fine meridian/latitude lines, and a gold orbital curve. The original armillary silhouette and position remain intact.
- Added recessed vertical panel detailing to the pedestal with a seamless 256-pixel texture, smoother cylinder geometry, and a small stepped foot. Gallery/pasture use warm finishes and space uses blue metal.
- The globe uses a 512-by-256 canvas texture shared by its surface and low-intensity emissive map. There are no remote assets, new lights, or new animation.
- All-theme lifecycle coverage now checks disposal of the globe and pedestal textures.

Entrance verification: all 124 logic checks and seven real WebGL scenarios passed, including room placement, the complete walk, beginning/inspecting a route, portrait framing, and all three environment lifecycles with globe/pedestal texture disposal. All 15 theme previews were regenerated. The desktop gallery entrance and all three mobile entrances were visually reviewed. Source syntax, mirror equality, and patch whitespace passed.

## Room landmark medallion refinement

- Added recessed dark enamel backings, fine inner rims, and visible symbol mounts to permanent room medallions. Shared backing geometry/materials keep the additions small.
- Brought the existing symbols forward so their silhouettes clear the backing and gallery wall. Their room assignment, height, familiar shapes, and doorway echoes remain consistent.
- Smoothed the ring/knot geometry, softened symbol emission, and added fine edge lines to faceted shapes. No lights or animation were added.
- Extended the stable-landmark browser check to measure every symbol vertex against its backing plane. Added --landmarks captures for all four shapes across the three environments.

Landmark-mount verification: all 124 logic checks and seven real WebGL scenarios passed, including the four-shape backing-clearance check, placement, room inspection, recall concealment, and all three environment lifecycles. All 15 theme previews and four dedicated landmark previews were regenerated. All four symbols were visually reviewed in portrait room views across gallery, pasture, and space. Syntax, desktop mirror equality, and patch whitespace passed.

## Room wayfinding plaque refinement

- Added a room-colored landmark tile directly to each room name plaque, matching the orbit, diamond, weave, and faceted motifs used in the journey map and study card.
- Widened the existing label canvas to accommodate the symbol while preserving text spacing. High-contrast mode uses a yellow tile with a black symbol; the hub and ordinary captions retain their existing layout.
- Raised inactive room-sign opacity from 0.62 to 0.78 so neighboring destinations remain easier to read. Symbols share the existing plaque textures and add no scene meshes.

Room-plaque verification: all 124 logic checks and seven real WebGL scenarios passed, covering multilingual/high-contrast captions, stable landmarks, recall concealment, map ceiling restoration, and all three environment lifecycles. All 15 desktop/mobile theme previews and three gateway previews were regenerated. Gateway views for gallery, pasture, and space, the gallery overview, and the mobile space entrance were visually reviewed. Source syntax, desktop mirror equality, and patch whitespace passed.
