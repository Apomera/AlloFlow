# Guided detector movement

October 1, 2026

The first discovery now lets a learner move the detector before taking its second reading. This gives them time to see what changed in the setup and compare it with the saved observation.

## Experience

- After recording the 1 m reading, **Move detector to 2 m** changes the setup. It keeps the saved reading at **100%** and does not add evidence or mark a discovery complete.
- The diagram shows a solid current detector at 2 m and an outlined saved position at 1 m, with a movement arrow and **Now** / **Saved** labels. Its accessible description gives both positions and the saved value.
- The heading changes to **Read at 2 m**. Keyboard focus moves to **Take a reading at 2 m**, which separately records **25%** and opens the two-reading comparison.
- Revisiting a prepared setup keeps the detector and saved reading without taking another measurement or moving focus automatically. Free exploration shares the same setting and observations.
- Restart clears the setup and readings while retaining an earned discovery and its note. Saved 4 m setups from free exploration display their actual position and value, and offer an explicit first reading at 1 m.
- On a 320 px screen with larger text, the detector position, diagram, saved value, and next action fit in the viewport. High contrast mode keeps the current and saved markers visually distinct.

## Verification

- **147 state tests passed**, including eight new cases covering movement, restored settings, reference navigation, free exploration, restart, and preservation of notes and progress.
- **Six guide browser tests passed** in Chromium, with keyboard interaction, 320 px larger text, reduced motion, high contrast mode, and WCAG accessibility audits.
- **Three isolated negative checks passed**: the browser test rejected recording evidence on movement, changing the saved value from 100% to 25% on movement, and drawing the detector at its old position while claiming it moved.
- All four tool copies and all four English registries match; **493 active translation keys** are synchronized. Parsing, production loader mapping, and the verifier's own failure checks pass.
- Compared with the snapshot taken before this pass, all code outside the studio fragment and eight existing helpers/components are unchanged. The refinement changes the first-discovery component and its scoped high contrast styling.
- Scoped Git whitespace checks pass. Changes are **uncommitted**.

A final state-suite attempt using a thread worker timed out during worker startup and ran no tests. That report is retained in [first-movement-unit-final.json](first-movement-unit-final.json). The subsequent process-worker run passed all 147 tests; see [first-movement-unit-verified.json](first-movement-unit-verified.json). The earlier successful run is also retained in [first-movement-unit.json](first-movement-unit.json).

Browser evidence: [final results](first-movement-browser-final.json), [desktop](first-movement-desktop-prepared.png), [320 px light theme](first-movement-mobile-prepared-light.png), [320 px high contrast](first-movement-mobile-prepared-forced.png).

The pre-edit snapshot is [first-movement-before.js](first-movement-before.js). Negative checks use isolated substituted modules and leave production source unchanged.
