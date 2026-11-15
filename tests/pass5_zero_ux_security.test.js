import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const readBytes = (rel) => readFileSync(resolve(ROOT, rel));

const PASS5_PUBLIC_MIRRORS = [
  'utils_pure_module.js',
  'quickstart_module.js',
  'reading_library_module.js',
  'lesson_teaching_research_module.js',
  'test_prep_hub_module.js',
  'view_persona_chat_module.js',
  'large_file_module.js',
  'tool_integration_sdk.js',
  'text_inquiry/text_inquiry.html',
  'text_inquiry/text_inquiry_search.js',
  'alphafold_explorer/alphafold_explorer.html',
  'walkthrough_copilot_module.js',
  'walkthrough_copilot_cdn_module.js',
  'walkthrough_copilot_standalone.js',
  'annotation_suite_module.js',
  'educator_evaluation_module.js',
  'educator-evaluation.html',
  'allopack-library.js',
  'school-rewards-practice.html',
  'apps_script/session_mailbox/Code.gs',
  'apps_script/school_rewards/Code.gs',
  'apps_script/school_rewards/Portal.html',
  'mailbox_script_source_module.js',
  'school_rewards_module.js',
  'life_skills_outing/ai.js',
  'life_skills_outing/life_skills_outing.html',
  'gemini_api_module.js',
  'ai_backend_module.js',
  'personas_module.js',
  'concept_quest_engine.js',
  'concept_quest_solo_module.js',
  'concept_quest_teacher_module.js',
  'escape_room_module.js',
  'concept_pictionary_module.js',
  'live_polling_module.js',
  'host_handlers_module.js',
  'story_forge_module.js',
  'video_studio_module.js',
  'safety_checker_module.js',
  'sel_hub/sel_tool_crisiscompanion.js',
  'sel_hub/sel_tool_digitalwellbeing.js',
  'sel_hub/sel_tool_conflicttheater.js',
];

const PASS5_SHIPPED_MANIFEST_MODULES = [
  'utils_pure_module.js',
  'quickstart_module.js',
  'reading_library_module.js',
  'lesson_teaching_research_module.js',
  'test_prep_hub_module.js',
  'view_persona_chat_module.js',
  'large_file_module.js',
  'walkthrough_copilot_cdn_module.js',
  'annotation_suite_module.js',
  'educator_evaluation_module.js',
  'mailbox_script_source_module.js',
  'school_rewards_module.js',
  'life_skills_outing/ai.js',
  'gemini_api_module.js',
  'ai_backend_module.js',
  'personas_module.js',
  'concept_quest_engine.js',
  'concept_quest_solo_module.js',
  'concept_quest_teacher_module.js',
  'escape_room_module.js',
  'concept_pictionary_module.js',
  'live_polling_module.js',
  'host_handlers_module.js',
  'story_forge_module.js',
  'video_studio_module.js',
  'safety_checker_module.js',
  'sel_hub/sel_tool_crisiscompanion.js',
  'sel_hub/sel_tool_digitalwellbeing.js',
  'sel_hub/sel_tool_conflicttheater.js',
];

function stubReactGlobals() {
  const reactStub = window.React || {};
  if (!reactStub.useState) reactStub.useState = (value) => [typeof value === 'function' ? value() : value, () => {}];
  if (!reactStub.useEffect) reactStub.useEffect = () => {};
  if (!reactStub.useRef) reactStub.useRef = () => ({ current: null });
  if (!reactStub.useCallback) reactStub.useCallback = (fn) => fn;
  if (!reactStub.useMemo) reactStub.useMemo = (fn) => fn();
  if (!reactStub.memo) reactStub.memo = (c) => c;
  if (!reactStub.createElement) reactStub.createElement = () => null;
  if (!reactStub.Fragment) reactStub.Fragment = 'fragment';
  window.React = reactStub;
}

describe('Pass-5 mirror, portable package, and delivery manifest integrity', () => {
  it('keeps all 42 Pass-5 modified files synchronized with desktop/web-app/public mirrors', () => {
    for (const rel of PASS5_PUBLIC_MIRRORS) {
      expect(readBytes(rel).equals(readBytes('desktop/web-app/public/' + rel)), rel).toBe(true);
    }
    expect(readBytes('firestore.rules').equals(readBytes('desktop/web-app/firestore.rules'))).toBe(true);
    expect(readBytes('firestore.indexes.json').equals(readBytes('desktop/web-app/firestore.indexes.json'))).toBe(true);
  });

  it('keeps all 3 copies of portable remediation scripts byte-identical', () => {
    for (const filename of ['alloflow_portable.py', 'render_tagged_pdf.cjs']) {
      const canonical = readBytes('agent_skills/alloflow-portable-remediation/scripts/' + filename);
      expect(readBytes('platform_packages/claude-alloflow/skills/alloflow-portable-remediation/scripts/' + filename).equals(canonical)).toBe(true);
      expect(readBytes('plugins/alloflow-pdf-remediation/skills/alloflow-portable-remediation/scripts/' + filename).equals(canonical)).toBe(true);
    }
  });

  it('pins exact sha384 hashes and valid releaseId in AlloFlowANTI.txt for Pass-5 modules', () => {
    const builder = require('../dev-tools/build_browser_delivery_manifest.cjs');
    const hostText = read('AlloFlowANTI.txt');
    const manifest = builder.readEmbeddedManifest(hostText);
    const { releaseId, ...body } = manifest;

    expect(manifest.fallbackCommit).toBeNull();
    expect(manifest.allowDesktopRemoteFallback).toBe(false);
    expect(releaseId).toBe(crypto.createHash('sha256').update(builder.canonical(body)).digest('hex'));

    for (const rel of PASS5_SHIPPED_MANIFEST_MODULES) {
      const bytes = readBytes(rel);
      const expectedIntegrity = 'sha384-' + crypto.createHash('sha384').update(bytes).digest('base64');
      expect(manifest.assets[rel], rel).toEqual({
        bytes: bytes.length,
        integrity: expectedIntegrity,
      });
    }
  });
});

describe('Pass-5 F-57, F-60, F-63, F-64, F-66 core platform & rules safeguards', () => {
  it('enforces fail-closed Escape Room modes, validAppId, and boardOpen in firestore.rules', () => {
    const rules = read('firestore.rules');
    expect(rules).toContain("return !(mode in ['', 'team-race', 'escape-room']) || (");
    expect(rules).toContain("return oldEscape.get('mode', '') in ['', 'team-race', 'escape-room', 'connected-room', 'concept-quest']");
    expect(rules).toContain('function validAppId(id)');
    expect(rules).toContain('boardOpen()');
  });

  it('preserves educator passcode and clinical/legal-hold records during ErrorBoundary cache wipe', () => {
    const anti = read('AlloFlowANTI.txt');
    expect(anti).toContain('alloflow_educator_access_code_v1');
    expect(anti).toContain('alloflow_educator_access_backoff_v1');
    expect(anti).toContain('alloflow_ai_secrets_locked_v1');
    expect(anti).toContain('legalHold');
    expect(anti).toContain('/psych|casebook|clinical|legal/i.test(db.name)');
  });

  it('strips per-learner accuracy breakdowns in Concept Quest snapshots and enforces managed AI policy headers in SafetyChecker', () => {
    const cq = read('concept_quest_engine.js');
    expect(cq).toContain('out.learningTotals = Object.assign({}, quest.learningTotals, { learners: {} });');

    const sc = read('safety_checker_module.js');
    expect(sc).toContain('window.ALLOFLOW_MANAGED_AI_POLICY');
    expect(sc).toContain("headers['x-goog-api-key'] = String(apiKey)");
  });
});

describe('Pass-5 F-71, F-72 companion tools, token isolation, HTML hardening, and annotation limits', () => {
  beforeAll(() => {
    stubReactGlobals();
    loadAlloModule('annotation_suite_module.js');
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('migrates legacy walkthrough copilot tokens from localStorage to sessionStorage', () => {
    const standalone = read('walkthrough_copilot_standalone.js');
    const source = read('walkthrough_copilot_source.jsx');
    expect(standalone).toContain("var TOKEN_KEY = 'allo_wcop_delivery_token_v1';");
    expect(source).toContain("const WCOP_TOKEN_KEY = 'allo_wcop_delivery_token_v1';");
    expect(source).toContain('window.sessionStorage.removeItem(WCOP_TOKEN_KEY)');
    expect(standalone).toContain('window.sessionStorage.removeItem(TOKEN_KEY)');

    const domHooks = { app: {}, live: {}, foot: {} };
    const ctx = vm.createContext({
      window: {
        AlloModules: {},
        localStorage,
        sessionStorage,
      },
      document: {
        getElementById: (id) => domHooks[id] || { textContent: '' },
      },
      URL,
      console,
    });
    localStorage.setItem('allo_wcop_delivery_v1', JSON.stringify({
      execUrl: 'https://script.google.com/macros/s/demo/exec',
      token: 'legacy-secret-token',
      owner: 'principal@district.edu',
    }));
    const slice = standalone.slice(standalone.indexOf('var STORE_KEY ='), standalone.indexOf('function saveConnection('));
    vm.runInContext(
      `var state = { delivery: { execUrl: '', token: '', owner: '' } };\n` + slice + '\nloadConnection(); this.result = state.delivery;',
      ctx
    );
    expect(ctx.result.token).toBe('legacy-secret-token');
    expect(sessionStorage.getItem('allo_wcop_delivery_token_v1')).toBe('legacy-secret-token');
    expect(JSON.parse(localStorage.getItem('allo_wcop_delivery_v1')).token).toBeUndefined();
  });

  it('bounds and sanitizes AnnotationSuite.importAnnotations against prototype keys and oversized batches', () => {
    const api = window.AlloModules.AnnotationSuite;
    expect(typeof api.importAnnotations).toBe('function');

    const tooMany = Array.from({ length: 1001 }, (_, i) => ({
      id: `n-${i}`, kind: 'note', text: 'hi', anchor: { x: 1, y: 2 }, rects: [{ x: 1, y: 2, w: 10, h: 10 }],
    }));
    expect(api.importAnnotations([], { annotations: tooMany }).error).toBe('bad-shape');

    const mixed = api.importAnnotations([], {
      annotations: [
        JSON.parse('{"id":"a1","kind":"note","text":"valid note","x":10,"y":20,"rects":[{"x":10,"y":20,"w":30,"h":12}],"__proto__":{"polluted":true},"evilProp":"drop-me"}'),
        { id: 'bad-kind', kind: 'script', text: 'x', x: 1, y: 2, rects: [{ x: 1, y: 2, w: 3, h: 4 }] },
        { id: 'bad-coord', kind: 'note', text: 'x', x: Number.NaN, y: 0, rects: [{ x: Number.NaN, y: 0, w: 10, h: 10 }] },
      ],
    });
    expect(mixed.added).toBe(1);
    expect(mixed.skipped).toBe(2);
    expect(mixed.list).toHaveLength(1);
    expect(mixed.list[0].text).toBe('valid note');
    expect(mixed.list[0].evilProp).toBeUndefined();
    expect({}.polluted).toBeUndefined();
  });

  it('hardens educator_evaluation_source, root standalone HTML pages, and allopack-library.js', () => {
    const ee = read('educator_evaluation_source.jsx');
    expect(ee).toContain('/^https:\\/\\/script\\.google\\.com\\/macros\\/s\\/[A-Za-z0-9_-]+\\/exec$/');
    expect(ee).toContain('Content-Security-Policy');
    expect(ee).toContain('no-referrer');

    for (const htmlFile of [
      'accessibility_demo.html',
      'geometry_world_demo.html',
      'walkthrough-copilot.html',
      'educator-evaluation.html',
      'speech_device_test.html',
      'school-rewards-practice.html',
    ]) {
      const html = read(htmlFile);
      expect(html, `${htmlFile} meta referrer`).toMatch(/<meta[^>]+name=["']referrer["'][^>]+content=["']no-referrer["']/i);
      expect(html, `${htmlFile} CDN scripts/fonts`).not.toMatch(/https?:\/\/(?:unpkg\.com|fonts\.googleapis\.com|cdnjs\.cloudflare\.com)/i);
    }

    expect(read('walkthrough-copilot.html')).toContain('Content-Security-Policy');
    expect(read('educator-evaluation.html')).toContain('Content-Security-Policy');
    expect(read('geometry_world_demo.html')).toContain('./vendor/three-r128/three.min.js');
    expect(read('accessibility_demo.html')).not.toMatch(/\.innerHTML\s*=\s*[^"'\s;]/);

    const speech = read('speech_device_test.html');
    expect(speech).toContain('function allowedWorkerUrl');
    expect(speech).toContain('credentials: "omit", referrerPolicy: "no-referrer"');

    const rewardsPractice = read('school-rewards-practice.html');
    expect(rewardsPractice).toContain('512*1024');
    expect(rewardsPractice).toContain('/^[a-z0-9_-]{1,40}$/i');

    const packLib = read('allopack-library.js');
    expect(packLib).toContain("credentials: 'omit', referrerPolicy: 'no-referrer'");
    expect(packLib).toContain('25 * 1024 * 1024');
    expect(packLib).toContain('/^[A-Za-z0-9_-]+$/');
    expect(packLib).toContain('/^[A-Za-z0-9_./-]+\\.json$/');
  });
});

describe('Pass-5 F-73 tool integration SDK and search redaction', () => {
  it('fails closed on overdue review windows by default while allowing graceful runtime warnings via allowOverdue', () => {
    const sdk = require('../tool_integration_sdk.js');
    const overdueContract = {
      schemaVersion: 1,
      id: 'bounded_text_tool',
      name: 'Bounded Text Tool',
      version: '1.2.3',
      reviewedAt: '2026-01-01',
      reviewAfter: '2026-02-01',
      license: { spdx: 'MIT' },
      citation: { text: 'Cite tool version.' },
      supportedMethodPacks: ['humanistic_interpretation'],
      capabilities: { captureArtifact: true, rawDataIncluded: false },
      privacy: { learnerApprovalRequired: true, directIdentifiersAllowed: false, sanitizerId: 'bounded_guard_v1', sanitizerRequired: false },
      reproducibility: { requiredFields: ['softwareVersion', 'sourceRecordId', 'parameters', 'randomSeed', 'limitations', 'transformations'] },
    };

    const strictCheck = sdk.validateContract(overdueContract, { now: '2027-02-01' });
    expect(strictCheck.ok).toBe(false);
    expect(strictCheck.errors).toContain('integration review is overdue');

    const lenientCheck = sdk.validateContract(overdueContract, { now: '2027-02-01', allowOverdue: true });
    expect(lenientCheck.ok).toBe(true);
    expect(lenientCheck.warnings).toContain('integration review is overdue');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const adapter = sdk.createAdapter({
        contract: overdueContract,
        buildCapture: (payload) => payload,
        validationOptions: { now: '2027-02-01' },
      });
      expect(typeof adapter.prepare).toBe('function');
      expect(warnSpy).toHaveBeenCalled();

      expect(() => sdk.createAdapter({
        contract: overdueContract,
        buildCapture: (payload) => payload,
        validationOptions: { now: '2027-02-01', strictReviewWindow: true },
      })).toThrow(/overdue/);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('redacts emails, SSNs, phones, and API/Bearer tokens before text_inquiry search fetches', async () => {
    const searchClient = require('../text_inquiry/text_inquiry_search.js');
    const originalFetch = global.fetch;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, source: 'Serper', results: [] }),
    }));
    global.fetch = fetchMock;
    try {
      const sensitive = 'student@school.edu 123-45-6789 555-234-5678 AIzaSyABCDEFGHIJKLMNOPQRSTUVWX sk-1234567890abcdefghijklmnop';
      await searchClient.search(sensitive, {});
      expect(fetchMock).toHaveBeenCalledOnce();
      const [requestedUrl, options] = fetchMock.mock.calls[0];
      expect(requestedUrl).not.toContain('student@school.edu');
      expect(requestedUrl).not.toContain('123-45-6789');
      expect(requestedUrl).not.toContain('555-234-5678');
      expect(requestedUrl).not.toContain('AIzaSy');
      expect(requestedUrl).not.toContain('sk-123456');
      expect(options).toMatchObject({ credentials: 'omit' });
    } finally {
      global.fetch = originalFetch;
    }

    for (const htmlRel of ['text_inquiry/text_inquiry.html', 'alphafold_explorer/alphafold_explorer.html']) {
      const html = read(htmlRel);
      expect(html).toMatch(/<meta[^>]+name=["']referrer["'][^>]+content=["']no-referrer["']/i);
      expect(html).toContain('__proto__');
    }
  });
});

describe('Pass-5 F-74 & F-75 SSRF guards, AI gating, local-first delivery, avatar sanitization, and media caps', () => {
  beforeAll(() => {
    stubReactGlobals();
    loadAlloModule('utils_pure_module.js');
    loadAlloModule('lesson_teaching_research_module.js');
    loadAlloModule('test_prep_hub_module.js');
    loadAlloModule('large_file_module.js');
  });

  afterEach(() => {
    delete window.__alloStudentAiDisabled;
    delete window._isDesktopBundledApp;
    window.AlloModules.LargeFileHandler.isProcessing = false;
    window.AlloModules.LargeFileHandler.cancelRequested = false;
    vi.restoreAllMocks();
  });

  it('blocks private/local/numeric IP SSRF targets and spoofed YouTube/Google query strings in UtilsPure', async () => {
    const UP = window.AlloModules.UtilsPure;
    expect(UP.isGoogleRedirect('https://evil.example/?q=google.com/url')).toBe(false);
    expect(UP.isGoogleRedirect('https://www.google.com/url?q=https://example.com')).toBe(true);
    expect(UP.isYouTubeUrl('https://evil.example/?v=youtube.com/watch')).toBe(false);
    expect(UP.isYouTubeUrl('https://youtu.be/abc123')).toBe(true);

    const fetchMock = vi.fn();
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      for (const blocked of [
        'javascript:alert(1)',
        'file:///etc/passwd',
        'https://user:pass@example.com/article',
        'http://localhost:8080/secret',
        'http://printer.local/admin',
        'http://127.0.0.1/status',
        'http://169.254.169.254/latest/meta-data/',
        'http://0x7f000001/',
        'http://0177.0.0.1/',
        'http://[::1]/',
        'http://[::ffff:127.0.0.1]/',
      ]) {
        await expect(UP.fetchAndCleanUrl(blocked), blocked).rejects.toThrow();
      }
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('gates LessonTeachingResearch.readPublicGuidance on __alloStudentAiDisabled and strips credentials/referrer', async () => {
    const research = window.AlloModules.LessonTeachingResearch;
    const guideUrl = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15';
    window.__alloStudentAiDisabled = true;
    const blockedFetch = vi.fn();
    await expect(research.readPublicGuidance(guideUrl, { fetch: blockedFetch })).rejects.toThrow(/disabled/i);
    expect(blockedFetch).not.toHaveBeenCalled();

    delete window.__alloStudentAiDisabled;
    const okFetch = vi.fn(async () => ({
      ok: true,
      url: 'https://r.jina.ai/' + guideUrl,
      headers: { get: () => null },
      text: async () => 'Developing Effective Fractions Instruction\nURL Source: ' + guideUrl + '\nMarkdown Content:\nHelp students recognize that fractions are numbers.',
    }));
    await research.readPublicGuidance(guideUrl, { fetch: okFetch });
    expect(okFetch).toHaveBeenCalledWith(
      'https://r.jina.ai/' + guideUrl,
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' })
    );
  });

  it('orders TestPrepHub local assets first in bundled desktop mode and strips credentials/referrer on fetches', async () => {
    const Hub = window.AlloModules.TestPrepHub;
    expect(Hub.repoAssetCandidates('./test_prep/catalog.json')[0]).toBe('https://alloflow-cdn.pages.dev/test_prep/catalog.json');

    window._isDesktopBundledApp = true;
    expect(Hub.repoAssetCandidates('./test_prep/catalog.json')).toEqual([
      './test_prep/catalog.json',
      'https://alloflow-cdn.pages.dev/test_prep/catalog.json',
      'https://raw.githubusercontent.com/Apomera/AlloFlow/main/test_prep/catalog.json',
    ]);

    const origFetch = globalThis.fetch;
    const origWinFetch = window.fetch;
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ schemaVersion: 1 }) }));
    globalThis.fetch = window.fetch = fetchMock;
    try {
      await Hub.fetchRepoJson('./test_prep/catalog.json', (v) => v && v.schemaVersion === 1);
      expect(fetchMock).toHaveBeenCalledWith(
        './test_prep/catalog.json',
        expect.objectContaining({ cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
      );
    } finally {
      globalThis.fetch = origFetch;
      window.fetch = origWinFetch;
    }
  });

  it('hardens ReadingLibrary font loading/Gutendex pinning, QuickStartWizard links, and PersonaChat avatars/AI gating', () => {
    const rl = read('reading_library_module.js');
    expect(rl).not.toContain('fonts.googleapis.com');
    expect(rl).toContain('allo-reader-fonts-css');
    expect(rl).toContain("_isAllowedGutendexUrl(data.next)");
    expect(rl).toContain("{ credentials: 'omit', referrerPolicy: 'no-referrer' }");

    const qs = read('quickstart_source.jsx');
    expect(qs).toContain("'noopener,noreferrer'");
    expect(qs).toContain('popup.opener = null');

    const pc = read('view_persona_chat_source.jsx');
    const helpersEnd = pc.indexOf('// Role Swap:');
    const helperCode = pc.slice(pc.indexOf('function _aiUsable('), helpersEnd);
    const ctx = vm.createContext({ window: {}, URL });
    vm.runInContext(
      helperCode + '\nthis._aiUsable = _aiUsable; this._safeAvatar = _safePersonaChatAvatarUrl;',
      ctx
    );
    expect(ctx._safeAvatar('https://cdn.example/avatar.png')).toBe('https://cdn.example/avatar.png');
    expect(ctx._safeAvatar('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(ctx._safeAvatar('./avatars/sam.png')).toBe('./avatars/sam.png');
    expect(ctx._safeAvatar('javascript:alert(1)')).toBeNull();
    expect(ctx._safeAvatar('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(ctx._safeAvatar('https://user:pass@cdn.example/avatar.png')).toBeNull();
    expect(ctx._safeAvatar('http://cdn.example/avatar.png')).toBeNull();
    expect(ctx._safeAvatar('../secret.png')).toBeNull();

    ctx.window.__alloAiSecretsLocked = true;
    expect(ctx._aiUsable('text', () => {})).toBe(false);
    expect(pc).toContain('./allo_device_storage_module.js?v=ds6-media-removal-intent');
  });

  it('enforces LargeFileHandler size/duration/re-entrancy caps and single-pass video audio decoding', async () => {
    const LFH = window.AlloModules.LargeFileHandler;
    expect(LFH.MAX_FILE_SIZE_BYTES).toBe(500 * 1024 * 1024);
    expect(LFH.MAX_AUDIO_DURATION_SECONDS).toBe(4 * 3600);

    await expect(LFH.processAudioFile({ size: LFH.MAX_FILE_SIZE_BYTES + 1, name: 'huge.mp3' }, vi.fn()))
      .rejects.toThrow(/500 MB/);

    LFH.isProcessing = true;
    await expect(LFH.processAudioFile({ size: 100, name: 'ok.mp3' }, vi.fn()))
      .rejects.toThrow(/already being processed/);
    LFH.isProcessing = false;

    const extractSpy = vi.spyOn(LFH, 'extractAudioFromVideo');
    const decodeSpy = vi.spyOn(LFH, '_decodeMediaFile').mockResolvedValue({
      audioCtx: {},
      audioBuffer: { duration: 12, sampleRate: 16000, numberOfChannels: 1, length: 16000 },
    });
    const chunkSpy = vi.spyOn(LFH, '_chunkAndTranscribeAudioBuffer').mockResolvedValue({
      transcript: 'ok',
      duration: 12,
    });

    const out = await LFH.processVideoFile({ size: 2048, name: 'lesson.mp4' }, vi.fn());
    expect(out).toEqual({ transcript: 'ok', duration: 12 });
    expect(extractSpy).not.toHaveBeenCalled();
    expect(decodeSpy).toHaveBeenCalledOnce();
    expect(chunkSpy).toHaveBeenCalledOnce();
  });
});
