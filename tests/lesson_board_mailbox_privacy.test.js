import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import * as e from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const mailbox = {}; require('node:vm').runInNewContext(readFileSync('apps_script/session_mailbox/Code.gs', 'utf8'), mailbox);

// A live board where learners u and v have answered, been resolved, and moved on once.
function session() {
  const roster = { u: { name: 'Rowan' }, v: { name: 'Sky' } }, state = e.createSession(makeBoard(), 'host', roster), board = state.board;
  let run = e.runOf(state);
  const answer = (run, uid, value) => e.merge(run, e.processAction(board, run, { attemptId: state.attemptId, turn: run.turn, requestId: e.requestId(run, 'answer'), kind: 'answer', targetId: e.stepOf(run).targetId, value }, uid, { attemptId: state.attemptId, active: true }));
  run = e.merge(run, e.begin(board, run, 'heater')); run = answer(answer(run, 'u', '1'), 'v', '0'); run = e.merge(run, e.resolve(board, run, roster, { dice: [3, 4] }));
  run = e.merge(run, e.compactAdvance(board, run)); run = e.merge(run, e.begin(board, run, 'river')); run = answer(answer(run, 'u', '1'), 'v', '0');
  state.teamProgress.All.boardRuns[state.attemptId] = run;
  state.teamProgress.All.boardActions = { u: { kind: 'answer', value: '1' }, v: { kind: 'answer', value: '0' } };
  state.teamProgress.All.connectedActions = { v: { kind: 'clue', value: 'secret' } }; state.teamProgress.All.questActions = { u: { answerIndex: 2 }, v: { answerIndex: 1 } };
  return { hostId: 'host', roster, escapeRoomState: state };
}

describe('Class Mailbox participant privacy', () => {
  it('shows a learner only their own pending answers, receipts and results', () => {
    const data = session(), before = JSON.stringify(data), view = mailbox.projectSessionForParticipant(data, 'u'), all = view.escapeRoomState.teamProgress.All, run = all.boardRuns[data.escapeRoomState.attemptId];
    expect(JSON.stringify(data)).toBe(before);
    expect(Object.keys(all.boardActions)).toEqual(['u']); expect(all.connectedActions).toEqual({}); expect(Object.keys(all.questActions)).toEqual(['u']);
    expect(Object.keys(run.steps.t1.answers)).toEqual(['u']); expect(Object.keys(run.steps.t1.seen)).toEqual(['u']);
    const index = run.members.indexOf('u'), mk = run.steps.t0.result.mk;
    expect(mk[index]).toBe('1'); expect([...mk].every((code, at) => at === index || code === '-')).toBe(true);
    expect(run.steps.t0.result.success).toBe(true); expect(run.members).toEqual(data.escapeRoomState.teamProgress.All.boardRuns[data.escapeRoomState.attemptId].members);
    expect(JSON.stringify(view)).not.toContain('secret');
  });
  it('hides retry records and uncompacted marks of other learners', () => {
    const data = session(), run = data.escapeRoomState.teamProgress.All.boardRuns[data.escapeRoomState.attemptId];
    run.steps.t1 = { ...run.steps.t1, retryRound: 1, retryStats: { u: { answered: 1 }, v: { answered: 1 } }, responseRounds: { r1: { answers: { u: { value: '1' }, v: { value: '0' } }, seen: { u: {}, v: {} } } }, result: { success: false, marks: { u: true, v: false }, attempts: { u: {}, v: {} }, ak: '1.1.1.1,1.0.0.0' } };
    const step = mailbox.projectSessionForParticipant(data, 'v').escapeRoomState.teamProgress.All.boardRuns[data.escapeRoomState.attemptId].steps.t1, own = run.members.indexOf('v');
    expect(Object.keys(step.retryStats)).toEqual(['v']); expect(Object.keys(step.responseRounds.r1.answers)).toEqual(['v']); expect(Object.keys(step.result.marks)).toEqual(['v']); expect(Object.keys(step.result.attempts)).toEqual(['v']);
    expect(step.result.ak.split(',').filter(Boolean)).toEqual([['1.1.1.1', '1.0.0.0'][own]]);
  });
});

describe('Student board on a redacted Mailbox view', () => {
  let root, host;
  beforeAll(() => { window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t: key => key }); window.__alloFirebase = { db: {}, doc: () => ({}), getDoc: async () => ({ data: () => ({}) }), updateDoc: async () => {} }; window.__alloShared = { db: {}, warnLog() {} }; loadAlloModule('lesson_board_module.js'); });
  afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; sessionStorage.clear(); localStorage.clear(); });
  it('still shows the learner their own confirmed answer and earlier result', async () => {
    const view = mailbox.projectSessionForParticipant(session(), 'u');
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.LessonBoardStudent, { sessionData: view, user: { uid: 'u' }, targetAppId: 'app', activeSessionCode: 'ROOM', t: key => key })));
    expect(host.querySelector('[data-board-play]')).toBeTruthy();
    expect(host.textContent).not.toContain('Something went wrong');
    expect(host.querySelector('[data-board-current-response], [data-board-pending], .lb-current')).toBeTruthy();
  });
});
