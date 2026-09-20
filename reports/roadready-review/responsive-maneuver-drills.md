# Responsive maneuver drills

Reviewed 2026-09-19. Changes remain local; no commit or deployment performed.

## Changes

- Three-point-turn and straight-backing scenes now retain their authored world dimensions while CSS scales both axes proportionally. Narrow screens no longer crop the starting car or cone lane, and resizing does not alter the vehicle's position or maneuver physics.
- Titles, score, contact count, progress, keyboard instructions, and a 44-pixel Reset button appear above the canvas as readable HTML. The progress summary is exposed as a status, and each instructor panel has an accessible region label.
- Instructor text is larger. Tiny duplicate canvas score panels were removed.
- Three-point steering and reversing lamps now appear at the correct ends of the car. Both drills' windshields align with the forward direction used by their physics.

## Validation

- 123 unit/render tests passed across stopping behavior, shared keyboard handling, view smoke coverage, and canvas accessibility.
- Five Chromium scenarios passed: both drills at 320px and desktop widths, resize position preservation, Reset buttons, held-accelerator braking and key reset, and backing completion with retained contact penalties.
- JavaScript syntax, mirror byte parity, and targeted Git whitespace checks passed.
- Reviewed phone screenshots for both drills and the desktop backing scene. A follow-up check confirmed the phone header controls are visible, opaque, and within the viewport; a fresh capture resolved an incomplete initial screenshot.

Screenshots: `threePoint-responsive-320.png`, `threePoint-responsive-desktop.png`, `backingDrill-responsive-320.png`, and `backingDrill-responsive-desktop.png` in this directory.
