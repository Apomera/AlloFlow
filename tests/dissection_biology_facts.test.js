import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

function learnerWork(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence',
    'procedureByLayer', 'annotations', 'quizScore', 'quizTotal'].map(key => [key, state[key]])));
}

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn();
  let state, update;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', selectedOrgan: null, hoveredOrgan: null,
    visualRealism: 'accessible', reducedMotion: false, soundEnabled: false,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Transparent membrane observed.' }, organConfidence: { 'frog|nictitating': 2 },
    procedureByLayer: { skin: { inspected: true, history: ['inspect'], actionLog: [{ action: 'inspect', at: 50 }] } },
    annotations: [{ type: 'dot', x: .4, y: .4 }], quizScore: 1, quizTotal: 2,
    ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection; update = setToolData;
    return config.render(makeCtx({ toolData, setToolData, awardXP }));
  }
  const fixture = {
    host, awardXP, get state() { return state; },
    get fact() { return host.querySelector('.diss-biology-fact'); },
    get reading() { return this.fact.querySelector('[role="status"]'); },
    get text() { return this.reading.querySelector('p:not(.diss-biology-fact__position)').textContent; },
    get position() { return this.reading.textContent.match(/Fact (\d+) of (\d+)/).slice(1).map(Number); },
    button(direction) { return this.fact.querySelector('button[aria-label="' + direction + ' biology fact"]'); },
    async click(node) {
      expect(node).not.toBeNull();
      await act(async () => { node.click(); });
      await act(async () => { await settle(); });
    },
    async patch(next) {
      await act(async () => { update(previous => ({ ...previous, dissection: { ...previous.dissection, ...next } })); });
      await act(async () => { await settle(); });
    },
    async close() {
      await act(async () => { root.unmount(); }); host.remove();
      await act(async () => { await settle(); });
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return fixture;
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await new Promise(resolve => setTimeout(resolve, 150));
  localStorage.clear(); document.getElementById('allo-live-dissection')?.remove();
  window._dissectionKeyHandler = null; vi.restoreAllMocks();
});

describe('learner-controlled biology facts', () => {
  it('keeps an open fact stable as time passes and unrelated lab updates render', async () => {
    let now = 0; vi.spyOn(Date, 'now').mockImplementation(() => now);
    const f = await mountLab(), before = learnerWork(f.state);
    await f.click(f.fact.querySelector('summary'));
    expect(f.fact.open).toBe(true);
    const text = f.text, position = f.position;
    const summary = f.fact.querySelector('summary'); summary.focus();
    for (const at of [8000, 30000, 120000]) {
      now = at; await f.patch({ timeSpent: at / 1000, hoveredOrgan: at === 8000 ? 'tympanum' : null });
      expect(f.text).toBe(text); expect(f.position).toEqual(position);
      expect(f.fact.open).toBe(true); expect(document.activeElement).toBe(summary);
    }
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('moves in either direction and wraps while retaining focus and keeping learner work intact', async () => {
    const f = await mountLab({ reducedMotion: true }), before = learnerWork(f.state);
    await f.click(f.fact.querySelector('summary'));
    const first = f.text, total = f.position[1];
    expect(f.position[0]).toBe(1); expect(total).toBeGreaterThan(1);
    expect(f.fact.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(f.reading.getAttribute('aria-live')).toBe('polite');
    expect(f.reading.getAttribute('aria-atomic')).toBe('true');
    const next = f.button('Next'); next.focus(); await f.click(next);
    const second = f.text;
    expect(second).not.toBe(first); expect(f.position).toEqual([2, total]);
    expect(document.activeElement).toBe(next); expect(f.fact.open).toBe(true);
    const previous = f.button('Previous'); previous.focus(); await f.click(previous);
    expect(f.text).toBe(first); expect(f.position).toEqual([1, total]); expect(document.activeElement).toBe(previous);
    await f.click(previous);
    const last = f.text;
    expect(last).not.toBe(first); expect(f.position).toEqual([total, total]); expect(document.activeElement).toBe(previous);
    next.focus(); await f.click(next);
    expect(f.text).toBe(first); expect(f.position).toEqual([1, total]); expect(document.activeElement).toBe(next);
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('retains a separate chosen fact when the learner switches specimens and returns', async () => {
    const f = await mountLab();
    await f.click(f.fact.querySelector('summary'));
    await f.click(f.button('Next')); const frog = f.text;
    expect(f.position[0]).toBe(2);
    await f.click(f.host.querySelector('#diss-specimen-tab-crayfish'));
    expect(f.state.specimen).toBe('crayfish'); expect(f.position[0]).toBe(1); expect(f.text).not.toBe(frog);
    if (!f.fact.open) await f.click(f.fact.querySelector('summary'));
    await f.click(f.button('Next')); await f.click(f.button('Next')); const crayfish = f.text;
    expect(f.position[0]).toBe(3);
    await f.click(f.host.querySelector('#diss-specimen-tab-frog'));
    expect(f.state.specimen).toBe('frog'); expect(f.position[0]).toBe(2); expect(f.text).toBe(frog);
    await f.click(f.host.querySelector('#diss-specimen-tab-crayfish'));
    expect(f.position[0]).toBe(3); expect(f.text).toBe(crayfish);
    expect(f.awardXP).not.toHaveBeenCalled();
  });

  it.each([-1, 1.5, Infinity, 999])('recovers an invalid retained fact index %s to the first available fact', async index => {
    const f = await mountLab({ biologyFactIndexBySpecimen: { frog: index } });
    await f.click(f.fact.querySelector('summary'));
    expect(f.position[0]).toBe(1); expect(f.text).toMatch(/frog/i); expect(f.text.trim()).not.toBe('');
    const before = learnerWork(f.state);
    await f.click(f.button('Next'));
    expect(f.position[0]).toBe(2); expect(f.text.trim()).not.toBe('');
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('ignores an array-shaped retained map even when it has a valid-looking specimen property', async () => {
    const indices = []; indices.frog = 2;
    const f = await mountLab({ biologyFactIndexBySpecimen: indices }), before = learnerWork(f.state);
    await f.click(f.fact.querySelector('summary'));
    expect(f.position[0]).toBe(1);
    await f.click(f.button('Next'));
    expect(f.position[0]).toBe(2);
    expect(learnerWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps navigation local to one mounted lab', async () => {
    const first = await mountLab(), second = await mountLab();
    await first.click(first.fact.querySelector('summary')); await second.click(second.fact.querySelector('summary'));
    for (const lab of [first, second]) for (const direction of ['Previous', 'Next']) {
      const controls = lab.button(direction).getAttribute('aria-controls');
      expect(controls).toBeTruthy(); expect(document.getElementById(controls)).toBe(lab.reading);
    }
    const retained = second.text, before = learnerWork(second.state);
    await first.click(first.button('Next'));
    expect(first.position[0]).toBe(2); expect(second.position[0]).toBe(1); expect(second.text).toBe(retained);
    expect(learnerWork(second.state)).toEqual(before);
    expect(first.awardXP).not.toHaveBeenCalled(); expect(second.awardXP).not.toHaveBeenCalled();
  });
});
