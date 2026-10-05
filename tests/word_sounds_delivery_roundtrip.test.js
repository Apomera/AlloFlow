import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';

const read = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const live = read('live_aac_source.jsx');
const firestore = read('firestore_sync_module.js');
const extras = read('module_scope_extras_source.jsx');
const misc = read('misc_handlers_source.jsx');
const anti = read('AlloFlowANTI.txt');
function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Missing production boundary: ${start}`);
  return source.slice(from, to);
}
function wave(dataLength = 128) {
  const bytes = Buffer.alloc(44 + dataLength, 0);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(dataLength, 40);
  for (let i = 44; i < bytes.length; i += 1) bytes[i] = (i * 37) % 256;
  return bytes.toString('base64');
}
const clip = base64 => ({ mime: 'audio/wav', base64 });
function resource(base64 = wave()) {
  return {
    id: 'ws-synthetic-roundtrip', type: 'word-sounds', title: 'Prepared synthetic practice',
    wordSoundsVoice: 'female', wordSoundsPhonemeVoice: 'female', wordSoundsTtsSpeed: 0.8,
    config: { voice: 'female', phonemeVoice: 'female', ttsSpeed: 0.8 },
    lessonPlanSequence: ['blending', 'read_sentence', 'read_passage'],
    progress: { activityIndex: 1, wordIndex: 1, correct: 3, attempts: 4, completed: ['blending'] },
    data: [
      { targetWord: 'Cat', sentence: 'The cat can nap.', passage: 'The cat can nap. It is on a mat.',
        phonemes: ['k', 'a', 't'], teacherReviewed: true,
        _ttsRequiredKeys: ['cat', 'the cat can nap.', 'the cat can nap. it is on a mat.'],
        _ttsAssets: { ' Cat ': `data:audio/wav;base64,${base64}`, 'the cat can nap.': clip(base64), 'the cat can nap. it is on a mat.': clip(base64) } },
      { targetWord: 'Dog', sentence: 'The dog can dig.', phonemes: ['d', 'o', 'g'],
        _ttsRequiredKeys: ['dog', 'the dog can dig.'],
        _ttsAssets: { dog: clip(base64), 'the dog can dig.': `data:audio/wav;base64,${base64}` } },
    ],
  };
}
function services(liveSource = live) {
  const win = { AlloModules: {}, __alloFirebase: { auth: { currentUser: { uid: 'synthetic-teacher' } } } };
  new Function('window', firestore)(win);
  const module = { exports: {} };
  new Function('module', 'globalThis', read('word_sounds_readiness_contract.js'))(module, { window: win });
  const serialize = new Function('window', `${between(liveSource, 'const _alloSerializeResourceForStudentPack =', 'const _alloResizeMailboxImage =')}\nreturn _alloSerializeResourceForStudentPack;`)(win);
  return { win, pack: (item, overrides = {}) => serialize(item, { ...win, audioChannel: 'student-pack', ...overrides }) };
}
function assertContentAndBytes(received, original, base64 = wave()) {
  expect(received.id).toBe(original.id);
  expect(received.title).toBe(original.title);
  expect(received.config).toEqual(original.config);
  expect(received.wordSoundsVoice).toBe(original.wordSoundsVoice);
  expect(received.wordSoundsPhonemeVoice).toBe(original.wordSoundsPhonemeVoice);
  expect(received.wordSoundsTtsSpeed).toBe(original.wordSoundsTtsSpeed);
  expect(received.lessonPlanSequence).toEqual(original.lessonPlanSequence);
  expect(received.progress).toEqual(original.progress);
  expect(received.data.map(word => [word.targetWord, word.sentence, word.passage, word.phonemes])).toEqual(
    original.data.map(word => [word.targetWord, word.sentence, word.passage, word.phonemes]),
  );
  expect(Object.keys(received.data[0]._ttsAssets)).toEqual(['cat', 'the cat can nap.', 'the cat can nap. it is on a mat.']);
  expect(Object.keys(received.data[1]._ttsAssets)).toEqual(['dog', 'the dog can dig.']);
  for (const word of received.data) for (const value of Object.values(word._ttsAssets)) {
    expect(value).toEqual(clip(base64));
    expect(Buffer.from(value.base64, 'base64')).toEqual(Buffer.from(base64, 'base64'));
  }
}
function projectFile(history) {
  const source = read('export_handlers_module.js');
  const start = source.indexOf('const projectFile = { name: _htmlName');
  const end = source.indexOf(';', start);
  if (start < 0 || end < start) throw new Error('Missing actual project backup Blob');
  return new Function('history', '_htmlName', 'Blob', `${source.slice(start, end + 1)}\nreturn projectFile;`)(history, 'synthetic-practice', NodeBlob);
}
function importer(win) {
  const state = { history: ['previous-project'], audioLibrary: { old: true }, dailyProgress: { old: true } };
  const readers = [];
  class FileReaderFixture {
    readAsText(file) {
      this.pending = file.text().then(text => this.onload?.({ target: { result: text } }));
    }
    abort() { this.onabort?.(); }
    constructor() { readers.push(this); }
  }
  const setters = new Map();
  const dep = new Proxy({
    hydrateHistory: win.hydrateHistory, t: key => key,
    normalizeArtifactInstanceIds: value => value,
    setHistory: vi.fn(value => { state.history = value; }),
    setGeneratedContent: vi.fn(value => { state.generated = value; }),
    setWordSoundsAudioLibrary: vi.fn(value => { state.audioLibrary = value; }),
    setWordSoundsDailyProgress: vi.fn(value => { state.dailyProgress = value; }),
    onProjectLoadComplete: vi.fn(), projectFileInputRef: { current: { value: 'synthetic-file' } },
  }, { get(target, key) {
    if (key in target) return target[key];
    if (!setters.has(key)) setters.set(key, vi.fn());
    return setters.get(key);
  } });
  const api = new Function('window', 'FileReader', 'localStorage', `${between(misc, 'function _createProjectLoadOperationManager(', 'function handleRestoreView(')}\nreturn handleLoadProject;`)(win, FileReaderFixture, { setItem: vi.fn() });
  return { state, dep, async load(file) {
    api({ target: { files: [file] } }, dep);
    await readers.at(-1).pending;
  } };
}
function studentRestore(win) {
  const state = { words: [], sequence: [], activity: null, open: false };
  const deps = new Proxy({
    isTeacherMode: false, history: [], t: key => key,
    setWsPreloadedWords: value => { state.words = value; },
    setWsActivitySequence: value => { state.sequence = value; },
    setWordSoundsActivity: value => { state.activity = value; },
    setIsWordSoundsMode: value => { state.open = value; },
  }, { get(target, key) { return key in target ? target[key] : vi.fn(); } });
  const restore = new Function('window', `${between(misc, 'function handleRestoreView(', 'const detectClimaxArchetype =')}\nreturn handleRestoreView;`)(win);
  return { state, open: item => restore(item, { suppressLiveFollow: true }, deps) };
}
function mailbox() {
  const codec = between(anti, 'function _alloBase64UrlEncode(', 'function _alloReadAlloPackParam(');
  const split = between(anti, 'function _alloSplitPackChunks(', '// Cheap content fingerprint');
  const collect = between(anti, 'function _alloPruneResChunks(', '// Non-trickle ICE:');
  return new Function('CompressionStream', 'DecompressionStream', `${codec}\nconst ALLO_MB_CHUNK_CHARS = 60000;\n${split}\n${collect}\nreturn { encode: _alloEncodeAlloPack, decode: _alloDecodeAlloPack, split: _alloSplitPackChunks, collect: _alloCollectResChunk, finish: _alloFinishResChunk };`)(undefined, undefined);
}
function sender(box, prepared) {
  const packets = [];
  const env = {
    useCallback: fn => fn, mbLive: { code: 'SYN23' }, mbConfig: { url: 'https://synthetic.invalid', admin: 'synthetic' },
    prepareMailboxResourceImages: async () => prepared,
    _alloEncodeAlloPack: box.encode, _alloSplitPackChunks: box.split, mbPeersRef: { current: {} },
    _alloMailboxCallWithRetry: vi.fn(async (_url, message) => { packets.push(message.v); return { ok: true }; }),
    warnLog: vi.fn(),
  };
  const send = new Function(...Object.keys(env), `${between(anti, '  const _mbPushOneResource = useCallback(', '  const pushResourceToMailbox =')}\nreturn _mbPushOneResource;`)(...Object.values(env));
  return { packets, send };
}
function receiver(box) {
  const state = { history: [], received: [], opened: null, error: false };
  const store = { current: { parts: {}, applied: new Set() } };
  const env = {
    useCallback: fn => fn, mbChunkStoreRef: store, mbStudentCursorRef: { current: 1 },
    _alloCollectResChunk: box.collect, _alloFinishResChunk: box.finish, _alloDecodeAlloPack: box.decode,
    _alloStudentSafeResources: items => items.filter(item => item?.id && item.type === 'word-sounds'),
    setReceivedDeliveryResources: fn => { state.received = fn(state.received); },
    setHistory: fn => { state.history = fn(state.history); }, hydratedHistoryRef: { current: [] },
    setPendingQrAssignmentResource: value => { state.opened = value; },
    setMbResourceReceiveError: value => { state.error = value; }, addToast: vi.fn(), warnLog: vi.fn(),
  };
  const apply = new Function(...Object.keys(env), `${between(anti, '  const applyMbDownPayload = useCallback(', '  const createHomeworkAssignmentLink =')}\nreturn applyMbDownPayload;`)(...Object.values(env));
  return { state, store, apply };
}
function firebaseServices(win) {
  const docs = new Map();
  const reads = new Map();
  const env = {
    window: win, db: {}, doc: (_db, ...path) => path.join('/'),
    setDoc: vi.fn(async (ref, value) => { docs.set(ref, structuredClone(value)); }),
    getDoc: vi.fn(async ref => {
      reads.set(ref, (reads.get(ref) || 0) + 1);
      return { exists: () => docs.has(ref), data: () => structuredClone(docs.get(ref)) };
    }), console: { log: vi.fn(), error: vi.fn() },
  };
  const endMarker = '  return hydrated;\n};';
  const block = extras.slice(extras.indexOf('const SESSION_RESOURCE_INLINE_LIMIT ='), extras.indexOf(endMarker, extras.indexOf('const hydrateSessionAssets =')) + endMarker.length);
  if (!block.startsWith('const SESSION_RESOURCE_INLINE_LIMIT') || !block.endsWith('};')) throw new Error('Missing exact Firebase asset-function boundary');
  const api = new Function(...Object.keys(env), `${block}\nreturn { upload: uploadSessionAssets, hydrate: hydrateSessionAssets };`)(...Object.values(env));
  return { ...api, docs, reads, env };
}

afterEach(() => vi.useRealTimers());

describe('actual Word Sounds portable serializer', () => {
  it('the byte-preservation assertion rejects an isolated string-normalization mutation', () => {
    const marker = 'const asset = dataAudio ? { mime: dataAudio[1], base64: dataAudio[2] } : rawAsset;';
    const mutated = live.replace(marker, 'const asset = rawAsset;');
    expect(mutated).not.toBe(live);
    const original = resource();
    const { pack } = services(mutated);
    expect(() => assertContentAndBytes(pack(original), original)).toThrow();
    expect(read('live_aac_source.jsx')).toBe(live);
  });
  it('normalizes validated strings and objects without changing authored content, voice, sequence, progress or source bytes', () => {
    const { pack } = services();
    const original = resource();
    const before = JSON.stringify(original);
    const packed = pack(original);
    assertContentAndBytes(packed, original);
    expect(JSON.stringify(original)).toBe(before);
    expect(packed.data[0]._ttsRequiredKeys).toEqual(['cat', 'the cat can nap.', 'the cat can nap. it is on a mat.']);
    expect(pack(packed)).toEqual(packed);
  });
  it.each(['bad-mime', 'bad-base64', 'truncated-base64', 'remote', 'oversize'])('retains required %s omission evidence and preserves progress through repeated packing and repair', kind => {
    const { pack } = services();
    const original = resource();
    const bad = { 'bad-mime': 'data:text/plain;base64,QUJDRA==', 'bad-base64': 'data:audio/wav;base64,!broken',
      'truncated-base64': 'data:audio/wav;base64,A', remote: 'https://synthetic.invalid/clip.wav',
      oversize: `data:audio/wav;base64,${'A'.repeat(512 * 1024 + 4)}` }[kind];
    original.data[0]._ttsAssets[' Cat '] = bad;
    const packed = pack(original);
    expect(packed.data[0]._ttsAssets.cat).toBeUndefined();
    expect(packed.data[0]._ttsRequiredKeys).toContain('cat');
    expect(packed.data[0]._ttsOmittedKeys).toEqual(['cat']);
    expect(packed.progress).toEqual(original.progress);
    expect(pack(packed)).toEqual(packed);
    const repaired = structuredClone(packed);
    repaired.data[0]._ttsAssets.cat = clip(wave());
    const retried = pack(repaired);
    expect(retried.data[0]._ttsAssets.cat).toEqual(clip(wave()));
    expect(retried.data[0]._ttsOmittedKeys).toBeUndefined();
    expect(retried.progress).toEqual(original.progress);
    expect(retried.lessonPlanSequence).toEqual(original.lessonPlanSequence);
  });
  it('adds missing target words to a sparse manifest without making unrelated cached clips required', () => {
    const { pack } = services();
    const original = resource();
    original.data[0]._ttsRequiredKeys = ['the cat can nap.'];
    original.data[0]._ttsAssets['nonrequired cached clip'] = 'https://synthetic.invalid/cached.wav';
    const packed = pack(original);
    expect(packed.data[0]._ttsRequiredKeys).toEqual(['cat', 'the cat can nap.']);
    expect(packed.data[0]._ttsOmittedKeys).toEqual(['nonrequired cached clip']);
    expect(packed.progress).toEqual(original.progress);
  });
  it('retains missing required names when no asset map is present', () => {
    const { pack } = services();
    const original = resource();
    delete original.data[0]._ttsAssets;
    const packed = pack(original);
    expect(packed.data[0]._ttsAssets).toBeUndefined();
    expect(packed.data[0]._ttsRequiredKeys).toEqual(['cat', 'the cat can nap.', 'the cat can nap. it is on a mat.']);
    expect(pack(packed)).toEqual(packed);
  });
  it('does not attach original clips to a different projected target row', () => {
    const { win, pack } = services();
    const original = resource();
    original.wsPreloadedWords = structuredClone(original.data);
    const packed = pack(original, { sanitizeHistoryForCloud: items => {
      const safe = win.sanitizeHistoryForCloud(items);
      safe[0].data.reverse();
      safe[0].wsPreloadedWords.reverse();
      return safe;
    } });
    for (const layout of ['wsPreloadedWords', 'data']) {
      expect(packed[layout].map(word => word.targetWord)).toEqual(['Dog', 'Cat']);
      for (const word of packed[layout]) {
        expect(word._ttsAssets).toBeUndefined();
        expect(word._ttsRequiredKeys).toContain(word.targetWord.toLowerCase());
        expect(word._ttsOmittedKeys).toEqual([word.targetWord.toLowerCase()]);
      }
    }
    expect(packed.progress).toEqual(original.progress);
    expect(original.data.map(word => word.targetWord)).toEqual(['Cat', 'Dog']);
  });
  it('enforces the 512 item cap across the whole pack and bounds omission names', () => {
    const { pack } = services();
    const original = resource();
    original.data = [{ targetWord: 'clip0', _ttsAssets: Object.fromEntries(Array.from({ length: 1100 }, (_, i) => [`clip${i}`, clip(wave())])) },
      { targetWord: 'later', _ttsAssets: { later: clip(wave()) } }];
    const packed = pack(original);
    expect(Object.keys(packed.data[0]._ttsAssets)).toHaveLength(512);
    expect(packed.data[1]._ttsAssets).toBeUndefined();
    expect(packed.data[1]._ttsRequiredKeys).toEqual(['later']);
    expect(packed.data.flatMap(word => word._ttsOmittedKeys || [])).toHaveLength(512);
    expect(packed.data[0]._ttsOmittedKeys[0]).toBe('clip512');
    expect(packed.data[0]._ttsOmittedKeys.at(-1)).toBe('clip1023');
  });
  it('keeps the original 512 KiB per-clip and 6 MiB aggregate character limits', () => {
    const { pack } = services();
    const atLimit = 'A'.repeat(512 * 1024);
    const original = resource();
    original.data = [{ targetWord: 'clip0', _ttsRequiredKeys: Array.from({ length: 13 }, (_, i) => `clip${i}`),
      _ttsAssets: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`clip${i}`, clip(atLimit)])) }];
    const packed = pack(original);
    expect(Object.keys(packed.data[0]._ttsAssets)).toHaveLength(12);
    expect(Object.values(packed.data[0]._ttsAssets).reduce((n, value) => n + value.base64.length, 0)).toBe(6 * 1024 * 1024);
    expect(packed.data[0]._ttsOmittedKeys).toEqual(['clip12']);
    expect(packed.data[0]._ttsRequiredKeys).toContain('clip12');
  });
  it('prioritizes existing legacy words under one 512 item budget while preserving both authored layouts', () => {
    const { win, pack } = services();
    const original = resource();
    original.wsPreloadedWords = [{ targetWord: 'alias0', sentence: 'Authored alias sentence.', teacherOverride: { reviewed: true },
      _ttsAssets: Object.fromEntries(Array.from({ length: 512 }, (_, i) => [`alias${i}`, clip(wave())])) }];
    original.data = [{ targetWord: 'data-only', sentence: 'A different authored data sentence.', teacherOverride: { reviewed: false },
      _ttsAssets: { 'data-only': clip(wave()) } }];
    const before = JSON.stringify(original);
    const packed = pack(original);
    expect(Object.keys(packed.wsPreloadedWords[0]._ttsAssets)).toHaveLength(512);
    expect(packed.data[0]._ttsAssets).toBeUndefined();
    expect(packed.data[0]._ttsRequiredKeys).toEqual(['data-only']);
    expect(packed.data[0]._ttsOmittedKeys).toEqual(['data-only']);
    expect(packed.wsPreloadedWords[0].sentence).toBe('Authored alias sentence.');
    expect(packed.data[0].sentence).toBe('A different authored data sentence.');
    expect(packed.wsPreloadedWords[0].teacherOverride).toEqual({ reviewed: true });
    expect(packed.data[0].teacherOverride).toEqual({ reviewed: false });
    expect(packed.progress).toEqual(original.progress);
    expect(JSON.stringify(original)).toBe(before);
    const direct = win.AlloModules.WordSoundsReadiness.portable(original);
    expect(direct.wsPreloadedWords).toEqual(packed.wsPreloadedWords);
    expect(direct.data).toEqual(packed.data);
  });
  it('counts duplicate bytes in both existing layouts against one 6 MiB aggregate budget', () => {
    const { pack } = services();
    const base64 = 'A'.repeat(512 * 1024);
    const original = resource();
    original.wsPreloadedWords = [{ targetWord: 'alias0', _ttsAssets: Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`alias${i}`, clip(base64)])) }];
    original.data = [{ targetWord: 'data0', _ttsAssets: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`data${i}`, clip(base64)])) }];
    const packed = pack(original);
    expect(Object.keys(packed.wsPreloadedWords[0]._ttsAssets)).toHaveLength(4);
    expect(Object.keys(packed.data[0]._ttsAssets)).toHaveLength(8);
    const bytes = [packed.wsPreloadedWords, packed.data].flat().flatMap(word => Object.values(word._ttsAssets || {})).reduce((total, value) => total + value.base64.length, 0);
    expect(bytes).toBe(6 * 1024 * 1024);
    expect(packed.data[0]._ttsOmittedKeys).toEqual(['data8']);
    expect(packed.progress).toEqual(original.progress);
  });
  it('allows prototype-special word names as own audio properties without prototype mutation', () => {
    const { pack } = services();
    const original = resource();
    original.data = [{ targetWord: 'constructor', _ttsRequiredKeys: ['constructor', '__proto__'],
      _ttsAssets: JSON.parse(JSON.stringify({ constructor: clip(wave()) }).replace(/}$/, `,"__proto__":${JSON.stringify(clip(wave()))}}`)) }];
    const packed = pack(original);
    expect(Object.keys(packed.data[0]._ttsAssets)).toEqual(['constructor', '__proto__']);
    expect(Object.hasOwn(packed.data[0]._ttsAssets, '__proto__')).toBe(true);
    expect(packed.data[0]._ttsAssets.__proto__).toEqual(clip(wave()));
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    expect({}.base64).toBeUndefined();
  });
  it('never treats inherited audio keys as portable prepared clips', () => {
    const { pack } = services();
    const original = resource();
    original.data = [{ targetWord: 'cat', _ttsAssets: Object.create({ cat: clip(wave()) }) }];
    const packed = pack(original);
    expect(packed.data[0]._ttsAssets).toBeUndefined();
    expect(packed.data[0]._ttsRequiredKeys).toEqual(['cat']);
    expect(original.data[0]._ttsAssets.cat).toEqual(clip(wave()));
  });
  it('does not restore microphone, student recordings or arbitrary resource audio', () => {
    const { pack } = services();
    const original = resource();
    original.karaokeStudentAudio = clip(wave());
    original.data[0].audioRecording = `data:audio/wav;base64,${wave()}`;
    original.data[0].rawAudio = `data:audio/wav;base64,${wave()}`;
    original.data[0].microphone = clip(wave());
    const packed = pack(original);
    expect(packed.karaokeStudentAudio).toBeUndefined();
    expect(packed.data[0].audioRecording).toBeNull();
    expect(packed.data[0].rawAudio).toBeNull();
    expect(packed.data[0].microphone.base64).toBeNull();
    expect(packed.data[0]._ttsAssets.cat).toEqual(clip(wave()));
    const arbitrary = pack({ id: 'arbitrary', type: 'quiz', data: [{ _ttsAssets: { cat: clip(wave()) } }] });
    expect(arbitrary.data[0]._ttsAssets.cat.base64).toBeNull();
  });
  it('continues removing teacher fields and graded quiz keys from other resource types', () => {
    const { pack } = services();
    const original = { id: 'graded-quiz', type: 'quiz', teacherNotes: 'PRIVATE', facilitationNotes: 'PRIVATE', data: {
      deliverySettings: { feedbackTiming: 'teacher-graded' }, answerKey: ['PRIVATE'],
      questions: [{ question: 'Choose a word.', correctAnswer: 'PRIVATE', explanation: 'PRIVATE', teacherNotes: 'PRIVATE',
        options: [{ text: 'cat', isCorrect: true, feedback: 'PRIVATE' }, { text: 'dog', isCorrect: false }] }],
    } };
    const before = JSON.stringify(original);
    const packed = pack(original);
    expect(packed.teacherNotes).toBeUndefined();
    expect(packed.facilitationNotes).toBeUndefined();
    expect(packed.data.answerKey).toBeUndefined();
    expect(packed.data.questions[0]).toEqual({ question: 'Choose a word.', options: [{ text: 'cat' }, { text: 'dog' }] });
    expect(packed.data.answerKeysWithheld).toBe(true);
    expect(JSON.stringify(packed)).not.toContain('PRIVATE');
    expect(JSON.stringify(original)).toBe(before);
  });
});

describe('real project backup Blob and FileReader import route', () => {
  it('roundtrips the actual project JSON export and restores a full Word Sounds resource', async () => {
    const { win } = services();
    const original = resource();
    const backup = projectFile([original]);
    expect(backup.name).toBe('synthetic-practice-project.json');
    expect(backup.blob.type).toBe('application/json');
    const h = importer(win);
    await h.load(backup.blob);
    expect(h.state.history).toEqual([original]);
    expect(h.state.generated).toEqual(original);
    expect(h.dep.onProjectLoadComplete).toHaveBeenCalledWith({ success: true });
    expect(h.dep.projectFileInputRef.current.value).toBe('');
    const { pack } = services();
    assertContentAndBytes(pack(h.state.generated), original);
  });
  it('restores progress and prepared audio from a teacher project envelope, then preserves them on retry', async () => {
    const { win, pack } = services();
    const original = resource();
    const state = { history: [{ targetWord: 'Cat', correct: 3 }], audioLibrary: { cat: clip(wave()) },
      dailyProgress: { '2026-10-01': { attempted: 4, correct: 3 } }, confusionPatterns: { k: 1 } };
    const h = importer(win);
    await h.load(new NodeBlob([JSON.stringify({ mode: 'teacher', history: [original], wordSoundsState: state })]));
    expect(h.state.audioLibrary).toEqual(state.audioLibrary);
    expect(h.state.dailyProgress).toEqual(state.dailyProgress);
    expect(h.state.history).toEqual([original]);
    expect(pack(h.state.history[0]).progress).toEqual(original.progress);
    await h.load(new NodeBlob([JSON.stringify({ mode: 'teacher', history: [original], wordSoundsState: state })]));
    expect(h.state.audioLibrary).toEqual(state.audioLibrary);
    expect(h.state.dailyProgress).toEqual(state.dailyProgress);
  });
  it('uses the real student self-open function to retain the saved sequence and every prepared clip after reload', async () => {
    vi.useFakeTimers();
    const { win, pack } = services();
    const original = resource();
    const h = importer(win);
    await h.load(projectFile([original]).blob);
    const student = studentRestore(win);
    const prepared = pack(h.state.history[0]);
    student.open(prepared);
    await vi.runAllTimersAsync();
    expect(student.state.sequence).toEqual(original.lessonPlanSequence);
    expect(student.state.activity).toBe('blending');
    expect(student.state.open).toBe(true);
    expect(student.state.words).toEqual(prepared.data);
    expect(prepared.progress).toEqual(original.progress);
    student.open(prepared);
    await vi.runAllTimersAsync();
    expect(student.state.words).toEqual(prepared.data);
    expect(prepared.progress).toEqual(original.progress);
  });
  it('retains the audio in the legacy wsPreloadedWords array that the real student opener consumes', async () => {
    vi.useFakeTimers();
    const { win, pack } = services();
    const original = resource();
    original.wsPreloadedWords = structuredClone(original.data);
    const h = importer(win);
    await h.load(projectFile([original]).blob);
    const prepared = pack(h.state.history[0]);
    const student = studentRestore(win);
    student.open(prepared);
    await vi.runAllTimersAsync();
    assertContentAndBytes({ ...prepared, data: student.state.words }, original);
    expect(student.state.sequence).toEqual(original.lessonPlanSequence);
    expect(prepared.progress).toEqual(original.progress);
  });
  it('rejects damaged JSON without replacing previously loaded work', async () => {
    const { win } = services();
    const h = importer(win);
    await h.load(new NodeBlob(['{"history":broken}']));
    expect(h.state.history).toEqual(['previous-project']);
    expect(h.state.audioLibrary).toEqual({ old: true });
    expect(h.state.dailyProgress).toEqual({ old: true });
    expect(h.dep.onProjectLoadComplete).not.toHaveBeenCalled();
    expect(h.dep.addToast).toHaveBeenCalledWith('errors.project_file_load_failed', 'error');
    expect(h.dep.setHistory).not.toHaveBeenCalled();
  });
});

describe('real Class Mailbox JSON encoding, 60000-character chunks and student receive path', () => {
  it('preserves audio bytes, voices, sequence and progress through reordered and replayed synthetic packets', async () => {
    const { pack } = services();
    const base64 = wave(60 * 1024);
    const original = resource(base64);
    const prepared = pack(original);
    const box = mailbox();
    const tx = sender(box, prepared);
    await tx.send(original);
    expect(tx.packets.length).toBeGreaterThan(2);
    expect(tx.packets.slice(0, -1).every(packet => packet.data.length === 60000)).toBe(true);
    const rx = receiver(box);
    for (const packet of [...tx.packets].reverse()) await rx.apply(packet);
    assertContentAndBytes(rx.state.history[0], original, base64);
    expect(rx.state.received).toEqual([prepared]);
    expect(rx.state.opened).toEqual(prepared);
    for (const packet of tx.packets) await rx.apply(packet);
    expect(rx.state.history).toHaveLength(1);
    expect(rx.state.error).toBe(false);
    expect(rx.store.current.applied.has(tx.packets[0].rid)).toBe(true);
  });
  it('keeps an incomplete or damaged transfer out of student history and accepts a corrected retry', async () => {
    const { pack } = services();
    const original = resource(wave(60 * 1024));
    const prepared = pack(original);
    const box = mailbox();
    const tx = sender(box, prepared);
    await tx.send(original);
    const rx = receiver(box);
    for (const packet of tx.packets.slice(0, -1)) await rx.apply(packet);
    expect(rx.state.history).toEqual([]);
    const corrupted = { ...tx.packets.at(-1), data: '!!!invalid!!!' };
    await rx.apply(corrupted);
    expect(rx.state.history).toEqual([]);
    expect(rx.state.error).toBe(true);
    expect(rx.store.current.failures[corrupted.rid].count).toBe(1);
    for (const packet of tx.packets) await rx.apply(packet);
    expect(rx.state.history).toEqual([prepared]);
    expect(rx.state.error).toBe(false);
    expect(rx.store.current.failures[corrupted.rid]).toBeUndefined();
    expect(rx.state.history[0].progress).toEqual(original.progress);
  });
});

describe('actual Firebase upload JSON references and hydration with mocked document I/O', () => {
  it.each(['missing', 'damaged', 'oversize'])('keeps %s required-audio evidence through direct upload, hydration and a corrected retry', async kind => {
    const { win } = services();
    const original = resource();
    if (kind === 'missing') delete original.data[0]._ttsAssets[' Cat '];
    else original.data[0]._ttsAssets[' Cat '] = kind === 'damaged'
      ? 'data:audio/wav;base64,!damaged' : `data:audio/wav;base64,${'A'.repeat(512 * 1024 + 4)}`;
    const before = JSON.stringify(original);
    const fb = firebaseServices(win);
    const refs = await fb.upload('synthetic-app', [original], 'SYN23');
    const received = (await fb.hydrate('synthetic-app', refs))[0];
    expect(received.data[0]._ttsAssets.cat).toBeUndefined();
    expect(received.data[0]._ttsRequiredKeys).toContain('cat');
    if (kind !== 'missing') expect(received.data[0]._ttsOmittedKeys).toEqual(['cat']);
    expect(received.progress).toEqual(original.progress);
    expect(JSON.stringify(original)).toBe(before);
    const repaired = structuredClone(received);
    repaired.data[0]._ttsAssets.cat = clip(wave());
    const retryRefs = await fb.upload('synthetic-app', [repaired], 'SYN23');
    const retried = (await fb.hydrate('synthetic-app', retryRefs))[0];
    expect(retried.data[0]._ttsAssets.cat).toEqual(clip(wave()));
    expect(retried.data[0]._ttsOmittedKeys).toBeUndefined();
    expect(retried.progress).toEqual(original.progress);
    expect(retried.lessonPlanSequence).toEqual(original.lessonPlanSequence);
  });
  it('retains validated own prototype-special clips but rejects inherited clips on the direct Firebase path', async () => {
    const { win } = services();
    const original = resource();
    original.data = [{ targetWord: 'constructor', _ttsAssets: Object.fromEntries([
      ['constructor', clip(wave())], ['__proto__', clip(wave())], ['prototype', clip(wave())],
    ]) }, { targetWord: 'missing', _ttsAssets: Object.create({ missing: clip(wave()) }) }];
    const fb = firebaseServices(win);
    const refs = await fb.upload('synthetic-app', [original], 'SYN23');
    const hydrated = (await fb.hydrate('synthetic-app', refs))[0];
    expect(Object.keys(hydrated.data[0]._ttsAssets).sort()).toEqual(['__proto__', 'constructor', 'prototype']);
    expect(Object.hasOwn(hydrated.data[0]._ttsAssets, '__proto__')).toBe(true);
    for (const value of Object.values(hydrated.data[0]._ttsAssets)) expect(value).toEqual(clip(wave()));
    expect(hydrated.data[1]._ttsAssets).toBeUndefined();
    expect(hydrated.data[1]._ttsRequiredKeys).toEqual(['missing']);
    expect({}.base64).toBeUndefined();
  });
  it.each(['raw', 'student-pack'])('retains %s string/object audio through the real >2048-byte JSON-ref path', async route => {
    const { win, pack } = services();
    const base64 = wave(4096);
    const original = resource(base64);
    const input = route === 'raw' ? original : pack(original);
    const before = JSON.stringify(input);
    const fb = firebaseServices(win);
    const refs = await fb.upload('synthetic-app', [input], 'SYN23');
    expect(refs).toHaveLength(1);
    expect(refs[0].__alloResourceRef).toMatch(/^res_SYN23/);
    const resourceDoc = [...fb.docs.values()].find(value => value.kind === 'sessionResource');
    expect(resourceDoc.resource.data[0]._ttsAssets).toMatch(/^jsonref::wsaudio_/);
    expect([...fb.docs.values()].filter(value => value.kind === 'sessionJson')).toHaveLength(2);
    const hydrated = await fb.hydrate('synthetic-app', refs);
    assertContentAndBytes(hydrated[0], original, base64);
    expect(JSON.stringify(input)).toBe(before);
    expect([...fb.docs.values()].every(value => value.ownerUid === 'synthetic-teacher' && value.parentId === 'SYN23')).toBe(true);
    expect(JSON.stringify(refs)).not.toContain(base64);
  });
  it('roundtrips real chunked audio JSON, retries a missing asset, and retains progress on corrected hydration', async () => {
    vi.useFakeTimers();
    const { win } = services();
    const base64 = wave(100 * 1024);
    const original = resource(base64);
    const fb = firebaseServices(win);
    const refs = await fb.upload('synthetic-app', [original], 'SYN23');
    const entry = [...fb.docs].find(([, value]) => value.kind === 'sessionJsonChunks');
    expect(entry[1].chunks.length).toBeGreaterThan(1);
    const lostRef = `artifacts/synthetic-app/public/data/session_assets/${entry[1].chunks[0]}`;
    const saved = fb.docs.get(lostRef);
    fb.docs.delete(lostRef);
    const failure = fb.hydrate('synthetic-app', refs);
    const rejected = expect(failure).rejects.toMatchObject({ name: 'SessionAssetHydrationError', reason: 'missing' });
    await vi.runAllTimersAsync();
    await rejected;
    expect(fb.reads.get(lostRef)).toBe(3);
    expect(original.progress).toEqual(resource().progress);
    fb.docs.set(lostRef, saved);
    assertContentAndBytes((await fb.hydrate('synthetic-app', refs))[0], original, base64);
  });
  it('rejects damaged referenced JSON before producing a hydrated resource and accepts repaired data', async () => {
    const { win } = services();
    const original = resource(wave(4096));
    const fb = firebaseServices(win);
    const refs = await fb.upload('synthetic-app', [original], 'SYN23');
    const entry = [...fb.docs].find(([, value]) => value.kind === 'sessionJson');
    const saved = structuredClone(entry[1]);
    fb.docs.set(entry[0], { ...saved, data: '{damaged' });
    await expect(fb.hydrate('synthetic-app', refs)).rejects.toMatchObject({ reason: 'invalid-json-asset' });
    fb.docs.set(entry[0], saved);
    assertContentAndBytes((await fb.hydrate('synthetic-app', refs))[0], original, wave(4096));
  });
  it('does not silently strip raw Word Sounds clips when the portable helper is unavailable', async () => {
    const { win } = services();
    delete win.AlloModules.WordSoundsReadiness;
    const fb = firebaseServices(win);
    await expect(fb.upload('synthetic-app', [resource()], 'SYN23')).rejects.toThrow('Word Sounds audio preparation is unavailable');
    expect(fb.env.setDoc).not.toHaveBeenCalled();
  });
});
