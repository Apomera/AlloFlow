# Recent movement in 3D

**Recent movement trail** is an optional inspection overlay for the selected animal representative. Gold segments and spaced beads show up to three model time units of past movement. The pale endpoint marks the selected position. The trail follows sampled altitude, including owl flight and fox pounces, above the local terrain.

The trail is rebuilt from the selected branch and representative when scrubbing or replaying. It never shows future positions or joins a path across missing or absent samples. Removing an organism clears its trail. Isolated inspection retains the trail; habitat, forest and soil views hide it. Reduced motion hides the path to avoid pairing a changing path with the frozen starting pose. Reset camera also turns the overlay off.

The renderer reuses two small instanced meshes, with capacity for 30 segments and eight beads. Their geometry and material participate in the existing scene cleanup. No per-frame GPU resources are created. Food-web equations and representative behavior decisions are unchanged. The caption explicitly identifies these paths as illustrative animation history rather than measured animal tracking.

## Validation

19 targeted unit checks passed for trail history, absence and invalid-sample boundaries, intervention removal, behavior moments, and the food-web model. Browser coverage includes keyboard toggling, exact history ranges and endpoints, rewind, representative changes, owl altitude, isolation, reduced motion, mobile overflow, absence, branch changes and saved-run preservation. Existing action-replay scenarios are also included.

All three browser scenarios passed. Visual review caught an r128 color-buffer allocation issue after visible instance counts were reduced; both buffers now allocate their full capacity at creation. The trail scenario passed again after the fix, with an explicit capacity regression assertion. Refreshed fox, owl, and mobile captures were visually reviewed and show the intended pale-gold trail and endpoint. Syntax validation passed, and web and desktop copies have identical SHA-256 hashes.
