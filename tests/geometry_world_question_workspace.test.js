import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';
let cfg, api, lessons, mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion',
      'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt']
      .forEach(name => { value[name] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1; value.lengthSq = () => 1;
    value.dot = () => 0; value.toArray = () => [0, 0, 0];
    return value;
  }
  return new Proxy({}, { get: (_target, property) => property === 'SRGBColorSpace' ? 'srgb'
    : typeof property === 'symbol' ? undefined : function() { return vec(); } });
}

const station = {
  name: 'Layer Coach', dialogue: 'Connect the covered floor to the layers above it.', color: 0x16a34a, position: [4, 1, 11],
  after: 'Six squares in each of two layers occupy twelve cubic units.',
  question: { text: 'What is the area of the floor?', choices: ['6 square units', '5 square units', '20 square units'], correct: 0,
    why: { '5 square units': 'Area counts covered squares, so use rows times columns.', '20 square units': 'Only count the floor inside the walls.' },
    hint: 'Count rows times columns on the floor.',
    followUp: [{ text: 'What volume do two layers of six occupy?', choices: ['12 cubic units', '8 cubic units', '18 cubic units'], correct: 0,
      hint: 'Count the six cubes in each layer.', why: { '8 cubic units': 'Two layers are two groups of six.', '18 cubic units': 'There are two layers, not three.' } }] }
};

function sprite() { return { position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } }; }
function live(data) { return { data, body: sprite(), head: sprite(), label: sprite(), prompt: sprite(), qMark: sprite(), _arms: [], _eyeParts: [] }; }
function makeEngine(npcs = [live(station)]) {
  const vector = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return vector(); },
    toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
  const engine = {
    clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } },
    renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: { position: { x: 0, y: 0, z: 0, set: vi.fn(), toArray: () => [0, 0, 0] }, quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] },
      rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: value => value || vector(), updateProjectionMatrix() {}, lookAt: vi.fn(), up: vector() },
    blocks: {}, npcs, _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {},
    euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} }, isLocked: false, isInputActive: () => false,
    blockUnderCrosshair: () => null, loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, sessionLog: [], geometryHomeLessons: []
  };
  engine.logEvent = vi.fn((type, data) => engine.sessionLog.push({ type, data }));
  return engine;
}

function mountTool(overrides = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    worldActive: true, activeLesson: 'volumeExplorer', _introShownOnce: true, tutorialDismissed: true,
    showLessonIntro: false, npcTypewriterNpc: 0, npcTypewriterPos: 999, totalQ: 3, score: 0,
    showNpcDialog: true, dialogNpcIdx: 0, gwTypeAnswers: true
  }, overrides) };
  let bump;
  const awardXP = vi.fn();
  const context = makeCtx({ toolData, awardXP,
    update(section, key, value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  React.act(() => bump());
  mounted = { container, root, awardXP, bucket: () => toolData.geometryWorld,
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); } };
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function input(view) { return view.container.querySelector('.gw-typed-answer input'); }
function write(node, value) {
  expect(node).toBeTruthy();
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function submit(view) {
  const form = view.container.querySelector('.gw-typed-answer'); expect(form).toBeTruthy();
  const event = new Event('submit', { bubbles: true, cancelable: true });
  React.act(() => form.dispatchEvent(event)); expect(event.defaultPrevented).toBe(true);
}
function answerEvents() { return window[ENGINE_KEY].sessionLog.filter(event => event.type === 'answer_wrong' || event.type === 'answer_correct'); }
function modeButton(view, name) {
  return [...view.container.querySelectorAll('button.gw-answer-mode')].find(node => name === 'typed' ? /type/i.test(node.textContent) : /choices/i.test(node.textContent));
}
function questionSequence(question) {
  const result = [];
  (function visit(step) { if (!step) return; result.push(step); (step.followUp || []).forEach(visit); })(question);
  return result;
}

beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld');
  api = window.StemLab.geometryWorldAnswerCoaching; lessons = window.StemLab.geometryWorldWorksheets.presets();
}, 120000);
beforeEach(() => { localStorage.clear(); window.THREE = makeThreeStub(); window[ENGINE_KEY] = makeEngine(); });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('Geometry World typed-answer quantities retain their unit meaning', () => {
  const step = answer => ({ text: 'Find the quantity.', choices: [answer, '99', '101'], correct: 0 });

  it.each([
    ['6 square units', 'square units'], ['1 square unit', 'square units'], ['6 cubic units', 'cubic units'],
    ['1 cubic unit', 'cubic units'], ['4 blocks (6 - 1 - 1)', 'blocks'], ['2 layers', 'layers'],
    ['4 quarters', 'quarters'], ['3 cubes', 'cubes'], ['3 1/2 pizzas', 'pizzas'], ['2 times', 'times'],
    ['4 units', 'units'], ['4 whole cubes', 'cubes'], ['12 more cubic units', 'cubic units'],
    ['1 plant', 'plants'], ['24 plants', 'plants'], ['1 column', 'columns'], ['11 columns', 'columns'],
    ['1 copy', 'copies'], ['8 copies', 'copies'], ['24 square units, the same as the gold garden', 'square units'],
    ['12', ''], ['12 \u2014 go LEFT (north)', '']
  ])('names the quantity unit in %s without exposing its numerical answer', (answer, expected) => {
    const question = step(answer), before = JSON.stringify(question);
    expect(api.quantityUnit(question)).toBe(expected); expect(JSON.stringify(question)).toBe(before);
  });

  it.each(['6 square units', '6 square unit', '6 sq units', '6 unit^2', '6 units\u00b2'])('accepts equivalent area unit notation: %s', answer => {
    expect(api.typedAnswer(step('6 square units'), answer)).toMatchObject({ status: 'correct', value: 6 });
  });

  it.each(['6 cubic units', '6 cubic unit', '6 cu units', '6 unit^3', '6 units\u00b3'])('accepts equivalent volume unit notation: %s', answer => {
    expect(api.typedAnswer(step('6 cubic units'), answer)).toMatchObject({ status: 'correct', value: 6 });
  });

  it.each([
    ['6 square units', '6 cubic units', 'square units'], ['6 cubic units', '6 square units', 'cubic units'],
    ['6 cubic units', '6 blocks', 'cubic units'], ['6 blocks', '6 cubic units', 'blocks'],
    ['6 units', '6 square units', 'units'], ['6 layers', '6 quarters', 'layers'], ['6 cubes', '6 pizzas', 'cubes'],
    ['6 square units', '6 plants', 'square units'], ['6 columns', '6 units', 'columns'], ['6 copies', '6 cubes', 'copies']
  ])('does not grade %s as correct when explicitly answered %s', (correct, typed, expectedUnit) => {
    expect(api.typedAnswer(step(correct), typed)).toMatchObject({ status: 'unit', expectedUnit });
  });

  it('accepts bare numbers and equivalent fractions, leaving the general quantity parser unchanged', () => {
    const question = step('3 1/2 cubic units');
    for (const answer of ['3.5', '3 1/2', '7/2', '3\u00bd', '3.5 cubic units']) expect(api.typedAnswer(question, answer)).toMatchObject({ status: 'correct', value: 3.5 });
    expect(api.parseQuantity('6 bananas')).toBe(6); expect(api.parseQuantity('6 unit^2')).toBeNull();
    expect(api.typedAnswer(step('6 square units'), '5')).toMatchObject({ status: 'other', value: 5 });
  });

  it.each(['6 bananas', '6 / cats', '6 x', '6 =', '6 square units rubbish', 'six cubic units', '3/0', ''])('does not accept unknown trailing prose or malformed quantities: %s', typed => {
    expect(api.typedAnswer(step('6 cubic units'), typed)).toMatchObject({ status: 'invalid' });
  });

  it('retains exact authored direction and parenthesized-note answers', () => {
    for (const answer of ['12 \u2014 go LEFT (north)', '4 blocks (6 - 1 - 1)', '1 cubic unit (2 \u00d7 \u00bd = 1)', '24 square units, the same as the gold garden']) {
      expect(api.typedAnswer(step(answer), answer)).toMatchObject({ status: 'correct' });
    }
  });

  it('keeps every authored typeable answer compatible, including its bare numeric value', () => {
    let typeable = 0;
    Object.values(lessons).forEach(lesson => (lesson.npcs || []).forEach(npc => questionSequence(npc.question).forEach(question => {
      if (!api.stepTypeable(question)) return;
      typeable++;
      expect(api.typedAnswer(question, question.choices[question.correct]).status, question.text).toBe('correct');
      expect(api.typedAnswer(question, String(api.parseQuantity(question.choices[question.correct]))).status, question.text).toBe('correct');
    })));
    expect(typeable).toBeGreaterThan(40);
  });
});

describe('Geometry World solved-step recaps keep future answers private', () => {
  const sequence = {
    text: 'First step?', choices: ['11 blocks', '12 blocks'], correct: 0, explanation: 'The first layer holds eleven blocks.',
    followUp: [{ text: 'Second step?', choices: ['22 cubic units', '24 cubic units'], correct: 0,
      followUp: [{ text: 'Future step?', choices: ['987654 cubic units', '987655 cubic units'], correct: 0 }] }]
  };

  it('includes only preceding solved steps while the next question is pending', () => {
    expect(api.solvedSteps(sequence, 0, false)).toEqual([]);
    expect(api.solvedSteps(sequence, 1, false)).toEqual([{ text: 'First step?', answer: '11 blocks', explanation: 'The first layer holds eleven blocks.' }]);
    const recap = api.solvedSteps(sequence, 2, false);
    expect(recap.map(step => step.text)).toEqual(['First step?', 'Second step?']);
    expect(JSON.stringify(recap)).not.toContain('Future step?'); expect(JSON.stringify(recap)).not.toContain('987654');
  });

  it('includes all checked steps only for the strict completed flag', () => {
    expect(api.solvedSteps(sequence, 0, true).map(step => step.answer)).toEqual(['11 blocks', '22 cubic units', '987654 cubic units']);
    for (const value of [false, 1, 'true', {}, null, undefined]) expect(api.solvedSteps(sequence, 0, value)).toEqual([]);
  });

  it('omits malformed answer keys instead of exposing an arbitrary choice', () => {
    const question = { text: 'Root', choices: ['a', 'b'], correct: -1,
      followUp: [null, { text: 'Fractional index', choices: ['a', 'b'], correct: 0.5 },
        { text: 'String index', choices: ['a', 'b'], correct: '0' }, { text: 'Out of range', choices: ['a', 'b'], correct: 2 },
        { text: 'Valid', choices: ['yes', 'no'], correct: 0 }] };
    expect(api.solvedSteps(question, 0, true)).toEqual([{ text: 'Valid', answer: 'yes', explanation: '' }]);
  });

  it('floors a valid current-step position without including that step answer', () => {
    expect(api.solvedSteps(sequence, 1.9, false)).toHaveLength(1);
    expect(api.solvedSteps(sequence, 2, false)).toHaveLength(2);
    expect(JSON.stringify(api.solvedSteps(sequence, 2, false))).not.toContain('987654');
  });

  it.each([-1, -Infinity, NaN, undefined, null, Infinity, 999, 3, 'not a number'])('treats invalid current-step position %s as the first pending question', count => {
    const recap = api.solvedSteps(sequence, count, false);
    expect(recap).toEqual([]); expect(JSON.stringify(recap)).not.toContain('987654');
  });

  it('bounds authored display copy without mutating the question or exposing grading internals', () => {
    const question = { text: 'q'.repeat(500), choices: ['a'.repeat(500), 'b'], correct: 0,
      explanation: 'e'.repeat(500), why: { b: 'not this choice' }, privateField: 'private' };
    const before = JSON.stringify(question), result = api.solvedSteps(question, 0, true);
    expect(result).toEqual([{ text: 'q'.repeat(300), answer: 'a'.repeat(180), explanation: 'e'.repeat(300) }]);
    result[0].text = 'changed'; expect(JSON.stringify(question)).toBe(before);
  });

  it('does not stringify malformed explanation objects into learner copy', () => {
    const question = { text: 'Root', choices: ['1', '2'], correct: 0, explanation: { unsafe: true } };
    expect(api.solvedSteps(question, 0, true)).toEqual([{ text: 'Root', answer: '1', explanation: '' }]);
  });

  it('returns an empty recap for absent or incomplete question trees', () => {
    for (const question of [null, undefined, {}, { text: 'Only text' }, { choices: ['1', '2'], correct: 0 }]) {
      expect(api.solvedSteps(question, 1, true)).toEqual([]);
    }
  });
});

describe('Geometry World transfer prompts match the lesson without additional scoring', () => {
  it('relates place-value regrouping to stable value rather than using a generic volume prompt', () => {
    const prompt = api.transferPrompt(lessons.base10Blocks, 'base10Blocks');
    expect(prompt).toContain('without changing its value'); expect(prompt).toMatch(/ones, tens, and hundreds/);
    expect(prompt).not.toMatch(/occupied space|layers/);
  });

  it('emphasizes strategy and accuracy in the connected fluency maze without suggesting whole-maze measurement', () => {
    const prompt = api.transferPrompt(lessons.fluencyMaze, 'fluencyMaze');
    expect(prompt).toMatch(/edge-count|layer strategy/); expect(prompt).toContain('accurate'); expect(prompt).toContain('choosing a path');
    expect(prompt).not.toMatch(/\bM\b|measur|faster|race|speed/i);
  });

  it.each(['fractionVolume', 'fractionBuilder'])('retains the distinct contextual concept prompt for %s', key => {
    const prompt = api.transferPrompt(lessons[key], key);
    expect(prompt).toBe(window.StemLab.geometryWorldLessonChecks.conceptModel(lessons[key], key).question);
    expect(prompt).toMatch(key === 'fractionVolume' ? /partial layer/ : /fractional pieces/);
  });

  it('does not inspect keyed future answers or mutate imported lesson data when choosing a transfer question', () => {
    const lesson = { title: 'Covered gardens', objectives: ['Compare floor area'],
      npcs: [{ question: { text: 'Private future assessment', choices: ['987654 square units', '2 square units'], correct: 0 } }] };
    const before = JSON.stringify(lesson), prompt = api.transferPrompt(lesson, 'ai_custom');
    expect(prompt).toMatch(/rows and columns/); expect(prompt).not.toMatch(/987654|Private future assessment/);
    expect(JSON.stringify(lesson)).toBe(before);
  });
});

describe('Geometry World question workspace preserves thought and response context', () => {
  it('connects a visible quantity-specific label to the input and states current step progress', () => {
    const view = mountTool(), field = input(view);
    const label = view.container.querySelector('label[for="' + field.id + '"]');
    expect(label).toBeTruthy(); expect(view.container.querySelector('.gw-typed-answer').textContent).toContain('square units');
    expect(view.container.querySelector('.gw-question-progress').textContent).toMatch(/(?:Step|Question) 1 (?:of|\/) 2/i);
    expect(field.getAttribute('aria-invalid')).not.toBe('true');
  });

  it.each(['format', 'unit'])('retains an unscored %s draft with associated accessible feedback', kind => {
    const view = mountTool(), text = kind === 'unit' ? '6 cubic units' : '6 bananas';
    write(input(view), text); submit(view);
    expect(input(view).value).toBe(text); expect(input(view).getAttribute('aria-invalid')).toBe('true');
    const feedback = view.container.querySelector('.gw-answer-feedback');
    expect(feedback).toBeTruthy(); expect(input(view).getAttribute('aria-describedby').split(/\s+/)).toContain(feedback.id);
    if (kind === 'unit') expect(feedback.textContent).toContain('square units');
    expect(answerEvents()).toHaveLength(0); expect(view.awardXP).not.toHaveBeenCalled();
    expect(view.bucket().npcWrongCount || {}).toEqual({}); expect(view.bucket().score).toBe(0);
    expect(view.bucket().npcFollowUpStep || {}).toEqual({});
  });

  it.each(['6 plants', '6 columns', '6 copies'])('keeps recognized count-unit mismatch %s non-scoring', text => {
    const view = mountTool(); write(input(view), text); submit(view);
    expect(input(view).value).toBe(text); expect(input(view).getAttribute('aria-invalid')).toBe('true');
    expect(view.container.querySelector('.gw-answer-feedback').textContent).toContain('square units');
    expect(answerEvents()).toHaveLength(0); expect(view.bucket().npcWrongCount || {}).toEqual({});
    expect(view.awardXP).not.toHaveBeenCalled(); expect(view.bucket().score).toBe(0);
  });

  it('keeps a scored numerical retry distinct from format or unit feedback', () => {
    const view = mountTool(); write(input(view), '5 square units'); submit(view);
    expect(input(view).value).toBe('5 square units'); expect(input(view).getAttribute('aria-invalid')).not.toBe('true');
    expect(view.container.querySelector('.gw-answer-feedback').textContent).toContain('Area counts covered squares');
    expect(answerEvents()).toHaveLength(1); expect(answerEvents()[0]).toMatchObject({ type: 'answer_wrong', data: { mode: 'typed' } });
    expect(view.bucket().npcWrongCount[0]).toBe(1); expect(view.awardXP).not.toHaveBeenCalled();
  });

  it('retains an unfinished typed draft while Looking at the world and returning to the question', () => {
    const view = mountTool(); write(input(view), '3 1/2'); click(view.container.querySelector('.gw-npc-look'));
    expect(view.container.querySelector('.gw-typed-answer')).toBeNull(); expect(view.bucket().npcDialogPeek).toBe(true);
    click(view.container.querySelector('.gw-npc-peek-back')); expect(input(view).value).toBe('3 1/2');
    expect(answerEvents()).toHaveLength(0);
  });

  it('retains draft and unit feedback when closing and reopening the same question', () => {
    const view = mountTool(); write(input(view), '6 cubic units'); submit(view);
    click(view.container.querySelector('.gw-dialog--npc .gw-dialog-close')); expect(view.bucket().showNpcDialog).toBe(false);
    view.patch({ showNpcDialog: true });
    expect(input(view).value).toBe('6 cubic units'); expect(input(view).getAttribute('aria-invalid')).toBe('true');
    expect(view.container.querySelector('.gw-answer-feedback').textContent).toContain('square units'); expect(answerEvents()).toHaveLength(0);
  });

  it('keeps both response modes in a named group and retains a draft across mode changes', () => {
    const view = mountTool(); write(input(view), '5.5');
    const choices = modeButton(view, 'choices'); expect(choices).toBeTruthy();
    const group = choices.closest('[role="group"]'); expect(group).toBeTruthy(); expect(group.getAttribute('aria-label')).toBeTruthy();
    click(choices); expect(view.container.querySelector('.gw-typed-answer')).toBeNull();
    click(modeButton(view, 'typed')); expect(input(view).value).toBe('5.5');
    expect(modeButton(view, 'typed').getAttribute('aria-pressed')).toBe('true'); expect(answerEvents()).toHaveLength(0);
  });

  it('shows a solved-step recap, moves to the new quantity, and clears only the solved station draft', () => {
    const view = mountTool({ npcAnswerDrafts: { 1: { step: 0, text: '9 cubic units' } } });
    write(input(view), '6'); submit(view);
    expect(view.bucket().npcFollowUpStep[0]).toBe(1); expect(input(view).value).toBe('');
    expect(view.container.querySelector('.gw-question-progress').textContent).toMatch(/(?:Step|Question) 2 (?:of|\/) 2/i);
    expect(view.container.querySelector('.gw-typed-answer').textContent).toContain('cubic units');
    const recap = view.container.querySelector('.gw-answer-recap'); expect(recap).toBeTruthy();
    expect(recap.textContent).toContain('6 square units'); expect(recap.textContent).toContain('What is the area of the floor?');
    expect(view.bucket().npcAnswerDrafts[1]).toEqual({ step: 0, text: '9 cubic units' });
    expect(answerEvents()).toHaveLength(1); expect(answerEvents()[0]).toMatchObject({ type: 'answer_correct', data: { step: 0, mode: 'typed' } });
    expect(view.awardXP).toHaveBeenCalledWith('geometryWorld', 1, 'Typed answer: Layer Coach');
  });

  it('does not reuse another station draft or a draft from a different step', () => {
    const second = { ...station, name: 'Second Coach' }; window[ENGINE_KEY] = makeEngine([live(station), live(second)]);
    const view = mountTool(); write(input(view), '4.5'); view.patch({ dialogNpcIdx: 1 }); expect(input(view).value).toBe('');
    write(input(view), '7.5'); view.patch({ dialogNpcIdx: 0 }); expect(input(view).value).toBe('4.5');
    view.patch({ npcFollowUpStep: { 0: 1 } }); expect(input(view).value).toBe('');
    expect(answerEvents()).toHaveLength(0);
  });

  it.each([-1, Infinity, 999, 2, 'not a number'])('shows the first question without a leaked recap for invalid saved follow-up position %s', position => {
    const view = mountTool({ npcFollowUpStep: { 0: position } });
    expect(view.container.querySelector('.gw-question-progress').textContent).toMatch(/(?:Step|Question) 1 (?:of|\/) 2/i);
    expect(view.container.querySelector('.gw-answer-recap')).toBeNull();
    expect(view.container.querySelector('.gw-typed-answer').textContent).toContain('square units');
    expect(view.container.querySelector('.gw-question-text').textContent).toBe('What is the area of the floor?');
    expect(view.container.querySelector('.gw-dialog--npc').textContent).not.toContain('12 cubic units');
    expect(answerEvents()).toHaveLength(0); expect(view.awardXP).not.toHaveBeenCalled();
    click(view.container.querySelector('.gw-npc-look'));
    expect(view.container.querySelector('.gw-npc-peek-text').textContent).toBe('What is the area of the floor?');
    click(view.container.querySelector('.gw-npc-peek-back'));
    expect(view.container.querySelector('.gw-question-progress').textContent).toMatch(/(?:Step|Question) 1 (?:of|\/) 2/i);
    expect(view.container.querySelector('.gw-answer-recap')).toBeNull();
  });

  it.each(['false', 1, {}])('does not treat malformed saved answered flag %s as checked evidence or expose future answers', flag => {
    const view = mountTool({ answeredNpcs: { 0: flag } });
    expect(view.container.querySelector('.gw-question-text').textContent).toBe('What is the area of the floor?');
    expect(view.container.querySelector('.gw-typed-answer')).toBeTruthy();
    expect(view.container.querySelector('.gw-answer-recap')).toBeNull();
    expect(view.container.querySelector('.gw-npc-after')).toBeNull(); expect(view.container.querySelector('.gw-npc-transfer')).toBeNull();
    expect(view.container.querySelector('.gw-dialog--npc').textContent).not.toContain('12 cubic units');
    expect(answerEvents()).toHaveLength(0); expect(view.awardXP).not.toHaveBeenCalled();
    click(view.container.querySelector('.gw-npc-look'));
    expect(view.container.querySelector('.gw-npc-peek-text').textContent).toBe('What is the area of the floor?');
  });

  it('keeps the teacher reaction and adds contextual unscored transfer instead of generic trivia', () => {
    const view = mountTool({ answeredNpcs: { 0: true }, score: 1, npcFollowUpStep: { 0: 1 } });
    expect(view.container.querySelector('.gw-npc-after').textContent).toBe('Layer Coach: Six squares in each of two layers occupy twelve cubic units.');
    const transfer = view.container.querySelector('.gw-npc-transfer'); expect(transfer).toBeTruthy();
    expect(transfer.textContent).toMatch(/\?/); expect(view.container.querySelector('.gw-dialog--npc').textContent).not.toMatch(/Fun fact/i);
    expect(view.bucket().score).toBe(1); expect(view.bucket().answeredNpcs).toEqual({ 0: true });
    expect(view.bucket().npcFollowUpStep).toEqual({ 0: 1 }); expect(answerEvents()).toHaveLength(0); expect(view.awardXP).not.toHaveBeenCalled();
  });

  it('uses reachable targets for checking and switching response mode', () => {
    const view = mountTool();
    for (const node of [view.container.querySelector('.gw-typed-answer button[type="submit"]'), ...view.container.querySelectorAll('button.gw-answer-mode')]) {
      expect(parseFloat(getComputedStyle(node).minHeight)).toBeGreaterThanOrEqual(44);
    }
  });

  it('gives a custom area question neutral quantity-and-unit coaching instead of a volume formula', () => {
    const custom = { name: 'Custom Area Coach', dialogue: 'Compare the covered floor.', position: [4, 1, 11],
      question: { text: 'What is the area of this footprint?', choices: ['6 square units', '5 square units', '20 square units'], correct: 0 } };
    window[ENGINE_KEY] = makeEngine([live(custom)]);
    const view = mountTool(); write(input(view), '5'); submit(view);
    const feedback = view.container.querySelector('.gw-answer-feedback').textContent;
    expect(feedback).toMatch(/quantity|units/i); expect(feedback).not.toMatch(/L\s*(?:\u00d7|x)\s*W|long.*wide.*tall|multiply/i);
    expect(answerEvents()).toHaveLength(1); expect(view.bucket().npcWrongCount[0]).toBe(1);
  });

  it('clears question drafts through Reset World even when the mounted engine loader is a stub', () => {
    const view = mountTool(); write(input(view), '4.5');
    view.patch({ showNpcDialog: false, objectivesOpen: true }); click(view.container.querySelector('.gw-reset-button'));
    expect(view.bucket().npcAnswerDrafts).toEqual({});
    view.patch({ objectivesOpen: false, showNpcDialog: true }); expect(input(view).value).toBe('');
    expect(answerEvents()).toHaveLength(0);
  });
});
