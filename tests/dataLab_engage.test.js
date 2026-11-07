// Data Lab engagement build (2026-11-04).
//   1. Question-first launcher: one title line, the next question with ONE
//      primary Start, privacy as one honest line + "What the tutor can see",
//      no data preview, and it follows the host theme and width.
//   2. Question-first sidebar: question -> prediction -> Lock -> Load; the
//      choosers, citation and Paste a table sit below; Load waits for CODAP
//      (aria-disabled + a reason), then turns on by itself.
//   3. After Load the plugin opens an EMPTY graph beside the table; the axis
//      checks and the CODAP-verified graph credit are unchanged.
//   4. Phones (<= 480 px): "CODAP works best on a laptop or Chromebook", with
//      the text table and a Data Plot hand-off.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const repo = process.cwd();
const read = (name) => fs.readFileSync(path.join(repo, name), 'utf8');
const page = read('data_lab/data_lab.html');
const plugin = read('data_lab/tutor_plugin.html');
const launcherSrc = read('stem_lab/stem_tool_datalab.js');
const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const T = (k, fb) => fb;
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function launcherApi() {
  const win = { location: { hostname: 'example.test', pathname: '/', href: 'https://example.test/', origin: 'https://example.test' }, StemLab: { registerTool() {} } };
  win.window = win;
  vm.runInNewContext(launcherSrc, { window: win, URL, console: { log() {} } });
  return win.StemLab.dataLab;
}
let api;
beforeAll(() => { api = launcherApi(); });

// ── Launcher ─────────────────────────────────────────────────────────────
describe('1. question-first launcher', () => {
  let root = null;
  let dl = null;
  let realMatchMedia;
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    dl = window.StemLab.dataLab;
    document.body.innerHTML = '<div id="root"></div>';
    document.documentElement.lang = 'en';
    delete window.__alloDataLabInbox;
    realMatchMedia = window.matchMedia;
  });
  afterEach(async () => {
    if (root) await React.act(() => root.unmount());
    root = null;
    if (dl) dl._reset();
    window.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
  });
  async function mount(extra) {
    const out = { latest: null, tools: [] };
    function App(props) {
      const [state, setState] = React.useState(props.seed || {});
      out.latest = state;
      return window.StemLab._registry.dataLab.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, announceToSR() {}, awardXP() {}, setStemLabTool: (id) => out.tools.push(id) }, extra || {})));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => root.render(React.createElement(App, { seed: extra && extra.seed })));
    return out;
  }
  const launcher = () => document.querySelector('[data-datalab-launcher]');
  const before = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('leads with the next question and one primary Start; the free open button is secondary', async () => {
    await mount({ gradeBand: 'g68' });
    const hero = document.querySelector('[data-datalab-hero]');
    expect(hero).not.toBeNull();
    expect(hero.getAttribute('data-datalab-hero')).toBe('penguins_mass');
    expect(hero.textContent).toContain('Do penguins with longer flippers weigh more?');
    expect(hero.textContent).toContain('Step 1 of 5');
    const start = hero.querySelector('button[data-path-hero]');
    expect(start.textContent).toBe('Start');
    expect(start.getAttribute('aria-describedby')).toBe('datalab-hero-q');
    expect(document.getElementById('datalab-hero-q').textContent).toBe('Do penguins with longer flippers weigh more?');
    // Exactly one primary action on the page.
    expect(document.querySelectorAll('[data-path-hero], [data-datalab-open="primary"]').length).toBe(1);
    const open = document.querySelector('[data-datalab-open]');
    expect(open.getAttribute('data-datalab-open')).toBe('secondary');
    expect(open.textContent).toContain('Open Data Lab');
    // Start is the first control after Back; the question comes before the privacy line.
    const buttons = [...launcher().querySelectorAll('button')];
    expect(buttons[1]).toBe(start);
    const privacyLine = [...launcher().querySelectorAll('p')].find((p) => p.textContent.includes('up to 20 rows from each table'));
    expect(before(hero, privacyLine)).toBe(true);
    // No data preview: a chart of the data would answer the question.
    expect(launcher().querySelectorAll('svg, canvas').length).toBe(0);
  });

  it('Start opens the Data Lab on that question', async () => {
    await mount({ gradeBand: 'g68' });
    const win = { closed: false, focus() {}, postMessage() {}, close() { this.closed = true; }, location: { href: 'about:blank' } };
    vi.spyOn(window, 'open').mockReturnValue(win);
    await React.act(() => document.querySelector('[data-path-hero]').click());
    expect(win.location.href).toContain('&start=penguins_mass');
  });

  it('privacy is one honest line; the detail sits behind "What the tutor can see"', async () => {
    await mount({ gradeBand: 'g68', aiHintsEnabled: false });
    const details = document.querySelector('[data-datalab-privacy]');
    expect(details.tagName).toBe('DETAILS');
    expect(details.open).toBe(false);
    const summary = details.querySelector('summary');
    expect(summary.textContent.replace('▾', '')).toBe('What the tutor can see');
    expect(summary.querySelector('[aria-hidden="true"]').textContent).toBe('▾'); // a visible caret, hidden from screen readers
    const inside = details.textContent;
    expect(inside).toContain('AlloFlow does not save tutor chats.');
    expect(inside).toContain('AI hints are off');
    expect(inside).toContain('it can see your column names, summary statistics, and a sample of your rows');
    // The summary line is the stage C wording, outside the disclosure.
    const line = [...launcher().querySelectorAll('p')].find((p) => p.textContent === '🔒 The tutor sees column names, summary statistics, and up to 20 rows from each table. In a small table, that can be every row.');
    expect(line).toBeTruthy();
    expect(details.contains(line)).toBe(false);
  });

  it('follows the host theme and width: no fixed dark ground, no 680 px cap, no dark-only ink', async () => {
    await mount({ gradeBand: 'g35', seed: { _dataLab: { completedInvestigations: ['house_most'], graphsMade: ['house_most'] } } });
    const el = launcher();
    expect(el.getAttribute('style') || '').not.toContain('#0f172a');
    expect(el.className).not.toContain('max-w-2xl');
    expect(el.className).toContain('w-full');
    // Light-authored inks only (the host remaps slate/white in its contrast theme).
    const darkInk = [...el.querySelectorAll('*')].filter((n) => /\btext-(slate|emerald|sky|amber)-(100|200|300)\b/.test(n.getAttribute('class') || ''));
    expect(darkInk.map((n) => n.getAttribute('class'))).toEqual([]);
    expect(document.querySelector('[data-path-step="house_most"] li').className).toContain('text-emerald-800');
  });

  it('contrast theme gets yellow status ink, not dark green', async () => {
    await mount({ gradeBand: 'g35', theme: 'contrast', isContrast: true, seed: { _dataLab: { completedInvestigations: ['house_most'], graphsMade: ['house_most'] } } });
    expect(document.querySelector('[data-path-step="house_most"] li').className).toContain('text-yellow-300');
  });

  it("a teacher's assignment is the question card, with Open Data Lab as its one primary button", async () => {
    await mount({ gradeBand: 'g68', seed: { _dataLab: { assignment: { datasetId: 'co2', investigationId: 'co2_rising' } } } });
    const hero = document.querySelector('[data-datalab-hero]');
    expect(hero.getAttribute('data-datalab-hero')).toBe('assigned');
    expect(hero.textContent).toContain('How has the amount of carbon dioxide in the air changed since 1959?');
    expect(hero.querySelector('[data-datalab-open="primary"]').textContent).toContain('Open Data Lab');
    expect(document.querySelectorAll('[data-path-hero], [data-path-start], [data-datalab-open="secondary"]').length).toBe(0);
  });

  it('when every step is finished, Open Data Lab becomes the primary action', async () => {
    const all = dl._learningPath(dl._buildCatalog(T), 'g68', [], []).map((s) => s.inv.id);
    await mount({ gradeBand: 'g68', seed: { _dataLab: { completedInvestigations: all } } });
    const hero = document.querySelector('[data-datalab-hero]');
    expect(hero.getAttribute('data-datalab-hero')).toBe('done');
    expect(hero.querySelectorAll('[data-datalab-open="primary"]').length).toBe(1);
    expect(document.querySelectorAll('[data-datalab-open="secondary"]').length).toBe(0);
  });

  const teacherSeed = { _dataLab: {
    assignment: { datasetId: 'co2', investigationId: 'co2_rising' },
    survey: { question: 'How do you get to school?', columns: [{ name: 'Travel', type: 'choice', choices: ['Walk', 'Bus'] }] }
  } };
  const teacherPanels = () => ['datalab-teacher-h', 'datalab-survey-h'].map((id) => document.querySelector('section[aria-labelledby="' + id + '"]'));
  const darkClass = /\bbg-slate-(700|800|900)\b|\btext-(slate|emerald|sky|amber)-(100|200|300)\b|\bborder-slate-600\b/;

  it('the teacher assign and survey panels stay teacher-only', async () => {
    await mount({ gradeBand: 'g68', isTeacherMode: 'true', seed: teacherSeed });
    expect(teacherPanels()).toEqual([null, null]);
  });

  it('the teacher assign and survey panels use the light host-theme classes, not a dark self-contained panel', async () => {
    await mount({ gradeBand: 'g68', isTeacherMode: true, seed: teacherSeed });
    const panels = teacherPanels();
    expect(panels.every(Boolean)).toBe(true);
    for (const panel of panels) {
      expect(panel.className).toContain('bg-white');
      expect(panel.className).toContain('text-slate-800');
      const dark = [panel, ...panel.querySelectorAll('*')].filter((n) => darkClass.test(n.getAttribute('class') || ''));
      expect(dark.map((n) => n.tagName + ' ' + n.getAttribute('class'))).toEqual([]);
      expect(panel.querySelector('[role="status"]').className).toContain('text-emerald-800');
    }
    // The fields and the secondary buttons share the launcher's light styles.
    expect(document.getElementById('datalab-t-ds').className).toContain('bg-white');
    expect(document.getElementById('datalab-sv-q').className).toContain('bg-white');
  });

  it('the teacher panels get yellow status ink in the contrast theme', async () => {
    await mount({ gradeBand: 'g68', isTeacherMode: true, theme: 'contrast', isContrast: true, seed: teacherSeed });
    for (const panel of teacherPanels()) expect(panel.querySelector('[role="status"]').className).toContain('text-yellow-300');
  });

  it('on a phone, says CODAP works best on a laptop and hands off to Data Plot', async () => {
    window.matchMedia = (q) => ({ matches: q === '(max-width: 480px)', media: q, addEventListener() {}, removeEventListener() {} });
    window.StemLab.isRegistered = (id) => id === 'dataPlot';
    const m = await mount({ gradeBand: 'g68' });
    const note = document.querySelector('[data-datalab-phone]');
    expect(note).not.toBeNull();
    expect(note.textContent).toContain('CODAP works best on a laptop or Chromebook.');
    expect(note.textContent).toContain('text table');
    await React.act(() => note.querySelector('button').click());
    expect(m.tools).toEqual(['dataPlot']);
  });

  it('shows no phone notice at laptop width', async () => {
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
    await mount({ gradeBand: 'g68' });
    expect(document.querySelector('[data-datalab-phone]')).toBeNull();
  });

  it('the pop-up can ask AlloFlow to open Data Plot (allow-listed, pop-up window only)', async () => {
    window.StemLab.isRegistered = () => true;
    const m = await mount({ gradeBand: 'g68' });
    const win = { closed: false, focus() {}, postMessage() {}, close() { this.closed = true; }, location: { href: 'about:blank' } };
    vi.spyOn(window, 'open').mockReturnValue(win);
    await React.act(() => document.querySelector('[data-path-hero]').click());
    const send = async (data, source = win) => React.act(async () => { window.dispatchEvent(new MessageEvent('message', { data, source, origin: window.location.origin })); await tick(); });
    await send({ type: 'allodatalab-hello' });
    await send({ type: 'allodatalab-open-tool', tool: 'statsLab' });
    await send({ type: 'allodatalab-open-tool', tool: 'dataPlot' }, {});
    expect(m.tools).toEqual([]);
    await send({ type: 'allodatalab-open-tool', tool: 'dataPlot' });
    expect(m.tools).toEqual(['dataPlot']);
  });

  it('sends the pop-up its new strings', () => {
    const s = api._popupStrings(T);
    expect(s.load_wait).toBe('Waiting for CODAP to finish opening. Load turns on when it is ready.');
    expect(s.loaded_data_graph).toContain('next to an empty graph');
    expect(s.phone_note).toBe('CODAP works best on a laptop or Chromebook.');
    expect(s.choose_heading).toBe('Choose a dataset or question');
  });
});

// ── The pop-up page in jsdom ─────────────────────────────────────────────
let dom = null;
afterEach(() => { if (dom) dom.window.close(); dom = null; });
function bootPage(query = '?v=2&theme=dark&lang=en&start=penguins_mass') {
  dom = new JSDOM(page.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g, ''), { url: 'https://data-lab.test/data_lab/data_lab.html' + query, runScripts: 'outside-only' });
  const w = dom.window;
  const toOpener = [];
  const toPlugin = [];
  const opener = { closed: false, focus() {}, postMessage: (d) => toOpener.push(d) };
  const pluginWin = { postMessage: (d) => toPlugin.push(d) };
  Object.defineProperty(w, 'opener', { configurable: true, value: opener });
  inlineScripts(page).forEach((code) => w.eval(code));
  const env = {
    w, d: w.document, toOpener, toPlugin,
    el: (id) => w.document.getElementById(id),
    fromOpener: (data) => w.dispatchEvent(new w.MessageEvent('message', { data, source: opener, origin: 'https://alloflow.test' })),
    fromPlugin: (data) => w.dispatchEvent(new w.MessageEvent('message', { data, source: pluginWin, origin: 'https://data-lab.test' })),
    last: (type) => toPlugin.filter((m) => m.type === type).pop(),
  };
  return env;
}
function ready(env, extra = {}) {
  env.fromOpener(Object.assign({ type: 'allodatalab-ready', ai: false, lang: 'en', dir: 'ltr', gradeBand: 'g68', strings: api._popupStrings(T), catalog: api._buildCatalog(T), assignment: null }, extra));
}
function lockFirst(env) {
  env.d.querySelector('input[name="prediction"]').checked = true;
  env.el('lockBtn').click();
}
const follows = (a, b) => !!(a.compareDocumentPosition(b) & 4); // b comes after a

describe('2. question-first sidebar', () => {
  it('reads question -> prediction -> Lock -> Load, with the choosers, citation and Paste a table below', () => {
    const env = bootPage();
    ready(env);
    const q = env.el('questionText');
    expect(q.hidden).toBe(false);
    expect(q.textContent).toBe('Do penguins with longer flippers weigh more?');
    const order = [q, env.el('predictChoices'), env.el('lockBtn'), env.el('loadBtn'), env.el('datasetSource'), env.el('chooseDetails')];
    for (let i = 1; i < order.length; i++) expect(follows(order[i - 1], order[i]), order[i].id).toBe(true);
    // The dataset and question menus and Paste a table live in the chooser.
    const chooser = env.el('chooseDetails');
    expect(chooser.contains(env.el('datasetSelect'))).toBe(true);
    expect(chooser.contains(env.el('questionSelect'))).toBe(true);
    expect(chooser.contains(env.el('pasteDetails'))).toBe(true);
    expect(chooser.open).toBe(false); // a question is on screen
    expect(env.el('datasetSource').textContent).toContain('Palmer Station');
  });

  it('opens the chooser when no question is on screen', () => {
    const env = bootPage('?v=2&theme=dark&lang=en');
    ready(env);
    expect(env.el('questionText').hidden).toBe(true);
    expect(env.el('chooseDetails').open).toBe(true);
  });

  it('Load waits visibly for CODAP (aria-disabled with a reason), then turns on', async () => {
    const env = bootPage();
    ready(env);
    lockFirst(env);
    const load = env.el('loadBtn');
    expect(load.disabled).toBe(false); // still focusable
    expect(load.getAttribute('aria-disabled')).toBe('true');
    expect(load.getAttribute('aria-describedby')).toBe('loadWait');
    expect(env.el('loadWait').hidden).toBe(false);
    expect(env.el('loadWait').textContent).toBe('Waiting for CODAP to finish opening. Load turns on when it is ready.');
    load.click();
    expect(env.toPlugin.length).toBe(0);
    expect(env.el('datasetStatus').textContent).toContain('Waiting for CODAP');
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    expect(load.hasAttribute('aria-disabled')).toBe(false);
    expect(load.hasAttribute('aria-describedby')).toBe(false);
    expect(env.el('loadWait').hidden).toBe(true);
    expect(env.el('datasetStatus').textContent).toBe('CODAP is ready. You can load the data now.');
    // Nothing was queued by the waiting click: one Load, one dataset.
    expect(env.toPlugin.filter((m) => m.type === 'allodatalab-create-dataset').length).toBe(0);
    load.click();
    expect(env.toPlugin.filter((m) => m.type === 'allodatalab-create-dataset').length).toBe(1);
  });

  it('says so when CODAP could not load', () => {
    const env = bootPage();
    ready(env);
    env.el('codapFrame').dispatchEvent(new env.w.Event('error'));
    expect(env.el('loadWait').textContent).toContain('CODAP is not open');
  });

  it('a prediction still comes first: Load stays disabled until Lock', () => {
    const env = bootPage();
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    expect(env.el('loadBtn').disabled).toBe(true);
    lockFirst(env);
    expect(env.el('loadBtn').disabled).toBe(false);
  });
});

describe('3. an empty graph beside the table after Load', () => {
  it('asks the plugin for an empty graph when the question has one to make, and says where it is', async () => {
    const env = bootPage();
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    lockFirst(env);
    env.el('loadBtn').click();
    const create = env.last('allodatalab-create-dataset');
    expect(create.graph).toBe(true);
    env.fromPlugin({ type: 'allodatalab-dataset-created', id: create.id, ok: true, rows: 344, name: 'Penguins', graph: true });
    await tick();
    expect(env.el('datasetStatus').textContent).toContain('next to an empty graph');
  });

  it('pasted data gets no graph', () => {
    const env = bootPage('?v=2&theme=dark&lang=en');
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    env.el('pasteData').value = 'A,B\n1,2\n3,4';
    env.el('pasteBtn').click();
    expect(env.last('allodatalab-create-dataset').graph).toBe(false);
  });

  it('the empty graph earns nothing: the axis checks and the one graph credit are unchanged', async () => {
    const env = bootPage();
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    lockFirst(env);
    const check = async (graphs) => {
      env.el('graphCheckBtn').click();
      const req = env.last('allodatalab-graph-check');
      env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ok: true, graphs, tables: 1, unreadable: 0 });
      await tick();
      return env.el('graphFeedback').textContent;
    };
    const credit = () => env.toOpener.filter((m) => m.type === 'allodatalab-progress' && m.event === 'graph-made');
    const empty = { dataContext: 'Penguins', x: '', y: '', legend: '', top: '', right: '', plotType: '' };
    expect(await check([empty])).toContain('no columns on its axes');
    expect(credit().length).toBe(0);
    expect(await check([{ ...empty, x: 'Body mass', y: 'Flipper length' }])).toContain('swapped');
    expect(credit().length).toBe(0);
    expect(await check([{ ...empty, x: 'Flipper length', y: 'Body mass' }])).toContain('right columns');
    expect(credit()).toEqual([{ type: 'allodatalab-progress', event: 'graph-made', investigationId: 'penguins_mass', passed: true }]);
  });

  it('a graph with columns outranks the empty plugin graph, so the feedback names them; credit still needs the right axes', async () => {
    const env = bootPage();
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    lockFirst(env);
    const check = async (graphs) => {
      env.el('graphCheckBtn').click();
      const req = env.last('allodatalab-graph-check');
      env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ok: true, graphs, tables: 1, unreadable: 0 });
      await tick();
      return env.el('graphFeedback').textContent;
    };
    const credit = () => env.toOpener.filter((m) => m.type === 'allodatalab-progress' && m.event === 'graph-made');
    const empty = { dataContext: 'Penguins', x: '', y: '', legend: '', top: '', right: '', plotType: '' };
    const wrong = { ...empty, x: 'Species', y: 'Island' };
    for (const graphs of [[empty, wrong], [wrong, empty]]) {
      const text = await check(graphs);
      expect(text).toContain('Your graph shows Species and Island. This question needs Flipper length and Body mass.');
      expect(text).not.toContain('no columns on its axes');
    }
    expect(credit().length).toBe(0);
    expect(await check([empty, { ...empty, x: 'Flipper length', y: 'Body mass' }])).toContain('right columns');
    expect(credit().length).toBe(1);
  });

  it('the plugin opens an empty graph (no axis attributes) only when asked', async () => {
    const run = async (graph) => {
      const pdom = new JSDOM(plugin.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ''), { url: 'https://data-lab.test/data_lab/tutor_plugin.html', runScripts: 'outside-only' });
      const w = pdom.window;
      const calls = [];
      w.iframePhone = { IframePhoneRpcEndpoint: function () { this.call = (msg, cb) => { calls.push(msg); setTimeout(() => cb(msg.resource === 'dataContextList' ? { success: true, values: [] } : { success: true }), 0); }; } };
      const replies = [];
      w.addEventListener('message', (e) => { if (e.data && e.data.type === 'allodatalab-dataset-created') replies.push(e.data); });
      w.eval(inlineScripts(plugin)[0]);
      await tick(20);
      w.dispatchEvent(new w.MessageEvent('message', { data: { type: 'allodatalab-create-dataset', id: 'd1', dataset: { title: 'Planets', attributes: [{ name: 'Planet' }, { name: 'Gravity' }], rows: [['Earth', 9.8]] }, graph }, source: w, origin: 'https://data-lab.test' }));
      for (let i = 0; i < 50 && !replies.length; i++) await tick(10);
      w.close();
      return { calls, reply: replies[0] };
    };
    const yes = await run(true);
    const graphCalls = yes.calls.filter((c) => c.action === 'create' && c.resource === 'component' && c.values && c.values.type === 'graph');
    expect(graphCalls).toEqual([{ action: 'create', resource: 'component', values: { type: 'graph', dataContext: 'Planets' } }]);
    expect(yes.calls.findIndex((c) => c.values && c.values.type === 'caseTable')).toBeLessThan(yes.calls.indexOf(graphCalls[0]));
    expect(yes.reply).toMatchObject({ ok: true, rows: 1, graph: true });
    const no = await run(undefined);
    expect(no.calls.some((c) => c.values && c.values.type === 'graph')).toBe(false);
    expect(no.reply).toMatchObject({ ok: true, graph: false });
  });
});

describe('4. phone notice', () => {
  it('shows only at 480 px or less', () => {
    const css = page.slice(page.indexOf('<style>'), page.indexOf('</style>'));
    expect(css).toMatch(/\.phone-note \{ display: none;/);
    expect(css).toMatch(/@media \(max-width: 480px\) \{ \.phone-note \{ display: block; \} \}/);
    const env = bootPage();
    expect(env.el('phoneNote').textContent).toContain('CODAP works best on a laptop or Chromebook.');
  });

  it('opens the text table, and hands off to Data Plot only when AlloFlow is connected', () => {
    const env = bootPage();
    expect(env.el('phoneDataPlotBtn').hidden).toBe(true);
    ready(env);
    expect(env.el('phoneDataPlotBtn').hidden).toBe(false);
    lockFirst(env); // the text table is the data: it waits for Lock (datalab_engage_hunt.test.js)
    expect(env.el('tableDetails').open).toBe(false);
    env.el('phoneTableBtn').click();
    expect(env.el('tableDetails').open).toBe(true);
    expect(env.d.activeElement).toBe(env.el('tableDetails').querySelector('summary'));
    env.el('phoneDataPlotBtn').click();
    expect(env.toOpener.filter((m) => m.type === 'allodatalab-open-tool')).toEqual([{ type: 'allodatalab-open-tool', tool: 'dataPlot' }]);
    expect(env.el('phoneStatus').textContent).toContain('Data Plot is opening in your AlloFlow tab');
  });

  it('with no dataset chosen, the table button opens the chooser instead', () => {
    const env = bootPage('?v=2&theme=dark&lang=en');
    ready(env);
    env.el('chooseDetails').open = false;
    env.el('phoneTableBtn').click();
    expect(env.el('chooseDetails').open).toBe(true);
    expect(env.d.activeElement).toBe(env.el('datasetSelect'));
  });
});
