# Animal observation angles

Close-up inspection now includes Side view, Face view and View from above shortcuts immediately beneath the 3D stage. They align with the representative's currently displayed pose and pause active playback. Steady observation preserves the resulting world bearing; Follow animal heading preserves the angle relative to the animal.

The side view lowers the camera to expose the legs and body silhouette. Face view shows the head and ears. The elevated view shows body orientation and spacing. Camera-to-target distance remains constant when changing height, retaining the selected zoom. Reset camera restores the original viewing height and tracking defaults.

The controls work with frozen reduced-motion poses. They are disabled while no representative is present or while interaction framing is enabled, with an explanation beside the controls. Interaction framing uses its original height and restores the animal viewing height when switched off. Habitat, forest and soil camera heights remain unchanged. No population, movement, anatomy, material or lighting changes are included.

## Validation

All three browser scenarios passed: the new observation-angle scenario and both existing steady-camera scenarios. The final angle scenario was rerun after preserving completed replay messages and also passed. Checks use the actual perspective camera position to verify side/front alignment, height and constant camera-to-target distance. Coverage includes keyboard activation, rewind, heading tracking, pausing playback, completed replay status, interaction framing, reduced motion, reset, saved-run preservation and mobile overflow. Desktop side/face/elevated views and mobile rabbit/controls captures were visually reviewed. JavaScript syntax validation passed. Web and desktop copies have matching SHA-256 hashes: C4C19056CB83364BB3D5E2C82753E2E9E951E1A1E708A418038E46CF6D607E5E.
