import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Bee waggle reference frames', () => {
  let BH, config, host, root, latest, setGrade, originalRaf, originalCancel;
  beforeEach(() => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
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
        viewMode: 'beekeeper', beeView: 'waggle', discoveryLesson: 'waggle', day: 60,
        tutorialDone: true, soundOn: false, motionPaused: true, ...overrides }, otherTool: { retained: true } });
      const [gradeLevel, updateGrade] = React.useState(grade); latest = toolData; setGrade = updateGrade;
      return config.render(makeCtx({ toolData, setToolData, gradeLevel }));
    }
    await act(async () => root.render(React.createElement(Component)));
  }
  const lab = () => host.querySelector('[data-waggle-lab]');
  async function click(selector) { await act(async () => lab().querySelector(selector).click()); }
  function input(selector, value) {
    const node = lab().querySelector(selector);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function simulation() { const { waggleLab, ...colony } = latest.beehive; return structuredClone({ colony, otherTool: latest.otherTool }); }

  it.each([
    [135, 90, 45], [30, 345, 45], [345, 15, -30], [0, 180, 180], [180, 0, 180], [0, 0, 0],
  ])('keeps food at %s° with a %s° sun using a %s° comb angle', (food, sun, dance) => {
    expect(BH.bhWaggleReading({ fixedFood: food, sun, dance: -99 })).toEqual({ food, sun, dance });
  });
  it('normalizes finite saved destinations and falls back for invalid locks', () => {
    expect(BH.bhWaggleReading({ fixedFood: -30, sun: 375 })).toEqual({ food: 330, sun: 15, dance: -45 });
    for (const fixedFood of [NaN, Infinity, '135', null])
      expect(BH.bhWaggleReading({ fixedFood, sun: 90, dance: 45 })).toEqual({ dance: 45, sun: 90, food: 135 });
  });
  it('holds every tested compass destination across a complete turn of the sun', () => {
    for (let food = 0; food < 360; food += 15) for (let sun = 0; sun < 360; sun += 15) {
      const reading = BH.bhWaggleReading({ fixedFood: food, sun });
      expect(reading.food).toBe(food); expect(reading.dance).toBeGreaterThanOrEqual(-180);
      expect(reading.dance).toBeLessThanOrEqual(180);
      expect(((sun + reading.dance) % 360 + 360) % 360).toBe(food);
    }
  });
  it('moves the food bearing with the sun when the dance is the held reference', () => {
    const start = { dance: 45, sun: 345, teacher: { note: 'Keep this' }, distance: 1200 };
    const before = structuredClone(start), next = BH.bhSetWaggleControl(start, 'sun', 0);
    expect(BH.bhWaggleReading(next)).toEqual({ dance: 45, sun: 0, food: 45 });
    expect(next.teacher).toBe(start.teacher); expect(next.distance).toBe(1200); expect(start).toEqual(before);
  });
  it('adjusts the comb angle through north while keeping the captured food destination', () => {
    let state = BH.bhSetWaggleControl({ dance: 45, sun: 345 }, 'reference', 'food');
    expect(state.fixedFood).toBe(30);
    state = BH.bhSetWaggleControl(state, 'sun', 0); expect(state).toEqual({ dance: 30, sun: 0, fixedFood: 30 });
    state = BH.bhSetWaggleControl(state, 'sun', 15); expect(state).toEqual({ dance: 15, sun: 15, fixedFood: 30 });
    expect(BH.bhSetWaggleControl(state, 'dance', -90)).toEqual(state);
  });
  it('switches references without moving the current destination', () => {
    const locked = BH.bhSetWaggleControl({ dance: -45, sun: 90 }, 'reference', 'food');
    const moved = BH.bhSetWaggleControl(locked, 'sun', 120);
    const released = BH.bhSetWaggleControl(moved, 'reference', 'dance');
    expect(released).toEqual({ dance: -75, sun: 120 });
    expect(BH.bhWaggleReading(released).food).toBe(45);
    expect(BH.bhWaggleReading(BH.bhSetWaggleControl(released, 'sun', 135)).food).toBe(60);
  });
  it('resets only the decoder controls and preserves extension metadata', () => {
    const state = { dance: -90, sun: 210, fixedFood: 120, duration: 2.6, teacherNote: 'Keep my note' };
    const reset = BH.bhSetWaggleControl(state, 'reset');
    expect(reset).toEqual({ dance: 45, sun: 90, duration: 2.6, teacherNote: 'Keep my note' });
    expect(state.fixedFood).toBe(120);
  });
  it.each([['sun', NaN], ['sun', Infinity], ['dance', '45'], ['reference', 'unknown'], ['unknown', 90]])('ignores malformed %s requests', (control, value) => {
    const state = { dance: 45, sun: 90, fixedFood: 135, extra: true };
    expect(BH.bhSetWaggleControl(state, control, value)).toEqual(state);
  });
  it('keeps calculations deterministic without a random draw or clock read', () => {
    const random = vi.spyOn(Math, 'random'), clock = vi.spyOn(Date, 'now');
    const state = BH.bhSetWaggleControl(null, 'reference', 'food');
    expect(state).toEqual({ dance: 45, sun: 90, fixedFood: 135 });
    expect(BH.bhSetWaggleControl(state, 'sun', 180).dance).toBe(-45);
    expect(random).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled();
  });
  it('describes the opposite-direction tie as down rather than left or right', () => {
    expect(BH.bhWaggleDirectionText(0)).toBe('Straight up, toward the sun');
    for (const angle of [-180, 180]) expect(BH.bhWaggleDirectionText(angle)).toBe('Straight down, away from the sun');
    expect(BH.bhWaggleDirectionText(-45)).toBe('45 degrees left of up');
  });
  it('keeps both animated panels on the saved reference even if a saved dance angle is stale or missing', () => {
    for (const lab of [{ fixedFood: 135, sun: 180, dance: 45 }, { fixedFood: 135 }]) {
      for (const time of [0, 3, 14, 43]) {
        const state = BH.bhWaggleDemoState(time, lab), reading = BH.bhWaggleReading(lab);
        expect(state).toMatchObject({ ...reading, source: 'lab' });
      }
    }
  });
  it('keeps a held destination at one example distance and avoids a jump at the old example boundary', () => {
    const lab = { fixedFood: 135, sun: 180, dance: 45 };
    for (const seconds of [0, 3, 14, 28, 43, 120])
      expect(BH.bhWaggleDemoState(seconds, lab)).toMatchObject({ food: 135, distM: 1200, runSec: 1.2 });
    const before = BH.bhWaggleDemoState(13.99, lab), after = BH.bhWaggleDemoState(14, lab);
    expect(after.phase).toBe(before.phase); expect(after.side).toBe(before.side);
    expect(after.progress - before.progress).toBeCloseTo(.01 / before.returnSec, 6);
    expect(BH.bhWaggleDemoState(14, null)).toMatchObject({ source: 'demo', distM: 2600 });
  });
  it('records opposite sun and dance changes with no food change in existing discovery evidence', () => {
    const state = BH.bhSetWaggleControl({ dance: 45, sun: 90 }, 'reference', 'food');
    const capture = lab => ({ version: 1, runKey: 'colony:777:1', lesson: 'waggle', mode: 'beekeeper', clock: 0, label: 'Dance decoder',
      metrics: Object.entries(BH.bhWaggleReading(lab)).map(([id, value]) => ({ id, value, label: id, unit: '°', angle: true })) });
    const result = BH.bhDiscoveryComparison(capture(state), capture(BH.bhSetWaggleControl(state, 'sun', 105)));
    expect(result.rows.map(row => [row.id, row.delta])).toEqual([['dance', -15], ['sun', 15], ['food', 0]]);
    expect(result.unchanged).toBe(false);
  });
  it('gives young learners arrow observations and older learners reference-frame reasoning', () => {
    expect(BH.bhWaggleLesson('K–2', true).reasoning).toContain('Look at both arrows');
    expect(BH.bhWaggleLesson('3–5', true).reasoning).toContain('move only the sun');
    expect(BH.bhWaggleLesson('6–8', true).reasoning).toContain('shortest turn');
    expect(BH.bhWaggleLesson('9–12', true).reasoning).toContain('modulo 360°');
    expect(BH.bhWaggleLesson('9–12', false).question).toContain('dance angle stays fixed');
  });

  it('starts with the original free decoder and changes no colony inputs when food is held', async () => {
    await mount({ waggleLab: { dance: 45, sun: 90, distance: 1200, teacherNote: 'Keep me' } });
    const before = simulation();
    expect(lab().querySelector('#bee-waggle-hold-dance').checked).toBe(true);
    expect(lab().querySelector('output').textContent).toContain('135°');
    await click('#bee-waggle-hold-food');
    await act(async () => input('#bee-waggle-sun', 105));
    expect(latest.beehive.waggleLab).toEqual({ dance: 30, sun: 105, fixedFood: 135, distance: 1200, teacherNote: 'Keep me' });
    expect(lab().querySelector('#bee-waggle-angle').disabled).toBe(true);
    expect(lab().querySelector('[data-waggle-angle-reading]').textContent).toBe('30°');
    expect(lab().querySelector('output strong').textContent).toBe('135°'); expect(simulation()).toEqual(before);
  });
  it('uses the latest decoder state for controls changed in the same React batch', async () => {
    await mount(); const before = simulation();
    await act(async () => { lab().querySelector('#bee-waggle-hold-food').click(); input('#bee-waggle-sun', 180); });
    expect(latest.beehive.waggleLab).toEqual({ dance: -45, sun: 180, fixedFood: 135 });
    expect(simulation()).toEqual(before);
  });
  it('reopens a saved held destination consistently without rewriting other saved settings', async () => {
    const waggleLab = { fixedFood: 135, sun: 165, dance: 45, teacherNote: 'Keep me' };
    await mount({ waggleLab });
    expect(lab().querySelector('#bee-waggle-hold-food').checked).toBe(true);
    expect(lab().querySelector('#bee-waggle-angle').value).toBe('-30');
    expect(lab().querySelector('output strong').textContent).toBe('135°');
    expect(latest.beehive.waggleLab).toEqual(waggleLab);
  });
  it('represents saved angles between normal slider steps and just before north faithfully', async () => {
    await mount({ waggleLab: { dance: -30.5, sun: 359 } });
    expect(lab().querySelector('#bee-waggle-angle').value).toBe('-30.5');
    expect(lab().querySelector('#bee-waggle-sun').value).toBe('359');
    expect(lab().querySelector('output strong').textContent).toBe('328.5°');
  });
  it('shows useful angle precision without changing the saved geometry or leaking floating-point digits', async () => {
    expect(BH.bhWaggleAngleText(2.6000000000000227)).toBe('2.6');
    expect(BH.bhWaggleAngleText(359.9999)).toBe('0');
    expect(BH.bhWaggleDirectionText(-30.100000000000023)).toBe('30.1 degrees left of up');
    const waggleLab = { dance: 45, sun: 136.60000000000002 };
    await mount({ waggleLab });
    expect(lab().querySelector('label[for="bee-waggle-sun"] strong').textContent).toBe('136.6°');
    expect(lab().querySelector('output strong').textContent).toBe('181.6°');
    expect(latest.beehive.waggleLab).toEqual(waggleLab);
  });
  it('captures fractional readings and the held reference without rounding to a different direction', async () => {
    await mount({ waggleLab: { dance: -30.5, sun: 359 } });
    function capture() {
      const control = Array.from(host.querySelectorAll('[data-beehive-discovery] button')).find(node => /(?:Capture|Update) observation/.test(node.textContent));
      expect(control).toBeTruthy(); control.click();
    }
    await act(async () => capture());
    let snapshot = latest.beehive.discoveryRecords.waggle.snapshot;
    expect(snapshot.label).toContain('dance angle held');
    expect(snapshot.metrics.map(m => m.value)).toEqual([-30.5, 359, 328.5]);
    await click('#bee-waggle-hold-food'); await act(async () => capture());
    snapshot = latest.beehive.discoveryRecords.waggle.snapshot;
    expect(snapshot.label).toContain('food location fixed');
    expect(snapshot.metrics.map(m => m.value)).toEqual([-30.5, 359, 328.5]);
  });
  it('resets angles without erasing writing or changing the paused colony', async () => {
    await mount({ waggleLab: { dance: -90, sun: 210, fixedFood: 120, teacherNote: 'Keep me' },
      notebook: { beekeeper: { claim: 'My claim', reasoning: 'My reasoning' }, discoveries: { waggle: { explanation: 'Keep this discovery' } } } });
    const before = simulation(); await click('.bee-discovery-button[data-secondary]');
    expect(latest.beehive.waggleLab).toEqual({ dance: 45, sun: 90, teacherNote: 'Keep me' });
    expect(lab().querySelector('#bee-waggle-angle').disabled).toBe(false); expect(simulation()).toEqual(before);
  });
  it('adapts the prompt to the host grade without changing the saved trial', async () => {
    await mount({ waggleLab: { fixedFood: 135, sun: 90, dance: 45 } }); const before = structuredClone(latest);
    await act(async () => setGrade('Kindergarten'));
    expect(lab().querySelector('[data-waggle-grade]').dataset.waggleGrade).toBe('K–2');
    expect(lab().textContent).toContain('The flowers stay in one place');
    await act(async () => setGrade('11th Grade'));
    expect(lab().textContent).toContain('signed dance-angle change'); expect(latest).toEqual(before);
  });
  it('offers the same decoder once in the expanded layout', async () => {
    await mount({ focusLayout: false, discoveryLesson: 'stores' });
    expect(host.querySelectorAll('[data-waggle-lab]')).toHaveLength(1);
    await click('#bee-waggle-hold-food');
    expect(latest.beehive.waggleLab.fixedFood).toBe(135);
    const angles = structuredClone(latest.beehive.waggleLab);
    await click('.bee-discovery-button:not([data-secondary])');
    expect(latest.beehive.focusLayout).toBe(true); expect(latest.beehive.discoveryLesson).toBe('waggle');
    expect(host.querySelector('#bee-discovery-title')).toBeTruthy();
    expect(latest.beehive.waggleLab).toEqual(angles);
  });
});
