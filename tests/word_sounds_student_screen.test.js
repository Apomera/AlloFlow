// The practice screen a child sees, 2026-11-09: one header row with a More
// panel, feedback pinned under the header, a stopping point for free practice
// and focus + an announcement on each new word. Each test mounts the real
// modal and plays it; teachers must keep the full header.
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
// Real English where it exists, "" otherwise so the in-code fallback shows.
const strings = (_t, key, params = {}) => {
  let text = english[String(key).replace('word_sounds.', '')] || '';
  for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
  return text;
};
let Modal, root, container, current, originalAudio, originalGlobalAudio;
const onClose = vi.fn();
const setSpeed = vi.fn();
class CompleteAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.listeners = new Map(); queueMicrotask(() => this.emit('canplaythrough')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(() => { this.emit('loadedmetadata'); this.emit('canplaythrough'); }); }
  removeAttribute() {}
  pause() { this.paused = true; }
  play() { this.paused = false; setTimeout(() => { if (!this.paused) { this.ended = true; this.emit('ended'); } }, 1); return Promise.resolve(); }
}
beforeAll(() => { installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = CompleteAudio;
  try { window.localStorage.removeItem('allo_word_sounds_anchor_mode_v1'); } catch (_) { /* no storage */ }
  onClose.mockClear(); setSpeed.mockClear();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container?.remove();
  window.Audio = originalAudio; globalThis.Audio = originalGlobalAudio;
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

function Host(overrides) {
  const [activity, setActivity] = React.useState(overrides.activity || 'counting');
  const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
  const [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  current = {activity, word, score, history, feedback};
  const {activity: _ignored, ...rest} = overrides;
  return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: true, sessionId: 'student-screen', wsPreloadedWords: [makePackItem()],
    wordSoundsDifficulty: 'easy', wordSoundsSessionGoal: 10, onClose, getWordSoundsString: strings,
    setWordSoundsTtsSpeed: setSpeed, ...rest,
    wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord,
    wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore,
    wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback});
}
async function tick(ms) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }
async function mount(overrides = {}) {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Host, overrides))); await tick(120);
}
const click = async (element) => { expect(element, 'control to click').toBeTruthy(); await act(async () => element.click()); };
const numberTile = (value) => container.querySelector(`[role="button"][aria-label="Number ${value}"]`);
const count = (value) => click(numberTile(value));
// "cat" has three sounds. A miss, the retry miss on another number (a tried
// number is disabled for the item), then the wait for the next word.
const missWord = async () => { await count(5); await tick(3100); await count(4); await tick(3100); };
const rightWord = async () => { await count(3); await tick(2600); };
const q = (selector) => container.querySelector(selector);
const studentHeader = () => q('[data-ws-student-header]');
const moreButton = () => q('[data-ws-student-more]');
// The panel stays in the page while closed; open means not hidden.
const morePanel = () => q('[data-ws-student-more-panel]:not([hidden])');
const inClosedPanel = (element) => !!element.closest('[data-ws-student-more-panel][hidden]');
const recap = () => q('[aria-labelledby="word-sounds-session-complete-title"]');
const pressEscape = () => act(async () => {
  (document.activeElement && container.contains(document.activeElement) ? document.activeElement : q('[role="dialog"]'))
    .dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
});
const before = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const lesson = {
  lessonPlanConfig: {activities: [{id: 'counting', count: 2}, {id: 'syllable_counting', count: 2}], masteryThreshold: 2},
  initialActivitySequence: ['counting', 'syllable_counting'],
};

describe('student header: one row', () => {
  it('shows the activity name, progress as a count, More and close, and none of the old rows', async () => {
    await mount();
    const header = studentHeader();
    expect(header, 'compact student header').toBeTruthy();
    expect(q('[data-ws-student-screen="true"]'), 'root is marked for the student layout').toBeTruthy();
    const title = header.querySelector('#word-sounds-dialog-title');
    expect(title.querySelector('[data-ws-student-title]').textContent).toBe('Sound Counting');
    expect(title.textContent, 'the dialog name still says Word Sounds').toMatch(/Word Sounds: Sound Counting$/);
    expect(q('[role="dialog"]').getAttribute('aria-labelledby')).toBe('word-sounds-dialog-title');
    const progress = header.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuetext')).toBe('0 of 10');
    expect(progress.getAttribute('aria-valuemax')).toBe('10');
    expect(progress.querySelectorAll('[data-ws-dot]')).toHaveLength(10);
    const row = [...header.children].filter((el) => !el.querySelector('[data-ws-student-more-panel]')).map((el) => el.textContent).join(' ');
    expect(row, 'no percentage or zero streak in the row').not.toMatch(/%|Accuracy|Streak/);
    expect(header.querySelector('[data-ws-student-streak]'), 'no streak chip at 0').toBeNull();
    expect(header.querySelector('button[aria-label="common.close"]')).toBeTruthy();
    // Everything else waits inside the closed More panel.
    expect(inClosedPanel(q('[data-ws-header-settings]'))).toBe(true);
    expect(inClosedPanel(q('[data-ws-activity-tabs]')), 'no fixed tab strip').toBe(true);
    expect([...header.querySelectorAll('button')].filter((b) => !inClosedPanel(b))).toHaveLength(2);
  });

  it('counts up as words are answered and shows a streak of three as a flame', async () => {
    await mount();
    await rightWord(); await rightWord();
    expect(studentHeader().querySelector('[data-ws-student-streak]'), 'streak of 2').toBeNull();
    await rightWord();
    const progress = studentHeader().querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuenow')).toBe('3');
    expect(progress.getAttribute('aria-valuetext')).toBe('3 of 10');
    expect(progress.querySelectorAll('[data-ws-dot="done"]')).toHaveLength(3);
    const streak = studentHeader().querySelector('[data-ws-student-streak]');
    expect(streak.textContent).toContain('3');
    expect(streak.querySelector('.sr-only').textContent).toBe('Streak: 3');
  });

  it('More opens a panel with the settings; Escape closes it and returns focus without ending practice', async () => {
    await mount();
    const more = moreButton();
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(more.getAttribute('aria-label')).toBe('More');
    expect(morePanel()).toBeNull();
    await click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    const panel = morePanel();
    expect(panel.id).toBe(more.getAttribute('aria-controls'));
    expect(panel.getAttribute('aria-labelledby')).toBe(more.id);
    expect(panel.querySelector('[data-ws-header-settings]'), 'the settings row moved here').toBeTruthy();
    expect(panel.textContent).toMatch(/0\/0/);
    // A control in the panel still does its job.
    const speed = panel.querySelector('input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(speed, '0.75'); speed.dispatchEvent(new Event('input', {bubbles: true})); });
    expect(setSpeed).toHaveBeenCalledWith(0.75);
    const help = [...panel.querySelectorAll('button')].find((b) => /Instructions are ON/.test(b.title));
    await click(help);
    expect([...morePanel().querySelectorAll('button')].some((b) => /Instructions are OFF/.test(b.title))).toBe(true);
    // Escape from inside the panel.
    await act(async () => morePanel().querySelector('input[type="range"]').focus());
    await pressEscape();
    expect(morePanel(), 'panel closed').toBeNull();
    expect(document.activeElement).toBe(moreButton());
    expect(q('[data-ws-stop-confirm]'), 'Escape did not reach the stop question').toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the mascot choice keeps its data attribute inside the panel when motion is on', async () => {
    await mount({disableAnimations: false});
    await click(moreButton());
    expect(morePanel().querySelector('[data-ws-mascot-choice] select')).toBeTruthy();
  });

  it('close still asks "Stop practicing?" once a word has been answered', async () => {
    await mount();
    await rightWord();
    await click(studentHeader().querySelector('button[aria-label="common.close"]'));
    expect(q('[data-ws-stop-confirm]')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('teachers keep the full header', () => {
  it('no compact header, no More; settings, stats and the tab strip are on screen', async () => {
    await mount({isTeacherMode: true});
    expect(studentHeader()).toBeNull();
    expect(moreButton()).toBeNull();
    expect(q('[data-ws-student-screen]')).toBeNull();
    expect(q('[data-ws-header-settings]')).toBeTruthy();
    expect(q('[data-ws-activity-tabs]')).toBeTruthy();
    expect(container.textContent).toMatch(/0% Accuracy/);
    expect(q('[data-ws-task-area]').className).toBe('flex-1 overflow-y-auto p-6');
  });

  it('a parent keeps it too', async () => {
    await mount({isParentMode: true});
    expect(studentHeader()).toBeNull();
    expect(q('[data-ws-header-settings]')).toBeTruthy();
  });
});

describe('activity tabs', () => {
  it('free practice: the tabs are in the More panel, and choosing one changes the activity and closes it', async () => {
    await mount();
    await click(moreButton());
    const tabs = morePanel().querySelector('[data-ws-activity-tabs]');
    expect(tabs).toBeTruthy();
    expect(morePanel().textContent).toContain('Change activity');
    const blend = [...tabs.querySelectorAll('button')].find((b) => /Blend Sounds/.test(b.textContent));
    await click(blend);
    await tick(200);
    expect(current.activity).toBe('blending');
    expect(morePanel()).toBeNull();
    expect(studentHeader().querySelector('[data-ws-student-title]').textContent).toBe('Blend Sounds');
  });

  it('a locked lesson has no tabs anywhere; progress is the lesson item goal and "Next" is in the panel', async () => {
    await mount({...lesson, sessionConfig: {studentLocked: true}});
    expect(q('[data-ws-activity-tabs]')).toBeNull();
    expect(q('[data-ws-lesson-next]').closest('[hidden]'), '"Next" is not on the practice screen itself').toBeTruthy();
    const progress = studentHeader().querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuetext')).toBe('0 of at least 2 items');
    expect(progress.querySelectorAll('[data-ws-dot]')).toHaveLength(2);
    await click(moreButton());
    expect(morePanel().querySelector('[data-ws-activity-tabs]')).toBeNull();
    expect(morePanel().querySelector('[data-ws-lesson-next]').textContent).toMatch(/^Next: /);
  });

  it('a running lesson that is not locked offers no activity change either', async () => {
    await mount(lesson);
    await click(moreButton());
    expect(morePanel().textContent).not.toContain('Change activity');
    // The picture-symbol (AAC) switch lived in the tab strip; it stays reachable.
    const left = [...morePanel().querySelectorAll('[data-ws-change-activity] button')].map((b) => b.textContent.trim());
    expect(left).toEqual(['🖼️AAC']);
  });
});

describe('feedback stays in view', () => {
  it('student: the message is in a row between the header and the scrolling task', async () => {
    await mount();
    const region = q('[data-ws-feedback-region]');
    const task = q('[data-ws-task-area]');
    expect(region, 'the row exists before any message, so nothing moves when one arrives').toBeTruthy();
    expect(region.className).toBe('ws-stu-feedback');
    await count(5);
    const banner = q('[data-ws-feedback="retry"]');
    expect(banner.textContent).toMatch(/Try again/);
    expect(region.contains(banner)).toBe(true);
    expect(task.contains(banner), 'not inside the scroller').toBe(false);
    expect(before(studentHeader(), region) && before(region, task)).toBe(true);
    // Same announcement path as before: one polite live region, no role on the banner.
    expect(banner.getAttribute('role')).toBeNull();
    expect(banner.getAttribute('aria-live')).toBeNull();
    expect(document.getElementById('allo-live-word-sounds').textContent).toMatch(/Try again/);
  });

  it('student: after the final answer the anchor is a compact chip in that row, with no expand control', async () => {
    await mount();
    await count(3);
    const card = q('[role="region"][aria-label^="Anchor"]');
    expect(card, 'anchor after the answer').toBeTruthy();
    expect(card.getAttribute('aria-label')).toMatch(/^Anchor: letter/);
    expect(q('[data-ws-feedback-region]').contains(card)).toBe(true);
    expect(q('[data-ws-task-area]').contains(card)).toBe(false);
    expect(card.querySelector('button[aria-label="Expand anchor"]')).toBeNull();
    expect(card.querySelector('button[aria-label^="Hear the sound"]')).toBeTruthy();
    expect(q('[data-ws-feedback="correct"]')).toBeTruthy();
  });

  it('teacher: feedback is above the task too, and the anchor card stays a full card in the task', async () => {
    await mount({isTeacherMode: true});
    await count(3);
    const region = q('[data-ws-feedback-region]');
    const task = q('[data-ws-task-area]');
    expect(region.contains(q('[data-ws-feedback="correct"]'))).toBe(true);
    expect(before(region, task)).toBe(true);
    const card = q('[role="region"][aria-label^="Anchor card"]');
    expect(card, 'full anchor card').toBeTruthy();
    expect(task.contains(card)).toBe(true);
  });
});

describe('free practice has a stopping point', () => {
  it('ends on the session-complete screen at twice the goal, however few were right', async () => {
    await mount({wordSoundsSessionGoal: 2});
    await missWord(); await missWord(); await missWord();
    expect(current.score).toMatchObject({correct: 0, total: 3});
    expect(recap(), 'three of four').toBeNull();
    await missWord();
    expect(current.score).toMatchObject({correct: 0, total: 4});
    expect(recap(), 'session-complete screen').toBeTruthy();
  });

  it('still ends at the goal when the answers are right', async () => {
    await mount({wordSoundsSessionGoal: 2});
    await rightWord();
    expect(recap()).toBeNull();
    await rightWord();
    expect(recap()).toBeTruthy();
  });
});

describe('a new word moves focus and says where the learner is', () => {
  it('focus leaves the old tile for the task, and "Word 2 of 10" is announced once', async () => {
    await mount();
    const tile = numberTile(3);
    await act(async () => tile.focus());
    expect(document.activeElement).toBe(tile);
    await count(3);
    const live = document.getElementById('allo-live-word-sounds');
    expect(live.textContent).toMatch(/Correct/);
    await tick(2600);
    expect(current.history).toHaveLength(1);
    const task = q('[data-ws-task-area] > div[tabindex="-1"]');
    expect(document.activeElement, 'focus on the activity region').toBe(task);
    expect(live.textContent).toBe('Word 2 of 10');
    await tick(1500);
    expect(live.textContent, 'not repeated or replaced while the word waits').toBe('Word 2 of 10');
  });

  it('a control outside the task that the learner focused keeps focus', async () => {
    await mount();
    await count(3);
    await act(async () => moreButton().focus());
    await tick(2600);
    expect(document.activeElement).toBe(moreButton());
  });
});
