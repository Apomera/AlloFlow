// Follow-up from the independent hunt (2026-11-05): a half-turn key for the protractor.
// Failed on the start copy; ANGLES_DEEP_SRC points at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [], live = null, xp = [], said = [], scoreNow = null;

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null; xp = []; said = []; scoreNow = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  vi.restoreAllMocks();
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(45);
    const [angleChallenge, setAngleChallenge] = React.useState(null);
    const [angleFeedback, setAngleFeedback] = React.useState(null);
    const [exploreScore, setExploreScore] = React.useState({ correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: {} });
    live = toolData.protractor || {}; scoreNow = exploreScore;
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      announceToSR: (m) => said.push(m),
      addToast: () => {},
      t: (k, fb) => fb || k,
    }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}
const key = async (el, k, opts) => {
  let ev;
  await React.act(async () => { ev = new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {})); el.dispatchEvent(ev); });
  return ev;
};
const task = (base, open, m) => ({ base, open, m, vx: 210, vy: 175, tol: 1, start: { x: 130, y: 240, rot: 0 } });
const prot = (c) => c.querySelector('[data-angles-protractor]');

describe('End turns the protractor half a turn', () => {
  it('the one press fixes a baseline at the far end, and the page does not scroll', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, soundEnabled: false } });
    const ev = await key(prot(c), 'End');
    expect(live.mPlace).toEqual({ x: 210, y: 175, rot: 40 });
    expect(ev.defaultPrevented, 'End would scroll to the bottom of the page').toBe(true);
    // A second press goes back: the same fixed turn, not a toggle to some home position.
    await key(prot(c), 'End');
    expect(live.mPlace.rot).toBe(220);
  });

  it('is announced like any other turn, and names no answer', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, soundEnabled: false } });
    await key(prot(c), 'End');
    const msg = said[said.length - 1];
    expect(msg).toMatch(/baseline/);
    expect(msg.includes('62')).toBe(false);
    expect(/inner|outer|\bscale at\b/i.test(msg)).toBe(false);
    // Turned to the wrong end, it says so, the same as Page Down would.
    said.length = 0;
    const d = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 40 }, soundEnabled: false } });
    await key(prot(d), 'End');
    expect(said[said.length - 1]).toMatch(/misses the scale/);
  });

  it('shows nothing a student could not reach with Page keys: same readout as turning 180 one degree at a time', async () => {
    const a = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, soundEnabled: false } });
    await key(prot(a), 'End');
    const viaEnd = a.querySelector('[data-angles-prot-desc]').textContent;
    const b = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, soundEnabled: false } });
    for (let i = 0; i < 180; i++) await key(prot(b), 'PageUp');
    expect(b.querySelector('[data-angles-prot-desc]').textContent).toBe(viaEnd);
  });

  it('earns nothing, uses no try, and answers nothing', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, mTries: 0, soundEnabled: false } });
    for (let i = 0; i < 6; i++) await key(prot(c), 'End');
    expect(xp).toEqual([]);
    expect(live.mTries).toBe(0);
    expect(live.mResult == null).toBe(true);
    expect(scoreNow).toEqual({ correct: 0, total: 0 });
  });

  it('a closed item does not turn', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 210, y: 175, rot: 220 }, mResult: { ok: true, code: 'ok' }, mTries: 1, soundEnabled: false } });
    await key(prot(c), 'End');
    expect(live.mPlace.rot).toBe(220);
  });

  it('draw mode: it turns the protractor, not the student\'s ray', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'draw', dTask: Object.assign(task(40, 1, 62), { drawStart: 200 }), dPlace: { x: 210, y: 175, rot: 220 }, dDir: 200, soundEnabled: false } });
    await key(prot(c), 'End');
    expect(live.dPlace.rot).toBe(40);
    expect(live.dDir).toBe(200);
  });

  it('the keyboard help says so', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task(40, 1, 62), mPlace: { x: 40, y: 40, rot: 0 }, soundEnabled: false } });
    expect(prot(c).getAttribute('aria-label')).toBe('Protractor. Arrow keys move it; Shift for small steps. Page Up and Page Down turn it one degree; Shift for 15 degrees. End turns it half a turn.');
    expect(prot(c).getAttribute('aria-keyshortcuts')).toContain('End');
  });
});
