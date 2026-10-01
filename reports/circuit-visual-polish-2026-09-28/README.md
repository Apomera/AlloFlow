# CircuitTool visual polish

The workbench now uses a more consistent dark teal and mint palette, clearer typography, and stronger emphasis on the learner's next action and circuit measurements.

## What changed

- **A clearer opening screen.** A softly lit hero, larger title, and distinct quick-start panel make the first experiment easier to find. Start, Test, and Explain use matching cards.
- **Consistent actions.** Primary actions use a light mint surface; supporting actions use quieter dark surfaces. The checked primary actions have at least 44-pixel touch targets.
- **More readable progress and evidence.** A styled mint progress bar replaces the browser's bright green default. Questions and readings are larger, with tabular numbers and quieter labels. Phone evidence uses two columns for Before/After and a full-width explanation of the change.
- **A tidier parts shelf.** Parts use evenly spaced cards. The power supply has a slim slider track, a distinct thumb, and a prominent voltage reading.
- **Regular target choices.** Targets form an even grid, with saved status on its own line. Current reading and goal appear side by side, followed by feedback and the primary check action.
- **Clearer workbench cards.** The current workbench is marked beside its title. Descriptions and full-width actions align across cards.
- **Phone polish.** Lesson choices are compact, supporting text wraps, and controls retain space for touch and keyboard use.

## Validation

The nine affected behavior and accessibility suites passed **57 tests**. They cover onboarding, saved investigations, target rewards, workbench navigation, localization, diagrams, reduced motion, and component reordering. The last CSS adjustments were checked in the final Chromium visual audit.

Final source hashes and browser counts are recorded in [validation-summary.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/validation-summary.json). Browser checks cover the existing four workflows at desktop and phone widths, with axe, page overflow, primary-action sizing, keyboard focus, and reduced-motion checks.

The final audit passed **15 axe scans, 15 layout checks, and 15 keyboard focus checks** at 1280, 390, and 320 pixels. It saved **21 screenshots** and reported no visual issues, page errors, or axe violations.

The first audit identified cramped phone evidence cards. Those were widened before the final run. Its reduced-motion duration check also treated the shared 0.01 ms reset as visible motion; the check now accepts that effectively instantaneous duration. The first audit remains in `visual-first-pass.json` for traceability.

## Screenshots

### First experiment

![CircuitTool first experiment on desktop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/first-circuit-1280.png)

### Parts and schematic

![CircuitTool parts shelf and schematic](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/seeded-bench-1280.png)

- [Phone opening screen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/first-circuit-320.png)
- [Phone evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/guided-evidence-320.png)
- [Phone targets](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/target-feedback-320.png)
- [Workbench chooser](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/workbench-guide-1280.png)
- [Live measurements](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/live-measurements-1280.png)
- [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/visual-results.json)
- [Test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-visual-polish-2026-09-28/regression.json)

The source and desktop deployment copy are synchronized. No deployment was performed. Visual and accessibility checks cover the inspected Chromium states; engagement outcomes still require learner observation.
