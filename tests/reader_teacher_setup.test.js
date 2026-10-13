// Teacher setup stays out of the reading flow without hiding unresolved work
// or leaving narration recovery focused inside a collapsed panel.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const TEXT = 'Plants need light. Roots take in water.';
let React, createRoot, act, View, contract, pure, phase, root, host;
let originalMediaDevices;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
  View = window.AlloModules.SimplifiedView;
});

beforeEach(() => {
  localStorage.clear();
  originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  window.__alloGetReadAloudAudioSummary = texts => ({ total: texts.length, ready: texts.length, stale: 0, corrupt: 0, missing: 0 });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  else delete navigator.mediaDevices;
  for (const key of ['__alloGetReadAloudAudioSummary', '__alloGetReadAloudReadiness', '__alloPrepareReadAloud', '__alloStoreRecordedSentenceAudio', '__alloInspectReadAloudAudio']) delete window[key];
});

function pair(id = 'setup-reading') {
  const sourceSnapshot = contract.createSourceSnapshot(TEXT, { language: 'English', sourceArtifactId: id + '-source', selection: 'input' });
  const original = contract.createSupportedReading(sourceSnapshot, { id: id + '-original' });
  const adapted = { id, type: 'simplified', data: TEXT, sourceSnapshot, instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English', grade: '5' } };
  return { original, adapted };
}

function mount(extra = {}) {
  const { original, adapted } = pair();
  const noop = () => {};
  let props = {
    ComplexityGauge: () => null, t: key => key, generatedContent: adapted,
    gradeLevel: '5', leveledTextLanguage: 'English', selectedVoice: 'Kore', voiceSpeed: 1,
    isTeacherMode: true, isZenMode: false, isStudentPreview: false, isProcessing: false,
    isTeacherToolbarExpanded: false, isEditingLeveledText: false, interactionMode: 'read',
    inputText: '', history: [original, adapted], studentInterests: [], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    handleSpeak: vi.fn(), stopPlayback: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text: value }) => value }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [],
    setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop,
    handleToggleIsEditingLeveledText: vi.fn(), handleSimplifiedTextChange: vi.fn(), handleFormatText: noop,
    handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop,
    onReadOriginal: noop, onOpenReadingArtifact: noop, onFocusViewChange: vi.fn(),
    setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(),
    handleToggleIsTeacherToolbarExpanded: vi.fn(), ...extra,
  };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(View, props))); };
  render({});
  return { render, get props() { return props; } };
}

const find = selector => host.querySelector(selector);
const setup = () => find('section[data-teacher-setup]');
const toggle = () => find('[data-teacher-setup-toggle]');
const panel = () => find('[data-teacher-setup-panel]');
const manage = () => find('[data-manage-narration]');
const narration = () => find('[role="region"][aria-label="Manage narration"]');
const click = node => act(() => { expect(node).not.toBeNull(); node.click(); });
const expanded = () => toggle().getAttribute('aria-expanded') === 'true';
const shown = node => !!node && !node.closest('[hidden]') && !node.closest('[style*="display: none"]');

describe('one teacher setup panel', () => {
  it('keeps original word help authoring in setup while reading controls stay visible', () => {
    const { original, adapted } = pair();
    original.readingSupports = contract.upsertReadingSupport(original, undefined, { id: 'plants', start: 0, end: 6, quote: 'Plants', text: 'Living things that grow.', origin: 'educator' });
    mount({ generatedContent: original, history: [original, adapted], onGenerateReadingSupports: vi.fn(), onUpdateReadingSupports: vi.fn() });
    expect(expanded()).toBe(false);
    for (const selector of ['[data-original-generate-supports]', '[data-auto-word-supports]', '[data-original-support-editor]']) {
      expect(panel().contains(find(selector)), selector).toBe(true);
      expect(shown(find(selector)), selector).toBe(false);
    }
    for (const selector of ['[data-reader-listen]', '[data-reader-listen-supports]', '[data-original-support-settings] input', '[data-original-support-settings] select', '[data-reading-passage]']) {
      expect(panel().contains(find(selector)), selector).toBe(false);
      expect(shown(find(selector)), selector).toBe(true);
    }
    const editor = find('[data-reading-gloss-editor]');
    const passage = find('[data-reading-passage]');
    click(toggle());
    expect(shown(editor)).toBe(true);
    click(toggle());
    expect(shown(editor)).toBe(false);
    expect(find('[data-reading-gloss-editor]')).toBe(editor);
    expect(find('[data-reading-passage]')).toBe(passage);
  });

  it('starts collapsed for a linked, designated reading and groups its mounted controls', () => {
    mount();
    expect(setup()).not.toBeNull();
    expect(expanded()).toBe(false);
    expect(toggle().getAttribute('aria-controls')).toBe(panel().id);
    expect(panel().hidden).toBe(true);
    expect(panel().style.display).toBe('none');
    for (const selector of ['[data-teacher-editing-tools]', '[data-teacher-review-summary]', '[data-narration-tools]', '[data-instructional-role]', '[data-reader-purpose]']) {
      const control = find(selector);
      expect(control, selector).not.toBeNull();
      expect(panel().contains(control), selector).toBe(true);
      expect(shown(control), selector).toBe(false);
    }
    const summary = find('[data-companion-summary]');
    expect(summary.textContent).toBe('Use alongside the original.');
    expect(panel().contains(summary)).toBe(false);
    expect(shown(summary)).toBe(true);
    const guidance = find('[data-companion-note]');
    expect(panel().contains(guidance)).toBe(true);
    expect(shown(guidance)).toBe(false);
    click(toggle());
    expect(shown(guidance)).toBe(true);
    expect(shown(find('[data-reader-purpose]'))).toBe(true);
  });

  it('opens and closes without remounting controls, and restores focus to its toggle', () => {
    mount();
    const role = find('[data-instructional-role]');
    const narrationToggle = manage();
    click(toggle());
    expect(expanded()).toBe(true);
    expect(panel().hidden).toBe(false);
    expect(shown(role)).toBe(true);
    act(() => narrationToggle.focus());
    click(toggle());
    expect(expanded()).toBe(false);
    expect(find('[data-instructional-role]')).toBe(role);
    expect(manage()).toBe(narrationToggle);
    expect(document.activeElement).toBe(toggle());
    click(toggle());
    expect(manage()).toBe(narrationToggle);
  });

  it.each(['unspecified role', 'missing original'])('opens when the teacher must resolve %s', reason => {
    const { adapted } = pair();
    if (reason === 'unspecified role') adapted.instructionalText.role = 'unspecified';
    else delete adapted.sourceSnapshot;
    mount({ generatedContent: adapted, history: [] });
    expect(expanded()).toBe(true);
    expect(shown(find('[data-instructional-role]'))).toBe(true);
  });

  it.each([{ isTeacherMode: false }, { isStudentPreview: true }])('omits setup for %j', extra => {
    mount(extra);
    expect(setup()).toBeNull();
    expect(toggle()).toBeNull();
  });

  it('keeps setup mounted but inaccessible in Focus view', () => {
    mount({ isZenMode: true });
    expect(setup()).not.toBeNull();
    expect(setup().hidden).toBe(true);
    expect(setup().style.display).toBe('none');
    expect(shown(toggle())).toBe(false);
  });

  it('resets a manually opened panel when moving to another linked reading', () => {
    const view = mount(); click(toggle());
    const next = pair('second-reading');
    view.render({ generatedContent: next.adapted, history: [next.original, next.adapted] });
    expect(expanded()).toBe(false);
    expect(panel().hidden).toBe(true);
  });

  it('keeps changed-text attention visible in the collapsed toggle', () => {
    const view = mount();
    view.render({ generatedContent: { ...view.props.generatedContent, data: TEXT + ' Leaves capture sunlight.' } });
    if (expanded()) click(toggle());
    expect(expanded()).toBe(false);
    expect(toggle().textContent).toContain('Text changed');
    expect(shown(toggle())).toBe(true);
    expect(find('[data-review-state="text"]').getAttribute('data-review-tone')).toBe('attention');
  });
});

describe('narration access across the setup boundary', () => {
  it('opens the parent when Manage narration is activated programmatically', () => {
    mount();
    expect(expanded()).toBe(false);
    // Recovery paths can activate this mounted control while setup is closed.
    click(manage());
    expect(expanded()).toBe(true);
    expect(manage().getAttribute('aria-expanded')).toBe('true');
    expect(shown(narration())).toBe(true);
  });

  it('cancels a pending microphone request when setup is collapsed', async () => {
    let resolveMic;
    const stop = vi.fn();
    window.__alloStoreRecordedSentenceAudio = vi.fn(async () => true);
    vi.stubGlobal('MediaRecorder', class { static isTypeSupported() { return true; } });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => new Promise(resolve => { resolveMic = resolve; })) } });
    mount(); click(toggle()); click(manage());
    await act(async () => narration().querySelector('button[aria-label="word_sounds.voice_pack_tab_record 1"]').click());
    expect(resolveMic).toBeTypeOf('function');
    click(toggle());
    expect(expanded()).toBe(false);
    expect(manage().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle());
    await act(async () => resolveMic({ getTracks: () => [{ stop }] }));
    expect(stop).toHaveBeenCalled();
    expect(window.__alloStoreRecordedSentenceAudio).not.toHaveBeenCalled();
  });

  it('expands setup before focusing a failed narration sentence', async () => {
    window.__alloGetReadAloudAudioSummary = () => ({ total: 2, ready: 0, stale: 0, corrupt: 0, missing: 2 });
    window.__alloPrepareReadAloud = vi.fn(async () => ({ remaining: 2, failures: [{ index: 1, text: 'Roots take in water.', code: 'human-recording-protected', action: 'review-recording' }] }));
    mount();
    if (!expanded()) click(toggle());
    await act(async () => find('[data-review-action="audio"]').click());
    const recovery = find('[data-audio-recovery-index="1"] button');
    expect(recovery).not.toBeNull();
    click(toggle());
    expect(expanded()).toBe(false);
    // The recovery action remains mounted; its handler must reveal the new target.
    click(recovery);
    expect(expanded()).toBe(true);
    expect(shown(narration())).toBe(true);
    expect(document.activeElement.closest('[data-audio-sentence-index]')?.getAttribute('data-audio-sentence-index')).toBe('1');
    expect(shown(document.activeElement)).toBe(true);
  });
});

it('keeps the Focus view control and passage mounted while teacher setup is hidden', () => {
  const view = mount();
  const focus = find('[data-reader-focus-view]');
  const passage = find('[data-reading-passage]');
  const teacherSection = setup();
  expect(panel().contains(focus)).toBe(false);
  act(() => { focus.focus(); focus.click(); });
  expect(view.props.onFocusViewChange).toHaveBeenLastCalledWith(true);
  view.render({ isZenMode: true });
  expect(setup()).toBe(teacherSection);
  expect(shown(setup())).toBe(false);
  expect(find('[data-reader-focus-view]')).toBe(focus);
  expect(find('[data-reading-passage]')).toBe(passage);
  expect(document.activeElement).toBe(focus);
  view.render({ isZenMode: false });
  expect(setup()).toBe(teacherSection);
  expect(shown(setup())).toBe(true);
  expect(find('[data-reader-focus-view]')).toBe(focus);
  expect(find('[data-reading-passage]')).toBe(passage);
  expect(view.props.stopPlayback).not.toHaveBeenCalled();
});
