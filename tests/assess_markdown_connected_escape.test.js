// The connected escape room's clues, hints, solutions and debrief are AI-written, so they get the
// Assess view's light markdown (window.AlloModules.QuizView.markdown). Attributes, <option> text and
// interpolated status strings stay plain words.
//
// Mutation check: MD_CER_MODULE=<pre-change connected_escape_room_module.js> makes these tests fail.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as engine from '../connected_escape_room_engine.js';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeRoom } = require('../dev-tools/fixtures/connected_escape_room.cjs');
const t = (key, params = {}) => params.defaultValue || key;
let api, root, host;

// The fixture room with markdown in the AI-written fields.
function markdownRoom() {
  const room = makeRoom(), node = id => room.nodes.find(n => n.id === id);
  node('lens').name = 'The **UV** lens';
  node('lens').instruction = 'Point the **UV lens** at the *faded* wall.';
  node('lens').hints[0] = 'Look for the **brightest** corner.';
  node('device').controls[0].label = '**Chamber A** setting';
  node('device').controls[0].options = ['*Cool*', '**Heat**'];
  node('device').explanation = '**Heat** Chamber A first.\n- Heat *A* to evaporate\n- Cool *B* to condense';
  node('notes').reward.text = 'Water **evaporates** when heated.';
  return room;
}
const session = (room, solved = {}, hints = {}) => {
  const roster = { u: { uid: 'u' } }, state = engine.createSession(room, 'host', roster), progress = state.teamProgress.All.connected[state.attemptId];
  Object.assign(progress.solved, solved); progress.hints = { ...(progress.hints || {}), ...hints };
  return { hostId: 'host', roster, escapeRoomState: state };
};
const allSolved = room => Object.fromEntries(room.nodes.map(n => [n.id, true]));
const base = { appId: 'app', targetAppId: 'app', activeSessionCode: 'ROOM', user: { uid: 'u' }, t };
const has = (html, piece, msg) => expect(html.includes(piece), msg + ' should include ' + piece).toBe(true);

beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = window.AlloIcons || {}; window.UiLanguageSelector = () => null;
  window.__alloShared = { db: {}, warnLog() {} };
  window.__alloFirebase = { db: {}, doc: (_db, ...parts) => parts.join('/'), updateDoc: vi.fn(async () => {}) };
  window.__alloHooks = { useFocusTrap() {} };
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
  new Function(readFileSync(resolve(process.env.MD_CER_MODULE || 'connected_escape_room_module.js'), 'utf8'))();
  api = window.AlloModules;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; sessionStorage.clear(); localStorage.clear(); });
async function mount(Component, props) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Component, props)));
}
const click = async el => { expect(el).toBeTruthy(); await act(async () => el.click()); };

describe('connected escape room AI text', () => {
  it('has the shared formatter loaded', () => {
    expect(typeof api.QuizView?.markdown?.inline).toBe('function');
    expect(typeof api.ConnectedEscapeRoomStudent).toBe('function');
  });

  it('formats the student clue, instruction, hint and evidence; keeps labels and options plain', async () => {
    const room = markdownRoom();
    await mount(api.ConnectedEscapeRoomStudent, { ...base, sessionData: session(room, { notes: true }, { lens: { h1: true } }) });
    const panel = host.querySelector('section.cer-panel'), html = panel.innerHTML;
    expect(panel.getAttribute('aria-label')).toBe('The UV lens');
    has(panel.querySelector('h3').innerHTML, '<strong>UV</strong>', 'object heading');
    has(html, '<strong>UV lens</strong>', 'instruction');
    has(html, '<em>faded</em>', 'instruction');
    has(html, '<strong>brightest</strong>', 'shared hint');
    has(host.querySelector('[data-object="lens"]').innerHTML, '<strong>UV</strong>', 'object button');
    has(host.querySelector('.cer-journal').innerHTML, '<strong>evaporates</strong>', 'journal evidence');
    await click(host.querySelector('[data-object="device"]'));
    const control = host.querySelector('.cer-controls label');
    has(control.innerHTML, '<strong>Chamber A</strong>', 'control label');
    expect([...control.querySelectorAll('option')].slice(1).map(o => o.textContent)).toEqual(['Cool', 'Heat']);
    expect(host.textContent.includes('**'), 'no raw ** in the student room').toBe(false);
  });

  it('formats the debrief explanation as a block with a real list', async () => {
    const room = markdownRoom();
    await mount(api.ConnectedEscapeRoomStudent, { ...base, sessionData: session(room, allSolved(room)) });
    const object = host.querySelector('[data-debrief-object="device"]');
    expect(object).toBeTruthy();
    has(object.innerHTML, '<strong>Heat</strong>', 'debrief explanation');
    expect(object.querySelectorAll('li').length).toBe(2);
    has(object.querySelector('li').innerHTML, '<em>A</em>', 'debrief list item');
    expect(object.querySelector('p ul, p div'), 'block text must not sit inside a <p>').toBeNull();
    expect(host.querySelector('[data-revisit-object="lens"]').textContent, 'revisit button stays plain').toBe('Revisit The UV lens');
    expect(host.textContent.includes('**'), 'no raw ** in the debrief').toBe(false);
  });

  it('formats teacher solutions and support previews; picker options stay plain', async () => {
    const room = markdownRoom();
    await mount(api.ConnectedEscapeRoomTeacher, { ...base, sessionData: session(room, {}, { lens: { h1: true } }) });
    const solutions = [...host.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent === 'Teacher clues and solutions');
    expect(solutions).toBeTruthy();
    has(solutions.innerHTML, '<strong>UV lens</strong>', 'teacher instruction');
    has(solutions.innerHTML, '<strong>Heat</strong>', 'teacher solution');
    expect(solutions.querySelectorAll('ul li').length).toBe(2);
    expect(solutions.querySelector('p ul, p div'), 'solution block must not sit inside a <p>').toBeNull();
    const support = host.querySelector('[data-teacher-support]'), picker = support.querySelector('[data-support-picker]');
    expect([...picker.options].map(o => o.textContent).includes('The UV lens'), 'support picker option is plain').toBe(true);
    await act(async () => { picker.value = 'lens'; picker.dispatchEvent(new Event('change', { bubbles: true })); });
    has(support.innerHTML, '<em>faded</em>', 'support instruction');
    expect(host.textContent.includes('**'), 'no raw ** in the teacher view').toBe(false);
  });
});
