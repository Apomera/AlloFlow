// Geometry World answer coaching and objective evidence (2026-09-24).
//
// Before: every wrong answer got a keyword-picked "L x W x H" nudge, even on place
// value and fraction questions; a solved character said a generic fun fact; every
// question was three-option multiple choice (a guess is right a third of the time);
// and the Objectives checklist ticked objective i once i questions were answered,
// in any order, so answering the L-block first ticked "Find the volume of the blue
// prism".
// After: a wrong choice gets the note written for that choice (keyed by choice TEXT,
// so the load-time rotation cannot misalign it); a quantity question can be typed
// instead (a typed distractor gets that distractor's note); each character can
// react when solved; each objective ticks on its own evidence.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cfg, api, lessons;
function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach((m) => { v[m] = () => v; });
    v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.lengthSq = () => 1; v.dot = () => 0; v.toArray = () => [0, 0, 0];
    return v;
  }
  // Constructors are called with new, so these must be plain functions.
  return new Proxy({}, { get: (_t, prop) => (prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function () { return vec(); }) });
}
beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub();
  cfg = loadTool(FILE, 'geometryWorld');
  api = window.StemLab.geometryWorldAnswerCoaching;
  lessons = window.StemLab.geometryWorldWorksheets.presets();
}, 120000);

const sequence = (q) => { const out = []; (function visit(x) { if (!x) return; out.push(x); (x.followUp || []).forEach(visit); })(q); return out; };

describe('reading a quantity from a choice or a typed answer', () => {
  it.each([
    ['60 cubic units', 60], ['12', 12], ['2.5', 2.5], ['.5', 0.5], ['3½', 3.5], ['3 1/2', 3.5], ['1/2', 0.5], ['¼ cubic unit', 0.25],
    ['4 blocks (6 - 1 - 1)', 4], ['12 — go LEFT (north)', 12], ['1 cubic unit (2 × ½ = 1)', 1], ['1,000', 1000],
  ])('%s -> %s', (text, value) => expect(api.parseQuantity(text)).toBe(value));
  it.each(['6×3×2 = 36 ✓', 'About 1.67× (5/3)', 'Yes! Fractional height', '5x3x4', '12 3', '', 'abc', '3/0'])('%s is not one quantity', (text) => {
    expect(api.parseQuantity(text)).toBeNull();
  });
});

describe('which steps can be typed, and how a typed answer is read', () => {
  const pool = { choices: ['6 square units', '5 square units', '20 square units'], correct: 0 };
  it('a quantity step is typeable; one whose choices share its number or are sentences is not', () => {
    expect(api.stepTypeable(pool)).toBe(true);
    expect(api.stepTypeable({ choices: ['6 cubic units', '6 square units', '12 cubic units'], correct: 0 })).toBe(false);
    expect(api.stepTypeable({ choices: ['2 wide, 3 tall', '2 wide, 2 tall', '3 wide, 2 tall'], correct: 1 })).toBe(false);
    expect(api.stepTypeable({ choices: ['3×3×3 = 27', '6×3×2 = 36 ✓', '5×4×2 = 40'], correct: 1 })).toBe(false);
  });
  it('reads the typed number as the matching choice', () => {
    expect(api.typedAnswer(pool, '6')).toMatchObject({ status: 'correct', choiceIndex: 0 });
    expect(api.typedAnswer(pool, ' 5 square units ')).toMatchObject({ status: 'choice', choiceIndex: 1 });
    expect(api.typedAnswer(pool, '7')).toMatchObject({ status: 'other', value: 7 });
    expect(api.typedAnswer(pool, 'six')).toEqual({ status: 'invalid' });
  });
  it('every authored lesson has typeable steps, and every typeable step accepts its own answer typed', () => {
    let typeable = 0;
    Object.values(lessons).forEach((lesson) => (lesson.npcs || []).forEach((npc) => sequence(npc.question).forEach((step) => {
      if (!api.stepTypeable(step)) return;
      typeable++;
      const answer = String(api.parseQuantity(step.choices[step.correct]));
      expect(api.typedAnswer(step, answer).status, step.text).toBe('correct');
    })));
    expect(typeable).toBeGreaterThan(40);
  });
});

describe('what a wrong attempt says', () => {
  const step = { choices: ['6', '5', '20'], correct: 0, why: { 5: 'You added 3 and 2. Area multiplies.' }, hint: 'Multiply length by width.' };
  it('the note for that choice, then the step hint, then the caller’s nudge', () => {
    expect(api.wrongFeedback(step, '5', 1, 'fallback')).toBe('You added 3 and 2. Area multiplies.');
    expect(api.wrongFeedback(step, '20', 1, 'fallback')).toBe('Multiply length by width.');
    expect(api.wrongFeedback(step, '5', 3, 'fallback')).toBe('You added 3 and 2. Area multiplies. Multiply length by width.');
    expect(api.wrongFeedback({ choices: ['1', '2'], correct: 0 }, '2', 1, 'fallback')).toBe('fallback');
    // AI lessons can carry junk; it is never rendered.
    expect(api.wrongFeedback({ why: { 2: { html: true } } }, '2', 1, 'fallback')).toBe('fallback');
  });
});

describe('objective evidence', () => {
  const s = (extra) => Object.assign({ answered: {}, measurements: [], placements: [] }, extra);
  it('names the evidence and ticks only on it', () => {
    expect(api.objectiveStatus({ npc: 'Quiz Master' }, s())).toMatchObject({ done: false, evidence: 'Answer Quiz Master’s question' });
    expect(api.objectiveStatus({ npc: 'Quiz Master' }, s({ answered: { 'Quiz Master': true } }))).toMatchObject({ done: true });
    expect(api.objectiveStatus({ npcs: ['A', 'B', 'C'] }, s({ answered: { A: true } }))).toMatchObject({ done: false, evidence: '1 of 3 guides solved' });
    expect(api.objectiveStatus({ measure: 2 }, s({ measurements: [{}] }))).toMatchObject({ done: false, evidence: '1 of 2 measurements' });
    expect(api.objectiveStatus({ measureVolume: 3.5 }, s({ measurements: [{ occupiedVolume: 3.5 }] }))).toMatchObject({ done: true, evidence: 'Measured 3 1/2 cubic units' });
    expect(api.objectiveStatus({ predict: 1 }, s({ measurements: [{ prediction: null }, { prediction: 12 }] }))).toMatchObject({ done: true });
    expect(api.objectiveStatus({ place: { shapes: ['halfA', 'halfB'], count: 2 } }, s({ placements: [{ shape: 'halfB' }, { shape: 'cube' }] }))).toMatchObject({ done: false, evidence: '1 of 2 placed' });
    expect(api.objectiveStatus({ shapes: 3 }, s({ placements: [{ shape: 'cube' }, { shape: 'halfA' }, { shape: 'quarter' }] }))).toMatchObject({ done: true });
    expect(api.objectiveStatus({ buildHeight: 4 }, s({ studentHeight: 3 }))).toMatchObject({ done: false, evidence: '3 of 4 layers high' });
    expect(api.objectiveStatus({ self: true }, s({ selfChecked: true }))).toMatchObject({ done: true, self: true });
    // Finishing the questions (2026-09-24) ticks what they cover and 'complete' rules; a
    // building or measuring objective still needs its evidence.
    expect(api.objectiveStatus({ complete: true }, s({ complete: true }))).toMatchObject({ done: true, evidence: 'Lesson complete' });
    expect(api.objectiveStatus({ complete: true }, s())).toMatchObject({ done: false, evidence: 'Finish the lesson' });
    expect(api.objectiveStatus({ npc: 'X' }, s({ complete: true, answered: { X: true } }))).toMatchObject({ done: true });
    expect(api.objectiveStatus({ place: { shapes: ['halfA', 'halfB'], count: 2 } }, s({ complete: true }))).toMatchObject({ done: false, evidence: '0 of 2 placed' });
    expect(api.objectiveStatus({ measure: 1 }, s({ complete: true }))).toMatchObject({ done: false, evidence: '0 of 1 measurement' });
    expect(api.objectiveStatus({ self: true }, s({ complete: true }))).toMatchObject({ done: false, self: true });
    expect(api.objectiveStatus({}, s({ complete: true }))).toMatchObject({ done: true, evidence: 'Lesson complete' });
  });
  it('every rule matches its lesson: one per objective, and every named guide asks a question there', () => {
    Object.entries(api.objectiveEvidence).forEach(([key, rules]) => {
      const lesson = lessons[key];
      expect(lesson, key).toBeTruthy();
      expect(rules.length, key).toBe(lesson.objectives.length);
      expect(lesson.objectiveEvidence, key).toEqual(rules);
      const asks = new Set(lesson.npcs.filter((n) => n.question).map((n) => n.name));
      rules.forEach((rule) => (rule.npcs || (rule.npc ? [rule.npc] : [])).forEach((name) => expect(asks.has(name), key + ': ' + name).toBe(true)));
    });
    // Every guided lesson without an activity guide has rules.
    Object.entries(lessons).filter(([, l]) => !(l.activities || []).length && (l.objectives || []).length).forEach(([key]) => expect(api.objectiveEvidence[key], key).toBeTruthy());
  });
});

describe('lesson coaching covers every question', () => {
  it('every question character has an after line, and every step a hint and a note for each wrong choice', () => {
    const gaps = [];
    Object.entries(lessons).forEach(([key, lesson]) => (lesson.npcs || []).filter((n) => n.question).forEach((npc) => {
      if (typeof npc.after !== 'string' || !npc.after) gaps.push(key + '/' + npc.name + ': after');
      sequence(npc.question).forEach((step, i) => {
        if (typeof step.hint !== 'string' || !step.hint) gaps.push(key + '/' + npc.name + '#' + i + ': hint');
        step.choices.forEach((choice, ci) => {
          if (ci === step.correct) { if (step.why && step.why[choice]) gaps.push(key + '/' + npc.name + '#' + i + ': note on the CORRECT choice'); return; }
          if (!step.why || typeof step.why[choice] !== 'string' || !step.why[choice]) gaps.push(key + '/' + npc.name + '#' + i + ': no note for ' + choice);
        });
        Object.keys(step.why || {}).forEach((k) => { if (step.choices.indexOf(k) < 0) gaps.push(key + '/' + npc.name + '#' + i + ': note for a choice that does not exist: ' + k); });
      });
    }));
    expect(gaps).toEqual([]);
  });
  it('coaching text follows the house style: no em or en dashes, short enough to read', () => {
    const texts = [];
    Object.values(api.coaching).forEach((byNpc) => Object.values(byNpc).forEach((entry) => {
      texts.push(entry.after);
      (entry.steps || []).forEach((st) => { texts.push(st.hint); Object.values(st.why || {}).forEach((w) => texts.push(w)); });
    }));
    expect(texts.length).toBeGreaterThan(150);
    texts.forEach((t) => { expect(t).not.toMatch(/[–—]/); expect(t.length).toBeLessThanOrEqual(180); });
  });
});

describe('the NPC dialog, mounted', () => {
  function fakeEngine(npcs) {
    const canvas = document.createElement('canvas');
    const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
    return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
      camera: { position: { x: 0, y: 0, z: 0, set: vi.fn(), toArray: () => [0, 0, 0] }, quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt: vi.fn(), up: v() },
      blocks: {}, npcs: npcs || [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
      isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
      clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent: vi.fn(), sessionLog: [], geometryHomeLessons: [] };
  }
  const spr = () => ({ position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } });
  const live = (data) => ({ data, body: spr(), head: spr(), label: spr(), prompt: spr(), qMark: spr(), _arms: [], _eyeParts: [] });
  function mount(bucket, extra) {
    const container = document.createElement('div'); document.body.appendChild(container);
    const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
    let bump = null;
    const ctx = makeCtx(Object.assign({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } }, extra || {}));
    const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
    const root = ReactDOMClient.createRoot(container);
    React.act(() => { root.render(React.createElement(Comp)); });
    React.act(() => bump());
    return { container, bucket: () => toolData.geometryWorld, unmount: () => { React.act(() => root.unmount()); container.remove(); } };
  }
  const base = { worldActive: true, activeLesson: 'volumeExplorer', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, npcTypewriterNpc: 0, npcTypewriterPos: 999, totalQ: 3, score: 0 };
  beforeEach(() => { window.THREE = makeThreeStub(); localStorage.clear(); });
  afterEach(() => { delete window[ENGINE_KEY]; document.body.innerHTML = ''; });

  const builderBot = { name: 'Builder Bot', dialogue: 'Fill the pool!', color: 0x16a34a, position: [4, 1, 11], after: 'Six squares on the floor, two layers: 12 blocks fill the pool.',
    question: { text: 'What is the area of the pool floor?', choices: ['6 square units', '5 square units', '20 square units'], correct: 0,
      why: { '5 square units': 'You added 3 and 2. Area counts the squares: multiply.', '20 square units': 'That is the outside floor. The walls take up the edge.' },
      hint: 'Count the squares inside the walls: rows times columns.',
      followUp: [{ text: 'Now stack 2 layers of 6. How many total blocks?', choices: ['12 blocks', '8 blocks', '18 blocks'], correct: 0 }] } };

  it('a wrong choice shows the note written for that choice, and it stays under the question', () => {
    window[ENGINE_KEY] = fakeEngine([live(builderBot)]);
    const m = mount(Object.assign({}, base, { showNpcDialog: true, dialogNpcIdx: 0 }));
    const choice = [...m.container.querySelectorAll('button')].find((b) => b.textContent === '5 square units');
    React.act(() => choice.click());
    expect(m.container.querySelector('.gw-answer-feedback').textContent).toBe('You added 3 and 2. Area counts the squares: multiply.');
    expect(m.bucket().npcFeedback[0]).toMatchObject({ step: 0, answer: '5 square units' });
    expect(window[ENGINE_KEY].logEvent).toHaveBeenCalledWith('answer_wrong', expect.objectContaining({ chosenAnswer: '5 square units', mode: 'choice' }));
    m.unmount();
  });

  it('typing: a typed distractor gets its note, an unknown number the hint, words a format tip; the right number advances and pays +1', () => {
    window[ENGINE_KEY] = fakeEngine([live(builderBot)]);
    const awardXP = vi.fn();
    const m = mount(Object.assign({}, base, { showNpcDialog: true, dialogNpcIdx: 0 }), { awardXP });
    const toggle = m.container.querySelector('.gw-answer-mode');
    expect(toggle.textContent).toMatch(/Type my answer instead/);
    React.act(() => toggle.click());
    const type = (text) => { const input = m.container.querySelector('.gw-typed-answer input'); input.value = text; React.act(() => m.container.querySelector('.gw-typed-answer').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))); };
    type('20');
    expect(m.container.querySelector('.gw-answer-feedback').textContent).toBe('That is the outside floor. The walls take up the edge.');
    type('7');
    expect(m.container.querySelector('.gw-answer-feedback').textContent).toBe('Count the squares inside the walls: rows times columns.');
    type('six');
    expect(m.container.querySelector('.gw-answer-feedback').textContent).toMatch(/Type a number/);
    type('6');
    expect(m.bucket().npcFollowUpStep[0]).toBe(1);
    expect(m.container.querySelector('.gw-answer-feedback')).toBeNull();
    expect(awardXP).toHaveBeenCalledWith('geometryWorld', 1, 'Typed answer: Builder Bot');
    expect(window[ENGINE_KEY].logEvent).toHaveBeenCalledWith('answer_correct', expect.objectContaining({ mode: 'typed', step: 0 }));
    m.unmount();
  });

  it('a solved character says its own line', () => {
    window[ENGINE_KEY] = fakeEngine([live(builderBot)]);
    const m = mount(Object.assign({}, base, { showNpcDialog: true, dialogNpcIdx: 0, answeredNpcs: { 0: true }, score: 1 }));
    expect(m.container.querySelector('.gw-npc-after').textContent).toBe('Builder Bot: Six squares on the floor, two layers: 12 blocks fill the pool.');
    m.unmount();
  });

  it('Objectives tick on evidence, not on how many questions were answered', () => {
    // volumeExplorer: objective 0 is the blue prism (Quiz Master), 1 the pool (Builder Bot).
    const qm = { name: 'Quiz Master', dialogue: 'x', color: 0x2563eb, position: [12, 5, 3], question: { text: 'q', choices: ['1', '2', '3'], correct: 0 } };
    const lb = { name: 'L-Block Sage', dialogue: 'x', color: 0xf59e0b, position: [18, 4, 12], question: { text: 'q', choices: ['1', '2', '3'], correct: 0 } };
    window[ENGINE_KEY] = fakeEngine([live({ name: 'Professor Block', dialogue: 'x', position: [4, 1, 4] }), live(qm), live(builderBot), live(lb)]);
    const m = mount(Object.assign({}, base, { objectivesOpen: true, answeredNpcs: { 2: true }, score: 1 }));
    const items = [...m.container.querySelectorAll('.gw-objective-item')];
    expect(items.map((i) => i.getAttribute('data-complete'))).toEqual(['false', 'true', 'false']);
    expect(items[0].tagName).toBe('BUTTON');
    expect(items[0].getAttribute('aria-label')).toMatch(/^Go to Quiz Master for: /);
    expect(items[1].tagName).toBe('DIV');
    expect(items[1].textContent).toContain('Builder Bot solved');
    React.act(() => items[0].click());
    expect(window[ENGINE_KEY].camera.position.set).toHaveBeenCalledWith(10, 7, 1);
    m.unmount();
  });
});
