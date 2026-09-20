# Backing geometry and guidance

Local refinement; not committed or deployed.

## Changes

- Replaced the center-distance cone check with intersection between the complete rotated car body and the visible cone triangle. Bumper and corner contacts now register.
- A new contact stops the car at its previous pose, records each newly hit cone once, and requires the driving controls to be released before continuing. Hit cones are drawn tipped over and remain counted until reset.
- Backing uses smoothed steering and body-center bicycle motion, with steering response reversing naturally when backing. A stationary car cannot rotate in place.
- Added live guidance for side clearance, alignment, target approach, stopping, pause, and completion, plus a distance-progress indicator outside the canvas.
- Removed the uncalibrated 100-foot claim. Instructions describe the marked target and encourage checking around and behind, using mirrors as part of the scan, and stopping when the path is unclear.
- Updated the canonical source and its desktop public mirror together.

## Verification

- 115 unit/render tests passed across backing geometry, drill stopping, maneuver controls, and view smoke tests. The initial run had one worker-start timeout; the affected five-test geometry file passed when rerun separately.
- Eight Chromium browser scenarios passed across backing contact, drill stopping, and maneuver controls. Coverage includes held-input contact recovery, retained penalties, reset, controller neutral gating, settings suspension, interruption, touch cancellation, and stopped completion.
- Geometry coverage includes a complete simulated straight backing run with no cone contacts. Browser contact and completion cases seed positions to exercise those boundaries directly; they are not full-length driving trials.
- Syntax, canonical/mirror byte parity, and source whitespace checks passed.
- Inspected `backing-live-guidance-320.png`: live guidance, progress, and controls fit at 320 pixels without horizontal overflow.

This remains a simplified training simulation, with no claim of calibrated real-world speed or distance.
