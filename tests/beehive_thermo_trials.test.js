import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee thermoregulation trials', () => {
  let BH, config, root, host, latest, setGrade, originalRaf, originalCancel;
  beforeAll(() => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
  }, 120000);
  beforeEach(() => {
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    originalRaf = globalThis.requestAnimationFrame; originalCancel = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
  });
  afterEach(() => {
    if (root) act(() => root.unmount()); if (host) host.remove(); root = host = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancel;
    vi.restoreAllMocks();
  });
  async function mount(overrides = {}, grade = '7th Grade') {
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
        viewMode: 'beekeeper', beeView: 'thermo', discoveryLesson: 'thermo', day: 60,
        tutorialDone: true, soundOn: false, motionPaused: true, ...overrides }, otherTool: { retained: true } });
      const [gradeLevel, updateGrade] = React.useState(grade); latest = toolData; setGrade = updateGrade;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  const lab = () => host.querySelector('[data-beehive-thermoregulation]');
  const simulation = () => { const { thermHunt, ...colony } = latest.beehive; return structuredClone({ colony, otherTool: latest.otherTool }); };
  async function click(text) { await act(async () => Array.from(lab().querySelectorAll('button')).find(n => n.textContent === text).click()); }
  function input(key, value) {
    const node = lab().querySelector('#th-' + key);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const trial = (value = {}) => BH.bhThermoTrial({ ...BH.BH_THERMO_DEFAULTS, ...value });

  it('keeps the existing classroom formula and separates warming and cooling', () => {
    expect(BH.bhThermoReading()).toMatchObject({ outsideC: 20, heaterBees: 1200, beesFanning: 30, state: 'chilled' });
    expect(BH.bhThermoReading().heatingC).toBeCloseTo(10.8, 10); expect(BH.bhThermoReading().coolingC).toBeCloseTo(1.2, 10);
    expect(BH.bhThermoEstimate()).toBeCloseTo(29.6, 10);
    expect(BH.bhThermoEstimate({ outsideC: 12, heaterBees: 0, beesFanning: 0 })).toBe(12);
    expect(BH.bhThermoReading({ broodCount: 5000 }).heaterBees).toBe(1200);
  });
  it.each([null, {}, { outsideC: NaN, beesFanning: Infinity, heaterBees: '1200' }, { outsideC: null, beesFanning: false, heaterBees: undefined }])('uses safe defaults for missing or malformed conditions %j', value => {
    expect(BH.bhThermoReading(value).temperatureC).toBeCloseTo(29.6, 10);
  });
  it('uses the same fixed scale for every valid combination of conditions', () => {
    for (const outsideC of [-10, 0, 20, 45]) for (const heaterBees of [0, 1200, 3000, 5000]) for (const beesFanning of [0, 30, 200, 500]) {
      const r = BH.bhThermoReading({ outsideC, heaterBees, beesFanning });
      expect(r.temperatureC).toBeCloseTo(outsideC + heaterBees * .009 - beesFanning * .04, 10);
      expect(r.temperatureC).toBeGreaterThanOrEqual(-30); expect(r.temperatureC).toBeLessThanOrEqual(90);
    }
    expect(BH.bhThermoReading({ outsideC: -99, heaterBees: 9999, beesFanning: -1 })).toMatchObject({ outsideC: -10, heaterBees: 5000, beesFanning: 0 });
  });
  it.each([[31.9, 'chilled'], [32, 'compensating'], [33.9, 'compensating'], [34, 'optimal'], [36, 'optimal'], [36.1, 'overheating']])('keeps the original temperature bands at %s degrees', (outsideC, state) => {
    expect(BH.bhThermoReading({ outsideC, heaterBees: 0, beesFanning: 0 }).state).toBe(state);
  });
  it('changes one input without losing writing, the baseline or unknown metadata', () => {
    const value = { ...BH.BH_THERMO_DEFAULTS, hypothesis: 'Keep me', log: [trial()], comparisonBaseline: trial(), teacher: { note: 'Retain' } };
    const before = structuredClone(value), next = BH.bhSetThermoControl(value, 'heaterBees', 1300);
    expect(next).toEqual({ ...value, heaterBees: 1300 }); expect(value).toEqual(before); expect(next.teacher).toBe(value.teacher);
    expect(BH.bhSetThermoControl(next, 'reset')).toEqual(value);
  });
  it.each([['outsideC', NaN], ['beesFanning', Infinity], ['heaterBees', '400'], ['unknown', 10]])('ignores malformed %s changes', (key, value) => {
    const original = { ...BH.BH_THERMO_DEFAULTS, teacherNote: 'Keep' };
    expect(BH.bhSetThermoControl(original, key, value)).toEqual(original);
  });
  it('freezes a baseline and preserves it when the eight-entry log rolls over', () => {
    const original = { ...BH.BH_THERMO_DEFAULTS, log: [], hypothesis: 'Keep', teacherNote: 'Keep' };
    let value = BH.bhLogThermoTrial(original); const baseline = structuredClone(value.comparisonBaseline);
    for (let n = 0; n < 12; n++) value = BH.bhLogThermoTrial(BH.bhSetThermoControl(value, 'beesFanning', n * 10));
    expect(value.log).toHaveLength(8); expect(value.comparisonBaseline).toEqual(baseline);
    expect(value.log).not.toContainEqual(baseline); expect(value.hypothesis).toBe('Keep'); expect(original.log).toEqual([]);
    expect(value.comparisonBaseline).not.toBe(value.log[0]);
  });
  it.each([['heaterBees', 1300, .9], ['beesFanning', 40, -.4], ['outsideC', 21, 1]])('isolates the modeled change from %s', (key, value, delta) => {
    const result = BH.bhThermoTrialComparison(trial(), trial({ [key]: value }));
    expect(result.kind).toBe('single'); expect(result.changed.map(row => row.id)).toEqual([key]);
    expect(result.rows.find(row => row.id === 'temperature').delta).toBe(delta);
    expect(result.rows.filter(row => row.id !== key && row.id !== 'temperature').every(row => row.delta === 0)).toBe(true);
  });
  it('detects confounding even when the temperature does not change', () => {
    const result = BH.bhThermoTrialComparison(trial({ heaterBees: 1000, beesFanning: 0 }), trial({ heaterBees: 1400, beesFanning: 90 }));
    expect(result.kind).toBe('multiple'); expect(result.changed).toHaveLength(2);
    expect(result.rows.find(row => row.id === 'temperature').delta).toBe(0);
    expect(BH.bhThermoTrialComparison(trial(), trial()).kind).toBe('unchanged');
  });
  it.each([
    [null, 'missing'], [{ o: 20, f: 30, b: 5000, t: '22.8' }, 'older-model'],
    [{ model: 'future-2', o: 20, f: 30, hb: 1200, t: '29.6' }, 'different-model'],
    [{ o: 20, f: 30, hb: 9000, t: '29.6' }, 'invalid'],
    [{ o: 20, f: 30, hb: 1200, t: '' }, 'invalid'],
    [{ o: 20, f: 30, hb: 1200, t: '35.0' }, 'inconsistent']
  ])('does not turn unverifiable saved records into a current-model comparison', (before, reason) => {
    expect(BH.bhThermoTrialComparison(before, trial())).toMatchObject({ kind: 'unavailable', reason, rows: [] });
  });
  it('accepts earlier heater-model trials when their recorded result matches', () => {
    expect(BH.bhThermoTrialComparison({ o: 20, f: 30, hb: 1200, t: '29.6', st: 'chilled' }, trial()).kind).toBe('unchanged');
  });
  it('keeps all calculations independent of time and random draws', () => {
    const random = vi.spyOn(Math, 'random'), clock = vi.spyOn(Date, 'now');
    const logged = BH.bhLogThermoTrial(); BH.bhThermoTrialComparison(logged.comparisonBaseline, trial());
    expect(random).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled();
  });
  it('supports observation language and older learners’ coefficient reasoning', () => {
    expect(BH.bhThermoLesson('K–2').reasoning).toContain('Move only the fanning slider');
    expect(BH.bhThermoLesson('3–5').reasoning).toContain('change one condition');
    expect(BH.bhThermoLesson('6–8').question).toContain('100 extra heater bees');
    expect(BH.bhThermoLesson('9–12').reasoning).toContain('ΔT');
  });
  it('renders a default calculation and updates a controlled trial without changing the colony', async () => {
    await mount(); const before = simulation();
    expect(lab().querySelector('[data-thermo-reading]').textContent).toBe('29.6 °C');
    expect(lab().querySelector('[data-term="heating"] dd strong').textContent).toBe('+10.8 °C');
    await click('Log current trial'); const baseline = structuredClone(latest.beehive.thermHunt.comparisonBaseline);
    await act(async () => input('heaterBees', 1300));
    expect(lab().querySelector('[data-thermo-reading]').textContent).toBe('30.5 °C');
    expect(lab().querySelector('[data-thermo-comparison]').dataset.thermoComparison).toBe('single');
    expect(lab().querySelector('[data-thermo-delta="temperature"]').textContent).toContain('+0.9 °C');
    await click('Log current trial');
    expect(latest.beehive.thermHunt.comparisonBaseline).toEqual(baseline); expect(simulation()).toEqual(before);
  });
  it('keeps rapid input changes and a log action on the same current state', async () => {
    await mount({ thermHunt: { ...BH.BH_THERMO_DEFAULTS, teacher: { note: 'Keep' } } });
    await act(async () => { input('outsideC', 40); input('heaterBees', 1000); input('beesFanning', 20); lab().querySelector('.bee-thermo-actions button').click(); });
    expect(latest.beehive.thermHunt).toMatchObject({ outsideC: 40, heaterBees: 1000, beesFanning: 20, teacher: { note: 'Keep' } });
    expect(latest.beehive.thermHunt.log[0]).toMatchObject({ o: 40, hb: 1000, f: 20, t: '48.2' });
  });
  it('preserves earlier-model results and writing through comparison selection and reset', async () => {
    const old = { o: 20, f: 30, b: 5000, t: '22.8', st: 'chilled' };
    await mount({ focusLayout: false, thermHunt: { outsideC: 20, beesFanning: 30, broodCount: 5000,
      hypothesis: 'My original hypothesis', understood: true, explanation: 'My original explanation', log: [old] } });
    const before = simulation();
    expect(lab().textContent).toContain('5,000 brood (older model)');
    expect(lab().querySelector('[data-thermo-comparison]').textContent).toContain('different model');
    await click('Log current trial'); await act(async () => input('heaterBees', 2000)); await click('Reset conditions');
    expect(latest.beehive.thermHunt).toMatchObject({ ...BH.BH_THERMO_DEFAULTS, hypothesis: 'My original hypothesis', explanation: 'My original explanation', broodCount: 5000 });
    expect(latest.beehive.thermHunt.log[0]).toEqual(old); expect(simulation()).toEqual(before);
  });
  it('selects a logged baseline without changing the live conditions', async () => {
    const first = trial(), second = trial({ outsideC: 30 });
    await mount({ thermHunt: { ...BH.BH_THERMO_DEFAULTS, log: [first, second], comparisonBaseline: first } });
    const select = lab().querySelector('#beehive-thermo-baseline');
    await act(async () => { select.value = '1'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(latest.beehive.thermHunt.comparisonBaseline).toEqual(second);
    expect(BH.bhThermoTrial(latest.beehive.thermHunt)).toEqual(first);
  });
  it('uses normalized readings in saved discovery evidence and preserves grade changes', async () => {
    await mount({ thermHunt: { outsideC: null, beesFanning: Infinity, heaterBees: 'bad', hypothesis: 'Retain' } }, '2nd Grade');
    expect(lab().querySelector('.bee-thermo-prompt').textContent).toContain('warmer or cooler');
    const capture = Array.from(host.querySelectorAll('[data-beehive-discovery] button')).find(n => n.textContent === 'Capture observation');
    await act(async () => capture.click());
    expect(latest.beehive.discoveryRecords.thermo.snapshot.metrics.map(m => m.value)).toEqual([20, 30, 1200, 29.6]);
    await act(async () => setGrade('11th Grade'));
    expect(lab().querySelector('.bee-thermo-prompt').textContent).toContain('coefficient'); expect(latest.beehive.thermHunt.hypothesis).toBe('Retain');
  });
  it('renders malformed old log entries without losing them or inventing results', async () => {
    const log = [null, 'old', { o: 20, f: 30, hb: 1200, t: 'corrupt' }];
    await mount({ thermHunt: { ...BH.BH_THERMO_DEFAULTS, log } });
    expect(lab().querySelectorAll('.bee-thermo-log li')).toHaveLength(3);
    expect(lab().querySelector('[data-thermo-comparison]').dataset.thermoComparison).toBe('unavailable');
    expect(latest.beehive.thermHunt.log).toEqual(log);
  });
});
