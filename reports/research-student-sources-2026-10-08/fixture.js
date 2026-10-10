(() => {
  const h = React.createElement;
  const helpers = window.AlloModules.createTextPipelineHelpers();
  window.AlloModules.TextPipelineHelpers = helpers;
  const api = window.AlloModules.StudentSources;
  const View = window.AlloModules.SimplifiedView;
  const pure = window.AlloModules.PureHelpers;
  const sourceText = 'Clouds form when rising air cools and water vapor condenses.\nSmall droplets gather around particles in the air.';
  const body = '## How Clouds Form\n\nClouds form when rising air cools. [1](https://science.example.edu/clouds%28formation%29)\n\nOur class observed small clouds above the field. [Document 1](#allo-doc-approved)\n\nCloud observations can be recorded over time. [Document 2](#allo-doc-private)\n\nDifferent cloud shapes can bring different weather. [2](https://weather.example.edu/shapes)\n\nClouds change as the air moves. [3](https://weather.example.edu/movement)';
  const original = body + '\n\n### Source Text References\n\n1. [Cloud formation reference](https://science.example.edu/clouds%28formation%29)\n2. [Cloud shapes search result](https://weather.example.edu/shapes)\n3. [Cloud movement reference](https://weather.example.edu/movement)\n4. Printed book, 2020.\n\n### Your Document References\n\nPRIVATE_FILENAME_SENTINEL\n\nPRIVATE_PASSAGE_SENTINEL\n\n### Research Review\n\nPRIVATE_SEARCH_HISTORY_SENTINEL';
  const supplied = [
    { id: 'web', kind: 'web', url: 'https://science.example.edu/clouds%28formation%29', title: 'Cloud formation reference', passage: sourceText, evidenceType: 'Page excerpt', locatorLabel: 'Paragraphs 2-3' },
    { id: 'approved', kind: 'document', title: 'Classroom field notes', shareWithStudents: true, passage: 'We observed small clouds above the warm field on Tuesday.', evidenceType: 'Document passage', locatorLabel: 'Page 1' },
    { id: 'private', kind: 'document', title: 'PRIVATE_FILENAME_SENTINEL', shareWithStudents: false, passage: 'PRIVATE_PASSAGE_SENTINEL', evidenceType: 'Document passage', locatorLabel: 'PRIVATE_LOCATOR_SENTINEL' },
    { id: 'snippet', kind: 'web', url: 'https://weather.example.edu/shapes', title: 'Cloud shapes search result', passage: 'Cloud shapes can help describe weather conditions.', evidenceType: 'Search snippet' },
    { id: 'note', kind: 'web', url: 'https://weather.example.edu/movement', title: 'Cloud movement reference', passage: 'Clouds appear to move as winds carry moisture through the atmosphere.', evidenceType: 'Source-linked AI note' }
  ];
  const captured = api.capture({ supplied, citedIds: supplied.map(item => item.id), documents: { supplied: [{ id: 'approved' }, { id: 'private' }] } }, original, { writingMode: 'synthesis' });
  const safeText = api.publicText(original, captured);
  const safeRecord = api.forText(captured, safeText);
  window.fixture = { sourceText, captured, safeText, safeRecord, calls: [], raw: original };
  document.addEventListener('click', event => {
    if (event.target.closest?.('a[href^="#allo-doc-"]')) fixture.calls.push('legacy-document-viewer');
  });
  const noop = () => {};
  const inline = value => {
    const text = String(value || ''), pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const result = []; let match, at = 0;
    while ((match = pattern.exec(text))) {
      result.push(text.slice(at, match.index));
      result.push(h('a', { href: match[2], key: match.index, className: 'text-indigo-800 underline' }, match[1]));
      at = pattern.lastIndex;
    }
    result.push(text.slice(at)); return result;
  };
  function App() {
    const [mode, setMode] = React.useState('reviewed');
    const [interactionMode, setInteractionMode] = React.useState('read');
    const [readingTheme, setReadingTheme] = React.useState('default');
    const data = mode === 'reviewed' ? safeText : body.split('\n\n').slice(0, 2).join('\n\n') + '\n\n### Source Text References\n\n1. [Cloud formation reference](https://science.example.edu/clouds%28formation%29)';
    const generatedContent = React.useMemo(() => ({ id: mode, type: 'simplified', data, title: 'How Clouds Form', config: { language: 'English' }, studentSources: mode === 'reviewed' ? safeRecord : undefined }), [mode, data]);
    const props = {
      generatedContent, history: [], t: key => key, isTeacherMode: false, studentAiFeaturesHidden: true, isZenMode: true, interactionMode, readingTheme,
      readingLearnerKey: 'student|preview', studentInterests: [], gradeLevel: '5', leveledTextLanguage: 'English', latestGlossary: [], playbackState: { currentIdx: -1 }, cursorStyles: {},
      setInteractionMode, setReadingTheme, setIsCompareMode: noop, setIsFluencyMode: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop, setFocusedParagraphIndex: noop,
      closeDefinition: noop, closePhonics: noop, closeRevision: noop, stopPlayback: noop, handleSpeak: (...args) => fixture.calls.push(args), callTTS: noop, handleWordClick: noop, handlePhonicsClick: noop, handleAnalyzePOS: noop, handleSetIsSyntaxGameToTrue: noop,
      handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, setGeneratedContent: noop, setHistory: noop,
      setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleFormatText: noop, handleTextMouseUp: noop, textEditorRef: React.useRef(null),
      splitTextToSentences: value => pure.splitTextToSentences(value, {}), splitReferencesFromBody: helpers.splitReferencesFromBody,
      getSideBySideContent: () => null, getContentDirection: () => 'ltr', isRtlLang: () => false,
      formatInteractiveText: inline, renderFormattedText: inline, highlightGlossaryTerms: inline,
      SourceReferencesPanel: ({ referencesText }) => h('div', { 'data-legacy-references': true }, referencesText), ComplexityGauge: () => null
    };
    return h(React.Fragment, null,
      h('header', { style: { marginBottom: 18, borderBottom: '1px solid #cbd5e1', paddingBottom: 14 } },
        h('h1', { style: { fontSize: 22, fontWeight: 700, marginBottom: 6 } }, 'Student sources preview'),
        h('p', { style: { fontSize: 13, marginBottom: 12 } }, 'Local test reading with simulated sources. No live research or AI requests.'),
        h('label', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 } }, 'Reading', h('select', { id: 'fixture-mode', value: mode, onChange: event => setMode(event.target.value), style: { minHeight: 44, maxWidth: '100%', border: '1px solid #94a3b8', padding: 8, borderRadius: 4 } }, h('option', { value: 'reviewed' }, 'Reviewed sources'), h('option', { value: 'basic' }, 'Basic links-only research')))),
      h(View, props));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
