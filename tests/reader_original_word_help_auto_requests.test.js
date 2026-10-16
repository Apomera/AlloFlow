import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const TEXT = 'Plants need light. Roots absorb water. Leaves make food. Seeds grow.';
let React, createRoot, act, View, api, pure, phase, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['text_pipeline_helpers_module.js', 'instructional_context_module.js',
    'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js']) loadAlloModule(file);
  ({ SimplifiedView: View, InstructionalContext: api, PureHelpers: pure, PhaseNHelpers: phase } = window.AlloModules);
});

beforeEach(() => {
  View.resetAutoWordSupportRuns();
  localStorage.removeItem('alloflow_auto_word_supports');
  localStorage.removeItem('alloflow_auto_word_supports_day');
  window.__alloResolveAiCapability = () => ({ text: true });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove(); host = null;
  delete window.__alloResolveAiCapability;
  vi.restoreAllMocks();
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const flush = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
const manual = () => host.querySelector('[data-original-generate-supports]');
const notice = () => host.querySelector('[data-gloss-status]')?.textContent || '';
const removal = () => host.querySelector('[data-auto-supports-remove]');
const click = node => { expect(node).not.toBeNull(); act(() => node.click()); };
const reading = (id = 'auto-original', text = TEXT) => api.createSupportedReading(text, {
  id, sourceFamilyId: 'auto-family', config: { language: 'English' }
});

function mount({ item = reading(), strict = false, preview = false } = {}) {
  const generations = [], updates = [];
  const generate = vi.fn(owner => {
    const pending = deferred(); generations.push({ owner, ...pending }); return pending.promise;
  });
  const update = vi.fn((owner, action) => {
    const pending = deferred(); updates.push({ owner, action, ...pending }); return pending.promise;
  });
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null, t: key => key, inputText: '', gradeLevel: '5', studentInterests: [],
    selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', readingLearnerKey: 'learner-a',
    isTeacherMode: true, isStudentPreview: preview, isZenMode: false, isProcessing: false,
    isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false,
    isPlaying: false, isFluencyMode: false, interactionMode: 'read', textEditorRef: React.createRef(),
    generatedContent: item, history: [], splitTextToSentences: text => pure.splitTextToSentences(text, {}),
    getSideBySideContent: () => null, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => React.createElement('div', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, {
      highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text
    }),
    highlightGlossaryTerms: text => text, latestGlossary: [], SourceReferencesPanel: () => null,
    playbackState: { currentIdx: -1 }, setFocusedParagraphIndex: noop, setComplexityLevel: noop,
    setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop,
    setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop,
    closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop,
    handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, handleTextMouseUp: noop,
    onGenerateReadingSupports: generate, onUpdateReadingSupports: update
  };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => act(() => {
    const element = React.createElement(View, props);
    root.render(strict ? React.createElement(React.StrictMode, null, element) : element);
  });
  render();
  return {
    generations, updates, generate, update,
    get item() { return props.generatedContent; },
    patch(next) { props = { ...props, ...next }; render(); },
    unmount() { act(() => root.unmount()); root = null; host.remove(); host = null; }
  };
}

function entry(word, id, extra = {}) {
  const start = TEXT.indexOf(word);
  return { id, start, end: start + word.length, quote: word, text: 'Explanation for ' + word,
    origin: 'generated', ...extra };
}

async function removableView() {
  const view = mount(); await flush();
  expect(view.generations).toHaveLength(1);
  const supports = api.validateReadingSupports(view.item, { status: 'complete', annotations: [
    entry('Plants', 'ai-one'), entry('Roots', 'ai-two'),
    entry('Leaves', 'teacher', { origin: 'educator' }), entry('Seeds', 'pinned', { pinned: true })
  ] });
  view.patch({ generatedContent: { ...view.item, readingSupports: supports } });
  view.generations[0].resolve(supports); await flush();
  expect(removal()).not.toBeNull();
  return view;
}

describe('automatic original word-help request ownership', () => {
  it.each(['resource', 'same-id-source'])('does not let stale auto success clear a newer manual request after a %s change', async change => {
    const view = mount(); await flush();
    expect(view.generations).toHaveLength(1);
    const item = change === 'resource' ? reading('another-original') : reading('auto-original', 'A replacement source passage.');
    item.readingSupports = api.validateReadingSupports(item, { annotations: [] });
    view.patch({ generatedContent: item });
    await flush();
    expect(manual().disabled).toBe(false);
    click(manual()); await flush();
    expect(view.generations).toHaveLength(2);
    expect(manual().disabled).toBe(true);
    view.generations[0].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(true);
    expect(notice()).toBe('');
    view.generations[1].resolve({ status: 'complete', annotations: [] }); await flush();
    expect(manual().disabled).toBe(false);
    expect(notice()).toContain('Word help is ready');
  });

  it.each(['resolve', 'reject'])('finishes the shared automatic run after a learner change without stale %s notice', async outcome => {
    const view = mount(); await flush();
    view.patch({ readingLearnerKey: 'learner-b' }); await flush();
    expect(manual().disabled).toBe(true);
    click(manual());
    expect(view.generations).toHaveLength(1);
    if (outcome === 'resolve') view.generations[0].resolve({ annotations: [] });
    else view.generations[0].reject(new Error('Old automatic failure'));
    await flush();
    expect(notice()).toBe('');
    expect(manual().disabled).toBe(false);
    click(manual()); await flush();
    expect(view.generations).toHaveLength(2);
    view.generations[1].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(false);
  });

  it.each(['success', 'empty', 'reject'])('settles one automatic %s request under StrictMode replay', async outcome => {
    const view = mount({ strict: true }); await flush();
    expect(view.generations).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('alloflow_auto_word_supports_day')).count).toBe(1);
    expect(manual().disabled).toBe(true);
    if (outcome === 'reject') view.generations[0].reject(new Error('Current automatic failure'));
    else view.generations[0].resolve({ annotations: outcome === 'success' ? [entry('Plants', 'current-ai')] : [] });
    await flush();
    expect(view.generations).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('alloflow_auto_word_supports_day')).count).toBe(1);
    expect(manual().disabled).toBe(false);
    const auto = host.querySelector('[data-auto-word-supports]');
    expect(auto.getAttribute('data-auto-word-supports')).toBe(outcome === 'success' ? 'added' : 'done');
    if (outcome === 'empty') expect(notice()).toContain('No word help was added');
    if (outcome === 'reject') expect(notice()).toContain('Word help could not be generated');
  });

  it('starts automatic word help once when a teacher leaves student preview on the same original', async () => {
    const view = mount({ preview: true }); await flush();
    const original = view.item;
    expect(view.generate).not.toHaveBeenCalled();
    expect(localStorage.getItem('alloflow_auto_word_supports_day')).toBeNull();
    view.patch({ isStudentPreview: false }); await flush();
    expect(view.item).toBe(original);
    expect(view.generations).toHaveLength(1);
    expect(view.generations[0].owner).toBe(original);
    expect(manual().disabled).toBe(true);
    view.patch({ isStudentPreview: false }); await flush();
    expect(view.generations).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('alloflow_auto_word_supports_day')).count).toBe(1);
    view.generations[0].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(false);
    expect(host.querySelector('[data-auto-word-supports]').getAttribute('data-auto-word-supports')).toBe('done');
  });

  it('unblocks a remounted original when its existing automatic run settles without starting another', async () => {
    const first = mount(); await flush();
    expect(first.generations).toHaveLength(1);
    const item = first.item;
    first.unmount();
    const current = mount({ item }); await flush();
    expect(current.generate).not.toHaveBeenCalled();
    expect(manual().disabled).toBe(true);
    first.generations[0].resolve({ annotations: [] }); await flush();
    expect(current.generate).not.toHaveBeenCalled();
    expect(manual().disabled).toBe(false);
    expect(host.querySelector('[data-auto-word-supports]').getAttribute('data-auto-word-supports')).toBe('done');
    expect(notice()).toBe('');
  });

  it('settles authorized automatic work queued before unmount without replaying its notice on reopen', async () => {
    const view = mount();
    const item = view.item;
    view.unmount();
    await flush();
    expect(view.generations).toHaveLength(1);
    view.generations[0].resolve({ annotations: [] }); await flush();
    const current = mount({ item }); await flush();
    expect(current.generate).not.toHaveBeenCalled();
    expect(manual().disabled).toBe(false);
    expect(host.querySelector('[data-auto-word-supports]').getAttribute('data-auto-word-supports')).toBe('done');
    expect(notice()).toBe('');
  });

  it('keeps a second original automatic run busy when the first original completes', async () => {
    const view = mount(); await flush();
    expect(view.generations).toHaveLength(1);
    view.patch({ generatedContent: reading('another-automatic-original') }); await flush();
    expect(view.generations).toHaveLength(2);
    expect(manual().disabled).toBe(true);
    expect(host.querySelector('[data-auto-word-supports]').getAttribute('data-auto-word-supports')).toBe('working');
    view.generations[0].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(true);
    expect(notice()).toBe('');
    expect(host.querySelector('[data-auto-word-supports]').getAttribute('data-auto-word-supports')).toBe('working');
    view.generations[1].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(false);
    expect(host.querySelector('[data-auto-word-supports]').getAttribute('data-auto-word-supports')).toBe('done');
    expect(notice()).toContain('No word help was added');
  });
});

describe('AI word-help removal ownership', () => {
  it('blocks repeated removal and manual generation while a removal is pending', async () => {
    const view = await removableView();
    const remove = removal(), generate = manual();
    // Dispatch both before React commits the busy state; ownership must be synchronous.
    act(() => { remove.click(); remove.click(); generate.click(); });
    await flush();
    expect(view.update).toHaveBeenCalledTimes(1);
    expect(view.generate).toHaveBeenCalledTimes(1);
    expect(manual().disabled).toBe(true);
    expect(manual().textContent).not.toMatch(/adding word help/i);
    view.updates[0].resolve({ annotations: [] }); await flush();
    expect(view.update).toHaveBeenCalledTimes(2);
    expect(manual().disabled).toBe(true);
    view.updates[1].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(false);
  });

  it.each(['resolve', 'reject'])('ignores late removal %s after a learner change without clearing a newer request', async outcome => {
    const view = await removableView();
    click(removal()); await flush();
    expect(view.updates).toHaveLength(1);
    view.patch({ readingLearnerKey: 'learner-b' }); await flush();
    expect(manual().disabled).toBe(false);
    click(manual()); await flush();
    expect(manual().disabled).toBe(true);
    if (outcome === 'resolve') view.updates[0].resolve({ annotations: [] });
    else view.updates[0].reject(new Error('Old removal failure'));
    await flush();
    expect(view.updates).toHaveLength(1);
    expect(notice()).toBe('');
    expect(manual().disabled).toBe(true);
    view.generations[1].resolve({ annotations: [] }); await flush();
    expect(manual().disabled).toBe(false);
  });

  it('stops issuing remaining removals after the reader unmounts', async () => {
    const view = await removableView();
    click(removal()); await flush();
    expect(view.updates).toHaveLength(1);
    view.unmount();
    view.updates[0].resolve({ annotations: [] }); await flush();
    expect(view.updates).toHaveLength(1);
  });

  it('removes all current generated entries while preserving educator and pinned supports', async () => {
    const view = await removableView();
    click(removal()); await flush();
    for (let index = 0; index < 2; index++) {
      const request = view.updates[index];
      expect(request.action).toEqual({ type: 'remove', id: index === 0 ? 'ai-one' : 'ai-two' });
      expect(request.owner.id).toBe(view.item.id);
      const next = api.removeReadingSupport(view.item, view.item.readingSupports, request.action.id);
      view.patch({ generatedContent: { ...view.item, readingSupports: next } });
      request.resolve(next); await flush();
    }
    expect(view.updates).toHaveLength(2);
    expect(view.item.readingSupports.annotations.map(annotation => annotation.id)).toEqual(['teacher', 'pinned']);
    expect(view.item.data).toBe(TEXT);
    expect(manual().disabled).toBe(false);
    expect(notice()).toBe('AI word help removed. The original is unchanged.');
  });

  it.each(['educator', 'pinned', 'missing', 'reanchored'])('rechecks a remaining target that became %s while the first removal was pending', async change => {
    const view = await removableView();
    click(removal()); await flush();
    expect(view.updates).toHaveLength(1);
    let supports = api.removeReadingSupport(view.item, view.item.readingSupports, 'ai-one');
    if (change === 'educator') supports = api.upsertReadingSupport(view.item, supports, {
      ...supports.annotations.find(annotation => annotation.id === 'ai-two'), text: 'A teacher revised this explanation.'
    });
    if (change === 'pinned') supports = api.setReadingSupportPinned(view.item, supports, 'ai-two', true);
    if (change === 'missing') supports = api.removeReadingSupport(view.item, supports, 'ai-two');
    if (change === 'reanchored') supports = api.validateReadingSupports(view.item, {
      ...supports, annotations: supports.annotations.map(annotation => annotation.id === 'ai-two' ? entry('light', 'ai-two') : annotation)
    });
    const retained = supports.annotations.find(annotation => annotation.id === 'ai-two');
    if (change === 'educator') expect(retained.origin).toBe('educator');
    if (change === 'pinned') expect(retained.pinned).toBe(true);
    if (change === 'reanchored') expect(retained.quote).toBe('light');
    view.patch({ generatedContent: { ...view.item, readingSupports: supports } });
    view.updates[0].resolve(supports); await flush();
    expect(view.updates).toHaveLength(1);
    expect(view.item.readingSupports.annotations.find(annotation => annotation.id === 'ai-two')).toEqual(retained);
    expect(manual().disabled).toBe(false);
  });

  it('does not include generated supports added after the removal batch started', async () => {
    const view = await removableView();
    click(removal()); await flush();
    const afterFirst = api.removeReadingSupport(view.item, view.item.readingSupports, 'ai-one');
    const supports = api.validateReadingSupports(view.item, {
      ...afterFirst, annotations: [...afterFirst.annotations, entry('water', 'ai-new')]
    });
    expect(supports.annotations.some(annotation => annotation.id === 'ai-new')).toBe(true);
    view.patch({ generatedContent: { ...view.item, readingSupports: supports } });
    view.updates[0].resolve(supports); await flush();
    expect(view.updates).toHaveLength(2);
    expect(view.updates[1].action).toEqual({ type: 'remove', id: 'ai-two' });
    const next = api.removeReadingSupport(view.item, view.item.readingSupports, 'ai-two');
    view.patch({ generatedContent: { ...view.item, readingSupports: next } });
    view.updates[1].resolve(next); await flush();
    expect(view.updates).toHaveLength(2);
    expect(view.item.readingSupports.annotations.some(annotation => annotation.id === 'ai-new')).toBe(true);
    expect(manual().disabled).toBe(false);
  });

  it('uses the latest callback and item for an unchanged remaining target', async () => {
    const view = await removableView();
    click(removal()); await flush();
    expect(view.updates).toHaveLength(1);
    const pending = deferred(), currentUpdate = vi.fn(() => pending.promise);
    const nextItem = { ...view.item, readingSupports: api.removeReadingSupport(view.item, view.item.readingSupports, 'ai-one') };
    view.patch({ generatedContent: nextItem, onUpdateReadingSupports: currentUpdate });
    view.updates[0].resolve(nextItem.readingSupports); await flush();
    expect(view.update).toHaveBeenCalledTimes(1);
    expect(currentUpdate).toHaveBeenCalledTimes(1);
    expect(currentUpdate.mock.calls[0][0]).toBe(nextItem);
    expect(currentUpdate.mock.calls[0][1]).toEqual({ type: 'remove', id: 'ai-two' });
    expect(manual().disabled).toBe(true);
    const next = api.removeReadingSupport(nextItem, nextItem.readingSupports, 'ai-two');
    view.patch({ generatedContent: { ...nextItem, readingSupports: next } });
    pending.resolve(next); await flush();
    expect(currentUpdate).toHaveBeenCalledTimes(1);
    expect(manual().disabled).toBe(false);
    expect(notice()).toBe('AI word help removed. The original is unchanged.');
  });
});
