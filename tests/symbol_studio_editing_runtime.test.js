import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupSymbolStudio, baseProps } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, SymbolStudio, ReactDOMClient, act, root, host;
const image = 'data:image/png;base64,AA==';
const profile = { id: 'editor-student', name: 'Editor Student', codename: 'Gentle Fox' };
const boardKey = 'alloSymbolBoards__editor-student';
const sequenceKey = 'alloSchedules__editor-student';
const packKey = 'alloActivitySets__editor-student';

beforeAll(() => {
  ({ React, SymbolStudio } = setupSymbolStudio());
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => {
  vi.restoreAllMocks();
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null; localStorage.clear();
});
function put(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function read(key) { return JSON.parse(localStorage.getItem(key)); }
async function open(tab, records, overrides = {}) {
  localStorage.clear(); put('alloStudentProfiles', [profile]); put('alloActiveProfileId', profile.id);
  for (const [key, value] of Object.entries(records)) put(key, value);
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const toast = vi.fn();
  await act(async () => { root.render(React.createElement(SymbolStudio, baseProps({ initialTab: tab, addToast: toast, ...overrides }))); });
  return toast;
}
async function click(label) {
  const button = [...host.querySelectorAll('button')].find((node) => node.getAttribute('aria-label') === label);
  expect(button, `Missing button: ${label}`).toBeTruthy();
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
async function input(label, value) {
  const field = host.querySelector(`[aria-label="${label}"]`);
  expect(field, `Missing field: ${label}`).toBeTruthy();
  const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); });
}
function savedBoard() {
  return { id: 'board-original', title: 'Original board', createdAt: 123, profileId: profile.id, fctFunction: 'Attention', fctPhase: 2, fctGoal: 'Ask for help', teacherNote: 'Preserve this note', speechAudioRef: 'device-original', language: 'en', cols: 2, words: [{ id: 'help', label: 'Help', image, assetId: 'asset-help' }] };
}
function savedSequence() {
  return { id: 'sequence-original', title: 'Original sequence', createdAt: 456, teacherNote: 'Preserve this note', profileId: profile.id, orientation: 'vertical', nowId: null, items: [{ id: 'step', label: 'Wash hands', image, complete: true, assetId: 'asset-step', conceptId: 'concept-step', customHint: 'Use soap' }] };
}

describe('Symbol Studio edit and save existing supports', () => {
  it('updates a loaded board without breaking Visual Pack membership and offers an independent copy', async () => {
    const board = savedBoard();
    await open('board', { [boardKey]: [board], [packKey]: [{ id: 'pack', title: 'Communication', boardIds: [board.id] }] });
    await click('Toggle saved boards gallery'); await click('Load');
    await input('Board title', 'Edited board'); await click('Save');
    expect(read(boardKey)).toHaveLength(1);
    expect(read(boardKey)[0]).toMatchObject({ ...board, title: 'Edited board' });
    expect(read(packKey)[0].boardIds).toEqual([board.id]);
    await click('Save board as a copy');
    const boards = read(boardKey);
    expect(boards).toHaveLength(2);
    expect(boards[0].id).not.toBe(board.id);
    expect(boards[0]).not.toHaveProperty('speechAudioRef');
    expect(boards[1]).toMatchObject({ id: board.id, title: 'Edited board', createdAt: 123 });
    expect(read(packKey)[0].boardIds).toEqual([board.id]);
  });

  it('saves a label-only board after loading it for editing', async () => {
    const board = savedBoard(); board.words[0].image = null;
    await open('board', { [boardKey]: [board] });
    await click('Toggle saved boards gallery'); await click('Load');
    await input('Board title', 'Text-only board'); await click('Save');
    expect(read(boardKey)).toHaveLength(1);
    expect(read(boardKey)[0]).toMatchObject({ id: board.id, title: 'Text-only board', words: [expect.objectContaining({ label: 'Help', image: null })] });
  });

  it('preserves the original board and edit identity when saving fails, then retries as an update', async () => {
    const board = savedBoard();
    const toast = await open('board', { [boardKey]: [board] });
    await click('Toggle saved boards gallery'); await click('Load');
    await input('Board title', 'Retry me');
    const storageWrite = Storage.prototype.setItem;
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === boardKey) throw new DOMException('Full', 'QuotaExceededError');
      return storageWrite.call(this, key, value);
    });
    await click('Save');
    expect(read(boardKey)[0].title).toBe('Original board');
    expect(host.querySelector('[aria-label="Board title"]').value).toBe('Retry me');
    expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('Could not save'), 'error');
    writeSpy.mockRestore(); await click('Save');
    expect(read(boardKey)).toHaveLength(1);
    expect(read(boardKey)[0]).toMatchObject({ id: board.id, title: 'Retry me' });
  });

  it('preserves completed sequence progress, symbol references, and pack membership during edits and copies', async () => {
    const sequence = savedSequence();
    await open('schedule', { [sequenceKey]: [sequence], [packKey]: [{ id: 'pack', title: 'Morning', scheduleIds: [sequence.id] }] });
    await click('Toggle saved sequences'); await click('Load');
    expect(host.querySelectorAll('[aria-current="step"]')).toHaveLength(0);
    expect(host.querySelector('[aria-label="Sequence steps, one per line"]').value).toBe('Wash hands');
    await input('Sequence title', 'Edited sequence'); await click('Save');
    expect(read(sequenceKey)).toHaveLength(1);
    expect(read(sequenceKey)[0]).toMatchObject({ ...sequence, title: 'Edited sequence' });
    expect(read(packKey)[0].scheduleIds).toEqual([sequence.id]);
    await click('Save sequence as a copy');
    expect(read(sequenceKey)).toHaveLength(2);
    expect(read(sequenceKey)[0].id).not.toBe(sequence.id);
    expect(read(sequenceKey)[0].items[0]).toMatchObject(sequence.items[0]);
  });

  it('keeps sequence edits recoverable when storage is full and retries the same record', async () => {
    const sequence = savedSequence();
    const toast = await open('schedule', { [sequenceKey]: [sequence] });
    await click('Toggle saved sequences'); await click('Load'); await input('Sequence title', 'Retry sequence');
    const storageWrite = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === sequenceKey) throw new DOMException('Full', 'QuotaExceededError');
      return storageWrite.call(this, key, value);
    });
    await click('Save');
    expect(read(sequenceKey)[0].title).toBe('Original sequence');
    expect(host.querySelector('[aria-label="Sequence title"]').value).toBe('Retry sequence');
    expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('Could not save'), 'error');
    spy.mockRestore(); await click('Save');
    expect(read(sequenceKey)).toHaveLength(1);
    expect(read(sequenceKey)[0]).toMatchObject({ id: sequence.id, title: 'Retry sequence' });
  });

  it('allows a fresh bulk request after reload and keeps it loading when the old request settles', async () => {
    const imageResolvers = [];
    const board = savedBoard(); board.words[0].image = null;
    await open('board', { [boardKey]: [board] }, {
      onCallImagen: () => new Promise((resolve) => { imageResolvers.push(resolve); }),
      onCallGeminiImageEdit: null,
    });
    await click('Toggle saved boards gallery'); await click('Load');
    await click('Generate images');
    expect(imageResolvers).toHaveLength(1);
    expect(host.querySelector('[aria-label="Generate images"]').disabled).toBe(true);
    await click('Toggle saved boards gallery'); await click('Load');
    expect(host.querySelector('[aria-label="Generate images"]').disabled).toBe(false);
    expect(host.querySelector('img[alt="Help"]')).toBeNull();
    await click('Generate images');
    expect(imageResolvers).toHaveLength(2);
    await act(async () => { imageResolvers[0]('data:image/png;base64,AQ=='); for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(host.querySelector('img[alt="Help"]')).toBeNull();
    expect(host.querySelector('[aria-label="Generate images"]').disabled).toBe(true);
    expect(read(boardKey)[0].words[0].image).toBeNull();
    await act(async () => { imageResolvers[1]('data:image/png;base64,Ag=='); for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(host.querySelector('[aria-label="Generate images"]').disabled).toBe(false);
    expect(host.querySelector('img[alt="Help"]').getAttribute('src')).toBe('data:image/png;base64,Ag==');
    expect(host.querySelector('[aria-label="Save"]')).toBeTruthy();
  });

  it('allows fresh cell regeneration after reload without stale results clearing the new request', async () => {
    const imageResolvers = [];
    const board = savedBoard();
    await open('board', { [boardKey]: [board] }, {
      onCallImagen: () => new Promise((resolve) => { imageResolvers.push(resolve); }),
      onCallGeminiImageEdit: null,
    });
    const confirmRegeneration = async () => {
      await click('Regenerate symbol for Help');
      const confirm = [...document.querySelectorAll('[data-symbol-studio-dialog="confirmation"] button')].find((button) => button.textContent === 'Replace picture');
      expect(confirm).toBeTruthy();
      await act(async () => { confirm.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    };
    await click('Toggle saved boards gallery'); await click('Load'); await confirmRegeneration();
    expect(imageResolvers).toHaveLength(1);
    await click('Toggle saved boards gallery'); await click('Load');
    expect(host.querySelector('img[alt="Help"]').getAttribute('src')).toBe(image);
    await confirmRegeneration();
    expect(imageResolvers).toHaveLength(2);
    await act(async () => { imageResolvers[0]('data:image/png;base64,AQ=='); for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(host.querySelector('[aria-label="Generate images"]').disabled).toBe(true);
    expect(read(boardKey)[0].words[0].image).toBe(image);
    await act(async () => { imageResolvers[1]('data:image/png;base64,Ag=='); for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(host.querySelector('[aria-label="Generate images"]').disabled).toBe(false);
    expect(host.querySelector('img[alt="Help"]').getAttribute('src')).toBe('data:image/png;base64,Ag==');
    expect(read(boardKey)[0].words[0].image).toBe(image);
  });

  it('does not let a pending sequence generation overwrite a saved sequence loaded afterward', async () => {
    let resolveImage;
    await open('schedule', { [sequenceKey]: [savedSequence()] }, { onCallImagen: () => new Promise((resolve) => { resolveImage = resolve; }) });
    await input('Sequence steps, one per line', 'Old pending step');
    await click('Generate visual sequence');
    expect(resolveImage).toBeTypeOf('function');
    await click('Toggle saved sequences'); await click('Load');
    await act(async () => { resolveImage(image); for (let i = 0; i < 8; i++) await Promise.resolve(); });
    expect(host.querySelector('[aria-label="Sequence title"]').value).toBe('Original sequence');
    expect(host.textContent).toContain('Wash hands');
    expect(host.querySelector('[aria-label="Save"]').textContent).toContain('Save changes');
    expect(host.querySelector('[aria-label="Remove Old pending step from sequence"]')).toBeNull();
  });
});
