# Machine Lab: eleventh visual pass

The pulley station now has a connected rope path for every supporting-strand setting, with working sheaves and an attached load and pull handle.

- **Rope route:** one path alternates around fixed and moving sheaves. Odd counts anchor on the moving block; even counts anchor on the frame. The final sheave redirects the free end downward. The one-strand setting correctly uses one fixed pulley and no moving pulley.
- **Connected motion:** supporting strands shorten while the free end lengthens by the same total amount. The pull handle travels one to six times the load distance, matching the selected mechanical advantage. Wheel rim motion follows the rope without slipping at either tangent. Force arrows follow the handle and load, and the animation resets to its starting pose.
- **Assembly detail:** grooved sheaves, axle supports, bearing hubs, bolted mounting feet, and the load connector replace the former decorative wheels and detached strands. Both sides of each wheel have spoke markings, with black marks in high contrast.
- **Learning cue:** the single fixed pulley explicitly explains that it changes pull direction without multiplying ideal force.

**776/776 tests passed across 25 Machine Lab files.** Thirteen new cases cover all six settings in ordinary and reduced motion, actual rope/arc endpoint continuity, anchor and handle attachment, constant rope length, pull-distance ratios, wheel motion, floor clearance, arrow tracking, reset and the one-strand explanation. Syntax and whitespace checks passed. Source and desktop copies are byte-identical.

Final Chromium/WebGL review passed in light, dark and high-contrast themes. Each theme covers all six counts, two lifted poses, a rear view, 320px/390px mobile layouts, and reduced motion. Lifted screenshots use the renderer's own animation tick at a reproducible peak. All runs reported no page errors, no horizontal overflow and no mobile overlay obstruction.

Changes remain local; deployment is still paused.

![Six supporting strands with the load lifted](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass11-final/workshop11-pulley-lift-six-detail.png)

![One fixed pulley and its explanation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass11-final/workshop11-pulley-1-detail.png)

![High-contrast mobile pulley](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass11-contrast/mobile-pulley-320-stage.png)

[Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass11-summary.json) · [Full test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass11-tests.json) · [Previous pass](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass10-review.md)
