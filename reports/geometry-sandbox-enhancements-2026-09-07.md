# Geometry Sandbox — second enhancement pass

This continues the visual and navigation redesign in `geometry-sandbox-redesign-2026-09-06.md`.

## Building and navigation

- Precise point coordinates and grid snapping now sit in a labeled disclosure. The primary point-placement and stretching actions remain visible.
- Saved constructions live in **Build**, beside the construction workflow, instead of in display settings. Existing saved data, naming, loading, and deletion behavior are retained.
- A compact canvas action bar opens the selected object's size controls or its measurements. Sculpt editing opens the precise-part inspector. Points and revolutions do not display a size-edit action they cannot fulfill.
- Empty Stretch and Sculpt scenes offer a clear first action: **Place first point** or **Start with a box**. The empty-state text adapts to the Paper background.
- The active lesson stays visible in **Learn**, with a direct route back to building. Lesson 7 links directly to the Scale explorer and explains the selected-prism prerequisite.
- Contextual controls receive keyboard focus. Mobile scrolling accounts for both the sticky canvas height and its minimum size.

## Customization

Stretch constructions support **Translucent** or **Solid** surfaces and **Dim other objects**. Dimming only applies when a valid object is selected; the remaining objects stay selectable. Selected outlines, segment endpoints, rectangle depth handling, and the original geometry are preserved. These display settings persist with the workspace and are included in Reset display settings.

## Editing reliability

Stretch now has persistent **Undo / Redo** with compatible 30-step history. Construction edits, deletion, clearing, resizing, loading, and scaled copies can be undone and redone. New geometry edits invalidate redo; saving and unchanged controls retain it. Restoring history also restores selection and cancels pending predictions without changing lesson or display preferences.

Numeric edits coalesce until focus leaves the field. Slider drags coalesce until release or cancellation, including the browser's pointerdown-before-blur ordering when switching controls. Keyboard slider adjustments are undoable. Ctrl/Cmd+Z, Shift+Z, and Y work in the canvas and on Stretch range controls; text and number inputs retain native editing shortcuts.

The **Lean it over** lesson now requires an oblique prism. An oblique pyramid previously satisfied the prism-specific lesson; regression coverage also rejects a slanted rectangle.

## Validation

- All eight focused main Geometry Sandbox unit files passed: **267 tests** in the combined run.
- The final history/focus refinement added one further regression; its final history and visual-clarity run passed **45/45**, for **268 distinct main geometry unit checks** at that stage. Six additional rapid-sculpt-drag regressions then passed in a final **51/51** targeted run, bringing this pass to **274 distinct geometry unit checks** across the combined and targeted runs.
- Rendering tests exercise unchanged defaults, solid surfaces, dimmed mesh/line/endpoint components, missing/stale selections, retained selection metadata, and source geometry immutability.
- Source and desktop/public Geometry Sandbox copies are synchronized. All **74** redesign English keys are registered in both dictionaries and the geometry English registry; **20** were added in this pass, preserving unrelated bytes.

Unit evidence: `scratch/geometry-design-2026-09-06/second-unit-results.json`. The browser preview loads the actual sandbox source using a lightweight local host and its own saved model/preferences.

Local preview: [Geometry Sandbox](http://127.0.0.1:4177/scratch/geometry-design-2026-09-06/geometry-preview.html).

## Final browser and visual verification

All **33 browser behavior scenarios** passed, plus one screenshot/fit verification case: 11 navigation behaviors, 10 existing WebGL scenarios, and 12 existing workbench scenarios. Navigation coverage includes saved constructions, numeric edit transactions, contextual focus, lesson prerequisites, persisted/reset appearance, phone overflow, and empty-scene entry actions.

The existing sculpt drag regression exposed a real stale-state bug: two rapid movements could both calculate from the same old position. The fix synchronizes the live recipe before React renders and uses it for subsequent movement and part updates. It also refreshes drag handlers when movement-step, grouping, or units change. The original browser assertion passed unchanged after the fix; six new mounted regressions cover cumulative movements, group bounds, history grouping, and immediate preference changes.

Eight screenshots were captured in `scratch/geometry-design-2026-09-06/second-captures/`, including desktop/phone lessons and sculpting, empty Stretch scenes, Paper phone appearance, and solid surfaces with dimmed neighbors. Desktop and phone images were visually inspected; the browser capture also checks fitted sculpt bounds.

Final source/public SHA-256: `278AB95E6E0E199E72626D2F051EA37B1633CEC7654A02FA7CA67B295761DF33`. Scoped syntax/whitespace checks passed. The existing preview and its geometry module both returned HTTP 200. Refresh the preview to load the changes; its saved geometry remains available.