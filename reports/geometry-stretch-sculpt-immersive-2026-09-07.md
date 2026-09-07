# Stretch, Sculpt, and immersive Geometry Sandbox enhancements

This pass extends the previous visual/navigation work into the daily editing workflows.

## Stretch workspace

- The builder follows the selected object. Points and lines show the next stretch; surfaces offer Stretch, Taper, and Revolve; solids show their editing tools without impossible stretch controls.
- The dimension strip describes the current selection. Scene objects appear near the top, with compact names, color swatches, measures, and a clear selection state.
- The selected-object inspector supports names, custom colors, opacity, exact placement, dimension editing, spaced copies, deletion, and resetting appearance. Changes remain undoable and survive saving/loading; scaled copies retain appearance metadata.
- Quick line, surface, and prism starters add geometry without replacing the existing construction. Optional prediction, voice, and practice tools are grouped in a disclosure.
- Learn starts with the selected object's measures. The Scale explorer remains directly accessible, while optional investigations and challenges fold away.
- Keyboard, voice, and VR controller actions refresh when the selected operation or its parameters change.

Revolved solids retain their mathematical sweep origin: the inspector explains profile-based placement and does not offer a misleading rigid-position editor. Custom color and opacity still apply. Copies that would exceed the workspace bounds are disabled rather than squeezed into a different spacing.

## Sculpt editor

- **Parts / Edit / Project** views separate adding primitives, working with a selected part, and saving/exporting the whole project. They support keyboard tab navigation and retain their mounted forms.
- Edit provides explicit primitive choice, exact dimensions, XYZ positions/rotations, rotation reset, growth/shrink controls, names, grouping, and locking.
- Arrangement tools include display-unit copy spacing and direction, local XYZ mirror copies with correct rotated geometry, centering, grounding, and snapping to the move-step grid. Refused copies preserve the current scene and history.
- Material controls combine custom colors and finishes with Terracotta, Chalk, Steel, Brass, Ocean enamel, and Berry glaze presets. Presets can affect the selected part or unlocked members of its group.
- Project provides exact whole-sculpture scale and rotation alongside existing save/load, import/export, and optional AI creation. Exact numeric fields retain drafts until Enter or blur, then commit one undoable edit.
- Canvas editing shortcuts open the Edit view and focus visible geometry controls. Existing live drag accumulation and grouped Undo/Redo behavior are retained.

## Immersive Stretch Lab

The standalone immersive lab now has undoable starter shapes, direct axis buttons, exact dimensions, a configurable resize step, color/surface/edge/lighting choices, scene presets, Paper backdrop, saved/shared viewing angles, and direct target navigation. Stretch/Collapse actions remain near the top of the controls. Explain adds teaching projections; Explore keeps the scene quieter.

Phone framing fits the actual visible shape corners above the HUD, including tall shapes in Side view. Controls can collapse to leave the scene available. The main sandbox's **Immersive 3D** menu distinguishes entering the current model with a compatible headset from opening the separate dimensional Stretch Lab. The main canvas retains whole-sculpture XR rendering; the standalone lab remains a point-to-solid dimensional workspace.

The existing session, undo, lesson, sharing, and controller semantics are preserved. The companion's new appearance and camera preferences persist and reset through the same session system.

## Preview and evidence

- [Geometry Sandbox preview](http://127.0.0.1:4177/scratch/geometry-design-2026-09-06/geometry-preview.html)
- [Immersive Stretch Lab](http://127.0.0.1:4177/immersive_geometry/immersive_geometry.html)
- Main implementation/tests/staging evidence: `scratch/geometry-third-pass-2026-09-07/`.
- Companion screenshots and browser results: `reports/geometry-sandbox-refresh-2026-09-06/immersive-customization/`.

Desktop and phone behavior are exercised with real browser rendering. Physical headset/controller hardware is not part of this verification environment.

## Validation

- All 312 distinct main Geometry Sandbox unit checks passed across the combined run and targeted follow-up. Five obsolete panel-text expectations were updated to verify the revised controls and navigation; the full 20-case panel suite then passed.
- All 115 distinct immersive companion unit checks passed, including targeted follow-up after final layout refinements.
- The main browser suite passed 45 behavior checks plus the visual capture case. This includes exact numeric edits, materials, group locks, mirror/copy operations, Stretch selection workflows, keyboard navigation, and starting a new sculpture with complete Undo restoration.
- Six real-browser immersive workflows passed with no page errors or failed requests. Desktop and phone framing, settings, lessons, and primary build actions were exercised.
- Reviewed evidence includes 12 refreshed main screenshots and eight immersive screenshots. The final Stretch inspector fits its sliders and numeric inputs; the Sculpt Parts palette uses consistent geometry thumbnails, and Project exposes New sculpture directly.
- The three English registries contain 166 studio keys (92 added in this pass), preserving unrelated translations. Main and immersive source files match their public mirrors.
- Scoped whitespace validation passed. Physical headset/controller hardware was not exercised.