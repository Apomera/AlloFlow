import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const AQ_KEY = 'aquacultureLab.state.v1';
const readWorkspace = () => JSON.parse(localStorage.getItem(AQ_KEY)).ecosystemWorkspace;
const button = (host, label) => Array.from(host.querySelectorAll('button')).find(el => el.textContent.trim() === label);
async function click(el) {
  expect(el).toBeTruthy();
  expect(el.disabled).not.toBe(true);
  await act(async () => { el.click(); });
}
async function change(el, value) {
  expect(el).toBeTruthy();
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const readBlob = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

describe('Aquaculture saved evidence and device-save recovery', () => {
  let host, root, urlDescriptors;
  async function mount() {
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(() => config.render(makeCtx({ React })))));
  }
  async function remount() {
    await act(async () => root.unmount());
    root = null;
    resetStemLab();
    await mount();
  }
  async function saveComparison(oxygen = '3', observation = 'The oxygen result changed after I lowered only the starting oxygen setting.') {
    await change(host.querySelector('#aq-eco-prediction'), 'I predict lower oxygen will change survival because animals need oxygen.');
    await click(button(host, 'Begin comparison with this design'));
    await change(host.querySelector('#aq-eco-oxygen'), oxygen);
    await change(host.querySelector('#aq-eco-observation'), observation);
    await click(button(host, 'Save A/B comparison'));
    return readWorkspace().experiments[0];
  }
  async function startDraft(oxygen = '7') {
    await click(button(host, 'Start another investigation'));
    await change(host.querySelector('#aq-eco-oxygen'), oxygen);
    await change(host.querySelector('#aq-eco-prediction'), 'My next prediction is deliberately different from the saved investigation.');
    await change(host.querySelector('#aq-eco-observation'), 'Keep this unfinished explanation while I inspect an older experiment.');
    return readWorkspace();
  }
  function failDeviceWrites() {
    const original = Storage.prototype.setItem;
    let unavailable = true;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === AQ_KEY && unavailable) throw new DOMException('Device quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    });
    return { spy, recover() { unavailable = false; } };
  }
  beforeEach(async () => {
    localStorage.clear(); resetStemLab(); window.history.replaceState({}, '', '/');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    urlDescriptors = {
      createObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL'),
      revokeObjectURL: Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL')
    };
    host = document.createElement('div'); document.body.appendChild(host);
    await mount();
    await click(button(host, 'Ecosystem builder'));
  }, 60000);
  afterEach(() => {
    if (root) act(() => root.unmount());
    host.remove(); vi.restoreAllMocks(); localStorage.clear();
    for (const [key, descriptor] of Object.entries(urlDescriptors)) {
      if (descriptor) Object.defineProperty(window.URL, key, descriptor);
      else delete window.URL[key];
    }
  });

  it('replays full saved settings while later edits leave the original evidence immutable', async () => {
    const saved = await saveComparison();
    await startDraft();
    await click(host.querySelector('[aria-label^="Replay experiment 1:"]'));
    expect(host.querySelector('#aq-eco-oxygen').value).toBe(String(saved.currentScenario.water.oxygen));
    expect(readWorkspace().baselineScenario).toEqual(saved.baselineScenario);
    // Once A exists the prediction is displayed as recorded evidence, not an editable input.
    expect(readWorkspace().prediction).toBe(saved.prediction);
    await change(host.querySelector('#aq-eco-oxygen'), '4');
    await change(host.querySelector('#aq-eco-observation'), 'A new explanation belongs to this replay, not to the original evidence.');
    expect(readWorkspace().experiments).toEqual([saved]);
    expect(readWorkspace().water.oxygen).toBe(4);
    expect(host.querySelector('.aq-experiment-record').textContent).toContain(saved.observation);
  });

  it('persists the parked draft across a reload and restores its complete design and writing', async () => {
    const saved = await saveComparison();
    const draft = await startDraft();
    await click(host.querySelector('[aria-label^="Replay experiment 1:"]'));
    const parked = readWorkspace().parkedDraft;
    expect(parked.water).toEqual(draft.water);
    expect(parked.organisms).toEqual(draft.organisms);
    expect(parked.prediction).toBe(draft.prediction);
    expect(parked.observation).toBe(draft.observation);
    await change(host.querySelector('#aq-eco-oxygen'), '4');
    await remount();
    expect(readWorkspace().parkedDraft).toEqual(parked);
    await click(button(host, 'Return to my draft'));
    const restored = readWorkspace();
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'observation', 'prediction', 'evidence', 'baselineScenario', 'investigationId']) {
      expect(restored[key], key).toEqual(draft[key]);
    }
    expect(restored.parkedDraft).toBeNull();
    expect(restored.experiments).toEqual([saved]);
    expect(host.querySelector('#aq-eco-observation').value).toBe(draft.observation);
  });

  it('removes and undoes an experiment without changing either saved record or the live draft', async () => {
    await saveComparison();
    await click(button(host, 'Start another investigation'));
    await saveComparison('4', 'A second comparison changes the oxygen reference to four milligrams per liter.');
    await change(host.querySelector('#aq-eco-observation'), 'This new unfinished draft must survive a record removal and undo.');
    const before = readWorkspace();
    expect(before.experiments).toHaveLength(2);
    await click(host.querySelector('[aria-label^="Remove experiment 1:"]'));
    expect(readWorkspace().experiments).toEqual([before.experiments[1]]);
    expect(readWorkspace().observation).toBe(before.observation);
    await click(button(host, 'Undo remove'));
    expect(readWorkspace().experiments).toEqual(before.experiments);
    expect(readWorkspace().observation).toBe(before.observation);
    expect(host.querySelectorAll('.aq-experiment-record')).toHaveLength(2);
    expect(button(host, 'Undo remove')).toBeUndefined();
  });

  it('keeps a failed evidence-save draft and retries device persistence without fabricating a saved record', async () => {
    const saved = await saveComparison();
    await click(button(host, 'Start another investigation'));
    await click(button(host, 'Begin comparison with this design'));
    await change(host.querySelector('#aq-eco-oxygen'), '4');
    await change(host.querySelector('#aq-eco-observation'), 'This comparison has enough evidence to save, but device persistence will fail.');
    const durable = localStorage.getItem(AQ_KEY);
    const storage = failDeviceWrites();
    await click(button(host, 'Save A/B comparison'));
    expect(localStorage.getItem(AQ_KEY)).toBe(durable);
    expect(readWorkspace().experiments).toEqual([saved]);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Compare & explain');
    expect(host.querySelector('#aq-eco-observation').value).toContain('device persistence will fail');
    expect(host.querySelector('.aq-storage-recovery')).toBeTruthy();
    expect(host.querySelector('.aq-save-status').textContent).toContain('Could not save');

    const latest = 'This newer in-session explanation must survive another failed retry and the successful recovery.';
    await change(host.querySelector('#aq-eco-observation'), latest);
    await click(button(host, 'Retry device save'));
    expect(host.querySelector('.aq-storage-recovery')).toBeTruthy();
    expect(host.querySelector('#aq-eco-observation').value).toBe(latest);
    expect(localStorage.getItem(AQ_KEY)).toBe(durable);

    storage.recover();
    await click(button(host, 'Retry device save'));
    expect(host.querySelector('.aq-storage-recovery')).toBeNull();
    expect(readWorkspace().observation).toBe(latest);
    expect(readWorkspace().water.oxygen).toBe(4);
    expect(readWorkspace().experiments).toEqual([saved]);
    await click(button(host, 'Save A/B comparison'));
    expect(readWorkspace().experiments).toHaveLength(2);
    expect(readWorkspace().experiments[0].observation).toBe(latest);
    expect(readWorkspace().experiments[1]).toEqual(saved);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Evidence saved');
  });

  it('downloads current in-session edits, parked writing, and saved evidence while device storage remains unavailable', async () => {
    const saved = await saveComparison();
    const draft = await startDraft();
    await click(host.querySelector('[aria-label^="Replay experiment 1:"]'));
    const durable = localStorage.getItem(AQ_KEY);
    failDeviceWrites();
    const latest = 'The backup must include these latest edits, not only the older data still on the device.';
    await change(host.querySelector('#aq-eco-oxygen'), '2');
    await change(host.querySelector('#aq-eco-observation'), latest);
    let downloadBlob;
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(blob => { downloadBlob = blob; return 'blob:aq-current-backup'; }) });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const downloadClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click(button(host, 'Download current backup'));
    expect(downloadClick).toHaveBeenCalledOnce();
    const backup = JSON.parse(await readBlob(downloadBlob));
    expect(backup.kind).toBe('aquaculture-learning-portfolio');
    expect(backup.learning.ecosystemWorkspace.water.oxygen).toBe(2);
    expect(backup.learning.ecosystemWorkspace.observation).toBe(latest);
    expect(backup.learning.ecosystemWorkspace.parkedDraft.observation).toBe(draft.observation);
    expect(backup.learning.ecosystemWorkspace.parkedDraft.prediction).toBe(draft.prediction);
    expect(backup.learning.ecosystemWorkspace.experiments).toEqual([saved]);
    expect(localStorage.getItem(AQ_KEY)).toBe(durable);
    expect(host.querySelector('.aq-storage-recovery')).toBeTruthy();
    expect(host.querySelector('#aq-eco-observation').value).toBe(latest);
  });
});
