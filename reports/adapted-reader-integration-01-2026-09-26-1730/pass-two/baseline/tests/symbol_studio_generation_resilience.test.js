import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio;
let root;
let host;
const image = 'data:image/png;base64,AA==';
const bankKey = 'alloSymbolGallery__generation-a';

beforeAll(() => {
  SymbolStudio = setupSymbolStudio().SymbolStudio;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.restoreAllMocks();
  localStorage.clear();
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function mount(overrides = {}, assets = []) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([
    { id: 'generation-a', name: 'Learner A', codename: 'Sky Fox' },
    { id: 'generation-b', name: 'Learner B', codename: 'Bright Otter' },
  ]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('generation-a'));
  localStorage.setItem(bankKey, JSON.stringify(assets));
  localStorage.setItem('alloSymbolGallery__generation-b', '[]');
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(SymbolStudio, baseProps(overrides))));
}

function control(label) {
  const element = host.querySelector('[aria-label="' + label + '"]');
  expect(element, label).toBeTruthy();
  return element;
}

function change(label, value) {
  const element = control(label);
  const prototype = element.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}

function submit() {
  const input = control('Symbol label');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

function bank(key = bankKey) { return JSON.parse(localStorage.getItem(key)); }

describe('Symbol Studio image-generation resilience', () => {
  it('coalesces duplicate Enter submissions before React rerenders', async () => {
    const pending = deferred();
    const onCallImagen = vi.fn(() => pending.promise);
    await mount({ onCallImagen });
    change('Symbol label', 'new word');
    act(() => { submit(); submit(); });
    expect(onCallImagen).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(image); });
    expect(bank().map((asset) => asset.label)).toEqual(['new word']);
    expect(control('Generate symbol').disabled).toBe(false);
  });

  it('uses the category selected after the label was entered', async () => {
    await mount({ onCallImagen: async () => image });
    change('Symbol label', 'apple');
    change('Symbol topic', 'food');
    await act(async () => submit());
    expect(bank()).toHaveLength(1);
    expect(bank()[0]).toMatchObject({ label: 'apple', category: 'other', topicTags: ['food'] });
  });

  it('does not resurrect an existing asset deleted while another symbol is generating', async () => {
    const pending = deferred();
    await mount({ onCallImagen: () => pending.promise }, [{ id: 'old', label: 'old word', category: 'other', image }]);
    change('Symbol label', 'new word');
    act(() => submit());
    act(() => control('Select symbol: old word').click());
    act(() => control('Delete old word symbol').click());
    expect(bank()).toEqual([]);
    await act(async () => { pending.resolve(image); });
    expect(bank().map((asset) => asset.label)).toEqual(['new word']);
    expect(host.querySelector('[aria-label="Select symbol: old word"]')).toBeNull();
  });

  it('discards a pending result after switching student profiles', async () => {
    const pending = deferred();
    const addToast = vi.fn();
    await mount({ onCallImagen: () => pending.promise, addToast });
    change('Symbol label', 'private word');
    act(() => submit());
    act(() => control('Profile: Learner B').click());
    await act(async () => { pending.resolve(image); });
    expect(bank()).toEqual([]);
    expect(bank('alloSymbolGallery__generation-b')).toEqual([]);
    expect(host.querySelector('[aria-label="Select symbol: private word"]')).toBeNull();
    expect(addToast.mock.calls.some(([, type]) => type === 'success')).toBe(false);
    expect(control('Generate symbol').disabled).toBe(false);
  });

  it('retains generated work in the session and reports a failed device save', async () => {
    const pending = deferred();
    const addToast = vi.fn();
    await mount({ onCallImagen: () => pending.promise, addToast });
    change('Symbol label', 'backup word');
    act(() => submit());
    const originalSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === bankKey) throw new DOMException('Device full', 'QuotaExceededError');
      return originalSet.call(this, key, value);
    });
    await act(async () => { pending.resolve(image); });
    expect(bank()).toEqual([]);
    expect(control('Select symbol: backup word')).toBeTruthy();
    expect(host.querySelector('[role="alert"]').textContent).toContain('Download a backup before closing');
    expect(addToast.mock.calls.some(([message, type]) => type === 'error' && message.includes('could not be saved'))).toBe(true);
    expect(addToast.mock.calls.some(([, type]) => type === 'success')).toBe(false);
    expect(control('Generate symbol').disabled).toBe(false);
    await act(async () => root.render(React.createElement(SymbolStudio, baseProps({ isOpen: false, addToast }))));
    await act(async () => root.render(React.createElement(SymbolStudio, baseProps({ isOpen: true, addToast }))));
    expect(control('Select symbol: backup word')).toBeTruthy();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Download a backup before closing');
  });
});
