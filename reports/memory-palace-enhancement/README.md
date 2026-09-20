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

## Image and sculpture generation reliability review — 2026-09-12

- Bound directed prompt evaluation and generation to the original stop, selected media type, and relief setting. Walking onward no longer redirects an approved prompt to the next stop. Malformed evaluation responses now offer a retry instead of silently approving generation.
- Added a synchronous shared generation lock across directed, quick-create, batch, and refinement requests. Delayed results are discarded if the document, target fact/mnemonic, or existing art changes; no late persistence occurs after unmount. Incremental saves update the current store immediately to preserve earlier results before a parent rerender.
- Directed sculpture replacement now updates the live figure through the replacement API. Image replacement clears obsolete depth maps, stamp names, and buried stamp backups; quick-create Undo restores the original backup as well as the visible cue.
- Provider calls now handle synchronous throws as well as rejected promises. Optional depth failures retain a usable flat image. Batch Stop explicitly finishes the current cue, preserves completed work, and starts no further cue. Batch generation skips art added to a later stop while earlier stops are processing.
- Image decoding retains the prior frame until success, rejects outdated loads after replacement/clear/teardown, and provides an accessible failure message. Replacing reliefs disposes their old depth textures; stale relief failures cannot overwrite newer artwork. Empty model loads release their claim for retry, and a rejected old model load cannot cancel a replacement model.
- Renamed the disclosure to Art & customize, added visible per-stop/batch/built-in and Relief guidance, named the original destination in generation status, exposed unavailable image generation, and disabled incompatible generation actions. The main toolbar now wraps on narrow screens. Recall continues to withhold answer labels from the new status strip.

Validation: all 139 logic checks passed, including 15 new behavioral generation cases using deferred/failing providers. Four existing real-WebGL scenarios passed for recall concealment and gallery/pasture/space mobile lifecycle/teardown. Both new rendering regressions passed in the final run, covering image replacement/error/clear ordering, relief texture cleanup, and model replacement/retry. The actual React component was exercised in Chromium at 1280, 390, and 320 pixels (mobile root text enlarged to 20px), confirming destination persistence and no horizontal overflow. Desktop generation feedback and final 320-pixel controls were visually reviewed. Initial visual QA exposed a pre-existing non-wrapping toolbar; the initial rendering test also needed its selector narrowed from the caption sprite to the artwork mesh. Both were corrected and rerun. Renderer compilation, syntax, root/desktop mirror equality, and whitespace checks passed. AI providers were simulated; no paid or live-provider generation request was made.

Artifacts: `generation-review-logic.json`, `generation-review-final-logic.json`, `generation-review/results.json`, and the desktop/mobile screenshots in `generation-review/`. Reproduce the UI check with `node dev-tools/memory_palace_generation_qa.cjs`.

## Saved-cue recovery and practice clarity — 2026-09-12

- Failed quick regenerations now retain the last saved cue, recent versions, and the original Undo snapshot. Undo, saved-version selection, and regeneration validate the preview against current content/art so an old review cannot erase a newer edit; conflicting generators block preview mutations.
- Cue reviews now say Saved automatically and provide Done, Regenerate, Undo, and View this stop. Saved versions are accessible toggle buttons in a named group. A cue completed after the learner walks away remains available for review and Undo.
- Fixed automatic nearby-empty-frame hints stealing selection after a guided stop was filled. Guided hints now follow the selected route stop; free exploration keeps proximity-based selection. Automatic hints also preserve an open cue review.
- Recall eligibility now counts the actual palace route, including student-created stops, and uses the same two-stop minimum as the recall handler. Recall entry is blocked while art generation is active.
- Clarified that artwork is optional, separated visual-cue progress from practice, and added an explicit prompt to explain the cue-to-fact connection. The own-image editor now explains that it changes the written memory hint rather than the artwork.
- Mobile cue reviews give the message full width, shorten repeated help during errors, and place primary recovery controls before secondary versions. The final enlarged-text 320-pixel capture visibly contains the failure message and Done/Regenerate/Undo; additional versions remain scrollable.

Validation: all 147 logic checks passed, including eight new saved-preview/practice cases. Five real-WebGL scenarios passed: selected-stop proximity, recall concealment, and gallery/pasture/space mobile lifecycle/teardown. The actual React browser flow passed creation, a second version, failed regeneration, accessible version selection, Undo, and two-stop guided self-check at 1280/390/320 pixels, with 20-pixel mobile root text and no horizontal overflow. Final desktop and 320-pixel recovery cards were visually reviewed. An existing source assertion was updated for the new selected-stop filter. A browser assertion was corrected to use the self-check button's accessible name, including its icon. Final compilation and desktop synchronization passed using atomic output replacement after a transient workspace file-lock error. AI responses were simulated; no paid generation requests were made.

Artifacts: `preview-practice-verified-logic.json`, `preview-practice-browser/`, and screenshots/results in `preview-practice-review/`. Reproduce the React flow with `node dev-tools/memory_palace_generation_qa.cjs --previews`.

## Grouped control panel and visual hierarchy refinement

- Replaced the single crowded toolbar with labeled Explore and Practice cards inside a softly framed study panel. Added a compact Explore, picture, remember heading; active recall uses Recall practice.
- Creative controls now sit together in a distinct Create & personalize disclosure. Stop remains visible while batch generation runs; Clear generated art stays with the creative actions. Direct the AI now exposes its pressed state.
- Unified toolbar button shape, keyboard focus treatment, and 44-pixel minimum height. Removed the repeating pulse/scale treatment from Recall walk and used a consistent indigo action color.
- Gave palace settings a separate row with a raised selected surface. On phones, Gallery, Pasture, and Space use three equal columns with icons above labels; desktop keeps the compact horizontal layout.
- Empty/fallback states show only available groups, and a short route explains the practice requirement. Softened the separate art guidance card so it supports the controls without competing visually.

Verification: all 147 logic checks passed. The actual React/WebGL control panel passed open/close disclosure, 44-pixel target measurements, horizontal containment, and all three setting selectors at 1280/390/320 pixels (20-pixel mobile root text). The saved-preview browser flow also passed creation, failed regeneration recovery, version selection, Undo, and two-stop guided self-check on desktop/mobile. Final desktop and enlarged-text 320-pixel control captures were visually reviewed, including the revised equal-width setting selector. Compilation, desktop mirror equality, syntax, and whitespace passed. No live or paid AI generation was used.

Artifacts: `controls-review-logic.json` and the six collapsed/expanded captures plus `results.json` in `controls-review/`. Reproduce with `node dev-tools/memory_palace_generation_qa.cjs --controls`.


## Recall completion, focused scope, and practice clarity — 2026-09-12

- Fixed guided self-check getting stuck after I missed it: self-checked results now count as completed stops for progression and the answered UI. Duplicate ratings remain ignored, and an all-missed walk completes and schedules each reviewed stop once.
- Restricted answer submission, reveal, and self-rating to the selected review stops. Finishing builds a scoped result set so unrelated records cannot affect scores or reschedule unselected stops. Leaving a focused review's route shows an explicit Return to review action.
- Progress now says reviewed, including missed/revealed responses, and uses the selected review's total. Question numbering follows the review order. Guided self-check has instructions matching its reveal-and-rate workflow.
- Incorrect-answer feedback now uses session-owned timers, cleared on recall exit. Recorded responses include Continue review, which also works when revisiting a completed stop.
- Added 44-pixel answer/completion targets and visible keyboard focus. Typed-answer controls and the due-review banner wrap on narrow screens. Completion offers Another way to practice rather than pushing a harder route after misses.

Verification: 154 logic checks passed, including seven new behavioral recall cases for missed self-check completion, duplicate ratings, each out-of-scope interaction, focused scoring/mastery isolation, and tracked feedback. The actual React/WebGL Chromium flow passed saved-cue recovery at 1280/390/320 pixels, an all-missed two-stop self-check, and a one-stop focused review with an out-of-scope detour and unchanged unselected mastery. Mobile used 20-pixel root text; completion target heights and overflow were checked. Mobile completion and focused-return screenshots were visually reviewed. The final renderer compiled, its desktop mirror matched, and whitespace checks passed. AI responses were simulated; no paid generation was used.

Artifacts: recall-review-logic.json and preview-practice-review/results.json, with missed-self-check-completion-mobile.png and focused-review-return-mobile.png in that directory. Reproduce the browser flow with node dev-tools/memory_palace_generation_qa.cjs --previews.


## Readable recall feedback and keyboard continuity — 2026-09-12

- Wrong answers now show persistent visible text in a polite live region, alongside earned mnemonic hints. Feedback no longer depends on a brief color flash or sound. Earlier attempt timers cannot clear newer feedback, and navigation clears the previous stop's flash.
- Revealing a quiz answer no longer advances after 700 milliseconds. A distinct answer card shows the fact, its mnemonic, a short cue-to-fact reflection prompt, and a learner-controlled Continue review action. Reveals remain recorded without recall points and duplicate reveals do not increment progress.
- Keyboard activation inside practice preserves focus across removed/replaced controls: revealed answers, continuation, the next question, self-check ratings, and completion. Pointer interactions do not trigger this restoration, and focus deliberately moved to an external control remains there.
- Reviewed desktop and 320-pixel enlarged-text answer cards: clear answer/cue hierarchy, wrapping text, visible focus, and a prominent continuation action.

Verification: all 157 targeted logic checks passed, including three new behavioral reveal/timer cases. The real React/WebGL feedback flow passed persistent wrong-answer text, answer concealment before reveal, no timed advance after reveal, keyboard continuation, keyboard self-check ratings, completion focus, and respect for focus moved elsewhere. Layout/overflow checks passed at 1280, 390, and 320 pixels (20-pixel mobile root text). The existing browser flow also passed saved-cue recovery, variants, Undo, all-missed self-check completion, and focused-review isolation. JSX compilation, desktop mirror equality, and whitespace passed. Updated two source-contract tests for the shared panel and the renamed completion guidance; corrected the browser leak assertion to exclude the quiz's answer choices. AI providers were simulated; no paid generation requests were made.

Artifacts: recall-feedback-logic.json and recall-feedback-review/results.json, with revealed-answer-1280.png, revealed-answer-390.png, and revealed-answer-320.png. Reproduce with node dev-tools/memory_palace_generation_qa.cjs --feedback; compatibility flow uses --previews.


## Completion review and targeted follow-up — 2026-09-12

- Added a Stops to strengthen completion section for missed, revealed, or retried facts. First-try correct answers and remembered self-ratings are excluded. Expandable cards show each physical stop number, the reason to revisit it, the fact, and its memory cue.
- Practice these stops starts a fresh covered review of only that set, preserving the current answer mode. Subsequent backwards/shuffled retries keep the subset, and unrelated stops retain their practice records.
- Retry validates and captures the requested scope before clearing results. Empty, deleted, duplicate, or out-of-scope selections cannot unexpectedly broaden practice to the full palace.
- The review section disappears during active practice and after a successful follow-up. Focused completion text now describes selected stops rather than assuming every focused review came from the due schedule.

Verification: all 164 targeted logic checks passed, including seven new cases covering difficult-stop selection, first-try/self-rating exclusions, answer concealment during practice, safe retry reset, invalid selection handling, and preserved retry scope. The real React/WebGL browser flow passed expansion, correct selection, keyboard follow-up, fresh answer concealment, successful completion, and unchanged unselected mastery. It also reran readable feedback, manual reveals, self-check keyboard progression, and focus preservation. Completion cards passed overflow checks at 1280/390/320 pixels with enlarged mobile text; the expanded 320-pixel card was visually reviewed. Compilation, desktop mirror equality, and whitespace checks passed. Corrected the parameterized test argument nesting after the initial test run; application behavior passed the browser flow. No live or paid AI generation was used.

Artifacts: follow-up-practice-logic.json; recall-feedback-review/results.json and follow-up-practice-1280.png, follow-up-practice-390.png, follow-up-practice-320.png. Reproduce the browser flow with node dev-tools/memory_palace_generation_qa.cjs --feedback.


## Self-check result clarity and practice entry/exit — 2026-09-19

- Guided self-check now reports how many facts the learner marked as remembered. It no longer displays a misleading first-try count for self-ratings. The completion toast and result panel share the same summary formatter; measured recall scoring and point reporting remain unchanged.
- Updated the supporting explanation to identify self-ratings and point learners to Recall walk for checking answers against the facts.
- Keyboard entry moves focus into practice. Keyboard exit returns to the launch button for the same mode. Focus restoration accounts for React reusing toolbar elements and continues to respect focus deliberately moved elsewhere.
- Updated the isolated runtime/browser harnesses to load the actual shared AI-availability helper introduced elsewhere in the app. Added blocked/hidden AI regression cases so tests exercise those restrictions instead of bypassing them.

Verification: all 171 targeted logic checks passed using the threads worker pool. Seven added cases cover zero/partial/full remembered summaries, measured-summary compatibility, completion feedback, and blocked/hidden generation. The first test run exposed the missing shared helper in the old harness; a later fork-worker shutdown timeout required the successful threads-pool rerun. Actual React/WebGL browser checks passed keyboard entry/exit, all-missed/all-remembered self-checks, focus preservation, targeted follow-up, and layout at 1280/390/320 pixels with enlarged mobile text. The 320-pixel result card was visually reviewed. Saved-cue recovery, version selection, Undo, and focused-review isolation also passed. Renderer compilation, desktop mirror equality and whitespace checks passed. Providers were simulated; no paid generation was used.

Artifacts: self-check-clarity-final-logic.json; recall-feedback-review/results.json and self-check-result-1280.png, self-check-result-390.png, self-check-result-320.png; preview-practice-review/results.json. Browser flows: node dev-tools/memory_palace_generation_qa.cjs --feedback and --previews.


## Learner-controlled recall pacing — 2026-09-19

- Added an accessible Move on automatically checkbox during recall. Automatic progression remains the default; turning it off holds correct answers and self-ratings until Continue review, including the final stop.
- The preference remains selected across practice exits/retries in the mounted activity and does not rebuild the palace. Revealed answers continue to wait for the learner in either mode.
- Changing pace invalidates queued automatic moves. Switching off and back on cannot revive an old move; automatic progression resumes for subsequent responses. Updated self-check instructions to work with both pacing choices.

Verification: 176 targeted tests passed in separate runtime/core runs, including five new pacing cases. The initial combined threads run returned no test results; separate fork runs completed successfully. Actual React/WebGL browser checks passed manual quiz progression, manual self-check, final-stop completion, keyboard checkbox operation, preference retention, no scene remount, and automatic resumption. Layout/overflow checks passed at 1280/390/320 pixels with enlarged mobile text; the 320-pixel pacing control was visually reviewed. Renderer compilation, desktop mirror equality and whitespace checks passed. No live or paid AI generation was used.

Artifacts: recall-pacing-runtime.json, recall-pacing-core.json, and recall-pacing-review/results.json, with pacing-control and manual-response screenshots at all three widths. Reproduce the browser flow with node dev-tools/memory_palace_generation_qa.cjs --pacing.


## Changed-content review safeguards — 2026-09-19

- Active reviews now track the learning content and geography they started with. Changed facts, source mnemonics, route order, custom rooms or custom stops invalidate the old review. Artwork, theme, generated timestamps and mastery saves do not invalidate it.
- Answer, reveal, self-rating, progression, retry and finishing handlers check the current content identity synchronously, so a callback cannot score old answers before React's cleanup effect runs. Invalidation clears pending recall timers, ends the review and shows an explicit restart explanation without scoring unfinished work.
- An existing live-session arm cannot immediately restart the invalidated review. A fresh arm cycle or explicit manual start uses current content. Same-count edits to custom stops also update the scene dependency key.

Verification: 187 targeted tests passed, including eleven new cases for stale actions, queued advancement, one-time close handling, fact/route/custom-stop changes and harmless saves. Actual React/WebGL browser checks passed changed-fact invalidation, removal of a stop below the practice minimum, manual restart with updated answers, preservation of unrelated mastery, continued practice after artwork/mastery saves, and live-arm recovery. The restart explanation passed layout/overflow checks at 1280/390/320 pixels with enlarged mobile text; the 320-pixel notice was visually reviewed. Compilation, desktop mirror equality and whitespace checks passed. No live or paid AI generation was used.

Artifacts: recall-content-runtime.json, recall-content-core.json and recall-content-review/results.json, with changed-review screenshots at all three widths. Reproduce with node dev-tools/memory_palace_generation_qa.cjs --content.


## Immediate answer help without forced guesses — 2026-09-19

- Quiz learners can now reveal an answer from the first attempt instead of having to submit three incorrect answers. A separated help row explains the action; Reveal answer (no points) keeps the scoring consequence explicit.
- Reveals still pause for reading and Continue review. They do not fabricate incorrect attempts or award recall points. The automatic mnemonic after two genuine misses remains available.
- Removed obsolete reveal-eligibility state and clarified the quiz instructions. Quiz submission/reveal handlers now reject self-check mode, preventing a quiz action from replacing or double-counting a self-rating.

Verification: 191 targeted tests passed, including four new cases for immediate bank/type reveals, zero fabricated attempts/points, and self-check mode integrity. The actual React/WebGL browser flow passed help before any attempt, keyboard reveal and focus, learner-controlled continuation, zero-point/zero-attempt completion and separate self-check controls. Layout and overflow passed at 1280/390/320 pixels with enlarged mobile text; the 320-pixel first-attempt help panel was visually reviewed. Compilation, desktop mirror equality and whitespace checks passed. No live or paid AI generation was used.

Artifacts: recall-help-runtime.json, recall-help-core.json and recall-help-review/results.json, with help-before-attempt screenshots at all three widths. Reproduce with node dev-tools/memory_palace_generation_qa.cjs --help.


## Entrance recovery and frame orientation — 2026-09-19

- Replaced the entrance's forward-only instruction with Continue review. It uses the active review order, preserves recorded responses, skips completed stops and respects focused subsets. If all stops are complete, the entrance explains that continuing will show results.
- Split the question card's review-step number from its Palace frame badge and gave the question its own heading. Backwards and shuffled practice now clearly distinguish sequence position from the frame's physical route number.

Verification: 195 targeted tests passed, including four new entrance cases for backwards/focused order, preserving attempted/completed answers, and finishing once without reopening stops. The actual React/WebGL browser flow passed repeated keyboard returns from the entrance during backwards practice, distinct frame numbering, skipping recorded stops, and completion from the entrance with unchanged attempts. The final completed-review guidance was verified in a second browser pass after its wording refinement. Layout/overflow passed at 1280/390/320 pixels with enlarged mobile text; both 320-pixel question and entrance cards were visually reviewed. Final compilation, desktop mirror equality and whitespace checks passed. No live or paid AI generation was used.

Artifacts: recall-navigation-runtime.json, recall-navigation-core.json, and recall-navigation-review/results.json, with review-frame-number and entrance-return screenshots at all three widths. Reproduce with node dev-tools/memory_palace_generation_qa.cjs --navigation.


## Typed recall input refinement — 2026-09-19

- Prevented Enter from submitting a typed answer while confirming a character through an input method, including the legacy keyCode 229 signal. The new browser case reproduced the missing protection before the change and passed afterward.
- Added visible typing guidance, a larger answer field, minimum 44px input and Check targets, and an explicit keyboard focus treatment for Check.
- Real React/WebGL browser QA: keyboard entry focuses the input; whitespace produces no attempt; composition Enter is canceled; normal Enter and Check both submit; an incorrect answer retains input focus; the next stop starts empty; completion records exactly three real attempts. Composition events are simulated in Chromium; native operating-system IME behavior was not manually exercised.
- Browser captures at 1280, 390, and 320px, with 20px root text on mobile. No horizontal overflow; the 320px screenshot was visually reviewed. See recall-typing-review/results.json and typed-answer-*.png.
- Runtime regressions: 71 passed, 0 failed (recall-typing-runtime.json). Renderer rebuilt; desktop mirror matches.
- Repository whitespace check reports an unrelated existing blank line at view_renderers_source.jsx:2424, outside MemoryPalaceView. The edited component and QA harness have no trailing whitespace.


## Per-stop recall drafts — 2026-09-19

- Fixed unfinished typed answers disappearing when learners visit another frame. Drafts now stay with their own stops in memory for the active review, including entrance detours, selecting the same stop, and decoration-triggered scene rebuilds.
- Correct answers and reveals remove that stop's draft. Exit, retry, and learning-content invalidation reset all drafts. Drafts are not persisted to lesson data and do not count as attempts.
- Added brief form guidance explaining that the draft stays at the stop during this review.
- The real React/WebGL browser regression reproduced the lost draft before the fix and passed afterward. It verifies independent drafts, repeated selection, entrance continuation, decoration remount, exit/restart, changed content, backward retry, and exactly two submitted attempts at completion.
- Captures at 1280, 390, and 320px with enlarged mobile text have no horizontal overflow; the 320px screenshot was visually reviewed. See recall-drafts-review/results.json and retained-draft-*.png.
- Runtime regressions: 73 passed, 0 failed, including two new completed-draft cleanup cases (recall-drafts-runtime.json). Renderer rebuilt and desktop mirror verified identical.


## Stop-specific practice feedback — 2026-09-19

- Fixed wrong-answer feedback disappearing after leaving and revisiting a stop. Visible feedback now derives from the current stop's attempts and completion state; removed the redundant last-message state and navigation-clearing effect. Untouched stops stay clear, and success, reveal, or a new review clears the retry message.
- Replaced generic completed-card labels with correct-on-first-try, correct-after-retry, answer-revealed, and explicit remembered/missed self-check labels. Self-ratings remain clearly distinguished from checked answers. Result headings use readable sentence case and relaxed line spacing.
- The browser regression reproduced the lost-feedback issue before the fix and passed afterward. It checks revisiting, untouched stops, fresh reviews, each outcome label, and unchanged completion attempts.
- Responsive captures at 1280, 390, and 320px with enlarged mobile text: recall-stop-feedback-review/results.json, revisited-feedback-*.png, and missed-self-rating-*.png. No horizontal overflow; the 320px self-rating card was visually reviewed.
- Runtime regressions: 78 passed, 0 failed, including five outcome-label cases (recall-stop-feedback-runtime.json). Renderer rebuilt and desktop mirror identical; changed-file and component whitespace checks passed.


## Choice identity and retrieval guidance — 2026-09-19

- Fixed selected-answer false positives caused by applying typed spelling tolerance to choice labels. Selecting Photon at a Proton stop previously marked the answer correct; selected choices now use their stop identity. Typed answers retain existing spelling tolerance. The shared handler also covers VR answer chips.
- Added a brief cue-to-answer prompt above the choice bank to make the retrieval step explicit.
- Before-change runtime report: 79 passed and the new similar-choice case failed, confirming the defect. After-change runtime report: 80 passed, 0 failed, including selected-choice identity and typed tolerance cases (recall-choice-runtime.json).
- Real React/WebGL browser QA rejected the similar distractor, accepted the correct choice on retry, and completed with three attempts and one retry instead of a false perfect result. See recall-choice-identity-review/results.json.
- Captures at 1280, 390, and 320px with enlarged mobile text had no horizontal overflow. The 320px screenshot was visually reviewed. Renderer rebuilt and desktop mirror verified identical; component and changed-file whitespace checks passed.


## Distinct choices and long-answer layout — 2026-09-19

- Recall banks now keep one distractor per distinct label, folding case, whitespace and Unicode compatibility variants. Blank distractors are omitted. The correct stop keeps its identity; genuinely different terms remain separate. Choice generation remains deterministic and does not change palace data.
- Answer buttons now use larger text, relaxed line spacing, left alignment, and wrapping for long unbroken terms. Removed hover scaling so buttons remain within the available width.
- Three engine cases reproduced repeated/blank distractors before the fix. Updated a legacy announcement assertion to the current first-try/retry labels and polite live region. Final engine and collaboration suite: 127 passed, 0 failed (recall-unique-core.json).
- Real React/WebGL browser checks passed for three distinct choices from repeated facts, preserving the repeated target identity, keyboard selection, long text wrapping, and 44px minimum button targets. See recall-choice-layout-review/results.json and long-choices-*.png.
- Captures at 1280, 390, and 320px with enlarged mobile text showed no horizontal overflow; the 320px screenshot was visually reviewed. Renderer rebuilt, engine and renderer desktop mirrors match, and changed-file whitespace checks passed.


## Single-answer practice safeguard — 2026-09-19

- Recall walk automatically uses guided self-check when all palace stops share one distinct answer. This avoids revealing the sole choice and awarding a false verified first-try score. Explicit typed and self-check modes remain available as before; ordinary palaces retain choice questions.
- Added a visible explanation before the question. The selected self-check mode and explanation persist through backward retries; keyboard exit returns to the original Recall walk button. Live-session arming uses the same safeguard.
- The browser regression failed before the change because the one-choice walk exposed its answer. Afterward it passed hidden-answer, reveal/rate, self-rated completion/mastery, retry, keyboard entry/exit, live-arm, and normal-choice recovery checks. See recall-single-answer-review/results.json.
- Responsive screenshots at 1280, 390, and 320px with enlarged mobile text have no horizontal overflow; the 320px explanation and controls were visually reviewed.
- Runtime regressions: 86 passed, 0 failed, including six mode-selection and retry cases (recall-single-answer-runtime.json). Renderer rebuilt and desktop mirror identical; component and changed-file whitespace checks passed.


## Pending self-check continuity — 2026-09-19

- Fixed revealed but unrated stops losing their rating controls after navigation. A review-scoped set retains pending self-ratings independently for each stop, including entrance detours and decoration scene rebuilds. Rebuilt scenes restore already-revealed pending answers; untouched stops remain hidden.
- Rating removes only that stop from the pending set. Retry, exit, and changed learning content clear pending ratings. Completed stops cannot be reopened as pending; revealing alone records no attempts.
- Added a prompt asking learners to rate what they remembered before revealing the answer, to clarify the intended self-assessment.
- The new browser regression reproduced the lost controls before the change and passed afterward: independent pending ratings, unseen stops hidden, entrance/remount recovery, keyboard rating, reset boundaries, and exactly two ratings counted at completion. See recall-self-resume-review/results.json.
- Captures at 1280, 390, and 320px with enlarged mobile text had no horizontal overflow. The 320px rating card was visually reviewed.
- Runtime regressions: 89 passed, 0 failed, including three pending-rating cases (recall-self-resume-runtime.json). Renderer rebuilt and desktop mirror identical; component and changed-file whitespace checks passed.


## Recall scene restoration — 2026-09-19

- Fixed rebuilt 3D scenes covering completed answers while the practice panel still showed recorded results. The component now supplies a scoped snapshot of completed answers and pending self-reveals; frame creation applies captions and grade colors when WebGL initializes.
- Replaced the previous immediate pending-reveal replay, which could run before the asynchronous WebGL mount and be silently ignored. Restored correct/incorrect colors do not replay celebration effects. Pending self-reveals have no grade; unanswered attempts stay hidden. Inactive or changed-content reviews supply no restoration state.
- Real WebGL browser checks inspect actual caption texture text and frame colors across correct answers, answer reveals, pending self-reveals, missed self-ratings, and scene rebuilds. New reviews and untouched stops retain question marks; restoration never completes an unfinished review. See recall-scene-review/results.json.
- Desktop and mobile scene screenshots were captured, and the mobile image was visually reviewed. Renderer rebuilt; engine and renderer desktop mirrors match. Runtime regressions: 93 passed, 0 failed (recall-scene-runtime.json).
- Final engine and collaboration regressions: 127 passed, 0 failed (recall-scene-core.json). Updated the existing caption typography assertion to the restored initial caption; changed-file whitespace checks passed.


## Stable position across scene refreshes — 2026-09-19

- Fixed appearance-triggered scene rebuilds returning an active review to its first stop. Rebuilds of the same content, review instance and reset version retain the current valid route ID, including the entrance. Study-mode rebuilds also retain a valid stop.
- New reviews, backward retries, changed learning content, explicit resets and removed stops use their intended start positions instead. Typed drafts remain associated with the preserved stop.
- The browser regression reproduced the position loss before the change and passed afterward: generated-art refreshes, gallery/pasture/space transitions, entrance preservation, typed drafts, backward retry, fresh review, changed content, and unchanged completion attempts. See recall-position-review/results.json.
- Runtime regressions: 100 passed, 0 failed, including seven same-review/new-review/reset/removed-stop cases (recall-position-runtime.json). Renderer rebuilt and desktop mirror identical; component and changed-file whitespace checks passed.


## Automatic progression respects navigation — 2026-09-19

- Fixed queued automatic moves overriding manual navigation, including entrance visits and leaving then returning to the same stop. Each automatic move now captures its original stop and navigation revision; navigation and review resets invalidate older moves without changing the automatic pacing preference.
- An earlier answer cannot shorten the reading time for a newer answer. Scene rebuilds cancel a pending move and retain Continue review; newly recorded answers still advance normally.
- Four regression cases failed before the fix and pass afterward. Final runtime suite: 104 passed, 0 failed (recall-auto-navigation-runtime.json). One intermediate runner exited without tests; a subsequent complete run passed.
- Real React/WebGL browser checks passed for entrance preservation, away-and-back navigation, keyboard Continue, subsequent automatic completion, and exactly two attempts per completed walk. See recall-auto-navigation-review/results.json.
- Renderer rebuilt and desktop mirror verified identical. Component and changed-file whitespace checks passed.


## VR answer targeting — 2026-09-19

- Fixed a same-event timing bug where selecting a new VR frame read the previous React-rendered choice bank, potentially omitting the target answer. The engine now passes the selected locus ID and the component builds its choices synchronously from live palace and review state.
- VR selections must match the current stop and an actual offered choice. Stale or invented selections do not record attempts; canonical choice labels are used. Completed/revealed stops, the entrance, self-check, finished reviews, changed content, and stops outside focused scope offer no bank. Removed the redundant rendered-bank ref.
- Real React/WebGL callback regression reproduced the missing target answer before the fix and passed afterward, including stale/unknown picks and immediate bank hiding after completion. It calls the VR callbacks directly; no physical headset was tested. See recall-vr-choices-review/results.json.
- Runtime regressions: 112 passed, 0 failed, including eight VR targeting/state cases (recall-vr-choices-runtime.json). Renderer rebuilt; engine and renderer desktop mirrors match. Changed-file whitespace checks passed.
- Final engine and collaboration suite: 127 passed, 0 failed (recall-vr-choices-core.json).


## Repeated retry feedback — 2026-09-19

- Added a per-stop Attempt indicator inside the polite, atomic retry status. Every submitted answer updates the attempt state, including rapid wrong responses while the existing flash is still active, so the live region has new text instead of repeating an unchanged message.
- The retry sentence stays stable; focus remains in the typed field. Navigation restores each stop's count, untouched stops stay clear, success removes wrong feedback, and new reviews reset the count. Scoring still uses the existing attempt records.
- Runtime regressions: 114 passed, 0 failed, including repeated submissions during an active flash and ignored completed/out-of-scope submissions (recall-attempt-feedback-runtime.json).
- Real React/WebGL browser checks passed for three repeated Enter submissions, changing live-region text, focus, revisits, reset, and five submitted attempts at completion. See recall-attempt-feedback-review/results.json. Screen-reader speech was not manually tested.
- Captures at 1280, 390, and 320px with enlarged mobile text had no horizontal overflow; the 320px screenshot was visually reviewed. Renderer rebuilt and desktop mirror identical.


## Image/sculpture format draft continuity — 2026-09-19

- Switching Direct the AI between image and sculpture now preserves the written prompt and existing refinement instructions. The format change still invalidates the old evaluation; prompt/context changes continue to require fresh evaluation. Moving to a different stop or changing the scene data still resets drafts as before.
- Added a short note beside the format controls explaining that format changes preserve the prompt.
- Real React/WebGL browser checks passed for keyboard switching, switching back, preserving a prompt after an enhanced evaluation, clearing the old actionable evaluation, checking the new format with a different provider prompt, no unintended image generation, and clearing at a different stop. AI responses were mocked; no paid generation was used. See prompt-format-review/results.json.
- Captures at 1280, 390, and 320px with enlarged mobile text had no horizontal overflow. The mobile creative-controls screenshot was visually reviewed.
- Runtime regressions: 114 passed, 0 failed (prompt-format-runtime.json). Initial validation encountered an outdated harness selector and a runner that executed no tests; both checks were rerun successfully. Renderer rebuilt and desktop mirror checked.
