# Workbench orientation

## Implemented

- Added a native, initially collapsed **Which workbench should I use?** disclosure beneath the existing four workspace buttons.
- Four short descriptions connect each workbench to a task: simple bulb/switch circuits, mixed branches and stored energy, transistor/sensor control, and connected node networks.
- Each card opens the matching existing workbench without loading an example. Existing mode buttons retain their labels and behavior. Both paths update the same three navigation flags; saved designs, notebook data, and histories remain in place.
- The current workbench has a visible label and pressed state. Guide navigation announces the selected workbench and retains focus on its button. Escape closes the guide and focuses its native summary.
- New copy uses the current translator. Locale changes retain disclosure state, focus, and circuit state.
- Scoped guide CSS provides 44px controls, wrapping text, two desktop columns, and one mobile column.

## Verification

`npx vitest run tests/circuit_workbench_guide.test.js tests/circuit_localization.test.js --maxWorkers=1 --testTimeout=30000`

Result: **9 tests passed**, 21.87 seconds. Covers the empty initial state, all four saved designs, notebook/history references, existing mode buttons, EN/ES/FR changes, button focus, and Escape dismissal. The first run exposed an invalid notebook fixture, which was corrected; the existing localization test also exceeded its default 5-second timeout under concurrent load, so the successful run used 30 seconds.

The root browser check subsequently verified native keyboard activation, Escape/focus behavior, all four workbenches, and responsive layouts. Four inspected states had no axe violations. The shipped mirror was synchronized; no deployment was performed.

## Populated schematic accessibility follow-up

The root browser audit identified `nested-interactive`: the Simple schematic SVG declared `role="img"` while containing focusable switch/LED controls. A narrow patch changes that interactive SVG to a named group, leaving static reference diagrams as images. The static SVG regression was updated accordingly, and series/parallel mounted switch tests cover mouse, Enter, Space, focus, pressed state, and unchanged component order.

This agent's follow-up command could not start because approval review timed out and the normal sandbox failed during ACL initialization. Root then verified the patch, ran both suites successfully in the single-worker regression rerun, and confirmed the accessibility fix in Chromium. See regression-rerun.json and browser-results.json for the completed checks.

`npx vitest run tests/circuit_reorder_parts.test.js tests/circuit_svg_alternatives_a11y.test.js --maxWorkers=1 --testTimeout=30000 --testNamePattern 'keeps schematic|names each'`
