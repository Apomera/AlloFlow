/* Local acceptance fixture. Only the HTTP response is simulated; the Gemini transport and research engine are canonical. */
(function () {
  const no = () => {};
  const t = (key, vars) => {
    const value = key.split('.').reduce((object, part) => object && object[part], window.fixtureStrings);
    return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, name) => vars?.[name] ?? '') : key;
  };
  window.__alloUtils = { ...AlloModules.TextPipelineHelpers, cleanJson: value => String(value || '').trim(), safeJsonParse: value => { try { return JSON.parse(value); } catch (_) { return null; } } };
  window.auditCalls = [];
  window.auditQueries = [];
  window.auditReads = [];
  window.auditAborts = 0;
  window.auditMode = 'ok';
  window.auditTranscript = [
    'Clouds form when rising air cools and water vapor condenses onto tiny particles. The droplets and ice crystals become visible as a cloud.',
    'Cloud formation depends on humidity and temperature. Rising air expands and cools, allowing moisture to condense in the atmosphere.',
    'Observing cloud shapes can tell us about conditions in the atmosphere. Tall clouds often form where warm air continues rising.'
  ].join('\n\n');
  window.LumenStudy = { firstPartyFetchWebSource: async (ctx, url) => {
    auditReads.push(url);
    return { url, title: 'Cloud webpage', text: 'Cloud formation begins when rising air cools. Water vapor condenses onto small particles, producing droplets visible from the ground.' };
  } };
  Object.defineProperty(WebSearchProvider, '_isCanvas', { value: true });
  window.ALLOFLOW_CANVAS_SEARCH_PROXY = 'https://synthetic.invalid/search';
  WebSearchProvider._fetchSerper = async query => {
    auditQueries.push(query);
    return [{ title: 'Cloud video link', url: 'https://youtu.be/AbCdEfGhI_1', snippet: '' }];
  };
  const api = AlloModules.createGeminiAPI({
    apiKey: 'synthetic-preview-key', _isCanvasEnv: false,
    GEMINI_MODELS: { default: 'synthetic-preview-model', fallback: 'synthetic-preview-model' },
    optimizeImage: async value => value, warnLog: no, debugLog: no,
    fetchWithExponentialBackoff: async (url, options) => {
      const payload = JSON.parse(options.body);
      auditCalls.push({ url, payload });
      if (window.auditMode === 'pending') await new Promise((resolve, reject) => {
        window.auditRelease = resolve;
        const abort = () => { auditAborts++; reject(Object.assign(new Error('Synthetic request aborted'), { name: 'AbortError' })); };
        if (options.signal?.aborted) abort(); else options.signal?.addEventListener('abort', abort, { once: true });
      });
      const value = window.auditMode === 'unavailable' ? { status: 'unavailable', title: '', transcript: '' }
        : { status: 'ok', title: 'Cloud formation video', transcript: auditTranscript };
      const response = { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] }, finishReason: 'STOP' }], modelVersion: 'synthetic-preview-model' };
      return { ok: true, status: 200, text: async () => JSON.stringify(response) };
    }
  });
  window.callGemini = api.callGemini;
  const state = window.auditState = {
    inputText: 'PRIVATE_EXISTING_READING', generatedContent: { text: 'Existing adapted reading' }, activeView: 'output', error: null,
    gradeLevel: '5th Grade', sourceLevel: '5th Grade', sourceTopic: 'How clouds form',
    sourceLength: '250', sourceTone: 'Informative', sourceVocabulary: 'PRIVATE_VOCABULARY', sourceCustomInstructions: 'PRIVATE_TEACHER_INSTRUCTIONS',
    targetStandards: [], standardsPromptString: 'PRIVATE_STANDARDS', studentInterests: ['PRIVATE_STUDENT_INTEREST'], selectedConcepts: [], selectedLanguages: [],
    currentUiLanguage: 'English', leveledTextLanguage: 'English', ai: { backend: 'gemini' }, webSearchProvider: WebSearchProvider,
    useOwnSources: false, documentsOnly: false, selectedOwnSourceIds: undefined, includeSourceCitations: true,
    showSourceGen: true, isGeneratingSource: false, generationStep: '', alloBotRef: { current: null },
    aiStandardQuery: '', aiStandardRegion: '', standardMode: 'manual', standardInputValue: '', suggestedStandards: [],
    isFindingStandards: false, isIndependentMode: false
  };
  let refresh = no;
  Object.keys(state).forEach(key => {
    state['set' + key[0].toUpperCase() + key.slice(1)] = value => {
      state[key] = typeof value === 'function' ? value(state[key]) : value;
      refresh();
    };
  });
  const engine = window.auditEngine = AlloModules.createContentEngine({ getState: () => state, callGemini: api.callGemini, t, addToast: no, flyToElement: no });
  function App() {
    const [, update] = React.useReducer(value => value + 1, 0);
    refresh = update;
    return React.createElement('main', { style: { padding: 16, maxWidth: 820, margin: 'auto' } },
      React.createElement('p', { style: { fontSize: 13, marginBottom: 16 } }, 'Local YouTube research preview. Video responses and webpage text are simulated; no live API requests are made.'),
      React.createElement('button', { type: 'button', onClick: () => state.setShowSourceGen(true), style: { minHeight: 44, textDecoration: 'underline' } }, 'Reopen source generator'),
      React.createElement('p', { id: 'audit-error', role: 'alert' }, state.error || ''),
      React.createElement(AlloModules.SourceGenPanel, { ...state, t, addToast: no,
        handleGenerateSource: options => engine.handleGenerateSource(options), handleAddStandard: no, handleFindStandards: no,
        handleRemoveStandard: no, handleSetStandardModeToAi: no, handleSetStandardModeToManual: no }),
      React.createElement('pre', { id: 'audit-output', style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 24 } }, state.inputText));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();
