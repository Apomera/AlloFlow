# Moon Mission pass 21: measured flight history

Completed locally on 2026-10-03. Changes remain unstaged and uncommitted.

## What changed

The optional **Explore flight history** disclosure shows how the measured flight develops over time. Three aligned charts display signed vertical and lateral velocity, actual engine output, and measured attitude. Their dots mark the inspected state. Current readings also show the change in each velocity component from the first point displayed.

The charts use only stored measurements through the inspected time and the current measured endpoint. Scrubbing backward removes later points from both curves and scales. Irregular sample spacing maps to elapsed seconds. The three plots share the same time span and retain their own physical units. Velocity uses symmetric adaptive bounds; throttle stays at 0–100%, and attitude stays at −25° to +25°, with the model's 20.1° tilt limit stated.

A contact history retains impact velocity and ends at the inspected contact state. The first recorded sample presents a waiting explanation. Older saved landings without measurements explain the missing recording and omit the charts.

The native disclosure starts closed, has a 44 px summary target, and does no history calculation while closed. Open histories refresh at most four times per active second and immediately during held or recorded inspection. HTML rulers are at least 12 px; the 320 px layout uses three time ticks. Forced colors preserve the solid and dashed velocity distinction. Opening or closing the panel saves no preference and operates no flight controls.

Stored samples are connected by straight lines. The existing recorder samples at nominal half-second intervals and can thin long flights to its 360-point limit. The caption states that brief transients may fall between samples; these charts do not imply finer measurements.

## Verification

| Check | Result |
| --- | --- |
| Units | 147 passed across nine files, including 27 new history checks |
| Chromium | 12 workflows passed: four history, four vector, four forecast |
| Accessibility | Nine scoped axe reports, zero violations |
| Native visual review | Eight history captures accepted, including phone and forced colors |
| Numerical probes | Eight cases; maximum inverse plot-mapping error 1.60e−14 |
| Preservation | Runtime copies identical; six guarded edits reverse exactly to accepted pass 20 |

The final runs use one worker and zero browser retries. Unit assertion and hook timeouts remain 30 seconds; browser workflow timeouts remain 180 seconds. Browser video encoding is disabled while failure traces and screenshots remain enabled. Protocol actions are paced by 100 ms to allow asynchronous bloom initialization to settle before the existing paused-draw check.

The [unit report](unit-final.json), [browser report](browser-final.json), [numerical probes](history-probes.json), [visual review](visual-review.json), and [verification record](verification.json) retain the measured results. See the [native desktop preview](browser/history-final/recorded-direction-change.png) and [phone preview](browser/history-final/phone-320.png).

## Earlier attempts and boundaries

Two initial history runs timed out while starting workers, before test collection. A later full attempt passed 19 checks but could not load six files. The unchanged complete suite subsequently passed all 147 checks with a clean exit.

The initial browser attempt passed one workflow. A locator screenshot stalled during recorded inspection; phone and live assertions completed before their contexts timed out during cleanup. The new history capture now takes a clipped native page screenshot, and the scoped configuration omits video encoding. The next run passed 11 workflows and caught a paused redraw during bloom initialization. The [render diagnostic](cache-diagnostic.json) recorded only the bloom-ready input changing, one redraw, and steady draws afterward. The final paced run passed all 12 original workflows. All earlier results and failure traces remain in this report directory.

The original integrator, clock, controller, recorder, landing receipts, rewards, vectors, and forecasts are preserved. All 12 prior test files and the shared scoped Git index remain unchanged. [Preservation evidence](preservation.json) records source SHA256 `578816db8e00c92374667b19643c596eedd8af91fa83d52109c0c31e33637e45` and both identical 1,364,430-byte runtime copies. This pass adds inspection of the existing local descent model; it adds no atmosphere, terrain collision model, or surface impact forces. No full application build, staging, commit, push, or deployment was performed.
