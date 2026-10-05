import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

let render, checks, builder, lessons;
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  resetStemLab();
  window.THREE = makeThreeStub();
  render = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld').render;
  checks = window.StemLab.geometryWorldAnswerCoaching;
  lessons = window.StemLab.geometryWorldWorksheets.presets();
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8'))();
  builder = window.StemLab.geometryWorldBuilderPure;
}, 120000);
beforeEach(() => { localStorage.clear(); window.THREE = makeThreeStub(); delete window[ENGINE_KEY]; });
afterEach(() => { vi.useRealTimers(); localStorage.clear(); delete window[ENGINE_KEY]; document.body.innerHTML = ''; });

function savedReview(lesson, activityIndex, reviewed = true, extra = {}) {
  const guide = builder.activityGuideModel(lesson);
  return { [guide.key]: { ...extra, reviewed: { [guide.activities[activityIndex].id]: reviewed } } };
}

function evidence(lesson, progress) {
  return checks.activityObjectiveReviews(lesson, progress, builder.activityGuideModel);
}

describe('Authored activity goals retain their own evidence', () => {
  it.each(['areaSurface', 'compositeVolume'])('%s maps each question study to its matching guide', key => {
    const lesson = lessons[key], rules = checks.objectiveEvidence[key];
    expect(lesson.objectiveEvidence).toEqual(rules);
    expect(rules).toHaveLength(lesson.objectives.length);
    rules.slice(0, 3).forEach((rule, index) => {
      expect(rule.npc).toBe(lesson.activities[index].npcName);
      expect(lesson.npcs.some(npc => npc.name === rule.npc && npc.question)).toBe(true);
    });
  });

  it.each([['areaSurface', 3], ['areaSurface', 4], ['compositeVolume', 3]])('%s goal %i uses the existing normalized activity identity', (key, index) => {
    const guide = builder.activityGuideModel(lessons[key]);
    expect(checks.objectiveEvidence[key][index].activity).toBe(guide.activities[index].id);
  });

  it.each([['areaSurface', 3], ['areaSurface', 4], ['compositeVolume', 3]])('%s optional goal %i stays pending after all questions', (key, index) => {
    const rule = checks.objectiveEvidence[key][index];
    const status = checks.objectiveStatus(rule, { complete: true, answered: Object.fromEntries(lessons[key].npcs.map(npc => [npc.name, true])), measurements: [{ occupiedVolume: 24 }, { occupiedVolume: 50 }] });
    expect(status.done).toBe(false);
    expect(status.evidence).toContain('in Activities');
    expect(status.evidence).toContain('self-review, not scored');
  });

  it('does not substitute a numeric check or a written draft for the explicit activity self-review', () => {
    const lesson = lessons.areaSurface, guide = builder.activityGuideModel(lesson), id = guide.activities[4].id;
    const progress = { [guide.key]: { notes: { [id]: 'I used two layers of twelve cubes.' }, evidence: { [id]: { check: { status: 'met' } } } } };
    expect(checks.objectiveStatus(lesson.objectiveEvidence[4], { complete: true, activityReviews: evidence(lesson, progress) }).done).toBe(false);
  });

  it('recognizes only the reviewed flag for the matching activity and labels it as ungraded', () => {
    const lesson = lessons.areaSurface, progress = savedReview(lesson, 3), reviews = evidence(lesson, progress);
    expect(checks.objectiveStatus(lesson.objectiveEvidence[3], { activityReviews: reviews })).toMatchObject({ done: true, evidence: 'Activity self-review recorded (not scored)' });
    expect(checks.objectiveStatus(lesson.objectiveEvidence[4], { activityReviews: reviews }).done).toBe(false);
  });

  it('requires an explicit true flag and lets a removed self-review return the goal to pending', () => {
    const lesson = lessons.compositeVolume;
    for (const value of [false, 'true', 1, null]) {
      expect(checks.objectiveStatus(lesson.objectiveEvidence[3], { activityReviews: evidence(lesson, savedReview(lesson, 3, value)) }).done).toBe(false);
    }
  });

  it('retains journal identity through a JSON save without mutating the saved evidence', () => {
    const lesson = lessons.compositeVolume, progress = savedReview(lesson, 3), before = JSON.stringify(progress);
    const reviews = evidence(JSON.parse(JSON.stringify(lesson)), JSON.parse(before));
    expect(checks.objectiveStatus(lesson.objectiveEvidence[3], { activityReviews: reviews }).done).toBe(true);
    expect(JSON.stringify(progress)).toBe(before);
  });

  it('does not borrow review marks from a changed lesson or an unavailable journal model', () => {
    const lesson = lessons.areaSurface, progress = savedReview(lesson, 4);
    expect(checks.objectiveStatus(lesson.objectiveEvidence[4], { activityReviews: evidence({ ...lesson, title: 'Changed lesson' }, progress) }).done).toBe(false);
    expect(checks.activityObjectiveReviews(lesson, progress)).toEqual({});
    expect(checks.activityObjectiveReviews(lesson, progress, () => null)).toEqual({});
  });
});

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler'].forEach(method => { value[method] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1; value.dot = () => 0;
    return value;
  }
  return new Proxy({}, { get: (_target, prop) => prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function() { return vec(); } });
}

function mount(key, lessonActivityProgress = {}, extra = {}) {
  const lesson = lessons[key], count = lesson.npcs.filter(npc => npc.question).length;
  const container = document.createElement('div'); document.body.appendChild(container);
  const loadCalls = [];
  window[ENGINE_KEY] = {
    clearWorld() {}, scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: { position: { x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone: () => ({ x: 0, y: 0, z: 0 }) }, quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {} },
    blocks: {}, npcs: lesson.npcs.map(data => ({ data })), blocksPlaced: 0, sessionLog: [], raycaster: null, flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _coordAnnounce: false, _targetGrid: null, _jumpLock: false, _sessionXP: 0, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson(lesson) { loadCalls.push(lesson); }, logEvent() {}, undo() {}, redo() {}, returnToSpawn() {}, clearPlayerBlocks() {}, measureStructure() {}, placeBlock() {}, removeBlock() {},
  };
  const toolData = { _threeLoaded: true, geometryWorld: { _introShownOnce: true, _geometryHomeInitial: false, showGeometryHome: false, worldActive: true, activeLesson: key, score: count, totalQ: count, answeredNpcs: Object.fromEntries(lesson.npcs.map((_npc, index) => [index, true])), lessonActivityProgress, ...extra } };
  let bump;
  const toasts = [];
  const ctx = makeCtx({
    toolData,
    addToast(message) { toasts.push(message); },
    update(bucket, name, value) { toolData[bucket] = { ...toolData[bucket], [name]: value }; if (bump) bump(); },
    updateMulti(bucket, patch) { toolData[bucket] = { ...toolData[bucket], ...patch }; if (bump) bump(); },
  });
  const Comp = () => { const state = React.useState(0); bump = () => state[1](value => value + 1); return render(ctx); };
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Comp)); });
  // Enter the existing world after the per-mount Home chooser has been presented.
  React.act(() => ctx.updateMulti('geometryWorld', { showGeometryHome: false, ...extra }));
  return { container, toasts, loadCalls, bucket: () => toolData.geometryWorld, patch(patch) { React.act(() => ctx.updateMulti('geometryWorld', patch)); }, unmount() { React.act(() => root.unmount()); container.remove(); } };
}

describe('The live completion summary reflects the activity journal', () => {
  it('keeps the surface comparison and learner build as still-to-try goals after questions finish', () => {
    const mounted = mount('areaSurface', {}, { buildToolsOpenLesson: true });
    try {
      const pending = mounted.container.querySelector('.gw-completion-still');
      expect(pending, JSON.stringify(window[ENGINE_KEY]._modalState)).toBeTruthy();
      expect(pending.querySelectorAll('li')).toHaveLength(2);
      expect(pending.textContent).toContain('Compare the full surface areas');
      expect(pending.textContent).toContain('Build and explain');
      expect(pending.textContent).toContain('self-review, not scored');
    } finally { mounted.unmount(); }
  }, 30000);

  it('advances only the matching activity and responds when its review is removed', () => {
    const lesson = lessons.areaSurface, mounted = mount('areaSurface', savedReview(lesson, 3));
    try {
      const pending = mounted.container.querySelector('.gw-completion-still');
      expect(pending.querySelectorAll('li')).toHaveLength(1);
      expect(pending.textContent).toContain('Build and explain');
      expect(pending.textContent).not.toContain('Compare the full surface areas');
      mounted.patch({ lessonActivityProgress: savedReview(lesson, 3, false) });
      expect(mounted.container.querySelector('.gw-completion-still').querySelectorAll('li')).toHaveLength(2);
      expect(mounted.container.querySelector('.gw-completion-still').textContent).toContain('Compare the full surface areas');
    } finally { mounted.unmount(); }
  }, 30000);

  it('does not credit the 50-unit build for solving its guide question, but honors saved self-review', () => {
    const lesson = lessons.compositeVolume, mounted = mount('compositeVolume');
    try {
      expect(mounted.container.querySelector('.gw-completion-still').textContent).toContain('exactly 50 cubic units');
      mounted.patch({ lessonActivityProgress: savedReview(lesson, 3) });
      expect(mounted.container.querySelector('.gw-completion-still')).toBeNull();
    } finally { mounted.unmount(); }
  }, 30000);

  it('does not announce an ungraded activity self-review as an automatically achieved objective', () => {
    const lesson = lessons.compositeVolume, mounted = mount('compositeVolume');
    try {
      window[ENGINE_KEY].sessionLog.push({ type: 'measurement', data: { occupiedVolume: 50 } });
      mounted.patch({ lessonActivityProgress: savedReview(lesson, 3) });
      expect(mounted.container.querySelector('.gw-completion-still')).toBeNull();
      expect(mounted.toasts.some(message => message.includes('Objective done:'))).toBe(false);
    } finally { mounted.unmount(); }
  }, 30000);
});

describe('Completed questions do not prevent further investigation', () => {
  it('opens Activities for remaining goals without resetting questions, journal, or world', () => {
    const lesson = lessons.areaSurface, journal = savedReview(lesson, 3), mounted = mount('areaSurface', journal);
    try {
      const before = mounted.bucket(), engine = window[ENGINE_KEY], blocks = engine.blocks, initialLoads = mounted.loadCalls.length;
      React.act(() => mounted.container.querySelector('.gw-completion-review').click());
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeNull();
      expect(mounted.bucket()).toMatchObject({ objectivesOpen: true, score: before.score, totalQ: before.totalQ, worldActive: true, activeLesson: 'areaSurface' });
      expect(mounted.bucket().answeredNpcs).toBe(before.answeredNpcs);
      expect(mounted.bucket().lessonActivityProgress).toBe(journal);
      expect(engine.blocks).toBe(blocks);
      expect(mounted.loadCalls).toHaveLength(initialLoads);
      expect(engine._modalState).toMatchObject({ showCompletion: false, showActivityGuide: true });
    } finally { mounted.unmount(); }
  }, 30000);

  it('opens the existing learning path for a non-activity lesson', () => {
    const mounted = mount('buildChallenge');
    try {
      React.act(() => mounted.container.querySelector('.gw-completion-review').click());
      expect(mounted.container.querySelector('.gw-objective-panel')).toBeTruthy();
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeNull();
      expect(mounted.bucket().score).toBe(mounted.bucket().totalQ);
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(false);
    } finally { mounted.unmount(); }
  }, 30000);

  it('releases modal state and inert world controls during exploration, then reopens the summary', () => {
    const mounted = mount('areaSurface', {}, { buildToolsOpenLesson: true });
    try {
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(true);
      expect(mounted.container.querySelector('.gw-hotbar').hasAttribute('inert')).toBe(true);
      React.act(() => mounted.container.querySelector('.gw-completion-explore').click());
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeNull();
      expect(mounted.container.querySelector('.gw-hotbar').hasAttribute('inert')).toBe(false);
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(false);
      expect(mounted.bucket().score).toBe(mounted.bucket().totalQ);
      const summary = mounted.container.querySelector('.gw-completion-summary-trigger');
      expect(summary, JSON.stringify(window[ENGINE_KEY]._modalState)).toBeTruthy();
      React.act(() => summary.click());
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeTruthy();
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(true);
      expect(mounted.container.querySelector('.gw-completion-still')).toBeTruthy();
    } finally { mounted.unmount(); }
  }, 30000);

  it('makes the updated summary available after an activity review without replaying questions', () => {
    const lesson = lessons.compositeVolume, mounted = mount('compositeVolume');
    try {
      React.act(() => mounted.container.querySelector('.gw-completion-review').click());
      mounted.patch({ objectivesOpen: false, lessonActivityProgress: savedReview(lesson, 3) });
      const summary = mounted.container.querySelector('.gw-completion-summary-trigger');
      expect(summary, JSON.stringify(window[ENGINE_KEY]._modalState)).toBeTruthy();
      React.act(() => summary.click());
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeTruthy();
      expect(mounted.container.querySelector('.gw-completion-still')).toBeNull();
      expect(mounted.bucket().score).toBe(mounted.bucket().totalQ);
      expect(mounted.container.querySelector('.gw-completion-review')).toBeNull();
      expect(mounted.container.querySelector('.gw-completion-explore')).toBeTruthy();
    } finally { mounted.unmount(); }
  }, 30000);

  it('dismisses with Escape and returns focus to the world without leaving a hidden focus trap', () => {
    vi.useFakeTimers();
    const mounted = mount('areaSurface');
    try {
      const dialog = mounted.container.querySelector('.gw-completion-dialog');
      expect(document.activeElement).toBe(dialog);
      React.act(() => { dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); vi.runOnlyPendingTimers(); });
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeNull();
      expect(document.activeElement).toBe(mounted.container.querySelector('#geoworld-fs-wrap'));
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(false);
      const summary = mounted.container.querySelector('.gw-completion-summary-trigger');
      expect(summary, JSON.stringify(window[ENGINE_KEY]._modalState)).toBeTruthy();
      React.act(() => summary.click());
      expect(document.activeElement).toBe(mounted.container.querySelector('.gw-completion-dialog'));
    } finally { mounted.unmount(); }
  }, 30000);

  it('resets temporary dismissal after a question-score reset and a lesson switch', () => {
    const mounted = mount('areaSurface');
    try {
      const score = mounted.bucket().score;
      React.act(() => mounted.container.querySelector('.gw-completion-explore').click());
      mounted.patch({ score: 0 });
      mounted.patch({ score });
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeTruthy();
      React.act(() => mounted.container.querySelector('.gw-completion-explore').click());
      mounted.patch({ activeLesson: 'compositeVolume', totalQ: 4, score: 4 });
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeTruthy();
    } finally { mounted.unmount(); }
  }, 30000);

  it('keeps temporary dismissal out of saved geometry state', () => {
    const mounted = mount('areaSurface');
    try {
      const before = JSON.stringify(mounted.bucket());
      React.act(() => mounted.container.querySelector('.gw-completion-explore').click());
      expect(JSON.stringify(mounted.bucket())).toBe(before);
      expect(Object.keys(mounted.bucket()).some(key => /completionReview|completionExplor|completionDismiss/i.test(key))).toBe(false);
    } finally { mounted.unmount(); }
  }, 30000);

  it.each(['showGeometryHome', 'showLessonIntro', 'showGameSettings', 'objectivesOpen'])('does not layer a completion dialog over %s while restoring completed state', flag => {
    const mounted = mount('areaSurface', {}, { [flag]: true });
    try {
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeNull();
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(false);
      mounted.patch({ [flag]: false });
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeTruthy();
      expect(window[ENGINE_KEY]._modalState.showCompletion).toBe(true);
    } finally { mounted.unmount(); }
  }, 30000);

  it('reopens the summary from the fullscreen quickbar', () => {
    const mounted = mount('areaSurface');
    try {
      React.act(() => mounted.container.querySelector('.gw-completion-explore').click());
      const summary = mounted.container.querySelector('.gw-fullscreen-quickbar .gw-completion-summary-trigger');
      expect(summary).toBeTruthy();
      React.act(() => summary.click());
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeTruthy();
    } finally { mounted.unmount(); }
  }, 30000);

  it('keeps the global return dock from covering the completion actions', () => {
    const mounted = mount('areaSurface');
    try {
      expect(mounted.container.querySelector('.gw-completion-review')).toBeTruthy();
      expect(mounted.container.querySelector('.gw-completion-explore')).toBeTruthy();
      expect(mounted.container.querySelector('.gw-return-dock')).toBeNull();
    } finally { mounted.unmount(); }
  }, 30000);

  it('cancels the pending automatic reflection when the learner reviews then resumes exploration', () => {
    vi.useFakeTimers();
    const lesson = lessons.areaSurface, index = lesson.npcs.findIndex(npc => npc.name === 'Layer Counter');
    const answered = Object.fromEntries(lesson.npcs.map((npc, i) => [i, !!npc.question && i !== index]));
    const mounted = mount('areaSurface', {}, { score: 2, totalQ: 3, answeredNpcs: answered, showNpcDialog: true, dialogNpcIdx: index, npcFollowUpStep: { [index]: 2 } });
    try {
      const correct = Array.from(mounted.container.querySelectorAll('button')).find(button => button.textContent.trim() === '100 cubic units');
      expect(correct).toBeTruthy();
      React.act(() => correct.click());
      expect(mounted.bucket().score).toBe(3);
      mounted.patch({ showNpcDialog: false });
      React.act(() => mounted.container.querySelector('.gw-completion-review').click());
      mounted.patch({ objectivesOpen: false });
      React.act(() => vi.advanceTimersByTime(6000));
      expect(mounted.bucket().showReflection).not.toBe(true);
      expect(mounted.container.querySelector('.gw-reflection-dialog')).toBeNull();
      expect(mounted.container.querySelector('.gw-completion-dialog')).toBeNull();
      expect(mounted.bucket().score).toBe(3);
    } finally { mounted.unmount(); }
  }, 30000);
});
