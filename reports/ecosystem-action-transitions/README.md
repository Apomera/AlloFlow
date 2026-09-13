# Animal action transitions

Fox hunting now includes a short preparation pose, a complete airborne arc, and a stationary recovery. Preparation can be abandoned when nearby prey disappears or moves out of reach. Once airborne, a fox keeps its takeoff heading and completes the landing even if the next biomass sample removes its prey. A brief cooldown prevents an immediate repeated takeoff.

The fox crouches before jumping, extends its legs during flight, and settles after landing. Feeding dips, resting posture, and head turns ease toward their targets instead of snapping between actions. Feeding poses include small repeated dips. All action history is reconstructed from the selected run, so rewinding and switching between baseline and experiment remain deterministic.

Close-up inspection also offers a Representative animal selector. It follows the selected displayed animal and isolates that same representative when requested. Selection is capped to the current displayed group size; absent groups disable the selector, changing species starts at its first representative, and Reset camera resets the selection. These controls do not change the saved run or biomass values.

This remains an illustrative animation layer. Its movement distances and action durations are teaching parameters, not measured animal performance. A completed leap is not a confirmed capture. These changes do not add individual hunger, reproductive cycles, circadian behavior, or full habitat navigation to the biomass model.

## Verification

New unit coverage checks takeoff and landing continuity, fixed airborne heading, recovery, cancellation before takeoff, completion after prey removal, exact replay, unchanged biomass samples, and bounded changes in feeding, resting, crouching, and head orientation.

The extended browser scenario checks preparation and recovery captions, rewind into a leap, isolated inspection, model values, reduced motion, mobile layout, and restoration of the community view. Captures in this directory show preparation, peak leap, recovery, and mobile inspection.


Verified: 29 unit checks across action transitions, contextual behavior, natural poses, and the food-web model passed. Both browser scenarios passed: natural wildlife inspection and the extended behavior/representative-selection scenario. Desktop preparation, leap, recovery, and mobile captures were visually reviewed. Syntax validation passed, and source and desktop copies have matching SHA-256 hashes.

The browser assertions were updated to reflect two intended behaviors: the first fox can abandon a pounce, so the test selects a representative with a complete observed sequence; and a shrinking displayed group can change the followed representative, so selection clamping and reduced-motion stability are checked separately. Reduced-motion captions say Starting pose, avoiding an incorrect absence label for representatives that first appear later in a run.
