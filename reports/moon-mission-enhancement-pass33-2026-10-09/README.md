# Moon Mission pass 33 — readable, interactive flight recorder

Completed October 9, 2026. Changes remain uncommitted.

## What changed

The landing recorder keeps chart labels readable on narrow phones. Previously, labels embedded in a 600px SVG could shrink to roughly 4–5 screen pixels. Axes, units and legends now use HTML text at a minimum of 12px; both plots keep a 148px height. Cyan altitude shading, visible dashed landing limits and synchronized cursors make the recorded approach easier to inspect. Selected samples use circular 10px markers with a dark outline, independent of chart width.

Clicking or tapping either plot selects the nearest actual recorded timestamp. The existing time slider supports keyboard inspection, and returning to the final sample restores touchdown review. Selected telemetry identifies upward/downward motion and left/right drift, with near-zero motion shown as still.

The runtime changes are confined to the recorder panel. Flight integration, grading, CSV generation, attempt history and world rendering retain their existing implementation.

## Verification

All three final Chromium workflows passed through the direct Playwright API with real assertions and complete cleanup. These are recorded workflow results, not Playwright CLI worker results.

| Workflow | Evidence | Coverage |
| --- | --- | --- |
| Responsive recorder | [Result](direct-recorder-5/direct-recorder-result.json) | 320px touch and 1100px mouse views; timestamp selection; Home/Right/End; return to touchdown; label/marker geometry; state preservation; exact CSV bytes |
| Saved flight review | [Result](direct-review-2/direct-review-result.json) | Existing 3D replay and scrubbing; final telemetry; CSV download; Retry → Begin and attempt history |
| Phone review | [Result](direct-phone-1/direct-phone-result.json) | Existing 390px layout, keyboard inspection, touch target sizes and overflow checks |

Seven saved-landing restoration unit tests passed: [unit log](unit.log). Browser version: Chromium 148.0.7778.96. Seven PNGs are retained across the accepted runs, including five recorder captures and two existing review captures.

The new regression fixture uses uneven timestamps (0, 2, 17, 39, 40 seconds), so tapping at 12 seconds must select 17 seconds rather than a sample chosen by array position. It independently checks plotted sample positions, threshold heights, non-scaling strokes, circular markers, readable labels and fixed plot height. It also verifies saved state and physical telemetry, allowing only the intended review-index change, and requires a persisted null review index at touchdown.

### Visual samples

- [Desktop recorded approach](direct-recorder-5/desktop-near-touchdown.png)
- [Phone upward motion and left drift](direct-recorder-5/phone-up-left-frame.png)
- [Phone zero-motion sample](direct-recorder-5/phone-neutral-frame.png)

### Retained iteration failures

The first recorder run timed out during a browser evaluation after keyboard inspection; the same interaction passed in later runs. One initial existing-review run lost its page before the product mounted. The second recorder run caught an omitted initial review index in the new fixture; the fixture now explicitly starts with null.

The third and fourth recorder runs passed the chart interactions and five captures but Chromium canceled the CSV download. The same final source, fixture and driver passed outside the sandbox, including a byte-for-byte CSV comparison. No product download changes were made. Earlier results and diagnostics remain in their original attempt directories and are not counted as passes.

## Preservation and scope

Canonical and public runtime copies are identical: SHA-256 `c4d9746f4495fcdaf83f9443e4911daa30868d4b1126dfb2728fc7f7ffcf505f`, 1,426,232 bytes. Three guarded replacements reverse byte-for-byte to accepted pass 32. All 126 protected prior test files and the scoped Git index are unchanged. Both syntax checks and scoped whitespace checks passed. See [verification](verification.json), [runtime diff](runtime.diff) and [machine-readable results](results.json).

New regression: `tests/e2e/moon-mission-descent-recorder.spec.ts`. Source changes: `stem_lab/stem_tool_moonmission.js` and its public mirror. Validation uses saved synthetic recordings; this pass makes no new flight-integration, broad-suite, physical-device performance or audio claim. No full build, staging, commit, push or deployment was performed.
