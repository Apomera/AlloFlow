import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import * as s from '../lesson_board_storage.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let root, el, Solo;
const base = { board: makeBoard(), appId: 'app', user: { uid: 'u' }, onBack() {}, t: key => key };
const render = async (props = {}) => { if (!root) { el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el); } await act(async () => root.render(React.createElement(Solo, { ...base, ...props }))); };
const button = label => [...el.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const click = async node => { expect(node).toBeTruthy(); await act(async () => node.click()); };
const change = async (selector, value) => { await act(async () => { const node = el.querySelector(selector); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }); };
const unmount = async () => { if (root) await act(async () => root.unmount()); el?.remove(); root = el = null; };
const saved = (uid = 'u') => s.readSolo(localStorage, base.board, 'app', uid);
const openRun = id => e.merge(e.emptyRun(), e.begin(base.board, e.emptyRun(), id));
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; window.__alloHooks = { useFocusTrap() {} }; loadAlloModule('lesson_board_module.js'); Solo = window.AlloModules.LessonBoardSolo; });
afterEach(async () => { await unmount(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
describe('Durable board solo resume UI', () => {
  it('restores a final unfinished draft after unmount and a new browser tab', async () => {
    await render(); await click(el.querySelector('[data-location="cloud"]')); await click(el.querySelector('[data-board-move="cloud"]')); await change('[data-board-control="0"]', '1');
    await unmount(); sessionStorage.clear(); await render();
    expect(el.querySelector('[data-board-control="0"]').value).toBe('1'); expect(el.querySelector('[data-board-control="1"]').value).toBe('');
    expect(el.querySelector('[data-solo-save-status]').textContent).toContain('saved on this device');
  });
  it('migrates a valid legacy tab run and draft without losing a completed activity', async () => {
    const key = s.legacySoloStorageKey(base.board, 'app', 'u');
    sessionStorage.setItem(key, JSON.stringify({ version: 1, board: JSON.stringify(base.board), run: openRun('heater') }));
    sessionStorage.setItem(key + ':draft', JSON.stringify({ board: JSON.stringify(base.board), drafts: { '0:heater': '1' }, selected: 'heater', view: 'list' }));
    await render(); expect(saved().status).toBe('saved'); expect(el.querySelector('[data-board-choice]').value).toBe('1'); expect(el.querySelector('[data-board-map]').dataset.view).toBe('list');
    await unmount(); sessionStorage.clear(); await render(); expect(el.querySelector('[data-board-choice]').value).toBe('1');
  });
  it('resets identity on a live user or app prop change and never copies the previous learner run', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); await change('[data-board-choice]', '1'); const previous = saved().revision;
    await render({ user: { uid: 'v' } }); expect(el.querySelector('[data-board-choice]')).toBeNull(); expect(saved('v').status).toBe('empty');
    await click(el.querySelector('[data-location="cloud"]')); await click(el.querySelector('[data-board-move="cloud"]')); expect(e.stepOf(saved('v').run).targetId).toBe('cloud'); expect(saved().revision).toBe(previous);
    await render({ appId: 'another-app', user: { uid: 'v' } }); expect(el.querySelector('[data-board-control]')).toBeNull();
    await render(); expect(el.querySelector('[data-board-choice]').value).toBe('1');
  });
  it('keeps the current draft on quota failure and can accurately retry saving', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]'));
    const original = Storage.prototype.setItem, spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (...args) { if (this === localStorage) throw Error('quota'); return original.apply(this, args); });
    await change('[data-board-choice]', '1'); expect(el.querySelector('[data-solo-save-status]').textContent).toContain('not saved'); expect(button('Retry saving progress')).toBeTruthy();
    spy.mockRestore(); await click(button('Retry saving progress')); expect(saved().workspace.drafts['0:heater']).toBe('1'); expect(el.querySelector('[data-solo-save-status]').textContent).toContain('saved on this device');
  });
  it('detects a newer tab before saving and can explicitly resume its progress', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); const first = saved();
    const newer = s.saveSolo(localStorage, base.board, 'app', 'u', { run: openRun('cloud'), expectedRevision: first.revision }); expect(newer.status).toBe('saved');
    await change('[data-board-choice]', '1'); expect(el.textContent).toContain('Another tab changed'); expect(el.querySelector('[data-board-submit]').disabled).toBe(true); expect(saved().revision).toBe(newer.revision);
    await click(button('Resume saved progress')); expect(el.querySelector('[data-board-control="0"]')).toBeTruthy(); expect(el.textContent).not.toContain('Another tab changed');
  });
  it('notices a storage event immediately and requires confirmation to replace the other run', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); const old = saved();
    const newer = s.saveSolo(localStorage, base.board, 'app', 'u', { run: openRun('cloud'), expectedRevision: old.revision });
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: s.soloStorageKey(base.board, 'app', 'u'), oldValue: old.revision, newValue: newer.revision })));
    await click(button('Keep this game and replace save')); expect(saved().revision).toBe(newer.revision); await click(button('Cancel')); expect(saved().revision).toBe(newer.revision);
    await click(button('Keep this game and replace save')); await click(button('Replace saved progress')); expect(e.stepOf(saved().run).targetId).toBe('heater');
  });
  it('does not overwrite another revision arriving while replacement confirmation is open', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); const first = saved();
    const second = s.saveSolo(localStorage, base.board, 'app', 'u', { run: openRun('cloud'), expectedRevision: first.revision });
    await change('[data-board-choice]', '1'); await click(button('Keep this game and replace save'));
    const third = s.saveSolo(localStorage, base.board, 'app', 'u', { run: e.emptyRun(), expectedRevision: second.revision });
    await click(button('Replace saved progress')); expect(saved().revision).toBe(third.revision); expect(el.textContent).toContain('Another tab changed');
  });
  it('restarts atomically without allowing an old draft to return if removal is unavailable', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); await change('[data-board-choice]', '1');
    const key = s.legacySoloStorageKey(base.board, 'app', 'u'); sessionStorage.setItem(key, JSON.stringify({ version: 1, board: JSON.stringify(base.board), run: openRun('heater') })); sessionStorage.setItem(key + ':draft', JSON.stringify({ board: JSON.stringify(base.board), drafts: { '0:heater': '1' } }));
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw Error('denied'); });
    await click(button('Restart solo board')); await click(button('Reset my progress')); expect(e.stepOf(saved().run).phase).toBe('choose'); spy.mockRestore();
    await unmount(); await render(); await click(el.querySelector('[data-board-move="heater"]')); expect(el.querySelector('[data-board-choice]').value).toBe('');
  });
  it('keeps the current game when its requested restart cannot be saved', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); await change('[data-board-choice]', '1'); const previous = saved().revision;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('denied'); }); await click(button('Restart solo board')); await click(button('Reset my progress'));
    expect(el.textContent).toContain('restart could not be saved'); expect(el.querySelector('[data-board-choice]').value).toBe('1'); expect(saved().revision).toBe(previous);
  });
  it('saves retry learning history and the new attempt draft without restoring the previous answer', async () => {
    await render(); await click(el.querySelector('[data-board-move="heater"]')); await change('[data-board-choice]', '0'); await click(el.querySelector('[data-board-submit]'));
    expect(el.querySelector('[data-board-answer-review]').textContent).toContain('Your response');
    await click(el.querySelector('[data-board-retry]')); expect(el.querySelector('[data-board-choice]').value).toBe('');
    await change('[data-board-choice]', '1'); await unmount(); sessionStorage.clear(); await render();
    expect(el.querySelector('[data-board-choice]').value).toBe('1'); expect(e.stepOf(saved().run).retryRound).toBe(1);
    await click(el.querySelector('[data-board-submit]')); expect(e.stepOf(saved().run).result.attempts.solo).toEqual({ answered: 2, correct: 1, firstCorrect: false, lastCorrect: true });
    await unmount(); await render(); expect(el.querySelector('[data-board-answer-review]').textContent).toContain('Your response'); expect(el.textContent).toContain('Location explored');
  });
  it('preserves a corrupt save until explicit new-game confirmation and keeps preview isolated', async () => {
    const key = s.soloStorageKey(base.board, 'app', 'u'); localStorage.setItem(key, '{broken'); await render(); expect(el.querySelector('[data-board-move="heater"]').disabled).toBe(true);
    await click(button('Start a new local game')); await click(button('Cancel')); expect(localStorage.getItem(key)).toBe('{broken'); await click(button('Start a new local game')); await click(button('Reset my progress')); expect(saved().status).toBe('saved');
    const replacement = saved().revision; await render({ preview: true }); await click(el.querySelector('[data-board-move="heater"]')); expect(saved().revision).toBe(replacement);
  });
});
