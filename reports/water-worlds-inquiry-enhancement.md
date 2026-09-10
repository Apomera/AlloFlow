# Water Worlds: recorded-time inspection and guided inquiry

The next enhancement makes a completed storm available for closer investigation without changing its evidence.

- Revisit any whole minute of a completed run, jump to the end of rainfall, and return to the final state. The scene, gauges, and cell inspector follow the selected time. The full-run graph shows an inspection cursor and the rainfall period.
- Highlight changed land cover directly below the scene, with a count and dashed outlines against the pinned baseline.
- Choose a ground-cover, retention-garden, or consecutive-storm investigation. Each provides three prompts adapted to Notice, Investigate, or Model. Free investigation remains available.
- Download a readable text report in addition to JSON. Both retain the actual recorded result while the scene is inspecting the past.

The water equations are unchanged. Recorded-time reconstruction uses the same initial conditions and fixed solver steps. Inspection cannot mutate the completed run or baseline, and a new storm always starts from the actual final state. Comparison provenance checks starting stores, terrain elevations, and rainfall, so a stale replay flag alone cannot label a comparison controlled.

The added model tests cover intermediate and endpoint reconstruction, later storms with nonzero start times, immutable evidence, comparison conditions, saved investigation choices, and reports with units and observation duration. Browser checks exercise keyboard scrubbing, edit restrictions, actual scene/gauge values, highlights, learning-level prompts, exporting while inspecting, and starting a second storm from final water.

Screenshots and browser results are under `water-worlds-implementation/`, including `worlds-inspection.png` and `example-investigation.txt`. These remain local enhancements to an illustrative teaching model, not calibrated hydrologic predictions.

Final validation: all 102 tests across eight targeted suites passed. All 14 browser workflow groups passed, with no browser exceptions or axe violations in light, dark, flow, keyboard, and inspection states. Desktop inspection and comparison screenshots were visually reviewed. Browser layout checks passed at 320px and 390px.
