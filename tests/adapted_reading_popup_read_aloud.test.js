import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// The Define and Explain popups in the adapted reading view had no way to hear
// their text: the leveled definition and the explanation were the one piece of
// reading-support copy a learner could not listen to. Both now carry a speaker
// button that goes through the host's handleSpeak, so voice, speed, provider
// fallback and the global play state match every other read-aloud in the app.
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

const DEFINE_ID = 'simplified-define-popup';
const EXPLAIN_ID = 'simplified-revision-popup';
const definition = { word: 'evaporate', text: 'To turn from a liquid into a gas.', x: 40, y: 40 };
const explanation = { type: 'explain', result: 'It means the water goes up into the air.', x: 40, y: 40 };

function baseProps(extra = {}) {
  const noop = () => {};
  return { t: k => k, generatedContent: { id: 'reading', type: 'simplified', data: 'Water can evaporate.' }, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, playingContentId: null, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closeRevision: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], ...extra };
}
function mount(extra = {}) {
  const props = baseProps(extra);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const rerender = (props) => act(() => root.render(React.createElement(View, props)));
const speaker = (id) => host.querySelector(`[data-simplified-popup-speaker="${id}"]`);
const click = (element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe('Adapted reading Define popup read-aloud', () => {
  it('reads the word and its leveled definition through the shared handleSpeak', () => {
    const props = mount({ definitionData: definition });
    const button = speaker(DEFINE_ID);
    expect(button).not.toBeNull();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('common.read_aloud');
    expect(button.textContent).toContain('common.listen');
    click(button);
    expect(props.handleSpeak).toHaveBeenCalledTimes(1);
    expect(props.handleSpeak).toHaveBeenCalledWith('evaporate. To turn from a liquid into a gas.', DEFINE_ID, 0);
  });

  it('offers no speaker while the definition is still loading', () => {
    mount({ definitionData: { word: 'evaporate', text: '', x: 40, y: 40 } });
    expect(speaker(DEFINE_ID)).toBeNull();
  });

  it('turns into a stop control while its own audio is playing, and not for other audio', () => {
    mount({ definitionData: definition, isPlaying: true, playingContentId: DEFINE_ID });
    const active = speaker(DEFINE_ID);
    expect(active.getAttribute('aria-label')).toBe('common.stop_reading');
    expect(active.textContent).toContain('common.stop');
    act(() => root.unmount()); host.remove(); root = null;
    mount({ definitionData: definition, isPlaying: true, playingContentId: 'simplified-main' });
    expect(speaker(DEFINE_ID).getAttribute('aria-label')).toBe('common.read_aloud');
  });

  it('stops its own audio when the popup closes, and leaves other audio alone', () => {
    const props = mount({ definitionData: definition, isPlaying: true, playingContentId: DEFINE_ID });
    rerender({ ...props, definitionData: null });
    expect(props.stopPlayback).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); host.remove(); root = null;
    const other = mount({ definitionData: definition, isPlaying: true, playingContentId: 'simplified-main' });
    rerender({ ...other, definitionData: null });
    expect(other.stopPlayback).not.toHaveBeenCalled();
  });
});

describe('Adapted reading Explain popup read-aloud', () => {
  it('reads the explanation through the shared handleSpeak once a result exists', () => {
    const props = mount({ revisionData: explanation });
    const button = speaker(EXPLAIN_ID);
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('common.read_aloud');
    click(button);
    expect(props.handleSpeak).toHaveBeenCalledWith('It means the water goes up into the air.', EXPLAIN_ID, 0);
  });

  it('offers no speaker while the explanation is still being written', () => {
    mount({ revisionData: { type: 'explain', result: '', x: 40, y: 40 } });
    expect(speaker(EXPLAIN_ID)).toBeNull();
  });

  it('serves the simplify and custom results from the same popup', () => {
    const props = mount({ revisionData: { ...explanation, type: 'simplify', result: 'Water goes into the air.' } });
    click(speaker(EXPLAIN_ID));
    expect(props.handleSpeak).toHaveBeenCalledWith('Water goes into the air.', EXPLAIN_ID, 0);
  });

  it('stops its own audio when the popup closes', () => {
    const props = mount({ revisionData: explanation, isPlaying: true, playingContentId: EXPLAIN_ID });
    rerender({ ...props, revisionData: null });
    expect(props.stopPlayback).toHaveBeenCalledTimes(1);
  });
});

describe('Adapted reading popup read-aloud build parity', () => {
  it('ships the speaker in the built and deployed modules', () => {
    const built = readFileSync(resolve(process.cwd(), 'view_simplified_module.js'), 'utf8');
    const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_simplified_module.js'), 'utf8');
    expect(deployed).toBe(built);
    expect(built).toContain('data-simplified-popup-speaker');
    expect(built).toContain("'simplified-define-popup'");
    expect(built).toContain("'simplified-revision-popup'");
  });
});
