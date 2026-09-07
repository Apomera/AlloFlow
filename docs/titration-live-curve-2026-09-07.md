# Titration bench live curve — September 7, 2026

The immersive bench now offers a Live curve panel beside the apparatus. It uses the existing titration curve samples, current reading, axis definition, and equivalence volume. The plot traces only the simulated response up to the current volume and adds the exact current point even between the source curve's 0.2 mL samples. It is explicitly described as a simulated response, not a log of experimental measurements.

The panel supports pH and redox potential with their existing units and ranges. A dashed equivalence marker is labeled separately from the indicator observation. Changing setup or moving the volume backward trims the trace instead of retaining future points.

Live curve can be hidden without recreating the 3D renderer or resetting the experiment or close-up. It starts hidden on narrow screens (760 pixels or less); students can enable it there, where it stacks below the apparatus. Once chosen, visibility persists through resizing and 2D/3D switching during the mounted session.

Verification: 58 focused tests passed across five files, including new exact-current-point, duplicate-point, rewind/reset, and invalid-sample cases. Real Chromium WebGL checks verified live updates, redox units, setup reset, and unchanged renderer identity when the graph is toggled. Existing close-up, addition, camera, reduced-motion, refill, and failure-fallback workflows passed. Nine targeted axe scans covered all three apparatus views at 1200, 360, and 320 pixels with the panel enabled: no violations, panel overflow, or browser exceptions were recorded. The desktop flask/curve composition was visually reviewed.

Evidence: `reports/chemistry-refinement-2026-09-06/titration-trace-tests.json`, `titration-trace-browser.cjs`, `titration-trace-browser-results.json`, and `titration-trace-*.jpg`.

New interface labels use translation lookups and are included in the English catalog; language-pack translations remain a follow-up. Source and desktop public copies match. No deployment was performed. This pass adds a visualization of existing simulation data; it does not change the chemistry engine or provide headset VR.
