# Enhancement 69 — Focused paired comparison

Opening Compare distances now makes room for the distance readings by hiding the direction rows. The panel retains the center visibility count. Hide distances restores the directions; minimizing and reopening preserves the disclosure choice. Camera position, orientation, lens, clocks, and renderer pixels remain unchanged by these panel actions.

Validation: 21 focused unit tests; 13 Chromium browser workflows; seven accessibility checks with no violations; nine screenshots; three control reachability checks. Desktop and 320 px phone disclosure checks include keyboard closing, retained focus, minimize/reopen, independently calculated distances, and exact scene/pixel preservation. Existing direction, fullscreen, high contrast, landscape, and flyby return checks also passed. Browser rendering used Chromium SwiftShader; this is not a cross-device GPU certification.

Canonical and desktop UI copies match. Renderer unchanged. Nothing staged or committed.
