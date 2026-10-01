import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const base = {
  system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', _startHereDismissed: true,
  _structureNotes: { ribs: 'My saved structure explanation.' },
  _structureConfidence: { femur: 'mastered' }, _confidenceAt: { femur: now },
  _retrievalEvidence: { ribs: { attempts: 4, correct: 3 } },
  _systemsMotionLearning: { exercise: { prediction: 'less', explanation: 'My activity explanation.', transferExplanation: 'My activity comparison.' } },
  _feedbackExperiment: { direction: 'warm', explanation: 'My warming explanation.', sessions: { cool: { explanation: 'My cooling explanation.' } } },
  _aiInput: 'My saved Tutor question.', _aiDraftRevision: 2,
  _aiDraftContext: { version: 1, systemId: 'skeletal', structureId: 'ribs', band: 'g912' },
  _aiConversationBand: 'g912', _aiMessages: [{ role: 'user', text: 'My earlier Tutor question.', systemId: 'skeletal', structureId: 'ribs', band: 'g912' }],
  quizIdx: 0, quizScore: 2, quizFeedback: null, _quizAttempts: 4
};
const skeletalIds = ['skull', 'mandible', 'clavicle', 'sternum', 'ribs', 'scapula', 'humerus', 'radius', 'ulna', 'carpals', 'vertebral', 'pelvis', 'femur', 'patella', 'tibia', 'fibula', 'tarsals', 'sacrum', 'hyoid', 'atlas_axis', 'metatarsals', 'metacarpals', 'scaphoid_bone'];
const cardsContext = 'skeletal:3:all:' + skeletalIds.join(',');
const legacyCards = {
  _activeTab: 'flashcards', selectedStructure: 'clavicle', _flashcardScope: 'all',
  _flashcardDeck: skeletalIds, _flashcardDeckContext: cardsContext, _flashcardRoundContext: cardsContext,
  _flashcardIdx: 2, _flashcardFlipped: true, _flashcardRoundRated: { skull: true }, _flashcardRounds: undefined
};
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const workKeys = ['_structureNotes', '_structureConfidence', '_confidenceAt', '_retrievalEvidence', '_systemsMotionLearning', '_feedbackExperiment',
  '_aiInput', '_aiDraftRevision', '_aiDraftContext', '_aiConversationBand', '_aiMessages',
  'quizIdx', 'quizScore', 'quizFeedback', '_quizAttempts', '_quizQuestion', '_tourRecap', '_tourRecapReturn', '_pathwayRecap', '_pathwayRecapReturn', '_pathwaySessions'];
const protectedWork = state => clone(Object.fromEntries(workKeys.filter(key => state[key] !== undefined).map(key => [key, state[key]])));
const quizWork = state => clone(Object.fromEntries(['quizIdx', 'quizScore', 'quizFeedback', '_quizAttempts', '_quizQuestion'].filter(key => state[key] !== undefined).map(key => [key, state[key]])));
const writing = state => clone(Object.fromEntries(workKeys.filter(key => key.startsWith('_ai') || ['_structureNotes', '_structureConfidence', '_confidenceAt', '_retrievalEvidence', '_systemsMotionLearning', '_feedbackExperiment'].includes(key)).filter(key => state[key] !== undefined).map(key => [key, state[key]])));

let rectsDescriptor, scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  for (const [key, descriptor] of [['getClientRects', rectsDescriptor], ['scrollIntoView', scrollDescriptor]]) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor); else delete HTMLElement.prototype[key];
  }
});
const settle = () => vi.advanceTimersByTime(10);
function marker() { const element = document.createElement('textarea'); document.body.appendChild(element); element.focus(); return element; }
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, grade = '9', host, deferred = false, pending = [];
  const announce = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => { if (deferred) pending.push(update); else apply(update); };
  const ctx = () => ({ toolData: data, gradeLevel: grade, setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const found = find(tree(), predicate); expect(found).not.toBeNull(); return found; };
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); settle(); announce.mockClear();
  const s = {
    data: () => data.anatomy, node, tree, announce,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    grade: value => { grade = value; },
    tab: mode => node(element => element.props?.id === 'anatomy-mode-tab-' + mode).props.onClick,
    switch: mode => s.tab(mode)(),
    mobileAction: mode => { const onChange = node(element => element.props?.id === 'anatomy-mobile-activity').props.onChange; return () => onChange({ target: { value: mode } }); },
    captureQuestion: () => node(element => element.props?.['data-anatomy-quiz-panel']).ref({}),
    answerFirst: () => node(element => element.props?.['data-anatomy-quiz-option'] !== undefined).props.onClick(),
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); }
  };
  return s;
}
function savedQuiz(file) {
  const s = session(file, { _activeTab: 'quiz', quizMode: true, quizIdx: 3 });
  s.captureQuestion(); s.answerFirst();
  const saved = quizWork(s.data()); s.switch('explore'); settle(); s.announce.mockClear();
  return { s, saved };
}
const foreign = [
  ['mode', s => s.patch({ _activeTab: 'aiTutor' })],
  ['system', s => s.patch({ system: 'respiratory' })],
  ['view', s => s.patch({ view: 'posterior' })],
  ['level', s => s.patch({ complexity: 2 })],
  ['selection', s => s.patch({ selectedStructure: 'femur' })],
  ['sheet', s => s.patch({ _showStudySheet: true })],
  ['sheet revision', s => s.patch({ _studySheetRevision: 1 })],
  ['import revision', s => s.patch({ _studyImportRevision: 1 })],
  ['activity revision', s => s.patch({ _guidanceRevision: 1 })],
  ['model focus', s => s.patch({ _anatomyModelFocus: true })]
];

for (const file of files) describe('Regular Anatomy activity switch continuity: ' + file, () => {
  it('round-trips an answered Quiz through Explore with its exact question and writing', () => {
    const { s, saved } = savedQuiz(file), before = writing(s.data()); s.switch('quiz');
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizMode: true });
    expect(quizWork(s.data())).toEqual(saved); expect(writing(s.data())).toEqual(before);
    expect(s.html().querySelector('[data-anatomy-quiz-feedback]')).not.toBeNull();
  });
  it('records a bounded return checkpoint when regular navigation leaves an answered Quiz', () => {
    const { s, saved } = savedQuiz(file);
    expect(s.data()._quizActivityReturn).toMatchObject({
      questionKey: saved._quizQuestion.context + '|' + saved.quizIdx, token: saved._quizQuestion.token,
      index: saved.quizIdx, score: saved.quizScore, attempts: saved._quizAttempts
    });
  });
  it('restores the saved Quiz diagram and answered checkpoint after a Tour changes collections', () => {
    const { s, saved } = savedQuiz(file);
    s.patch({ _tourActive: true, _tourSystem: 'circulatory', _tourStepIdx: 2 }); const before = writing(s.data());
    s.switch('tour'); expect(s.data()).toMatchObject({ _activeTab: 'tour', system: 'circulatory', selectedStructure: 'coronary' });
    settle(); expect(s.announce).toHaveBeenCalledWith(expect.stringContaining('Coronary Arteries'));
    expect(quizWork(s.data())).toEqual(saved); s.switch('quiz');
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', system: 'skeletal', view: 'anterior' });
    expect(quizWork(s.data())).toEqual(saved); expect(writing(s.data())).toEqual(before);
    expect(s.html().querySelector('[data-anatomy-quiz-feedback]')).not.toBeNull();
  });
  it('restores the saved Quiz diagram and answered checkpoint after a Pathway changes collections', () => {
    const { s, saved } = savedQuiz(file); s.patch({ _activePathway: 'path_air', _pathwayStep: 2 }); const before = writing(s.data());
    s.switch('pathways'); expect(s.data()._activeTab).toBe('pathways'); expect(s.data().system).not.toBe('skeletal');
    settle(); expect(s.announce).toHaveBeenCalledWith(expect.stringContaining('Larynx'));
    expect(quizWork(s.data())).toEqual(saved); s.switch('quiz');
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', system: 'skeletal', view: 'anterior' });
    expect(quizWork(s.data())).toEqual(saved); expect(writing(s.data())).toEqual(before);
  });
  it('uses the mobile activity selector for the same saved Quiz round trip', () => {
    const s = session(file, { _activeTab: 'quiz', quizMode: true }); s.captureQuestion(); s.answerFirst();
    const saved = quizWork(s.data()), before = writing(s.data()); s.mobileAction('explore')(); s.mobileAction('quiz')();
    expect(quizWork(s.data())).toEqual(saved); expect(writing(s.data())).toEqual(before);
  });
  it('uses the latest valid Quiz snapshot and counters from a retained Quiz tab handler', () => {
    const s = session(file), action = s.tab('quiz');
    s.patch({ _activeTab: 'quiz', quizMode: true, quizIdx: 7, quizScore: 8, _quizAttempts: 12, _quizQuestion: null });
    s.captureQuestion(); s.answerFirst();
    s.patch({ _activeTab: 'explore', quizMode: false, _structureNotes: { ribs: 'My newer saved note.' } });
    const before = protectedWork(s.data()); action();
    expect(s.data()._activeTab).toBe('quiz'); expect(protectedWork(s.data())).toEqual(before);
  });
  it('gives a current valid Quiz snapshot precedence over an older cross-activity return', () => {
    const { s } = savedQuiz(file); s.patch({ _tourActive: true, _tourSystem: 'circulatory', _tourStepIdx: 2 }); s.switch('tour');
    const action = s.tab('quiz');
    s.patch({ _activeTab: 'quiz', quizMode: true, quizIdx: 6, quizScore: 10, _quizAttempts: 14, _quizQuestion: null, quizFeedback: null });
    s.captureQuestion(); const latest = quizWork(s.data()); s.patch({ _activeTab: 'tour', quizMode: false }); action();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', system: 'circulatory' }); expect(quizWork(s.data())).toEqual(latest);
  });
  it('rebuilds an invalid stored Quiz snapshot at the latest index without clearing saved counters', () => {
    const s = session(file), action = s.tab('quiz');
    s.patch({ quizIdx: 11, quizScore: 8, _quizAttempts: 15, _quizQuestion: { token: 'invalid-old-question', index: 0, poolIds: ['forged'] },
      _aiInput: 'My more recent Tutor draft.' }); const before = writing(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizIdx: 11, quizScore: 8, _quizAttempts: 15 });
    expect(s.data()._quizQuestion.index).toBe(11); expect(s.data()._quizQuestion.token).not.toBe('invalid-old-question');
    expect(s.data()._quizQuestion.poolIds).not.toContain('forged'); expect(writing(s.data())).toEqual(before);
  });
  it('opens a completed Quiz checkpoint without starting a new score', () => {
    const s = session(file, { quizIdx: 20, quizScore: 15, _quizAttempts: 20 }); s.switch('quiz');
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizIdx: 20, quizScore: 15, _quizAttempts: 20 });
    expect(s.data()._quizQuestion.index).toBe(20);
  });
  it('resumes the latest saved Tour collection and position through an older tab handler', () => {
    const s = session(file), action = s.tab('tour');
    s.patch({ _tourActive: true, _tourSystem: 'circulatory', _tourStepIdx: 2, _aiInput: 'My newer Tutor draft.' });
    const before = protectedWork(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'tour', _tourSystem: 'circulatory', _tourStepIdx: 2, selectedStructure: 'coronary' });
    expect(protectedWork(s.data())).toEqual(before);
  });
  it('keeps the latest active Tour recap, its answers and attempt when opening Tour', () => {
    const s = session(file), action = s.tab('tour');
    const recap = { version: 2, systemId: 'skeletal', active: true, token: 'latest-tour-check', focusIndex: 0, answers: { 0: 'skull' } };
    s.patch({ _tourActive: true, _tourSystem: 'skeletal', _tourStepIdx: 4, _tourRecap: recap }); action();
    expect(s.data()).toMatchObject({ _activeTab: 'tour', _tourStepIdx: 4, _tourRecap: recap });
    expect(s.html().querySelector('[data-anatomy-recap="tour"]')).not.toBeNull();
  });
  it('resumes the latest Pathway route, step and answered recap through an older tab handler', () => {
    const s = session(file, { _activePathway: 'path_food', _pathwayStep: 0 }), action = s.tab('pathways');
    const recap = { version: 2, pathwayId: 'path_air', active: true, token: 'latest-air-check', answers: { exchange: 'gases' }, focusQuestionId: 'exchange' };
    s.patch({ _activePathway: 'path_air', _pathwayStep: 2, _pathwayRecap: recap }); const before = protectedWork(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'pathways', _activePathway: 'path_air', _pathwayStep: 2, _pathwayRecap: recap });
    expect(protectedWork(s.data())).toEqual(before); expect(s.html().querySelector('[data-anatomy-pathway-panel]').getAttribute('data-anatomy-pathway-id')).toBe('path_air');
  });
  it('keeps a live legacy Cards round when leaving and resuming ordinary tabs', () => {
    const s = session(file, legacyCards), before = protectedWork(s.data()); s.switch('explore');
    expect(s.data()._flashcardRounds['skeletal:3:all']).toMatchObject({ deckIds: skeletalIds, index: 2, rated: { skull: true } });
    s.switch('flashcards');
    expect(s.data()).toMatchObject({ _activeTab: 'flashcards', _flashcardDeck: skeletalIds, _flashcardIdx: 2, _flashcardRoundRated: { skull: true }, _flashcardFlipped: true });
    expect(protectedWork(s.data())).toEqual(before);
  });
  it('checkpoints latest live Cards rated flags and unrelated writing through a retained exit handler', () => {
    const s = session(file, legacyCards), action = s.tab('explore');
    s.patch({ _flashcardRoundRated: { skull: true, mandible: true }, _structureNotes: { ribs: 'A new note before leaving Cards.' } });
    const before = protectedWork(s.data()); action();
    expect(s.data()._flashcardRounds['skeletal:3:all']).toMatchObject({ index: 2, rated: { skull: true, mandible: true } });
    expect(protectedWork(s.data())).toEqual(before);
  });
  it.each(['connections', 'aiTutor', 'spotter', 'homeoHunt', 'imaging', 'procedure'])('preserves saved work when regular navigation opens %s', mode => {
    const s = session(file), before = protectedWork(s.data()); s.switch(mode);
    expect(s.data()._activeTab).toBe(mode); expect(protectedWork(s.data())).toEqual(before);
  });
  it.each(foreign)('rejects a retained regular transition after its %s owner changes', (_name, change) => {
    const s = session(file), action = s.tab('quiz'); change(s); const before = clone(s.data()), focused = marker(); action(); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  });
  it('rejects a retained mobile transition after another activity is selected', () => {
    const s = session(file), action = s.mobileAction('quiz'); s.patch({ _activeTab: 'aiTutor' }); const before = clone(s.data()); action(); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
  });
  it('rejects a retained regular transition after its content band changes at the same level', () => {
    const s = session(file, { complexity: 1 }), action = s.tab('quiz'); s.grade('1'); s.tree();
    const before = clone(s.data()); action(); settle(); expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
  });
  it('waits for a deferred functional transition before emitting accepted effects', () => {
    const s = session(file), action = s.tab('quiz'); s.defer(); action();
    expect(s.data()._activeTab).toBe('explore'); expect(s.announce).not.toHaveBeenCalled();
    s.patch({ quizIdx: 7, quizScore: 6, _quizAttempts: 11, _structureNotes: { ribs: 'Saved while the transition waited.' }, _aiInput: 'My latest Tutor draft.' });
    const before = writing(s.data()); s.flush(); s.mount(); settle();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizIdx: 7, quizScore: 6, _quizAttempts: 11 });
    expect(s.data()._quizQuestion.index).toBe(7); expect(writing(s.data())).toEqual(before); expect(s.announce).toHaveBeenCalled();
  });
  it('uses the newest saved Tour position when a queued transition is applied', () => {
    const s = session(file, { _tourActive: true, _tourSystem: 'skeletal', _tourStepIdx: 1 }), action = s.tab('tour'); s.defer(); action();
    s.patch({ _tourStepIdx: 4, _structureNotes: { ribs: 'Saved during the queued transition.' } }); const before = protectedWork(s.data()); s.flush();
    expect(s.data()).toMatchObject({ _activeTab: 'tour', _tourStepIdx: 4, selectedStructure: 'pelvis' }); expect(protectedWork(s.data())).toEqual(before);
  });
  it('rejects a queued transition when its current diagram changes before acceptance', () => {
    const s = session(file), action = s.tab('quiz'); s.defer(); action(); s.patch({ system: 'circulatory' }); const before = clone(s.data());
    s.flush(); settle(); expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
  });
  it('accepts only the first duplicate transition from one rendered control', () => {
    const s = session(file), action = s.tab('quiz'); action(); settle(); const before = clone(s.data()), calls = s.announce.mock.calls.length;
    action(); settle(); expect(s.data()).toEqual(before); expect(s.announce.mock.calls.length).toBe(calls);
  });
  it('accepts only one transition when duplicate callbacks are queued together', () => {
    const s = session(file), action = s.tab('quiz'); s.defer(); action(); action(); s.flush(); settle();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', _guidanceRevision: 1, _studySheetRevision: 1 });
  });
  it('clears a saved Quiz return after an explicit manual system change', () => {
    const { s } = savedQuiz(file);
    s.node(element => element.props?.id === 'anatomy-explorer-system').props.onChange({ target: { value: 'respiratory' } });
    expect(s.data()._quizActivityReturn).toBeNull(); s.switch('quiz');
    expect(s.data().system).toBe('respiratory'); expect(s.data()._quizQuestion.context).toContain('|respiratory|');
  });
  it('clears a saved Quiz return after an explicit manual learning level change', () => {
    const { s } = savedQuiz(file);
    s.node(element => element.props?.id === 'anatomy-explorer-level').props.onChange({ target: { value: '2' } });
    expect(s.data()._quizActivityReturn).toBeNull(); s.switch('quiz');
    expect(s.data().complexity).toBe(2); expect(s.data()._quizQuestion.context).toContain('|2|g68|');
  });
  it.each([
    ['token', checkpoint => ({ ...checkpoint, token: 'forged-question-token' })],
    ['index', checkpoint => ({ ...checkpoint, index: checkpoint.index + 1 })]
  ])('does not restore a foreign Quiz diagram through a forged %s checkpoint', (_name, corrupt) => {
    const { s } = savedQuiz(file); s.patch({ _tourActive: true, _tourSystem: 'circulatory', _tourStepIdx: 2 }); s.switch('tour');
    const action = s.tab('quiz'); s.patch({ _quizActivityReturn: corrupt(s.data()._quizActivityReturn) }); action();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', system: 'circulatory' }); expect(s.data()._quizQuestion.context).toContain('|circulatory|');
  });
  it.each(['constructor', '__proto__', 'toString'])('rejects the inherited system key %s in a saved Quiz context without breaking rendering or entry', system => {
    const { s, saved } = savedQuiz(file), question = clone(saved._quizQuestion), parts = question.context.split('|');
    parts[1] = system; question.context = parts.join('|');
    s.patch({ _quizQuestion: question, _quizActivityReturn: { ...s.data()._quizActivityReturn, questionKey: question.context + '|' + saved.quizIdx } });
    const before = writing(s.data());
    expect(() => s.tree()).not.toThrow();
    const root = s.html(); expect(root.querySelector('[data-anatomy-tool]')).not.toBeNull();
    expect(root.querySelector('[data-anatomy-quiz-return]')).toBeNull();
    s.switch('quiz');
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', system: 'skeletal' });
    expect(s.data()._quizQuestion.context).toBe(saved._quizQuestion.context); expect(writing(s.data())).toEqual(before);
  });
  it('honors the saved cross-activity Quiz checkpoint through the recommended Quiz action', () => {
    const { s, saved } = savedQuiz(file); s.patch({ _tourActive: true, _tourSystem: 'circulatory', _tourStepIdx: 2 });
    s.switch('tour'); s.switch('explore'); const selected = s.data().selectedStructure;
    s.patch({ selectedStructure: null });
    const ids = [...s.html().querySelectorAll('[data-anatomy-structure-option]')].map(element => element.getAttribute('data-anatomy-structure-option'));
    expect(ids.length).toBeGreaterThan(3);
    s.patch({ selectedStructure: selected, _tourCompleted: true, _totalCorrect: 0,
      _structuresViewed: { ...s.data()._structuresViewed, ...Object.fromEntries(ids.map(id => [id, true])) },
      _structureConfidence: { ...s.data()._structureConfidence, ...Object.fromEntries(ids.map(id => [id, 'mastered'])) },
      _confidenceAt: { ...s.data()._confidenceAt, ...Object.fromEntries(ids.map(id => [id, now])) } });
    const before = writing(s.data()); expect(s.html().querySelector('[data-anatomy-quiz-return]')).not.toBeNull();
    s.node(element => element.props?.['data-anatomy-guidance-action'] === 'quiz').props.onClick();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', system: 'skeletal', view: 'anterior' });
    expect(quizWork(s.data())).toEqual(saved); expect(writing(s.data())).toEqual(before);
    expect(s.html().querySelector('[data-anatomy-quiz-feedback]')).not.toBeNull();
  });
  it.each(['quiz', 'tour', 'flashcards'])('suppresses delayed %s effects after the actual tool shell is unmounted', mode => {
    const s = session(file, mode === 'tour' ? { _tourActive: true, _tourSystem: 'skeletal', _tourStepIdx: 2 } : {}), host = s.mount();
    host.querySelector('#anatomy-mode-tab-' + mode).focus(); s.switch(mode);
    expect(s.data()._activeTab).toBe(mode); host.remove(); s.announce.mockClear(); settle();
    expect(s.announce).not.toHaveBeenCalled(); expect(document.activeElement).toBe(document.body);
  });
  it('lands ordinary Quiz entry at its saved answer feedback', () => {
    const { s } = savedQuiz(file), host = s.mount(); host.querySelector('#anatomy-mode-tab-quiz').focus(); s.switch('quiz'); s.mount(); settle();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-quiz-feedback]'));
  });
  it('lands ordinary Cards entry at the resumed recall card', () => {
    const s = session(file, legacyCards); s.switch('explore'); const host = s.mount(); host.querySelector('#anatomy-mode-tab-flashcards').focus();
    s.switch('flashcards'); s.mount(); settle(); expect(document.activeElement).toBe(host.querySelector('[data-anatomy-recall-card]'));
  });
  it('lands ordinary Tour entry at the latest active recap', () => {
    const s = session(file, { _tourActive: true, _tourSystem: 'skeletal', _tourStepIdx: 4,
      _tourRecap: { version: 2, systemId: 'skeletal', active: true, token: 'tour-focus-check', focusIndex: 0, answers: {} } });
    const host = s.mount(); host.querySelector('#anatomy-mode-tab-tour').focus(); s.switch('tour'); s.mount(); settle();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-recap="tour"] [data-anatomy-recap-heading]'));
  });
  it('does not steal focus after the learner moves into another control before the accepted landing', () => {
    const s = session(file), host = s.mount(); host.querySelector('#anatomy-mode-tab-quiz').focus(); s.switch('quiz'); s.mount();
    const focused = marker(); settle(); expect(document.activeElement).toBe(focused);
  });
  it('rejects delayed activity focus after a newer activity becomes visible', () => {
    const s = session(file), host = s.mount(); host.querySelector('#anatomy-mode-tab-quiz').focus(); s.switch('quiz');
    s.patch({ _activeTab: 'aiTutor', quizMode: false }); s.mount(); settle(); expect(document.activeElement).toBe(document.body);
  });
  it('rejects delayed activity focus after a study sheet is opened', () => {
    const s = session(file), host = s.mount(); host.querySelector('#anatomy-mode-tab-quiz').focus(); s.switch('quiz');
    s.patch({ _showStudySheet: true, _studySheetRevision: (s.data()._studySheetRevision || 0) + 1 }); s.mount(); settle();
    expect(document.activeElement).toBe(document.body);
  });
  it('rejects delayed Quiz focus after a newer question checkpoint replaces the accepted destination', () => {
    const s = session(file), host = s.mount(); host.querySelector('#anatomy-mode-tab-quiz').focus(); s.switch('quiz');
    s.patch({ quizIdx: 4 }); s.mount(); settle(); expect(document.activeElement).toBe(document.body);
  });
  it('rejects delayed activity focus after the learner content band changes', () => {
    const s = session(file, { complexity: 1 }), host = s.mount(); host.querySelector('#anatomy-mode-tab-quiz').focus(); s.switch('quiz');
    s.grade('1'); s.mount(); settle(); expect(document.activeElement).toBe(document.body);
  });
});
