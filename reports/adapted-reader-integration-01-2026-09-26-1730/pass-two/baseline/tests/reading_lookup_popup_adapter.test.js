import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { loadReadingLookupCandidate } from './reading_lookup_candidate.js';

// The shared reader is owned by another track. Exercise the proposed integration
// delta against its current source in memory, without overwriting that source.
const require = createRequire(import.meta.url);
let React, createRoot, act, View, pure, phase, contract, root, host, matchPassageSense;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.__alloUtils = { cleanJson: value => value };
  loadReadingLookupCandidate(); loadAlloModule('instructional_context_module.js'); loadAlloModule('alt_text_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; contract = window.AlloModules.InstructionalContext;
  const { applyDictionaryRecovery } = require('../dev-tools/prepare_reading_lookup_resilience.cjs');
  delete window.AlloDictionary;
  new Function(process.env.ALLO_DICT_CANDIDATE ? readFileSync(process.env.ALLO_DICT_CANDIDATE, 'utf8') : applyDictionaryRecovery(readFileSync('dictionary_loader.js', 'utf8').replace(/\r\n/g, '\n')))();
  matchPassageSense = window.AlloDictionary.matchPassageSense;
  delete window.AlloDictionary;
  if (process.env.ALLO_VIEW_CANDIDATE) {
    loadAlloModule(process.env.ALLO_VIEW_CANDIDATE); View = window.AlloModules.SimplifiedView; return;
  }
  const { applyReaderRecovery } = require('../dev-tools/prepare_reading_lookup_resilience.cjs');
  const source = applyReaderRecovery(readFileSync('view_simplified_source.jsx', 'utf8').replace(/\r\n/g, '\n'));
  const compiled = require('@babel/core').transformSync(readFileSync('reader_place_store.js', 'utf8') + '\n' + source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  View = new Function('React', compiled + '\nreturn SimplifiedView;')(React);
});
afterEach(() => {
  if (root) act(() => root.unmount()); root = null; host?.remove(); host = null;
  window.getSelection().removeAllRanges(); delete window.AlloDictionary; delete window.__alloStudentAiDisabled; delete window.callGemini;
  delete window.AlloFlowConfig;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const dictionaryEntry = { word: 'bank', phonetic: '/bæŋk/', audio: 'https://example.test/bank.wav', meanings: [{ definitions: [{ definition: 'The edge of a river.' }] }] };
const bilingual = { id: 'reading', type: 'simplified', data: 'El banco está cerca.\n\n--- ENGLISH TRANSLATION ---\n\nThe river bank is steep.', config: { grade: '3', language: 'Spanish' } };
const splitBilingual = text => { const parts = text.split('--- ENGLISH TRANSLATION ---'); return parts.length === 2 ? { source: parts[0].trim().split(/\n{2,}/), target: parts[1].trim().split(/\n{2,}/), sourceFull: parts[0].trim(), targetFull: parts[1].trim() } : null; };
const click = async node => { expect(node).not.toBeNull(); await act(async () => node.click()); };
const word = language => [...host.querySelectorAll('[data-reading-language="' + language + '"] [data-reading-word]')].find(node => ['bank', 'banco'].includes(node.textContent));

function mount(extra = {}) {
  let props = extra, state, engine;
  const requests = [], dictionary = defer(), callGemini = vi.fn(() => { const request = defer(); requests.push(request); return request.promise; });
  const handleSpeak = vi.fn(), stopPlayback = vi.fn(), callTTS = vi.fn().mockResolvedValue('https://example.test/word.wav');
  window.AlloDictionary = { lookup: vi.fn(() => dictionary.promise), matchPassageSense };
  const noop = () => {};
  function Harness() {
    const [definitionData, setDefinitionData] = React.useState(null), [phonicsData, setPhonicsData] = React.useState(null), [selectionMenu, setSelectionMenu] = React.useState(null);
    const base = { t: key => key, generatedContent: bilingual, activeView: 'simplified', inputText: '', gradeLevel: '9', leveledTextLanguage: 'French', sourceTopic: 'Wrong ambient topic', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: true, isZenMode: true, isProcessing: false, isPlaying: false, playingContentId: null, interactionMode: 'define', history: [], textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: splitBilingual, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS, handleSpeak, handleQuickAddGlossary: noop, stopPlayback, closeRevision: noop, isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', phonics: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: text => text, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [], setIsCustomReviseOpen: noop, setCustomReviseInstruction: noop, ...props };
    state = { ...base, definitionData, phonicsData, selectionMenu, setDefinitionData, setPhonicsData, setSelectionMenu };
    engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, callTTS, addToast: vi.fn(), t: key => key });
    return React.createElement(View, { ...state, handleWordClick: engine.handleWordClick, handleDefineSelection: engine.handleDefineSelection, handlePhonicsClick: engine.handlePhonicsClick, handleTextMouseUp: engine.handleTextMouseUp, closeDefinition: engine.closeDefinition, closePhonics: engine.closePhonics });
  }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Harness)));
  return { requests, dictionary, callGemini, callTTS, handleSpeak, stopPlayback, get state() { return state; }, get engine() { return engine; }, rerender: update => { props = { ...props, ...update }; act(() => root.render(React.createElement(Harness))); } };
}

describe('lookup popup adapter integrated with the real engine', () => {
  it.each(['English', 'Spanish'])('uses the actual %s pane for lookup and speech', async language => {
    const f = mount(); await click(word(language));
    expect(f.callGemini.mock.calls[0][0]).toContain('Output Language: ' + language);
    expect(f.callGemini.mock.calls[0][0]).toContain('for a 3rd Grade student');
    await act(async () => f.requests[0].resolve(language === 'English' ? 'Land beside a river.' : 'Un asiento.\n**English:** A seat.'));
    await click(host.querySelector('[data-simplified-popup-speaker="simplified-define-popup"]'));
    expect(f.handleSpeak).toHaveBeenLastCalledWith(language === 'English' ? 'bank. Land beside a river.' : 'banco. Un asiento.', 'simplified-define-popup', 0, false, language);
    if (language === 'Spanish') {
      await click(host.querySelector('[data-simplified-popup-speaker="simplified-define-popup-english"]'));
      expect(f.handleSpeak).toHaveBeenLastCalledWith('A seat.', 'simplified-define-popup-english', 0, false, 'English');
    }
  });
  it('retains a dictionary after AI failure and offers retry without selecting again', async () => {
    const f = mount(); await click(word('English'));
    await act(async () => { f.dictionary.resolve(dictionaryEntry); f.requests[0].reject(new Error('Offline')); });
    expect(host.textContent).toContain('The edge of a river.'); expect(host.textContent).toContain('AI word help could not load');
    await click(host.querySelector('[data-simplified-popup-speaker="simplified-define-popup"]'));
    expect(f.handleSpeak).toHaveBeenLastCalledWith('bank. The edge of a river.', 'simplified-define-popup', 0, false, 'English');
    f.rerender({ gradeLevel: '12', leveledTextLanguage: 'German' }); window.getSelection().removeAllRanges();
    await click(host.querySelector('[data-lookup-retry="definition"]'));
    expect(host.textContent).toContain('The edge of a river.'); expect(f.callGemini.mock.calls[1][0]).toBe(f.callGemini.mock.calls[0][0]);
    await act(async () => f.requests[1].resolve('The side of the river.'));
    expect(host.textContent).toContain('The side of the river.'); expect(host.querySelector('[data-lookup-retry]').getAttribute('aria-disabled')).toBe('true');
  });
  it.each(['source', 'adapted'])('preserves exact-comparison %s pane context', async pane => {
    const item = { ...bilingual, data: 'El banco está cerca.', instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: contract.createSourceSnapshot('The bank lends money.', { language: 'English' }) };
    const f = mount({ isCompareMode: true, generatedContent: item });
    const selected = [...host.querySelectorAll('[data-compare-version="' + pane + '"] [data-exact-word]')].find(node => ['bank', 'banco'].includes(node.textContent));
    await click(selected);
    expect(f.callGemini.mock.calls[0][0]).toContain(pane === 'source' ? 'The bank lends money.' : 'El banco está cerca.');
    expect(f.callGemini.mock.calls[0][0]).toContain('Output Language: ' + (pane === 'source' ? 'English' : 'Spanish'));
    await act(async () => f.requests[0].resolve('Meaning in the selected passage.'));
  });
  it('keeps pronunciation and its dictionary recording available when phonics analysis fails', async () => {
    const players = []; vi.stubGlobal('Audio', function(url) { this.src = url; this.play = vi.fn().mockResolvedValue(); this.pause = vi.fn(); players.push(this); });
    const f = mount({ interactionMode: 'phonics' }); await click(word('English'));
    await act(async () => { f.dictionary.resolve(dictionaryEntry); f.requests[0].resolve('not JSON'); });
    expect(host.textContent).toContain('/bæŋk/'); expect(host.querySelector('[data-lookup-retry="phonics"]')).not.toBeNull();
    await click(host.querySelector('[data-word-help-audio="phonics-recording"]')); expect(players[0].src).toBe(dictionaryEntry.audio);
    await click(host.querySelector('[data-word-help-audio="phonics-word"]')); expect(players[0].pause).toHaveBeenCalled();
    expect(f.callTTS).toHaveBeenCalledWith('bank', 'Kore', 1, 2, 'English');
    await click(host.querySelector('[data-word-help-audio="phonics-context"]'));
    expect(f.callTTS).toHaveBeenLastCalledWith('The river bank is steep.', 'Kore', 1, 2, 'English');
  });
  it.each(['definition', 'phonics'])('settles AI-disabled %s help with an accurate dictionary miss', async kind => {
    window.__alloStudentAiDisabled = true;
    const f = mount({ interactionMode: kind === 'definition' ? 'define' : 'phonics', studentAiFeaturesHidden: true });
    await click(word('English')); await act(async () => f.dictionary.resolve(null));
    expect(f.callGemini).not.toHaveBeenCalled(); expect(host.textContent).toContain('AI explanations are off');
    expect(host.textContent).toContain('No dictionary entry is available.'); expect(host.querySelector('[data-lookup-retry]')).toBeNull();
    const retry = host.querySelector('[data-dictionary-retry="' + kind + '"]'); expect(retry).not.toBeNull();
    window.AlloDictionary.lookup.mockResolvedValueOnce(dictionaryEntry); await click(retry);
    expect(f.callGemini).not.toHaveBeenCalled(); expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-dictionary-retry]').getAttribute('aria-disabled')).toBe('true'); expect(host.textContent).toContain(kind === 'definition' ? 'The edge of a river.' : '/bæŋk/');
  });
  it.each(['button', 'escape', 'backdrop'])('ignores late definition completion after %s dismissal', async method => {
    const f = mount(); await click(word('English'));
    const dialog = host.querySelector('[aria-labelledby*="simplified-definition-title"]');
    if (method === 'button') await click(dialog.querySelector('button[aria-label="common.close"]'));
    else if (method === 'backdrop') await click(dialog.nextElementSibling);
    else await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(f.callGemini.mock.calls[0][5].aborted).toBe(true);
    await act(async () => { f.requests[0].resolve('Late'); f.dictionary.resolve(dictionaryEntry); });
    expect(host.querySelector('[aria-labelledby*="simplified-definition-title"]')).toBeNull();
    expect(f.handleSpeak).not.toHaveBeenCalled();
  });
  it('cancels pending work when the reader unmounts', async () => {
    const f = mount(); await click(word('English')); const request = f.state.definitionData.lookupRequest;
    act(() => root.unmount()); root = null;
    expect(f.callGemini.mock.calls[0][5].aborted).toBe(true);
    await act(async () => { f.requests[0].resolve('Late'); f.dictionary.resolve(dictionaryEntry); });
    expect(host.textContent).toBe(''); expect(f.callTTS).not.toHaveBeenCalled();
    expect(request.language).toBe('English');
  });
  it('ignores delayed synthesis when the same spelling is selected in another pane', async () => {
    const players = []; vi.stubGlobal('Audio', function() { players.push(this); this.play = vi.fn().mockResolvedValue(); this.pause = vi.fn(); });
    const f = mount({ interactionMode: 'phonics', generatedContent: { ...bilingual, data: bilingual.data.replace('banco', 'bank') } });
    const audio = defer(); f.callTTS.mockImplementation(() => audio.promise);
    await click(word('English')); await click(host.querySelector('[data-word-help-audio="phonics-word"]'));
    expect(host.textContent).toContain('Preparing audio');
    await click(word('Spanish')); await act(async () => audio.resolve('https://example.test/late.wav'));
    expect(players).toHaveLength(0); expect(host.textContent).not.toContain('Preparing audio');
  });
  it('preserves teacher-prepared help when More about this word fails', async () => {
    const item = { id: 'prepared', type: 'simplified', data: 'The river bank is steep.', instructionalText: { form: 'adapted', role: 'supplemental' }, config: { grade: '3', language: 'English' } };
    const start = item.data.indexOf('bank');
    const help = contract.upsertAdaptedReadingSupport(item, null, { id: 'bank-help', start, end: start + 4, quote: 'bank', text: 'The ground beside the river.' });
    item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, help, true);
    const f = mount({ generatedContent: item }); await click(word('English'));
    expect(host.querySelector('[data-word-help-card]')).not.toBeNull(); expect(f.callGemini).not.toHaveBeenCalled();
    await click(host.querySelector('[data-word-help-card-more]')); await act(async () => f.requests[0].reject(new Error('Offline')));
    expect(host.querySelector('[aria-labelledby*="simplified-definition-title"]').textContent).toContain('The ground beside the river.');
    expect(host.querySelector('[data-lookup-retry="definition"]')).not.toBeNull();
  });
  it('opens Define for a drag-selected phrase instead of replacing it with a word click', async () => {
    const f = mount(); const selected = word('English'), block = selected.closest('[data-reading-paragraph]');
    const range = document.createRange(); range.setStart(block.querySelector('[data-reading-word="1"]').firstChild, 0); range.setEnd(selected.firstChild, selected.textContent.length);
    range.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10 }); window.getSelection().addRange(range);
    await act(async () => block.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
    await click(selected); expect(f.callGemini).not.toHaveBeenCalled();
    const define = [...host.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('text_tools.define'));
    await click(define); expect(f.callGemini.mock.calls[0][0]).toContain('river bank');
    await act(async () => f.requests[0].resolve('Land beside water.'));
  });
  it.each(['English', 'Spanish'])('captures multiple rendered paragraphs in the %s bilingual pane', async language => {
    const item = { ...bilingual, data: 'El banco está cerca.\n\nEl plomo es pesado.\n\n--- ENGLISH TRANSLATION ---\n\nThe river bank is steep.\n\nThe lead weight sinks.' };
    const f = mount({ generatedContent: item });
    const nodes = [...host.querySelectorAll('[data-reading-language="' + language + '"] [data-reading-word]')];
    const first = nodes.find(node => node.textContent === (language === 'English' ? 'bank' : 'banco'));
    const last = nodes.find(node => node.textContent === (language === 'English' ? 'lead' : 'plomo'));
    const range = document.createRange(); range.setStart(first.firstChild, 0); range.setEnd(last.firstChild, last.textContent.length);
    range.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10 }); window.getSelection().addRange(range);
    await act(async () => last.closest('[data-reading-paragraph]').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
    const define = [...host.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('text_tools.define'));
    await click(define);
    const request = f.state.definitionData.lookupRequest;
    expect(request.language).toBe(language);
    expect(request.passageText).toBe(language === 'English' ? 'The river bank is steep.\nThe lead weight sinks.' : 'El banco está cerca.\nEl plomo es pesado.');
    expect(request.word).toBe(language === 'English' ? 'bank is steep.\nThe lead' : 'banco está cerca.\nEl plomo');
    expect(request.passageText.slice(request.selectionStart, request.selectionEnd)).toBe(request.word);
    await act(async () => f.requests[0].resolve('Meaning in the selected passage.'));
  });
  it.each(['source', 'adapted'])('captures multiple paragraphs within the exact-comparison %s version', async pane => {
    const source = 'The bank lends money.\n\nThe lead weight sinks.', adapted = 'El banco está cerca.\n\nEl plomo es pesado.';
    const item = { ...bilingual, data: adapted, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: contract.createSourceSnapshot(source, { language: 'English' }) };
    const f = mount({ isCompareMode: true, generatedContent: item });
    const nodes = [...host.querySelectorAll('[data-compare-version="' + pane + '"] [data-exact-word]')];
    const first = nodes.find(node => ['bank', 'banco'].includes(node.textContent));
    const last = nodes.find(node => ['lead', 'plomo'].includes(node.textContent));
    const range = document.createRange(); range.setStart(first.firstChild, 0); range.setEnd(last.firstChild, last.textContent.length);
    range.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10 }); window.getSelection().addRange(range);
    await act(async () => last.closest('[data-reading-paragraph]').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
    await click([...host.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('text_tools.define')));
    const request = f.state.definitionData.lookupRequest;
    expect(request.passageText).toBe((pane === 'source' ? source : adapted).replace(/\n\n/g, '\n'));
    expect(request.language).toBe(pane === 'source' ? 'English' : 'Spanish');
    expect(request.passageText.slice(request.selectionStart, request.selectionEnd)).toBe(request.word);
    await act(async () => f.requests[0].resolve('Meaning in this version.'));
  });
  it('suggests and reads the selected occurrence meaning while retaining alternative meanings', async () => {
    const f = mount({ generatedContent: { ...bilingual, data: 'El banco.\n\n--- ENGLISH TRANSLATION ---\n\nThe bank lends money. The river bank is steep.' } });
    const banks = [...host.querySelectorAll('[data-reading-language="English"] [data-reading-word]')].filter(node => node.textContent === 'bank');
    await click(banks[1]);
    const dictionary = { ...dictionaryEntry, meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'An institution lending money.' }, { definition: 'The land beside a river.' }] }] };
    await act(async () => { f.dictionary.resolve(dictionary); f.requests[0].reject(new Error('Offline')); });
    expect(host.querySelector('[data-dictionary-suggested]').textContent).toContain('The land beside a river.');
    expect(host.querySelector('[data-dictionary-panel] details').textContent).toContain('An institution lending money.');
    await click(host.querySelector('[data-simplified-popup-speaker="simplified-define-popup"]'));
    expect(f.handleSpeak).toHaveBeenLastCalledWith('bank. The land beside a river.', 'simplified-define-popup', 0, false, 'English');
  });
  it('offers each meaning explicitly when the passage does not distinguish them', async () => {
    const f = mount({ generatedContent: { ...bilingual, data: 'El banco.\n\n--- ENGLISH TRANSLATION ---\n\nThe bank is there.' } });
    await click(word('English'));
    await act(async () => { f.dictionary.resolve({ ...dictionaryEntry, meanings: [{ definitions: [{ definition: 'An institution lending money.' }, { definition: 'The land beside a river.' }] }] }); f.requests[0].reject(new Error('Offline')); });
    expect(host.querySelector('[data-dictionary-suggested]')).toBeNull();
    expect(host.querySelector('[data-simplified-popup-speaker="simplified-define-popup"]')).toBeNull();
    expect(host.querySelectorAll('[data-word-help-audio^="definition-meaning-"]')).toHaveLength(2);
    vi.stubGlobal('Audio', function () { this.play = vi.fn().mockResolvedValue(); this.pause = vi.fn(); });
    await click(host.querySelector('[data-word-help-audio="definition-meaning-0-1"]'));
    expect(f.callTTS).toHaveBeenCalledWith('The land beside a river.', 'Kore', 1, 2, 'English');
  });
  it('renders paired pronunciation variants and plays the recording selected by the reader', async () => {
    const players = []; vi.stubGlobal('Audio', function (url) { this.src = url; this.play = vi.fn().mockResolvedValue(); this.pause = vi.fn(); players.push(this); });
    const f = mount({ interactionMode: 'phonics' }); await click(word('English'));
    await act(async () => { f.dictionary.resolve({ ...dictionaryEntry, pronunciations: [{ phonetic: '/one/', audio: 'first.wav' }, { phonetic: '/two/', audio: 'second.wav' }] }); f.requests[0].reject(new Error('Offline')); });
    const variants = host.querySelectorAll('[data-dictionary-pronunciation]'); expect(variants).toHaveLength(2);
    expect(variants[1].textContent).toContain('/two/'); await click(variants[1].querySelector('button'));
    expect(players[0].src).toBe('second.wav'); expect(f.callTTS).not.toHaveBeenCalled();
  });
  it.each(['definition', 'phonics'])('preserves keyboard focus through %s AI retry and completion', async kind => {
    const f = mount({ interactionMode: kind === 'definition' ? 'define' : 'phonics' }); await click(word('English'));
    await act(async () => { f.requests[0].reject(new Error('Offline')); await new Promise(resolve => setTimeout(resolve, 0)); });
    const button = host.querySelector('[data-lookup-retry="' + kind + '"]'); button.focus(); await click(button);
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-busy')).toBe('true');
    await click(button); expect(f.callGemini).toHaveBeenCalledTimes(2);
    await act(async () => f.requests[1].resolve(kind === 'definition' ? 'A river edge.' : JSON.stringify({ ipa: 'bank', syllables: ['bank'] })));
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect([...host.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('Word help ready'))).toBe(true);
    await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(host.querySelector('[data-lookup-retry="' + kind + '"]')).toBeNull();
  });
  it.each(['definition', 'phonics'])('preserves keyboard focus through %s dictionary retry with AI off', async kind => {
    window.__alloStudentAiDisabled = true;
    const f = mount({ interactionMode: kind === 'definition' ? 'define' : 'phonics', studentAiFeaturesHidden: true }); await click(word('English'));
    await act(async () => { f.dictionary.resolve(null); await new Promise(resolve => setTimeout(resolve, 0)); });
    const next = defer(); window.AlloDictionary.lookup.mockReturnValueOnce(next.promise);
    const button = host.querySelector('[data-dictionary-retry="' + kind + '"]'); button.focus(); await click(button);
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-busy')).toBe('true');
    await click(button); expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve(dictionaryEntry));
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(f.callGemini).not.toHaveBeenCalled();
    expect([...host.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('Dictionary entry ready'))).toBe(true);
  });
});

describe('lookup recovery messages and picture retry', () => {
  it.each(['id', 'data', 'compare'])('aborts pending lookup when the reader changes %s', async field => {
    const f = mount(); await click(word('English'));
    if (field === 'compare') f.rerender({ isCompareMode: true });
    else f.rerender({ generatedContent: { ...bilingual, [field]: field === 'id' ? 'next-reading' : 'A different reading.' } });
    expect(f.callGemini.mock.calls[0][5].aborted).toBe(true);
    expect(window.AlloDictionary.lookup.mock.calls[0][1].signal.aborted).toBe(true);
    expect(host.querySelector('[aria-labelledby*="simplified-definition-title"]')).toBeNull();
    await act(async () => { f.requests[0].resolve('Late'); f.dictionary.resolve(dictionaryEntry); });
    expect(host.querySelector('[aria-labelledby*="simplified-definition-title"]')).toBeNull();
  });
  it.each(['definition', 'phonics'])('announces %s dictionary success without an obsolete loading or failure message', async kind => {
    vi.useFakeTimers(); const f = mount({ interactionMode: kind === 'definition' ? 'define' : 'phonics' });
    await click(word('English'));
    await act(async () => { f.dictionary.resolve(dictionaryEntry); f.requests[0].reject(new Error('Unavailable')); });
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const messages = [...host.querySelectorAll('[role="status"]')].map(node => node.textContent).join(' ');
    expect(messages).toContain('Dictionary entry ready'); expect(messages).toContain('AI word help could not load.');
    expect(messages).not.toMatch(/Finding a definition|Unable to load word sounds|Preparing word help/);
  });
  it.each([
    ['not_found', 'The dictionary has no entry for this word.'],
    ['request_failed', 'The dictionary could not be reached.'],
    ['invalid_response', 'The dictionary returned an unusable entry.'],
    ['timeout', 'The dictionary took too long to respond.']
  ])('announces the %s outcome while keeping dictionary retry usable with AI off', async (reason, message) => {
    window.__alloStudentAiDisabled = true;
    const f = mount({ studentAiFeaturesHidden: true });
    window.AlloDictionary.lookupDetailed = vi.fn().mockResolvedValueOnce({ entry: null, reason }).mockResolvedValueOnce({ entry: dictionaryEntry });
    await click(word('English'));
    expect([...host.querySelectorAll('[role="status"]')].some(node => node.textContent.includes(message))).toBe(true);
    await click(host.querySelector('[data-dictionary-retry="definition"]'));
    expect(host.textContent).toContain('The edge of a river.'); expect(host.textContent).not.toContain(message);
    expect(f.callGemini).not.toHaveBeenCalled(); expect(window.AlloDictionary.lookup).not.toHaveBeenCalled();
  });
  it('explains dictionary language coverage without fetching the wrong pane', async () => {
    window.__alloStudentAiDisabled = true; const f = mount({ studentAiFeaturesHidden: true }); await click(word('Spanish'));
    expect(host.textContent).toContain('Dictionary entries are available for individual English words.');
    expect(window.AlloDictionary.lookup).not.toHaveBeenCalled(); expect(f.callGemini).not.toHaveBeenCalled();
    expect(host.querySelector('[data-dictionary-retry]')).toBeNull();
  });
  it.each(['definition', 'phonics'])('shows a retryable %s timeout with useful dictionary help intact', async kind => {
    vi.useFakeTimers(); window.AlloFlowConfig = { timeouts: { readingLookupMs: 1000 } };
    const f = mount({ interactionMode: kind === 'definition' ? 'define' : 'phonics' }); await click(word('English'));
    await act(async () => f.dictionary.resolve(dictionaryEntry));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(host.textContent).toContain('AI word help took too long.'); expect(host.textContent).toContain(kind === 'definition' ? 'The edge of a river.' : '/bæŋk/');
    expect(f.callGemini.mock.calls[0][5].aborted).toBe(true);
    await click(host.querySelector('[data-lookup-retry="' + kind + '"]'));
    await act(async () => f.requests[1].resolve(kind === 'definition' ? 'Beside water.' : JSON.stringify({ ipa: 'bank', syllables: ['bank'] })));
    expect(host.textContent).not.toContain('AI word help took too long.');
  });
  it('retries a failed picture without reselection and retains focus through loading and completion', async () => {
    const handleFetchWordImage = vi.fn(), f = mount({ handleFetchWordImage }); await click(word('English'));
    await act(async () => f.requests[0].resolve('The edge of a river.'));
    const button = host.querySelector('[data-lookup-picture-retry]'); button.focus();
    await click(button); expect(handleFetchWordImage).toHaveBeenLastCalledWith('bank');
    await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageError: true })));
    expect(host.querySelector('[data-lookup-picture-retry]')).toBe(button); expect(button.textContent).toBe('Try picture again'); expect(document.activeElement).toBe(button);
    window.getSelection().removeAllRanges(); await click(button); expect(handleFetchWordImage).toHaveBeenCalledTimes(2);
    await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageLoading: true, imageError: false })));
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-busy')).toBe('true');
    await click(button); expect(handleFetchWordImage).toHaveBeenCalledTimes(2);
    await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageLoading: false, imageUrl: 'https://example.test/bank.png' })));
    expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(host.querySelector('[data-lookup-picture] img').alt).toBe('bank');
    await click(button); expect(handleFetchWordImage).toHaveBeenCalledTimes(2);
    await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(host.querySelector('[data-lookup-picture]')).toBeNull();
  });
  it('keeps picture retry available after another failure without changing useful word help', async () => {
    const handleFetchWordImage = vi.fn(), f = mount({ handleFetchWordImage }); await click(word('English'));
    await act(async () => { f.requests[0].resolve('The edge of a river.'); f.dictionary.resolve(dictionaryEntry); });
    await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageError: true })));
    const button = host.querySelector('[data-lookup-picture-retry]'); await click(button);
    await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageLoading: true, imageError: false })));
    await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageLoading: false, imageError: true })));
    expect(button.textContent).toBe('Try picture again'); expect(button.getAttribute('aria-disabled')).toBe('false');
    expect(f.state.definitionData).toMatchObject({ text: 'The edge of a river.', dictionary: dictionaryEntry });
    expect(f.callGemini).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])('disables new pictures while preserving existing picture=%s when AI is turned off', async ready => {
    const handleFetchWordImage = vi.fn(), f = mount({ handleFetchWordImage }); await click(word('English'));
    await act(async () => f.requests[0].resolve('The edge of a river.'));
    if (ready) await act(async () => f.state.setDefinitionData(prev => ({ ...prev, imageUrl: 'https://example.test/bank.png' })));
    window.__alloStudentAiDisabled = true; f.rerender({ studentAiFeaturesHidden: true });
    expect(host.querySelector('[data-lookup-picture-retry]')).toBeNull(); expect(handleFetchWordImage).not.toHaveBeenCalled();
    if (ready) expect(host.querySelector('[data-lookup-picture] img')).not.toBeNull();
    else expect(host.textContent).toContain('New AI pictures are off.');
  });
});
