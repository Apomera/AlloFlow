# Parking clearances and saved results

- Split bumper clearance into front and rear readings, with a specific warning when either end has less than the existing two-foot practice requirement. Distances remain unavailable until aligned in the gap.
- Grouped front/rear readings together for comparison on narrow screens.
- Standard Parallel now saves a personal best alongside the existing scenario results. A lower repeat score preserves the higher result and other scenarios' scores.
- Parking completion callbacks now use current parent state after a reset/retry, preventing stale progress updates.
- A completed zero-point score is visible in the menu instead of appearing unattempted.

Validation: 13 focused unit tests and four browser scenarios passed, including the full guided maneuver, pause/scoring, directional clearance feedback, saving a 100-point result followed by 75 points, and a zero-point menu result. Phone layout checked at 320 pixels without horizontal overflow. Canonical and nested desktop assets match; syntax and whitespace checks passed. Changes remain local and undeployed.
