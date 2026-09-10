# Machine Lab: ramp travel cues (pass 15)

The inclined-plane station now has a marked travel rail beside the deck. A blue ring follows the crate, a thin connector links the ring to the load, and a blue progress strip grows from the starting position. Five marks divide one demonstration stroke into four equal intervals.

The upright load arrow now travels with the crate and retains its size. Previously it floated at a largely fixed location while the crate climbed. The new observation cue explains that the rail intervals represent quarters of the demonstration stroke, not metres.

The camera target rises with tall ramps. This fixes the clipped top of the vertical ramp found during screenshot review.

## Checks

Eleven new geometry tests cover five ramp slopes, held positions, reduced motion, the automatic playback cycle, and reset. They verify the ring follows the crate, the fill starts at zero and ends at the selected position, and the load arrow keeps its relative position.

The real-renderer browser review covers half and full stroke at heights 0.2, 1, 3.9, and 4 for a length of 4. It projects all four deck corners through the actual camera to detect clipping. Mobile checks cover 320px and 390px, keyboard Home/End/ArrowRight, held poses during camera changes, reduced motion, timer identity, and station reset.

Inspected the light default ramp, the vertical ramp before and after reframing, and the dark mobile ramp.

[Default ramp at half stroke](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass15-light-final/ramp-1-50.png>)

[Vertical ramp with corrected framing](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass15-light-final/ramp-4-100.png>)

[Dark mobile ramp](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass15-dark-final/mobile-ramp-320.png>)

## Publishing

Changes remain local. Source and desktop mirror were checked for independent edits before synchronization. No commit, push, or deployment was performed in this pass.

## Final validation

All 857 tests passed across 25 Machine Lab files after the camera adjustment. All three final theme reviews passed eight desktop scenarios each, plus mobile, keyboard, reduced-motion, timer, and station-reset checks. No browser errors, horizontal overflow, or clipped deck corners were reported.

JavaScript syntax and scoped whitespace checks passed. Source and desktop mirror are byte-identical. SHA-256: 3cd84ce318e9930c641f777388ddd87075bcb38fd12dcdae0c677bb28dfa9c31.
