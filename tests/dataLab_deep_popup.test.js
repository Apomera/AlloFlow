// Data Lab deep pass (2026-11-03): the companion page (data_lab/data_lab.html)
// and the CODAP tutor-link plugin (data_lab/tutor_plugin.html).
//
// 1. Pure helpers (Spearman trend, CER misconception checks, CODAP language
//    mapping, catalog/dataset sanitizers) run in a VM on the marked slices.
// 2. The whole page script runs in jsdom with a fake opener: translations,
//    offline-ask reporting, predict -> CER -> reveal, teacher assignment, and
//    the dataset hand-off to the plugin.
// 3. Pins on the CODAP embed: pinned release, no standalone mode, no "?" byte.
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
const slice = (code, start, end) => {
  const a = code.indexOf(start);
  const b = code.indexOf(end, a);
  expect(a, start).toBeGreaterThan(-1);
  expect(b, end).toBeGreaterThan(a);
  return code.slice(a, b);
};

// Launcher catalog + strings, built by running the launcher module.
function launcherApi() {
  const win = { location: { hostname: 'example.test', pathname: '/', href: 'https://example.test/', origin: 'https://example.test' }, StemLab: { registerTool() {} } };
  win.window = win;
  vm.runInNewContext(launcherSrc, { window: win, URL, console: { log() {} } });
  return win.StemLab.dataLab;
}

let core;
let prep;
let catalog;
beforeAll(() => {
  const pageCode = inlineScripts(page)[1];
  const coreCode = slice(pageCode, '// == data lab core start', '// == data lab core end');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(coreCode + '\nthis.core = { codapLangFor, codapFrameUrl, isRtl, spearman, trendDirection, evaluateTrend, evaluateMax, checkCER, sanitizeCatalog, fill };', ctx);
  core = ctx.core;
  const pluginCode = inlineScripts(plugin)[0];
  const prepCode = slice(pluginCode, '// == dataset prep start', '// == dataset prep end');
  const pctx = {};
  vm.createContext(pctx);
  vm.runInContext(prepCode + '\nthis.prepareDataset = prepareDataset;', pctx);
  prep = pctx.prepareDataset;
  catalog = launcherApi()._buildCatalog((k, fb) => fb);
});

const ds = (id) => catalog.find((d) => d.id === id);
const invOf = (d, id) => d.investigations.find((i) => i.id === id);

describe('trend and maximum, computed from the real starter data', () => {
  it('Spearman is exact on monotone, reversed and tied data', () => {
    expect(core.spearman([1, 2, 3, 4], [10, 20, 30, 1000])).toBeCloseTo(1, 10);
    expect(core.spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
    // ties share average ranks: x ranks 1,2,3.5,3.5 ; y ranks 1,2,3,4
    expect(core.spearman([1, 2, 5, 5], [1, 2, 3, 4])).toBeCloseTo(0.9487, 3);
    expect(core.spearman([1, 2], [1, 2])).toBeNull();
    expect(core.trendDirection(0.49)).toBe('none');
    expect(core.trendDirection(-0.5)).toBe('down');
    expect(core.trendDirection(null)).toBe('none');
  });

  it('gives the expected direction for every starter trend investigation', () => {
    const planets = ds('planets');
    expect(core.evaluateTrend(planets, invOf(planets, 'planets_cold')).direction).toBe('down');
    expect(core.evaluateTrend(planets, invOf(planets, 'planets_kepler')).rho).toBeCloseTo(1, 10);
    const gravity = core.evaluateTrend(planets, invOf(planets, 'planets_gravity'));
    expect(gravity.direction).toBe('up');
    expect(gravity.rho).toBeGreaterThan(0.6);
    expect(gravity.rho).toBeLessThan(0.8); // Saturn and Uranus break the "bigger = stronger" rule
    const oly = ds('olympic100');
    expect(core.evaluateTrend(oly, invOf(oly, 'olympic_faster')).direction).toBe('down');
    const co2 = ds('co2');
    expect(core.evaluateTrend(co2, invOf(co2, 'co2_rising')).rho).toBeCloseTo(1, 10);
  });

  it('finds Venus, not Mercury, as the hottest planet', () => {
    const planets = ds('planets');
    expect(core.evaluateMax(planets, invOf(planets, 'planets_hottest'))).toEqual({ label: 'Venus', value: 464 });
  });

  it('keeps the starter data internally consistent', () => {
    for (const d of catalog) {
      for (const r of d.rows) expect(r.length).toBe(d.attributes.length);
      for (const q of d.investigations) {
        for (const key of [q.x, q.y, q.attr, q.label].filter(Boolean)) expect(d.attributes.some((a) => a.key === key), q.id + ':' + key).toBe(true);
        expect(q.prompts.length).toBeGreaterThanOrEqual(3);
        for (const p of q.prompts) expect(p.trim().endsWith('?') || p.includes('?'), q.id + ' prompt asks a question: ' + p).toBe(true);
        expect(q.bands.length).toBeGreaterThan(0);
      }
      if (d.source.url) expect(d.source.url.startsWith('https://')).toBe(true);
    }
    for (const band of ['k2', 'g35', 'g68', 'g912']) {
      expect(catalog.some((d) => d.investigations.some((q) => q.bands.includes(band))), band).toBe(true);
    }
    expect(ds('co2').rows.length).toBe(2025 - 1959 + 1);
    expect(ds('co2').rows.at(-1)).toEqual([2025, 427.35]);
    expect(ds('olympic100').rows.length).toBe(30);
  });
});

// Stage B (2026-11-03 pm): the keyword lists are gone. The student classifies
// the claim (scope + pattern/cause), and the data decides "every single case".
describe('claim-evidence-reasoning misconception checks', () => {
  const w = (extra = {}) => ({
    attributeNames: ['Year', 'Winning time'],
    claimChecks: true, kindAsked: true, scope: 'most', claimKind: 'pattern',
    causalCaution: true, counterexample: true,
    ...extra,
  });
  const good = { claim: 'Winning times mostly got smaller over the years.', evidence: 'The time went from 12.0 seconds in 1896 to 9.79 in 2024.', reasoning: 'A smaller time means a faster runner, and most later races have smaller times than early ones.' };

  it('accepts a complete CER', () => {
    expect(core.checkCER(good, w())).toEqual([]);
  });
  it('names each misconception', () => {
    expect(core.checkCER({ ...good, claim: '' }, w())).toEqual(['no_claim']);
    expect(core.checkCER({ ...good, evidence: 'it got better' }, w())).toEqual(['no_data']);
    expect(core.checkCER({ ...good, evidence: 'Look at the winning time column' }, w())).toEqual([]);
    expect(core.checkCER(good, w({ claimKind: 'cause' }))).toEqual(['causal']);
    expect(core.checkCER(good, w({ scope: 'beyond' }))).toEqual(['beyond']);
    expect(core.checkCER(good, w({ scope: 'every' }))).toEqual(['counterexample']);
    expect(core.checkCER(good, w({ scope: '' }))).toEqual(['no_claim_type']);
    expect(core.checkCER({ ...good, reasoning: 'because faster' }, w())).toEqual(['short_reasoning']);
  });
  it('does not flag a cause where the investigation does not ask for it, nor "every case" when every case fits', () => {
    expect(core.checkCER(good, w({ causalCaution: false, claimKind: 'cause' }))).toEqual([]);
    expect(core.checkCER(good, w({ scope: 'every', counterexample: false }))).toEqual([]);
    expect(core.checkCER(good, w({ claimChecks: false, scope: '', claimKind: '' }))).toEqual([]);
  });
  it('does not depend on words: an "always" claim passes the word check, and digits in any script count as data', () => {
    expect(core.checkCER({ ...good, claim: 'Runners always get faster.' }, w())).toEqual([]);
    expect(core.checkCER({ ...good, evidence: 'الوقت ١٢ ثانية' }, w())).toEqual([]);
  });
});

describe('CODAP embed', () => {
  it('maps AlloFlow languages to CODAP languages and builds a pinned, non-standalone URL', () => {
    expect(core.codapLangFor('es')).toBe('es');
    expect(core.codapLangFor('pt')).toBe('pt-BR');
    expect(core.codapLangFor('zh')).toBe('zh-Hans');
    expect(core.codapLangFor('zh-TW')).toBe('zh-TW');
    expect(core.codapLangFor('en')).toBe('en-US');
    expect(core.codapLangFor('so')).toBe('');
    expect(core.codapLangFor('"><script>')).toBe('en-US');
    expect(core.isRtl('ar')).toBe(true);
    expect(core.isRtl('es')).toBe(false);
    const url = core.codapFrameUrl('https://codap.concord.org/app/version/3.1.2/index.html', 'https://x.test/data_lab/tutor_plugin.html', 'es');
    expect(url).toBe('https://codap.concord.org/app/version/3.1.2/index.html?di=https%3A%2F%2Fx.test%2Fdata_lab%2Ftutor_plugin.html&lang=es');
    expect(core.codapFrameUrl('B', 'P', 'so')).toBe('B?di=P');
  });

  it('pins CODAP 3.1.2, never uses standalone mode, and has no lost-ellipsis byte', () => {
    expect(page).toContain("var CODAP_BASE = 'https://codap.concord.org/app/version/3.1.2/index.html';");
    expect(page.includes('releases/latest'), 'unpinned CODAP URL').toBe(false);
    expect(/standalone=(true|yes|1)/.test(page), 'standalone mode hides the CODAP tool shelf').toBe(false);
    expect(page.includes('workspace?'), 'lost ellipsis byte').toBe(false);
    expect(page.includes('Loading the CODAP workspace…')).toBe(true);
    expect(launcherApi().codapVersion).toBe('3.1.2');
  });
});

describe('translation hand-off', () => {
  it('every string the launcher sends is applied by the pop-up, and every pop-up string is sent', () => {
    const sent = Object.keys(launcherApi()._popupStrings((k, fb) => fb));
    const code = inlineScripts(page)[1];
    const strBlock = slice(code, 'var STR = {', 'var STATIC_KEYS');
    const accepted = new Set([...strBlock.matchAll(/(?:^|[,{]\s*|\n\s+)(\w+):\s*'/g)].map((m) => m[1])
      .concat(JSON.parse(code.match(/var STATIC_KEYS = (\[[^\]]+\])/)[1].replace(/'/g, '"'))));
    const used = new Set([...code.matchAll(/S\('(\w+)'\)/g)].map((m) => m[1]).concat([...page.matchAll(/data-i18n(?:-[\w-]+)?="(\w+)"/g)].map((m) => m[1])));
    expect(sent.filter((k) => !accepted.has(k))).toEqual([]);
    expect([...used].filter((k) => !sent.includes(k))).toEqual([]);
    // Every launcher string is a literal t('stem.dataLab.…') call (scanner-visible).
    expect(/t\((?!'stem\.dataLab\.)[^)]/.test(launcherSrc.replace(/function t\(|\.t\(|[a-zA-Z]t\(/g, ''))).toBe(false);
  });
});

describe('catalog and dataset sanitizers', () => {
  it('drops non-https source links and bounds sizes', () => {
    const out = core.sanitizeCatalog([{ id: 'a', title: 't', source: { name: 'n', url: 'javascript:alert(1)' }, attributes: [{ key: 'k', name: 'K' }], rows: Array.from({ length: 3000 }, (_, i) => [i]), investigations: [{ id: 'q', question: 'Q?', kind: 'evil' }] }, null, { id: 5 }]);
    expect(out.length).toBe(1);
    expect(out[0].source.url).toBe('');
    expect(out[0].rows.length).toBe(2000);
    expect(out[0].investigations[0].kind).toBe('free');
  });
  it('plugin prepares bounded, bracket-free, uniquely named CODAP data', () => {
    // Stage D: a repeated name is renamed, and each value stays in its own column
    // (rows are in attribute order; dropping the repeat used to shift "note").
    const p = prep({ title: 'Run [1]', attributes: [{ name: 'speed [m/s]', unit: 'm/s', type: 'numeric' }, { name: 'speed [m/s]' }, { name: 'note' }], rows: [[1.5, 2, 'x'], [Infinity, 3, 'y'.repeat(500)], 'bad'] }, ['Run 1']);
    expect(p.name).toBe('Run 1 2');
    expect(p.attrs.map((a) => a.name)).toEqual(['speed m/s', 'speed m/s 2', 'note']);
    expect(p.items).toEqual([{ 'speed m/s': 1.5, 'speed m/s 2': 2, note: 'x' }, { 'speed m/s': '', 'speed m/s 2': 3, note: 'y'.repeat(200) }]);
    expect(prep({ attributes: [] })).toBeNull();
    expect(prep(null)).toBeNull();
  });
});

// ── Whole page in jsdom with a fake AlloFlow opener ──────────────────────
let dom = null;
afterEach(() => { if (dom) dom.window.close(); dom = null; });

function bootPage(query = '?v=2&theme=dark&lang=es') {
  dom = new JSDOM(page.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g, ''), { url: 'https://data-lab.test/data_lab/data_lab.html' + query, runScripts: 'outside-only' });
  const w = dom.window;
  const toOpener = [];
  const opener = { closed: false, postMessage: (d, target) => toOpener.push({ d, target }) };
  Object.defineProperty(w, 'opener', { configurable: true, value: opener });
  inlineScripts(page).forEach((code) => w.eval(code));
  const fromOpener = (data) => w.dispatchEvent(new w.MessageEvent('message', { data, source: opener, origin: 'https://alloflow.test' }));
  return { w, d: w.document, opener, toOpener, fromOpener, sent: (type) => toOpener.map((x) => x.d).filter((m) => m.type === type) };
}
function readyPayload(extra = {}) {
  const api = launcherApi();
  const t = (k, fb) => fb;
  return Object.assign({ type: 'allodatalab-ready', ai: false, lang: 'es', dir: 'ltr', gradeBand: 'g68', strings: api._popupStrings(t), catalog: api._buildCatalog(t), assignment: null }, extra);
}
function choose(env, selectId, value) {
  const el = env.d.getElementById(selectId);
  el.value = value;
  el.dispatchEvent(new env.w.Event('change', { bubbles: true }));
}
function writeCER(env, claim, evidence, reasoning) {
  env.d.getElementById('cerClaim').value = claim;
  env.d.getElementById('cerEvidence').value = evidence;
  env.d.getElementById('cerReasoning').value = reasoning;
  env.d.getElementById('checkBtn').click();
}
function predict(env, value) {
  const radio = env.d.querySelector('input[name="prediction"][value="' + value + '"]');
  radio.checked = true;
  env.d.getElementById('lockBtn').click();
}

describe('companion page behaviour', () => {
  it('says hello, sets the language, and applies translated strings from the launcher', () => {
    const env = bootPage();
    expect(env.sent('allodatalab-hello').length).toBeGreaterThan(0);
    expect(env.d.documentElement.lang).toBe('es');
    const strings = readyPayload().strings;
    strings.ask_btn = 'Preguntar';
    strings.lock_btn = 'Fijar mi predicción';
    strings.ask_placeholder = 'Pregunta…';
    strings.state_ai_off = 'IA desactivada.';
    env.fromOpener(readyPayload({ strings }));
    expect(env.d.getElementById('askBtn').textContent).toBe('Preguntar');
    expect(env.d.getElementById('lockBtn').textContent).toBe('Fijar mi predicción');
    expect(env.d.getElementById('askInput').getAttribute('placeholder')).toBe('Pregunta…');
    expect(env.d.getElementById('aiState').textContent).toBe('IA desactivada.');
    // A ready message from any other window is ignored.
    env.w.dispatchEvent(new env.w.MessageEvent('message', { data: readyPayload({ ai: true }), source: {}, origin: 'https://evil.test' }));
    expect(env.d.getElementById('aiState').textContent).toBe('IA desactivada.');
  });

  it('opens CODAP in the student language through the pinned build', () => {
    const env = bootPage('?v=2&lang=pt');
    expect(env.d.getElementById('codapFrame').getAttribute('src')).toBe('https://codap.concord.org/app/version/3.1.2/index.html?di=' + encodeURIComponent('https://data-lab.test/data_lab/tutor_plugin.html') + '&lang=pt-BR');
  });

  it('reports a no-AI question to the launcher so the Ask quests can count it', () => {
    const env = bootPage();
    env.fromOpener(readyPayload({ ai: false }));
    env.d.getElementById('askInput').value = '¿Qué miro primero?';
    env.d.getElementById('askForm').dispatchEvent(new env.w.Event('submit', { cancelable: true, bubbles: true }));
    expect(env.sent('allodatalab-offline-ask').length).toBe(1);
    expect(env.sent('allodatalab-ai-request').length).toBe(0);
  });

  it('runs predict -> second try -> reveal, with named misconceptions and no credit for a failed CER', () => {
    const env = bootPage();
    env.fromOpener(readyPayload());
    choose(env, 'datasetSelect', 'planets');
    expect(env.d.getElementById('questionSelect').value).toBe('planets_cold'); // first g68 question
    expect(env.d.getElementById('loadBtn').disabled).toBe(true);
    expect(env.d.getElementById('cerBlock').hidden).toBe(true);
    predict(env, 'up');
    expect(env.d.getElementById('loadBtn').disabled).toBe(false);
    expect(env.d.getElementById('cerBlock').hidden).toBe(false);
    expect(env.d.getElementById('predictStatus').textContent).toContain('It goes up');
    env.d.querySelector('input[name="scope"][value="beyond"]').checked = true;
    env.d.querySelector('input[name="kind"][value="pattern"]').checked = true;
    writeCER(env, 'Planets always get colder.', 'It gets cold out there.', 'Because.');
    const fb1 = env.d.getElementById('cerFeedback').textContent;
    expect(fb1).toContain('Overgeneralizing');
    expect(fb1).toContain('8 rows');
    expect(fb1).toContain('Evidence without data');
    expect(fb1).toContain('Reasoning too thin');
    expect(env.d.getElementById('revealBlock').hidden).toBe(true);
    writeCER(env, 'Planets always get colder.', 'It gets cold out there.', 'Because.');
    // Stage C: after the second try the comparison is offered, not shown.
    expect(env.d.getElementById('revealBlock').hidden).toBe(true);
    expect(env.d.getElementById('revealBtn').hidden).toBe(false);
    env.d.getElementById('revealBtn').click();
    expect(env.d.getElementById('revealBlock').hidden).toBe(false);
    const reveal = env.d.getElementById('revealBody').textContent;
    expect(reveal).toContain('Mean temperature tends to go down as Distance from Sun goes up');
    expect(reveal).toMatch(/Spearman’s rho\): −0\.9\d/);
    expect(reveal).toContain('did not match');
    expect(env.sent('allodatalab-progress').filter((m) => m.event === 'investigation-done').length).toBe(0);
    expect(env.d.getElementById('checkBtn').disabled).toBe(true);
  });

  it('reports a passed CER once and reveals a matched prediction', () => {
    const env = bootPage();
    env.fromOpener(readyPayload({ gradeBand: 'k2' }));
    choose(env, 'datasetSelect', 'planets');
    expect(env.d.getElementById('questionSelect').value).toBe('planets_hottest');
    predict(env, 'Venus');
    writeCER(env, 'Venus is the hottest planet.', 'Venus is 464 degrees and Mercury is 167.', 'Venus has the biggest number in the temperature column, so it is the hottest.');
    expect(env.d.getElementById('cerFeedback').textContent).toContain('fit together');
    env.d.getElementById('revealBtn').click(); // stage C: on demand
    const reveal = env.d.getElementById('revealBody').textContent;
    expect(reveal).toContain('belongs to Venus');
    expect(reveal).toContain('matched the data');
    expect(reveal).not.toContain('Spearman'); // no rho for K-2
    const done = env.sent('allodatalab-progress').filter((m) => m.event === 'investigation-done');
    expect(done).toEqual([{ type: 'allodatalab-progress', event: 'investigation-done', investigationId: 'planets_hottest', passed: true }]);
  });

  it('follows a teacher assignment: locked choices, own question, no reveal, no prediction gate', () => {
    const env = bootPage();
    env.fromOpener(readyPayload({ assignment: { datasetId: 'co2', investigationId: '', customQuestion: 'Did CO2 rise faster after 2000?', allowReveal: false, requirePrediction: false } }));
    expect(env.d.getElementById('datasetSelect').value).toBe('co2');
    expect(env.d.getElementById('datasetSelect').disabled).toBe(true);
    expect(env.d.getElementById('questionSelect').disabled).toBe(true);
    expect(env.d.getElementById('assignedBadge').hidden).toBe(false);
    expect(env.d.getElementById('questionText').textContent).toBe('Did CO2 rise faster after 2000?');
    expect(env.d.getElementById('loadBtn').disabled).toBe(false);
    expect(env.d.getElementById('predictFreeWrap').hidden).toBe(false);
    env.d.getElementById('predictFree').value = 'Yes, faster.';
    env.d.getElementById('lockBtn').click();
    writeCER(env, 'It rose faster after 2000.', 'From 1960 to 1980 it rose 21.85 ppm; from 2000 to 2020 it rose 44.50 ppm.', 'The rise in the later twenty years is about twice the rise in the earlier twenty years.');
    env.d.getElementById('revealBtn').click(); // stage C: on demand
    expect(env.d.getElementById('revealBody').textContent).toBe('Your teacher will go over the results with the class.');
  });

  it('hands datasets to the CODAP plugin only after the plugin says it is alive', () => {
    const env = bootPage();
    env.fromOpener(readyPayload());
    env.fromOpener({ type: 'allodatalab-load-dataset', dataset: { title: 'Skate run', source: 'Skate Lab', attributes: [{ name: 'time', unit: 's' }, { name: 'speed', unit: 'm/s' }], rows: [[0, 0], [1, 2.5]] } });
    expect(env.d.getElementById('datasetSelect').value).toBe('ext1');
    expect(env.d.getElementById('datasetStatus').textContent).toContain('not ready yet');
    expect(env.d.getElementById('log').textContent).toContain('Data arrived from Skate Lab: Skate run.');
    const toPlugin = [];
    const pluginWin = { postMessage: (d) => toPlugin.push(d) };
    // A plugin ping from another origin is ignored.
    env.w.dispatchEvent(new env.w.MessageEvent('message', { data: { type: 'allodatalab-plugin-alive' }, source: pluginWin, origin: 'https://evil.test' }));
    expect(toPlugin.length).toBe(0);
    env.w.dispatchEvent(new env.w.MessageEvent('message', { data: { type: 'allodatalab-plugin-alive' }, source: pluginWin, origin: 'https://data-lab.test' }));
    const create = toPlugin.find((m) => m.type === 'allodatalab-create-dataset');
    expect(create.dataset).toMatchObject({ title: 'Skate run', rows: [[0, 0], [1, 2.5]] });
    expect(create.dataset.attributes.map((a) => a.name)).toEqual(['time', 'speed']);
    expect(toPlugin.find((m) => m.type === 'allodatalab-plugin-strings')).toBeTruthy();
    // A forged reply from another window does not resolve the request.
    env.w.dispatchEvent(new env.w.MessageEvent('message', { data: { type: 'allodatalab-dataset-created', id: create.id, ok: true, rows: 2 }, source: {}, origin: 'https://data-lab.test' }));
    return new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
      expect(env.d.getElementById('datasetStatus').textContent).toContain('Sending the data');
      env.w.dispatchEvent(new env.w.MessageEvent('message', { data: { type: 'allodatalab-dataset-created', id: create.id, ok: true, rows: 2 }, source: pluginWin, origin: 'https://data-lab.test' }));
      return new Promise((resolve) => setTimeout(resolve, 5));
    }).then(() => {
      expect(env.d.getElementById('datasetStatus').textContent).toContain('Skate run is in CODAP as a table with 2 rows');
      // External data is not a starter dataset: no progress report.
      expect(env.sent('allodatalab-progress').length).toBe(0);
    });
  });

  it('shows every starter dataset as an accessible text table', () => {
    const env = bootPage();
    env.fromOpener(readyPayload());
    choose(env, 'datasetSelect', 'olympic100');
    const table = env.d.querySelector('#tableWrap table');
    expect(table.querySelector('caption').textContent).toBe('Olympic men’s 100 m winning times (30 rows)');
    expect([...table.querySelectorAll('th')].every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(table.querySelectorAll('tbody tr').length).toBe(30);
    expect(env.d.getElementById('datasetSource').querySelector('a').getAttribute('rel')).toContain('noopener');
  });
});
