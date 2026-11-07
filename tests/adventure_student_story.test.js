// Student author mode (2026-11-04): a learner writes their own branching
// adventure with NO AI (AdventureOffline.Panel studentMode), saves it to their
// own work as { type: 'adventure', data: { kind: 'student-story', ... } } so it
// rides the hand-in and never replaces the teacher's offline story, and the
// teacher reads, plays and scores it in the Submission Inbox (same manual score
// form + gradebook record as Role Swap). Every learner path runs with a BLOCKED
// callGemini spy that must never be called.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const t = (key) => key;
let root, host, Offline, SubmissionInbox;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.React = window.React = React;
  window.AlloModules = {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloHooks = { useFocusTrap: () => {} };
  new Function(readFileSync('view_adventure_module.js', 'utf8'))();
  new Function(readFileSync('view_student_save_adventure_module.js', 'utf8'))();
  new Function(readFileSync('view_submission_inbox_module.js', 'utf8'))();
  Offline = window.AlloModules.AdventureOffline;
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  document.body.innerHTML = '';
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.callGemini;
  localStorage.removeItem('alloflow_offline_grades');
});

async function mount(element) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(element));
}
const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const setValue = (el, value) => act(async () => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const blockAi = () => {
  const blocked = vi.fn(() => Promise.reject(new Error('blocked'))); blocked._alloQrBlocked = true;
  window.callGemini = blocked; window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return blocked;
};
const status = () => document.querySelector('[data-offline-validation]').textContent;
const teacherStory = () => ({ version: 1, title: 'River Trip', start: 's1', scenes: [
  { id: 's1', text: 'You reach the river.', choices: [{ label: 'Raft', to: 's2' }, { label: 'Bridge', to: 's3' }] },
  { id: 's2', text: 'You float home.', ending: true, choices: [] },
  { id: 's3', text: 'You walk home.', ending: true, choices: [] },
] });
const teacherItem = () => ({ id: 'off1', type: 'adventure', title: 'River Trip', data: { offlineStory: teacherStory(), offlineOnly: false } });
const studentItem = () => ({ id: 'adventure-student-story-x', type: 'adventure', title: 'Lost Kitten', data: { kind: 'student-story', ready: true,
  selfCheck: { clearProblem: true, choicesMatter: false, twoEndings: true },
  studentStory: { version: 1, title: 'Lost Kitten', start: 's1', scenes: [
    { id: 's1', text: 'My kitten ran away.', ending: false, choices: [{ label: 'Look in the park', to: 's2' }, { label: 'Ask a neighbor', to: 's3' }] },
    { id: 's2', text: 'She was under a bench!', ending: true, choices: [] },
    { id: 's3', text: 'The neighbor had her.', ending: true, choices: [] },
  ] } } });

describe('student author mode (no AI)', () => {
  it('write a scene, add choices, follow the checklist, preview, self-check and save to own work', async () => {
    const blocked = blockAi();
    let history = [teacherItem()];
    const setHistory = vi.fn((fn) => { history = fn(history); });
    await mount(React.createElement(Offline.Panel, { studentMode: true, t, history, setHistory, onClose: vi.fn() }));
    const dialog = document.querySelector('[data-adventure-student-story][role="dialog"]');
    expect(dialog).not.toBeNull();
    // Teacher-only options are gone; the editor opens straight away with one scene.
    expect(dialog.querySelector('[data-offline-make-ai]')).toBeNull();
    expect(dialog.querySelector('[data-offline-blank]')).toBeNull();
    expect(dialog.querySelector('[data-offline-remove]')).toBeNull();
    expect(dialog.textContent).not.toContain('Everyone plays this version');
    expect(dialog.querySelectorAll('select').length).toBe(0); // no "First scene" picker
    expect(dialog.querySelectorAll('[data-offline-scene-editor]')).toHaveLength(1);
    // Live checklist guidance.
    expect(status()).toContain('Story checklist:');
    expect(status()).toContain('Write the scene text.');
    expect(status()).toContain('Add a choice, or mark it as an ending.');
    expect(status()).toContain('Mark at least one scene as an ending.');
    expect(dialog.querySelector('[data-offline-preview]').disabled).toBe(true);

    await setValue(dialog.querySelector('[data-offline-scene-editor="s1"] textarea'), 'My kitten ran away.');
    // Each new choice brings its own new scene, already linked.
    await click(dialog.querySelector('[data-offline-scene-editor="s1"] [data-offline-add-choice]'));
    await click(dialog.querySelector('[data-offline-scene-editor="s1"] [data-offline-add-choice]'));
    expect([...dialog.querySelectorAll('[data-offline-scene-editor]')].map((el) => el.getAttribute('data-offline-scene-editor'))).toEqual(['s1', 's2', 's3']);
    expect([...dialog.querySelectorAll('[data-offline-scene-editor="s1"] select')].map((s) => s.value)).toEqual(['s2', 's3']);
    expect(status()).not.toContain('No choice leads here.');
    const labels = [...dialog.querySelectorAll('[data-offline-scene-editor="s1"] input[type="text"]')];
    await setValue(labels[0], 'Look in the park');
    await setValue(labels[1], 'Ask a neighbor');
    await setValue(dialog.querySelector('[data-offline-scene-editor="s2"] textarea'), 'She was under a bench!');
    await setValue(dialog.querySelector('[data-offline-scene-editor="s3"] textarea'), 'The neighbor had her.');
    for (const id of ['s2', 's3']) await click(dialog.querySelector(`[data-offline-scene-editor="${id}"] input[type="checkbox"]`));
    expect(status()).toContain('Your story is ready to play!');

    // Preview plays the story with the shared Player.
    await click(dialog.querySelector('[data-offline-preview]'));
    expect(dialog.querySelector('[data-adventure-offline-player]')).not.toBeNull();
    await click(dialog.querySelector('[data-offline-choice="s3"]'));
    expect(dialog.querySelector('[data-offline-scene]').textContent).toBe('The end');
    await click(dialog.querySelector('[data-offline-preview]'));
    expect(dialog.querySelector('[data-adventure-offline-editor]')).not.toBeNull();

    await click(dialog.querySelector('[data-student-story-check="clearProblem"]'));
    await click(dialog.querySelector('[data-student-story-check="twoEndings"]'));
    await click(dialog.querySelector('[data-offline-save]'));
    expect(dialog.textContent).toContain('Saved to your work. Hand it in when you are ready.');
    expect(setHistory).toHaveBeenCalledTimes(1);
    expect(history).toHaveLength(2);
    const saved = Offline.findStudentStory(history);
    expect(saved.type).toBe('adventure');
    expect(saved.data).toMatchObject({ kind: 'student-story', ready: true, selfCheck: { clearProblem: true, choicesMatter: false, twoEndings: true } });
    expect(saved.data.offlineStory).toBeUndefined();
    expect(saved.data.studentStory.scenes.map((s) => s.text)).toEqual(['My kitten ran away.', 'She was under a bench!', 'The neighbor had her.']);
    // The teacher's offline story is untouched and still the one students play.
    expect(history[0]).toEqual(teacherItem());
    expect(Offline.find(history).item.id).toBe('off1');
    expect(Offline.findDraft(history).id).toBe('off1');
    // A second save updates the same item, never a duplicate.
    await setValue(dialog.querySelector('input[type="text"]'), 'Lost Kitten');
    await click(dialog.querySelector('[data-offline-save]'));
    expect(history.filter((h) => h.data.kind === 'student-story')).toHaveLength(1);
    expect(Offline.findStudentStory(history).title).toBe('Lost Kitten');
    expect(blocked).not.toHaveBeenCalled();
  });

  it('keeps unsaved words when the learner closes with Escape, and saves nothing for a blank story', async () => {
    blockAi();
    let history = [];
    const setHistory = vi.fn((fn) => { history = fn(history); });
    const onClose = vi.fn();
    await mount(React.createElement(Offline.Panel, { studentMode: true, t, history, setHistory, onClose }));
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(setHistory).not.toHaveBeenCalled();
    await act(async () => root.unmount()); host.remove(); root = null;
    await mount(React.createElement(Offline.Panel, { studentMode: true, t, history, setHistory, onClose }));
    await setValue(document.querySelector('[data-offline-scene-editor="s1"] textarea'), 'Once upon a time');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(setHistory).toHaveBeenCalledTimes(1);
    expect(Offline.findStudentStory(history).data).toMatchObject({ kind: 'student-story', ready: false });
    // Reopening continues the saved story.
    await act(async () => root.unmount()); host.remove(); root = null;
    await mount(React.createElement(Offline.Panel, { studentMode: true, t, history, setHistory, onClose }));
    expect(document.querySelector('[data-offline-scene-editor="s1"] textarea').value).toBe('Once upon a time');
  });
});

const viewProps = (extra) => {
  const base = {
    t, theme: 'light', isTeacherMode: false, activeSessionCode: '', sessionData: {}, studentProjectSettings: { adventureMinXP: 0 },
    adventureState: { currentScene: null, history: [], inventory: [], climax: { isActive: false }, energy: 100, xp: 0, level: 1, xpToNextLevel: 100, gold: 0, turnCount: 0, isLoading: false, isGameOver: false, characters: [], stats: { decisions: 0, conceptsFound: [] } },
    adventureInputMode: 'choice', splitTextToSentences: (x) => [x], formatInteractiveText: (x) => x, playbackState: {}, history: [],
    adventureEffects: {}, ErrorBoundary: ({ children }) => children, ...extra,
  };
  return new Proxy(base, { get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'string' && /^[A-Z]/.test(key)) return () => null;
    if (typeof key === 'string' && /^(handle|on|toggle|open|close|start|stop|render|get)[A-Z]?/.test(key)) return () => {};
    return undefined;
  } });
};
const renderView = (extra) => { const props = viewProps(extra); return mount(React.createElement(function Harness() { return window.AlloModules.AdventureView(props); })); };
const remount = async () => { await act(async () => root.unmount()); host.remove(); root = null; document.body.innerHTML = ''; };

describe('entry points', () => {
  it('Adventure view: a solo learner gets "Write your own adventure" beside the offline story or the needs-AI note', async () => {
    const blocked = blockAi();
    await renderView({ history: [teacherItem()], setHistory: vi.fn() });
    expect(host.querySelector('[data-adventure-offline-player]')).not.toBeNull();
    const open = host.querySelector('[data-adventure-student-story-open]');
    expect(open.textContent).toContain('Write your own adventure');
    await click(open);
    expect(document.querySelector('[data-adventure-student-story][role="dialog"]')).not.toBeNull();
    await remount();
    await renderView({ history: [studentItem()], setHistory: vi.fn() });
    expect(host.querySelector('[data-adventure-solo-ai-off]')).not.toBeNull();
    expect(host.querySelector('[data-adventure-student-story-open]').textContent).toContain('✓');
    expect(blocked).not.toHaveBeenCalled();
  });
  it('Adventure view: hidden when the teacher turned it off, for live students, teachers, and hosts without setHistory', async () => {
    blockAi();
    for (const extra of [
      { setHistory: vi.fn(), studentProjectSettings: { adventureMinXP: 0, allowStudentStories: false } },
      { setHistory: vi.fn(), activeSessionCode: 'ABCDE' },
      { setHistory: vi.fn(), isTeacherMode: true },
      {},
    ]) {
      await renderView(extra);
      expect(host.querySelector('[data-adventure-student-story-open]'), JSON.stringify(Object.keys(extra))).toBeNull();
      await remount();
    }
  });
  it('student panel: button opens the author dialog; needs setHistory and the teacher setting', async () => {
    const blocked = blockAi();
    const Panel = window.AlloModules.StudentSaveAdventurePanel.StudentSaveAdventurePanel;
    const panel = (props) => mount(React.createElement(Panel, {
      activeSessionCode: null, globalPoints: 5, handleResumeAdventure() {}, handleSetShowSubmitModalToTrue() {}, handleStartAdventure: vi.fn(),
      hasSavedAdventure: false, initiateSaveStudentProject() {}, isResumingAdventure: false, isSaveActionPulsing: false,
      projectFileInputRef: { current: null }, sessionData: null, studentProjectSettings: { adventureUnlockXP: 1 }, t, ...props }));
    await panel({ history: [], setHistory: vi.fn() });
    expect(host.querySelector('[data-adventure-solo-ai-off]')).not.toBeNull();
    await click(host.querySelector('[data-adventure-student-story-open]'));
    expect(document.querySelector('[data-adventure-student-story][role="dialog"]')).not.toBeNull();
    await remount();
    await panel({});
    expect(host.querySelector('[data-adventure-student-story-open]')).toBeNull();
    await remount();
    await panel({ history: [], setHistory: vi.fn(), studentProjectSettings: { adventureUnlockXP: 1, allowStudentStories: false } });
    expect(host.querySelector('[data-adventure-student-story-open]')).toBeNull();
    await remount();
    await panel({ history: [], setHistory: vi.fn(), activeSessionCode: 'ABCDE' });
    expect(host.querySelector('[data-adventure-student-story-open]')).toBeNull();
    expect(blocked).not.toHaveBeenCalled();
  });
});

// The hand-in path: the 'adventure' type is whitelisted, and the real sanitizer runs over it.
const handlers = readFileSync('host_handlers_source.jsx', 'utf8');
const sanitizeSubmissionData = new Function(handlers.slice(handlers.indexOf('const sanitizeSubmissionData = '), handlers.indexOf('const formatLessonDNA = ')) + '\nreturn sanitizeSubmissionData;')();
const submission = (content, responses = {}) => ({
  kind: 'alloflow-student-submission', schemaVersion: 2, nickname: 'Learner1', studentName: 'Learner1',
  docTitle: 'Stories', timestamp: '2026-11-04T10:00:00.000Z', content, responses, answers: responses,
});

describe('persistence round trip', () => {
  it('survives the hand-in sanitizer, the student pack serializer and a project file, and stays out of find()', () => {
    const relevant = handlers.slice(handlers.indexOf('const relevantTypes = ['), handlers.indexOf('const filteredContent'));
    expect(relevant).toContain("'adventure'");
    const win = { React: {}, AlloModules: {} };
    const { buildLiveAacModule } = require('../_build_live_aac_module.js');
    new Function('window', readFileSync('firestore_sync_module.js', 'utf8'))(win);
    new Function('window', buildLiveAacModule(readFileSync('live_aac_source.jsx', 'utf8')))(win);
    const item = studentItem();
    const handedIn = JSON.parse(JSON.stringify(sanitizeSubmissionData([item])))[0];
    const packed = win.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined });
    const file = JSON.parse(JSON.stringify({ mode: 'student', history: [item] })).history[0];
    for (const copy of [handedIn, packed, file]) {
      const history = [teacherItem(), copy];
      expect(Offline.findStudentStory(history).data.studentStory).toEqual(item.data.studentStory);
      expect(Offline.findStudentStory(history).data.selfCheck).toEqual(item.data.selfCheck);
      expect(Offline.find(history).item.id).toBe('off1');
    }
    expect(Offline.find([handedIn])).toBeNull();
    expect(Offline.findDraft([handedIn])).toBeNull();
  });
});

describe('Submission Inbox: teacher reads, plays and scores a student-written adventure', () => {
  async function mountAndView(payload) {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(SubmissionInbox, { isOpen: true, onClose: vi.fn(), rosterKey: '', t: (k, f) => f || k, addToast: vi.fn(), onOpenAlloSheet: vi.fn(), history: [] }));
      await new Promise((r) => setTimeout(r, 10));
    });
    const text = JSON.stringify(payload);
    const file = new File([text], 'learner.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
    const input = host.querySelector('input[aria-label="Submission files"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 10)); await new Promise((r) => setTimeout(r, 10)); });
    const view = [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'View');
    await act(async () => view.click());
  }
  const button = (scope, label) => [...scope.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, ' ').trim().includes(label));

  it('shows the outline and self-check, plays it, and scores it into the gradebook', async () => {
    window.callGemini = vi.fn(() => Promise.resolve('{}'));
    await mountAndView(submission(sanitizeSubmissionData([studentItem()])));
    const block = host.querySelector('[data-student-story-key]');
    expect(block, host.textContent.slice(0, 400)).toBeTruthy();
    expect(host.textContent).toContain('Student-written adventures (1)');
    expect(block.textContent).toContain('Lost Kitten');
    expect(block.textContent).toContain('3 scenes · 2 endings');
    const scenes = [...block.querySelectorAll('[data-student-story-scene]')];
    expect(scenes.map((li) => li.getAttribute('data-student-story-scene'))).toEqual(['s1', 's2', 's3']);
    expect(scenes[0].textContent).toContain('Scene 1 · Start');
    expect(scenes[0].textContent).toContain('Look in the park → Scene 2');
    expect(scenes[2].textContent).toContain('Ending');
    const checks = [...block.querySelectorAll('input[type="checkbox"]')];
    expect(checks.map((c) => [c.checked, c.disabled])).toEqual([[true, true], [false, true], [true, true]]);
    expect(button(host, 'Grade responses')).toBeUndefined();

    await act(async () => button(block, 'Play').click());
    const player = block.querySelector('[data-student-story-player] [data-adventure-offline-player]');
    expect(player).not.toBeNull();
    await act(async () => player.querySelector('[data-offline-choice="s2"]').click());
    expect(player.querySelector('[data-offline-scene-text]').textContent).toBe('She was under a bench!');
    await act(async () => button(block, 'Close player').click());
    expect(block.querySelector('[data-student-story-player]')).toBeNull();

    await act(async () => button(block, 'Score manually').click());
    const dialog = host.querySelector('[role="dialog"][aria-labelledby="anchor-dialog-title"]');
    expect(dialog.textContent).toContain('Look in the park');
    await act(async () => {
      const num = dialog.querySelector('input[type="number"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(num, '90');
      num.dispatchEvent(new Event('input', { bubbles: true }));
      const area = dialog.querySelector('textarea');
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, 'Two real endings. Nice problem.');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => button(dialog, 'Save score').click());
    const scored = host.querySelector('[data-student-story-key]');
    expect(scored.textContent).toContain('90/100');
    expect(scored.textContent).toContain('Two real endings. Nice problem.');
    expect(host.textContent).toContain('1 of 1 expected responses scored');
    await act(async () => button(host, 'Save to gradebook').click());
    const saved = Object.values(JSON.parse(localStorage.getItem('alloflow_offline_grades')));
    const key = 'student-story:adventure-student-story-x';
    expect(saved[0].grades[key]).toMatchObject({ score: 90, feedback: 'Two real endings. Nice problem.', origin: 'teacher-edit' });
    expect(saved[0].responses[key]).toContain('Scene 1 (start): My kitten ran away.');
    expect(saved[0].responses[key]).toContain('-> Ask a neighbor (Scene 3)');
  });

  it('an unfinished or forged story is shown but not playable; the file cannot inject pictures or extra scenes', async () => {
    const forged = studentItem();
    forged.data.ready = true; // untrusted flag: ignored
    forged.data.studentStory.scenes[0].choices[1].to = 'nowhere';
    forged.data.studentStory.scenes[1].sceneImage = 'data:image/png;base64,AAAA';
    forged.data.studentStory.scenes.push(...Array.from({ length: 80 }, (_, i) => ({ id: 'x' + i, text: 'x', ending: true })));
    await mountAndView(submission([forged]));
    const block = host.querySelector('[data-student-story-key]');
    expect(block.querySelectorAll('[data-student-story-scene]')).toHaveLength(60);
    expect(block.querySelector('[data-student-story-play]').disabled).toBe(true);
    expect(block.querySelector('img')).toBeNull();
  });

  it('ships in the built modules and every mirror', () => {
    for (const name of ['view_submission_inbox_module.js', 'view_adventure_module.js', 'view_student_save_adventure_module.js']) {
      const built = readFileSync(name, 'utf8');
      for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        expect(readFileSync(resolve(mirror, name), 'utf8') === built, mirror + '/' + name).toBe(true);
      }
    }
  });
});
