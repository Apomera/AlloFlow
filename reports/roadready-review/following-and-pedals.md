# Road Ready: following space and pedal response

The following-space meter now shares the live rule card's nearest-vehicle selection, bumper clearance, road-local lane check, and speed-dependent preview range. Previously the meter used vehicle-center distance and stopped looking after 30 metres, so it could disagree with the card or disappear at highway speed.

The redesigned meter separates the measured time gap, practice target, distance, and action from its progress bar. A marker shows the target; text stays on a dark background for legibility. Rain, snow, fog, and ice use the same practice targets and warning colors as the rule card. On phones, the meter sits below the rule card and yields to alerts. It remains hidden during startup and formal overlays.

The former “3+ safe” label has been removed. These existing simulator targets are practice prompts, not legal minimums or guarantees of stopping room. Maine's [Driving Dynamics student manual](https://www1.maine.gov/dps/sites/maine.gov.dps/files/inline-files/MDDStudentManual_0.pdf) discusses following time and increasing space for conditions; learners should consult the [current BMV handbook](https://www.maine.gov/sos/bmv/driver-licenses-and-ids/car-license/motorist-handbook) for road-rule study.

Pedal smoothing now applies brake priority to the requested throttle before time-based interpolation. The old implementation repeatedly multiplied the stored throttle by the brake factor every frame, making overlapping pedal inputs dependent on display refresh rate. Throttle releases promptly, returns progressively, and clears in Park. Existing interruption handling continues to clear pedal state.

Canonical source and active desktop mirror are synchronized. Vehicle response remains an educational approximation, not a manufacturer-calibrated model.


## Verification

- 395 unit checks passed across handling, road rules, progression, driving refinements, and tool views. New checks cover brake overlap at different frame rates, progressive release, Park, weather-dependent gap warnings, highway distances, and absent or stationary lead vehicles.
- Four browser checks passed across the completed runs: desktop briefing and manual acceleration/braking; mobile learning navigation; Ride-Along; and the new wet-road following-space fixture on desktop and phone.
- The initial Ride-Along check timed out waiting for simulation time. It passed with a 0.5 device pixel ratio to reduce software-rendering load. The gap fixture's export initialization was corrected before its successful run.
- JavaScript syntax, diff formatting, and byte-for-byte active mirror synchronization checked.

Screenshots: [wet-road desktop meter](following-space-rain.png), [phone meter](following-space-mobile.png).

Changes are local; no commit or deployment was requested for this enhancement pass.
