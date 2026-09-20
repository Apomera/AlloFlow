import React from '../../desktop/web-app/node_modules/react/index.js';
import { createRoot } from '../../desktop/web-app/node_modules/react-dom/client.js';
window.React = React;
window.AlloIcons = new Proxy({}, { get: () => () => null });
require('../../instructional_context_module.js');
require('../../pure_helpers_module.js');
require('../../phase_n_misc_helpers_module.js');
require('./navigation-reader-under-test.jsx');

const api = window.AlloModules.InstructionalContext;
const pure = window.AlloModules.PureHelpers;
const phase = window.AlloModules.PhaseNHelpers;
const View = window.AlloModules.SimplifiedView;
const marker = '--- ENGLISH TRANSLATION ---';
const marine = [
  'The coral reef shelters colorful fish. Parrotfish scrape algae from coral surfaces, keeping the reef healthy.',
  'Mangrove roots trap sediment along the coast. Young crabs hide among the tangled roots while birds hunt nearby.',
  'Seagrass meadows slow waves and store carbon. Green turtles graze on the long blades beneath clear water.',
  'At low tide, anemones close their soft tentacles inside sheltered pools. Hermit crabs carry borrowed shells over slippery rocks while limpets cling tightly to exposed ledges.',
  'Microscopic plankton drift beneath the sunlit surface. These tiny organisms feed silver anchovies, and the anchovies become food for larger fish and diving seabirds.',
  'Sand dunes form where coastal winds push dry grains inland. Marram grass holds the sand with branching roots, creating shelter for beetles and nesting shorebirds.',
  'Fresh water from the river meets salty seawater in the estuary. The changing mixture supports oysters, flounder, and migrating birds searching for food in shallow channels.',
  'A salt marsh floods during high tides and drains through narrow creeks. Cordgrass stems slow the flowing water while muddy soil stores nutrients and buried plant material.',
  'Towering kelp forests sway in cool ocean currents. Sea otters eat purple sea urchins, helping protect the thick underwater canopy from excessive grazing.',
  'A lighthouse keeper records the arrival of a dense bank of fog. The rotating lamp warns passing vessels while a low horn echoes across the shipping channel.',
  'The research team lowers a sampling bottle to a measured depth. They record temperature, dissolved oxygen, and salinity before labeling each seawater sample for the laboratory.',
  'Volunteers remove abandoned fishing line from a rocky beach. They count plastic fragments, sort recyclable materials, and document the places where litter collects after storms.',
  'An octopus waits inside a narrow crevice until dusk. Its flexible arms explore the rocks, and its patterned skin changes color as it approaches a small wandering crab.',
  'Far offshore, a pod of dolphins follows a school of mackerel. The animals coordinate their movements, circling the fish before swimming rapidly through the gathered school.',
  'A loggerhead turtle leaves the water after sunset and climbs above the high-tide line. She digs a deep nest, covers her eggs with sand, and returns quietly to the ocean.',
  'Deep beneath the waves, hydrothermal vents release warm mineral-rich water. Tube worms and unusual microbes flourish in darkness where sunlight never reaches the seafloor.',
  'An ocean current carries warm tropical water toward cooler northern shores. Scientists release floating instruments to trace its direction, speed, and changing surface temperature.',
  'A coastal community discusses where to protect eelgrass beds and fishing grounds. Residents compare maps, listen to ecological evidence, and agree to review the protected area each year.'
];
const extension = ' Field researchers return during another season to compare their notes carefully. They measure the same location, record the weather, and explain any uncertainty before drawing a conclusion.';
const source = '  COASTAL FIELD NOTES\r\n\r\n' + marine.map((text, i) => i < 3 ? text : text + extension).join('\r\n\r\n') + '\r\n';
const olderText = marine.map((text, i) => i === 1
  ? 'Young crabs hide among mangrove roots that trap sediment along the coast.'
  : text + (i > 3 ? ' The observers record this habitat in their field journal.' : '')).join('\n\n');
const newerText = 'NEWER COMPANION\n\n' + marine.slice().reverse().map(text => text + ' This is the newer companion.').join('\n\n');
function makeOriginal(id, text, family, unit = 'coastal-lesson', language = 'English') {
  const snapshot = api.createSourceSnapshot(text, { sourceArtifactId: family, language, selection: 'fixture-source' });
  return api.createSupportedReading(snapshot, { id, title: id === 'original-coast' ? 'Coastal field notes — original' : id, sourceFamilyId: family, unitId: unit, config: { language, grade: '5' } });
}
function makeAdapted(id, text, original, language = 'English') {
  return {
    id, type: 'simplified', title: id, data: text,
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: original.sourceFamilyId, unitId: original.unitId,
    sourceInstructionalText: api.getSourceInstructionalText(original),
    instructionalText: { role: 'supplemental', form: 'adapted', sourceArtifactId: original.sourceSnapshot.sourceArtifactId },
    config: { language, grade: '5' }
  };
}
const original = makeOriginal('original-coast', source, 'coastal-source');
const older = makeAdapted('adapted-older', olderText, original);
const newer = makeAdapted('adapted-newer', newerText, original);
const alternate = makeOriginal('alternate-original',
  'ALTERNATE ASTRONOMY SOURCE\r\n\r\n' + Array.from({ length: 18 }, (_, i) => 'Observatory record ' + (i + 1) + ': Astronomers inspect lunar rocks and measure the steep walls of impact craters. The telescope tracks distant planets while engineers calibrate sensitive cameras and compare their spectral measurements.').join('\r\n\r\n'),
  'astronomy-source', 'astronomy-lesson');
const ambiguousOriginal = makeOriginal('ambiguous-original', [marine[1], marine[0], marine[1]].join('\r\n\r\n'), 'ambiguous-source', 'ambiguous-lesson');
const ambiguous = makeAdapted('adapted-ambiguous', marine[1], ambiguousOriginal);
const weak = makeAdapted('adapted-unavailable', 'Astronauts inspect lunar rocks and record crater measurements.', original);
const spanish = [
  'Los peces de colores encuentran refugio entre los corales.',
  'Los cangrejos jóvenes se esconden entre las raíces de los manglares que atrapan sedimentos junto a la costa.',
  'Las tortugas verdes comen las hojas largas de las praderas marinas.'
].join('\n\n');
const bilingual = makeAdapted('adapted-bilingual', spanish + '\n\n' + marker + '\n\n' + olderText, original, 'Spanish');
const initialHistory = [original, older, newer, alternate, ambiguousOriginal, ambiguous, weak, bilingual];
const noop = () => {};
window.navigationFixture = {
  source, olderText, newerText, marine, events: [],
  limitations: ['Synthetic source and callbacks; no live AI, real audio, cloud storage, or full host navigation.']
};
function bilingualParts(text) {
  const parts = String(text || '').split(marker);
  if (parts.length !== 2) return null;
  const sourceFull = parts[0].trim(), targetFull = parts[1].trim();
  return { sourceFull, targetFull, source: sourceFull.split(/\n{2,}/), target: targetFull.split(/\n{2,}/) };
}
function App() {
  const params = new URLSearchParams(window.location.search);
  const [history, setHistory] = React.useState(initialHistory);
  const [item, setItem] = React.useState(() => initialHistory.find(row => row.id === params.get('item')) || older);
  const [compare, setCompare] = React.useState(params.get('compare') === '1');
  const [mode, setMode] = React.useState('read');
  const [playing, setPlaying] = React.useState(false);
  const [playingId, setPlayingId] = React.useState(null);
  const [focused, setFocused] = React.useState(null);
  const [lineFocus, setLineFocus] = React.useState(false);
  const [selectionMenu, setSelectionMenu] = React.useState(null);
  const [theme, setTheme] = React.useState('default');
  const editorRef = React.useRef(null);
  const events = window.navigationFixture.events;
  const stop = () => { events.push({ type: 'stop', at: performance.now() }); setPlaying(false); setPlayingId(null); };
  const open = (next, both = false) => {
    if (!next) return;
    events.push({ type: 'open', id: next.id, compare: !!both });
    stop(); setSelectionMenu(null); setMode('read'); setItem(next); setCompare(!!both);
  };
  const readOriginal = target => {
    events.push({ type: 'read-original', id: target?.id });
    const snapshot = api.getSourceSnapshot(target);
    if (!snapshot) { events.push({ type: 'missing-original' }); return; }
    const found = history.find(row => api.isSupportedOriginal(row) && api.sameReadingSourceFamily(row, target) && row.data === snapshot.text);
    if (found) open(found, false);
    else { const created = api.createSupportedReading(snapshot, { sourceFamilyId: api.getReadingSourceFamilyId(target), unitId: target.unitId }); setHistory(rows => [...rows, created]); open(created, false); }
  };
  Object.assign(window.navigationFixture, {
    state: { itemId: item.id, compare, mode, playing, playingId },
    history, open: (id, both) => open(history.find(row => row.id === id), both),
    clearEvents: () => { events.length = 0; }
  });
  const t = key => key.split('.').reduce((value, part) => value?.[part], window.fixtureStrings) || key;
  const props = {
    t, generatedContent: item, inputText: 'Ambient input must never become the source.', history, setHistory,
    gradeLevel: '5', leveledTextLanguage: item.config?.language || 'English', studentInterests: [],
    selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: true, isEditingLeveledText: false,
    isImmersiveReaderActive: false, isCompareMode: compare, isSideBySide: false, isZenMode: true,
    isProcessing: false, isPlaying: playing, playingContentId: playingId,
    interactionMode: mode, setInteractionMode: setMode, setIsCompareMode: setCompare,
    setIsFluencyMode: noop, setGeneratedContent: setItem, textEditorRef: editorRef,
    selectionMenu, setSelectionMenu, setIsCustomReviseOpen: noop, setRevisionData: noop, setPhonicsData: noop,
    closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop,
    splitTextToSentences: text => pure.splitTextToSentences(text, {}),
    getSideBySideContent: bilingualParts, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop,
    stopPlayback: stop,
    handleSpeak: (text, id, index, restart, language) => {
      events.push({ type: 'speak', text, id, language, at: performance.now() });
      setPlayingId(id); setPlaying(true);
    },
    handleWordClick: (word, event, context) => events.push({ type: 'define', word, context }),
    handlePhonicsClick: (word, event, context) => events.push({ type: 'phonics', word, context }),
    handleQuickAddGlossary: noop, isLineFocusMode: lineFocus, setIsLineFocusMode: setLineFocus,
    focusedParagraphIndex: focused, setFocusedParagraphIndex: setFocused,
    cursorStyles: { read: '', define: '', phonics: '', revise: '' },
    getContentDirection: language => /Arabic|Hebrew|^ar$|^he$/i.test(language || '') ? 'rtl' : 'ltr',
    isRtlLang: language => /Arabic|Hebrew|^ar$|^he$/i.test(language || ''),
    renderFormattedText: text => React.createElement('div', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, {
      highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text
    }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop,
    highlightGlossaryTerms: value => value, latestGlossary: [],
    onReadOriginal: readOriginal, onOpenReadingArtifact: open,
    readingTheme: theme, setReadingTheme: setTheme, ComplexityGauge: () => null,
    setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsZenMode: noop
  };
  return <main className="fixture-shell">
    <header className="fixture-header">
      <h1>Reading navigation QA</h1>
      <p>Selected: <output data-fixture-current>{item.id}</output> · {compare ? 'Both' : api.isSupportedOriginal(item) ? 'Original' : 'Adapted'}</p>
    </header>
    <div data-allo-anno-host="true" data-fixture-scroller className="fixture-scroller">
      <View {...props} />
      <footer className="fixture-footer">End of the selected reader view.</footer>
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
