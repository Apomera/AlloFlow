const fs = require('fs');
const file = 'symbol_studio_module.js';
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replace(before, after) { if (!s.includes(before)) throw new Error('Missing anchor: ' + before.slice(0,100)); s = s.replace(before, () => after); }
replace("iepGoals: 'alloSymbolIEPGoals', growthLog: 'alloGardenGrowthLog'", "iepGoals: 'alloSymbolIEPGoals', growthLog: 'alloGardenGrowthLog', stories: 'alloSavedStories'");
replace("data[field] = field === 'boards' ? source[field].map(withoutDeviceSpeechReference) : source[field];", "data[field] = field === 'boards' ? (source[field] || []).map(withoutDeviceSpeechReference) : (source[field] || (BACKUP_MAP_FIELDS.indexOf(field) >= 0 ? {} : []));");
replace("['label', 'title', 'name', 'text', 'description', 'category', 'profileId', 'date']", "['label', 'title', 'name', 'text', 'description', 'category', 'profileId', 'date', 'situation', 'details', 'studentName', 'image', 'imagePrompt']");
replace("      if (field === 'profiles'", "      if (field === 'stories' && (!Array.isArray(row.pages) || !row.pages.length)) throw new Error('A saved story must contain pages.');\n      if (field === 'profiles'");
replace("    result.books = result.books.map(normalizeVisualPack);", "    result.books = result.books.map(normalizeVisualPack);\n    result.stories = normalizeStoredRows('alloSavedStories', result.stories);");
replace("      if (base === 'alloSymbolIEPGoals') {", `      if (base === 'alloSavedStories') {
        copy.title = typeof row.title === 'string' && row.title.trim() ? row.title.trim().slice(0, 120) : 'Untitled story';
        ['situation', 'details', 'studentName'].forEach(function (key) { copy[key] = typeof row[key] === 'string' ? row[key] : ''; });
        copy.pages = (Array.isArray(row.pages) ? row.pages : []).filter(isStoredRecord).map(function (page) {
          return { id: typeof page.id === 'string' && page.id ? page.id : uid(), text: typeof page.text === 'string' ? page.text : '', image: typeof page.image === 'string' ? page.image : null, imagePrompt: typeof page.imagePrompt === 'string' ? page.imagePrompt : '' };
        });
      }
      if (base === 'alloSymbolIEPGoals') {`);
replace("base === STORAGE_SCHEDULES || base === 'alloSymbolIEPGoals') return normalizeStoredRows", "base === STORAGE_SCHEDULES || base === 'alloSymbolIEPGoals' || base === 'alloSavedStories') return normalizeStoredRows");
replace("    // Custom story templates", `    // Completed stories are independent, learner-owned snapshots, separate from prompt templates.
    var _savedStoryLibrary = useState(function () { return { profileId: activeProfileId, rows: loadScoped('alloSavedStories', [], activeProfileId) }; });
    var savedStoryLibrary = _savedStoryLibrary[0]; var setSavedStoryLibrary = _savedStoryLibrary[1];
    var savedStories = savedStoryLibrary.profileId === activeProfileId ? savedStoryLibrary.rows : [];
    var savedStoryLibraryRef = useRef(savedStoryLibrary); savedStoryLibraryRef.current = savedStoryLibrary;
    var _savedStoryTitle = useState(''); var savedStoryTitle = _savedStoryTitle[0]; var setSavedStoryTitle = _savedStoryTitle[1];
    var savedStoryTitleRef = useRef(savedStoryTitle); savedStoryTitleRef.current = savedStoryTitle;
    var _storyLibraryNotice = useState(null); var storyLibraryNotice = _storyLibraryNotice[0]; var setStoryLibraryNotice = _storyLibraryNotice[1];
    var storyLibraryDraftRef = useRef(null);
    storyLibraryDraftRef.current = { pages: storyPages, situation: storySituation, details: storyDetails, studentName: storyStudentName, edit: storyTextEdit, generating: storyGenerating, illustrating: storyIllustrating };
    useEffect(function () {
      var library = { profileId: activeProfileId, rows: loadScoped('alloSavedStories', [], activeProfileId) };
      savedStoryLibraryRef.current = library; setSavedStoryLibrary(library);
      savedStoryTitleRef.current = ''; setSavedStoryTitle(''); setStoryLibraryNotice(null);
    }, [activeProfileId]);
    useEffect(function () { setStoryLibraryNotice(null); }, [isOpen]);

    // Custom story templates`);
replace("boards: savedBoards, schedules: savedSchedules, books: books, familiarity:", "boards: savedBoards, schedules: savedSchedules, books: books, stories: savedStories, familiarity:");
replace("their saved symbols, boards, sequences, Visual Packs, communication history", "their saved symbols, boards, sequences, completed social stories, Visual Packs, communication history");
replace("setBooks(active.books);", "setBooks(active.books);\n          var importedStories = { profileId: prepared.activeProfileId, rows: active.stories };\n          savedStoryLibraryRef.current = importedStories; setSavedStoryLibrary(importedStories);");
const start = s.indexOf('    var deleteBook = useCallback');
const end = s.indexOf('    var updatePackField', start);
if (start < 0 || end < 0) throw new Error('Missing deleteBook');
s = s.slice(0, start) + `    var deleteBook = useCallback(async function (bookId) {
      var work = startSymbolWork('pack-delete-' + bookId);
      if (!work) return;
      try {
        var snapshot = selectionPacksRef.current;
        var target = snapshot.find(function (book) { return book.id === bookId; });
        if (!target) return;
        var confirmed = await askSymbolStudioConfirmation(
          'Delete the Visual Pack "' + (target.title || 'Untitled') + '"? The boards, sequences, and Symbol Bank assets inside it will be kept.',
          { title: 'Delete Visual Pack', confirmText: 'Delete Pack' }
        );
        if (!confirmed || !symbolWorkIsCurrent(work)) return;
        if (selectionPacksRef.current !== snapshot) { addToast && addToast('The Visual Packs changed. Review them before deleting.', 'info'); return; }
        var updated = snapshot.filter(function (book) { return book.id !== bookId; });
        if (!store(profKey(STORAGE_BOOKS, work.profileId), updated)) {
          addToast && addToast('Could not delete the Visual Pack because device storage is unavailable.', 'error'); return;
        }
        selectionPacksRef.current = updated; setBooks(updated);
        setActiveBookId(function (current) { return current === bookId ? null : current; });
      } finally { finishSymbolWork(work); }
    }, [activeProfileId, addToast]);

` + s.slice(end);
replace("    var beginStoryTextEdit = function (page) {", `    function persistStoryLibrary(rows, message) {
      if (!isOpen || savedStoryLibraryRef.current.profileId !== activeProfileIdRef.current) return false;
      if (!store(profKey('alloSavedStories', activeProfileIdRef.current), rows)) {
        setStoryLibraryNotice({ error: true, text: 'Could not save the story library. Device storage may be full. Your current story is still here; free some space and try again.' }); return false;
      }
      var library = { profileId: activeProfileIdRef.current, rows: rows };
      savedStoryLibraryRef.current = library; setSavedStoryLibrary(library);
      setStoryLibraryNotice({ text: message }); return true;
    }
    function saveStoryToLibrary() {
      var title = savedStoryTitleRef.current.trim().slice(0, 120);
      if (!title || !storyPages.length || storyTextEdit || storyGenerating || Object.keys(storyIllustrating).length || draftHydratedProfile !== activeProfileId || draftRecovery) return;
      var story = normalizeStoredRows('alloSavedStories', [{ id: uid(), title: title, profileId: activeProfileId, situation: storySituation, details: storyDetails, studentName: storyStudentName, pages: storyPages, createdAt: Date.now(), updatedAt: Date.now() }])[0];
      if (persistStoryLibrary([story].concat(savedStoryLibraryRef.current.rows), 'Saved “' + title + '” to this learner’s story library.')) {
        savedStoryTitleRef.current = ''; setSavedStoryTitle('');
      }
    }
    async function openSavedStory(storyId) {
      if (draftHydratedProfile !== activeProfileId || draftRecovery) return;
      var work = startSymbolWork('saved-story-open');
      if (!work) return;
      try {
        var target = savedStoryLibraryRef.current.rows.find(function (story) { return story.id === storyId; });
        if (!target || !target.pages.length) return;
        var draft = storyLibraryDraftRef.current;
        var snapshot = JSON.stringify(draft);
        if (draft.pages.length || draft.situation.trim() || draft.details.trim() || draft.edit || draft.generating) {
          if (!(await askSymbolStudioConfirmation('Open “' + target.title + '” and replace the current story draft? Save the current story to the library first if you want to keep it.', { title: 'Open saved story', confirmText: 'Replace draft' }))) return;
        }
        if (!symbolWorkIsCurrent(work)) return;
        if (JSON.stringify(storyLibraryDraftRef.current) !== snapshot || savedStoryLibraryRef.current.rows.find(function (story) { return story.id === storyId; }) !== target) {
          setStoryLibraryNotice({ text: 'The story changed while the dialog was open. Review it and open the saved story again.' }); return;
        }
        studioDraftWorkEpochRef.current.story += 1; storyRevisionRef.current += 1;
        stopBoardPlayback(true); setStorySpeaking(false); setStoryTextEdit(null); setStoryTextEditError('');
        setStoryGenerating(false); setStoryIllustrating({}); setStoryError('');
        var pages = target.pages.map(function (page) { return Object.assign({}, page, { id: uid() }); });
        setStoryPages(pages); setStoryCurrent(0); setStorySituation(target.situation); setStoryDetails(target.details); setStoryStudentName(target.studentName);
        setStoryProgress({ ready: pages.filter(function (page) { return !!page.image; }).length, total: pages.length });
        var title = target.title.slice(0, 113) + ' (copy)'; savedStoryTitleRef.current = title; setSavedStoryTitle(title);
        setStoryLibraryNotice({ text: 'Opened “' + target.title + '”. Save a new copy to keep further edits.' });
      } finally { finishSymbolWork(work); }
    }
    function duplicateSavedStory(storyId) {
      var target = savedStoryLibraryRef.current.rows.find(function (story) { return story.id === storyId; });
      if (!target) return;
      var copy = normalizeStoredRows('alloSavedStories', [Object.assign({}, target, { id: uid(), title: target.title.slice(0, 113) + ' (copy)', createdAt: Date.now(), updatedAt: Date.now() })])[0];
      persistStoryLibrary([copy].concat(savedStoryLibraryRef.current.rows), 'Created “' + copy.title + '”.');
    }
    async function manageSavedStory(storyId, action) {
      var work = startSymbolWork('saved-story-' + action + '-' + storyId);
      if (!work) return;
      try {
        var target = savedStoryLibraryRef.current.rows.find(function (story) { return story.id === storyId; });
        if (!target) return;
        var title;
        if (action === 'rename') {
          title = await askSymbolStudioText('Choose a name for this saved story.', target.title, { title: 'Rename saved story', inputLabel: 'Story name', confirmText: 'Rename story', maxLength: 120 });
          if (!title) return;
        } else if (!(await askSymbolStudioConfirmation('Delete “' + target.title + '” from this learner’s story library? The story currently open in the editor will be kept.', { title: 'Delete saved story', confirmText: 'Delete story' }))) return;
        if (!symbolWorkIsCurrent(work)) return;
        var current = savedStoryLibraryRef.current.rows;
        if (current.find(function (story) { return story.id === storyId; }) !== target) { setStoryLibraryNotice({ text: 'This saved story changed. Review it and try again.' }); return; }
        var updated = action === 'rename' ? current.map(function (story) { return story.id === storyId ? Object.assign({}, story, { title: title, updatedAt: Date.now() }) : story; }) : current.filter(function (story) { return story.id !== storyId; });
        persistStoryLibrary(updated, action === 'rename' ? 'Renamed story to “' + title + '”.' : 'Deleted “' + target.title + '” from the library.');
      } finally { finishSymbolWork(work); }
    }

    var beginStoryTextEdit = function (page) {`);
replace("    function renderStoriesTab() {", `    function renderStoryLibrary() {
      var busy = storyGenerating || Object.keys(storyIllustrating).length > 0;
      var cannotSave = !savedStoryTitle.trim() || busy || !!storyTextEdit || draftHydratedProfile !== activeProfileId || !!draftRecovery;
      var buttonStyle = Object.assign({}, S.btn('#f3f4f6', '#374151', false), { minHeight: '44px', minWidth: '44px', whiteSpace: 'normal' });
      return e('section', { className: 'ss-story-library', 'aria-label': 'Saved story library', style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' } },
        storyPages.length > 0 && e('form', { onSubmit: function (ev) { ev.preventDefault(); saveStoryToLibrary(); }, style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          e('label', { htmlFor: 'ss-saved-story-title', style: S.lbl }, 'Save completed story'),
          e('input', { id: 'ss-saved-story-title', 'aria-label': 'Name for saved story', value: savedStoryTitle, maxLength: 120, placeholder: 'e.g. Taking a quiet break', onChange: function (ev) { savedStoryTitleRef.current = ev.target.value; setSavedStoryTitle(ev.target.value); }, style: Object.assign({}, S.input, { minHeight: '44px', width: '100%', minWidth: 0 }), 'aria-describedby': 'ss-story-library-help' }),
          e('button', { type: 'submit', 'aria-label': 'Save new story to library', disabled: cannotSave, style: Object.assign({}, S.btn(PURPLE, '#fff', cannotSave), { minHeight: '44px', whiteSpace: 'normal' }) }, 'Save a new copy'),
          e('p', { id: 'ss-story-library-help', style: { fontSize: '12px', color: '#6b7280', margin: 0 } }, storyTextEdit ? 'Save or cancel the page text edit first.' : busy ? 'Wait for story generation and illustrations to finish.' : 'Keeps the page text and illustrations as an independent copy for this learner.')
        ),
        storyLibraryNotice && e('div', { role: storyLibraryNotice.error ? 'alert' : 'status', style: { fontSize: '12px', color: storyLibraryNotice.error ? '#b91c1c' : '#374151', overflowWrap: 'anywhere' } }, storyLibraryNotice.text),
        e('details', null,
          e('summary', { style: { cursor: 'pointer', minHeight: '44px', padding: '12px 0', fontSize: '13px', fontWeight: 700 } }, 'Saved stories (' + savedStories.length + ')'),
          e('p', { style: { fontSize: '12px', color: '#6b7280', marginTop: 0 } }, 'Stored on this device and included in full backups.'),
          savedStories.length === 0 && e('p', { style: { fontSize: '12px', color: '#6b7280' } }, 'Save a completed story to reuse it here.'),
          savedStories.map(function (story) {
            return e('div', { key: story.id, style: { border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', padding: '8px', marginBottom: '8px', minWidth: 0 } },
              e('div', { style: { fontSize: '13px', fontWeight: 700, overflowWrap: 'anywhere' } }, story.title),
              e('div', { style: { fontSize: '12px', color: '#6b7280', margin: '4px 0' } }, story.pages.length + (story.pages.length === 1 ? ' page' : ' pages')),
              e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                e('button', { type: 'button', 'aria-label': 'Open saved story: ' + story.title, disabled: !story.pages.length, onClick: function () { openSavedStory(story.id); }, style: buttonStyle }, 'Open'),
                e('button', { type: 'button', 'aria-label': 'Duplicate saved story: ' + story.title, onClick: function () { duplicateSavedStory(story.id); }, style: buttonStyle }, 'Duplicate'),
                e('button', { type: 'button', 'aria-label': 'Rename saved story: ' + story.title, onClick: function () { manageSavedStory(story.id, 'rename'); }, style: buttonStyle }, 'Rename'),
                e('button', { type: 'button', 'aria-label': 'Delete saved story: ' + story.title, onClick: function () { manageSavedStory(story.id, 'delete'); }, style: buttonStyle }, 'Delete')
              )
            );
          })
        )
      );
    }

    function renderStoriesTab() {`);
replace("        // Left: inputs\n", "        // Left: inputs\n");
const editor = "e('div', { className: 'ss-story-editor ss-no-print'";
const i = s.indexOf(editor); const j = s.indexOf("          e('div', null,", i);
if (i < 0 || j < 0) throw new Error('Missing story editor');
s = s.slice(0,j) + '          renderStoryLibrary(),\n' + s.slice(j);
fs.writeFileSync(file, s);
fs.copyFileSync(file, 'desktop/web-app/public/symbol_studio_module.js');
console.log('Story library and guarded pack deletion implemented.');
