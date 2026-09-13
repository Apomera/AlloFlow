import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
const imageA = 'data:image/png;base64,AA==';
const imageB = 'data:image/png;base64,AQ==';
const studentA = 'draft-a'; const studentB = 'draft-b';
let SymbolStudio, root, host, props;
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; }, 60000);
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(async () => {
  const cancel = Array.from(document.querySelectorAll('[data-symbol-studio-dialog] button')).find((button) => button.textContent === 'Cancel');
  if (cancel) await settle(() => cancel.click());
  if (root) await settle(() => root.unmount()); root = null;
  host?.remove(); host = null; localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const envelope = (profileId, payload) => ({ version: 1, profileId, updatedAt: Date.now(), payload: clone(payload) });
function memoryDrafts(initial = {}) {
  const rows = new Map(Object.entries(initial).map(([id, payload]) => [id, envelope(id, payload)]));
  const storage = {
    read: vi.fn(async (id) => clone(rows.get(id) || null)),
    write: vi.fn(async (id, payload) => { const row = envelope(id, payload); rows.set(id, row); return clone(row); }),
    remove: vi.fn(async (id) => { rows.delete(id); }),
  };
  return { storage, rows };
}
function deferred() { let resolve; let reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
async function settle(action = () => {}) { await act(async () => { action(); for (let i = 0; i < 35; i++) await Promise.resolve(); }); }
async function advance(ms = 650) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function control(label) { const element = host.querySelector('[aria-label="' + label + '"]'); expect(element, label).toBeTruthy(); return element; }
async function click(label) { await settle(() => control(label).click()); }
async function action(label) {
  const button = Array.from(host.querySelectorAll('button')).find((node) => node.getAttribute('aria-label') === label || node.textContent.trim() === label);
  expect(button, label).toBeTruthy(); await settle(() => button.click());
}
async function decision(label) {
  const dialog = document.querySelector('[data-symbol-studio-dialog]'); expect(dialog).toBeTruthy();
  const button = Array.from(dialog.querySelectorAll('button')).find((node) => node.textContent.trim() === label);
  expect(button, label).toBeTruthy(); await settle(() => button.click());
}
async function input(label, value) {
  const field = control(label); const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await settle(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); });
}
function put(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
async function mount(storage, initialTab = 'quickboards', options = {}) {
  if (!localStorage.getItem('alloStudentProfiles')) {
    put('alloStudentProfiles', [{ id: studentA, name: 'Learner A', codename: 'Calm Fox' }, { id: studentB, name: 'Learner B', codename: 'Bright Otter' }]);
    put('alloActiveProfileId', studentA);
  }
  props = baseProps({ initialTab, draftStorage: storage, onCallImagen: null, onCallGeminiImageEdit: null, onCallTTS: null, ...options });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, props)));
}
async function remount() {
  await settle(() => root.unmount()); root = null; host.remove(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, props)));
}
const cell = (label) => ({ id: label.toLowerCase(), label, image: imageA, category: 'other' });
const originalBoard = () => ({
  id: 'saved-routine', title: 'Routine', createdAt: 123, profileId: studentA, cols: 2,
  words: [cell('Alpha'), cell('Beta')],
  pages: [{ id: 'page-one', title: 'First', cols: 2, words: [cell('Alpha'), cell('Beta')] }, { id: 'page-two', title: 'Second', cols: 2, words: [cell('Gamma'), cell('Delta')] }],
});
const choices = () => Array.from({ length: 4 }, (_, i) => ({ id: 'c' + (i + 1), label: 'Option ' + (i + 1), image: null }));

describe('Symbol Studio recoverable learner drafts', () => {
  it('restores active multipage board edits and updates the original saved board ID', async () => {
    const db = memoryDrafts(); const saved = originalBoard(); const key = 'alloSymbolBoards__' + studentA;
    put(key, [saved]); await mount(db.storage, 'board');
    await click('Toggle saved boards gallery'); await click('Load');
    await click('Second board page, position 2 of 2'); await click('Remove Gamma from board');
    await input('Board title', 'Recovered routine edits');
    await remount();
    expect(control('Board title').value).toBe('Recovered routine edits');
    expect(host.querySelector('[aria-label="Remove Delta from board"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Remove Gamma from board"]')).toBeNull();
    expect(control('Save').textContent).toContain('Save changes');
    expect(db.rows.get(studentA).payload.board).toMatchObject({ activePageIdx: 1, editingId: saved.id });
    await click('Save');
    const boards = JSON.parse(localStorage.getItem(key)); expect(boards).toHaveLength(1);
    expect(boards[0]).toMatchObject({ id: saved.id, createdAt: 123, title: 'Recovered routine edits' });
    expect(boards[0].pages[0].words.map((word) => word.label)).toEqual(['Alpha', 'Beta']);
    expect(boards[0].pages[1].words.map((word) => word.label)).toEqual(['Delta']);
  });

  it('keeps all Quick Board content with its learner across A-B-A switches', async () => {
    const db = memoryDrafts(); await mount(db.storage, 'quickboards', { onCallImagen: async () => imageA });
    await input('First activity', 'A private first activity'); await input('Reward activity', 'A reward');
    await click('Generate image for first activity');
    await click('Choice Board Quick Board mode'); await click('4 choices');
    await input('Choice board option 3', 'Third hidden choice'); await input('Choice board option 4', 'Fourth hidden choice'); await click('2 choices');
    await click('Profile: Learner B'); await click('First-Then Quick Board mode');
    expect(control('First activity').value).toBe(''); expect(control('Reward activity').value).toBe('');
    expect(Array.from(host.querySelectorAll('img')).some((img) => img.getAttribute('src') === imageA)).toBe(false);
    await input('First activity', 'B independent activity');
    await click('Profile: Learner A'); await click('First-Then Quick Board mode');
    expect(control('First activity').value).toBe('A private first activity'); expect(control('Reward activity').value).toBe('A reward');
    expect(Array.from(host.querySelectorAll('img')).some((img) => img.getAttribute('src') === imageA)).toBe(true);
    await click('Choice Board Quick Board mode'); await click('4 choices');
    expect(control('Choice board option 3').value).toBe('Third hidden choice'); expect(control('Choice board option 4').value).toBe('Fourth hidden choice');
    expect(db.rows.get(studentB).payload.quickBoards.ftFirstLabel).toBe('B independent activity');
  });

  it('restores authored support content but resets choice, reward, pain, and transition responses', async () => {
    const db = memoryDrafts({ [studentA]: { quickBoards: { qbMode: 'choice', cbItems: choices(), cbCount: 2, tokenTotal: 5, tokenLabel: 'Working together', tokenRewardLabel: 'Music' } } });
    await mount(db.storage);
    await settle(() => control('Choice board option 1').parentElement.parentElement.click());
    expect(control('Reset')).toBeTruthy();
    await click('Token Economy Quick Board mode');
    const token = Array.from(host.querySelectorAll('span')).find((node) => node.textContent === '○'); expect(token).toBeTruthy();
    await settle(() => token.parentElement.click()); expect(host.textContent).toContain('1 / 5 tokens earned');
    await click('Body Check Quick Board mode'); await click('Pain level 5, Moderate');
    expect(control('Pain level 5, Moderate').getAttribute('aria-pressed')).toBe('true');
    await click('Transition Quick Board mode'); await click('Next transition step'); expect(host.textContent).toContain('Current Step 2 of');
    await remount(); expect(host.textContent).toContain('Current Step 1 of');
    await click('Body Check Quick Board mode'); expect(control('Pain level 5, Moderate').getAttribute('aria-pressed')).toBe('false');
    await click('Token Economy Quick Board mode'); expect(host.textContent).toContain('0 / 5 tokens earned'); expect(control('Token board reward').value).toBe('Music');
    await click('Choice Board Quick Board mode'); expect(host.querySelector('[aria-label="Reset"]')).toBeNull(); expect(control('Choice board option 1').value).toBe('Option 1');
    const qb = db.rows.get(studentA).payload.quickBoards;
    for (const key of ['cbSelected', 'tokenEarned', 'bcPainLevel', 'twStep']) expect(qb).not.toHaveProperty(key);
  });

  it('does not autosave blank defaults before or after empty hydration', async () => {
    const pending = deferred(); const db = memoryDrafts(); db.storage.read.mockImplementationOnce(() => pending.promise);
    await mount(db.storage); expect(host.querySelector('.ss-draft-editor').hasAttribute('inert')).toBe(true);
    await advance(1500); expect(db.storage.write).not.toHaveBeenCalled();
    await settle(() => pending.resolve(null)); expect(host.querySelector('.ss-draft-editor').hasAttribute('inert')).toBe(false);
    await advance(1500); expect(db.storage.write).not.toHaveBeenCalled();
    await input('First activity', 'Intentional draft'); await advance();
    expect(db.rows.get(studentA).payload.quickBoards.ftFirstLabel).toBe('Intentional draft');
  });

  it('warns before leaving with uncommitted work and releases the warning after draft storage commits', async () => {
    const pendingWrite = deferred(); const db = memoryDrafts();
    db.storage.write.mockImplementationOnce(() => pendingWrite.promise);
    await mount(db.storage); await input('First activity', 'An edit not yet stored');
    let leaving = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(leaving); expect(leaving.defaultPrevented).toBe(true);
    await advance();
    leaving = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(leaving); expect(leaving.defaultPrevented).toBe(true);
    await settle(() => pendingWrite.resolve(envelope(studentA, { quickBoards: { ftFirstLabel: 'An edit not yet stored' } })));
    leaving = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(leaving); expect(leaving.defaultPrevented).toBe(false);
  });

  it('offers retry after a failed draft write without losing the current content', async () => {
    const db = memoryDrafts(); db.storage.write.mockRejectedValueOnce(new Error('Device write failed'));
    await mount(db.storage); await input('First activity', 'Keep this through storage failure'); await advance();
    expect(control('First activity').value).toBe('Keep this through storage failure');
    await action('Retry saving draft'); await advance();
    expect(db.rows.get(studentA).payload.quickBoards.ftFirstLabel).toBe('Keep this through storage failure');
    expect(db.storage.write.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores a previous learner hydration result that resolves after switching', async () => {
    const pendingA = deferred(); const db = memoryDrafts({ [studentB]: { quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'B recovered activity', ftFirstImage: imageB } } });
    db.storage.read.mockImplementation((id) => id === studentA ? pendingA.promise : Promise.resolve(clone(db.rows.get(id) || null)));
    await mount(db.storage); await click('Profile: Learner B');
    expect(control('First activity').value).toBe('B recovered activity');
    await settle(() => pendingA.resolve(envelope(studentA, { quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'A late private activity', ftFirstImage: imageA } })));
    expect(control('First activity').value).toBe('B recovered activity');
    expect(Array.from(host.querySelectorAll('img')).some((img) => img.getAttribute('src') === imageA)).toBe(false);
  });

  it.each(['Restore saved draft', 'Keep current draft'])('requires an explicit recovery choice after authoring through a read failure: %s', async (choice) => {
    const db = memoryDrafts({ [studentA]: { quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'Previously saved content' } } });
    db.storage.read.mockRejectedValueOnce(new Error('Device read temporarily unavailable'));
    await mount(db.storage); await input('First activity', 'New work after the read failed');
    await advance(); expect(db.storage.write).not.toHaveBeenCalled();
    await action('Retry draft recovery');
    expect(control('First activity').value).toBe('New work after the read failed');
    await action(choice); await advance();
    const expected = choice === 'Restore saved draft' ? 'Previously saved content' : 'New work after the read failed';
    expect(control('First activity').value).toBe(expected);
    expect(db.rows.get(studentA).payload.quickBoards.ftFirstLabel).toBe(expected);
  });

  it('clears only the active authoring section and persists that reset', async () => {
    const savedStory = { situation: 'Taking turns', studentName: 'Pip', pages: [{ id: 'retained-story', text: 'Pip can take a turn.', image: imageA }], current: 0 };
    const db = memoryDrafts({ [studentA]: {
      board: { title: 'Keep this board', words: [cell('Help')] },
      sequence: { title: 'Keep this sequence', input: 'Wash hands', items: [{ id: 'wash', label: 'Wash hands', image: imageB }] },
      story: savedStory,
      quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'Clear this activity', ftFirstImage: imageA, ftThenLabel: 'Clear this reward' },
    } });
    await mount(db.storage); await action('Clear current draft');
    expect(document.querySelector('[data-symbol-studio-dialog] h2').textContent).toBe('Clear current draft');
    await decision('Cancel'); expect(control('First activity').value).toBe('Clear this activity');
    await action('Clear current draft'); await decision('Clear draft'); await advance();
    expect(control('First activity').value).toBe(''); expect(control('Reward activity').value).toBe('');
    const saved = db.rows.get(studentA).payload;
    expect(saved.quickBoards).toMatchObject({ ftFirstLabel: '', ftFirstImage: null, ftThenLabel: '' });
    expect(saved.board).toMatchObject({ title: 'Keep this board', words: [expect.objectContaining({ label: 'Help' })] });
    expect(saved.sequence).toMatchObject({ title: 'Keep this sequence', items: [expect.objectContaining({ label: 'Wash hands' })] });
    expect(saved.story).toMatchObject(savedStory);
    await remount(); expect(control('First activity').value).toBe('');
    expect(db.rows.get(studentA).payload.story).toMatchObject(savedStory);
  });

  it('keeps a pending story generation when only the Quick Board draft is cleared', async () => {
    const pending = deferred(); const db = memoryDrafts();
    await mount(db.storage, 'stories', { onCallGemini: () => pending.promise });
    await input('Social story situation or goal', 'Waiting for a turn'); await click('Generate social story');
    await settle(() => host.querySelector('#ss-tab-quickboards').click());
    await input('First activity', 'Clear only this support');
    await action('Clear current draft'); await decision('Clear draft');
    expect(control('First activity').value).toBe('');
    await settle(() => pending.resolve(JSON.stringify([{ text: 'This story finishes after another draft is cleared.' }])));
    await settle(() => host.querySelector('#ss-tab-stories').click());
    expect(host.querySelector('.ss-story-page p').textContent).toBe('This story finishes after another draft is cleared.');
    await advance();
    expect(db.rows.get(studentA).payload.story.pages[0].text).toBe('This story finishes after another draft is cleared.');
  });

  it('requires confirmation before replacing an unreadable draft with current work', async () => {
    const db = memoryDrafts({ [studentA]: { quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'Unreadable previous draft' } } });
    db.storage.read.mockRejectedValue(new Error('Corrupt draft cannot be decoded'));
    await mount(db.storage); await input('First activity', 'Recoverable replacement work'); await advance();
    expect(db.storage.write).not.toHaveBeenCalled();
    await action('Save current draft instead');
    expect(document.querySelector('[data-symbol-studio-dialog] h2').textContent).toBe('Replace unreadable draft');
    await decision('Cancel'); expect(db.storage.write).not.toHaveBeenCalled();
    expect(db.rows.get(studentA).payload.quickBoards.ftFirstLabel).toBe('Unreadable previous draft');
    await action('Save current draft instead'); await decision('Save current draft'); await advance();
    expect(db.rows.get(studentA).payload.quickBoards.ftFirstLabel).toBe('Recoverable replacement work');
    expect(control('First activity').value).toBe('Recoverable replacement work');
    expect(host.querySelector('[aria-label="Save current draft instead"]')).toBeNull();
  });

  it('removes the deleted learner draft without saving pending edits back into it', async () => {
    const db = memoryDrafts({
      [studentA]: { quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'Remove this learner content' } },
      [studentB]: { quickBoards: { qbMode: 'firstthen', ftFirstLabel: 'Keep the other learner content' } },
    });
    await mount(db.storage); await input('First activity', 'Pending edit before learner deletion');
    await click('Profile: Learner A'); await click('Delete profile Learner A'); await advance();
    expect(db.storage.remove).toHaveBeenCalledWith(studentA); expect(db.rows.has(studentA)).toBe(false);
    expect(control('First activity').value).toBe('Keep the other learner content');
    expect(JSON.parse(localStorage.getItem('alloStudentProfiles')).map((profile) => profile.id)).toEqual([studentB]);
    expect(db.rows.get(studentB).payload.quickBoards.ftFirstLabel).toBe('Keep the other learner content');
  });

  it('restores the authored story name, selected page, and committed text after remount', async () => {
    const db = memoryDrafts({ [studentA]: { story: { situation: 'A noisy room', studentName: 'Pip', details: 'A quiet space is available.', current: 1, pages: [{ id: 'story-1', text: 'Pip can notice sounds.', image: imageA, imagePrompt: 'a room' }, { id: 'story-2', text: 'Pip can choose a quiet space.', image: imageB, imagePrompt: 'a quiet corner' }] } } });
    await mount(db.storage, 'stories');
    expect(control('Student name for social story').value).toBe('Pip'); expect(host.textContent).toContain('Page 2 of 2');
    await click('Edit text for story page 2'); await input('Story page text', 'Pip can ask for a break.');
    expect(host.querySelector('.ss-draft-status').textContent).toContain('Page text has unsaved changes. Use Save text to include them in the draft.');
    expect(db.rows.get(studentA).payload.story.pages[1].text).toBe('Pip can choose a quiet space.');
    const leavingWithText = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(leavingWithText); expect(leavingWithText.defaultPrevented).toBe(true);
    await click('Save story page text');
    await remount();
    expect(control('Student name for social story').value).toBe('Pip'); expect(host.textContent).toContain('Page 2 of 2');
    expect(host.querySelector('.ss-story-page p').textContent).toBe('Pip can ask for a break.');
    expect(host.querySelector('.ss-story-page img').getAttribute('src')).toBe(imageB);
    expect(host.querySelector('[aria-label="Story page text"]')).toBeNull();
  });
});
