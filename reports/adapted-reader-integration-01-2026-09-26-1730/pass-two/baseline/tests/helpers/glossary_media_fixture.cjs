function glossaryMediaProps(overrides = {}) {
  const noop = () => {};
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="white"/><path d="M48 180C18 70 130 30 206 30C220 136 145 208 48 180Z" fill="#15803d"/><path d="M42 200L180 57M83 157L80 100M122 115L166 120" stroke="#bbf7d0" stroke-width="8" fill="none"/></svg>');
  const data = [{ entryId: 'leaf', term: 'Leaf', def: 'A plant part that captures sunlight.', tier: 'Domain-Specific', image, translations: { French: 'Feuille: Une partie de la plante qui capte la lumière.' } }];
  return {
    t: key => key, generatedContent: { id: 'glossary-media', type: 'glossary', language: 'English', data },
    filteredGlossaryData: data.map((item, index) => ({ ...item, _originalIdx: index })),
    history: [], selectedLanguages: ['French'], displayLanguages: ['French'],
    currentUiLanguage: 'English', leveledTextLanguage: 'English', activeView: 'glossary',
    isTeacherMode: true, gradeLevel: '5th Grade', inputText: '', glossaryFilter: 'all',
    glossarySearchTerm: '', newGlossaryTerm: '', glossaryRefinementInputs: {},
    isGeneratingTermImage: {}, isGeneratingEtymology: {}, flashcardOptions: [],
    flashcardIndex: 0, flashcardMode: 'standard', standardDeckLang: 'English Only',
    showFlashcardImages: true, rosterQueue: [], selectedLetters: [], foundWords: [],
    getRows: () => 2, isRtlLang: () => false, fisherYatesShuffle: value => value,
    setFlashcardIndex: noop, setGlossarySearchTerm: noop, setPlayingContentId: noop,
    setIsGeneratingAudio: noop, stopPlayback: noop, handleSpeak: noop,
    handleDownloadAudio: noop, setGlossaryImageSize: noop, setGlossaryFilter: noop,
    handleSetGlossaryFilterToAll: noop, handleSetGlossaryFilterToAcademic: noop,
    handleSetGlossaryFilterToDomain: noop, handleToggleIsEditingGlossary: noop,
    handleGenerateTermImage: noop, handleDeleteTermImage: noop, handleGlossaryChange: noop,
    handleGlossarySelectionChange: noop, handleGlossarySelectAll: noop,
    setNewGlossaryTerm: noop, addToast: noop, ...overrides,
  };
}
module.exports = { glossaryMediaProps };
