import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const MIRRORS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];
const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const PHASE33_FILES = [
  'sel_hub/sel_hub_module.js',
  'error_reporter_module.js',
  'sensitive_workspace_module.js',
  'cinematic_studio_module.js',
  'concept_graph_3d_module.js',
];

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

describe('Phase 33: 4-way mirror parity & 3-host SRI / releaseId sync', () => {
  it('keeps all 5 Phase 33 deliverables syntax-valid, 4-way byte-identical, and synced in all 3 hosts', () => {
    const hashes = {};
    for (const file of PHASE33_FILES) {
      const buf = fs.readFileSync(path.join(ROOT, file));
      expect(() => new Function(buf.toString('utf8'))).not.toThrow();
      for (const mirror of MIRRORS.slice(1)) {
        const mBuf = fs.readFileSync(path.join(ROOT, mirror, file));
        expect(mBuf.equals(buf), `${file} mirror mismatch in ${mirror}`).toBe(true);
      }
      hashes[file] = {
        bytes: buf.length,
        integrity: 'sha384-' + createHash('sha384').update(buf).digest('base64'),
      };
    }

    const releaseIds = new Set();
    for (const host of HOST_FILES) {
      const src = fs.readFileSync(path.join(ROOT, host), 'utf8');
      const m = src.match(/const manifest = (\{[\s\S]*?\});\r?\n\s*Object\.keys\(manifest\.assets\)\.forEach/);
      expect(m, `manifest block in ${host}`).toBeTruthy();
      const manifest = JSON.parse(m[1]);
      for (const file of PHASE33_FILES) {
        expect(manifest.assets[file], `${file} in ${host}`).toEqual(hashes[file]);
      }
      const { releaseId, ...body } = manifest;
      const expectedReleaseId = createHash('sha256').update(canonical(body)).digest('hex');
      expect(releaseId).toBe(expectedReleaseId);
      releaseIds.add(releaseId);
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 33: Cinematic Studio hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'cinematic_studio_module.js'), 'utf8');

  it('enforces fail-closed AI gate, prompt fencing, safe filename/worker/FileReader lifecycle, and prototype safety', () => {
    expect(src).toContain('function csHasOwn');
    expect(src).toContain('function csSafeJsonParse');
    expect(src).toContain('function csSanitizeFilename');
    expect(src).toContain('function csFenceUntrusted');
    expect(src).toContain('__alloQrStudentMode');
    expect(src).toContain('UNTRUSTED_STEERING_PROMPT');
    expect(src).toContain('UNTRUSTED_REVISION_PROMPT');
    expect(src).toContain('UNTRUSTED_CAPTION_LINES');
    expect(src).toContain("csFenceUntrusted('SCENE_INTENT'");
    expect(src).toContain('const ALLOWED_CDN =');
    expect(src).toContain('revokeWorkerUrl');
    expect(src).toContain('clearProgress');
    expect(src).toContain('reader.onabort');
    expect(src).not.toContain('if (!callGemini)');

    const reactStub = { createElement: () => null, useState: () => [null, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useMemo: (f) => f() };
    const sandbox = { window: { AlloModules: {}, React: reactStub }, React: reactStub, console };
    vm.runInNewContext(src, sandbox);
    const internals = sandbox.window.AlloModules.__cinematicStudioInternals;

    // Prototype key in scene type must not crash validateStoryboard
    const val = internals.validateStoryboard({ scenes: [{ type: 'toString', narration: 'hi', props: {} }] }, 'hi');
    expect(val.ok).toBe(false);
    expect(val.errors[0]).toContain('unknown type');

    // parseAiJsonObject must reject arrays/primitives and strip __proto__
    expect(internals.parseAiJsonObject('[1,2,3]')).toBe(null);
    expect(internals.parseAiJsonObject('"just a string"')).toBe(null);
    const parsed = internals.parseAiJsonObject('{"__proto__":{"polluted":true},"ok":1}');
    expect(parsed).toEqual({ ok: 1 });
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Phase 33: ConceptGraph 3D hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'concept_graph_3d_module.js'), 'utf8');

  it('hardens script URL validation, SVG image blocking, GPU/XR cleanup, and prototype maps', () => {
    expect(src).toContain('function _validateScriptUrl');
    expect(src).toContain('function _isSafeNodeImageDataUrl');
    expect(src).toContain('WEBGL_lose_context');
    expect(src).toContain('removeEventListener(\'selectstart\'');
    expect(src).toContain('planeTex.dispose');
    expect(src).toContain('m.covered ? (m.coverText || \'?\') : n.label');
    expect(src).toContain('window.__alloLoadOptionalScript(\'three-core\')');
    expect(src).toContain('window.__alloConfigureTrustedScript(s, url)');

    const sandbox = { window: { AlloModules: {} }, console };
    vm.runInNewContext(src, sandbox);
    const CG = sandbox.window.AlloModules.ConceptGraph3D;

    // Reject SVG data URLs in normalizeNodeArt
    const art = CG.normalizeNodeArt({
      n1: { type: 'image', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
      n2: { type: 'image', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    });
    expect(art.n1).toBeUndefined();
    expect(art.n2 && art.n2.type).toBe('image');

    // parseRelatedness rejects null/empty/boolean scores and strips __proto__
    expect(CG.parseRelatedness('{"score":null}')).toBe(null);
    expect(CG.parseRelatedness('{"score":""}')).toBe(null);
    expect(CG.parseRelatedness('{"score":true}')).toBe(null);
    const rel = CG.parseRelatedness('{"__proto__":{"polluted":true},"score":0.75,"why":"linked"}');
    expect(rel).toEqual({ score: 0.75, why: 'linked' });
    expect(({}).polluted).toBeUndefined();

    // sceneToAxisValues avoids division by zero when width/height is 0
    const pt = CG.sceneToAxisValues({ bounds: { center: { x: 10, y: 20 } } }, 0, 0, { width: 0, height: 0 });
    expect(Number.isFinite(pt.x)).toBe(true);
    expect(Number.isFinite(pt.y)).toBe(true);
  });
});

describe('Phase 33: Error Reporter hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'error_reporter_module.js'), 'utf8');

  it('prevents teacher-log leak into student view, escapes level, closes duplicate-param bypass, and hardens policy/recursion', () => {
    expect(src).toContain('function syncPostureDraft()');
    expect(src).toContain('reportDraftFullLog');
    expect(src).toContain('url.searchParams.getAll(key)');
    expect(src).toContain('ya29\\.');
    expect(src).toContain('var isRecording = false;');
    expect(src).toContain('escapeHtml(level)');
    expect(src).toContain('Reflect.ownKeys(value)');
    expect(src).toContain('!Array.isArray(roster.students)');

    // Verify duplicate query param redaction and new token prefixes via module runtime
    const store = new Map();
    const storageMock = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    const sandbox = {
      window: {
        AlloModules: {},
        location: { href: 'https://alloflow.example/', hash: '' },
        localStorage: storageMock,
        sessionStorage: storageMock,
        addEventListener: () => {},
        removeEventListener: () => {},
        screen: { width: 1280, height: 800 },
      },
      document: {
        readyState: 'loading',
        addEventListener: () => {},
        getElementById: () => null,
      },
      navigator: { userAgent: 'Mozilla/5.0' },
      localStorage: storageMock,
      sessionStorage: storageMock,
      URL,
      console: { log: () => {}, warn: () => {}, error: () => {} },
      setTimeout,
      clearTimeout,
    };
    sandbox.self = sandbox.window;
    sandbox.globalThis = sandbox.window;
    vm.runInNewContext(src, sandbox);
    const ER = sandbox.window.AlloModules.ErrorReporter;

    // Duplicate query param bypass fixed
    const dup = ER.redactSecrets('https://tools.example/?next=ok&next=https%3A%2F%2Finner.example%2F%3Ftoken%3DSUPERSECRET123');
    expect(dup).not.toContain('SUPERSECRET123');

    // OAuth2 / Groq / AWS token prefixes redacted
    expect(ER.redactSecrets('tok=ya29.a0AfH6SMC1234567890abcdefghij')).not.toContain('a0AfH6SMC');
    expect(ER.redactSecrets('key=gsk_1234567890abcdefghijklmnop')).not.toContain('1234567890abcdef');
    expect(ER.redactSecrets('aws=AKIAIOSFODNN7EXAMPLE')).not.toContain('AKIAIOSFODNN7EXAMPLE');

    // Inherited policy endpoint rejected
    const protoPolicy = Object.create({ enabled: true, endpoint: 'https://evil.example/steal' });
    protoPolicy.version = 1;
    sandbox.window.ALLOFLOW_SUPPORT_REPORTING_POLICY = protoPolicy;
    expect(ER.getSupportReportingPolicy().valid).toBe(false);
  });
});

describe('Phase 33: Sensitive Workspace hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'sensitive_workspace_module.js'), 'utf8');

  it('enforces fail-closed QR/AI gates, idle expiration before touch, prototype safety, rate-limiting, audit logging, and feature titles', () => {
    expect(src).toContain('var _swUnsafeKey =');
    expect(src).toContain('Boolean(root.__alloQrStudentMode)');
    expect(src).toContain('root.__alloStudentAiDisabled === true || root.__alloAiSecretsLocked === true');
    expect(src).toContain('function isIdleExpired()');
    expect(src).toContain('visibilitychange');
    expect(src).toContain('function checkAuthRateLimit()');
    expect(src).toContain('PROTECTED_RATE_LIMITED');
    expect(src).toContain('function safeBrowserStorage(');
    expect(src).toContain('function readBackupText(');
    expect(src).toContain('\'educator-evaluation\': \'Educator Evaluation\'');
    expect(src).toContain('\'sped-timelines\': \'SPED Timelines\'');
    expect(src).toContain('\'mtss-triage\': \'MTSS Triage\'');
  });
});

describe('Phase 33: SEL Hub hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_hub_module.js'), 'utf8');

  it('routes unauth student SEL state to sessionStorage, adds CSP to Share Packet print, fixes prototype/AI/beep bugs, and completes right-to-delete', () => {
    expect(src).toContain('var _selIsSafeKey =');
    expect(src).toContain('var _selJsonReviver =');
    expect(src).toContain('key === \'alloflow_sel_station_progress\'');
    expect(src).toContain('key === \'alloflow_sel_tool_usage\'');
    expect(src).toContain('key === \'alloflow_sel_streak\'');
    expect(src).toContain('key === \'alloflow_sel_active_station\'');
    expect(src).toContain('http-equiv="Content-Security-Policy"');
    expect(src).toContain("script-src \\'none\\'");
    expect(src).not.toContain('<script>window.onload=function(){setTimeout(function(){window.print();},80);};');
    expect(src).toContain('_selActiveStationMemo = null;');
    expect(src).toContain('window.__alloSelHubPendingTool = null;');
    expect(src).toContain('callGemini: _selAiOn ? callGemini : null,');
    expect(src).toContain('if (callTTS._alloQrBlocked === true)');

    // Runtime check on SelHub registry & toolLinks prototype safety
    const sandbox = {
      window: { AlloModules: {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {} },
      document: { getElementById: () => null, createElement: () => ({ style: {}, setAttribute: () => {} }), head: { appendChild: () => {} }, body: { appendChild: () => {} } },
      console,
    };
    vm.runInNewContext(src, sandbox);
    const hub = sandbox.window.SelHub;
    expect(hub.isRegistered('constructor')).toBe(false);
    expect(hub.isRegistered('toString')).toBe(false);
    expect(hub.isRegistered('__proto__')).toBe(false);
    expect(hub.toolLinks.parse('#sel-hub/constructor')).toBe(null);
    expect(hub.toolLinks.parse('#sel-hub/__proto__')).toBe(null);
    expect(hub.toolLinks.station('#sel-hub/zones?station=__proto__')).toBe(null);
    expect(hub.toolLinks.parse('#sel-hub/zones')).toBe('zones');
  });
});
