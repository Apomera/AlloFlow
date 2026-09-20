import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let Studio, api, root, host;
const image = 'data:image/png;base64,AA==';
const seed = () => [
  { id: 'apple', label: 'Apple', image, category: 'noun', topicTags: ['food'], locked: true, reviewNote: 'Keep this note', attribution: { set: 'Original' } },
  { id: 'water', label: '水', image, category: 'noun', topicTags: ['daily living'] },
  { id: 'run', label: 'Run', image, category: 'verb', topicTags: ['actions'] }
];
beforeAll(() => { Studio = setupSymbolStudio().SymbolStudio; api = window.AlloModules.SymbolStudioInternals; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); localStorage.clear(); vi.restoreAllMocks(); });
const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const bank = () => JSON.parse(localStorage.getItem('alloSymbolGallery__a'));
function control(name) { const el = [...host.querySelectorAll('[aria-label]')].find(el => el.getAttribute('aria-label') === name); expect(el, name).toBeTruthy(); return el; }
async function click(name) { await act(async () => control(name).click()); }
async function change(name, value) {
  const el = control(name);
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
async function mount(overrides = {}) {
  put('alloStudentProfiles', [{ id: 'a', name: 'Learner A' }, { id: 'b', name: 'Learner B' }]); put('alloActiveProfileId', 'a');
  put('alloSymbolGallery__a', seed()); put('alloSymbolGallery__b', [{ id: 'apple', label: 'Different learner apple', image }]);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Studio, baseProps({ initialTab: 'symbols', draftStorage: { read: async () => null, write: async () => {}, remove: async () => {} }, ...overrides }))));
}

describe('Symbol Bank batch contracts', () => {
  it('adds deduplicated multilingual topics and changes only selected metadata', () => {
    const assets = seed().map(api.normalizeBankAsset);
    const result = api.buildSymbolBankBatch(assets, ['apple'], { category: 'other', reviewStatus: 'approved', topicTags: ['food', 'home', '水', '水'] }, 1000);
    expect(result.assets[0]).toMatchObject({ id: 'apple', category: 'other', partOfSpeech: 'other', topicTags: ['food', 'home', '水'], locked: true, image, reviewStatus: 'approved', reviewedAt: new Date(1000).toISOString(), reviewNote: 'Keep this note', attribution: { set: 'Original' } });
    expect(result.assets[1]).toBe(assets[1]); expect(result.assets[2]).toBe(assets[2]); expect(result.undo).toHaveLength(1);
    expect(assets[0].topicTags).toEqual(['food']);
  });
  it('does not create undo entries or refresh review dates for a no-op', () => {
    const assets = seed().map(api.normalizeBankAsset);
    const result = api.buildSymbolBankBatch(assets, ['apple', 'missing'], { category: 'noun', reviewStatus: 'invalid', topicTags: ['FOOD', ''] }, 1000);
    expect(result.undo).toEqual([]); expect(result.assets[0]).toBe(assets[0]);
  });
  it('undoes metadata while preserving unrelated later edits', () => {
    const assets = seed().map(api.normalizeBankAsset);
    const changed = api.buildSymbolBankBatch(assets, ['apple', 'water'], { category: 'other', reviewStatus: 'approved' }, 1000);
    const later = changed.assets.map(a => a.id === 'apple' ? { ...a, isFavorite: true, reviewNote: 'Later note', image: 'new-image' } : a);
    const undo = api.undoSymbolBankBatch(later, changed.undo, 2000);
    expect(undo.restored).toBe(2); expect(undo.assets[0]).toMatchObject({ category: 'noun', reviewStatus: 'unreviewed', reviewedAt: null, isFavorite: true, reviewNote: 'Later note', image: 'new-image', locked: true });
  });
  it('never overwrites newer metadata or resurrects deleted symbols during undo', () => {
    const assets = seed().map(api.normalizeBankAsset);
    const changed = api.buildSymbolBankBatch(assets, ['apple', 'water', 'run'], { reviewStatus: 'approved' }, 1000);
    const later = changed.assets.filter(a => a.id !== 'water').map(a => a.id === 'apple' ? { ...a, reviewStatus: 'needs_changes' } : a);
    const undo = api.undoSymbolBankBatch(later, changed.undo, 2000);
    expect(undo).toMatchObject({ restored: 1, skipped: 2 }); expect(undo.assets).toHaveLength(2);
    expect(undo.assets[0].reviewStatus).toBe('needs_changes'); expect(undo.assets[1].reviewStatus).toBe('unreviewed');
  });
});

describe('Symbol Bank organization workflow', () => {
  it('selects only shown symbols and makes retained hidden selections explicit', async () => {
    await mount(); await click('Organize symbols');
    await change('Filter Symbol Bank by topic', 'food'); await click('Select all shown symbols');
    expect(control('Include Apple in batch').checked).toBe(true);
    await change('Filter Symbol Bank by topic', 'actions');
    expect(host.textContent).toContain('1 selected (1 hidden by filters)');
    expect(control('Include Run in batch').checked).toBe(false);
    await click('Select all shown symbols'); expect(host.textContent).toContain('2 selected (1 hidden by filters)');
    await change('Batch review status', 'approved'); await change('Batch word type', 'other'); await change('Batch topics to add', 'home, food');
    await click('Apply changes to selected symbols');
    expect(bank().find(a => a.id === 'apple')).toMatchObject({ category: 'other', reviewStatus: 'approved', topicTags: ['food', 'home'], locked: true });
    expect(bank().find(a => a.id === 'run')).toMatchObject({ category: 'other', reviewStatus: 'approved', topicTags: ['actions', 'home', 'food'] });
    expect(bank().find(a => a.id === 'water').reviewStatus).toBe('unreviewed');
    expect(host.textContent).toContain('Updated 2 symbols.');
    await click('Undo last symbol batch change');
    expect(bank().find(a => a.id === 'apple')).toMatchObject({ category: 'noun', reviewStatus: 'unreviewed', topicTags: ['food'] });
    expect(bank().find(a => a.id === 'run')).toMatchObject({ category: 'verb', reviewStatus: 'unreviewed', topicTags: ['actions'] });
  });
  it('clears selection and pending changes on learner switches, including matching asset IDs', async () => {
    await mount(); await click('Organize symbols'); await click('Select all shown symbols');
    await change('Batch review status', 'approved'); await click('Apply changes to selected symbols');
    await change('Batch topics to add', 'private topic'); await click('Profile: Learner B');
    expect(host.querySelector('[aria-label="Undo last symbol batch change"]')).toBeNull();
    await click('Organize symbols'); expect(host.textContent).toContain('0 selected');
    expect(control('Batch topics to add').value).toBe(''); expect(control('Apply changes to selected symbols').disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem('alloSymbolGallery__b'))[0].reviewStatus).toBe('unreviewed');
  });
  it('retains unsaved changes in the session and explains a device save failure', async () => {
    const addToast = vi.fn(); await mount({ addToast }); await click('Organize symbols'); await click('Include Apple in batch');
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === 'alloSymbolGallery__a') throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); });
    await change('Batch review status', 'approved'); await click('Apply changes to selected symbols');
    expect(bank()[0].reviewStatus).toBe('unreviewed');
    expect(host.textContent).toContain('Updated 1 symbol for this session only.');
    expect(control('Include Apple in batch').closest('.ss-symbol-card').textContent).toContain('Approved');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('could not be saved'), 'error');
    await click('Undo last symbol batch change');
    expect(control('Include Apple in batch').closest('.ss-symbol-card').textContent).toContain('Unreviewed');
  });
  it('uses independent native controls and clearing selection disables the batch action', async () => {
    await mount();
    const favorite = control('Add Apple to favorites'); expect(favorite.tagName).toBe('BUTTON');
    expect(favorite.parentElement.closest('button,[role="button"]')).toBeNull();
    await click('Add Apple to favorites'); expect(host.querySelector('[aria-label="Word type for Apple"]')).toBeNull();
    expect(control('Select symbol: Apple (favorite) (locked)').tagName).toBe('BUTTON');
    await click('Organize symbols'); await click('Include Apple in batch'); await change('Batch word type', 'noun');
    await click('Clear symbol selection'); expect(control('Include Apple in batch').checked).toBe(false);
    expect(control('Apply changes to selected symbols').disabled).toBe(true);
  });
});
