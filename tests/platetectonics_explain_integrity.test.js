import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
let React, ReactDOM, act;
const apps = [];
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
afterEach(() => { for (const app of apps) { act(() => app.root.unmount()); app.host.remove(); } apps.length = 0; });
const writing = { claim: 'The sinking slab allows earthquakes to occur deep.', evidence: 'I recorded deep model earthquakes at convergent boundaries and shallow ones at divergent boundaries.', reasoning: 'The slab carries cold rock deeper than the hot rock surrounding it.' };
const row = (bt, f = 50, fr = 50) => ({ bt, f, fr, st: f - fr * 0.6 <= ({ convergent: 25, divergent: 8, transform: 15 })[bt] ? 'stable' : ({ convergent: 'thrust', divergent: 'normal', transform: 'strikeSlip' })[bt] });
const rows = () => Object.fromEntries(['convergent', 'divergent', 'transform'].map(type => [type, row(type)]));
const sample = (mode, depths) => window.__alloPtDepthTrials.capture({ mode, qlog: depths.map(z => ({ z })), rate: 5, years: 60000 });
function mount(initial = {}, afterSave) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), onSave = vi.fn(), onDraft = vi.fn(), onSnapshot = vi.fn(), announce = vi.fn();
  let data, setData;
  function Host() {
    const state = React.useState({ ptCERDraft: writing, ...initial }); data = state[0]; setData = state[1];
    return React.createElement(window.AlloTectonicsExplain, { data, t: (_k, fallback) => fallback, announceToSR: announce,
      onSave(rec) { onSave(rec); setData(prev => ({ ...prev, ptCER: rec })); if (afterSave) afterSave(); },
      onDraft(patch) { onDraft(patch); setData(prev => ({ ...prev, ptCERDraft: { ...(prev.ptCERDraft || prev.ptCER || {}), ...patch } })); },
      onSnapshot });
  }
  const app = { host, root, onSave, onDraft, onSnapshot, announce, find: selector => host.querySelector(selector), state: () => data, update: patch => act(() => setData(prev => ({ ...prev, ...patch }))) };
  apps.push(app); act(() => root.render(React.createElement(Host))); return app;
}
const click = node => act(() => node.click());
function value(node, text) { act(() => { const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLTextAreaElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, text); node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }

describe('Explain It evidence integrity', () => {
  it('offers a qualified comparison of three matching retained stress trials without inserting it automatically', () => {
    const app = mount({ boundaryHunt: { trialsByType: rows(), log: [] } });
    const card = app.find('[data-pt-evidence="stress"]');
    expect(card.dataset.ptStressComparison).toBe('matched');
    expect(card.textContent).toContain('same model stress (50%) and friction (50%)');
    expect(card.textContent).toContain('convergent trial showed held with no slip');
    expect(card.textContent).toContain('divergent showed normal faulting');
    expect(card.textContent).toContain('transform showed strike-slip faulting');
    expect(card.textContent).toContain('does not measure earthquake depths');
    expect(app.onDraft).not.toHaveBeenCalled(); expect(app.onSave).not.toHaveBeenCalled();
    click(card.querySelector('[data-pt-evidence-add]'));
    expect(app.state().ptCERDraft.evidence).toContain('convergent trial showed held with no slip');
    expect(app.onDraft).toHaveBeenCalledTimes(1);
  });

  it('lets a learner choose an unmatched retained trial without treating selection as a writing edit or controlled comparison', () => {
    const records = rows(); records.convergent = row('convergent', 90, 20);
    const app = mount({ boundaryHunt: { trialsByType: records, log: [] } });
    const select = app.find('[data-pt-ex-stress-select]');
    value(select, 'convergent');
    const card = app.find('[data-pt-evidence="stress"]');
    expect(card.dataset.ptStressComparison).toBe('single');
    expect(card.textContent).toContain('stress was 90% and friction was 20%');
    expect(card.textContent).toContain('Compare trials with one changed input');
    expect(card.textContent).not.toContain('At the same model stress');
    expect(app.onDraft).not.toHaveBeenCalled();
    click(card.querySelector('[data-pt-evidence-add]'));
    expect(app.state().ptCERDraft.evidence).toContain('one recorded convergent model trial');
    expect(app.onSave).not.toHaveBeenCalled();
  });

  it('freezes validated plain observations at Save and keeps them separate from later investigation data', () => {
    const records = rows(), depths = { convergent: sample('convergent', [20, 510]), divergent: sample('divergent', [5, 25]) };
    const force = { a: 'cut', vBefore: 8, vAfter: 1.5, ignored: { private: true } };
    records.convergent.ignored = 'do not copy'; depths.convergent.ignored = 'do not copy';
    const app = mount({ boundaryHunt: { trialsByType: records }, ptDepthTrials: depths, ptForce: { observations: [force] },
      ptHotspot: { est: null, evidence: { est: 95, dir: 'nw' } }, ptMadeMaxMag: 7.8,
      ptQuizResult: { score: 6, total: 8, band: '6-8', missed: ['Convection'], ignored: 'no' } });
    click(app.find('[data-pt-cer-save]'));
    const saved = app.state().ptCER.evidenceContext, snap = app.onSnapshot.mock.calls[0][1];
    expect(saved).toMatchObject({ version: 1, stressTrialsByType: { convergent: { f: 50, fr: 50, st: 'stable' } },
      hotspot: { estimateKmPerMyr: 95, direction: 'nw' }, modelMagnitudeMax: 7.8, quiz: { score: 6, total: 8, band: '6-8' } });
    expect(saved.earthquakeDepthTrials.convergent.maxKm).toBe(510);
    expect(saved.forceObservations).toEqual([{ a: 'cut', vBefore: 8, vAfter: 1.5 }]);
    expect(saved.stressTrialsByType.convergent).not.toHaveProperty('ignored'); expect(saved.earthquakeDepthTrials.convergent).not.toHaveProperty('ignored');
    expect(snap.stressTrialsByType.convergent.f).toBe(50); expect(snap.evidenceContext).toEqual(saved);
    records.convergent.f = 99; force.vBefore = 90; depths.convergent.maxKm = 610;
    app.update({ boundaryHunt: { trialsByType: records }, ptDepthTrials: depths });
    expect(saved.stressTrialsByType.convergent.f).toBe(50); expect(saved.forceObservations[0].vBefore).toBe(8); expect(saved.earthquakeDepthTrials.convergent.maxKm).toBe(510);
    const frozen = app.find('[data-pt-cer-saved-context]');
    expect(frozen.textContent).toContain('510 km'); expect(frozen.textContent).toContain('stress 50%'); expect(frozen.textContent).not.toContain('stress 99%');
    expect(frozen.textContent).toContain('not a check that every observation supports');
    expect(frozen.open).toBe(false); expect(app.onSave).toHaveBeenCalledTimes(1); expect(app.onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid observation fields and prevents imported unknown properties from entering saved context', () => {
    const app = mount({ boundaryHunt: { trialsByType: { convergent: { bt: 'convergent', f: Infinity, fr: 50, st: 'thrust' } } },
      ptForce: { observations: [{ a: 'cut', vBefore: NaN, vAfter: 2 }, { a: 'continent', vBefore: 5, vAfter: 1, mountainKm: 0 }] },
      ptDepthTrials: { divergent: { mode: 'divergent', events: 1, minKm: 0, maxKm: 999, shallow: 1, intermediate: 0, deep: 0 } },
      ptHotspot: { evidence: { est: Infinity, dir: 'nw' } }, ptMadeMaxMag: Infinity,
      ptQuizResult: { score: 1.5, total: 8, band: '6-8' } });
    click(app.find('[data-pt-cer-save]'));
    const context = app.state().ptCER.evidenceContext;
    expect(context.stressTrialsByType).toEqual({}); expect(context.earthquakeDepthTrials).toEqual({}); expect(context.forceObservations).toEqual([]);
    expect(context.hotspot).toBeNull(); expect(context.modelMagnitudeMax).toBeNull(); expect(context.quiz).toBeNull();
    expect(app.find('[data-pt-cer-saved-context]').textContent).toContain('No validated observations');
  });

  it('guards batched and callback-reentrant Save, while allowing one deliberately edited revision', () => {
    let button, reentered = false;
    const app = mount({}, () => { if (!reentered) { reentered = true; button.click(); } });
    button = app.find('[data-pt-cer-save]');
    act(() => { button.click(); button.click(); });
    expect(app.onSave).toHaveBeenCalledTimes(1); expect(app.onSnapshot).toHaveBeenCalledTimes(1); expect(app.announce).toHaveBeenCalledTimes(1);
    value(app.find('[data-pt-cer="claim"]'), 'My revised claim now links the sinking slab to depth.');
    click(app.find('[data-pt-cer-save]'));
    expect(app.onSave).toHaveBeenCalledTimes(2); expect(app.onSnapshot).toHaveBeenCalledTimes(2);
  });

  it('does not fabricate a frozen context for an older submission from current observations', () => {
    const app = mount({ ptCER: { ...writing, savedAt: 100, band: '6-8' }, boundaryHunt: { trialsByType: rows() } });
    expect(app.find('[data-pt-cer-saved-context]')).toBeNull();
    expect(app.find('[data-pt-cer-context-legacy]').textContent).toContain('older saved version has no observation snapshot');
    expect(app.onSave).not.toHaveBeenCalled(); expect(app.onSnapshot).not.toHaveBeenCalled(); expect(app.onDraft).not.toHaveBeenCalled();
  });

  it('uses a retained successful Hawaiian observation while a new estimate is only a draft', () => {
    const app = mount({ ptHotspot: { est: null, dir: 'se', draftRate: 180, completed: { est: 180, dir: 'se' }, evidence: { est: 95, dir: 'nw' } } });
    const card = app.find('[data-pt-evidence="hawaii"]');
    expect(card.dataset.ptEvidenceHave).toBe('true'); expect(card.textContent).toContain('9.5 cm per year toward the northwest');
    expect(card.textContent).not.toContain('18.0 cm');
    click(app.find('[data-pt-cer-save]'));
    expect(app.state().ptCER.evidenceContext.hotspot).toEqual({ estimateKmPerMyr: 95, direction: 'nw' });
  });
});
