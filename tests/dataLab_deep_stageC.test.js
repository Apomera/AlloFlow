// Data Lab stage C (2026-11-03 evening): coherence.
//   - one flow in every investigation: predict -> explore -> graph check ->
//     CER -> second try -> comparison ON DEMAND (a button, never automatic);
//     only a passing check counts, and the comparison closes the check;
//   - open questions now show what the data says (computed from the rows), the
//     class survey's "most common" question takes a pick-one prediction, and a
//     teacher's own question gets thinking prompts;
//   - a "Start here" learning path per grade band in the launcher, ticked from
//     saved progress, that opens the Data Lab on that investigation;
//   - quest labels follow the last render's language; a stale privacy key
//     (registered English said "never your values") is re-keyed.
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
const launcherSrc = read('stem_lab/stem_tool_datalab.js');
const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const T = (k, fb) => fb;

function launcherApi() {
  const win = { location: { hostname: 'example.test', pathname: '/', href: 'https://example.test/', origin: 'https://example.test' }, StemLab: { registerTool() {} } };
  win.window = win;
  vm.runInNewContext(launcherSrc, { window: win, URL, console: { log() {} } });
  return win.StemLab.dataLab;
}
let api;
let core;
beforeAll(() => {
  api = launcherApi();
  const code = inlineScripts(page)[1];
  const a = code.indexOf('// == data lab core start');
  const b = code.indexOf('// == data lab core end');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(code.slice(a, b) + '\nthis.core = { revealFacts, evaluateMode, sanitizeCatalog };', ctx);
  core = ctx.core;
});

// ── The pop-up page in jsdom ─────────────────────────────────────────────
let dom = null;
afterEach(() => { if (dom) dom.window.close(); dom = null; });
function bootPage(query = '?v=2&theme=dark&lang=en') {
  dom = new JSDOM(page.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g, ''), { url: 'https://data-lab.test/data_lab/data_lab.html' + query, runScripts: 'outside-only' });
  const w = dom.window;
  const toOpener = [];
  const opener = { closed: false, postMessage: (d) => toOpener.push(d) };
  Object.defineProperty(w, 'opener', { configurable: true, value: opener });
  inlineScripts(page).forEach((code) => w.eval(code));
  return {
    w, d: w.document, toOpener,
    fromOpener: (data, source = opener) => w.dispatchEvent(new w.MessageEvent('message', { data, source, origin: 'https://alloflow.test' })),
    done: () => toOpener.filter((m) => m.type === 'allodatalab-progress' && m.event === 'investigation-done').map((m) => m.investigationId),
    el: (id) => w.document.getElementById(id),
  };
}
function ready(env, extra = {}) {
  env.fromOpener(Object.assign({ type: 'allodatalab-ready', ai: false, lang: 'en', dir: 'ltr', gradeBand: 'g68', strings: api._popupStrings(T), catalog: api._buildCatalog(T), assignment: null }, extra));
}
function choose(env, id, value) { const el = env.el(id); el.value = value; el.dispatchEvent(new env.w.Event('change', { bubbles: true })); }
function predictAny(env) {
  const radio = env.d.querySelector('input[name="prediction"]');
  const sel = env.el('predSelect');
  if (radio) radio.checked = true;
  else if (sel) sel.value = sel.options[1].value;
  else env.el('predictFree').value = 'I think it will change.';
  env.el('lockBtn').click();
}
function claimTypes(env, scope = 'most') {
  const s = env.d.querySelector('input[name="scope"][value="' + scope + '"]');
  if (s && !env.el('claimChecks').hidden) s.checked = true;
  const k = env.d.querySelector('input[name="kind"][value="pattern"]');
  if (k && !env.el('kindSet').hidden) k.checked = true;
}
function writeGood(env) {
  env.el('cerClaim').value = 'The data answers the question in a clear way.';
  env.el('cerEvidence').value = 'The first value in the table is 12 and the last one is different.';
  env.el('cerReasoning').value = 'The numbers in the table change in the same way across most of the cases we looked at.';
  env.el('checkBtn').click();
}
function writeWeak(env) {
  env.el('cerClaim').value = 'Yes.';
  env.el('cerEvidence').value = 'It just does.';
  env.el('cerReasoning').value = 'Because.';
  env.el('checkBtn').click();
}

describe('one flow in every investigation, with the comparison on demand', () => {
  it('a passing check offers the comparison; it is never shown by itself, and credit is sent once', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'k2' });
    choose(env, 'datasetSelect', 'planets'); // planets_hottest
    predictAny(env);
    writeWeak(env);
    expect(env.el('cerFeedback').textContent).toContain('Revise, then check again');
    expect(env.el('revealBtn').hidden).toBe(true); // one try is not enough
    writeGood(env);
    expect(env.el('cerFeedback').textContent).toContain('fit together');
    expect(env.el('revealBlock').hidden).toBe(true); // stage B revealed here automatically
    expect(env.el('revealBtn').hidden).toBe(false);
    expect(env.el('checkBtn').disabled).toBe(true);
    expect(env.done()).toEqual(['planets_hottest']);
    env.el('revealBtn').click();
    expect(env.el('revealBlock').hidden).toBe(false);
    expect(env.el('revealBody').textContent).toContain('belongs to Venus');
    expect(env.el('revealBtn').hidden).toBe(true);
    expect(env.d.activeElement).toBe(env.el('revealHeading'));
    env.el('checkBtn').disabled = false; // even if forced, a second pass is not sent
    writeGood(env);
    expect(env.done()).toEqual(['planets_hottest']);
  });

  it('after two misses the student may compare (no credit) or keep revising (credit only before comparing)', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'k2' });
    choose(env, 'datasetSelect', 'planets');
    predictAny(env);
    writeWeak(env);
    writeWeak(env);
    expect(env.el('cerFeedback').textContent).toContain('If you compare first, this investigation will not count as finished');
    expect(env.el('revealBtn').hidden).toBe(false);
    expect(env.el('checkBtn').disabled).toBe(false);
    writeGood(env); // a third, passing try still counts
    expect(env.done()).toEqual(['planets_hottest']);

    env.w.close();
    const env2 = bootPage();
    ready(env2, { gradeBand: 'k2' });
    choose(env2, 'datasetSelect', 'planets');
    predictAny(env2);
    writeWeak(env2);
    writeWeak(env2);
    env2.el('revealBtn').click();
    expect(env2.el('revealBlock').hidden).toBe(false);
    expect(env2.el('checkBtn').disabled).toBe(true);
    env2.el('checkBtn').disabled = false; // even if forced: a check after the comparison earns nothing
    writeGood(env2);
    expect(env2.done()).toEqual([]);
  });

  it('every starter investigation runs predict -> graph task -> Step 4 CER -> button -> comparison', () => {
    const cat = api._buildCatalog(T);
    let count = 0;
    for (const ds of cat) {
      for (const q of ds.investigations) {
        const env = bootPage();
        ready(env, { gradeBand: q.bands[0] });
        choose(env, 'datasetSelect', ds.id);
        choose(env, 'questionSelect', q.id);
        expect(env.el('questionSelect').value, q.id).toBe(q.id);
        expect(env.el('loadBtn').disabled, q.id + ' predict first').toBe(true);
        expect(env.el('cerBlock').hidden, q.id).toBe(true);
        expect(env.el('graphBlock').hidden, q.id + ' has a graph step').toBe(false);
        expect(env.el('promptList').children.length, q.id).toBe(3);
        predictAny(env);
        expect(env.el('loadBtn').disabled, q.id).toBe(false);
        expect(env.el('cerStep').textContent, q.id).toBe('Step 4: Write a claim, the evidence for it, and your reasoning.');
        if (ds.id === 'classSurvey') {
          // Stage D: an empty survey cannot be finished, so the class answers first.
          for (const [fruit, pets, travel] of [['Kiwi', '1', 'Bus'], ['Fig', '0', 'Walk'], ['Pear', '2', 'Bus']]) {
            env.el('sv_0').value = fruit; env.el('sv_1').value = pets; env.el('sv_2').value = travel;
            env.el('surveyAddBtn').click();
          }
        }
        claimTypes(env);
        writeGood(env);
        expect(env.el('revealBlock').hidden, q.id + ' not automatic').toBe(true);
        expect(env.el('revealBtn').hidden, q.id + ' offered').toBe(false);
        env.el('revealBtn').click();
        expect(env.el('revealBody').textContent.length, q.id).toBeGreaterThan(20);
        expect(env.done(), q.id).toEqual([q.id]);
        env.w.close(); dom = null;
        count += 1;
      }
    }
    expect(count).toBe(21);
  }, 90000);
});

describe('what the data shows for open questions, computed from the rows', () => {
  const cat = () => core.sanitizeCatalog(api._buildCatalog(T));
  const facts = (dsId, invId) => { const d = cat().find((x) => x.id === dsId); return core.revealFacts(d, d.investigations.find((i) => i.id === invId)); };
  it('compares rates of change, centres, extremes and group correlations', () => {
    const co2 = facts('co2', 'co2_speed');
    expect(co2.map((f) => [f.map.from, f.map.to, Math.round(f.map.rate * 100) / 100])).toEqual([['1959', '1969', 0.86], ['2015', '2025', 2.63]]);
    const oly = facts('olympic100', 'olympic_predict');
    expect(oly[0].map.rate).toBeCloseTo(-0.0425, 4);
    expect(oly[1].map.rate).toBeCloseTo(-0.005, 4);
    const ff = facts('faithful', 'faithful_two');
    expect(ff[0].map).toMatchObject({ median: 4, min: 1.6, max: 5.1, n: 272 });
    expect(ff[0].map.mean).toBeCloseTo(3.488, 3);
    expect(ff[1].map).toEqual({ n: 37, total: 272, width: 0.5 }); // the average sits between the two bunches
    expect(facts('usPopulation', 'uspop_rate')[0].map).toMatchObject({ minLabel: '1940', min: 7.3, maxLabel: '1910', max: 21 });
    expect(facts('usHouse2020', 'house_fair')[0].map).toMatchObject({ maxLabel: 'Delaware', minLabel: 'Montana' });
    // Simpson's paradox, from the rows: negative overall, positive inside each species.
    const pb = facts('penguins', 'penguins_bills');
    expect(pb[0].key).toBe('fact_all_rho');
    expect(pb[0].map.rho).toBeLessThan(-0.2);
    const inside = pb.filter((f) => f.key === 'fact_group_rho');
    expect(inside.map((f) => f.map.group).sort()).toEqual(['Adelie', 'Chinstrap', 'Gentoo']);
    expect(inside.every((f) => f.map.rho > 0.3)).toBe(true);
  });

  it('shows the facts in the page after the comparison, formatted', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'g912' });
    choose(env, 'datasetSelect', 'penguins');
    choose(env, 'questionSelect', 'penguins_bills');
    predictAny(env);
    writeGood(env);
    env.el('revealBtn').click();
    const text = env.el('revealBody').textContent;
    expect(text).toContain('You predicted: “I think it will change.”');
    expect(text).toContain('With every case together, the rank correlation between Bill length and Bill depth is −0.22.');
    expect(text).toContain('Inside Gentoo only, the rank correlation between Bill length and Bill depth is 0.64.');
    expect(text).toContain('its sign tells you which way');
  });

  it('class survey "most common": predict from the choices, then compare with the class answers', () => {
    const env = bootPage();
    ready(env, { gradeBand: 'k2' });
    choose(env, 'datasetSelect', 'classSurvey');
    expect(env.el('questionSelect').value).toBe('survey_travel');
    const labels = [...env.d.querySelectorAll('#predictChoices .opt')].map((l) => l.textContent);
    expect(labels).toEqual(['Walk', 'Bus', 'Car', 'Bike or scooter', 'Another way']);
    env.d.querySelector('input[name="prediction"][value="Bus"]').checked = true;
    env.el('lockBtn').click();
    for (const [fruit, travel] of [['Kiwi', 'Bus'], ['Fig', 'Walk'], ['Pear', 'Bus']]) {
      env.el('sv_0').value = fruit; env.el('sv_1').value = '1'; env.el('sv_2').value = travel;
      env.el('surveyAddBtn').click();
    }
    claimTypes(env, 'every'); // not every answer is the same
    writeGood(env);
    expect(env.el('cerFeedback').textContent).toContain('Not every case fits');
    claimTypes(env, 'most');
    writeGood(env);
    env.el('revealBtn').click();
    const text = env.el('revealBody').textContent;
    expect(text).toContain('The most common answer for How I get to school is Bus: 2 of 3 answers.');
    expect(text).toContain('matched the data');
  });

  it('says so when the survey has no answers yet, and names ties', () => {
    const d = core.sanitizeCatalog(api._buildCatalog(T)).find((x) => x.id === 'classSurvey');
    expect(core.evaluateMode(d, { attr: 'travel' })).toBeNull();
    d.rows = [['a', 1, 'Bus'], ['b', 2, 'Walk']];
    expect(core.evaluateMode(d, { attr: 'travel' })).toEqual({ tops: ['Bus', 'Walk'], n: 1, total: 2 });
    const pets = core.revealFacts(d, d.investigations.find((i) => i.id === 'survey_pets'));
    expect(pets[0].map).toMatchObject({ median: 1.5, mean: 1.5, n: 2 });
  });

  it('a teacher survey with a pick-from-a-list column gets a pick-one prediction', () => {
    const sv = api._validSurvey({ question: 'Bedtime?', columns: [{ name: 'Bedtime', type: 'choice', choices: ['Before 9', 'After 9'] }, { name: 'Nickname', type: 'text' }] });
    expect(api._buildCatalog(T, sv).find((d) => d.id === 'classSurvey').investigations[0]).toMatchObject({ id: 'survey_custom_common', kind: 'mode', attr: 'c0' });
    const text = api._validSurvey({ question: 'Food?', columns: [{ name: 'Food', type: 'text' }] });
    expect(api._buildCatalog(T, text).find((d) => d.id === 'classSurvey').investigations[0]).toMatchObject({ kind: 'free', facts: [{ type: 'center', attr: 'c0' }] });
  });

  it("a teacher's own question gets thinking prompts, and its CER is Step 3 (no graph to check)", () => {
    const env = bootPage();
    ready(env, { assignment: { datasetId: 'co2', investigationId: '', customQuestion: 'Did CO2 rise faster after 2000?', allowReveal: true, requirePrediction: true } });
    expect([...env.el('promptList').children].map((li) => li.textContent)).toEqual([
      'Which columns in this data help answer the question?',
      'What graph would show the answer? Which column goes across the bottom?',
      'Is there a case that does not fit what you expect? What could explain it?',
    ]);
    expect(env.el('graphBlock').hidden).toBe(true);
    predictAny(env);
    expect(env.el('cerStep').textContent).toBe('Step 3: Write a claim, the evidence for it, and your reasoning.');
  });

  it('drops unknown fact types from the catalog', () => {
    const out = core.sanitizeCatalog([{ id: 'a', title: 't', attributes: [{ key: 'k', name: 'K' }], rows: [[1]], investigations: [{ id: 'q', question: 'Q?', kind: 'mode', facts: [{ type: 'evil' }, { type: 'center', attr: 'k', width: 'x' }] }] }]);
    expect(out[0].investigations[0].kind).toBe('mode');
    expect(out[0].investigations[0].facts).toEqual([{ type: 'center', attr: 'k', label: '', x: '', y: '', group: '', width: 0, from: 0, to: 0 }]);
  });
});

describe('opening the Data Lab on a learning-path step', () => {
  it('opens on ?start=<id>, and switches when AlloFlow asks; ignores bad ids, other windows and assigned work', () => {
    const env = bootPage('?v=2&theme=dark&lang=en&start=faithful_two');
    expect(env.el('datasetSelect').value).toBe('faithful');
    expect(env.el('questionSelect').value).toBe('faithful_two');
    ready(env, { gradeBand: 'k2' });
    expect(env.el('questionSelect').value).toBe('faithful_two'); // the handshake keeps it
    env.fromOpener({ type: 'allodatalab-focus', investigationId: 'house_most' });
    expect(env.el('questionSelect').value).toBe('house_most');
    env.fromOpener({ type: 'allodatalab-focus', investigationId: 'co2_rising' }, {}); // not the opener
    env.fromOpener({ type: 'allodatalab-focus', investigationId: 'no<such>' });
    env.fromOpener({ type: 'allodatalab-focus', investigationId: 'nope' });
    expect(env.el('questionSelect').value).toBe('house_most');
    ready(env, { assignment: { datasetId: 'planets', investigationId: 'planets_cold', customQuestion: '', allowReveal: true, requirePrediction: true } });
    env.fromOpener({ type: 'allodatalab-focus', investigationId: 'co2_rising' });
    expect(env.el('questionSelect').value).toBe('planets_cold');
  });
});

// ── Launcher ──────────────────────────────────────────────────────────────
describe('launcher: Start here path, quests and keys', () => {
  let root = null;
  let dl = null;
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    dl = window.StemLab.dataLab;
    document.body.innerHTML = '<div id="root"></div>';
    document.documentElement.lang = 'en';
    delete window.__alloDataLabInbox;
  });
  afterEach(async () => {
    if (root) await React.act(() => root.unmount());
    root = null;
    if (dl) dl._reset();
    vi.restoreAllMocks();
  });
  async function mount(extra) {
    const out = { latest: null };
    function App(props) {
      const [state, setState] = React.useState(props.seed || {});
      out.latest = state;
      return window.StemLab._registry.dataLab.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, announceToSR() {}, awardXP() {} }, extra || {})));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => root.render(React.createElement(App, { seed: extra && extra.seed })));
    return out;
  }
  const steps = () => [...document.querySelectorAll('[data-path-step]')];

  it('every band has 3 to 5 steps, each one meant for that band, all on the shown catalog', () => {
    const cat = dl._buildCatalog(T);
    for (const band of ['k2', 'g35', 'g68', 'g912']) {
      const p = dl._learningPath(cat, band, [], []);
      expect(p.length, band).toBeGreaterThanOrEqual(3);
      expect(p.length, band).toBeLessThanOrEqual(5);
      expect(p.length, band).toBe(dl._paths[band].length);
      for (const s of p) expect(s.inv.bands, band + ' ' + s.inv.id).toContain(band);
    }
    // A teacher survey replaces the starter survey's step.
    const sv = dl._validSurvey({ question: 'Pets?', columns: [{ name: 'Pets', type: 'number' }] });
    expect(dl._learningPath(dl._buildCatalog(T, sv), 'g35', [], []).map((s) => s.inv.id)).toContain('survey_custom_typical');
  });

  it('shows the band path in order with ticks from saved progress and marks the next step', async () => {
    await mount({ gradeBand: 'g35', seed: { _dataLab: { completedInvestigations: ['house_most'], graphsMade: ['house_most', 'penguins_flippers'] } } });
    expect(steps().map((li) => li.getAttribute('data-path-step'))).toEqual(['house_most', 'penguins_flippers', 'survey_pets', 'planets_cold', 'co2_rising']);
    expect(document.getElementById('datalab-path-h').textContent).toContain('Start here: your path for Grades 3–5');
    const [s1, s2, s3] = steps().map((li) => li.textContent);
    expect(s1).toContain('✓ Graph checked by CODAP');
    expect(s1).toContain('✓ Claim finished');
    expect(s1).not.toContain('Next');
    expect(s2).toContain('✓ Graph checked by CODAP');
    expect(s2).toContain('○ Claim not finished yet');
    expect(s2).toContain('Next');
    expect(s3).toContain('○ Graph not checked yet');
    expect(document.body.textContent).toContain('Finished on this path: 1 of 5.');
    expect(document.querySelector('[data-path-start="penguins_flippers"]').getAttribute('aria-label')).toBe('Start step 2: Which kind of penguin has the longest flippers?');
  });

  it('opens the Data Lab on the step, or tells an open window to switch to it', async () => {
    await mount({ gradeBand: 'k2' });
    const posted = [];
    const win = { closed: false, focus() {}, postMessage: (d) => posted.push(d), close() { this.closed = true; }, location: { href: 'about:blank' } };
    const open = vi.spyOn(window, 'open').mockReturnValue(win);
    await React.act(() => document.querySelector('[data-path-start="penguins_flippers"]').click());
    expect(win.location.href).toContain('&start=penguins_flippers');
    expect(open).toHaveBeenCalledTimes(1);
    await React.act(() => document.querySelector('[data-path-start="olympic_faster"]').click());
    expect(posted.filter((m) => m.type === 'allodatalab-focus')).toEqual([{ type: 'allodatalab-focus', investigationId: 'olympic_faster' }]);
    expect(open).toHaveBeenCalledTimes(1); // the window was reused, not reloaded
  });

  it('hides the start buttons while a teacher assignment is set, and says why', async () => {
    await mount({ gradeBand: 'g68', seed: { _dataLab: { assignment: { datasetId: 'co2', investigationId: 'co2_rising' } } } });
    expect(steps().length).toBe(5);
    expect(document.querySelectorAll('[data-path-start]').length).toBe(0);
    expect(document.body.textContent).toContain('Your teacher set an investigation');
  });

  it('quest labels follow the last render language; the new quests read saved progress', async () => {
    const t = (k, fb) => ({ 'stem.dataLab.quest_open': 'Abre el laboratorio de datos', 'stem.dataLab.quest_cer': 'Termina una investigación' }[k] || fb);
    const hooks = window.StemLab._registry.dataLab.questHooks;
    await mount({ t });
    expect(hooks.find((q) => q.id === 'dl_open').label).toBe('Abre el laboratorio de datos');
    expect(hooks.find((q) => q.id === 'dl_cer').label).toBe('Termina una investigación');
    expect(hooks.map((q) => q.id)).toEqual(['dl_open', 'dl_ask', 'dl_ask3', 'dl_graph', 'dl_cer']);
    expect(hooks.find((q) => q.id === 'dl_graph').check({ graphsMade: ['planets_cold'] })).toBe(true);
    expect(hooks.find((q) => q.id === 'dl_cer').check({ completedInvestigations: [] })).toBe(false);
    expect(hooks.find((q) => q.id === 'dl_cer').check(null)).toBe(false);
  });

  it('no longer reads the privacy keys whose registered English says the tutor never sees values', async () => {
    const stale = { 'stem.dataLab.privacy1': 'Your data values never leave the workspace', 'stem.dataLab.blurb': 'never your values' };
    await mount({ t: (k, fb) => stale[k] || fb });
    expect(document.body.textContent).not.toContain('never leave the workspace');
    expect(document.body.textContent).not.toContain('never your values');
    expect(document.body.textContent).toContain('up to 20 rows from each table');
  });
});
