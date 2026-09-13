# Behavior interaction framing

Open **Why this action?** during animal inspection and enable **Show behavior interaction** to see the selected animal and the predator or prey behind its current recorded cue together. The scene identifies the other species and representative, rings mark the pair, and the camera fits both animals across desktop and narrow layouts. Camera distance cannot zoom closer than the pair's fitting distance.

Isolation retains those two representatives while hiding other animals and nearby scenery. Turning interaction framing off restores ordinary single-animal isolation. Following **Inspect cue** also returns to single-animal inspection. Missing cues, removed animals, committed pounces and recovery do not leave a stale pair on screen. The preference can remain enabled so framing returns when a new cue becomes available. Habitat and forest views hide interaction framing, and Reset camera turns it off.

Cue identity comes from the recorded behavior explanation. Both animals are shown at the selected sample's positions; the caption explains that the behavior decision used the preceding positions. The view does not assert a successful capture. Reduced motion hides interaction framing because the renderer freezes starting poses while explanations follow the selected sample.

No food-web equations or behavior decisions changed. Pair framing reuses existing animal meshes and selection rings and adds no persistent GPU resources.

## Validation

19 unit checks passed across interaction identity and availability, recorded cues, and the food-web model. New cases cover current pose references, unchanged samples, absence, invalid coordinates and exclusion of committed pounce targets. Browser scenarios cover keyboard activation, both visible animals under isolation, viewport fitting, rewind, absence, reduced motion, branch switching and saved-run preservation, plus existing cue navigation.

Both browser scenarios passed. Desktop and mobile captures were visually reviewed: both animals and their contrasting rings remain visible, with readable interaction labels and no horizontal overflow. Syntax validation passed and both application copies have identical SHA-256 hashes.
