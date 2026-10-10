# Perception Lab: browsing inside the focused workspace

The focused workspace now lets learners browse all six experiments without closing it. A labeled selector and cyclic **Previous / Next** controls update the actual drawing inside the same native dialog. Each experiment retains its settings, prediction, note, and reveal state. The pinned comparison, notebook, and viewing layout are preserved. A short description explains the current drawing without adding unrevealed answers.

Switching pauses moiré at its visible frame, applies valid numeric edits on native blur before navigating, resets pane scroll positions, announces the new experiment, and returns keyboard focus to the initiating control. The new navigation remains disabled for the entire active repeated study, including revealed results, until **End repeated study**. Pending switches lock drawing mutations and study start; closing the workspace or receiving a newer external experiment/profile change cancels stale requests. A guarded committed-state check keeps delayed parent updates inside the same dialog and rejects conflicting replacements.

The viewing area has a text-relative minimum height. The dialog scrolls when its heading and navigation need more room, allowing the full drawing to remain inspectable at 200% text. Existing separate-pane scrolling still applies when space permits.

The source and desktop copy are identical. Scientific experiment definitions, normalization, measurements, drawing geometry, study helpers, and saved data formats are unchanged. Ten English navigation strings are merged into both catalogs. Nothing was committed.

## Verification

- **127 targeted tests passed:** 27 focused-browsing cases plus 100 regressions for focused workspace, live comparisons, precise controls, and PNG export. Each suite ran separately; complete results and execution records are retained.
- **30 Chromium check groups passed:** all six experiments; native pointer and keyboard blur; cyclic navigation and focus wrapping; preserved comparisons and layout; visible-frame moiré pause; locks through all three matching studies and reveals; ten viewport/text combinations from 320 px to 1440 px; 200% text; dark/high-contrast themes; and forced colors.
- Browser checks require the drawing's actual frame to remain visible after navigation, accounting for clipping ancestors. Header controls have at least 44 px targets. No horizontal overflow, targeted WCAG A/AA axe violations, or browser runtime errors were found. Final screenshots were reviewed.
- This is a targeted Chromium and unit-test pass; the full repository and other browsers were not audited. Chromium uses software rendering for this environment.

During development, verification exposed a pending-switch study-start race, a stale destination acceptance case, incomplete horizontal scroll reset, and a clipped drawing in a medium-width window at 200% text. The final guards and layout address those cases, with explicit coverage.

## Evidence

- [Validation](validation.json)
- [Browsing tests](focus-browsing-tests.json)
- [Regressions](regression-summary.json)
- [Browser checks](browser-results.json)
- [Desktop navigation](navigation-1440-16.png)
- [Phone at 200% text](navigation-390-32.png)
- [Drawing at 200% text in a medium window](drawing-1060-32.png)
- [Dark theme](dark.png)

Final source SHA-256: `0c4029cbcaa25d427010cbe6edf04810c500eddcfe18457486ad8f3e8a40db36`.
