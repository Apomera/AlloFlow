# Shared-patch map investigation

The Colony Network activity now includes an optional three-step investigation beneath the larger 3D map: **Can two colonies share a patch?** It starts collapsed, preserving the map-first layout.

## Learner experience

- Choose one of the six patches and make a prediction, including an “I am not sure yet” option.
- Show each colony’s route to that same patch. A shortcut above the map lets learners record the visible route and return to the investigation.
- Compare two observation cards with distinct solid/dashed route symbols, colony labels, and the captured game cycle.
- Choose an explanation and receive specific feedback about shared access, selection rings, and the limits of route counts. Learners can revise their choice and add an optional field question.
- Save the investigation to the Science Notebook, read its complete record there, and include it in the existing portfolio export. A direct notebook button also exits expanded-map view and moves keyboard focus to the notebook.

## Evidence and scientific limits

The records describe a teaching diagram. They are not tracked flights, empirical visit counts, measured distances, or food yields. The existing [2025 neighboring-colony study](https://doi.org/10.1002/ece3.71401) remains linked for comparison: overlapping landscape use can coexist with differences in local patch use. The activity does not add territorial boundaries or claim to simulate a surveyed African habitat.

Recordings require a ready 3D map, visible routes, a matching study patch, a prediction, and one selected colony. Winter-hidden routes, switched patches, both-colony views, and duplicate captures cannot create a new observation. Prediction and patch selection become fixed after the first capture. Captures keep their cycle, timestamp, and diagram version when the game or view changes.

Working notes persist in `queenMapStudy`; saved notebook records live in `notebook.sharedMap`. Clearing the working investigation keeps the saved notebook version. Route inspection and recording do not change the canonical Queen game state or replace its WebGL canvas.

## Validation

- 44 focused unit tests passed: 12 map-investigation tests, 12 RTS scene tests, and 20 discovery-evidence tests. Report: `scratch/bee-map-study-unit.json`.
- Browser checks passed for hidden-route/wrong-patch guards and restoration after remounting; keyboard controls and 320px layouts passed in both themes with no Axe violations in the investigation panel.
- The initial complete-flow browser check passed recording, feedback, immutable observations, saving, game-state preservation, and canvas preservation, then encountered the closed notebook during export. The notebook shortcut and visible saved entry were added to complete that handoff.
- The broader nine-scenario browser run encountered runner timeouts and a missing artifact file and was interrupted. A full-suite pass is not claimed. A separate notebook/view unit run returned no executed tests and is not counted.
- Source and desktop Bee files matched; scoped `git diff --check` passed.

## Visual review

- `scratch/beehive-rts/map-investigation-complete.png`
- `scratch/beehive-rts/map-investigation-mobile-light.png`
- `scratch/beehive-rts/map-investigation-mobile-dark.png`

The desktop completion view and the 320px dark-theme view were inspected visually for spacing, readable wrapping, and unclipped controls.

Final isolated browser verification: the complete investigation, feedback, completed-panel Axe audit, saved notebook entry, fullscreen exit and focus handoff, and portfolio export all passed (1 scenario). Log: scratch/bee-map-study-final-browser.log. Together with the two earlier activity browser passes, all three new scenarios passed.
