import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio, root, host;
const image = 'data:image/png;base64,AA==';
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function mount(overrides = {}, assets = [], boards = []) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'editor', name: 'Demo', codename: 'Calm Fox' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('editor'));
  localStorage.setItem('alloSymbolGallery__editor', JSON.stringify(assets));
  localStorage.setItem('alloSymbolBoards__editor', JSON.stringify(boards));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(SymbolStudio, baseProps(overrides))));
}
function control(label) { const el = host.querySelector('[aria-label="' + label + '"]'); expect(el, label).toBeTruthy(); return el; }
function click(label) { act(() => control(label).click()); }
function type(el, value) { act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
const word = (label) => ({ id: label, label, image, category: 'other' });
const board = () => ({ id: 'book', title: 'Routine', words: [word('alpha'), word('beta')], cols: 2, pages: [{ id: 'p1', title: 'First', words: [word('alpha'), word('beta')], cols: 2 }, { id: 'p2', title: 'Second', words: [word('gamma'), word('delta')], cols: 2 }] });
describe('Symbol Studio authoring refinements', () => {
  it('keeps typed alias separators and saves normalized aliases on blur', async () => {
    await mount({}, [word('help')]); click('Select symbol: help');
    const field = control('Search aliases for help');
    type(field, 'assist,'); expect(field.value).toBe('assist,');
    type(field, 'assist, support');
    act(() => field.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(JSON.parse(localStorage.getItem('alloSymbolGallery__editor'))[0].aliases).toEqual(['assist', 'support']);
  });
  it('allows creating a new variant while protecting the locked original', async () => {
    const edit = vi.fn(async () => 'data:image/png;base64,Qg==');
    await mount({ onCallGeminiImageEdit: edit }, [{ ...word('help'), locked: true }]);
    click('Select symbol: help (locked)');
    const field = control('Refinement instruction for help'); expect(field.disabled).toBe(false);
    type(field, 'Use blue');
    expect(control('Apply refinement to help').disabled).toBe(true);
    await act(async () => control('Save refinement as a new variant of help').click());
    const bank = JSON.parse(localStorage.getItem('alloSymbolGallery__editor'));
    expect(edit).toHaveBeenCalledTimes(1); expect(bank).toHaveLength(2);
    expect(bank.find(x => x.id === 'help')).toMatchObject({ image, locked: true });
    expect(bank.find(x => x.id !== 'help')).toMatchObject({ image: 'data:image/png;base64,Qg==', locked: false });
  });
  it('generates images for the board just built by the Communication Builder', async () => {
    vi.useFakeTimers(); const generate = vi.fn(async () => image);
    await mount({ initialTab: 'quickboards', onCallImagen: generate, onCallGeminiImageEdit: null });
    await act(async () => control('Build board from FCT template').click());
    await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(generate).toHaveBeenCalled();
    expect(host.querySelectorAll('.ss-board-cell img').length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('alloSymbolGallery__editor')).length).toBeGreaterThan(0);
  });
  it('undoes page deletion without losing edits to that page or the remaining page', async () => {
    await mount({ initialTab: 'board' }, [], [board()]); click('Toggle saved boards gallery'); click('Load');
    click('Remove alpha from board'); click('Delete current board page');
    click('Remove gamma from board'); click('Undo page deletion');
    expect(host.querySelector('[aria-label="Remove beta from board"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Remove alpha from board"]')).toBeFalsy();
    click('Second board page, position 2 of 2');
    expect(host.querySelector('[aria-label="Remove delta from board"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Remove gamma from board"]')).toBeFalsy();
  });
  it('does not offer a deleted page from a replaced board', async () => {
    await mount({ initialTab: 'board' }, [], [board()]); click('Toggle saved boards gallery'); click('Load'); click('Delete current board page');
    expect(control('Undo page deletion')).toBeTruthy();
    const template = host.querySelector('button[aria-label^="Apply template:"]'); act(() => template.click());
    expect(host.querySelector('[aria-label="Undo page deletion"]')).toBeFalsy();
  });
});
