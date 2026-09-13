# Be the Water: inland landing feedback

Extended the existing pooled rain-landing effect to lakes and streams. Actual rain-to-liquid transitions now show where the parcel joins inland water, alongside the existing collection explanation.

- Lake ripples sit just above the lake surface and fade at its circular shoreline.
- Stream ripples are smaller, narrow across the channel, and oriented along its local direction. The existing channel mask clips ripples and spray off the banks.
- Inland effects use the same surface-height lookup as the collected water parcel. Ocean waves retain their existing landing height.
- Learning pauses hold the effect. Reduced motion shows static rings without spray; the effect expires after 1.8 simulation seconds.
- Restoring checkpoints and landing on soil do not create water impacts. Snow does not trigger this rain-specific effect.
- The existing three rings and 18 spray points are reused, with no added per-frame geometry allocation. Shared mask texture cleanup remains deduplicated.

These are enlarged visual cues for collection, not new fluid, snowmelt, mass, or energy calculations. Stream height still uses the nearest existing route sample. The internal legacy object name `pilot-ocean-landing` is retained; `data-water-landing` and `data-water-landing-surface` identify the extended behavior.

## Validation

- Existing experience and kernel regressions: **117 passed, 0 failed**.
- `node dev-tools/watercycle_pilot_inland_landing_qa.cjs`: passed actual lake, stream, and ocean transitions; surface heights; stream dimensions; both camera views; pause, reduced motion, and expiry; restoration and land exclusions; 390 px layout and accessibility checks; single disposal of shared resources; no observed page or WebGL errors.
- Visually reviewed lake impact, lake-edge clipping, and the stream Water view in `scratch/water-inland-landing-review/`.
- JavaScript syntax check passed. Canonical source and desktop mirror have identical SHA-256 hashes.
- Existing local preview returned HTTP 200 on port 58122.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
