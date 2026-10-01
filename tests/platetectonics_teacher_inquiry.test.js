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
const row = (bt, f = 50, fr = 50) => ({ bt, f, fr, st: bt === 'convergent' ? 'stable' : bt === 'divergent' ? 'normal' : 'strikeSlip' });
function epicenter({ revealed = true, revision = true, first = true } = {}) {
  const stations = [{ id: 'BRK', x: 90, y: 90 }, { id: 'PAS', x: 450, y: 260 }, { id: 'MHC', x: 120, y: 300 }];
  const dists = Object.fromEntries(stations.map(s => { const distance = Math.hypot(s.x - 270, s.y - 180) * 4; return [s.id, String(Math.round(Number((distance / 8.4).toFixed(1)) * 8.4))]; }));
  return { version: 1, stations, mystery: { truth: { x: 270, y: 180 }, guess: { x: 270, y: 180 }, dists,
    revealed, revision, originalAttempt: first ? { guess: { x: 280, y: 180 }, dists: { BRK: '1', PAS: '1', MHC: '1' }, errKm: 999 } : null, errKm: 999 } };
}

describe('Teacher review of retained measurements and revisions', () => {
  it('shows all retained stress settings and qualifies a controlled boundary comparison', () => {
    const data = { boundaryHunt: { trialsByType: Object.fromEntries(['convergent', 'divergent', 'transform'].map(bt => [bt, row(bt)])), explanation: 'The settings were held constant while the boundary type changed.' } };
    const app = mount(data), card = app.card('stress');
    expect(card.textContent).toContain('Convergent: stress 50%, friction 50%; held with no slip.');
    expect(card.textContent).toContain('Divergent: stress 50%, friction 50%; normal faulting.');
    expect(card.textContent).toContain('Transform: stress 50%, friction 50%; strike-slip faulting.');
    expect(card.querySelector('[data-pt-teacher-stress-matched]').dataset.ptTeacherStressMatched).toBe('true');
    expect(card.textContent).toContain('held constant across all three types');
  });
  it('uses the latest recorded controls and identifies confounded comparisons', () => {
    const kept = Object.fromEntries(['convergent', 'divergent', 'transform'].map(bt => [bt, row(bt)]));
    const card = mount({ boundaryHunt: { trialsByType: kept, log: [row('convergent', 70, 10)] } }).card('stress');
    expect(card.textContent).toContain('Convergent: stress 70%, friction 10%');
    expect(card.querySelector('[data-pt-teacher-stress-matched]').dataset.ptTeacherStressMatched).toBe('false');
    expect(card.textContent).toContain('before attributing a difference to boundary type');
  });
  it('rejects non-finite and out-of-range stored measurements without fabricating matched controls', () => {
    const card = mount({ boundaryHunt: { trialsByType: { convergent: row('convergent', Infinity), divergent: row('divergent', 101), transform: row('transform', 50, -1) } } }).card('stress');
    expect(card.querySelector('[data-pt-teacher-stress-matched]')).toBeNull();
    expect(card.textContent).not.toContain('Infinity%');
    expect(card.textContent).not.toContain('held constant across all three types');
  });
  it('retains readable scientific writing as writing rather than a scored explanation', () => {
    const card = mount({ boundaryHunt: { hypothesis: 'Higher friction may prevent slip.', explanation: 'A long enough explanation can still contain an incorrect scientific claim.' } }).card('stress');
    expect(card.querySelector('[data-pt-teacher-stress-writing]').textContent).toContain('Higher friction may prevent slip.');
    expect(card.querySelector('[data-pt-teacher-stress-status]').dataset.ptTeacherStressStatus).toBe('incomplete');
  });
  it('distinguishes an unfinished case from scored attempts without exposing hidden coordinates or errors', () => {
    const app = mount({ ptEpi: { caseDraft: epicenter({ revealed: false, revision: false, first: false }) } }), card = app.card('epicenter');
    expect(card.querySelector('[data-pt-teacher-epicenter-state]').dataset.ptTeacherEpicenterState).toBe('draft');
    expect(card.textContent).toContain('No scored mystery result yet');
    expect(card.textContent).not.toContain('270'); expect(card.textContent).not.toContain('999');
    expect(card.textContent).not.toContain('km error');
  });
  it('recomputes original and revealed practice results and keeps the scored history separate', () => {
    const card = mount({ ptEpi: { mysteryBestKm: 50.4, mysteryTries: 2, caseDraft: epicenter() } }).card('epicenter');
    expect(card.textContent).toContain('Best scored first attempt: 50.4 km');
    expect(card.textContent).toContain('scored cases: 2');
    expect(card.textContent).toContain('first attempt: 40.0 km error; 0/3 radii');
    expect(card.textContent).toContain('practice revision: 0.0 km error; 3/3 matching radii');
    expect(card.textContent).toContain('does not replace the scored attempt');
    expect(card.textContent).not.toContain('999');
  });
  it('keeps current practice accuracy hidden until that revision is revealed', () => {
    const card = mount({ ptEpi: { caseDraft: epicenter({ revealed: false }) } }).card('epicenter');
    expect(card.querySelector('[data-pt-teacher-epicenter-state]').dataset.ptTeacherEpicenterState).toBe('revising');
    expect(card.textContent).toContain('first attempt: 40.0 km error');
    expect(card.textContent).not.toContain('practice revision: 0.0');
  });
  it('rejects malformed cases without discarding valid scored history', () => {
    const bad = epicenter(); bad.stations[0].id = 'OTHER';
    const card = mount({ ptEpi: { mysteryBestKm: 24, mysteryTries: 1, caseDraft: bad } }).card('epicenter');
    expect(card.querySelector('[data-pt-teacher-epicenter-state]').dataset.ptTeacherEpicenterState).toBe('none');
    expect(card.textContent).toContain('Best scored first attempt: 24.0 km');
  });
  it('shows earlier successful hotspot evidence during a later worse retry without relabeling the newer estimate', () => {
    const card = mount({ ptHotspot: { est: null, completed: { est: 30, dir: 'se' }, bestEst: 95, evidence: { est: 95, dir: 'nw' } } }).card('hotspots');
    expect(card.textContent).toContain('Locked estimate: 3.0 cm/yr');
    expect(card.textContent).toContain('Earlier completed evidence is retained: 9.5 cm/yr toward the northwest.');
    expect(card.querySelector('[data-pt-teacher-hotspot-status]').dataset.ptTeacherHotspotStatus).toBe('ready');
  });
  it('opens all teacher details without writes, pings, progress or changes to saved records', () => {
    const data = { ptEpi: { caseDraft: epicenter() }, boundaryHunt: { hypothesis: 'Hold the inputs constant.', explanation: 'Compare the recorded outcomes.' } };
    const original = JSON.stringify(data), onRecord = vi.fn(), awardXP = vi.fn(), beep = vi.fn();
    const app = mount(data, { onRecord, awardXP, beep });
    for (const summary of app.host.querySelectorAll('summary')) summary.click();
    expect(JSON.stringify(data)).toBe(original); expect(onRecord).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled(); expect(beep).not.toHaveBeenCalled();
  });
});
