import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [], originalPoint = { x: .2, y: .3, type: 'dot' };
const note = { 'frog|dorsal_skin': 'The saved observation stays separate from drawing.' };
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
async function mount(patch = {}) {
  const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), token = {}, awardXP = vi.fn(); let state;
  function Lab() {
    const [data, setter] = React.useState({ dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, annotateMode: true, annotations: [{ ...originalPoint }],
      exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { ...note }, organConfidence: { 'frog|dorsal_skin': 2 }, ...patch,
    } });
    state = data.dissection;
    return config.render(makeCtx({ toolData: data, setToolData: setter, pluginInstanceToken: token, awardXP }));
  }
  const lab = { host, awardXP, get state() { return state; },
    get start() { return host.querySelector('[data-diss-point-new-line]'); },
    async click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); await act(async () => { await settle(); }); },
    async key(key) { const canvas = host.querySelector('[data-diss-canvas]');
      await act(async () => { canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); }); await act(async () => { await settle(); }); },
    async close() { await act(async () => root.unmount()); host.remove(); },
  };
  fixtures.push(lab); await act(async () => root.render(React.createElement(Lab))); await act(async () => { await settle(); }); return lab;
}
function evidence(state) { return structuredClone(Object.fromEntries(['exploredOrgans', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'procedureByLayer', 'quizScore', 'quizTotal'].map(key => [key, state[key]]))); }
beforeEach(() => { localStorage.clear(); resetStemLab(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });
afterEach(async () => { for (const f of fixtures.splice(0).reverse()) await f.close(); vi.restoreAllMocks(); localStorage.clear(); });

describe('separate observation annotation lines', () => {
  it('starts a disconnected point then connects subsequent points without changing learner evidence', async () => {
    const lab = await mount(), before = evidence(lab.state);
    await lab.click(lab.start); expect(lab.start.getAttribute('aria-pressed')).toBe('true');
    expect(lab.host.querySelector('[data-diss-point-status]').textContent).toContain('Next point starts a separate line');
    await lab.key('Home'); await lab.key('Enter');
    expect(lab.state.annotations).toHaveLength(2); expect(lab.state.annotations[0]).toEqual(originalPoint);
    expect(lab.state.annotations[1].type).toBe('dot');
    const newStart = { ...lab.state.annotations[1] };
    expect(lab.state.annotations[1]).not.toHaveProperty('prevX'); expect(lab.state.annotations[1]).not.toHaveProperty('prevY');
    expect(lab.start.getAttribute('aria-pressed')).toBe('false');
    await lab.key('End'); await lab.key('Enter');
    expect(lab.state.annotations[2]).toMatchObject({ prevX: newStart.x, prevY: newStart.y });
    expect(evidence(lab.state)).toEqual(before); expect(lab.awardXP).not.toHaveBeenCalled();
  });

  it('can cancel a pending new line before placing its first point', async () => {
    const lab = await mount(); await lab.click(lab.start); await lab.click(lab.start);
    expect(lab.start.getAttribute('aria-pressed')).toBe('false');
    await lab.key('Home'); await lab.key('Enter');
    expect(lab.state.annotations[1]).toMatchObject({ prevX: originalPoint.x, prevY: originalPoint.y });
  });

  it('requires an existing point before offering another line', async () => {
    const lab = await mount({ annotations: [] }); expect(lab.start.disabled).toBe(true);
    await lab.key('Home'); await lab.key('Enter'); expect(lab.start.disabled).toBe(false);
    expect(lab.state.annotations[0]).not.toHaveProperty('prevX');
  });

  it('keeps previous lines when undo removes a point from the new line', async () => {
    const lab = await mount(); await lab.click(lab.start); await lab.key('Home'); await lab.key('Enter');
    await lab.key('End'); await lab.key('Enter');
    await lab.click(lab.host.querySelector('[data-diss-point-undo]'));
    expect(lab.state.annotations).toHaveLength(2); expect(lab.state.annotations[0]).toEqual(originalPoint);
    expect(lab.state.annotations[1]).not.toHaveProperty('prevX');
  });

  it('discards the pending choice on returning to instruments', async () => {
    const lab = await mount(); await lab.click(lab.start); await lab.click(lab.host.querySelector('[data-diss-point-exit]'));
    expect(lab.state._annotationBreakScope).toBeNull(); expect(lab.state.annotations).toEqual([originalPoint]);
  });

  it('discards the pending choice on an actual view or layer change', async () => {
    const lab = await mount({ revealedLayers: { skin: true } }); await lab.click(lab.start);
    await lab.click(lab.host.querySelector('[data-spatial-view="ventral"]'));
    expect(lab.state._annotationBreakScope).toBeNull(); await lab.click(lab.start);
    const nextLayer = [...lab.host.querySelectorAll('[data-dissection-layer-stepper] button')].find(button => button.getAttribute('aria-label')?.startsWith('Layer 2:'));
    await lab.click(nextLayer); expect(lab.state.activeLayer).toBe('muscle'); expect(lab.state._annotationBreakScope).toBeNull();
    expect(lab.state.annotations).toEqual([originalPoint]);
  });

  it('persists disconnected geometry using the existing annotation format', async () => {
    const lab = await mount(); await lab.click(lab.start); await lab.key('Home'); await lab.key('Enter');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); });
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.annotations).toEqual(lab.state.annotations); expect(saved).not.toHaveProperty('_annotationBreakScope');
    const reload = await mount({ _dissLoadedSpec: null, annotations: [] });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
    expect(reload.state.annotations).toEqual(saved.annotations);
  });

  it('renders separate strokes without drawing a connector between the old and new lines', async () => {
    const lab = await mount(); await lab.click(lab.start); await lab.key('Home'); await lab.key('Enter'); await lab.key('End'); await lab.key('Enter');
    const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
    const start = source.indexOf('  function drawDissectionAnnotations('), end = source.indexOf('\n  function dissectionEvidenceNote', start);
    const validateStart = source.indexOf('  function isValidDissectionAnnotation(');
    const draw = new Function('isPlainDissectionRecord', source.slice(validateStart, end) + '; return drawDissectionAnnotations;')(value => value && typeof value === 'object' && !Array.isArray(value));
    const ctx = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn() };
    draw(ctx, lab.state.annotations, 500, 600);
    expect(ctx.arc).toHaveBeenCalledTimes(3); expect(ctx.lineTo).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalledWith(lab.state.annotations[1].x * 500, lab.state.annotations[1].y * 600);
  });
});
