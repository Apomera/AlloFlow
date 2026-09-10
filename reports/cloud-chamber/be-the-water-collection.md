# Be the Water: droplet readability and collection feedback

Collectible droplets now use an original shaded bead texture with a rim and highlight. Normal blending replaces additive glow, with slightly lower opacity. The point shader caps the projected size at 14 CSS pixels in Follow view and 11 in Water view, accounting for renderer pixel density. Particle counts, positions, collision radii, and movement remain unchanged.

The navigation ring keeps its existing destination and controls, but its projected diameter is limited to approximately 38 CSS pixels. This keeps nearby guidance from covering the parcel or a collectible.

Two pooled sprites provide brief feedback for real credited droplet collisions. In Follow view, a bead moves from the captured particle to the parcel. Water view uses a compact receipt ahead of the camera because the parcel is behind the eye. Both views cap the receipt at 18 CSS pixels. Reduced motion uses a static receipt. The cue follows simulation time, freezes when paused, expires after resuming, and clears on reset or checkpoint restoration. Camera-dependent sizing continues to follow the view while progress remains fixed.

The pause review uncovered a behavior defect: collision checks could remove nuclei or droplets while the kernel was paused, giving no corresponding credit. Collision checks and the collection cooldown now stop while paused. Resuming uses the existing collision rules and mass accounting.

## Validation

- All 117 experience and kernel regression tests passed; results are in `pilot-collection-regressions.json`.
- `dev-tools/watercycle_pilot_collection_qa.cjs` passed live WebGL checks for paused nuclei and droplet preservation, shader size limits, compact waypoint projection, both cameras, a real credited collection, paused and resumed feedback, reduced motion, and checkpoint clearing.
- The first-person receipt remains ahead of the camera and within its screen-size limit.
- Phone overflow and axe accessibility checks passed. The shared droplet texture disposed exactly once. No captured JavaScript, shader, or WebGL errors.
- Follow and Water view screenshots were visually reviewed in `scratch/water-collection-review`.
- JavaScript syntax passed and canonical/desktop source copies match.
- The existing local preview was restarted and returned HTTP 200 at `http://127.0.0.1:58122/?immersive=1&cloud=1`.
