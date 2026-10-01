import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'symbol_studio_module.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last < 0) throw new Error(`Missing source markers: ${start} / ${end}`);
  return source.slice(first, last);
}
function helpers(storage = localStorage) {
  const storageHelpers = section('  function store(key, val)', '  // Additive Symbol Bank contract.');
  const bankHelpers = section('  function normalizeSymbolLabel(value)', '  function portablePackImage(value)');
  const backupHelpers = section('  // Backups keep profile ownership explicit.', '  // ── Storage helpers');
  const profileHelpers = section('  function loadProfiles()', '  // ── JSON helper');
  return new Function('localStorage', 'crypto', `
    var STORAGE_GALLERY = 'alloSymbolGallery', STORAGE_BOARDS = 'alloSymbolBoards', STORAGE_SCHEDULES = 'alloSchedules';
    var STORAGE_PROFILES = 'alloStudentProfiles', STORAGE_ACTIVE_PROFILE = 'alloActiveProfileId', STORAGE_AVATAR = 'alloStudentAvatar';
    var STORAGE_BOOKS = 'alloActivitySets', STORAGE_USAGE = 'alloAACUsage', STORAGE_FAMILIARITY = 'alloSymbolFamiliarity';
    var STORAGE_BANK_SCHEMA = 'alloSymbolBankSchemaVersion', STORAGE_PACK_SCHEMA = 'alloVisualPackSchemaVersion';
    var SYMBOL_BANK_SCHEMA_VERSION = 1, VISUAL_PACK_SCHEMA_VERSION = 1, MAX_PROFILES = 8;
    var CN_ADJ = ['Gentle'], CN_ANI = ['Fox'];
    function generateCodename() { return 'Gentle Fox'; }
    function withoutDeviceSpeechReference(board) { var copy = {...board}; delete copy.speechAudioRef; delete copy.speechAudioUpdatedAt; return copy; }
    ${storageHelpers}\n${bankHelpers}\n${backupHelpers}\n${profileHelpers}
    return { load, loadScoped, loadProfiles, loadScopedBank, loadScopedPacks, normalizeStoredRows, validateBackupSection, validateBackupRows, buildStudioBackup, prepareStudioBackupImport, commitStudioBackupImport };
  `)(storage, { randomUUID: () => `test-${Math.random()}` });
}
function liveState(overrides = {}) {
  return {
    activeProfileId: 'a', profiles: [{ id: 'a', name: 'Student A', codename: 'Gentle Fox' }],
    gallery: [], boards: [], schedules: [], books: [], familiarity: {}, usageLog: {}, iepGoals: [], growthLog: {},
    customTemplates: [], gardenTranslations: {}, gardenHomeLang: '', wishSeeds: [], ...overrides,
  };
}
function put(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

beforeEach(() => localStorage.clear());

describe('Symbol Studio backup and storage resilience', () => {
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
  });
  it('backs up and restores each student dataset under its original profile', () => {
    const h = helpers();
    put('alloSymbolGallery__b', [{ id: 'symbol-b', label: 'Break', image: 'data:image/png;base64,Qg==' }]);
    put('alloSymbolBoards__b', [{ id: 'board-b', title: 'B board', words: [], speechAudioRef: 'device-only' }]);
    put('alloSymbolIEPGoals__b', [{ id: 'goal-b', text: 'Request a break', profileId: 'b', trials: [] }]);
    const backup = h.buildStudioBackup(liveState({
      profiles: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      gallery: [{ id: 'symbol-a', label: 'Help', image: 'data:image/png;base64,QQ==' }],
    }));
    expect(backup.version).toBe(8);
    expect(backup.profileData.a.gallery[0].id).toBe('symbol-a');
    expect(backup.profileData.b.gallery[0].id).toBe('symbol-b');
    expect(backup.profileData.b.boards[0]).not.toHaveProperty('speechAudioRef');
    localStorage.clear();
    const fresh = liveState({ activeProfileId: 'new', profiles: [{ id: 'new', name: 'New' }] });
    const result = h.prepareStudioBackupImport(JSON.parse(JSON.stringify(backup)), fresh);
    h.commitStudioBackupImport(result.writes);
    expect(result.activeProfileId).toBe('a');
    expect(h.loadScoped('alloSymbolGallery', [], 'a')[0].label).toBe('Help');
    expect(h.loadScoped('alloSymbolGallery', [], 'b')[0].label).toBe('Break');
    expect(h.loadScoped('alloSymbolIEPGoals', [], 'b')[0].profileId).toBe('b');
    expect(localStorage.getItem('alloSymbolGallery__new')).toBeNull();
  });

  it('restores a legacy single-profile backup into that profile on a fresh device', () => {
    const h = helpers();
    const prepared = h.prepareStudioBackupImport({ version: 7, profiles: [{ id: 'old', name: 'Restored' }], gallery: [{ id: 'one', label: 'Help' }] }, liveState());
    h.commitStudioBackupImport(prepared.writes);
    expect(prepared.activeProfileId).toBe('old');
    expect(h.loadScoped('alloSymbolGallery', [], 'old')[0].label).toBe('Help');
    expect(localStorage.getItem('alloSymbolGallery__a')).toBeNull();
  });

  it('rejects malformed later sections before writing any earlier section', () => {
    const h = helpers();
    put('alloSymbolGallery__a', [{ id: 'existing', label: 'Stay' }]);
    const before = localStorage.getItem('alloSymbolGallery__a');
    expect(() => h.prepareStudioBackupImport({ version: 7, gallery: [{ id: 'imported', label: 'New' }], usageLog: { a: { sessions: [{ entries: [{ label: 2 }] }] } } }, liveState())).toThrow('label');
    expect(localStorage.getItem('alloSymbolGallery__a')).toBe(before);
    expect(() => h.prepareStudioBackupImport({ schedules: [null] }, liveState())).toThrow('schedules');
    expect(() => h.prepareStudioBackupImport({ profiles: [{ id: 'a', name: {} }] }, liveState())).toThrow('name');
  });

  it('rolls back all prior writes when storage fills partway through an import', () => {
    const persisted = new Map([['one', 'previous'], ['two', 'original']]);
    const storage = {
      getItem: (key) => persisted.get(key) ?? null,
      removeItem: (key) => persisted.delete(key),
      setItem: (key, value) => { if (key === 'three') throw new Error('QuotaExceeded'); persisted.set(key, value); },
    };
    const h = helpers(storage);
    expect(() => h.commitStudioBackupImport([['one', 'changed'], ['two', 'changed'], ['three', 'new']])).toThrow('No backup data was imported');
    expect(Object.fromEntries(persisted)).toEqual({ one: 'previous', two: 'original' });
  });

  it('preserves distinct sessions on the same date and removes exact duplicates', () => {
    const h = helpers();
    const first = { date: '2026-09-12', entries: [{ label: 'Help' }] };
    const second = { date: '2026-09-12', entries: [{ label: 'Break' }] };
    const prepared = h.prepareStudioBackupImport({ usageLog: { a: { sessions: [first, second] } } }, liveState({ usageLog: { a: { sessions: [first] } } }));
    expect(prepared.active.usageLog.a.sessions).toEqual([first, second]);
  });

  it('keeps wishes for different students and never silently truncates profiles', () => {
    const h = helpers();
    const prepared = h.prepareStudioBackupImport({ wishSeeds: [{ profileId: 'b', label: 'Water' }] }, liveState({ wishSeeds: [{ profileId: 'a', label: 'Water' }] }));
    expect(prepared.wishSeeds).toHaveLength(2);
    expect(() => h.prepareStudioBackupImport({ profiles: Array.from({ length: 8 }, (_, i) => ({ id: `new-${i}`, name: 'New' })) }, liveState())).toThrow('profile limit');
  });

  it('recovers from wrong storage shapes and malformed nested records', () => {
    const h = helpers();
    put('alloStudentProfiles', 'broken');
    expect(h.loadProfiles()).toHaveLength(1);
    put('alloStudentProfiles', [null, {}, { id: 'ok', name: 'Valid' }]);
    expect(h.loadProfiles().map((profile) => profile.id)).toEqual(['ok']);
    put('alloActivitySets__a', {});
    expect(h.loadScopedPacks('a')).toEqual([]);
    put('alloSymbolBoards__a', [null, { id: 'safe', title: {}, words: [null, { label: 10 }], pages: {} }]);
    const board = h.loadScoped('alloSymbolBoards', [], 'a')[0];
    expect(board.words[0].label).toBe('10');
    expect(board.pages).toEqual([]);
    put('alloAACUsage__a', { a: { sessions: [null, { date: 5, entries: [null, { label: {} }, { label: 'Hello' }] }] } });
    expect(h.loadScoped('alloAACUsage', {}, 'a').a.sessions[0].entries).toEqual([{ label: 'Hello' }]);
    put('alloSymbolFamiliarity__a', { bad: null, good: { score: 1 } });
    expect(h.loadScoped('alloSymbolFamiliarity', {}, 'a')).toEqual({ good: { score: 1 } });
    put('alloGardenWishSeeds', [null, {}, { label: 'Help' }]);
    expect(h.load('alloGardenWishSeeds', [])).toEqual([{ label: 'Help' }]);
  });

  it('reads the latest render state after file loading and cancels on profile change', () => {
    const h = helpers();
    let reader;
    const latest = { current: liveState() };
    const active = { current: 'a' };
    const toast = vi.fn();
    const deps = {
      savedStoryLibraryRef: { current: null }, setSavedStoryLibrary: vi.fn(), symbolWorkRef: { current: { epoch: 0 } }, useCallback: (callback) => callback, backupStateRef: latest, backupImportEpochRef: { current: 0 }, activeProfileIdRef: active,
      FileReader: class { constructor() { reader = this; } readAsText() {} },
      prepareStudioBackupImport: h.prepareStudioBackupImport, commitStudioBackupImport: h.commitStudioBackupImport,
      addToast: toast, warnLog: vi.fn(), notifyVisualSupportsUpdated: vi.fn(),
    };
    ['Profiles', 'ActiveProfileId', 'Gallery', 'SavedBoards', 'SavedSchedules', 'Books', 'Familiarity', 'UsageLog', 'IepGoals', 'PrevGrowthMap', 'CustomTemplates', 'WishSeeds', 'GardenHomeLang', 'GardenTranslations', 'AvatarName', 'AvatarDesc'].forEach((key) => { deps[`set${key}`] = vi.fn(); });
    const callback = new Function(...Object.keys(deps), `${section('    var importData = useCallback(function (ev)', '    var syncToCloud = useCallback')}\nreturn importData;`)(...Object.values(deps));
    callback({ target: { files: [{ size: 100 }], value: 'selected' } });
    latest.current = liveState({ iepGoals: [{ id: 'new-goal', text: 'Added while reading' }] });
    reader.onload({ target: { result: JSON.stringify({ gallery: [{ id: 'new-symbol', label: 'Help' }] }) } });
    expect(deps.setIepGoals).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'new-goal' })]);
    deps.setGallery.mockClear();
    callback({ target: { files: [{ size: 100 }], value: 'selected' } });
    active.current = 'b';
    reader.onload({ target: { result: JSON.stringify({ gallery: [{ id: 'other', label: 'Stop' }] }) } });
    expect(deps.setGallery).not.toHaveBeenCalled();
    expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('profile changed'), 'info');
  });
});


describe('Symbol Studio cloud and hidden-session resilience', () => {
  function cloudHarness(load, live) {
    const h = helpers();
    const deps = {
      useCallback: (callback) => callback, cloudSync: { load }, isCanvasEnv: false,
      activeProfileIdRef: { current: live.activeProfileId }, symbolWorkRef: { current: { epoch: 1 } }, cloudLoadEpochRef: { current: 0 },
      backupStateRef: { current: live }, profiles: live.profiles, savedBoards: live.boards, savedSchedules: live.schedules,
      ...h, generateCodename: () => 'Gentle Fox', MAX_PROFILES: 8, uid: () => 'new-cell',
      scopedKey: (key) => `${key}__${live.activeProfileId}`, STORAGE_PROFILES: 'alloStudentProfiles', STORAGE_BOARDS: 'alloSymbolBoards', STORAGE_SCHEDULES: 'alloSchedules',
      t: (key) => key, addToast: vi.fn(), warnLog: vi.fn(),
      setSyncStatus: vi.fn(), setProfiles: vi.fn(), setSavedBoards: vi.fn(), setSavedSchedules: vi.fn(), setLastSynced: vi.fn(),
    };
    const run = new Function(...Object.keys(deps), `${section('    var loadFromCloud = useCallback(async function ()', '    var generateBoardFromTopic = useCallback')}\nreturn loadFromCloud;`)(...Object.values(deps));
    return { run, deps };
  }

  it('preserves local profile identity, multipage boards, actions, and sequence progress on cloud restore', async () => {
    const board = { id: 'board', title: 'Local', speechAudioRef: 'local-audio', pages: [{ id: 'second', title: 'More', words: [] }], words: [{ id: 'cell', label: 'Help', image: 'local-image', action: 'navigate', linkPage: 1 }] };
    const live = liveState({ profiles: [{ id: 'a', name: 'Local student', description: 'Local description', image: 'portrait', codename: 'Fox' }], boards: [board], schedules: [{ id: 'sequence', title: 'Local sequence', nowId: 'step', items: [{ id: 'step', label: 'Start', image: 'step-image', complete: true }] }] });
    const { run, deps } = cloudHarness(async () => ({ profiles: [{ id: 'a', codename: 'Fox' }], boards: [{ id: 'board', title: 'Cloud title', words: [{ label: 'Help' }] }], schedules: [{ id: 'sequence', items: [{ id: 'step', label: 'Start' }] }] }), live);
    await run();
    expect(deps.setProfiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'Local student', description: 'Local description', image: 'portrait', codename: 'Fox' })]);
    expect(deps.setSavedBoards).toHaveBeenCalledWith([expect.objectContaining({ pages: [expect.objectContaining(board.pages[0])], speechAudioRef: 'local-audio', words: [expect.objectContaining({ id: 'cell', action: 'navigate', linkPage: 1, image: 'local-image' })] })]);
    expect(deps.setSavedSchedules).toHaveBeenCalledWith([expect.objectContaining({ nowId: 'step', items: [expect.objectContaining({ complete: true, image: 'step-image' })] })]);
  });

  it('discards cloud responses after a student switch away and back', async () => {
    let resolve;
    const { run, deps } = cloudHarness(() => new Promise((ready) => { resolve = ready; }), liveState());
    const pending = run();
    deps.symbolWorkRef.current.epoch += 2;
    resolve({ boards: [{ id: 'stale', words: [{ label: 'Stale' }] }] });
    await pending;
    expect(deps.setSavedBoards).not.toHaveBeenCalled();
    expect(localStorage.getItem('alloSymbolBoards__a')).toBeNull();
  });

  it('installs no keyboard listener, focus timer, or scanner timer while closed', () => {
    const listeners = vi.fn(); const timer = vi.fn();
    const deps = {
      useEffect: (effect) => effect(), isOpen: false, sessionDebrief: null, mulberryOpen: false, photoOpen: false, useBoardId: 'board', scanBoardId: 'board',
      window: { addEventListener: listeners }, setTimeout: timer, setInterval: timer,
      clearInterval: vi.fn(), scanIntervalRef: { current: null }, scanPaused: false, scanManual: false,
      scanSpeed: 1500, savedBoards: [],
    };
    new Function(...Object.keys(deps), section('    // Use-mode keyboard shortcuts stay out', '    var avatarRef'))(...Object.values(deps));
    expect(listeners).not.toHaveBeenCalled();
    expect(timer).not.toHaveBeenCalled();
  });
});


describe('Symbol Studio full-capacity restore and autosave', () => {
  it('restores eight profiles over a pristine generated placeholder, but preserves stored work', () => {
    const h = helpers();
    const fresh = liveState({ profiles: [{ id: 'a', name: 'Student 1', codename: 'Gentle Fox', description: '', image: null }] });
    const profiles = Array.from({ length: 8 }, (_, index) => ({ id: `restored-${index}`, name: `Restored ${index}` }));
    const backup = { version: 8, profiles, activeProfileId: profiles[0].id, profileData: Object.fromEntries(profiles.map((profile) => [profile.id, { gallery: [] }])) };
    const prepared = h.prepareStudioBackupImport(backup, fresh);
    expect(prepared.profiles).toHaveLength(8);
    expect(prepared.profiles.some((profile) => profile.id === 'a')).toBe(false);
    expect(prepared.activeProfileId).toBe(profiles[0].id);
    const legacy = h.prepareStudioBackupImport({ version: 7, profiles, gallery: [{ id: 'legacy-symbol', label: 'Help' }] }, fresh);
    expect(legacy.active.gallery[0].label).toBe('Help');
    put('alloSymbolBoards__a', [{ id: 'saved-while-reading', title: 'Keep me', words: [] }]);
    expect(() => h.prepareStudioBackupImport(backup, fresh)).toThrow('profile limit');
    localStorage.clear();
    put('alloSymbolGallery', [{ id: 'legacy', label: 'Do not lose' }]);
    expect(() => h.prepareStudioBackupImport(backup, fresh)).toThrow('profile limit');
  });

  it('debounces autosave again after edits even though its callback is declared later in the component', () => {
    vi.useFakeTimers();
    let previousDependencies;
    let cleanup;
    const save = vi.fn();
    const env = { cloudSync: {}, isCanvasEnv: false, profiles: [], savedBoards: [], savedSchedules: [], gallery: [] };
    const useEffect = (effect, dependencies) => {
      if (previousDependencies && dependencies.every((value, index) => Object.is(value, previousDependencies[index]))) return;
      if (cleanup) cleanup();
      previousDependencies = dependencies;
      cleanup = effect;
    };
    const renderEffect = new Function('useEffect', 'save', ...Object.keys(env), `${section('    // Auto-save to cloud 5 s', '    // Use-mode keyboard shortcuts')}\nvar syncToCloud = save;`);
    const render = () => {
      const previous = cleanup;
      renderEffect(useEffect, save, ...Object.values(env));
      if (cleanup !== previous) cleanup = cleanup();
    };
    try {
      render();
      vi.advanceTimersByTime(5000);
      expect(save).toHaveBeenCalledTimes(1);
      env.gallery = [{ id: 'one', label: 'Help' }]; render();
      vi.advanceTimersByTime(3000);
      env.savedBoards = [{ id: 'new-board' }]; render();
      vi.advanceTimersByTime(3000);
      expect(save).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(2000);
      expect(save).toHaveBeenCalledTimes(2);
    } finally { if (cleanup) cleanup(); vi.useRealTimers(); }
  });
});
