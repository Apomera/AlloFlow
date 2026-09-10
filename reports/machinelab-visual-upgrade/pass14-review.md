# Machine Lab: rotational force guides (pass 14)

The wheel-and-axle and screw stations now show turning effort with curved guides and straight arrows that follow each handle’s tangent. The screw’s output arrow points downward with the press, and the wheel’s output arrow rises with its load. Inspection holds all these cues in the selected pose.

The screw Close view now uses a 32-degree tilt so its horizontal turning guide is readable on a narrow screen. The other stations retain their existing Close views. Observation text explains the new guides.

## Implementation

- Curved guides use fixed tube geometry and a tangent-aligned cone; animation updates transforms without rebuilding the geometry.
- Handle arrows follow the actual grip radius and rotation. Wheel effort stays in the wheel plane; screw effort stays in the handle plane.
- Output arrows translate with the lifted load or press shoe and keep a fixed size.
- Fourteen new geometry cases cover small and large handles, seven held positions, reduced motion, perpendicular effort directions, grip alignment, and curved-guide orientation.

## Visual review

Each theme covers eight desktop scenarios: half and full stroke on both stations, plus quarter turns with two handle sizes. Mobile checks cover both stations at 320px and 390px, keyboard positioning, Close view tilt, held-pose stability, reduced motion, timer identity, and station reset.

Inspected light desktop wheel and screw screenshots, plus the high-contrast mobile screw before and after the Close-view adjustment.

[Desktop wheel at half stroke](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass14-light-final/windlass-50.png>)

[Large screw handle at quarter turn](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass14-light-final/screw-quarter-0.5.png>)

[Mobile screw in high contrast](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass14-contrast-final/mobile-screw-320.png>)

## Publishing

Changes remain local. Source and desktop mirror were compared before each write and remain byte-identical. No commit, push, or deployment was performed in this pass.

## Final validation

All 846 tests passed across 25 Machine Lab test files. All three final browser reviews passed, with eight desktop scenarios per theme and no browser errors or horizontal overflow. Reviewed the dark mobile wheel and the high-contrast mobile screw as well as the light desktop mechanisms.

JavaScript syntax and scoped whitespace checks passed. Source and desktop mirror are byte-identical. SHA-256: 5bad761761cbaba21e1f3355da07f4e12a105eeb85b921c6850720760d53d724.
