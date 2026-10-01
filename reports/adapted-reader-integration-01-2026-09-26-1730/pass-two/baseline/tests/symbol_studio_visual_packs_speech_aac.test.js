import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'symbol_studio_module.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing Symbol Studio marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing Symbol Studio marker: ${endMarker}`);
  return source.slice(start, end);
}

function createVisualPackHelpers() {
  const helperSource = section('function uniqueStringIds(values)', '// Load profiles with migration');
  let nextId = 0;
  // Exercise the real share contract with the test DOM for SVG sanitization.
  return new Function(
    'window',
    'uid',
    `${helperSource}\nreturn { uniqueStringIds, normalizeVisualPack, buildVisualPackEnvelope, portablePackImage };`,
  )(window, () => `test-id-${++nextId}`);
}

function createMovePackHarness({ books, savedBoards = [], savedSchedules = [], gallery = [] }) {
  const { uniqueStringIds, normalizeVisualPack } = createVisualPackHelpers();
  const state = { persisted: null, rendered: null };
  const callbackSource = section('var movePackItem = useCallback', 'var toggleBoardInBook = useCallback');
  const movePackItem = new Function(
    'useCallback', 'savedBoards', 'savedSchedules', 'gallery', 'books',
    'uniqueStringIds', 'normalizeVisualPack', 'store', 'scopedKey',
    'STORAGE_BOOKS', 'addToast', 'setBooks',
    `${callbackSource}\nreturn movePackItem;`,
  )(
    (callback) => callback, savedBoards, savedSchedules, gallery, books,
    uniqueStringIds, normalizeVisualPack,
    (_key, value) => { state.persisted = value; return true; },
    (key) => key, 'alloActivitySets', vi.fn(),
    (value) => { state.rendered = value; },
  );
  return { movePackItem, state };
}

function createBoardSpeechHelpers() {
  const helperSource = section('function vocalLabelForCell(cell)', 'function withoutDeviceSpeechReference(board)');
  return new Function(
    `${helperSource}\nreturn { vocalLabelForCell, collectBoardSpeechCells };`,
  )();
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(turns = 12) {
  for (let index = 0; index < turns; index++) await Promise.resolve();
}

async function waitUntil(predicate, label, turns = 80) {
  for (let index = 0; index < turns; index++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function speechRuntimeSection() {
  const start = source.indexOf('function stableSpeechHash(value)');
  const activeEffect = source.indexOf('var activeId = useBoardId || scanBoardId;', start);
  const end = source.lastIndexOf('useEffect(function () {', activeEffect);
  if (start < 0 || activeEffect < 0 || end <= start) {
    throw new Error('Could not isolate the Symbol Studio speech runtime');
  }
  return source.slice(start, end);
}

function profileKey(profile) {
  return JSON.stringify([
    profile.voice || '', profile.language || '', Number(profile.synthesisRate) || 1,
    profile.voiceResolverVersion || 2, profile.provider || '', profile.engine || '',
    profile.model || '',
  ]);
}

function portableTargetKey(target) {
  return `${target.scopeId}|${target.segmentId}`;
}

function createSpeechRuntime(options = {}) {
  const stores = [];
  const createStore = vi.fn(() => {
    const records = new Map();
    const storeApi = {
      hydrate: vi.fn((payload) => {
        for (const record of payload?.records || []) {
          records.set(portableTargetKey(record.target), { ...record });
        }
      }),
      serialize: vi.fn(() => ({ records: Array.from(records.values()).map((record) => ({ ...record })) })),
      getCompatible: vi.fn((target, profile) => {
        const record = records.get(portableTargetKey(target));
        if (!record || record.target.spokenText !== target.spokenText) return null;
        return profileKey(record.profile) === profileKey(profile) ? record.url : null;
      }),
      put: vi.fn((target, data, mime, sourceName, profile) => {
        const url = `saved:${target.spokenText}:${profile.voice}`;
        records.set(portableTargetKey(target), {
          target: { ...target }, profile: { ...profile }, data, mime, source: sourceName, url,
        });
        return url;
      }),
      clear: vi.fn(() => records.clear()),
      records,
    };
    stores.push(storeApi);
    return storeApi;
  });

  const deviceStorage = options.deviceStorage || {
    ready: vi.fn(async () => ({ connected: true })),
    get: vi.fn(async () => null),
    set: vi.fn(async () => true),
    remove: vi.fn(async () => true),
  };
  const karaokeAudioStore = {
    createStore,
    portableKeyForIdentity: vi.fn(portableTargetKey),
  };
  const board = options.board || {
    id: 'board-a', title: 'Requests', language: 'English',
    words: [{ id: 'cell-a', label: 'Help', image: 'data:image/png;base64,AA==' }],
  };
  const { vocalLabelForCell, collectBoardSpeechCells } = createBoardSpeechHelpers();
  const localStore = vi.fn(() => true);
  const addToast = vi.fn();
  const deps = {
    window: {
      AlloModules: { KaraokeAudioStore: karaokeAudioStore },
      alloDeviceStorage: deviceStorage,
      __ttsGeminiAuthFailed: false,
    },
    SYMBOL_SPEECH_NAMESPACE: 'symbol_studio_audio_v1',
    STORAGE_BOARDS: 'alloSymbolBoards',
    profKey: (base, profileId) => profileId ? `${base}__${profileId}` : base,
    activeProfileIdRef: { current: 'profile-a' },
    boardSpeechGenerationRef: { current: 1 },
    boardSpeechStoresRef: { current: {} },
    boardSpeechInflightRef: { current: {} },
    boardSpeechTombstonesRef: { current: {} },
    boardSpeechPrepareEpochRef: { current: 0 },
    symbolStudioMountedRef: { current: true },
    speechStorageWarningRef: { current: false },
    savedBoardsRef: { current: [board] },
    selectedVoice: options.selectedVoice || 'Kore',
    boardLang: 'English',
    primaryLanguage: 'English',
    voiceSpeed: 1,
    ttsProvider: 'auto',
    ttsEngine: 'gemini',
    ttsModel: 'tts-model-a',
    onCallTTS: options.onCallTTS || vi.fn(async (text) => `tts:${text}`),
    audioUrlToDurablePayload: options.audioUrlToDurablePayload
      || vi.fn(async (url) => ({ data: `captured:${url}`, mime: 'audio/mpeg' })),
    promiseWithTimeout: (promise, milliseconds, label) => {
      if (options.expireInitialHydration && milliseconds === 750
          && label === 'Saved speech hydration is still pending') {
        return Promise.reject(new Error(label));
      }
      return Promise.resolve(promise);
    },
    setSpeechRevision: vi.fn((update) => {
      deps.speechRevision = typeof update === 'function' ? update(deps.speechRevision) : update;
    }),
    speechRevision: 0,
    load: vi.fn(() => deps.savedBoardsRef.current),
    store: localStore,
    setSavedBoards: vi.fn((next) => {
      deps.savedBoardsRef.current = typeof next === 'function' ? next(deps.savedBoardsRef.current) : next;
    }),
    notifyVisualSupportsUpdated: vi.fn(),
    addToast,
    speechPreparing: false,
    setSpeechPreparing: vi.fn((value) => { deps.speechPreparing = value; }),
    speechProgress: { ready: 0, total: 0 },
    setSpeechProgress: vi.fn((value) => { deps.speechProgress = value; }),
    vocalLabelForCell,
    collectBoardSpeechCells,
    applyVoice: vi.fn(),
    useEffect: vi.fn(),
  };
  const runtime = new Function(
    'deps',
    `with (deps) {\n${speechRuntimeSection()}\nreturn {\n`
      + 'stableSpeechHash, boardSpeechStorageKey, currentBoardSpeechProfile, '
      + 'speechProfileSignature, boardSpeechTarget, speechEntryAlive, '
      + 'ensureBoardSpeechEntry, persistBoardSpeech, captureGeneratedSpeech, '
      + 'resolveBoardSpeech, prepareBoardSpeech, clearBoardSpeechCache, removeBoardSpeech\n};\n}',
  )(deps);
  return {
    ...runtime, deps, board, stores, createStore, deviceStorage, karaokeAudioStore,
    localStore, addToast,
  };
}
describe('Symbol Studio Visual Pack contracts', () => {
  it('normalizes legacy packs while adding bounded asset and sequence references', () => {
    const { normalizeVisualPack } = createVisualPackHelpers();
    const tooManyIds = Array.from({ length: 505 }, (_, index) => `asset-${index}`);
    const pack = normalizeVisualPack({
      id: 'legacy-pack',
      title: 'Legacy activity set',
      description: 'x'.repeat(700),
      profileId: 'legacy-profile',
      boardIds: ['board-a', 'board-a', 7, null],
      assetIds: tooManyIds.concat(['asset-0']),
      scheduleIds: ['sequence-a', 'sequence-a'],
      createdAt: 123,
    });

    expect(pack.id).toBe('legacy-pack');
    expect(pack.profileId).toBe('legacy-profile');
    expect(pack.boardIds).toEqual(['board-a', '7']);
    expect(pack.assetIds).toHaveLength(500);
    expect(new Set(pack.assetIds).size).toBe(500);
    expect(pack.scheduleIds).toEqual(['sequence-a']);
    expect(pack.description).toHaveLength(500);
    expect(pack.packVersion).toBe(1);
    expect(pack.updatedAt).toBe(123);
  });

  it('reorders resolved pack items while pruning stale references', () => {
    const pack = {
      id: 'pack-a', title: 'Daily supports',
      boardIds: ['board-a', 'missing-middle', 'board-b', 'missing-end'],
      scheduleIds: ['missing-start', 'sequence-a', 'sequence-b', 'missing-end'],
      assetIds: [],
    };
    const boards = createMovePackHarness({
      books: [pack],
      savedBoards: [{ id: 'board-a' }, { id: 'board-b' }],
    });
    boards.movePackItem('pack-a', 'boardIds', 'board-a', 1);
    expect(boards.state.persisted[0].boardIds).toEqual(['board-b', 'board-a']);
    expect(boards.state.rendered).toEqual(boards.state.persisted);

    const sequences = createMovePackHarness({
      books: [pack],
      savedSchedules: [{ id: 'sequence-a' }, { id: 'sequence-b' }],
    });
    sequences.movePackItem('pack-a', 'scheduleIds', 'sequence-a', 1);
    expect(sequences.state.persisted[0].scheduleIds).toEqual(['sequence-b', 'sequence-a']);
    expect(sequences.state.rendered).toEqual(sequences.state.persisted);
  });

  it('builds a resource-closed, de-identified share envelope from explicit references', () => {
    const { buildVisualPackEnvelope } = createVisualPackHelpers();
    const png = 'data:image/png;base64,AA==';
    const assets = [
      {
        id: 'asset-help', conceptId: 'concept-help', label: 'Help', image: png,
        reviewStatus: 'approved', profileId: 'private-profile-token',
        reviewNote: 'private-review-note-token', audioData: 'private-asset-audio-token',
        attribution: { set: 'Mulberry', license: 'CC BY-SA', via: 'Local bank', url: 'https://example.test/license' },
      },
      {
        id: 'asset-water', label: 'Water', image: png,
        reviewStatus: 'unreviewed', profileId: 'private-profile-token',
      },
      { id: 'asset-unselected', label: 'Secret extra', image: png },
    ];
    const boards = [
      {
        id: 'board-a', title: 'Requests', cols: 3,
        profileId: 'private-profile-token',
        speechAudioRef: { key: 'private-board-audio-token' },
        speechAudioUpdatedAt: 'private-board-audio-time-token',
        usageLog: ['private-usage-log-token'],
        goals: ['private-goal-token'],
        words: [{
          id: 'cell-help', label: 'Help', translatedLabel: 'Ayuda', image: png,
          assetId: 'asset-help', conceptId: 'concept-help',
          audioData: 'private-human-recording-token',
        }],
      },
      { id: 'board-unselected', title: 'Not shared', words: [] },
    ];
    const schedules = [
      {
        id: 'sequence-a', title: 'Drink water', profileId: 'private-profile-token',
        nowId: 'step-water',
        items: [{
          id: 'step-water', label: 'Water', image: png, assetId: 'asset-water',
          complete: true, audioData: 'private-sequence-audio-token',
        }],
      },
      { id: 'sequence-unselected', title: 'Not shared', items: [] },
    ];
    const envelope = buildVisualPackEnvelope({
      id: 'pack-a', title: 'Daily supports', description: 'Portable classroom supports',
      profileId: 'private-profile-token',
      boardIds: ['board-a'], assetIds: [], scheduleIds: ['sequence-a'],
      logs: ['private-pack-log-token'], goals: ['private-pack-goal-token'],
    }, assets, boards, schedules);

    expect(Object.keys(envelope)).toEqual([
      'format', 'version', 'exportedAt', 'pack', 'assets', 'boards',
      'sequences', 'licenses', 'metadata',
    ]);
    expect(envelope.format).toBe('alloflow.visual-pack');
    expect(envelope.version).toBe(1);
    expect(envelope.pack).toEqual({
      id: 'pack-a', title: 'Daily supports', description: 'Portable classroom supports',
      boardIds: ['board-a'], assetIds: ['asset-help', 'asset-water'],
      scheduleIds: ['sequence-a'], packVersion: 1,
    });
    expect(envelope.assets.map((asset) => asset.id)).toEqual(['asset-help', 'asset-water']);
    expect(envelope.boards.map((board) => board.id)).toEqual(['board-a']);
    expect(envelope.sequences.map((sequence) => sequence.id)).toEqual(['sequence-a']);
    expect(envelope.sequences[0].items[0].complete).toBe(false);
    expect(envelope.sequences[0].nowId).toBeNull();
    expect(envelope.licenses).toEqual([{
      assetId: 'asset-help', label: 'Help',
      attribution: { set: 'Mulberry', license: 'CC BY-SA', via: 'Local bank', url: 'https://example.test/license' },
    }]);
    expect(envelope.metadata.assetsNeedingLocalReview).toBe(1);

    const serialized = JSON.stringify(envelope);
    for (const privateKey of [
      'profileId', 'audioData', 'speechAudioRef', 'speechAudioUpdatedAt',
      'reviewNote', 'usageLog', 'goals',
    ]) {
      expect(serialized).not.toContain(`"${privateKey}"`);
    }
    for (const privateValue of [
      'private-profile-token', 'private-review-note-token', 'private-board-audio-token',
      'private-human-recording-token', 'private-sequence-audio-token',
      'private-usage-log-token', 'private-goal-token', 'private-pack-log-token',
      'private-pack-goal-token',
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(serialized).not.toContain('asset-unselected');
    expect(serialized).not.toContain('board-unselected');
    expect(serialized).not.toContain('sequence-unselected');
  });

  it('keeps portable image exports local and sanitizes SVG markup', () => {
    const { portablePackImage } = createVisualPackHelpers();
    const asSvg = (markup) => 'data:image/svg+xml,' + encodeURIComponent(markup);
    const decodeSvg = (url) => Buffer.from(url.split(',')[1], 'base64').toString('utf8');

    expect(portablePackImage('data:image/png;base64,AA==')).toBe('data:image/png;base64,AA==');
    for (const nonportable of [
      'https://tracker.example/symbol.png',
      'blob:https://alloflow.example/private-object',
      'data:text/html;base64,PHNjcmlwdD4=',
    ]) {
      expect(portablePackImage(nonportable)).toBeNull();
    }

    const safeSvg = portablePackImage(asSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="gradient"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="10" height="10" fill="url(#gradient)" aria-label="Help"/></svg>',
    ));
    expect(safeSvg).toMatch(/^data:image\/svg\+xml;base64,/);
    const safeMarkup = decodeSvg(safeSvg);
    expect(safeMarkup).toContain('fill="url(#gradient)"');
    expect(safeMarkup).toContain('aria-label="Help"');

    const strippedSvg = portablePackImage(asSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect id="ok" onclick="alert(1)" style="background:url(https://tracker.example/x)" href="https://tracker.example/x" constructor="x" __proto__="x" fill="url(#ok) url(data:image/svg+xml;base64,AA==)"/></svg>',
    ));
    const strippedMarkup = decodeSvg(strippedSvg);
    expect(strippedMarkup).not.toMatch(/onclick=|style=|href=|constructor=|__proto__=|fill=/i);

    expect(portablePackImage(asSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(portablePackImage(asSvg('<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'))).toBeNull();
    expect(portablePackImage(asSvg('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(portablePackImage(asSvg('<svg xmlns="http://www.w3.org/2000/svg">' + '<rect/>'.repeat(5001) + '</svg>'))).toBeNull();
  });

  it('validates bounded imports, remaps IDs, and rolls back partial storage writes', () => {
    const importBlock = section('var importVisualPack = useCallback', 'var printBook = useCallback');

    expect(importBlock).toContain("data.format !== 'alloflow.visual-pack'");
    expect(importBlock).toContain('data.version !== 1');
    expect(importBlock).toContain('file.size > 50 * 1024 * 1024');
    expect(importBlock).toContain('allAssets.length > 500 || allBoards.length > 100 || allSchedules.length > 100');
    expect(importBlock).toContain("assetIdMap[oldId] = uid()");
    expect(importBlock).toContain("boardIdMap[String(board.id)] = uid()");
    expect(importBlock).toContain("scheduleIdMap[String(schedule.id)] = uid()");
    expect(importBlock).toContain('cell.id = uid()');
    expect(importBlock).toContain("reviewStatus: 'unreviewed'");
    expect(importBlock).toContain('commits[ci].previousRaw = localStorage.getItem(commits[ci].key)');
    expect(importBlock).toContain('for (var ri = completed.length - 1; ri >= 0; ri--)');
  });
});

describe('Symbol Studio saved speech contracts', () => {
  const speechLayer = section('function stableSpeechHash(value)', 'var activeId = useBoardId || scanBoardId;');
  const resolver = section('function resolveBoardSpeech(board, cell, text, options)', 'function fallbackBrowserSpeech(text, onDone)');
  const profile = section('function currentBoardSpeechProfile(board)', 'function boardSpeechTarget(board, cell, spokenText, segmentOverride)');
  const target = section('function boardSpeechTarget(board, cell, spokenText, segmentOverride)', 'function phraseSegmentId(text)');

  it('uses isolated, profile-and-board-scoped stores with device persistence', () => {
    expect(source).toContain("var SYMBOL_SPEECH_NAMESPACE = 'symbol_studio_audio_v1';");
    expect(speechLayer).toContain("return 'v1:p-' + stableSpeechHash(profilePart) + ':b-' + stableSpeechHash(boardPart)");
    expect(speechLayer).toContain('audioModule.createStore()');
    expect(speechLayer).not.toMatch(/(?:audioModule|KaraokeAudioStore)\.current/);
    expect(speechLayer).toContain('deviceStorage.get(SYMBOL_SPEECH_NAMESPACE, key)');
    expect(speechLayer).toContain('entry.store.hydrate(payload)');
    expect(speechLayer).toContain('var snapshot = entry.store.serialize()');
    expect(speechLayer).toContain('deviceStorage.set(SYMBOL_SPEECH_NAMESPACE, entry.key, snapshot, { queue: true })');
    expect(speechLayer).toContain('deviceStorage.remove(SYMBOL_SPEECH_NAMESPACE, key, { queue: true })');
    expect(speechLayer).toContain('var ref = { version: 1, namespace: SYMBOL_SPEECH_NAMESPACE, key: entry.key }');
  });

  it('keys compatible clips by V4 board, page, cell, voice, language, rate, and provider identity', () => {
    expect(target).toContain('identityVersion: 4');
    expect(target).toContain("adapterId: 'alloflow.symbol-studio.cell-speech'");
    expect(target).toContain("scopeId: 'board:' + String(board && board.id || 'draft') + ':page:' + pageId");
    expect(target).toContain("segmentId: segmentOverride || ('cell:' + cellId)");
    expect(profile).toContain("voice: selectedVoice || 'Kore'");
    expect(profile).toContain('language: String((board && board.language) || boardLang || primaryLanguage');
    expect(profile).toContain('synthesisRate: voiceSpeed');
    expect(profile).toContain("if (provider && provider !== 'auto') profile.provider = provider");
    expect(profile).toContain('if (ttsEngine) profile.engine = ttsEngine');
    expect(profile).toContain('profile.model ||');
    expect(resolver).toContain('entry.store.getCompatible(target, profile)');
    expect(resolver).toContain('audioModule.portableKeyForIdentity(target)');
  });

  it('always prefers a human recording and captures generated TTS for reuse', () => {
    const recordingIndex = resolver.indexOf('if (cell && cell.audioData) return Promise.resolve(cell.audioData)');
    const ttsIndex = resolver.indexOf('return onCallTTS(');
    expect(recordingIndex).toBeGreaterThanOrEqual(0);
    expect(ttsIndex).toBeGreaterThan(recordingIndex);
    expect(resolver).toContain('return captureGeneratedSpeech(');
    expect(resolver).toContain('requestedSignature');
    expect(speechLayer).toContain('audioUrlToDurablePayload(url)');
    expect(speechLayer).toContain("entry.store.put(target, payload.data, payload.mime, 'ai-symbol-studio', profile)");
    expect(speechLayer).toContain('if (existing)');
    expect(speechLayer).toContain('return options && options.awaitCapture');
  });
});

describe('Symbol Studio interactive AAC contracts', () => {
  const useMode = section('if (useBoardId) {', 'Partner-assisted scanning overlay');
  const scanMode = section('Partner-assisted scanning overlay', 'Focus trap handler for modal');
  const useLifecycle = section('// Use-mode keyboard shortcuts stay out of editable controls', '// Scanning interval');
  const predictions = section('var fetchPredictions = useCallback', 'var toggleAiPredict = useCallback');

  it('speaks translated labels and flattens every page into stable speech cells', () => {
    const { vocalLabelForCell, collectBoardSpeechCells } = createBoardSpeechHelpers();
    const cells = collectBoardSpeechCells({
      id: 'board-a',
      pages: [
        { id: 'page-one', title: 'Needs', words: [{ id: 'help', label: 'Help', translatedLabel: 'Ayuda' }] },
        { id: 'page-two', title: 'People', words: [{ id: 'teacher', label: 'Teacher' }, { id: 'blank', label: '  ' }] },
      ],
    });

    expect(vocalLabelForCell({ label: 'Help', translatedLabel: 'Ayuda' })).toBe('Ayuda');
    expect(cells.map((cell) => cell.translatedLabel || cell.label)).toEqual(['Ayuda', 'Teacher']);
    expect(cells.map((cell) => cell._speechPageId)).toEqual(['page-one', 'page-two']);
    expect(cells.map((cell) => cell._speechPageTitle)).toEqual(['Needs', 'People']);
    expect(cells.map((cell) => cell._speechCellId)).toEqual(['help', 'teacher']);
  });

  it('shares the saved-speech resolver across tapping, phrases, preparation, and scanning', () => {
    expect(useMode).toContain('var allUseCells = collectBoardSpeechCells(useBoard)');
    expect(useMode).toContain('return playResolvedBoardSpeech(useBoard, cell, vocalLabelForCell(cell)');
    expect(useMode).toContain('playResolvedBoardSpeech(useBoard, phraseCell, phrase');
    expect(useMode).toContain('prepareBoardSpeech(useBoard)');
    expect(scanMode).toContain('collectBoardSpeechCells(scanBoard)');
    expect(scanMode).toContain('playResolvedBoardSpeech(scanBoard, cell, vocalLabelForCell(cell)');
  });

  it('supports speak-and-compose, compose-only, and speak-only interaction without stale predictions', () => {
    expect(useMode).toContain("var shouldCompose = tapBehavior !== 'speak-only'");
    expect(useMode).toContain("var shouldSpeak = tapBehavior !== 'compose-only'");
    expect(useMode).toContain("e('option', { value: 'speak-compose' }, 'Speak + compose')");
    expect(useMode).toContain("e('option', { value: 'compose-only' }, 'Compose only')");
    expect(useMode).toContain("e('option', { value: 'speak-only' }, 'Speak only')");
    expect(useMode).toContain('items.filter(function (_, index) { return index !== i; })');
    expect(predictions).toContain('var requestEpoch = ++predEpochRef.current');
    expect(predictions).toContain("if (typeof value !== 'string') return false");
    expect(predictions).toContain('if (!key || seen[key]) return false');
    expect(predictions).toContain('.slice(0, 4)');
    expect(predictions).toContain('if (requestEpoch === predEpochRef.current) setPredictions(preds)');
  });

  it('keeps both AAC overlays modal, keyboard-safe, and focus-restoring', () => {
    expect(useMode).toContain("role: 'dialog'");
    expect(useMode).toContain("'aria-modal': 'true'");
    expect(useMode).toContain("'aria-labelledby': 'ss-aac-use-title'");
    expect(useLifecycle).toContain("target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable");
    expect(useLifecycle).toContain("if (ev.code === 'Escape')");
    expect(useLifecycle).toContain('if (exitUseRef.current) exitUseRef.current()');
    expect(useLifecycle).toContain('if (opener && opener.focus && document.contains(opener)) opener.focus()');
    expect(scanMode).toContain("role: 'dialog'");
    expect(scanMode).toContain("'aria-describedby': 'ss-scan-help'");
    expect(scanMode).toContain("if (ev.code === 'Escape') { ev.preventDefault(); ev.stopPropagation(); exitScan(); return; }");
    expect(scanMode).toContain("if (ev.target !== ev.currentTarget) return;");
  });
});

describe('Symbol Studio saved speech deferred runtime', () => {
  it('does not count an asynchronously queued device write as durable', async () => {
    const queuedWrite = deferred();
    const deviceStorage = {
      ready: vi.fn(async () => ({ connected: false })),
      get: vi.fn(async () => null),
      set: vi.fn(() => queuedWrite.promise),
      remove: vi.fn(async () => true),
    };
    const runtime = createSpeechRuntime({ deviceStorage });
    const entry = await runtime.ensureBoardSpeechEntry(runtime.board);
    const cell = runtime.board.words[0];
    const target = runtime.boardSpeechTarget(runtime.board, cell, cell.label);
    const profile = runtime.currentBoardSpeechProfile(runtime.board);
    entry.store.put(target, 'prepared-audio', 'audio/mpeg', 'test', profile);

    const pending = runtime.persistBoardSpeech(runtime.board, entry);
    await waitUntil(() => deviceStorage.set.mock.calls.length === 1, 'queued device write');
    queuedWrite.resolve({ queued: true });

    await expect(pending).resolves.toBe(false);
    expect(runtime.localStore).not.toHaveBeenCalled();
    expect(runtime.deps.savedBoardsRef.current[0].speechAudioRef).toBeUndefined();
  });

  it('lets slow hydration win a TTS race without recapturing the hydrated clip', async () => {
    const hydration = deferred();
    const synthesis = deferred();
    const deviceStorage = {
      ready: vi.fn(async () => ({ connected: true })),
      get: vi.fn(() => hydration.promise),
      set: vi.fn(async () => true),
      remove: vi.fn(async () => true),
    };
    const onCallTTS = vi.fn(() => synthesis.promise);
    const runtime = createSpeechRuntime({ deviceStorage, onCallTTS, expireInitialHydration: true });
    const cell = runtime.board.words[0];
    const target = runtime.boardSpeechTarget(runtime.board, cell, cell.label);
    const profile = runtime.currentBoardSpeechProfile(runtime.board);
    const cachedUrl = 'saved:hydrated-help';

    const pending = runtime.resolveBoardSpeech(runtime.board, cell, cell.label, { awaitCapture: true });
    await waitUntil(() => onCallTTS.mock.calls.length === 1, 'TTS started after hydration timeout');
    hydration.resolve({ records: [{ target, profile, url: cachedUrl, data: 'hydrated-audio', mime: 'audio/mpeg' }] });
    await waitUntil(() => runtime.stores[0].hydrate.mock.calls.length === 1, 'late speech hydration');
    synthesis.resolve('tts:new-help');
    await pending;

    expect(runtime.stores[0].put).not.toHaveBeenCalled();
    expect(deviceStorage.set).not.toHaveBeenCalled();
    await expect(runtime.resolveBoardSpeech(runtime.board, cell, cell.label, { awaitCapture: true }))
      .resolves.toBe(cachedUrl);
    expect(onCallTTS).toHaveBeenCalledTimes(1);
  });

  it('keeps cached B and prevents a late A request from overwriting or persisting it', async () => {
    const synthesisA = deferred();
    const synthesisB = deferred();
    const onCallTTS = vi.fn((text) => text === 'A' ? synthesisA.promise : synthesisB.promise);
    const runtime = createSpeechRuntime({ onCallTTS });
    const cell = runtime.board.words[0];

    const pendingA = runtime.resolveBoardSpeech(runtime.board, cell, 'A', { awaitCapture: true });
    await waitUntil(() => onCallTTS.mock.calls.length === 1, 'A synthesis');
    const pendingB = runtime.resolveBoardSpeech(runtime.board, cell, 'B', { awaitCapture: true });
    await waitUntil(() => onCallTTS.mock.calls.length === 2, 'B synthesis');

    synthesisB.resolve('tts:B');
    const savedB = await pendingB;
    expect(savedB).toBe('saved:B:Kore');
    await expect(runtime.resolveBoardSpeech(runtime.board, cell, 'B', { awaitCapture: true }))
      .resolves.toBe(savedB);
    expect(onCallTTS).toHaveBeenCalledTimes(2);

    synthesisA.resolve('tts:A');
    await pendingA;

    expect(runtime.stores[0].put).toHaveBeenCalledTimes(1);
    expect(runtime.stores[0].put.mock.calls[0][0].spokenText).toBe('B');
    expect(runtime.deviceStorage.set).toHaveBeenCalledTimes(1);
    const persisted = JSON.stringify(runtime.deviceStorage.set.mock.calls[0][2]);
    expect(persisted).toContain('"spokenText":"B"');
    expect(persisted).not.toContain('"spokenText":"A"');
  });

  it('serializes deletion behind a pending write before removing device speech', async () => {
    const write = deferred();
    const events = [];
    const deviceStorage = {
      ready: vi.fn(async () => ({ connected: true })),
      get: vi.fn(async () => null),
      set: vi.fn(() => {
        events.push('write-started');
        return write.promise.then((result) => {
          events.push('write-finished');
          return result;
        });
      }),
      remove: vi.fn(async () => {
        events.push('remove');
        return true;
      }),
    };
    const runtime = createSpeechRuntime({ deviceStorage });
    const cell = runtime.board.words[0];
    const saving = runtime.resolveBoardSpeech(runtime.board, cell, cell.label, { awaitCapture: true });
    await waitUntil(() => deviceStorage.set.mock.calls.length === 1, 'pending speech write');

    const removing = runtime.removeBoardSpeech(runtime.board);
    await flushMicrotasks();
    expect(deviceStorage.remove).not.toHaveBeenCalled();

    write.resolve(true);
    await saving;
    await expect(removing).resolves.toBe(true);
    expect(events).toEqual(['write-started', 'write-finished', 'remove']);
    expect(deviceStorage.remove).toHaveBeenCalledWith(
      'symbol_studio_audio_v1', expect.any(String), { queue: true },
    );
  });

  it('cancels Prepare when the synthesis contract changes during an in-flight cell', async () => {
    const firstSynthesis = deferred();
    const onCallTTS = vi.fn((text) => {
      if (onCallTTS.mock.calls.length === 1) return firstSynthesis.promise;
      return Promise.resolve(`tts:${text}`);
    });
    const board = {
      id: 'board-prepare', title: 'Prepare race', language: 'English',
      words: [
        { id: 'cell-one', label: 'First', image: 'data:image/png;base64,AA==' },
        { id: 'cell-two', label: 'Second', image: 'data:image/png;base64,AA==' },
      ],
    };
    const runtime = createSpeechRuntime({ board, onCallTTS });

    runtime.prepareBoardSpeech(board);
    await waitUntil(() => onCallTTS.mock.calls.length === 1, 'first Prepare synthesis');
    runtime.deps.selectedVoice = 'Puck';
    runtime.deps.voiceSpeed = 1.25;
    runtime.deps.ttsModel = 'tts-model-b';
    firstSynthesis.resolve('tts:First');
    await waitUntil(() => runtime.deps.speechPreparing === false, 'Prepare cancellation');

    expect(onCallTTS).toHaveBeenCalledTimes(1);
    expect(runtime.deviceStorage.set).not.toHaveBeenCalled();
    expect(runtime.addToast.mock.calls.some(([message, kind]) => kind === 'success' && /saved on this device/i.test(message))).toBe(false);
  });
});