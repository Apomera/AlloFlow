// Lesson Board's AI-written mission, instructions, options, hints, explanations and lesson quotes get the
// Assess view's light markdown (window.AlloModules.QuizView.markdown) instead of showing asterisks.
// <option> text and screen-reader labels stay plain words.
//
// Mutation check: MD_LB_MODULE=<pre-change lesson_board_module.js> makes these tests fail.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
const t = (key, params = {}) => params.defaultValue || key;
let api, root, host;

// The fixture board with markdown in the AI-written fields (lesson quotes must match the lesson, so they stay).
function markdownBoard() {
  const board = makeBoard(), node = id => board.locations.find(n => n.id === id);
  board.mission = 'Connect the **waterworks** and build *two* useful projects.';
  node('heater').instruction = 'What happens when **liquid water** is *heated* enough to become vapor?';
  node('heater').options = ['Condensation', '**Evaporation**', 'Collection'];
  node('heater').hints = ['Read the **water-cycle** evidence.', 'Connect the *temperature* change to its process.'];
  node('heater').explanation = '**Heating** produces vapor.\n- Heat makes *evaporation*\n- Cooling makes condensation';
  node('sequence').items = ['**Precipitation**', 'Collection', 'Evaporation', 'Condensation'];
  return board;
}
const has = (html, piece, msg) => expect(html.includes(piece), msg + ' should include ' + piece).toBe(true);
const lacks = (text, piece, msg) => expect(text.includes(piece), msg + ' should not include ' + piece).toBe(false);

beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = window.AlloIcons || {}; window.UiLanguageSelector = () => null;
  window.__alloShared = { db: {}, warnLog() {} };
  window.__alloFirebase = { db: {}, doc: () => ({}), getDoc: vi.fn(), updateDoc: vi.fn(async () => {}) };
  window.__alloHooks = { useFocusTrap() {} };
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
  new Function(readFileSync(resolve(process.env.MD_LB_MODULE || 'lesson_board_module.js'), 'utf8'))();
  api = window.AlloModules;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; sessionStorage.clear(); localStorage.clear(); });
async function mount(Component, props) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Component, props)));
}
const click = async el => { expect(el).toBeTruthy(); await act(async () => { el.click(); await new Promise(r => setTimeout(r, 0)); }); };
const change = async (selector, value) => act(async () => { const el = host.querySelector(selector); expect(el, selector).toBeTruthy(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); });
const solo = board => mount(api.LessonBoardSolo, { board, appId: 'md-test', user: { uid: 'u' }, t, onClose() {} });

describe('Lesson Board AI text', () => {
  it('has the shared formatter and the board loaded', () => {
    expect(typeof api.QuizView?.markdown?.inline).toBe('function');
    expect(typeof api.LessonBoardSolo).toBe('function');
  });

  it('formats the mission, the activity instruction and hints, and keeps <option> text plain', async () => {
    await solo(markdownBoard());
    has(host.innerHTML, '<strong>waterworks</strong>', 'mission');
    has(host.innerHTML, '<em>two</em>', 'mission');
    await click(host.querySelector('[data-board-move="heater"]'));
    const instruction = host.querySelector('.lb-current .lb-instruction') || host.querySelector('.lb-instruction');
    expect(instruction).toBeTruthy();
    has(instruction.innerHTML, '<strong>liquid water</strong>', 'instruction');
    has(instruction.innerHTML, '<em>heated</em>', 'instruction');
    has(host.innerHTML, '<strong>water-cycle</strong>', 'hint');
    const options = [...host.querySelectorAll('[data-board-choice] option')].map(o => o.textContent);
    expect(options).toContain('Evaporation');
    for (const text of options) lacks(text, '*', 'option label');
    lacks(host.textContent, '**', 'rendered board');
  });

  it('formats the explanation as a list after a response is checked', async () => {
    await solo(markdownBoard());
    await click(host.querySelector('[data-board-move="heater"]'));
    await change('[data-board-choice]', '1');
    await click(host.querySelector('[data-board-submit]'));
    const html = host.innerHTML;
    has(html, '<strong>Heating</strong>', 'explanation');
    has(html, '<em>evaporation</em>', 'explanation list item');
    expect(host.querySelector('ul li em')).toBeTruthy();
    has(html, '<strong>Evaporation</strong>', 'solution');
    lacks(host.textContent, '**', 'answer review');
    for (const p of host.querySelectorAll('p')) expect(p.querySelector('p, ul, ol, div'), 'block text must not sit inside <p>').toBe(null);
  });
});

describe('Lesson Board ordering activity', () => {
  it('formats item text but keeps move-button labels plain', async () => {
    const board = markdownBoard(), heater = board.locations.find(n => n.id === 'heater');
    Object.assign(heater, { kind: 'order', items: board.locations.find(n => n.id === 'sequence').items, order: [2, 3, 0, 1] }); delete heater.options; delete heater.answer;
    await solo(board);
    await click(host.querySelector('[data-board-move="heater"]'));
    const order = host.querySelector('.lb-order');
    expect(order).toBeTruthy();
    has(order.innerHTML, '<strong>Precipitation</strong>', 'order item');
    const labels = [...order.querySelectorAll('button[aria-label]')].map(b => b.getAttribute('aria-label'));
    expect(labels.some(l => l.includes('Precipitation')), 'a move label names the item').toBe(true);
    for (const label of labels) lacks(label, '*', 'move label');
  });
});
