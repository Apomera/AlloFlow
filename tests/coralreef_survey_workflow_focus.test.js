import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let scroll, oldScroll;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  scroll = vi.fn(); Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks();
});
const q = (t, selector) => t.host.querySelector(selector);
const button = (t, text) => [...t.host.querySelectorAll('button')].find(e => e.textContent.trim() === text);
const namedGroup = (t, name) => [...t.host.querySelectorAll('[role="group"]')].find(e => e.getAttribute('aria-label') === name);
async function click(e) { expect(e, 'control exists').toBeTruthy(); await React.act(async () => { e.focus(); e.click(); }); }
async function mount(seed = {}, reduceMotion = true) {
  let data = { coralReef: { section: 'survey', speciesFieldNotes: { clownfish: 'Keep this note' }, ...seed } }, update;
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    update = patch => setState(previous => ({ ...previous, coralReef: { ...previous.coralReef, ...patch } }));
    return React.createElement('div', null, React.createElement('button', { 'data-outside': true }, 'Outside control'), window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, reduceMotion }));
  }
  const t = { host, root, get data() { return data.coralReef; }, async update(patch) { await React.act(async () => update(patch)); } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); scroll.mockClear(); return t;
}
function expectRevealed(t, stage) {
  const title = q(t, '[data-survey-stage-title="' + stage + '"]');
  expect(title, 'destination stage heading').toBeTruthy(); expect(document.activeElement).toBe(title);
  expect(scroll.mock.contexts).toEqual([title]); expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' }); scroll.mockClear();
}

describe('survey workflow keyboard focus continuity', () => {
  it('reveals the destination heading when a forward action removes its focused button', async () => {
    const t = await mount({ records: { 0: 'sand' }, fishCounts: { parrotfish: 3 } });
    await click(button(t, 'Go to the fish count')); expect(t.data.surveyStage).toBe('fish'); expectRevealed(t, 'fish');
    await click(button(t, 'See my results')); expect(t.data.surveyStage).toBe('results'); expectRevealed(t, 'results');
    expect(t.data.records).toEqual({ 0: 'sand' }); expect(t.data.fishCounts).toEqual({ parrotfish: 3 }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' });
  });
  it('keeps persistent survey step controls focused and does not add a redundant scroll', async () => {
    const t = await mount(), buttons = [...namedGroup(t, 'Survey steps').querySelectorAll('button')];
    for (const index of [1, 2, 0]) { await click(buttons[index]); expect(document.activeElement).toBe(buttons[index]); }
    expect(scroll).not.toHaveBeenCalled();
  });
  it.each([0, 13])('reveals the selected point heading after correction at point %s', async index => {
    const t = await mount({ surveyStage: 'results' });
    await click(q(t, '[data-transect-strip] button[data-point="' + index + '"]'));
    const title = q(t, '#cr-point-title'); expect(t.data.surveyStage).toBe('points'); expect(t.data.pointIndex).toBe(index);
    expect(document.activeElement).toBe(title); expect(title.textContent).toContain('Point ' + (index + 1) + ' of 40'); expect(scroll.mock.contexts).toEqual([title]);
  });
  it('also restores point context from the written correction list', async () => {
    const t = await mount({ surveyStage: 'results' }); await click(button(t, 'Go to this point'));
    expect(document.activeElement).toBe(q(t, '#cr-point-title')); expect(t.data.pointIndex).toBe(0); expect(scroll.mock.contexts).toEqual([q(t, '#cr-point-title')]);
  });
  it('starts a new transect at its tape heading while clearing only survey records', async () => {
    const t = await mount({ surveyStage: 'results', records: { 0: 'sand' }, fishCounts: { parrotfish: 3 } });
    await click(button(t, 'Survey another transect at this reef')); expectRevealed(t, 'points');
    expect(t.data.records).toEqual({}); expect(t.data.fishCounts).toEqual({}); expect(t.data.pointIndex).toBe(0); expect(t.data.surveyTransect).toBe(2); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' });
  });
  it.each([false, true])('returns confirmation focus to the requested reef button (confirm=%s)', async confirm => {
    const t = await mount({ records: { 0: 'sand' }, surveyStage: 'results' }), sites = [...namedGroup(t, 'Survey sites').querySelectorAll('button')], request = sites[1];
    await click(request); expect(document.activeElement).toBe(request); expect(q(t, '[role="alert"]')).toBeTruthy();
    await click(button(t, confirm ? 'Switch and clear my records' : 'Stay here'));
    expect(q(t, '[role="alert"]')).toBeNull(); expect(document.activeElement).toBe(request); expect(scroll.mock.contexts).toEqual([request]);
    if (confirm) { expect(request.getAttribute('aria-pressed')).toBe('true'); expect(t.data.records).toEqual({}); expect(t.data.surveyStage).toBe('points'); }
    else { expect(t.data.records).toEqual({ 0: 'sand' }); expect(t.data.surveyStage).toBe('results'); }
  });
  it('does not steal focus on mount or unrelated external stage changes', async () => {
    const t = await mount(), outside = q(t, '[data-outside]'); outside.focus(); await t.update({ surveyStage: 'fish' });
    expect(document.activeElement).toBe(outside); expect(scroll).not.toHaveBeenCalled();
  });
  it('does not reclaim pending workflow focus after the user chooses a persistent control', async () => {
    const t = await mount(), next = button(t, 'Go to the fish count'), outside = q(t, '[data-outside]');
    await React.act(async () => { next.focus(); next.click(); outside.focus(); });
    expect(t.data.surveyStage).toBe('fish'); expect(document.activeElement).toBe(outside); expect(scroll).not.toHaveBeenCalled();
  });
  it('keeps the correction point context when a saved 3D view mounts inside it', async () => {
    const t = await mount({ surveyStage: 'results', surveyView: '3d' });
    await click(q(t, '[data-transect-strip] button[data-point="13"]'));
    const title = q(t, '#cr-point-title'); expect(q(t, '[data-survey-dive-title]')).toBeTruthy();
    expect(document.activeElement).toBe(title); expect(scroll.mock.contexts).toEqual([title]); expect(t.data.pointIndex).toBe(13);
  });
  it('keeps a persistent step button focused when returning to a saved 3D view', async () => {
    const t = await mount({ surveyStage: 'fish', surveyView: '3d' }), steps = [...namedGroup(t, 'Survey steps').querySelectorAll('button')];
    await click(steps[0]); expect(q(t, '[data-survey-dive-title]')).toBeTruthy(); expect(document.activeElement).toBe(steps[0]); expect(scroll).not.toHaveBeenCalled();
  });
  it('still reveals the 3D title when the learner explicitly opens the dive view', async () => {
    const t = await mount(); await click(button(t, 'Dive view (3D)'));
    const title = q(t, '[data-survey-dive-title]'); expect(document.activeElement).toBe(title); expect(scroll.mock.contexts).toEqual([title]);
  });
  it('respects an external focus move while a correction mounts a saved 3D view', async () => {
    const t = await mount({ surveyStage: 'results', surveyView: '3d' }), correction = q(t, '[data-transect-strip] button[data-point="13"]'), outside = q(t, '[data-outside]');
    await React.act(async () => { correction.focus(); correction.click(); outside.focus(); });
    expect(q(t, '[data-survey-dive-title]')).toBeTruthy(); expect(document.activeElement).toBe(outside); expect(scroll).not.toHaveBeenCalled();
  });
});
