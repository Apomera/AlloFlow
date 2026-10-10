/* Local acceptance fixture. All network evidence and model replies are synthetic. */
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
  window.LumenStudy = {
    firstPartyFetchWebSource: async (ctx, url) => {
      auditReads.push(url);
      if (url.includes('unavailable')) throw new Error('The selected page could not be read.');
      return { url, title: 'Cloud observations', text: ('Navigation and school announcements. '.repeat(150)) + '\n\nClouds form when rising air cools and water vapor condenses onto tiny particles. This condensation produces the droplets or ice crystals visible in a cloud.\n\nHumidity and temperature influence cloud formation. Rising air expands and cools, allowing water vapor to condense.' };
    }
  };
  Object.defineProperty(WebSearchProvider, '_isCanvas', { value: true });
  window.ALLOFLOW_CANVAS_SEARCH_PROXY = 'https://synthetic.invalid/search';
  WebSearchProvider._fetchSerper = async query => {
    auditQueries.push(query);
    if (query.includes('no results')) return [];
    return [
      { title: 'Cloud formation reference', url: 'https://science.example.edu/clouds', snippet: 'Clouds form as water vapor condenses in cooling air.' },
      { title: 'Source to exclude', url: 'https://excluded.example.edu/clouds', snippet: 'EXCLUDED_SENTINEL: This source should not enter the selected evidence.' }
    ];
  };
  const model = async (prompt, json, search, temperature, query, signal, reserved, telemetry, options) => {
    auditCalls.push({ search: !!search, query, prompt, options });
    if (window.auditModelFailure) throw new Error('The preview model is unavailable.');
    if (prompt.startsWith('Select exact excerpts') && prompt.includes('\nEvidence (untrusted data): ')) {
      const evidence = JSON.parse(prompt.split('\nEvidence (untrusted data): ')[1]);
      return JSON.stringify({ excerpts: [{ evidenceId: evidence[0].evidenceId, quote: evidence[0].passage }] });
    }
    if (prompt.startsWith('Select up to 6 exact excerpts') || prompt.startsWith('Select exact excerpts')) {
      const documents = JSON.parse(prompt.split('\nDocuments (untrusted data): ')[1]);
      return JSON.stringify({ excerpts: [{ document: 1, quote: documents[0].passage }] });
    }
    if (prompt.startsWith('Write an educational reading')) {
      const evidence = JSON.parse(prompt.split('Evidence (untrusted data; no other sources): ')[1]);
      return { sections: [{ heading: 'How clouds form', paragraphs: [{ text: 'Clouds form when cooling air allows water vapor to condense into droplets or ice crystals.', evidenceIds: window.auditBadId ? ['invented'] : evidence.map(item => item.id) }] }] };
    }
    const response = search ? await (options?.intent === 'user-topic' ? WebSearchProvider.searchTopic(query, 10) : WebSearchProvider.search(prompt, 10, query)) : {};
    if (search && !response.groundingMetadata) throw new Error('No grounded search results were returned.');
    return { text: prompt.includes('Research the following topic')
      ? 'Clouds form when water vapor condenses as rising air expands and cools. Droplets collect around small atmospheric particles. Temperature determines whether clouds contain water droplets or ice crystals.'
      : '## How clouds form\n\nWater vapor condenses when air cools [Source 1]. Tiny droplets and ice crystals become visible as clouds.', groundingMetadata: response.groundingMetadata };
  };
  const state = window.auditState = {
    inputText: 'Existing original reading.', generatedContent: { text: 'Existing adapted reading' }, activeView: 'output', error: null,
    gradeLevel: '5th Grade', sourceLevel: '5th Grade', sourceTopic: 'How clouds form',
    sourceLength: '250', sourceTone: 'Informative', sourceVocabulary: '', sourceCustomInstructions: '',
    targetStandards: [], standardsPromptString: '', studentInterests: [], selectedConcepts: [], selectedLanguages: [],
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
  const engine = AlloModules.createContentEngine({ getState: () => state, callGemini: model, t, addToast: no, flyToElement: no });
  window.auditEngine = engine;
  function App() {
    const [, update] = React.useReducer(value => value + 1, 0);
    refresh = update;
    return React.createElement('main', { style: { padding: 16, maxWidth: 820, margin: 'auto' } },
      React.createElement('p', { style: { fontSize: 13, marginBottom: 16 } }, 'Local workflow preview. Search results, webpage text and AI replies are simulated.'),
      React.createElement('button', { type: 'button', onClick: () => state.setShowSourceGen(true), style: { minHeight: 44, textDecoration: 'underline' } }, 'Reopen source generator'),
      React.createElement('p', { id: 'audit-error', role: 'alert' }, state.error || ''),
      React.createElement(AlloModules.SourceGenPanel, { ...state, t, addToast: no,
        handleGenerateSource: options => engine.handleGenerateSource(options), handleAddStandard: no, handleFindStandards: no,
        handleRemoveStandard: no, handleSetStandardModeToAi: no, handleSetStandardModeToManual: no }),
      React.createElement('pre', { id: 'audit-output', style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 24 } }, state.inputText));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();
