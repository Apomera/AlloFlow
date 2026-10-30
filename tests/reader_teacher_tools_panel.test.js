// Teacher tools opens below review and narration, so a click that opens it
// must bring the panel into view and move focus there.
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

// Flip the prop the way the host reducer does, so the view sees a real re-render.
function mountWithToolbar(extra = {}) {
  let view;
  view = mount({ ...extra, handleToggleIsTeacherToolbarExpanded: () => view.render({ isTeacherToolbarExpanded: !view.props.isTeacherToolbarExpanded }) });
  return view;
}
const toolsButton = () => find('[data-help-key="simplified_teacher_tools"]');
const toolsPanel = () => document.getElementById(toolsButton().getAttribute('aria-controls'));
function stubMotion(reduce) {
  vi.stubGlobal('matchMedia', query => ({ matches: reduce && /reduce/.test(query), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
}

// jsdom has no scrollIntoView; install one per test and remove it after.
function stubScroll() { const scroll = vi.fn(); Element.prototype.scrollIntoView = scroll; return scroll; }

describe('teacher tools panel', () => {
  afterEach(() => { delete Element.prototype.scrollIntoView; });
  it('scrolls to and focuses the panel when a click opens it, and not when it closes', () => {
    stubMotion(false);
    const scroll = stubScroll();
    mountWithToolbar();
    click(toggle());
    expect(shown(toolsButton())).toBe(true);
    expect(shown(toolsPanel())).toBe(false);
    click(toolsButton());
    expect(toolsButton().getAttribute('aria-expanded')).toBe('true');
    expect(shown(toolsPanel())).toBe(true);
    expect(document.activeElement).toBe(toolsPanel());
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.instances[0]).toBe(toolsPanel());
    expect(scroll.mock.calls[0][0]).toEqual({ block: 'nearest', behavior: 'smooth' });
    expect(toolsPanel().getAttribute('role')).toBe('group');
    expect(toolsPanel().getAttribute('aria-label')).toBe('Teacher tools');
    toolsButton().focus();
    click(toolsButton());
    expect(shown(toolsPanel())).toBe(false);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(toolsButton());
  });

  it('uses an instant scroll under reduced motion', () => {
    stubMotion(true);
    const scroll = stubScroll();
    mountWithToolbar();
    click(toggle());
    click(toolsButton());
    expect(scroll.mock.calls[0][0]).toEqual({ block: 'nearest', behavior: 'auto' });
  });

  it('does not pull the page or focus when the panel is already open on render', () => {
    stubMotion(false);
    const scroll = stubScroll();
    mountWithToolbar({ isTeacherToolbarExpanded: true });
    expect(shown(toolsPanel())).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(toolsPanel());
  });
});
