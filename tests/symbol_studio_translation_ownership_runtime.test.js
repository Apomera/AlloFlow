import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio, root, host;
const image = 'data:image/png;base64,AA==';
const cell = (label) => ({ id: label.toLowerCase(), label, image, category: 'other' });
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle(action = () => {}) { await act(async () => { action(); for (let i = 0; i < 30; i++) await Promise.resolve(); }); }
async function advance(ms = 650) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function control(label) { const node = host.querySelector('[aria-label="' + label + '"]'); expect(node, label).toBeTruthy(); return node; }
async function click(label) { await settle(() => control(label).click()); }
async function language(value) { await settle(() => { const node = control('Board language'); Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('change', { bubbles: true })); }); }
const busy = () => host.querySelector('[aria-label="Translating board labels"]');
function put(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; }, 60000);
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); localStorage.clear(); });
afterEach(async () => { if (root) await settle(() => root.unmount()); root = null; host?.remove(); host = null; localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function mount(onCallGemini, extraBoard = {}) {
  put('alloStudentProfiles', [{ id: 'translation-a', name: 'Learner A', codename: 'Calm Fox' }, { id: 'translation-b', name: 'Learner B', codename: 'Bright Otter' }]);
  put('alloActiveProfileId', 'translation-a');
  const rows = new Map([
    ['translation-a', { board: { title: 'A board', words: [cell('Help'), cell('Drink')], language: 'en', ...extraBoard } }],
    ['translation-b', { board: { title: 'B board', words: [cell('Rest')], language: 'en' } }]
  ]);
  const draftStorage = {
    read: vi.fn(async profileId => ({ version: 1, profileId, updatedAt: 1, payload: clone(rows.get(profileId)) })),
    write: vi.fn(async (profileId, payload) => { rows.set(profileId, clone(payload)); return { version: 1, profileId, updatedAt: 2, payload }; }),
    remove: vi.fn(async profileId => rows.delete(profileId))
  };
  const toast = vi.fn();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'board', draftStorage, onCallGemini, onCallImagen: null, onCallGeminiImageEdit: null, onCallTTS: null, addToast: toast }))));
  return { rows, toast };
}

describe('Symbol Studio owned board translations', () => {
  it('ignores a previous learner translation instead of autosaving their cells into the new learner', async () => {
    const pending = deferred(); const { rows } = await mount(vi.fn(() => pending.promise));
    await language('es'); expect(busy()).toBeTruthy();
    await click('Profile: Learner B'); expect(control('Board title').value).toBe('B board'); expect(busy()).toBeNull();
    await settle(() => pending.resolve('["Ayuda","Bebida"]')); await advance();
    expect(control('Board title').value).toBe('B board'); expect(control('Remove Rest from board')).toBeTruthy();
    expect(rows.get('translation-b').board.words).toEqual([cell('Rest')]);
  });
  it('allows a fresh request after reloading the same board and does not let the old finally clear its spinner', async () => {
    const old = deferred(), fresh = deferred(), generate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    put('alloSymbolBoards__translation-a', [{ id: 'saved', title: 'Saved board', words: [cell('Help'), cell('Drink')], cols: 2, language: 'en' }]);
    await mount(generate); await language('es');
    await click('Toggle saved boards gallery'); await click('Load'); expect(busy()).toBeNull();
    await language('fr'); expect(generate).toHaveBeenCalledTimes(2); expect(busy()).toBeTruthy();
    await settle(() => old.resolve('["Ayuda","Bebida"]')); expect(busy()).toBeTruthy(); expect(control('Remove Help from board')).toBeTruthy();
    await settle(() => fresh.resolve('["Aide","Boire"]')); expect(busy()).toBeNull(); expect(control('Remove Aide from board')).toBeTruthy();
  });
  it('ignores an old translation resolved in the same commit as reloading its saved board', async () => {
    const pending = deferred();
    put('alloSymbolBoards__translation-a', [{ id: 'saved', title: 'Saved board', words: [cell('Help'), cell('Drink')], cols: 2, language: 'en' }]);
    const { rows } = await mount(() => pending.promise);
    await language('es'); await click('Toggle saved boards gallery');
    // Both callbacks run before act lets React render the replacement context.
    await settle(() => { control('Load').click(); pending.resolve('["Ayuda","Bebida"]'); });
    await advance();
    expect(control('Board title').value).toBe('Saved board');
    expect(control('Remove Help from board')).toBeTruthy();
    expect(host.querySelector('[aria-label="Remove Ayuda from board"]')).toBeNull();
    expect(rows.get('translation-a').board.words.every(word => !word.translatedLabel)).toBe(true);
  });
  it('keeps only the latest requested language when requests finish out of order', async () => {
    const old = deferred(), fresh = deferred(); const { rows } = await mount(vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise));
    await language('es'); await language('fr');
    await settle(() => fresh.resolve('["Aide","Boire"]')); expect(busy()).toBeNull();
    await settle(() => old.resolve('["Ayuda","Bebida"]')); await advance();
    expect(control('Board language').value).toBe('fr');
    expect(rows.get('translation-a').board.words[0].translatedLabel).toBe('Aide');
  });
  it('cancels a pending request when returning to English', async () => {
    const pending = deferred(); await mount(() => pending.promise);
    await language('es'); await language('en'); expect(busy()).toBeNull();
    await settle(() => pending.resolve('["Ayuda","Bebida"]'));
    expect(control('Remove Help from board')).toBeTruthy(); expect(host.querySelector('[aria-label="Remove Ayuda from board"]')).toBeNull();
  });
  it('merges into surviving cells and preserves locks changed while translation is running', async () => {
    const pending = deferred(); const { rows } = await mount(() => pending.promise);
    await language('es'); await click('Lock Help'); await click('Remove Drink from board');
    await settle(() => pending.resolve('["Ayuda","Bebida"]')); await advance();
    expect(rows.get('translation-a').board.words).toEqual([expect.objectContaining({ id: 'help', label: 'Help', translatedLabel: 'Ayuda', locked: true, image })]);
    expect(control('Unlock Ayuda')).toBeTruthy();
  });
  it.each(['[{},"Bebida"]', '["","Bebida"]', JSON.stringify(['x'.repeat(501), 'Bebida'])])('rejects malformed translation labels without corrupting the draft: %s', async response => {
    const { rows, toast } = await mount(async () => response);
    await language('es'); await advance(); expect(busy()).toBeNull();
    expect(rows.get('translation-a').board.words.map(word => word.label)).toEqual(['Help', 'Drink']);
    expect(rows.get('translation-a').board.words.every(word => !word.translatedLabel)).toBe(true);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('valid labels'), 'error');
  });
  it('times out stalled translation and ignores the late result while permitting a retry', async () => {
    const old = deferred(); const generate = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce('["Aide","Boire"]');
    const { toast } = await mount(generate); await language('es'); await advance(60001);
    expect(busy()).toBeNull(); expect(toast).toHaveBeenCalledWith(expect.stringContaining('timed out'), 'error');
    await language('fr'); await settle(() => old.resolve('["Ayuda","Bebida"]'));
    expect(control('Remove Aide from board')).toBeTruthy(); expect(control('Board language').value).toBe('fr');
  });
});
