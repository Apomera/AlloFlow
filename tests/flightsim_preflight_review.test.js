import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, FS, host, root, latest;

const checks = () => [...host.querySelectorAll('input[type="checkbox"]')];
const progress = () => host.querySelector('progress[aria-label="Review progress"]');
const allReviewed = () => Object.fromEntries(FS.PREFLIGHT_CHECKLIST.flatMap(phase => phase.items.map((_, idx) => [phase.phase + '-' + idx, true])));
const button = text => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === text);

async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.click(); });
}
async function mount(seed = {}) {
  if (root) await act(async () => { root.unmount(); });
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'preflight', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data,
      setToolData: setData,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__RR_TEST_EXPORTS__;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool preflight learning review', () => {
  it('normalizes only known, own checkbox keys with exact true values', () => {
    const saved = Object.create({ 'Documents-0': true });
    Object.assign(saved, { 'Documents-1': true, 'Documents-2': 'true', 'Documents-3': 1, 'Documents-4': false, 'obsolete-0': true });
    expect(FS.normalizePreflightChecks(saved)).toEqual({ 'Documents-1': true });
    expect(FS.normalizePreflightChecks(null)).toEqual({});
    expect(FS.normalizePreflightChecks('Documents-0')).toEqual({});
    expect(FS.normalizePreflightChecks(['Documents-0'])).toEqual({});
    expect(FS.normalizePreflightChecks(saved)).not.toBe(saved);
    expect(saved['obsolete-0']).toBe(true);
  });

  it('does not let obsolete or false saved keys manufacture completion', async () => {
    const invalid = Object.fromEntries(Array.from({ length: 100 }, (_, idx) => ['obsolete-' + idx, true]));
    invalid['Documents-0'] = false;
    invalid['Documents-1'] = 'true';
    await mount({ preflightChecked: invalid });
    expect(progress().value).toBe(0);
    expect(host.textContent).toContain('0 / ' + progress().max + ' items reviewed');
    expect(host.textContent).not.toContain('Checklist review complete');
    expect(button('Start trainer practice')).toBeUndefined();
    expect(checks().every(item => !item.checked)).toBe(true);
  });

  it('bounds completion by the current reference even with many stale keys', async () => {
    const checked = { ...allReviewed(), ...Object.fromEntries(Array.from({ length: 100 }, (_, idx) => ['retired-' + idx, true])) };
    await mount({ preflightChecked: checked, aircraft: 'drone' });
    expect(progress().value).toBe(progress().max);
    expect(host.textContent).toContain('100%');
    expect(host.textContent).toContain('Checklist review complete');
    expect(host.textContent).not.toContain('Ready to fly!');
    expect(host.textContent).not.toContain("You've verified");
    expect(latest.aircraft).toBe('drone');
  });

  it('records review scope and removes unknown saved keys on the next edit', async () => {
    await mount({ aircraft: 'helicopter', preflightChecked: { 'Documents-0': true, junk: true } });
    expect(host.textContent).toContain('Cessna trainer');
    expect(host.textContent).toContain('simulation cannot inspect an aircraft');
    expect(progress().value).toBe(1);
    await click(checks()[1]);
    expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true });
    expect(progress().value).toBe(2);
    expect(latest.aircraft).toBe('helicopter');
  });

  it('restores valid review entries without turning them into flight evidence', async () => {
    await mount({ preflightChecked: { 'Documents-0': true } });
    const saved = structuredClone(latest);
    await mount(saved);
    expect(checks()[0].checked).toBe(true);
    expect(progress().value).toBe(1);
    expect(latest.challengeResults).toBeUndefined();
    expect(latest.lastDebrief).toBeUndefined();
  });

  it('starts a new review with every item unchecked and every phase available', async () => {
    const preflightOpen = Object.fromEntries(FS.PREFLIGHT_CHECKLIST.map(phase => [phase.phase, false]));
    await mount({ preflightChecked: allReviewed(), preflightOpen });
    expect(checks()).toHaveLength(0);
    await click(button('Start a new checklist review'));
    expect(latest.preflightChecked).toEqual({});
    expect(latest.preflightOpen).toEqual({});
    expect(progress().value).toBe(0);
    expect(checks()).toHaveLength(progress().max);
    expect(checks().every(item => !item.checked)).toBe(true);
    expect(button('Start trainer practice')).toBeUndefined();
  });

  it('keeps keyboard focus on the surviving phase toggle when its final item folds the phase', async () => {
    const phase = FS.PREFLIGHT_CHECKLIST[0];
    const reviewed = Object.fromEntries(phase.items.slice(0, -1).map((_, index) => [phase.phase + '-' + index, true]));
    await mount({ preflightChecked: reviewed });
    const finalCheck = checks()[phase.items.length - 1];
    finalCheck.focus();
    await click(finalCheck);
    const toggle = host.querySelector('#skyschool-pf-toggle-0');
    expect(finalCheck.isConnected).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    await click(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(checks()[phase.items.length - 1].checked).toBe(true);
  });

  it('retains checkbox focus when the learner explicitly keeps the completed phase open', async () => {
    const phase = FS.PREFLIGHT_CHECKLIST[0];
    const reviewed = Object.fromEntries(phase.items.slice(0, -1).map((_, index) => [phase.phase + '-' + index, true]));
    await mount({ preflightChecked: reviewed, preflightOpen: { [phase.phase]: true } });
    const finalCheck = checks()[phase.items.length - 1];
    finalCheck.focus();
    await click(finalCheck);
    expect(finalCheck.isConnected).toBe(true);
    expect(document.activeElement).toBe(finalCheck);
    expect(host.querySelector('#skyschool-pf-toggle-0').getAttribute('aria-expanded')).toBe('true');
  });

  it('does not pull focus from another control when a phase is completed elsewhere', async () => {
    const phase = FS.PREFLIGHT_CHECKLIST[0];
    const reviewed = Object.fromEntries(phase.items.slice(0, -1).map((_, index) => [phase.phase + '-' + index, true]));
    await mount({ preflightChecked: reviewed });
    const existingFocus = button('Start a new checklist review');
    existingFocus.focus();
    await click(checks()[phase.items.length - 1]);
    expect(host.querySelector('#skyschool-pf-toggle-0').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(existingFocus);
  });

  it('connects completed review to a fresh measured Cessna trainer challenge', async () => {
    await mount({ preflightChecked: allReviewed(), aircraft: 'drone', selectedChallenge: 'drone_survey', survey: { active: true }, rescue: { active: true } });
    await click(button('Start trainer practice'));
    expect(latest.view).toBe('flying');
    expect(latest.aircraft).toBe('cessna172');
    expect(latest.selectedChallenge).toBe('first_flight');
    expect(latest.flightChallenge).toMatchObject({ id: 'first_flight', status: 'active', elapsedSeconds: 0, airborneSeconds: 0 });
    expect(Object.values(latest.flightChallenge.objectives).every(value => value === false)).toBe(true);
    expect(latest.survey).toBeNull();
    expect(latest.rescue).toBeNull();
    expect(host.querySelector('[aria-label="Flight challenge"]').textContent).toContain('First Flight');
  });
});
