// 2026-09-27 Anchor Chart fixes: A1 reviewed icon descriptions reach the page (and are dropped
// when the picture is replaced), A3 malformed AI grading earns no feedback or XP, A4 the grading
// error alert stays visible and a late failure after unmount is silent.
// FIX0927_ANCHOR_MODULE=<path> loads a candidate copy (mutation checks).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let View, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(process.env.FIX0927_ANCHOR_MODULE || resolve('anchor_charts_module.js'), 'utf8'))();
  View = window.AlloModules.AnchorChartView;
});
afterEach(() => { try { if (root) act(() => root.unmount()); } catch (_) {} root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
const t = () => '';
function mount(props) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(React.createElement(View, props))); }
const ALT = 'Arrows lead from plant roots up the stem to a leaf pore.';
const chart = (section = {}, armed = false) => ({ id: 'a1', type: 'anchor-chart', data: { title: 'Water cycle', chartType: 'process', interactive: { armed, rubric: 'Explain transpiration' },
  sections: [{ id: 's1', label: 'Transpiration', bullets: ['Water leaves leaves'], iconUrl: 'data:image/png;base64,AAAA', ...section }],
  studentAnswers: armed ? { s1: { 's1-bullet-0': 'Water goes up the plant' } } : {} } });

describe('Anchor chart structure for screen readers', () => {
  it('section labels are headings, process steps are announced, and students never see the image prompt', () => {
    const data = { ...chart().data, chartType: 'process', sections: [
      { id: 's1', label: 'Evaporate', bullets: ['Sun heats water'], iconUrl: '', iconPrompt: 'a simple sun icon' },
      { id: 's2', label: 'Condense', bullets: ['Clouds form'], iconUrl: 'data:image/png;base64,AAAA' },
    ] };
    mount({ generatedContent: { ...chart(), data }, isTeacherMode: false, handleNoteUpdate: vi.fn(), t });
    const headings = [...host.querySelectorAll('h2.ac-section-label')].map(h => h.textContent);
    expect(headings).toEqual(['Step 1 Evaporate', 'Step 2 Condense']);
    expect(host.querySelector('h2.ac-section-label .sr-only').textContent.trim()).toBe('Step 1');
    expect(host.textContent).not.toContain('a simple sun icon');
    act(() => root.render(React.createElement(View, { generatedContent: { ...chart(), data }, isTeacherMode: true, handleNoteUpdate: vi.fn(), t })));
    expect(host.textContent).toContain('a simple sun icon');
    act(() => root.render(React.createElement(View, { generatedContent: { ...chart(), data: { ...data, chartType: 'reference' } }, isTeacherMode: false, handleNoteUpdate: vi.fn(), t })));
    expect(host.querySelector('h2.ac-section-label .sr-only')).toBeNull();
  });
});

describe('A1: icon descriptions', () => {
  it('uses a reviewed description and stays decorative only without one', () => {
    mount({ generatedContent: chart({ iconAlt: ALT, iconAltSource: 'author' }), isTeacherMode: false, handleNoteUpdate: vi.fn(), t });
    const img = host.querySelector('img');
    expect(img.getAttribute('alt')).toBe(ALT);
    expect(img.hasAttribute('role')).toBe(false);
    act(() => root.render(React.createElement(View, { generatedContent: chart(), isTeacherMode: false, handleNoteUpdate: vi.fn(), t })));
    expect(host.querySelector('img').getAttribute('alt')).toBe('');
    expect(host.querySelector('img').getAttribute('role')).toBe('presentation');
  });

  it('drops the old description when a new picture is drawn for the section', async () => {
    let records = { a1: chart({ iconUrl: '', iconPrompt: 'A leaf', iconAlt: 'Description of the OLD picture', iconAltSource: 'vision' }) };
    let finish; const image = new Promise(r => { finish = r; });
    mount({ generatedContent: records.a1, isTeacherMode: true, allowRuntimeAi: true, callImagen: () => image, callGeminiImageEdit: null, t,
      onUpdateResource: (id, update) => { records[id] = update(records[id]); }, handleNoteUpdate: vi.fn() });
    await act(async () => { finish('data:image/png;base64,TkVX'); await Promise.resolve(); });
    const section = records.a1.data.sections[0];
    expect(section.iconUrl).toBe('data:image/png;base64,TkVX');
    expect(section.iconAlt).toBeUndefined();
    expect(section.iconAltSource).toBeUndefined();
  });
});

async function grade(reply, { reject = false, props = {} } = {}) {
  let settle; const write = vi.fn(), addXp = vi.fn(), toast = vi.fn();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  mount({ generatedContent: chart({}, true), isTeacherMode: false, allowRuntimeAi: true, callGemini: () => new Promise((res, rej) => { settle = reject ? rej : res; }),
    handleNoteUpdate: write, addToast: toast, addXp, t, ...props });
  await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Submit for AI feedback')).click());
  return { write, addXp, toast, finish: async () => { await act(async () => { settle(reject ? new Error('network') : JSON.stringify(reply)); await Promise.resolve(); await Promise.resolve(); }); } };
}
const storedFeedback = write => write.mock.calls.filter(c => c[0] === 'feedback' && c[1]).map(c => c[1]);

describe('A3: grading output is validated before feedback or XP', () => {
  it('rejects non-string feedback and awards no XP', async () => {
    const run = await grade({ strength: { text: 'Nice' }, growthNudge: ['a', 'b'], suggestedXP: 50 });
    await run.finish();
    expect(storedFeedback(run.write)).toEqual([]);
    expect(run.addXp).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('awards no XP for a non-numeric score and clamps a numeric one', async () => {
    let run = await grade({ strength: 'You named the stem.', growthNudge: 'Add why water moves.', suggestedXP: '50' });
    await run.finish();
    expect(storedFeedback(run.write)[0]).toMatchObject({ strength: 'You named the stem.', growthNudge: 'Add why water moves.', xpAwarded: 0 });
    expect(run.addXp).not.toHaveBeenCalled();
    act(() => root.unmount()); root = null; host.remove();
    run = await grade({ strength: 'Good.', growthNudge: 'Try an example.', suggestedXP: 500 });
    await run.finish();
    expect(run.addXp).toHaveBeenCalledWith(120);
  });
});

describe('A4: grading failures', () => {
  it('keeps the in-panel error visible after a failure', async () => {
    const run = await grade(null, { reject: true });
    await run.finish();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Try again');
    expect(host.querySelector('[role="alert"]').textContent).not.toMatch(/[–—]/);
    expect(run.toast).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the failure arrives after the chart closed', async () => {
    const run = await grade(null, { reject: true });
    act(() => root.unmount()); root = null;
    await run.finish();
    expect(run.toast).not.toHaveBeenCalled();
  });
});
