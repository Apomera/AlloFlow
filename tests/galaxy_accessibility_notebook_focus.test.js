import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const RELEASE = { blackHoleDropObject: 'probe', blackHoleMassMode: 'stellar', blackHoleReleaseRadius: 5, blackHoleSideways: 0, blackHoleRadialVelocity: 0, blackHoleLaunchAngle: 41 };
const record = number => ({ id: 'entry_' + number, number, title: 'Release ' + number, note: 'Evidence ' + number, settings: { ...RELEASE } });
const LOCAL = record(1), INCOMING = record(2);
const BACKUP = JSON.stringify({ schema: 'galaxy-black-hole-experiments', version: 1, experiments: [INCOMING], comparison: null });
const FLOWS = ['remove', 'undo removal', 'cancel import', 'apply import', 'undo import'];

describe('Galaxy black-hole notebook focus after replacing controls', () => {
  let instances, outside, restoreCanvas, loops, originalMedia, errors, config;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => loops.step()); }
  async function mount() {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'blackHole', galaxyAutoRotate: false, blackHoleNotebook: [LOCAL], blackHoleNotebookSerial: 1 } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    instance.host.querySelector('[data-bh-notebook] details').open = true;
    return instance;
  }
  const query = (instance, selector) => instance.host.querySelector(selector);
  async function click(instance, selector, focused = true) {
    const node = query(instance, selector); expect(node).not.toBeNull(); expect(node.disabled).not.toBe(true);
    if (focused) node.focus(); await act(() => node.click()); return node;
  }
  async function readBackup(instance, pending = null) {
    const file = { name: 'galaxy-experiments.json', size: BACKUP.length, text: () => pending ? new Promise(resolve => { pending.resolve = resolve; }) : Promise.resolve(BACKUP) };
    const input = query(instance, '[data-bh-notebook-file]');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
  }
  async function prepare(instance, flow) {
    if (flow === 'undo removal') { await click(instance, '[data-bh-notebook-remove="entry_1"]', false); await frame(); }
    if (flow.includes('import')) { await readBackup(instance); expect(query(instance, '[data-bh-import-apply]')).not.toBeNull(); }
    if (flow === 'undo import') { await click(instance, '[data-bh-import-apply]', false); await frame(); }
    return ({ remove: '[data-bh-notebook-remove="entry_1"]', 'undo removal': '[data-bh-notebook-undo]', 'cancel import': '[data-bh-import-cancel]', 'apply import': '[data-bh-import-apply]', 'undo import': '[data-bh-notebook-undo-import]' })[flow];
  }
  const destination = (instance, flow) => query(instance, flow === 'remove' ? '[data-bh-notebook-undo]' : flow === 'undo removal' ? '[data-bh-notebook-title="entry_1"]' : '[data-bh-notebook-import]');
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]); }

  it.each(FLOWS)('moves focused %s to a meaningful persistent destination', async flow => {
    const instance = await mount(), selector = await prepare(instance, flow), live = query(instance, '[data-bh-notebook-status]');
    const origin = await click(instance, selector); await frame();
    expect(origin.isConnected).toBe(false); expect(document.activeElement).toBe(destination(instance, flow));
    expect(query(instance, '[data-bh-notebook-status]')).toBe(live); expect(live.textContent).not.toBe('');
    if (flow === 'remove') expect(instance.state.galaxy.blackHoleNotebook).toEqual([]);
    else if (flow === 'apply import') expect(instance.state.galaxy.blackHoleNotebook).toEqual([LOCAL, INCOMING]);
    else expect(instance.state.galaxy.blackHoleNotebook).toEqual([LOCAL]);
    if (flow === 'undo removal') expect(query(instance, '[data-bh-notebook-note="entry_1"]').value).toBe(LOCAL.note);
    clean();
  });

  it.each(FLOWS)('does not move focus when %s was activated without focus', async flow => {
    const instance = await mount(); outside.focus(); const selector = await prepare(instance, flow);
    expect(document.activeElement).toBe(outside); await click(instance, selector, false); await frame();
    expect(document.activeElement).toBe(outside); clean();
  });

  it.each(['remove', 'apply import'])('respects focus moved outside before the deferred %s handoff', async flow => {
    const instance = await mount(), selector = await prepare(instance, flow);
    await click(instance, selector); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); clean();
  });

  it.each(['undo removal', 'cancel import'])('keeps %s focus in the initiating tool when saved IDs are shared', async flow => {
    const first = await mount(), second = await mount(), selector = await prepare(second, flow);
    await click(second, selector); await frame();
    expect(document.activeElement).toBe(destination(second, flow)); expect(document.activeElement).not.toBe(destination(first, flow)); clean();
  });

  it.each(['remove', 'cancel import'])('cancels deferred %s focus when the initiating tool unmounts', async flow => {
    const instance = await mount(), selector = await prepare(instance, flow);
    await click(instance, selector); await act(() => instance.root.unmount()); instance.root = null;
    outside.focus(); await frame(); expect(document.activeElement).toBe(outside); clean();
  });

  it('returns focus after cancelling a pending read and ignores its late preview', async () => {
    const instance = await mount(), pending = {}; await readBackup(instance, pending);
    expect(query(instance, '[data-bh-import-preview]').getAttribute('aria-busy')).toBe('true');
    await click(instance, '[data-bh-import-cancel]'); await frame();
    expect(document.activeElement).toBe(destination(instance, 'cancel import'));
    outside.focus(); await act(() => pending.resolve(BACKUP)); await frame();
    expect(query(instance, '[data-bh-import-preview]')).toBeNull(); expect(instance.state.galaxy.blackHoleNotebook).toEqual([LOCAL]);
    expect(document.activeElement).toBe(outside); expect(query(instance, '[data-bh-notebook-status]').textContent).toContain('Import cancelled'); clean();
  });

  it('ignores a late import read after unmount without reviving state or moving focus', async () => {
    const instance = await mount(), pending = {}; await readBackup(instance, pending);
    await act(() => instance.root.unmount()); instance.root = null; outside.focus();
    await act(() => pending.resolve(BACKUP)); await frame(); expect(document.activeElement).toBe(outside); clean();
  });
});
