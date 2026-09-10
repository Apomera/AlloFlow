# Cell simulator enhancement

Implemented a reachable Osmosis Lab in the interactive mode category, replacing the former unreachable three-state activity.

- Tonicity now follows the nonpenetrating solute concentration difference independently of water permeability.
- Zero permeability blocks water movement without falsely implying equal concentrations.
- Plant and animal response descriptions distinguish turgor/plasmolysis from swelling/shrinkage and do not predict automatic rupture.
- An accessible static diagram, bounded sliders, and four experiment presets support controlled comparisons.
- The observation notebook retains eight trials with settings, predictions, direction, tonicity, and relative initial-flow index.
- Comparison feedback identifies single-variable versus multiple-variable changes.
- Reset controls preserves writing and observations. Legacy notebook rows are labeled for rerecording.
- The model is explicitly an initial-response illustration, not a time-based volume or pressure simulation.
- Source and desktop deployment mirror are synchronized.

Biology reference: [OpenStax Biology 2e: Passive Transport](https://openstax.org/books/biology-2e/pages/5-2-passive-transport).

The notebook is held in the current simulator session; it does not add cross-session notebook persistence.

Validation: 57/58 selected unit checks passed. The remaining check detected concurrent shared STEM host/mirror drift (outside this cell change). The final Chromium desktop/phone interaction, keyboard, viewport-width, and overflow checks passed. Cell source/mirror hashes, JavaScript syntax, and diff whitespace checks passed.
