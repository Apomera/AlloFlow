# CircuitTool: lessons, portable designs, and tutor reliability

Implemented in the local CircuitTool source and its desktop deployment copy.

## Lesson diagrams lead into experiments

All four bulb lessons now show complete source-to-return circuits. The battery plates stay separate, both parallel bulbs span the same two rails, and the bulb/resistor symbols meet their wire terminals. Accessible descriptions explain the connections without revealing the numerical answers.

After revealing model evidence, **Try this circuit** opens that lesson's voltage, parts, and topology in Simple circuits. Undo restores the previous build. Notebook entries, investigation notes, and lesson progress remain saved. A browser contrast check also led to a darker inquiry-credit caption.

The new tests reconstruct connectivity from actual SVG wire geometry and check each lesson's voltage, current, and power. Mounted tests cover repeated trials and Undo.

## Connected designs can be saved and reopened

In Connected circuits, expand **Save or open a connected design**. Save downloads a versioned JSON file containing connections, editable component settings, starting states, waveforms, switch events, analysis settings, and probes.

Opening a file shows a preview. **Load design** applies it as one edit; Undo and Redo restore the whole design, including analysis and probe settings. Loading clears the old time cursor and held sample. Notes and other workspaces remain saved.

The parser rejects invalid versions, unknown fields, invalid values, duplicate IDs, missing current-sense references, and files over 64 KiB. It accepts structurally valid circuits whose electrical solution is incomplete or inconsistent so they can still be investigated. Files exclude notebook data, reflections, history, and calculated samples.

See [the format and validation notes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-learning-workflows-2026-09-27/connected-design-files.md), including the documented limitation for manually seeded partial pulse settings.

## Tutor requests stay tied to the current study

The tutor discards replies after a circuit or question changes, or after leaving the workbench. Synchronous errors, rejected requests, empty replies, and invalid response shapes release the busy state so the student can retry. **Stop waiting** releases the interface and ignores the pending reply; it does not cancel a request already sent to the provider.

With the user's explicit approval, Ask now includes the current component settings, calculated readings, and steady-DC model limits through the existing Gemini integration. Unknown readings are represented as `null`. Notebook notes, saved observations, history, and previous tutor replies are excluded.

All validation used mocked AI providers. No real AI requests were made during this work. The approved payload is documented in [the context specification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-learning-workflows-2026-09-27/ai-context-proposal.md).

## Validation

Final counts and source hashes are recorded in [validation-summary.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-learning-workflows-2026-09-27/validation-summary.json).

- Full circuit regression suite: **972 tests passed across 61 files**, with no failures or skipped tests.
- Chromium passed five workflows: lesson reveal/try/Undo; approved tutor context and stale replies; provider failure/retry; Connected download/preview/load/Undo; and invalid-file preservation.
- No axe violations were found in the four inspected states, including the pending tutor and import preview.
- Twelve layout checks at 1280, 390, and 320 pixels showed no page-wide overflow.
- Source syntax and patch whitespace checks passed.
- Source and deployment mirror hashes match.

Evidence: [browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-learning-workflows-2026-09-27/browser-results.json), [full regression results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-learning-workflows-2026-09-27/full-regression.json), [lesson screenshots](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-learning-workflows-2026-09-27/bulb-lessons-1280.png).

## Changed source and regression tests

- [CircuitTool](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js)
- [Desktop deployment copy](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/desktop/web-app/public/stem_lab/stem_tool_circuit.js)
- [Reference lesson tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_reference_workflows.test.js)
- [Connected file tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_network_files.test.js)
- [Tutor tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_ai_tutor.test.js)

No commit or deployment was performed.
