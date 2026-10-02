import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act;
let tool, mounted, priorAct;
beforeEach(() => {
  priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab();
  tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
});
function run(points, prediction = null, dose = 60) {
  return window.__MicrobiologyCore.normalizeResistanceInvestigation({ initRes: 15, duration: 3, dose,
    prediction, runAwarded: true, notes: 'Keep original run notes.', history: points.map((pair, day) => ({ day, sensitive: pair[0], resistant: pair[1] })) });
}
function mount(investigation, t) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), awardXP: vi.fn(), state: null };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'resistance', resistanceInvestigation: investigation }, otherTool: { note: 'Keep other work.' } });
    view.state = data;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP, ...(t ? { t } : {}) }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
const summary = () => mounted.container.querySelector('#micro-resistance-outcome-summary');
const text = () => summary()?.textContent;
function unchangedWithoutPrediction(before, random) {
  expect(mounted.state).toEqual(before);
  expect(mounted.state.microbiology.resistanceInvestigation.prediction).toBeNull();
  expect(mounted.awardXP).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  expect(text()).not.toContain('Prediction matched'); expect(text()).not.toContain('Prediction review');
  expect(text()).not.toContain('was not classified');
  expect(mounted.container.textContent).toContain('without a prediction comparison');
}
describe('Resistance observations without an original prediction', () => {
  it.each([
    ['increase', [[68, 12], [20, 12], [0, 12], [0, 12]], 'increased by 85 percentage points'],
    ['similar', [[68, 12], [68, 12], [68, 12], [68, 12]], 'a 0-point change'],
    ['decrease', [[68, 12], [60, 8], [60, 4], [60, 0]], 'decreased by 15 percentage points'],
    ['extinction', [[68, 12], [0, 0]], 'There is no surviving population']
  ])('reports the actual %s outcome from saved counts', (_kind, points, expected) => {
    const view = mount(run(points)); const before = JSON.parse(JSON.stringify(view.state)), random = vi.spyOn(Math, 'random');
    expect(text()).toContain('Observation summary.'); expect(text()).toContain(expected);
    expect(summary().getAttribute('role')).toBe('status'); expect(summary().getAttribute('aria-atomic')).toBe('true');
    act(() => vi.runOnlyPendingTimers()); unchangedWithoutPrediction(before, random);
  });
  it('retains the observed nonzero difference within the five-point similar band', () => {
    mount(run([[68, 12], [60, 12], [60, 12], [60, 12]]));
    expect(text()).toContain('a 2-point change'); expect(text()).toContain('changes within 5 points');
  });
  it.each(['increase', 'decrease'])('keeps the existing prediction comparison for a recorded %s prediction', prediction => {
    const view = mount(run([[68, 12], [20, 12], [0, 12], [0, 12]], prediction));
    expect(text()).toContain(prediction === 'increase' ? 'Prediction matched.' : 'Prediction review.');
    expect(text()).toContain('increased by 85 percentage points.');
    expect(view.state.microbiology.resistanceInvestigation.prediction).toBe(prediction); expect(view.awardXP).not.toHaveBeenCalled();
  });
  it('shows a correct outcome after a restored unpredicted run advances to completion', () => {
    const view = mount(run([[68, 12], [68, 12], [68, 12]], null, 0));
    expect(summary()).toBeNull();
    const step = [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Step round');
    expect(step.disabled).toBe(false);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    act(() => step.click());
    expect(text()).toContain('Observation summary.'); expect(text()).toContain('a 0-point change');
    expect(view.state.microbiology.resistanceInvestigation.prediction).toBeNull();
    expect(view.state.microbiology.resistanceInvestigation.day).toBe(3); expect(view.awardXP).not.toHaveBeenCalled();
  });
  it('uses translated outcome framing and inserts the actual rounded change', () => {
    mount(run([[68, 12], [20, 12], [0, 12], [0, 12]]), (key, fallback) => ({
      'stem.microbiology.resistance_observation_summary': 'Observed model: ',
      'stem.microbiology.resistance_observed_increase': 'Share rose by {points} points.'
    })[key] ?? fallback);
    expect(text()).toBe('Observed model: Share rose by 85 points.');
  });
});
