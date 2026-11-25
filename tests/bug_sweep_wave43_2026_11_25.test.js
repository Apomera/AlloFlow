import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import * as escapeEngine from '../connected_escape_room_engine.js';
import * as escapeReview from '../connected_escape_room_review.js';

const ROOT = path.resolve(__dirname, '..');
const MIRRORS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const ALL_DELIVERABLES = [
  'firestore_sync_module.js',
  'brand_profile_module.js',
  'standards_context_module.js',
  'landmark_module.js',
  'annotation_inquiry_bridge.js',
  'karaoke_audio_store_module.js',
  'word_timing_module.js',
  'word_audio_shard_client.js',
  'packets_audio_kit.js',
  'gif_encoder.js',
  'quiz_ai_helpers.js',
  'quiz_mode_strategies.js',
  'connected_escape_room_engine.js',
  'connected_escape_room_review.js',
  'research_evidence_graph.js',
  'connected_escape_room_module.js',
];

const CLASSIC_FILES = ALL_DELIVERABLES.filter(
  f => f !== 'connected_escape_room_engine.js' && f !== 'connected_escape_room_review.js'
);

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadClassic(file, extraCtx = {}) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const win = extraCtx.window !== undefined ? extraCtx.window : { AlloModules: {} };
  const ctx = {
    window: win,
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    Uint8Array,
    Int16Array,
    Uint16Array,
    DataView,
    ArrayBuffer,
    Blob,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    Buffer,
    ...extraCtx,
  };
  vm.runInNewContext(code, ctx, { filename: file });
  return ctx;
}

describe('Wave 43 Core Storage/Audio/Quiz/Graph Hardening', () => {
  it('maintains 4-way SHA-256 mirror parity for all 16 Wave 43 deliverables', () => {
    for (const file of ALL_DELIVERABLES) {
      const rootHash = sha256(path.join(ROOT, file));
      for (const dir of MIRRORS) {
        const dest = path.join(ROOT, dir, file);
        expect(fs.existsSync(dest), `Missing mirror ${dest}`).toBe(true);
        expect(sha256(dest), `SHA-256 mismatch for ${dir}/${file}`).toBe(rootHash);
      }
    }
  });

  it('loads all 14 classic/UMD scripts cleanly across 5 hostile SSR modes (70/70)', () => {
    const modes = [
      () => ({ console, setTimeout, clearTimeout, URL, TextEncoder, Uint8Array, Int16Array, DataView, ArrayBuffer }),
      () => ({ window: null, console, setTimeout, clearTimeout, URL, TextEncoder, Uint8Array, Int16Array, DataView, ArrayBuffer }),
      () => ({ window: 42, console, setTimeout, clearTimeout, URL, TextEncoder, Uint8Array, Int16Array, DataView, ArrayBuffer }),
      () => ({ self: null, console, setTimeout, clearTimeout, URL, TextEncoder, Uint8Array, Int16Array, DataView, ArrayBuffer }),
      () => ({ module: null, console, setTimeout, clearTimeout, URL, TextEncoder, Uint8Array, Int16Array, DataView, ArrayBuffer }),
    ];
    for (const file of CLASSIC_FILES) {
      const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const makeCtx of modes) {
        expect(() => vm.runInNewContext(code, makeCtx(), { filename: file })).not.toThrow();
      }
    }
  });

  it('hardens firestore_sync_module against cycles, Infinity maxBytes, leading-space data URLs, and null-proto values', () => {
    const { window: win } = loadClassic('firestore_sync_module.js');
    // Cyclic stripHeavyArtwork
    const cyclic = { type: 'memory-aid', data: { cards: [{ visualImage: 'data:image/png;base64,AA==' }] } };
    cyclic.self = cyclic;
    expect(() => win.stripHeavyArtwork(cyclic)).not.toThrow();

    // Cyclic sourceSnapshot in sanitizeStudentResearchResource
    const doc = { type: 'simplified', data: 'Hello world' };
    doc.sourceSnapshot = doc;
    expect(() => win.sanitizeStudentResearchResource(doc)).not.toThrow();

    // Leading whitespace data: URL stripped
    expect(win.sanitizeSessionValue('  data:image/png;base64,AAAA', 'body')).toBeNull();

    // Infinity maxBytes does not bypass cap; Symbol maxBytes does not throw
    const rInf = win.prepareSessionResourcesForWrite([], { maxBytes: Infinity });
    expect(Number.isFinite(rInf.maxBytes)).toBe(true);
    expect(rInf.maxBytes).toBeLessThanOrEqual(256 * 1024);
    expect(() => win.prepareSessionResourcesForWrite([], { maxBytes: Symbol('cap') })).not.toThrow();

    // Object.create(null) field safety
    const nullProto = Object.create(null);
    expect(() => win.stripHeavyArtwork({ type: 'memory-aid', data: { cards: [{ visualImage: 'x', visualSource: nullProto }] } })).not.toThrow();
    expect(() => win.normalizeReadingRoleMetadata({ type: 'analysis', unitId: nullProto, sourceFamilyId: nullProto })).not.toThrow();
  });

  it('hardens brand_profile_module contrast, frozen exports, interleaved quotes, and mid-tone autoFix', () => {
    const store = new Map();
    const localStorage = {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
    };
    const { window: win } = loadClassic('brand_profile_module.js', { localStorage });
    const BP = win.AlloModules.BrandProfile;

    expect(Object.isFrozen(BP)).toBe(true);
    expect(Object.isFrozen(BP.DEFAULT_COLORS)).toBe(true);
    expect(Object.isFrozen(BP.DEFAULT_FONTS)).toBe(true);
    expect(BP.contrastRatio('zzzzzz', '#ffffff')).toBe(0);
    expect(BP.validateBrandProfile([]).ok).toBe(false);
    expect(BP.validateBrandProfile({ name: Object.create(null) }).ok).toBe(false);
    expect(BP.validateBrandProfile({ name: 'Test', fonts: { body: "'a\"'" } }).ok).toBe(false);

    // Mid-tone bg (#a0a0a0) nudges toward black (contrast ~8:1) rather than failing white (~2.6:1)
    const fixed = BP.autoFixBrandColors({ name: 'Mid', colors: { bg: '#a0a0a0', body: '#999999', heading: '#999999' } });
    expect(BP.contrastRatio(fixed.profile.colors.body, '#a0a0a0')).toBeGreaterThanOrEqual(4.5);
    expect(BP.contrastRatio(fixed.profile.colors.heading, '#a0a0a0')).toBeGreaterThanOrEqual(4.5);

    // Symbol logo dimensions & null-proto footer pageNumber do not crash
    expect(() => BP.brandProfileToHeaderHTML({ name: 'T', header: { text: 'Hi', showLogo: true }, logo: { src: 'data:image/png;base64,AA==', alt: 'Logo', width: Symbol('w') } })).not.toThrow();
    expect(() => BP.brandProfileToFooterHTML({ name: 'T', footer: { text: 'Foot', showPageNumber: true } }, Object.create(null))).not.toThrow();
  });

  it('hardens standards_context_module, landmark_module, and annotation_inquiry_bridge', () => {
    const scCtx = loadClassic('standards_context_module.js');
    const SC = scCtx.window.AlloModules.StandardsContext;
    const normInf = SC.normalize({ provider: Infinity, provenance: { provider: 'case-network' }, standards: [{ code: Infinity, label: 'Valid' }] });
    expect(normInf.provider).toBe('case-network');
    expect(normInf.standards[0].code).toBe('');
    expect(SC.normalizeInstructionalConstraints({ textAccessExpectation: '   ', primaryTextPolicy: 'preserve-primary' }).textAccessExpectation).toBe('preserve-primary');
    expect(SC.isEmpty(Object.create({ standards: [{}] }))).toBe(true);

    const lmCtx = loadClassic('landmark_module.js');
    const LM = lmCtx.window.AlloModules.Landmark;
    expect(() => LM.pickLandmark(Object.create(null))).not.toThrow();
    expect(LM.buildLandmark(42, 'tower')).toBeNull();

    const brCtx = loadClassic('annotation_inquiry_bridge.js', { globalThis: {} });
    const BR = brCtx.globalThis.AlloFlowAnnotationInquiryBridge;
    expect(Object.isFrozen(BR.stances)).toBe(true);
    expect(BR.validateAnnotation(
      { handoffId: 'h1', excerpts: [{}] },
      { kind: 'note', inquiryStance: 'supports', content: 'A valid note longer than 12 chars.', inquiryTarget: { handoffId: 'h1' } }
    )).toBe(false);
    const ho = BR.createHandoff({
      queryTerm: 'contact teacher@school.edu please',
      source: { title: Symbol('t'), creator: Object.create(null) },
      excerpts: [{ sentenceIndex: Symbol('s'), excerpt: 'Water boils at 100 degrees Celsius.' }],
    });
    expect(ho.ok).toBe(true);
    expect(ho.handoff.queryTerm).toContain('[email omitted]');
    expect(ho.handoff.queryTerm).not.toContain('teacher@school.edu');
    const ann = BR.createAnnotation(ho.handoff, { excerptId: 'excerpt-1', stance: 'supports', note: 'Clear evidence directly supports the claim.' });
    expect(ann.ok).toBe(true);
    const suite = BR.toAnnotationSuitePayload(ho.handoff, [{ ...ann.annotation, x: null, y: Symbol('y') }]);
    expect(suite.annotations[0].x).toBe(32);
    expect(suite.annotations[0].y).toBe(64);
  });

  it('hardens karaoke_audio_store_module against prototype keys, Infinity limits, Symbol metadata, and allowLegacyText:false', () => {
    const revoked = [];
    let urlSeq = 0;
    const mockURL = {
      createObjectURL: () => 'blob:mock-' + (++urlSeq),
      revokeObjectURL: u => revoked.push(u),
    };
    const { window: win } = loadClassic('karaoke_audio_store_module.js', { URL: mockURL });
    const KAS = win.AlloModules.KaraokeAudioStore;
    // Top-level object stays mutable (.current/.studentCurrent) while store instances are frozen
    expect(Object.isFrozen(KAS)).toBe(false);
    const store = KAS.createStore();
    expect(Object.isFrozen(store)).toBe(true);

    // Build a valid minimal 46-byte PCM WAV
    const wav = new Uint8Array(46);
    const dv = new DataView(wav.buffer);
    [82, 73, 70, 70].forEach((b, i) => { wav[i] = b; });
    dv.setUint32(4, 38, true);
    [87, 65, 86, 69, 102, 109, 116, 32].forEach((b, i) => { wav[8 + i] = b; });
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, 16000, true);
    dv.setUint32(28, 32000, true);
    dv.setUint16(32, 2, true);
    dv.setUint16(34, 16, true);
    [100, 97, 116, 97].forEach((b, i) => { wav[36 + i] = b; });
    dv.setUint32(40, 2, true);
    const wavB64 = Buffer.from(wav).toString('base64');

    // Prototype key "constructor" must hydrate cleanly instead of auto-quarantining
    const hydrated = store.hydrate({
      format: 'wav',
      version: 3,
      sentences: { constructor: wavB64 },
    });
    expect(hydrated).toBe(1);
    expect(store.get('constructor')).toMatch(/^blob:mock-/);

    // canonicalAudioMime('toString') does not leak Function
    const badMime = KAS.validateAudioPayload(wavB64, 'toString');
    expect(badMime.ok).toBe(false);
    expect(badMime.code).toBe('unsupported-mime');
    expect(badMime.reason).not.toContain('function toString');

    // Symbol metadata in put does not throw or corrupt previous entry
    const u1 = store.put('Hello world.', wavB64, 'audio/wav', 'ai', { speed: Symbol('bad'), voice: Object.create(null) });
    expect(u1).toMatch(/^blob:mock-/);

    // Infinity maxBytes falls back to default rather than bypassing cap
    const putInf = store.put('Second.', 'AA==', 'audio/wav', 'ai', null, { maxBytes: Infinity, maxClipBytes: Infinity });
    expect(putInf).toBeNull();
    expect(Number.isFinite(store.lastPutError().maxBytes)).toBe(true);
    expect(Number.isFinite(store.lastPutError().maxClipBytes)).toBe(true);

    // reconcile respects allowLegacyText: false
    store.put('Legacy sentence.', wavB64, 'audio/wav', 'ai');
    const rec = store.reconcile([
      { identityVersion: 4, adapterId: 'a', scopeId: 's', segmentId: '1', spokenText: 'Legacy sentence.', allowLegacyText: false },
    ]);
    expect(rec.removedAi).toBeGreaterThanOrEqual(1);
  });

  it('hardens word_timing_module, word_audio_shard_client, packets_audio_kit, and gif_encoder', async () => {
    // WordTiming
    const wtCtx = loadClassic('word_timing_module.js');
    const WT = wtCtx.window.AlloModules.WordTiming;
    expect(() => WT.tokenize(Object.create(null))).not.toThrow();
    expect(WT.weightPctAtTime({ parts: ['a', 'b'], weights: [1, 1], totalWeight: 2, boundaryMs: [50, 200, 100] }, 0.15)).toBeGreaterThanOrEqual(0);
    const env = WT.estimateFromChannel({ channelData: new Float64Array(400).fill(1e200), sampleRate: 8000, sentence: 'Hi there' });
    expect(env).not.toBeNull();
    expect(Number.isFinite(env.speechEndMs)).toBe(true);
    wtCtx.window.__alloOfflineOnly = true;
    wtCtx.window.location = { href: 'https://example.org/app', origin: 'https://example.org' };
    expect(await WT.timingsForUrl('https://example.org/a.mp3', 'Hello')).toBeNull();

    // WordAudioShardClient
    const scMod = loadClassic('word_audio_shard_client.js', { globalThis: {} });
    const Shards = scMod.globalThis.AlloWordAudioShards;
    const client = Shards.createWordAudioShardClient(42);
    expect(Object.isFrozen(client)).toBe(true);
    expect(client.resolveBaseUrls({ baseUrls: ['https://cdn.example.com/shards?x=1#y'] }).some(u => u.includes('?x=1'))).toBe(false);
    const throwingIter = { [Symbol.iterator]() { throw new Error('boom'); } };
    let resolveSlow;
    const slowFetch = () => new Promise(r => { resolveSlow = r; });
    const fastFetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify({ format: Shards.FORMAT, words: { apple: 's0' }, shards: { s0: { file: 's0.json' } } })) });
    const pSlow = client.loadIndex({ fetch: slowFetch, baseUrls: ['disk://shards/'] });
    const pFast = client.loadIndex({ force: true, fetch: fastFetch, baseUrls: ['disk://shards/'] });
    await pFast;
    resolveSlow({ ok: true, text: () => Promise.resolve(JSON.stringify({ format: Shards.FORMAT, words: { stale: 's0' }, shards: { s0: { file: 's0.json' } } })) });
    await pSlow;
    expect(client.hasWordSync('apple')).toBe(true);
    expect(client.hasWordSync('stale')).toBe(false);
    const pref = await client.prefetchWords(throwingIter, { fetch: fastFetch, baseUrls: ['disk://shards/'] });
    expect(pref.ok).toBe(true);
    expect(pref.loaded).toBe(0);

    // PacketsAudioKit
    const pkCtx = loadClassic('packets_audio_kit.js', { window: { lamejs: null } });
    const PK = pkCtx.window.AlloPacketAudioKit;
    expect(Object.isFrozen(PK)).toBe(true);
    expect(await PK.getMp3()).toBe(false);
    expect(PK.fromDataUri(Object.create(null))).toBeNull();
    expect(PK.toDataUri(new Uint8Array([1, 2]), 'audio/wav;evil,inject')).toMatch(/^data:audio\/wav;base64,/);
    expect(PK.wavToMp3(new Uint8Array(46), Symbol('kbps'))).toBeNull();

    // GifEncoder
    const gifCtx = loadClassic('gif_encoder.js', { window: {} });
    const Gif = gifCtx.window.AlloGif;
    expect(() => Gif.encodeCanvasesToBytes({ length: -5 }, 2, 2, 8)).toThrow(/at least one frame/i);
    expect(() => Gif.encodeCanvasesToBytes([{}], Symbol('w'), 2, 8)).toThrow(/invalid canvas dimensions/i);
    const mockCanvas = { getContext: () => ({ getImageData: () => ({ data: [999, -50, NaN, 255] }) }) };
    const gifBytes = Gif.encodeCanvasesToBytes([mockCanvas], 1, 1, Symbol('fps'));
    expect(gifBytes[0]).toBe(0x47);
    await expect(Gif.encodeFramesToGif(['DATA:image/png;base64,AA=='], 1, 1, 3)).rejects.toThrow(/unavailable/i);
  });

  it('hardens quiz_ai_helpers and quiz_mode_strategies', async () => {
    let crisisCalled = false;
    const qaCtx = loadClassic('quiz_ai_helpers.js', {
      window: {
        AlloModules: {},
        __alloOfflineOnly: true,
        SafetyContentChecker: { check: txt => (/hurt myself/i.test(txt) ? [{ category: 'self_harm' }] : []) },
        SelHub: { showCrisisModal: () => { crisisCalled = true; } },
      },
    });
    const QA = qaCtx.window.AlloModules.QuizAIHelpers;
    expect(Object.isFrozen(QA)).toBe(true);
    // Crisis safety gate MUST fire even when offline / AI unavailable
    const crisisRes = await QA.gradeFreeformAnswer({ studentResponse: 'I want to hurt myself', callGemini: null });
    expect(crisisRes.safetyPaused).toBe(true);
    expect(crisisRes.code).toBe('safety-paused');
    expect(crisisCalled).toBe(true);

    // Offline blocks normal AI call
    const offlineRes = await QA.gradeFreeformAnswer({ studentResponse: 'Photosynthesis makes glucose', callGemini: async () => '{"status":"correct","feedback":"Great"}' });
    expect(offlineRes.status).toBe('error');

    // QuizModeStrategies
    const qsCtx = loadClassic('quiz_mode_strategies.js');
    const QS = qsCtx.window.AlloModules.QuizModeStrategies;
    expect(Object.isFrozen(QS)).toBe(true);
    expect(QS.normalizeAssessmentOptions({ numericSettings: { valueWeight: null } }).numericSettings.valueWeight).toBe(0.5);
    expect(QS.normalizeAssessmentOptions({ numericSettings: { valueWeight: '' } }).numericSettings.valueWeight).toBe(0.5);
    expect(QS.normalizeAssessmentOptions({ numericSettings: { valueWeight: 0 } }).numericSettings.valueWeight).toBe(0);
    expect(() => QS.normalizeAssessmentOptions({ numericSettings: { valueWeight: Symbol('w') }, sequenceMaxSteps: Object.create(null) })).not.toThrow();
    expect(QS.resolveCriteriaCoverage([{ id: 'c1', statement: 'S1' }], null, Infinity, []).selectedIds).toEqual([]);
  });

  it('hardens connected_escape_room_engine, connected_escape_room_review, and research_evidence_graph', async () => {
    expect(Object.isFrozen(escapeEngine.TYPES)).toBe(true);
    // autoRepairRoom prevents collision with later valid ID
    const repaired = escapeEngine.autoRepairRoom({
      areas: [{ id: 'Room A', name: 'A', description: 'D' }, { id: 'room-a', name: 'B', description: 'D2' }],
      nodes: [],
    });
    expect(repaired.room.areas[0].id).not.toBe('room-a');
    expect(repaired.room.areas[1].id).toBe('room-a');

    // promptFor sanitizes control/newline/angle-brackets in options while preserving lesson source
    const prompt = escapeEngine.promptFor('A photosynthesis lesson with enough text.', { language: 'English\n<IGNORE>', seed: 's1\r\n<x>' });
    expect(prompt).toContain('A photosynthesis lesson with enough text.');
    expect(prompt).not.toContain('<IGNORE>');
    expect(prompt).not.toContain('<x>');

    // mergeProgress rejects empty/deep/__proto__ paths and handles null patch
    expect(() => escapeEngine.mergeProgress({}, { 'a..b': true })).toThrow(/Unsafe/);
    expect(() => escapeEngine.mergeProgress({}, { 'a.b.c.d.e.f.g.h.i': true })).toThrow(/Unsafe/);
    expect(() => escapeEngine.mergeProgress({}, null)).not.toThrow();

    // assessReview rejects non-reviewable inspect nodes
    expect(() => escapeReview.assessReview({ nodes: [{ id: 'n1', type: 'inspect' }] }, { id: 'n1', type: 'inspect' }, { answer: null, confidence: 'clear', reason: 'ok', suggestion: '' })).toThrow(/Unknown review object/);

    // ResearchEvidenceGraph
    const regCtx = loadClassic('research_evidence_graph.js', { globalThis: {} });
    const REG = regCtx.globalThis.AlloFlowResearchEvidenceGraph;
    expect(Object.isFrozen(REG)).toBe(true);
    expect(Object.isFrozen(REG.relationTypes)).toBe(true);

    // Binary cyclic graph completes immediately without 2^18 exponential blowup
    const cyc = { title: 'Test' };
    cyc.left = cyc;
    cyc.right = cyc;
    const t0 = Date.now();
    const cleaned = REG.sanitizePortableJournal(cyc);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(cleaned.left).toBe('[circular reference]');

    // Control-char prefixed data URL is stripped
    const stripped = REG.sanitizePortableJournal({ img: '\u0000 data:image/png;base64,AAAA' });
    expect(stripped.img).toBeUndefined();

    // Circular provenance does not crash buildEvidenceGraph snapshotId
    const circProv = {};
    circProv.self = circProv;
    expect(() => REG.buildEvidenceGraph({ sources: [{ id: 's1', citation: 'Book', sift: circProv }] })).not.toThrow();

    // normalizeCslDate clones & validates date-parts rather than returning raw untrusted object
    const rawDate = { 'date-parts': [[2025, 4, 1]], evil: 'drop-me' };
    const csl = REG.toCslJson({ sources: [{ id: 's1', title: 'T', citationData: { issued: rawDate } }] });
    expect(csl[0].issued).toEqual({ 'date-parts': [[2025, 4, 1]] });
    expect(csl[0].issued).not.toBe(rawDate);

    // Array inputs rejected in validators
    expect(REG.validateEvidenceGraph([]).ok).toBe(false);
    expect(REG.validateInteroperabilityBundle([]).ok).toBe(false);
  });
});
