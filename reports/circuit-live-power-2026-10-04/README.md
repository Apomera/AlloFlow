The live readings now include **lamp power** alongside base current, lamp current and transistor voltage. The four cards use distinct accents and adapt from a desktop grid to compact rows on phones. Each reading keeps its number and unit together in right-to-left layouts. Sensor experiments identify the divider as the source of base current.

Students can open **Connect current and lamp power** to see the live lamp voltage × lamp current calculation. The guide explains zero power in cutoff, the square relationship between current and power at fixed resistance, and the power limit once the transistor saturates. Values update as students change inputs, switch experiments, or use Undo and Redo. The guide starts closed and retains its open state during those actions.

The lamp drop in the calculation is computed as current × resistance. This avoids losing tiny positive values by subtracting nearly equal node voltages near cutoff. The existing solver supplies the current and power readings. The guide explains that displayed factors are rounded and the model uses unrounded values.

Verification passed **67 tests across four files**, including **12 new cases** in [circuit_live_power.test.js](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_live_power.test.js>). Coverage includes hand-calculated readings, both sensors, saturation, watts, the first representable input above cutoff, Undo/Redo, probe reversal, local disclosure behavior and translations. Existing transistor model, voltage explorer and history preview tests also passed.

Two local browser workflows verify native keyboard interaction, sensor response, live calculations and preservation of notes, explanations and lessons. All eight captured views were inspected at original resolution. Overflow checks passed at 320, 390 and 1280 pixels. Scoped axe checks found zero WCAG A/AA violations in the live readings and power guide.

| Preview | Image |
| --- | --- |
| Four live quantities | [Closed desktop guide](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/desktop-closed.png>) |
| Current and power relationship | [Active region](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/desktop-active.png>) |
| Narrow layout | [320-pixel phone](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/small-phone-active.png>) |
| Zero lamp power | [Cutoff](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/phone-cutoff.png>) |
| Limited lamp power | [Saturation](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/desktop-saturated.png>) |
| Divider controls the base | [Sensor](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/phone-sensor.png>) |
| System colors | [High contrast](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/forced-colors.png>) |
| Number and unit order | [Right-to-left](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/rtl-readings.png>) |

[validate.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-live-power-2026-10-04/validate.cjs>) checks source/mirror equality, syntax, the final source hash, test and browser evidence, image hashes, scoped whitespace checks and an empty index for the affected paths. Reversing the recorded edits recovers the prior source byte for byte. Changes remain uncommitted.

Final source SHA-256: `851778e7df6f8ff8ddba0e4c69670d8332933bad4a2d95c3a6ed8f38f21a8056`.
