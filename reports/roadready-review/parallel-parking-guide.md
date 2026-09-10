# Parallel parking lesson discoverability and guidance

Parking Practice → Standard Parallel now identifies itself as the starting guided lesson. The parking menu uses a single column on narrow screens.

The instructor shows the current step out of five. An expandable, numbered guide previews the complete maneuver, highlights the current step, explains reverse steering and front-end swing, and distinguishes the training car's reference cues from general driving technique. The immediate instructor cue remains above the full guide. Reset returns the step indicator to the beginning.

Validation: Playwright passed the phone discovery/preview/progression/reset test, the complete guided keyboard maneuver, and the pause/scoring regression. The phone test passed again after visual polish. Reviewed the 320-pixel screenshot and verified no horizontal overflow. JavaScript syntax and canonical/desktop asset parity were checked.

Screenshot: `parallel-guide-320.png`. Changes are local and undeployed.
