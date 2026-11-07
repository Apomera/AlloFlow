// Data Lab stage B (2026-11-03 pm): the companion page and the CODAP plugin.
//   - "Make the graph" steps checked through CODAP's documented component API
//     (the report shape below is what pinned CODAP 3.1.2 returned in a live probe);
//   - claim checks that do not depend on keyword lists (scope + cause choice,
//     "every single case" decided by the data), and word counts in any script;
//   - four new cited starter datasets, spot-checked against their sources;
//   - the class survey (session-only rows, live add to CODAP, copy/paste merge);
//   - "Paste a table" and the English fallback catalog for a window opened on
//     its own (the desktop app).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const page = read('data_lab/data_lab.html');
const plugin = read('data_lab/tutor_plugin.html');
const launcherSrc = read('stem_lab/stem_tool_datalab.js');
const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const between = (code, start, end) => {
  const a = code.indexOf(start);
  const b = code.indexOf(end, a);
  expect(a, start).toBeGreaterThan(-1);
  expect(b, end).toBeGreaterThan(a);
  return code.slice(a, b);
};
function launcherApi() {
  const win = { location: { hostname: 'example.test', pathname: '/', href: 'https://example.test/', origin: 'https://example.test' }, StemLab: { registerTool() {} } };
  win.window = win;
  vm.runInNewContext(launcherSrc, { window: win, URL, console: { log() {} } });
  return win.StemLab.dataLab;
}
const T = (k, fb) => fb;

let core;
let api;
let catalog;
beforeAll(() => {
  const code = inlineScripts(page)[1];
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(between(code, '// == data lab core start', '// == data lab core end') + '\nthis.core = { checkGraph, normName, checkCER, countWords, trendCounterexample, evaluateGroup, evaluateTrend, evaluateMax, parseDelimited, tableFromText, surveyValue, surveyRowsFromText, rowsToCsv, sanitizeCatalog };', ctx);
  core = ctx.core;
  api = launcherApi();
  catalog = api._buildCatalog(T);
});
const ds = (id) => catalog.find((d) => d.id === id);
const invOf = (d, id) => d.investigations.find((i) => i.id === id);
// The live CODAP 3.1.2 answer for one graph (stageB_graph_probe.cjs).
const graph = (x, y, extra = {}) => ({ dataContext: 'The eight planets', x, y, legend: '', top: '', right: '', plotType: 'scatterPlot', ...extra });
const report = (...graphs) => ({ ok: true, graphs, tables: 1, unreadable: 0 });

describe('graph check against the CODAP component report', () => {
  const xy = { x: 'Distance from Sun', y: 'Mean temperature', anyOrder: false };
  it('passes the right axes and names each wrong graph', () => {
    expect(core.checkGraph(report(graph('Distance from Sun', 'Mean temperature')), xy).status).toBe('pass');
    expect(core.checkGraph(report(graph('Mean temperature', 'Distance from Sun')), xy).status).toBe('swapped');
    expect(core.checkGraph(report(graph('Distance from Sun', '')), xy)).toEqual({ status: 'one_axis', missing: 'Mean temperature', found: 'Distance from Sun' });
    expect(core.checkGraph(report(graph('Distance from Sun', '', { legend: 'Mean temperature' })), xy)).toEqual({ status: 'legend_only', missing: 'Mean temperature' });
    expect(core.checkGraph(report(graph('', '')), xy).status).toBe('empty_graph');
    expect(core.checkGraph(report(graph('Mass', 'Density')), xy)).toEqual({ status: 'wrong_attrs', found: ['Mass', 'Density'] });
    expect(core.checkGraph(report(), xy).status).toBe('no_graph');
  });
  it('takes the best of several graphs, accepts either order for a pair, and one attribute on either axis', () => {
    expect(core.checkGraph(report(graph('Mass', 'Density'), graph('Distance from Sun', 'Mean temperature')), xy).status).toBe('pass');
    expect(core.checkGraph(report(graph('Flipper length', 'Species')), { x: 'Species', y: 'Flipper length', anyOrder: true }).status).toBe('pass');
    expect(core.checkGraph(report(graph('', 'Eruption length')), { x: 'Eruption length', y: '' }).status).toBe('pass');
  });
  it('matches CODAP-cleaned names (brackets, dots, case) but not different columns', () => {
    expect(core.checkGraph(report(graph('speed m s', 'TIME')), { x: 'speed [m/s]', y: 'time' }).status).toBe('pass');
    expect(core.checkGraph(report(graph('speed', 'time')), { x: 'speed [m/s]', y: 'time' }).status).toBe('one_axis');
  });
  it('degrades honestly when CODAP cannot answer', () => {
    expect(core.checkGraph(null, xy).status).toBe('unavailable');
    expect(core.checkGraph({ ok: false, error: 'not-connected' }, xy).status).toBe('unavailable');
    expect(core.checkGraph({ ok: true, graphs: [], unreadable: 1 }, xy).status).toBe('unavailable');
  });
});

describe('claim checks decided by the data, not by keywords', () => {
  it('finds a counterexample only where one exists in the data', () => {
    expect(core.trendCounterexample(ds('planets'), invOf(ds('planets'), 'planets_kepler'))).toBe(false); // farther is always longer
    expect(core.trendCounterexample(ds('planets'), invOf(ds('planets'), 'planets_cold'))).toBe(true); // Venus
    expect(core.trendCounterexample(ds('co2'), invOf(ds('co2'), 'co2_rising'))).toBe(false);
    expect(core.trendCounterexample(ds('olympic100'), invOf(ds('olympic100'), 'olympic_faster'))).toBe(true);
    expect(core.trendCounterexample(ds('usHouse2020'), invOf(ds('usHouse2020'), 'house_seats'))).toBe(false);
    const toy = { attributes: [{ key: 'x' }, { key: 'y' }], rows: [[1, 1], [2, 3], [3, 2], [4, 5]] };
    expect(core.trendCounterexample(toy, { x: 'x', y: 'y' })).toBe(true);
    toy.rows[2] = [3, 4];
    expect(core.trendCounterexample(toy, { x: 'x', y: 'y' })).toBe(false);
  });
  it('compares penguin groups by median and sees that the groups overlap', () => {
    const g = core.evaluateGroup(ds('penguins'), invOf(ds('penguins'), 'penguins_flippers'));
    expect(g.top).toBe('Gentoo');
    expect(g.groups.map((x) => [x.label, x.median, x.n])).toEqual([['Gentoo', 216, 123], ['Chinstrap', 196, 68], ['Adelie', 190, 151]]);
    expect(g.overlap).toBe(true);
  });
  it('counts words in scripts without spaces (old whitespace count saw one word)', () => {
    const zh = '因为金星的温度最高，所以它是最热的行星。';
    expect(zh.trim().split(/\s+/).length).toBe(1);
    expect(core.countWords(zh)).toBeGreaterThanOrEqual(6);
    expect(core.countWords('金星はいちばん暑い惑星です。')).toBeGreaterThanOrEqual(4);
    expect(core.countWords('Venus is the hottest planet.')).toBe(5);
    const opts = { attributeNames: ['温度'] };
    expect(core.checkCER({ claim: '金星最热。', evidence: '金星是464度。', reasoning: zh }, opts)).toEqual([]);
  });
});

describe('new starter datasets: cited and checked against the source files', () => {
  it('penguins: 344 birds of three species, blanks where not measured', () => {
    const p = ds('penguins');
    expect(p.rows.length).toBe(344);
    const count = (s) => p.rows.filter((r) => r[0] === s).length;
    expect([count('Adelie'), count('Chinstrap'), count('Gentoo')]).toEqual([152, 68, 124]);
    expect(p.rows[0]).toEqual(['Adelie', 'Torgersen', 39.1, 18.7, 181, 3750, 'male', 2007]);
    expect(p.rows[3]).toEqual(['Adelie', 'Torgersen', '', '', '', '', '', 2007]);
    expect(p.rows.at(-1)).toEqual(['Chinstrap', 'Dream', 50.2, 18.7, 198, 3775, 'female', 2009]);
    expect(p.source.url).toBe('https://allisonhorst.github.io/palmerpenguins/');
  });
  it('Old Faithful: 272 eruptions', () => {
    const f = ds('faithful');
    expect(f.rows.length).toBe(272);
    expect(f.rows[0]).toEqual([3.6, 79]);
    expect(f.rows.at(-1)).toEqual([4.467, 74]);
  });
  it('Census: U.S. population 1910-2020 and the 2020 House apportionment', () => {
    const u = ds('usPopulation');
    expect(u.rows.map((r) => r[0])).toEqual([1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
    expect(u.rows.at(-1)).toEqual([2020, 331449281, 7.4, 93.8]);
    expect(u.rows[0]).toEqual([1910, 92228531, 21, 26]);
    const hs = ds('usHouse2020');
    expect(hs.rows.length).toBe(50);
    expect(hs.rows.reduce((a, r) => a + r[2], 0)).toBe(435);
    expect(hs.rows.reduce((a, r) => a + r[3], 0)).toBe(0);
    expect(hs.rows.find((r) => r[0] === 'California')).toEqual(['California', 39538223, 52, -1, 761091]);
    expect(hs.rows.find((r) => r[0] === 'Texas').slice(2, 4)).toEqual([38, 2]);
  });
  it('every investigation names real columns for its graph and asks real questions', () => {
    for (const d of catalog) {
      for (const q of d.investigations) {
        const keys = d.attributes.map((a) => a.key);
        if (q.group) expect(keys, q.id).toContain(q.group);
        if (q.graph) {
          expect(keys, q.id + ' graph x').toContain(q.graph.x);
          if (q.graph.y) expect(keys, q.id + ' graph y').toContain(q.graph.y);
        }
        expect(q.prompts.every((p) => p.includes('?')), q.id).toBe(true);
      }
    }
    const dirs = {};
    for (const [d, q] of [['penguins', 'penguins_mass'], ['faithful', 'faithful_wait'], ['usPopulation', 'uspop_growth'], ['usHouse2020', 'house_seats']]) dirs[q] = core.evaluateTrend(ds(d), invOf(ds(d), q)).direction;
    expect(dirs).toEqual({ penguins_mass: 'up', faithful_wait: 'up', uspop_growth: 'up', house_seats: 'up' });
    expect(core.evaluateMax(ds('usHouse2020'), invOf(ds('usHouse2020'), 'house_most'))).toEqual({ label: 'California', value: 52 });
  });
});

describe('delimited text and survey values', () => {
  it('parses commas, tabs, semicolons and quotes; detects number columns and units', () => {
    expect(core.parseDelimited('a,b\n1,"x, y"\n\n2,"say ""hi"""')).toEqual([['a', 'b'], ['1', 'x, y'], ['2', 'say "hi"']]);
    expect(core.parseDelimited('a\tb\r\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(core.parseDelimited('a;b\n1,5;2')).toEqual([['a', 'b'], ['1,5', '2']]);
    const t = core.tableFromText('time (s)\tspeed (m/s)\tnote\n0\t0\tstart\n1\t2,5\t\n2\tfast\tend');
    expect(t.attributes.map((a) => [a.name, a.unit, a.type])).toEqual([['time', 's', 'numeric'], ['speed', 'm/s', 'categorical'], ['note', '', 'categorical']]);
    expect(t.rows[0]).toEqual([0, '0', 'start']);
    expect(core.tableFromText('only a header')).toBeNull();
  });
  it('checks survey answers against their column', () => {
    expect(core.surveyValue({ type: 'number', min: 0, max: 100 }, '3')).toEqual({ ok: true, value: 3 });
    expect(core.surveyValue({ type: 'number', min: 0, max: 100 }, '500').error).toBe('range');
    expect(core.surveyValue({ type: 'number' }, 'lots').error).toBe('not_number');
    expect(core.surveyValue({ type: 'number' }, '2,5')).toEqual({ ok: true, value: 2.5 });
    expect(core.surveyValue({ type: 'choice', choices: ['Walk', 'Bus'] }, ' bus ')).toEqual({ ok: true, value: 'Bus' });
    expect(core.surveyValue({ type: 'choice', choices: ['Walk', 'Bus'] }, 'Train').error).toBe('not_choice');
    expect(core.surveyValue({ type: 'text' }, '   ').error).toBe('missing');
    const attrs = [{ name: 'Pets', entry: { type: 'number', min: 0, max: 100 } }, { name: 'Travel', entry: { type: 'choice', choices: ['Walk', 'Bus'] } }];
    const text = core.rowsToCsv(attrs, [[2, 'Walk'], [0, 'Bus']]);
    expect(text).toBe('Pets,Travel\n2,Walk\n0,Bus');
    expect(core.surveyRowsFromText(text + '\n900,Walk\nx\n1,Car', attrs)).toEqual({ rows: [[2, 'Walk'], [0, 'Bus']], skipped: 3 });
  });
});

// ── Whole page in jsdom with a fake AlloFlow opener and a fake plugin ──────
let dom = null;
afterEach(() => { if (dom) dom.window.close(); dom = null; });
function bootPage(query = '?v=2&theme=dark&lang=en') {
  dom = new JSDOM(page.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g, ''), { url: 'https://data-lab.test/data_lab/data_lab.html' + query, runScripts: 'outside-only' });
  const w = dom.window;
  const toOpener = [];
  const opener = { closed: false, postMessage: (d) => toOpener.push(d) };
  Object.defineProperty(w, 'opener', { configurable: true, value: opener });
  inlineScripts(page).forEach((code) => w.eval(code));
  const toPlugin = [];
  const pluginWin = { postMessage: (d) => toPlugin.push(d) };
  const env = {
    w, d: w.document, toOpener, toPlugin, pluginWin,
    fromOpener: (data) => w.dispatchEvent(new w.MessageEvent('message', { data, source: opener, origin: 'https://alloflow.test' })),
    fromPlugin: (data, source = pluginWin, origin = 'https://data-lab.test') => w.dispatchEvent(new w.MessageEvent('message', { data, source, origin })),
    progress: (event) => toOpener.filter((m) => m.type === 'allodatalab-progress' && m.event === event),
    last: (type) => toPlugin.filter((m) => m.type === type).at(-1),
    el: (id) => w.document.getElementById(id),
  };
  return env;
}
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 2000) {
  const end = Date.now() + ms;
  while (!fn() && Date.now() < end) await tick(10);
}
function ready(env, extra = {}) {
  env.fromOpener(Object.assign({ type: 'allodatalab-ready', ai: false, lang: 'en', dir: 'ltr', gradeBand: 'g68', strings: api._popupStrings(T), catalog: api._buildCatalog(T), assignment: null }, extra));
}
function choose(env, id, value) { const el = env.el(id); el.value = value; el.dispatchEvent(new env.w.Event('change', { bubbles: true })); }
function predict(env, value) { env.d.querySelector('input[name="prediction"][value="' + value + '"]').checked = true; env.el('lockBtn').click(); }

describe('make the graph, checked through CODAP', () => {
  it('names a swapped graph, adds step-by-step help after a second miss, and reports a verified graph once', async () => {
    const env = bootPage();
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    choose(env, 'datasetSelect', 'planets'); // g68 -> planets_cold
    expect(env.el('graphBlock').hidden).toBe(false);
    expect(env.el('graphTask').textContent).toBe('Make a graph with Distance from Sun across the bottom (the x-axis) and Mean temperature up the side (the y-axis).');
    expect(env.el('graphCheckBtn').disabled).toBe(true); // predict first
    predict(env, 'down');
    expect(env.el('graphCheckBtn').disabled).toBe(false);

    env.el('graphCheckBtn').click();
    let req = env.last('allodatalab-graph-check');
    expect(env.el('graphFeedback').textContent).toContain('Asking CODAP');
    // A forged report from another window is ignored.
    env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ...report(graph('Distance from Sun', 'Mean temperature')) }, {});
    await tick();
    expect(env.el('graphFeedback').textContent).toContain('Asking CODAP');
    env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ...report(graph('Mean temperature', 'Distance from Sun')) });
    await tick();
    expect(env.el('graphFeedback').textContent).toContain('Your axes are swapped');
    expect(env.el('graphFeedback').textContent).not.toContain('How to do it');

    env.el('graphCheckBtn').click();
    req = env.last('allodatalab-graph-check');
    env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ...report() });
    await tick();
    expect(env.el('graphFeedback').textContent).toContain('I do not see a graph yet');
    expect(env.el('graphFeedback').textContent).toContain('How to do it: 1. Press Graph');
    expect(env.progress('graph-made').length).toBe(0);

    env.el('graphCheckBtn').click();
    req = env.last('allodatalab-graph-check');
    env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ...report(graph('Distance from Sun', 'Mean temperature')) });
    await tick();
    expect(env.el('graphFeedback').textContent).toContain('Your graph shows the right columns');
    env.el('graphCheckBtn').click();
    req = env.last('allodatalab-graph-check');
    env.fromPlugin({ type: 'allodatalab-graph-report', id: req.id, ...report(graph('Distance from Sun', 'Mean temperature')) });
    await tick();
    expect(env.progress('graph-made')).toEqual([{ type: 'allodatalab-progress', event: 'graph-made', investigationId: 'planets_cold', passed: true }]);
  });

  it('says honestly when the plugin cannot answer, and gives no credit', async () => {
    const env = bootPage();
    ready(env, { gradeBand: 'g912' });
    choose(env, 'datasetSelect', 'faithful');
    expect(env.el('questionSelect').value).toBe('faithful_wait');
    predict(env, 'up');
    env.el('graphCheckBtn').click(); // no plugin yet
    await tick();
    const text = env.el('graphFeedback').textContent;
    expect(text).toContain('I cannot read your CODAP graphs from here right now');
    expect(text).toContain('Eruption length across the bottom');
    expect(text).toContain('How to do it');
    expect(env.progress('graph-made').length).toBe(0);
  });

  it('re-checks by itself when CODAP reports a component change after a failed check', async () => {
    const env = bootPage();
    ready(env, { gradeBand: 'k2' });
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    choose(env, 'datasetSelect', 'penguins');
    expect(env.el('graphTask').textContent).toBe('Make a graph that shows Species on one axis and Flipper length on the other.');
    // Before any check, a notice does nothing.
    env.fromPlugin({ type: 'allodatalab-codap-component-changed' });
    await tick(900);
    expect(env.toPlugin.filter((m) => m.type === 'allodatalab-graph-check').length).toBe(0);
    predict(env, 'Gentoo');
    env.el('graphCheckBtn').click();
    env.fromPlugin({ type: 'allodatalab-graph-report', id: env.last('allodatalab-graph-check').id, ...report(graph('Species', '')) });
    await tick();
    expect(env.el('graphFeedback').textContent).toContain('Your graph shows Species, but not Flipper length yet');
    env.fromPlugin({ type: 'allodatalab-codap-component-changed' }, {}); // not from the plugin: ignored
    env.fromPlugin({ type: 'allodatalab-codap-component-changed' });
    await tick(900);
    expect(env.toPlugin.filter((m) => m.type === 'allodatalab-graph-check').length).toBe(2);
    env.fromPlugin({ type: 'allodatalab-graph-report', id: env.last('allodatalab-graph-check').id, ...report(graph('Flipper length', 'Species')) });
    await tick();
    expect(env.el('graphFeedback').textContent).toContain('right columns');
  });
});

describe('claim check in the page', () => {
  it('asks how far the claim reaches, and flags "every single case" only when the data has a counterexample', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'g912' });
    choose(env, 'datasetSelect', 'planets');
    choose(env, 'questionSelect', 'planets_kepler');
    predict(env, 'up');
    expect(env.el('claimChecks').hidden).toBe(false);
    const write = () => {
      env.el('cerClaim').value = 'Planets farther from the Sun have longer years.';
      env.el('cerEvidence').value = 'Mercury takes 88 days and Neptune takes 59800 days.';
      env.el('cerReasoning').value = 'Each planet farther out in the table has a bigger number for the length of its year.';
      env.el('checkBtn').click();
    };
    write();
    expect(env.el('cerFeedback').textContent).toContain('Answer the two questions about your claim');
    env.d.querySelector('input[name="scope"][value="every"]').checked = true;
    env.d.querySelector('input[name="kind"][value="pattern"]').checked = true;
    write();
    expect(env.el('cerFeedback').textContent).toContain('fit together'); // Kepler: every planet fits
    expect(env.progress('investigation-done').map((m) => m.investigationId)).toEqual(['planets_kepler']);
  });

  it('flags "every single case" on Olympic times (1928 was slower than 1924) and a cause claim', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'g912' });
    choose(env, 'datasetSelect', 'olympic100');
    predict(env, 'down');
    env.d.querySelector('input[name="scope"][value="every"]').checked = true;
    env.d.querySelector('input[name="kind"][value="cause"]').checked = true;
    env.el('cerClaim').value = 'Winning times got smaller over the years.';
    env.el('cerEvidence').value = '12.0 seconds in 1896 and 9.79 in 2024.';
    env.el('cerReasoning').value = 'Later races in the table have smaller winning times than the early races.';
    env.el('checkBtn').click();
    const fb = env.el('cerFeedback').textContent;
    expect(fb).toContain('Not every case fits');
    expect(fb).toContain('Correlation is not causation');
    expect(env.el('revealBlock').hidden).toBe(true);
  });

  it('runs a group comparison: predict a species, then see each median', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'g35' });
    choose(env, 'datasetSelect', 'penguins');
    expect(env.el('questionSelect').value).toBe('penguins_flippers');
    const labels = [...env.d.querySelectorAll('#predictChoices .opt')].map((l) => l.textContent);
    expect(labels).toEqual(['Adelie', 'Gentoo', 'Chinstrap']); // order of first appearance in the data
    predict(env, 'Gentoo');
    expect(env.el('kindSet').hidden).toBe(true);
    env.d.querySelector('input[name="scope"][value="most"]').checked = true;
    env.el('cerClaim').value = 'Gentoo penguins have the longest flippers.';
    env.el('cerEvidence').value = 'Most Gentoo flippers are over 210 mm.';
    env.el('cerReasoning').value = 'The Gentoo dots sit higher on the flipper length axis than the other two kinds.';
    env.el('checkBtn').click();
    env.el('revealBtn').click(); // stage C: on demand
    const reveal = env.el('revealBody').textContent;
    expect(reveal).toContain('In this data, Gentoo has the highest middle value (median) of Flipper length.');
    expect(reveal).toContain('Gentoo: median 216 (123 cases)');
    expect(reveal).toContain('matched the data');
  });

  it('uses one select, not 50 radio buttons, for the state with the most seats', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'g35' });
    choose(env, 'datasetSelect', 'usHouse2020');
    expect(env.el('questionSelect').value).toBe('house_most');
    expect(env.d.querySelectorAll('input[name="prediction"]').length).toBe(0);
    const sel = env.el('predSelect');
    expect(sel.options.length).toBe(51);
    expect(env.d.querySelector('label[for="predSelect"]').textContent).toBe('Choose your prediction');
    env.el('lockBtn').click();
    expect(env.el('predictStatus').textContent).toContain('Choose or write a prediction first');
    sel.value = 'Texas';
    env.el('lockBtn').click();
    expect(env.el('predictStatus').textContent).toBe('Prediction locked: Texas');
    env.el('cerClaim').value = 'California has the most seats.';
    env.el('cerEvidence').value = 'California has 52 seats.';
    env.el('cerReasoning').value = 'No other state in the seats column has a number as big as 52.';
    env.el('checkBtn').click();
    env.el('revealBtn').click(); // stage C: on demand
    expect(env.el('revealBody').textContent).toContain('belongs to California');
    expect(env.el('revealBody').textContent).toContain('did not match');
  });
});

describe('class survey in the pop-up', () => {
  function surveyEnv(extra) {
    const env = bootPage();
    ready(env, extra);
    if (!extra || !extra.survey) choose(env, 'datasetSelect', 'classSurvey');
    return env;
  }
  const field = (env, i) => env.el('sv_' + i);
  it('adds checked answers, keeps them for the session only, and sends later ones straight to CODAP', async () => {
    const env = surveyEnv();
    expect(env.el('surveyBlock').hidden).toBe(false);
    const labels = [...env.d.querySelectorAll('#surveyFields label')].map((l) => [l.textContent, l.htmlFor]);
    expect(labels).toEqual([['Favorite fruit', 'sv_0'], ['Number of pets', 'sv_1'], ['How I get to school', 'sv_2']]);
    expect(field(env, 2).tagName).toBe('SELECT');
    env.el('surveyAddBtn').click();
    expect(env.el('surveyStatus').textContent).toBe('Fill in Favorite fruit first.');
    field(env, 0).value = 'Mango'; field(env, 1).value = '500'; field(env, 2).value = 'Bus';
    env.el('surveyAddBtn').click();
    expect(env.el('surveyStatus').textContent).toBe('Number of pets must be a number from 0 to 100.');
    expect(env.d.activeElement).toBe(field(env, 1));
    field(env, 1).value = '2';
    env.el('surveyAddBtn').click();
    expect(env.el('surveyStatus').textContent).toBe('Answer added. Answers in the table: 1. Pass to the next person.');
    expect(field(env, 0).value).toBe('');
    expect(env.d.activeElement).toBe(field(env, 0));
    expect([...env.d.querySelectorAll('#tableWrap tbody td')].map((td) => td.textContent)).toEqual(['Mango', '2', 'Bus']);

    // Load into CODAP (prediction first), then a new answer goes in as an item.
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    env.el('predictFree').value = 'Most people come by bus.';
    env.el('lockBtn').click();
    env.el('loadBtn').click();
    const create = env.last('allodatalab-create-dataset');
    expect(create.dataset.rows).toEqual([['Mango', 2, 'Bus']]);
    env.fromPlugin({ type: 'allodatalab-dataset-created', id: create.id, ok: true, rows: 1, name: 'Our class survey (you collect it)' });
    await tick();
    field(env, 0).value = 'Apple'; field(env, 1).value = '0'; field(env, 2).value = 'Walk';
    env.el('surveyAddBtn').click();
    const add = env.last('allodatalab-add-items');
    expect(add).toMatchObject({ contextName: 'Our class survey (you collect it)', rows: [['Apple', 0, 'Walk']] });
    env.fromPlugin({ type: 'allodatalab-items-added', id: add.id, ok: true, rows: 1 });
    await tick();
    expect(env.el('surveyStatus').textContent).toContain('Answer added here and in CODAP. Answers in the table: 2.');
    env.el('surveyUndoBtn').click();
    expect(env.el('surveyStatus').textContent).toContain('It is already in CODAP');

    // The launcher re-sends the catalog (same columns): the answers survive.
    ready(env);
    expect(env.d.querySelectorAll('#tableWrap tbody tr').length).toBe(1);
    // Nothing about the answers is sent to AlloFlow.
    expect(JSON.stringify(env.toOpener)).not.toContain('Mango');
  });

  it('copies answers as text (box when the clipboard is unavailable) and merges answers pasted from another device', () => {
    const env = surveyEnv();
    field(env, 0).value = 'Kiwi'; field(env, 1).value = '1'; field(env, 2).value = 'Car';
    env.el('surveyAddBtn').click();
    env.el('surveyCopyBtn').click();
    expect(env.el('surveyCopyBox').hidden).toBe(false);
    expect(env.el('surveyCopyBox').value).toBe('Favorite fruit,Number of pets,How I get to school\nKiwi,1,Car');
    env.el('surveyPaste').value = 'Favorite fruit,Number of pets,How I get to school\nPear,3,walk\nPlum,-2,Bus\nFig,0,Rocket';
    env.el('surveyPasteBtn').click();
    expect(env.el('surveyStatus').textContent).toBe('Answers added: 1. Lines skipped because they did not fit the survey: 2.');
    expect(env.d.querySelectorAll('#tableWrap tbody tr').length).toBe(2);
  });

  it('follows a teacher survey: its columns, its question, chosen for the class automatically; new columns start fresh', () => {
    const survey = { question: 'How many hours did you sleep last night?', columns: [{ name: 'Hours of sleep', type: 'number' }, { name: 'Bedtime', type: 'choice', choices: ['Before 9', '9 to 10', 'After 10'] }] };
    const env = surveyEnv({ survey: { question: survey.question }, catalog: api._buildCatalog(T, api._validSurvey(survey)) });
    expect(env.el('datasetSelect').value).toBe('classSurvey');
    expect(env.el('surveyQuestion').textContent).toBe('Survey question: How many hours did you sleep last night?');
    expect(env.el('surveyBadge').hidden).toBe(false);
    expect([...env.d.querySelectorAll('#surveyFields label')].map((l) => l.textContent)).toEqual(['Hours of sleep', 'Bedtime']);
    expect(env.el('questionSelect').value).toBe('survey_custom_common');
    field(env, 0).value = '8.5'; field(env, 1).value = '9 to 10';
    env.el('surveyAddBtn').click();
    expect(env.d.querySelectorAll('#tableWrap tbody tr').length).toBe(1);
    const changed = api._validSurvey({ ...survey, columns: [{ name: 'Hours of sleep', type: 'number' }] });
    ready(env, { survey: { question: survey.question }, catalog: api._buildCatalog(T, changed) });
    expect(env.d.querySelector('#tableWrap tbody td').textContent).toBe('No rows yet.');
  });
});

describe('paste a table, and a window opened on its own', () => {
  it('turns pasted rows into a dataset and sends it to CODAP', () => {
    const env = bootPage();
    ready(env);
    env.fromPlugin({ type: 'allodatalab-plugin-alive' });
    env.el('pasteData').value = 'nonsense';
    env.el('pasteBtn').click();
    expect(env.el('pasteStatus').textContent).toContain('did not look like a table');
    env.el('pasteTitle').value = 'Skate Lab runs';
    env.el('pasteData').value = 'Run,Height (m),Speed (m/s)\n1,2,6.26\n2,3,7.67';
    env.el('pasteBtn').click();
    expect(env.el('datasetSelect').value).toBe('ext1');
    const create = env.last('allodatalab-create-dataset');
    expect(create.dataset.title).toBe('Skate Lab runs');
    expect(create.dataset.attributes).toEqual([{ name: 'Run', unit: '', type: 'numeric' }, { name: 'Height', unit: 'm', type: 'numeric' }, { name: 'Speed', unit: 'm/s', type: 'numeric' }]);
    expect(create.dataset.rows).toEqual([[1, 2, 6.26], [2, 3, 7.67]]);
    expect(env.progress('dataset-loaded').length).toBe(0);
  });

  it('has the English starter datasets with no AlloFlow handshake, and says why', async () => {
    const env = bootPage();
    const ids = [...env.el('datasetSelect').options].map((o) => o.value).filter(Boolean);
    expect(ids).toEqual(['planets', 'olympic100', 'co2', 'penguins', 'faithful', 'usPopulation', 'usHouse2020', 'classSurvey']);
    Object.defineProperty(env.w, 'opener', { configurable: true, value: null });
    await tick(2700);
    expect(env.el('standaloneNote').hidden).toBe(false);
    choose(env, 'datasetSelect', 'faithful');
    expect(env.d.querySelectorAll('#tableWrap tbody tr').length).toBe(272);
  });

  it('keeps the fallback catalog identical to the launcher catalog (rerun work_datalab/stageB_sync_fallback.cjs after edits)', () => {
    const m = page.match(/var FALLBACK_CATALOG = (\[[\s\S]*?\]);\n  \/\/ == fallback catalog end ==/);
    expect(m).toBeTruthy();
    expect(m[1] === JSON.stringify(api._buildCatalog(T)), 'FALLBACK_CATALOG is out of step with the launcher catalog').toBe(true);
  });
});

// ── The CODAP plugin, run in jsdom against a fake CODAP endpoint ──────────
function bootPlugin(responder) {
  const pdom = new JSDOM(plugin.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ''), { url: 'https://data-lab.test/data_lab/tutor_plugin.html', runScripts: 'outside-only' });
  const w = pdom.window;
  const calls = [];
  w.iframePhone = { IframePhoneRpcEndpoint: function (handler) { this.call = (msg, cb) => { calls.push(msg); setTimeout(() => cb(responder(msg)), 0); }; w.__notify = handler; } };
  const replies = [];
  w.addEventListener('message', (e) => { if (e.data && /^allodatalab-(graph-report|items-added|codap-component-changed)$/.test(e.data.type)) replies.push(e.data); });
  w.eval(inlineScripts(plugin)[0]);
  const ask = (data) => w.dispatchEvent(new w.MessageEvent('message', { data, source: w, origin: 'https://data-lab.test' }));
  return { w, calls, replies, ask, close: () => w.close() };
}
describe('tutor plugin: graph report and survey items', () => {
  it('reads each graph through the documented component API, names only', async () => {
    const p = bootPlugin((msg) => {
      if (msg.resource === 'interactiveFrame') return { success: true };
      if (msg.resource === 'componentList') return { success: true, values: [{ id: 7, name: 'tutor_plugin', type: 'game' }, { id: 8, type: 'caseTable' }, { id: 9, type: 'graph' }, { id: 10, name: 'g2', type: 'graph' }] };
      if (msg.resource === 'component[9]') return { success: true, values: { type: 'graph', dataContext: 'The eight planets', xAttributeName: 'Distance from Sun', yAttributeName: 'Mean temperature', plotType: 'scatterPlot' } };
      if (msg.resource === 'component[10]') return { success: false };
      if (msg.resource === 'component[g2]') return { success: true, values: { type: 'graph', xAttributeName: 'Mass' } };
      return { success: false };
    });
    await tick(20);
    p.ask({ type: 'allodatalab-graph-check', id: 'g1' });
    await waitFor(() => p.replies.some((x) => x.type === 'allodatalab-graph-report'));
    const r = p.replies.find((x) => x.type === 'allodatalab-graph-report');
    expect(r).toMatchObject({ id: 'g1', ok: true, tables: 1, unreadable: 0 });
    expect(r.graphs).toEqual([
      { dataContext: 'The eight planets', x: 'Distance from Sun', y: 'Mean temperature', legend: '', top: '', right: '', plotType: 'scatterPlot' },
      { dataContext: '', x: 'Mass', y: '', legend: '', top: '', right: '', plotType: '' },
    ]);
    expect(p.calls.some((c) => /allCases/.test(c.resource || ''))).toBe(false);
    // A CODAP component notice is passed up as a bare "something changed".
    p.w.__notify({ action: 'notify', resource: 'component', values: { operation: 'attributeChange', type: 'DG.GraphView' } }, () => {});
    await tick();
    expect(p.replies.filter((x) => x.type === 'allodatalab-codap-component-changed')).toEqual([{ type: 'allodatalab-codap-component-changed' }]);
    p.close();
  });

  it('adds survey items only to a dataset that already exists', async () => {
    const p = bootPlugin((msg) => {
      if (msg.resource === 'dataContextList') return { success: true, values: [{ name: 'Class survey' }] };
      if (msg.action === 'create' && msg.resource === 'dataContext[Class survey].item') return { success: true, values: { itemIDs: [1] } };
      return { success: true };
    });
    await tick(20);
    p.ask({ type: 'allodatalab-add-items', id: 'a1', contextName: 'Other', attributes: [{ name: 'Pets' }], rows: [[2]] });
    p.ask({ type: 'allodatalab-add-items', id: 'a2', contextName: 'Class survey', attributes: [{ name: 'Pets' }, { name: 'Travel' }], rows: [[2, 'Bus']] });
    await waitFor(() => p.replies.filter((x) => x.type === 'allodatalab-items-added').length === 2);
    expect(p.replies.find((x) => x.id === 'a1')).toMatchObject({ ok: false, error: 'no-context' });
    expect(p.replies.find((x) => x.id === 'a2')).toMatchObject({ ok: true, rows: 1 });
    const create = p.calls.find((c) => c.resource === 'dataContext[Class survey].item');
    expect(create.values).toEqual([{ Pets: 2, Travel: 'Bus' }]);
    p.close();
  });
});
