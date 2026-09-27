import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadReadingLookupCandidate } from './reading_lookup_candidate.js';

beforeAll(() => {
  window.__alloUtils = { cleanJson: value => value };
  loadReadingLookupCandidate();
});
const fixtures = [];
afterEach(() => {
  fixtures.splice(0).forEach(f => { f.engine().closeDefinition(); f.engine().closePhonics(); });
  document.body.replaceChildren();
  window.getSelection().removeAllRanges();
  delete window.AlloDictionary;
  delete window.callGemini;
  delete window.__alloStudentAiDisabled;
  delete window.__alloLoadPlugin;
  delete window.AlloFlowConfig;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
const entry = { word: 'bank', phonetic: '/bæŋk/', audio: 'https://example.test/bank.wav', meanings: [{ definitions: [{ definition: 'The land beside a river.' }] }] };
const phonics = JSON.stringify({ ipa: 'bæŋk', phoneticSpelling: 'bank', syllables: ['bank'] });
function fixture({ providerUnavailable = false } = {}) {
  let state = { activeView: 'simplified', interactionMode: 'define', gradeLevel: '9', sourceTopic: 'Unrelated ambient topic', leveledTextLanguage: 'French', selectedVoice: 'Kore', voiceSpeed: 1,
    generatedContent: { id: 'saved', type: 'simplified', data: 'El banco.\n--- ENGLISH TRANSLATION ---\nThe river bank.', config: { grade: '3', language: 'Spanish' } } };
  for (const key of ['definitionData', 'phonicsData', 'selectionMenu']) state['set' + key[0].toUpperCase() + key.slice(1)] = value => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  const requests = [], dictionary = deferred();
  const callGemini = vi.fn(() => { const request = deferred(); requests.push(request); return request.promise; });
  const callTTS = vi.fn().mockResolvedValue(null), addToast = vi.fn();
  window.AlloDictionary = { lookup: vi.fn(() => dictionary.promise) };
  const engine = () => window.AlloModules.createContentEngine({ getState: () => state, callGemini: providerUnavailable ? undefined : callGemini, callTTS, addToast, t: key => key });
  const result = { get state() { return state; }, rerender: () => { state = { ...state }; return engine(); }, engine, requests, dictionary, callGemini, callTTS, addToast };
  fixtures.push(result); return result;
}
function selectedWord(language = 'English', word = 'bank', before = 'The river ') {
  const block = document.createElement('p'); block.dataset.readingLanguage = language; block.dataset.readingParagraph = 'selected';
  block.append(document.createTextNode(before)); const selected = document.createElement('span'); selected.textContent = word; block.append(selected, document.createTextNode(' is steep.'));
  document.body.append(block);
  return { block, selected, event: { stopPropagation: vi.fn(), currentTarget: selected, clientX: 5, clientY: 10 } };
}
const start = (f, kind, event) => kind === 'definition' ? f.engine().handleWordClick('bank', event) : f.engine().handlePhonicsClick('bank', event, { audioPlayback: 'reader' });
const popup = (f, kind) => f.state[kind === 'definition' ? 'definitionData' : 'phonicsData'];

describe.each(['definition', 'phonics'])('%s live AI availability', kind => {
  it('classifies a missing provider separately and retries the captured request when it returns', async () => {
    const f = fixture({ providerUnavailable: true });
    await start(f, kind, selectedWord().event); f.dictionary.resolve(entry); await settle();
    const initial = popup(f, kind), request = initial.lookupRequest;
    expect(initial).toMatchObject({ aiStatus: 'error', aiErrorReason: 'not_available', dictionary: entry });
    expect(initial.getAiAvailability()).toBe('unavailable'); expect(f.callGemini).not.toHaveBeenCalled();
    window.callGemini = f.callGemini;
    f.state.gradeLevel = '12'; f.state.leveledTextLanguage = 'German'; document.body.replaceChildren();
    expect(initial.getAiAvailability()).toBe('ready');
    const pending = initial.retry();
    expect(popup(f, kind).lookupRequest).toBe(request); expect(popup(f, kind).dictionary).toBe(entry);
    expect(f.callGemini.mock.calls[0][0]).toContain('The river bank is steep.');
    if (kind === 'definition') expect(f.callGemini.mock.calls[0][0]).toContain('for a 3 student');
    f.requests[0].resolve(kind === 'definition' ? 'A river edge.' : phonics); await pending;
    expect(popup(f, kind).aiStatus).toBe('ready'); expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(1);
  });
  it.each(['state-policy', 'provider-guard'])('rechecks %s before starting or retrying AI work', async guard => {
    const f = fixture(), blocked = vi.fn(); blocked._alloQrBlocked = true;
    if (guard === 'state-policy') f.state.studentAiFeaturesHidden = true; else window.callGemini = blocked;
    await start(f, kind, selectedWord().event);
    const initial = popup(f, kind), request = initial.lookupRequest;
    expect(initial.aiStatus).toBe('disabled'); expect(f.callGemini).not.toHaveBeenCalled(); expect(blocked).not.toHaveBeenCalled();
    f.state.studentAiFeaturesHidden = false; window.callGemini = f.callGemini;
    expect(initial.getAiAvailability()).toBe('ready');
    const pending = initial.retry(); f.requests[0].reject(new Error('Offline')); await pending;
    f.state.studentAiFeaturesHidden = true;
    await initial.retry(); expect(f.callGemini).toHaveBeenCalledTimes(1);
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'disabled', lookupRequest: request });
    f.engine()[kind === 'definition' ? 'closeDefinition' : 'closePhonics']();
    f.state.studentAiFeaturesHidden = false; await initial.retry();
    expect(popup(f, kind)).toBeNull(); expect(f.callGemini).toHaveBeenCalledTimes(1);
  });
});

describe('reading lookup keeps artifact and selected occurrence context', () => {
  it.each(['English', 'Spanish'])('recovers %s from the clicked pane while ambient settings differ', async language => {
    const f = fixture(), selected = selectedWord(language);
    const pending = start(f, 'definition', selected.event);
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt).toContain('for a 3 student'); expect(prompt).toContain('Output Language: ' + language);
    expect(prompt).toContain('The river bank is steep.'); expect(prompt).not.toContain('Unrelated ambient topic');
    expect(f.state.definitionData.language).toBe(language);
    expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(language === 'English' ? 1 : 0);
    f.requests[0].resolve('A river edge.'); await pending;
  });
  it.each(['English', 'Spanish'])('preserves %s phonics language and contextual pronunciation', async language => {
    const f = fixture(), selected = selectedWord(language, 'lead', 'The metal ');
    const pending = f.engine().handlePhonicsClick('lead', selected.event, { audioPlayback: 'reader' });
    expect(f.callGemini.mock.calls[0][0]).toContain('Analyze the ' + language + ' word');
    expect(f.callGemini.mock.calls[0][0]).toContain('The metal lead is steep.');
    expect(f.state.phonicsData.language).toBe(language);
    f.requests[0].resolve(phonics); await pending; expect(f.callTTS).not.toHaveBeenCalled();
  });
  it('uses the recorded complexity target ahead of legacy and ambient grade', async () => {
    const f = fixture(); f.state.generatedContent.instructionalText = { complexity: { requestedGrade: '2' } }; f.state.generatedContent.targetGradeLevel = '4';
    const pending = start(f, 'definition', selectedWord().event);
    expect(f.callGemini.mock.calls[0][0]).toContain('for a 2 student');
    f.requests[0].resolve('A river edge.'); await pending;
  });
  it('identifies a repeated word and excludes inline help from the passage', async () => {
    const f = fixture(), selected = selectedWord('English', 'bank', 'The bank lent money. The river ');
    const gloss = document.createElement('span'); gloss.dataset.readingGloss = ''; gloss.textContent = 'UNRELATED HELP'; selected.block.insertBefore(gloss, selected.selected);
    const pending = start(f, 'definition', selected.event);
    const request = f.state.definitionData.lookupRequest;
    expect(request.passageText).toBe('The bank lent money. The river bank is steep.');
    expect(request.selectionStart).toBe('The bank lent money. The river '.length);
    expect(f.callGemini.mock.calls[0][0]).not.toContain('UNRELATED HELP');
    f.requests[0].resolve('A river edge.'); await pending;
  });
  it('retains phrase selection context and grade after browser selection is cleared', async () => {
    const f = fixture(), selected = selectedWord('English', 'river bank', 'Walk beside the ');
    selected.block.dataset.readingPassage = 'true';
    const range = document.createRange(); range.selectNodeContents(selected.selected); range.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10 });
    const selection = window.getSelection(); selection.addRange(range);
    f.engine().handleTextMouseUp({ currentTarget: selected.block });
    expect(f.state.selectionMenu.language).toBe('English'); selection.removeAllRanges();
    const pending = f.rerender().handleDefineSelection();
    expect(f.state.selectionMenu).toBeNull();
    expect(f.callGemini.mock.calls[0][0]).toContain('Walk beside the river bank is steep.');
    expect(f.callGemini.mock.calls[0][0]).toContain('for a 3 student');
    expect(window.AlloDictionary.lookup).not.toHaveBeenCalled();
    f.requests[0].resolve('The land beside water.'); await pending;
  });
});

describe.each(['definition', 'phonics'])('%s source ownership and recovery', kind => {
  it.each(['dictionary-first', 'ai-first'])('preserves dictionary help when AI fails (%s)', async order => {
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    if (order === 'dictionary-first') { f.dictionary.resolve(entry); await settle(); }
    f.requests[0].reject(new Error('Provider unavailable')); await pending;
    if (order === 'ai-first') { f.dictionary.resolve(entry); await settle(); }
    expect(popup(f, kind)).toMatchObject({ word: 'bank', aiStatus: 'error', isLoading: false, dictionaryStatus: 'ready', dictionary: { audio: entry.audio } });
    expect(f.addToast).not.toHaveBeenCalled();
  });
  it('retries without reselection or losing independently loaded data', async () => {
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    f.dictionary.resolve(entry); f.requests[0].reject(new Error('Try again')); await pending; await settle();
    const initial = popup(f, kind).lookupRequest, retry = popup(f, kind).retry;
    f.state.gradeLevel = '12'; f.state.leveledTextLanguage = 'German'; f.rerender(); document.body.replaceChildren();
    const second = retry();
    expect(popup(f, kind).lookupRequest).toBe(initial); expect(popup(f, kind).dictionary.audio).toBe(entry.audio);
    expect(f.callGemini.mock.calls[1][0]).toBe(f.callGemini.mock.calls[0][0]); expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(1);
    f.requests[1].resolve(kind === 'definition' ? 'A river edge.' : phonics); await second;
    expect(popup(f, kind).aiStatus).toBe('ready');
  });
  it.each([false, true])('ignores completion after close through a new engine instance (reject=%s)', async reject => {
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    const current = f.rerender(); current[kind === 'definition' ? 'closeDefinition' : 'closePhonics']();
    if (reject) f.requests[0].reject(new Error('Late')); else f.requests[0].resolve(kind === 'definition' ? 'Late' : phonics);
    f.dictionary.resolve(entry); await pending; await settle();
    expect(popup(f, kind)).toBeNull(); expect(f.callTTS).not.toHaveBeenCalled(); expect(f.addToast).not.toHaveBeenCalled();
  });
  it.each([false, true])('does not replace newer same-word help after a host rerender (reject=%s)', async reject => {
    const f = fixture(), first = start(f, kind, selectedWord().event);
    f.rerender(); const second = start(f, kind, selectedWord('Spanish', 'bank', 'Different occurrence ').event);
    f.requests[1].resolve(kind === 'definition' ? 'New meaning' : phonics); await second;
    if (reject) f.requests[0].reject(new Error('Old')); else f.requests[0].resolve(kind === 'definition' ? 'Old meaning' : phonics);
    f.dictionary.resolve(entry); await first; await settle();
    expect(popup(f, kind).language).toBe('Spanish'); expect(popup(f, kind).aiStatus).toBe('ready'); expect(popup(f, kind).dictionary).toBeUndefined();
    if (kind === 'definition') expect(popup(f, kind).text).toBe('New meaning');
  });
  it.each(['id', 'data', 'view'])('rejects results after navigation changes %s without relying on reader cleanup', async field => {
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    if (field === 'view') f.state.activeView = 'history'; else f.state.generatedContent = { ...f.state.generatedContent, [field]: 'changed' };
    f.requests[0].resolve(kind === 'definition' ? 'Stale' : phonics); f.dictionary.resolve(entry); await pending; await settle();
    expect(popup(f, kind).text).toBeNull(); expect(popup(f, kind).data).toBeNull(); expect(popup(f, kind).dictionary).toBeUndefined();
  });
  it('keeps dictionary-only help when AI is disabled and never invokes the provider', async () => {
    const f = fixture(); window.__alloStudentAiDisabled = true;
    await start(f, kind, selectedWord().event); f.dictionary.resolve(entry); await settle();
    expect(f.callGemini).not.toHaveBeenCalled(); expect(popup(f, kind)).toMatchObject({ aiStatus: 'disabled', dictionaryStatus: 'ready', text: null, isLoading: false });
  });
  it('settles dictionary failure without clearing the successful AI result', async () => {
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    f.dictionary.reject(new Error('Offline')); f.requests[0].resolve(kind === 'definition' ? 'A river edge.' : phonics); await pending; await settle();
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'ready', dictionaryStatus: 'unavailable' });
  });
});

it('keeps prepared help and dictionary pronunciation after malformed phonics analysis', async () => {
  const f = fixture(), pending = f.engine().handlePhonicsClick('bank', selectedWord().event, { audioPlayback: 'reader', preparedText: 'Beside the river.' });
  f.dictionary.resolve(entry); f.requests[0].resolve('{malformed'); await pending; await settle();
  expect(f.state.phonicsData).toMatchObject({ preparedText: 'Beside the river.', aiStatus: 'error', dictionaryStatus: 'ready' });
});
it('keeps prepared definitions on empty AI output and supports disabled phrase lookup', async () => {
  const f = fixture(), pending = f.engine().handleWordClick('bank', selectedWord().event, { preparedText: 'Beside the river.' });
  f.requests[0].resolve(''); await pending; expect(f.state.definitionData).toMatchObject({ preparedText: 'Beside the river.', aiStatus: 'error' });
  window.__alloStudentAiDisabled = true; f.state.selectionMenu = { text: 'river bank', language: 'English' };
  await f.rerender().handleDefineSelection(); expect(f.callGemini).toHaveBeenCalledTimes(1);
  expect(f.state.definitionData).toMatchObject({ aiStatus: 'disabled', dictionaryStatus: 'unsupported', isLoading: false });
});

describe.each(['definition', 'phonics'])('%s dictionary deadline and independent retry', kind => {
  it('times out, preserves AI help, and retries only the dictionary against the captured request', async () => {
    vi.useFakeTimers();
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    const lookup = window.AlloDictionary.lookup, firstSignal = lookup.mock.calls[0][1].signal;
    f.requests[0].resolve(kind === 'definition' ? 'The edge of a river.' : phonics); await pending;
    const initial = popup(f, kind).lookupRequest;
    await vi.advanceTimersByTimeAsync(9999); expect(popup(f, kind).dictionaryStatus).toBe('loading');
    await vi.advanceTimersByTimeAsync(1);
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'ready', dictionaryStatus: 'unavailable' });
    expect(firstSignal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    const second = deferred(); lookup.mockReturnValueOnce(second.promise);
    f.state.gradeLevel = '12'; f.rerender(); document.body.replaceChildren();
    const retry = popup(f, kind).retryDictionary(); void popup(f, kind).retryDictionary();
    expect(lookup).toHaveBeenCalledTimes(2); expect(lookup.mock.calls[1][0]).toBe('bank');
    expect(lookup.mock.calls[1][1].bypassMissingCache).toBe(true);
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'ready', dictionaryStatus: 'loading' });
    f.dictionary.resolve({ ...entry, audio: 'old.wav' }); await settle();
    expect(popup(f, kind).dictionary).toBeUndefined();
    second.resolve(entry); await retry;
    expect(popup(f, kind).lookupRequest).toBe(initial); expect(popup(f, kind).dictionary.audio).toBe(entry.audio);
    expect(popup(f, kind).dictionaryStatus).toBe('ready'); expect(f.callGemini).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('allows dictionary retry while AI is disabled and preserves a useful entry if a later retry fails', async () => {
    const f = fixture(); window.__alloStudentAiDisabled = true;
    await start(f, kind, selectedWord().event); f.dictionary.reject(new Error('Offline')); await settle();
    window.AlloDictionary.lookup.mockResolvedValueOnce(entry);
    await popup(f, kind).retryDictionary();
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'disabled', dictionaryStatus: 'ready', dictionary: { audio: entry.audio } });
    window.AlloDictionary.lookup.mockRejectedValueOnce(new Error('Offline again'));
    await popup(f, kind).retryDictionary();
    expect(popup(f, kind).dictionary.audio).toBe(entry.audio); expect(f.callGemini).not.toHaveBeenCalled();
  });
  it('aborts a retry on close and ignores late success, rejection, and saved retry callbacks', async () => {
    vi.useFakeTimers();
    const f = fixture(); window.__alloStudentAiDisabled = true;
    await start(f, kind, selectedWord().event); f.dictionary.resolve(null); await settle();
    const second = deferred(); window.AlloDictionary.lookup.mockReturnValueOnce(second.promise);
    const retryCallback = popup(f, kind).retryDictionary, retry = retryCallback();
    const signal = window.AlloDictionary.lookup.mock.calls[1][1].signal;
    f.rerender()[kind === 'definition' ? 'closeDefinition' : 'closePhonics'](); await retry;
    expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    second.reject(new Error('Late failure')); await settle(); await retryCallback();
    expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(2); expect(popup(f, kind)).toBeNull();
  });
});

it('bounds lazy-loader delay and does not launch a stale dictionary request when the old loader finally completes', async () => {
  vi.useFakeTimers();
  const f = fixture(), loader = deferred(); delete window.AlloDictionary; window.__alloStudentAiDisabled = true;
  window.__alloLoadPlugin = vi.fn(() => loader.promise);
  await start(f, 'definition', selectedWord().event);
  await vi.advanceTimersByTimeAsync(10000); expect(f.state.definitionData.dictionaryStatus).toBe('unavailable');
  window.AlloDictionary = { lookup: vi.fn().mockResolvedValue(entry) };
  await f.state.definitionData.retryDictionary(); loader.resolve(); await settle();
  expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(1); expect(f.state.definitionData.dictionaryStatus).toBe('ready');
  expect(vi.getTimerCount()).toBe(0);
});

describe.each(['English', 'Spanish'])('%s multi-block lookup context', language => {
  it.each(['p', 'li'])('captures all selected %s blocks with stable offsets and no foreign-pane text', async tag => {
    const f = fixture();
    const passage = document.createElement('div'); passage.dataset.readingPassage = 'true';
    const otherLanguage = language === 'English' ? 'Spanish' : 'English';
    const first = document.createElement(tag), last = document.createElement(tag), foreign = document.createElement('p');
    first.dataset.readingLanguage = last.dataset.readingLanguage = language; foreign.dataset.readingLanguage = otherLanguage;
    first.textContent = 'We walk beside the river bank.'; last.textContent = 'The metal lead is heavy.'; foreign.textContent = 'FOREIGN PANE';
    const heading = document.createElement('div'); heading.textContent = 'UNRELATED HEADING';
    const gloss = document.createElement('span'); gloss.dataset.readingGloss = ''; gloss.textContent = 'INLINE HELP'; first.append(gloss);
    passage.append(first, heading, foreign, last); document.body.append(passage);
    const range = document.createRange(); range.setStart(first.firstChild, 'We walk beside the '.length); range.setEnd(last.firstChild, 'The metal lead'.length);
    range.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10 }); window.getSelection().addRange(range);
    f.engine().handleTextMouseUp({ currentTarget: last });
    // Existing revision/glossary selection text is retained; lookup uses its clean projection.
    expect(f.state.selectionMenu.text).toContain('FOREIGN PANE');
    window.getSelection().removeAllRanges(); document.body.replaceChildren();
    const pending = f.rerender().handleDefineSelection(), request = f.state.definitionData.lookupRequest;
    expect(request).toMatchObject({ language, grade: '3', passageText: 'We walk beside the river bank.\nThe metal lead is heavy.', word: 'river bank.\nThe metal lead', selectionStart: 'We walk beside the '.length });
    expect(request.passageText.slice(request.selectionStart, request.selectionEnd)).toBe(request.word);
    expect(f.callGemini.mock.calls[0][0]).not.toMatch(/FOREIGN PANE|UNRELATED HEADING|INLINE HELP/);
    expect(window.AlloDictionary.lookup).not.toHaveBeenCalled();
    f.requests[0].reject(new Error('Offline')); await pending;
    const retry = f.state.definitionData.retry(); expect(f.callGemini.mock.calls[1][0]).toBe(f.callGemini.mock.calls[0][0]);
    f.requests[1].resolve('A contextual explanation.'); await retry;
  });
});

describe.each(['definition', 'phonics'])('%s bounded AI work and detailed dictionary outcomes', kind => {
  it('settles an abandoned provider immediately on close and releases all deadlines', async () => {
    vi.useFakeTimers();
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    const signal = f.callGemini.mock.calls[0][5], retry = popup(f, kind).retry;
    expect(signal.aborted).toBe(false);
    f.rerender()[kind === 'definition' ? 'closeDefinition' : 'closePhonics']();
    await pending; // The provider deliberately never settles.
    expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    await retry(); expect(f.callGemini).toHaveBeenCalledTimes(1); expect(popup(f, kind)).toBeNull();
  });
  it('aborts superseded work while keeping the new attempt and dictionary alive', async () => {
    vi.useFakeTimers();
    const f = fixture(), first = start(f, kind, selectedWord().event);
    const firstSignal = f.callGemini.mock.calls[0][5], dictionarySignal = window.AlloDictionary.lookup.mock.calls[0][1].signal;
    const second = popup(f, kind).retry(); await first;
    const secondSignal = f.callGemini.mock.calls[1][5];
    expect(firstSignal.aborted).toBe(true); expect(secondSignal.aborted).toBe(false); expect(dictionarySignal.aborted).toBe(false);
    f.requests[0].reject(new Error('Late first attempt')); await settle();
    expect(popup(f, kind).aiStatus).toBe('loading');
    f.requests[1].resolve(kind === 'definition' ? 'New meaning.' : phonics); f.dictionary.resolve(entry);
    await second; await settle();
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'ready', dictionaryStatus: 'ready' }); expect(vi.getTimerCount()).toBe(0);
  });
  it('times out without losing prepared or dictionary help and retries the captured passage', async () => {
    vi.useFakeTimers();
    const f = fixture(), event = selectedWord().event;
    const pending = kind === 'definition' ? f.engine().handleWordClick('bank', event, { preparedText: 'Beside water.' })
      : f.engine().handlePhonicsClick('bank', event, { preparedText: 'Beside water.', audioPlayback: 'reader' });
    f.dictionary.resolve(entry); await settle();
    const captured = popup(f, kind).lookupRequest, signal = f.callGemini.mock.calls[0][5];
    await vi.advanceTimersByTimeAsync(44999); expect(popup(f, kind).aiStatus).toBe('loading');
    await vi.advanceTimersByTimeAsync(1); await pending;
    expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'error', aiErrorReason: 'timeout', isLoading: false, preparedText: 'Beside water.', dictionary: entry });
    document.body.replaceChildren(); f.state.gradeLevel = '12'; f.state.leveledTextLanguage = 'German'; f.rerender();
    const second = popup(f, kind).retry();
    expect(f.callGemini.mock.calls[1][0]).toBe(f.callGemini.mock.calls[0][0]);
    expect(f.callGemini.mock.calls[1][1]).toBe(kind === 'phonics');
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'loading', aiErrorReason: null });
    f.requests[0].resolve(kind === 'definition' ? 'Stale timeout result' : phonics); await settle();
    expect(popup(f, kind).aiStatus).toBe('loading');
    f.requests[1].resolve(kind === 'definition' ? 'Land beside water.' : phonics); await second;
    expect(popup(f, kind).lookupRequest).toBe(captured); expect(popup(f, kind).dictionary).toBe(entry);
    expect(popup(f, kind).aiStatus).toBe('ready'); expect(window.AlloDictionary.lookup).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['success', 'failure'])('settles as disabled when AI turns off before provider %s', async outcome => {
    const f = fixture(), pending = start(f, kind, selectedWord().event);
    window.__alloStudentAiDisabled = true; f.dictionary.resolve(entry);
    if (outcome === 'failure') f.requests[0].reject(new Error('Unavailable')); else f.requests[0].resolve(kind === 'definition' ? 'Late help' : phonics);
    await pending; await settle();
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'disabled', isLoading: false, text: null, data: null, dictionary: entry });
    expect(f.callTTS).not.toHaveBeenCalled();
  });
  it('retains detailed failure information and recovers the dictionary with AI off', async () => {
    const f = fixture(); window.__alloStudentAiDisabled = true;
    window.AlloDictionary.lookupDetailed = vi.fn().mockResolvedValueOnce({ entry: null, reason: 'request_failed' }).mockResolvedValueOnce({ entry });
    await start(f, kind, selectedWord().event); await settle();
    expect(popup(f, kind)).toMatchObject({ aiStatus: 'disabled', dictionaryStatus: 'unavailable', dictionaryReason: 'request_failed' });
    expect(window.AlloDictionary.lookup).not.toHaveBeenCalled();
    await popup(f, kind).retryDictionary();
    expect(popup(f, kind)).toMatchObject({ dictionaryStatus: 'ready', dictionaryReason: null, dictionary: entry });
    expect(f.callGemini).not.toHaveBeenCalled();
  });
  it('reports the dictionary deadline even when fetch rejects as it is aborted', async () => {
    vi.useFakeTimers(); const f = fixture(); window.__alloStudentAiDisabled = true;
    window.AlloDictionary.lookupDetailed = vi.fn((_, { signal }) => new Promise(resolve => signal.addEventListener('abort', () => resolve({ entry: null, reason: 'cancelled' }))));
    await start(f, kind, selectedWord().event); await vi.advanceTimersByTimeAsync(10000);
    expect(popup(f, kind)).toMatchObject({ dictionaryStatus: 'unavailable', dictionaryReason: 'timeout' });
    expect(vi.getTimerCount()).toBe(0);
  });
});

it.each([[1, 1000], [2000, 2000], [999999, 180000], [0, 45000], ['invalid', 45000]])('bounds reading lookup timeout configuration %s at %s ms', async (configured, expected) => {
  vi.useFakeTimers(); window.AlloFlowConfig = { timeouts: { readingLookupMs: configured } };
  const f = fixture(), pending = start(f, 'definition', selectedWord('Spanish').event);
  await vi.advanceTimersByTimeAsync(expected - 1); expect(f.state.definitionData.aiStatus).toBe('loading');
  await vi.advanceTimersByTimeAsync(1); await pending;
  expect(f.state.definitionData.aiErrorReason).toBe('timeout'); expect(vi.getTimerCount()).toBe(0);
});
it('settles cancellation without AbortController and still guards late completion', async () => {
  vi.useFakeTimers(); vi.stubGlobal('AbortController', undefined);
  const f = fixture(), pending = start(f, 'definition', selectedWord('Spanish').event);
  expect(f.callGemini.mock.calls[0][5]).toBeNull(); f.engine().closeDefinition(); await pending;
  expect(vi.getTimerCount()).toBe(0); f.requests[0].resolve('Late'); await settle(); expect(f.state.definitionData).toBeNull();
});
it('keeps definition and phonics cancellation independent', async () => {
  const f = fixture(), definition = start(f, 'definition', selectedWord().event), analysis = start(f, 'phonics', selectedWord().event);
  f.engine().closeDefinition(); await definition;
  expect(f.callGemini.mock.calls[0][5].aborted).toBe(true); expect(f.callGemini.mock.calls[1][5].aborted).toBe(false);
  f.requests[1].resolve(phonics); await analysis; expect(f.state.phonicsData.aiStatus).toBe('ready');
});
it('classifies a missing dictionary loader as unavailable rather than a missing entry', async () => {
  const f = fixture(); delete window.AlloDictionary; window.__alloStudentAiDisabled = true;
  await start(f, 'definition', selectedWord().event); await settle();
  expect(f.state.definitionData).toMatchObject({ dictionaryStatus: 'unavailable', dictionaryReason: 'not_available' });
});

describe.each(['definition', 'phonics'])('%s media lifetime', kind => {
  it('keeps one lifetime across AI retry, then aborts it on close', async () => {
    const f = fixture(), first = start(f, kind, selectedWord().event), lifetime = popup(f, kind).lookupRequest.signal;
    f.requests[0].reject(new Error('Unavailable')); await first;
    expect(lifetime.aborted).toBe(false);
    const retry = popup(f, kind).retry(); expect(popup(f, kind).lookupRequest.signal).toBe(lifetime);
    f.requests[1].resolve(kind === 'definition' ? 'Meaning' : phonics); await retry;
    expect(lifetime.aborted).toBe(false); f.rerender()[kind === 'definition' ? 'closeDefinition' : 'closePhonics'](); expect(lifetime.aborted).toBe(true);
  });
  it('aborts the old occurrence lifetime when a new pane is selected', async () => {
    const f = fixture(), first = start(f, kind, selectedWord().event), oldSignal = popup(f, kind).lookupRequest.signal;
    const second = start(f, kind, selectedWord('Spanish').event), newSignal = popup(f, kind).lookupRequest.signal;
    await first; expect(oldSignal.aborted).toBe(true); expect(newSignal.aborted).toBe(false); expect(newSignal).not.toBe(oldSignal);
    f.requests[1].resolve(kind === 'definition' ? 'Meaning' : phonics); await second;
  });
});
