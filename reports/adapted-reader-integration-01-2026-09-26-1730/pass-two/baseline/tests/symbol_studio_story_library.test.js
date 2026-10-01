import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
const image = 'data:image/png;base64,AA==';
const saved = { id: 'saved', title: 'Quiet break', situation: 'Taking a break', studentName: 'A', details: 'A peaceful corner', pages: [{ id: 'p1', text: 'I can ask for a break.', image, imagePrompt: 'a quiet corner' }, { id: 'p2', text: 'I can return when ready.', image: null, imagePrompt: 'friends' }] };
let Studio, root, host, props;
beforeAll(() => { Studio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; }, 60000);
afterEach(async () => { if (root) await settle(() => root.unmount()); root = null; host?.remove(); host = null; localStorage.clear(); vi.restoreAllMocks(); });
async function settle(fn = () => {}) { await act(async () => { fn(); for (let i = 0; i < 40; i++) await Promise.resolve(); }); }
function control(label) { const found = [...host.querySelectorAll('[aria-label]')].find(el => el.getAttribute('aria-label') === label); expect(found, label).toBeTruthy(); return found; }
function change(label, value) { const el = control(label); const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype; act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function click(label) { await settle(() => control(label).click()); }
async function decision(text) { const button = [...document.querySelectorAll('[role="alertdialog"] button, [role="dialog"] button')].find(b => b.textContent === text); expect(button, text).toBeTruthy(); await settle(() => button.click()); }
function rows(pid = 'a') { return JSON.parse(localStorage.getItem('alloSavedStories__' + pid)); }
async function mount(overrides = {}, stories = [saved]) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'a', name: 'Learner A' }, { id: 'b', name: 'Learner B' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('a'));
  localStorage.setItem('alloSavedStories__a', JSON.stringify(stories));
  props = baseProps({ initialTab: 'stories', draftStorage: { read: async () => null, write: async () => {}, remove: async () => {} }, onCallGemini: async () => JSON.stringify([{ text: 'A new story.', imagePrompt: 'friends' }]), onCallImagen: null, onCallGeminiImageEdit: null, ...overrides });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await settle(() => root.render(React.createElement(Studio, props)));
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

describe('Completed social story library', () => {
  it('opens ordered text and illustrations, then saves an independent revised copy that survives remount', async () => {
    await mount(); await click('Open saved story: Quiet break');
    expect(control('Student name for social story').value).toBe('A');
    expect(control('Additional context for social story').value).toBe(saved.details);
    expect([...host.querySelectorAll('.ss-story-print-pages p')].map(el => el.textContent)).toEqual(saved.pages.map(p => p.text));
    expect(host.querySelector('.ss-story-page img').getAttribute('src')).toBe(image);
    await click('Edit text for story page 1'); change('Story page text', 'My own revised words.');
    expect(control('Save new story to library').disabled).toBe(true);
    await click('Save story page text'); change('Name for saved story', 'My revised story');
    await click('Save new story to library');
    expect(rows()).toHaveLength(2); expect(rows()[0].id).not.toBe(saved.id);
    expect(rows()[0].pages[0]).toMatchObject({ text: 'My own revised words.', image, imagePrompt: 'a quiet corner' });
    expect(rows()[1]).toEqual(saved); expect(control('Name for saved story').value).toBe('');
    await settle(() => root.unmount()); root = createRoot(host);
    await settle(() => root.render(React.createElement(Studio, props)));
    await click('Open saved story: My revised story');
    expect(host.querySelector('.ss-story-page p').textContent).toBe('My own revised words.');
    expect(host.querySelector('.ss-story-page img').getAttribute('src')).toBe(image);
  });

  it('keeps the draft and save name on quota failure and retries without duplicate copies', async () => {
    await mount(); await click('Open saved story: Quiet break'); change('Name for saved story', 'Retry story');
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === 'alloSavedStories__a') throw new Error('QuotaExceeded'); return original.call(this, key, value); });
    await click('Save new story to library');
    expect(rows()).toEqual([saved]); expect(control('Name for saved story').value).toBe('Retry story');
    expect(host.querySelector('.ss-story-library [role="alert"]').textContent).toContain('try again');
    spy.mockRestore();
    await settle(() => { control('Save new story to library').click(); control('Save new story to library').click(); });
    expect(rows()).toHaveLength(2); expect(rows()[0].title).toBe('Retry story');
  });

  it('duplicates and renames saved stories without changing the open draft', async () => {
    await mount(); await click('Open saved story: Quiet break'); await click('Duplicate saved story: Quiet break');
    expect(rows()).toHaveLength(2); expect(rows()[0].pages).toEqual(saved.pages); expect(rows()[0].id).not.toBe(saved.id);
    await click('Rename saved story: Quiet break (copy)');
    const input = document.querySelector('input[id^="symbol-studio-decision-"]');
    expect(input).toBeTruthy();
    await settle(() => { input.value = 'Practice copy'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await decision('Rename story');
    expect(rows()[0].title).toBe('Practice copy'); expect(rows()[1]).toEqual(saved);
    expect(host.querySelector('.ss-story-page p').textContent).toBe(saved.pages[0].text);
  });

  it('protects a draft on cancel and replaces it only after confirmation', async () => {
    await mount(); change('Social story situation or goal', 'My unfinished draft');
    await click('Open saved story: Quiet break'); await decision('Cancel');
    expect(control('Social story situation or goal').value).toBe('My unfinished draft');
    await click('Open saved story: Quiet break'); await decision('Replace draft');
    expect(control('Social story situation or goal').value).toBe(saved.situation);
  });

  it('rejects an open confirmation if the learner or draft changed while waiting', async () => {
    await mount(); change('Social story situation or goal', 'Before confirmation');
    await click('Open saved story: Quiet break'); change('Social story situation or goal', 'Changed during confirmation');
    await decision('Replace draft'); expect(control('Social story situation or goal').value).toBe('Changed during confirmation');
    await click('Open saved story: Quiet break'); await click('Profile: Learner B'); await decision('Replace draft');
    expect(host.textContent).not.toContain('Quiet break'); expect(host.querySelector('.ss-story-page')).toBeNull(); expect(rows('b')).toBeNull();
  });

  it('does not apply a late image or text generation after opening a saved story', async () => {
    const pending = deferred(); const next = deferred();
    const generate = vi.fn().mockImplementationOnce(() => pending.promise).mockImplementationOnce(() => next.promise);
    await mount({ onCallGemini: generate });
    change('Social story situation or goal', 'In progress'); await click('Generate social story');
    await click('Open saved story: Quiet break'); await decision('Replace draft');
    await click('Generate social story'); expect(generate).toHaveBeenCalledTimes(2);
    await settle(() => pending.resolve(JSON.stringify([{ text: 'Too late' }])));
    expect(host.querySelector('.ss-story-page p').textContent).toBe(saved.pages[0].text);
    expect(control('Generate social story').disabled).toBe(true);
    await settle(() => next.resolve(JSON.stringify([{ text: 'A fresh story after reopening.' }])));
    expect(host.querySelector('.ss-story-page p').textContent).toBe('A fresh story after reopening.');
    expect(control('Generate social story').disabled).toBe(false);
  });

  it('keeps saved stories isolated between learners and ignores a stale delete confirmation', async () => {
    await mount(); await click('Delete saved story: Quiet break');
    await click('Profile: Learner B'); await decision('Delete story');
    expect(rows()).toEqual([saved]); expect(rows('b')).toBeNull(); expect(host.textContent).toContain('Saved stories (0)');
    await click('Profile: Learner A'); expect(control('Open saved story: Quiet break')).toBeTruthy();
  });

  it('deletes only the library copy and leaves its open draft intact', async () => {
    await mount(); await click('Open saved story: Quiet break'); await click('Delete saved story: Quiet break'); await decision('Delete story');
    expect(rows()).toEqual([]); expect(host.querySelector('.ss-story-page p').textContent).toBe(saved.pages[0].text);
    expect(host.textContent).toContain('Saved stories (0)');
  });

  it('loads malformed saved records safely and disables opening an empty story', async () => {
    await mount({}, [null, { id: 'empty', title: {}, pages: [null, 3] }]);
    expect(control('Open saved story: Untitled story').disabled).toBe(true);
    expect(host.textContent).toContain('Saved stories (1)');
  });
});

describe('Visual Pack deletion confirmation ownership', () => {
  const source = fs.readFileSync(resolve(process.cwd(), 'symbol_studio_module.js'), 'utf8');
  const callback = source.slice(source.indexOf('    var deleteBook = useCallback'), source.indexOf('    var updatePackField'));
  function fixture() {
    const wait = deferred(); const work = { profileId: 'a', epoch: 1 };
    const env = { activeProfileId: 'a', STORAGE_BOOKS: 'alloActivitySets', useCallback: fn => fn, startSymbolWork: () => work, symbolWorkIsCurrent: vi.fn(() => true), finishSymbolWork: vi.fn(), selectionPacksRef: { current: [{ id: 'one', title: 'A pack' }, { id: 'two', title: 'Keep me' }] }, askSymbolStudioConfirmation: () => wait.promise, profKey: (base, pid) => base + '__' + pid, store: vi.fn(() => true), setBooks: vi.fn(), setActiveBookId: vi.fn(), addToast: vi.fn() };
    const run = new Function(...Object.keys(env), callback + '\nreturn deleteBook;')(...Object.values(env));
    return { env, wait, run };
  }
  it('writes only the confirmed learner key and preserves unrelated active selection', async () => {
    const { env, wait, run } = fixture(); const pending = run('one'); wait.resolve(true); await pending;
    expect(env.store).toHaveBeenCalledWith('alloActivitySets__a', [{ id: 'two', title: 'Keep me' }]);
    const setter = env.setActiveBookId.mock.calls[0][0]; expect(setter('one')).toBeNull(); expect(setter('two')).toBe('two');
  });
  it('ignores a confirmation after a profile switch or close', async () => {
    const { env, wait, run } = fixture(); const pending = run('one'); env.symbolWorkIsCurrent.mockReturnValue(false); wait.resolve(true); await pending;
    expect(env.store).not.toHaveBeenCalled(); expect(env.setBooks).not.toHaveBeenCalled();
  });
  it('does not overwrite changes made while the dialog was open', async () => {
    const { env, wait, run } = fixture(); const pending = run('one'); env.selectionPacksRef.current = [...env.selectionPacksRef.current, { id: 'new' }]; wait.resolve(true); await pending;
    expect(env.store).not.toHaveBeenCalled(); expect(env.addToast).toHaveBeenCalledWith(expect.stringContaining('changed'), 'info');
  });
  it('preserves live state on storage failure and releases its work lock', async () => {
    const { env, wait, run } = fixture(); env.store.mockReturnValue(false); const pending = run('one'); wait.resolve(true); await pending;
    expect(env.setBooks).not.toHaveBeenCalled(); expect(env.selectionPacksRef.current).toHaveLength(2); expect(env.finishSymbolWork).toHaveBeenCalled();
  });
});
