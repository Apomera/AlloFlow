import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import * as e from '../lesson_board_engine.js';
import { recordResponses, recordReveal, readResponses, responseStoreKey } from '../lesson_board_responses.js';
import { learningReport, reportCSV } from '../lesson_board_results.js';
import { addBoardStyle } from '../lesson_board_style.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const board = e.prepareBoard(makeBoard(), source), context = { appId: 'insights', owner: 'teacher', attemptId: 'game-1' };
// heater: a first miss ('0' = Condensation), then a correct retry ('1' = Evaporation).
function missedThenCorrect() {
  let run = e.merge(e.emptyRun(), e.begin(board, e.emptyRun(), 'heater'));
  e.stepOf(run).answers.solo = { value: '0', correct: false }; run = e.merge(run, e.resolve(board, run, { solo: {} }));
  run = e.merge(run, e.retry(board, run)); e.stepOf(run).answers.solo = { value: '1', correct: true }; return e.merge(run, e.resolve(board, run, { solo: {} }));
}
afterEach(() => { localStorage.clear(); });

describe('Recorded responses and reveals', () => {
  it('keeps each learner first and latest response and the most recent 20 games', () => {
    recordResponses(localStorage, context, 'heater', { a: '0', b: '1' }); recordResponses(localStorage, context, 'heater', { a: '1', c: 'x'.repeat(65) }); recordReveal(localStorage, context, 'heater', '*');
    expect(readResponses(localStorage, context)).toEqual({ heater: { a: { first: '0', latest: '1' }, b: { first: '1', latest: '1' }, '*': { revealed: true } } });
    for (let index = 0; index < 25; index++) recordResponses(localStorage, { ...context, attemptId: 'game-' + (index + 2) }, 'heater', { a: '1' });
    expect(Object.keys(JSON.parse(localStorage.getItem(responseStoreKey('insights', 'teacher'))).games)).toHaveLength(20);
    expect(readResponses(localStorage, { ...context, attemptId: 'missing' })).toEqual({});
  });
  it('reports chosen responses and treats a correct retry after a shown answer as assisted', () => {
    const run = missedThenCorrect(), roster = { solo: { name: 'Rowan' } };
    const plain = learningReport(board, run, roster, { ...context, responses: { heater: { solo: { first: '0', latest: '1' } } } }).learners[0];
    expect(plain.locations[0]).toMatchObject({ firstResponse: 'Condensation', latestResponse: 'Evaporation', improved: true }); expect(plain.locations[0].assisted).toBeUndefined();
    expect(plain.practice.find(item => item.id === 'heater').reason).toBe('strengthen');
    const assisted = learningReport(board, run, roster, { ...context, responses: { heater: { solo: { first: '0', latest: '1', revealed: true } } } });
    expect(assisted.learners[0].locations[0]).toMatchObject({ assisted: true, improved: false }); expect(assisted.learners[0].assistedCount).toBe(1);
    expect(assisted.learners[0].practice.find(item => item.id === 'heater').reason).toBe('revisit');
    const classwide = learningReport(board, run, roster, { ...context, responses: { heater: { '*': { revealed: true } } } });
    expect(classwide.learners[0].locations[0].assisted).toBe(true);
    const csv = reportCSV(assisted);
    expect(csv.split('\r\n')[0]).toContain('First response'); expect(csv).toContain('Condensation'); expect(csv.split('\r\n')[1].endsWith(',"true"')).toBe(true);
  });
});

describe('Teacher views of responses', () => {
  let UI, root, element;
  const render = async (Component, props) => { element = document.createElement('div'); document.body.appendChild(element); root = createRoot(element); await act(async () => root.render(React.createElement(Component, { t: key => key, ...props }))); };
  beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; const bundle = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({ stdin: { contents: \"export { MoveRecap } from './lesson_board_play_extras.jsx'; export { ReportPreview, ConceptReview } from './lesson_board_followthrough.jsx';\", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'InsightUI', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).outputFiles[0].text)"], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); UI = new Function(bundle + ';return InsightUI;')(); }, 60000);
  afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; });
  it('shows the class response spread, marking the key only once it is shown', async () => {
    const roster = { a: {}, b: {}, c: {} }; let run = e.merge(e.emptyRun(), e.begin(board, e.emptyRun(), 'heater'));
    Object.assign(e.stepOf(run).answers, { a: { value: '0' }, b: { value: '0' }, c: { value: '1' } }); run = e.merge(run, e.resolve(board, run, roster));
    await render(UI.MoveRecap, { board, run, role: 'teacher', uid: 'teacher' });
    const spread = element.querySelector('[data-board-response-spread]');
    expect(spread.textContent).toContain('Condensation: 2'); expect(spread.textContent).toContain('Evaporation: 1'); expect(spread.querySelector('[data-response-correct]')).toBeNull();
    await act(async () => root.unmount()); element.remove();
    const won = e.merge(e.merge(e.emptyRun(), e.begin(board, e.emptyRun(), 'heater')), {}); Object.assign(e.stepOf(won).answers, { a: { value: '1' }, b: { value: '1' }, c: { value: '0' } });
    await render(UI.MoveRecap, { board, run: e.merge(won, e.resolve(board, won, roster)), role: 'teacher', uid: 'teacher' });
    expect(element.querySelector('[data-response-correct="true"]').textContent).toContain('Evaporation: 2');
  });
  it('reports opening the shown answer so a later retry counts as assisted', async () => {
    let run = e.merge(e.emptyRun(), e.begin(board, e.emptyRun(), 'heater')); e.stepOf(run).answers.solo = { value: '0' }; run = e.merge(run, e.resolve(board, run, { solo: {} }));
    const onReveal = vi.fn(); await render(UI.MoveRecap, { board, run, role: 'solo', uid: 'solo', onReveal });
    const details = element.querySelector('details[data-board-reveal]'); details.open = true; await act(async () => details.dispatchEvent(new Event('toggle')));
    expect(onReveal).toHaveBeenCalledWith('heater');
  });
  it('lists missed first responses and flags concepts resting on one activity', async () => {
    const report = learningReport(board, missedThenCorrect(), { solo: { name: 'Rowan' } }, { ...context, responses: { heater: { solo: { first: '0', latest: '1' } } } });
    await render(UI.ReportPreview, { report });
    expect(element.querySelector('[data-response-patterns]').textContent).toContain('Heating station: Condensation (1)');
    expect(element.querySelector('[data-concept-priority="temperature"] [data-concept-thin]').textContent).toContain('1 learner has only one answered activity');
  });
});

describe('Live recording, busy retries, cached replays and shared styles', () => {
  it('records the class answers on the teacher device when an activity resolves', async () => {
    window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t: key => key });
    const read = vi.fn(), write = vi.fn(); window.__alloFirebase = { db: {}, doc: (_, ...parts) => parts.join('/'), getDoc: read, updateDoc: write }; window.__alloShared = { db: {}, warnLog() {} }; loadAlloModule('lesson_board_module.js');
    const roster = { a: { name: 'A' }, b: { name: 'B' } }, data = { hostId: 'teacher', roster, escapeRoomState: e.createSession(makeBoard(), 'teacher', roster) }, state = data.escapeRoomState;
    let run = e.merge(e.runOf(state), e.begin(state.board, e.runOf(state), 'heater'));
    for (const [uid, value] of [['a', '0'], ['b', '1']]) run = e.merge(run, e.processAction(state.board, run, { attemptId: state.attemptId, turn: run.turn, requestId: e.requestId(run, 'answer'), kind: 'answer', targetId: 'heater', value }, uid, { attemptId: state.attemptId, active: true }));
    state.teamProgress.All.boardRuns[state.attemptId] = run; read.mockResolvedValue({ data: () => data }); write.mockResolvedValue(undefined);
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.LessonBoardTeacher, { sessionData: data, appId: 'insights', activeSessionCode: 'ROOM', user: { uid: 'teacher' }, t: key => key })));
    await act(async () => { host.querySelector('[data-board-resolve]').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(write).toHaveBeenCalledTimes(1);
    expect(readResponses(localStorage, { appId: 'insights', owner: 'teacher', attemptId: state.attemptId })).toEqual({ heater: { a: { first: '0', latest: '0' }, b: { first: '1', latest: '1' } } });
    await act(async () => root.unmount()); host.remove();
  });
  it('retries a busy Mailbox board six times before asking the teacher to try again', async () => {
    const text = readFileSync('AlloFlowANTI.txt', 'utf8'), start = text.indexOf('async function _alloLessonBoardConditionalUpdate('), end = text.indexOf('function _applyMbSessionAdapter()', start);
    const call = vi.fn(async request => { if (request.a === 'dget') return { docs: [{ p: 's', w: 1, d: {} }] }; const error = Error('conflict'); error.code = 'allo/mailbox-conflict'; throw error; });
    const bridge = { isTeacher: true, code: 'BOARD' }, write = new Function('_alloMbBridgeState', '_alloMbDocCall', '_alloMbStoreAndFire', '_alloMbSendNudge', text.slice(start, end) + '; return _alloLessonBoardConditionalUpdate;')(bridge, call, vi.fn(), vi.fn());
    await expect(write({ __alloMbRef: 'session', code: 'BOARD', p: 's' }, () => ({ 'escapeRoomState.isPaused': true }))).rejects.toThrow('The live board is busy');
    expect(call.mock.calls.filter(([request]) => request.a === 'dpatch')).toHaveLength(6);
  }, 20000);
  it('reuses frozen replays and recomputes after steps change in place', () => {
    const run = missedThenCorrect(), first = e.derive(board, run);
    expect(e.derive(board, run)).toBe(first); expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(first.balance)).toBe(true);
    expect(() => { 'use strict'; first.balance[0] = 99; }).toThrow();
    const copy = structuredClone(run); copy.steps.t0.result.success = false;
    expect(e.derive(board, copy).visited).toEqual([]);
    copy.steps.t0.result.success = true; expect(e.derive(board, copy).visited).toEqual(['heater']);
  });
  it('adds each board style block to the page once and restores it if removed', () => {
    const css = '.lb .probe-style{color:red}', count = () => [...document.head.querySelectorAll('style')].filter(node => node.textContent === css).length;
    addBoardStyle(css); addBoardStyle(css); expect(count()).toBe(1);
    document.head.querySelector('style[data-lesson-board-style]:last-of-type').remove(); expect(count()).toBe(0);
    addBoardStyle(css); expect(count()).toBe(1);
  });
});
