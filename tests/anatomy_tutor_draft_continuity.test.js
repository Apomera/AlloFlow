import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const clone = value => JSON.parse(JSON.stringify(value));
const now = 1800000000000;
const kidneyContext = { version: 1, systemId: 'organs', structureId: 'kidneys', band: 'g912' };
const heartContext = { version: 1, systemId: 'circulatory', structureId: 'heart', band: 'g912' };
const priorMessages = [
  { role: 'user', text: 'What does this structure do?', systemId: 'organs', structureId: 'kidneys', band: 'g912' },
  { role: 'ai', kind: 'lesson', text: 'Refer to the kidney lesson.', question: 'What does this structure do?', systemId: 'organs', structureId: 'kidneys', band: 'g912' }
];
const base = {
  _activeTab: 'aiTutor', system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys',
  _aiInput: '', _aiConversationBand: 'g912', _aiMessages: priorMessages,
  _structureNotes: { kidneys: 'The kidneys regulate water and salts.' },
  _structureConfidence: { heart: 'learning' }, _confidenceAt: { heart: now },
  _retrievalEvidence: { heart: { attempts: 4, correct: 3 } }
};
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function pending() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function resolveAnswer() { for (let i = 0; i < 5; i++) await Promise.resolve(); }

function session(file, extra = {}, api, grade = '9', sharedTool = null, freshSetterWrapper = false) {
  if (!sharedTool) resetStemLab(); const tool = sharedTool || loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, host, level = grade, deferred = false, queue = [];
  const request = pending(), callGemini = api === undefined ? vi.fn(() => request.promise) : api, announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: level, callGemini,
    setToolData: freshSetterWrapper ? update => setToolData(update) : setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const hook = (key, value = true) => node(element => element.props?.[key] === value);
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); vi.advanceTimersByTime(0);
  return {
    data: () => data.anatomy, node, hook, tree, announce, api: callGemini, request, tool,
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; }, grade: value => { level = value; },
    change: value => hook('data-anatomy-tutor-input').props.onChange({ target: { value } }),
    ask: () => hook('data-anatomy-tutor-send').props.onClick(),
    action: name => name === 'starter' ? hook('data-anatomy-tutor-draft', 1).props.onClick :
      name === 'again' ? node(element => element.props?.['data-anatomy-tutor-draft-again'] !== undefined).props.onClick :
      name === 'clear-chat' ? node(element => element.props?.['aria-label'] === 'Clear AI tutor conversation').props.onClick :
      hook('data-anatomy-tutor-' + name).props.onClick,
    mount: () => {
      if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
      host.innerHTML = markup(); return host;
    },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pendingUpdates = queue; queue = []; pendingUpdates.forEach(apply); }
  };
}

function resetRequests() {
  for (const request of Object.values(window.__alloAnatomyAiRequests || {})) if (request?.timer) clearTimeout(request.timer);
  if (window.__alloAnatomyAiRequest?.timer) clearTimeout(window.__alloAnatomyAiRequest.timer);
  window.__alloAnatomyAiRequests = undefined; window.__alloAnatomyAiRequest = null; window.__alloAnatomyAiPending = null;
}
let sound, audioDescriptor, scrollDescriptor, rectsDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); resetRequests(); document.body.innerHTML = ''; sound = vi.fn();
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  audioDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: function() {
    this.currentTime = 0; this.destination = {};
    this.createOscillator = () => ({ frequency: { value: 0 }, connect() {}, start: sound, stop() {} });
    this.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} });
  } });
});
afterEach(() => {
  resetRequests(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  if (audioDescriptor) Object.defineProperty(window, 'AudioContext', audioDescriptor); else delete window.AudioContext;
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor); else delete HTMLElement.prototype.scrollIntoView;
  if (rectsDescriptor) Object.defineProperty(HTMLElement.prototype, 'getClientRects', rectsDescriptor); else delete HTMLElement.prototype.getClientRects;
});
const settle = () => vi.advanceTimersByTime(240);
function marker() { const input = document.createElement('input'); document.body.appendChild(input); input.focus(); return input; }
function resetEffects(s) { s.announce.mockClear(); sound.mockClear(); if (s.api) s.api.mockClear(); }

const staleActions = [
  ['starter', 'a newer draft', {}, { _aiInput: 'My newer personal question.', _aiDraftContext: kidneyContext }],
  ['again', 'a newer draft', {}, { _aiInput: 'My newer personal question.', _aiDraftContext: kidneyContext }],
  ['send', 'a revised question', { _aiInput: 'Original question.' }, { _aiInput: 'New question.' }],
  ['send', 'a study context change', { _aiInput: 'Original question.' }, { system: 'circulatory', view: 'anterior', selectedStructure: 'heart' }],
  ['send', 'a learning level change before rerender', { _aiInput: 'Original question.' }, { complexity: 1 }],
  ['send', 'leaving Tutor', { _aiInput: 'Original question.' }, { _activeTab: 'explore' }],
  ['send', 'a newer draft revision', { _aiInput: 'Original question.' }, { _aiDraftRevision: 7 }],
  ['clear-chat', 'a new pending request token', {}, { _aiRequestToken: 'replacement-token', _aiLoading: true }],
  ['clear-chat', 'a newer draft', {}, { _aiInput: 'Do not erase this newer writing.' }],
  ['clear-draft', 'an edited draft', { _aiInput: 'Original question.', _aiDraftContext: kidneyContext }, { _aiInput: 'New writing.' }],
  ['clear-draft', 'an opened study sheet', { _aiInput: 'Original question.', _aiDraftContext: kidneyContext }, { _showStudySheet: true }]
];

for (const file of files) describe('Tutor draft and original question continuity: ' + file, () => {
  it.each(staleActions)('rejects queued %s after %s without draft loss or effects', (action, _reason, initial, changed) => {
    const s = session(file, initial), stale = s.action(action); s.mount(); settle(); resetEffects(s);
    s.defer(); stale(); s.patch(changed); const before = clone(s.data()), focused = marker();
    // Keep the old DOM and render globals: rejection must depend on fresh saved state.
    s.flush(); settle(); expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled();
    expect(s.api).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  }, 15000);

  it('preserves current writing when a starter is retained, and keeps starter buttons visibly disabled', () => {
    const s = session(file), starter = s.action('starter'); s.change('My own question about salt and water.');
    const before = clone(s.data()); starter(); expect(s.data()).toEqual(before);
    const host = s.mount(); settle(); expect(host.querySelectorAll('[data-anatomy-tutor-draft]:disabled')).toHaveLength(3);
    expect(s.data()._aiDraftContext).toEqual(kidneyContext); expect(s.api).not.toHaveBeenCalled();
  });

  it('binds an ordinary draft on first input and preserves its context across editing and navigation', () => {
    const s = session(file); s.change('Why does this structure have this shape?'); expect(s.data()._aiDraftRevision).toBe(1);
    s.patch({ system: 'circulatory', view: 'anterior', selectedStructure: 'heart' }); s.change('Why does this structure have this shape and function?');
    expect(s.data()._aiDraftContext).toEqual(kidneyContext); expect(s.data()._aiDraftRevision).toBe(2);
    const host = s.mount(); settle(); expect(host.querySelector('[data-anatomy-tutor-draft-context]').textContent).toContain('Kidneys');
    expect(s.data().selectedStructure).toBe('heart'); expect(s.api).not.toHaveBeenCalled();
  });

  it('clears only the draft and lets new writing bind to the current study', () => {
    const s = session(file, { _aiInput: 'Saved kidney question.', _aiDraftContext: kidneyContext,
      system: 'circulatory', view: 'anterior', selectedStructure: 'heart' });
    s.action('clear-draft')(); const host = s.mount(); settle();
    expect(s.data()._aiInput).toBe(''); expect(s.data()._aiDraftContext).toBeNull(); expect(s.data()._aiMessages).toEqual(priorMessages);
    expect(s.data()._structureNotes).toEqual(base._structureNotes); expect(document.activeElement).toBe(host.querySelector('[data-anatomy-tutor-input]'));
    s.change('How does this structure pump?'); expect(s.data()._aiDraftContext).toEqual(heartContext); expect(s.data()._aiDraftRevision).toBe(2);
  });

  it('explicitly rebinds the same written question to current study without moving the diagram', () => {
    const s = session(file, { _aiInput: 'How does this structure work?', _aiDraftContext: kidneyContext,
      system: 'circulatory', view: 'anterior', selectedStructure: 'heart' });
    s.action('use-current')(); const host = s.mount(); settle();
    expect(s.data()._aiInput).toBe('How does this structure work?'); expect(s.data()._aiDraftContext).toEqual(heartContext);
    expect(s.data().selectedStructure).toBe('heart'); expect(s.data().system).toBe('circulatory'); expect(s.data()._aiDraftRevision).toBe(1);
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-tutor-input]')); expect(s.api).not.toHaveBeenCalled();
  });

  it('rejects a queued rebind after the bound draft changes', () => {
    const s = session(file, { _aiInput: 'Same question.', _aiDraftContext: kidneyContext,
      system: 'circulatory', view: 'anterior', selectedStructure: 'heart' });
    const rebind = s.action('use-current'); s.mount(); settle(); resetEffects(s); s.defer(); rebind();
    s.patch({ _aiDraftContext: heartContext }); const before = clone(s.data()), focused = marker();
    s.flush(); settle(); expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.api).not.toHaveBeenCalled();
  });

  for (const recovery of ['lesson', 'interrupted']) it('restores ' + recovery + ' question context after the learner opens a different structure', () => {
    const extra = { system: 'circulatory', view: 'anterior', selectedStructure: 'heart' };
    if (recovery === 'interrupted') Object.assign(extra, { _aiLoading: true, _aiRequestToken: 'interrupted-save', _aiMessages: [priorMessages[0]] });
    const s = session(file, extra); s.action('again')(); const host = s.mount(); settle();
    expect(s.data()._aiInput).toBe('What does this structure do?'); expect(s.data()._aiDraftContext).toEqual(kidneyContext);
    expect(s.data().selectedStructure).toBe('heart'); expect(s.data().system).toBe('circulatory'); expect(s.api).not.toHaveBeenCalled();
    expect(host.querySelector('[data-anatomy-tutor-draft-context]').textContent).toContain('Kidneys');
    s.change('What does this structure do with water?'); expect(s.data()._aiDraftContext).toEqual(kidneyContext);
    s.ask(); expect(s.api).toHaveBeenCalledTimes(1); const prompt = s.api.mock.calls[0][0];
    expect(prompt).toContain('looking at the Kidneys'); expect(prompt).toContain('Lesson context: Kidneys.'); expect(prompt).not.toContain('looking at the Heart');
    expect(s.data()._aiMessages.at(-1)).toMatchObject({ role: 'user', systemId: 'organs', structureId: 'kidneys', band: 'g912' });
    expect(s.data().selectedStructure).toBe('heart');
  });

  it('restores a serialized bound draft without rebinding it to the current diagram', () => {
    const saved = { _aiInput: 'What happens to the water?', _aiDraftContext: kidneyContext,
      system: 'circulatory', view: 'anterior', selectedStructure: 'heart', _aiDraftRevision: 5 };
    const s = session(file, clone(saved)); s.ask();
    expect(s.api.mock.calls[0][0]).toContain('Lesson context: Kidneys.'); expect(s.data()._aiDraftRevision).toBe(6);
    expect(s.data().selectedStructure).toBe('heart'); expect(s.data()._aiDraftContext).toBeNull();
  });

  it('uses the current young learning band and permissions when sending a restored older draft context', () => {
    const s = session(file, { _aiInput: 'What does this structure do?', _aiDraftContext: kidneyContext, complexity: 1,
      system: 'circulatory', view: 'anterior', selectedStructure: 'heart' }, undefined, '1');
    s.ask(); const prompt = s.api.mock.calls[0][0];
    expect(prompt).toContain('Selected learning band: k2.'); expect(prompt).toContain('Lesson context: Kidneys.');
    expect(prompt).toContain('kindergarten to grade 2'); expect(prompt).not.toContain('high school or beyond'); expect(prompt).not.toContain('KDIGO');
    expect(prompt).not.toContain('Refer to the kidney lesson.'); expect(s.data()._aiMessages).toHaveLength(1);
    expect(s.data()._aiMessages[0].band).toBe('k2'); expect(s.data().selectedStructure).toBe('heart');
  });

  it('rejects a retained older-band retry before rerender instead of drafting advanced context', () => {
    const s = session(file), retry = s.action('again'); s.mount(); settle(); resetEffects(s);
    s.grade('1'); s.patch({ complexity: 1 }); const before = clone(s.data()), focused = marker();
    retry(); settle(); expect(s.data()).toEqual(before); expect(s.api).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  });

  it.each([
    { version: 1, systemId: 'organs', structureId: 'heart', band: 'g912' },
    { version: 1, systemId: 'forged', structureId: 'kidneys', band: 'g912' },
    { version: 2, systemId: 'organs', structureId: 'kidneys', band: 'g912' },
    { version: 1, systemId: 'organs', structureId: 'kidneys', band: 'forged' }
  ])('discards an invalid saved draft context and sends the validated current structure (%j)', context => {
    const s = session(file, { _aiInput: 'Explain this.', _aiDraftContext: context }); s.ask();
    expect(s.api.mock.calls[0][0]).toContain('looking at the Kidneys'); expect(s.data()._aiMessages.at(-1)).toMatchObject({ systemId: 'organs', structureId: 'kidneys', band: 'g912' });
  });

  it('merges fresh history and question counts when a retained Send still owns the same draft', () => {
    const s = session(file, { _aiInput: 'Explain salt balance.', _aiDraftContext: kidneyContext }), send = s.action('send');
    const fresh = { role: 'ai', text: 'A newly saved explanation.', systemId: 'organs', structureId: 'kidneys', band: 'g912' };
    const notes = { kidneys: 'Latest note before sending.' }, confidence = { heart: 'mastered' }, evidence = { heart: { attempts: 12, correct: 10 } };
    s.patch({ _aiMessages: [...priorMessages, fresh], _aiQuestions: 19, _structureNotes: notes, _structureConfidence: confidence, _retrievalEvidence: evidence });
    send(); expect(s.data()._aiQuestions).toBe(20); expect(s.data()._aiMessages.at(-2)).toMatchObject(fresh);
    expect(s.api.mock.calls[0][0]).toContain('A newly saved explanation.'); expect(s.data()._structureNotes).toEqual(notes);
    expect(s.data()._structureConfidence).toEqual(confidence); expect(s.data()._retrievalEvidence).toEqual(evidence);
  });

  it('accepts only one queued Send from duplicate callbacks and focuses the editable empty input', () => {
    const s = session(file, { _aiInput: 'Explain salt balance.' }), first = s.action('send'), second = s.action('send');
    s.mount(); settle(); resetEffects(s); s.defer(); first(); second(); expect(s.api).not.toHaveBeenCalled();
    s.flush(); const host = s.mount(); settle(); expect(s.api).toHaveBeenCalledTimes(1); expect(s.data()._aiQuestions).toBe(1);
    expect(s.data()._aiDraftRevision).toBe(1); expect(s.data()._aiInput).toBe(''); expect(s.data()._aiDraftContext).toBeNull();
    expect(host.querySelector('[data-anatomy-tutor-input]').disabled).toBe(false); expect(document.activeElement).toBe(host.querySelector('[data-anatomy-tutor-input]'));
  });

  it('keeps a new bound draft written while waiting when the original response completes', async () => {
    const s = session(file, { _aiInput: 'Explain kidney filtration.' }); s.ask();
    s.patch({ system: 'circulatory', view: 'anterior', selectedStructure: 'heart' }); s.change('How do heart valves work?');
    const revision = s.data()._aiDraftRevision; s.request.resolve('Kidneys regulate the composition of blood.'); await resolveAnswer();
    expect(s.data()._aiInput).toBe('How do heart valves work?'); expect(s.data()._aiDraftContext).toEqual(heartContext);
    expect(s.data()._aiDraftRevision).toBe(revision); expect(s.data()._aiMessages.at(-1)).toMatchObject({ role: 'ai', systemId: 'organs', structureId: 'kidneys', band: 'g912' });
    expect(s.data()._aiLoading).toBe(false);
  });

  it('clears pending chat while preserving the new draft, its context, notes and evidence, and rejects a late reply', async () => {
    const s = session(file, { _aiInput: 'Explain kidney filtration.' }); s.ask();
    s.patch({ system: 'circulatory', view: 'anterior', selectedStructure: 'heart' }); s.change('How do heart valves work?');
    const notes = { kidneys: 'New saved explanation.' }; s.patch({ _structureNotes: notes });
    s.action('clear-chat')(); const host = s.mount(); settle();
    expect(s.data()._aiMessages).toEqual([]); expect(s.data()._aiLoading).toBe(false); expect(s.data()._aiRequestToken).toBeNull();
    expect(s.data()._aiInput).toBe('How do heart valves work?'); expect(s.data()._aiDraftContext).toEqual(heartContext);
    expect(s.data()._structureNotes).toEqual(notes); expect(s.data()._retrievalEvidence).toEqual(base._retrievalEvidence);
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-tutor-input]'));
    const before = clone(s.data()); s.announce.mockClear(); s.request.resolve('A late kidney answer.'); await resolveAnswer();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(window.__alloAnatomyAiRequest).toBeNull();
  });

  it('rejects stale Clear chat without releasing a newer request', async () => {
    const s = session(file), clear = s.action('clear-chat'); s.change('A new question.'); s.ask();
    const token = s.data()._aiRequestToken; s.mount(); settle(); const before = clone(s.data()), focused = marker(); resetEffects(s);
    clear(); settle(); expect(s.data()).toEqual(before); expect(window.__alloAnatomyAiRequests[token]).toBeDefined();
    expect(document.activeElement).toBe(focused); expect(sound).not.toHaveBeenCalled();
    s.request.resolve('The current question still receives its answer.'); await resolveAnswer();
    expect(s.data()._aiMessages.at(-1).text).toBe('The current question still receives its answer.');
  });

  it('keeps Stop token guarded and focuses the accepted draft without changing its text or context', () => {
    const s = session(file, { _aiInput: 'Original question.' }); s.ask(); s.change('My next question.');
    const context = clone(s.data()._aiDraftContext), revision = s.data()._aiDraftRevision;
    s.action('stop')(); const host = s.mount(); settle();
    expect(s.data()._aiInput).toBe('My next question.'); expect(s.data()._aiDraftContext).toEqual(context); expect(s.data()._aiDraftRevision).toBe(revision);
    expect(s.data()._aiMessages.at(-1).kind).toBe('lesson'); expect(s.data()._aiMessages.at(-1).text).toContain('Stopped waiting.');
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-tutor-input]'));
  });

  it('opens expanded structure search from an empty lesson while retaining the written draft', () => {
    const s = session(file, { selectedStructure: null, _aiInput: 'Which structure should I study?', _aiMessages: [], _anatomyModelFocus: true });
    s.action('choose-structure')(); const host = s.mount(); settle();
    expect(s.data()._activeTab).toBe('explore'); expect(s.data()._explorerControlsExpanded).toBe(true); expect(s.data()._anatomyModelFocus).toBe(false);
    expect(s.data()._aiInput).toBe('Which structure should I study?'); expect(s.data()._aiDraftRevision).toBe(1);
    expect(document.activeElement).toBe(host.querySelector('#anatomy-global-search-input')); expect(s.api).not.toHaveBeenCalled();
  });

  it('rejects stale editor and empty-lesson Choose callbacks after leaving the tutor', () => {
    const s = session(file, { selectedStructure: null, _aiMessages: [] }), edit = s.hook('data-anatomy-tutor-input').props.onChange, choose = s.action('choose-structure');
    s.mount(); settle(); s.patch({ _activeTab: 'explore' }); const before = clone(s.data()), focused = marker(); resetEffects(s);
    edit({ target: { value: 'Stale input.' } }); choose(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.api).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled();
  });

  for (const [fromGrade, fromBand, toGrade, toBand] of [['4', 'g35', '1', 'k2'], ['1', 'k2', '4', 'g35']]) {
    it.each(['send', 'again', 'clear-chat'].flatMap(action => ['retained', 'queued'].map(delivery => [action, delivery])))
      ('rejects %s (%s) after profile band ' + fromBand + '→' + toBand + ' while complexity and saved conversation stay unchanged', (action, delivery) => {
        const messages = priorMessages.map(message => ({ ...message, band: fromBand }));
        const s = session(file, { complexity: 1, _aiConversationBand: fromBand, _aiMessages: messages,
          _aiInput: action === 'send' ? 'Explain this structure.' : '' }, undefined, fromGrade);
        const callback = s.action(action); s.mount(); settle(); resetEffects(s);
        if (delivery === 'queued') { s.defer(); callback(); }
        s.grade(toGrade); s.tree(); const before = clone(s.data()), focused = marker();
        expect(s.data().complexity).toBe(1); expect(s.data()._aiConversationBand).toBe(fromBand);
        if (delivery === 'queued') s.flush(); else callback();
        settle(); expect(s.data()).toEqual(before); expect(s.api).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled();
        expect(sound).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
      });

    it('rejects a queued ' + fromBand + ' response after switching the profile to ' + toBand + ' at the same complexity', async () => {
      const s = session(file, { complexity: 1, _aiConversationBand: fromBand, _aiMessages: [], _aiInput: 'Explain this structure.' }, undefined, fromGrade);
      s.ask(); s.mount(); settle(); resetEffects(s); s.defer();
      // finishAiRequest is queued, then the new profile renders before its updater runs.
      s.request.resolve('An answer prepared for ' + fromBand + '.'); await resolveAnswer();
      s.grade(toGrade); s.tree(); const before = clone(s.data()), focused = marker();
      s.flush(); settle(); expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
      expect(sound).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
      expect(s.data()._aiMessages.some(message => message.role === 'ai')).toBe(false);
    });

    it('cancels delayed accepted input focus after profile band ' + fromBand + '→' + toBand + ' while old DOM remains mounted', () => {
      const s = session(file, { complexity: 1, _aiConversationBand: fromBand, _aiMessages: [] }, undefined, fromGrade);
      settle(); s.action('starter')(); s.mount();
      // Install the accepted old-band DOM without flushing its delayed focus callback.
      s.grade(toGrade); s.tree(); const before = clone(s.data()), focused = marker(); resetEffects(s);
      settle(); expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused);
      expect(s.api).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled();
    });
  }

  it('rejects retained Send when an unspecified complexity changes with the latest profile default', () => {
    const s = session(file, { complexity: undefined, _aiConversationBand: 'g35', _aiMessages: [], _aiInput: 'Explain this structure.' }, undefined, '4');
    const send = s.action('send'); s.mount(); settle(); resetEffects(s); s.grade('9'); s.tree();
    const before = clone(s.data()), focused = marker(); send(); settle();
    expect(s.data()).toEqual(before); expect(s.api).not.toHaveBeenCalled(); expect(sound).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  });

  it('keeps the latest profile band scoped to each independent setter in the same loaded tool', () => {
    const older = session(file, { complexity: 1, _aiConversationBand: 'g35', _aiMessages: [], _aiInput: 'A grade 4 question.' }, undefined, '4');
    const olderSend = older.action('send');
    const younger = session(file, { complexity: 1, _aiConversationBand: 'k2', _aiMessages: [], _aiInput: 'A grade 1 question.' }, undefined, '1', older.tool);
    const youngerSend = younger.action('send');
    // Rendering the younger setter must not invalidate the older setter's callback.
    olderSend(); expect(older.api).toHaveBeenCalledTimes(1); expect(older.api.mock.calls[0][0]).toContain('Selected learning band: g35.');
    older.tree();
    // Rendering the older setter must not invalidate the younger setter's callback.
    youngerSend(); expect(younger.api).toHaveBeenCalledTimes(1); expect(younger.api.mock.calls[0][0]).toContain('Selected learning band: k2.');
    expect(older.data()._aiConversationBand).toBe('g35'); expect(younger.data()._aiConversationBand).toBe('k2');
    expect(older.data()._aiRequestToken).not.toBe(younger.data()._aiRequestToken);
  });

  it.each([['4', 'g35', '1', 'k2'], ['1', 'k2', '4', 'g35']])
    ('rejects a retained %s/%s Send after profile %s/%s with new setter wrappers and a fresh state clone', (fromGrade, fromBand, toGrade, _toBand) => {
      const s = session(file, { complexity: 1, _aiConversationBand: fromBand, _aiMessages: [], _aiInput: 'Explain this structure.' }, undefined, fromGrade, null, true);
      const send = s.action('send'); s.mount(); settle(); resetEffects(s);
      // The production bridge creates a new wrapper each render. A host save may also clone anatomy.
      s.grade(toGrade); s.patch({}); s.tree(); const before = clone(s.data()), focused = marker();
      s.defer(); send(); s.flush(); settle();
      expect(s.data()).toEqual(before); expect(s.api).not.toHaveBeenCalled(); expect(s.announce).not.toHaveBeenCalled();
      expect(sound).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
    });
});
