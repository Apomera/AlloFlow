# Recorded behavior cues

The Behavior moments panel now includes a native, keyboard-accessible **Why this action?** disclosure. It explains the selected representative's sampled action using the inputs recorded when the animation made that decision.

Examples include a nearby predator interrupting feeding, alarm persisting after a threat leaves, available plant food supporting a feeding pause, prey triggering listening or stalking, and a committed pounce continuing through landing. Scheduled rests and preening are described as parts of the simulated activity cycle, without inferring individual tiredness or hunger. A pounce explanation does not imply a confirmed capture.

When a particular predator or prey representative supplied the relevant cue, **Inspect cue** follows that representative. It preserves the selected time, pauses playback, and works with isolated inspection. Lingering alarm, routine pauses, absence, and airborne pounces do not offer a misleading current-target link.

Recorded inputs include food availability, nearest threat/prey identities and representative indices, and their distances before movement. This preserves the decision's actual context instead of recomputing neighbours after animals move. The existing behavior rules and food-web equations are unchanged. Candidate availability comes from the current biomass sample; positions come from the preceding pose sample.

Explanations follow the selected baseline or experiment and update during rewind. With reduced motion, they describe the selected time while the 3D pose remains frozen. The existing panel guidance makes that distinction explicit.

## Verification

18 targeted unit checks passed across recorded cues, behavior moments, action transitions, and insect/bird model integration. New cases distinguish immediate threat from lingering alarm, avoid inappropriate capture or prey claims, verify recorded distances against input poses, ensure cue links refer to present representatives, exclude removed predators, and preserve model samples and deterministic replay.

Browser checks cover keyboard cue-following, unchanged inspection time and saved run, isolated camera targeting, disappearance after an intervention, baseline switching, reduced-motion explanations, and mobile layout. Screenshots and final results are retained in this directory.


Final verification: both browser scenarios passed. Desktop and mobile explanations were visually reviewed. Disabled behavior-navigation buttons now use dimmed text and dashed borders; the explanation browser scenario was rerun and its refreshed desktop capture reviewed after that styling change. Syntax validation passed, and the web and desktop source copies have identical SHA-256 hashes.
