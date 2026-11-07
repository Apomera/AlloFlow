import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';
import { readFileSync } from 'node:fs';

// Round 5 lane "report": My reef report. Every block comes from saved fields and
// the sections' own functions; no block shows without data; a key or a model
// outcome never shows before the screen would show it; nothing leaves the device.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SOURCE = readFileSync(TOOL, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 60000 });
let X, S, SCI, M, W, R, PR;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  const E = window.__RR_TEST_EXPORTS__;
  X = E.coralReef; S = E.coralReefSurvey; SCI = E.coralReefSci; M = E.coralReefModel; W = E.coralReefW2; R = E.coralReefReport; PR = E.coralReefPrint;
});
const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const view = (extra, theme) => dom(renderTool('coralReef', { coralReef: Object.assign({ section: 'report' }, extra) }, theme ? { theme } : undefined));
const block = (host, id) => host.querySelector('[data-rep-block="' + id + '"]');
// Printed text only: drop the page's own controls and instructions to the student.
const pc = (v) => Math.round(v * 100);

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(seed) {
  let data = { coralReef: Object.assign({ section: 'report' }, seed) };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; }, q: (s) => host.querySelector(s), all: (s) => [...host.querySelectorAll(s)] }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const act = (fn) => React.act(async () => { fn(); });
async function type(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const button = (t, text) => t.all('button').find((b) => b.textContent.trim() === text);

// A saved entry made the way the Results step saves one.
function entry(siteId, n, opts = {}) {
  const site = X.siteById(siteId), seed = S.transectSeed(site, n), L = X.buildTransect(site, seed), records = {};
  L.points.forEach((p, i) => { if (opts.upTo == null || i < opts.upTo) records[i] = (opts.wrong && i % opts.wrong === 3) ? (p.category === 'rock' ? 'sand' : 'rock') : p.category; });
  const score = X.scoreSurvey(L, records, opts.noFish ? {} : X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  const e = { id: X.surveyEntryId(site, seed), siteId, seed, transect: n, modelYear: null, at: n, agreement: score.agreement, recorded: Object.keys(records).length, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
  if (opts.inverts) e.inverts = opts.inverts;
  return e;
}
const groupsOf = (log) => R.surveys(log).groups;
const INV = { banded_coral_shrimp: 2, diadema_urchin: 4, crown_of_thorns: 0, triton: 0, lobster: 0, pencil_urchin: 0, collector_urchin: 0, sea_cucumber: 1, giant_clam: 0 };

describe('getting there', () => {
  it('is a link at the end of the path, not an eighth step', () => {
    const hub = dom(renderTool('coralReef', { coralReef: { section: 'hub' } }));
    expect(hub.querySelectorAll('[data-w2-step]')).toHaveLength(7);
    expect(hub.querySelector('.w2-steps [data-rep-entry]')).toBeNull();
    const entryBox = hub.querySelector('.cr-journey > [data-rep-entry]');
    expect(entryBox).toBeTruthy();
    expect(entryBox.previousElementSibling.className).toBe('w2-phases');
    expect(entryBox.querySelector('button[data-rep-open]').textContent).toContain('Open my report');
    expect([...hub.querySelectorAll('nav.cr-nav button')].some((b) => /report/i.test(b.textContent))).toBe(false);
  });

  it('never changes the graded path, whatever myReport holds', () => {
    const before = W.progress({});
    const after = W.progress({ myReport: { name: 'A', date: '2026-11-05', questions: 'Why?' }, section: 'report' });
    expect(after).toEqual(before);
    expect(before.total).toBe(7);
    expect(W.PATH).toHaveLength(7);
  });

  it('counts parts with work for the Start page without counting typed questions as work', () => {
    expect(R.partsWithWork({})).toBe(0);
    expect(R.partsWithWork({ myReport: { questions: 'Why?' } })).toBe(0);
    expect(R.partsWithWork({ surveyLog: [entry('reserve', 1)] })).toBe(1);
    expect(R.partsWithWork({ surveyLog: [entry('reserve', 1)], speciesLog: { clownfish: { firstSeen: 1 } }, sciBudget: { pred: 'grow' }, srvClaim: { type: 'own' } })).toBe(R.PARTS);
    const hub = dom(renderTool('coralReef', { coralReef: { section: 'hub', surveyLog: [entry('reserve', 1)] } }));
    expect(hub.querySelector('[data-rep-entry]').textContent).toContain('1 of its 4 parts');
  });

  it('opens from Start, focuses the heading, and goes back without dropping focus', async () => {
    const t = await mount({ section: 'hub' });
    t.q('[data-rep-open]').focus();
    await act(() => t.q('[data-rep-open]').click());
    expect(t.data.section).toBe('report');
    expect(t.q('[data-rep-doc]')).toBeTruthy();
    expect(document.activeElement.tagName).toBe('H2');
    await act(() => t.q('[data-rep-back]').click());
    expect(t.data.section).toBe('hub');
    expect(document.activeElement.tagName).toBe('H2');
  });

  it('an unknown section still falls back to Start', () => {
    expect(view({ section: 'nonsense' }).querySelector('[data-rep-doc]')).toBeNull();
    expect(view({ section: 'nonsense' }).querySelector('[data-w2-next]')).toBeTruthy();
  });
});

describe('empty report', () => {
  it('every block says what to do next and links there, with no number passed off as a result', () => {
    const host = view({});
    for (const id of ['species', 'surveys', 'model', 'labs', 'claim']) {
      const e = host.querySelector('[data-rep-empty="' + id + '"]');
      expect(e, id).toBeTruthy();
      expect(e.querySelector('button[data-rep-screen]'), id).toBeTruthy();
      expect(e.querySelector('p').textContent.length, id).toBeGreaterThan(20);
    }
    const doc = host.querySelector('[data-rep-doc]');
    expect(doc.querySelectorAll('table')).toHaveLength(0);
    expect(doc.textContent).not.toMatch(/\b0\s?%|\b0 of\b|: 0\b|\bNaN\b|undefined|null/);
    expect(doc.querySelector('[data-rep-practice],[data-rep-notes],[data-rep-evidence]')).toBeNull();
  });

  it('each empty link goes to its section', async () => {
    const want = { species: 'explore', surveys: 'survey', model: 'model', labs: 'science', claim: 'survey' };
    for (const [id, section] of Object.entries(want)) {
      const t = await mount({});
      await act(() => t.q('[data-rep-empty="' + id + '"] button').click());
      expect(t.data.section, id).toBe(section);
    }
  });

  it('loads saved data from before this field existed', () => {
    const host = view({ surveyLog: [entry('reserve', 1)] });
    expect(host.querySelector('[data-rep-name]').value).toBe('');
    expect(R.mine(undefined)).toEqual({ name: '', date: '', questions: '' });
  });
});

describe('species found', () => {
  it('counts by group from speciesLog, the same total as the Start page, leaving out groups with none', () => {
    const fish = X.SPECIES_META.filter((m) => m.group === 'fish').slice(0, 3).map((m) => m.id);
    const coral = X.SPECIES_META.filter((m) => m.group === 'coral').slice(0, 1).map((m) => m.id);
    const structure = X.SPECIES_META.filter((m) => m.group === 'structure').map((m) => m.id);
    const speciesLog = Object.fromEntries([...fish, ...coral, ...structure].map((id) => [id, { firstSeen: 1 }]));
    const host = view({ speciesLog });
    const rows = [...host.querySelectorAll('[data-rep-group]')];
    expect(rows.map((r) => r.dataset.repGroup).sort()).toEqual(['coral', 'fish']);
    const count = (g) => X.SPECIES_META.filter((m) => m.group === g).length;
    expect(host.querySelector('[data-rep-group="fish"]').textContent).toContain('3 of ' + count('fish'));
    expect(host.querySelector('[data-rep-group="coral"]').textContent).toContain('1 of ' + count('coral'));
    expect(Number(host.querySelector('[data-rep-species-total]').dataset.repSpeciesTotal)).toBe(W.progress({ speciesLog }).steps.explore.found);
    expect(host.querySelector('[data-rep-species-total]').textContent).toContain('4 of ' + W.progress({ speciesLog }).steps.explore.total);
    expect(host.querySelector('[data-rep-empty="species"]')).toBeNull();
  });

  it('lists practice and field notes only when they exist, with the saved words', () => {
    const none = view({ speciesLog: { clownfish: { firstSeen: 1 } } });
    expect(none.querySelector('[data-rep-practice]')).toBeNull();
    expect(none.querySelector('[data-rep-notes]')).toBeNull();
    const some = view({ speciesFieldNotes: { clownfish: 'Stayed in its anemone <b>all</b> day.', blue_tang: '   ' },
      speciesPractice: { rounds: 2, answered: 10, correct: 8, last: { total: 5, correct: 4 } }, practice: { 0: 'sand' } });
    const notes = some.querySelector('[data-rep-notes]');
    expect(notes.querySelectorAll('li')).toHaveLength(1);
    expect(notes.textContent).toContain('Stayed in its anemone <b>all</b> day.');
    expect(notes.querySelector('b')).toBeNull();
    const practice = some.querySelector('[data-rep-practice]').textContent;
    expect(practice).toContain('Practice rounds finished: 2. Last round: 4 of 5 correct.');
    expect(practice).toContain('Practice points answered: 1 of ' + W.progress({ practice: { 0: 'sand' } }).steps.methods.total);
  });
});

describe('survey results', () => {
  const metricCell = (reef, m, attr) => reef.querySelector('[data-rep-metric="' + m + '"] [' + attr + ']').textContent;

  it('means and ranges equal the survey functions, per reef, with captions naming the reef', () => {
    const log = [entry('reserve', 1, { wrong: 9 }), entry('reserve', 2), entry('reserve', 3, { wrong: 7 }), entry('harbor', 1), entry('harbor', 2)];
    const host = view({ surveyLog: log });
    const groups = groupsOf(log);
    expect(host.querySelectorAll('[data-rep-reef]')).toHaveLength(2);
    for (const g of groups) {
      const reef = host.querySelector('[data-rep-reef="' + g.key + '"]'), st = S.groupStats(g.entries);
      expect(reef.querySelector('caption').textContent).toContain(g.entries.length + ' saved transects');
      for (const m of S.METRICS) {
        const unit = m === 'live' || m === 'algae' ? '%' : '';
        expect(metricCell(reef, m, 'data-rep-mean'), g.key + m).toBe(st[m].mean + unit);
        expect(metricCell(reef, m, 'data-rep-range'), g.key + m).toBe(st[m].min + unit + ' to ' + st[m].max + unit);
      }
      // The same mean the Compare table prints.
      expect(metricCell(reef, 'live', 'data-rep-mean')).toBe(g.liveMean + '%');
      expect(metricCell(reef, 'algae', 'data-rep-mean')).toBe(g.algaeMean + '%');
    }
  });

  it('one survey makes an honest report: no range, and what to do next', () => {
    const host = view({ surveyLog: [entry('reserve', 1)] });
    const reef = host.querySelector('[data-rep-reef="reserve"]');
    expect(reef.querySelector('caption').textContent).toContain('1 saved transect');
    expect(reef.querySelector('caption').textContent).not.toContain('transects');
    expect(metricCell(reef, 'live', 'data-rep-range')).toBe('One transect');
    expect(metricCell(reef, 'live', 'data-rep-range')).not.toMatch(/\bto\b/);
    expect(host.querySelector('[data-rep-range-note]')).toBeTruthy();
    expect(host.querySelector('[data-rep-next="second-reef"] button')).toBeTruthy();
    expect(host.querySelector('[data-rep-empty="surveys"]')).toBeNull();
    expect(host.querySelector('[data-rep-empty="claim"]').textContent).toContain('You have one so far');
  });

  it('fish never read as a measured zero when no fish were recorded', () => {
    const none = view({ surveyLog: [entry('harbor', 1, { noFish: true })] }).querySelector('[data-rep-reef="harbor"]');
    for (const m of ['grazers', 'butterfly', 'predators']) {
      expect(metricCell(none, m, 'data-rep-mean')).toBe('None recorded');
      expect(metricCell(none, m, 'data-rep-range')).toBe('');
    }
    expect(metricCell(none, 'live', 'data-rep-mean')).toMatch(/%$/);
    // One transect with fish and one without: said out loud, not hidden.
    const log = [entry('reserve', 1), entry('reserve', 2, { noFish: true })];
    const mixed = view({ surveyLog: log }).querySelector('[data-rep-reef="reserve"]');
    expect(mixed.querySelector('[data-rep-fish-note]').textContent).toContain('1 of 2');
    expect(metricCell(mixed, 'grazers', 'data-rep-mean')).toBe(String(S.groupStats(groupsOf(log)[0].entries).grazers.mean));
    // A real zero among counted fish stays a zero.
    const counted = entry('reserve', 1); counted.fish = Object.assign({}, counted.fish, { butterflyfish: 0 });
    expect(metricCell(view({ surveyLog: [counted] }).querySelector('[data-rep-reef="reserve"]'), 'butterfly', 'data-rep-mean')).toBe('0');
  });

  it('invertebrates: not counted is different from counted and none found', () => {
    const uncounted = view({ surveyLog: [entry('reserve', 1)] });
    expect(uncounted.querySelector('[data-rep-inv="none"]').textContent).toContain('not counted');
    const zeros = Object.fromEntries(Object.keys(INV).map((k) => [k, 0]));
    expect(view({ surveyLog: [entry('reserve', 1, { inverts: zeros })] }).querySelector('[data-rep-inv="zero"]')).toBeTruthy();
    const log = [entry('reserve', 1, { inverts: INV }), entry('reserve', 2, { inverts: Object.assign({}, INV, { banded_coral_shrimp: 4 }) }), entry('reserve', 3)];
    const table = view({ surveyLog: log }).querySelector('[data-rep-inv="table"]');
    expect(table.querySelector('caption').textContent).toContain('2 of 3 transects');
    expect([...table.querySelectorAll('[data-rep-inv-kind]')].map((r) => r.dataset.repInvKind)).toEqual(['banded_coral_shrimp', 'diadema_urchin', 'sea_cucumber']);
    const row = table.querySelector('[data-rep-inv-kind="banded_coral_shrimp"]');
    expect(row.children[1].textContent).toBe('3');
    expect(row.children[2].textContent).toBe('2 to 4');
  });

  it('flags incomplete transects, the unsaved transect, and shows saved notes', () => {
    const log = [entry('reserve', 1), entry('reserve', 2, { upTo: 25 })];
    const host = view({ surveyLog: log, records: { 0: 'sand', 1: 'rock' }, surveySaved: false, compareNotes: 'The reserve had more fish.' });
    expect(host.querySelector('[data-rep-incomplete]').textContent).toContain('Incomplete transects: 1');
    expect(host.querySelector('[data-rep-unsaved]').textContent).toContain('2 of 40 points');
    expect(block(host, 'surveys').querySelector('[data-rep-words]').textContent).toBe('The reserve had more fish.');
    expect(view({ surveyLog: log, surveySaved: true }).querySelector('[data-rep-unsaved]')).toBeNull();
  });

  it('skips the labelled example and broken entries without crashing', () => {
    const ok = entry('reserve', 1), example = S.exampleLog()[0];
    const log = [null, 7, 'x', {}, { siteId: 3 }, { siteId: 'reserve' }, example, ok];
    expect(R.log(log).map((e) => e.id)).toEqual([ok.id]);
    const host = view({ surveyLog: log });
    expect(host.querySelectorAll('[data-rep-reef]')).toHaveLength(1);
    // An older entry without saved indicators uses its cover, as the views do.
    const old = entry('harbor', 1); delete old.indicators; delete old.fish;
    expect(metricCell(view({ surveyLog: [old] }).querySelector('[data-rep-reef="harbor"]'), 'live', 'data-rep-mean')).toBe(X.indicators(old.cover).liveCoral + '%');
  });
});

describe('the reef key stays gated', () => {
  it('a match shows only for a transect with all 40 points, and never the key itself', () => {
    const full = entry('reserve', 1, { wrong: 5 }), part = entry('reserve', 2, { upTo: 12 });
    const host = view({ surveyLog: [full, part] });
    const text = host.querySelector('[data-rep-match]').textContent;
    expect(text).toContain(full.agreement + ' of 40 on transect 1');
    expect(text).not.toContain('transect 2');
    const only = view({ surveyLog: [part] });
    expect(only.querySelector('[data-rep-match]')).toBeNull();
    expect(only.querySelector('[data-rep-doc]').textContent).not.toMatch(/reef key/i);
    expect(part.agreement).toBeGreaterThan(0);
  });

  it('shows the learner\'s numbers, not the key\'s, and no whole-reef value', () => {
    const e = entry('reserve', 1, { wrong: 4 });
    const site = X.siteById('reserve'), truth = X.indicators(X.trueCover(X.buildTransect(site, e.seed)));
    expect(truth.liveCoral).not.toBe(e.indicators.liveCoral);
    const host = view({ surveyLog: [e] });
    const reef = host.querySelector('[data-rep-reef="reserve"]');
    expect(reef.querySelector('[data-rep-metric="live"] [data-rep-mean]').textContent).toBe(e.indicators.liveCoral + '%');
    expect(reef.textContent.includes(truth.liveCoral + '%')).toBe(false);
    const doc = host.querySelector('[data-rep-doc]').textContent;
    for (const leak of ['the reef key says', 'in the reef key', 'Whole-reef', 'whole reef', 'In the belt']) expect(doc.includes(leak), leak).toBe(false);
    // Nor do the data functions carry it.
    expect(JSON.stringify(R.surveys([e]).reefs[0].stats)).not.toContain('trueCover');
  });
});

describe('model: predicted versus what happened', () => {
  const blockText = (host) => block(host, 'predictions').textContent;

  it('a prediction not yet run shows no outcome anywhere, including attributes and data', () => {
    const d = { modelPredictions: { warmer: { choice: 'lower', reason: 'More heat.' } }, mdlSpread: true };
    const rows = M.runScenario(M.scenarioSettings('warmer'), 11);
    const host = view(d);
    const li = host.querySelector('[data-rep-model="warmer"]');
    expect(li.dataset.repState).toBe('pending');
    expect(li.textContent).toContain('have not run this yet');
    expect(li.textContent).toContain('More heat.');
    expect(li.querySelector('button[data-rep-screen]')).toBeTruthy();
    expect(blockText(host)).not.toMatch(/Over \d+ years|The model showed|Same settings/);
    const html = host.querySelector('[data-rep-model="warmer"]').outerHTML;
    expect(html).not.toMatch(/data-rep-outcome|data-rep-from|data-rep-to|data-rep-spread/);
    expect(html.includes(pc(rows[rows.length - 1].coral) + '%')).toBe(false);
    const item = R.model(d).items[0];
    for (const k of ['outcome', 'to', 'from', 'matched', 'spread', 'without', 'compare']) expect(item[k], k).toBeUndefined();
  });

  it('a run shows the same numbers as the model, with the saved reason', () => {
    const host = view({ modelPredictions: { rubble: { choice: 'lower', reason: 'Rubble cannot hold coral.' } }, modelRevealedFor: { rubble: true } });
    const rows = M.runScenario(M.scenarioSettings('rubble'), 11), li = host.querySelector('[data-rep-model="rubble"]');
    const outcome = M.mdlOutcome(rows);
    expect(li.dataset.repState).toBe('ran');
    expect(li.querySelector('[data-rep-outcome]').dataset.repOutcome).toBe(outcome);
    expect(Number(li.querySelector('[data-rep-from]').dataset.repFrom)).toBe(pc(rows[0].coral));
    expect(Number(li.querySelector('[data-rep-to]').dataset.repTo)).toBe(pc(rows[rows.length - 1].coral));
    expect(li.textContent).toContain('live coral went from ' + pc(rows[0].coral) + '% to ' + pc(rows[rows.length - 1].coral) + '%');
    expect(li.textContent).toContain('Rubble cannot hold coral.');
    const wo = M.runScenario(M.withoutActions(M.scenarioSettings('rubble')), 11);
    expect(li.textContent).toContain('Without them it would be ' + pc(wo[wo.length - 1].coral) + '%');
  });

  it('uses the student\'s own run (seed) and only a real reveal counts', () => {
    const rows = M.runScenario(M.scenarioSettings('warmer'), 42);
    expect(R.model({ modelSeed: 42, modelPredictions: { warmer: { choice: 'same' } }, modelRevealedFor: { warmer: true } }).items[0].to).toBe(pc(rows[rows.length - 1].coral));
    for (const v of [false, 1, 'true', null, {}]) {
      const it = R.model({ modelPredictions: { warmer: { choice: 'same' } }, modelRevealedFor: { warmer: v } }).items[0];
      expect(it.ran, String(v)).toBe(false); expect(it.to).toBeUndefined();
    }
  });

  it('frames a miss as learning: no score, no right or wrong', () => {
    const rows = M.runScenario(M.scenarioSettings('recent'), 11), got = M.mdlOutcome(rows), miss = ['higher', 'same', 'lower'].find((p) => p !== got);
    const host = view({ modelPredictions: { recent: { choice: miss }, reserve: { choice: M.mdlOutcome(M.runScenario(M.scenarioSettings('reserve'), 11)) } }, modelRevealedFor: { recent: true, reserve: true } });
    expect(host.querySelector('[data-rep-model="recent"] [data-rep-frame]').dataset.repFrame).toBe('different');
    expect(host.querySelector('[data-rep-model="reserve"] [data-rep-frame]').dataset.repFrame).toBe('same');
    expect(blockText(host)).not.toMatch(/\b(correct|incorrect|wrong|score|grade|failed|mistake)\b/i);
    expect(blockText(host)).not.toMatch(/\d+ of \d+ (right|predictions)/i);
  });

  it('a survey start reads the surveyed reef, and a removed survey shows no numbers', () => {
    const log = [entry('harbor', 1)];
    const start = M.mdlSurveyStarts(log)[0], key = M.mdlPredictKey('recent', start);
    const d = { surveyLog: log, modelPredictions: { [key]: { choice: 'lower' } }, modelRevealedFor: { [key]: true } };
    const rows = M.runScenario(M.mdlWithStart(M.scenarioSettings('recent'), start), 11);
    const host = view(d), li = host.querySelector('[data-rep-model="' + key + '"]');
    expect(li.textContent).toContain('starting from my survey of');
    expect(Number(li.querySelector('[data-rep-to]').dataset.repTo)).toBe(pc(rows[rows.length - 1].coral));
    const lost = view(Object.assign({}, d, { surveyLog: [] })).querySelector('[data-rep-model="' + key + '"]');
    expect(lost.dataset.repState).toBe('lost');
    expect(lost.querySelector('[data-rep-from]')).toBeNull();
    expect(lost.querySelector('[data-rep-frame]')).toBeNull();
  });

  it('the old run flag alone reveals nothing', () => {
    const host = view({ modelRevealed: true });
    expect(host.querySelector('[data-rep-model-legacy]')).toBeTruthy();
    expect(host.querySelector('[data-rep-model]')).toBeNull();
    expect(blockText(host)).not.toMatch(/Over \d+ years/);
  });

  it('20 runs show only when the student opened that view, from the ensemble', () => {
    const base = { modelPredictions: { recent: { choice: 'lower' } }, modelRevealedFor: { recent: true } };
    expect(view(base).querySelector('[data-rep-spread]')).toBeNull();
    const li = view(Object.assign({ mdlSpread: true }, base)).querySelector('[data-rep-model="recent"]');
    const e = M.mdlEnsemble(M.scenarioSettings('recent'), 11), b = e.bands[e.years];
    expect(li.querySelector('[data-rep-spread]').dataset.repSpread).toBe(String(M.MDL_RUNS));
    expect(li.textContent).toContain('ranged from ' + pc(b.min) + '% to ' + pc(b.max) + '%');
    expect(li.textContent).toContain('higher in ' + e.counts.higher + ' runs, about the same in ' + e.counts.same + ', lower in ' + e.counts.lower);
  });

  it('a comparison shows only when the other future was run too', () => {
    const base = { model: M.scenarioSettings('recent'), mdlCompare: 'warmer', modelPredictions: { recent: { choice: 'lower' } } };
    const notRun = view(Object.assign({ modelRevealedFor: { recent: true } }, base));
    expect(notRun.querySelector('[data-rep-compare]')).toBeNull();
    const both = view(Object.assign({ modelRevealedFor: { recent: true, warmer: true } }, base));
    const sum = M.mdlCompareRuns(M.runScenario(M.scenarioSettings('recent'), 11), M.runScenario(M.scenarioSettings('warmer'), 11));
    const line = both.querySelector('[data-rep-model="recent"] [data-rep-compare="warmer"]');
    expect(line.textContent).toContain('live coral is ' + pc(sum.coralA) + '%');
    expect(line.textContent).toContain(pc(sum.coralB) + '%');
  });
});

describe('labs: predicted versus what happened', () => {
  it('heatwaves recompute from the lab function, not from stale saved numbers', () => {
    const d = { sciBleach: { anomaly: 3, weeks: 8, sensitivity: 'typical', pred: 'most', revealed: true, log: [
      { key: '3:8:typical', anomaly: 3, weeks: 8, sensitivity: 'typical', peak: 99, survivors: 77 },
      { key: '1:3:typical', anomaly: 1, weeks: 3, sensitivity: 'typical', peak: 3, survivors: 10, pred: 'few' }, null, 'x'] } };
    const host = view(d), items = [...host.querySelectorAll('[data-rep-lab="heat"]')];
    expect(items).toHaveLength(2);
    const a = SCI.bleachRun({ anomaly: 3, weeks: 8, sensitivity: 'typical' }), b = SCI.bleachRun({ anomaly: 1, weeks: 3, sensitivity: 'typical' });
    expect(items[0].dataset.repOutcome).toBe(a.outcome);
    expect(items[0].textContent).toContain(a.peak + ' Degree Heating Weeks');
    expect(items[0].textContent).toContain(a.survivors + ' of the ' + SCI.CORALS + ' corals');
    expect(items[0].textContent).not.toMatch(/\b99\b|\b77\b/);
    expect(items[0].textContent).toContain('I predicted: Nearly all of them recover');
    expect(items[1].dataset.repOutcome).toBe(b.outcome);
    expect(items[1].textContent).toContain('I predicted: Nearly all of them die');
  });

  it('a lab prediction not yet run shows no outcome', () => {
    const heat = SCI.bleachRun({ anomaly: 3, weeks: 8, sensitivity: 'typical' });
    const host = view({ sciBleach: { anomaly: 3, weeks: 8, sensitivity: 'typical', pred: 'some', revealed: false }, sciBudget: { pred: 'grow' }, sciSeaweed: { pred: 'same', started: true, revealed: false } });
    const pending = [...host.querySelectorAll('[data-rep-lab][data-rep-state="pending"]')];
    expect(pending.map((p) => p.dataset.repLab).sort()).toEqual(['build', 'heat', 'seaweed']);
    const text = block(host, 'predictions').textContent;
    expect(text).not.toMatch(/What happened|budget showed|model showed|Degree Heating Weeks|tipping|grazing, and it can take|kg/);
    expect(text.includes(heat.survivors + ' of the')).toBe(false);
    pending.forEach((p) => { expect(p.dataset.repOutcome).toBeUndefined(); expect(p.querySelector('button[data-rep-screen]')).toBeTruthy(); });
    // A seaweed reveal without a started experiment is not a run on the screen either.
    expect(R.labs({ sciSeaweed: { pred: 'same', started: false, revealed: true } }).seaweed.ran).toBe(false);
  });

  it('budget and seaweed results come from their functions', () => {
    const def = SCI.budget(SCI.budgetSetup({})), tried = SCI.budget(SCI.budgetSetup({ cover: 0.35 }));
    const host = view({ sciBudget: { cover: 0.35, pred: 'grow', revealed: true }, sciSeaweed: { pred: 'never', started: true, revealed: true, nutrients: 'high' } });
    const bu = host.querySelector('[data-rep-lab="build"]');
    expect(bu.dataset.repOutcome).toBe(def.state);
    expect(bu.textContent).toContain(def.added.toFixed(1) + ' kg');
    expect(bu.querySelector('[data-rep-tried]').dataset.repTried).toBe(tried.state);
    const th = SCI.seaweedThresholds('high'), sw = host.querySelector('[data-rep-lab="seaweed"]');
    expect(sw.dataset.repOutcome).toBe(th.recover > th.keep ? 'more' : 'same');
    expect(sw.textContent).toContain('about ' + pc(th.keep) + '% grazing');
    expect(sw.textContent).toContain('about ' + pc(th.recover) + '% grazing');
    // The budget result is for the default reef; with default settings no extra line.
    expect(view({ sciBudget: { pred: 'even', revealed: true } }).querySelector('[data-rep-tried]')).toBeNull();
  });

  it('partial labs point to the next investigation', () => {
    const host = view({ sciBudget: { pred: 'even', revealed: true } });
    expect(host.querySelector('[data-rep-empty="labs"]')).toBeNull();
    expect(host.querySelector('[data-rep-next="lab"]').textContent).toContain('Heat and bleaching');
  });

  it('other lanes\' fields: absent, odd or present, the report stays the same and does not crash', () => {
    const plain = view({ surveyLog: [entry('reserve', 1)] }).querySelector('[data-rep-block="predictions"]').innerHTML;
    for (const v of [null, 7, 'x', [], {}, { revealed: true, pred: 'x', log: [null] }]) {
      expect(R.extra({ sciWeb: v, mdlRescue: v })).toEqual([]);
      expect(view({ surveyLog: [entry('reserve', 1)], sciWeb: v, mdlRescue: v }).querySelector('[data-rep-block="predictions"]').innerHTML).toBe(plain);
    }
  });
});

describe('claim, evidence and reasoning', () => {
  const log = () => [entry('reserve', 1), entry('reserve', 2), entry('harbor', 1), entry('harbor', 2)];

  it('shows the claim, its evidence, what the check said, and the reasoning as written', () => {
    const l = log(), claim = { type: 'more_live', a: 'reserve', b: 'harbor', evidence: { live: true, spread: true }, reasoning: 'Coral <i>grows</i> where seaweed cannot.', checked: true, checks: 1 };
    const host = view({ surveyLog: l, srvClaim: claim }), b = block(host, 'claim');
    const res = S.checkClaim(groupsOf(l), claim);
    expect(b.querySelector('[data-rep-claim]').textContent).toContain('has more live coral than');
    expect([...b.querySelectorAll('[data-rep-ev]')].map((x) => x.dataset.repEv)).toEqual(['live', 'spread']);
    const st = S.groupStats(groupsOf(l).find((g) => g.key === 'reserve').entries);
    expect(b.querySelector('[data-rep-ev="live"]').textContent).toContain(st.live.mean + '%');
    expect(b.querySelector('[data-rep-check]').dataset.repCheck).toBe(res.status);
    expect(b.querySelector('[data-srv-summary]').dataset.srvSummary).toBe(res.status);
    // The coaching lines belong in the builder, not on the page handed in.
    expect(b.querySelector('[data-srv-reasoning]')).toBeNull();
    const words = b.querySelector('[data-rep-words]');
    expect(words.textContent).toBe('Coral <i>grows</i> where seaweed cannot.');
    expect(words.querySelector('i')).toBeNull();
  });

  it('an unchecked claim shows no verdict and links to the check', () => {
    const host = view({ surveyLog: log(), srvClaim: { type: 'healthier', a: 'reserve', b: 'harbor', evidence: { live: true }, checked: false } });
    const b = block(host, 'claim');
    expect(b.querySelector('[data-rep-check]')).toBeNull();
    expect(b.querySelector('[data-rep-unchecked] button')).toBeTruthy();
    expect(b.querySelector('[data-rep-no-reasoning]')).toBeTruthy();
  });

  it('empty and partial claims say what to do', () => {
    expect(view({ surveyLog: log() }).querySelector('[data-rep-empty="claim"]').textContent).toContain('No claim yet');
    const none = view({ surveyLog: log(), srvClaim: { type: 'own', own: 'Reefs near towns have less fish.' } });
    expect(none.querySelector('[data-rep-claim]').textContent).toBe('Reefs near towns have less fish.');
    expect(none.querySelector('[data-rep-no-evidence]')).toBeTruthy();
    const blank = view({ surveyLog: log(), srvClaim: { type: 'own' } });
    expect(blank.querySelector('[data-rep-claim]').textContent).toContain('have not written it yet');
    // A checked flag with one reef is not a checked claim (the same rule as the Start page).
    const one = view({ surveyLog: [entry('reserve', 1)], srvClaim: { type: 'more_live', checked: true, reasoning: 'My words stay.' } });
    expect(one.querySelector('[data-rep-check]')).toBeNull();
    expect(block(one, 'claim').textContent).toContain('My words stay.');
    expect(R.claim({ srvClaim: { type: 'constructor' } }, []).type).toBeNull();
  });
});

describe('name, date and questions', () => {
  it('saves only under myReport and changes nothing else', async () => {
    const t = await mount({ surveyLog: [entry('reserve', 1)] });
    const before = JSON.stringify(Object.assign({}, t.data, { myReport: null }));
    await type(t.q('[data-rep-name]'), 'Maya');
    await type(t.q('[data-rep-date]'), '2026-11-05');
    await type(t.q('[data-rep-questions]'), 'Why do some corals survive?');
    // A shared computer keeps saved work for the next student: name and date are never saved.
    expect(t.data.myReport).toEqual({ questions: 'Why do some corals survive?' });
    expect(JSON.stringify(t.data)).not.toContain('Maya');
    expect(JSON.stringify(t.data)).not.toContain('2026-11-05');
    expect(JSON.stringify(Object.assign({}, t.data, { myReport: null }))).toBe(before);
    expect(t.q('[data-rep-name]').value).toBe('Maya');
  });

  it('every control has a visible label; the fields are optional', () => {
    const host = view({});
    for (const sel of ['[data-rep-name]', '[data-rep-date]', '[data-rep-questions]']) {
      const el = host.querySelector(sel);
      expect(host.querySelector('label[for="' + el.id + '"]'), sel).toBeTruthy();
      expect(el.required, sel).toBe(false);
    }
    expect(host.querySelector('label[for="' + host.querySelector('[data-rep-name]').id + '"]').textContent).toContain('optional');
  });

  it('cleans up what comes back from saved data', () => {
    expect(R.mine({ name: 'x'.repeat(500), date: 'soon', questions: 5 })).toEqual({ name: 'x'.repeat(80), date: '', questions: '' });
    expect(R.dateText('')).toBe('');
    // Local, not UTC: the printed day is the day that was typed.
    expect(R.dateText('2026-11-05')).toMatch(/5/);
    expect(R.dateText('2026-11-05')).toMatch(/2026/);
  });

  it('prints the typed values as text, and blank lines to write on when empty', async () => {
    const t = await mount({ myReport: { questions: 'Why?' } });
    await type(t.q('[data-rep-name]'), 'Maya <b>R</b>');
    await type(t.q('[data-rep-date]'), '2026-11-05');
    const full = R.printable(t.q('[data-rep-doc]'));
    expect(full.querySelector('[data-rep-printed-fields]').textContent).toContain('Maya <b>R</b>');
    expect(full.querySelector('[data-rep-printed-fields] b')).toBeNull();
    expect(full.querySelector('[data-rep-printed-questions]').textContent).toBe('Why?');
    const e = await mount({});
    const blank = R.printable(e.q('[data-rep-doc]'));
    expect(blank.querySelectorAll('[data-rep-printed-fields] .pr4-line')).toHaveLength(2);
    expect(blank.querySelector('[data-rep-printed-questions] .pr4-lines')).toBeTruthy();
  });
});

describe('printing reuses the Printables path', () => {
  const fullData = () => ({ surveyLog: [entry('reserve', 1), entry('reserve', 2), entry('harbor', 1)], speciesLog: { clownfish: { firstSeen: 1 } }, modelPredictions: { recent: { choice: 'lower' } }, myReport: { name: 'Maya' } });

  it('the tab holds the report alone, no controls, one h1, then h2s', async () => {
    const t = await mount(fullData());
    await type(t.q('[data-rep-name]'), 'Maya');
    let written = ''; const fake = { document: { open() {}, write(s) { written += s; }, close() {}, getElementById: () => null, images: [] }, focus() {}, print: vi.fn(), close() {} };
    vi.spyOn(window, 'open').mockReturnValue(fake);
    await act(() => t.q('[data-rep-print]').click());
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(fake.print).toHaveBeenCalled();
    expect(t.q('[data-rep-status]').dataset.repStatus).toBe('window');
    expect(t.q('[data-rep-status]').textContent).toContain('new tab');
    const page = new DOMParser().parseFromString(written, 'text/html'), doc = page.querySelector('.rep-doc');
    expect(page.title).toBe('My reef report');
    expect(page.title).not.toContain('Maya');
    expect(doc.querySelectorAll('button,input,textarea,select,a,[data-rep-screen]')).toHaveLength(0);
    expect(page.querySelector('.pr4-bar #pr4-print').textContent).toBe('Print my report');
    expect(page.querySelectorAll('h1')).toHaveLength(1);
    expect([...page.querySelectorAll('h2')].map((x) => x.textContent)).toEqual(['What I found on my dives', 'What I measured', 'What I predicted and what happened', 'My claim, evidence and reasoning', 'Questions I still have']);
    expect(doc.querySelector('h4,h5,h6') === null || doc.querySelector('h3')).toBeTruthy();
    expect(doc.querySelector('.rep-only-print')).toBeNull();
    expect(doc.querySelector('[data-rep-privacy]')).toBeNull();
    expect(doc.textContent).toContain('Maya');
    // The page itself keeps its controls.
    expect(t.q('[data-rep-name]')).toBeTruthy();
  });

  it('falls back to printing in place, and says so when that is refused too', async () => {
    const t = await mount(fullData());
    vi.spyOn(window, 'open').mockReturnValue(null);
    let seen = null;
    vi.spyOn(window, 'print').mockImplementation(() => {
      seen = document.querySelector('.cr-pr4-host');
      window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint'));
    });
    await act(() => t.q('[data-rep-print]').click());
    expect(seen.querySelector('.rep-doc')).toBeTruthy();
    expect(t.q('[data-rep-status]').dataset.repStatus).toBe('inplace');
    expect(document.querySelector('.cr-pr4-host')).toBeNull();
    window.print.mockImplementation(() => {});
    await act(() => t.q('[data-rep-print]').click());
    expect(t.q('[data-rep-status]').dataset.repStatus).toBe('blocked');
    expect(t.q('[data-rep-status]').textContent).toContain('Save my report as a file');
  });

  it('saves the same report as a file with no name in the file name', async () => {
    const t = await mount(fullData());
    const NativeURL = window.URL; const parts = []; const NativeBlob = window.Blob;
    vi.stubGlobal('Blob', class extends NativeBlob { constructor(p, o) { super(p, o); parts.push(p[0]); } });
    vi.stubGlobal('URL', class extends NativeURL { static createObjectURL = vi.fn(() => 'blob:rep'); static revokeObjectURL = vi.fn(); });
    window.URL = globalThis.URL;
    let name = null; vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () { name = this.download; });
    await act(() => t.q('[data-rep-download]').click());
    window.URL = NativeURL;
    expect(t.q('[data-rep-status]').dataset.repStatus).toBe('saved');
    expect(name).toBe('my-reef-report.html');
    expect(parts[0]).toContain('onclick="window.print()"');
    expect(parts[0]).toContain('rep-doc');
    expect(parts[0]).not.toMatch(/<(input|textarea)\b/);
  });

  it('print CSS: black on white from Printables, no breaks through tables or headings, controls gone', async () => {
    const css = R.PAPER_CSS;
    expect(css).toMatch(/@media print\{/);
    expect(css).toMatch(/\[data-rep-screen\]\{display:none!important\}/);
    expect(css).toMatch(/\.rep-only-print\{display:block!important\}/);
    expect(css).toMatch(/\.rep-doc \.pr4-table\{break-inside:avoid/);
    expect(css).toMatch(/\.rep-reef[^{]*\{break-inside:avoid/);
    expect(css).toMatch(/\.rep-h,\.rep-sub,\.rep-keep\{break-after:avoid/);
    expect(css).toMatch(/\.rep-doc thead\{display:table-header-group\}/);
    expect(PR.PRINT_CSS).toMatch(/\.pr4-doc \*\{color:#000!important;background:transparent!important/);
    const host = (await mount(fullData())).host;
    expect(host.querySelector('[data-rep-doc]').classList.contains('pr4-doc')).toBe(true);
    expect(host.querySelector('[data-rep-section] > style').textContent).toContain(PR.PRINT_CSS);
    // Rules that travel with the document, so the tab and the file get them.
    expect(host.querySelector('[data-rep-doc] > style').textContent).toBe(R.PAPER_CSS);
  });
});

describe('privacy', () => {
  const blockSource = () => {
    const a = SOURCE.indexOf('// ── My reef report'), b = SOURCE.indexOf('// ── Registration');
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
    return SOURCE.slice(a, b);
  };

  it('says so in one plain line on the page', () => {
    const line = view({}).querySelector('[data-rep-privacy]');
    expect(line.textContent).toContain('stays on this device');
    expect(line.textContent).toContain('Nothing is sent anywhere');
  });

  it('makes no network call when opening, typing, printing or saving', async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('no network')));
    const beacon = vi.fn(() => true);
    const opened = vi.spyOn(window.XMLHttpRequest.prototype, 'open');
    const sent = vi.spyOn(window.XMLHttpRequest.prototype, 'send');
    vi.stubGlobal('fetch', fetchSpy); window.fetch = fetchSpy;
    if (navigator.sendBeacon) vi.spyOn(navigator, 'sendBeacon').mockImplementation(beacon); else navigator.sendBeacon = beacon;
    const t = await mount({ surveyLog: [entry('reserve', 1)], speciesLog: { clownfish: { firstSeen: 1 } }, modelPredictions: { recent: { choice: 'lower' } }, modelRevealedFor: { recent: true }, mdlSpread: true });
    await type(t.q('[data-rep-name]'), 'Maya');
    await type(t.q('[data-rep-questions]'), 'Why?');
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(window, 'print').mockImplementation(() => {});
    await act(() => t.q('[data-rep-print]').click());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('the source block has no way out and no second print path', () => {
    const src = blockSource();
    for (const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /https?:\/\//, /\bimport\s*\(/, /importScripts/, /callGemini|callAI|ctx\.ai|ctx\.call/, /localStorage|sessionStorage|indexedDB/, /awardXP|logEvent|telemetry\(|analytics/, /document\.cookie/]) {
      expect(bad.test(src), String(bad)).toBe(false);
    }
    // Printing only through Printables; the .close() ban in reef_sounds still holds.
    for (const bad of [/window\.open/, /window\.print/, /createObjectURL/, /\.close\(\)/, /document\.write/]) expect(bad.test(src), String(bad)).toBe(false);
    expect(src).toContain('pr4Print(repPrintable(paperRef.current)');
    expect(src).toContain('pr4Download(repPrintable(paperRef.current)');
  });

  it('the source block stays ES5 with plain text', () => {
    const src = blockSource().split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(src).not.toMatch(/=>/);
    expect(src).not.toMatch(/\b(let|const)\s+[A-Za-z_$]/);
    expect(src).not.toMatch(/`/);
    expect(src).not.toMatch(/[–—‑]/);
    // New keys keep their prefix; every call has a literal key.
    expect(src.replace('__alloT(k, f)', '')).not.toMatch(/__alloT\((?!['"]stem\.coralreef\.)/);
    expect(blockSource().match(/stem\.coralreef\.rep_[a-z0-9_]+/g).length).toBeGreaterThan(30);
  });
});

describe('accessibility', () => {
  const full = () => ({
    surveyLog: [entry('reserve', 1, { inverts: INV }), entry('reserve', 2, { inverts: INV }), entry('harbor', 1), entry('harbor', 2, { noFish: true })],
    speciesLog: { clownfish: { firstSeen: 1 } }, speciesFieldNotes: { clownfish: 'Note' },
    srvClaim: { type: 'more_live', a: 'reserve', b: 'harbor', evidence: { live: true }, checked: true, reasoning: 'Because of grazing fish.' },
    modelPredictions: { recent: { choice: 'lower', reason: 'Heat.' }, warmer: { choice: 'lower' } }, modelRevealedFor: { recent: true },
    sciBudget: { pred: 'grow', revealed: true }, myReport: { questions: 'Why?' }
  });

  it.each([['empty', () => ({})], ['one survey', () => ({ surveyLog: [entry('reserve', 1)] })], ['full', full]])('%s: axe finds nothing in light, dark and contrast', async (name, make) => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const result = await runIsolatedAxe(renderTool('coralReef', { coralReef: Object.assign({ section: 'report' }, make()) }, { theme }));
      expect(result.violations.map((v) => v.id + ': ' + v.nodes[0].html.slice(0, 120)), name + ' ' + theme).toEqual([]);
    }
  });

  it('every table has a caption and header cells with scope', () => {
    const tables = [...view(full()).querySelectorAll('[data-rep-doc] table')];
    expect(tables.length).toBeGreaterThan(2);
    for (const table of tables) {
      expect(table.querySelector('caption').textContent.length).toBeGreaterThan(3);
      expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
      table.querySelectorAll('tbody tr').forEach((tr) => expect(tr.children[0].matches('th[scope="row"]')).toBe(true));
    }
  });

  it('headings run in order with no skipped level, and each block is a labelled section', () => {
    const host = view(full());
    const levels = [...host.querySelectorAll('[data-rep-doc] h3,[data-rep-doc] h4,[data-rep-doc] h5,[data-rep-doc] h6')].map((x) => +x.tagName[1]);
    expect(levels[0]).toBe(3);
    levels.forEach((l, i) => { if (i) expect(l - levels[i - 1]).toBeLessThanOrEqual(1); });
    for (const id of ['species', 'surveys', 'predictions', 'claim', 'questions']) {
      const s = block(host, id);
      expect(s.tagName).toBe('SECTION');
      expect(host.querySelector('[id="' + s.getAttribute('aria-labelledby') + '"]').textContent.length).toBeGreaterThan(3);
    }
  });

  it('controls are native and the print status is a live region', () => {
    const host = view(full());
    host.querySelectorAll('[data-rep-section] button').forEach((b) => expect(b.getAttribute('type')).toBe('button'));
    expect(host.querySelector('[data-rep-status]').getAttribute('role')).toBe('status');
    expect(host.querySelector('[data-rep-section] [tabindex="-1"],[data-rep-section] [tabindex="1"]')).toBeNull();
  });

  it('an empty-state link keeps keyboard focus off the body', async () => {
    const t = await mount({});
    const go = t.q('[data-rep-empty="species"] button');
    go.focus();
    await act(() => go.click());
    expect(document.activeElement.tagName).toBe('H2');
  });
});

describe('hostile saved data', () => {
  it('renders through anything without crashing', () => {
    const junk = [null, 7, 'x', [], { a: 1 }, true];
    for (const v of junk) {
      const d = { surveyLog: v, speciesLog: v, speciesFieldNotes: v, speciesPractice: v, practice: v, srvClaim: v, modelPredictions: v, modelRevealedFor: v, sciBleach: v, sciBudget: v, sciSeaweed: v, myReport: v, compareNotes: v, mdlCompare: v };
      const host = view(d);
      expect(host.querySelector('[data-rep-doc]'), String(v)).toBeTruthy();
      expect(host.querySelector('[data-rep-doc]').textContent).not.toMatch(/\bNaN\b|undefined|\[object Object\]/);
      expect(R.partsWithWork(d)).toBeGreaterThanOrEqual(0);
    }
    const odd = view({ modelPredictions: { 'nope@x': { choice: 'lower' }, constructor: { choice: 'lower' }, recent: { choice: 'sideways' }, reserve: 3 }, modelRevealedFor: { nope: true, __proto__: { recent: true } } });
    expect(odd.querySelector('[data-rep-model]')).toBeNull();
    expect(odd.querySelector('[data-rep-empty="model"]')).toBeTruthy();
  });
});

describe('the report and the two newer activities', () => {
  const t = (k, f) => f, fill = (s, v) => Object.keys(v).reduce((o, k) => o.split('{' + k + '}').join(String(v[k])), s);
  const WORD = { more: 'Likely more', fewer: 'Likely fewer', mixed: 'Pulled both ways', same: 'About the same' };
  it('adds a finished food web case with the rule\'s own result, and nothing for one not run', () => {
    const WEB = window.__RR_TEST_EXPORTS__.coralReefWeb;
    for (const c of WEB.CASES) {
      const pred = Object.fromEntries(c.groups.map((g) => [g, 'same']));
      expect(R.extra({ sciWeb: { caseId: c.id, cases: { [c.id]: { pred, revealed: false } } } }, t, fill), c.id).toEqual([]);
      const rows = R.extra({ sciWeb: { caseId: c.id, cases: { [c.id]: { pred, revealed: true } } } }, t, fill);
      expect(rows, c.id).toHaveLength(1);
      const result = WEB.caseResult(c);
      expect(rows[0].lines).toHaveLength(result.groups.length + 1);
      result.groups.forEach((g, i) => expect(rows[0].lines[i], c.id + ' ' + g.id).toContain('The simplified rule says "' + WORD[g.dir] + '".'));
      expect(rows[0].lines[result.groups.length]).toMatch(/simplified rule, not a measurement/);
    }
  });
  it('adds each tested rescue plan with numbers from running the model, and no plan never tested', () => {
    const RS = window.__RR_TEST_EXPORTS__.coralReefRescue;
    expect(R.extra({ mdlRescue: { draft: { start: 'rubble', stars: true } } }, t, fill)).toEqual([]);
    const state = RS.rescueAddPlan(RS.rescueNormalize({}), { start: 'rubble', stars: true, garden: true }, 30, 'coral');
    const rows = R.extra({ mdlRescue: state }, t, fill);
    expect(rows).toHaveLength(1);
    const p = RS.rescueNormalize(state).plans[0], st = RS.rescueStats(RS.rescueSettings(p)), none = RS.rescueStats(RS.rescueStartSettings(p.start));
    expect(rows[0].lines[1]).toBe('I predicted 30% live coral in year 30. Over ' + st.count + ' runs it ended between ' + pc(st.min) + '% and ' + pc(st.max) + '%, with ' + pc(st.median) + '% in the middle run. With no plan, the middle run had ' + pc(none.median) + '%.');
    expect(rows[0].lines[0]).toContain('Reef Stars');
  });
  it('shows both in the report once there is work, under What I predicted', async () => {
    const WEB = window.__RR_TEST_EXPORTS__.coralReefWeb, RS = window.__RR_TEST_EXPORTS__.coralReefRescue, c = WEB.CASES[0];
    const pred = Object.fromEntries(c.groups.map((g) => [g, 'more']));
    const m = await mount({ sciWeb: { caseId: c.id, cases: { [c.id]: { pred, revealed: true } } }, mdlRescue: RS.rescueAddPlan(RS.rescueNormalize({}), { start: 'rubble', stars: true }, 40, 'coral') });
    expect(m.q('[data-rep-extra="web-' + c.id + '"]')).toBeTruthy();
    expect(m.host.querySelectorAll('[data-rep-extra^="rescue-"]')).toHaveLength(1);
    // Real work, so no "nothing yet" message above it, and each sits under its own heading.
    const text = m.q('[data-rep-block="predictions"]').textContent;
    expect(text).not.toContain('No futures yet');
    expect(text).not.toContain('No investigations yet');
    expect(text.indexOf('Reef rescue')).toBeLessThan(text.indexOf('Reef science'));
    expect(text.indexOf('Who eats whom')).toBeGreaterThan(text.indexOf('Reef science'));
    expect(R.partsWithWork({ mdlRescue: RS.rescueAddPlan(RS.rescueNormalize({}), { start: 'rubble', stars: true }, 40, 'coral') })).toBe(1);
  });
});
