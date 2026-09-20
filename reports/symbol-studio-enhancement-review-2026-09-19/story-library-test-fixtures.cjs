const fs = require('fs');
function edit(file, before, after) { let s=fs.readFileSync(file,'utf8'); if(!s.includes(before))throw new Error('Missing anchor in '+file); fs.writeFileSync(file,s.replace(before,()=>after)); }
edit('tests/symbol_studio_story_library.test.js', `document.querySelector('[role="dialog"] input[aria-label="Story name"]') || document.querySelector('[role="dialog"][aria-describedby] input')`, `document.querySelector('input[id^="symbol-studio-decision-"]')`);
edit('tests/symbol_studio_dialogs_a11y.test.js', 'toHaveLength(2)', 'toHaveLength(3)');
edit('tests/symbol_studio_backup_resilience.test.js', 'symbolWorkRef: { current: { epoch: 0 } }, useCallback:', 'savedStoryLibraryRef: { current: null }, setSavedStoryLibrary: vi.fn(), symbolWorkRef: { current: { epoch: 0 } }, useCallback:');
edit('tests/symbol_studio_backup_resilience.test.js', "describe('Symbol Studio backup and storage resilience', () => {", `describe('Symbol Studio backup and storage resilience', () => {
  it('round-trips completed stories with all page text and illustrations for each learner', () => {
    const h = helpers();
    const story = { id: 'story-a', title: 'A story', situation: 'Taking a break', studentName: 'A', details: 'A quiet corner', pages: [{ id: 'page-a', text: 'I can pause.', image: 'data:image/png;base64,AA==', imagePrompt: 'quiet corner' }] };
    const other = { ...story, id: 'story-b', title: 'B story', studentName: 'B' };
    put('alloSavedStories__b', [other]);
    const backup = h.buildStudioBackup(liveState({ profiles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], stories: [story] }));
    expect(backup.profileData.a.stories).toEqual([story]); expect(backup.profileData.b.stories).toEqual([other]);
    localStorage.clear();
    const prepared = h.prepareStudioBackupImport(JSON.parse(JSON.stringify(backup)), liveState());
    h.commitStudioBackupImport(prepared.writes);
    expect(h.loadScoped('alloSavedStories', [], 'a')).toEqual([story]);
    expect(h.loadScoped('alloSavedStories', [], 'b')).toEqual([other]);
    expect(h.buildStudioBackup(liveState()).profileData.a.stories).toEqual([]);
    const legacy = h.prepareStudioBackupImport({ version: 7, gallery: [] }, liveState({ stories: [story] }));
    expect(legacy.active.stories).toEqual([story]);
  });

  it('rejects malformed saved story pages before writing a backup', () => {
    const h = helpers();
    expect(() => h.prepareStudioBackupImport({ stories: [{ id: 'bad', title: 'Bad', pages: [] }] }, liveState())).toThrow('must contain pages');
    expect(() => h.prepareStudioBackupImport({ stories: [{ id: 'bad', pages: [{ text: {}, image: null }] }] }, liveState())).toThrow('text');
    expect(() => h.prepareStudioBackupImport({ stories: [{ id: 'bad', pages: [{ text: 'Good', image: {} }] }] }, liveState())).toThrow('image');
    expect(localStorage.getItem('alloSavedStories__a')).toBeNull();
  });`);
console.log('Updated library regression and backup fixtures.');
