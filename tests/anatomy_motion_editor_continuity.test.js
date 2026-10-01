import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const clone = value => JSON.parse(JSON.stringify(value));
const row = (extra = {}) => ({ prediction: null, explanation: '', transfer: null, transferExplanation: '', selfReview: false, ...extra });
const initialWriting = {
  exercise: row({ prediction: 'less', explanation: 'A thicker barrier slows oxygen transfer.', transferExplanation: 'Holding a bag still still needs muscle tension.' }),
  meal: row({ explanation: 'Villi provide absorptive surface area.', transferExplanation: 'Sugars enter blood while long-chain fats enter lymph.' }),
  wound: row({ explanation: 'Perfusion supplies rebuilding tissue.' }),
  fluid: row({ explanation: 'Filter volume and protein selectivity differ.' })
};
const base = {
  system: 'muscular', view: 'anterior', complexity: 1, selectedStructure: 'quads', _activeTab: 'explore',
  _showSystemsMotion: true, _showStudySheet: false, _anatomyModelFocus: false, _studySheetRevision: 0,
  _systemsMotionScenario: 'exercise', _systemsMotionStep: 0, _systemsMotionPerturbation: false,
  _regionalAtlasOpen: 'quads', _regionalAtlasStep: 3, _regionalAtlasClinical: false,
  _systemsMotionLearning: initialWriting, _structureNotes: { quads: 'My separate structure note.' },
  quizIdx: 2, quizScore: 1, _quizAttempts: 3, _aiInput: 'Keep my tutor draft.'
};
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
let rectsDescriptor, scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(1800000000000); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  if (rectsDescriptor) Object.defineProperty(HTMLElement.prototype, 'getClientRects', rectsDescriptor); else delete HTMLElement.prototype.getClientRects;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor); else delete HTMLElement.prototype.scrollIntoView;
});
function session(file, extra = {}, freshSetterWrapper = false) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, grade = '5', host, deferred = false, queue = [];
  const announce = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: grade, announceToSR: announce,
    setToolData: freshSetterWrapper ? update => setToolData(update) : setToolData });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const found = find(tree(), predicate); expect(found).not.toBeNull(); return found; };
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); vi.advanceTimersByTime(0); announce.mockClear();
  const action = name => {
    if (name === 'explanation' || name === 'comparison') {
      const id = name === 'explanation' ? 'anatomy-motion-explanation' : 'anatomy-motion-transfer-explanation';
      const handler = node(n => n.props?.id === id).props.onChange;
      return value => handler({ target: { value } });
    }
    if (name === 'prediction') return node(n => n.type === 'input' && n.props?.name === 'anatomy-motion-prediction' && n.props.value === 'more').props.onChange;
    if (name === 'transfer') return node(n => n.props?.['data-anatomy-motion-transfer-option'] === '1').props.onClick;
    if (name === 'self-review') return node(n => n.props?.['data-anatomy-motion-self-review-toggle']).props.onClick;
    if (name === 'reveal') return node(n => n.props?.['data-anatomy-motion-reveal'] === 'true').props.onClick;
    return node(n => n.type === 'button' && n.props?.children === 'Apply disruption').props.onClick;
  };
  return {
    data: () => data.anatomy, tree, node, action, announce,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    grade: value => { grade = value; },
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(apply); },
    change: (name, value) => action(name)(value)
  };
}
const contextChanges = [
  ['scenario', s => s.patch({ _systemsMotionScenario: 'meal' })],
  ['mode', s => s.patch({ _activeTab: 'quiz', quizMode: true })],
  ['closed activity', s => s.patch({ _showSystemsMotion: false })],
  ['opened study sheet', s => s.patch({ _showStudySheet: true })],
  ['reopened study sheet generation', s => s.patch({ _studySheetRevision: 1 })],
  ['model focus', s => s.patch({ _anatomyModelFocus: true })],
  ['selected structure', s => s.patch({ selectedStructure: 'biceps' })],
  ['system', s => s.patch({ system: 'skeletal' })],
  ['view', s => s.patch({ view: 'posterior' })],
  ['learning level', s => s.patch({ complexity: 2 })],
  ['pathway step', s => s.patch({ _systemsMotionStep: 1 })],
  ['atlas structure', s => s.patch({ _regionalAtlasOpen: 'biceps' })],
  ['atlas step', s => s.patch({ _regionalAtlasStep: 2 })]
];
for (const file of files) describe('Systems in Motion editor continuity: ' + file, () => {
  it('accepts a normal prediction, reveal, writing, self-review, and transfer journey', () => {
    const s = session(file, { _systemsMotionLearning: { ...clone(initialWriting), exercise: row() } });
    s.action('apply')(); expect(s.data()._systemsMotionPredicting).toBe('exercise');
    s.node(n => n.type === 'input' && n.props?.name === 'anatomy-motion-prediction' && n.props.value === 'less').props.onChange();
    s.action('reveal')(); expect(s.data()._systemsMotionPerturbation).toBe(true);
    s.change('explanation', 'The barrier reduces oxygen reaching working muscle.');
    s.action('self-review')(); s.action('transfer')(); s.change('comparison', 'An isometric contraction produces tension without moving the joint.');
    expect(s.data()._systemsMotionLearning.exercise).toMatchObject({ prediction: 'less', selfReview: true, transfer: 1,
      explanation: 'The barrier reduces oxygen reaching working muscle.', transferExplanation: 'An isometric contraction produces tension without moving the joint.' });
    expect(s.data()._systemsMotionLearning.meal).toEqual(initialWriting.meal);
    expect(s.data()).toMatchObject({ quizIdx: 2, quizScore: 1, _quizAttempts: 3, _aiInput: 'Keep my tutor draft.', _structureNotes: base._structureNotes });
    expect(s.node(n => n.props?.['data-anatomy-motion-transfer-correct'] !== undefined).props['data-anatomy-motion-transfer-correct']).toBe('true');
  });
  it('merges a retained edit with newer same-scenario fields and other-scenario writing', () => {
    const s = session(file), edit = s.action('explanation');
    s.patch({ _systemsMotionLearning: { ...clone(initialWriting), exercise: row({ prediction: 'same', transfer: 2,
      transferExplanation: 'A newer comparison.', selfReview: true }), meal: row({ explanation: 'A newer meal explanation.' }) },
      _structureNotes: { ...base._structureNotes, ribs: 'A newer unrelated note.' } });
    edit('My revised oxygen explanation.');
    expect(s.data()._systemsMotionLearning.exercise).toEqual(row({ prediction: 'same', transfer: 2,
      transferExplanation: 'A newer comparison.', selfReview: true, explanation: 'My revised oxygen explanation.' }));
    expect(s.data()._systemsMotionLearning.meal.explanation).toBe('A newer meal explanation.');
    expect(s.data()._structureNotes.ribs).toBe('A newer unrelated note.');
  });
  it('accumulates queued edits to different fields without replacing the current row', () => {
    const s = session(file), explanation = s.action('explanation'), comparison = s.action('comparison'), prediction = s.action('prediction');
    s.defer(); explanation('Queued oxygen explanation.'); comparison('Queued isometric comparison.'); prediction();
    expect(s.data()._systemsMotionLearning.exercise).toEqual(initialWriting.exercise); s.flush();
    expect(s.data()._systemsMotionLearning.exercise).toMatchObject({ explanation: 'Queued oxygen explanation.',
      transferExplanation: 'Queued isometric comparison.', prediction: 'more' });
    expect(s.data()._systemsMotionLearning.fluid).toEqual(initialWriting.fluid);
  });
  it('keeps the latest input event when two edits to the same field are queued', () => {
    const s = session(file), edit = s.action('explanation'); s.defer(); edit('First keystrokes.'); edit('The complete explanation.'); s.flush();
    expect(s.data()._systemsMotionLearning.exercise.explanation).toBe('The complete explanation.');
    expect(s.data()._systemsMotionLearning.exercise.transferExplanation).toBe(initialWriting.exercise.transferExplanation);
  });
  it('bounds writing while preserving independent fields and accepts clearing text', () => {
    const s = session(file); s.change('explanation', 'x'.repeat(1400)); s.change('comparison', 'y'.repeat(1400));
    expect(s.data()._systemsMotionLearning.exercise.explanation).toBe('x'.repeat(1200));
    expect(s.data()._systemsMotionLearning.exercise.transferExplanation).toBe('y'.repeat(1200));
    s.change('explanation', ''); expect(s.data()._systemsMotionLearning.exercise.explanation).toBe('');
    expect(s.data()._systemsMotionLearning.exercise.transferExplanation).toBe('y'.repeat(1200));
  });
  for (const queued of [false, true]) it.each(contextChanges)('%s rejects ' + (queued ? 'queued' : 'retained') + ' writing, transfer, and reveal actions', (_, changeContext) => {
    const s = session(file), edit = s.action('explanation'), transfer = s.action('transfer'), reveal = s.action('reveal'); s.announce.mockClear();
    if (queued) { s.defer(); edit('An obsolete edit.'); transfer(); reveal(); }
    changeContext(s); const expected = clone(s.data());
    if (queued) s.flush(); else { edit('An obsolete edit.'); transfer(); reveal(); }
    vi.advanceTimersByTime(0); expect(s.data()).toEqual(expected); expect(s.announce).not.toHaveBeenCalled();
  });
  for (const queued of [false, true]) it('rejects ' + (queued ? 'queued' : 'retained') + ' handlers after a profile band changes with a new setter wrapper', () => {
    const s = session(file, {}, true), edit = s.action('explanation'), transfer = s.action('transfer'), reveal = s.action('reveal'); s.announce.mockClear();
    if (queued) { s.defer(); edit('Old-band writing.'); transfer(); reveal(); }
    s.grade('1'); s.tree(); const expected = clone(s.data());
    if (queued) s.flush(); else { edit('Old-band writing.'); transfer(); reveal(); }
    vi.advanceTimersByTime(0); expect(s.data()).toEqual(expected); expect(s.announce).not.toHaveBeenCalled();
  });
  it('keeps display-only playback changes compatible with writing', () => {
    const s = session(file), edit = s.action('explanation');
    s.patch({ _regionalAtlasPlaying: false, _bodyView3d: true }); edit('The diagram paused while I described the mechanism.');
    expect(s.data()._systemsMotionLearning.exercise.explanation).toBe('The diagram paused while I described the mechanism.');
    expect(s.data()).toMatchObject({ _regionalAtlasPlaying: false, _bodyView3d: true });
  });
  for (const queued of [false, true]) it('rejects a ' + (queued ? 'queued' : 'retained') + ' prediction change after the disruption is revealed', () => {
    const s = session(file), prediction = s.action('prediction');
    if (queued) { s.defer(); prediction(); s.patch({ _systemsMotionPerturbation: true }); s.flush(); }
    else { s.action('reveal')(); prediction(); }
    expect(s.data()._systemsMotionLearning.exercise.prediction).toBe('less'); expect(s.data()._systemsMotionPerturbation).toBe(true);
  });
  it('reveals the fresh prediction without replacing saved writing added since render', () => {
    const s = session(file), reveal = s.action('reveal');
    s.patch({ _systemsMotionLearning: { ...clone(initialWriting), exercise: row({ prediction: 'more', explanation: 'My newer explanation.',
      transferExplanation: 'My newer comparison.', transfer: 2 }) } }); reveal();
    expect(s.data()._systemsMotionPerturbation).toBe(true);
    expect(s.data()._systemsMotionLearning.exercise).toEqual(row({ prediction: 'more', explanation: 'My newer explanation.',
      transferExplanation: 'My newer comparison.', transfer: 2 }));
  });
  it('toggles self-review from its fresh value rather than the rendered value', () => {
    const s = session(file), toggle = s.action('self-review');
    s.patch({ _systemsMotionLearning: { ...clone(initialWriting), exercise: { ...initialWriting.exercise, selfReview: true } } });
    toggle(); expect(s.data()._systemsMotionLearning.exercise.selfReview).toBe(false);
    s.defer(); toggle(); toggle(); s.flush(); expect(s.data()._systemsMotionLearning.exercise.selfReview).toBe(false);
    expect(s.data()._systemsMotionLearning.exercise.explanation).toBe(initialWriting.exercise.explanation);
  });
  for (const queued of [false, true]) it('refuses ' + (queued ? 'queued' : 'retained') + ' self-review when the current explanation is blank', () => {
    const s = session(file), toggle = s.action('self-review'); if (queued) { s.defer(); toggle(); }
    s.patch({ _systemsMotionLearning: { ...clone(initialWriting), exercise: { ...initialWriting.exercise, explanation: '  ' } } });
    const expected = clone(s.data()); if (queued) s.flush(); else toggle(); expect(s.data()).toEqual(expected);
  });
  it('announces transfer feedback exactly once after an accepted queued update', () => {
    const s = session(file), transfer = s.action('transfer'); s.announce.mockClear(); s.defer(); transfer();
    expect(s.announce).not.toHaveBeenCalled(); s.flush(); vi.advanceTimersByTime(0);
    expect(s.data()._systemsMotionLearning.exercise.transfer).toBe(1); expect(s.announce).toHaveBeenCalledTimes(1);
    expect(s.announce.mock.calls[0][0]).toContain('Correct.'); expect(s.announce.mock.calls[0][0]).toContain('isometric contraction');
  });
  for (const destination of ['prediction', 'impact']) {
    const freshExtra = () => destination === 'prediction' ? { _systemsMotionLearning: { ...clone(initialWriting), exercise: row() } } : {};
    const targetSelector = destination === 'prediction' ? '[data-anatomy-motion-prediction="exercise"]' : '[data-systems-motion-impact]';
    const triggerFor = host => destination === 'prediction' ? [...host.querySelectorAll('button')].find(button => button.textContent === 'Apply disruption') : host.querySelector('[data-anatomy-motion-reveal]');
    it('focuses the current ' + destination + ' after its accepted action', () => {
      const s = session(file, freshExtra()), host = s.mount(), trigger = triggerFor(host);
      expect(trigger).toBeTruthy(); trigger.focus(); s.action(destination === 'prediction' ? 'apply' : 'reveal')(); s.mount(); vi.advanceTimersByTime(0);
      expect(document.activeElement).toBe(host.querySelector(targetSelector));
    });
    it('does not steal focus from another field while ' + destination + ' focus is pending', () => {
      const s = session(file, freshExtra()), host = s.mount(), trigger = triggerFor(host);
      trigger.focus(); s.action(destination === 'prediction' ? 'apply' : 'reveal')(); s.mount();
      const other = document.createElement('input'); document.body.appendChild(other); other.focus(); vi.advanceTimersByTime(0); expect(document.activeElement).toBe(other);
    });
    it('rejects delayed ' + destination + ' focus after another scenario becomes current', () => {
      const s = session(file, freshExtra()), host = s.mount(), trigger = triggerFor(host);
      trigger.focus(); s.action(destination === 'prediction' ? 'apply' : 'reveal')();
      s.patch({ _systemsMotionScenario: 'meal', system: 'organs', selectedStructure: 'sm_intestine', _regionalAtlasOpen: 'sm_intestine', _regionalAtlasStep: 1 });
      s.mount(); vi.advanceTimersByTime(0);
      expect(document.activeElement).not.toBe(host.querySelector('[data-anatomy-motion-prediction]'));
      expect(document.activeElement).not.toBe(host.querySelector('[data-systems-motion-impact]'));
    });
    it.each([
      ['sheet generation', { _studySheetRevision: 1 }],
      ['atlas step', { _regionalAtlasStep: 2 }],
      ['model focus', { _anatomyModelFocus: true }]
    ])('rejects delayed ' + destination + ' focus after %s changes', (_, patch) => {
      const s = session(file, freshExtra()), host = s.mount(), trigger = triggerFor(host);
      trigger.focus(); s.action(destination === 'prediction' ? 'apply' : 'reveal')(); s.patch(patch); s.mount(); vi.advanceTimersByTime(0);
      expect(document.activeElement).not.toBe(host.querySelector(targetSelector));
    });
  }
});
