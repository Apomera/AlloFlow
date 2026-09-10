# Drone heading and motion cues — 9 September 2026

The flight view now distinguishes where the bee points from the direction it moves. A white diamond marks heading, a cyan ring marks motion, and a dashed connector makes drift visible when the directions separate. Nearby cues share a label to reduce overlap.

Both cues use equal-length direction pointers from the bee and project through the active Three.js camera. The canvas fallback applies its existing perspective and roll transform. These are model direction aids, not a predicted trajectory or a guarantee of a safe route. Near-zero or unavailable velocity produces no motion ring; a direction behind the camera does not become a misleading forward marker.

An optional “Heading, motion & wind” disclosure explains the two symbols, describes motion relative to heading, reports rising or descending, and gives the current modeled wind direction. It supports keyboard interaction, light and dark themes, forced colors, and a 320 px viewport. Camera changes and inspection preserve paused physics state.

The implementation updates the Bee source and its desktop mirror. Flight dynamics, energy, randomization, checkpoints, and scoring retain their existing behavior.

## Verification

- 14 focused Vitest assertions passed across motion-readout and WebGL-runtime tests; process exit code 0. The runner also logged a worker shutdown timeout after writing its successful JSON report.
- Three Playwright cases passed: the existing clear-flight camera/resize regression, actual-camera motion projection and stationary/rearward behavior, and keyboard/mobile/fallback inspection in both themes.
- Browser checks compared the cues against independent camera projection math, verified unchanged paused physics, checked horizontal overflow, and ran scoped Axe checks. Forced-color visibility was also checked.
- Visually inspected chase, cockpit, and dark mobile explanation screenshots. The cues and their labels remained legible and separate from the lower instrument panel in those scenes.
- Both JavaScript files passed syntax checks; scoped diff whitespace checks passed; source and desktop mirror matched byte for byte.

Verification is focused on this change; the complete repository suite was not run. Existing unrelated workspace edits were preserved.

## Review artifacts

- `scratch/beehive-flight-deck/motion-chase.png`
- `scratch/beehive-flight-deck/motion-cockpit.png`
- `scratch/beehive-flight-deck/motion-explainer.png`
- `scratch/beehive-flight-deck/motion-mobile-light.png`
- `scratch/beehive-flight-deck/motion-mobile-dark.png`
- `scratch/bee-motion-unit.json`
- `scratch/bee-motion-browser.log`
