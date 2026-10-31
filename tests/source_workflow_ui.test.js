// "Use my own text" and "Write source text with AI" were easy to confuse: the
// Source Material card's "Generate" opened a panel that WROTE A NEW PASSAGE
// from a Topic field, and its "Generate Text" replaced the pasted text with no
// warning and no visible Undo. Since 2026-10-30 the source has one home:
// - the sidebar card holds no text box: ways in when empty, else a summary
//   (draft or in use, version, check) and Open source / Continue editing;
// - the Source view is the one editor. "Use this source" puts the text in use
//   at a numbered version and runs the source check (reading level, key
//   concepts, accuracy) unless skipped or AI is not set up; making a resource
//   from a draft uses it too, except while the teacher is typing (pending);
// - AI rewrites and new passages are suggestions to review, with Undo;
// - Change source asks first, and the old text stays until new text arrives.
// ALLO_MISC_SOURCE / ALLO_SIDEBAR_CANDIDATE / ALLO_HOST_ANTI point at mutated copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const PASTED = 'Our town garden opened this spring. Volunteers built raised beds, and students track rainfall each week.';
const PASSAGE = 'Plants use sunlight to make sugar in a process called photosynthesis.';
const noop = () => {};
let Writer, api, Panel;
const mounted = [];

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  const misc = transformSync(readFileSync(process.env.ALLO_MISC_SOURCE || 'view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Undo2', 'Upload', 'UserCheck', 'Users', 'X'];
  Writer = new Function('React', ...icons, misc + '\nreturn SourceGenPanel;')(React, ...icons.map(() => () => null));
  window.AlloModules = {};
  new Function(readFileSync(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js', 'utf8'))();
  api = window.AlloModules.SidebarPanels;
  Panel = window.AlloModules.SourceInputPanel;
  if (!api || !api.SourceView || !api.SourceRecord || !Panel) throw new Error('sidebar module did not register the source views');
}, 30000);

afterEach(() => {
  mounted.splice(0).forEach(({ root, el }) => { act(() => root.unmount()); el.remove(); });
  delete window.AlloOwnSources;
  vi.restoreAllMocks();
});

function mount(Component, initial) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  let props = initial;
  const render = (next = {}) => { props = { ...props, ...next }; act(() => root.render(React.createElement(Component, props))); };
  render();
  mounted.push({ root, el });
  return { el, render, get props() { return props; } };
}
const q = (el, sel) => el.querySelector(sel);
function typeInto(input, value) {
  const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const analysisOf = (text, data = {}) => ({ id: 'analysis-1', type: 'analysis', title: 'Garden', data: { originalText: text, ...data } });

function writer(extra = {}) {
  return mount(Writer, {
    aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade', addToast: noop,
    handleAddStandard: noop, handleFindStandards: noop, handleRemoveStandard: noop,
    handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop,
    isFindingStandards: false, isGeneratingSource: false, isIndependentMode: false,
    setAiStandardQuery: noop, setAiStandardRegion: noop, setSourceCustomInstructions: noop,
    setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceVocabulary: noop,
    setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
    sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
    sourceTopic: 'Photosynthesis', sourceVocabulary: '', standardInputValue: '',
    standardMode: 'manual', studentInterests: [], suggestedStandards: [], targetStandards: [], t: (key) => key,
    selectedOwnSourceIds: [], setSelectedOwnSourceIds: noop, includeSourceCitations: false, setIncludeSourceCitations: noop,
    useOwnSources: false, setUseOwnSources: noop, documentsOnly: false, setDocumentsOnly: noop,
    setSourceTopic: vi.fn(), handleGenerateSource: vi.fn(async () => ({ ok: true })), inputText: PASTED, ...extra,
  });
}
const writeButton = (el) => q(el, '[data-help-key="source_generate_button"]');
const confirmBox = (el) => q(el, '[data-source-replace-confirm]');

describe('the AI writer says what it does', () => {
  it('names the action and says it ignores the current source', () => {
    const w = writer();
    expect(writeButton(w.el).textContent).toBe('Write a new source passage');
    expect(q(w.el, '[data-source-writer-intro]').textContent).toContain('does not use your current source');
  });
});

// An old topic (from the wizard, AlloBot or a saved lesson) silently became the
// next passage's subject. A topic the teacher did not type here says so.
describe('the writer says when its topic was filled in earlier', () => {
  const note = (el) => q(el, '[data-source-topic-origin]');
  it('flags a topic it did not see typed, and clears it on request', () => {
    const w = writer();
    expect(note(w.el).textContent).toContain('filled in for you earlier');
    expect(q(w.el, '#allo-source-topic').getAttribute('aria-describedby')).toBe('allo-source-topic-origin');
    const clear = q(w.el, '[data-source-topic-clear]');
    act(() => { clear.focus(); clear.click(); });
    expect(w.props.setSourceTopic).toHaveBeenLastCalledWith('');
    expect(document.activeElement).toBe(q(w.el, '#allo-source-topic'));
    w.render({ sourceTopic: '' });
    expect(note(w.el)).toBeNull();
  });

  it('stays quiet about a topic the teacher typed, even after the writer reopens', () => {
    const w = writer({ sourceTopic: '' });
    expect(note(w.el)).toBeNull();
    typeInto(q(w.el, '#allo-source-topic'), 'Volcanoes');
    w.render({ sourceTopic: 'Volcanoes' });
    expect(note(w.el)).toBeNull();
    const again = writer({ sourceTopic: 'Volcanoes', setSourceTopic: w.props.setSourceTopic });
    expect(note(again.el)).toBeNull();
    again.render({ sourceTopic: 'Volcanoes, from AlloBot' });
    expect(note(again.el)).not.toBeNull();
  });
});

describe('the setup wizard opens its text in the Source view', () => {
  let wizard;
  beforeAll(() => {
    window.AlloModules = window.AlloModules || {};
    new Function(readFileSync(process.env.ALLO_PHASE_O || 'phase_o_misc_handlers_module.js', 'utf8'))();
    wizard = window.AlloModules.PhaseOHandlers.handleWizardComplete;
  });
  const deps = (extra) => {
    const fns = { setInputText: vi.fn(), setSourceReplacement: vi.fn(), openSourceView: vi.fn(), handleGenerateSource: vi.fn(), setSourceTopic: vi.fn() };
    return { fns, deps: new Proxy({ ...fns, t: (k) => k, addToast: noop, history: [], fileInputRef: { current: null }, safeSetItem: noop, ...extra }, { get: (target, prop) => (prop in target ? target[prop] : noop) }) };
  };

  it('replaces an existing source from a link with Undo, and shows it', () => {
    const { fns, deps: d } = deps({ inputText: PASTED });
    wizard({ sourceMode: 'url', fetchedContent: PASSAGE, topic: 'plants' }, d);
    expect(fns.setInputText).toHaveBeenCalledWith(PASSAGE);
    expect(fns.setSourceReplacement).toHaveBeenCalledWith(expect.objectContaining({ status: 'replaced', previous: PASTED, text: PASSAGE }));
    expect(fns.openSourceView).toHaveBeenCalledWith({ focus: false });
  });

  it('fills an empty source without an Undo offer, and shows it', () => {
    const { fns, deps: d } = deps({ inputText: '' });
    wizard({ materialType: 'text', topic: PASTED }, d);
    expect(fns.setInputText).toHaveBeenCalledWith(PASTED);
    expect(fns.setSourceReplacement).not.toHaveBeenCalled();
    expect(fns.openSourceView).toHaveBeenCalledWith({ focus: false });
  });

  it('shows the Source view while AI writes the passage', () => {
    const { fns, deps: d } = deps({ inputText: '' });
    vi.useFakeTimers();
    try {
      wizard({ sourceMode: 'generate', topic: 'How clouds form', standards: [] }, d);
      expect(fns.openSourceView).toHaveBeenCalledWith({ focus: false });
      vi.advanceTimersByTime(600);
    } finally { vi.useRealTimers(); }
    expect(fns.handleGenerateSource).toHaveBeenCalledWith(expect.objectContaining({ topic: 'How clouds form' }));
  });
});

describe('replacing text in the box asks first', () => {
  it('shows an alert dialog with the word count and topic, focused on Keep my text, and writes nothing yet', () => {
    const w = writer();
    act(() => writeButton(w.el).click());
    const box = confirmBox(w.el);
    expect(box.getAttribute('role')).toBe('alertdialog');
    expect(box.getAttribute('aria-labelledby')).toBe('allo-source-replace-title');
    expect(box.textContent).toContain('16 words');
    expect(box.textContent).toContain('“Photosynthesis”');
    expect(document.activeElement).toBe(q(w.el, '[data-source-replace-keep]'));
    expect(w.props.handleGenerateSource).not.toHaveBeenCalled();
  });

  it('keeps the text on Keep my text and returns focus to the write button', () => {
    const w = writer();
    act(() => writeButton(w.el).click());
    act(() => q(w.el, '[data-source-replace-keep]').click());
    expect(confirmBox(w.el)).toBeNull();
    expect(document.activeElement).toBe(writeButton(w.el));
    expect(w.props.handleGenerateSource).not.toHaveBeenCalled();
  });

  it('keeps the text on Escape', () => {
    const w = writer();
    act(() => writeButton(w.el).click());
    act(() => confirmBox(w.el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(confirmBox(w.el)).toBeNull();
    expect(w.props.handleGenerateSource).not.toHaveBeenCalled();
  });

  it('asks the same way when Enter is pressed in the topic field', () => {
    const w = writer();
    act(() => q(w.el, '#allo-source-topic').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(confirmBox(w.el)).not.toBeNull();
    expect(w.props.handleGenerateSource).not.toHaveBeenCalled();
  });

  it('writes, marked as confirmed, only after Replace', async () => {
    const w = writer();
    act(() => writeButton(w.el).click());
    await act(async () => q(w.el, '[data-source-replace-confirm-button]').click());
    expect(w.props.handleGenerateSource).toHaveBeenCalledTimes(1);
    expect(w.props.handleGenerateSource.mock.calls[0][0]).toMatchObject({ replaceConfirmed: true });
  });

  it('cannot start a second passage while one is being written', async () => {
    const w = writer({ isGeneratingSource: true, inputText: '' });
    expect(writeButton(w.el).disabled).toBe(true);
    await act(async () => writeButton(w.el).click());
    expect(w.props.handleGenerateSource).not.toHaveBeenCalled();
  });

  it('does not ask when the box is empty', async () => {
    const w = writer({ inputText: '' });
    await act(async () => writeButton(w.el).click());
    expect(confirmBox(w.el)).toBeNull();
    expect(w.props.handleGenerateSource.mock.calls[0][0]).toMatchObject({ replaceConfirmed: false });
  });
});

describe('the source record: draft, in use, versions', () => {
  it('reads empty, draft and in use from the text and the record', () => {
    const R = api.SourceRecord;
    expect(R.status(null, '  ')).toBe('empty');
    expect(R.status(null, PASTED)).toBe('draft');
    expect(R.status({ inUse: { text: PASTED, version: 1 } }, PASTED)).toBe('in-use');
    expect(R.status({ inUse: { text: PASTED, version: 1 } }, PASTED + ' More.')).toBe('draft');
  });

  it('numbers each text put in use, keeps the same text at its version, and keeps 20 versions', () => {
    const R = api.SourceRecord;
    const one = R.use(null, PASTED);
    expect(one.inUse).toMatchObject({ text: PASTED, version: 1 });
    expect(R.use(one, PASTED)).toBe(one);
    const two = R.use(one, PASSAGE);
    expect(two.inUse).toMatchObject({ text: PASSAGE, version: 2 });
    expect(two.versions.map((v) => v.version)).toEqual([1, 2]);
    let many = null;
    for (let i = 0; i < 25; i++) many = R.use(many, 'Text number ' + i);
    expect(many.inUse.version).toBe(25);
    expect(many.versions.length).toBe(20);
    expect(R.use(one, '   ')).toBe(one);
  });

  it('uses a draft when a resource is made, but only marks it pending while the teacher types', () => {
    const R = api.SourceRecord;
    expect(R.autoUse(null, PASTED, false).inUse).toMatchObject({ text: PASTED, version: 1 });
    const typing = R.autoUse(null, PASTED, true);
    expect(typing.inUse).toBeUndefined();
    expect(typing.pending).toBe(PASTED);
    expect(R.settle(typing, PASTED).inUse).toMatchObject({ text: PASTED, version: 1 });
    const changed = R.settle(typing, PASTED + ' More.');
    expect(changed.pending).toBeNull();
    expect(changed.inUse).toBeUndefined();
  });

  it('stamps new resources with the version in use, once', () => {
    const R = api.SourceRecord;
    const record = R.use(R.use(null, PASTED), PASSAGE);
    const seen = new Set(['old']);
    const history = [{ id: 'old', type: 'quiz' }, { id: 'new', type: 'glossary' }];
    const stamped = R.stamp(history, record, seen);
    expect(stamped[0]).toBe(history[0]);
    expect(stamped[1].sourceVersion).toBe(2);
    expect(R.stamp(stamped, R.use(record, 'Third text.'), seen)).toBe(stamped);
    const carried = [{ id: 'imported', type: 'quiz', sourceVersion: 1 }];
    expect(R.stamp(carried, record, new Set())).toBe(carried);
    const unstamped = [{ id: 'before-any-use', type: 'quiz' }];
    expect(R.stamp(unstamped, null, new Set())).toBe(unstamped);
    expect(unstamped[0].sourceVersion).toBeUndefined();
  });

  it('finds the latest check for exactly this text and summarises it', () => {
    const R = api.SourceRecord;
    const older = analysisOf(PASTED, { readingLevel: { range: 'Grade 3' } });
    const latest = { ...analysisOf(PASTED, { readingLevel: { range: 'Grade 4-5' }, concepts: ['a', 'b', 'c'], accuracy: { rating: 'High' } }), id: 'analysis-2' };
    expect(R.checkFor([older, latest, analysisOf('Other text.')], PASTED)).toBe(latest);
    expect(R.checkFor([older], PASTED + ' More.')).toBeNull();
    expect(R.summary(latest)).toBe('Grade 4-5 · 3 key concepts · Accuracy: High');
  });
});

function sourceView(extra = {}) {
  return mount(api.SourceView, {
    t: () => '', inputText: PASTED, setInputText: vi.fn(), sourceRecord: null, setSourceRecord: vi.fn(),
    sourceReplacement: null, setSourceReplacement: vi.fn(), history: [], handleGenerate: vi.fn(async () => {}),
    isProcessing: false, isGeneratingSource: false, generationStep: '', isExtracting: false, setIsExtracting: vi.fn(), setGenerationStep: vi.fn(),
    addToast: vi.fn(), checkAccuracyWithSearch: true, setCheckAccuracyWithSearch: vi.fn(), handleFormatText: vi.fn(),
    refineSourceSuggestion: vi.fn(async () => null), openAnalysis: vi.fn(), aiTextAvailable: true, isCanvas: true,
    focusRequest: 0, onShowResources: vi.fn(), setSourceTopic: vi.fn(), ...extra,
  });
}
const useButton = (el) => q(el, '[data-source-use]');
const checkState = (el) => q(el, '[data-source-check-state]').getAttribute('data-source-check-state');
const CHECK_CALL = ['analysis', null, false, PASTED, { selectedReadingSourceId: '__input__', stayOnView: true }, false];

describe('the Source view: one editor that says what is in use', () => {
  it('is the only editor: a draft, with Use this source and the check', () => {
    const v = sourceView();
    expect(q(v.el, '[data-source-view]').getAttribute('data-source-status')).toBe('draft');
    expect(q(v.el, '[data-source-status-line]').textContent).toContain('Draft · 16 words');
    expect(q(v.el, 'textarea[data-allo-textundo="input"]').getAttribute('aria-describedby')).toBe('source-view-status');
    expect(useButton(v.el).textContent).toBe('Use this source');
    expect(checkState(v.el)).toBe('none');
  });

  it('puts the text in use as version 1 and runs the source check without leaving the view', async () => {
    const v = sourceView();
    await act(async () => useButton(v.el).click());
    const update = v.props.setSourceRecord.mock.calls[0][0];
    expect(update(null).inUse).toMatchObject({ text: PASTED, version: 1 });
    expect(v.props.handleGenerate).toHaveBeenCalledWith(...CHECK_CALL);
  });

  it('shows the check running, then failed with Retry when no analysis came back', async () => {
    let finish;
    const v = sourceView({ handleGenerate: vi.fn(() => new Promise((done) => { finish = done; })) });
    act(() => q(v.el, '[data-source-run-check]').click());
    expect(checkState(v.el)).toBe('running');
    expect(q(v.el, '[data-source-run-check]')).toBeNull();
    await act(async () => finish());
    expect(checkState(v.el)).toBe('failed');
    expect(q(v.el, '[data-source-run-check]').textContent).toBe('Retry');
  });

  it('skips the check when asked', async () => {
    const v = sourceView();
    act(() => q(v.el, '[data-source-skip-check]').click());
    await act(async () => useButton(v.el).click());
    expect(v.props.setSourceRecord).toHaveBeenCalledTimes(1);
    expect(v.props.handleGenerate).not.toHaveBeenCalled();
  });

  it('does not run the check when AI is not set up, and says so', async () => {
    const v = sourceView({ aiTextAvailable: false });
    expect(checkState(v.el)).toBe('unavailable');
    expect(q(v.el, '[data-source-skip-check]')).toBeNull();
    expect(q(v.el, '[data-source-run-check]')).toBeNull();
    expect(q(v.el, '[data-source-refine]')).toBeNull();
    await act(async () => useButton(v.el).click());
    expect(v.props.setSourceRecord).toHaveBeenCalledTimes(1);
    expect(v.props.handleGenerate).not.toHaveBeenCalled();
  });

  it('does not re-check text that already has a check, and opens its details', async () => {
    const check = analysisOf(PASTED, { readingLevel: { range: 'Grade 4-5' }, concepts: ['a', 'b'], accuracy: { rating: 'High' } });
    const v = sourceView({ history: [check] });
    expect(checkState(v.el)).toBe('done');
    expect(q(v.el, '[data-source-check-state]').textContent).toBe('Grade 4-5 · 2 key concepts · Accuracy: High');
    await act(async () => useButton(v.el).click());
    expect(v.props.handleGenerate).not.toHaveBeenCalled();
    act(() => q(v.el, '[data-source-check-details]').click());
    expect(v.props.openAnalysis).toHaveBeenCalledWith(check);
    expect(q(v.el, '[data-source-run-check]').textContent).toBe('Run the check again');
  });

  it('keeps the web accuracy setting next to the check', () => {
    const v = sourceView();
    const box = q(v.el, '[data-source-web-check]');
    expect(box.checked).toBe(true);
    act(() => box.click());
    expect(v.props.setCheckAccuracyWithSearch).toHaveBeenCalledWith(false);
  });

  it('shows the source in use read-only, with Edit source and Make resources', () => {
    const v = sourceView({ sourceRecord: { inUse: { text: PASTED, version: 1 } } });
    expect(q(v.el, 'textarea')).toBeNull();
    expect(q(v.el, '[data-source-readonly]').textContent).toBe(PASTED);
    expect(q(v.el, '[data-source-status-line]').textContent).toContain('In use · version 1 · 16 words');
    expect(useButton(v.el)).toBeNull();
    act(() => q(v.el, '[data-source-make-resources]').click());
    expect(v.props.onShowResources).toHaveBeenCalledTimes(1);
    act(() => q(v.el, '[data-source-edit]').click());
    expect(document.activeElement).toBe(q(v.el, 'textarea[data-allo-textundo="input"]'));
  });

  it('treats edits to the source in use as the next version, which can be used or discarded', () => {
    const v = sourceView({ inputText: PASTED + ' More.', sourceRecord: { inUse: { text: PASTED, version: 1 } } });
    expect(q(v.el, '[data-source-status-line]').textContent).toContain('Editing version 2');
    expect(q(v.el, '[data-source-status-line]').textContent).toContain('keep using version 1');
    expect(useButton(v.el).textContent).toBe('Use this version');
    act(() => q(v.el, '[data-source-discard]').click());
    expect(v.props.setInputText).toHaveBeenCalledWith(PASTED);
  });

  it('uses a pending text when the teacher leaves the editor', () => {
    const v = sourceView({ sourceRecord: { inUse: null, pending: PASTED } });
    expect(q(v.el, '[data-source-lock-pending]').textContent).toContain('used when you leave the editor');
    const box = q(v.el, 'textarea[data-allo-textundo="input"]');
    act(() => { box.focus(); box.blur(); });
    const update = v.props.setSourceRecord.mock.calls[0][0];
    expect(update({ inUse: null, pending: PASTED }).inUse).toMatchObject({ text: PASTED, version: 1 });
  });

  it('keeps a draft when the text changed after the resource started', () => {
    const v = sourceView({ inputText: PASTED + ' More.', sourceRecord: { inUse: null, pending: PASTED } });
    expect(q(v.el, '[data-source-lock-pending]').textContent).toContain('stays a draft');
  });

  it('focuses the editor when asked to', () => {
    const v = sourceView();
    v.render({ focusRequest: 1 });
    expect(document.activeElement).toBe(q(v.el, 'textarea[data-allo-textundo="input"]'));
  });

  it('stays editable while AI writes, and says the text is kept', () => {
    const v = sourceView({ isGeneratingSource: true, generationStep: 'Writing content...' });
    expect(q(v.el, 'textarea[data-allo-textundo="input"]').disabled).toBe(false);
    expect(q(v.el, '[data-source-writing-status]').getAttribute('role')).toBe('status');
    expect(q(v.el, '[data-source-writing-status]').textContent).toContain('Your text stays here');
  });

  it('reads the source aloud through the app player, in the checked language, and stops on the same button', () => {
    const handleSpeak = vi.fn();
    const v = sourceView({ handleSpeak, history: [analysisOf(PASTED, { sourceLanguage: 'Spanish' })] });
    const button = q(v.el, '[data-source-read-aloud]');
    expect(button.textContent).toBe('Read aloud');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    act(() => button.click());
    expect(handleSpeak).toHaveBeenCalledWith(PASTED, 'source-view', 0, false, 'Spanish');
    v.render({ isPlaying: true, playingContentId: 'source-view' });
    expect(q(v.el, '[data-source-read-aloud]').textContent).toBe('Stop reading');
    expect(q(v.el, '[data-source-read-aloud]').getAttribute('aria-pressed')).toBe('true');
    v.render({ playingContentId: 'faq-active' });
    expect(q(v.el, '[data-source-read-aloud]').textContent).toBe('Read aloud');
  });

  it('uses the default voice before a check, and offers no reading for empty text', () => {
    const handleSpeak = vi.fn();
    const v = sourceView({ handleSpeak });
    act(() => q(v.el, '[data-source-read-aloud]').click());
    expect(handleSpeak).toHaveBeenCalledWith(PASTED, 'source-view', 0, false, null);
    v.render({ inputText: '' });
    expect(q(v.el, '[data-source-read-aloud]')).toBeNull();
  });

  it('formats through the host formatter with the editor', () => {
    const v = sourceView();
    act(() => q(v.el, '[data-source-format="bold"]').click());
    expect(v.props.handleFormatText).toHaveBeenCalledWith('bold', expect.objectContaining({ current: q(v.el, 'textarea') }), PASTED, v.props.setInputText);
  });
});

describe('AI suggestions and Undo in the Source view', () => {
  const review = { status: 'review', reason: 'edited', text: PASSAGE, previous: PASTED, topic: 'Photosynthesis' };

  it('turns an AI adjustment into a suggestion to review, leaving the text alone', async () => {
    const v = sourceView({ refineSourceSuggestion: vi.fn(async () => 'A shorter garden text.') });
    typeInto(q(v.el, '[data-source-refine-input]'), 'shorten it');
    await act(async () => q(v.el, '[data-source-refine-go]').click());
    expect(v.props.refineSourceSuggestion).toHaveBeenCalledWith('shorten it', PASTED);
    expect(v.props.setSourceReplacement).toHaveBeenCalledWith(expect.objectContaining({ status: 'review', reason: 'refine', text: 'A shorter garden text.', previous: PASTED }));
    expect(v.props.setInputText).not.toHaveBeenCalled();
    v.render({ sourceReplacement: v.props.setSourceReplacement.mock.calls[0][0] });
    expect(q(v.el, '[data-source-replacement-review]').textContent).toContain('Your text has not changed');
    expect(q(v.el, '[data-source-review-replace]').textContent).toBe('Use this rewrite');
  });

  it('offers a result that could not be put in safely, and keeps the text by choice', () => {
    const v = sourceView({ sourceReplacement: review });
    expect(q(v.el, '[data-source-replacement-review]').textContent).toContain('changed while AI was writing');
    expect(q(v.el, '[data-source-review-text]').textContent).toBe(PASSAGE);
    act(() => q(v.el, '[data-source-review-keep]').click());
    expect(v.props.setSourceReplacement).toHaveBeenCalledWith(null);
    expect(v.props.setSourceTopic).toHaveBeenCalledWith('');
    expect(v.props.setInputText).not.toHaveBeenCalled();
  });

  it('replaces on request and keeps the current text for Undo', () => {
    const v = sourceView({ sourceReplacement: review, inputText: PASTED + ' Edited.' });
    act(() => q(v.el, '[data-source-review-replace]').click());
    expect(v.props.setInputText).toHaveBeenCalledWith(PASSAGE);
    expect(v.props.setSourceReplacement).toHaveBeenCalledWith(expect.objectContaining({ status: 'replaced', previous: PASTED + ' Edited.' }));
  });

  it('announces a replacement and undoes it', () => {
    const v = sourceView({ inputText: PASSAGE, sourceReplacement: { ...review, status: 'replaced' } });
    expect(q(v.el, '[data-source-replaced-notice] [role="status"]').textContent).toContain('“Photosynthesis”');
    act(() => q(v.el, '[data-source-replace-undo]').click());
    expect(v.props.setInputText).toHaveBeenCalledWith(PASTED);
    expect(v.props.setSourceReplacement).toHaveBeenCalledWith(expect.objectContaining({ status: 'restored' }));
    v.render({ inputText: PASTED, sourceReplacement: { ...review, status: 'restored' } });
    expect(q(v.el, '[data-source-restored-notice]').getAttribute('role')).toBe('status');
  });

  it('offers one way back after a replacement: Undo, not also Discard changes', () => {
    const inUse = { inUse: { text: PASTED, version: 2 } };
    const v = sourceView({ inputText: PASSAGE, sourceRecord: inUse, sourceReplacement: { ...review, status: 'replaced' } });
    expect(q(v.el, '[data-source-replace-undo]')).not.toBeNull();
    expect(q(v.el, '[data-source-discard]')).toBeNull();
    v.render({ inputText: PASSAGE + ' My note.' });
    expect(q(v.el, '[data-source-discard]').textContent).toBe('Discard changes (back to version 2)');
  });

  it('drops the Undo offer once the teacher edits the new passage', () => {
    const v = sourceView({ inputText: PASSAGE + ' My note.', sourceReplacement: { ...review, status: 'replaced' } });
    expect(q(v.el, '[data-source-replaced-notice]')).toBeNull();
  });
});

function panel(extra = {}) {
  return mount(Panel, {
    t: () => '', expandedTools: ['source-input'], isCanvas: true, searchOptions: [], inputText: PASTED,
    history: [], sourceRecord: null, openSourceView: vi.fn(), showUrlInput: false, showSourceGen: false, ...extra,
  });
}

describe('the sidebar card: ways in, then a summary', () => {
  it('holds no text box, and opens the Source view to paste or type', () => {
    const p = panel({ inputText: '' });
    expect(q(p.el, 'textarea')).toBeNull();
    expect(q(p.el, '#tour-source-check')).toBe(q(p.el, '[data-source-ways-in]'));
    act(() => q(p.el, '[data-source-paste]').click());
    expect(p.props.openSourceView).toHaveBeenCalledWith({ focus: true });
  });

  it('summarises a draft and continues editing it', () => {
    const p = panel();
    expect(q(p.el, 'textarea')).toBeNull();
    const card = q(p.el, '[data-source-summary]');
    expect(card.getAttribute('data-source-status')).toBe('draft');
    expect(card.textContent).toContain('Your source: draft');
    expect(card.textContent).toContain('16 words');
    expect(q(p.el, '#tour-source-check').textContent).toBe('Not checked yet.');
    const open = q(p.el, '[data-source-open]');
    expect(open.textContent).toBe('Continue editing');
    expect(open.getAttribute('aria-label')).toBe('Continue editing: Our town garden opened this spring. Volunteers built…');
    act(() => open.click());
    expect(p.props.openSourceView).toHaveBeenCalledWith({ focus: true });
  });

  it('summarises the source in use with its version and check', () => {
    const p = panel({ sourceRecord: { inUse: { text: PASTED, version: 2 } }, history: [analysisOf(PASTED, { readingLevel: { range: 'Grade 4-5' } })] });
    expect(q(p.el, '[data-source-summary]').textContent).toContain('Your source: in use, version 2');
    expect(q(p.el, '#tour-source-check').textContent).toBe('Grade 4-5');
    expect(q(p.el, '[data-source-open]').textContent).toBe('Open source');
    act(() => q(p.el, '[data-source-open]').click());
    expect(p.props.openSourceView).toHaveBeenCalledWith({ focus: false });
  });

  it('says when a text will be used once editing ends', () => {
    expect(q(panel({ sourceRecord: { pending: PASTED } }).el, '[data-source-lock-pending]').textContent).toContain('Will be used when you finish editing');
  });
});

describe('the card header: ways in, or Change source', () => {
  const icons = Object.fromEntries(['BookOpen', 'CheckSquare', 'ChevronDown', 'ChevronUp', 'ClipboardList', 'FileDown', 'FileText', 'Globe', 'Layout', 'Link', 'RefreshCw', 'Sparkles', 'Upload', 'X'].map((name) => [name, () => null]));
  const shell = (extra = {}) => mount(api.SourceInputShellView, { ...icons, activeView: 'input', isGuidedToolVisible: () => true, expandedTools: [], fileInputRef: { current: null },
    t: () => '', inputText: '', toggleTool: vi.fn(), showSourceGen: false, showUrlInput: false, setShowSourceGen: vi.fn(), setExpandedTools: vi.fn(),
    sourceRecord: null, sourceReplacement: null, setSourceReplacement: vi.fn(), openSourceView: vi.fn(), ...extra });
  const aiButton = (el) => q(el, '[data-help-key="source_generate_btn"]');

  it('offers every way in, with Write with AI, while there is no source', () => {
    const s = shell();
    expect(aiButton(s.el).textContent).toBe('Write with AI');
    expect(q(s.el, '#tour-upload-source')).not.toBeNull();
    expect(q(s.el, '[data-source-change]')).toBeNull();
  });

  it('shows only Change source once there is text, and asks first with Keep focused', () => {
    const s = shell({ inputText: PASTED });
    expect(q(s.el, '#tour-upload-source')).toBeNull();
    expect(aiButton(s.el)).toBeNull();
    const change = q(s.el, '[data-source-change]');
    act(() => change.click());
    const ask = q(s.el, '[data-source-change-confirm]');
    expect(ask.getAttribute('role')).toBe('alertdialog');
    expect(ask.textContent).toContain('you can undo the change');
    expect(document.activeElement).toBe(q(s.el, '[data-source-change-keep]'));
    act(() => ask.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(q(s.el, '[data-source-change-confirm]')).toBeNull();
    expect(document.activeElement).toBe(change);
    expect(s.props.setSourceReplacement).not.toHaveBeenCalled();
  });

  it('names the version that stays in use', () => {
    const s = shell({ inputText: PASTED, sourceRecord: { inUse: { text: PASTED, version: 3 } } });
    act(() => q(s.el, '[data-source-change]').click());
    expect(q(s.el, '[data-source-change-confirm]').textContent).toContain('keep using version 3');
  });

  it('shows the ways in again after Choose a new source, keeping the current text', () => {
    const s = shell({ inputText: PASTED });
    act(() => q(s.el, '[data-source-change]').click());
    act(() => q(s.el, '[data-source-change-go]').click());
    const pending = s.props.setSourceReplacement.mock.calls[0][0];
    expect(pending).toMatchObject({ status: 'change-pending', previous: PASTED });
    s.render({ sourceReplacement: pending });
    expect(q(s.el, '#tour-upload-source')).not.toBeNull();
    expect(aiButton(s.el).textContent).toBe('Replace with an AI-written passage');
    act(() => q(s.el, '[data-source-change-cancel]').click());
    expect(s.props.setSourceReplacement).toHaveBeenLastCalledWith(null);
  });

  it('makes the new text a replacement with Undo and opens the Source view', () => {
    const s = shell({ inputText: PASTED, sourceReplacement: { status: 'change-pending', previous: PASTED } });
    expect(s.props.openSourceView).not.toHaveBeenCalled();
    s.render({ inputText: PASSAGE });
    expect(s.props.setSourceReplacement).toHaveBeenCalledWith(expect.objectContaining({ status: 'replaced', previous: PASTED, text: PASSAGE }));
    expect(s.props.openSourceView).toHaveBeenCalledWith({ focus: false });
  });

  it('opens the Source view when text first arrives, not on every render', () => {
    const s = shell();
    s.render({ toggleTool: vi.fn() });
    expect(s.props.openSourceView).not.toHaveBeenCalled();
    s.render({ inputText: PASTED });
    expect(s.props.openSourceView).toHaveBeenCalledTimes(1);
    s.render({ inputText: PASTED + ' More.' });
    expect(s.props.openSourceView).toHaveBeenCalledTimes(1);
  });
});

describe('the host: automatic use and version stamps', () => {
  const host = readFileSync(process.env.ALLO_HOST_ANTI || 'AlloFlowANTI.txt', 'utf8');
  const autoUseEffect = sliceBetween(host, "  useEffect(() => { const api = window.AlloModules?.SidebarPanels?.SourceRecord; if (!isProcessing", '\n', { file: 'AlloFlowANTI.txt', label: 'auto-use effect' });
  const stampEffect = sliceBetween(host, "  useEffect(() => { const api = window.AlloModules?.SidebarPanels?.SourceRecord; if (!api) return; if (!sourceStampSeenRef", '\n', { file: 'AlloFlowANTI.txt', label: 'stamp effect' });

  function autoUse({ typing, processing = true, prev = null }) {
    let next = 'untouched';
    const box = document.createElement('textarea');
    box.setAttribute('data-allo-textundo', 'input');
    const other = document.createElement('button');
    document.body.append(box, other);
    try {
      (typing ? box : other).focus();
      new Function('useEffect', 'isProcessing', 'inputText', 'setSourceRecord', autoUseEffect)((fn) => fn(), processing, PASTED, (value) => { next = typeof value === 'function' ? value(prev) : value; });
    } finally { box.remove(); other.remove(); }
    return next;
  }

  it('uses the draft when a resource starts', () => {
    expect(autoUse({ typing: false }).inUse).toMatchObject({ text: PASTED, version: 1 });
    expect(autoUse({ typing: false, processing: false })).toBe('untouched');
  });

  it('never changes the text under the cursor: it is only marked pending', () => {
    const next = autoUse({ typing: true });
    expect(next.pending).toBe(PASTED);
    expect(next.inUse).toBeUndefined();
  });

  it('stamps resources made after the first render with the version in use', () => {
    const ref = { current: null };
    let history = [{ id: 'restored', type: 'quiz' }];
    const setHistory = vi.fn((next) => { history = next; });
    const run = (record) => new Function('useEffect', 'history', 'sourceRecord', 'sourceStampSeenRef', 'setHistory', stampEffect)((fn) => fn(), history, record, ref, setHistory);
    const record = api.SourceRecord.use(null, PASTED);
    run(record);
    expect(setHistory).not.toHaveBeenCalled();
    history = [...history, { id: 'made', type: 'glossary' }];
    run(record);
    expect(history[0].sourceVersion).toBeUndefined();
    expect(history[1].sourceVersion).toBe(1);
  });

  it('offers to remake a resource made from an older version', () => {
    const badge = sliceBetween(host, '{generatedContent && typeof generatedContent.sourceVersion', '</span>', { file: 'AlloFlowANTI.txt', label: 'version badge' });
    expect(badge).toContain('generatedContent.sourceVersion < sourceRecord.inUse.version');
    expect(badge).toContain('onClick={() => handleGenerate(generatedContent.type)}');
  });

  // "Based on" left on Automatic used a saved reading over the source in use, so
  // version 2 could quietly make resources from version 1, or ask to choose.
  describe('Based on: Automatic means the source in use', () => {
    const rule = sliceBetween(host, '  const _alloReadingSourceChoice = () =>', '\n', { file: 'AlloFlowANTI.txt', label: 'Based on rule' });
    const choose = (selected, text, unit) => new Function('selectedReadingSourceId', 'inputText', 'activeUnitId', rule + '\nreturn _alloReadingSourceChoice();')(selected, text, unit);
    const V1 = 'Our town garden opened this spring.';
    const V2 = V1 + ' Next week they will add a compost bin.';
    const v1Check = analysisOf(V1);

    it('picks the source text outside a unit, and keeps explicit picks and unit roles', () => {
      expect(choose('', V2, 'all')).toBe('__input__');
      expect(choose('', V2, null)).toBe('__input__');
      expect(choose('', '   ', 'all')).toBe('');
      expect(choose('', V2, 'unit-1')).toBe('');
      expect(choose('analysis-1', V2, 'all')).toBe('analysis-1');
    });

    it('makes resources from version 2, not the version 1 check, with no reading prompt', () => {
      new Function('window', readFileSync('instructional_context_module.js', 'utf8'))(window);
      const ctx = window.AlloModules.InstructionalContext;
      const resolve = (items) => ctx.resolveReadingSource({ items, sourceArtifactId: choose('', V2, 'all'), inputText: V2, unitId: 'all', language: 'English' });
      expect(resolve([v1Check])).toMatchObject({ status: 'resolved', text: V2 });
      expect(resolve([v1Check, { ...analysisOf(V2), id: 'analysis-2' }])).toMatchObject({ status: 'resolved', text: V2 });
      expect(resolve([v1Check, { id: 's1', type: 'simplified', title: 'Leveled', data: 'Simple garden text.' }])).toMatchObject({ status: 'resolved', text: V2 });
    });

    it('gives every consumer the same choice', () => {
      for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
        const text = readFileSync(file === 'AlloFlowANTI.txt' ? (process.env.ALLO_HOST_ANTI || file) : file, 'utf8');
        expect(text.split('selectedReadingSourceId: _alloReadingSourceChoice(), activeUnitId,').length - 1, file + ' generation deps').toBe(4);
        expect(text.includes('selectedReadingSourceId, activeUnitId,'), file + ' raw value left in deps').toBe(false);
        expect(text.split('sourceArtifactId: _alloReadingSourceChoice()').length - 1, file + ' resolvers').toBe(2);
        expect(text.includes('selectedReadingSourceId: _alloReadingSourceChoice(), config: configOverride'), file + ' lesson plan').toBe(true);
        expect(text.includes('?? options.sourceArtifactId ?? _alloReadingSourceChoice()'), file + ' lesson context').toBe(true);
        expect(text.includes('effectiveReadingSourceId: _alloReadingSourceChoice()'), file + ' Based on box').toBe(true);
      }
    });
  });

  it('gives the Source view the app player and the history list the source record', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const text = readFileSync(file === 'AlloFlowANTI.txt' ? (process.env.ALLO_HOST_ANTI || file) : file, 'utf8');
      const view = sliceBetween(text, '<CDNModuleGate moduleKey="SidebarPanels.SourceView"', '</CDNModuleGate>', { file, label: 'Source view mount' });
      expect(view, file).toContain('handleSpeak, isPlaying, playingContentId,');
      const panel = sliceBetween(text, '<HistoryPanel activeSidebarTab=', '/>}', { file, label: 'history panel mount' });
      expect(panel, file).toContain('sourceRecord={sourceRecord}');
    }
  });

  it('keeps the record with the saved lesson', () => {
    expect(host.includes('              sourceTopic,\n              sourceRecord,\n'), 'saved in the Canvas snapshot').toBe(true);
    const handlers = readFileSync('host_handlers_source.jsx', 'utf8');
    expect(handlers.includes("__d.setSourceRecord(workspace.sourceRecord && typeof workspace.sourceRecord === 'object' ? workspace.sourceRecord : null)"), 'restored with the workspace').toBe(true);
  });
});

describe('Guided Mode examples never replace the teacher\'s text', () => {
  const steps = [
    { id: 'source-input', label: 'Source Material', action: 'Add the text to adapt.', success: 'Source captured.' },
    { id: 'analysis', label: 'Check your source', action: 'Check the source.' },
    { id: 'directions', label: 'Directions', action: 'Review directions.' },
    { id: 'package-deliver', label: 'Delivery', action: 'Review the package.' },
    { id: '_final', label: 'Finish', action: 'Finish this lesson.' },
  ];
  let Banner, sampleText;
  beforeAll(() => {
    const code = transformSync(readFileSync('view_guided_mode_banner_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
    ({ Banner, sampleText } = new Function('React', code + '\nreturn { Banner: GuidedModeBanner, sampleText: GUIDED_SAMPLE_TEXT };')(React));
  }, 30000);
  const banner = (inputText) => mount(Banner, {
    GUIDED_STEPS: steps, allGuidedSteps: steps, GUIDED_TOUR_MAP: {}, guidedPresets: [{ id: 'p', label: 'Reading', description: 'Adapt.', stepIds: steps.map((s) => s.id) }],
    guidedSelectedIds: steps.map((s) => s.id), guidedStep: 0, guidedEngaged: false, guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [],
    history: [], wordSoundsHistory: [], tourSteps: [], t: () => '', inputText, setInputText: vi.fn(),
    handleExitGuidedMode: vi.fn(), handleGuidedSkip: vi.fn(), setGuidedStep: vi.fn(), setShowGuidedTip: vi.fn(), applyGuidedPreset: vi.fn(), markGuidedStepDone: vi.fn(),
  });

  it('offers no sample once the box has text', () => {
    const b = banner(PASTED);
    expect(q(b.el, '[data-help-key="guided_example_source"]')).toBeNull();
    expect(b.props.setInputText).not.toHaveBeenCalled();
  });

  it('fills only an empty box with the sample', () => {
    const b = banner('');
    act(() => q(b.el, '[data-help-key="guided_example_source"]').click());
    expect(b.props.setInputText).toHaveBeenCalledWith(sampleText);
  });
});

describe('help describes the new flow', () => {
  const help = new Function('return (' + readFileSync('help_strings.js', 'utf8').replace(/^[^{]*/, '') + ')')();
  it('says AI writing asks before replacing, and that the card opens the Source view', () => {
    expect(help.source_generate_btn).toContain('you are asked before it is replaced, and you can undo it');
    expect(help.source_input).toContain('opens in the Source view');
    for (const key of ['source_view_use', 'source_view_check', 'source_change_btn', 'source_summary_card']) expect(typeof help[key], key).toBe('string');
  });
});
