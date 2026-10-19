import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import * as e from '../lesson_board_engine.js';
import { splitAnswers, withPrivateAnswers, withOwnAnswer } from '../lesson_board_private.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const SESSION = 'artifacts/app/public/data/sessions/ROOM';
// Store changes mark the views stale; settle() re-renders them inside one awaited act().
const view = { draws: [], dirty: false };
const settle = () => act(async () => { for (let i = 0; i < 8; i++) { await new Promise(resolve => setTimeout(resolve, 0)); if (view.dirty) { view.dirty = false; view.draws.forEach(draw => draw()); } } });

// In-memory stand-in for the Firestore calls the board uses. `published` mimics whether the
// private-answer rules are live; without them every private path is refused like the real rules.
function fakeFirestore(published) {
  const docs = new Map(), listeners = new Set(), calls = [];
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const denied = () => Object.assign(Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const privatePath = path => /\/(boardAnswers|boardHost)(\/|$)/.test(path);
  const notify = () => listeners.forEach(listener => listener());
  const setPath = (target, path, value) => { const keys = path.split('.'); let at = target; for (const key of keys.slice(0, -1)) at = at[key] = at[key] && typeof at[key] === 'object' ? at[key] : {}; at[keys.at(-1)] = value; };
  const deepMerge = (target, source) => { for (const [key, value] of Object.entries(source)) { if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object') deepMerge(target[key], value); else target[key] = clone(value); } return target; };
  const fb = {
    db: {}, calls, docs,
    doc: (_, ...parts) => ({ path: parts.join('/') }),
    collection: (_, ...parts) => ({ collectionPath: parts.join('/') }),
    getDoc: async ref => { if (privatePath(ref.path) && !published.value) throw denied(); return { exists: () => docs.has(ref.path), data: () => clone(docs.get(ref.path)) }; },
    getDocs: async coll => { if (!published.value) throw denied(); const items = [...docs.entries()].filter(([path]) => path.startsWith(coll.collectionPath + '/')); return { forEach: fn => items.forEach(([path, data]) => fn({ id: path.split('/').pop(), data: () => clone(data) })) }; },
    setDoc: async (ref, data, options) => { calls.push(['setDoc', ref.path, clone(data)]); if (privatePath(ref.path) && !published.value) throw denied(); if (/boardAnswers/.test(ref.path) && docs.get(SESSION)?.escapeRoomState?.privateAnswers !== true) throw denied(); docs.set(ref.path, options?.merge ? deepMerge(clone(docs.get(ref.path)) || {}, data) : clone(data)); notify(); },
    updateDoc: async (ref, patch) => { calls.push(['updateDoc', ref.path, clone(patch)]); const data = clone(docs.get(ref.path)); for (const [path, value] of Object.entries(patch)) setPath(data, path, clone(value)); docs.set(ref.path, data); notify(); },
    deleteDoc: async ref => { calls.push(['deleteDoc', ref.path]); if (privatePath(ref.path) && !published.value) throw denied(); docs.delete(ref.path); notify(); },
    runTransaction: async (_, fn) => fn({ get: async ref => ({ data: () => clone(docs.get(ref.path)) }), update: (ref, patch) => fb.updateDoc(ref, patch) }),
    onSnapshot: (target, next, error) => {
      const fire = () => {
        if ((target.collectionPath || privatePath(target.path || '')) && !published.value) { error?.(denied()); return; }
        if (target.collectionPath) { const items = [...docs.entries()].filter(([path]) => path.startsWith(target.collectionPath + '/')); next({ forEach: fn => items.forEach(([path, data]) => fn({ id: path.split('/').pop(), data: () => clone(data) })) }); }
        else next({ exists: () => docs.has(target.path), data: () => clone(docs.get(target.path)) });
      };
      listeners.add(fire); fire(); return () => listeners.delete(fire);
    },
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }
  };
  return fb;
}

describe('Private answer helpers', () => {
  it('moves answer contents out of a host patch and fills them back for the teacher only', () => {
    const { shared, values } = splitAnswers({ 'steps.t2.answers.u': { value: '1', correct: true }, 'steps.t2.seen.u': { requestId: 'a', code: 'answer-recorded' }, 'steps.t2.responseRounds.r1.answers.v': { value: '0', correct: false } });
    expect(shared).toEqual({ 'steps.t2.answers.u': { received: true }, 'steps.t2.seen.u': { requestId: 'a', code: 'answer-recorded' }, 'steps.t2.responseRounds.r1.answers.v': { received: true } });
    expect(values).toEqual({ t2r0: { u: { value: '1', correct: true } }, t2r1: { v: { value: '0', correct: false } } });
    const run = { turn: 0, steps: { t0: { phase: 'answer', targetId: 'heater', answers: { u: { received: true } }, seen: { u: { requestId: 'a' } } } } };
    expect(e.stepOf(withPrivateAnswers(run, { answers: { t0r0: { u: { value: '1', correct: true } } } })).answers.u).toEqual({ value: '1', correct: true });
    expect(e.stepOf(withOwnAnswer(run, 'u', { requestId: 'a', value: '1' })).answers.u.value).toBe('1');
    expect(e.stepOf(withOwnAnswer(run, 'u', { requestId: 'other', value: '1' })).answers.u).toEqual({ received: true });
  });
});

describe('Live board with private answers on Firestore', () => {
  let roots = [];
  beforeAll(() => { window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t: key => key }); window.__alloShared = { db: {}, warnLog() {} }; window.__alloFirebase = {}; loadAlloModule('lesson_board_module.js'); });
  afterEach(async () => { for (const [root, host] of roots) { await act(async () => root.unmount()); host.remove(); } roots = []; view.draws = []; view.dirty = false; sessionStorage.clear(); localStorage.clear(); });
  // Mounts the teacher (with its host) and a student against the fake store, re-rendering on every change.
  async function classroom(published) {
    const fb = fakeFirestore(published); window.__alloFirebase = fb;
    const roster = { u: { name: 'Rowan' }, v: { name: 'Sky' } }, state = e.createSession(makeBoard(), 'teacher', roster);
    let run = e.runOf(state); run = e.merge(run, e.begin(state.board, run, 'heater')); state.teamProgress.All.boardRuns[state.attemptId] = run; state.teams = { u: 'All', v: 'All' };
    fb.docs.set(SESSION, { hostId: 'teacher', roster, escapeRoomState: state });
    const mount = async (Component, props) => {
      const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push([root, host]);
      const draw = () => root.render(React.createElement(Component, { sessionData: JSON.parse(JSON.stringify(fb.docs.get(SESSION))), t: key => key, ...props }));
      view.draws.push(draw); fb.subscribe(() => { view.dirty = true; }); await act(async () => draw()); await settle(); return host;
    };
    const teacher = await mount(window.AlloModules.LessonBoardTeacher, { appId: 'app', activeSessionCode: 'ROOM', user: { uid: 'teacher' } });
    const student = await mount(window.AlloModules.LessonBoardStudent, { user: { uid: 'u' }, targetAppId: 'app', activeSessionCode: 'ROOM' });
    await settle();
    return { fb, teacher, student, attemptId: state.attemptId, data: () => fb.docs.get(SESSION) };
  }
  const answer = async (student, value) => { const select = student.querySelector('[data-board-choice]'); await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); await act(async () => student.querySelector('[data-board-submit]').click()); await settle(); await settle(); };

  it('keeps answers in the shared slot when the private rules are not published', async () => {
    const room = await classroom({ value: false });
    expect(room.data().escapeRoomState.privateAnswers).toBeUndefined();
    await answer(room.student, '1');
    const step = e.stepOf(e.runOf(room.data().escapeRoomState));
    expect(room.data().escapeRoomState.teamProgress.All.boardActions.u.value).toBe('1');
    expect(step.answers.u).toEqual({ value: '1', correct: true });
  });
  it('sends answers privately, shares only receipts and grades from the teacher-only values', async () => {
    const room = await classroom({ value: true });
    expect(room.data().escapeRoomState.privateAnswers).toBe(true);
    await answer(room.student, '1');
    const shared = room.data().escapeRoomState, step = e.stepOf(e.runOf(shared));
    expect(shared.teamProgress.All.boardActions.u).toBeUndefined();
    expect(room.fb.docs.get(SESSION + '/boardAnswers/u')).toMatchObject({ kind: 'answer', value: '1' });
    expect(step.answers.u).toEqual({ received: true }); expect(step.seen.u.code).toBe('answer-recorded');
    expect(JSON.stringify(shared)).not.toContain('"correct":true');
    expect(room.fb.docs.get(SESSION + '/boardHost/' + room.attemptId).answers.t0r0.u).toEqual({ value: '1', correct: true });
    expect(room.student.querySelector('[data-board-answered], .lb-current')?.textContent || room.student.textContent).not.toContain('undefined');
    await act(async () => room.teacher.querySelector('[data-board-resolve]').click());
    await act(async () => [...room.teacher.querySelectorAll('button')].find(button => button.textContent === 'Resolve received responses').click()); await settle(); await settle();
    const resolved = e.stepOf(e.runOf(room.data().escapeRoomState));
    expect(resolved.result.marks).toEqual({ u: true }); expect(resolved.result.success).toBe(true);
    expect(room.student.querySelector('[data-board-answer-review]').textContent).toContain('Your response: Evaporation');
  });
  it('refuses to resolve while the teacher-only values are missing', async () => {
    const room = await classroom({ value: true });
    await answer(room.student, '1');
    room.fb.docs.set(SESSION + '/boardHost/' + room.attemptId, { attemptId: room.attemptId, ready: true, answers: {} });
    await act(async () => room.teacher.querySelector('[data-board-resolve]').click());
    await act(async () => [...room.teacher.querySelectorAll('button')].find(button => button.textContent === 'Resolve received responses').click()); await settle(); await settle();
    expect(e.stepOf(e.runOf(room.data().escapeRoomState)).result).toBeUndefined();
    expect(room.teacher.textContent).toContain('Some responses are still loading');
  });
  it('removes the private answer documents when the teacher ends the board', async () => {
    const room = await classroom({ value: true });
    await answer(room.student, '1');
    expect(room.fb.docs.has(SESSION + '/boardAnswers/u')).toBe(true);
    const button = text => [...room.teacher.querySelectorAll('button')].find(item => item.textContent === text);
    await act(async () => button('End board').click()); await act(async () => button('End for everyone').click()); await settle(); await settle();
    expect(room.data().escapeRoomState.isGameOver).toBe(true);
    expect(room.fb.docs.has(SESSION + '/boardAnswers/u')).toBe(false); expect(room.fb.docs.has(SESSION + '/boardHost/' + room.attemptId)).toBe(false);
  });
  it('falls back to the shared slot if the private write is refused mid-session', async () => {
    const published = { value: true }, room = await classroom(published);
    expect(room.data().escapeRoomState.privateAnswers).toBe(true);
    published.value = false; room.fb.calls.length = 0;
    await answer(room.student, '0');
    expect(room.fb.calls.some(([kind, path]) => kind === 'setDoc' && path.endsWith('/boardAnswers/u'))).toBe(true);
    expect(room.data().escapeRoomState.teamProgress.All.boardActions.u).toMatchObject({ kind: 'answer', value: '0' });
  });
});
