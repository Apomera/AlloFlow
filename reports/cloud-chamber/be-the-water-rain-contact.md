# Be the Water: rain contact and surface highlights

September 19, 2026

Wind-slanted rain now meets the rendered ocean surface instead of a flat sea-level plane. A bounded intersection search clips a streak along its original direction, preserving the tapered shape. Completely submerged streaks are hidden. Raised lake and stream water continue to use their existing surface-height helper, and terrestrial geometry continues to hide rain through depth testing.

Rain updates now follow the ocean mesh update in each frame, avoiding a one-frame mismatch with moving waves. The 124 existing water highlights also sample that mesh, with a small surface clearance replacing their previous elevated offset.

Rain and highlights share the ocean's visual clock. Enabling reduced motion holds their current phase instead of resetting it; highlights retain both position and brightness while the simulation can continue. The rain field remains relative to the moving parcel and continues to clip against the water beneath it.

The existing pools of 84 rain streaks and 124 highlights are retained, with no additional draws, textures, or simulated water. The parcel kernel and phase-change rules are unchanged.

Validation:

- JavaScript syntax passed; canonical and desktop sources match.
- `dev-tools/watercycle_pilot_rain_contact_qa.cjs` passed: independent ocean ray checks for clipped rain and all 124 highlights, movement, pause, reduced-motion continuity, camera views, actual ocean collection, ripple expiry, snow/land exclusions, mobile notice accessibility, cleanup, and no captured page or WebGL errors.
- Visually reviewed the Water-view rain and surface-highlight capture in `scratch/water-rain-contact-review/`.
- The obsolete flat-sea assertions in the rainfall and landing browser checks now use independent ocean ray checks. The existing source regression guard now expects the shared visual clock rather than resetting highlight time to zero.
- Inland browser check passed, including actual lake landing, lake/stream/ocean heights, seasonal visibility, motion controls, accessibility, and resource cleanup. Experience and kernel regressions: 117 passed, zero failed (pilot-rain-contact-regressions.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `2a74b0cac8f5dc165bf2967aa0dca42d0f0a5da51942c3ddc250985593de58af`.
