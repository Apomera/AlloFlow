# CircuitTool onboarding and engagement

The main opportunities were a clearer first action, a way to resume investigations, and feedback that tells learners what to do next. This pass connects the existing tools into a more guided path.

## First circuit

**Quick start & controls** opens on a new, empty Simple bench. It offers **Start with a bulb** and **Build on my own** before explaining the three experiment steps. Existing builds see a collapsed guide, and learners can dismiss or reopen it.

Starting loads the open-switch bulb lesson. Focus moves to its question panel after that explicit action. Undo restores the previous circuit, and notes remain saved. **Resume my experiment** opens the current investigation without replacing the live circuit.

## Guided experiments remember the learner's work

Each experiment keeps its prediction, evidence, and explanation when learners move to another question. A progress indicator counts experiments tested, including predictions that differed from the result. It does not claim mastery or award extra points.

After testing, a **Next** action opens an untried experiment. Returning to saved evidence preserves the live bench and clearly explains when the saved readings differ. **Load this experiment result** is an explicit, undoable action. Retrying explains that it replaces that experiment's previous evidence and explanation.

## Targets explain what to change

A populated bench now exposes **Try a Target** and moves focus to the target choices. Selection and checking are separate. The active target shows:

- The current reading, goal, and accepted range.
- Whether the reading is above, below, or within range.
- A hint based on the circuit, including open paths and low-resistance branches.
- Saved completion independently from the current reading.

Checking uses the latest circuit state and preserves the existing strict less-than-5% tolerance. Repeated checks, duplicate clicks, and reopening saved feedback cannot repeat a completion reward. The 0.1 A label no longer promises an exact match while using a tolerance.

## Choose a workbench by the question

The optional **Which workbench should I use?** guide describes practical uses for Simple, Mixed, Active, and Connected circuits. Opening one preserves the designs and notes in the others. The guide supports keyboard opening, retained focus, a current-workbench indicator, and Escape dismissal.

## Improvements found in browser review

- Component-row controls now wrap at narrow widths. A bulb and switch no longer push the page beyond a 320-pixel viewport.
- The interactive schematic is exposed as a named group so its switch controls remain accessible. Static reference diagrams retain image semantics.
- The start guide puts its primary actions before the step descriptions on small screens.
- Next and Retry move keyboard focus to the experiment question, so removing those buttons does not strand focus on the page.

## Validation

Final test counts and source hashes are recorded in [validation-summary.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-onboarding-2026-09-28/validation-summary.json).

- All 208 affected tests passed across 26 files, using the latest result for each suite. Six initial setup timeouts and ten missing suites were resolved in a successful single-worker rerun. The final focus change passed another 33 tests across the four affected learning/onboarding suites.
- Chromium passed four complete workflows: first use, saved lesson evidence, workspace navigation, and target checking.
- Four inspected states had no axe violations.
- Twelve layout checks at 1280, 390, and 320 pixels had no page-wide overflow.
- Keyboard checks covered guide opening, explicit-action focus, Next-to-question-to-prediction navigation, workspace switching, and Escape. Mounted tests also cover Retry focus.
- Source syntax and patch whitespace checks passed. Source and deployment copies match.

These checks verify behavior and accessibility in the inspected states. Engagement gains still need observation with first-time learners. A useful next step is watching learners start a circuit and resume an experiment without help, then simplifying any labels or steps where they hesitate.

## Evidence and code

- [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-onboarding-2026-09-28/browser-results.json)
- [Combined regression results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-onboarding-2026-09-28/regression-combined.json)
- [Phone start guide](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-onboarding-2026-09-28/first-circuit-320.png)
- [Guided experiment](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-onboarding-2026-09-28/guided-evidence-1280.png)
- [Phone target feedback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-onboarding-2026-09-28/target-feedback-320.png)
- [CircuitTool source](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js)

No commit or deployment was performed.
