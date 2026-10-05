# Bridge Lab: motion guide coherence

October 4, 2026. Changes remain uncommitted.

## What students see

The existing Motion guide now ties each signed displacement reading to its own responsive rail. A circle represents ground and a diamond represents deck. Ground and deck rails show each position from rest; the third rail connects the ground position to the deck position. This makes the relative-displacement subtraction visible even when the two positions lie on opposite sides of rest.

Shapes keep their 16 px screen size. HTML labels stay attached to their rails when text wraps. The scene caption identifies displayed A/reference or B/current and the exact inspected time to three decimal places. In labelled 2D or graphics fallback, the guide identifies and reads the current experiment even if scene A remains selected in the saved state.

Nonzero histories use their actual maximum absolute ground/deck displacement over the full event. Scene comparisons share the maximum across both trials; selecting A/B or inspecting another time keeps this scale fixed. Unequal response amplitudes remain unequal. The guide no longer flattens tiny histories against a .001 m floor.

Signed centimetres and range captions use precise decimal or scientific notation. A short explanation preserves the meaning of tiny nonzero readings. The guide distinguishes rounded readings from unrounded plotted positions and states that diagram direction stays fixed across the bridge when the camera turns. The existing 3D scene still magnifies motion 10 times; the rails and values show actual displacement.

True zero input shows resting endpoints and a clear explanation. A positive denominator is used only for empty histories and is not presented as a physical range. The relative gap is drawn between the two absolute-coordinate endpoints; it is not divided by an unrelated relative-response scale. A gap can exceed either endpoint's offset from rest without clipping.

This reuses the existing native disclosure and preserves its preference, scene selection, replay time, camera, notes, records and interval pin. No new stored fields or record format are introduced.

## Verification

- 222 automated checks passed across the complete immersive interaction, seismic model and inertia suites, including 166 interactions and three new motion coherence checks.
- After the final compact spacing and rounding-caption refinements, six focused motion interactions passed again.
- Nine real-WebGL workflows passed on the final source: three new motion coherence workflows, three existing motion-guide/fullscreen/recovery workflows and three recorded-maximum regressions. Desktop and 320 px phone checks verify fixed-size markers, retained A/B scale, precise values, exact zero, no horizontal overflow and no JavaScript errors.
- Numerical checks cover 144 combinations and 207,504 recorded frames, including 39,564 opposing ground/deck positions, 78,720 negative relative gaps, 51,876 zero frames, 2,196 amplitude comparisons and 4,392 unequal paired frames. A synthetic opposite-endpoint case verifies that a gap twice either rest offset stays inside the rail.
- Canonical/public source copies are identical and parse successfully. All 1,240 literal English fallbacks match both registries. The numerical result records the final source hash.
- Source review covered coordinate signs, gap geometry, paired scaling, selected-source attribution, units, zero and tiny values. Final desktop/phone and fallback captures were visually inspected.
- Scoped whitespace checks passed. No staging or commits.

The initial browser run caught the third measurement below the compact panel at both widths. Reducing rail and row spacing kept all three readings visible while preserving 16 px markers; the original bounds assertion passed afterward. The initial report remains in browser-layout-initial.json.

Run numerical checks: node reports/bridgelab-motion-coherence-2026-10-04/verify-motion-coherence.cjs

Run strict report verification: node reports/bridgelab-motion-coherence-2026-10-04/verify.cjs

- [Desktop scene](bridge-1000-motion-scene.png)
- [Phone scene](bridge-320-motion-scene.png)
- [Desktop small-value guide](bridge-1000-motion-small.png)
- [Phone small-value guide](bridge-320-motion-small.png)
- [Phone zero input](bridge-320-motion-zero.png)
- [Graphics fallback](bridge-844-motion-fallback.png)
