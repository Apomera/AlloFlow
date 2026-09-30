import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const round = {
  _spotterActive: true, _spotterTarget: 'skull',
  _spotterOpts: ['skull', 'mandible', 'clavicle', 'ribs'].map(id => ({ id })),
  _spotterStartTime: now - 2000, _spotterSerial: 1,
  _spotterTimed: true, _spotterRoundTimed: true,
  _spotterScore: 2, _spotterTotal: 4,
  _structureNotes: { skull: 'My saved landmark note' }
};
const clone = value => JSON.parse(JSON.stringify(value));

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = find(child, predicate);
      if (match) return match;
    }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function session(file, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'spotter', ...extra } };
  let host, deferred = false, queue = [];
  const announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const ctx = () => ({
    toolData: data, gradeLevel: '9', announceToSR: announce,
    setToolData: update => deferred ? queue.push(update) : apply(update)
  });
  const node = predicate => {
    const match = find(tool.render(makeCtx(ctx())), predicate);
    expect(match).not.toBeNull();
    return match;
  };
  const handler = (hook, value = true) => node(element => element.props?.[hook] === value).props.onClick;
  const markup = () => renderTool('anatomy', data, ctx());
  // Settle the tool's deferred system/view progress before taking preservation snapshots.
  markup();
  vi.advanceTimersByTime(0);
  return {
    data: () => data.anatomy, announce, node, handler,
    click: (hook, value = true) => handler(hook, value)(),
    answer: id => handler('data-anatomy-spotter-option', id)(),
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => {
      if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
      host.innerHTML = markup();
      // A changed system or view may add its own initial progress entry.
      vi.advanceTimersByTime(0);
      return host;
    },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = queue; queue = []; updates.forEach(apply); }
  };
}

let scrollDescriptor;
beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  document.body.innerHTML = '';
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
  else delete HTMLElement.prototype.scrollIntoView;
});
const settle = () => vi.advanceTimersByTime(20);

for (const file of files) describe('Spotter question and diagram navigation: ' + file, () => {
  it('names the question and choices while hiding selected structure names in the pending canvas', () => {
    const s = session(file, { ...round, selectedStructure: 'skull', _bodyView3d: true });
    const before = clone(s.data()), root = s.html();
    expect(root.querySelector('#anatomy-spotter-question-title').getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('[data-anatomy-spotter-choices]').getAttribute('aria-labelledby')).toBe('anatomy-spotter-question-title');
    expect(root.querySelector('[data-anatomy-spotter-return]').textContent).toBe('Return to question');
    const canvas = root.querySelector('[data-anatomy-canvas]');
    expect(canvas.getAttribute('aria-label')).toContain('Identify the structure at the crosshair');
    for (const name of ['Skull', 'Mandible', 'Clavicle', 'Ribs']) expect(canvas.getAttribute('aria-label')).not.toContain(name);
    expect(root.querySelectorAll('[data-anatomy-spotter-answer-state="neutral"]')).toHaveLength(4);
    expect(s.data()).toEqual(before);
  });

  it('moves from question to the crosshair and back without changing the timed attempt or saved work', () => {
    const s = session(file, round), before = clone(s.data());
    s.mount();
    s.click('data-anatomy-spotter-diagram');
    settle();
    expect(document.activeElement.hasAttribute('data-anatomy-canvas')).toBe(true);
    expect(document.querySelector('[data-anatomy-spotter-return]').scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    s.click('data-anatomy-spotter-return');
    s.mount();
    settle();
    expect(document.activeElement.id).toBe('anatomy-spotter-question-title');
    expect(s.data()).toEqual(before);
  });

  it('exits model focus mode when returning while retaining the exact attempt, timing, score and notes', () => {
    const s = session(file, { ...round, _anatomyModelFocus: true }), before = clone(s.data());
    s.click('data-anatomy-spotter-return');
    s.mount();
    settle();
    expect(s.data()).toEqual({ ...before, _anatomyModelFocus: false });
    expect(document.activeElement.id).toBe('anatomy-spotter-question-title');
  });

  it.each(['skull', 'ribs'])('focuses answer feedback and labels the selected and correct choices after choosing %s', answer => {
    const s = session(file, round);
    s.mount();
    s.answer(answer);
    const root = s.mount();
    settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spotter-feedback')).toBe(true);
    expect(document.activeElement.getAttribute('aria-labelledby')).toBe('anatomy-spotter-feedback-title');
    expect(root.querySelectorAll('[data-anatomy-spotter-option]:disabled')).toHaveLength(4);
    const chosen = root.querySelector('[data-anatomy-spotter-option="' + answer + '"]');
    expect(chosen.getAttribute('aria-pressed')).toBe('true');
    expect(chosen.textContent).toContain('Your answer');
    expect(root.querySelector('[data-anatomy-spotter-option="skull"]').textContent).toContain('Correct answer');
    expect(chosen.dataset.anatomySpotterAnswerState).toBe(answer === 'skull' ? 'correct' : 'chosen');
    expect(s.data()._spotterTotal).toBe(5);
    expect(s.data()._retrievalEvidence.skull).toEqual({ attempts: 1, correct: answer === 'skull' ? 1 : 0 });
  });

  it('returns a saved answered round to its feedback and names the marked target on the review canvas', () => {
    const s = session(file, { ...round, selectedStructure: 'ribs', _spotterFeedback: 'ribs', _spotterElapsed: 2 });
    const before = clone(s.data()), root = s.mount();
    const targetName = root.querySelector('[data-anatomy-spotter-option="skull"] > span:not([aria-hidden])').textContent;
    const chosenName = root.querySelector('[data-anatomy-spotter-option="ribs"] > span:not([aria-hidden])').textContent;
    expect(targetName).not.toBe(chosenName);
    expect(root.querySelector('[data-anatomy-canvas]').getAttribute('aria-label')).toContain('The crosshair marks ' + targetName + '.');
    expect(root.querySelector('[data-anatomy-spotter-return]').textContent).toBe('Return to feedback');
    s.click('data-anatomy-spotter-diagram');
    settle();
    expect(document.activeElement.hasAttribute('data-anatomy-canvas')).toBe(true);
    s.click('data-anatomy-spotter-return');
    settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spotter-feedback')).toBe(true);
    expect(s.data()).toEqual(before);
  });

  it('focuses new questions on Start and Next while preserving cumulative evidence and fresh notes', () => {
    const s = session(file, { _structureNotes: { skull: 'Original note' } });
    s.click('data-anatomy-spotter-start');
    s.mount();
    settle();
    expect(document.activeElement.id).toBe('anatomy-spotter-question-title');
    const target = s.data()._spotterTarget;
    s.answer(target);
    s.patch({ _structureNotes: { skull: 'Latest note' } });
    s.click('data-anatomy-spotter-next');
    s.mount();
    settle();
    expect(document.activeElement.id).toBe('anatomy-spotter-question-title');
    expect(s.data()._spotterSerial).toBe(2);
    expect(s.data()._spotterTarget).not.toBe(target);
    expect(s.data()._spotterFeedback).toBeNull();
    expect(s.data()._spotterScore).toBe(1);
    expect(s.data()._spotterTotal).toBe(1);
    expect(s.data()._retrievalEvidence[target]).toEqual({ attempts: 1, correct: 1 });
    expect(s.data()._structureNotes.skull).toBe('Latest note');
  });

  it('keeps the question number shortcuts usable from the focused heading', () => {
    const s = session(file, round);
    s.mount();
    s.click('data-anatomy-spotter-return');
    settle();
    const preventDefault = vi.fn();
    s.node(node => node.props?.['data-anatomy-spotter-panel']).props.onKeyDown({ key: '1', target: document.activeElement, preventDefault });
    s.mount();
    settle();
    expect(preventDefault).toHaveBeenCalled();
    expect(s.data()._spotterFeedback).toBe('skull');
    expect(document.activeElement.hasAttribute('data-anatomy-spotter-feedback')).toBe(true);
  });

  it('keeps delayed answer focus out of a newer question and returns End to the start control', () => {
    const s = session(file, round);
    s.answer('ribs');
    s.click('data-anatomy-spotter-next');
    s.mount();
    settle();
    expect(document.activeElement.id).toBe('anatomy-spotter-question-title');
    s.answer(s.data()._spotterTarget);
    s.click('data-anatomy-spotter-end');
    s.mount();
    settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spotter-start')).toBe(true);
    expect(s.data()._spotterTotal).toBe(6);
  });

  it.each([{ _spotterSerial: 2 }, { system: 'muscular' }, { view: 'posterior' }, { complexity: 1 }, { _activeTab: 'explore' }])('rejects old navigation focus in a superseded context %j', patch => {
    const s = session(file, round);
    const diagram = s.handler('data-anatomy-spotter-diagram'), back = s.handler('data-anatomy-spotter-return');
    s.patch(patch);
    s.mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const before = clone(s.data());
    diagram(); back();
    settle();
    expect(document.activeElement).toBe(outside);
    expect(s.data()).toEqual(before);
  });

  it('does not focus feedback after leaving Spotter before an accepted answer effect settles', () => {
    const s = session(file, round);
    s.answer('skull');
    s.patch({ _activeTab: 'explore' });
    s.mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    settle();
    expect(document.activeElement).toBe(outside);
    expect(s.data()._spotterTotal).toBe(5);
  });

  it('focuses deferred accepted answers and rejects deferred answers from a newer context', () => {
    const s = session(file, round);
    s.defer(); s.answer('ribs');
    expect(s.data()._spotterFeedback).toBeUndefined();
    s.patch({ _structureNotes: { skull: 'Writing saved before answer commit' } });
    s.flush(); s.mount(); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spotter-feedback')).toBe(true);
    expect(s.data()._structureNotes.skull).toBe('Writing saved before answer commit');
    const rejected = session(file, round);
    rejected.defer(); rejected.answer('skull'); rejected.patch({ _spotterSerial: 2 });
    const before = clone(rejected.data());
    rejected.flush(); rejected.mount();
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    settle();
    expect(rejected.data()).toEqual(before);
    expect(document.activeElement).toBe(outside);
    expect(rejected.announce).not.toHaveBeenCalled();
  });

  it('rejects a delayed model-focus exit after the current answer changes', () => {
    const s = session(file, { ...round, _anatomyModelFocus: true });
    s.defer(); s.click('data-anatomy-spotter-return');
    s.patch({ _spotterFeedback: 'ribs' });
    const before = clone(s.data());
    s.flush(); s.mount();
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    settle();
    expect(s.data()).toEqual(before);
    expect(s.data()._anatomyModelFocus).toBe(true);
    expect(document.activeElement).toBe(outside);
  });

  it('omits diagram navigation for inactive or malformed rounds without creating attempts', () => {
    for (const extra of [{}, { _spotterActive: true, _spotterTarget: 'skull', _spotterOpts: [] }]) {
      const s = session(file, extra), before = clone(s.data()), root = s.html();
      expect(root.querySelector('[data-anatomy-spotter-diagram]')).toBeNull();
      expect(root.querySelector('[data-anatomy-spotter-return]')).toBeNull();
      expect(s.data()).toEqual(before);
      expect(s.data()._spotterTotal).toBeUndefined();
    }
  });
});
