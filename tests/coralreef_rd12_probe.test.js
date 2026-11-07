import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { loadHub, memoryStorage, saveAndRestore, STORAGE_KEY } from './helpers/math_review3_autosave_fixtures.js';

// Coral Reef work survives a real refresh, but only progress: surveys, counts, predictions and
// lab runs. Nothing a student typed may reach storage, because the next student on a shared
// computer could read it. Runs the host's real save code, then opens the tool from what it saved.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient, W2;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  W2 = window.__RR_TEST_EXPORTS__.coralReefW2;
});

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(seed, t) {
  let data = { coralReef: seed };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: t || ((k, f) => f || k), announceToSR() {} });
  }
  const out = { host, root, get data() { return data.coralReef; } };
  mounted.push(out);
  await React.act(async () => root.render(React.createElement(Shell)));
  return out;
}
const click = (el) => React.act(async () => { el.click(); await new Promise((r) => setTimeout(r, 5)); });

function entry(n, recorded, siteId = 'reserve') {
  return { id: siteId + ':' + n, siteId, seed: 4000 + n, transect: n, modelYear: null, at: 1762000000000 + n, agreement: 0.9, recorded,
    records: { 0: 'hard_coral', 1: 'sand' }, cover: { hard_coral: 0.4, sand: 0.6 }, indicators: { liveCoral: 0.4, macroalgae: 0.1 },
    fish: { parrotfish: 3 }, modelRun: null };
}
const TYPED = {
  compareNotes: 'PLANT compare note',
  speciesFieldNotes: { clownfish: 'PLANT field note' },
  myReport: { questions: 'PLANT report question', name: 'PLANT Student Name', date: '2026-11-07' },
};
function work() {
  return {
    section: 'survey', surveySiteId: 'reserve', surveySeed: 4127, surveyTransect: 2, surveyStage: 'points', pointIndex: 17,
    records: { 0: 'hard_coral', 1: 'sand', 2: 'rock' }, fishCounts: { parrotfish: 4 }, invCounts: { lobster: 1 }, surveySaved: false,
    surveyLog: [entry(1, 40), entry(2, 40)],
    speciesLog: { clownfish: { firstSeen: 1762000000000, site: 'reserve' } }, speciesBookmarks: { clownfish: true },
    speciesPractice: { rounds: 1, answered: 5, correct: 4 }, practice: { 0: 'sand' },
    srvClaim: { type: 'own', a: 'reserve', b: 'harbor', evidence: { live: true }, checked: true, own: 'PLANTword', reasoning: 'PLANT reasoning text' },
    modelPredictions: { recent: { choice: 'lower', reason: 'PLANTsingleword' } }, modelRevealedFor: { recent: true },
    sciBleach: { revealed: true, pred: 'most', log: [{ alive: 6 }] }, mdlRescue: { plans: [] }, photoLog: { clownfish: { stars: 3 } },
    ...TYPED,
  };
}

describe('the host save of Coral Reef work', () => {
  it('keeps surveys, counts, predictions and lab runs across a save and restore', () => {
    const hub = loadHub();
    const { next } = saveAndRestore(hub, { coralReef: work() }, {});
    const got = next.coralReef;
    expect(got.surveyLog).toEqual([entry(1, 40), entry(2, 40)]);
    expect(got.records).toEqual({ 0: 'hard_coral', 1: 'sand', 2: 'rock' });
    expect(got.fishCounts).toEqual({ parrotfish: 4 });
    expect(got.invCounts).toEqual({ lobster: 1 });
    expect(got.pointIndex).toBe(17);
    expect(got.speciesLog.clownfish.site).toBe('reserve');
    expect(got.modelPredictions.recent.choice).toBe('lower');
    expect(got.sciBleach.revealed).toBe(true);
    expect(got.srvClaim.evidence).toEqual({ live: true });
    expect(got.photoLog.clownfish.stars).toBe(3);
  });

  it('writes nothing a student typed, even a single word', () => {
    const hub = loadHub();
    const { encoded, next } = saveAndRestore(hub, { coralReef: work() }, {});
    expect(encoded.includes('PLANT')).toBe(false);
    expect(encoded.includes('2026-11-07')).toBe(false);
    for (const f of ['compareNotes', 'speciesFieldNotes', 'myReport']) expect(f in next.coralReef, f).toBe(false);
    expect('own' in next.coralReef.srvClaim).toBe(false);
    expect('reasoning' in next.coralReef.srvClaim).toBe(false);
    expect('reason' in next.coralReef.modelPredictions.recent).toBe(false);
  });

  it('drops text a later text box might put in a saved field', () => {
    const hub = loadHub();
    const { encoded } = saveAndRestore(hub, { coralReef: { records: { 0: 'sand' }, sciBleach: { journal: 'PLANT my private thoughts' }, surveyLog: [{ ...entry(1, 40), remark: 'PLANT a remark' }] } }, {});
    expect(encoded.includes('PLANT')).toBe(false);
    expect(encoded.includes('"sand"')).toBe(true);
  });

  it('removes typed text from an older save when restoring it', () => {
    const hub = loadHub();
    const next = hub.hydrate({}, { coralReef: { records: { 0: 'sand' }, compareNotes: 'PLANT old note', srvClaim: { type: 'own', reasoning: 'PLANT old reason' } } });
    expect(JSON.stringify(next).includes('PLANT')).toBe(false);
    expect(next.coralReef.records).toEqual({ 0: 'sand' });
  });

  it('survives damaged saves without keeping them', () => {
    const hub = loadHub();
    for (const bad of [null, 'text', 7, [], true]) {
      const next = hub.hydrate({}, { coralReef: bad });
      expect('coralReef' in next, String(bad)).toBe(false);
    }
    const bomb = JSON.parse('{"coralReef":{"records":{"__proto__":{"polluted":"yes"},"0":"sand"}}}');
    const next = hub.hydrate({}, bomb);
    expect(next.coralReef.records).toEqual({ 0: 'sand' });
    expect({}.polluted).toBeUndefined();
  });

  it('the saver writes when only Coral Reef changed', () => {
    const store = memoryStorage();
    const hub = loadHub(store);
    const saver = hub.createSaver();
    const base = { _persisted: true, coralReef: { records: { 0: 'sand' } } };
    saver.queue(base); saver.flush();
    saver.queue({ ...base, coralReef: { records: { 0: 'sand', 1: 'rock' } } }); saver.flush();
    expect(JSON.parse(store.getItem(STORAGE_KEY)).coralReef.records).toEqual({ 0: 'sand', 1: 'rock' });
    saver.dispose();
  });

  it('the tool opens from what the host restored, on every saved section', async () => {
    const hub = loadHub();
    for (const section of ['hub', 'survey', 'compare', 'model', 'science', 'report', 'guide', 'methods']) {
      const { next } = saveAndRestore(hub, { coralReef: { ...work(), section } }, {});
      const t = await mount(next.coralReef);
      expect(t.host.textContent.length, section).toBeGreaterThan(50);
    }
  });
});

describe('Survey done counts only full transects', () => {
  const state = (log) => W2.progress({ surveyLog: log }).steps.survey;
  it('two partial transects at one reef do not finish the step', () => {
    const s = state([entry(1, 1), entry(2, 1)]);
    expect(s.state).toBe('started');
    expect(s.saved).toBe(2);
    expect(s.full).toBe(0);
  });
  it('two full transects at one reef finish it, and older entries with no count still do', () => {
    expect(state([entry(1, 40), entry(2, 40)]).state).toBe('done');
    const { recorded: _a, ...old1 } = entry(1, 40); const { recorded: _b, ...old2 } = entry(2, 40);
    expect(state([old1, old2]).state).toBe('done');
    expect(state([entry(1, 40), entry(2, 39)]).state).toBe('started');
    expect(state([entry(1, 40), entry(2, 40, 'harbor')]).state).toBe('started');
  });
  it('the Start page says how many are full, and partial saves still work in Compare', async () => {
    const t = await mount({ section: 'hub', surveyLog: [entry(1, 12), entry(2, 12)] });
    const step = t.host.querySelector('[data-w2-step=survey]');
    expect(step.getAttribute('data-state')).toBe('started');
    expect(step.textContent.includes('All 40 points on: 0')).toBe(true);
    const c = await mount({ section: 'compare', surveyLog: [entry(1, 12), entry(2, 12)] });
    const repeat = c.host.querySelector('[data-srv-step=repeat]');
    expect(repeat.getAttribute('data-done')).toBe('false');
    expect(c.host.querySelector('[data-srv-step=one]').getAttribute('data-done')).toBe('true');
  });
});

describe('every box says what happens to typed text', () => {
  it('compare notes, the reasons and the species notes do not promise saving', async () => {
    const compare = await mount({ section: 'compare', surveyLog: [entry(1, 40), entry(2, 40, 'harbor')] });
    const notes = compare.host.querySelector('#cr-compare-notes');
    expect(document.getElementById(notes.getAttribute('aria-describedby')).textContent.includes('goes away when this page closes')).toBe(true);
    const profile = await mount({ section: 'guide', guideSpeciesId: 'clownfish' });
    expect(profile.host.textContent.includes('Your notes save automatically')).toBe(false);
    const report = await mount({ section: 'report' });
    expect(report.host.querySelector('[data-rep-privacy]').textContent.includes('anything you typed are not kept')).toBe(true);
  });
});

describe('Start over', () => {
  it('asks first, then clears everything and leaves the lab usable', async () => {
    const t = await mount({ section: 'hub', surveyLog: [entry(1, 40)], records: { 0: 'sand' }, speciesLog: { clownfish: { firstSeen: 1 } }, compareNotes: 'mine' });
    const box = () => t.host.querySelector('[data-rd12-start-over]');
    await click(box().querySelector('[data-rd12-ask]'));
    expect(box().querySelector('[role=alert]').textContent.includes('cannot be undone')).toBe(true);
    expect(t.data.surveyLog.length).toBe(1);
    await click(box().querySelector('[data-rd12-no]'));
    expect(t.data.surveyLog.length).toBe(1);
    await click(box().querySelector('[data-rd12-ask]'));
    await click(box().querySelector('[data-rd12-yes]'));
    const left = JSON.parse(JSON.stringify(t.data));
    expect(left).toEqual({ section: 'hub' });
    expect(t.host.querySelector('[data-w2-step=survey]').getAttribute('data-state')).toBe('todo');
    expect(box()).toBeNull();
  });
  it('after Start over the host saves nothing but the section', async () => {
    const hub = loadHub();
    const t = await mount({ section: 'hub', surveyLog: [entry(1, 40)] });
    await click(t.host.querySelector('[data-rd12-ask]'));
    await click(t.host.querySelector('[data-rd12-yes]'));
    const { encoded } = saveAndRestore(hub, { coralReef: t.data }, {});
    expect(JSON.parse(encoded).coralReef).toEqual({ section: 'hub' });
  });
  it('is not offered on a fresh lab', async () => {
    const t = await mount({ section: 'hub' });
    expect(t.host.querySelector('[data-rd12-start-over]')).toBeNull();
  });
});
