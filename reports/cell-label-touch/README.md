# Cell Simulator readable labels and touch gestures

The live-dish labels now use 12px text and request a 44px minimum pill height and width. Long names wrap by measured width rather than squeezing their letters. The existing collision-free columns still adapt to the available space and keep each structure's row and side stable.

Observation taps allow up to 10px of touch/pen movement without panning the camera; mouse gestures retain a 5px threshold. Once a gesture becomes a drag, returning to its starting point cannot trigger a tap. A press on a label retains that specific structure until release, even when its label moves. Cancellation, a second pointer, and changing specimens during the gesture cannot activate a stale label.

Validation: 22 focused unit tests passed. Nine distinct browser tests passed: four touch/readability cases at 280, 320, 390 and 1200px; three existing hover/selection/play-expiry cases; two moving-cell stability cases. Checks cover actual touch taps at the new pill edge, multi-line text, non-overlap, finger jitter, out-and-back drags, a label moving clear of the release point, cancellation, a second finger, and specimen changes. The 280px screenshot was visually reviewed. Source syntax, desktop public mirror parity and scoped diff checks passed.

Existing label-focus screenshots were refreshed to show the larger pills. No push or deployment performed.
