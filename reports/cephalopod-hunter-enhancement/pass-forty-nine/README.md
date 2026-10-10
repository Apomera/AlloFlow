# Pass 49 — soft ink defense

Ink now forms 13 feathered, gently moving billows in one draw call. A world-space fade removes hard intersections at the seabed, including the shelf and deep floor. Close-camera fading avoids harsh billboard crossings.

The defense still consumes the same finite reserves, respects the same cooldown, lasts 3.2 seconds and uses the existing expanding collision radius. Pause freezes the effect; reduced motion freezes additional drift while keeping lifetime feedback. Owned geometry and material dispose on expiration or dive teardown.

Validation: 201 targeted CPU tests and 10 native browser checks passed, with no retries or skipped checks. GPU probes verified the seabed fade at three depths on desktop and phone. Thirteen paired native captures preserve camera and world state; each cloud remains one draw call and drops from 352 to 26 triangles. This does not establish hardware frame rate.

The first visual review exposed hard seabed clipping; the rejected captures remain in `initial-views`. Final evidence is in `final-views`, compared with the accepted pass48 source in `baseline-views`.

[Open gallery](gallery.html). Detailed hashes and receipts are in [report.json](report.json). All changes remain uncommitted.
