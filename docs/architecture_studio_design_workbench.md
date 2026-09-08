# Architecture Studio design workbench

Open **Design workbench** from the workspace bar, or choose **Design a room** in an empty 3D view.

## Build a structure

Choose Room shell, Straight wall, or Floor slab. Set width, depth, wall height, and lower-corner coordinates. Room shells include a solid base with optional wood doors, glass windows, and a slab ceiling. Wall height counts layers above the base; a ceiling adds one layer. Dimensions and areas use grid units; costs use the studio's existing teaching credits.

The top-view preview shows the footprint and openings, with crosses at occupied cells. Block count, footprint, interior floor area, total height, and cost update before insertion. **Use floor-grid cursor** transfers the current grid position and layer into the origin.

**Add to build** inserts the complete structure in one undo step. It never replaces occupied cells or silently clips a structure to fit.

## Edit a region

Switch to **Region edits**. Select the entire build, current floor, or picked block. The selection card shows block count and occupied width, depth, and height. Expand **Selection coordinates** to edit an inclusive box using two corners. Reversed corners work. The selection includes hidden layers and filtered materials; the panel makes that scope explicit. Cyan outlines in 3D and cyan floor-grid borders mark the region.

- Copy and move use X/Y/Z offsets. Moving can reuse cells vacated by the same selection; copying leaves the source intact.
- Rotate turns blocks and shape orientations 90 degrees around Y, anchored at the selection's minimum X/Z corner.
- Paint changes material and color while retaining shape and rotation.
- Delete removes all selected blocks as one undo step.

Selections follow moved, copied, and rotated blocks. Successful edits reveal the live build by clearing restrictive view filters. Existing gallery, share, blueprint, STL, and Print Lab workflows use the same block data.

## Repeat parts of a design

In **Region edits**, select the source blocks and choose **Repeat copies**. Set **New copies** from 1 through 12; the original is not included in that count. Use **Row along X**, **Row along Z**, or **Stack above** to set spacing from the occupied selection dimensions. Rows leave one empty grid cell between copies. Stacking places the next copy directly above the selected height with no gap; it does not add structural supports or determine whether the design is buildable.

Edit **Spacing X/Y/Z** to set a custom direction or distance, including negative or combined offsets. Copy 1 is one spacing step from the original, copy 2 is two steps away, and so on. Materials, colors, shapes, and rotations are retained.

The labeled layout preview offers a plan and front elevation. The original uses solid outlines, new copies use dashed outlines, and crosses mark actual occupied 3D cells. Plan views collapse height; front views collapse depth, so projected overlap alone is not a conflict. Stacking automatically chooses the front view. The summary shows proposed copy count, added blocks, material credits, and layout dimensions. The preview is a grid-cell diagram, not detailed shape geometry.

**Add repeated copies** applies every copy in one undo step and keeps the original region selected. The complete layout is checked against the current model, including collisions between new copies, world bounds, and the 4,096-block limit. A failed operation changes neither geometry nor history. Replay remains read-only. Changing counts, spacing, presets, or preview views does not edit the model. The controls use native labels, keyboard operation, visible focus, and larger phone targets; preview updates do not produce a live announcement on every keystroke. Failed-edit notices compare the same normalized model as the displayed build, so feedback remains visible for older saved blocks with missing properties.

## Navigate the floor grid

Choose **Floor Grid** in the build area. The **Editing floor** selector lists all 32 floors and the block count on each one. Use the adjacent Previous floor and Next floor buttons for single-floor changes. The cursor readout shows the active X, Y, and Z coordinates; the visible-window label reports the displayed X/Z range.

Expand **Go to coordinates**, enter whole-number **Grid X** and **Grid Z** values from -64 through 64, and choose **Go to cell** or press Enter. The grid moves keyboard focus to that cell, including distant empty coordinates and positions in an empty project. Navigation alone changes neither blocks nor undo history. Enter or Space on the focused cell then uses the active building tool. Incomplete, fractional, and out-of-bounds inputs show an explanation and disable the jump.

Enable **Show floor below** to align a new floor with the one beneath it. Dashed outlines appear inside empty current-floor cells with a block directly below. Their accessible names identify the reference material, shape, and floor. These are alignment references; they do not determine structural support. Painting or erasing an empty reference cell leaves the lower block intact. The toggle is disabled at ground level and retains its preference for higher floors.

Counts and references include every material, regardless of the 3D view filters. During construction replay, they follow the selected replay frame and editing stays read-only. The grid retains arrow-key navigation, a single tab stop among cells, and focus after coordinate jumps. Its controls wrap for phones, with 44px floor buttons, coordinate inputs, and disclosure targets.

## Materials schedule

Open **Materials schedule** in the feature toolbar. It replaces the former BOM list and opens at the top of a wider sidebar, with keyboard focus on its heading. Choose **Full build** or **One floor**, then group quantities by **Material** or **Shape**. The floor selector lists all 32 levels and their live block counts. Schedule floor selection is independent of the editing floor.

Summary cards show block count, number of materials, and teaching credits. The table includes quantities, each group’s share of blocks, and its credit total. Shares are rounded to one decimal place and may not sum to exactly 100%. Credits use the existing studio price for each block’s material; shapes with several materials sum those individual prices. These are occupied grid-block quantities and teaching prices, not physical material volumes or real construction estimates.

The schedule includes the whole live model within its selected scope, including geometry hidden by 3D filters. It explicitly identifies this live-model scope during replay. Changing scope, grouping, or floor and downloading a schedule do not change geometry, undo history, the editing floor, view filters, or replay. Quantities refresh after edits and undo/redo. Empty scopes show guidance and disable download.

**Download schedule CSV** exports the selected grouping and scope using the same quantities shown in the table. Columns are Scope, Floor, Group, Item, Blocks, Share (%), and Teaching credits. Column names and scope/group values are stable English identifiers; item names follow the displayed labels. The UTF-8 CSV includes a byte-order mark, quoted fields, escaped quotes, and protection against spreadsheet formula interpretation in text labels. The filename includes the project name, grouping, and selected floor when applicable.

**Close schedule** returns focus to its toolbar button. Escape also closes it from the panel, except when a native floor or grouping selector owns the key. Opening Design workbench or Project & revisions closes the schedule; visiting Drawing desk and returning preserves it. Controls have 44px targets, the table uses row and column headers, and the phone sidebar scrolls to keep every row and the download reachable.

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

## Drawing desk

Open **Drawing desk** in the workspace bar. It replaces the work area with a drawing workspace; **Return to build** or Escape restores the previous 3D/grid view and returns focus to the toolbar.

Choose a floor plan, front elevation, right elevation, or cut section. The floor selector lists the number of blocks at every Y level, including empty floors. A plan is an exact floor slice, so a roof does not conceal the floor below it. Front elevations show the nearest cells from negative Z; right elevations look from positive X. A section contains only cells at the selected Z coordinate. The red line in the plan marks the section through the center of that Z row.

All views use the complete live model and its overall extents, including cells hidden by 3D filters. During replay, the desk explicitly states that it shows the live model. Opening drawings does not change geometry, undo history, replay, or filters. Elevations extend to the Y=0 ground datum, including beneath floating blocks.

### Dimensions and measurements

Dimensions describe the outer edges of the occupied grid envelope. A cell at X=0 occupies the interval from 0 through 1; a span of cells from X=-2 through X=2 therefore has width 5. Floor plans use X/Z axes; elevations and sections use X/Y or Z/Y. Dimensions use grid units.

Enable **Measure a span** and click two points, or enter start and end coordinates. Pointer picks snap to half a grid unit. The panel shows the straight-line distance and signed changes on each axis. Out-of-frame or incomplete coordinates show feedback and disable sheet download until corrected. Reset restores a diagonal across the view's extents. Changing views, floor, section, or model clears the active measurement so it cannot be mistaken for a measurement of a different drawing.

### Drawing sheet

**Download drawing sheet** creates a standalone SVG with the selected floor plan, front and right elevations, and selected cut section. It includes the project name, model dimensions, material counts, and a bounded excerpt of the design notes. Full notes remain in the portable project file. The current measurement is included on its active view.

Each drawing fits its own frame; views are not presented at a shared paper scale. The grid and dimension toggles also apply to the download. Text is escaped as SVG content, and the export has no scripts or external resources.

Drawings represent occupied grid cells rather than detailed curved or sloped geometry. Use the existing STL/Print Lab workflow for shape geometry.

## Navigation, zoom, and accessibility

The workspace bar keeps **Design workbench**, **Drawing desk**, and **Project & revisions** visible together. The open design workbench has a wider desktop sidebar, larger headings, a selection summary, and expandable coordinate fields. Matching spacing presets show an active border and pressed state. On phones the workbench uses more vertical space, with the model reachable below it in the scrollable workspace. On small screens, Undo, Redo, Save, and Clear wrap into a separate row with larger targets. Secondary building tools remain in their own horizontal toolbar and are hidden while using the drawing desk.

The drawing preview now has **Zoom drawing in**, **Zoom drawing out**, and **Fit drawing** controls. Zoom runs from 100% through 400% of the fitted view; this is a viewing magnification, not a paper scale. Scroll the enlarged drawing, or focus its named viewport and use the arrow keys to pan. Shift plus an arrow pans farther. The + and − keys zoom, and 0 or Home restores fit. Browser shortcuts using Control or Command remain available.

Changing the drawing view, floor, section, or model resets the viewer to fit. Zoom and panning do not alter the model, measurement values, project data, or exported sheet. Measurement picks remain accurate at every zoom level. The viewport responds to size changes and releases its resize observer when closed.

Primary buttons expose expanded state only when their associated content exists. Returning from drawings restores the previous build view and focus. Visible focus outlines, named groups, larger drawing controls, and higher-contrast toolbar text support keyboard and screen-reader use. Automated accessibility checks cover the tested build and drawing states in light, dark, and high-contrast appearances; they do not replace evaluation of every possible tool state or assistive technology.

## Implementation and boundaries

The window.__alloArchDesign test API exposes pure generation, region selection, edit validation, and state transactions. Mutation handlers revalidate against the latest state. Failed edits leave blocks and history unchanged; construction replay stays read-only.

The existing X/Z bounds of -64 through 64, Y bounds of 0 through 31, 4,096-block limit, and 50-entry undo history remain enforced. Generation rejects invalid dimensions and oversized designs before allocation. Region outlines are disposed with the renderer lifecycle.

The source and desktop public copy stay identical. New labels and feedback are registered in both UI string registries; the harvest JSON records their English source for the existing translation pipeline.

## Validation

Coverage includes room geometry, openings, ceilings, quantities, invalid dimensions, collisions, capacity, negative coordinates, group transforms, property preservation, no-op edits, bounded history, latest-state conflicts, replay protection, desktop and phone workflows, and WebGL selection outlines.

Results: all 13 Architecture Studio unit suites passed (368 tests), including 21 materials-schedule checks. Eight Chromium workflows passed in the schedule refinement: scope and grouping, CSV content and filename, live quantity updates after edits and undo, replay and workspace preservation, keyboard focus, 320px phone controls and scrolling, plus existing design, project, workspace, and grid regressions. Axe reported no selected WCAG 2 A/AA, 2.1 AA, or 2.2 AA violations in the tested schedule and grid states across light, dark, and high-contrast appearances. Desktop and phone schedule screenshots were visually reviewed. Local browser validation disabled video/trace recording; the existing test assertions remain intact.

No deployment or push was performed.

Repository gates passed: pipeline integrity, source-pair synchronization, staged file sizes, Lumen preservation, localization staleness, and whitespace. Other work in the shared repository is preserved.
