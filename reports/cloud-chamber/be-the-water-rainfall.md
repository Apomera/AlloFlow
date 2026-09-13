# Be the Water: rainfall and ocean return

Rainfall now uses 84 pooled streaks with varied lengths and fall rates. Each streak has two line segments and a shader alpha gradient, giving a faint tail and brighter leading end. Horizontal drift and streak slant respond to the scenario wind. Ocean streaks clip at the mean sea plane; terrestrial scenery retains normal depth occlusion. The local weather field remains an illustrative view around the parcel, not an independently simulated rain volume.

A real rain-to-liquid transition over open ocean starts a short ripple and spray effect. Three expanding rings share one geometry; 18 pooled spray points follow simple illustrative arcs. No effect is triggered by restoring a checkpoint, falling as snow, or landing on land. Lakes and streams are excluded from this ocean-specific effect.

Landing feedback follows simulation elapsed time. Learning pauses hold it still, and resuming lets it expire after 1.8 simulation seconds. Reduced motion shows static rings and suppresses the spray. Reset and checkpoint restoration clear the effect. The landing group renders after the transparent ocean so the ocean material does not cover it. The splash is enlarged to remain visible around the teaching-scale water parcel; it adds no mass or energy to the model.

## Verification

- All 117 pilot experience and kernel regression tests passed: `pilot-rainfall-regressions.json`.
- `dev-tools/watercycle_pilot_rainfall_qa.cjs` passed live checks for finite geometry, wind direction, tail/head orientation, fading, sea clipping, paused rain, both camera views, actual ocean landing, paused/reduced/expiring effects, snow and land exclusions, mobile accessibility, and shared geometry disposal.
- A focused final render-order check passed with a real landing and no WebGL errors.
- Rainfall and final landing screenshots were visually reviewed in `scratch/water-rainfall-review`.
- JavaScript syntax passed; canonical and desktop source copies match.
- Existing preview restarted at `http://127.0.0.1:58122/?immersive=1&cloud=1`; HTTP 200 confirmed.

The physics kernel and existing water-cycle teaching text are unchanged.
