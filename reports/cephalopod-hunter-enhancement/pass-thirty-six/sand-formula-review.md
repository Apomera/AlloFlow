# Task-local seafloor candidate

This is an unrendered candidate for the root agent to review. Only the task workspace was written; the repository remains untouched by this author. The canonical baseline is SHA-256 `5c12f16227e6e002486a9cd9f801729636664bca0b64e08a5e286c55b65ef58c`.

## Intended visible change

The broad foreground in pass35 `current-strike/strike-000.png` has almost uniformly spaced, low-contrast linear ridges. This candidate makes those ridges bend and bunch slightly, alternate between softer and steeper profiles, and rise with different strength across the existing broad sediment patches. The brighter caustic lines remain driven by the same separate layer. It preserves the pale floor and the open play area.

## Formula and bounds

World X/Z are the existing `clSandWorld` varying. Let `b = 0.22*x + 0.17*z`, `p = 7.6*z + 1.35*sin(0.55*x) + 0.55*sin(b)`, `u = 0.43*x + sin(0.3*z)`, `v = 0.52*z`, and `P = sin(u)*sin(v)`.

The relief height field is `h = (0.019 + 0.008*P) * (sin(p) + 0.22*sin(2*p))` before filtering. Its amplitude envelope is positive everywhere, `[0.011, 0.027]`. The exact analytic phase derivatives are `[0.7425*cos(0.55*x) + 0.121*cos(b), 7.6 + 0.0935*cos(b)]`. The exact patch derivatives are `[0.43*cos(u)*sin(v), 0.3*cos(0.3*z)*cos(u)*sin(v) + 0.52*sin(u)*cos(v)]`.

Each harmonic receives its own pixel-footprint weight: `1-smoothstep(0.4,1.8,fwidth(p)*harmonic)`. The normal uses the corresponding derivative of the same filtered field, without differentiating the derivative-based AA weight. World slope magnitude is capped at `0.24` before projection onto the floor's normal plane. This keeps broad terrain slopes intact and bounds the extra normal bend. No terrain positions change.

The albedo factor is `0.87 + 0.038*filteredWave + 0.026*P`. Its conservative range is `[0.79764, 0.94236]`, close to the original `[0.802, 0.938]`. The true two-harmonic extrema are tighter than that bound. Existing downwelling color multiplication is byte-identical. Roughness reuses those fields and clamps to `[0.90,0.98]`; the base material remains `0.94` and metalness remains zero. The existing CanvasTexture and hardware texture filtering provide the same mineral grain variation. No new per-grain noise or extra texture sampling was introduced.

## Prefix, quality and motion

The local r128 vendor program builder emits `#extension GL_OES_standard_derivatives : enable` from `material.extensions.derivatives` in WebGL1, and uses core derivatives in its GLSL300 WebGL2 prefix. It does not define an `IS_WEBGL2` shader macro. This candidate sets numeric material define `CL_SAND_DERIVATIVES` from the actual renderer capability/extension query. Unsupported WebGL1 receives the same coarse patch tint and bounded roughness, with ripple weights zero and no derivative or normal-relief branch compiled. Derivative-capable low, balanced and high modes use the same inexpensive analytic fields; their existing DPR, shadow and postprocessing policies remain untouched.

The shader is static in world space. It has no time input, so reduced motion needs no new exception and retains the existing caustic freeze behavior. It stays attached to the current floor mesh/material and follows the current snapped world tile. No RNG call, actor placement, collision geometry, transparency, lighting, caustic generation/update, draw ownership or disposal path changes.

The shader adds zero scalar helper functions and no field/noise loops. Compared with the old ripple, the new arithmetic adds a second low-frequency phase warp, one separately filtered harmonic, its matching analytic gradient, a bounded slope cap, and cheap roughness reuse. The floor covers many pixels, so native before/after timing should be assessed without claiming a hardware performance gain from CPU alone.

## Meaningful verification for the root agent

Use matching native before/after floor views with all actors and camera/world state fixed: an ordinary shallow gameplay view, a lower oblique floor view, and a phone view. Confirm the floor improvement remains legible with current caustics, shadows and prey, and check that distant ridges fade without crawling at ordinary motion. Keep the screenshot comparison at the same source seed and frame.

Numerically sample the emitted formula, compare analytic phase/envelope gradients with central differences, verify finite capped slopes and albedo/roughness bounds, and check each filtered harmonic tends to zero at its pixel cutoff. Shader substitution checks alone are insufficient: inspect actual r128 native program prefix/source, compile/link status and the submitted existing floor draw. Exercise low/balanced, WebGL1/WebGL2 capability paths if available, and a derivative-unavailable fallback diagnostic. Check day/night/depth, pause/reduced motion, world-tile crossings, resource identity, texture-fetch count and disposal with the current lighting fixture. Verify actor/seed/terrain bytes outside these two exact guarded patches remain unchanged.

The existing native test at `tests/e2e/cephalopod-habitat-lighting.spec.ts:182` hardcodes the old sand cache key and will need a narrowly scoped expected-key update if this candidate is integrated. The CPU lighting test at `tests/cephalopodlab_underwater_lighting.test.js:105` already extracts this helper and checks shader chunk preservation, single downwelling uniform and no extra texture fetch; numerical gradient/bounds verification is the useful addition.
