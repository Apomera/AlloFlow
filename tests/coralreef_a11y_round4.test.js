import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Coral Reef Survey Lab, accessibility round 4 (lane a11y, 2026-11-04). One test per fix:
// 1. focus that fell to <body> when a button replaced its own card (Reef future, Reef science);
// 2. a live region that re-read the whole cause diagram on every year step (Reef future);
// 3. the seaweed lab result read aloud twice;
// 4. dive selects whose border failed 3:1 (Dive and explore);
// 5. 24 px hit areas for sliders and disclosure rows, and the current practice point in forced colors.

vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, S;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSci; });
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
});

async function mount(seed = {}, theme) {
  let data = { coralReef: { ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const said = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, theme, t: (k, f) => f || k, announceToSR: (m) => said.push(m) });
  }
  const item = { host, root, said, get d() { return data.coralReef; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); });
// A keyboard press: focus the button, then activate it.
async function press(node) {
  expect(node, 'control exists').toBeTruthy();
  node.focus();
  expect(document.activeElement).toBe(node);
  await act(async () => { node.click(); await Promise.resolve(); });
  await settle();
}
const byText = (root, sel, re) => [...root.querySelectorAll(sel)].find((n) => re.test(n.textContent.trim()));
const panel = (host, id) => host.querySelector('#cr-scilab-panel-' + id);
const focusLost = () => !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected;

describe('fix 1: focus is not lost when a button replaces its own card (WCAG 2.4.3)', () => {
  it('Run the model moves focus to the Model result heading', async () => {
    const t = await mount({ section: 'model' });
    await press(byText(t.host, 'button', /^Lower than today$/));
    await press(byText(t.host, 'button', /^Run the model$/));
    expect(byText(t.host, 'button', /^Run the model$/)).toBeUndefined();
    const heading = t.host.querySelector('#cr-model-result');
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(focusLost()).toBe(false);
  });

  it('never moves focus on the first render, or when focus is still on a real control', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const t = await mount({ section: 'model', modelRevealedFor: { recent: true, warmer: true }, modelPredictions: { recent: { choice: 'lower' }, warmer: { choice: 'lower' } } });
    await settle();
    expect(document.activeElement).toBe(outside);
    outside.remove();
    // Picking a scenario that was already run reveals its result with focus kept on the picked button.
    await press(byText(t.host, 'button', /^Faster warming/));
    const picked = document.activeElement;
    expect(picked.textContent).toMatch(/Faster warming/);
    expect(picked.tagName).toBe('BUTTON');
  });

  it('Run the heatwave moves focus to what happened', async () => {
    const t = await mount({ section: 'science', sciTopic: 'heat' });
    const p = panel(t.host, 'heat');
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), addListener() {}, removeListener() {} });
    try {
      await press(byText(p, 'button', /^Some die, the rest recover$/));
      await press(byText(p, 'button', /^Run the heatwave$/));
      const results = p.querySelector('[aria-labelledby="cr-scilab-bleach-title"] > div[aria-live]');
      expect(document.activeElement).toBe(results);
      expect(results.getAttribute('tabindex')).toBe('-1');
      expect(results.textContent).toContain('You predicted: Some die, the rest recover. What happened:');
    } finally { delete window.matchMedia; }
  });

  it('Check the budget moves focus to the budget it shows', async () => {
    const t = await mount({ section: 'science', sciTopic: 'build' });
    const p = panel(t.host, 'build');
    await press(byText(p, 'button', /^Shrinking$/));
    await press(byText(p, 'button', /^Check the budget$/));
    const grid = p.querySelector('[aria-labelledby="cr-scilab-budget-title"] > .cr-scilab-grid');
    expect(document.activeElement).toBe(grid);
    expect(grid.textContent).toContain('You predicted: Shrinking.');
  });

  it('Start the experiment moves focus to the steps, Show the tipping points to the tipping points', async () => {
    const t = await mount({ section: 'science', sciTopic: 'seaweed' });
    const p = panel(t.host, 'seaweed');
    await press(byText(p, 'button', /^Yes, the same grazing brings it back$/));
    await press(byText(p, 'button', /^Start the experiment$/));
    expect(document.activeElement).toBe(p.querySelector('.cr-scilab-steps'));
    await press(byText(p, 'button', /^Show the tipping points$/));
    const tip = p.querySelector('[aria-labelledby="cr-scilab-sw-title"] > div[aria-live]');
    expect(document.activeElement).toBe(tip);
    expect(tip.textContent).toContain('You predicted: Yes, the same grazing brings it back.');
  });
});

describe('fix 1b: buttons that turn themselves off or leave the page hand focus on', () => {
  it('Next year at the last year passes focus to Previous year, and back again at year 0', async () => {
    const t = await mount({ section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } }, modelSurveyYear: 29 });
    const group = () => [...t.host.querySelectorAll('[role=group]')].find((g) => g.getAttribute('aria-label') === 'Choose the year');
    const yearButton = (re) => [...group().querySelectorAll('button')].find((b) => re.test(b.textContent));
    await press(yearButton(/^Next year$/));
    expect(t.d.modelSurveyYear).toBe(30);
    expect(yearButton(/^Next year$/).disabled).toBe(true);
    expect(document.activeElement).toBe(yearButton(/^Previous year$/));
    mounted.splice(mounted.indexOf(t), 1);
    await act(async () => t.root.unmount());
    t.host.remove();
    const u = await mount({ section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } }, modelSurveyYear: 1 });
    const g2 = () => [...u.host.querySelectorAll('[role=group]')].find((g) => g.getAttribute('aria-label') === 'Choose the year');
    const prev = [...g2().querySelectorAll('button')].find((b) => /^Previous year$/.test(b.textContent));
    await press(prev);
    expect(u.d.modelSurveyYear).toBe(0);
    expect(prev.disabled).toBe(true);
    expect(document.activeElement).toBe([...g2().querySelectorAll('button')].find((b) => /^Next year$/.test(b.textContent)));
  });

  it('a year step that keeps its button working leaves focus on it', async () => {
    const t = await mount({ section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } }, modelSurveyYear: 10 });
    const next = byText(t.host, 'button', /^Next year$/);
    await press(next);
    expect(t.d.modelSurveyYear).toBe(11);
    expect(document.activeElement).toBe(next);
  });

  it('dive navigator buttons that turn themselves off (Clear selection, Stop swimming) hand focus on', () => {
    const src = fs.readFileSync(TOOL, 'utf8');
    const start = src.indexOf('  function DiveNavigator(props) {');
    const body = src.slice(start, src.indexOf('  function DiveHabitatTrail(props) {', start));
    expect(body.length).toBeGreaterThan(1000);
    expect(body.includes('var a11yNavCall = call;')).toBe(true);
    expect(body.includes("document.querySelectorAll('[data-dive-navigation] [role=group] button')")).toBe(true);
    expect(body.includes('}, !!env.ctx.reduceMotion, 1200);')).toBe(true);
    // Clear selection and Stop swimming go through call(), so they get the hand-off.
    expect(body.includes("onClick: function () { call('clearFocus'); }")).toBe(true);
    expect(body.includes("onClick: function () { call('cancelSwim'); }")).toBe(true);
  });

  it('Look at the nearest one (dive) sends focus to the Look closer heading', () => {
    // The dive needs WebGL, so this pins the handler; tools in the lane audit pressed it in a real browser.
    const src = fs.readFileSync(TOOL, 'utf8');
    const line = src.split('\n').find((l) => l.indexOf("'stem.coralreef.ex_look_nearest'") >= 0);
    expect(line.includes("ctl().focusNext(); a11yRefocus(function () { return document.getElementById('cr-focus-title'); }")).toBe(true);
    expect(src.includes("h('h3', { id: 'cr-focus-title'")).toBe(true);
  });
});

describe('fix 2: the cause diagram is not re-read on every year step (WCAG 4.1.3)', () => {
  it('only the one-sentence headline is live, and it follows the year', async () => {
    const t = await mount({ section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } }, modelSurveyYear: 10 });
    const box = t.host.querySelector('[data-mdl-causes]');
    expect(box).toBeTruthy();
    expect(box.getAttribute('aria-live')).toBe(null);
    expect(box.closest('[aria-live]')).toBe(null);
    expect(box.querySelector('[aria-live]')).toBe(null);
    const live = t.host.querySelector('[data-mdl-cause-live]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-atomic')).toBe('true');
    expect(live.style.position).toBe('absolute');
    expect(live.textContent).toMatch(/^Coral (fell|rose|stayed)/);
    expect(live.textContent.split('. ').length).toBeLessThanOrEqual(2);
    const before = live.textContent;
    await press(byText(t.host, 'button', /^Next year$/));
    expect(t.d.modelSurveyYear).toBe(11);
    const after = t.host.querySelector('[data-mdl-cause-live]').textContent;
    expect(after).toMatch(/^Coral (fell|rose|stayed)/);
    expect(t.host.querySelector('[data-mdl-causes]').textContent).toContain(after);
    expect(before.length > 0 && after.length > 0).toBe(true);
  });

  it('year 0 leaves the live headline empty', async () => {
    const t = await mount({ section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } }, modelSurveyYear: 0 });
    expect(t.host.querySelector('[data-mdl-cause-live]').textContent).toBe('');
  });
});

describe('fix 3: the seaweed result is read once', () => {
  it('is said through the live note only, and aloud only when the words repeat', async () => {
    const t = await mount({ section: 'science', sciTopic: 'seaweed', sciSeaweed: { pred: 'same', started: true } });
    const p = panel(t.host, 'seaweed');
    const note = () => p.querySelector('p[aria-live="polite"]');
    const pass = () => byText(p, 'button', /^Let 20 years pass$/);
    const n0 = t.said.length;
    await press(pass());
    expect(note().textContent).toMatch(/^After 20 years with grazing at/);
    expect(t.said.slice(n0).filter((m) => /^After 20 years/.test(m))).toEqual([]);
    // A healthy reef at the same grazing settles, so the same words come back: the note cannot change, so it is said.
    let same = false;
    for (let i = 0; i < 6 && !same; i++) {
      const before = note().textContent, n = t.said.length;
      await press(pass());
      if (note().textContent === before) { same = true; expect(t.said.slice(n)).toEqual([before]); }
      else expect(t.said.slice(n)).toEqual([]);
    }
    expect(same).toBe(true);
    const n1 = t.said.length;
    await press(byText(p, 'button', /^A heatwave hits$/));
    expect(note().textContent).toMatch(/^A heatwave of/);
    expect(t.said.slice(n1)).toEqual([]);
  });
});

describe('fix 4: dive selects have a 3:1 border (WCAG 1.4.11)', () => {
  it('the Dive detail select uses the control border colour', async () => {
    const t = await mount({ section: 'explore' });
    const sel = [...t.host.querySelectorAll('select')].find((s) => s.closest('label') && /3D detail/.test(s.closest('label').textContent));
    expect(sel).toBeTruthy();
    const ctl = X.palette('light').ctlBorder;
    const hex = (c) => '#' + c.match(/\d+/g).slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('');
    expect(hex(sel.style.borderColor || sel.style.borderTopColor)).toBe(ctl);
  });

  it('no select in the tool is drawn with the faint card border', () => {
    const src = fs.readFileSync(TOOL, 'utf8');
    const selects = src.split('\n').filter((l) => l.indexOf("h('select'") >= 0);
    expect(selects.length).toBeGreaterThan(10);
    expect(selects.filter((l) => /'1px solid ' \+ P\.border\b/.test(l))).toEqual([]);
    // The lens and route selects of the running dive are among them.
    expect(selects.some((l) => /-lens'/.test(l) && /P\.ctlBorder/.test(l))).toBe(true);
    expect(selects.some((l) => /-route'/.test(l) && /P\.ctlBorder/.test(l))).toBe(true);
  });
});

describe('fix 5: target size and forced colors (WCAG 2.5.8, 1.4.11)', () => {
  it('the tool ships the round 4 rules in every section', async () => {
    for (const section of ['hub', 'explore', 'guide', 'methods', 'model', 'science', 'teacher']) {
      const t = await mount({ section });
      const css = [...t.host.querySelectorAll('style')].map((s) => s.textContent).join('\n');
      expect(css, section).toContain('[data-coralreef-root] input[type=range]{min-height:24px}');
      expect(css, section).toContain('[data-coralreef-root] summary{min-height:24px}');
      expect(css, section).toMatch(/@media\(forced-colors:active\)\{\[data-coralreef-root\] button\[aria-current=step\][^}]*border:3px double Highlight!important/);
    }
  });

  it('the current practice point is the button the forced-colors rule marks', async () => {
    const t = await mount({ section: 'methods', w2MethodsPart: 'practice' });
    const current = t.host.querySelectorAll('[data-w2-point][aria-current="step"]');
    expect(current.length).toBe(1);
    expect(current[0].tagName).toBe('BUTTON');
  });
});
