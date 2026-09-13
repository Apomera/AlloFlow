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
    const props = mount({ isTeacherMode: true, revisionData: { ...explanation, type: 'simplify', result: 'Water goes into the air.' } });
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


const phonics = { word: 'agua', language: 'Spanish', data: { phoneticSpelling: 'a-gua', ipa: 'aɣwa', syllables: ['a', 'gua'] }, x: 20, y: 20 };
function audioPlayers(play = () => Promise.resolve()) {
  const players = [];
  vi.stubGlobal('Audio', function Audio(url) { this.src = url;this.pause = vi.fn();this.play = vi.fn(play);players.push(this); });
  return players;
}
const audioButton = key => host.querySelector('[data-word-help-audio="' + key + '"]');
const clickAudio = async key => { await act(async () => audioButton(key).click()); };
afterEach(() => vi.unstubAllGlobals());

describe('Student word-help audio controls', () => {
  it('generates pronunciation only on request with the selected word language and voice', async () => {
    const players = audioPlayers();const callTTS = vi.fn().mockResolvedValue('https://example.test/word.wav');
    const props = mount({ phonicsData: phonics, callTTS, voiceSpeed: 0.8, selectedVoice: 'Aoede' });
    expect(callTTS).not.toHaveBeenCalled();expect(audioButton('phonics-word').textContent).toBe('Hear word');
    await clickAudio('phonics-word');
    expect(callTTS).toHaveBeenCalledWith('agua', 'Aoede', 0.8, 2, 'Spanish');
    expect(props.stopPlayback).toHaveBeenCalled();expect(players[0].playbackRate).toBe(0.8);
    expect(audioButton('phonics-word').textContent).toBe('Stop audio');
    await clickAudio('phonics-word');expect(players[0].pause).toHaveBeenCalled();
    expect(audioButton('phonics-word').textContent).toBe('Hear word');
  });
  it.each(['stop', 'close', 'new-word'])('ignores delayed synthesis after %s', async action => {
    const players = audioPlayers();let resolveAudio;
    const props = mount({ phonicsData: phonics, callTTS: vi.fn(() => new Promise(resolve => { resolveAudio = resolve; })) });
    click(audioButton('phonics-word'));
    expect(host.textContent).toContain('Preparing audio');
    if (action === 'stop') click(audioButton('phonics-word'));
    else rerender({ ...props, phonicsData: action === 'close' ? null : { ...phonics, word: 'lluvia' } });
    await act(async () => resolveAudio('https://example.test/late.wav'));
    expect(players).toHaveLength(0);expect(host.textContent).not.toContain('Preparing audio');
  });
  it('shows a retry after playback fails and can successfully retry', async () => {
    const play = vi.fn().mockRejectedValueOnce(new Error('Blocked')).mockResolvedValue(undefined);audioPlayers(play);
    mount({ phonicsData: phonics, callTTS: vi.fn().mockResolvedValue('https://example.test/word.wav') });
    await clickAudio('phonics-word');
    expect(host.textContent).toContain('Audio could not play');expect(audioButton('phonics-word').textContent).toBe('Try audio again');
    await clickAudio('phonics-word');expect(audioButton('phonics-word').textContent).toBe('Stop audio');
  });
  it('stops pronunciation before a recording and stops the recording when the popup closes', async () => {
    const players = audioPlayers();const props = mount({ phonicsData: { ...phonics, dictionary: { audio: 'https://example.test/recording.wav' } }, callTTS: vi.fn().mockResolvedValue('https://example.test/word.wav') });
    await clickAudio('phonics-word');await clickAudio('phonics-recording');
    expect(players[0].pause).toHaveBeenCalled();expect(players[1].src).toContain('recording.wav');
    rerender({ ...props, phonicsData: null });expect(players[1].pause).toHaveBeenCalled();
  });
  it('stops a dictionary recording before reading its definition', async () => {
    const players = audioPlayers();const props = mount({ definitionData: { ...definition, dictionary: { audio: 'https://example.test/recording.wav' } } });
    await clickAudio('definition-recording');click(speaker(DEFINE_ID));
    expect(players[0].pause).toHaveBeenCalled();expect(props.handleSpeak).toHaveBeenCalled();
  });
  it('stops local audio when shared narration starts or the reader unmounts', async () => {
    const players = audioPlayers();const props = mount({ phonicsData: phonics, callTTS: vi.fn().mockResolvedValue('https://example.test/word.wav') });
    await clickAudio('phonics-word');rerender({ ...props, isPlaying: true, playingContentId: 'simplified-main' });
    expect(players[0].pause).toHaveBeenCalled();
    rerender(props);await clickAudio('phonics-word');act(() => root.unmount());root = null;
    expect(players[1].pause).toHaveBeenCalled();
  });
  it('preserves cache-owned audio URLs on stop', async () => {
    audioPlayers();const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    window.__alloTtsCacheOwnsUrl = () => true;
    mount({ phonicsData: phonics, callTTS: vi.fn().mockResolvedValue('blob:cached') });
    await clickAudio('phonics-word');await clickAudio('phonics-word');expect(revoke).not.toHaveBeenCalled();
    delete window.__alloTtsCacheOwnsUrl;revoke.mockRestore();
  });
  it('keeps incomplete syllable data readable instead of crashing', () => {
    mount({ phonicsData: { ...phonics, data: { ipa: 'aɣwa' } } });
    expect(host.querySelector('#phonics-popup-title').textContent).toBe('agua');
    expect(audioButton('phonics-word')).not.toBeNull();
  });
});
