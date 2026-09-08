# Machine Lab: eighth visual pass

The workshop windlass and screw press have more complete mechanical assemblies, and mobile workshop cards now sit outside the simulation canvas.

- The windlass has bearing housings, mounting feet, fasteners, axle collars, and one continuous rope winding that meets the hanging line at the drum tangent. The raised axle keeps the rotating wheel above the bench; the load starts above the platform and stays attached to its rope while lifting.
- The screw press has a solid base, bolted feet, frame graduations, and a swivel pressure shoe. The shoe moves downward with the screw without spinning the workpiece. The load remains seated on the base and in contact with the shoe throughout compression and reset. The shaft ends at the shoe instead of extending through the load.
- The shared workshop layout puts status cards above the canvas and the force legend below it on narrow screens. This applies to all six stations. The 250px mobile canvas keeps the machine visible alongside the camera and demonstration controls.
- Workshop animation now handles a first-frame timestamp of zero correctly.

**741/741 Machine Lab tests passed.** Seven new tests cover press contact and reset with ordinary and reduced motion, actual wheel-surface clearance at three handle sizes, continuous winding attachment, and a zero-start animation clock. The existing rope test now checks the raised axle height.

Chromium/WebGL review includes ready and moving poses, a large windlass, and coarse screw threads in light, dark, and high-contrast themes. Both machines were captured at 390px and 320px; browser checks verify that status cards and legends do not overlap the canvas. Reduced-motion press captures were also reviewed. All runs reported no page errors or horizontal overflow. Syntax and whitespace checks passed, and the main and desktop source copies are byte-identical.

![Windlass assembly](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass8-light/workshop-windlass-ready-detail.png)

![Screw press and base](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass8-light/workshop-screw-press-detail.png)

![Unobstructed mobile workshop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass8-light/mobile-screw-320-stage.png)

[Dark windlass](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass8-dark/workshop-windlass-lift-detail.png) · [High contrast and reduced motion](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass8-contrast/screw-reduced-motion-detail.png) · [Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass8-summary.json) · [Previous pass](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass7-review.md)
