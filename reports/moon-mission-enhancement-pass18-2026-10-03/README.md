# Moon Mission visual enhancement pass 18

Completed October 3, 2026. Changes are unstaged and uncommitted.

## Clearer landing comparisons

The landing prediction panel now pairs its surface reference with an automatic **Braking close view**. Short braking paths become readable while the surface view retains their full altitude context. The standard 300 m practice state gets a 15× close view spanning about 285–305 m altitude. Both axes retain equal metre scales in each view.

The panel adds:

- Labeled altitude and signed displacement ranges, a reference grid, and a locator box linking the two views.
- A solid path for the specified controls and a dashed path for full thrust with centered tilt. The comparison remains distinguishable in forced colors.
- Time dots at a shared elapsed interval on both paths within each view. Travel chevrons follow the actual plotted motion.
- Whole endpoint markers, including concentric markers when two cases end at the same position. Open endpoints remain before contact; filled endpoints mean contact.
- Clearer status, larger key readouts, and case cards with matching accents. Charts sit beside each other on desktop and stack on small screens.

Open **Explore landing predictions** during lunar descent to use the visuals. The existing single open/closed preference is retained. Close views are selected automatically from the inspected forecast and add no saved settings.

### Close-view meaning

The close view uses the original forecast histories and event coordinates. It changes their viewport and physical scale. Its altitude range is absolute; displacement remains relative to the inspected position.

When the ground is outside the close view, the panel says so and omits the surface line there. A path can continue outside the window; the panel identifies its omitted endpoint and keeps that endpoint visible in the surface reference. It adds no endpoint at the crop boundary.

The close view is omitted at contact, when descent is already arrested, when a burn reaches contact or its time limit, and when its motion is too small to warrant magnification. The exact existing surface geometry remains available through its original API.

| Inspected case | Close-view magnification | Altitude window |
| --- | ---: | ---: |
| Standard initial coast | 15× | 285.0–305.0 m |
| Standard state, 65% throttle command | 15× | 285.0–305.0 m |
| Recorded coast at 5 s | 4.8× | 192.8–242.8 m |
| Terminal contact | Omitted | Surface reference retained |
| Nearly empty fuel, contact before arrest | Omitted | Surface reference retained |

The table is rounded from [chart-geometry.json](chart-geometry.json). All five numerical probe source states remained unchanged. Time dots interpolate positions along the existing plotted segments; chevrons use their direction. Forecasts, controls and the physics integrator are unchanged.

Nested SVG viewports clip the paths to the visible range, following the [SVG viewport clipping rules](https://www.w3.org/TR/SVG/render.html). Endpoint and initial-position markers sit outside that clipped group so circles remain complete at the plot boundary. Scoped CSS uses system colors for the [forced-colors mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/forced-colors), while the solid/dashed distinction remains visible. Labels stay in HTML at 12 px or larger. The new graphics add no animation.

## Previews

- [Braking charts](browser/charts-initial/braking-close-view-charts.png)
- [Full braking panel](browser/charts-initial/braking-close-view.png)
- [Coast comparison](browser/charts-initial/coast-comparison.png)
- [Recorded braking](browser/charts-initial/recorded-braking.png)
- [Terminal contact markers](browser/charts-initial/contact-markers.png)
- [320 px phone layout](browser/charts-initial/phone-320.png)
- [Phone with forced colors](browser/charts-initial/phone-forced-colors.png)

All seven new captures and the [legacy-save capture](browser/regression-initial/prediction-legacy-measurements-chromium.png) were inspected. The closeup, locator, cropped continuation, whole markers, stacked phone cards, visible focus and forced-color paths were accepted. This is a readability review; it does not measure rendering performance.

## Verification

**55 unique unit checks passed across three files:** 15 new chart checks, 32 existing finite-propellant physics checks and eight existing view/preference checks. The new checks cover exact surface geometry, frozen histories, equal metre axes, locator coordinates, omission of misleading close views, time positions, real travel direction, cropping and coincident contact markers.

**All seven Chromium workflows passed**, with one worker, zero retries and unchanged timeouts:

1. Paused command changes update the numerical prediction and preserve the flight state and rewards.
2. The active clock follows the flight; the original predicted contact time and speed match the completed landing. Reopening preserves the once-only outcome.
3. Recorded inspection preserves receipts, and legacy saves omit unavailable measurements.
4. Existing 320 px keyboard controls and equal-axis plots remain accessible.
5. Desktop surface and close views retain exact geometry, timing and paused controls.
6. Recorded close views preserve receipts and clear their cropped markers at terminal contact.
7. Stacked 320 px charts retain readable labels and keyboard operation under reduced motion and forced colors.

The active contact workflow keeps default WebGL-enabled rendering. The visual and DOM workflows explicitly use the supported Canvas2D fallback. All captures show the working-tree source.

**Four scoped WCAG 2 A/AA and 2.1 A/AA axe scans reported zero violations:** desktop, phone, phone with forced colors, and the existing phone regression. The 44 px panel button, minimum 12 px labels, absence of page overflow and equal SVG axis scaling were also checked.

### Results and history

- [Final verification](verification.json), [source preservation](source-verification.json), [visual review](visual-review.json).
- [Final unit report](unit-final.json), [accepted complete browser run](browser-initial.json).
- [Desktop axe](browser/charts-initial/desktop-axe.json), [phone axe](browser/charts-initial/phone-axe.json), [forced-color phone axe](browser/charts-initial/phone-forced-axe.json), [existing phone regression axe](browser/regression-initial/phone-axe.json).
- The [initial unit report](unit-initial.json) has 53 passes and two failed DOM assertions. A status attribute on the panel shared the close-view figure's selector. Renaming the status attribute removed that collision; all 55 checks then passed. Physics checks passed in both runs.
- The final unit JSON contains the complete successful result. Its process session was unavailable when polled after an environment refresh, so no final process exit code was captured. The browser process exited 0 with all seven workflows passing.
- The first complete browser run was accepted as final after visual review. Its files retain the `initial` name. No automatic retries or timeout increases were used.

## Preservation

Canonical and public runtimes are byte-identical at **1,323,476 bytes** and both pass JavaScript syntax checking. The scoped diff has no whitespace errors.

Final SHA256: `44b41d2f3ce4440416e53dae3babaf063455504080b82a59644ec1c4bc48f116`.

Reversing the four recorded integration operations in memory recovers the exact 1,309,695-byte pass-17 baseline, SHA256 `3314c07bc96271cb7eea1bcb5bb70ede100ecf28013b7237304c4e41176ad5b5`. The previous prediction physics, cached histories, flight clock, commands, recording format, outcomes, rewards and other mission work remain intact. [Integration map](integration-map.json), [baseline](baseline.json).

The prior three test files are byte-for-byte unchanged. The scoped Git index matches [its initial snapshot](index-before.txt), and the two new test files are unstaged. No staging, commit, push, deployment or full host build was performed. Only pass-18-owned temporary authoring files and private helpers were removed after verification; runtime, tests, reports and raw results remain.
