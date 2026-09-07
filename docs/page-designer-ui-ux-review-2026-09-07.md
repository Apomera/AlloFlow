# Page Designer: UI and UX review

Date: September 7, 2026. Review only: no application source or runtime files were changed.

## Overall assessment

Page Designer has a capable foundation: searchable templates, keyboard object selection, undo/redo, reading order separated from visual layers, accessibility issue actions, command search, and multiple document export routes. The strongest next step is to make the existing tools easier to use: preserve recent work reliably, prioritize the canvas, and surface the controls relevant to the current selection.

This review combines source inspection with an isolated Chromium mount of the real `studio_module.js` component. The fixture uses the component's English fallback strings and sample Event flyer template; host-specific integrations and translated wording can differ. No user documents were opened or changed. No browser page errors occurred during the completed interactions.

## Prioritized findings

### 1. High: preserve the latest edits on close and show save status

**Confirmed behavior:** After an established autosave of Event flyer, changing the title to Unsaved final edit and immediately closing left Event flyer in recovery storage. No warning appeared. The four-second autosave timer is cancelled on unmount, while the close button and Escape call the host close callback directly. Storage failures other than the explicit size limit also have no visible handling in the autosave effect.

**Recommended change:** Track document edits independently of ordinary UI renders. Flush recovery data on close and page visibility changes, and expose Saving, Saved on this device, and Could not save states. If recovery fails, keep a clear route to download the project. Use the same close path for the button and Escape.

**Acceptance:** Edit, close immediately, reopen, and recover the exact latest content. Simulated quota or disabled-storage failures produce a visible actionable status.

Source: `studio_module.js:4585`, `studio_module.js:4165`, `studio_module.js:6740`, `studio_module.js:6923`.

### 2. High: give the canvas priority on tablets and phones

**Confirmed measurements:** At 390 x 844, the header occupies 163 pixels and the canvas viewport is only 128 pixels high. At 1024 x 768, the canvas gets 196 pixels. Insertion tools, canvas navigation, and the object inspector are stacked in separate scrolling regions. The phone screenshot shows only a small strip of the flyer.

**Recommended change:** Keep the canvas as the primary surface. Open Insert and Properties in dismissible drawers or a bottom panel, showing one at a time. Reduce the persistent header to the document title, undo, and an action menu; keep save status and export easy to find. Move page reordering and infrequent commands into a page menu.

**Acceptance:** Opening a document on a phone shows a useful section of the page immediately. Selecting an object exposes its controls without forcing users through the insertion list and navigator. Verify touch, keyboard, landscape, and increased text size.

Source: `studio_module.js:2332`, `studio_module.js:5944`, `studio_module.js:7198`.

### 3. High: make selected controls legible

**Confirmed behavior:** The enabled, selected Snap control has text `rgb(226,232,240)` on `rgb(224,231,255)` in the light theme. Its label is nearly invisible in the browser screenshots. The active style replaces the background but retains the pale header-button text. Selection zoom shows the same visual styling concern in the selected-object screenshot.

**Recommended change:** Define shared default, selected, disabled, hover, and focus styles with explicit foreground/background pairs for each theme. Review all controls that combine header-button styles with the selected background. Use a clear selected indicator as well as color.

**Acceptance:** Active labels remain readable in light, dark, and contrast themes, with keyboard focus clearly distinguishable from selection.

Source: `studio_module.js:4628`, `studio_module.js:5950`, `studio_module.js:7218`.

### 4. Medium: make Fit use the actual canvas viewport

**Confirmed behavior:** At 1280 x 720 with Fit selected, the page stays approximately 655 pixels tall inside a 510-pixel canvas viewport. The bottom remains cropped. Desktop fit currently returns the fixed base scale, and stacked fit considers width without using available height.

**Recommended change:** Separate Fit page from Fit width. Calculate scale from the measured canvas viewport after header/panels are laid out, and update it when panels, orientation, or viewport size change. Preserve manual zoom until the user chooses a fit mode again.

**Acceptance:** Fit page shows all four page edges on a short laptop and after opening the export or accessibility panel; Fit width intentionally allows vertical scrolling.

Source: `studio_module.js:2359`, `studio_module.js:4644`, `studio_module.js:7216`.

### 5. Medium: prioritize editing controls when an object is selected

**Observed friction:** Selecting the flyer title leaves text-editing controls below the visible right panel at 1280 x 900. Reading-order tabs, two search fields, filters, status messages, suggested actions, geometry, and alignment precede the text field. Duplicate and Page width also appear in more than one place.

**Recommended change:** Make Properties the default inspector tab after selection, with separate Layers / Reading order tabs. Put text and typography first for text objects, image/alt/crop controls first for images, and geometry under an expandable Layout section. Keep the selection's accessibility status adjacent to the relevant control. Retain a single obvious location for each repeated action.

**Acceptance:** Selecting a title makes its text field and basic typography visible immediately; selecting an image exposes its description and replacement controls without scrolling through unrelated content.

Source: `studio_module.js:6599`, `studio_module.js:7267`, `studio_module.js:7313`.

### 6. Medium: simplify save and export choices

**Observed friction:** Template-card Save bookmarks a template; editor Save downloads a project; Portfolio stores a different artifact; linked activities have another save-back action. Export exposes approximately ten actions alongside recommendations and four readiness cards, occupying substantial space above the canvas.

**Recommended change:** Use explicit verbs such as Favorite template, Download project, Save to Activity, and Add to portfolio. Organize export by intent: Share an accessible document, Print, Edit elsewhere, and Project/teacher files. Present one recommended format and reveal advanced formats on demand. Keep blockers separate from advisory review items, with a direct fix link.

**Acceptance:** A first-time teacher can identify how to resume editing later versus how to distribute a finished document without interpreting file extensions. Export review remains available without pushing the editable page out of view.

Source: `studio_module.js:5823`, `studio_module.js:6109`, `studio_module.js:6920`, `studio_module.js:7008`.

### 7. Medium: make canvas annotations optional

**Observed friction:** Reading-order badges appear on every object during ordinary editing. In the flyer, the badges overlap the start of When & where and the body copy. These annotations are useful for review but obscure the visual composition.

**Recommended change:** Add an explicit Review overlays toggle or review mode. Show order numbers when reviewing reading order, retain issue indicators where necessary, and keep the screen-reader descriptions independent of whether visual badges are displayed. A clean preview should be one action away.

**Acceptance:** The teacher can inspect the intended visual layout without overlapping labels, then restore reading-order annotations without altering document semantics.

Source: `studio_module.js:6309`.

## Suggested implementation order

1. Repair close/recovery behavior, active-state colors, and measured fit modes.
2. Simplify selected-object properties and clarify save/export labels.
3. Restructure phone/tablet panels around the canvas, then reduce persistent review overlays and export-panel density.

The first group addresses reproducible defects without requiring a broad redesign. The later groups should be validated with teacher workflows: create a flyer, revise a worksheet, reorder a slide deck, fix an image description, and export an accessible copy.

## Evidence and limits

Browser sizes: 1280 x 900, 1280 x 720, 1024 x 768, and 390 x 844. Reviewed template selection, object selection, export-panel opening, viewport resizing, and close/recovery behavior. This is a targeted usability review, not a full accessibility certification, assistive-technology audit, or exported-file fidelity test. The primary application files were not modified.

Evidence folder: `reports/page-designer-review-2026-09-07/`.

- `browser-findings.json`: dimensions, control styles, errors, and recovery result.
- `browser-review.cjs`: isolated reproduction script.
- `templates-desktop.png`: template entry flow.
- `editor-desktop.png`, `editor-short-laptop.png`, `editor-tablet.png`, `editor-mobile.png`: responsive layout.
- `selected-text-desktop.png`: selected-text inspector.
- `export-desktop.png`: export choices and canvas impact.
