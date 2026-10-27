import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
let tool, print;
const completed = { phase: 'debrief', year: 10, finalOutcome: { label: 'Recovered ecosystem', color: '#86efac' }, species: [{ id: 'wolves', pop: 70 }], yearLog: [] };
beforeEach(() => {
  resetStemLab(); tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub');
  print = vi.spyOn(window, 'print').mockImplementation(() => {});
});
afterEach(() => {
  for (const item of mounts.splice(0)) { if (!item.closed) act(() => item.root.unmount()); item.host.remove(); }
  vi.restoreAllMocks();
  document.body.removeAttribute('data-stewardship-print-owner');
});
async function mount(campaign = 'conserve') {
  const store = newStore(), host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), item = { root, host, closed: false }; mounts.push(item);
  let latest, setData;
  function Host() {
    const [data, setter] = React.useState({ stewardshipHub: { tutorialSeen: true, viewingReport: campaign, stewIQ: { hypothesis: 'Keep my hypothesis.' } }, ecosystem: { conserve: completed }, fireEcology: { mosaic: { ...completed, zones: [{ id: 'forest', health: 75 }] } } });
    latest = data; setData = setter;
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setter }, store)), React.createElement('button', { 'data-other-task': true }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest,
    report: () => host.querySelector('[data-stewardship-report]'),
    print: () => host.querySelector('[data-stewardship-action="print"]'),
    back: () => host.querySelector('[data-stewardship-action="return"]'),
    error: () => host.querySelector('[data-stewardship-print-error]'),
    other: () => host.querySelector('[data-other-task]'),
    update: patch => act(async () => setData(old => ({ ...old, stewardshipHub: { ...old.stewardshipHub, ...patch } }))),
    destroy: () => act(async () => { root.unmount(); item.closed = true; }) };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
const copies = () => [...document.querySelectorAll('[data-stewardship-print-copy]')];
const styles = () => [...document.querySelectorAll('[data-stewardship-print-style]')];
function expectClean() { expect(copies()).toHaveLength(0); expect(styles()).toHaveLength(0); expect(document.body.hasAttribute('data-stewardship-print-owner')).toBe(false); }
async function finish() { await act(async () => window.dispatchEvent(new Event('afterprint'))); }

describe('Stewardship report printing accessibility and ownership', () => {
  it('gives each report a unique ID and does not install passive page-wide print rules', async () => {
    const a = await mount(), b = await mount();
    expect(a.report().id).not.toBe(b.report().id); expect(document.getElementById(a.report().id)).toBe(a.report());
    expect(a.report().querySelector('style')).toBeNull(); expectClean();
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint')); });
    expectClean(); expect(print).not.toHaveBeenCalled();
  });

  it('prepares only the activated report, removes screen controls, and cleans up after printing', async () => {
    const a = await mount('mosaic'), b = await mount('conserve'); const before = JSON.stringify(b.state());
    print.mockImplementation(() => window.dispatchEvent(new Event('beforeprint')));
    await activate(b.print());
    expect(copies()).toHaveLength(1); const copy = copies()[0];
    expect(copy.parentElement).toBe(document.body); expect(copy.style.display).toBe('none');
    expect(copy.textContent).toContain('Conservation Manager'); expect(copy.textContent).not.toContain('Cultural Mosaic');
    expect(copy.querySelector('button')).toBeNull(); expect(copy.querySelector('.no-print')).toBeNull();
    expect(copy.id).not.toBe(b.report().id); expect(styles()[0].textContent).toContain('body[data-stewardship-print-owner="' + copy.id + '"]');
    expect(document.body.getAttribute('data-stewardship-print-owner')).toBe(copy.id);
    expect(a.report().isConnected).toBe(true); expect(b.report().isConnected).toBe(true); expect(JSON.stringify(b.state())).toBe(before);
    await finish(); expectClean(); expect(document.activeElement).toBe(b.print());
  });

  it('cleans up when a browser returns without lifecycle events and keeps keyboard focus', async () => {
    const t = await mount(); let sawCopy = false;
    print.mockImplementation(() => { sawCopy = copies().length === 1; });
    await activate(t.print()); expect(sawCopy).toBe(true); expectClean(); expect(document.activeElement).toBe(t.print());
    expect(t.error()).toBeNull(); expect(print).toHaveBeenCalledTimes(1);
  });

  it('announces a print error, preserves the report, and supports retry through the same control', async () => {
    const t = await mount(); const button = t.print(), saved = JSON.stringify(t.state());
    print.mockImplementation(() => { throw new Error('Blocked by browser'); });
    await activate(button); expectClean(); expect(document.activeElement).toBe(button);
    expect(t.error().getAttribute('role')).toBe('alert'); expect(t.error().textContent).toContain('Printing could not start'); expect(t.error().textContent).toContain('Try Print again');
    expect(JSON.stringify(t.state())).toBe(saved); expect(t.report().isConnected).toBe(true);
    print.mockImplementation(() => { window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint')); });
    await activate(button); expectClean(); expect(t.error()).toBeNull(); expect(document.activeElement).toBe(button); expect(print).toHaveBeenCalledTimes(2);
  });

  it('announces each failed retry even when the error message stays the same', async () => {
    const t = await mount(), saved = JSON.stringify(t.state());
    print.mockImplementation(() => { throw new Error('Still blocked by browser'); });
    await activate(t.print()); const firstAlert = t.error();
    expect(firstAlert.getAttribute('role')).toBe('alert');
    await activate(t.print()); const retryAlert = t.error();
    expect(retryAlert).not.toBe(firstAlert); expect(firstAlert.isConnected).toBe(false);
    expect(retryAlert.getAttribute('role')).toBe('alert'); expect(retryAlert.textContent).toBe(firstAlert.textContent);
    expect(print).toHaveBeenCalledTimes(2); expectClean(); expect(document.activeElement).toBe(t.print());
    expect(JSON.stringify(t.state())).toBe(saved);
  });

  it('handles unavailable printing without leaving hidden copies or losing saved work', async () => {
    const t = await mount(); const saved = JSON.stringify(t.state());
    // Vitest exposes window.print through a getter; assignment only changes its
    // hidden override map while the spy still returns a function. Replace the
    // descriptor temporarily so the tool really observes unavailable printing.
    const descriptor = Object.getOwnPropertyDescriptor(window, 'print');
    Object.defineProperty(window, 'print', { configurable: true, writable: true, value: undefined });
    try {
      expect(typeof window.print).toBe('undefined');
      await activate(t.print()); expectClean(); expect(t.error().getAttribute('role')).toBe('alert');
      expect(t.error().textContent).toContain('Printing could not start'); expect(JSON.stringify(t.state())).toBe(saved);
      expect(document.activeElement).toBe(t.print()); expect(print).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'print', descriptor);
    }
  });

  it('does not let another report replace an active print job or steal its focus', async () => {
    const a = await mount('mosaic'), b = await mount(); print.mockImplementation(() => window.dispatchEvent(new Event('beforeprint')));
    await activate(a.print()); const copy = copies()[0]; await activate(b.print());
    expect(print).toHaveBeenCalledTimes(1); expect(copies()).toEqual([copy]); expect(b.error().textContent).toContain('Close that dialog'); expect(document.activeElement).toBe(b.print());
    const firstBusyAlert = b.error(); await activate(b.print());
    expect(b.error()).not.toBe(firstBusyAlert); expect(b.error().textContent).toBe(firstBusyAlert.textContent);
    expect(print).toHaveBeenCalledTimes(1); expect(copies()).toEqual([copy]);
    await finish(); expectClean(); expect(document.activeElement).toBe(b.print());
    print.mockImplementation(() => {}); await activate(b.print()); expect(print).toHaveBeenCalledTimes(2); expectClean(); expect(b.error()).toBeNull();
  });

  it('preserves focus explicitly moved elsewhere before print completion', async () => {
    const t = await mount(); print.mockImplementation(() => window.dispatchEvent(new Event('beforeprint')));
    await activate(t.print()); t.other().focus(); await finish(); expectClean(); expect(document.activeElement).toBe(t.other());
  });

  it('does not restore focus for an unowned programmatic activation or a hidden report', async () => {
    const t = await mount(); t.other().focus();
    print.mockImplementation(() => { window.dispatchEvent(new Event('beforeprint')); document.activeElement.blur(); });
    await act(async () => t.print().click()); await finish(); expectClean(); expect(document.activeElement).toBe(document.body);
    print.mockImplementation(() => window.dispatchEvent(new Event('beforeprint'))); await activate(t.print()); t.host.hidden = true; t.print().blur(); expect(document.activeElement).toBe(document.body); await finish();
    expectClean(); expect(document.activeElement).not.toBe(t.print()); t.host.hidden = false;
  });

  it('removes a pending print copy when leaving the report and preserves normal return focus', async () => {
    const t = await mount(); print.mockImplementation(() => window.dispatchEvent(new Event('beforeprint')));
    await activate(t.print()); await activate(t.back()); expectClean();
    expect(document.activeElement).toBe(t.host.querySelector('[data-stewardship-heading="hub"]'));
    expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my hypothesis.'); await finish(); expectClean();
  });

  it('cleans up pending print state on unmount and leaves unrelated body state intact', async () => {
    const t = await mount(); document.body.setAttribute('data-stewardship-print-owner', 'pre-existing-value');
    print.mockImplementation(() => window.dispatchEvent(new Event('beforeprint'))); await activate(t.print());
    await t.destroy(); expect(copies()).toHaveLength(0); expect(styles()).toHaveLength(0); expect(document.body.getAttribute('data-stewardship-print-owner')).toBe('pre-existing-value');
    await finish(); expect(document.body.getAttribute('data-stewardship-print-owner')).toBe('pre-existing-value');
  });
});
