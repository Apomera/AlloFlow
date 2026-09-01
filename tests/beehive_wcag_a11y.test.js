import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

describe('Beehive WCAG 2.2 accessibility', () => {
  let config;
  let host;
  let root;
  let latest;
  let originalRaf;
  let originalCancelRaf;
  let originalMatchMedia;
  let originalClipboardDescriptor;

  async function mount(state) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: state });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }

  async function mountDroneFlight({ paused = true } = {}) {
    await mount({ viewMode: 'drone', drone: { active: false, difficulty: 'easy' } });
    const launch = host.querySelector('[data-mobile-rail=drone-difficulty] button');
    expect(launch).toBeTruthy();
    await act(async () => { launch.click(); await Promise.resolve(); await Promise.resolve(); });
    if (paused) {
      const pause = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Pause flight'));
      expect(pause).toBeTruthy();
      await act(async () => { pause.click(); await Promise.resolve(); });
    }
  }

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    originalMatchMedia = window.matchMedia;
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    window.matchMedia = vi.fn(() => ({ matches: false, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({
      setTransform: vi.fn(),
      measureText: vi.fn(() => ({ width: 80 })),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        target[prop] = vi.fn();
        return target[prop];
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    document.getElementById('allo-live-beehive')?.replaceChildren();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    window.matchMedia = originalMatchMedia;
    if (originalClipboardDescriptor) Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    else delete navigator.clipboard;
    vi.restoreAllMocks();
  });

  it('ships visible focus, forced-colors, minimum-target, and quiet-status safeguards', () => {
    expect(source).toContain("st.id = 'allo-beehive-wcag-css'");
    expect(source).toContain('outline:3px solid #facc15 !important');
    expect(source).toContain('min-width:24px; min-height:24px');
    expect(source).toContain('font-size:0.75rem !important');
    expect(source).toContain('[role="progressbar"] > * { background:Highlight');
    expect(source).toContain('[data-beehive-root="true"] *, [data-beehive-root="true"] *::before');
    expect(source).not.toContain('reduce) { *, *::before, *::after');
    expect(source).toContain('@media (forced-colors:active)');
    expect(source).toContain('outline:3px solid CanvasText !important');
    expect(source).toContain('function announceBee(message, urgent)');
    expect(source).not.toContain("role: 'status', 'aria-live': 'assertive', className: 'flex items-center justify-between px-4 py-2");
    expect(source).not.toContain("role: 'region', 'aria-live': 'polite', 'aria-label': __alloT('stem.beehive.colony_dashboard");
    expect(source).not.toContain("role: 'dialog'");
    expect(source).toContain('function closeAccessibleBeePanel(panelId)');
  });

  for (const testCase of [
    { name: 'Beekeeper experiment setup', state: { viewMode: 'beekeeper', day: 0, simulationSeed: 1234, motionPaused: true } },
    { name: 'Beekeeper', state: { viewMode: 'beekeeper', day: 8, motionPaused: true, experimentNotebookOpen: true, badges: { first_day: { earned: true, day: 1 } } } },
    { name: 'Beekeeper final choice audit', state: {
      viewMode: 'beekeeper', day: 8, simulationSeed: 2468, randomState: 9753, experimentRunSerial: 2, seededFromDay: 0, motionPaused: true,
      managementTrail: [{ day: 3, label: 'Plant wildflowers', cost: '1 AP' }],
      notebook: { experiment: { plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher' } },
      experimentBaseline: { schemaVersion: 1, modelVersion: 'colony-daily-1.0', simulationSeed: 2468, runSerial: 1, seededFromDay: 0, exactFromStart: true, capturedDay: 8, stockId: 'italian', siteId: 'meadow', colonySurvived: true, metrics: {}, totals: {}, managementTrail: [{ day: 3, label: 'Inspect brood', cost: '1 AP' }] },
    } },
    { name: 'Colony Network', state: { viewMode: 'queen', queen: { active: true, paused: true } } },
    { name: 'Drone Flight', state: { viewMode: 'drone', drone: { active: false, difficulty: 'easy' } }, liveDrone: true },
  ]) {
    it(testCase.name + ' has no serious or critical axe findings', async () => {
      if (testCase.liveDrone) await mountDroneFlight({ paused: true });
      else await mount(testCase.state);
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
          'scrollable-region-focusable': { enabled: false },
        },
      });
      const serious = results.violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => `${violation.id}: ${violation.help} :: ${violation.nodes.map((node) => `${node.target.join(' ')} ${node.failureSummary || node.html}`).join(' | ')}`);
      expect(serious).toEqual([]);
    }, 30000);
  }

  it('makes experiment setup understandable, operable, and screen-reader traceable', async () => {
    await mount({ viewMode: 'beekeeper', day: 0, simulationSeed: 1234, randomState: 1234, seededFromDay: 0, motionPaused: true });
    const fieldset = host.querySelector('[data-beehive-experiment-provenance="true"]');
    const input = host.querySelector('[data-beehive-seed-input="true"]');
    const fresh = host.querySelector('[data-beehive-fresh-seed="true"]');

    expect(fieldset.tagName).toBe('FIELDSET');
    expect(fieldset.querySelector('legend').textContent).toBe('Repeatable experiment setup');
    expect(input.readOnly).toBe(false);
    expect(input.getAttribute('aria-describedby')).toContain('beehive-seed-intro');
    expect(input.className).toContain('min-h-[44px]');
    expect(fresh.className).toContain('min-h-[44px]');
    expect(fresh.getAttribute('aria-label')).toBe('Create a different event recipe seed');

    await act(async () => { fresh.click(); await Promise.resolve(); });
    expect(latest.beehive.simulationSeed).not.toBe(1234);
    expect(latest.beehive.randomState).toBe(latest.beehive.simulationSeed);
    expect(latest.beehive.seededFromDay).toBe(0);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('A new event recipe is ready');

    await mount({ viewMode: 'beekeeper', day: 4, simulationSeed: 1234, randomState: 5678, seededFromDay: 0, motionPaused: true });
    const lockedInput = host.querySelector('[data-beehive-seed-input="true"]');
    expect(lockedInput.readOnly).toBe(true);
    expect(lockedInput.disabled).toBe(false);
    expect(host.querySelector('[data-beehive-fresh-seed="true"]')).toBeNull();
  });

  it('saves, clears, and preserves an accessible comparison checkpoint across restart', async () => {
    await mount({
      viewMode: 'beekeeper',
      day: 8,
      simulationSeed: 2468,
      randomState: 1357,
      seededFromDay: 0,
      workers: 12500,
      honey: 29,
      motionPaused: true,
    });
    let workspace = host.querySelector('[data-beehive-experiment-compare="true"]');
    expect(workspace.tagName).toBe('SECTION');
    expect(workspace.getAttribute('data-experiment-compare-state')).toBe('empty');
    const save = workspace.querySelector('[data-experiment-baseline-save="save"]');
    expect(save.className).toContain('min-h-[44px]');

    await act(async () => { save.click(); await Promise.resolve(); });
    expect(latest.beehive.experimentBaseline).toMatchObject({
      schemaVersion: 1,
      capturedDay: 8,
      simulationSeed: 2468,
      exactFromStart: true,
      runSerial: 1,
    });
    workspace = host.querySelector('[data-beehive-experiment-compare="true"]');
    expect(workspace.getAttribute('aria-labelledby')).toBe('beehive-experiment-compare-title');
    expect(workspace.getAttribute('aria-describedby')).toContain('beehive-experiment-evidence-prompt');
    expect(workspace.querySelector('[data-experiment-compare-table="true"]').tagName).toBe('TABLE');
    expect(workspace.querySelector('caption').textContent).toContain('Run A at Day 8 and Run B at Day 8');
    expect(workspace.querySelector('[data-experiment-compare-status="same-run"]').textContent).toBe('Restart to create Run B');
    expect(workspace.querySelectorAll('[data-experiment-check]')).toHaveLength(7);
    expect(workspace.querySelector('[data-experiment-check="run"]').getAttribute('data-experiment-check-result')).toBe('different');
    expect(workspace.querySelector('[data-experiment-protocol-step="repeat"]').getAttribute('data-protocol-step-state')).toBe('upcoming');
    expect(workspace.querySelector('[data-experiment-management-audit="true"]').getAttribute('data-management-audit-status')).toBe('identical');
    expect(workspace.querySelector('[data-experiment-management-audit="true"]').getAttribute('data-management-audit-final')).toBe('false');
    expect(workspace.querySelector('[data-experiment-management-audit="true"]').textContent).toContain('Available in Run B');
    expect(Array.from(workspace.querySelectorAll('button')).every((button) => button.className.includes('min-h-[44px]'))).toBe(true);

    const startRunB = workspace.querySelector('[data-experiment-start-run-b="true"]');
    expect(startRunB.textContent).toContain('Start separate Run B');
    await act(async () => { startRunB.click(); await Promise.resolve(); });
    expect(latest.beehive.day).toBe(0);
    expect(latest.beehive.experimentRunSerial).toBe(2);
    expect(latest.beehive.experimentBaseline).toMatchObject({ capturedDay: 8, runSerial: 1 });
    expect(latest.beehive.notebook.experiment).toMatchObject({
      schemaVersion: 4,
      registeredPlan: { schemaVersion: 1, runSerial: 2, baselineRunSerial: 1, complete: false },
    });
    workspace = host.querySelector('[data-beehive-experiment-compare="true"]');
    expect(workspace.getAttribute('data-experiment-compare-state')).toBe('checkpoint');
    expect(workspace.querySelector('[data-experiment-protocol-step="repeat"]').getAttribute('data-protocol-step-state')).toBe('complete');
    expect(workspace.querySelector('[data-experiment-protocol-step="registration"]').getAttribute('data-protocol-step-state')).toBe('upcoming');
    expect(workspace.querySelector('[data-experiment-protocol-step="checkpoint"]').getAttribute('data-protocol-step-state')).toBe('upcoming');
    expect(workspace.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('incomplete');
    expect(workspace.querySelector('[data-experiment-plan-registration="true"]').textContent).toContain('Incomplete when Run B began');
    const incompleteSequence = workspace.querySelector('[data-plan-registration-sequence="true"]');
    expect(incompleteSequence.tagName).toBe('OL');
    expect(incompleteSequence.getAttribute('aria-label')).toBe('Plan timing sequence');
    expect(incompleteSequence.querySelectorAll('[data-plan-registration-node]')).toHaveLength(3);
    expect(incompleteSequence.querySelector('[data-plan-registration-node="plan"]').getAttribute('data-sequence-state')).toBe('attention');
    expect(incompleteSequence.querySelector('[data-plan-registration-node="copy"]').getAttribute('aria-label')).toContain('Incomplete copy saved');
    expect(incompleteSequence.querySelector('[data-plan-registration-node="result"]').getAttribute('aria-label')).toContain('Run B began incomplete');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('The plan was incomplete when Run B began');
    expect(workspace.querySelector('[data-experiment-management-audit="true"]').getAttribute('data-management-audit-final')).toBe('false');
    expect(workspace.querySelector('[data-experiment-management-audit="true"]').textContent).toContain('Provisional through Day 0');

    const clear = workspace.querySelector('[data-experiment-baseline-clear="true"]');
    await act(async () => { clear.click(); await Promise.resolve(); });
    expect(latest.beehive.experimentBaseline).toBeNull();
    expect(host.querySelector('[data-experiment-compare-state="empty"]')).toBeTruthy();

    await mount({
      viewMode: 'beekeeper',
      day: 68,
      colonySurvived: false,
      simulationSeed: 2468,
      randomState: 9753,
      seededFromDay: 0,
      workers: 2100,
      honey: 2,
      motionPaused: true,
    });
    const restart = host.querySelector('[data-beehive-restart="same-seed"]');
    await act(async () => { restart.click(); await Promise.resolve(); });
    expect(latest.beehive.day).toBe(0);
    expect(latest.beehive.colonySurvived).toBe(true);
    expect(latest.beehive.experimentRunSerial).toBe(2);
    expect(latest.beehive.experimentBaseline).toMatchObject({ capturedDay: 68, simulationSeed: 2468, runSerial: 1 });
    expect(host.querySelector('[data-experiment-compare-state="checkpoint"]')).toBeTruthy();
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Run A is saved at Day 68');

    const savedRunA = JSON.parse(JSON.stringify(latest.beehive.experimentBaseline));
    await mount({
      viewMode: 'beekeeper',
      day: 75,
      colonySurvived: false,
      simulationSeed: 2468,
      randomState: 8642,
      seededFromDay: 0,
      experimentBaseline: savedRunA,
      motionPaused: true,
    });
    const freshRestart = host.querySelector('[data-beehive-restart="fresh-seed"]');
    await act(async () => { freshRestart.click(); await Promise.resolve(); });
    expect(latest.beehive.simulationSeed).not.toBe(2468);
    expect(latest.beehive.experimentRunSerial).toBe(2);
    expect(latest.beehive.experimentBaseline).toEqual(savedRunA);
    expect(host.querySelector('[data-experiment-compare-state="exploratory"]')).toBeTruthy();
  });

  it('autosaves, reviews, captures, and exports the guided experiment evidence chain', async () => {
    await mount({
      viewMode: 'beekeeper',
      day: 8,
      simulationSeed: 2468,
      randomState: 1357,
      seededFromDay: 0,
      honey: 29,
      managementTrail: [{ day: 3, label: 'Inspect brood', cost: '1 AP' }],
      experimentNotebookOpen: true,
      motionPaused: true,
    });
    await act(async () => { host.querySelector('[data-experiment-baseline-save="save"]').click(); await Promise.resolve(); });
    const guidedRunA = JSON.parse(JSON.stringify(latest.beehive.experimentBaseline));
    await mount({
      viewMode: 'beekeeper',
      day: 8,
      simulationSeed: 2468,
      randomState: 9753,
      experimentRunSerial: 2,
      seededFromDay: 0,
      honey: 34,
      experimentBaseline: guidedRunA,
      managementTrail: [{ day: 3, label: 'Plant wildflowers', cost: '1 AP' }],
      experimentNotebookOpen: true,
      motionPaused: true,
    });

    let notebook = host.querySelector('[data-beehive-experiment-notebook="true"]');
    expect(notebook.tagName).toBe('DETAILS');
    expect(notebook.open).toBe(true);
    expect(notebook.querySelector('[data-experiment-notebook-summary="true"]').className).toContain('min-h-[58px]');
    expect(notebook.querySelectorAll('fieldset[data-experiment-notebook-phase]')).toHaveLength(2);
    const auditDeck = host.querySelector('[data-experiment-audit-deck="true"]');
    expect(auditDeck.tagName).toBe('SECTION');
    expect(document.getElementById(auditDeck.getAttribute('aria-labelledby')).textContent).toBe('Evidence integrity');
    expect(auditDeck.querySelectorAll('[data-experiment-audit-grid="true"] > section')).toHaveLength(3);
    const choiceAudit = host.querySelector('[data-experiment-management-audit="true"]');
    expect(choiceAudit.getAttribute('data-management-audit-status')).toBe('one-change');
    expect(choiceAudit.getAttribute('data-management-audit-final')).toBe('true');
    expect(choiceAudit.querySelector('[data-management-difference="changed"]')).toBeTruthy();
    expect(host.querySelector('[data-experiment-plan-alignment="unplanned"]')).toBeTruthy();
    expect(host.querySelector('[data-experiment-compare-status="matched"]').textContent).toBe('Choose the planned choice');
    const plannedAction = notebook.querySelector('select[data-experiment-planned-action="true"]');
    expect(plannedAction.value).toBe('');
    expect(plannedAction.className).toContain('min-h-[44px]');
    expect(plannedAction.getAttribute('aria-describedby')).toBe('beehive-experiment-planned-action-help');
    expect(plannedAction.closest('label').textContent).toContain('Planned management choice');
    const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    await act(async () => { selectSetter.call(plannedAction, 'plant_wildflowers'); plannedAction.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    notebook = host.querySelector('[data-beehive-experiment-notebook="true"]');
    expect(latest.beehive.notebook.experiment.plannedActionId).toBe('plant_wildflowers');
    expect(host.querySelector('[data-experiment-plan-alignment="matched"]')).toBeTruthy();
    expect(host.querySelector('[data-experiment-compare-status="matched"]').textContent).toBe('Plan timing not recorded');
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('unregistered');
    expect(host.querySelector('[data-experiment-protocol-step="choice"]').getAttribute('data-protocol-step-state')).toBe('complete');

    expect(host.querySelector('[data-experiment-prediction-audit="true"]').getAttribute('data-prediction-audit-status')).toBe('unplanned');
    let predictionMetric = notebook.querySelector('select[data-experiment-prediction-metric="true"]');
    let predictionDirection = notebook.querySelector('select[data-experiment-prediction-direction="true"]');
    expect(predictionMetric.value).toBe('');
    expect(predictionDirection.value).toBe('');
    expect([predictionMetric, predictionDirection].every((control) => control.className.includes('min-h-[44px]'))).toBe(true);
    expect(predictionMetric.getAttribute('aria-describedby')).toBe('beehive-experiment-prediction-metric-help');
    expect(predictionDirection.getAttribute('aria-describedby')).toBe('beehive-experiment-prediction-direction-help');
    expect(predictionMetric.closest('label').textContent).toContain('Prediction metric');
    expect(predictionDirection.closest('label').textContent).toContain('Expected direction');
    await act(async () => { selectSetter.call(predictionMetric, 'honey'); predictionMetric.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    predictionDirection = host.querySelector('select[data-experiment-prediction-direction="true"]');
    await act(async () => { selectSetter.call(predictionDirection, 'higher'); predictionDirection.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    notebook = host.querySelector('[data-beehive-experiment-notebook="true"]');
    expect(latest.beehive.notebook.experiment).toMatchObject({ predictedMetricId: 'honey', predictedDirection: 'higher' });
    expect(host.querySelector('[data-experiment-prediction-audit="true"]').getAttribute('data-prediction-audit-status')).toBe('aligned');
    expect(host.querySelector('[data-experiment-prediction-audit="true"]').textContent).toContain('Numeric direction aligned');
    expect(host.querySelector('[data-experiment-prediction-audit="true"]').textContent).toContain('does not prove causation');
    expect(host.querySelector('[data-experiment-protocol-step="prediction"]').getAttribute('data-protocol-step-state')).toBe('complete');
    expect(notebook.querySelectorAll('textarea[data-experiment-notebook-field]')).toHaveLength(7);
    expect(Array.from(notebook.querySelectorAll('textarea[data-experiment-notebook-field]')).map((area) => area.maxLength))
      .toEqual([300, 600, 300, 600, 1200, 800, 1200]);
    expect(Array.from(notebook.querySelectorAll('textarea[data-experiment-notebook-field]')).every((area) => area.getAttribute('aria-describedby'))).toBe(true);

    const values = {
      question: 'Does planting wildflowers change honey stores?',
      hypothesis: 'If forage increases, honey will rise because more nectar is available.',
      changedVariable: 'Plant wildflowers once',
      prediction: 'At Day 8, Run B honey will exceed Run A honey.',
      observations: 'Run A had 29 lb and Run B had 34 lb after the changed choice.',
      alternativeExplanation: 'A later eligible event or the simplified model could affect stores.',
      conclusion: 'The current checkpoint is a baseline; I need the changed Run B outcome next.',
    };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    for (const [field, value] of Object.entries(values)) {
      const area = host.querySelector('[data-experiment-notebook-field="' + field + '"]');
      await act(async () => { setter.call(area, value); area.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    }
    expect(latest.beehive.notebook.experiment).toMatchObject({
      schemaVersion: 4,
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: values.question,
      changedVariable: values.changedVariable,
      conclusion: values.conclusion,
    });

    const observationGuidance = host.querySelector('[data-experiment-notebook-field="observations"]').closest('label').textContent;
    expect(observationGuidance).toContain('The recorded action matches the current plan');
    expect(observationGuidance).toContain('its timing is not protected');
    expect(observationGuidance).not.toContain('does not match the planned choice');
    expect(host.querySelector('[data-experiment-evidence-prompt="true"]').textContent).toContain('Restart Run B with the complete current plan');
    const readySequence = host.querySelector('[data-plan-registration-sequence="true"]');
    expect(readySequence.querySelector('[data-plan-registration-node="plan"]').getAttribute('data-sequence-state')).toBe('complete');
    expect(readySequence.querySelector('[data-plan-registration-node="copy"]').getAttribute('data-sequence-state')).toBe('attention');
    expect(readySequence.querySelector('[data-plan-registration-node="result"]').getAttribute('data-sequence-state')).toBe('attention');
    expect(readySequence.querySelector('[data-plan-registration-node="copy"]').getAttribute('aria-label')).toContain('No copy tied to these runs');

    const recovery = host.querySelector('[data-experiment-restart-run-b-plan="true"]');
    expect(recovery).toBeTruthy();
    expect(recovery.className).toContain('min-h-[44px]');
    expect(recovery.textContent).toContain('Restart Run B with current plan');
    expect(recovery.getAttribute('aria-label')).toContain('record the complete current plan before the new run begins');
    await act(async () => { recovery.click(); await Promise.resolve(); });
    expect(latest.beehive.day).toBe(0);
    expect(latest.beehive.experimentRunSerial).toBe(3);
    expect(latest.beehive.experimentBaseline).toEqual(guidedRunA);
    expect(latest.beehive.notebook.experiment.registeredPlan).toMatchObject({
      schemaVersion: 1,
      runSerial: 3,
      baselineRunSerial: 1,
      complete: true,
      plannedActionId: 'plant_wildflowers',
      predictedMetricId: 'honey',
      predictedDirection: 'higher',
      question: values.question,
      changedVariable: values.changedVariable,
      prediction: values.prediction,
    });
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('matched');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('The complete plan was recorded before Run B');

    const protectedNotebook = JSON.parse(JSON.stringify(latest.beehive.notebook));
    await mount({
      viewMode: 'beekeeper',
      day: 8,
      simulationSeed: 2468,
      randomState: 9753,
      experimentRunSerial: 3,
      seededFromDay: 0,
      honey: 34,
      experimentBaseline: guidedRunA,
      managementTrail: [{ day: 3, label: 'Plant wildflowers', cost: '1 AP' }],
      notebook: protectedNotebook,
      experimentNotebookOpen: true,
      motionPaused: true,
    });
    notebook = host.querySelector('[data-beehive-experiment-notebook="true"]');
    expect(host.querySelector('[data-experiment-compare-status="matched"]').textContent).toBe('Protected comparison ready');
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('matched');
    expect(host.querySelector('[data-experiment-plan-registration="true"]').textContent).toContain('Recorded before Run B');
    expect(host.querySelector('[data-experiment-protocol-step="registration"]').getAttribute('data-protocol-step-state')).toBe('complete');
    const protectedSequence = host.querySelector('[data-plan-registration-sequence="true"]');
    expect(Array.from(protectedSequence.querySelectorAll('[data-plan-registration-node]')).map((node) => node.getAttribute('data-sequence-state'))).toEqual(['complete', 'complete', 'complete']);
    expect(protectedSequence.querySelector('[data-plan-registration-node="result"]').getAttribute('aria-label')).toContain('Plan and copy match');
    expect(host.querySelector('[data-experiment-restart-run-b-plan="true"]')).toBeNull();

    let reviewChecks = Array.from(host.querySelectorAll('[data-experiment-notebook-review-check]'));
    expect(reviewChecks).toHaveLength(3);
    expect(reviewChecks.every((input) => !input.disabled)).toBe(true);
    expect(reviewChecks.every((input) => input.className.includes('h-5') && input.className.includes('w-5'))).toBe(true);
    expect(reviewChecks.every((input) => input.closest('label').className.includes('min-h-[48px]'))).toBe(true);
    for (const input of reviewChecks) {
      await act(async () => { input.click(); await Promise.resolve(); });
    }
    expect(latest.beehive.notebook.experiment.review).toEqual({ singleVariable: true, numericEvidence: true, uncertainty: true });
    notebook = host.querySelector('[data-beehive-experiment-notebook="true"]');
    expect(notebook.getAttribute('data-experiment-notebook-complete')).toBe('true');
    expect(notebook.querySelector('[role="progressbar"][aria-valuemax="10"]').getAttribute('aria-valuenow')).toBe('10');
    expect(notebook.querySelector('[data-experiment-notebook-review="true"]').getAttribute('data-review-complete')).toBe('true');

    let predictionDirectionControl = host.querySelector('[data-experiment-prediction-direction="true"]');
    await act(async () => { selectSetter.call(predictionDirectionControl, 'lower'); predictionDirectionControl.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.numericEvidence).toBe(false);
    expect(host.querySelector('[data-experiment-prediction-audit="true"]').getAttribute('data-prediction-audit-status')).toBe('not-aligned');
    expect(host.querySelector('[data-experiment-prediction-audit="true"]').textContent).toContain('This is still useful evidence');
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('changed');
    expect(host.querySelector('[data-experiment-compare-status="matched"]').textContent).toBe('Plan changed after Run B started');
    const editedSequence = host.querySelector('[data-plan-registration-sequence="true"]');
    expect(editedSequence.querySelector('[data-plan-registration-node="plan"]').getAttribute('data-sequence-state')).toBe('complete');
    expect(editedSequence.querySelector('[data-plan-registration-node="copy"]').getAttribute('data-sequence-state')).toBe('complete');
    expect(editedSequence.querySelector('[data-plan-registration-node="result"]').getAttribute('data-sequence-state')).toBe('attention');
    expect(editedSequence.querySelector('[data-plan-registration-node="result"]').getAttribute('aria-label')).toContain('Current plan changed');
    expect(host.querySelector('[data-experiment-evidence-prompt="true"]').textContent).toContain('Restart Run B with the complete current plan');
    expect(host.querySelector('[data-experiment-restart-run-b-plan="true"]')).toBeTruthy();
    predictionDirectionControl = host.querySelector('[data-experiment-prediction-direction="true"]');
    await act(async () => { selectSetter.call(predictionDirectionControl, 'higher'); predictionDirectionControl.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.numericEvidence).toBe(false);
    expect(host.querySelector('[data-experiment-prediction-audit="true"]').getAttribute('data-prediction-audit-status')).toBe('aligned');
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('matched');
    expect(host.querySelector('[data-experiment-compare-status="matched"]').textContent).toBe('Protected comparison ready');
    await act(async () => { host.querySelector('[data-experiment-notebook-review-check="numericEvidence"]').click(); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.numericEvidence).toBe(true);

    let plannedActionControl = host.querySelector('[data-experiment-planned-action="true"]');
    await act(async () => { selectSetter.call(plannedActionControl, 'feed_bees'); plannedActionControl.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.singleVariable).toBe(false);
    expect(host.querySelector('[data-experiment-plan-alignment="mismatched"]')).toBeTruthy();
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('changed');
    plannedActionControl = host.querySelector('[data-experiment-planned-action="true"]');
    await act(async () => { selectSetter.call(plannedActionControl, 'plant_wildflowers'); plannedActionControl.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.singleVariable).toBe(false);
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('matched');
    await act(async () => { host.querySelector('[data-experiment-notebook-review-check="singleVariable"]').click(); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.singleVariable).toBe(true);

    const changedVariable = host.querySelector('[data-experiment-notebook-field="changedVariable"]');
    await act(async () => { setter.call(changedVariable, ''); changedVariable.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.review.singleVariable).toBe(false);
    expect(host.querySelector('[data-experiment-notebook-review-check="singleVariable"]').disabled).toBe(true);
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('changed');
    const restoredVariable = host.querySelector('[data-experiment-notebook-field="changedVariable"]');
    await act(async () => { setter.call(restoredVariable, values.changedVariable); restoredVariable.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    expect(host.querySelector('[data-experiment-plan-registration="true"]').getAttribute('data-plan-registration-status')).toBe('matched');

    const capture = host.querySelector('[data-experiment-notebook-capture="true"]');
    expect(capture.className).toContain('min-h-[44px]');
    await act(async () => { capture.click(); await Promise.resolve(); });
    expect(latest.beehive.notebook.experiment.observations).toContain('Run A Day 8 vs Run B Day 8');
    expect(latest.beehive.notebook.experiment.observations).toContain('Management-choice audit: one recorded difference');
    expect(latest.beehive.notebook.experiment.observations).toContain('Planned-choice audit: recorded change matches Plant wildflowers');
    expect(latest.beehive.notebook.experiment.observations).toContain('Plan-timing audit: complete plan recorded before Run B');
    expect(latest.beehive.notebook.experiment.observations).toContain('Prediction audit: Honey: Run B was higher; displayed direction aligned with the prediction');
    expect(latest.beehive.notebook.experiment.observations).toContain('Honey:');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('metrics inserted into experiment observations');

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const copy = host.querySelector('[data-beehive-copy-experiment="true"]');
    expect(copy.className).toContain('min-h-[44px]');
    await act(async () => { copy.click(); await Promise.resolve(); });
    expect(latest.beehive.exportedReportTitle).toBe('Experiment Evidence Record');
    expect(latest.beehive.exportedReport).toContain('## Guided Experiment Notebook');
    expect(latest.beehive.exportedReport).toContain(values.question);
    expect(latest.beehive.exportedReport).toContain('**Comparison status:** Protected comparison ready');
    expect(latest.beehive.exportedReport).toContain('**Plan registration:** Recorded before Colony Run 3 against Run A Colony Run 1 (complete)');
    expect(latest.beehive.exportedReport).toContain('### Plan-timing audit');
    expect(latest.beehive.exportedReport).toContain('**Result:** Complete plan matches the copy recorded before Run B');
    expect(latest.beehive.exportedReport).toContain('**Recovery:** No timing repair needed.');
    expect(latest.beehive.exportedReport).toContain('### Management-choice audit');
    expect(latest.beehive.exportedReport).toContain('**Recorded-choice result:** One difference');
    expect(latest.beehive.exportedReport).toContain('**Plan alignment:** Recorded change matches the plan');
    expect(latest.beehive.exportedReport).toContain('### Prediction audit');
    expect(latest.beehive.exportedReport).toContain('**Structured prediction:** Honey - Run B will be higher');
    expect(latest.beehive.exportedReport).toContain('**Result:** Displayed numeric pattern aligns with the prediction');
    expect(host.querySelector('[data-beehive-focus-panel="report"]').getAttribute('aria-label')).toBe('Experiment Evidence Record export');
  });

  it('keeps the introductory tutorial scoped, labeled, and comfortably operable', async () => {
    await mount({ viewMode: 'beekeeper', day: 0, tutorialStep: 0, motionPaused: true });
    let tutorial = host.querySelector('[data-beehive-tutorial="true"]');
    expect(tutorial.tagName).toBe('SECTION');
    expect(tutorial.getAttribute('aria-labelledby')).toBe('beehive-tutorial-title');
    expect(tutorial.getAttribute('aria-describedby')).toBe('beehive-tutorial-description');
    expect(document.getElementById('beehive-tutorial-title').textContent).toBe('Welcome, Beekeeper!');
    expect(Array.from(tutorial.querySelectorAll('button')).every((button) => button.className.includes('min-h-[44px]'))).toBe(true);

    let modeTabs = Array.from(host.querySelectorAll('[data-beehive-mode-tab]'));
    await act(async () => { modeTabs[1].click(); await Promise.resolve(); });
    expect(latest.beehive.viewMode).toBe('queen');
    expect(latest.beehive.tutorialStep).toBe(0);
    expect(host.querySelector('[data-beehive-tutorial="true"]')).toBeNull();

    modeTabs = Array.from(host.querySelectorAll('[data-beehive-mode-tab]'));
    await act(async () => { modeTabs[0].click(); await Promise.resolve(); });
    tutorial = host.querySelector('[data-beehive-tutorial="true"]');
    expect(tutorial).toBeTruthy();
    expect(document.getElementById('beehive-tutorial-title').textContent).toBe('Welcome, Beekeeper!');
  });

  it('moves tutorial focus through changed steps and into Next Day on exit', async () => {
    await mount({ viewMode: 'beekeeper', day: 0, tutorialStep: 0, motionPaused: true });
    let tutorial = host.querySelector('[data-beehive-tutorial="true"]');
    let title = document.getElementById('beehive-tutorial-title');
    expect(title.tagName).toBe('H2');
    expect(title.tabIndex).toBe(-1);

    const next = Array.from(tutorial.querySelectorAll('button')).find((button) => button.textContent.includes('Next'));
    next.focus();
    await act(async () => { next.click(); await Promise.resolve(); });
    title = document.getElementById('beehive-tutorial-title');
    expect(title.textContent).toBe('Advance Days');
    expect(document.activeElement).toBe(title);

    const back = Array.from(host.querySelectorAll('[data-beehive-tutorial="true"] button')).find((button) => button.textContent.includes('Back'));
    await act(async () => { back.click(); await Promise.resolve(); });
    title = document.getElementById('beehive-tutorial-title');
    expect(title.textContent).toBe('Welcome, Beekeeper!');
    expect(document.activeElement).toBe(title);

    tutorial = host.querySelector('[data-beehive-tutorial="true"]');
    const skip = tutorial.querySelector('button[aria-label="Skip tutorial"]');
    skip.focus();
    await act(async () => { skip.click(); await Promise.resolve(); });
    expect(latest.beehive.tutorialDone).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('beehive-next-day'));
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Tutorial skipped');

    await mount({ viewMode: 'beekeeper', day: 0, tutorialStep: 4, motionPaused: true });
    const finish = Array.from(host.querySelectorAll('[data-beehive-tutorial="true"] button')).find((button) => button.textContent.includes('Start Beekeeping'));
    finish.focus();
    await act(async () => { finish.click(); await Promise.resolve(); });
    expect(latest.beehive.tutorialDone).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('beehive-next-day'));
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Tutorial complete');
  });

  it('responds immediately to live reduced-motion changes and cleans up the modern listener', async () => {
    let matches = false;
    const listeners = new Set();
    const motionQuery = {
      media: '(prefers-reduced-motion: reduce)',
      get matches() { return matches; },
      addEventListener: vi.fn((type, listener) => { if (type === 'change') listeners.add(listener); }),
      removeEventListener: vi.fn((type, listener) => { if (type === 'change') listeners.delete(listener); }),
    };
    window.matchMedia.mockReturnValue(motionQuery);
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5 });

    expect(listeners.size).toBe(1);
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-reduced-motion')).toBe('false');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-motion-state')).toBe('ambient');
    const listener = Array.from(listeners)[0];

    matches = true;
    await act(async () => { listener({ matches: true }); await Promise.resolve(); });
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-reduced-motion')).toBe('true');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-motion-state')).toBe('paused');
    expect(host.querySelector('[data-beehive-motion-notice="true"]')).toBeTruthy();
    expect(latest.beehive.motionPaused).toBeUndefined();

    matches = false;
    await act(async () => { listener({ matches: false }); await Promise.resolve(); });
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-reduced-motion')).toBe('false');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-motion-state')).toBe('ambient');
    expect(host.querySelector('[data-beehive-motion-notice="true"]')).toBeNull();

    await act(async () => { root.unmount(); await Promise.resolve(); });
    root = null;
    expect(motionQuery.removeEventListener).toHaveBeenCalledWith('change', listener);
    expect(listeners.size).toBe(0);
  });

  it('supports legacy reduced-motion listeners whose callback omits the event', async () => {
    let legacyListener = null;
    const motionQuery = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addListener: vi.fn((listener) => { legacyListener = listener; }),
      removeListener: vi.fn((listener) => { if (legacyListener === listener) legacyListener = null; }),
    };
    window.matchMedia.mockReturnValue(motionQuery);
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5 });
    expect(legacyListener).toBeTypeOf('function');

    motionQuery.matches = true;
    await act(async () => { legacyListener(); await Promise.resolve(); });
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-reduced-motion')).toBe('true');

    const subscribedListener = legacyListener;
    await act(async () => { root.unmount(); await Promise.resolve(); });
    root = null;
    expect(motionQuery.removeListener).toHaveBeenCalledWith(subscribedListener);
    expect(legacyListener).toBeNull();
  });

  it('uses stable names for persistent Drone toggles and action names for pause controls', async () => {
    await mountDroneFlight({ paused: false });
    const pauseButtons = Array.from(host.querySelectorAll('button[aria-keyshortcuts="P"]'));
    expect(pauseButtons.length).toBeGreaterThan(0);
    expect(pauseButtons.every((button) => !button.hasAttribute('aria-pressed'))).toBe(true);

    let camera = host.querySelector('[data-flight-camera-toggle="true"]');
    expect(camera.getAttribute('aria-label')).toBe('Chase camera');
    expect(camera.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { camera.click(); await Promise.resolve(); });
    camera = host.querySelector('[data-flight-camera-toggle="true"]');
    expect(camera.getAttribute('aria-label')).toBe('Chase camera');
    expect(camera.getAttribute('aria-pressed')).toBe('true');

    let stabilization = host.querySelector('[data-flight-camera-stabilized="true"]');
    expect(stabilization.getAttribute('aria-label')).toBe('Camera stabilization');
    expect(stabilization.getAttribute('aria-pressed')).toBe('true');
    await act(async () => { stabilization.click(); await Promise.resolve(); });
    stabilization = host.querySelector('[data-flight-camera-stabilized="true"]');
    expect(stabilization.getAttribute('aria-label')).toBe('Camera stabilization');
    expect(stabilization.getAttribute('aria-pressed')).toBe('false');

    await mount({ viewMode: 'queen', queen: { active: true, paused: false } });
    let queenPauseButtons = Array.from(host.querySelectorAll('button[aria-keyshortcuts="P"]'));
    expect(queenPauseButtons.length).toBeGreaterThan(0);
    expect(queenPauseButtons.every((button) => button.getAttribute('aria-label') === 'Pause Colony Network simulation' && !button.hasAttribute('aria-pressed'))).toBe(true);
    await act(async () => { queenPauseButtons[0].click(); await Promise.resolve(); });
    queenPauseButtons = Array.from(host.querySelectorAll('button[aria-keyshortcuts="P"]'));
    expect(queenPauseButtons.every((button) => !button.hasAttribute('aria-pressed'))).toBe(true);
    const namedQueenPauseButtons = queenPauseButtons.filter((button) => button.hasAttribute('aria-label'));
    expect(namedQueenPauseButtons.length).toBe(2);
    expect(namedQueenPauseButtons.every((button) => button.getAttribute('aria-label') === 'Resume Colony Network simulation')).toBe(true);

  });

  it('links 3D disclosures and keeps 3D selection names stable', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 45, motionPaused: true });
    let bay = host.querySelector('[data-beehive-3d-bay="hive"]');
    const disclosure = bay.querySelector('button[aria-expanded][aria-controls]');
    expect(disclosure.getAttribute('aria-controls')).toBe('beehive-3d-hive-content');
    expect(document.getElementById(disclosure.getAttribute('aria-controls'))).toBeTruthy();

    const openHive = Array.from(bay.querySelectorAll('button')).find((button) => (button.getAttribute('aria-label') || '').startsWith('Open hive'));
    expect(openHive.hasAttribute('aria-pressed')).toBe(false);
    const partButtons = Array.from(bay.querySelectorAll('button[aria-pressed]')).filter((button) => (button.getAttribute('aria-label') || '').endsWith(' details'));
    expect(partButtons.length).toBeGreaterThan(2);
    expect(partButtons.every((button) => !/^(Show|Hide) details/.test(button.getAttribute('aria-label')))).toBe(true);
    expect(bay.querySelector('button[aria-label="Find the queen"]').getAttribute('aria-pressed')).toBe('false');

    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 45, motionPaused: true, hive3dPart: 'queen' });
    bay = host.querySelector('[data-beehive-3d-bay="hive"]');
    const selectedQueen = bay.querySelector('button[aria-label="Find the queen"]');
    expect(selectedQueen.getAttribute('aria-pressed')).toBe('true');
  });
  it('implements roving Arrow, Home, and End navigation for both tablists', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    let modeTabs = Array.from(host.querySelectorAll('[data-beehive-mode-tab]'));
    expect(modeTabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(modeTabs[0].getAttribute('aria-label')).toContain('Manage daily colony health and resources');
    expect(modeTabs[0].getAttribute('aria-label')).toContain('Current perspective');
    expect(modeTabs[1].getAttribute('aria-label')).toContain('Explore decentralized signals and trade-offs');
    expect(modeTabs[1].getAttribute('aria-label')).toContain('Select this perspective');
    expect(modeTabs[2].getAttribute('aria-label')).toContain('Practice energy-aware nuptial flight in 3D');
    modeTabs[0].focus();
    await act(async () => {
      modeTabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.viewMode).toBe('queen');
    modeTabs = Array.from(host.querySelectorAll('[data-beehive-mode-tab]'));
    expect(modeTabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(modeTabs[1]);

    await act(async () => {
      modeTabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.viewMode).toBe('beekeeper');

    let viewTabs = Array.from(host.querySelectorAll('[data-beehive-view-tab]'));
    expect(viewTabs[0].tabIndex).toBe(0);
    expect(viewTabs.slice(1).every((tab) => tab.tabIndex === -1)).toBe(true);
    viewTabs[0].focus();
    await act(async () => {
      viewTabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.beeView).toBe('castes');
    viewTabs = Array.from(host.querySelectorAll('[data-beehive-view-tab]'));
    expect(document.activeElement).toBe(viewTabs.at(-1));
    expect(viewTabs.at(-1).tabIndex).toBe(0);

    const ecologyPath = host.querySelector('[data-topic-pathway="ecology"]');
    await act(async () => { ecologyPath.click(); await Promise.resolve(); });
    expect(latest.beehive.beeView).toBe('pollination');
    viewTabs = Array.from(host.querySelectorAll('[data-beehive-view-tab]'));
    expect(viewTabs).toHaveLength(5);
    expect(viewTabs[0].getAttribute('data-beehive-view-tab')).toBe('pollination');
    viewTabs[0].focus();
    await act(async () => {
      viewTabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.beeView).toBe('equipment');
    expect(latest.beehive.visitedBeeViews).toEqual(expect.arrayContaining(['scene', 'castes', 'pollination', 'equipment']));
    expect(new Set(latest.beehive.visitedBeeViews).size).toBe(4);
    expect(host.querySelector('[data-topic-progress="true"]').getAttribute('aria-valuenow')).toBe('4');
    expect(host.querySelector('[data-topic-pathway="ecology"]').getAttribute('aria-label')).toContain('2 of 5 topics explored');
  });

  it('persists science exploration and provides a clear, accessible next topic', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    const progress = host.querySelector('[data-topic-progress="true"]');
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuemin')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('18');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');

    const continueButton = host.querySelector('[data-topic-continue="lifecycle"]');
    expect(continueButton.getAttribute('aria-label')).toBe('Continue exploring with Lifecycle');
    await act(async () => { continueButton.click(); await Promise.resolve(); });

    expect(latest.beehive.beeView).toBe('lifecycle');
    expect(latest.beehive.visitedBeeViews).toEqual(['scene', 'lifecycle']);
    expect(host.querySelector('[data-topic-progress="true"]').getAttribute('aria-valuenow')).toBe('2');
    expect(host.querySelector('[data-topic-pathway="colony"]').getAttribute('aria-label')).toContain('2 of 5 topics explored');
    expect(host.querySelector('[data-beehive-view-tab="lifecycle"]').getAttribute('data-topic-explored')).toBe('true');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Exploration progress updated');
  });

  it('lets learners switch between overview-first and stage-first layouts without losing content', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    let layoutButton = host.querySelector('[data-beehive-focus-layout="true"]');
    let pulse = host.querySelector('[data-beehive-pulse="true"]');
    let stage = document.getElementById('beehive-canvas-wrap');
    expect(layoutButton.className).toContain('min-h-[44px]');
    expect(layoutButton.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-layout')).toBe('overview-first');
    expect(Boolean(pulse.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    await act(async () => { layoutButton.click(); await Promise.resolve(); });
    expect(latest.beehive.focusLayout).toBe(true);
    layoutButton = host.querySelector('[data-beehive-focus-layout="true"]');
    pulse = host.querySelector('[data-beehive-pulse="true"]');
    stage = document.getElementById('beehive-canvas-wrap');
    expect(layoutButton.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-layout')).toBe('stage-first');
    expect(Boolean(stage.compareDocumentPosition(pulse) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(host.querySelector('[data-beehive-learning-brief="true"]')).toBeTruthy();
    expect(host.querySelector('[data-beehive-journey-disclosure="true"]')).toBeTruthy();
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Stage-first layout enabled');

    await act(async () => { layoutButton.click(); await Promise.resolve(); });
    expect(latest.beehive.focusLayout).toBe(false);
    expect(host.querySelector('[data-beehive-root="true"]').getAttribute('data-beehive-layout')).toBe('overview-first');
  });

  it('provides a keyboard-accessible learning-flow navigator with valid targets in every mode', async () => {
    const cases = [
      [{ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true }, 'beehive-canvas-wrap'],
      [{ viewMode: 'queen', queen: { active: true, paused: true } }, 'beehive-queen-playfield'],
      [{ viewMode: 'drone', drone: { active: false, difficulty: 'easy' } }, 'beehive-drone-playfield'],
    ];
    for (const [state, playTarget] of cases) {
      await mount(state);
      const nav = host.querySelector('[data-beehive-flow-nav="true"]');
      expect(nav.tagName).toBe('NAV');
      expect(nav.getAttribute('aria-label')).toBe('Bee simulation learning flow');
      const links = Array.from(nav.querySelectorAll('a[data-beehive-flow-step]'));
      expect(links).toHaveLength(5);
      expect(links.every((link) => link.className.includes('min-h-[48px]'))).toBe(true);
      for (const link of links) {
        const target = document.getElementById(link.getAttribute('href').slice(1));
        expect(target).toBeTruthy();
      }
      expect(nav.querySelector('[data-beehive-flow-step="play"]').getAttribute('href')).toBe('#' + playTarget);
      expect(nav.querySelector('[data-beehive-flow-step="learn"]').getAttribute('href')).toBe('#beehive-learning-brief-summary');
      expect(nav.querySelector('[data-beehive-flow-step="explain"]').getAttribute('href')).toBe('#beehive-notebook-summary');
      expect(document.getElementById(playTarget).tabIndex).toBe(-1);
      expect(document.getElementById('beehive-play-focus').tabIndex).toBe(-1);
    }
  });

  it('captures live evidence and persists a complete notebook separately for each role', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true, notebookOpen: true });
    const capture = host.querySelector('[data-beehive-capture-evidence="beekeeper"]');
    expect(capture.className).toContain('min-h-[44px]');
    await act(async () => { capture.click(); await Promise.resolve(); });
    expect(latest.beehive.notebook.beekeeper.evidence).toContain('Day 5');
    expect(latest.beehive.notebook.beekeeper.evidence).toContain('Varroa 5%');
    expect(document.getElementById('allo-live-beehive').textContent).toContain('evidence captured in the Science Notebook');

    let reviewInputs = Array.from(host.querySelectorAll('input[data-notebook-review]'));
    expect(reviewInputs).toHaveLength(3);
    expect(reviewInputs.find((input) => input.dataset.notebookReview === 'prediction').disabled).toBe(true);
    expect(reviewInputs.find((input) => input.dataset.notebookReview === 'evidence').disabled).toBe(false);
    expect(reviewInputs.find((input) => input.dataset.notebookReview === 'explanation').disabled).toBe(true);
    const firstCoachAction = host.querySelector('[data-beehive-review-next="prediction"]');
    const predictionArea = host.querySelector('[data-notebook-field="prediction"]');
    predictionArea.scrollIntoView = vi.fn();
    expect(firstCoachAction.className).toContain('min-h-[44px]');
    await act(async () => { firstCoachAction.click(); await Promise.resolve(); });
    expect(document.activeElement).toBe(predictionArea);
    expect(predictionArea.scrollIntoView).toHaveBeenCalled();
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Prediction writing area focused');

    const setTextarea = async (field, value) => {
      const textarea = host.querySelector('[data-notebook-field="' + field + '"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      await act(async () => { setter.call(textarea, value); textarea.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    };
    await setTextarea('prediction', 'Honey stores will change after one day.');
    await setTextarea('explanation', 'Foraging income and colony consumption changed the balance.');

    expect(latest.beehive.notebook.beekeeper.prediction).toContain('Honey stores');
    expect(latest.beehive.notebook.beekeeper.explanation).toContain('Foraging income');
    reviewInputs = Array.from(host.querySelectorAll('input[data-notebook-review]'));
    expect(reviewInputs.every((input) => !input.disabled)).toBe(true);
    expect(reviewInputs.every((input) => input.className.includes('h-5') && input.className.includes('w-5'))).toBe(true);
    for (const input of reviewInputs) {
      await act(async () => { input.click(); await Promise.resolve(); });
    }
    expect(latest.beehive.notebook.beekeeper.review).toEqual({ prediction: true, evidence: true, explanation: true });
    let cerReview = host.querySelector('[data-beehive-cer-review="beekeeper"]');
    expect(cerReview.getAttribute('data-review-complete')).toBe('true');
    expect(cerReview.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
    expect(cerReview.querySelector('[data-beehive-review-next="synthesis"]')).toBeTruthy();

    await setTextarea('explanation', '');
    expect(latest.beehive.notebook.beekeeper.review.explanation).toBe(false);
    expect(host.querySelector('[data-notebook-review="explanation"]').disabled).toBe(true);
    await setTextarea('explanation', 'Foraging income and colony consumption changed the balance.');
    await act(async () => { host.querySelector('[data-notebook-review="explanation"]').click(); await Promise.resolve(); });
    cerReview = host.querySelector('[data-beehive-cer-review="beekeeper"]');
    expect(cerReview.getAttribute('data-review-complete')).toBe('true');
    const notebook = host.querySelector('[data-beehive-notebook="beekeeper"]');
    expect(notebook.getAttribute('data-notebook-complete')).toBe('true');
    expect(notebook.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
    const portfolio = host.querySelector('[data-beehive-notebook-portfolio="true"]');
    const portfolioProgress = portfolio.querySelector('[role="progressbar"]');
    expect(portfolioProgress.getAttribute('aria-valuemin')).toBe('0');
    expect(portfolioProgress.getAttribute('aria-valuemax')).toBe('10');
    expect(portfolioProgress.getAttribute('aria-valuenow')).toBe('3');
    expect(portfolio.querySelectorAll('button[data-notebook-role]')).toHaveLength(3);
    expect(Array.from(portfolio.querySelectorAll('button[data-notebook-role]')).every((button) => button.className.includes('min-h-[48px]'))).toBe(true);
    expect(host.querySelectorAll('textarea[data-notebook-field]')).toHaveLength(3);
    expect(Array.from(host.querySelectorAll('textarea[data-notebook-field]')).every((area) => area.maxLength === 1200)).toBe(true);

    const queenPortfolioButton = host.querySelector('[data-notebook-role="queen"]');
    expect(queenPortfolioButton.getAttribute('aria-label')).toContain('0 of 3 sections written, self-review 0 of 3 ready');
    await act(async () => { queenPortfolioButton.click(); await Promise.resolve(); });
    expect(latest.beehive.viewMode).toBe('queen');
    expect(latest.beehive.notebook.beekeeper.evidence).toContain('Day 5');
    expect(host.querySelector('[data-beehive-notebook="queen"] [role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
    expect(host.querySelector('[data-notebook-role="queen"]').getAttribute('aria-current')).toBe('true');

    const synthesis = host.querySelector('[data-notebook-synthesis="true"]');
    const synthesisSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => {
      synthesisSetter.call(synthesis, 'Bee decisions scale from individual movement to colony strategy and pollination outcomes.');
      synthesis.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.notebook.synthesis).toContain('colony strategy');
    expect(host.querySelector('[data-beehive-notebook-portfolio="true"] [role="progressbar"]').getAttribute('aria-valuenow')).toBe('4');

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const copyPortfolio = host.querySelector('[data-beehive-copy-notebook="true"]');
    expect(copyPortfolio.className).toContain('min-h-[44px]');
    await act(async () => { copyPortfolio.click(); await Promise.resolve(); });
    expect(latest.beehive.exportedReportTitle).toBe('Science Notebook Portfolio');
    expect(latest.beehive.exportedReport).toContain('# Bee Science Notebook Portfolio');
    expect(latest.beehive.exportedReport).toContain('## Beekeeper');
    expect(latest.beehive.exportedReport).toContain('## Colony Network');
    expect(latest.beehive.exportedReport).toContain('## Drone Flight');
    expect(latest.beehive.exportedReport).toContain('**CER self-review:** 3/3 checks ready.');
    const exportPanel = host.querySelector('[data-beehive-focus-panel="report"]');
    expect(exportPanel.getAttribute('aria-label')).toBe('Science Notebook Portfolio export');
    expect(exportPanel.textContent).toContain('Science Notebook Portfolio');
  });

  it('provides keyboard-sized contextual actions and direct event navigation', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true, activeEvent: { emoji: '⚠', label: 'Sudden storm', desc: 'Foragers return early.', lesson: 'Weather changes colony energy flow.', effect: { morale: -4 } } });
    const eventAction = host.querySelector('[data-beehive-coach-action="review-event"] button');
    const eventPanel = document.getElementById('beehive-active-event');
    eventPanel.scrollIntoView = vi.fn();
    expect(eventAction.className).toContain('min-h-[44px]');
    await act(async () => { eventAction.click(); await Promise.resolve(); });
    expect(eventPanel.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(eventPanel);

    await mountDroneFlight({ paused: true });
    const resume = host.querySelector('[data-beehive-coach-action="resume-flight"] button');
    expect(resume.className).toContain('min-h-[44px]');
    expect(resume.getAttribute('aria-keyshortcuts')).toBe('P');
    const watchCue = host.querySelector('[data-beehive-coach-action="resume-flight"] [data-beehive-coach-watch="true"]');
    expect(watchCue.getAttribute('role')).toBe('note');
    expect(watchCue.getAttribute('aria-label')).toBe('What to watch after Resume flight');
    expect(watchCue.textContent).toContain('energy, altitude, distance, and time resume');
    await act(async () => { resume.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(false);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Drone flight resumed');
  });

  it('keeps event-paused time controls discoverable and returns focus after acknowledgement', async () => {
    const event = { emoji: '⚠', label: 'Sudden storm', desc: 'Foragers return early.', lesson: 'Weather changes colony energy flow.', effect: { morale: -4 } };
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true, tutorialDone: true, activeEvent: event, eventsHandled: 0 });

    let timeControls = Array.from(host.querySelectorAll('[data-beehive-time-control]'));
    expect(timeControls).toHaveLength(3);
    expect(timeControls.every((button) => button.disabled === false)).toBe(true);
    expect(timeControls.every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(timeControls.every((button) => button.getAttribute('data-unavailable-reason').includes('Sudden storm'))).toBe(true);

    const nextDay = host.querySelector('#beehive-next-day');
    nextDay.focus();
    await act(async () => { nextDay.click(); await Promise.resolve(); });
    expect(latest.beehive.day).toBe(5);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Time is paused');

    const acknowledge = host.querySelector('#beehive-active-event button');
    expect(acknowledge.className).toContain('min-h-[44px]');
    expect(acknowledge.getAttribute('aria-label')).toContain('return to time controls');
    acknowledge.focus();
    await act(async () => { acknowledge.click(); await Promise.resolve(); await Promise.resolve(); });

    expect(latest.beehive.activeEvent).toBeNull();
    expect(latest.beehive.eventsHandled).toBe(1);
    timeControls = Array.from(host.querySelectorAll('[data-beehive-time-control]'));
    expect(timeControls.every((button) => button.hasAttribute('aria-disabled') === false)).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('#beehive-next-day'));
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Sudden storm acknowledged');
  });

  it('makes unavailable management and treatment choices focusable and explanatory', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 8, motionPaused: true, tutorialDone: true, actionPoints: 0, diseaseRisk: 20, varroaLevel: 24, honey: 40, workers: 20_000 });

    const hygiene = host.querySelector('[data-management-action="Hygiene"]');
    const inspect = host.querySelector('[data-management-action="Inspect"]');
    expect(hygiene.disabled).toBe(false);
    expect(hygiene.tabIndex).toBe(0);
    expect(hygiene.getAttribute('aria-disabled')).toBe('true');
    expect(hygiene.getAttribute('data-unavailable-reason')).toBe('Need 1 AP');
    expect(hygiene.getAttribute('aria-label')).toContain('Need 1 AP');
    expect(inspect.hasAttribute('aria-disabled')).toBe(false);

    hygiene.focus();
    await act(async () => { hygiene.click(); await Promise.resolve(); });
    expect(latest.beehive.diseaseRisk).toBe(20);
    expect(latest.beehive.actionPoints).toBe(0);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Hygiene is unavailable. Need 1 AP');

    const treat = host.querySelector('[data-management-action="Treat"]');
    await act(async () => { treat.click(); await Promise.resolve(); });
    const treatment = host.querySelector('[data-treatment-ready="false"]');
    expect(treatment).toBeTruthy();
    expect(treatment.disabled).toBe(false);
    expect(treatment.getAttribute('aria-disabled')).toBe('true');
    expect(treatment.textContent).toMatch(/Need \d AP · have 0/);
    expect(treatment.getAttribute('aria-label')).toMatch(/^Apply .+ treatment$/);
    const treatmentDescription = document.getElementById(treatment.getAttribute('aria-describedby'))?.textContent || '';
    expect(treatmentDescription).toMatch(/Forecast for current colony: Varroa \d+ to \d+ percent/);
    expect(treatmentDescription).toMatch(/Modeled treatment strength: \d+ percentage points before the zero floor/);
    expect(treatmentDescription).toMatch(/Modeled colony stress|No modeled morale cost/);
    expect(treatmentDescription).toMatch(/Modeled queen health cost|No modeled queen health cost/);
    expect(treatmentDescription).toContain('Cost:');
    expect(treatmentDescription).toContain('Unavailable:');
    expect(treatmentDescription).toContain('Safety and timing note:');
    await act(async () => { treatment.click(); await Promise.resolve(); });
    expect(latest.beehive.actionPoints).toBe(0);
    expect(latest.beehive.treatmentsUsed || {}).toEqual({});
    expect(document.getElementById('allo-live-beehive').textContent).toContain('is unavailable. Need');

    const conservation = host.querySelector('[data-conservation-ready="false"]');
    expect(conservation.disabled).toBe(false);
    expect(conservation.getAttribute('aria-disabled')).toBe('true');
    await act(async () => { conservation.click(); await Promise.resolve(); });
    expect(latest.beehive.conservationsDone || 0).toBe(0);
  });

  it('keeps the contextual treatment forecast aligned with the committed, floor-limited outcome', async () => {
    await mount({
      viewMode: 'beekeeper', tutorialDone: true, motionPaused: true,
      showTreatModal: true, season: 3, brood: 3000,
      varroaLevel: 8, actionPoints: 2, morale: 80, queenHealth: 100,
    });

    const panel = host.querySelector('[data-beehive-focus-panel="treatment"]');
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe('beehive-treatment-title');
    expect(panel.getAttribute('aria-describedby')).toBe('beehive-treatment-intro');
    expect(document.getElementById('beehive-treatment-title').textContent).toMatch(/Integrated Pest Management/);
    expect(document.getElementById('beehive-treatment-intro').textContent).toMatch(/current brood and season/i);

    const oxalic = host.querySelector('[data-treatment-id="oxalic"]');
    expect(oxalic.getAttribute('data-treatment-forecast')).toBe('8-to-0');
    expect(oxalic.textContent).toMatch(/8% to 0% Varroa/);
    expect(oxalic.textContent).toMatch(/Strength -12 points/);
    expect(oxalic.textContent).toMatch(/Reduced fit: mites are protected in sealed brood/);
    const description = document.getElementById(oxalic.getAttribute('aria-describedby')).textContent;
    expect(description).toContain('Forecast for current colony: Varroa 8 to 0 percent');
    expect(description).toContain('Modeled treatment strength: 12 percentage points before the zero floor');

    await act(async () => { oxalic.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(latest.beehive.varroaLevel).toBe(0);
    expect(latest.beehive.morale).toBe(77);
    expect(latest.beehive.queenHealth).toBe(100);
    expect(latest.beehive.actionPoints).toBe(1);
    expect(latest.beehive.showTreatModal).toBe(false);
    expect(latest.beehive.lastManagement.outcome).toMatchObject({
      varroaBefore: 8, varroaAfter: 0, reduction: 8, treatmentStrength: 12,
    });
    expect(latest.beehive.lastManagement.summary).toContain('Varroa 8% to 0%');
  });
  it('keeps locked Colony Network decisions keyboard-discoverable without applying them', async () => {
    await mount({
      viewMode: 'queen',
      queen: {
        active: true,
        paused: true,
        resources: { nectar: 0, pollen: 0, wax: 0, royalJelly: 0 },
        population: { nurses: 200, builders: 100, guards: 50, foragers: 300, scouts: 30, drones: 40 },
        rival: { name: 'Test colony', health: 100, pressure: 0, intel: 0 },
      },
    });

    const scout = host.querySelector('[data-quick-command="scout_rival"]');
    expect(scout.disabled).toBe(false);
    expect(scout.tabIndex).toBe(0);
    expect(scout.getAttribute('aria-disabled')).toBe('true');
    expect(scout.getAttribute('data-unavailable-reason')).toMatch(/Nectar short/i);
    scout.focus();
    await act(async () => { scout.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.resources.nectar).toBe(0);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Scout Rival is unavailable');

    const commandCard = host.querySelector('[data-mobile-rail="pheromone-commands"] [data-command-ready="false"]');
    const structureCard = host.querySelector('[data-mobile-rail="comb-structures"] [data-structure-ready="false"]');
    expect(commandCard.disabled).toBe(false);
    expect(commandCard.getAttribute('aria-disabled')).toBe('true');
    expect(structureCard.disabled).toBe(false);
    expect(structureCard.getAttribute('aria-disabled')).toBe('true');
  });

  it('pauses and resumes the Beekeeper animation with a 44px named control and announcement', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: false });
    const pause = host.querySelector('button[aria-label="Pause Beekeeper canvas animation"]');
    expect(pause).toBeTruthy();
    expect(pause.className).toContain('min-h-[44px]');
    expect(pause.className).toContain('min-w-[44px]');
    const scheduledBeforePause = window.requestAnimationFrame.mock.calls.length;

    await act(async () => { pause.click(); await Promise.resolve(); });
    expect(latest.beehive.motionPaused).toBe(true);
    const resume = host.querySelector('button[aria-label="Resume Beekeeper canvas animation"]');
    expect(resume.hasAttribute('aria-pressed')).toBe(false);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('animation paused');
    expect(window.requestAnimationFrame.mock.calls.length).toBe(scheduledBeforePause);

    await act(async () => { resume.click(); await Promise.resolve(); });
    expect(latest.beehive.motionPaused).toBe(false);
    expect(window.requestAnimationFrame.mock.calls.length).toBeGreaterThan(scheduledBeforePause);
  });

  // WCAG 2.5.3 Label in Name. A speech-input user says the words they can SEE,
  // so a button whose visible text is not inside its accessible name is simply
  // unreachable by voice. Both 3D-bay buttons change their visible text with
  // state (Open/Close hive, Find the queen / Queen in cluster), and the winter
  // case shipped announcing "Find the queen" over a button reading "Queen in
  // cluster" until an end-to-end test tried to click it by its visible name.
  it('keeps every 3D hive control reachable by the words on it', async () => {
    const states = [
      { label: 'summer', state: { viewMode: 'beekeeper', beeView: 'scene', day: 45, motionPaused: true } },
      { label: 'winter', state: { viewMode: 'beekeeper', beeView: 'scene', day: 105, motionPaused: true } },
      { label: 'opened', state: { viewMode: 'beekeeper', beeView: 'scene', day: 45, motionPaused: true, hive3dExploded: true } },
      { label: 'queen selected', state: { viewMode: 'beekeeper', beeView: 'scene', day: 45, motionPaused: true, hive3dPart: 'queen' } }
    ];
    for (const { label, state } of states) {
      await mount(state);
      const bay = host.querySelector('[data-beehive-3d-bay="hive"]');
      expect(bay, `no 3D hive bay in the ${label} state`).toBeTruthy();
      const buttons = Array.from(bay.querySelectorAll('button'));
      expect(buttons.length).toBeGreaterThan(0);
      // Both sides go through the SAME normaliser. Stripping punctuation from
      // the visible text alone made "Entrance & landing board" fail against an
      // accessible name that did contain it.
      const normalise = (text) => (text || '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')       // drop glyphs, emoji and punctuation
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      for (const button of buttons) {
        const visible = normalise(button.textContent);
        if (!visible) continue;                   // icon-only controls carry the name themselves
        const accessible = normalise(button.getAttribute('aria-label') || button.textContent);
        expect(
          accessible.includes(visible),
          `${label}: button reads "${visible}" but announces "${accessible}"`
        ).toBe(true);
      }
    }
  });

  it('gives every canvas a meaningful text alternative and equivalent controls', async () => {
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5, motionPaused: true });
    const keeperCanvas = host.querySelector('[data-beehive-canvas="true"]');
    expect(keeperCanvas.hasAttribute('tabindex')).toBe(false);
    expect(keeperCanvas.getAttribute('data-a11y-static')).toBe('true');
    expect(document.getElementById(keeperCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    expect(document.getElementById('beehive-canvas-wrap').getAttribute('role')).toBe('tabpanel');
    expect(host.querySelectorAll('[data-beehive-scene-actions="true"] button')).toHaveLength(3);
    const budget = host.querySelector('[data-action-budget="true"]');
    expect(budget).toBeTruthy();
    expect(budget.getAttribute('role')).toBe('status');
    expect(budget.getAttribute('aria-label')).toContain('3 of 3 action points available');
    expect(host.querySelectorAll('[data-action-point-state="available"]')).toHaveLength(3);
    const feed = host.querySelector('[data-management-action="Feed"]');
    expect(feed.getAttribute('data-management-cost')).toBe('1 AP');
    expect(feed.getAttribute('aria-label')).toContain('Cost: 1 AP.');
    expect(host.querySelector('[data-management-cost-badge="Feed"]').textContent).toBe('1 AP');
    const conservation = host.querySelector('[data-conservation-impact="plant_wildflowers"]');
    expect(conservation).toBeTruthy();
    expect(conservation.getAttribute('aria-label')).toContain('Effect: Habitat +10 | Foraging +5.');
    expect(conservation.getAttribute('data-conservation-ready')).toBe('true');
    expect(host.querySelector('[data-conservation-preview="plant_wildflowers"]').textContent).toContain('Habitat +10');

    await mount({ viewMode: 'queen', queen: { active: true, paused: true, buildMode: 'guard' } });
    const queenCanvas = host.querySelector('[data-beehive-queen-canvas="true"]');
    expect(queenCanvas.hasAttribute('tabindex')).toBe(false);
    expect(queenCanvas.getAttribute('data-a11y-static')).toBe('true');
    expect(document.getElementById(queenCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    expect(host.textContent).toContain('Place without the canvas');

    await mountDroneFlight({ paused: true });
    const droneCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    expect(droneCanvas.tabIndex).toBe(0);
    expect(document.getElementById(droneCanvas.getAttribute('aria-describedby'))).toBeTruthy();
    const flightControls = host.querySelectorAll('[data-flight-control]');
    expect(flightControls).toHaveLength(6);
    flightControls.forEach((control) => {
      expect(control.getAttribute('data-control-active')).toBe('false');
      expect(control.className).toContain('min-h-[58px]');
    });
    const route = host.querySelector('[data-beehive-flight-route="true"]');
    expect(route.tagName).toBe('SECTION');
    expect(document.getElementById(route.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(route.querySelector('ol').getAttribute('aria-label')).toBe('Drone Flight route progress');
    expect(route.querySelectorAll('li[data-flight-checkpoint]')).toHaveLength(3);
    expect(route.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(route.querySelector('[data-flight-checkpoint="boosts"]').getAttribute('aria-current')).toBe('step');
    const envelope = host.querySelector('[data-beehive-flight-envelope="true"]');
    expect(envelope.tagName).toBe('SECTION');
    expect(document.getElementById(envelope.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(document.getElementById(envelope.getAttribute('aria-describedby'))).toBeTruthy();
    expect(envelope.hasAttribute('aria-live')).toBe(false);
    expect(envelope.querySelector('ul').getAttribute('aria-label')).toBe('Flight envelope conditions');
    const envelopeItems = envelope.querySelectorAll('li[data-flight-envelope-item]');
    expect(envelopeItems).toHaveLength(5);
    expect(Array.from(envelopeItems).every((item) => item.getAttribute('data-envelope-state') === 'paused')).toBe(true);
    expect(Array.from(envelopeItems).every((item) => (item.getAttribute('aria-label') || '').split('.').length >= 3)).toBe(true);
    expect(envelope.querySelector('[data-flight-envelope-overall]').textContent).toBe('Planning');
    const maneuver = host.querySelector('[data-beehive-maneuver-impact="true"]');
    expect(maneuver.getAttribute('role')).toBe('note');
    expect(maneuver.getAttribute('aria-label')).toBe('Current maneuver impact and coaching');
  });

  it('announces meaningful Queen commands without making the cycle banner assertive', async () => {
    await mount({ viewMode: 'queen', queen: { active: true, paused: true } });
    const phase = host.querySelector('[aria-label="Colony Network phase and cycle status"]');
    expect(phase.getAttribute('role')).toBe('group');
    expect(phase.hasAttribute('aria-live')).toBe(false);
    const quickCommands = host.querySelectorAll('[data-beehive-battlefield-dock="true"] [data-quick-command]');
    expect(quickCommands).toHaveLength(3);
    expect(Array.from(quickCommands).every((button) => (button.getAttribute('aria-label') || '').includes('Effect:'))).toBe(true);
    expect(host.querySelector('[data-command-preview="scout_rival"]').textContent).toContain('Reveal rival power');
    const structureCards = host.querySelectorAll('[data-mobile-rail="comb-structures"] [data-structure-ready]');
    expect(structureCards.length).toBeGreaterThan(0);
    expect(Array.from(structureCards).every((button) => (button.getAttribute('aria-label') || '').includes('Effect:'))).toBe(true);
    expect(host.querySelector('[data-structure-preview="guard"]').textContent).toContain('adds guards');
    const scout = host.querySelector('[data-beehive-battlefield-dock="true"] [data-quick-command="scout_rival"]');
    await act(async () => { scout.click(); await Promise.resolve(); });
    const live = document.getElementById('allo-live-beehive');
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.textContent).toContain('Scouts report rival power');
    const timeline = host.querySelector('[data-beehive-rts-timeline="true"]');
    expect(timeline.tagName).toBe('SECTION');
    expect(document.getElementById(timeline.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(timeline.querySelector('ol[aria-label="Upcoming Colony Network events"]')).toBeTruthy();
    expect(timeline.querySelectorAll('li[data-rts-forecast]')).toHaveLength(3);
    const impactList = timeline.querySelector('[role="list"][aria-label="Last impact metric changes"]');
    expect(impactList).toBeTruthy();
    expect(Array.from(impactList.querySelectorAll('[role="listitem"]')).every((item) => (item.getAttribute('aria-label') || '').includes('changed from'))).toBe(true);
  });

  it('honors reduced-motion preferences across Beekeeper, Drone, and Queen visuals', async () => {
    window.matchMedia.mockReturnValue({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    await mount({ viewMode: 'beekeeper', beeView: 'scene', day: 5 });
    const simulationRoot = host.querySelector('[data-beehive-root="true"]');
    expect(simulationRoot.getAttribute('data-reduced-motion')).toBe('true');
    const motionNotice = host.querySelector('[data-beehive-motion-notice="true"]');
    expect(motionNotice.textContent).toContain('Interface animations and moving highlights are removed');
    const reducedMotionCss = document.getElementById('allo-beehive-motion-reduce-css').textContent;
    expect(reducedMotionCss).toContain('animation: none !important');
    expect(reducedMotionCss).toContain('transition: none !important');
    const beehiveCss = document.getElementById('allo-beehive-visual-css').textContent;
    expect(beehiveCss).toContain('[data-experiment-audit-deck="true"]');
    expect(beehiveCss).toContain('repeat(auto-fit,minmax(min(100%,16rem),1fr))');
    expect(beehiveCss).toContain('[data-plan-registration-sequence="true"]');
    expect(beehiveCss).toContain('[data-plan-registration-node][data-sequence-state="complete"]');
    expect(beehiveCss).toContain('[data-plan-registration-node]:not(:last-child)::after');
    for (const selector of ['[data-beehive-build-zone]', '[data-beehive-focus-panel]', '[data-flight-control]', '[data-placement-zone]', '[data-beehive-start-strategy="true"]', '#beehive-next-day:hover', '[data-management-action]:hover']) {
      expect(beehiveCss).toContain(selector);
    }
    expect(beehiveCss).toContain('transform:none !important');
    const resumeKeeper = host.querySelector('button[aria-label="Resume Beekeeper canvas animation"]');
    expect(resumeKeeper.hasAttribute('aria-pressed')).toBe(false);
    expect(resumeKeeper.getAttribute('aria-keyshortcuts')).toBe('P');

    await mount({ viewMode: 'drone', drone: { active: false } });
    const easyFlight = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    await act(async () => { easyFlight.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(true);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('reduced-motion preference');

    expect(source).toContain('if (!prefersReducedMotion) _queenAnimId.current = requestAnimationFrame(queenFrame)');
    expect(source).toContain('prefersReducedMotion ? queenData : null');
  });

  it('exposes P pause shortcuts with clear Queen feedback and quiet summary regions', async () => {
    await mount({ viewMode: 'queen', queen: { active: true, paused: false, events: [{ type: 'phase', text: 'Build phase' }] } });
    const queenPause = host.querySelector('button[aria-keyshortcuts="P"]');
    expect(queenPause.hasAttribute('aria-pressed')).toBe(false);
    const outside = document.createElement('div');
    outside.tabIndex = 0;
    document.body.appendChild(outside);
    outside.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.queen.paused).toBe(false);

    host.querySelector('#beehive-queen-playfield').focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.queen.paused).toBe(true);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Queen real-time simulation paused');
    expect(host.querySelector('[role="log"]').getAttribute('aria-live')).toBe('off');
    outside.remove();

    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true });
    const colonyStatus = Array.from(host.querySelectorAll('[role="group"]')).find((node) => (node.getAttribute('aria-label') || '').startsWith('Colony status:'));
    expect(colonyStatus).toBeTruthy();
    expect(colonyStatus.hasAttribute('aria-live')).toBe(false);
  });

  it('scopes flight keys to the canvas, gives panels priority, and makes Escape pause-only', async () => {
    await mountDroneFlight({ paused: false });
    let canvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    expect(document.activeElement).toBe(canvas);

    const outside = document.createElement('div');
    outside.tabIndex = 0;
    document.body.appendChild(outside);
    outside.focus();
    const pageArrow = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    await act(async () => { document.dispatchEvent(pageArrow); await Promise.resolve(); });
    expect(pageArrow.defaultPrevented).toBe(false);
    const cameraBefore = latest.beehive.drone.cameraMode;
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true, cancelable: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.drone.cameraMode).toBe(cameraBefore);
    expect(latest.beehive.drone.paused).toBe(false);

    canvas.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.drone.paused).toBe(true);
    canvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    canvas.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.drone.paused).toBe(true);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('remains paused');

    canvas.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.drone.paused).toBe(false);
    canvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    canvas.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.beehive.drone.paused).toBe(true);

    const shortcutsTrigger = host.querySelector('button[aria-label="Keyboard shortcuts"]');
    shortcutsTrigger.focus();
    await act(async () => { shortcutsTrigger.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(document.activeElement).toBe(host.querySelector('[data-beehive-focus-panel="shortcuts"]'));
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.showKeys).toBe(false);
    expect(latest.beehive.drone.paused).toBe(true);
    outside.remove();
  });

  it('closes a Colony Network panel before acting on placement Escape', async () => {
    await mount({ viewMode: 'queen', showKeys: false, queen: { active: true, paused: true, buildMode: 'guard', resources: { nectar: 30, pollen: 20, wax: 20, royalJelly: 5 } } });
    const trigger = host.querySelector('button[aria-label="Keyboard shortcuts"]');
    trigger.focus();
    await act(async () => { trigger.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(document.activeElement).toBe(host.querySelector('[data-beehive-focus-panel="shortcuts"]'));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.showKeys).toBe(false);
    expect(latest.beehive.queen.buildMode).toBe('guard');
    expect(document.activeElement).toBe(trigger);
  });

  it('moves focus into explicit panels, closes with Escape, and restores the trigger', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true });
    const trigger = host.querySelector('button[aria-label="Keyboard shortcuts"]');
    trigger.focus();
    await act(async () => { trigger.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    const panel = host.querySelector('[data-beehive-focus-panel="shortcuts"]');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(panel);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.showKeys).toBe(false);
    expect(host.querySelector('[data-beehive-focus-panel="shortcuts"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Closed shortcuts panel');
  });

  it('makes the Hive Inspector a focused, escapable region with complete roving tabs', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true });
    const trigger = host.querySelector('[data-management-action="Inspect"]');
    trigger.focus();
    await act(async () => { trigger.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });

    const inspector = host.querySelector('[data-beehive-focus-panel="inspection"]');
    expect(inspector.tagName).toBe('SECTION');
    expect(inspector.getAttribute('role')).toBe('region');
    expect(inspector.getAttribute('aria-labelledby')).toBe('beehive-inspector-title');
    expect(document.activeElement).toBe(inspector);
    expect(inspector.querySelector('button[aria-label*="close Hive Inspector"]').className).toContain('min-h-[44px]');

    let tabs = Array.from(inspector.querySelectorAll('[data-inspection-tab]'));
    expect(tabs).toHaveLength(9);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    for (const tab of tabs) {
      const controlled = document.getElementById(tab.getAttribute('aria-controls'));
      expect(controlled).toBeTruthy();
      expect(controlled.getAttribute('role')).toBe('tabpanel');
      expect(controlled.getAttribute('aria-labelledby')).toBe(tab.id);
    }

    tabs[0].focus();
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    tabs = Array.from(inspector.querySelectorAll('[data-inspection-tab]'));
    expect(latest.beehive.inspectLayer).toBe('honey_chem');
    expect(document.activeElement).toBe(tabs[1]);
    expect(document.getElementById(tabs[1].getAttribute('aria-controls')).hidden).toBe(false);

    await act(async () => {
      tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    tabs = Array.from(inspector.querySelectorAll('[data-inspection-tab]'));
    expect(latest.beehive.inspectLayer).toBe('lifecycle');
    expect(document.activeElement).toBe(tabs[2]);

    await act(async () => {
      tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    tabs = Array.from(inspector.querySelectorAll('[data-inspection-tab]'));
    expect(latest.beehive.inspectLayer).toBe('roles');
    expect(document.activeElement).toBe(tabs[0]);

    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    tabs = Array.from(inspector.querySelectorAll('[data-inspection-tab]'));
    expect(latest.beehive.inspectLayer).toBe('bloom');
    expect(document.activeElement).toBe(tabs.at(-1));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.showInspect).toBe(false);
    expect(host.querySelector('[data-beehive-focus-panel="inspection"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Closed inspection panel');
  });

  it('implements a complete roving Field Guide tab and tabpanel pattern', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, showGuide: true });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    let tabs = Array.from(host.querySelectorAll('[data-beehive-guide-tab]'));
    expect(tabs.length).toBeGreaterThan(3);
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs.slice(1).every((tab) => tab.tabIndex === -1)).toBe(true);
    tabs[0].focus();
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    tabs = Array.from(host.querySelectorAll('[data-beehive-guide-tab]'));
    const last = tabs.at(-1);
    expect(latest.beehive.guideSection).toBe(last.getAttribute('data-beehive-guide-tab'));
    expect(document.activeElement).toBe(last);
    const panel = host.querySelector('#beehive-guide-panel[role="tabpanel"]');
    expect(panel.getAttribute('aria-labelledby')).toBe(last.id);
    expect(last.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('models bee stock and apiary site choices as described, roving radio groups', async () => {
    await mount({ viewMode: 'beekeeper', day: 0, motionPaused: true, tutorialDone: true });

    let stockGroup = host.querySelector('[role="radiogroup"][aria-labelledby="beehive-stock-heading"]');
    let stockOptions = Array.from(stockGroup.querySelectorAll('[data-beehive-stock-option]'));
    expect(stockOptions.length).toBeGreaterThan(2);
    expect(stockOptions.filter((option) => option.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(stockOptions.filter((option) => option.tabIndex === 0)).toHaveLength(1);
    const firstStockDescription = stockOptions[0].getAttribute('aria-describedby').split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || '').join(' ');
    expect(stockOptions[0].getAttribute('aria-label')).toMatch(/bee stock from/i);
    expect(firstStockDescription).toMatch(/Honey|Spring|Winter|Varroa/);

    stockOptions[0].focus();
    await act(async () => {
      stockOptions[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    stockGroup = host.querySelector('[role="radiogroup"][aria-labelledby="beehive-stock-heading"]');
    stockOptions = Array.from(stockGroup.querySelectorAll('[data-beehive-stock-option]'));
    expect(latest.beehive.subspecies).toBe(stockOptions[1].getAttribute('data-beehive-stock-option'));
    expect(stockOptions[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(stockOptions[1]);
    expect(host.querySelector('#beehive-stock-picker')).toBeTruthy();

    let siteGroup = host.querySelector('[role="radiogroup"][aria-labelledby="beehive-site-heading"]');
    let siteOptions = Array.from(siteGroup.querySelectorAll('[data-beehive-site-option]'));
    expect(siteOptions.filter((option) => option.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    const firstSiteDescription = siteOptions[0].getAttribute('aria-describedby').split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || '').join(' ');
    expect(firstSiteDescription).toMatch(/Forage/);
    expect(firstSiteDescription).toMatch(/Disease/);

    siteOptions[0].focus();
    await act(async () => {
      siteOptions[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    siteGroup = host.querySelector('[role="radiogroup"][aria-labelledby="beehive-site-heading"]');
    siteOptions = Array.from(siteGroup.querySelectorAll('[data-beehive-site-option]'));
    expect(latest.beehive.apiarySite).toBe(siteOptions.at(-1).getAttribute('data-beehive-site-option'));
    expect(siteOptions.at(-1).getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(siteOptions.at(-1));
  });

  it('models every Drone and Colony Network briefing choice as a roving radio group', async () => {
    async function advanceChoice(groupLabel, dataAttribute, readState) {
      let group = host.querySelector(`[role="radiogroup"][aria-label="${groupLabel}"]`);
      expect(group, groupLabel).toBeTruthy();
      let options = Array.from(group.querySelectorAll(`[${dataAttribute}]`));
      expect(options.length, groupLabel).toBeGreaterThan(2);
      expect(options.filter((option) => option.getAttribute('aria-checked') === 'true')).toHaveLength(1);
      expect(options.filter((option) => option.tabIndex === 0)).toHaveLength(1);
      expect(options.every((option) => !option.hasAttribute('aria-pressed'))).toBe(true);

      const currentIndex = options.findIndex((option) => option.getAttribute('aria-checked') === 'true');
      const expectedIndex = (currentIndex + 1) % options.length;
      options[currentIndex].focus();
      await act(async () => {
        options[currentIndex].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      group = host.querySelector(`[role="radiogroup"][aria-label="${groupLabel}"]`);
      options = Array.from(group.querySelectorAll(`[${dataAttribute}]`));
      const expected = options[expectedIndex];
      expect(expected.getAttribute('aria-checked')).toBe('true');
      expect(expected.tabIndex).toBe(0);
      expect(readState()).toBe(expected.getAttribute(dataAttribute));
      expect(document.activeElement).toBe(expected);
    }

    await mount({ viewMode: 'drone', drone: { active: false, difficulty: 'easy', routePlan: 'balanced', scenario: 'clear' } });
    await advanceChoice('Preflight route priority', 'data-drone-route-plan', () => latest.beehive.drone.routePlan);
    await advanceChoice('Drone mission scenario', 'data-drone-scenario', () => latest.beehive.drone.scenario);

    await mount({ viewMode: 'queen', queen: { active: false, scenario: 'field_report', difficulty: 'standard', opening: 'balanced' } });
    await advanceChoice('Colony Network mission scenario', 'data-queen-scenario', () => latest.beehive.queen.scenario);
    await advanceChoice('Colony Network rival pressure', 'data-queen-difficulty', () => latest.beehive.queen.difficulty);
    await advanceChoice('Colony Network opening doctrine', 'data-queen-opening', () => latest.beehive.queen.opening);
  });

  it('keeps small instructional and decision text readable in the light theme', async () => {
    function leafContaining(text) {
      return Array.from(host.querySelectorAll('p, span, div'))
        .find((node) => node.children.length === 0 && node.textContent.includes(text));
    }

    await mount({ viewMode: 'drone', drone: { active: false, difficulty: 'easy' } });
    expect(leafContaining('Arrow keys / WASD').className).toContain('text-slate-700');

    await mountDroneFlight({ paused: true });
    expect(leafContaining('Keep flying to discover facts').className).toContain('text-slate-600');

    await mount({ viewMode: 'queen', queen: { active: false } });
    expect(leafContaining('Signal queen presence').className).toContain('text-slate-600');
    expect(leafContaining('Cycles 1-9').className).toContain('text-slate-600');
    expect(leafContaining('Establish your colony').className).toContain('text-slate-600');

    await mount({ viewMode: 'beekeeper', day: 8, tutorialDone: true, motionPaused: true, actionPoints: 0, varroaLevel: 24,
      journal: [{ day: 8, season: 1, text: 'Inspection logged.' }] });
    expect(host.querySelector('[data-management-cost-badge="Hygiene"]').className).toContain('text-slate-600');
    expect(leafContaining('Click \u201CExplain\u201D').className).toContain('text-slate-600');
    expect(leafContaining('Real beekeepers keep hive journals').className).toContain('text-slate-700');
  });
  it('connects header disclosures to comfortably sized, labelled panels', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true });
    const rootRegion = host.querySelector('[data-beehive-root="true"]');
    const sound = rootRegion.querySelector('button[aria-label="Sound effects"]');
    expect(sound.getAttribute('aria-pressed')).toBe('true');

    for (const controlledId of ['beehive-quiz-panel', 'beehive-badges-panel', 'beehive-shortcuts-panel', 'beehive-field-guide']) {
      const trigger = rootRegion.querySelector(`button[aria-controls="${controlledId}"]`);
      expect(trigger).toBeTruthy();
      expect(trigger.className).toContain('min-h-[44px]');
      expect(trigger.className).toContain('min-w-[44px]');
      if (trigger.hasAttribute('aria-expanded')) expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-pressed')).toBe(false);
    }

    let guideTrigger = rootRegion.querySelector('button[aria-controls="beehive-field-guide"]');
    guideTrigger.focus();
    await act(async () => { guideTrigger.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    guideTrigger = host.querySelector('button[aria-controls="beehive-field-guide"]');
    expect(guideTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('beehive-field-guide')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(host.querySelector('button[aria-controls="beehive-field-guide"]').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(guideTrigger);
  });

  it('makes the Field Guide directly navigable, semantically structured, and scroll-focusable', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, showGuide: true });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    const guide = host.querySelector('#beehive-field-guide');
    expect(guide.tagName).toBe('SECTION');
    expect(guide.getAttribute('aria-labelledby')).toBe('beehive-guide-title');
    expect(guide.querySelector('#beehive-guide-title').tagName).toBe('H2');

    const select = guide.querySelector('#beehive-guide-topic-select');
    expect(select.labels[0].textContent).toBe('Jump to a topic');
    expect(Array.from(select.querySelectorAll('optgroup')).map((group) => group.label)).toEqual(['Learning topics', 'Teacher resources']);
    expect(Array.from(select.options).some((option) => /teacher resource/i.test(option.textContent))).toBe(true);

    let entries = guide.querySelector('[data-beehive-guide-entries]');
    expect(entries.getAttribute('role')).toBe('region');
    expect(entries.tabIndex).toBe(0);
    expect(entries.getAttribute('aria-labelledby')).toBe('beehive-guide-section-title');
    expect(entries.querySelector('article h4')).toBeTruthy();
    expect(entries.querySelector('dl dt')).toBeTruthy();
    expect(entries.querySelector('dl dd')).toBeTruthy();

    entries.scrollTop = 120;
    await act(async () => {
      select.value = 'math';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    entries = host.querySelector('[data-beehive-guide-entries="math"]');
    expect(latest.beehive.guideSection).toBe('math');
    expect(entries.scrollTop).toBe(0);
    expect(document.getElementById('allo-live-beehive').textContent).toMatch(/Opened Math Problems, \d+ entries/);
  });

  it('renders, announces, preserves, and contrast-checks thermoregulation trials', async () => {
    const contrastRatio = (foreground, background) => {
      const channels = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (value) => {
        const rgb = channels(value).map((channel) => channel / 255)
          .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      };
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };

    for (const sample of [
      { outsideC: 34, state: 'optimal' },
      { outsideC: 36, state: 'optimal' },
      { outsideC: 40, state: 'overheating' },
      { outsideC: 33, state: 'compensating' },
      { outsideC: 20, state: 'chilled' },
    ]) {
      await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true,
        thermHunt: { outsideC: sample.outsideC, beesFanning: 0, broodCount: 0, hypothesis: '', explanation: '', log: [] } });
      const output = host.querySelector('#beehive-thermo-output');
      expect(output.getAttribute('data-thermo-state')).toBe(sample.state);
      const outputStyle = getComputedStyle(output);
      const labelStyle = getComputedStyle(output.firstElementChild);
      expect(contrastRatio(labelStyle.color, outputStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    }

    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true,
      thermHunt: { outsideC: 35, beesFanning: 0, broodCount: 0, hypothesis: 'Keep this hypothesis', understood: true, explanation: 'Keep this explanation', log: [] } });
    const outside = host.querySelector('#th-outsideC');
    expect(outside.getAttribute('aria-valuetext')).toBe('35 degrees Celsius');
    expect(host.querySelector('#th-broodCount').getAttribute('aria-valuetext')).toBe('0 brood');

    const logButton = Array.from(host.querySelectorAll('[data-beehive-thermoregulation] button'))
      .find((button) => button.textContent === 'Log current trial');
    await act(async () => { logButton.click(); await Promise.resolve(); });
    expect(latest.beehive.thermHunt.log).toHaveLength(1);
    expect(host.querySelector('[aria-label="Logged thermoregulation trials"]').textContent).toMatch(/35 °C outside.*estimated 35.0 °C.*Typical brood range/);
    expect(document.getElementById('allo-live-beehive').textContent).toContain('Trial logged: outside 35 degrees Celsius');

    const reset = Array.from(host.querySelectorAll('[data-beehive-thermoregulation] button'))
      .find((button) => button.textContent === 'Reset conditions');
    await act(async () => { reset.click(); await Promise.resolve(); });
    expect(latest.beehive.thermHunt.outsideC).toBe(20);
    expect(latest.beehive.thermHunt.beesFanning).toBe(30);
    expect(latest.beehive.thermHunt.broodCount).toBe(5000);
    expect(latest.beehive.thermHunt.log).toHaveLength(1);
    expect(latest.beehive.thermHunt.hypothesis).toBe('Keep this hypothesis');
    expect(latest.beehive.thermHunt.explanation).toBe('Keep this explanation');
    expect(host.querySelector('[data-beehive-thermoregulation] [role="note"]').textContent).toContain('Your log and writing were kept');
  });

  it('keeps quiz focus coherent, blocks rapid scoring, and presents visible results', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Quiz opener';
    document.body.insertBefore(opener, host);
    opener.focus();
    const questions = [
      { q: 'First question?', opts: ['Correct one', 'Wrong one'], ans: 0, explain: 'First explanation.' },
      { q: 'Second question?', opts: ['Wrong two', 'Correct two'], ans: 1, explain: 'Second explanation.' },
    ];
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true,
      quizOpen: true, quizComplete: false, quizIdx: 0, quizScore: 0, quizAnswered: 0, quizQuestions: questions });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });

    let answer = host.querySelector('[aria-label="Answer: Correct one"]');
    answer.focus();
    await act(async () => { answer.click(); answer.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.quizAnswered).toBe(1);
    expect(latest.beehive.quizScore).toBe(1);
    let next = host.querySelector('[data-beehive-quiz-next]');
    expect(document.activeElement).toBe(next);
    expect(next.closest('[role="status"]')).toBeNull();
    expect(next.className).toContain('min-h-[44px]');

    await act(async () => { next.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    let question = host.querySelector('#beehive-quiz-question');
    expect(latest.beehive.quizIdx).toBe(1);
    expect(question.textContent).toBe('Second question?');
    expect(document.activeElement).toBe(question);

    answer = host.querySelector('[aria-label="Answer: Correct two"]');
    await act(async () => { answer.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    next = host.querySelector('[data-beehive-quiz-next]');
    await act(async () => { next.click(); next.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.quizComplete).toBe(true);
    expect(latest.beehive.quizScore).toBe(2);
    expect(latest.beehive.bestQuizScore).toBe(2);
    const resultHeading = host.querySelector('#beehive-quiz-results-title');
    expect(document.activeElement).toBe(resultHeading);
    expect(host.querySelector('[data-beehive-quiz-score]').textContent).toBe('2 of 2');

    const closeResults = Array.from(host.querySelectorAll('#beehive-quiz-panel button'))
      .find((button) => button.textContent === 'Close results');
    await act(async () => { closeResults.click(); await Promise.resolve(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(latest.beehive.quizOpen).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('provides persistent labels, semantic progress, reflow, and announced quiz feedback', async () => {
    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, exportedReport: 'Colony report text', exportedReportTitle: 'Colony Report', thermHunt: { outsideC: 20, beesFanning: 30, broodCount: 5000, hypothesis: '', understood: true, explanation: '', log: [] } });
    const report = host.querySelector('#beehive-export-report');
    expect(host.querySelector('label[for="beehive-export-report"]').control).toBe(report);
    const hypothesis = host.querySelector('#beehive-thermo-hypothesis');
    const explanation = host.querySelector('#beehive-thermo-explanation');
    expect(host.querySelector('label[for="beehive-thermo-hypothesis"]').control).toBe(hypothesis);
    expect(host.querySelector('label[for="beehive-thermo-explanation"]').control).toBe(explanation);

    await mount({ viewMode: 'beekeeper', day: 5, motionPaused: true, tutorialDone: true, quizOpen: true, quizFeedback: { correct: true, explanation: 'Correct because colony signals coordinate behavior.' } });
    const progress = host.querySelector('[role="progressbar"][aria-label="Quiz progress"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    const feedback = host.querySelector('[data-beehive-focus-panel="quiz"] [role="status"]');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.getAttribute('aria-atomic')).toBe('true');
    expect(feedback.textContent).toContain('Correct because colony signals coordinate behavior');
  });
});

// ── Queen RTS + Drone Flight UX audit, 2026-07-30 ───────────────────────────
// Audited both simulations against the failure classes this repo has been bitten by. Two came back
// clean and are pinned so they stay that way; three were real and are fixed here.
//
// Clean, and worth recording so nobody "fixes" them again:
//   - No mouse-only controls in either sim. Every interactive surface is a real <button>, so the
//     role+tabIndex-without-onKeyDown trap (announced as a control, dead from the keyboard) is
//     absent.
//   - The drone canvas is NOT a dead tab stop. It is role="img" with aria-keyshortcuts and an
//     aria-describedby paragraph naming every key, and the flight loop listens at document level.
describe('beehive simulations — Queen RTS and Drone Flight UX', () => {
  const SRC = source;   // the module source this suite already reads at the top of the file

  it('keeps drone replay moments tied to the maneuver and preserves the first sample', () => {
    const replay = SRC.slice(SRC.indexOf('function droneReplayChart'));
    expect(replay).toMatch(/replayIndexValue = droneData\.replayIndex == null/);
    expect(replay).toMatch(/selectedAction = selectedSample\.action \|\| 'Glide'/);
    expect(replay).toMatch(/'Control: ' \+ selectedAction/);
    expect(replay).toMatch(/action: ds\.lastManeuver/);
    expect(replay).toMatch(/impact: ds\.lastManeuver/);
  });

  it('has no aria-label stranded on a role-less div or span', () => {
    // A container with aria-label and no role has its NAME DROPPED by browsers, so the label is
    // announced nowhere. Four group names and one milestone glyph were in this state.
    // Check each container's OWN props object — from `h('div', {` to the first NESTED h( on that
    // line. Scanning the whole line matched aria-labels belonging to nested children of a
    // <button>, which legitimately carry their own name, and is how this test first went red.
    const stranded = [];
    SRC.split('\n').forEach((line, i) => {
      const re = /h\('(?:div|span)',\s*\{/g;
      let m;
      while ((m = re.exec(line))) {
        const rest = line.slice(m.index + m[0].length);
        const nested = rest.indexOf("h('");
        const props = nested === -1 ? rest : rest.slice(0, nested);
        if (/'aria-label':/.test(props) && !/role:/.test(props)) {
          stranded.push('L' + (i + 1) + ' ' + line.trim().slice(0, 90));
        }
      }
    });
    expect(stranded, 'aria-label with no role:\n  ' + stranded.join('\n  ')).toEqual([]);
  });

  it('lets the drone flight pad be held with Space as well as Enter', () => {
    // These buttons are hold-to-steer and deliberately have NO onClick, so Space — the other native
    // button activation key, and the climb key — used to do nothing at all on a focused control.
    // Anchor on the button itself: 'data-flight-control' first appears in a CSS string near the top
    // of the file, so indexOf on the attribute name landed in the stylesheet.
    const pad = SRC.slice(SRC.indexOf("h('button', { key: control.label"));
    const decl = pad.slice(0, pad.indexOf("}, h('span'"));
    expect(decl).toMatch(/onKeyDown[\s\S]{0,120}e\.key === ' '/);
    expect(decl).toMatch(/onKeyUp[\s\S]{0,120}e\.key === ' '/);
    // Releasing on blur too, or tabbing away mid-press leaves the drone steering itself.
    expect(decl).toMatch(/onBlur: release/);
  });

  it('keeps every canvas-overlay button at a 44px touch target', () => {
    const small = [...SRC.matchAll(/min-h-\[(\d\d)px\]/g)]
      .map((m) => Number(m[1])).filter((px) => px < 44);
    expect(small, 'touch targets under 44px: ' + small.join(', ')).toEqual([]);
  });

  it('keeps the drone canvas describing its own controls', () => {
    // The description promises "equivalent labeled touch controls follow the canvas". They do exist
    // (a full pointer-driven pad), and that promise must not outlive them.
    expect(SRC).toMatch(/id: 'beehive-drone-canvas-description'/);
    expect(SRC).toMatch(/aria-keyshortcuts': 'ArrowUp/);
    expect(SRC).toMatch(/'data-flight-control'/);
  });

  it('scopes the Colony Network pause key to its Bee playfield and active panel state', () => {
    const qk = SRC.slice(SRC.indexOf('function onQueenKey'));
    const body = qk.slice(0, qk.indexOf('document.addEventListener'));
    expect(body).toMatch(/toLowerCase\(\)/);
    expect(body).toMatch(/TEXTAREA|isContentEditable/);
    expect(body).toContain('_beeActiveFocusPanelRef.current');
    expect(body).toContain('beeRoot.contains(active)');
    expect(body).toContain('queenPlayfield.contains(active)');
  });
});

// ── Queen RTS: building without a mouse, 2026-07-30 ─────────────────────────
// Selecting a structure was already a real button, but PLACING it required clicking the <canvas>
// at pixel coordinates — so an entire game mechanic was mouse-only. The earlier scan missed it
// because the trap was not a role+tabIndex div; it was a bare onClick on a canvas, which no
// keyboard user can target.
describe('Queen RTS structure placement is reachable without a pointer', () => {
  const SRC = source;

  it('offers labelled placement cells as real buttons', () => {
    expect(SRC).toMatch(/QUEEN_PLACE_CELLS/);
    expect(SRC).toMatch(/'data-queen-place-cell'/);
    const grid = SRC.slice(SRC.indexOf('function renderQueenPlacementGrid'));
    const body = grid.slice(0, grid.indexOf('function cancelQueenBuild'));
    // Real buttons, not clickable divs — that is what makes them keyboard-operable.
    expect(body).toMatch(/h\('button', \{/);
    expect(body).toMatch(/'aria-label': taken/);
    expect(body).toMatch(/min-h-\[44px\]/);
  });

  it('covers the whole legal build zone that buildQueenStructure clamps to', () => {
    // buildQueenStructure clamps x to 0.08-0.48 and y to 0.14-0.86. Cells outside that would be
    // silently snapped, so a player could pick "front top" and watch it land somewhere else.
    const decl = SRC.slice(SRC.indexOf('var QUEEN_PLACE_CELLS'));
    const arr = decl.slice(0, decl.indexOf('];'));
    const xs = [...arr.matchAll(/x: ([\d.]+)/g)].map((m) => Number(m[1]));
    const ys = [...arr.matchAll(/y: ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(xs.length).toBe(9);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...xs)).toBeLessThanOrEqual(0.48);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0.14);
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.86);
  });

  it('lets Escape leave placement mode', () => {
    // Without a cancel, selecting a structure was a commitment: the only way out of build mode was
    // to spend the resources.
    const qk = SRC.slice(SRC.indexOf('function onQueenKey'));
    const body = qk.slice(0, qk.indexOf('document.addEventListener'));
    expect(body).toMatch(/event\.key === 'Escape'/);
    expect(body).toMatch(/cancelQueenBuild\(\)/);
    expect(SRC).toMatch(/function cancelQueenBuild/);
  });

  it('no longer tells the player that clicking is the only way', () => {
    // The sr-only description and the placement feedback both said "click", which was the only
    // truthful instruction until the grid existed. A stale instruction is its own accessibility bug.
    expect(SRC).not.toMatch(/Placement mode: click your left side of the battlefield/);
    expect(SRC).toMatch(/placement grid below the battlefield|pick a cell in the grid/);
  });
});
