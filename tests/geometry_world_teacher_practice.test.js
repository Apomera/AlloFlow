// Geometry World practice results reach the teacher (2026-09-24).
//
// A solved practice station, and a finished round, send two reports from the
// student's device in a live session:
//   1. roster.<uid>.activityProgress through window.__alloWriteToSession: the app's
//      universal seven-field receipt, shown in the Command Center. It must pass the
//      app's OWN validator (normalizeLiveActivityProgress in AlloFlowANTI.txt) and the
//      Firestore rule (validActivityProgress), or the write is refused and the teacher
//      sees nothing. Both are read from their files here, not restated.
//   2. geometryPractice on the student's studentProgress document, for the Geometry
//      World teacher dashboard, which now shows each student's skills and a class
//      summary. Students write that document, so the teacher reads it through a
//      validator: known stations and bounded counts, or nothing.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The app's validator, as the app runs it.
const ANTI = readFileSync('AlloFlowANTI.txt', 'utf8');
const vStart = ANTI.indexOf('const normalizeLiveActivityProgress = (value) => {');
const vEnd = ANTI.indexOf('\n};\n', vStart);
const normalizeLiveActivityProgress = new Function(ANTI.slice(vStart, vEnd + 3) + '\nreturn normalizeLiveActivityProgress;')();
// The Firestore rule's patterns and statuses.
const RULES = readFileSync('firestore.rules', 'utf8');
const rule = RULES.slice(RULES.indexOf('function validActivityProgress(progress)'), RULES.indexOf('function validImageDelivery('));
const rulePattern = (field) => new RegExp(rule.match(new RegExp('progress\\.' + field + "\\.matches\\('([^']+)'\\)"))[1]);
const ruleStatuses = JSON.parse(rule.match(/progress\.status in (\[[^\]]+\])/)[1].replace(/'/g, '"'));

function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach((m) => { v[m] = () => v; });
    v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.lengthSq = () => 1; v.dot = () => 0; v.toArray = () => [0, 0, 0];
    return v;
  }
  return new Proxy({}, { get: (_t, prop) => (prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function () { return vec(); }) });
}
let cfg, P;
beforeAll(() => {
  resetStemLab();
  window.THREE = makeThreeStub();
  cfg = loadTool(FILE, 'geometryWorld');
  P = window.StemLab.geometryWorldPractice;
}, 120000);

describe('the Command Center receipt', () => {
  it('passes the app’s own validator and the Firestore rule, for every station count and both levels', () => {
    for (const key of ['practice_1', 'practice_42', 'practice_9999', 'practice_s1', 'practice_s9999']) {
      for (let solved = 0; solved <= 4; solved++) {
        for (const finished of [false, true]) {
          const r = P.receipt(key, solved, finished, 1758700000000);
          expect(normalizeLiveActivityProgress(r), key + ' ' + solved).toEqual(r);
          expect(r.activityId).toMatch(rulePattern('activityId'));
          expect(r.kind).toMatch(rulePattern('kind'));
          expect(ruleStatuses).toContain(r.status);
          expect(r.completed).toBeLessThanOrEqual(r.total);
        }
      }
    }
    expect(P.receipt('practice_42', 2, false, 5)).toEqual({ version: 1, activityId: 'geometry-practice:practice_42', kind: 'geometry_practice', status: 'working', completed: 2, total: 4, at: 5 });
    expect(P.receipt('practice_42', 4, true, 5).status).toBe('complete');
    expect(P.receipt('practice_42', 9, true, 5).completed).toBe(4);
    expect(P.receipt('volumeExplorer', 1, false, 5)).toBeNull();
    expect(P.receipt('practice_42', 1, false, 0)).toBeNull();
  });
});

describe('what the teacher reads', () => {
  const summary = (skills, extra) => Object.assign({ version: 1, rounds: 2, round: 'practice_42', at: 1, skills }, extra);
  const four = (counts) => P.stations.map((station, i) => ({ station, firstTry: counts[i][0], tries: counts[i][1] }));

  it('is the student’s own record: first-try results per station, the round and the rounds finished', () => {
    const rec = { rounds: 3, done: [], current: 'practice_s7', skills: { 'Counting Coach': [true, true], 'Net Maker': [false, true, false], 'Crate Builder': [], 'L-Shape Scout': [true] } };
    expect(P.teacherSummary(rec, 'practice_s7', 9, 2)).toEqual({ version: 1, rounds: 3, round: 'practice_s7', at: 9, solved: 2, finished: false, skills: four([[2, 2], [1, 3], [0, 0], [1, 1]]) });
    const read = P.readTeacherSummary(P.teacherSummary(rec, 'practice_s7', 9, 2));
    expect(read).toMatchObject({ rounds: 3, round: 'practice_s7', roundLabel: 'Stretch round 7', solved: 2, finished: false, focus: 'Surface area from nets' });
    // A finished round is in the record's done list; stations solved are bounded to 0..4.
    const done = Object.assign({}, rec, { done: ['practice_s7'] });
    expect(P.teacherSummary(done, 'practice_s7', 9, 4)).toMatchObject({ solved: 4, finished: true });
    expect(P.teacherSummary(rec, 'practice_s7', 9, 12).solved).toBe(4);
    expect(P.teacherSummary(rec, 'volumeExplorer', 9, 3)).toMatchObject({ round: '', solved: 0, finished: false });
  });

  it('keeps only known stations and bounded counts, so a tampered document shows nothing false', () => {
    expect(P.readTeacherSummary(null)).toBeNull();
    expect(P.readTeacherSummary(summary(four([[1, 1], [0, 0], [0, 0], [0, 0]]), { version: 2 }))).toBeNull();
    expect(P.readTeacherSummary(summary(four([[1, 1], [0, 0], [0, 0], [0, 0]]), { rounds: '5' }))).toBeNull();
    expect(P.readTeacherSummary(summary('x'))).toBeNull();
    const read = P.readTeacherSummary(summary([
      { station: 'Counting Coach', firstTry: 5, tries: 3 },
      { station: 'Net Maker', firstTry: 1.5, tries: 2 },
      { station: 'Crate Builder', firstTry: 2, tries: 99 },
      { station: '<img src=x onerror=alert(1)>', firstTry: 1, tries: 1 },
      { station: 'L-Shape Scout', firstTry: 1, tries: 2 }
    ], { round: '<b>practice_42</b>' }));
    expect(read.skills.map((s) => [s.station, s.firstTry, s.tries])).toEqual([['Counting Coach', 0, 0], ['Net Maker', 0, 0], ['Crate Builder', 0, 0], ['L-Shape Scout', 1, 2]]);
    expect([read.round, read.roundLabel, read.solved, read.finished]).toEqual(['', '', 0, false]);
    const odd = P.readTeacherSummary(summary(four([[1, 1], [0, 0], [0, 0], [0, 0]]), { solved: 9, finished: 'yes' }));
    expect([odd.solved, odd.finished]).toEqual([0, false]);
    expect(P.readTeacherSummary(summary(four([[1, 1], [0, 0], [0, 0], [0, 0]]), { solved: 3, finished: true }))).toMatchObject({ solved: 3, finished: true });
    expect(read.skills.map((s) => s.skill)).toEqual(P.stations.map((st) => P.skills[st]));
  });

  it('the class summary adds each skill over students and names the weakest as the focus', () => {
    const map = {
      Ana: { geometryPractice: summary(four([[2, 2], [1, 3], [0, 0], [1, 1]])) },
      Ben: { geometryPractice: summary(four([[1, 2], [2, 2], [1, 1], [0, 0]])) },
      Cy: { stats: { quizAvg: 90 } },
      Dee: { geometryPractice: summary(four([[0, 0], [0, 0], [0, 0], [0, 0]])) },
      Eve: { geometryPractice: { version: 1, rounds: -1, skills: [] } }
    };
    const cls = P.classSummary(map);
    expect(cls.students).toBe(2);
    expect(cls.skills.map((s) => [s.firstTry, s.tries, s.students])).toEqual([[3, 4, 2], [3, 5, 2], [1, 1, 1], [1, 1, 1]]);
    expect(cls.focus).toBe('Surface area from nets');
    expect(P.classSummary({}).students).toBe(0);
    expect(P.classSummary({ a: { geometryPractice: summary(four([[1, 1], [2, 2], [0, 0], [0, 0]])) } }).focus).toBe('');
  });
});

describe('mounted', () => {
  function fakeEngine(npcs, log) {
    const canvas = document.createElement('canvas');
    const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
    return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
      camera: { position: { x: 0, y: 0, z: 0, set: vi.fn(), toArray: () => [0, 0, 0] }, quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt() {}, up: v() },
      blocks: {}, npcs: npcs || [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
      isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson: vi.fn(), placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
      clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent: vi.fn(), sessionLog: log || [], geometryHomeLessons: [], startPracticeRound: vi.fn() };
  }
  const spr = () => ({ position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } });
  const live = (data) => ({ data, body: spr(), head: spr(), label: spr(), prompt: spr(), qMark: spr(), _arms: [], _eyeParts: [] });
  const sequence = (q) => { const out = []; (function visit(x) { if (!x) return; out.push(x); (x.followUp || []).forEach(visit); })(q); return out; };
  function mount(bucket, ctxExtra) {
    const container = document.createElement('div'); document.body.appendChild(container);
    const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
    let bump = null;
    const ctx = makeCtx(Object.assign({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } }, ctxExtra));
    const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
    const root = ReactDOMClient.createRoot(container);
    React.act(() => { root.render(React.createElement(Comp)); });
    React.act(() => bump());
    return { container, bucket: () => toolData.geometryWorld, unmount: () => { React.act(() => root.unmount()); container.remove(); } };
  }
  const base = { worldActive: true, activeLesson: 'practice_42', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, npcTypewriterNpc: 0, npcTypewriterPos: 999 };
  const session = { activeSessionCode: 'ABC123', studentNickname: 'Sam P.', isTeacherMode: false };
  let writer, setDoc;
  beforeEach(() => {
    window.THREE = makeThreeStub(); localStorage.clear();
    writer = vi.fn(() => Promise.resolve());
    setDoc = vi.fn(() => Promise.resolve());
    window.__alloWriteToSession = writer;
    window.__alloFirebase = { doc: (_db, ...path) => ({ path: path.join('/') }), setDoc, auth: { currentUser: { uid: 'uid-7' } } };
    window.__alloShared = { db: { fake: true }, appId: 'app-1' };
  });
  afterEach(() => {
    delete window[ENGINE_KEY]; delete window.__alloWriteToSession; delete window.__alloFirebase; delete window.__alloShared;
    document.body.innerHTML = '';
  });
  // Solve station `idx` of round 42 by answering its last step, with `score` stations already solved.
  function solve(idx, score, ctxExtra, log) {
    const lesson = P.lesson(42), last = sequence(lesson.npcs[idx].question).at(-1);
    window[ENGINE_KEY] = fakeEngine(lesson.npcs.map(live), log || [{ type: 'lesson_load', data: {} }]);
    const answered = {}; for (let i = 0; i < 4; i++) if (i !== idx && Object.keys(answered).length < score) answered[i] = true;
    const steps = sequence(lesson.npcs[idx].question).length;
    const m = mount(Object.assign({}, base, { totalQ: 4, score, answeredNpcs: answered, showNpcDialog: true, dialogNpcIdx: idx, npcFollowUpStep: { [idx]: steps - 1 } }), ctxExtra);
    const right = [...m.container.querySelectorAll('.gw-dialog--npc button')].find((b) => b.textContent === last.choices[last.correct]);
    React.act(() => right.click());
    m.unmount();
  }

  it('a solved station sends the Command Center receipt and the skill results', async () => {
    solve(0, 0, session);
    expect(writer).toHaveBeenCalledTimes(1);
    const [ref, patch] = writer.mock.calls[0];
    expect(ref.path).toBe('artifacts/app-1/public/data/sessions/ABC123');
    expect(Object.keys(patch)).toEqual(['roster.uid-7.activityProgress']);
    const receipt = patch['roster.uid-7.activityProgress'];
    expect(receipt).toMatchObject({ activityId: 'geometry-practice:practice_42', kind: 'geometry_practice', status: 'working', completed: 1, total: 4 });
    expect(normalizeLiveActivityProgress(receipt)).toEqual(receipt);
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [docRef, data, options] = setDoc.mock.calls[0];
    expect(docRef.path).toBe('artifacts/app-1/public/data/sessions/ABC123/studentProgress/Sam_P_');
    expect(options).toEqual({ merge: true });
    expect(data.studentNickname).toBe('Sam P.');
    expect(P.readTeacherSummary(data.geometryPractice).skills[0]).toMatchObject({ station: 'Counting Coach', firstTry: 1, tries: 1 });
    expect(data.geometryPractice).toMatchObject({ round: 'practice_42', solved: 1, finished: false });
    // A wrong answer on this station earlier: not right first time.
    solve(1, 1, session, [{ type: 'lesson_load', data: {} }, { type: 'answer_wrong', data: { npc: 'Net Maker', step: 0 } }]);
    expect(writer.mock.calls[1][1]['roster.uid-7.activityProgress'].completed).toBe(2);
    expect(P.readTeacherSummary(setDoc.mock.calls[1][1].geometryPractice).skills[1]).toMatchObject({ firstTry: 0, tries: 1 });
  });

  it('the last station reports the finished round once, with the round counted', () => {
    solve(3, 3, session);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer.mock.calls[0][1]['roster.uid-7.activityProgress']).toMatchObject({ status: 'complete', completed: 4, total: 4 });
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(setDoc.mock.calls[0][1].geometryPractice).toMatchObject({ rounds: 1, round: 'practice_42', solved: 4, finished: true });
  });

  it('sends nothing outside a live session, from a teacher, or for a built-in lesson; a failed write stays quiet', async () => {
    solve(0, 0, {});
    solve(0, 0, Object.assign({}, session, { isTeacherMode: true }));
    expect(writer).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    // An old Class Mailbox cannot relay the receipt; the skills document still goes.
    window.__alloQrStudentMode = { type: 'mailbox-live' };
    window.__alloMailboxParticipantVersion = 18;
    try { solve(0, 0, session); } finally { delete window.__alloQrStudentMode; delete window.__alloMailboxParticipantVersion; }
    expect(writer).not.toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledTimes(1);
    const errors = [];
    const onRejection = (e) => errors.push(e);
    process.on('unhandledRejection', onRejection);
    // Plain functions: a vi.fn attaches its own handler to a promise it returns, which
    // would hide a missing .catch in the tool.
    const refused = [];
    window.__alloWriteToSession = (...args) => { refused.push('receipt'); return Promise.reject(new Error('permission-denied')); };
    window.__alloFirebase.setDoc = (...args) => { refused.push('skills'); return Promise.reject(new Error('permission-denied')); };
    expect(() => solve(0, 0, session)).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
    process.off('unhandledRejection', onRejection);
    expect(refused).toEqual(['receipt', 'skills']);
    expect(errors).toEqual([]);
    expect(P.record(localStorage).skills['Counting Coach'].length).toBe(4);
  });

  it('the teacher dashboard shows the class’s skills, the focus, and each student’s results', () => {
    const four = (counts) => P.stations.map((station, i) => ({ station, firstTry: counts[i][0], tries: counts[i][1] }));
    window[ENGINE_KEY] = fakeEngine();
    const studentProgressMap = {
      Ana: { studentNickname: 'Ana', geometryPractice: { version: 1, rounds: 2, round: 'practice_42', at: 1, skills: four([[2, 2], [1, 3], [0, 0], [1, 1]]) } },
      Ben: { studentNickname: 'Ben', stats: { quizAvg: 85, globalPoints: 40 }, geometryPractice: { version: 1, rounds: 1, round: '<script>', at: 1, skills: four([[1, 2], [2, 2], [1, 1], [0, 0]]) } },
      Cy: { studentNickname: 'Cy', stats: { quizAvg: 90 } }
    };
    const m = mount(Object.assign({}, base, { activeLesson: 'volumeExplorer', showTeacherView: true, studentProgressMap }), { activeSessionCode: 'ABC123', isTeacherMode: true });
    const cls = m.container.querySelector('.gw-teacher-practice');
    expect(cls.querySelector('h3').textContent).toContain('Practice skills, 2 students');
    expect([...cls.querySelectorAll('[data-gw-class-skill]')].map((li) => li.textContent)).toEqual([
      'Volume in layers3 of 4 right first time', 'Surface area from nets3 of 5 right first time', 'Missing dimensions1 of 1 right first time', 'Composite shapes1 of 1 right first time']);
    expect(cls.querySelector('.gw-teacher-practice-focus').textContent).toBe('Class focus: Surface area from nets');
    const ana = m.container.querySelector('[data-gw-student-practice="Ana"]');
    expect(ana.textContent).toContain('2 practice rounds');
    expect(ana.textContent).toContain('on Round 42');
    expect([...ana.querySelectorAll('[data-gw-skill]')].map((x) => x.textContent)).toEqual(['Volume in layers 2/2', 'Surface area from nets 1/3', 'Composite shapes 1/1']);
    expect(ana.textContent).toContain('Focus: Surface area from nets');
    const ben = m.container.querySelector('[data-gw-student-practice="Ben"]');
    expect(ben.textContent).not.toContain('script');
    expect(m.container.querySelector('[data-gw-student-practice="Cy"]')).toBeNull();
    // Only a student with app stats gets the quiz tier badge.
    const card = (name) => [...m.container.querySelectorAll('[role="dialog"] div')].find((d) => d.firstChild && d.firstChild.textContent === name && d.parentElement && d.parentElement.style.borderRadius === '10px');
    expect(card('Ana').textContent).not.toMatch(/T[123] \d+%/);
    expect(card('Ben').textContent).toContain('T1 85%');
    m.unmount();
  });

  it('a class practice round: one number to type, who is on it, and the teacher can play it', () => {
    const four = (counts) => P.stations.map((station, i) => ({ station, firstTry: counts[i][0], tries: counts[i][1] }));
    const eng = fakeEngine();
    window[ENGINE_KEY] = eng;
    const sp = (round, solved, finished) => ({ version: 1, rounds: 1, round, at: 1, solved, finished, skills: four([[1, 1], [0, 0], [0, 0], [0, 0]]) });
    const studentProgressMap = {
      Ana: { studentNickname: 'Ana', geometryPractice: sp('practice_s77', 2, false) },
      Ben: { studentNickname: 'Ben', geometryPractice: sp('practice_s77', 4, true) },
      Cy: { studentNickname: 'Cy', geometryPractice: sp('practice_42', 1, false) },
      Dee: { studentNickname: 'Dee' },
      Eve: { studentNickname: 'Eve', geometryPractice: sp('practice_s77', 0, false) }
    };
    const m = mount(Object.assign({}, base, { activeLesson: 'volumeExplorer', showTeacherView: true, studentProgressMap }), { activeSessionCode: 'ABC123', isTeacherMode: true });
    const card = () => m.container.querySelector('.gw-teacher-class-round');
    expect(card().querySelector('h3').textContent).toContain('Class practice round');
    expect(card().querySelector('.gw-teacher-class-code')).toBeNull();
    // A new stretch round: a stretch key, shown as S and its number.
    React.act(() => card().querySelector('[data-gw-class-round-new="stretch"]').click());
    const chosen = m.bucket().classPracticeRound, round = P.round(chosen);
    expect(round.level).toBe('stretch');
    expect(card().querySelector('.gw-teacher-class-code').textContent).toBe('S' + round.seed);
    expect(card().querySelector('.gw-teacher-class-how').textContent).toContain('type S' + round.seed + ' under');
    expect(card().querySelector('[role="status"]').textContent).toBe('No one has started this round yet.');
    m.unmount();
    // The class is on stretch round 77: who is playing, how far, and who finished.
    window[ENGINE_KEY] = fakeEngine();
    const on = mount(Object.assign({}, base, { activeLesson: 'volumeExplorer', showTeacherView: true, studentProgressMap, classPracticeRound: 'practice_s77' }), { activeSessionCode: 'ABC123', isTeacherMode: true });
    const c = on.container.querySelector('.gw-teacher-class-round');
    expect(c.getAttribute('data-gw-class-round')).toBe('practice_s77');
    expect(c.querySelector('.gw-teacher-class-code').textContent).toBe('S77');
    expect(c.querySelector('.gw-teacher-class-how').textContent).toContain('Stretch round 77');
    expect(c.querySelector('[role="status"]').textContent).toBe('3 students on this round, 1 finished');
    expect([...c.querySelectorAll('[data-gw-class-round-student]')].map((li) => li.textContent)).toEqual(['Ana: 2 of 4 stations', 'Ben: finished', 'Eve: 0 of 4 stations']);
    // Play it here: closes the dashboard and starts that round on this screen.
    const started = [];
    window[ENGINE_KEY].startPracticeRound = (key) => { started.push(key); return 77; };
    React.act(() => c.querySelector('[data-gw-class-round-play]').click());
    expect(started).toEqual(['practice_s77']);
    expect(on.bucket().showTeacherView).toBe(false);
    on.unmount();
    // Clear takes the card back to its choice.
    window[ENGINE_KEY] = fakeEngine();
    const cl = mount(Object.assign({}, base, { activeLesson: 'volumeExplorer', showTeacherView: true, studentProgressMap, classPracticeRound: 'practice_42' }), { activeSessionCode: 'ABC123', isTeacherMode: true });
    expect(cl.container.querySelector('.gw-teacher-class-code').textContent).toBe('42');
    expect([...cl.container.querySelectorAll('[data-gw-class-round-student]')].map((li) => li.textContent)).toEqual(['Cy: 1 of 4 stations']);
    React.act(() => cl.container.querySelector('[data-gw-class-round-clear]').click());
    expect(cl.bucket().classPracticeRound).toBe('');
    expect(cl.container.querySelector('.gw-teacher-class-code')).toBeNull();
    cl.unmount();
  });
});
