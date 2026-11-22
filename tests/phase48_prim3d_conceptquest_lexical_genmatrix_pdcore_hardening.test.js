import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const manifestHelper = require(path.resolve('dev-tools/build_browser_delivery_manifest.cjs'));

const PHASE48_FILES = [
  'prim3d_module.js',
  'concept_quest_engine.js',
  'lexical_graph_module.js',
  'generation_matrix_module.js',
  'pd_core_module.js',
];

const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha384(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

describe('Phase 48 — Mirrors & Canonical 3-Host SRI Integrity', () => {
  it('keeps all 5 Phase 48 modules byte-identical across 4-way mirrors and synced across all 3 host manifests', () => {
    const parsedHosts = HOSTS.map((h) => manifestHelper.readEmbeddedManifest(fs.readFileSync(path.resolve(ROOT, h), 'utf8')));
    expect(parsedHosts.every(Boolean)).toBe(true);
    expect(new Set(parsedHosts.map((m) => m.releaseId)).size).toBe(1);

    for (const file of PHASE48_FILES) {
      const rootBuf = fs.readFileSync(path.resolve(ROOT, file));
      const rootIntegrity = sha384(rootBuf);
      for (const dir of MIRROR_DIRS) {
        const copyBuf = fs.readFileSync(path.resolve(ROOT, dir, file));
        expect(Buffer.compare(rootBuf, copyBuf), `${file} mirror mismatch in ${dir}`).toBe(0);
      }
      for (const m of parsedHosts) {
        expect(m.assets[file].bytes).toBe(rootBuf.length);
        expect(m.assets[file].integrity).toBe(rootIntegrity);
      }
    }
  });
});

describe('Phase 48 — prim3d_module.js hardening', () => {
  it('freezes API/collections, strips __proto__ & caps size in parsers, and blocks oversized deformGeometry', () => {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.Prim3D;
    new Function(fs.readFileSync(path.resolve(ROOT, 'prim3d_module.js'), 'utf8'))();
    const P = window.AlloModules.Prim3D;
    expect(Object.isFrozen(P)).toBe(true);
    expect(Object.isFrozen(P.SHAPES)).toBe(true);
    expect(Object.isFrozen(P.PART_PALETTE)).toBe(true);

    const poisoned = '{"name":"Safe\\u0007Box","__proto__":{"polluted3d":true},"parts":[{"shape":"box","size":[1,1,1]}]}';
    const r = P.parseRecipe(poisoned);
    expect(r).toBeTruthy();
    expect(r.name).toBe('Safe Box');
    expect(({}).polluted3d).toBeUndefined();

    // Oversized JSON rejected
    expect(P.parseRecipe('{"name":"' + 'a'.repeat(600 * 1024) + '","parts":[{"shape":"box"}]}')).toBeNull();

    // deformGeometry ignores absurd vertex count without looping
    const fakeGeo = { attributes: { position: { count: 999999999 } } };
    expect(P.deformGeometry(fakeGeo, { taper: 0.5 })).toBe(fakeGeo);
  });
});

describe('Phase 48 — concept_quest_engine.js hardening', () => {
  it('freezes API & lookup arrays, blocks unsafe image URLs in publicQuestState, and guards prototype keys/null quests', () => {
    const engine = require(path.resolve(ROOT, 'concept_quest_engine.js'));
    expect(Object.isFrozen(engine)).toBe(true);
    expect(Object.isFrozen(engine.ABILITIES)).toBe(true);
    expect(engine.ABILITIES.every((a) => Object.isFrozen(a))).toBe(true);

    const quest = engine.createSession({
      questions: [{
        question: 'Q1?',
        options: ['A', 'B'],
        correctIndex: 0,
        imageUrl: 'javascript:alert(1)',
        optionImageUrls: ['https://example.org/ok.png', 'data:text/html,<svg/onload=alert(1)>'],
      }],
    });
    const battle = engine.resolveTravel(quest, {}, 'room-2').quest;
    const pub = engine.publicQuestState(battle);
    const activeRoom = pub.rooms.find((r) => r.id === pub.currentRoomId);
    expect(activeRoom.challenge.imageUrl).toBeUndefined();
    expect(activeRoom.challenge.optionImageUrls).toEqual(['https://example.org/ok.png', '']);

    // Prototype-safe vote tallying & null quest guards
    expect(engine.tallyVotes({ __proto__: 'room-2', a: 'room-2' }, ['room-2'])).toBe('room-2');
    expect(engine.tallyVotes({ a: 'room-2' }, null)).toBeNull();
    expect(engine.resolveTravel(null, {}).error).toBeTruthy();
    expect(engine.resolveBattle(null, {}).error).toBeTruthy();
  });
});

describe('Phase 48 — lexical_graph_module.js hardening', () => {
  it('freezes API & provider, eliminates Object.prototype leaks in language/direction/id maps, and rejects unsafe URLs', () => {
    const sandbox = { console, URL };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.resolve(ROOT, 'lexical_graph_module.js'), 'utf8'), sandbox);
    const LG = sandbox.AlloModules.LexicalGraph;

    expect(Object.isFrozen(LG)).toBe(true);
    expect(Object.isFrozen(LG.LIMITS)).toBe(true);
    expect(LG.normalizeLanguage('toString')).toBe('');
    expect(LG.normalizeLanguage('constructor')).toBe('');
    expect(LG.languageName('constructor')).toBe('CONSTRUCTOR');
    expect(LG.expectedDirection('toString')).toBe('directed');
    expect(LG.expectedDirection('constructor')).toBe('directed');

    const provider = LG.createLocalProvider(LG.PILOT_SNAPSHOT);
    expect(Object.isFrozen(provider)).toBe(true);
    expect(provider.resolveLexeme('constructor').status).toBe('not-found');
    expect(provider.resolveLexeme('toString').status).toBe('not-found');

    // Reject credentialed or control-char source URLs and prototype-key node ids
    const snap = JSON.parse(JSON.stringify(LG.PILOT_SNAPSHOT));
    snap.dataset.sources[0].url = 'https://user:pass@example.org/entry';
    snap.nodes[0].id = 'constructor';
    const report = LG.validateSnapshot(snap);
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.code === 'source-url-invalid')).toBe(true);
    expect(report.errors.some((e) => e.code === 'node-id-invalid')).toBe(true);
  });
});

describe('Phase 48 — generation_matrix_module.js hardening', () => {
  it('scrubs secrets in buildFrozenGenerationSettings and nested arrays, blocks prototype leaks, fails closed on empty src- prefix, and survives cycles/BigInt', () => {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.GenerationMatrix;
    new Function(fs.readFileSync(path.resolve(ROOT, 'generation_matrix_module.js'), 'utf8'))();
    const M = window.AlloModules.GenerationMatrix;

    // 1. Secret redaction in buildFrozenGenerationSettings + nested arrays
    const frozen = M.buildFrozenGenerationSettings({
      toolOverrides: { quiz: { quizCount: 8, apiKey: 'sk-secret-1', nested: [[{ privateKey: 'pk-secret' }]] } },
      generationOptions: { token: 'tok-secret', ok: 'keep' },
      generationContext: { common: { credential: 'cred-secret', topic: 'Cells' } },
    });
    const serialized = JSON.stringify(frozen);
    expect(serialized).not.toContain('sk-secret-1');
    expect(serialized).not.toContain('pk-secret');
    expect(serialized).not.toContain('tok-secret');
    expect(serialized).not.toContain('cred-secret');
    expect(frozen.toolOverrides.quiz.quizCount).toBe(8);
    expect(frozen.generationOptions.ok).toBe('keep');

    // 2. Prototype leak blocked in typedOverrideFrom / scopedGenerationContext
    const proj = M.projectEffectiveGenerationConfig('__proto__', { toolOverrides: {} });
    expect(proj.fields).toEqual({});
    const projToStr = M.projectEffectiveGenerationConfig('toString', { toolOverrides: {} });
    expect(projToStr.fields).toEqual({});

    // 3. Fail-closed empty src-/fp- fingerprint
    expect(M.normalizeSourceFingerprint('src-')).toBe('');
    expect(M.normalizeSourceFingerprint('fp-')).toBe('');

    // 4. buildVariantKey without policy + cyclic/BigInt settings do not crash
    expect(M.buildVariantKey({ type: 'quiz', directive: 'review' })).toMatch(/^variant-/);
    const cyc = { topic: 'Cycles', count: 10n };
    cyc.self = cyc;
    expect(() => M.buildFrozenGenerationSettings({ generationContext: cyc })).not.toThrow();
  });
});

describe('Phase 48 — pd_core_module.js hardening', () => {
  it('freezes API, enforces finite numbers, fail-closes gates/empty modules/unknown types, validates resource image URLs, and handles cyclic canonicalize', () => {
    const win = { AlloModules: {} };
    const mod = { exports: {} };
    new Function('window', 'module', fs.readFileSync(path.resolve(ROOT, 'pd_core_module.js'), 'utf8'))(win, mod);
    const PD = win.AlloModules.PdCore;

    expect(Object.isFrozen(PD)).toBe(true);
    expect(Object.isFrozen(PD.ACTIVITY_TYPES)).toBe(true);
    expect(Object.isFrozen(PD.SCORABLE_TYPES)).toBe(true);

    // Infinity rejected in score gate & sim masteryScore
    expect(PD.evaluateGate({ id: 'q1', type: 'quiz', gate: { kind: 'score', threshold: 0.75 } }, { completed: true, score: Infinity, raw: { submitted: true } }).passed).toBe(false);
    expect(PD.evaluateGate({ id: 's1', type: 'sim', gate: { kind: 'score', threshold: 0.5 } }, { completed: true, score: 1, raw: {} }).passed).toBe(false);
    expect(PD.evaluateGate(null, { completed: true }).passed).toBe(false);
    expect(PD.evaluateGate({ id: 'r1', type: 'read', gate: { threshold: 0.9 } }, { completed: true }).passed).toBe(false);

    // Empty module fails closed
    expect(PD.evaluateModule({ sections: [] }, {}).complete).toBe(false);
    expect(PD.evaluateModule(null, {}).complete).toBe(false);

    // Unknown activity type fails closed
    expect(PD.normalizeResult({ id: 'x', type: 'unknown-type' }, { completed: true, score: 1 })).toMatchObject({ completed: false, score: null });

    // Unsafe resource item image URL rejected
    const badMod = {
      kind: 'pd_module',
      schema_version: 'pd-module-1.0',
      metadata: { id: 'safe-mod', title: 'Test' },
      sections: [{
        id: 's1',
        title: 'S1',
        activities: [{
          id: 'a1',
          type: 'resource',
          title: 'R1',
          content: {
            resourceType: 'glossary',
            data: { items: [{ term: 'UDL', def: 'Universal Design', image: 'javascript:alert(1)' }] },
          },
        }],
      }],
    };
    expect(PD.validatePdModule(badMod).ok).toBe(false);

    // Cyclic object in canonicalize throws clean Error (not stack overflow), and validateReviewCandidatePackage returns structured error instead of throwing
    const cyc = {};
    cyc.self = cyc;
    expect(() => PD.canonicalize(cyc)).toThrow(/cyclic/i);
    const pkgBad = {
      schema_version: PD.REVIEW_CANDIDATE_SCHEMA_VERSION,
      kind: 'pd_review_candidate',
      trust_model: 'learner-device-unverified',
      purpose: 'human-review-candidate',
      created_at: '2026-01-01T00:00:00.000Z',
      module: cyc,
      consent: {},
      activities: [],
      artifacts: [],
      integrity_summary: null,
      privacy_manifest: {},
      package_digest: 'sha256:' + '0'.repeat(64),
    };
    expect(PD.validateReviewCandidatePackage(pkgBad).ok).toBe(false);
  });
});
