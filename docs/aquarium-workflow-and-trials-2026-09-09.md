# Aquarium workflow and paired experiments — 2026-09-09

The active tank now has Observe, Decide and Investigate views. The live aquarium, clock and care priority remain shared. Existing care, species, plant, sizing, habitat, lesson and systems tools remain available. Keyboard buttons reveal the chosen workspace; tutorial and equipment links open the appropriate panel before focusing their destination.

Care actions record actual before/after water readings, hunger reduction and algae changes. One-hour observations record the net reading changes separately, with the completed hour's ecosystem contributions. History retains eight entries. Equipment or lighting changes do not invent immediate chemistry changes; the interface asks the learner to observe an hour. Contributions are identified as part of the model budget, not as proof of one cause.

Saving a baseline now captures a complete deep copy of the tank. Older readings-only baselines remain usable for water comparisons and prompt a fresh save before paired trials. A retains the saved setup; B changes either biological lights or air-pump level. A written prediction and a different setting are required. Settings lock during a trial. Both branches advance by one or six hours, to a 24-hour maximum, using the same hourly simulation as the live aquarium. Water, residents, plant biomass, equipment faults and condition, dimensions and time begin identically. Trial readings, oxygen trends, B-minus-A differences, predictions and reflections persist with aquarium state.

Each branch owns its mutable state. Trials leave live tank state, inventory and external XP rewards unchanged. Replay restores the original trial baseline and uses the same random streams, keyed by hour and event site. Snapshots exclude nested trial, observation-baseline and care-evidence objects. Live observation preserves the saved experiment. The model's equations were retained; its hour advancement now accepts an input tank, random source, timestamp and live-reward flag.

## Validation

- 117 passing tests in 7 targeted suites, including 13 new workflow tests. Tests exercise actual React control handlers, snapshot isolation, identical controls, replay, the 24-hour boundary, equipment faults, live-state preservation and external reward suppression.
- Real Chromium/WebGL checks at 1440, 390 and 320 pixels: keyboard navigation, immediate/hourly evidence, six-hour paired trial, unchanged live state, replay, reflection persistence, reload, legacy baseline recovery and stable live canvas. No runtime or console errors; no horizontal document overflow.
- Desktop and phone screenshots reviewed. Existing Corydoras diagnostic wording assertion updated to match the previously delivered two-row armor model.
- Source and desktop mirror match: e2535e892b66ec3a06a44ac1ffcab0508b4926cfd6c2b2032d5c443a4463c0ef.

Evidence: .codex-artifacts/workflow-v9/delivery-validation.json and .codex-artifacts/aquarium-visual-qa/workflow-v9-final/report.json.

## Scope

Paired trials currently support lights and air-pump levels. The comparison uses readings and a trend chart; the shared live aquarium retains its 3D view. The trial model remains simplified and is not a species-specific husbandry validation. Broader experimental factors, challenge progression and teacher reporting remain future work.
