# Perception Lab: slide comparison

**Slide drawings** places the current drawing and a reference from the same experiment in one large stage. A movable divider reveals the current drawing on the left and the reference on the right, with both drawings held at the same size and position.

## Drawing and interaction

- Drag the divider with a mouse, pen, or touch, or use the labeled native range with Arrow keys, Home, and End. **Current only**, **Comparison only**, and **Center divider** provide complete views and a quick reset.
- Current and reference labels stay outside the clipped drawing. They identify the pinned comparison, live surroundings, or fixed starting view. Their physical sides remain consistent in right-to-left layouts.
- A narrow two-tone divider and a small grip keep the drawing visible. The drag lane stays within the stage at both endpoints, and only the pointer that started a drag can move it. Cancellation or workspace relocation ends an active drag safely.
- The large stage works in the main and focused workspaces. Full-size source captions reflow into left- and right-aligned rows when enlarged text needs more room. Controls wrap for phones and enlarged text, while the scientific SVGs keep their white background and original colors in dark, contrast, and forced-color themes.

The divider combines parts of two drawings. The visible guidance explains this, and **Switch views** remains available for inspecting each complete drawing in the same position. Cross-experiment pins use the existing comparison layouts and show why Slide drawings is unavailable.

## Local view and complete exports

Divider position is a local view preference. Current drawing edits, notes, and moiré motion preserve it; changing the experiment, learner profile, reference, or comparison mode starts the new pair at the center. Leaving a pair and returning also starts at the center. Moving between the main and focused workspaces preserves the position.

Pinned, surroundings, and starting-view comparisons retain their existing behavior. The starting view stays fixed while the current drawing changes, and a live surroundings comparison follows both drawings. Viewing and dragging do not update saved experiment data, the pin, or the notebook.

Clipping belongs to the current drawing's outer presentation layer. The original SVG tree, geometry, measurement visibility, and export reference remain intact. SVG and 2400 × 1440 PNG exports contain the complete current drawing at divider positions 0, 50, and 100. Unrevealed matching values remain hidden independently in both views; repeated studies continue to mask comparisons and lock exports until their existing reveal step.

## Verification

- **43 native Chromium check groups passed in one complete final run**, with no page runtime errors or axe violations in the checked scopes.
- All seven pinned experiments preserved their exact SVG trees and equal scale at divider positions 0, 50, and 100. Pixel sampling confirmed the left/right composite and each complete endpoint. All seven surroundings comparisons and the four fixed starting-view activities passed their scene and state checks.
- Native keyboard, mouse, and touch interactions passed. Checks covered pointer ownership, cancellation, focus on the native range, layout and focus relocation, reference/profile resets, return to a prior pair, and right-to-left labels.
- All three matching activities preserved hidden measurements and repeated-study export locks. SVG and PNG downloads were checked at every endpoint; the PNGs retained 2400 × 1440 dimensions and the complete current drawing's pixels. Live moiré rotation preserved divider position while its pinned reference stayed still.
- Six viewport/text combinations passed: 320 × 844 at 100%/200%, 390 × 844 at 200%, 760 × 390 at 200%, and 1440 × 1000 at 100% and 200%. Main/focused layouts had no horizontal overflow. Dark, contrast, forced-light, and forced-dark checks preserved scientific colors and accessible controls.
- **84 baseline scene/model/measurement combinations passed**, with unchanged engine API signatures, defaults, experiment metadata, and matching definitions. Compilation, byte-identical source/desktop copies, and all **533 English/runtime catalog entries** passed.
- **21 regression cases** are saved in `tests/perception_lab_slide_comparison.test.js`. Syntax and source/hook review passed. The DOM suite remains **unexecuted** because the installed Vitest/jsdom worker stalls before collection; the successful browser and pure engine checks do not replace that suite.
- Scoped whitespace checks passed. Desktop, phone at 200% text, short-window, dark, RTL, and forced-color previews were visually inspected.

Source and desktop SHA256: `024c9eb9a6e120589bedd015e21a80ab21b13808c494000201a6fd1fd3a56d09`.

## Evidence

- [Desktop slide comparison](browser/slide-desktop.png)
- [Phone at 200% text](browser/slide-phone-200.png)
- [Dark theme](browser/slide-dark.png)
- [Right-to-left labels](browser/rtl-slide.png)
- [320-pixel phone at 200% text](browser/enlarged-labels-320.png)
- [Short window at 200% text](browser/focused-drawing-760-32.png)
- [Verification summary](verification.json)
- [Native browser results](browser/slide-browser-results.json)
- [Source, catalog, and baseline validation](regression-validation.json)
- [Complete current SVG at the reference endpoint](browser/current-0.svg)
- [Complete current PNG at the reference endpoint](../perception-drawing-overview/browser/overview-current-100.png)
- [Native browser runner](../../../dev-tools/perception_lab_slide_comparison_qa.cjs)
- [Regression suite](../../../tests/perception_lab_slide_comparison.test.js)

The saved [pure validator](validate-perception-slide.cjs) can be run from the repository with `node reports/artstudio-workspace/perception-slide-comparison/validate-perception-slide.cjs`. It compares the current source with the included baseline and checks the desktop copy and catalogs.

All changes remain unstaged and uncommitted.
