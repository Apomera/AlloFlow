# Document Builder keyboard review — 2026-09-08

Read-only implementation review. Two current keyboard issues were reproduced in isolated Chromium 148.0.7778.96 using the actual compiled Builder and export-handler modules, current CSS main.01e7c1d9.css, local React, and synthetic document content. Both runs reported zero page errors. No production files were changed.

## Findings

### P2 — Editor entry skips interactive accessibility-inspector controls

**Source:** `view_export_preview_source.jsx:11411-11418`; entry control at line7810.

Reproduction:

1. Open a document containing a button with an ARIA label, then enable the actual ExportHandlers accessibility inspector.
2. Focus the Builder's **Skip to editable preview** button and press Enter.
3. Press Tab.

Observed: focus enters the preview (outer activeElement IFRAME, inner BODY), then Tab immediately returns to **Toggle color theme** outside the editor. The document's editable **Edit aria-label: Run lesson action** badge exists with tabindex0 but is skipped. The same entry also skips a native document link and button. Giving the badge focus programmatically and pressing Enter opens its real editor dialog with the expected existing label, confirming that the control itself works.

Cause: the iframe boundary handler treats BODY as both the start and end even when visible inner controls exist. Forward Tab therefore chooses outer[0] before the user can reach the inner controls.

Suggested refinement: from editor entry, make forward Tab reach the first eligible inner control, including inspector badges; transfer back to the parent only at the actual boundary. Exercise forward/reverse entry and exit with real editable badges, not just an empty preview. Keep ordinary text editing and table navigation behavior explicitly covered.

Evidence: [inspector-keyboard-results.json](inspector-keyboard-results.json), fields editableInspectorBadge, skipEntry, skipThenTab, scriptedBadgeActivation. [Reproducible probe](inspector-keyboard-probe.cjs).

### P2 — Escape in Quick Access customization requests closing the entire Builder

**Source:** `view_export_preview_source.jsx:8872` customization details; parent Escape handler at line4006.

Reproduction:

1. Focus **Customize Quick Access toolbar** and press Enter.
2. Focus a customization checkbox.
3. Press Escape.

Observed: the parent close callback is invoked once, while the customization details remains open and focus remains on its checkbox. In the production host that callback closes the Builder. The isolated host intentionally records close requests without unmounting, so the callback and panel state remain inspectable.

Cause: this nested customization panel has no local Escape containment/focus restoration. The event reaches the parent dialog's unconditional Escape close handler. This is separate from the already-fixed **More export formats** menu.

Suggested refinement: Escape should close this customization panel, stop propagation, and return focus to its summary. Preserve a subsequent Escape for closing the Builder.

Evidence: [keyboard-results.json](keyboard-results.json), fields customizeBefore/customizeAfter. [Reproducible probe](keyboard-probe.cjs).

## Checks that worked and coverage limits

- Ribbon tab keyboard navigation worked: ArrowRight on Home focused and activated Insert; the other tabs retain roving tabindex. This is not a finding.
- Actual inspector badge activation by focused Enter opened the accessible edit dialog. The identified defect is reaching that badge from the normal editor entry.
- Existing `tests/document_builder_refinement_pass.test.js:93` checks iframe boundary source strings; its Quick Access coverage at line283 checks configuration/rendering strings. These do not exercise either runtime transition above.
- The prior September6 review already fixed the alternative export menu's Escape handling and identified excessive mobile setup scrolling. Neither is re-reported as a new finding here. The root/core agents separately own current mobile geometry and live UI analysis.
- The screenshots are saved as probe evidence; this report's findings rely on focus, DOM, and callback observations. No visual conformance judgment or screen-reader session was performed.

## Artifacts

- [Keyboard results](keyboard-results.json)
- [Inspector keyboard results](inspector-keyboard-results.json)
- [First run log](keyboard-probe.log)
- [Inspector run log](inspector-keyboard-probe.log)
- [Builder desktop capture](builder-keyboard-desktop.png)
- [Inspector dialog desktop capture](inspector-keyboard-desktop.png)

Run the probes from the repository root. Each launches and closes its own browser and blocks reliance on a deployed application. Synthetic host callbacks intentionally avoid provider calls, downloads, and persistence side effects.
