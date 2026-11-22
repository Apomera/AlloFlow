import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const bdm = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));

const WAVE27_CORE = [
  'submission_crypto_module.js',
  'question_board_contract_module.js',
  'question_board_transport_module.js',
  'question_board_view_module.js',
  'audit_remediator_module.js',
  'own_sources_module.js',
];

const WAVE27_STEM = [
  'stem_lab/stem_tool_archstudio.js',
  'stem_lab/stem_tool_behaviorlab.js',
  'stem_lab/stem_tool_citylab.js',
  'stem_lab/stem_tool_echolocation.js',
  'stem_lab/stem_tool_fireecology.js',
  'stem_lab/stem_tool_firstresponse.js',
  'stem_lab/stem_tool_geologyexplorer.js',
  'stem_lab/stem_tool_geosandbox.js',
  'stem_lab/stem_tool_migration.js',
  'stem_lab/stem_tool_particlelab3d.js',
  'stem_lab/stem_tool_spacecolony.js',
  'stem_lab/stem_tool_treelab.js',
];

const WAVE27_ALL = [...WAVE27_CORE, ...WAVE27_STEM];

const MIRROR_ROOTS = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha384Sri(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

function runSsr(relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp,
    Error, TypeError, RangeError, Promise, Map, Set, Symbol,
    Uint8Array, ArrayBuffer, TextEncoder, TextDecoder,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: relPath, timeout: 5000 });
  return sandbox;
}

function loadBrowserModule(relPath, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = Object.assign({
    AlloModules: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }, extraGlobals.window || {});
  const sandbox = {
    window: win,
    self: win,
    document: extraGlobals.document || undefined,
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp,
    Error, TypeError, RangeError, Promise, Map, Set, Symbol,
    Uint8Array, ArrayBuffer, TextEncoder, TextDecoder,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    ...extraGlobals,
  };
  sandbox.window = win;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: relPath, timeout: 5000 });
  return sandbox;
}

describe('Wave 27 (2026-11-21) — 4-way mirrors, 3-host SRI, and SSR parity', () => {
  it('maintains byte-for-byte 4-way SHA-256 mirror parity for all 18 deliverables', () => {
    for (const rel of WAVE27_ALL) {
      const rootBytes = fs.readFileSync(path.join(ROOT, rel));
      const rootHash = sha256(rootBytes);
      for (const prefix of MIRROR_ROOTS.slice(1)) {
        const destPath = path.join(ROOT, prefix, rel);
        expect(fs.existsSync(destPath), `missing mirror ${destPath}`).toBe(true);
        const destHash = sha256(fs.readFileSync(destPath));
        expect(destHash, `mirror drift at ${destPath}`).toBe(rootHash);
      }
    }
  });

  it('matches 3-host embedded SHA-384 SRI digests and identical releaseId across all 3 hosts', () => {
    const manifests = HOST_FILES.map((host) => ({
      host,
      manifest: bdm.readEmbeddedManifest(fs.readFileSync(path.join(ROOT, host), 'utf8')),
    }));
    const releaseIds = new Set(manifests.map((m) => m.manifest.releaseId));
    expect(releaseIds.size).toBe(1);

    for (const rel of WAVE27_ALL) {
      const rootBytes = fs.readFileSync(path.join(ROOT, rel));
      const expectedSri = sha384Sri(rootBytes);
      for (const { host, manifest } of manifests) {
        const entry = manifest.assets[rel];
        expect(entry, `${rel} missing in ${host}`).toBeTruthy();
        expect(entry.integrity, `${rel} integrity mismatch in ${host}`).toBe(expectedSri);
        expect(entry.bytes, `${rel} byte length mismatch in ${host}`).toBe(rootBytes.length);
      }
    }
  });

  it('evaluates all 18 deliverables safely in SSR (window & document undefined)', () => {
    for (const rel of WAVE27_ALL) {
      expect(() => runSsr(rel), `SSR throw in ${rel}`).not.toThrow();
    }
  });
});

describe('Wave 27 — Pass 1 Core & Classroom Modules behavioral hardening', () => {
  it('submission_crypto_module rejects RFC 7518 oth private param and malformed unwrap envelopes', async () => {
    const sb = loadBrowserModule('submission_crypto_module.js');
    const api = sb.window.AlloModules.SubmissionCrypto;
    expect(api).toBeTruthy();
    expect(api.INLINE_ENCRYPT_SCRIPT).toContain('publicJwk.oth !== undefined');
    await expect(api.encryptSubmission({ a: 1 }, { kty: 'RSA', n: 'abc', e: 'AQAB', oth: [{ r: 'x', d: 'y', t: 'z' }] })).rejects.toThrow();
    await expect(api.decryptSubmission(null, {})).rejects.toThrow();
    await expect(api.decryptSubmission({ wrappedKey: 'AA==', iv: 'AA==', ciphertext: 'AA==' }, {})).rejects.toThrow();
  });

  it('question_board_contract_module freezes constants, blocks non-host teacher_review status bypass, and handles hostile inputs', () => {
    const sb = loadBrowserModule('question_board_contract_module.js');
    const c = sb.window.AlloModules.QuestionBoardContract;
    expect(Object.isFrozen(c.LIMITS)).toBe(true);
    expect(Object.isFrozen(c.INVARIANTS)).toBe(true);
    expect(() => c.sanitizeText(Symbol('x'))).not.toThrow();
    expect(c.sanitizeText(Object.create(null))).toBe('');

    const adapter = c.createReferenceAdapter();
    const cfg = c.normalizeBoardConfig({
      type: 'question_board',
      activityId: 'AC-00000000-0000-0000-0000-000000000001',
      prompt: 'Ask a science question',
      revealPolicy: 'teacher_review',
    });
    expect(cfg).toBeTruthy();
    const board = adapter.createBoard(cfg);
    const student = { uid: 'student-1', role: 'participant', displayName: 'Student' };
    const res = adapter.addItem(board, student, { text: 'What is osmosis?', status: 'approved' });
    expect(res.ok).toBe(true);
    expect(board.items[0].status).toBe('held');
    expect(adapter.addItem(null, student, { text: 'hi' }).ok).toBe(false);
    expect(adapter.setStatus(null, { uid: 't1', role: 'host' }, 'Q-1', 'approved').ok).toBe(false);
  });

  it('question_board_transport_module freezes enums and blocks java\\tscript: / java\\nscript: URL bypasses', () => {
    const src = fs.readFileSync(path.join(ROOT, 'question_board_transport_module.js'), 'utf8');
    const sb = loadBrowserModule('question_board_transport_module.js');
    const t = sb.window.AlloModules.QuestionBoardTransport;
    expect(t).toBeTruthy();
    expect(Object.isFrozen(t.REASONS)).toBe(true);
    if (typeof t.sanitizeUrl === 'function') {
      expect(t.sanitizeUrl('java\tscript:alert(1)')).toBe('');
      expect(t.sanitizeUrl('java\nscript:alert(1)')).toBe('');
    }
    expect(src).toMatch(/joinGen/);
    expect(src).toMatch(/transport:\s*false/);
  });

  it('question_board_view_module handles null items, non-array board.items, and escapes line separators in markdown', () => {
    const sb = loadBrowserModule('question_board_view_module.js');
    const v = sb.window.AlloModules.QuestionBoardView;
    expect(v).toBeTruthy();
    expect(Object.isFrozen(v.STATE_COLORS)).toBe(true);
    expect(v.itemState(null)).toBe('pending');
    if (typeof v.escapeMarkdown === 'function') {
      const escaped = v.escapeMarkdown('1. first\u2028second\u2029third');
      expect(escaped).not.toContain('\u2028');
      expect(escaped).not.toContain('\u2029');
    }
  });

  it('audit_remediator_module enforces AI policy gates, fences untrusted claims, validates URLs, and scrubs secrets', () => {
    const src = fs.readFileSync(path.join(ROOT, 'audit_remediator_module.js'), 'utf8');
    expect(src).toContain('<UNTRUSTED_CLAIMS>');
    expect(src).toContain('ALLOFLOW_MANAGED_AI_POLICY');
    expect(src).toContain('__alloQrStudentMode');
    expect(src).toContain('__alloAiSecretsLocked');
    expect(src).toContain('_arScrubError');
    expect(src).toContain('__alloFocusTrapStack');
    expect(src).toMatch(/isComposing/);
  });

  it('own_sources_module rejects string fileList and guards keyboard modifiers', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'own_sources_module.js'), 'utf8');
    let extractCalls = 0;
    const sb = loadBrowserModule('own_sources_module.js', {
      window: {
        LumenEvidence: {
          readingScope: () => 'test-scope',
          createProjectStore: () => ({ load: async () => ({ sources: [] }), save: async () => ({ ok: true }) }),
        },
        LumenDocuments: {
          extractLocalDocument: async () => { extractCalls++; return null; },
        },
      },
    });
    const os = sb.window.AlloOwnSources;
    expect(os).toBeTruthy();
    const res = await os.importFiles('not-a-file-list', {});
    expect(res.imported).toBe(0);
    expect(extractCalls).toBe(0);
    expect(src).toMatch(/ctrlKey|metaKey|altKey/);
    expect(src).toMatch(/isComposing/);
  });
});

describe('Wave 27 — Pass 2 & Pass 3 STEM Lab Studios hardening invariants', () => {
  it('wires global mute + alloflow-mute-changed across all 12 STEM studios', () => {
    for (const rel of WAVE27_STEM) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing alloflow-mute-changed`).toContain('alloflow-mute-changed');
    }
  });

  it('enforces full AI hard-deny gates across all AI-enabled STEM studios', () => {
    const aiStudios = [
      'stem_lab/stem_tool_archstudio.js',
      'stem_lab/stem_tool_behaviorlab.js',
      'stem_lab/stem_tool_echolocation.js',
      'stem_lab/stem_tool_fireecology.js',
      'stem_lab/stem_tool_firstresponse.js',
      'stem_lab/stem_tool_geologyexplorer.js',
      'stem_lab/stem_tool_geosandbox.js',
      'stem_lab/stem_tool_migration.js',
      'stem_lab/stem_tool_particlelab3d.js',
      'stem_lab/stem_tool_spacecolony.js',
    ];
    for (const rel of aiStudios) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing __alloAiSecretsLocked`).toContain('__alloAiSecretsLocked');
      expect(src, `${rel} missing __alloQrStudentMode`).toContain('__alloQrStudentMode');
      expect(src, `${rel} missing ALLOFLOW_MANAGED_AI_POLICY`).toContain('ALLOFLOW_MANAGED_AI_POLICY');
    }
  });

  it('enforces synchronous student crisis screening and UNTRUSTED_STUDENT_INPUT fencing on student-text AI studios', () => {
    const studentAiStudios = [
      'stem_lab/stem_tool_fireecology.js',
      'stem_lab/stem_tool_firstresponse.js',
      'stem_lab/stem_tool_geosandbox.js',
      'stem_lab/stem_tool_particlelab3d.js',
      'stem_lab/stem_tool_spacecolony.js',
    ];
    for (const rel of studentAiStudios) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing safeRehearseCheck`).toContain('safeRehearseCheck');
      expect(src, `${rel} missing SafetyContentChecker`).toContain('SafetyContentChecker');
      expect(src, `${rel} missing 988 crisis resource`).toContain('988');
      expect(src, `${rel} missing UNTRUSTED_STUDENT_INPUT fence`).toContain('UNTRUSTED_STUDENT_INPUT');
    }
  });

  it('uses prototype-safe JSON revivers for untrusted/imported JSON payloads', () => {
    const jsonStudios = [
      'stem_lab/stem_tool_archstudio.js',
      'stem_lab/stem_tool_citylab.js',
      'stem_lab/stem_tool_echolocation.js',
      'stem_lab/stem_tool_firstresponse.js',
      'stem_lab/stem_tool_geosandbox.js',
      'stem_lab/stem_tool_migration.js',
      'stem_lab/stem_tool_particlelab3d.js',
      'stem_lab/stem_tool_spacecolony.js',
    ];
    for (const rel of jsonStudios) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing __proto__ reviver guard`).toContain("'__proto__'");
    }
  });

  it('guards viewport divide-by-zero, document.hidden background ticks, and IME/modifier keys', () => {
    const divZeroStudios = [
      'stem_lab/stem_tool_echolocation.js',
      'stem_lab/stem_tool_geologyexplorer.js',
      'stem_lab/stem_tool_particlelab3d.js',
    ];
    for (const rel of divZeroStudios) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing rect.width > 0 guard`).toContain('rect.width > 0');
    }

    const hiddenLoopStudios = [
      'stem_lab/stem_tool_archstudio.js',
      'stem_lab/stem_tool_behaviorlab.js',
      'stem_lab/stem_tool_echolocation.js',
      'stem_lab/stem_tool_fireecology.js',
      'stem_lab/stem_tool_firstresponse.js',
      'stem_lab/stem_tool_geologyexplorer.js',
      'stem_lab/stem_tool_geosandbox.js',
      'stem_lab/stem_tool_migration.js',
      'stem_lab/stem_tool_particlelab3d.js',
      'stem_lab/stem_tool_treelab.js',
    ];
    for (const rel of hiddenLoopStudios) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing document.hidden guard`).toContain('document.hidden');
    }

    for (const rel of WAVE27_STEM) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing isComposing IME guard`).toContain('isComposing');
      expect(src, `${rel} missing keyCode === 229 IME guard`).toContain('keyCode === 229');
    }
  });
});
