# Symbol Studio rendered UI review — 12 September 2026

## Scope

The local Playwright harness renders the real `symbol_studio_module.js` with React 18 from the repository. It stubs AI/image/speech handlers, blocks every external request, and uses a fresh browser context with fictional learner, symbol, board, and sequence fixtures. No production service or real learner data is accessed.

Initial captures cover Symbol Bank, Board Builder, Sequences, and Quick Boards at 1440×1000, 390×844, and 320×844. An expanded run also loads saved board/sequence fixtures using real browser clicks and resizes those editing states. Runtime source was being improved by other reviewers concurrently; these are responsive-layout baselines, not a clean Git revision baseline.

## Observed issues

| Priority | Finding | Evidence | Recommendation |
| --- | --- | --- | --- |
| High | A fixed sidebar consumes almost the entire phone viewport. The main workflow is clipped by the modal rather than adapted to fit. | At 390px, Symbol Bank creation starts around x=262 and continues outside the viewport. At 320px Quick Boards shows only a narrow strip of its content. | Collapse settings into an explicitly labelled disclosure on phones; let the active workflow use the available width; stack creator and gallery; permit vertical scrolling of the complete workflow. |
| High | Loaded editing layouts also overflow on narrow screens. | 320px loaded board has 117 descendants outside the horizontal viewport; the loaded sequence has 62. | Use zero min-width on flex/grid children, responsive grid columns, wrapping controls, and a scrollable sequence strip where the horizontal order is intentional. |
| High | Keyboard tab navigation updates selection without moving focus to the selected tab. | From Symbol Bank, ArrowRight selects Board Builder but focus falls to BODY. Starting on an already-selected Board Builder can leave focus on unselected Symbol Bank. Reproduces after startup effects settle. | Implement roving tabindex with focus following ArrowLeft/ArrowRight/Home/End; preserve the selected tab in view on mobile. |
| Medium | The modal background remains exposed to focus and assistive technology. | The independent background fixture has neither an inert ancestor nor aria-hidden while the modal is open. | Isolate background siblings on open and restore their prior attributes on close, retaining the existing internal Tab trap. |
| Medium | Many edit/settings controls are small for touch and visually dense. | Desktop default Symbol Bank has 60 controls below 44px in at least one dimension; loaded Board Builder has 108. Sidebar color controls are 18×18. | Raise touch target sizes, especially phone controls, while grouping secondary actions to avoid excessive density. These counts are a comfort audit, not a claim that every control violates WCAG's 24px minimum/exceptions. |
| Medium | Global settings dominate the first screen although they are not the main task. | First phone screen shows profile/settings/garden/focus panels before nearly all of the active workflow. | Make the active task primary; expose settings on demand and keep the active profile and settings entry discoverable. |
| Low | Several bottom goal fields lack an obvious accessible label in the markup. | The heuristic finds two SELECTs and a text INPUT without aria-label, aria-labelledby, placeholder, or text. Color controls also appear, but visible/wrapping labels need manual consideration. | Add explicit programmatic labels to meaningful form fields and validate with browser accessible names; do not treat heuristic counts as final accessibility conformance results. |

## Baseline measurements

“Outside viewport” counts visible rendered descendants whose bounding boxes extend outside the horizontal viewport; this includes nested descendants and intentionally scrollable regions. It is diagnostic evidence rather than a count of independent defects. Screenshots confirm the main clipping issue.

| State | 1440px outside | 390px outside | 320px outside |
| --- | ---: | ---: | ---: |
| Symbol Bank | 0 | 82 | 87 |
| Board Builder, empty editor | 0 | 11 | 31 |
| Board Builder, loaded | 0 | 71 | 117 |
| Sequences, empty editor | 0 | 15 | 28 |
| Sequences, loaded | 0 | 15 | 62 |
| Quick Boards | 0 | 39 | 62 |

All 18 states in `baseline-expanded/measurements.json` rendered without browser page errors or console errors. This does not test generation, real speech, cloud sync, live collaboration, microphone permission, print dialogs, or service outages.

## Reproduce

From the repository root:

```powershell
node reports/symbol-studio-review-2026-09-12/browser-review.cjs after
```

The final argument names the output subdirectory. The harness starts an ephemeral server bound only to 127.0.0.1 and closes Chromium/server when finished. It writes PNG screenshots and machine-readable measurements. It requires the existing local `playwright`, `react`, and `react-dom` packages plus the installed Chromium binary.

Useful baseline images:

- [390px Symbol Bank](before/390-symbols.png)
- [320px Quick Boards](before/320-quickboards.png)
- [1440px Symbol Bank](before/1440-symbols.png)
- [320px loaded Board Builder](baseline-expanded/320-board-loaded.png)
- [320px loaded Sequences](baseline-expanded/320-schedule-loaded.png)


## Implemented and verified during the review

The responsive layout now collapses profile/settings on phones, stacks the Symbol Bank creator and gallery, wraps the active workflow, and lets the main content scroll vertically. The selected top tab scrolls into view. Keyboard ArrowRight now moves focus to the newly selected tab. Background content is inert and hidden from assistive technology while the modal is open.

Phone board editing now uses readable cells with controls in normal document flow rather than overlapping absolute corners. Cell buttons and sequence reordering/removal controls measure at least 44×44px. These editor overrides use screen media and do not change the AAC Use layout or intended print column count.

The `final/` run covers 18 rendered states. All have zero JavaScript/console errors and zero horizontal overflow outside the intentionally scrollable top tabs. All 12 initial-state keyboard checks focus the selected tab after ArrowRight, Home, and End, and verify background isolation. Print emulation preserves the saved fixture’s four columns at all three viewport widths. At all three widths, the clear-bank confirmation focuses Cancel initially, wraps Shift+Tab, cancels on Escape without closing the studio, and restores focus to its opener. The 320px dialog fits within the screen.

The remaining comfort-level small target in the phone loaded board is the native color-coding checkbox inside its clickable label. The completed run verifies that the settings-toggle text is spaced correctly. The topic-field parent correction is also verified: the loaded Board topic input now measures 190×44px at a 390px viewport and 288×44px at 320px, with no clipping. The earlier 35px-wide field is resolved.

The initial accessible-label heuristic did not account for wrapping labels. The corrected heuristic reports no unnamed controls in these fixtures after the review fixes; this is not a complete assistive-technology audit.

Useful final images:

- [320px Symbol Bank](final/320-symbols.png)
- [320px Quick Boards with selected tab visible](final/320-quickboards.png)
- [320px board editor, scrolled to cells](final/320-board-loaded-scrolled.png)
- [320px sequence, scrolled to controls](final/320-schedule-loaded-scrolled.png)
- [320px clear-bank confirmation](final/320-confirmation.png)

## Further product opportunities

The mobile layouts now fit, but larger redesigns could reduce effort further: group advanced board appearance controls into a disclosure; let teachers choose a focused creation versus library workflow in Symbol Bank; and make the Quick Boards mode chooser easier to reach before the longer Communication Builder form. Desktop settings and template chips could use a modest typography and target-size increase. These are future design opportunities rather than blockers for the concrete fixes validated here.


## Final automated assertions

The completed harness exits successfully and writes [checks.json](final/checks.json). Verified: 18 rendered states; 0 browser errors; 0 non-tab horizontal overflow; selected-tab keyboard focus; modal background isolation; confirmation cancellation/restored focus; and all 3 board print layouts retaining 4 columns. Screenshots were visually reviewed at 1440px, 390px, and 320px after the final code changes.

Final source was rechecked after the topic-parent fix. All 18-state assertions still pass, and final captures/measurements have been refreshed. The only phone control below 44px in the loaded-board fixture is the native 13px color-coding checkbox within its clickable label; all other sampled phone workflows have zero targets below 44px. This is a comfort-target observation rather than a WCAG failure claim.
