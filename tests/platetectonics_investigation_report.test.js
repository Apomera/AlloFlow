import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act;
const hosts = [];
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_REPORT_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
afterEach(() => { while (hosts.length) { const host = hosts.pop(); act(() => ReactDOM.unmountComponentAtNode(host)); host.remove(); } vi.restoreAllMocks(); });
const t = (_key, fallback) => fallback;
const writing = {
  claim: 'A cold sinking plate carries earthquake sources deeper.',
  evidence: 'My model recorded convergent earthquakes at five hundred kilometers and divergent earthquakes at twenty kilometers.',
  reasoning: 'These contrasting depth patterns connect the sinking slab to deeper earthquake sources in the model.'
};
const sample = (mode, depths, rate = 5, years = 60000) => window.__alloPtDepthTrials.capture({ mode, qlog: depths.map(z => ({ z })), rate, years });
function context() {
  return { version: 1, availableEvidence: ['depths', 'cut', 'stress'],
    earthquakeDepthTrials: { convergent: sample('convergent', [20, 510]), divergent: sample('divergent', [5, 25]) },
    stressTrialsByType: { convergent: { bt: 'convergent', f: 80, fr: 40, st: 'thrust' } },
    forceObservations: [{ a: 'cut', vBefore: 8, vAfter: 1.5, t: 3, choice: 0 }],
    forcePredictions: [{ a: 'cut', c: 0, t: 0 }],
    forceProbes: [{ side: 'A', dist: 400, age: 8.9, t: 0 }, { side: 'B', dist: 200, age: 4.4, t: 3 }],
    stressWriting: { prediction: 'Compression will make the fault slip.', explanation: 'The model slipped at stress 80 and friction 40.' } };
}
function mount(Component, initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  let data, patch;
  const onSave = vi.fn(), onSnapshot = vi.fn(), onDraft = vi.fn();
  function Host() {
    const state = React.useState(initial); data = state[0]; patch = value => state[1](prev => ({ ...prev, ...value }));
    return React.createElement(Component, { data, t, onSave(rec) { onSave(rec); patch({ ptCER: rec }); }, onSnapshot, onDraft });
  }
  act(() => ReactDOM.render(React.createElement(Host), host));
  return { host, state: () => data, patch: value => act(() => patch(value)), onSave, onSnapshot, onDraft };
}
function documentOf(cer) { return new DOMParser().parseFromString(window.__alloPtInvestigationReport.html(cer, t), 'text/html'); }
const click = node => act(() => node.click());

describe('Saved investigation evidence and printing', () => {
  it('validates and copies optional predictions, probe timestamps and writing without aliasing the saved record', () => {
    const raw = context(), before = JSON.stringify(raw), saved = window.__alloPtInvestigationReport.read(raw);
    expect(saved.forcePredictions).toEqual([{ a: 'cut', c: 0, t: 0 }]);
    expect(saved.forceProbes[1]).toEqual({ side: 'B', dist: 200, age: 4.4, t: 3 });
    saved.earthquakeDepthTrials.convergent.maxKm = 699; saved.forcePredictions[0].c = 1; saved.forceProbes[0].dist = 1; saved.stressWriting.prediction = 'edited';
    expect(JSON.stringify(raw)).toBe(before);
  });
  it('filters malformed evidence and does not invent optional fields for older snapshots', () => {
    const raw = context();
    raw.forceProbes.push({ side: 'A', dist: 10, age: -1, t: 3 }, { side: 'C', dist: 10, age: 1, t: 3 }, { side: 'A', dist: 10, age: 1, t: Infinity });
    raw.forcePredictions.push({ a: 'cut', c: 5 }, { a: 'other', c: 1 });
    raw.forceObservations.push({ a: 'cut', vBefore: 2, vAfter: 8 });
    const saved = window.__alloPtInvestigationReport.read(raw);
    expect(saved.forceProbes).toHaveLength(2); expect(saved.forcePredictions).toHaveLength(1); expect(saved.forceObservations).toHaveLength(1);
    const older = window.__alloPtInvestigationReport.read({ version: 1 });
    expect(older).not.toHaveProperty('forcePredictions'); expect(older).not.toHaveProperty('forceProbes'); expect(older).not.toHaveProperty('stressWriting');
    expect(window.__alloPtInvestigationReport.read({ version: 2 })).toBeNull();
    const oldCrust = window.__alloPtInvestigationReport.read({ version: 1, forceProbes: [{ side: 'A', dist: 100, age: 5100, t: 4950 }, { side: 'B', dist: 100, age: 5100, t: 20 }] });
    expect(oldCrust.forceProbes).toEqual([{ side: 'A', dist: 100, age: 5100, t: 4950 }]);
  });
  it('shows teachers the submitted snapshot independently of later measurements and draft writing', () => {
    const cer = { ...writing, savedAt: 100, evidenceContext: context() }, before = JSON.stringify(cer);
    const app = mount(window.AlloTectonicsTeacherGuide, { ptCER: cer, ptCERDraft: { claim: 'UNSUBMITTED REVISION' }, ptDepthTrials: { convergent: sample('convergent', [20, 650], 12) }, ptForce: { observations: [{ a: 'cut', vBefore: 99, vAfter: 2 }] } });
    const evidence = () => app.host.querySelector('[data-pt-teacher-saved-evidence]');
    expect(evidence().textContent).toContain('510 km'); expect(evidence().textContent).toContain('8.0 → 1.5');
    expect(evidence().textContent).toContain('1 shallow, 0 intermediate and 1 deep events.');
    expect(evidence().textContent).toContain('shallow < 70 km, intermediate 70–<300 km, deep ≥ 300 km');
    expect(evidence().textContent).not.toContain('650 km'); expect(evidence().textContent).not.toContain('99.0');
    expect(evidence().textContent).toContain('recorded at 3.0 million model years');
    app.patch({ ptDepthTrials: { convergent: sample('convergent', [50, 680], 14) } });
    expect(evidence().textContent).toContain('510 km'); expect(evidence().textContent).not.toContain('680 km');
    expect(JSON.stringify(cer)).toBe(before); expect(app.onSave).not.toHaveBeenCalled(); expect(app.onSnapshot).not.toHaveBeenCalled();
  });
  it('captures new prediction metadata only on deliberate explanation save', () => {
    const app = mount(window.AlloTectonicsExplain, { ptCERDraft: writing, ptForce: { preds: [{ a: 'cut', c: 0, t: 1 }], observations: [{ a: 'cut', vBefore: 8, vAfter: 1.5, t: 4, choice: 0 }] }, boundaryHunt: { hypothesis: 'MY PREDICTION', explanation: 'MY INVESTIGATION EXPLANATION', log: [{ bt: 'transform', f: 80, fr: 40, st: 'strikeSlip' }] } });
    expect(app.onSave).not.toHaveBeenCalled();
    click(app.host.querySelector('[data-pt-cer-save]'));
    const saved = app.state().ptCER.evidenceContext;
    expect(saved.forcePredictions).toEqual([{ a: 'cut', c: 0, t: 1 }]);
    expect(saved.forceObservations[0].t).toBe(4); expect(saved.forceObservations[0].choice).toBe(0);
    expect(saved.stressWriting.prediction).toBe('MY PREDICTION');
    expect(app.onSnapshot.mock.calls[0][1].evidenceContext).toEqual(saved);
    app.patch({ ptForce: { preds: [{ a: 'cut', c: 1, t: 5 }] } });
    expect(app.state().ptCER.evidenceContext.forcePredictions[0].c).toBe(0);
    expect(app.onSave).toHaveBeenCalledTimes(1);
  });
  it('prints submitted writing, recorded settings and useful same-scale depth and speed diagrams', () => {
    const doc = documentOf({ ...writing, savedAt: 100, evidenceContext: context() });
    expect(doc.querySelector('h1').textContent).toBe('Plate tectonics investigation report');
    expect(doc.body.textContent).toContain(writing.claim); expect(doc.body.textContent).toContain('rate setting 5 cm per year');
    expect(doc.body.textContent).toContain('It speeds up, now it is lighter');
    expect(doc.body.textContent).toContain('Recorded at 3.0 million model years');
    expect(doc.querySelectorAll('figure svg')).toHaveLength(2);
    const rangeRows = [...doc.querySelectorAll('figure table tbody tr')];
    expect(rangeRows.map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent))).toEqual([['Convergent', '2', '20–510', '1', '0', '1'], ['Divergent', '2', '5–25', '2', '0', '0']]);
    expect(doc.querySelectorAll('table thead th[scope="col"]').length).toBe(10);
    expect(doc.querySelector('figure table thead').textContent).toContain('Shallow countIntermediate countDeep count');
    expect(doc.querySelector('figure').textContent).toContain('shallow < 70 km, intermediate 70–<300 km, deep ≥ 300 km');
    expect(doc.querySelector('script,link,img,iframe')).toBeNull();
  });
  it('escapes student writing, translations and imported quiz text as ordinary report text', () => {
    const hostile = '<img src="https://evil.test" onerror="alert(1)"><script>alert(2)</script>';
    const cer = { ...writing, claim: hostile, evidenceContext: context() };
    const html = window.__alloPtInvestigationReport.html(cer, (key, fallback) => key.endsWith('rpt_title') ? hostile : fallback);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('img,script,link,iframe,[onerror]')).toBeNull();
    expect(doc.querySelector('h1').textContent).toBe(hostile); expect(doc.querySelector('.writing').textContent).toBe(hostile);
    expect(html).not.toContain('src="https://evil.test"');
  });
  it('preserves legacy writing and identifies its missing snapshot without adding live records', () => {
    const cer = { ...writing, savedAt: 100 };
    const app = mount(window.AlloTectonicsTeacherGuide, { ptCER: cer, ptDepthTrials: { convergent: sample('convergent', [10, 650]) } });
    expect(app.host.querySelector('[data-pt-cer-context-legacy]').textContent).toContain('no observation snapshot');
    const doc = documentOf(cer);
    expect(doc.body.textContent).toContain(writing.evidence); expect(doc.body.textContent).toContain('no current measurements have been added');
    expect(doc.body.textContent).not.toContain('650'); expect(doc.querySelector('svg')).toBeNull();
  });
  it('opens printing only on an explicit click and handles blocked popups without changing saved work', () => {
    const cer = { ...writing, savedAt: 100, evidenceContext: context() }, original = JSON.stringify(cer);
    const app = mount(window.AlloTectonicsTeacherGuide, { ptCER: cer });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    expect(open).not.toHaveBeenCalled();
    click(app.host.querySelector('[data-pt-print-report]'));
    expect(app.host.querySelector('[data-pt-print-status]').textContent).toContain('could not open');
    let printed = '';
    const popup = { document: { write: vi.fn(html => { printed = html; }), close: vi.fn() }, focus: vi.fn(), print: vi.fn(), opener: window };
    open.mockReturnValue(popup);
    click(app.host.querySelector('[data-pt-print-report]'));
    expect(popup.print).toHaveBeenCalledTimes(1); expect(popup.opener).toBeNull();
    expect(printed).toContain('510'); expect(app.host.querySelector('[data-pt-print-status]').textContent).toContain('opened for printing');
    expect(JSON.stringify(cer)).toBe(original); expect(app.onSave).not.toHaveBeenCalled(); expect(app.onSnapshot).not.toHaveBeenCalled(); expect(app.onDraft).not.toHaveBeenCalled();
  });
  it('captures the independently saved comparison and transfer response only with a new submitted explanation', () => {
    const records = Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, { ...sample(mode, mode === 'convergent' ? [20, 510] : [5, 25], 5, 600000), rateFromReset: 5 }]));
    const submission = { rate: 5, years: 600000, prediction: 'The convergent sample will include deeper earthquakes.', explanation: 'The cold sinking slab gives the convergent model a deep earthquake pattern while the other boundaries remain shallow.', records, transferChoice: 'convergent', transferReason: 'The foci deepen inland from a trench, matching the depth pattern in my convergent sample.' };
    const inquiry = { version: 1, plan: { rate: 5, years: 600000, prediction: submission.prediction }, submission };
    expect(window.__alloPtBoundaryInquiry.read(inquiry).submission).toBeTruthy();
    const app = mount(window.AlloTectonicsExplain, { ptCERDraft: writing, ptBoundaryInquiry: inquiry, ptDepthTrials: { convergent: sample('convergent', [20, 650]) } });
    click(app.host.querySelector('[data-pt-cer-save]'));
    const saved = app.state().ptCER.evidenceContext;
    expect(saved.boundaryComparison.records.convergent.maxKm).toBe(510);
    expect(saved.earthquakeDepthTrials.convergent.maxKm).toBe(650);
    expect(saved.boundaryComparison.transferReason).toBe(submission.transferReason);
    const frozen = JSON.stringify(saved);
    app.patch({ ptBoundaryInquiry: { ...inquiry, submission: { ...submission, explanation: 'LATER ACTIVITY REVISION', records: { ...records, convergent: { ...records.convergent, maxKm: 680 } } } } });
    expect(JSON.stringify(app.state().ptCER.evidenceContext)).toBe(frozen);
    const doc = documentOf(app.state().ptCER);
    expect(doc.body.textContent).toContain('All three samples: 600000 model years at a constant rate of 5');
    expect(doc.body.textContent).toContain(submission.transferReason); expect(doc.body.textContent).not.toContain('LATER ACTIVITY REVISION');
    const depthTables = [...doc.querySelectorAll('figure table')];
    expect(depthTables).toHaveLength(2);
    for (const table of depthTables) expect(table.querySelectorAll('thead th')).toHaveLength(6);
    expect([...depthTables[0].querySelectorAll('tbody tr th,tbody tr td')].map(cell => cell.textContent)).toEqual(['Convergent', '2', '20–650', '1', '0', '1']);
    expect([...depthTables[1].querySelector('tbody tr').querySelectorAll('th,td')].map(cell => cell.textContent)).toEqual(['Convergent', '2', '20–510', '1', '0', '1']);
    expect(doc.querySelectorAll('figure svg').length).toBe(2);
    expect(app.onSave).toHaveBeenCalledTimes(1);
  });
  it('reads the latest saved application response only for a deliberate CER revision', () => {
    const records = Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, { ...sample(mode, mode === 'convergent' ? [20, 160, 510] : [5, 25], 5, 600000), rateFromReset: 5 }]));
    const oldReason = 'My earlier response used only the shallow focus and selected spreading.';
    const newReason = 'The trench and foci deepening from 20 to 160 to 380 km support a descending slab at convergent subduction.';
    const submission = { rate: 5, years: 600000, prediction: 'The convergent sample will include deeper earthquakes.', explanation: 'The cold sinking slab gives the convergent model a deep earthquake pattern while the other boundaries remain shallow.', records, transferChoice: 'divergent', transferReason: oldReason };
    const inquiry = { version: 1, plan: { rate: 5, years: 600000, prediction: submission.prediction }, submission };
    const app = mount(window.AlloTectonicsExplain, { ptCERDraft: writing, ptBoundaryInquiry: inquiry, ptDepthTrials: records });
    click(app.host.querySelector('[data-pt-cer-save]'));
    const earlierCER = app.state().ptCER, earlierJSON = JSON.stringify(earlierCER), earlierPrint = window.__alloPtInvestigationReport.html(earlierCER, t);
    expect(earlierCER.evidenceContext.boundaryComparison.transferChoice).toBe('divergent');
    app.patch({ ptBoundaryInquiry: { version: 1, plan: { rate: 10, years: 1200000, prediction: 'A newer plan uses a different rate and time.' }, submission: { ...submission, transferChoice: 'convergent', transferReason: newReason } } });
    expect(JSON.stringify(app.state().ptCER)).toBe(earlierJSON);
    expect(window.__alloPtInvestigationReport.html(app.state().ptCER, t)).toBe(earlierPrint);
    expect(app.onSave).toHaveBeenCalledTimes(1); expect(app.onSnapshot).toHaveBeenCalledTimes(1);
    const reasoning = app.host.querySelector('[data-pt-cer="reasoning"]');
    act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(reasoning, writing.reasoning + ' I revised my application evidence.'); reasoning.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(JSON.stringify(app.state().ptCER)).toBe(earlierJSON);
    click(app.host.querySelector('[data-pt-cer-save]'));
    const latest = app.state().ptCER.evidenceContext.boundaryComparison;
    expect(latest.transferChoice).toBe('convergent'); expect(latest.transferReason).toBe(newReason);
    expect({ rate: latest.rate, years: latest.years, prediction: latest.prediction, explanation: latest.explanation, records: latest.records }).toEqual({ rate: submission.rate, years: submission.years, prediction: submission.prediction, explanation: submission.explanation, records });
    expect(latest.records.convergent).toMatchObject({ shallow: 1, intermediate: 1, deep: 1 });
    expect(app.state().ptBoundaryInquiry.plan.rate).toBe(10); expect(JSON.stringify(earlierCER)).toBe(earlierJSON);
    expect(documentOf(app.state().ptCER).body.textContent).toContain(newReason);
    expect(earlierPrint).toContain(oldReason); expect(earlierPrint).not.toContain(newReason);
    expect(app.onSave).toHaveBeenCalledTimes(2); expect(app.onSnapshot).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed comparison snapshots without replacing valid saved measurements or reading current comparison work', () => {
    const raw = context(); raw.boundaryComparison = { rate: 5, years: 600000, prediction: 'Prediction', explanation: 'Explanation', records: {} };
    const saved = window.__alloPtInvestigationReport.read(raw);
    expect(saved).not.toHaveProperty('boundaryComparison'); expect(saved.earthquakeDepthTrials.convergent.maxKm).toBe(510);
    const doc = documentOf({ ...writing, evidenceContext: raw });
    expect(doc.body.textContent).not.toContain('Saved boundary comparison'); expect(doc.body.textContent).toContain('20–510');
  });
  it('identifies genuinely empty evidence without calling a saved probe-only context empty', () => {
    const probeOnly = { version: 1, forceProbes: [{ side: 'A', dist: 100, age: 2, t: 0 }] };
    const app = mount(window.AlloTectonicsTeacherGuide, { ptCER: { ...writing, evidenceContext: probeOnly } });
    expect(app.host.querySelector('[data-pt-teacher-saved-evidence]').textContent).not.toContain('No validated observations');
    const report = documentOf({ ...writing, evidenceContext: probeOnly });
    expect(report.body.textContent).toContain('Saved sea-floor probes'); expect(report.body.textContent).not.toContain('No validated observations');
    expect(documentOf({ ...writing, evidenceContext: { version: 1 } }).body.textContent).toContain('No validated observations');
  });
});
