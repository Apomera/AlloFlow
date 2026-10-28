// Escape room puzzles are AI-written, so they get the Assess view's light markdown like quiz items:
// on the student's device in a live room (teacher_module) and in teacher-led / solo play
// (escape_room_module). Move and match labels stay plain words.
//
// Mutation check: MD_ESCAPE_MODULE=<pre-change escape_room_module.js> and
// MD_ESCAPE_TEACHER=<pre-change teacher_module.js> make these tests fail.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const t = (key, params = {}) => params.defaultValue || key;
let api, root, host;
const object = { id: 'o1', name: 'Telescope', emoji: '🔭' };
const mcq = { id: 'p1', type: 'mcq', linkedObjectId: 'o1', question: 'Which is **not** a star?', options: ['*Sirius*', 'The Moon'], correctIndex: 1 };
const matching = { id: 'p2', type: 'matching', linkedObjectId: 'o1', question: 'Match the **planets**.', pairs: [{ left: '*Mars*', right: 'Red' }, { left: 'Earth', right: 'Blue' }], leftColumn: ['*Mars*', 'Earth'], rightColumn: ['Blue', 'Red'] };

beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = window.AlloIcons || {}; window.UiLanguageSelector = () => null;
  const write = vi.fn(async () => {});
  window.__alloShared = { db: {}, warnLog() {} };
  window.__alloFirebase = { doc: (_db, ...parts) => parts.join('/'), updateDoc: write };
  window._fbDoc = window.__alloFirebase.doc; window._fbUpdateDoc = write; window.__alloHooks = { useFocusTrap() {} };
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
  new Function(readFileSync(resolve(process.env.MD_ESCAPE_MODULE || 'escape_room_module.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.env.MD_ESCAPE_TEACHER || 'teacher_module.js'), 'utf8'))();
  api = window.AlloModules;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; });
async function mount(Component, props) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Component, props)));
}
const texts = sel => [...host.querySelectorAll(sel)].map(el => el.textContent);

describe('escape room puzzle text', () => {
  it("formats the live room on the student's device", async () => {
    const state = { isActive: true, isPaused: false, startedAt: 100, timerEnabled: false, timeRemaining: 300, room: { theme: 'Sky', description: 'Look up.' }, objects: [object], puzzles: [mcq], teams: { u: 'Red' }, teamProgress: { Red: { progressVersion: 2, maxLives: 3, maxHints: 3, solved: {}, misses: {}, revealedHints: {} } } };
    await mount(api.StudentEscapeRoomOverlay, { sessionData: { escapeRoomState: state }, user: { uid: 'u' }, activeSessionCode: 'LIVE', targetAppId: 'app', t });
    await act(async () => host.querySelector('[data-help-key=escape_room_object]').click());
    expect(host.querySelector('#escape-room-puzzle-question').innerHTML).toBe('Which is <strong>not</strong> a star?');
    expect(texts('em')).toContain('Sirius');
    expect(host.textContent).not.toContain('**');
  });

  it('formats teacher-led and solo play, and matching items', async () => {
    for (const puzzle of [mcq, matching]) {
      function Solo() {
        const [state, setState] = React.useState({ isActive: true, hasStarted: true, room: { theme: 'Sky', description: 'Look up.' }, objects: [object], puzzles: [puzzle], selectedObject: object, solvedPuzzles: new Set(), livesRemaining: 3, hintsRemaining: 3, discoveredClues: {}, hintsUsed: {}, totalPuzzles: 1, matchingPairs: [] });
        return React.createElement(api.EscapeRoomGameplay, { escapeRoomState: state, setEscapeRoomState: setState, escapeTimeLeft: 300, isEscapeTimerRunning: true, handlers: {}, t, soundEnabled: false, setSoundEnabled() {} });
      }
      await mount(Solo, {});
      expect(texts('strong'), puzzle.type).toEqual(expect.arrayContaining([puzzle === mcq ? 'not' : 'planets']));
      expect(texts('em'), puzzle.type).toContain(puzzle === mcq ? 'Sirius' : 'Mars');
      expect(host.textContent).not.toContain('**');
      await act(async () => root.unmount()); host.remove(); root = host = null;
    }
  });
});
