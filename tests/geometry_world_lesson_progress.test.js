// Geometry World lesson progression: Replay, the completion dialog's promise, the
// next-lesson chain, and the Perfect Score badge.
//
// THE BUGS (2026-09-23 audit)
// 1. gw_progress_<title> was written on every answer and never removed, and loadLesson
//    restored it, so Replay (and reopening a finished lesson from Home) landed straight
//    back on "Lesson complete!".
// 2. "You've completed all N geometry lessons" showed whenever the lesson was last in,
//    or absent from, LESSON_ORDER: every AI or custom lesson claimed the course was done.
// 3. Geometry Garden has no questions (totalQ 0) so it can never complete, yet the
//    Next button routed students into it as step 5 of the chain.
// 4. perfect_lesson fired after ANY three correct steps with no wrong answer in the
//    whole session (mid-lesson), and one wrong answer lost it for the session.
//
// Pure helpers are read from the production source; the dialog is mounted for real
// with react-dom/client over a fake engine (the pattern in
// geometry_world_engine_lifecycle.test.js), so the rendered Next/Replay/journey is what
// a student sees.

import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {React, ReactDOMClient, makeCtx, resetStemLab, loadTool} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';
const source = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function slice(startMarker, endMarker) {
  const a = source.indexOf(startMarker), b = source.indexOf(endMarker, a);
  if (a < 0 || b < a) throw Error('Missing source markers ' + startMarker);
  return source.slice(a, b);
}
const progress = new Function(slice('  var LESSON_ORDER =[', '  var MAX_BLOCKS = 1500;') +
  '\nreturn {LESSON_ORDER, GW_COMPLETED_LESSONS_KEY, geometryProgressKey, geometryResumableProgress, geometryLessonJourney, geometryLessonCompleted};')();
const badges = new Function(slice('  function geometryPerfectLessonInLog(', '  var SAMPLE_LESSONS = {') + '\nreturn {ACHIEVEMENTS, checkAchievements};')();

let cfg, lessons;
beforeAll(() => {
  resetStemLab();
  window.THREE = makeThreeStub();
  cfg = loadTool(FILE, 'geometryWorld');
  lessons = window.StemLab.geometryWorldWorksheets.presets();
}, 120000); // Parsing the 1.1 MB tool passes 10 s on a loaded machine.
beforeEach(() => { localStorage.clear(); window.THREE = makeThreeStub(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; });
afterEach(() => { localStorage.clear(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = ''; });

const questions = l => (l.npcs || []).filter(n => n.question).length;
const saveProgress = (lesson, score) => localStorage.setItem(progress.geometryProgressKey(lesson), JSON.stringify({score, answeredNpcs: {0: true}, npcFollowUpStep: {}}));
const ledger = () => JSON.parse(localStorage.getItem(progress.GW_COMPLETED_LESSONS_KEY) || '{}');
function completeAllExcept(except) {
  const done = {};
  for (const k of progress.LESSON_ORDER) if (k !== except) done[progress.geometryProgressKey(lessons[k])] = true;
  localStorage.setItem(progress.GW_COMPLETED_LESSONS_KEY, JSON.stringify(done));
}

describe('Saved progress: unfinished lessons resume, finished lessons restart', () => {
  it('restores an unfinished lesson and leaves its saved answers in place', () => {
    const lesson = lessons.volumeExplorer;
    saveProgress(lesson, 1);
    expect(progress.geometryResumableProgress(localStorage, lesson)).toMatchObject({score: 1});
    expect(localStorage.getItem(progress.geometryProgressKey(lesson))).not.toBeNull();
  });
  it('does not restore a finished lesson into its completion dialog, and still counts it as completed', () => {
    const lesson = lessons.volumeExplorer;
    saveProgress(lesson, questions(lesson));
    expect(progress.geometryResumableProgress(localStorage, lesson)).toBeNull();
    expect(localStorage.getItem(progress.geometryProgressKey(lesson))).toBeNull();
    expect(ledger()[progress.geometryProgressKey(lesson)]).toBe(true);
    expect(progress.geometryLessonCompleted(localStorage, lesson)).toBe(true);
  });
  it('is what loadLesson restores from', () => {
    // Booleans, not toContain: a failing toContain prints the whole 1.1 MB source.
    expect(source.includes('var savedProgress = geometryResumableProgress(geometryStorage(), lesson);'), 'loadLesson must restore via geometryResumableProgress').toBe(true);
    expect(source.includes("savedProgress = JSON.parse(localStorage.getItem(progressKey))"), 'raw restore of any saved progress').toBe(false);
  });
});

describe('window.StemLab.geometryWorldLessonProgress.completed(key) for the Home chooser', () => {
  const completed = key => window.StemLab.geometryWorldLessonProgress.completed(key);
  it('is false for unknown, inherited and question-free keys, without throwing', () => {
    for (const key of ['nope', 'toString', '__proto__', undefined, null, 'ai_generated', 'geometryGarden']) expect(completed(key), String(key)).toBe(false);
  });
  it('is false for an unfinished lesson and true once it is finished', () => {
    saveProgress(lessons.areaSurface, 1);
    expect(completed('areaSurface')).toBe(false);
    saveProgress(lessons.areaSurface, questions(lessons.areaSurface));
    expect(completed('areaSurface')).toBe(true);
    expect(completed('volumeExplorer')).toBe(false);
  });
  it('stays true after Replay clears the saved answers', () => {
    saveProgress(lessons.areaSurface, questions(lessons.areaSurface));
    expect(progress.geometryResumableProgress(localStorage, lessons.areaSurface)).toBeNull();
    expect(localStorage.getItem(progress.geometryProgressKey(lessons.areaSurface))).toBeNull();
    expect(completed('areaSurface')).toBe(true);
  });
});

describe('The next-lesson chain', () => {
  it('holds exactly the lessons that can complete: every preset with questions, and not the ungraded Garden', () => {
    const completable = Object.keys(lessons).filter(k => questions(lessons[k]) > 0);
    expect(progress.LESSON_ORDER.slice().sort()).toEqual(completable.sort());
    expect(progress.LESSON_ORDER).not.toContain('geometryGarden');
    expect(questions(lessons.geometryGarden)).toBe(0);
  });
  it('offers the next UNFINISHED lesson, wrapping to the start, and skips completed ones', () => {
    const j = (key) => progress.geometryLessonJourney(localStorage, progress.LESSON_ORDER, lessons, key);
    expect(j('volumeExplorer')).toMatchObject({nextKey: 'areaSurface', allComplete: false});
    expect(j('realWorld').nextKey).toBe('compositeVolume');
    saveProgress(lessons.areaSurface, questions(lessons.areaSurface));
    localStorage.setItem(progress.GW_COMPLETED_LESSONS_KEY, JSON.stringify({[progress.geometryProgressKey(lessons.buildChallenge)]: true}));
    expect(j('volumeExplorer').nextKey).toBe('realWorld');
    expect(j('geometryHarbor')).toMatchObject({nextKey: 'volumeExplorer', allComplete: false});
    expect(j('ai_generated')).toMatchObject({nextKey: 'volumeExplorer', allComplete: false});
  });
  it('reports all complete only when every lesson in the chain really is', () => {
    completeAllExcept('fluencyMaze');
    const j = (key) => progress.geometryLessonJourney(localStorage, progress.LESSON_ORDER, lessons, key);
    expect(j('geometryHarbor')).toMatchObject({nextKey: 'fluencyMaze', allComplete: false});
    expect(j('fluencyMaze')).toMatchObject({nextKey: null, allComplete: true, total: progress.LESSON_ORDER.length});
    expect(j('ai_generated').allComplete).toBe(false);
    completeAllExcept(null);
    expect(j('ai_generated')).toMatchObject({nextKey: null, allComplete: true});
  });
});

describe('Perfect Score is awarded for a whole lesson with no wrong answer', () => {
  const perfect = badges.ACHIEVEMENTS.find(a => a.id === 'perfect_lesson').check;
  const load = t => ({type: 'lesson_load', data: {title: t}});
  const right = (npc, step, isFinalStep) => ({type: 'answer_correct', data: {npc, step, isFinalStep}});
  const wrong = (npc, step) => ({type: 'answer_wrong', data: {npc, step, isFinalStep: false}});
  const done = n => ({type: 'lesson_complete', data: {score: n, totalQuestions: n}});
  const threeSteps = npc => [right(npc, 0, false), right(npc, 1, false), right(npc, 2, true)];

  it('is not earned mid-lesson by three correct steps', () => {
    expect(perfect([load('A'), ...threeSteps('Ada')])).toBe(false);
    expect(perfect([load('A'), right('Ada', 0, true), right('Ben', 0, true), right('Cy', 0, true)])).toBe(false);
  });
  it('is earned at completion when that lesson had no wrong answer', () => {
    const log = [load('A'), ...threeSteps('Ada'), right('Ben', 0, true)];
    const before = badges.checkAchievements(log, {});
    expect(before.newBadges.map(b => b.id)).not.toContain('perfect_lesson');
    const after = badges.checkAchievements(log.concat(done(2)), before.badges);
    expect(after.newBadges.map(b => b.id)).toContain('perfect_lesson');
  });
  it('is not earned by a lesson with a wrong answer, even after a correct retry', () => {
    expect(perfect([load('A'), wrong('Ada', 0), right('Ada', 0, true), done(1)])).toBe(false);
  });
  it('is still reachable in a later lesson after a wrong answer in an earlier one', () => {
    expect(perfect([load('A'), wrong('Ada', 0), right('Ada', 0, true), done(1), load('B'), right('Ben', 0, true), done(1)])).toBe(true);
    expect(perfect([load('A'), wrong('Ada', 0), load('A'), right('Ada', 0, true), done(1)])).toBe(true);
  });
  it('is not earned by a resumed lesson whose earlier answers are not in this log', () => {
    expect(perfect([load('A'), right('Cy', 0, true), done(3)])).toBe(false);
  });
  it('reads the events the answer handler actually logs', () => {
    for (const logged of [
      "eng.logEvent('answer_correct', { npc: data.name, question: curQ.text, choice: choice, step: curStep, isFinalStep: !!isLastStep });",
      "eng.logEvent('lesson_complete', { score: newScore, totalQuestions: totalQ,",
      "engine.logEvent('lesson_load', { title: lesson.title || 'unknown'",
    ]) expect(source.includes(logged), logged).toBe(true);
  });
});

// ── Mounted completion dialog ──
function makeThreeStub() {
  function vec() {
    const v = {x: 0, y: 0, z: 0, w: 0};
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler'].forEach(m => { v[m] = () => v; });
    v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.dot = () => 0;
    return v;
  }
  // Regular functions, not arrows: the render path calls `new THREE.Vector3()`.
  return new Proxy({}, {get: (_t, prop) => prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function () { return vec(); }});
}
function makeFakeEngine() {
  const calls = {loadLesson: []};
  return {
    _calls: calls, clearWorld() {}, scene: {remove() {}}, renderer: {dispose() {}, domElement: document.createElement('canvas')},
    camera: {position: {x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone: () => ({x: 0, y: 0, z: 0})}, quaternion: {x: 0, y: 0, z: 0, w: 1}, rotation: {x: 0, y: 0, z: 0}, getWorldDirection: v => v || {x: 0, y: 0, z: -1}, updateProjectionMatrix() {}},
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null, flyMode: false, moveState: {}, velocity: {x: 0, y: 0, z: 0}, onGround: true,
    _undoStack: [], _redoStack: [], _coordAnnounce: false, _targetGrid: null, _jumpLock: false, _sessionXP: 0, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson(lesson) { calls.loadLesson.push(lesson); }, logEvent() {}, undo() {}, redo() {}, returnToSpawn() {}, clearPlayerBlocks() {}, measureStructure() {}, placeBlock() {}, removeBlock() {},
  };
}
function mount(bucket) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toolData = {_threeLoaded: true, geometryWorld: Object.assign({_introShownOnce: true, worldActive: true}, bucket)};
  let bump = null;
  const ctx = makeCtx({
    toolData,
    update(b, k, v) { toolData[b] = Object.assign({}, toolData[b], {[k]: v}); if (bump) bump(); },
    updateMulti(b, patch) { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); },
  });
  const Comp = () => { const st = React.useState(0); bump = () => st[1](n => n + 1); return cfg.render(ctx); };
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Comp)); });
  return {container, bucket: () => toolData.geometryWorld, unmount() { React.act(() => root.unmount()); container.remove(); }};
}
const dialog = m => m.container.querySelector('.gw-completion-dialog');
const nextButton = m => m.container.querySelector('.gw-completion-next');
const journeyText = m => (m.container.querySelector('.gw-completion-journey') || {}).textContent || '';

describe('The completion dialog tells the truth about the course', () => {
  function finished(activeLesson, extra) {
    const lesson = lessons[activeLesson];
    const n = lesson ? questions(lesson) : 1;
    window[ENGINE_KEY] = makeFakeEngine();
    return mount(Object.assign({activeLesson, score: n, totalQ: n}, extra));
  }

  it('does not claim the course is complete after finishing the last lesson in the chain', () => {
    const m = finished('geometryHarbor');
    try {
      expect(dialog(m)).toBeTruthy();
      expect(journeyText(m)).toBe('');
      expect(nextButton(m).textContent).toContain('Next: Volume Explorer');
    } finally { m.unmount(); }
  }, 30000);

  it('does not claim the course is complete after an AI-generated lesson', () => {
    const ai = {title: 'Bridges of Volume', npcs: [{name: 'Ada', position: [0, 1, 0], dialogue: 'Hi', question: {text: 'How many?', choices: ['24', '12'], correct: 0}}], structures: []};
    const m = finished('ai_generated', {lastGeneratedLesson: ai});
    try {
      expect(dialog(m)).toBeTruthy();
      expect(journeyText(m)).toBe('');
      expect(nextButton(m).textContent).toContain('Next: Volume Explorer');
    } finally { m.unmount(); }
  }, 30000);

  it('never routes a student into the question-free Garden', () => {
    const m = finished('realWorld');
    try { expect(nextButton(m).textContent).toContain('Next: Composite Volume'); } finally { m.unmount(); }
  }, 30000);

  it('shows the course journey once every lesson in the chain is complete', () => {
    completeAllExcept('geometryHarbor');
    const m = finished('geometryHarbor');
    try {
      expect(nextButton(m)).toBeNull();
      expect(journeyText(m)).toContain('All lessons complete!');
      expect(journeyText(m)).toContain('completed all ' + progress.LESSON_ORDER.length + ' geometry lessons');
    } finally { m.unmount(); }
  }, 30000);

  it('Replay clears the saved answers, keeps the completion, and resets wrong-answer state', () => {
    const lesson = lessons.volumeExplorer;
    saveProgress(lesson, questions(lesson));
    const m = finished('volumeExplorer', {npcWrongCount: {1: 2}, npcLastWrong: {1: '9 square units'}, consecutiveWrong: 2});
    try {
      const replay = m.container.querySelector('.gw-completion-replay');
      React.act(() => { replay.click(); });
      expect(localStorage.getItem(progress.geometryProgressKey(lesson))).toBeNull();
      expect(ledger()[progress.geometryProgressKey(lesson)]).toBe(true);
      const loads = window[ENGINE_KEY]._calls.loadLesson;
      expect(loads[loads.length - 1].title).toBe(lesson.title);
      expect(m.bucket()).toMatchObject({npcWrongCount: {}, npcLastWrong: {}, consecutiveWrong: 0});
      // What the real loadLesson now reads back for this lesson: nothing, so it starts at 0.
      expect(progress.geometryResumableProgress(localStorage, lesson)).toBeNull();
      expect(window.StemLab.geometryWorldLessonProgress.completed('volumeExplorer')).toBe(true);
    } finally { m.unmount(); }
  }, 30000);
});
