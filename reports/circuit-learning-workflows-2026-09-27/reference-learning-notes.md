# Reference learning workflow

## Changes

- Corrected the wiring in all four Predict–Observe–Explain diagrams: one bulb, two series bulbs, two parallel bulbs, and the series bulb/resistor example.
- Each component wire meets a defined symbol terminal. Parallel bulbs each connect across both battery rails. The battery's long positive and short negative plates have a visible gap, with no wire across it.
- Bulbs share the standard crossed-circle symbol; resistors use a rectangle. Visible guidance explains the symbols and separates the diagram's connections from the model's brightness approximation.
- Existing accessible names still describe voltage, resistance, and topology without revealing answers. Each diagram now also describes its closed loop or separate parallel paths.
- After revealing evidence, learners can select **Try this circuit** to open that example in Simple circuits. The action loads the exact lesson voltage, resistance, component types, and topology. It preserves notebook entries, saved investigation notes, and lesson progress. Undo restores the previous bench circuit.
- Each load creates a fresh replacement component list with unique IDs. Repeated trials cannot append duplicate parts.

## Verification

```powershell
node node_modules/vitest/vitest.mjs run tests/circuit_reference_workflows.test.js tests/circuit_learning_regressions.test.js --pool=threads --maxWorkers=2 --testTimeout=30000 --hookTimeout=30000
```

**23 tests passed across two files.**

The new tests reconstruct electrical nets from rendered SVG wire segments, including T junctions. They check that wire-only source terminals remain separate, that component terminals meet their drawn symbols, and that the source-to-return paths match the intended topology. Solver checks validate every lesson's current, voltage, and power against the rendered component values.

Mounted React tests exercise prediction → reveal → try, and populated bench → try twice → Undo twice. They verify preserved notebook entries, baseline settings, authored prediction, and lesson revision/progress.

Browser screenshots and final source-mirror synchronization are handled by the coordinating agent.
