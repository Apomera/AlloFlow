# Geometry Sandbox and Immersive Geometry review

Review date: September 4, 2026 (America/New_York). Scope: current working-tree source, the regular sandbox's Single Shape, Stretch, and Sculpt modes, and the standalone immersive Stretch Lab. Application files were not changed.

## Overall assessment

The strongest opportunity is to make the visual model, mathematics, and learner actions agree everywhere. There is already a substantial foundation: keyboard camera controls, manual creation without AI, selectable sculpture parts, formulas, cross-section profiles, predictions, guided investigations, build challenges, optional anonymous research traces, saved sculptures, and immersive missions, replay, instructor links, reduced-motion handling, and quality settings. These features should be connected and refined before adding more panels.

The highest-priority problems are contradictory measurements, incorrect torus slicing, false scaling feedback, assessment mismatches, mobile obstruction, and loss of saved immersive progress. More realistic lighting alone would not address these learning problems.

## Evidence and limits

- All **319 tests passed** across seven existing focused suites: geosandbox_visual_clarity, geosandbox_stretch_challenge, geosandbox_render_geometry, geosandbox_panel_render, geosandbox_mode_isolation, geosandbox_math_audit, and immersive_geometry_stretch.
- Local Chromium with real Three.js/A-Frame and SwiftShader exercised the working-tree code at 1440×960 and 390×844. The regular sandbox used the existing React harness, augmented with the compiled app stylesheet and vendored OrbitControls. The immersive page was served directly from its production HTML.
- No uncaught page errors occurred in the initial and targeted normal workflows. A separate check deliberately injected a transient WebGL initialization failure to test Retry.
- Browser test seeds established boundary sizes and torus dimensions; real UI controls then drove the changes. A local stub enabled the otherwise AI-gated whole-object manual buttons. No external AI requests were made.
- These are component-level browser checks, not a complete deployed-app or physical-device audit. Actual headset entry, controller ergonomics, GPU performance, OS fullscreen, speech recognition, and screen-reader announcements need device validation. Software-rendered text artifacts are not treated as confirmed product bugs.
- Existing tests cover many formulas and source contracts but did not catch the cross-feature failures below.

Test data: [scratch/geometry-review-2026-09-04-unit-results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04-unit-results.json>), [scratch/geometry-review-2026-09-04/initial-results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/initial-results.json>), [scratch/geometry-review-2026-09-04/verification-results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/verification-results.json>). Reproduction drivers: [scratch/geometry-review-2026-09-04/audit.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/audit.cjs>) and [scratch/geometry-review-2026-09-04/verify.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/verify.cjs>).

## Confirmed findings

### 1. P1 — Floating sculpture labels disagree with the measurement panel

**Reproduce:** Sculpt → Build from scratch. The default box's floating label reports V=1 and SA=6, while its overlay reports dimensions 2.6×2.6×2.6, V=17.58, and SA=40.56. The model is drawn at 2.6 world units per recipe unit. The selected-part sprite multiplies by recipe scale but omits that world-unit factor.

**Impact:** A learner is given conflicting answers for the same visible object. Volume differs by 2.6³ and surface area by 2.6².

**Fix:** Route sprite labels, panel readouts, spoken descriptions, and VR captions through one display-unit measurement function. Assert agreement for both selected and whole-sculpt labels.

Source: [stem_lab/stem_tool_geosandbox.js:2182](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:2182>). Evidence: [sculpt-desktop](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/sculpt-desktop.png>).

### 2. P1 — The scaling investigation can claim growth when nothing grows

**Reproduce:** Select a box with size [4,4,4], start the scale investigation, predict Volume, and choose Scale selected part ×1.25. The recipe remains [4,4,4], but the feedback reports volume 1124.86 → 2197.00 and surface area 648.96 → 1014.00, with the ideal 1.25³ and 1.25² ratios.

**Cause:** The teaching calculation scales an unclamped baseline. The actual edit separately rounds and clamps each size to 4. Smaller pieces can also have rounding discrepancies, and editing a part after the prediction can invalidate the stored baseline.

**Fix:** Compute the proposed accepted transform first, use that same result for rendering and comparison, and explain any limit. Preserve uniformity when claiming a uniform scale. Bind an investigation to a stable part ID and invalidate/rebase it when its subject changes.

Source: [stem_lab/stem_tool_geosandbox.js:3483](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3483>), [stem_lab/stem_tool_geosandbox.js:3511](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3511>). Evidence: [clamped-investigation](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/clamped-investigation.png>).

### 3. P1 — Torus cross-sections use the wrong orientation

**Reproduce:** Select an unrotated torus with recipe radius 1 and tube radius 0.2 and enable its middle section. The renderer draws the torus around the local Z axis, but the slice model assumes it lies around the local Y axis. The yellow annulus extends well outside the actual solid.

**Evidence:** World-space bounds were 6.24×6.24×1.04 for the torus and 6.24×0×6.24 for its slice. The reported middle-section area was 16.99 square units. For the displayed vertical ring, the central horizontal section consists of two disks, totaling approximately 1.70 square units.

**Fix:** Define a consistent primitive-local slicing axis, or implement actual plane/solid intersection. Label the plane orientation and derive the diagram, outline, area, and height profile from the same section. The generic representation also calls a torus slice a Circle while the live panel calls it an annulus; distinguish a generating circle from a plane intersection.

Source: [prim3d_module.js:595](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/prim3d_module.js:595>), [stem_lab/stem_tool_geosandbox.js:1070](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:1070>), [stem_lab/stem_tool_geosandbox.js:2304](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:2304>). Evidence: [torus-cross-section](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/torus-cross-section.png>).

### 4. P2 — Challenge questions can refer to a shape that is not displayed

**Reproduce:** With a torus selected in Sculpt mode, click Challenge. In the captured run, the question asked about a frustum while the torus and its math overlay remained on screen. The generator updates shape/dimensions but does not change the active mode or isolate a challenge scene. The same source path is reachable from Stretch mode.

**Fix:** Either generate questions about the selected construction/part, or present a separate challenge scene with a clear return to the learner's preserved work.

Source: [stem_lab/stem_tool_geosandbox.js:3243](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3243>) and [stem_lab/stem_tool_geosandbox.js:3941](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3941>).

### 5. P2 — Shape-identification questions show their answer

**Reproduce:** An identify challenge asks “What type of 3D shape is this?” immediately below the visible label “Rectangular Prism.” The viewport and coach card can expose the same information.

**Fix:** Make reveal policy depend on question type across all surfaces, including accessible descriptions. Hide the target answer during assessment, while retaining equivalent non-answer-revealing descriptions for assistive technology. Offer deliberate hints and explain the identifying properties after submission.

Source: [stem_lab/stem_tool_geosandbox.js:5942](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:5942>) and [stem_lab/stem_tool_geosandbox.js:5811](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:5811>). Evidence: [identify-answer-leak](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/identify-answer-leak.png>).

### 6. P2 — Immersive controls obscure almost the entire phone viewport

**Reproduce:** Open the immersive lab at 390×844. Its opaque HUD occupies 374×828 pixels, approximately **94% of the display area**, and contains 1865 pixels of scrollable content. There is no collapse control. Even on desktop, the primary Stretch, Grow, and Undo controls sit below the first visible HUD screen.

**Fix:** Keep a compact operation bar visible; place lessons/settings in a collapsible drawer or bottom sheet. Start with one guided path, with mission, story, and instructor options disclosed as needed. Give touch users visible look/recenter controls while retaining keyboard access.

Source: [immersive_geometry/immersive_geometry.html:64](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/immersive_geometry/immersive_geometry.html:64>), [immersive_geometry/immersive_geometry.html:173](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/immersive_geometry/immersive_geometry.html:173>), [immersive_geometry/immersive_geometry.html:335](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/immersive_geometry/immersive_geometry.html:335>). Evidence: [immersive-mobile](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/immersive-mobile.png>), [immersive-desktop](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/immersive-desktop.png>).

### 7. P2 — Regular mobile sculpting separates actions from their visible result

**Reproduce:** At 390×844, create the initial box. The control column is about 1122 pixels tall; the 3D viewport begins at page y≈1329. A learner must scroll between changing a part and seeing its effect. Opening additional tools increases that distance.

**Fix:** Put the model first on mobile, keep it visible during edits, and disclose Build / Inspect / Investigate controls beneath it. A resizable split view or compact bottom sheet would support continuous cause-and-effect feedback.

Source: [stem_lab/stem_tool_geosandbox.js:102](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:102>) and [stem_lab/stem_tool_geosandbox.js:4227](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:4227>). Evidence: [sculpt-mobile](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/geometry-review-2026-09-04/sculpt-mobile.png>).

### 8. P2 — Reloading an immersive launch URL discards saved edits

**Reproduce:** Launch a rectangle with L=2.1 in the URL, grow it to 2.35, wait until localStorage contains 2.35, then reload. The geometry returns to 2.1. This was verified after autosave completed.

**Cause:** LAUNCH_STATE always takes precedence over saved state, so every refresh reapplies the original URL and resets launch progress.

**Fix:** Apply a launch payload once, then consume it or track a lesson/session identity. Provide a deliberate Restart from lesson action while ordinary reload resumes the current work. Preserve repeatable teacher links for genuinely new launches.

Source: [immersive_geometry/immersive_geometry.html:645](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/immersive_geometry/immersive_geometry.html:645>).

### 9. P2 — Whole-sculpt changes bypass Undo

**Reproduce:** Move a part, use the whole-sculpt Bigger button, then Undo. Undo restores the snapshot from before the earlier move, removing both actions instead of just the latest scale. The whole-object Bigger/Smaller/Rotate/Recolor path does not push history. AI generation/refinement also directly replaces the recipe.

**Fix:** Use one transaction/history layer for part edits, whole-object edits, AI changes, and replacement. Add Redo and coalesce continuous dragging into a single undo step. Keep manual whole-object controls available when AI is disconnected; they currently sit inside the AI-available branch.

Source: [stem_lab/stem_tool_geosandbox.js:3321](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3321>), [stem_lab/stem_tool_geosandbox.js:3314](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3314>), [stem_lab/stem_tool_geosandbox.js:4277](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:4277>).

### 10. P2 — Nudge position and rendered position can diverge

**Reproduce:** Put a part at recipe X=4, then Move x positive. Stored X becomes 4.2, but the rendered part stays at 4 because Prim3D normalizes position when rendering. Handles use the unclamped recipe and can continue moving away from the object; the action history still reports movement.

**Fix:** Normalize the edit before storing it; use consistent limits in controls, handles, and rendering. Announce a boundary when movement is rejected and avoid recording phantom actions.

Source: [stem_lab/stem_tool_geosandbox.js:3479](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3479>) and [prim3d_module.js:104](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/prim3d_module.js:104>).

### 11. P2 — WebGL Retry cannot restore the canvas

**Reproduce:** Inject a one-time renderer initialization failure, restore the working renderer, then click Retry. The error remains and there are zero geometry canvases. Retry only reselects the current shape; the error UI replaced the canvas, and the initialization effect returns when the canvas is absent.

**Fix:** Reset error state, remount the canvas, dispose partial initialization, and retry after mount. Provide a usable textual/numeric exploration path if graphics remains unavailable.

Source: [stem_lab/stem_tool_geosandbox.js:3906](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:3906>), [stem_lab/stem_tool_geosandbox.js:5743](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:5743>).

### 12. P2 — Accessibility labels and modifier shortcuts need correction

All seven shape buttons expose the identical accessible name “Select Shape,” masking their visible names. Separately, pressing Ctrl+A with the immersive scene focused changed the active axis from 0 to 1. The keyboard handler recognizes Ctrl+Z/Y but lets other modified keys fall through to single-letter commands.

**Fix:** Name buttons by shape and expose selection state. Ignore Ctrl/Meta/Alt combinations unless explicitly supported. Test button labels and keyboard behavior with a screen reader and browser shortcuts, not just source-string presence.

Source: [stem_lab/stem_tool_geosandbox.js:4234](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geosandbox.js:4234>), [immersive_geometry/immersive_geometry.html:3010](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/immersive_geometry/immersive_geometry.html:3010>).

## Refinement and enhancement opportunities

### A clearer learning interface

1. **Keep the model and current action together.** Use a persistent model area, compact editing controls, one selected-part inspector, and optional learning panels. Current desktop sculpture controls are narrow and internally scroll; duplicate part lists and repeated math compete for space.
2. **Use a deliberate learning path.** Offer Explore, Build, and Investigate entry choices with progressive disclosure. Immersive missions, guided exploration, and the dimension story already exist, but all compete on the initial screen. Surface one next action.
3. **Distinguish the two VR experiences.** The headset-only VR button views the current model, while VR Lab opens a separate stretch exercise. The latter only transfers supported orthogonal stretch objects with dimensions in its accepted range; Sculpt and Single Shape do not transfer. Explain what will open and what will carry across. Consider a future shared-project bridge with an explicit return/apply step.
4. **Preserve useful work.** Give saved sculptures editable titles and thumbnails, distinguish Save from Save a copy, offer import/export of recipes, and make deletion recoverable. A manual model currently defaults to “my sculpt,” with repeated saves creating numbered copies.
5. **Improve hierarchy and legibility.** Increase the smallest instructional text; make advanced formulas expandable; use stable spacing and fewer equally prominent borders. Keep selected-object identity and its most useful measurement close to the model.

### Sculpture customization with mathematical integrity

| Opportunity | Benefit | Existing foundation / constraint |
|---|---|---|
| Numeric X/Y/Z, width/height/depth, angle, radius and tube fields | Exact construction and measurable design decisions | Current UI offers ±0.2 moves, uniform size changes, and Y rotation in 15° steps; display fields must account for the 2.6 unit mapping |
| Aspect-ratio lock and independent axis scaling | Compare uniform scaling with stretching one dimension | Shared Prim3D supports stretch; analytic measurement must be updated before exposing it here |
| Duplicate, mirror, align, distribute, ground snap | Symmetry, congruence, pattern construction, less repetitive clicking | Shared Prim3D already has several editing helpers; reuse them with consistent normalization/history |
| Named parts, groups, locking, hide/ghost, optional exploded view | Understand composite solids and manage occlusion | Shared renderer supports labels, hidden and locked state; geometry UI and measurement rules need integration |
| Direct color picker and accessible palettes | Learner ownership and stable part identification | Replace color cycling; pair colors with names/symbols |
| Matte/gloss/wire finishes and scene themes | Make material/structure easier to inspect | Shared renderer has finish options; select restrained defaults and preserve mathematical contrast |
| More shapes and profile-based solids | Extend learning into solids of revolution and fabrication | Prim3D includes lathe/extrude/deformation support; exact/estimated measures must be clearly distinguished |
| Controlled part-count expansion | More expressive constructions | Current geometry UI caps at 14; raise only after measuring classroom-device performance and navigation usability |

Do not enable arbitrary deformation while retaining unchanged primitive formulas. For a stretched sphere or twisted profile, derive the appropriate measurement or label a mesh-based estimate with its limitations.

### Visual enhancements that support reasoning

- Keep the original material visible when selected; add a crisp outline or halo. The current strong emissive selection can wash out color and shading.
- Show one consistent measurement label, adjustable text size, and clear axis/plane labels. Give slices contrasting outlines and visibly clip them to the actual solid.
- Offer front/side/top/isometric views, a ground reference, reset camera, and fit selection. Fit-to-view already exists for sculpts; bring it into a consistent camera control set.
- Keep scenes calm by default. Use optional contextual motion for a transformation, and respect reduced motion. Explain when view scaling changes presentation while math scaling changes measurements.
- Coordinate highlights across model, dimension, formula, and graph. Some of this already exists in immersive mode; extend that visual language consistently to sculpture editing.
- Review controls for comfortable touch size. WCAG 2.2 specifies a 24×24 CSS-pixel minimum subject to exceptions; spacing must be assessed before calling a small control a failure. A larger touch-oriented design target would be appropriate for frequently used manipulation controls. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### Pedagogy and engagement

- **Save a learner-owned investigation record:** prediction, before/after geometry, measured changes, explanation, and a next question. The current sculpt investigation clears its explanation on completion; the anonymous trace intentionally stores only its length. Keep private research telemetry separate from an intentional student portfolio.
- **Accept multiple forms of explanation:** typed text, a labeled sketch, an audio response, or a model demonstration. The current eight-character completion gate measures text length, not reasoning. Provide sentence starters and a simple self-check rather than pretending to automatically assess understanding. This direction aligns with CAST's multiple forms of expression, construction, and communication. [CAST Action & Expression](https://udlguidelines.cast.org/action-expression/).
- **Use purposeful design briefs:** a stable monument using three solid families; two packages with equal volume but different surface areas; a symmetric creature; a tower meeting a material budget. Reward successful reasoning and revision alongside completion.
- **Deepen comparisons already supported:** preserve before/after models, predict a ratio, vary one dimension, and explain invariants. Let a learner investigate why doubling one length doubles volume while doubling every length multiplies it by eight.
- **Make feedback diagnostic:** after an incorrect answer, distinguish radius/diameter, perimeter/area, surface/volume, and units. Offer another attempt and a progressively stronger hint before revealing the final answer.
- **Explain overlapping composites:** preserve the current honest “sum of parts” upper-bound language. Add an exploded view and a visual overlap indicator before attempting Boolean-union measurements. Any voxel estimate should disclose resolution and error.
- **Extend existing instructor tools:** select objectives, starting geometry, constraints, vocabulary, available controls, and response prompts. The immersive lab already has instructor mode and lesson links; expand those rather than introducing a second unrelated teacher system.
- **Support language and learner needs:** several newer sculpt controls, investigations, spoken announcements, and the entire standalone immersive interface are hardcoded in English. Reuse the app's localization path, include unit-aware readouts, and test larger text and zoom.

These are design recommendations to validate with teachers and learners, not claims of measured learning gains.

## Suggested implementation order

1. **Mathematical trust and reliable state:** unify measurements; fix torus sections and scaling; repair challenge scene/answer visibility; fix undo, normalized movement, Retry, and immersive resume. Add behavioral regression cases for the exact failures above.
2. **Usable learning workspace:** mobile model visibility, collapsible immersive HUD, sticky primary controls, clearer VR launch language, unique accessible labels, correct shortcuts, readable type and localized copy.
3. **Creative control and evidence:** exact numeric inspector, duplicate/mirror/align, names and groups, reliable save/export, then learner investigation records and teacher-configurable design briefs.
4. **Visual polish and expanded geometry:** consistent selection/slice graphics, camera presets, finishes/themes, and more complex sculpting only after measurement fidelity and device performance are verified.

Before release, exercise actual headset entry/exit, controller disconnect/reconnect, left/right handed operation, seated reach, recentering, text readability, reduced motion, and an AI-disconnected workflow. The current review does not establish those hardware behaviors.
