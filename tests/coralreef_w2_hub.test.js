import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Wave 2: the Start page path reads progress only from fields the sections
// write. Fixtures are built with the tool's own functions.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let X, S, W, SCI;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; W = window.__RR_TEST_EXPORTS__.coralReefW2; SCI = window.__RR_TEST_EXPORTS__.coralReefSci;
});
const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const stepsOf = (host) => Object.fromEntries([...host.querySelectorAll('[data-w2-step]')].map((li) => [li.dataset.w2Step, li.dataset.state]));

// A saved survey entry made the way the Results step saves one.
function entry(siteId, n) {
  const site = X.siteById(siteId), seed = S.transectSeed(site, n), layout = X.buildTransect(site, seed), records = {}, fish = {};
  layout.points.forEach((p, i) => { records[i] = p.category; });
  const score = X.scoreSurvey(layout, records, X.fishInBelt(layout));
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, seed), siteId, seed, transect: n, modelYear: null, at: n, agreement: score.agreement, recorded: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
}
const speciesIds = () => X.SPECIES_META.filter((m) => m.group !== 'structure').map((m) => m.id);
const FULL = () => ({
  speciesLog: Object.fromEntries(speciesIds().slice(0, 10).map((id) => [id, { at: 1 }])),
  // the record MarinePractice writes when a round ends
  speciesPractice: { rounds: 2, answered: 10, correct: 8, last: { total: 5, correct: 4, skipped: 0, hinted: 1, missedIds: ['clownfish'], finishedAt: 1 } },
  surveyLog: [entry('reserve', 1), entry('reserve', 2), entry('harbor', 1)],
  srvClaim: { type: 'more_live', a: 'reserve', b: 'harbor', evidence: { live: true }, checked: true, checks: 1 },
  sciBleach: Object.assign(SCI.bleachSetup({}), { pred: 'some', revealed: true }),
  sciBudget: Object.assign(SCI.budgetSetup({}), { pred: 'shrink', revealed: true }),
  sciSeaweed: { pred: 'more', started: true, revealed: true },
  modelPredictions: { recent: { choice: 'lower' } }, modelRevealedFor: { recent: true }, modelRevealed: true
});
function withPractice(d, n) {
  const pts = [];
  // PRACTICE_POINTS categories, read from the methods page itself.
  const host = dom(renderTool('coralReef', { coralReef: { section: 'methods' } }));
  const n8 = host.querySelectorAll('[data-w2-pcard]').length;
  for (let i = 0; i < Math.min(n, n8); i++) pts.push([i, 'sand']);
  return Object.assign({}, d, { practice: Object.fromEntries(pts) });
}

describe('Start page progress comes from real fields', () => {
  it('empty toolData: every step not started, and the next step is the dive', () => {
    const p = W.progress({});
    expect(W.PATH.map((s) => s.id)).toEqual(['explore', 'guide', 'methods', 'survey', 'compare', 'science', 'model']);
    for (const s of W.PATH) expect(p.steps[s.id].state, s.id).toBe('todo');
    expect(p.done).toBe(0); expect(p.next).toEqual({ id: 'explore', why: 'first' });
    const host = dom(renderTool('coralReef', { coralReef: { section: 'hub' } }));
    expect(Object.values(stepsOf(host))).toEqual(Array(7).fill('todo'));
    expect(host.querySelector('[data-w2-next]').dataset.w2Next).toBe('explore');
    expect(host.textContent).toContain('Start here');
    expect(host.textContent).toContain('0 of 7 steps done');
    expect(host.querySelector('[data-w2-step="explore"]').dataset.next).toBe('true');
  });

  it('a fixture with every section\'s real progress shows every step done', () => {
    const d = withPractice(FULL(), 8);
    const host = dom(renderTool('coralReef', { coralReef: Object.assign({ section: 'hub' }, d) }));
    expect(stepsOf(host)).toEqual({ explore: 'done', guide: 'done', methods: 'done', survey: 'done', compare: 'done', science: 'done', model: 'done' });
    expect(host.textContent).toContain('7 of 7 steps done');
    expect(host.querySelector('[data-w2-next]').dataset.w2Why).toBe('all_done');
    expect(host.textContent).toContain('Practice rounds finished: 2. Last round: 4 of 5 correct.');
    expect(host.textContent).toContain('Transects saved: 3. Most at one reef: 2.');
  });

  it.each([
    ['explore', (d) => { d.speciesLog = Object.fromEntries(speciesIds().slice(0, 9).map((id) => [id, {}])); }, 'started'],
    ['guide', (d) => { delete d.speciesPractice; }, 'todo'],
    ['guide', (d) => { d.speciesPractice = { rounds: 0 }; d.speciesFieldNotes = { clownfish: 'orange' }; }, 'started'],
    ['methods', (d) => { Object.assign(d, withPractice({}, 3)); }, 'started'],
    ['survey', (d) => { d.surveyLog = [entry('reserve', 1), entry('harbor', 1)]; }, 'started'],
    ['compare', (d) => { d.srvClaim = Object.assign({}, d.srvClaim, { checked: false }); }, 'started'],
    ['compare', (d) => { d.surveyLog = [entry('reserve', 1), entry('reserve', 2)]; }, 'todo'],
    ['science', (d) => { d.sciBudget = { pred: 'grow' }; }, 'started'],
    ['model', (d) => { d.modelRevealedFor = {}; d.modelRevealed = false; }, 'started']
  ])('%s alone not finished shows %s', (id, mutate, want) => {
    const d = withPractice(FULL(), 8); mutate(d);
    const st = W.progress(d).steps;
    expect(st[id].state, id).toBe(want);
    const host = dom(renderTool('coralReef', { coralReef: Object.assign({ section: 'hub' }, d) }));
    expect(stepsOf(host)[id]).toBe(want);
  });

  it('counts transects per reef with the same rule as summarizeLog', () => {
    const log = [entry('reserve', 1), entry('reserve', 2), entry('harbor', 1), entry('heatwave', 1)];
    const groups = W.logGroups(log), summary = X.summarizeLog(log);
    expect(Object.keys(groups).length).toBe(summary.length);
    for (const g of summary) expect(groups[g.key], g.key).toBe(g.entries.length);
  });

  it('a scenario run from a saved survey counts once for its scenario; custom never counts', () => {
    const st = W.progress({ modelRevealedFor: { recent: true, 'recent@reserve': true, 'reserve@harbor': true, custom: true } }).steps.model;
    expect(st.ran).toBe(2); expect(st.state).toBe('done');
  });
});

describe('pick up where you left off', () => {
  it('unfinished work comes first, in a fixed order', () => {
    const d = { surveyLog: [entry('reserve', 1)], records: { 0: 'sand', 1: 'rock' }, surveySaved: false, modelPredictions: { recent: { choice: 'lower' } }, sciBleach: { pred: 'most' } };
    expect(W.progress(d).next).toEqual({ id: 'survey', why: 'unsaved' });
    d.surveySaved = true; expect(W.progress(d).next).toEqual({ id: 'model', why: 'model_pending' });
    d.modelRevealedFor = { recent: true }; expect(W.progress(d).next).toEqual({ id: 'science', why: 'sci_pending', topic: 'heat' });
    // one investigation run of three: carry on with Reef science
    d.sciBleach.revealed = true; expect(W.progress(d).next).toEqual({ id: 'science', why: 'continue' });
  });
  it('continues from the furthest step reached, not from the first unfinished one', () => {
    // A learner who has surveyed but not dived continues the survey (one transect).
    expect(W.progress({ surveyLog: [entry('reserve', 1)] }).next).toEqual({ id: 'survey', why: 'continue' });
    // Survey done: the next step after it.
    expect(W.progress({ surveyLog: [entry('reserve', 1), entry('reserve', 2)] }).next).toEqual({ id: 'compare', why: 'next' });
    // Everything after done: back to a skipped step.
    const d = withPractice(FULL(), 8); delete d.speciesPractice;
    expect(W.progress(d).next).toEqual({ id: 'guide', why: 'skipped' });
  });
});

describe('the Start page buttons', () => {
  const mounted = [];
  afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
  async function mount(seed) {
    let data = { coralReef: Object.assign({ section: 'hub' }, seed) };
    const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
    function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k }); }
    const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
    await React.act(async () => root.render(React.createElement(Shell))); return t;
  }
  const click = async (el) => { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); };
  it('opens the methods practice where it was left, and keeps the answers', async () => {
    const seed = withPractice({}, 3), t = await mount(seed);
    expect(t.host.querySelector('[data-w2-next]').dataset.w2Why).toBe('methods_partial');
    await click(t.host.querySelector('[data-w2-go]'));
    expect(t.data.section).toBe('methods'); expect(t.data.w2MethodsPart).toBe('practice'); expect(t.data.practice).toEqual(seed.practice);
    const panel = t.host.querySelector('[data-w2-mpanel="practice"]');
    expect(panel.hidden).toBe(false);
    // the first unanswered point is the one on show
    expect([...panel.querySelectorAll('[data-w2-pcard]')].filter((c) => !c.hidden).map((c) => c.dataset.w2Pcard)).toEqual(['3']);
  });
  it('opens Reef science on the investigation that is waiting for its run', async () => {
    const t = await mount({ sciSeaweed: { pred: 'same' } });
    await click(t.host.querySelector('[data-w2-go]'));
    expect(t.data.section).toBe('science'); expect(t.data.sciTopic).toBe('seaweed');
  });
  it('every step card opens its own section', async () => {
    for (const id of ['methods', 'survey', 'compare', 'science', 'model']) {
      const t = await mount({});
      await click(t.host.querySelector('[data-w2-step="' + id + '"] button'));
      expect(t.data.section, id).toBe(id);
    }
  });
});

describe('filled states pass axe', () => {
  it.each([
    ['hub in progress', () => { const d = withPractice(FULL(), 3); d.sciBudget = { pred: 'grow' }; d.records = { 0: 'sand' }; return Object.assign({ section: 'hub' }, d); }],
    ['hub all done', () => Object.assign({ section: 'hub' }, withPractice(FULL(), 8))],
    ['methods practice answered', () => ({ section: 'methods', w2MethodsPart: 'practice', practice: { 0: 'hard_coral', 1: 'rock' } })],
    ['methods field guide', () => ({ section: 'methods', w2MethodsPart: 'guide' })]
  ])('%s has no WCAG A/AA violations', async (name, make) => {
    const result = await runIsolatedAxe(renderTool('coralReef', { coralReef: make() }));
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), name).toEqual([]);
  }, 30000);
});
