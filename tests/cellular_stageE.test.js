// Cellular Automaton Lab stage E (2026-11-04, approved option b): the forest-model
// sort's FIRST check reports only how many statements are wrong. The per-item
// explanations (which give the answers away) appear from the second check on.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the stage-E start copy to prove each gate can fail.
const TOOL_FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let errSpy;

beforeEach(() => {
  resetStemLab();
  errSpy = vi.spyOn(console, 'error');
  loadTool(TOOL_FILE, 'cellularLab');
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  vi.restoreAllMocks();
});

async function mount(over, initial) {
  const out = { latest: null };
  function App() {
    const [state, setState] = React.useState(initial || {});
    out.latest = state;
    return window.StemLab._registry.cellularLab.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return out;
}
const buttons = () => Array.from(document.querySelectorAll('button'));
const btnByText = (txt) => buttons().find((b) => b.textContent.trim() === txt) || buttons().find((b) => b.textContent.includes(txt));
async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
async function tab(id) { await click(document.getElementById('cell-tab-' + id)); }
const radioByValue = (name, v) => document.querySelector('input[type="radio"][name="' + name + '"][value="' + v + '"]');
const sec = () => document.querySelector('[data-ff-model]');
// Everything a student or screen reader could get: section text, every attribute, the live regions.
function exposed(announced) {
  const s = sec();
  const attrs = Array.from(s.querySelectorAll('*')).concat([s]).flatMap((el) => Array.from(el.attributes).map((a) => a.value));
  const live = Array.from(document.querySelectorAll('[aria-live],[role="status"],[role="alert"]')).map((n) => n.textContent);
  return [s.textContent, attrs.join(' '), live.join(' '), announced.join(' ')].join(' || ');
}
const TRUTH = { touch: 'in', wind: 'out', onestep: 'in', embers: 'out', gaps: 'in', terrain: 'out', same: 'in', people: 'out' };
// Every per-item explanation, as English fallbacks in the tool (ffItemWhy).
const WHY = [/Look at the rule: fire reaches only/, /There is no wind/, /each burning cell turns to ash/, /it can never jump a gap/, /the fire stops where there are no trees/, /There are no hills/, /No tree is wetter/, /Nobody acts in the model/];
async function sortWith(flip) {
  for (const [id, v] of Object.entries(TRUTH)) await click(radioByValue('ffm-' + id, flip.includes(id) ? (v === 'in' ? 'out' : 'in') : v));
}

describe('Forest model sort: count first, explanations from the second check', () => {
  it('first check shows only "N of 8" with no per-item answer anywhere; the second check explains each wrong item', async () => {
    const said = [];
    const award = vi.fn();
    const out = await mount({ gradeBand: 'g68', awardXP: award, announceToSR: (m) => said.push(String(m)) });
    await tab('missions');
    expect(sec()).not.toBeNull();
    await sortWith(['wind', 'gaps']);
    await click(btnByText('Check my sort'));
    const first = exposed(said);
    for (const re of WHY) expect(first, String(re)).not.toMatch(re);
    expect(first).toMatch(/Statements that need another look: 2 of 8\./);
    expect(out.latest._cellularLab.cer.ffmodel.sortChecks).toBe(1);
    expect(out.latest._cellularLab.cer.ffmodel.sortOk).toBe(false);
    // Second check (same answers): now each wrong item is explained, and only those.
    await click(btnByText('Check my sort'));
    const second = exposed(said);
    expect(second).toMatch(/Statements that need another look: 2 of 8\. Here is why:/);
    expect(second).toMatch(/There is no wind/);
    expect(second).toMatch(/the fire stops where there are no trees/);
    expect(second).not.toMatch(/Nobody acts in the model/);
    expect(out.latest._cellularLab.cer.ffmodel.sortChecks).toBe(2);
    // Fixing the sort still unlocks step 2; checking the sort never awards XP by itself.
    await click(radioByValue('ffm-wind', 'out')); await click(radioByValue('ffm-gaps', 'in'));
    await click(btnByText('Check my sort'));
    expect(exposed(said)).toMatch(/All eight sorted correctly/);
    expect(out.latest._cellularLab.cer.ffmodel.sortOk).toBe(true);
    expect(award).not.toHaveBeenCalled();
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  });

  it('one wrong statement reads correctly (no "1 of 8 need" plural trap) and an incomplete sort is not counted as a check', async () => {
    const out = await mount({ gradeBand: 'g912' });
    await tab('missions');
    await click(radioByValue('ffm-touch', 'in'));
    await click(btnByText('Check my sort'));
    expect(sec().textContent).toMatch(/Sort all eight statements first/);
    expect(((out.latest._cellularLab || {}).cer || {}).ffmodel).toBeUndefined();
    await sortWith(['people']);
    await click(btnByText('Check my sort'));
    expect(sec().textContent).not.toMatch(/Nobody acts in the model/);
    expect(sec().textContent).toMatch(/Statements that need another look: 1 of 8\./);
    expect(sec().textContent).not.toMatch(/1 of 8 need another look/);
  });

  it('a saved check count (or a hostile one) is honoured: earlier checks mean explanations now; junk reads as no checks', async () => {
    await mount({ gradeBand: 'g68' }, { _cellularLab: { cer: { ffmodel: { sortChecks: 1 } } } });
    await tab('missions');
    await sortWith(['embers']);
    await click(btnByText('Check my sort'));
    expect(sec().textContent).toMatch(/Here is why:.*it can never jump a gap/);
    await React.act(() => root.unmount()); root = null;
    for (const junk of [{ cer: { ffmodel: 0 } }, { cer: { ffmodel: { sortChecks: 'x' } } }, { cer: { ffmodel: { sortChecks: -3 } } }]) {
      await mount({ gradeBand: 'g68' }, { _cellularLab: junk });
      await tab('missions');
      await sortWith(['embers']);
      await click(btnByText('Check my sort'));
      expect(sec().textContent, JSON.stringify(junk)).not.toMatch(/it can never jump a gap/);
      expect(sec().textContent, JSON.stringify(junk)).toMatch(/Statements that need another look: 1 of 8\./);
      await React.act(() => root.unmount()); root = null;
    }
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
  });
});
