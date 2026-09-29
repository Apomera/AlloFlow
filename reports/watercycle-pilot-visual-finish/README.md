# Be the Water visual review

The pilot now uses the same paper, teal, and forest materials as the Explore map. Route choices have larger labels and clearer selected states. The 3D scene remains the central workspace, while its journey guide, pathway comparison, and notebook use quieter cards and more readable evidence text.

The notebook uses five summary tiles on desktop, three on intermediate screens, and two on narrow phones. Action buttons are at least 44px tall. At 320px the climate and challenge drawers stack, navigation controls wrap, and notebook actions share the available width.

Run the scoped visual check with `node dev-tools/watercycle_pilot_visual_finish_qa.cjs`. The generated `results.json` records six theme and viewport states: light, dark, and contrast at 1280px and 320px. It checks overflow, notebook text and target sizes, page errors, and four accessibility regions in each state. The commit retains `pilot-light-1280.png`, `pilot-dark-320.png`, and `notebook-light-1280.png`; the script reproduces the other captures locally.

The existing `watercycle_pilot_route_comparison_qa.cjs` also checks pinned evidence, writing prompts, export, notebook restore, and light/dark route comparison layouts. Its screenshots are in `scratch/water-route-comparison-review`.

These checks use a paused pilot and fixture records for comparison. They verify UI layout and retained workflows; they do not claim that the fixture records came from live flights.
