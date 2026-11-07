// Offline adventure ending reflections (2026-11-04): a solo learner with no AI
// plays the teacher's offline story; at an ending a short reflection box saves
// to their own work as { type: 'adventure', data: { kind: 'offline-reflection' } }
// (one item per story, one entry per ending). It rides the hand-in and the
// teacher reads it in the Submission Inbox. A BLOCKED callGemini spy must never run.
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
  new Function(readFileSync('view_submission_inbox_module.js', 'utf8'))();
  Offline = window.AlloModules.AdventureOffline;
  SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  document.body.innerHTML = '';
  delete window.__alloAiUsable; delete window.__alloStudentAiDisabled; delete window.callGemini;
});

async function mount(element) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(element));
}
const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const setValue = (el, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const blockAi = () => {
  const blocked = vi.fn(() => Promise.reject(new Error('blocked'))); blocked._alloQrBlocked = true;
  window.callGemini = blocked; window.__alloStudentAiDisabled = true; window.__alloAiUsable = () => false;
  return blocked;
};
const teacherItem = () => ({ id: 'off1', type: 'adventure', title: 'River Trip', data: { offlineOnly: false, offlineStory: { version: 1, title: 'River Trip', start: 's1', scenes: [
  { id: 's1', text: 'You reach the river.', choices: [{ label: 'Raft', to: 's2' }, { label: 'Bridge', to: 's3' }] },
  { id: 's2', text: 'You float home safely.', ending: true, choices: [] },
  { id: 's3', text: 'You walk home over the bridge.', ending: true, choices: [] },
] } } });

// Stable stubs: a component stub re-created per render would remount the whole tree (the app's are stable).
const stubs = new Map();
const stub = (key, make) => { if (!stubs.has(key)) stubs.set(key, make()); return stubs.get(key); };
const PassThrough = ({ children }) => children;
const viewProps = (extra) => {
  const base = {
    t, theme: 'light', isTeacherMode: false, activeSessionCode: '', sessionData: {}, studentProjectSettings: { adventureMinXP: 0 },
    adventureState: { currentScene: null, history: [], inventory: [], climax: { isActive: false }, energy: 100, xp: 0, level: 1, xpToNextLevel: 100, gold: 0, turnCount: 0, isLoading: false, isGameOver: false, characters: [], stats: { decisions: 0, conceptsFound: [] } },
    adventureInputMode: 'choice', splitTextToSentences: (x) => [x], formatInteractiveText: (x) => x, playbackState: {}, history: [],
    adventureEffects: {}, ErrorBoundary: PassThrough, ...extra,
  };
  return new Proxy(base, { get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'string' && /^[A-Z]/.test(key)) return stub(key, () => () => null);
    if (typeof key === 'string' && /^(handle|on|toggle|open|close|start|stop|render|get)[A-Z]?/.test(key)) return stub(key, () => () => {});
    return undefined;
  } });
};
// Host-like harness: history lives in state, so a save re-renders the view as the app does.
function renderLiveView(initial, extra, spy) {
  const box = { history: initial };
  function Harness() {
    const [history, setHistoryState] = React.useState(initial);
    const setHistory = (fn) => { spy && spy(fn); setHistoryState((prev) => { const next = typeof fn === 'function' ? fn(prev) : fn; box.history = next; return next; }); };
    return window.AlloModules.AdventureView(viewProps({ history, setHistory, ...extra }));
  }
  return mount(React.createElement(Harness)).then(() => box);
}

describe('offline adventure: reflection at an ending (no AI)', () => {
  it('a solo learner reflects at each ending; it saves to their work, updates per ending, and never touches the teacher story', async () => {
    const blocked = blockAi();
    const spy = vi.fn();
    const box = await renderLiveView([teacherItem()], {}, spy);
    const player = () => host.querySelector('[data-adventure-offline-player]');
    expect(player()).not.toBeNull();
    expect(player().querySelector('[data-offline-reflection]')).toBeNull(); // not before an ending
    await click(player().querySelector('[data-offline-choice="s2"]'));
    const reflection = player().querySelector('[data-offline-reflection]');
    expect(reflection).not.toBeNull();
    const area = reflection.querySelector('textarea');
    expect(reflection.querySelector('label').getAttribute('for')).toBe(area.id);
    const save = reflection.querySelector('[data-offline-reflection-save]');
    expect(save.disabled).toBe(true); // nothing typed yet
    await setValue(area, '  Rafting was faster but riskier.  ');
    expect(save.disabled).toBe(false);
    await click(save);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(player().querySelector('[data-offline-reflection] [role="status"]').textContent).toBe('Saved to your work.');
    expect(player().querySelector('[data-offline-reflection-save]').disabled).toBe(true);
    let item = Offline.findReflection(box.history, 'off1');
    expect(item).toMatchObject({ id: 'adventure-reflection-off1', type: 'adventure', title: 'Reflection: River Trip' });
    expect(item.data).toMatchObject({ kind: 'offline-reflection', storyId: 'off1', storyTitle: 'River Trip' });
    expect(item.data.reflections).toHaveLength(1);
    expect(item.data.reflections[0]).toMatchObject({ endingId: 's2', ending: 'You float home safely.', text: 'Rafting was faster but riskier.' });
    // Teacher story untouched and still the one that plays; the reflection is not a student story.
    expect(box.history[0]).toEqual(teacherItem());
    expect(Offline.find(box.history).item.id).toBe('off1');
    expect(Offline.findDraft(box.history).id).toBe('off1');
    expect(Offline.findStudentStory(box.history)).toBeNull();

    // Play again: the same ending shows the saved words; a different ending adds a second entry.
    await click(player().querySelector('[data-offline-restart]'));
    await click(player().querySelector('[data-offline-choice="s3"]'));
    await setValue(player().querySelector('[data-offline-reflection] textarea'), 'The bridge was slow but safe.');
    await click(player().querySelector('[data-offline-reflection-save]'));
    await click(player().querySelector('[data-offline-restart]'));
    await click(player().querySelector('[data-offline-choice="s2"]'));
    expect(player().querySelector('[data-offline-reflection] textarea').value).toBe('Rafting was faster but riskier.');
    await setValue(player().querySelector('[data-offline-reflection] textarea'), 'Rafting needs a life jacket.');
    await click(player().querySelector('[data-offline-reflection-save]'));
    item = Offline.findReflection(box.history, 'off1');
    expect(box.history.filter((h) => h.data && h.data.kind === 'offline-reflection')).toHaveLength(1);
    expect(item.data.reflections.map((e) => [e.endingId, e.text])).toEqual([['s3', 'The bridge was slow but safe.'], ['s2', 'Rafting needs a life jacket.']]);
    expect(blocked).not.toHaveBeenCalled();
  });

  it('no reflection box without setHistory, in previews, or in the teacher inbox player', async () => {
    blockAi();
    await mount(React.createElement(function Harness() { return window.AlloModules.AdventureView(viewProps({ history: [teacherItem()] })); }));
    await click(host.querySelector('[data-offline-choice="s2"]'));
    expect(host.querySelector('[data-offline-scene]').textContent).toBe('The end');
    expect(host.querySelector('[data-offline-reflection]')).toBeNull();
    await act(async () => root.unmount()); host.remove(); root = null;
    await mount(React.createElement(Offline.Player, { story: Offline.normalize(teacherItem().data.offlineStory), t }));
    await click(host.querySelector('[data-offline-choice="s3"]'));
    expect(host.querySelector('[data-offline-reflection]')).toBeNull();
  });

  it('saveReflection ignores blank text and bounds the length', () => {
    let history = [teacherItem()];
    const setHistory = (fn) => { history = fn(history); };
    const story = Offline.normalize(teacherItem().data.offlineStory);
    expect(Offline.saveReflection(setHistory, history[0], story, story.scenes[1], '   ', t)).toBe(false);
    expect(history).toHaveLength(1);
    expect(Offline.saveReflection(setHistory, history[0], story, story.scenes[1], 'x'.repeat(5000), t)).toBe(true);
    expect(Offline.findReflection(history, 'off1').data.reflections[0].text).toHaveLength(1000);
  });
});

const handlers = readFileSync('host_handlers_source.jsx', 'utf8');
const sanitizeSubmissionData = new Function(handlers.slice(handlers.indexOf('const sanitizeSubmissionData = '), handlers.indexOf('const formatLessonDNA = ')) + '\nreturn sanitizeSubmissionData;')();
const reflectionItem = () => ({ id: 'adventure-reflection-off1', type: 'adventure', title: 'Reflection: River Trip', data: { kind: 'offline-reflection', storyId: 'off1', storyTitle: 'River Trip', reflections: [
  { endingId: 's2', ending: 'You float home safely.', text: 'Rafting was faster but riskier.', at: '2026-11-04T10:00:00.000Z' },
  { endingId: 's3', ending: 'You walk home over the bridge.', text: 'The bridge was slow but safe.', at: '2026-11-04T10:05:00.000Z' },
] } });

describe('Submission Inbox: teacher reads offline adventure reflections', () => {
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
  const submission = (content) => ({ kind: 'alloflow-student-submission', schemaVersion: 2, nickname: 'Learner1', studentName: 'Learner1', docTitle: 'River', timestamp: '2026-11-04T10:00:00.000Z', content, responses: {}, answers: {} });

  it('the hand-in carries it; the inbox shows each ending with the learner words, unscored', async () => {
    const relevant = handlers.slice(handlers.indexOf('const relevantTypes = ['), handlers.indexOf('const filteredContent'));
    expect(relevant).toContain("'adventure'");
    const handedIn = JSON.parse(JSON.stringify(sanitizeSubmissionData([reflectionItem()])));
    expect(handedIn[0]).toEqual(reflectionItem());
    expect(Offline.find(handedIn)).toBeNull();
    await mountAndView(submission(handedIn));
    const block = host.querySelector('[data-adventure-reflections]');
    expect(block, host.textContent.slice(0, 400)).toBeTruthy();
    expect(block.textContent).toContain('Adventure reflections (2)');
    expect(block.textContent).toContain('River Trip');
    const rows = [...block.querySelectorAll('[data-adventure-reflection]')];
    expect(rows.map((r) => r.textContent)).toEqual([
      'Ending: You float home safely.Rafting was faster but riskier.',
      'Ending: You walk home over the bridge.The bridge was slow but safe.',
    ]);
    expect([...block.querySelectorAll('button')]).toHaveLength(0); // read-only, no scoring
  });

  it('bounds a forged file', async () => {
    const forged = reflectionItem();
    forged.data.reflections = Array.from({ length: 90 }, (_, i) => ({ ending: 'e'.repeat(900), text: 'r' + i + 'z'.repeat(3000) })).concat([null, 'x', { text: '' }]);
    await mountAndView(submission([forged]));
    const rows = [...host.querySelectorAll('[data-adventure-reflection]')];
    expect(rows).toHaveLength(60);
    expect(rows[0].textContent.length).toBeLessThan(1400);
  });

  it('ships in the built modules and every mirror', () => {
    for (const name of ['view_submission_inbox_module.js', 'view_adventure_module.js']) {
      const built = readFileSync(name, 'utf8');
      for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
        expect(readFileSync(resolve(mirror, name), 'utf8') === built, mirror + '/' + name).toBe(true);
      }
    }
  });
});
