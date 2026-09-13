# Steady animal observation

Animal inspection now defaults to **Steady observation**. It follows the selected representative's position while keeping its viewing bearing fixed relative to that representative's starting orientation. Turns remain visible instead of being cancelled by the camera rotating around the animal. Rotate left/right still adjusts the viewing direction.

For ground animals, steady observation uses the starting altitude for camera targeting, so a fox pounce rises inside the frame. Terrain height still follows the animal's location. Owl flight stays centered at its sampled altitude. **Follow animal heading** retains the earlier view, which follows both heading and altitude.

When **Show behavior interaction** is enabled, framing uses a steady world bearing even during moments without a current cue. The tracking selector explains and disables that override, preserving the user's chosen mode for when interaction framing is turned off. Reset camera restores steady observation.

Camera targets are calculated directly from the selected deterministic sample. Rewind and branch switching require no animation history or settling timer. Reduced motion continues to use starting poses. This change does not alter animal decisions, sampled actions, or the food-web model.

Visual review also uncovered a single-animal isolation regression from interaction framing: a missing pair let hidden animal visibility become null. The bundled renderer hides only objects whose visibility is strictly false, so animals remained rendered despite being excluded from UI counts. Visibility is now explicitly boolean, and the browser regression inspects the actual scene objects before rendering.

## Validation

20 existing checks passed across action transitions, behavior moments and the food-web model. Browser checks cover stable bearing through real turns, the alternative heading view, manual rotation, deterministic rewind, pounce height, mobile layout, reduced motion, reset behavior, interaction cue loss and restoration of the user's tracking preference. Existing pair-framing checks are included.

All three final browser scenarios passed after the isolation fix. Desktop and mobile leap captures were visually reviewed and now show only the selected fox. The reduced-motion test waits for the frozen pose before recording its camera target. Syntax validation passed and the web and desktop copies have identical SHA-256 hashes.
