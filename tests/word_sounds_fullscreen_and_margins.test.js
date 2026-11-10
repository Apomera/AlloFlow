// Screen and paper, 2026-11-09. Students get the whole screen (a centred
// column inside it), teachers a large window; the pinned feedback row holds
// the message, the audio notice and the anchor chip in flow; and every Word
// Sounds printout carries its own 0.6in margin on every page, so the print
// dialog's "Margins: None" cannot put the sheet on the paper's edge.
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const SOURCE = readFileSync(resolve('word_sounds_module.js'), 'utf8');
const english = JSON.parse(readFileSync(resolve('ui_strings.js'), 'utf8')).word_sounds;
const strings = (_t, key, params = {}) => {
  let text = english[String(key).replace('word_sounds.', '')] || '';
  for (const [name, value] of Object.entries(params || {})) text = text.split('{' + name + '}').join(String(value));
  return text;
};
let Modal, root, container, originalAudio, originalGlobalAudio;
// Every clip fails to load, so the "Sound didn't load" notice shows.
class FailingAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.listeners = new Map(); queueMicrotask(() => this.emit('error')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { this['on' + name]?.({type: name}); for (const fn of this.listeners.get(name) || []) fn({type: name}); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(() => this.emit('error')); }
  removeAttribute() {}
  pause() { this.paused = true; }
  play() { queueMicrotask(() => this.emit('error')); return Promise.reject(new Error('no audio')); }
}
beforeAll(() => { installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds()); });
beforeEach(() => {
  vi.useFakeTimers({now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  originalAudio = window.Audio; originalGlobalAudio = globalThis.Audio;
  window.Audio = globalThis.Audio = FailingAudio;
  try { window.localStorage.removeItem('allo_word_sounds_anchor_mode_v1'); } catch (_) { /* no storage */ }
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
  const {activity: _ignored, ...rest} = overrides;
  return React.createElement(Modal, {...baseProps(activity), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: true, sessionId: 'full-screen', wsPreloadedWords: [makePackItem()],
    wordSoundsDifficulty: 'easy', wordSoundsSessionGoal: 10, onClose: () => {}, getWordSoundsString: strings, ...rest,
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
const q = (selector) => container.querySelector(selector);
const dialogBox = () => q('.word-sounds-root > div:not([data-ws-stop-confirm])');
// The module's own stylesheet, as the page gets it.
const sheet = () => document.getElementById('ws-a11y-css').textContent;
const rule = (selectorStart) => sheet().split('\n').filter((line) => line.startsWith(selectorStart));

describe('students get the whole screen', () => {
  it('the practice dialog carries the full-screen class; its rule fills the viewport with no corners', async () => {
    await mount();
    expect(q('.word-sounds-root').getAttribute('data-ws-student-screen')).toBe('true');
    expect(dialogBox().classList.contains('ws-stu-dialog')).toBe(true);
    expect(dialogBox().classList.contains('ws-teach-dialog')).toBe(false);
    const [css] = rule('.word-sounds-root[data-ws-student-screen] > .ws-stu-dialog {');
    expect(css).toMatch(/width: 100%; max-width: none; margin: 0;/);
    expect(css).toMatch(/height: 100vh; height: 100dvh; max-height: 100vh; max-height: 100dvh;/);
    expect(css).toMatch(/border-radius: 0;/);
    expect(css).toMatch(/padding-bottom: env\(safe-area-inset-bottom, 0px\)/);
    // No rule left that windows the student dialog at some size.
    expect(sheet()).not.toMatch(/ws-stu-dialog \{[^}]*height: (90vh|calc\(100d?vh - 16px\))/);
  });
  it('the task, the pinned row and the header content share one centred column', async () => {
    await mount();
    expect(rule('.word-sounds-root[data-ws-student-screen] > .ws-stu-dialog {')[0]).toMatch(/--ws-stu-col: 900px;/);
    const task = q('[data-ws-task-area]');
    expect(task.classList.contains('ws-stu-task')).toBe(true);
    expect(task.children.length).toBeGreaterThan(0);
    expect(rule('.word-sounds-root .ws-stu-task > * {')[0]).toMatch(/max-width: var\(--ws-stu-col, 900px\); margin-left: auto; margin-right: auto;/);
    expect(rule('.word-sounds-root .ws-stu-feedback-inner {')[0]).toMatch(/max-width: calc\(var\(--ws-stu-col, 900px\) \+ 24px\)/);
    // Header: background full width, content padded in to the column, clear of the notch.
    const header = rule('.word-sounds-root .ws-stu-header {')[0];
    expect(header).toMatch(/max\(var\(--ws-stu-side, 12px\), env\(safe-area-inset-left, 0px\)\)/);
    expect(header).toMatch(/env\(safe-area-inset-top, 0px\)/);
    expect(q('[data-ws-student-header]').classList.contains('ws-stu-header')).toBe(true);
  });
  it('larger targets on a big screen: the rules match the real cards, Check and replay control', async () => {
    await mount({activity: 'blending'});
    await tick(600);
    const big = sheet().split('\n').filter((line) => line.startsWith('@media (min-width: 900px) and (min-height: 650px)'));
    expect(big.length).toBe(1);
    expect(big[0]).toMatch(/--ws-stu-card-h: clamp\(72px, /);
    expect(big[0]).toMatch(/--ws-stu-num: clamp\(64px, /);
    expect(big[0]).toMatch(/--ws-stu-check-h: clamp\(56px, /);
    // The selectors those rules use find the live controls.
    const task = q('[data-ws-task-area]');
    expect(task.querySelectorAll('[data-ws-card]:not(.ws-card-small)').length).toBeGreaterThan(1);
    expect(task.querySelector('[data-ws-cards].max-w-sm')).toBeTruthy();
    expect(task.querySelector('.ws-card-check')).toBeTruthy();
    const replay = task.querySelector('button.flex-col.mx-auto.p-4.rounded-2xl');
    expect(replay, 'the replay control the zoom rule targets').toBeTruthy();
    expect(replay.getAttribute('aria-label')).toMatch(/Play/i);
  });
  it('number cards keep the hook their size rule uses', async () => {
    await mount();
    expect(q('[data-ws-task-area]').querySelectorAll('[data-ws-card].ws-card-small.w-16.h-16').length).toBeGreaterThan(2);
  });
});

describe('teachers get a large window, not the full screen', () => {
  it('teacher dialog: window class, about 96vw x 94vh, capped at 1500px, corners kept', async () => {
    await mount({isTeacherMode: true});
    expect(q('[data-ws-student-screen]')).toBeNull();
    expect(dialogBox().classList.contains('ws-stu-dialog')).toBe(false);
    expect(dialogBox().classList.contains('ws-teach-dialog')).toBe(true);
    expect(dialogBox().classList.contains('rounded-2xl')).toBe(true);
    const [css] = rule('.word-sounds-root > .ws-teach-dialog {');
    expect(css).toMatch(/width: min\(96vw, 1500px\); max-width: none;/);
    expect(css).toMatch(/height: 94vh; height: 94dvh;/);
    expect(css).not.toMatch(/border-radius/);
  });
  it('a probe keeps the plain window', async () => {
    await mount({isProbeMode: true});
    expect(dialogBox().classList.contains('ws-stu-dialog')).toBe(false);
    expect(dialogBox().classList.contains('ws-teach-dialog')).toBe(false);
  });
  it('the setup dialog is sized the same way', () => {
    const setup = readFileSync(resolve('word_sounds_setup_module.js'), 'utf8');
    expect(setup).toMatch(/"data-ws-setup-dialog": "true",\s*style: \{\s*maxWidth: ["']min\(96vw, 1500px\)["'],\s*maxHeight: ["']94vh["']\s*\}/);
    expect(setup).not.toMatch(/max-w-6xl max-h-\[96vh\]/);
  });
});

describe('pinned row: three notices, none laid over the task', () => {
  it('the message, the audio notice and the anchor chip are all children of the row', async () => {
    await mount();
    await tick(1500);
    await act(async () => container.querySelector('[role="button"][aria-label="Number 3"]').click());
    await tick(200);
    const row = q('[data-ws-feedback-region]');
    const inner = row.firstElementChild;
    const banner = q('[data-ws-feedback]');
    const chip = q('[role="region"][aria-label^="Anchor"]');
    const notice = q('[data-ws-audio-notice]');
    expect(banner, 'feedback message').toBeTruthy();
    expect(chip, 'anchor chip').toBeTruthy();
    expect(notice, 'audio notice (every clip fails in this test)').toBeTruthy();
    for (const el of [banner, chip, notice]) expect(el.parentElement).toBe(inner);
    expect(q('[data-ws-task-area]').contains(notice)).toBe(false);
    expect(notice.classList.contains('ws-stu-banner')).toBe(true);
    expect(notice.querySelector('button')).toBeTruthy();
  });
  it('no rule takes a notice out of flow, at any width', () => {
    const rows = sheet().split('\n').filter((line) => /ws-stu-feedback|ws-stu-banner/.test(line));
    expect(rows.length).toBeGreaterThan(4);
    for (const line of rows) {
      expect(line, line).not.toMatch(/position: (absolute|fixed)/);
      expect(line, line).not.toMatch(/top: 100%/);
    }
    expect(rule('.word-sounds-root .ws-stu-feedback {')[0]).toMatch(/flex: none; .*min-height: 56px;/);
    expect(rule('.word-sounds-root .ws-stu-feedback {')[0]).not.toMatch(/[^-]height:|max-height/);
    expect(rule('.word-sounds-root .ws-stu-feedback-inner {')[0]).toMatch(/flex-wrap: wrap;/);
    expect(rule('.word-sounds-root .ws-stu-feedback-inner > [role="region"] {')[0]).toMatch(/position: static;/);
  });
});

// The printables block, run as the module runs it.
const printables = () => {
  const lines = SOURCE.split('\n');
  const start = lines.findIndex((l) => l.includes('// BEGIN WORD SOUNDS PRINTABLES'));
  const end = lines.findIndex((l) => l.includes('// END WORD SOUNDS PRINTABLES'));
  const shuffle = lines.findIndex((l) => l.startsWith('    const wsPresentShuffle = '));
  const code = lines.slice(shuffle, shuffle + 5).join('\n') + '\n' + lines.slice(start, end).join('\n');
  return new Function('wsPresentWord', 'wsPresentSound', 'window', code +
    '\nreturn { wsPrintWorksheet, wsPrintSheets, wsPrintPrepare, wsPrintBoxes, wsPrintBlank, wsPrintCards, wsPrintHome, wsPrintDocument, wsPrintLangAttrs, WS_PRINT_CSS, WS_PRINT_MARGIN_CSS };')((x) => x.word, (x) => x, {});
};
const text = {title: 'Say It worksheet', name: 'Student name:', directions: 'Listen.', listen: 'Listen to your teacher.', all: 'Circle every one that fits.', keyTitle: 'Answer key', say: 'Say:',
  picture: 'Picture {n}', sayTitle: 'For the teacher', sayNote: 'Read each one aloud.', print: 'Print', keyNote: 'Rows marked *', greeting: 'Dear family,', intro: 'Words:', tryHeading: 'Try', activities: ['One'], thanks: 'Thanks'};
const seg = (word, sounds) => ({activity: 'segmentation', word, promptText: 'Say each sound you hear.', display: {kind: 'boxes', count: sounds.length}, choices: [], correct: [], audio: [{text: word}],
  answer: {label: sounds.join(' '), sounds}});
const WORDS = ['cat', 'fish', 'ship', 'cup', 'hat', 'dog', 'sun', 'map', 'bed', 'frog', 'lamp', 'nest', 'drum', 'crab'];

describe('print margins do not depend on the print dialog', () => {
  let L, attrs, items, entries, bodies;
  beforeAll(() => {
    L = printables();
    attrs = L.wsPrintLangAttrs('en');
    items = WORDS.map((w) => seg(w, w.split('')));
    entries = WORDS.map((w) => ({word: w, image: null, sounds: w.length}));
    const sheetOf = (key) => L.wsPrintWorksheet(L.wsPrintPrepare(items, {version: 'A'}), attrs, text, () => null, key);
    bodies = {
      'worksheet, key on the last page': sheetOf('last'),
      'worksheet, teacher page': sheetOf('none'),
      'worksheet, key as a separate printout': sheetOf('separate'),
      'review sheet': L.wsPrintSheets([{heading: 'A', directions: 'd', items: L.wsPrintPrepare(items.slice(0, 5), {})}, {heading: 'B', directions: 'd', items: L.wsPrintPrepare(items.slice(5), {})}], attrs, {...text, directions: ''}, () => null, 'last'),
      'blank sound boxes': L.wsPrintBlank(4, text),
      'sound boxes': L.wsPrintBoxes(entries, false, attrs, text, null),
      'word cards, 6 per page': L.wsPrintCards(entries, 6, attrs, null),
      'word cards, 8 per page': L.wsPrintCards(entries, 8, attrs, null),
      'sorting cards': L.wsPrintCards([{word: '/k/', head: true, kicker: 'Starts with'}, ...entries], 8, attrs, null),
      'family letter': L.wsPrintHome(entries, attrs, text),
    };
  });
  const parse = (body, lang = 'en') => new DOMParser().parseFromString(L.wsPrintDocument({title: 't', docAttrs: L.wsPrintLangAttrs(lang), bar: '<div class="print-bar"><button>Print</button></div>', body, head: '', css: ''}), 'text/html');
  // table > header group (spacer) + row > cell (the sheet) + footer group (spacer)
  const expectWrapped = (scope, label) => {
    const pages = [...scope.children].filter((el) => el.classList && el.classList.contains('ws-pg'));
    expect(pages.length, label + ': one page wrapper').toBe(1);
    const [top, row, bottom] = pages[0].children;
    expect(pages[0].children.length, label).toBe(3);
    expect(top.className, label).toBe('ws-pg-top');
    expect(bottom.className, label).toBe('ws-pg-bottom');
    for (const edge of [top, bottom]) {
      expect(edge.getAttribute('aria-hidden')).toBe('true');
      expect(edge.children.length).toBe(1);
      expect(edge.textContent).toBe('');
    }
    expect(row.className, label).toBe('ws-pg-row');
    expect(row.children.length, label).toBe(1);
    const main = row.firstElementChild;
    expect(main.tagName, label).toBe('MAIN');
    expect(main.className, label).toBe('ws-pg-main');
    return main;
  };

  it('the page box has no margin of its own; the spacer groups and the side padding are 0.6in, print only', () => {
    expect(L.WS_PRINT_CSS).toContain('@page{margin:0}');
    expect(L.WS_PRINT_CSS).not.toMatch(/@page\{margin:0\.5in\}/);
    expect((L.WS_PRINT_CSS.match(/@page/g) || []).length).toBe(1);
    const css = L.WS_PRINT_MARGIN_CSS;
    const at = css.indexOf('@media print{');
    const screen = css.slice(0, at), print = css.slice(at);
    // On screen the wrapper is plain blocks and the spacers are gone.
    expect(screen).toContain('.ws-pg-top,.ws-pg-bottom{display:none}');
    expect(screen).not.toMatch(/display:table/);
    expect(print).toContain('.ws-pg{display:table;table-layout:fixed;width:100%}');
    expect(print).toContain('.ws-pg-top{display:table-header-group}');
    expect(print).toContain('.ws-pg-bottom{display:table-footer-group}');
    // Chrome repeats a header group on every page only when it cannot break.
    expect(print).toContain('.ws-pg-top,.ws-pg-bottom{break-inside:avoid;page-break-inside:avoid}');
    expect(print).toContain('.ws-pg-top>div,.ws-pg-bottom>div{display:table-cell;height:0.6in}');
    expect(print).toMatch(/\.ws-pg-main\{display:table-cell;box-sizing:border-box;padding:0 0\.6in;/);
    expect(print).toMatch(/html,body\{margin:0 !important;padding:0 !important\}/);
  });

  it('every printout sits inside the per-page spacer structure', () => {
    for (const [label, body] of Object.entries(bodies)) {
      const doc = parse(body);
      const main = expectWrapped(doc.body, label);
      const printable = [...doc.body.querySelectorAll('.ws-ws-item, .ws-print-page, .ws-print-card, .ws-print-row, .ws-print-letter, .ws-ws-key, .ws-ws-teacher, h1')];
      expect(printable.length, label + ': has content').toBeGreaterThan(0);
      for (const el of printable) expect(main.contains(el), label + ': ' + el.className + ' inside the padded cell').toBe(true);
      // The toolbar is not printed and stays outside.
      expect(main.contains(doc.querySelector('.print-bar')), label).toBe(false);
      expect(doc.head.textContent, label).toContain('@page{margin:0}');
    }
  });

  it('the key and the teacher page still start a new page, inside the cell', () => {
    expect(L.WS_PRINT_CSS).toContain('.ws-ws-key{break-before:page;page-break-before:always}');
    expect(L.WS_PRINT_CSS).toContain('.ws-ws-newpage{break-before:page;page-break-before:always}');
    expect(L.WS_PRINT_CSS).toMatch(/\.ws-ws-item\{[^}]*break-inside:avoid;page-break-inside:avoid\}/);
    const key = parse(bodies['worksheet, key on the last page']).querySelector('main.ws-pg-main .ws-ws-key');
    expect(key).toBeTruthy();
    const teacher = parse(bodies['worksheet, teacher page']).querySelector('main.ws-pg-main .ws-ws-teacher.ws-ws-newpage');
    expect(teacher).toBeTruthy();
  });

  it('the separate key window gets the same structure', () => {
    const doc = parse(bodies['worksheet, key as a separate printout']);
    const template = doc.getElementById('ws-key-doc');
    expect(template).toBeTruthy();
    // The page's own script writes the template into the new window's body.
    const key = new DOMParser().parseFromString('<!DOCTYPE html><html><head>' + doc.head.innerHTML + '</head><body>' + template.innerHTML + '</body></html>', 'text/html');
    const main = expectWrapped(key.body, 'key window');
    expect(main.querySelector('.ws-ws-teacher li')).toBeTruthy();
    expect(key.head.textContent).toContain('@page{margin:0}');
  });

  it('a right-to-left sheet uses the same symmetric structure', () => {
    const doc = parse(L.wsPrintHome([{word: 'باب'}], L.wsPrintLangAttrs('ar'), text), 'ar');
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expectWrapped(doc.body, 'rtl letter');
    // Equal padding on both sides, so nothing to mirror.
    expect(L.WS_PRINT_MARGIN_CSS).toMatch(/\.ws-pg-main\{[^}]*padding:0 0\.6in;/);
    expect(L.WS_PRINT_MARGIN_CSS).not.toMatch(/padding-(left|right)|margin-(left|right)/);
  });

  it('the lesson script printout uses the same margins', () => {
    // Booleans, so a miss does not diff the whole 1.5 MB source.
    expect(SOURCE.includes("WS_DI_PRINT_CSS + WS_PRINT_MARGIN_CSS + '</style>")).toBe(true);
    expect(SOURCE.includes('wsPrintPage(copy.outerHTML) + WS_PRINT_EDIT_SCRIPT')).toBe(true);
  });

  it('cut-apart card grids still fit one grid per page on Letter and A4', () => {
    const height = (selector) => { const m = L.WS_PRINT_CSS.match(new RegExp(selector.replace(/[.]/g, '\\.') + '\\{height:([\\d.]+)in')); expect(m, selector).toBeTruthy(); return parseFloat(m[1]); };
    const six = height('.ws-print-card'), eight = height('.ws-print-8 .ws-print-card');
    expect(six).toBe(3.15);
    expect(eight).toBe(2.35);
    const margin = parseFloat(L.WS_PRINT_MARGIN_CSS.match(/display:table-cell;height:([\d.]+)in/)[1]);
    expect(margin).toBe(0.6);
    const border = 2 / 96; // the grid's dashed top line
    const letter = 11 - 2 * margin, a4 = 297 / 25.4 - 2 * margin;
    for (const grid of [3 * six + border, 4 * eight + border]) {
      expect(grid).toBeLessThan(letter);
      expect(grid).toBeLessThan(a4);
    }
    // 14 cards: 6 per page = 3 grids (6, 6, 2); 8 per page = 2 grids (8, 6).
    const count = (label) => [...parse(bodies[label]).querySelectorAll('.ws-print-page')].map((p) => p.querySelectorAll('.ws-print-card').length);
    expect(count('word cards, 6 per page')).toEqual([6, 6, 2]);
    expect(count('word cards, 8 per page')).toEqual([8, 6]);
    expect(parse(bodies['word cards, 8 per page']).querySelector('.ws-print-page').classList.contains('ws-print-8')).toBe(true);
  });
});
