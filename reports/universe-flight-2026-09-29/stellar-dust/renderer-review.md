# Stellar dust renderer review

Reviewed renderer SHA-256: `11c9f95d62c511ea9b4575598c6847a53c1fc1f37e04e4cd976916d53ef7ee4b`.

No blocking source issue found for the intended neighborhood teaching scene. This review covers the renderer only. Numerical, GPU, browser and preview checks have separate results.

## Finite depth model

Each generated cloud is an axis-aligned ellipsoid with density `densityPerLy * max(0, 1-q)^2`. The CPU helper and GLSL use the same three cloud specifications and qualitative RGB coefficients `[0.72, 1, 1.45]`.

For a ray parameterized in light-years, the code finds its closest approach in ellipsoid coordinates. With `h = 1-q_min` and half-chord `sqrt(h/aa)`, substituting the normalized chord coordinate gives `densityPerLy * h^2 * halfChord` times the integral of `(1-u^2)^2`. The primitive `u - 2u^3/3 + u^5/5` is correct. Clamping both integration endpoints to `[-1,1]` limits the column to the observer-to-source segment. A foreground star before the cloud therefore has zero column; a star inside a cloud receives only its intervening column. Tangent and missed rays contribute zero.

The closest-approach construction avoids a subtraction of large quadratic terms. It still uses ordinary floating-point arithmetic; this review does not certify arbitrary extreme coordinates or ellipsoid scales outside the generated scene. Native GPU checks should compare the actual shader against the CPU helper, including grazing and reversed rays.

## Input and state handling

- Vector validation checks all three indices individually, rejecting sparse arrays and non-finite entries. A catalog hole is rejected by the indexed validation loop. Radii must be positive and density finite and nonnegative.
- The cloud catalog accessor returns detached position and radii arrays.
- Dust defaults to on. Version-1 saved views missing the optional dust property restore with dust on; explicit false is retained. Snapshot and telemetry include dust.
- Scenic inspection starts from the current snapshot. Flyby detours copy all settings and restore them, so dust belongs to both paths without a separate mutable side channel.
- `set({dust: ...})` does not itself change running, position, lens, clocks or navigation. The UI deliberately pauses for a same-view comparison. Existing generic setter behavior still applies, including resetting idle timing when already paused.

## Rendering scope and cost

The neighborhood point/quad shader evaluates extinction from the original source center before camera rotation and apparent relativistic direction. Point cores, resolved photospheres, coronas and warm arch accents all attenuate. Stellar quad alpha remains an opaque geometric surface mask, so dimming a star does not turn its physical silhouette into a transparent hole.

Cloud records skip the dust calculation, and the draw uniform disables it outside the neighborhood. Galaxy surfaces and diffuse cloud/band emission keep their earlier illustrative treatment. Dust off sets transmission to exactly one and retains the existing color path; native screenshots must establish actual pixel equivalence.

There are no additional buffers, textures, source records, random draws, geometry uploads or draw calls in this delta. It adds one float uniform and one vec3 varying. Neighborhood stellar vertices perform three fixed analytic ellipsoid evaluations; this is additional vertex arithmetic, not a measured performance claim. There is no per-fragment ray march.

These are generated dust volumes with qualitative RGB attenuation. They are not surveyed clouds, a calibrated extinction law, a spectral camera, scattering into the view, dust thermal emission or full radiative transfer. The pre-existing Doppler tint remains illustrative.

## Reversible source audit

`renderer-review-audit.json` records exact canonical/mirror equality, Node syntax success, and byte-exact forward and reverse reconstruction against the pass60 baseline. `renderer-delta.json` preserves UTF-8 line contents and line endings, including 13 line-ending-only differences that Git's textual diff normalizes. Its 30 hunks have zero-based old/new line starts and explicit before/after text.

`renderer.patch` is a readable unified diff with repository-relative paths. Use the JSON delta and baseline hash when exact byte restoration is required. `audit-renderer.cjs` regenerates the audit artifacts without executing or changing product code. No product source files, tests, graphics, index entries or commits were changed by this review.
