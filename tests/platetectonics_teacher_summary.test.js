import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM;
const mounted = [];
beforeAll(() => {
  window.StemLab = { registerTool() {}, makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM;
});
afterEach(() => { while (mounted.length) { const host = mounted.pop(); ReactDOM.unmountComponentAtNode(host); host.remove(); } });

function mount(data = {}, extra = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
  ReactDOM.render(React.createElement(window.AlloTectonicsTeacherGuide, { data, t: (_, fallback) => fallback, ...extra }), host);
  return { host, card: key => host.querySelector('[data-pt-teacher-card="' + key + '"]') };
}
const row = bt => ({ bt, f: 60, fr: 40, st: 'normal' });
const writing = { claim: 'A cold slab carries earthquakes deeper.', evidence: 'The recorded convergent sample had deeper earthquakes than the divergent sample.', reasoning: 'The cold sinking plate follows a path down through the mantle.' };
const sample = (mode, zs) => window.__alloPtDepthTrials.capture({ mode, qlog: zs.map(z => ({ z })), rate: 5, years: 60000 });

describe('Teacher guide: actual saved evidence and completion', () => {
  it('distinguishes predictions from completed force observations', () => {
    const app = mount({ ptForce: { preds: [{ a: 'cut', c: 1, ok: true }, null, { a: 'unknown', c: 1 }], observations: [{ a: 'cut', vBefore: Infinity, vAfter: 1 }] } });
    expect(app.card('forces').textContent).toContain('Saved predictions: 1. Completed observations retained: 0.');
    expect(app.card('forces').textContent).not.toContain('matched what happened');
    const done = mount({ ptForce: { observations: [{ a: 'cut', vBefore: 8.5, vAfter: 1.25 }, { a: 'continent', vBefore: 7.5, vAfter: 1.1, mountainKm: 3.3 }] } });
    expect(done.card('forces').textContent).toContain('8.5 → 1.3 cm/yr immediately after the cut');
    expect(done.card('forces').textContent).toContain('7.5 → 1.1 cm/yr; recorded mountain height 3.3 km');
  });

  it('reports actual depth samples and requires both parts of the comparison', () => {
    const convergent = sample('convergent', [30, 592]), divergent = sample('divergent', [5, 24]);
    expect(mount({ ptDepthTrials: { convergent } }).card('depths').textContent).toContain('Next: record');
    const card = mount({ ptDepthTrials: { convergent, divergent } }).card('depths');
    expect(card.textContent).toContain('recorded for comparison');
    expect(card.textContent).toContain('Convergent: 2 recorded events, 30–592 km deep');
    expect(card.textContent).toContain('Divergent: 2 recorded events, 5–24 km deep');
  });

  it('uses retained stress coverage and the same character threshold as the student flow', () => {
    const state = { boundaryHunt: { log: Array.from({ length: 8 }, () => row('convergent')), trialsByType: { convergent: row('convergent'), divergent: row('divergent'), transform: row('transform') }, explanation: 'x'.repeat(40) } };
    const ready = mount(state);
    expect(ready.card('stress').textContent).toContain('Boundary types recorded: 3 of 3. Explanation: 40 characters; minimum 40 characters.');
    expect(ready.card('stress').textContent).toContain('Ready to reveal the model. Review the explanation’s scientific reasoning');
    expect(ready.host.querySelector('[data-pt-teacher-stress-status]').dataset.ptTeacherStressStatus).toBe('ready');
    const incomplete = mount({ boundaryHunt: { ...state.boundaryHunt, explanation: 'x'.repeat(39) } });
    expect(incomplete.host.querySelector('[data-pt-teacher-stress-status]').dataset.ptTeacherStressStatus).toBe('incomplete');
  });

  it.each([['3-5', 6], ['6-8', 8], ['9-12', 8]])('retains the actual %s completed quiz denominator during a retry', (band, total) => {
    const app = mount({ ptQuizResult: { score: total - 1, total, band, missed: ['Convection'] }, quizBand: band, quizIdx: 1, quizScore: 0, quizAnswer: null });
    expect(app.card('quiz').textContent).toContain(`Latest completed quiz: ${total - 1} of ${total} (grades ${band}); concepts missed: Convection`);
    expect(app.card('quiz').textContent).toContain(`Current attempt: 1 of ${total} responses recorded`);
  });

  it('shows a distinct stored best quiz and rejects inconsistent saved denominators', () => {
    const app = mount({ ptQuizResult: { score: 3, total: 8, band: '6-8', missed: [] }, ptQuizBest: { score: 6, total: 6, band: '3-5', missed: [] } });
    expect(app.card('quiz').textContent).toContain('Stored best completed quiz: 6 of 6 (grades 3-5)');
    const malformed = mount({ ptQuizResult: { score: 6, total: 6, band: '6-8' }, quizScore: 8 });
    expect(malformed.card('quiz').textContent).toContain('no completed attempt yet');
  });

  it('distinguishes a draft, a full submission and changes after submission', () => {
    const partial = mount({ ptCER: { claim: 'Only a claim' }, ptCERDraft: writing });
    expect(partial.host.querySelector('[data-pt-teacher-cer-status]').dataset.ptTeacherCerStatus).toBe('draft');
    expect(partial.host.querySelector('[data-pt-teacher-submission]')).toBeNull();
    const submitted = mount({ ptCER: writing, ptCERDraft: writing });
    expect(submitted.host.querySelector('[data-pt-teacher-cer-status]').dataset.ptTeacherCerStatus).toBe('submitted');
    expect(submitted.host.querySelector('[data-pt-teacher-submission]').textContent).toContain(writing.reasoning);
    const revised = mount({ ptCER: writing, ptCERDraft: { ...writing, claim: 'A revised claim about the cold sinking plate.' } });
    expect(revised.host.querySelector('[data-pt-teacher-cer-status]').dataset.ptTeacherCerStatus).toBe('submitted-with-draft');
    expect(revised.host.querySelector('[data-pt-teacher-submission]').textContent).toContain(writing.claim);
  });

  it('requires a finite locked hotspot fit and correct direction rather than a slider draft', () => {
    const status = value => mount({ ptHotspot: value }).host.querySelector('[data-pt-teacher-hotspot-status]').dataset.ptTeacherHotspotStatus;
    expect(status({ draftRate: 95, dir: 'nw' })).toBe('review');
    expect(status({ est: Infinity, dir: 'nw' })).toBe('review');
    expect(status({ est: 95, dir: 'se' })).toBe('review');
    expect(status({ est: 95, dir: 'nw' })).toBe('ready');
    expect(mount({ ptHotspot: { est: 95, dir: 'nw' } }).card('hotspots').textContent).toContain('9.5 cm/yr');
  });

  it('keeps a continent exploration draft separate from an accepted fit and explanation', () => {
    expect(mount({ ptFit: { draftT: window.__alloPtFit.best().t } }).card('fit').textContent).toContain('No accepted fit yet');
    expect(mount({ ptFit: { fitted: true, answer: 'bridge' } }).card('fit').textContent).toContain('Review the fossil-evidence question');
    expect(mount({ ptFit: { fitted: true, answer: 'joined' } }).card('fit').textContent).toContain('joined-continent explanation are saved');
  });

  it('stays read-only and explains model and standards limits without hiding the student summary', () => {
    const record = vi.fn(), reward = vi.fn();
    const data = Object.freeze({ ptCERDraft: Object.freeze(writing), ptHotspot: Object.freeze({ draftRate: 80 }) });
    const app = mount(data, { onRecord: record, awardXP: reward });
    for (const summary of app.host.querySelectorAll('summary')) summary.click();
    expect(record).not.toHaveBeenCalled(); expect(reward).not.toHaveBeenCalled();
    expect(app.host.querySelector('[data-pt-teacher-evidence]').compareDocumentPosition(app.host.querySelector('[data-pt-teacher-lesson]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(app.host.querySelector('[data-pt-teacher-limits]').textContent).toContain('not a real earthquake catalog or forecast');
    expect(app.host.querySelector('[data-pt-teacher-standards]').textContent).toContain('Paleomagnetic anomalies are outside');
    expect([...app.host.querySelectorAll('a')].every(a => a.href.startsWith('https://www.nextgenscience.org/'))).toBe(true);
  });
});
