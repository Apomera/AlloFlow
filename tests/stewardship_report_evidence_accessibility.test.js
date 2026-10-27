import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
let print;
beforeEach(() => { print = vi.spyOn(window, 'print').mockImplementation(() => {}); });
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
async function mount(logs) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host }); let latest;
  function Host() {
    const [data, setData] = React.useState({ stewardshipHub: { tutorialSeen: true, viewingReport: 'conserve', stewIQ: { hypothesis: 'Keep my hypothesis.', log: [{ odds: 47 }] } },
      ecosystem: { conserve: { phase: 'debrief', year: 10, maxYears: 10, finalOutcome: { label: 'Recovered ecosystem', color: '#86efac' }, species: [], yearLog: logs, custom: 'keep' } },
      fireEcology: { mosaic: { phase: 'playing', year: 3, custom: 'unchanged' } } });
    latest = data; return tool.render(makeCtx({ toolData: data, setToolData: setData }, store));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, feedback: () => [...host.querySelectorAll('[data-stewardship-report-feedback]')].map(el => el.textContent), print: () => host.querySelector('[data-stewardship-action=print]') };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }

describe('Stewardship report feedback evidence', () => {
  it.each(['cascades', 'feedbacks', 'cascadesFired'])('reads descriptions, older strings and ID-only entries from %s', async field => {
    const logs = freeze([{ year: 1, event: 'Community restoration', [field]: ['  Older habitat observation.  ', { id: 'recovery', msg: '  Forest habitat improves.  ' }, { id: 'older-rule' }, { id: 'fallback-rule', msg: ' ' }] }]);
    const t = await mount(logs);
    expect(t.feedback()).toEqual(['↳ Older habitat observation. · Forest habitat improves. · older-rule · fallback-rule']);
    expect(t.host.textContent).not.toContain('undefined'); expect(t.state().ecosystem.conserve.yearLog).toBe(logs);
  });

  it('omits malformed feedback without blank separators or an empty feedback line', async () => {
    const logs = freeze([{ year: 1, event: 'Mixed evidence', cascades: [null, undefined, '', ' ', 42, {}, [], { msg: false }, { id: 0 }, 'Valid observation.', { msg: 'Another observation.' }] },
      { year: 2, event: 'No readable evidence', feedbacks: [null, {}, ''] }, { year: 3, event: 'Malformed collection', cascadesFired: 'invalid array' }]);
    const t = await mount(logs); expect(t.feedback()).toEqual(['↳ Valid observation. · Another observation.']);
    expect(t.host.textContent).toContain('Mixed evidence'); expect(t.host.textContent).toContain('No readable evidence'); expect(t.host.textContent).toContain('Malformed collection');
    expect(t.host.textContent).not.toContain('[object Object]'); expect(t.state().ecosystem.conserve.yearLog).toBe(logs);
  });

  it('retains repeated observations and original period totals without rewriting saved logs', async () => {
    const logs = freeze([{ year: 1, event: 'First year', cascades: ['Habitat recovery.', 'Habitat recovery.'] }, { year: 2, event: 'Second year', cascades: [{ id: 'recovery', msg: 'Habitat recovery.' }] }]);
    const t = await mount(logs);
    expect(t.feedback()).toEqual(['↳ Habitat recovery. · Habitat recovery.', '↳ Habitat recovery.']);
    expect(t.host.querySelector('[data-stewardship-report-metadata]').textContent).toContain('2 of 10');
    expect(t.state().ecosystem.conserve.yearLog).toBe(logs); expect(t.state().fireEcology.mosaic.custom).toBe('unchanged');
  });

  it('includes all readable feedback in the selected print copy and preserves saved work', async () => {
    const logs = freeze([{ year: 1, event: 'Community restoration', cascades: ['Older habitat observation.', { id: 'recovery', msg: 'Forest habitat improves.' }, { id: 'older-rule' }] }]);
    const t = await mount(logs), before = JSON.stringify(t.state()), expected = t.feedback(); let copied;
    print.mockImplementation(() => { const copy = document.querySelector('[data-stewardship-print-copy]'); copied = [...copy.querySelectorAll('[data-stewardship-report-feedback]')].map(el => el.textContent); expect(copy.querySelector('button')).toBeNull(); });
    await activate(t.print()); expect(print).toHaveBeenCalledTimes(1); expect(copied).toEqual(expected);
    expect(document.querySelector('[data-stewardship-print-copy]')).toBeNull(); expect(document.querySelector('[data-stewardship-print-style]')).toBeNull();
    expect(document.activeElement).toBe(t.print()); expect(JSON.stringify(t.state())).toBe(before); expect(t.state().ecosystem.conserve.yearLog).toBe(logs);
  });
});
