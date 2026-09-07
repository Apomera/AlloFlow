# Architecture Studio design workbench

Open **Design workbench** from the first toolbar button, or choose **Design a room** in an empty 3D view.

## Build a structure

Choose Room shell, Straight wall, or Floor slab. Set width, depth, wall height, and lower-corner coordinates. Room shells include a solid base with optional wood doors, glass windows, and a slab ceiling. Wall height counts layers above the base; a ceiling adds one layer. Dimensions and areas use grid units; costs use the studio's existing teaching credits.

The top-view preview shows the footprint and openings, with crosses at occupied cells. Block count, footprint, interior floor area, total height, and cost update before insertion. **Use floor-grid cursor** transfers the current grid position and layer into the origin.

**Add to build** inserts the complete structure in one undo step. It never replaces occupied cells or silently clips a structure to fit.

## Edit a region

Switch to **Region edits**. Select the entire build, current floor, picked block, or an inclusive box using two corners. Reversed corners work. The selection includes hidden layers and filtered materials; the panel makes that scope explicit. Cyan outlines in 3D and cyan floor-grid borders mark the region.

- Copy and move use X/Y/Z offsets. Moving can reuse cells vacated by the same selection; copying leaves the source intact.
- Rotate turns blocks and shape orientations 90 degrees around Y, anchored at the selection's minimum X/Z corner.
- Paint changes material and color while retaining shape and rotation.
- Delete removes all selected blocks as one undo step.

Selections follow moved, copied, and rotated blocks. Successful edits reveal the live build by clearing restrictive view filters. Existing gallery, share, blueprint, STL, and Print Lab workflows use the same block data.

## Projects and revisions

Open **Project & revisions** next to Design workbench. Give the build a name and design notes, then choose **Save snapshot**. The panel reports whether the current geometry and notes match the saved snapshot. Snapshots include names, notes, blocks, and their existing thumbnail; the browser gallery keeps the latest 50 snapshots.

**Download project** saves a portable .archstudio.json file containing the model, name, and notes. Browser snapshots stay in this browser; the downloaded file is the portable copy. It excludes undo history, interface settings, and unrelated tool state.

### Preview, open, or merge a project

Choose **Preview a project file** to read a local file without changing the build. Inspect its name, notes, top-view plan, block count, and proposed differences before applying it.

- **Open as project** replaces the current model, name, and notes.
- **Merge model into build** adds the incoming blocks at the specified X/Y/Z offset while keeping the current project's name and notes.
- **Cancel preview** dismisses the file without changing the model.

The complete import is one undo step. Undo and redo restore project names, notes, and saved-snapshot identity along with geometry. Merge refuses occupied cells, out-of-bounds coordinates, and models above the block limit; it never partially imports. Apply rechecks the current build, so a previously valid preview cannot overwrite a new occupied cell.

Files must use format alloflow.architecture-studio, version 1, with a project object (name and notes) and a blocks array. Names allow 80 characters, notes 4,000 characters, and files up to 2 MiB. Every block must have valid integer coordinates, shape, material, six-digit hex color, and rotation in multiples of 90 degrees. Malformed or unsupported files are rejected as a whole. A valid empty project can be opened; it cannot be merged.

Choosing another file cancels the previous read. Closing the panel also cancels its read and clears its loading indicator. Late callbacks cannot replace a newer preview or reopen a canceled one.

### Compare and restore a snapshot

Choose **Compare with saved revision** to see added, removed, changed, and unchanged cells, plus the difference in studio material credits. A changed cell has a different shape, material, color, or rotation at the same coordinates. The comparison uses the whole live model. **Restore this snapshot** restores its model and notes and can be undone.

Replay keeps project-editing controls disabled. Legacy block-only history frames continue to render, while newer project frames retain their associated details.

## Implementation and boundaries

The window.__alloArchDesign test API exposes pure generation, region selection, edit validation, and state transactions. Mutation handlers revalidate against the latest state. Failed edits leave blocks and history unchanged; construction replay stays read-only.

The existing X/Z bounds of -64 through 64, Y bounds of 0 through 31, 4,096-block limit, and 50-entry undo history remain enforced. Generation rejects invalid dimensions and oversized designs before allocation. Region outlines are disposed with the renderer lifecycle.

The source and desktop public copy stay identical. New labels and feedback are registered in both UI string registries; the harvest JSON records their English source for the existing translation pipeline.

## Validation

Coverage includes room geometry, openings, ceilings, quantities, invalid dimensions, collisions, capacity, negative coordinates, group transforms, property preservation, no-op edits, bounded history, latest-state conflicts, replay protection, desktop and phone workflows, and WebGL selection outlines.

Results: all eight Architecture Studio unit suites passed (172 tests). Nine focused Chromium workbench/project workflows passed, including local downloads, named snapshots, revision restore, imports, stale-state validation, cancellation, replay, and phone use. The new cancellation check initially referenced the wrong state field; the corrected assertion passed in an isolated artifact directory. The earlier context-loss and renderer-teardown checks also passed. Desktop and phone screenshots were visually reviewed.

No deployment or push was performed.

Repository gates passed: pipeline integrity, source-pair synchronization, staged file sizes, Lumen preservation, localization staleness, and whitespace. The initial source-pair blocker was resolved in the workspace during this follow-up. Other work in the shared repository is preserved.
