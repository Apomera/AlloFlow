const fs=require('fs'),path=require('path'),r=JSON.parse(fs.readFileSync(path.join(__dirname,'verification.json'),'utf8'));
const link=name=>path.join(__dirname,name).replaceAll('\\','/');
const review=`# Geometry World — architecture, projects, and direct building

Local changes are complete. Canonical source and desktop assets match. These changes have not been committed or deployed.

## What changed

- **Architectural starter kit:** eight editable recipes across Architecture, Landscape, and Buildings: garden arch, timber stairs, framed window, gabled roof, footbridge, garden bench, market pavilion, and lookout tower. Each has a geometry thumbnail, category, block count, placement preview, and one-step Undo. Rotated shape thumbnails now hide back-facing polygons correctly.
- **Direct controls:** click individual blocks or drag a rectangle; replace, add, or remove from a selection. Manual selections remain exact through measurement refresh, transforms, Undo, and Print Lab. Rectangles intentionally include blocks behind visible surfaces. Direction buttons preview a one-cell move. Drag-to-orbit, Shift/right-drag pan, wheel zoom, and camera buttons complement the existing preset views.
- **My Worlds:** up to eight browser-local Free Build projects with names and thumbnails. Autosave shares the existing refresh loop and flushes on page exit and engine teardown. Storage errors and stale writes retain previous saved data and explain how to download the current build. Import recovery and Print Lab preserve draft identity. Reopened projects frame the complete build, restore the block counter, and skip the first-build tutorial.
- **World appearance:** limestone inlays, warm lanterns, terracotta planters, and courtyard pennants refine the garden workshop. The scenery stays outside the editable plot and uses the existing three courtyard draw calls.
- **Lesson continuity:** activity markers change from sage to green/gold when a numeric goal is met or the learner records a self-review. Generated-lesson planning now explicitly connects later tasks to earlier measurements and design decisions, with supported and stretch continuations. Progress markers record evidence; they do not grade an entire design.
- **Print preparation:** preview a padded stone base with columns beneath raised footprints, or lower a selection to the ground. Apply uses a single reversible transaction and rechecks collisions and capacity. Internal fractional gaps and other mesh concerns still require Print Lab review.

## Verification

**${r.unit.passed} unit checks passed across ${r.unit.files} files; ${r.unit.failed} failed. ${r.browser.passed} browser assertions passed; no browser page errors.**

The full Geometry World suite was followed by affected-file reruns after fixes. The aggregate counts each file once using its latest completed report. Syntax, desktop asset parity, and the scoped whitespace check passed.

Browser verification exercised the actual local React/Three interface with explicit block fixtures: native starter placement, exact click/add and rectangle selection, one-step moves and Undo, camera orbit, project save/refresh/reopen, page-exit saving, base preparation, 390/320-pixel layouts, high contrast, and activity markers. It used Chromium with software WebGL in a minimal local host; the deployed Gemini Canvas and physical printers were not exercised.

Projects retain editable blocks, materials, shapes, rotations, and the garden preference. The local project format does not preserve Undo history or NPC dialogue. JSON downloads provide portable copies. No new external assets, model calls, or services are required by these features.

[Machine-readable verification](${link('verification.json')}) · [Native browser flow](${link('browser.json')}) · [Final appearance and recovery checks](${link('browser-final.json')})

## Screenshots

### Architectural starter kit

![Architectural starter kit with corrected roof thumbnail](${link('09-final-starter-gallery.png')})

### My Worlds

![Named project shelf](${link('12-final-my-worlds.png')})

### Garden workshop

![Editable pavilion in the refined garden workshop](${link('11-final-garden-world.png')})

### Small phone layout

![Starter library at 320 pixels](${link('05-mobile-320.png')})

### Lesson progress

![Activity self-review and world marker progress](${link('07-activity-progress.png')})

## Files

Production changes are in stem_lab/stem_tool_geometryworld.js and stem_lab/stem_tool_geometryworld_builder.js, mirrored under desktop/web-app/public/stem_lab/. New behavior checks are in tests/geometry_world_workshop.test.js and tests/geometry_world_exact_selection.test.js; the selected-editor UI checks include the exact-selection refresh regression.

The application scripts in this report directory are a record of the work and are not runtime dependencies. Do not rerun the one-time source-edit scripts.
`;
fs.writeFileSync(path.join(__dirname,'REVIEW.md'),review);console.log('Review written.');
