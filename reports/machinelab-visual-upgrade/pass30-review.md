# Machine Lab: slow-motion playback

Learners can select **Slow motion** to follow each of the six mechanisms at one-third speed. The same motion takes 6.6 seconds instead of 2.2 seconds. The speed is fixed when the run starts, and the inspection controls can interrupt playback to hold a position.

Explicit motion preferences now reach the workshop renderer. Motion-off demonstrations remain still, use the normal short duration, and display **Still demonstration** and **Inspect the mechanism**.

## Validation

- 530 unique tests passed: 279 geometry tests and 251 final UI, camera, accessibility, and translation checks. This pass adds 18 tests.
- Geometry checks compare all six machines at matching phases of normal and slow playback, including held inspection poses and explicit motion preferences.
- Final browser checks passed in light, dark, and high contrast at 1150, 390, and 320 pixels: 12 screenshots, 18 checks, no recorded errors or horizontal overflow.
- Browser checks cover keyboard speed selection, playback lasting beyond the normal duration, inspection takeover, return to normal speed, stale timer isolation, and explicit motion settings overriding the opposite OS setting.
- Visually reviewed light at 320 pixels, dark desktop during playback, and high contrast at 390 pixels.
- Source and desktop mirror are byte-identical; JavaScript syntax and scoped git diff checks pass.

The initial combined test run had four incorrect assertions that expected an enabled control in a render fixture without WebGL. Those assertions now verify the disabled fallback; real-browser checks verify the enabled state. The final UI rerun passes. Existing React key warnings remain in unrelated render paths.

## Evidence

- [Final UI tests](pass30-ui-final-tests.json)
- [Geometry tests in the initial combined report](pass30-tests.json)
- [Light browser checks](pass30-light-final/results.json)
- [Dark browser checks](pass30-dark/results.json)
- [High-contrast browser checks](pass30-contrast/results.json)
- [Machine-readable summary](pass30-summary.json)

Changes remain local. Publishing remains paused.
