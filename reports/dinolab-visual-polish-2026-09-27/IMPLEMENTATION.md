# Dinosaur Lab: visual refinement

Implemented locally on September 27, 2026. The largest changes are in **Anatomy → Evidence workbench** and **Explore → Species field guide**.

## Visual changes

- **A specimen-sheet identity:** a restrained teal accent, warmer illustration surfaces, serif display headings, consistent margins, and softer panel depth distinguish the fossil case from the learner's response area.
- **Illustrated case selectors:** small previews make the bone and skin investigations recognizable before opening them. Selection is shown through an outline and surface change, with written progress labels.
- **More informative diagrams:** the forearm now has contour lines, raised attachment marks, a feature callout, and a schematic detail inset. The skin illustration uses varied polygonal shapes, a preserved-patch boundary, and a highlighted feature. Both retain descriptions and explicit schematic/not-to-scale labels.
- **Clearer controls:** the active step has an underline, primary actions have stronger contrast, cited evidence gets a distinct border and background, and feedback sits beside the relevant statement. Small icons reinforce the observation, inference, and overreach labels.
- **Refined catalog art:** smoother group silhouettes, subtle grounding shadows, framed specimen portraits, and clearer selected-card styling carry the visual language into Explore and the opening time investigation.
- **Responsive presentation:** compact case previews and stacked reference content fit narrow screens. The evidence key becomes a compact list on phones. The source panel can remain visible alongside writing on tall desktop screens.

Colors derive from the existing application theme. High-contrast and Windows forced-colors modes retain visible outlines and diagram features. Hover transitions are omitted when reduced motion is requested. Decorative previews and icons are hidden from assistive technology; the main diagram retains its descriptive name.

The illustrations are code-native SVGs, with no added image downloads or dependencies. This pass changes presentation, not the scientific case content, scoring, saved-state format, or notebook export behavior. Main and desktop public source copies are synchronized.

## Verification

- **109 regression tests passed** across the golden render, evidence workbench, field guide, dynamic localization, and time inquiry suites. Updated the 18 render snapshots for the new artwork and styling. Final run had no stylesheet parsing warnings. See `unit-tests.json`.
- **Two Chromium scenarios passed on the final run**, with automatic retries disabled: the complete evidence/notebook workflow and a dedicated visual verification scenario. See `browser-final.json`.
- **15 accessibility scans, zero violations:** nine writing/classification/notebook checks and six Anatomy/Explore checks across default, dark, and high-contrast themes. See `accessibility.json` and `visual-accessibility.json`.
- **Responsive checks passed at 320px, 390px, and 768px.** Case text stays inside cards, narrow screens avoid a sticky source panel, and the page has no horizontal overflow.
- **Reduced-motion and forced-colors checks passed.** Desktop, phone, dark, and forced-colors captures were visually inspected. These automated checks do not constitute a complete assistive-technology audit.
- The main source and desktop mirror have the same SHA-256 hash. See `verification.json`.

An initial visual run completed its assertions but timed out while closing the browser. The final run completed both scenarios in sequence, without concurrent unit tests. The initial diagnostic report is retained as `browser-tests.json`.

## Screenshots

### Evidence workbench

![Refined workbench](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-visual-polish-2026-09-27/anatomy-theme-default.png)

### Explore and species portraits

![Refined Explore screen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-visual-polish-2026-09-27/explore-theme-default.png)

### Phone layout

![Phone layout](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-visual-polish-2026-09-27/anatomy-phone.png)

### Dark theme

![Dark workbench](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-visual-polish-2026-09-27/anatomy-theme-dark.png)

### Windows forced colors

![Forced-colors workbench](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-visual-polish-2026-09-27/anatomy-forced-colors.png)
