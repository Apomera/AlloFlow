# Color Wheel enhancements — September 30, 2026

Color Wheel now provides a larger, directly editable color workspace. The 900 × 900 canvas displayed at 760 × 760 pixels in a 1440 × 1000 Focus view, preserving the canvas when entering or leaving Focus. On a 390-pixel phone, the wheel and harmony palette appear before the detailed controls without horizontal overflow. Controls meet the 44-pixel touch-target check.

Drag with a mouse, pen, or touch to change hue. Pointer capture keeps a drag continuous, release includes its final position, and unrelated pointers are ignored. Arrow keys retain one-degree adjustments, Shift uses ten degrees, and Home/End select the hue endpoints. The wheel redraws after changes instead of running a decorative animation loop. A cached conic gradient removes segment seams; older canvas implementations retain a wedge fallback.

Hex entry accepts three or six digits, validates drafts, and preserves the current color while an invalid value is being edited. Leaving an unchanged field does not round the HSL recipe or create a history entry. Neutral colors retain the chosen hue for later saturation changes. Saved state is bounded and finite, including valid zero saturation and lightness.

The four harmony schemes now have numbered markers and matching selectable swatches. Selecting a swatch makes it the new base hue while preserving saturation and lightness. A separate lightness sampler explores darker and lighter variants. Thirty-step undo/redo includes harmony changes, hex entries, swatch selection, and complete slider or canvas drags. History clears for a different learner, a forked study, or an externally replaced recipe. Native text-field undo stays separate.

Save the harmony to the existing project Thread Kit, send the selected hex color to Watercolor, export the 900-pixel wheel PNG, or download a standalone SVG swatch sheet. Watercolor transfer preserves existing paint. Studies capture the normalized color recipe and preview. Thread Kit's former HSL rounding limitation was removed in the subsequent [project palette enhancement pass](palette-enhancements.md).

## Validation

- Initial focused run: **45 tests passed** across the wheel, keyboard access, and shared stage/Thread Kit workflows (`wheel-focused-tests.log`).
- Broader run: **161 tests passed in 15 files**, covering wheel workflows, Mixer, Gradient, artwork round trips, study persistence, Process Shelf, Studio Home, Artist Explorer, learning boundaries, accessible labels, announcements, context guards, and touch targets (`wheel-final-tests.log`).
- Final wheel run after the precision and stale-drag fixes: **24 tests passed in 2 files**, including 20 new workflow regressions (`wheel-final-focused.log`).
- Actual Chromium mouse and touch drags, whole-gesture undo, exact PNG restoration, hex validation, palette storage, tab round trips, keyboard wraparound, and Watercolor transfer passed with zero page errors. Downloaded PNG bytes matched the displayed canvas; SVG colors matched the selected triadic palette (`wheel-browser-results.json`).
- Desktop and phone screenshots were reviewed. Syntax, the pinned Spectral library check, source/public parity, and scoped whitespace checks passed. No full repository suite or production deployment was performed.

An overly broad edit was caught by the syntax check during implementation. The affected shared workspace section was reconstructed from the repository and the recorded earlier patches; the preservation review also restored the prior Op Art focus selector and Mixer introduction. The shared workflow tests above were included to check the recovered workspace.

Previews: [desktop wheel](wheel-triadic-focus.png), [phone wheel](wheel-phone-focus.png), [PNG download](wheel-browser-export.png), and [SVG palette](wheel-browser-export.svg).

Implementation: `stem_lab/stem_tool_artstudio.js` and its identical served copy at `desktop/web-app/public/stem_lab/stem_tool_artstudio.js`. Browser checks: `dev-tools/artstudio_wheel_qa.cjs`. All work is local and uncommitted, as requested.
