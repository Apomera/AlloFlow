# Road Ready: intersection guidance

The live signal preview now includes a vehicle stopped at the line, with a 5 cm numerical tolerance. Previously a strict positive-distance check dropped the current signal at exactly zero distance.

The rule card distinguishes approaching a stop, scanning and yielding after stopping at a stop sign, holding at red, checking before proceeding on green, and protected versus permissive turns. A stopped-at-line cue requires both a near-line position and effectively zero speed; stopping far from the line or rolling toward it does not earn the scan instruction.

At-line instructions remain visible in the ordinary and compact HUD modes. Mission progress yields to a visible rule card, resolving their overlap in Instructor mode.

Turn indications use directional arrow shapes instead of illuminated round lamps. Yellow arrows flash on the simulation clock; reduced-motion mode holds the symbol steady. The distance and action labels have a dark background to stay readable against bright sky or snow.

The rule wording follows the [Maine BMV traffic-control guidance](https://www.maine.gov/sos/bmv/driver-licenses-and-ids/car-license/motorist-handbook). Green indications still require checking for traffic and pedestrians; the UI does not grant right-of-way merely because the car stopped. These changes affect preview and coaching, preserving existing driving physics and scoring.

## Validation

- 122 focused unit checks pass, covering line-position boundaries in both directions, moving versus stopped cues, arrow geometry and flashing phases, existing driving rules, following-space guidance, and pedal handling.
- The browser regression exercises stop-sign, red, green, permissive-left, and protected-left transitions, verifies that mission progress does not cover the rule card, and checks the phone layout for horizontal overflow.
- JavaScript syntax and active source/mirror parity are checked. The final browser run and screenshots use a 0.5 device pixel ratio to reduce this host's software-rendering load.

Screenshots: [hold at red](intersection-hold.png), [protected arrow on phone](intersection-arrow-mobile.png).

Changes remain local; no commit or deployment was performed.
