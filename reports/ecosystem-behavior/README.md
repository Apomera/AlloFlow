# Contextual animal behavior and specimen inspection

The 3D clearing now reconstructs representative animal paths from the selected baseline or experiment samples. Rewinding restores the same positions, orientations, and behavioral states. The animation reads biomass samples without modifying the food-web equations, saved samples, or exports.

- Rabbits and voles alternate exploring, feeding, vigilance, and rest. Nearby displayed predators interrupt feeding and trigger retreat; alarm decays after a threat leaves.
- Foxes search, pause to listen, track nearby prey, stalk, rest, and make short pounce attempts.
- Blue tits move away from nearby foxes, hop between feeding spots, peck near displayed caterpillars, and preen. Caterpillars crawl and pause to feed when plants remain available.
- Owls alternate wingbeats and gliding and turn toward nearby prey. Head movement, gait, and body lift respond to the selected action.
- Ground movement uses gradual turning, same-group spacing, a soft clearing boundary, and approximate steering around several rocks and logs.

**Isolate specimen**, available in animal inspection, hides other representatives and foreground scenery while retaining the forest background. It changes the view only: hidden animals still participate in behavioral cues. The behavior caption identifies the current action, missing groups, and reduced-motion status. Habitat view restores the community; Reset camera also clears isolation.

## Interpretation and limits

These are illustrative behavior rules, not a validated individual-based ecological simulation. Displayed animals represent capped biomass indicators rather than individual counts. Distances, action durations, and speeds are teaching parameters. A pounce is not a confirmed capture. Feeding and population change remain controlled by the separate biomass model.

This pass does not simulate individual hunger, learning, reproductive cycles, day/night activity, occupied burrows, or full habitat navigation. Local steering is not collision-proof navigation. Reduced motion freezes starting poses while numeric samples continue to follow the selected time. Lighting presets change appearance, not circadian behavior.

Behavior references consulted:

- [National Park Service: red fox hearing and hunting](https://www.nps.gov/bith/learn/nature/red-fox.htm)
- [Cornell Lab: American Barn Owl behavior and hunting](https://www.allaboutbirds.org/guide/American_Barn_Owl/lifehistory)

## Validation

Six behavior unit cases cover threat interruption, food availability, hunting states, deterministic reconstruction, branch-specific predator removal, finite bounded movement, stationary poses, and preservation of biomass samples. Together with existing natural-pose, soil-cycle, and insect/bird tests, 28 targeted unit checks passed.

Five browser scenarios passed: the three existing 3D interaction/fallback checks, soil-cycle integration, and the new behavior/inspection scenario. The new scenario checks keyboard isolation, unchanged configuration and biomass values, exact rewind, camera tracking, scene restoration, predator removal, branch changes, reduced motion, and mobile overflow. The initial run caught an incorrect test expectation (a blue tit was moving away from a fox, rather than hopping); the corrected scenario passed. The final fox-leg articulation was checked again in that scenario.

Desktop blue-tit and fox-pounce captures, plus a 390px mobile inspection capture, were reviewed for framing and unobstructed visibility. Source and desktop mirrors match.
