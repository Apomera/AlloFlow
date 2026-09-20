# Be the Water: snowfall depth and clarity

September 19, 2026

The surrounding snowfall now has thirteen seeded size variations, different descent rates, gentle lateral drift, and slow rotation in both directions. A fine cool edge surrounds each bright six-branched crystal to improve contrast against the pale sky and dark water. These remain illustrative sprites rather than predictions of crystal habit or additional simulated water.

Nearby flakes fade before reaching the camera, and a 28-pixel ceiling limits their screen coverage. The existing pool of 76 points, shared texture, and single draw are retained. No changes were made to the parcel kernel, phase-change rules, or main snowflake avatar.

Pause holds both positions and rotation. Enabling reduced motion now preserves the current flake layout instead of resetting it; the local visual field remains still while the kernel continues. Switching to rain hides the snow field.

Validation:

- `node --check stem_lab/stem_tool_watercycle.js` passed.
- `dev-tools/watercycle_pilot_snowfall_depth_qa.cjs` passed before and after the contrast polish: live shader compilation, finite pooled positions, size variation, opposite rotation directions, pause, reduced-motion continuity, camera modes, rain transition, mobile accessibility, and disposal of each snow resource once. No captured page or WebGL errors.
- Desktop Follow and Water views and the mobile layout were visually inspected; screenshots are in `scratch/water-snowfall-depth-review/`.
- Final experience and kernel regression run after the texture contrast polish: 117 passed, zero failed.
- Canonical source and desktop mirror match. Existing preview returned HTTP 200 on port 58122.

Source SHA-256: `be5bba8fbd3e73a5012d10c3cfccaa0d9060b711b59218744233cb4e25ce94b0`.
