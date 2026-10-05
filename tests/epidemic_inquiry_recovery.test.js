import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, container, state;
const observation = n => ({ c: n, i: 30, t: 2.5, rE: n / 100, reg: 'declining' });
const initial = extra => ({ contact: 50, intervention: 30, transmissibility: 2.5, hypothesis: 'Working draft', explanation: 'Evidence draft', understood: true, log: [], ...extra });

function mount(inquiry) {
  state = { epidemicSim: { tab: 'inquiry', tabsViewed: { inquiry: true }, inquiry, otherPanelDraft: 'keep panel' }, otherTool: { draft: 'keep tool' } };
  function Host() {
    const [data, setData] = React.useState(state);
    state = data;
    return window.StemLab._registry.epidemicSim.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  container = document.createElement('div'); document.body.append(container);
  root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(Host)));
}
function button(text) { return [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent).includes(text)); }
function click(text) { const el = button(text); expect(el, text).toBeTruthy(); act(() => el.click()); act(() => vi.runOnlyPendingTimers()); }
function iq() { return state.epidemicSim.inquiry; }

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  // Point at the saved immutable source to reproduce the regression without editing production files.
  new Function(readFileSync(process.env.EPIDEMIC_INQUIRY_SOURCE || 'stem_lab/stem_tool_epidemic.js', 'utf8'))();
});
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; vi.clearAllTimers(); vi.useRealTimers(); });

describe('Inquiry evidence recovery through mounted controls', () => {
  it('preserves all eight observations and drafts when logging at capacity', () => {
    const log = Array.from({ length: 8 }, (_, n) => observation(n)); mount(initial({ log, customField: 'keep' }));
    click('Log observation'); expect(iq().log).toEqual(log);
    expect(iq()).toMatchObject({ hypothesis: 'Working draft', explanation: 'Evidence draft', customField: 'keep' });
    expect(state.epidemicSim.otherPanelDraft).toBe('keep panel'); expect(state.otherTool).toEqual({ draft: 'keep tool' });
    expect(container.querySelector('[data-epidemic-inquiry-recovery]').textContent).toContain('Nothing was removed');
  });
  it('retains imported histories above capacity instead of silently slicing them', () => {
    const log = Array.from({ length: 10 }, (_, n) => observation(n)); mount(initial({ log }));
    click('Log observation'); expect(iq().log).toEqual(log);
  });
  it('removes one observation, reserves its position, and restores its exact values', () => {
    const log = Array.from({ length: 8 }, (_, n) => observation(n)); mount(initial({ log }));
    click('Remove observation 3'); expect(iq().log).toEqual(log.filter((_, n) => n !== 2));
    expect(document.activeElement.id).toBe('ep-inquiry-undo');
    click('Log observation'); expect(iq().log).toHaveLength(7);
    click('Undo last observation removal'); expect(iq().log).toEqual(log);
    expect(document.activeElement.id).toBe('ep-inquiry-log');
  });
  it('requires explicit discard before reusing a full notebook slot', () => {
    mount(initial({ log: Array.from({ length: 8 }, (_, n) => observation(n)) }));
    click('Remove observation 1'); click('Discard removed observation'); click('Log observation');
    expect(iq().log).toHaveLength(8); expect(iq().removedObservation).toBeNull();
  });
  it('queues logs atomically without dropping sibling fields', () => {
    mount(initial({ customField: 'keep' }));
    const log = button('Log observation'); act(() => { log.click(); log.click(); });
    expect(iq().log).toHaveLength(2); expect(iq().customField).toBe('keep');
  });
  it('repeated queued resets preserve the original investigation and pending removal', () => {
    const log = [observation(1), observation(2)]; mount(initial({ log, customField: 'keep' }));
    click('Remove observation 1'); const before = structuredClone(iq());
    const reset = button('Reset'); act(() => { reset.click(); reset.click(); }); act(() => vi.runOnlyPendingTimers());
    expect(iq().resetBackup).toEqual(before); expect(iq().log).toEqual([]);
    expect(document.activeElement.id).toBe('ep-inquiry-restore');
    click('Restore previous investigation'); expect(iq().log).toEqual(before.log);
    expect(iq().removedObservation).toEqual(before.removedObservation);
    expect(iq()).toMatchObject({ hypothesis: 'Working draft', explanation: 'Evidence draft', customField: 'keep' });
    click('Undo last observation removal'); expect(iq().log).toEqual(log);
  });
  it('exchanges investigations so work logged after reset remains recoverable', () => {
    mount(initial({ log: [observation(1)] })); click('Reset'); click('Log observation');
    act(() => Simulate.change(container.querySelector('#ep-hypo'), { target: { value: 'New working draft' } }));
    act(() => Simulate.change(container.querySelector('#ep-und'), { target: { checked: true } }));
    act(() => Simulate.change(container.querySelector('textarea[aria-label="Evidence-based outbreak growth explanation"]'), { target: { value: 'New evidence draft' } }));
    const newLog = structuredClone(iq().log);
    click('Restore previous investigation'); expect(iq().log).toEqual([observation(1)]);
    click('Restore previous investigation'); expect(iq().log).toEqual(newLog);
    expect(iq().hypothesis).toBe('New working draft');
    expect(iq().explanation).toBe('New evidence draft');
  });
  it('queued edits and logging record current settings and retain both drafts', () => {
    mount(initial());
    act(() => {
      Simulate.change(container.querySelector('#ep-contact'), { target: { value: '80' } });
      Simulate.change(container.querySelector('#ep-intervention'), { target: { value: '20' } });
      Simulate.change(container.querySelector('#ep-transmissibility'), { target: { value: '3' } });
      Simulate.change(container.querySelector('#ep-hypo'), { target: { value: 'Revised working draft' } });
      const explanation = container.querySelector('textarea[aria-label="Evidence-based outbreak growth explanation"]');
      Simulate.change(explanation, { target: { value: 'Revised evidence draft' } });
      button('Log observation').click();
    });
    expect(iq()).toMatchObject({ contact: 80, hypothesis: 'Revised working draft', explanation: 'Revised evidence draft' });
    expect(iq().log[0]).toMatchObject({ c: 80, i: 20, t: 3, rE: 2.06, reg: 'fast_growth' });
  });
  it('persists reset and undo recovery across unmount/remount', () => {
    mount(initial({ log: [observation(1), observation(2)] })); click('Remove observation 2'); click('Reset');
    const saved = structuredClone(iq()); act(() => root.unmount()); container.remove(); mount(saved);
    click('Restore previous investigation'); click('Undo last observation removal');
    expect(iq().log).toEqual([observation(1), observation(2)]);
  });
  it('explicitly discards only the previous investigation and enables a new recoverable reset', () => {
    mount(initial({ log: [observation(1)] })); click('Reset'); click('Log observation');
    act(() => Simulate.change(container.querySelector('#ep-hypo'), { target: { value: 'Current working draft' } }));
    act(() => Simulate.change(container.querySelector('#ep-und'), { target: { checked: true } }));
    act(() => Simulate.change(container.querySelector('textarea[aria-label="Evidence-based outbreak growth explanation"]'), { target: { value: 'Current evidence draft' } }));
    const current = structuredClone(iq());
    click('Discard previous investigation and its drafts');
    expect(iq().resetBackup).toBeNull(); expect(iq().log).toEqual(current.log);
    expect(iq()).toMatchObject({ hypothesis: 'Current working draft', explanation: 'Current evidence draft' });
    expect(document.activeElement.id).toBe('ep-inquiry-reset'); expect(button('Reset').disabled).toBe(false);
    click('Reset'); expect(iq().resetBackup.log).toEqual(current.log);
    click('Restore previous investigation'); expect(iq().log).toEqual(current.log);
    expect(iq()).toMatchObject({ hypothesis: 'Current working draft', explanation: 'Current evidence draft' });
  });
});
