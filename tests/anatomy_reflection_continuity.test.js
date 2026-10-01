import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const ids = ['skull', 'ribs', 'femur'];
const sessionIds = [...ids, 'kidneys'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const warmText = 'Warming: more heat leaves through sweating and skin blood flow.';
const coolText = 'Cooling: shivering generates heat and less skin blood flow conserves it.';
const oldText = 'My earlier file did not identify the disturbance.';
const flat = explanation => ({ id: 'homeostasis', explanation, transferExplanation: '' });
const note = (direction, explanation) => ({ direction, explanation });
const raw = (feedbackNotes, learningNotes) => ({ schema: 'alloflow-anatomy-study', version: 1, records: [],
  ...(feedbackNotes === undefined ? {} : { feedbackNotes }), ...(learningNotes === undefined ? {} : { learningNotes }) });
const feedbackTexts = packet => Object.fromEntries((packet.feedbackNotes || []).map(row => [row.direction === null ? 'unassigned' : row.direction, row.explanation]));
const savedReflections = {
  _activeTab: 'explore', _showStudySheet: true,
  _feedbackExperiment: { direction: 'warm', prediction: 'active', revealed: true, explanation: warmText,
    context: 'temperature-feedback-v1|warm', token: 'saved-warm-token', sessions: { cool: { prediction: 'disabled', revealed: true, explanation: coolText } } },
  _systemsMotionLearning: { meal: { prediction: 'less', explanation: 'My meal explanation.', transferExplanation: 'My meal comparison.', selfReview: true, transfer: 1 },
    wound: { explanation: 'Keep my wound explanation.' } },
  _aiInput: 'Keep my written tutor question.', _aiMessages: [{ role: 'user', text: 'How does this organ work?', systemId: 'organs', structureId: 'kidneys', band: 'g912' }],
  quizIdx: 3, quizScore: 2, quizFeedback: { correct: true, explanation: 'Keep quiz feedback.' }, _quizAttempts: 4
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
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  if (rectsDescriptor) Object.defineProperty(HTMLElement.prototype, 'getClientRects', rectsDescriptor); else delete HTMLElement.prototype.getClientRects;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor); else delete HTMLElement.prototype.scrollIntoView;
});
function marker() { const input = document.createElement('input'); document.body.appendChild(input); input.focus(); return input; }
function pure(file) { loadTool(file, 'anatomy'); return window.__alloAnatomyStudyPure; }
function merge(C, state, packet) { const result = C.merge(state, packet, ids, now); return { state: { ...state, ...result.patch }, result }; }
function codedFailure(C, packet) {
  let error; try { C.parse(packet, ids); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(Error); expect(error.anatomyStudyCode).toBe('learning_notes');
  expect(error.message).toBe('The study record has invalid learning notes.');
}

function session(file, extra = {}, grade = '9') {
  const tool = loadTool(file, 'anatomy');
  let host, deferred = false, queue = [], profileGrade = grade;
  let data = { anatomy: { system: 'organs', view: 'posterior', selectedStructure: 'kidneys', complexity: 3,
    _activeTab: 'homeoHunt', _showStudySheet: false, _structureNotes: { kidneys: 'My kidney explanation.' }, ...extra } };
  const announce = vi.fn(), applyUpdate = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : applyUpdate(update);
  const ctx = () => ({ toolData: data, gradeLevel: profileGrade, setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const markup = () => renderTool('anatomy', data, ctx());
  renderTool('anatomy', data, ctx()); vi.advanceTimersByTime(0);
  return {
    data: () => data.anatomy, node, tree, announce,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    grade: value => { profileGrade = value; },
    captureResume: key => node(element => element.props?.['data-anatomy-resume-reflection'] === key).props.onClick,
    resume: key => node(element => element.props?.['data-anatomy-resume-reflection'] === key).props.onClick(),
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(applyUpdate); },
    change: (id, value) => node(element => element.props?.id === id).props.onChange({ target: { value } }),
    predict: value => node(element => element.type === 'input' && element.props?.name === 'anatomy-feedback-prediction' && element.props.value === value).props.onChange(),
    run: () => node(element => element.props?.['data-anatomy-run-feedback'] === 'true').props.onClick(),
    packet: () => window.__alloAnatomyStudyPure.packet(data.anatomy, sessionIds, now),
    apply: packet => { const result = window.__alloAnatomyStudyPure.merge(data.anatomy, packet, sessionIds, now); data = { ...data, anatomy: { ...data.anatomy, ...result.patch } }; return result; },
    html: () => { const detached = document.createElement('div'); detached.innerHTML = markup(); return detached; }
  };
}

for (const file of files) describe('Portable reflection contexts and learner writing: ' + file, () => {
  it('exports both explanations after a real warming-to-cooling activity journey', () => {
    const s = session(file); s.predict('active'); s.run(); s.change('anatomy-feedback-explanation', warmText);
    s.change('anatomy-feedback-disturbance', 'cool'); s.predict('disabled'); s.run(); s.change('anatomy-feedback-explanation', coolText);
    expect(s.data()._feedbackExperiment.sessions.warm.explanation).toBe(warmText);
    const before = clone(s.data()), packet = s.packet();
    expect(packet.version).toBe(1); expect(feedbackTexts(packet)).toEqual({ warm: warmText, cool: coolText });
    expect(packet.learningNotes.filter(row => row.id === 'homeostasis')).toEqual([flat(coolText)]);
    expect(s.data()).toEqual(before);
    s.change('anatomy-feedback-disturbance', 'warm'); expect(s.data()._feedbackExperiment.explanation).toBe(warmText);
    expect(feedbackTexts(s.packet())).toEqual({ warm: warmText, cool: coolText });
    expect(s.packet().learningNotes.find(row => row.id === 'homeostasis').explanation).toBe(warmText);
  });

  it('uses fresh live active writing rather than its older saved session copy', () => {
    const C = pure(file), state = { _feedbackExperiment: { direction: 'warm', explanation: warmText,
      sessions: { warm: { explanation: 'Older warm snapshot.' }, cool: { explanation: coolText } } } };
    const before = clone(state), packet = C.packet(state, ids, now);
    expect(feedbackTexts(packet)).toEqual({ warm: warmText, cool: coolText }); expect(state).toEqual(before);
  });

  it.each(['', '   '])('does not resurrect a cleared active explanation from its saved session snapshot (%j)', cleared => {
    const C = pure(file), packet = C.packet({ _feedbackExperiment: { direction: 'warm', explanation: cleared,
      sessions: { warm: { explanation: 'Deleted warm writing.' }, cool: { explanation: coolText } } } }, ids, now);
    expect(feedbackTexts(packet)).toEqual({ cool: coolText }); expect(JSON.stringify(packet)).not.toContain('Deleted warm writing.');
    expect(packet.learningNotes.filter(row => row.id === 'homeostasis')).toEqual([flat(coolText)]);
  });

  it('exports an inactive explanation even when the active direction has no writing', () => {
    const C = pure(file), packet = C.packet({ _feedbackExperiment: { direction: 'cool', explanation: '', sessions: { warm: { explanation: warmText } } } }, ids, now);
    expect(feedbackTexts(packet)).toEqual({ warm: warmText }); expect(packet.learningNotes).toEqual([flat(warmText)]);
  });

  it('keeps all three writing contexts while preserving the legacy five-row fallback format', () => {
    const C = pure(file), motion = Object.fromEntries(['exercise', 'meal', 'wound', 'fluid'].map(id => [id,
      { explanation: id + ' explanation.', transferExplanation: id + ' comparison.', prediction: 'LOCAL_MOTION_CHOICE' }]));
    const packet = C.packet({ _systemsMotionLearning: motion, _feedbackExperiment: { direction: 'cool', explanation: coolText,
      unassignedExplanation: oldText, sessions: { warm: { explanation: warmText } } } }, ids, now);
    expect(packet.learningNotes).toHaveLength(5); expect(new Set(packet.learningNotes.map(row => row.id)).size).toBe(5);
    expect(feedbackTexts(packet)).toEqual({ warm: warmText, cool: coolText, unassigned: oldText });
    expect(packet.learningNotes.find(row => row.id === 'homeostasis')).toEqual(flat(coolText));
    const oldReaderPacket = clone(packet); delete oldReaderPacket.feedbackNotes;
    expect(C.parse(oldReaderPacket, ids).learningNotes).toEqual(packet.learningNotes);
    expect(C.parse(packet, ids).feedbackNotes).toEqual(packet.feedbackNotes);
    expect(JSON.stringify(packet)).not.toContain('LOCAL_MOTION_CHOICE');
  });

  it('keeps unassigned writing as a null context and uses it as a fallback when no directional writing exists', () => {
    const C = pure(file), packet = C.packet({ _feedbackExperiment: { direction: 'cool', explanation: '', unassignedExplanation: oldText } }, ids, now);
    expect(packet.feedbackNotes).toEqual([note(null, oldText)]); expect(packet.learningNotes).toEqual([flat(oldText)]);
  });

  it('exports local legacy active writing with the same warming default used by the activity', () => {
    const C = pure(file), packet = C.packet({ _feedbackExperiment: { explanation: warmText } }, ids, now);
    expect(packet.feedbackNotes).toEqual([note('warm', warmText)]); expect(packet.learningNotes).toEqual([flat(warmText)]);
  });

  it('limits known explanations and ignores malformed or unknown saved session writing', () => {
    const C = pure(file), packet = C.packet({ _feedbackExperiment: { direction: 'warm', explanation: 'w'.repeat(2200),
      sessions: { warm: { explanation: 'Stale' }, cool: { explanation: 'c'.repeat(2200) }, hot: { explanation: 'Unknown context.' } },
      unassignedExplanation: { wrong: true } } }, ids, now);
    expect(feedbackTexts(packet)).toEqual({ warm: 'w'.repeat(2000), cool: 'c'.repeat(2000) });
    expect(packet.feedbackNotes.every(row => Object.keys(row).sort().join(',') === 'direction,explanation')).toBe(true);
    expect(JSON.stringify(packet)).not.toContain('Unknown context.'); expect(C.parse(packet, ids).feedbackNotes).toEqual(packet.feedbackNotes);
  });

  it('omits optional feedback metadata when no feedback writing exists', () => {
    const C = pure(file), packet = C.packet({ _feedbackExperiment: { direction: 'warm', explanation: '',
      sessions: { cool: { explanation: null } }, unassignedExplanation: ' ' }, _systemsMotionLearning: { meal: { explanation: '', transferExplanation: 'Meal comparison only.' } } }, ids, now);
    expect(packet.feedbackNotes).toBeUndefined(); expect(packet.learningNotes).toEqual([{ id: 'meal', explanation: '', transferExplanation: 'Meal comparison only.' }]);
  });

  it('round-trips all writing contexts without importing prediction, check, grade, or display state', () => {
    const C = pure(file), source = { _feedbackExperiment: { direction: 'cool', explanation: coolText, prediction: 'disabled', revealed: true,
      token: 'SOURCE_ATTEMPT_TOKEN', context: 'temperature-feedback-v1|cool', unassignedExplanation: oldText,
      sessions: { warm: { explanation: warmText, prediction: 'same', revealed: true } } },
      homeoHunt: { hypothesis: 'LOCAL_RANGE_WRITING', recap: { temp: 'above' } }, complexity: 1, quizScore: 99 };
    const incoming = C.parse(JSON.parse(JSON.stringify(C.packet(source, ids, now))), ids);
    const destination = { complexity: 3, quizScore: 2, quizIdx: 4, _aiInput: 'Current question.',
      homeoHunt: { hypothesis: 'Keep my ranges hypothesis.', recap: { glucose: 'within' } },
      _feedbackExperiment: { direction: 'warm', explanation: '', prediction: 'active', revealed: true, token: 'DESTINATION_TOKEN',
        context: 'temperature-feedback-v1|warm', chartConfig: { zoom: 2 }, sessions: { cool: { explanation: '', prediction: 'same', revealed: true } } } };
    const before = clone(destination), next = merge(C, destination, incoming).state;
    expect(feedbackTexts(C.packet(next, ids, now))).toEqual({ warm: warmText, cool: coolText, unassigned: oldText });
    expect(next._feedbackExperiment).toMatchObject({ direction: 'warm', explanation: warmText, prediction: 'active', revealed: true,
      token: 'DESTINATION_TOKEN', context: 'temperature-feedback-v1|warm', chartConfig: { zoom: 2 }, sessions: { cool: { explanation: coolText, prediction: 'same', revealed: true } } });
    expect(next).toMatchObject({ complexity: 3, quizScore: 2, quizIdx: 4, _aiInput: 'Current question.', homeoHunt: before.homeoHunt });
    expect(destination).toEqual(before);
    for (const value of ['SOURCE_ATTEMPT_TOKEN', 'LOCAL_RANGE_WRITING', '"prediction"', '"revealed"', '"quizScore"', '"complexity"', '"recap"']) expect(JSON.stringify(incoming)).not.toContain(value);
  });

  it('repeated metadata imports are idempotent and never duplicate the flat fallback into unassigned writing', () => {
    const C = pure(file), incoming = raw([note('warm', warmText), note('cool', coolText)], [flat(warmText)]);
    const first = merge(C, { _feedbackExperiment: { direction: 'warm', explanation: '', token: 'keep-token' } }, incoming);
    const second = merge(C, first.state, incoming);
    expect(second.state).toEqual(first.state); expect(second.result.keptReflections).toBe(0);
    expect(second.state._feedbackExperiment.unassignedExplanation || '').toBe('');
    expect(feedbackTexts(C.packet(second.state, ids, now))).toEqual({ warm: warmText, cool: coolText });
  });

  it('preserves conflicts independently for live active and saved inactive writing', () => {
    const C = pure(file), current = { _feedbackExperiment: { direction: 'warm', explanation: 'My newer warming explanation.',
      token: 'keep-token', prediction: 'active', revealed: true, sessions: { warm: { explanation: 'Older saved warm copy.' },
        cool: { explanation: 'My own cooling explanation.', prediction: 'disabled', revealed: true } } } };
    const before = clone(current), merged = merge(C, current, raw([note('warm', warmText), note('cool', coolText)], [flat(warmText)]));
    expect(feedbackTexts(C.packet(merged.state, ids, now))).toEqual({ warm: 'My newer warming explanation.', cool: 'My own cooling explanation.' });
    expect(merged.result.keptReflections).toBe(2); expect(current).toEqual(before);
    expect(merged.state._feedbackExperiment).toMatchObject({ direction: 'warm', token: 'keep-token', prediction: 'active', revealed: true,
      sessions: { cool: { prediction: 'disabled', revealed: true } } });
  });

  it('fills an empty active live explanation even when its old saved copy has writing', () => {
    const C = pure(file), current = { _feedbackExperiment: { direction: 'warm', explanation: '', sessions: { warm: { explanation: 'Deleted old writing.' } } } };
    const merged = merge(C, current, raw([note('warm', warmText)], [flat(warmText)]));
    expect(merged.state._feedbackExperiment.explanation).toBe(warmText); expect(merged.result.keptReflections).toBe(0);
  });

  it('fills only the inactive explanation and preserves both existing attempts', () => {
    const C = pure(file), current = { _feedbackExperiment: { direction: 'warm', explanation: 'My current warm writing.',
      token: 'current-token', context: 'temperature-feedback-v1|warm', prediction: 'active', revealed: true,
      sessions: { cool: { prediction: 'disabled', revealed: true, explanation: '', localSetting: 12 } } } };
    const next = merge(C, current, raw([note('cool', coolText)], [flat(coolText)])).state;
    expect(next._feedbackExperiment).toEqual({ ...current._feedbackExperiment,
      sessions: { cool: { ...current._feedbackExperiment.sessions.cool, explanation: coolText } } });
  });

  it('preserves unassigned conflicts while importing empty known contexts', () => {
    const C = pure(file), current = { _feedbackExperiment: { direction: 'cool', explanation: '', unassignedExplanation: 'Keep this older context-free note.' } };
    const merged = merge(C, current, raw([note('warm', warmText), note('cool', coolText), note(null, oldText)], [flat(coolText)]));
    expect(feedbackTexts(C.packet(merged.state, ids, now))).toEqual({ warm: warmText, cool: coolText, unassigned: 'Keep this older context-free note.' });
    expect(merged.result.keptReflections).toBe(1);
    const again = merge(C, merged.state, raw([note('warm', warmText), note('cool', coolText), note(null, oldText)], [flat(coolText)]));
    expect(again.state).toEqual(merged.state); expect(again.result.keptReflections).toBe(1);
  });

  it('does not count the compatibility fallback as a second directional conflict', () => {
    const C = pure(file), merged = merge(C, { _feedbackExperiment: { direction: 'warm', explanation: 'Keep mine.' } },
      raw([note('warm', warmText)], [flat(warmText)]));
    expect(merged.result.keptReflections).toBe(1); expect(merged.state._feedbackExperiment.explanation).toBe('Keep mine.');
    expect(merged.state._feedbackExperiment.unassignedExplanation || '').toBe('');
  });

  it.each(['', 'Existing active warm writing.'])('keeps imported undirected legacy writing separate from active warm text (%j)', existing => {
    const C = pure(file), current = { _feedbackExperiment: { direction: 'warm', explanation: existing, token: 'keep-token',
      prediction: 'active', revealed: true, sessions: { cool: { explanation: coolText, prediction: 'disabled', revealed: true } } } };
    const next = merge(C, current, raw(undefined, [flat(oldText)])).state;
    expect(next._feedbackExperiment).toEqual({ ...current._feedbackExperiment, unassignedExplanation: oldText });
    expect(feedbackTexts(C.packet(next, ids, now)).unassigned).toBe(oldText);
    expect(next._feedbackExperiment.explanation).toBe(existing);
  });

  it('preserves undirected legacy conflicts and keeps repeated legacy imports idempotent', () => {
    const C = pure(file), current = { _feedbackExperiment: { direction: 'cool', explanation: coolText, unassignedExplanation: 'Keep my prior unassigned explanation.' } };
    const first = merge(C, current, raw(undefined, [flat(oldText)])), second = merge(C, first.state, raw(undefined, [flat(oldText)]));
    expect(first.state._feedbackExperiment).toMatchObject(current._feedbackExperiment); expect(first.result.keptReflections).toBe(1);
    expect(Object.keys(first.state._feedbackExperiment.sessions || {})).toEqual([]);
    expect(second.state).toEqual(first.state); expect(second.result.keptReflections).toBe(1);
  });

  it('retains legacy Systems in Motion explanation/comparison merging alongside directional feedback notes', () => {
    const C = pure(file), incoming = raw([note('cool', coolText)], [flat(coolText),
      { id: 'meal', explanation: 'Incoming meal explanation.', transferExplanation: 'Incoming meal comparison.' }]);
    const current = { _feedbackExperiment: { direction: 'warm', explanation: warmText }, _systemsMotionLearning: {
      meal: { prediction: 'before', explanation: 'My meal explanation.', transferExplanation: '', completed: true },
      wound: { explanation: 'Keep wound writing.' } } };
    const merged = merge(C, current, incoming);
    expect(merged.state._systemsMotionLearning).toEqual({ meal: { prediction: 'before', explanation: 'My meal explanation.',
      transferExplanation: 'Incoming meal comparison.', completed: true }, wound: { explanation: 'Keep wound writing.' } });
    expect(merged.result.keptReflections).toBe(1); expect(feedbackTexts(C.packet(merged.state, ids, now))).toEqual({ warm: warmText, cool: coolText });
  });

  it('resumes imported inactive writing after a real disturbance switch without importing another attempt', () => {
    const motionWriting = { meal: { explanation: 'My saved meal explanation.', transferExplanation: 'My saved meal comparison.' } };
    const s = session(file, { _systemsMotionLearning: clone(motionWriting), _feedbackExperiment: { direction: 'warm', explanation: warmText, prediction: 'active', revealed: true,
      token: 'original-warm-token', context: 'temperature-feedback-v1|warm', sessions: { cool: { prediction: 'disabled', revealed: true, explanation: '' } } } });
    s.apply(raw([note('cool', coolText)], [flat(coolText)]));
    expect(s.data()._feedbackExperiment).toMatchObject({ direction: 'warm', explanation: warmText, prediction: 'active', revealed: true, token: 'original-warm-token' });
    s.change('anatomy-feedback-disturbance', 'cool');
    expect(s.data()._feedbackExperiment).toMatchObject({ direction: 'cool', explanation: coolText, prediction: 'disabled', revealed: true });
    expect(s.html().querySelector('#anatomy-feedback-explanation').value).toBe(coolText);
    s.change('anatomy-feedback-disturbance', 'warm');
    expect(s.data()._feedbackExperiment).toMatchObject({ direction: 'warm', explanation: warmText, prediction: 'active', revealed: true });
    expect(s.data()._structureNotes.kidneys).toBe('My kidney explanation.');
    expect(s.data()._systemsMotionLearning).toEqual(motionWriting);
  });

  for (const queued of [false, true]) {
    it.each(['changed writing', 'changed mode', 'changed band', 'changed sheet revision', 'closed sheet'])('rejects ' + (queued ? 'queued' : 'retained') + ' feedback resume after %s', reason => {
      const s = session(file, clone(savedReflections)), resume = s.captureResume('homeostasis-cool'); s.mount();
      if (queued) { s.defer(); resume(); }
      if (reason === 'changed writing') s.patch({ _feedbackExperiment: { ...s.data()._feedbackExperiment,
        sessions: { ...s.data()._feedbackExperiment.sessions, cool: { ...s.data()._feedbackExperiment.sessions.cool, explanation: 'Newer cooling explanation.' } } } });
      if (reason === 'changed mode') s.patch({ _activeTab: 'quiz' });
      if (reason === 'changed band') s.patch({ complexity: 1 });
      if (reason === 'changed sheet revision') s.patch({ _studySheetRevision: (s.data()._studySheetRevision || 0) + 1 });
      if (reason === 'closed sheet') s.patch({ _showStudySheet: false });
      const before = clone(s.data()), focused = marker(); s.announce.mockClear();
      if (queued) s.flush(); else resume(); vi.advanceTimersByTime(0);
      expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
    });

    it('rejects ' + (queued ? 'queued' : 'retained') + ' resume after a same-complexity profile change from grades 3–5 to K–2', () => {
      const s = session(file, { ...clone(savedReflections), complexity: 1 }, '3'), resume = s.captureResume('homeostasis-cool'); s.mount();
      if (queued) { s.defer(); resume(); }
      s.grade('1'); s.tree(); const before = clone(s.data()), focused = marker(); s.announce.mockClear();
      if (queued) s.flush(); else resume(); vi.advanceTimersByTime(0);
      expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
      expect(s.data().complexity).toBe(1);
    });

    it('rejects ' + (queued ? 'queued' : 'retained') + ' motion resume when its saved comparison is revised', () => {
      const s = session(file, clone(savedReflections)), resume = s.captureResume('meal'); s.mount();
      if (queued) { s.defer(); resume(); }
      s.patch({ _systemsMotionLearning: { ...s.data()._systemsMotionLearning,
        meal: { ...s.data()._systemsMotionLearning.meal, transferExplanation: 'Newer meal comparison.' } } });
      const before = clone(s.data()), focused = marker(); s.announce.mockClear();
      if (queued) s.flush(); else resume(); vi.advanceTimersByTime(0);
      expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
    });
  }

  it.each(['homeostasis-cool', 'meal'])('focuses the exact saved writing after accepted resume of %s', key => {
    const s = session(file, clone(savedReflections)), host = s.mount();
    const button = host.querySelector('[data-anatomy-resume-reflection="' + key + '"]'); expect(button).not.toBeNull(); button.focus();
    s.resume(key); const next = s.mount(); vi.advanceTimersByTime(0);
    const writing = next.querySelector(key === 'meal' ? '[data-anatomy-motion-explanation="meal"]' : '#anatomy-feedback-explanation');
    expect(writing).not.toBeNull(); expect(document.activeElement).toBe(writing);
    expect(writing.value).toBe(key === 'meal' ? 'My meal explanation.' : coolText);
    expect(s.data()._showStudySheet).toBe(false); expect(s.data()._aiInput).toBe(savedReflections._aiInput);
  });

  it.each(['homeostasis-cool', 'meal'])('keeps the learner’s new focus if it moves before %s resume focus runs', key => {
    const s = session(file, clone(savedReflections)), host = s.mount(); host.querySelector('[data-anatomy-resume-reflection="' + key + '"]').focus();
    s.resume(key); const focused = marker(); s.mount(); vi.advanceTimersByTime(0);
    expect(document.activeElement).toBe(focused); expect(s.data()._showStudySheet).toBe(false);
  });

  it.each(['homeostasis-cool', 'meal'])('checkpoints the latest live Cards round when resuming %s', key => {
    const s = session(file, { ...clone(savedReflections), system: 'skeletal', view: 'anterior', selectedStructure: 'skull',
      _activeTab: 'flashcards', _flashcardScope: 'review', _flashcardIdx: 1, _flashcardFlipped: true,
      _structureConfidence: { skull: 'practice', ribs: 'practice' }, _flashcardRounds: {} });
    const context = s.mount().querySelector('[data-anatomy-flashcards]').dataset.anatomyCardContext;
    s.patch({ _flashcardDeck: ['skull', 'ribs'], _flashcardDeckContext: context, _flashcardRoundContext: context, _flashcardRoundRated: { skull: true } });
    const resume = s.captureResume(key);
    s.patch({ _flashcardRoundRated: { skull: true, ribs: true }, _structureNotes: { ...s.data()._structureNotes, ribs: 'Fresh ribs note after rendering the link.' } });
    resume(); s.mount(); vi.advanceTimersByTime(0);
    expect(s.data()._flashcardRounds['skeletal:3:review']).toMatchObject({ context, deckIds: ['skull', 'ribs'], index: 1, rated: { skull: true, ribs: true } });
    expect(s.data()._structureNotes.ribs).toBe('Fresh ribs note after rendering the link.');
    expect(s.data()._aiInput).toBe(savedReflections._aiInput); expect(s.data()._aiMessages).toEqual(savedReflections._aiMessages);
    expect(s.data()._activeTab).toBe(key === 'meal' ? 'explore' : 'homeoHunt');
  });

  it.each(['homeostasis-cool', 'meal'])('preserves the current Quiz attempt when resuming %s from its Study sheet', key => {
    const s = session(file, { ...clone(savedReflections), _activeTab: 'quiz', quizMode: true });
    s.resume(key); s.mount(); vi.advanceTimersByTime(0);
    expect(s.data()).toMatchObject({ quizIdx: 3, quizScore: 2, quizFeedback: savedReflections.quizFeedback, _quizAttempts: 4,
      quizMode: false, _showStudySheet: false, _aiInput: savedReflections._aiInput });
    expect(s.data()._systemsMotionLearning).toEqual(savedReflections._systemsMotionLearning);
    expect(s.data()._structureNotes.kidneys).toBe('My kidney explanation.');
  });

  it.each(['warm', 'cool'])('explicitly assigns earlier writing to empty %s without losing the other context or local attempts', direction => {
    const initial = clone(savedReflections);
    initial._feedbackExperiment.explanation = direction === 'warm' ? '' : warmText;
    initial._feedbackExperiment.sessions.cool.explanation = direction === 'cool' ? '' : coolText;
    initial._feedbackExperiment.unassignedExplanation = oldText;
    const s = session(file, initial), before = clone(s.data()); s.resume('homeostasis-unassigned-' + direction); s.mount(); vi.advanceTimersByTime(0);
    expect(s.data()._feedbackExperiment).toMatchObject({ direction, explanation: oldText,
      prediction: direction === 'cool' ? 'disabled' : 'active', revealed: true });
    expect(s.data()._feedbackExperiment.unassignedExplanation).toBeUndefined();
    if (direction === 'warm') expect(s.data()._feedbackExperiment.token).toBe(before._feedbackExperiment.token);
    else expect(s.data()._feedbackExperiment.token).not.toBe(before._feedbackExperiment.token);
    expect(feedbackTexts(s.packet())).toEqual(direction === 'warm' ? { warm: oldText, cool: coolText } : { warm: warmText, cool: oldText });
    expect(s.data()._aiMessages).toEqual(before._aiMessages); expect(s.data()._systemsMotionLearning).toEqual(before._systemsMotionLearning);
    expect(s.data()._structureNotes).toEqual(before._structureNotes);
  });

  it.each(['warm', 'cool'])('keeps conflicting earlier writing saved and focuses its notice instead of overwriting %s', direction => {
    const initial = clone(savedReflections); initial._feedbackExperiment.unassignedExplanation = oldText;
    const s = session(file, initial), before = clone(s.data()), host = s.mount(), key = 'homeostasis-unassigned-' + direction;
    host.querySelector('[data-anatomy-resume-reflection="' + key + '"]').focus(); s.resume(key); const next = s.mount(); vi.advanceTimersByTime(0);
    expect(s.data()._feedbackExperiment).toEqual(before._feedbackExperiment); expect(s.data()._showStudySheet).toBe(true);
    expect(s.data()._activeTab).toBe(before._activeTab); expect(s.data()._studyRecordNotice).toContain('already has writing');
    expect(document.activeElement).toBe(next.querySelector('[data-anatomy-study-record-notice]'));
    expect(feedbackTexts(s.packet())).toEqual({ warm: warmText, cool: coolText, unassigned: oldText });
  });

  it.each(['warm', 'cool'])('can bind identical earlier writing to %s without creating a conflict or duplicate', direction => {
    const initial = clone(savedReflections); initial._feedbackExperiment.unassignedExplanation = oldText;
    if (direction === 'warm') initial._feedbackExperiment.explanation = oldText;
    else initial._feedbackExperiment.sessions.cool.explanation = oldText;
    const s = session(file, initial); s.resume('homeostasis-unassigned-' + direction); s.mount(); vi.advanceTimersByTime(0);
    expect(s.data()._showStudySheet).toBe(false); expect(s.data()._feedbackExperiment.direction).toBe(direction);
    expect(s.data()._feedbackExperiment.explanation).toBe(oldText); expect(s.data()._feedbackExperiment.unassignedExplanation).toBeUndefined();
    expect(s.packet().feedbackNotes.filter(row => row.explanation === oldText)).toHaveLength(1);
  });

  it('rejects queued assignment after the earlier imported writing is replaced', () => {
    const initial = clone(savedReflections); initial._feedbackExperiment.unassignedExplanation = oldText;
    const s = session(file, initial), resume = s.captureResume('homeostasis-unassigned-cool'); s.mount(); s.defer(); resume();
    s.patch({ _feedbackExperiment: { ...s.data()._feedbackExperiment, unassignedExplanation: 'A newer earlier reflection.' } });
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); s.flush(); vi.advanceTimersByTime(0);
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });

  it('accepts metadata-only records and sanitizes each context to portable writing fields', () => {
    const C = pure(file), parsed = C.parse(raw([{ ...note('warm', warmText), prediction: 'disabled', revealed: true,
      token: 'DO_NOT_IMPORT', sessions: { cool: { explanation: 'Unsafe nested text.' } } }, note('cool', coolText), note(null, oldText)]), ids);
    expect(parsed.feedbackNotes).toEqual([note('warm', warmText), note('cool', coolText), note(null, oldText)]);
    expect(parsed.learningNotes).toBeUndefined();
  });

  it.each(['warm', 'cool', null])('rejects duplicate metadata context %j', direction => {
    const C = pure(file); codedFailure(C, raw([note(direction, warmText), note(direction, coolText)]));
  });
  it.each(['hot', '', undefined, false, 1])('rejects invalid metadata direction %j', direction => {
    const C = pure(file); codedFailure(C, raw([note(direction, warmText)]));
  });
  it.each([null, {}, [], [note('warm', warmText), note('cool', coolText), note(null, oldText), note('hot', 'Fourth context.')]].map(value => [value]))('rejects invalid metadata container or row count %j', value => {
    const C = pure(file); codedFailure(C, raw(value));
  });
  it.each(['', '   ', null, 12, {}, 'x'.repeat(2001)])('rejects invalid or oversized explanation %j', explanation => {
    const C = pure(file); codedFailure(C, raw([note('warm', explanation)]));
  });
  it('rejects malformed metadata rows and a flat fallback that does not match any context', () => {
    const C = pure(file); codedFailure(C, raw([null])); codedFailure(C, raw([['warm', warmText]]));
    codedFailure(C, raw([note('warm', warmText), note('cool', coolText)], [flat('A mismatched fallback.')]));
  });
  it('still rejects duplicate legacy IDs, too many flat notes, and invalid Homeostasis comparison text', () => {
    const C = pure(file); codedFailure(C, raw([note('warm', warmText)], [flat(warmText), flat(warmText)]));
    codedFailure(C, raw(undefined, Array(6).fill(flat(oldText))));
    codedFailure(C, raw([note('warm', warmText)], [{ ...flat(warmText), transferExplanation: 'Invalid comparison.' }]));
  });
});
