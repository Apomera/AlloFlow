# Be the Water: guidance that follows the sunlight zone

The evaporation hint now distinguishes liquid water inside the marked sunlight zone from water outside it. The outside-zone objective explicitly offers two valid choices: stay to observe slower energy gain, or enter the ring to compare. Near the evaporation threshold, it confirms that the parcel can still become vapor outside the ring.

One sunlight-boundary function now serves the live snapshot and simulation input. The zone is derived from the current position and water surface rather than trusted from a saved checkpoint. Zone changes bypass the normal HUD throttle, so crossing the boundary can update the guidance even when energy and other readings barely change.

The existing energy gauge now has an equivalent screen-reader progress bar with a clamped percentage. It sits outside the intentionally hidden visual HUD, so assistive technology can reach it without exposing duplicated HUD text. Its label identifies normalized model progress, not a measured temperature or energy quantity. The surface-evaporation notice reports that the threshold was reached instead of showing the kernel's post-transition energy reset as zero percent.

Simulation rates, the sunlight-zone radius, and phase thresholds are unchanged. The new snapshot detail is live presentation state; the notebook format is unchanged.

## Validation

- Final validation: **117 experience and kernel tests passed**. Browser acceptance passed exact boundary checks, low/high-energy guidance, accessible model progress, zone-only HUD updates, actual entry while steering, evaporation outside the zone, corrected threshold evidence, and mobile normal/forced-colors display with reduced motion. No page or WebGL errors were observed. Source syntax passed.
- Existing experience and kernel regression report: `pilot-evaporation-guidance-regressions.json`.
- Browser acceptance: `dev-tools/watercycle_pilot_evaporation_guidance_qa.cjs`.
- Visual captures: `scratch/water-evaporation-guidance-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
