import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee brood emergence calendar', () => {
  let BH, config, host, root, latest, originalRaf, originalCancelRaf;

  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    host = root = null;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });

  function colony(overrides = {}) {
    const workers = Array(21).fill(0), drones = Array(24).fill(0);
    workers[0] = 12; workers[3] = 100; workers[6] = 29; workers[20] = 50;
    drones[0] = 3; drones[3] = 12; drones[23] = 9;
    return { ...BH.bhCreateNewColonyState(777, 1), viewMode: 'beekeeper', beeView: 'lifecycle',
      day: 60, workers: 20000, drones: 20, brood: 215,
      broodCohorts: { schemaVersion: 1, workers, drones },
      tutorialDone: true, soundOn: false, motionPaused: true, honey: 500, pollen: 500,
      varroaLevel: 0, ...overrides };
  }
  async function mount(initial, gradeLevel = '7th Grade') {
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    function Component() {
      const [toolData, setToolData] = React.useState({ beehive: initial, otherTool: { retained: true } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  async function selectDay(offset) {
    const control = host.querySelector('#bee-brood-calendar-day');
    await act(async () => { control.value = String(offset); control.dispatchEvent(new Event('change', { bubbles: true })); });
  }

  it('maps the next step to the first bucket, reports both castes, and keeps later brood outside the week', () => {
    const calendar = BH.bhBroodEmergenceCalendar(colony());
    expect(calendar.available).toBe(true);
    expect(calendar.rows[0]).toEqual({ offset: 1, day: 61, workers: 12, drones: 3, total: 15 });
    expect(calendar.rows[3]).toEqual({ offset: 4, day: 64, workers: 100, drones: 12, total: 112 });
    expect(calendar.rows[6]).toEqual({ offset: 7, day: 67, workers: 29, drones: 0, total: 29 });
    expect(calendar.totals).toEqual({ workers: 141, drones: 15, total: 156 });
    expect(calendar.later).toBe(59);
  });

  it('matches seven actual daily emergence readings when no new eggs, events or losses intervene', () => {
    let state = colony({ queenHealth: 0 });
    const calendar = BH.bhBroodEmergenceCalendar(state);
    const cfg = { params: { ...BH.SIMULATION_PARAMS, randomEventChance: 0, supersedureChance: 0,
      baseWorkerMortality: 0, droneBaseMortality: 0, droneEvictionRate: 0 },
      subMods: { honey: 1, spring: 1, winter: 1, varroa: 1 }, siteMods: { forage: 1, disease: 1 },
      gardenBonus: 0, hiveEvents: [], diseaseEvents: [], rand: () => 0.99 };
    for (const row of calendar.rows) {
      state = { ...state, ...BH.bhStepColony(state, cfg).next };
      expect(state.day).toBe(row.day);
      expect(state.emergedWorkers).toBe(row.workers);
      expect(state.emergedDrones).toBe(row.drones);
    }
  });

  it('can read frozen state without mutating it or consuming random draws', () => {
    const state = colony();
    Object.freeze(state.broodCohorts.workers); Object.freeze(state.broodCohorts.drones);
    Object.freeze(state.broodCohorts); Object.freeze(state);
    const random = vi.spyOn(Math, 'random');
    const snapshot = JSON.stringify(state);
    const first = BH.bhBroodEmergenceCalendar(state), second = BH.bhBroodEmergenceCalendar(state);
    expect(second).toEqual(first);
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(random).not.toHaveBeenCalled();
  });

  it('distinguishes a valid zero schedule from missing ages and from brood due later', () => {
    const cohorts = { schemaVersion: 1, workers: Array(21).fill(0), drones: Array(24).fill(0) };
    const empty = BH.bhBroodEmergenceCalendar(colony({ brood: 0, broodCohorts: cohorts }));
    expect(empty.available).toBe(true); expect(empty.totals.total).toBe(0); expect(empty.later).toBe(0);
    cohorts.workers[20] = 100;
    const later = BH.bhBroodEmergenceCalendar(colony({ brood: 100, broodCohorts: cohorts }));
    expect(later.available).toBe(true); expect(later.totals.total).toBe(0); expect(later.later).toBe(100);
    expect(BH.bhBroodEmergenceCalendar(colony({ broodCohorts: null })).available).toBe(false);
  });

  it.each([
    ['legacy save', state => { delete state.broodCohorts; }],
    ['future age schema', state => { state.broodCohorts.schemaVersion = 2; }],
    ['missing worker ages', state => { state.broodCohorts.workers = []; }],
    ['missing drone ages', state => { state.broodCohorts.drones = null; }],
    ['sparse ages', state => { delete state.broodCohorts.workers[3]; }],
    ['negative age count', state => { state.broodCohorts.workers[3] = -1; }],
    ['fractional age count', state => { state.broodCohorts.workers[3] = 1.5; }],
    ['string age count', state => { state.broodCohorts.workers[3] = '100'; }],
    ['non-finite age count', state => { state.broodCohorts.workers[3] = Infinity; }],
    ['out of range age count', state => { state.broodCohorts.workers[3] = 500001; }],
    ['brood total mismatch', state => { state.brood++; }],
    ['unknown model', state => { delete state.modelVersion; }],
    ['future model', state => { state.modelVersion = 'colony-daily-9'; }],
    ['missing day', state => { delete state.day; }],
    ['fractional day', state => { state.day = 2.5; }],
  ])('leaves %s untouched and refuses to infer emergence', (_label, change) => {
    const state = colony(); change(state);
    const saved = structuredClone(state);
    expect(BH.bhBroodEmergenceCalendar(state)).toMatchObject({ available: false, rows: [] });
    expect(state).toEqual(saved);
  });

  it('respects a shorter parameterized development interval without fabricating extra ages', () => {
    const state = colony({ brood: 11, broodCohorts: { schemaVersion: 1, workers: [2, 3], drones: [1, 0, 5] } });
    const calendar = BH.bhBroodEmergenceCalendar(state, { workerDevelopmentDays: 2, droneDevelopmentDays: 3 });
    expect(calendar.available).toBe(true);
    expect(calendar.rows.map(row => row.total)).toEqual([3, 3, 5, 0, 0, 0, 0]);
    expect(BH.bhBroodEmergenceCalendar(state).available).toBe(false);
  });

  it('changes the reasoning task across reading levels and bounds the conclusion', () => {
    const lessons = ['K–2', '3–5', '6–8', '9–12'].map(band => BH.bhBroodCalendarLesson(band));
    expect(new Set(lessons.map(lesson => lesson.question)).size).toBe(4);
    expect(lessons[0].question).toContain('Which day');
    expect(lessons[1].question).toContain('eggs today');
    expect(lessons[2].question).toContain('population fall');
    expect(lessons[3].question).toContain('expected lag');
    expect(lessons[3].reasoning).toContain('does not establish a cause');
    lessons.forEach(lesson => expect(lesson.limit).toMatch(/loss|die|mortality/));
  });

  it('captures exact selected counts as a conditional prediction with timing and model provenance', () => {
    const calendar = BH.bhBroodEmergenceCalendar(colony());
    const evidence = BH.bhBuildBroodCalendarEvidence(calendar, 4);
    expect(evidence).toContain('Day 60 (colony-daily-1.2)');
    expect(evidence).toContain('Day 64 (+4) has 100 workers and 12 drones');
    expect(evidence).toContain('141 workers + 15 drones');
    expect(evidence).toContain('initial ages are distributed assumptions');
    expect(evidence).toContain('not observed emergence, net growth or a forager forecast');
    expect(BH.bhBuildBroodCalendarEvidence(calendar, 0)).toBe('');
    expect(BH.bhBuildBroodCalendarEvidence({ available: false }, 1)).toBe('');
  });

  it('lets a learner inspect another day while colony inputs remain unchanged', async () => {
    await mount(colony());
    const saved = structuredClone(latest);
    expect(host.querySelector('[data-brood-reading-workers]').textContent).toBe('12');
    await selectDay(4);
    expect(host.querySelector('[data-brood-reading-workers]').textContent).toBe('100');
    expect(host.querySelector('[data-brood-reading-drones]').textContent).toBe('12');
    expect(host.querySelector('[data-brood-calendar-reading]').textContent).toContain('Day 64');
    expect(host.querySelector('[data-brood-calendar-question]').getAttribute('data-brood-calendar-question')).toBe('6–8');
    expect(latest).toEqual(saved);
  });

  it('adds evidence once, preserves the learner’s writing and other roles, and clears only the evidence review', async () => {
    const notebook = { beekeeper: { claim: 'My claim', reasoning: 'My reasoning', evidence: 'My earlier evidence.',
      review: { claim: true, evidence: true, reasoning: true } }, queen: { evidence: 'Queen notes' } };
    await mount(colony({ notebook }));
    await selectDay(4);
    const before = structuredClone(latest), button = host.querySelector('[data-brood-calendar-evidence]');
    await act(async () => { button.click(); button.click(); });
    const { notebook: afterNotebook, ...afterInputs } = latest.beehive;
    const { notebook: _previousNotebook, ...beforeInputs } = before.beehive;
    expect(afterInputs).toEqual(beforeInputs);
    expect(latest.otherTool).toEqual(before.otherTool);
    expect(afterNotebook.queen).toEqual(notebook.queen);
    expect(afterNotebook.beekeeper.claim).toBe('My claim');
    expect(afterNotebook.beekeeper.reasoning).toBe('My reasoning');
    expect(afterNotebook.beekeeper.review).toEqual({ claim: true, reasoning: true, evidence: false });
    expect(afterNotebook.beekeeper.evidence).toMatch(/^My earlier evidence\.\nConditional brood schedule/);
    expect(afterNotebook.beekeeper.evidence.match(/Conditional brood schedule/g)).toHaveLength(1);
    expect(host.querySelector('[data-brood-calendar-evidence]').disabled).toBe(true);
    expect(host.querySelector('#bee-brood-calendar-evidence-hint').textContent).toContain('already in your evidence');
  });

  it('preserves a full evidence box and explains why the append is unavailable', async () => {
    const writing = 'x'.repeat(1200);
    await mount(colony({ notebook: { beekeeper: { evidence: writing } } }));
    expect(host.querySelector('[data-brood-calendar-evidence]').disabled).toBe(true);
    expect(host.querySelector('#bee-brood-calendar-evidence-hint').textContent).toContain('Make room for');
    expect(latest.beehive.notebook.beekeeper.evidence).toBe(writing);
  });

  it('shows unsupported age data as unavailable after the existing save recovery', async () => {
    const state = colony(); state.broodCohorts.schemaVersion = 2;
    await mount(state);
    expect(host.querySelector('[data-brood-calendar-unavailable]').textContent).toContain('no supported brood age groups');
    expect(host.querySelector('.bee-brood-bars')).toBeNull();
    expect(host.querySelector('[data-brood-calendar-evidence]')).toBeNull();
    expect(latest.beehive.brood).toBe(state.brood);
    expect(latest.beehive.broodCohorts).toBeUndefined();
    expect(latest.beehive.saveRecovery.fields).toContain('broodCohorts');
    expect(state.broodCohorts.schemaVersion).toBe(2);
  });

  it('keeps the calendar available in the expanded layout with a younger learner prompt', async () => {
    await mount(colony({ focusLayout: false }), 'Kindergarten');
    expect(host.querySelector('[data-beehive-brood-calendar]')).toBeTruthy();
    expect(host.querySelector('[data-brood-calendar-question]').getAttribute('data-brood-calendar-question')).toBe('K–2');
    expect(host.querySelector('[data-brood-calendar-question]').textContent).toContain('Which day');
  });
});
