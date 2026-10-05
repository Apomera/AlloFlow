Measuring a voltage drop now brings the updated voltmeter into view. A **Back to lamp drop** or **Back to transistor drop** button returns to the exact control that started the measurement. This connects the voltage explorer and meter on long pages and narrow screens.

For example, with a 1 V manual input, **Measure lamp drop** selects supply and collector, focuses the meter showing **660.00 mV**, and offers a return to that measurement button. Repeating a selected measurement opens the result again. The meter heading’s accessible description includes the probe order and current reading.

Focus waits until the requested probe pair has reached the rendered meter. Returning before a delayed update arrives cancels the pending focus movement. Ordinary probe or input edits retain their focus after a measurement. Navigation state stays local to the workbench; saved readings, notes, explanations, lessons, references and electrical history are preserved.

The voltage explorer now isolates numbers and units from surrounding text direction. High contrast mode uses system colors for its text, controls and diagram. The striped lamp segment, solid transistor segment and collector marker remain distinct, and their proportions follow the calculated voltage drops.

Verification passed **61 tests across four files**, including **15 new cases** in [circuit_measurement_navigation.test.js](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_measurement_navigation.test.js>). Tests cover both destinations, repeated measurements, exact returns, delayed updates, cancellation, ordinary editing, experiment changes, independent workbenches and translations. Existing meter, voltage explorer and region navigation tests also passed.

Two native browser workflows passed **16 checks of focus and viewport visibility**. All nine screenshots were inspected at original resolution. Overflow checks passed at 320, 390 and 1280 pixels. Scoped axe checks found zero WCAG A/AA violations in the meter and voltage explorer. Browser geometry checks confirmed that column segment heights follow the displayed proportions, including in high contrast mode.

| Preview | Image |
| --- | --- |
| Measurement entry | [Desktop voltage explorer](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/desktop-explorer.png>) |
| Focused lamp result | [Desktop meter](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/desktop-lamp-meter.png>) |
| Narrow result and return | [320-pixel meter](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/small-phone-meter.png>) |
| Exact return destination | [Phone explorer](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/phone-return-explorer.png>) |
| Sensor transistor result | [Phone meter](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/phone-sensor-meter.png>) |
| System colors | [Meter](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/forced-colors-meter.png>) · [Explorer](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/forced-colors-explorer.png>) |
| Right-to-left layout | [Meter](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/rtl-meter.png>) · [Explorer](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/rtl-explorer.png>) |

Earlier evidence is preserved in `before-explorer-text-direction` and `before-explorer-contrast-fix`. The latter contains the initial browser finding that fixed explorer text colors were unreadable against the system background; the final views and checks use the corrected source.

[validate.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-measurement-navigation-2026-10-04/validate.cjs>) verifies source/mirror equality, syntax, source and image hashes, test and browser evidence, scoped whitespace checks and an empty index for the affected paths. Reversing the recorded edits recovers the preceding source byte for byte. Changes remain uncommitted.

Final source SHA-256: `de3dbe261ec7fed28903ddb85ad7059e045d8b52b4cd09d05033ed6016a2efe6`.
