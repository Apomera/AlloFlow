import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import * as e from '../lesson_board_engine.js';
import { healBoard } from '../lesson_board_heal.js';
import * as q from '../lesson_board_quality.js';
import { fundableTogether } from '../lesson_board_funding.js';
import { learningSummary } from '../lesson_board_insights.js';
import { rolesConfig } from '../lesson_board_roles.js';
import { learningReport, readReports } from '../lesson_board_results.js';
import { makeWaterworksBoard, WATERWORKS_SOURCE } from '../lesson_board_demo.js';
import { getPuzzle } from './fixtures/lesson_board_puzzles.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;

// Regression checks for the 2026-10-16 Lesson Board review fixes.
describe('Board generation integrity', () => {
  it('never guesses an unreadable answer key, so repair or salvage handles the stop', () => {
    const named = makeBoard(); named.locations[0].answer = 'Boiling';
    const healed = healBoard(named, source).board;
    expect(healed.locations[0].answer).toBe(-1);
    expect(e.validateBoard(healed, source)).toContain('Invalid choice activity: heater');
    const lettered = makeBoard(); lettered.locations[0].answer = 'b';
    expect(healBoard(lettered, source).board.locations[0].answer).toBe(1);
    const crowded = makeBoard(); crowded.locations[0].options = ['Freezing', 'Melting', 'Boiling', 'Rusting', 'Glowing', 'Sinking']; crowded.locations[0].answer = 'Evaporation';
    const trimmed = healBoard(crowded, source).board.locations[0];
    expect(trimmed.options).toHaveLength(5); expect(trimmed.options.every(option => typeof option === 'string' && option)).toBe(true); expect(trimmed.answer).toBe(-1);
    const control = makeBoard(); control.locations[1].controls[0].answer = 'Warm';
    expect(e.validateBoard(healBoard(control, source).board, source)).toContain('Invalid settings activity: cloud');
  });
  it('flags instructions that give the answer away and spreads choices but not number scales', () => {
    const board = e.prepareBoard(makeBoard(), source);
    expect(q.answerInInstruction(board.locations.find(node => node.id === 'sequence'))).toBe(true);
    expect(q.answerInInstruction({ kind: 'choice', instruction: 'Which process turns liquid water into vapor?', options: ['Freezing', 'Condensation', 'Evaporation'], answer: 2 })).toBe(false);
    expect(q.answerInInstruction({ kind: 'choice', instruction: 'Collection gathers water in lakes. Which process gathers water?', options: ['Freezing', 'Collection', 'Evaporation'], answer: 1 })).toBe(true);
    expect(q.boardQuality(board, source).find(item => item.code === 'giveaway').stops).toEqual(['sequence']);
    const scale = { ...board, locations: board.locations.map(node => node.kind === 'choice' ? { ...node, options: ['1 metre', '2 metres', '4 metres'], answer: 2 } : node) };
    expect(q.balanceAnswerPositions(scale)).toEqual(scale);
    expect(e.promptFor(source)).toContain('must not name the items or which comes first or last');
  });
  it('ships a sample board whose stops explain, hint and instruct without giving answers away', () => {
    const board = makeWaterworksBoard();
    expect(e.validateBoard(board, WATERWORKS_SOURCE)).toEqual([]);
    expect(board.locations.filter(node => node.explanation.trim() === node.sourceQuote.trim())).toEqual([]);
    expect(new Set(board.locations.map(node => JSON.stringify(node.hints))).size).toBe(board.locations.length);
    expect(q.boardQuality(board, WATERWORKS_SOURCE).filter(item => item.code === 'giveaway')).toEqual([]);
    expect(makeWaterworksBoard().locations[0].hints).not.toBe(board.locations[0].hints);
  });
});

describe('Tabletop completion reserve', () => {
  it('blocks a printed-cost build that would strand the mission and allows a safe exchange build', () => {
    const raw = makeBoard();
    [[1, 1], [1, 1], [1, 1], [1, 1], [1, 0], [1, 0], [0, 1], [0, 1]].forEach((reward, index) => { raw.locations[index].reward = reward; });
    raw.projects[0].cost = [3, 3]; raw.projects[1].cost = [2, 1]; raw.projects[2].cost = [1, 2];
    const board = e.prepareBoard({ ...raw, playStyle: 'tabletop', goal: 'expedition' }, source);
    let run = e.emptyRun();
    const move = (id, funding = 'standard') => {
      if (e.stepOf(run).phase === 'review') run = e.merge(run, e.advance(board, run));
      run = e.merge(run, e.begin(board, run, id, funding));
      if (e.stepOf(run).phase === 'answer') {
        const node = board.locations.find(item => item.id === id);
        run = e.merge(run, e.processAction(board, run, { attemptId: 'qa', turn: run.turn, requestId: e.requestId(run), kind: 'answer', targetId: id, value: e.solution(node) }, 'solo', { attemptId: 'qa', active: true }));
        run = e.merge(run, e.resolve(board, run, { solo: {} }));
      }
    };
    for (const id of ['heater', 'cloud', 'river', 'lake', 'rain', 'sequence', 'cooler', 'weather']) move(id);
    move('cloud');
    expect(e.constructionFunding(board, run, 'network').find(option => option.id === 'build').legal).toBe(true);
    move('network', 'research'); move('heater');
    const research = Object.fromEntries(e.constructionFunding(board, run, 'research').map(option => [option.id, option]));
    expect(research.standard).toMatchObject({ affordable: true, legal: false, reason: 'completion-reserve' });
    expect(e.constructionFunding(board, run, 'bridge').some(option => option.legal)).toBe(true);
  });
  it('counts later exchange funding only on tabletop boards', () => {
    expect(fundableTogether({ playStyle: 'tabletop' }, [{ cost: [3, 3] }], [2, 5])).toBe(true);
    expect(fundableTogether({}, [{ cost: [3, 3] }], [2, 5])).toBe(false);
    expect(fundableTogether({ playStyle: 'tabletop' }, [{ cost: [3, 3] }, { cost: [2, 2] }], [5, 4])).toBe(false);
    expect(fundableTogether({ playStyle: 'tabletop' }, [], [0, 0])).toBe(true);
  });
});

describe('Compact live session records', () => {
  const board = e.prepareBoard(makeBoard(), source), roster = Object.fromEntries(Array.from({ length: 30 }, (_, index) => ['learner_' + String(index).padStart(2, '0') + '_k7Qm2x9Lp4Rt8Vw', { name: 'Learner ' + index }]));
  const answerAll = (run, id, correctFor, people = roster) => {
    const node = board.locations.find(item => item.id === id), right = e.solution(node), wrong = right.split(',').map(value => value === '0' ? '1' : '0').join(',');
    let next = e.stepOf(run).phase === 'answer' ? run : e.merge(run, e.begin(board, run, id));
    Object.keys(people).forEach((uid, index) => { next = e.merge(next, e.processAction(board, next, { attemptId: 'live', turn: next.turn, requestId: e.requestId(next, 'answer'), kind: 'answer', targetId: id, value: correctFor(index) ? right : wrong }, uid, { attemptId: 'live', active: true })); });
    return e.merge(next, e.resolve(board, next, people));
  };
  it('keeps identical learning evidence while shrinking each finished move', () => {
    const first = answerAll(e.emptyRun(), 'heater', index => index % 3 !== 0);
    const plain = e.merge(first, e.advance(board, first)), compact = e.merge(first, e.compactAdvance(board, first));
    expect(compact.steps.t0.result.marks).toBeUndefined();
    expect(compact.members).toHaveLength(30); expect(compact.steps.t0.result.mk).toHaveLength(30);
    expect(JSON.stringify(compact.steps.t0).length * 5).toBeLessThan(JSON.stringify(plain.steps.t0).length);
    expect(learningSummary(board, compact, roster)).toEqual(learningSummary(board, plain, roster));
    expect(e.derive(board, compact)).toEqual(e.derive(board, plain));
  });
  it('keeps retry attempts and late joiners aligned with the member list', () => {
    const late = { ...roster, late_joiner_Zq81: { name: 'Late' } };
    let plain = answerAll(e.emptyRun(), 'heater', () => true), compact = e.merge(plain, e.compactAdvance(board, plain));
    plain = e.merge(plain, e.advance(board, plain));
    const missed = run => answerAll(run, 'cloud', () => false, late), retried = run => { const open = e.merge(run, e.retry(board, run)); return answerAll(open, 'cloud', index => index % 2 === 0, late); };
    plain = retried(missed(plain)); compact = retried(missed(compact));
    plain = e.merge(plain, e.advance(board, plain)); compact = e.merge(compact, e.compactAdvance(board, compact));
    expect(compact.members).toHaveLength(31); expect(compact.members[30]).toBe('late_joiner_Zq81');
    expect(compact.steps.t1.result.ak.split(',')).toHaveLength(31); expect(compact.steps.t0.result.mk).toHaveLength(30);
    expect(learningSummary(board, compact, late)).toEqual(learningSummary(board, plain, late));
    expect(e.derive(board, compact)).toEqual(e.derive(board, plain));
  });
  it('stores classroom role members only while roles are on', () => {
    expect(rolesConfig(false, roster)).toEqual({ enabled: false, members: [] });
    expect(rolesConfig(true, roster).members).toHaveLength(30);
  });
});

describe('Feedback and reporting views', () => {
  let UI, root, element, latest;
  const click = async selector => { const node = typeof selector === 'string' ? element.querySelector(selector) : selector; expect(node).toBeTruthy(); await act(async () => node.click()); };
  const change = async (selector, value) => { await act(async () => { const node = element.querySelector(selector); expect(node).toBeTruthy(); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }); };
  function Harness({ board, initial = e.emptyRun() }) {
    const [run, setRun] = React.useState(initial); latest = run;
    return React.createElement('div', { className: 'lb' }, React.createElement(UI.Styles), React.createElement(UI.BoardView, { board, run, t: key => key,
      onMove: id => setRun(previous => e.merge(previous, e.begin(board, previous, id))),
      onAnswer: value => setRun(previous => { const next = structuredClone(previous), node = board.locations.find(item => item.id === e.stepOf(next).targetId); e.stepOf(next).answers.solo = { value, correct: value === e.solution(node) }; return e.merge(next, e.resolve(board, next, { solo: {} })); }),
      onAdvance: () => setRun(previous => e.merge(previous, e.advance(board, previous))), onRetry: () => setRun(previous => e.merge(previous, e.retry(board, previous))) }));
  }
  const render = async (Component, props) => { element = document.createElement('div'); document.body.appendChild(element); root = createRoot(element); await act(async () => root.render(React.createElement(Component, props))); };
  beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; const bundle = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({ stdin: { contents: \"export { BoardView, Styles } from './lesson_board_ui.jsx'; export { ConceptReview } from './lesson_board_followthrough.jsx'; export { PuzzleReview } from './lesson_board_puzzles_ui.jsx';\", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'ReviewFixUI', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).outputFiles[0].text)"], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); UI = new Function(bundle + ';return ReviewFixUI;')(); });
  afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; localStorage.clear(); sessionStorage.clear(); });

  it('keeps the key behind a disclosure while a retry is open and shows it once the stop is done', async () => {
    await render(Harness, { board: makeBoard() });
    await click('[data-board-move="heater"]'); await change('[data-board-choice]', '0'); await click('[data-board-submit]');
    const review = element.querySelector('[data-board-recap]');
    expect(review.querySelector('[data-board-answer-review]').textContent).toContain('Your response: Condensation');
    expect(review.querySelector('[data-board-solution]').closest('details[data-board-reveal]')).toBeTruthy();
    expect(review.querySelector('details[data-board-reveal]').open).toBe(false);
    expect(review.querySelector('[data-board-retry-hints]').textContent).toContain(makeBoard().locations[0].hints[0]);
    await click('[data-board-retry]'); await change('[data-board-choice]', '1'); await click('[data-board-submit]');
    const done = element.querySelector('[data-board-recap]');
    expect(done.querySelector('details[data-board-reveal]')).toBeNull();
    expect(done.querySelector('[data-board-solution]').textContent).toContain('Evaporation');
    expect(e.stepOf(latest).result.success).toBe(true);
  });
  it('shows the lesson quote only when it adds to the explanation', async () => {
    const board = makeBoard(); board.locations[0].explanation = board.locations[0].sourceQuote;
    await render(Harness, { board });
    await click('[data-board-move="heater"]'); await change('[data-board-choice]', '1'); await click('[data-board-submit]');
    expect(element.querySelector('[data-board-recap] blockquote')).toBeNull();
  });
  it('hides puzzle keys while a retry is open', async () => {
    const node = getPuzzle('allocate'), wrong = node.allocation.slice().reverse().join(',');
    expect(e.validValue(node, wrong) && wrong !== e.solution(node)).toBe(true);
    await render(UI.PuzzleReview, { node, value: wrong, hideKey: true, t: key => key });
    expect(element.textContent).toContain('Your allocation: ' + wrong.split(',')[0] + '.');
    expect(element.textContent).not.toContain('Required allocation');
    await act(async () => root.render(React.createElement(UI.PuzzleReview, { node, value: wrong, t: key => key })));
    expect(element.textContent).toContain('Required allocation');
  });
  it('leads the concept summary with first responses', async () => {
    const board = e.prepareBoard(makeBoard(), source);
    let run = e.merge(e.emptyRun(), e.begin(board, e.emptyRun(), 'heater'));
    e.stepOf(run).answers.solo = { value: '0', correct: false }; run = e.merge(run, e.resolve(board, run, { solo: {} }));
    run = e.merge(run, e.retry(board, run)); e.stepOf(run).answers.solo = { value: '1', correct: true }; run = e.merge(run, e.resolve(board, run, { solo: {} }));
    await render(UI.ConceptReview, { report: learningReport(board, run, { solo: { name: 'Rowan' } }), t: key => key });
    expect(element.querySelector('[data-concept-priority="temperature"] summary').textContent).toContain('First responses correct: 0/1 · latest: 1/1');
  });
});

describe('Live class results on end', () => {
  let root, host, api, read, write;
  const start = () => { const data = { hostId: 'teacher', roster: { learner: { name: 'Learner' } }, escapeRoomState: e.createSession(makeBoard(), 'teacher', { learner: {} }) }; const run = e.runOf(data.escapeRoomState); return put(data, e.merge(run, e.begin(data.escapeRoomState.board, run, 'heater'))); };
  const put = (data, run) => { const clone = structuredClone(data); clone.escapeRoomState.teamProgress.All.boardRuns[clone.escapeRoomState.attemptId] = run; return clone; };
  const answered = data => { const s = data.escapeRoomState, run = e.runOf(s), action = { attemptId: s.attemptId, turn: run.turn, requestId: e.requestId(run, 'answer'), kind: 'answer', targetId: 'heater', value: '1' }; const next = e.merge(run, e.processAction(s.board, run, action, 'learner', { attemptId: s.attemptId, active: true })); return put(data, e.merge(next, e.resolve(s.board, next, data.roster))); };
  const props = { appId: 'board-app', activeSessionCode: 'ROOM', user: { uid: 'teacher' }, t: key => key };
  const mount = async data => { if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); } await act(async () => root.render(React.createElement(api.LessonBoardTeacher, { ...props, sessionData: data }))); };
  const named = text => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === text);
  const click = async node => { expect(node).toBeTruthy(); await act(async () => { node.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); };
  beforeAll(() => { window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t: key => key }); read = vi.fn(); write = vi.fn(); window.__alloFirebase = { db: {}, doc: (_, ...parts) => parts.join('/'), getDoc: read, updateDoc: write }; window.__alloShared = { db: {}, warnLog() {} }; loadAlloModule('lesson_board_module.js'); api = window.AlloModules; });
  afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; read.mockReset(); write.mockReset(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

  it('saves the class report on this device before ending the board', async () => {
    const data = answered(start()); read.mockResolvedValue({ data: () => data }); write.mockResolvedValue(undefined);
    await mount(data); await click(named('End board')); await click(named('End for everyone'));
    expect(write).toHaveBeenCalledWith(expect.anything(), { escapeRoomState: { mode: 'lesson-board', isActive: false, isPaused: false, isGameOver: true, attemptId: data.escapeRoomState.attemptId, hostId: 'teacher' } });
    expect(JSON.stringify(write.mock.calls[0][1]).length).toBeLessThan(400);
    const saved = readReports(localStorage, 'board-app', 'teacher');
    expect(saved).toHaveLength(1); expect(saved[0]).toMatchObject({ mode: 'classroom', attempt: data.escapeRoomState.attemptId, scope: 'ROOM' });
  });
  it('refuses a launch that leaves too little room for a full class game', async () => {
    const roster = Object.fromEntries(Array.from({ length: 30 }, (_, index) => ['learner' + index, { name: 'Learner ' + index }])), setup = { inputText: source, language: 'English', history: [], appId: 'board-app', activeSessionCode: 'ROOM', user: { uid: 'teacher' }, allowLive: true, onClose() {}, t: key => key, callGemini: async () => JSON.stringify(makeBoard()) };
    if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
    await act(async () => root.render(React.createElement(api.LessonBoardSetup, setup))); await click(named('Generate lesson board'));
    read.mockResolvedValue({ data: () => ({ hostId: 'teacher', roster, notes: 'x'.repeat(50000) }) }); write.mockResolvedValue(undefined);
    await click(named('Launch for everyone'));
    expect(write).not.toHaveBeenCalled(); expect(host.textContent).toContain('too little room in the live session for a full game with 30 learners');
    read.mockResolvedValue({ data: () => ({ hostId: 'teacher', roster, notes: 'x'.repeat(4000) }) });
    await click(named('Launch for everyone'));
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('stops a first end when the report cannot be saved, then allows ending on a second confirmation', async () => {
    const data = answered(start()); read.mockResolvedValue({ data: () => data }); write.mockResolvedValue(undefined);
    const store = Object.getPrototypeOf(localStorage), original = store.setItem;
    vi.spyOn(store, 'setItem').mockImplementation(function (key, value) { if (String(key).startsWith('allo-board-reports')) throw Error('Storage is full.'); return original.call(this, key, value); });
    await mount(data); await click(named('End board')); await click(named('End for everyone'));
    expect(write).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]').textContent).toContain('could not be saved on this device');
    await click(named('End board')); await click(named('End for everyone'));
    expect(write).toHaveBeenCalledWith(expect.anything(), { escapeRoomState: expect.objectContaining({ isActive: false, isGameOver: true }) });
  });
});
