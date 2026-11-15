import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { loadAlloModule } from './setup.js';

const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const readBytes = (rel) => readFileSync(resolve(ROOT, rel));

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start, `Missing marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `Missing end marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Pass-6 F-76 & F-77 & F-86: Runtime/CDN delivery pinning & offline desktop gates', () => {
  it('removes live micropip.install in PyodideRuntime and gates pyodide.js behind SRI + offline/desktop flags', () => {
    const src = read('pyodide_runtime_module.js');
    expect(src).toContain("const PYODIDE_VERSION = '0.27.5'");
    expect(src).toContain('script.integrity = PYODIDE_JS_SRI');
    expect(src).toContain('sha384-rm4QcPMX69sqmX2kWiJa3BF02sgdJkVyATWkw5NHAxBUAvmLXhToWZYaP2wCcyEe');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(stripped).not.toMatch(/micropip\.install\s*\(/);
    expect(src).toContain('return await PyodideRuntime.warmup();');

    const fnSrc = sliceBetween(src, 'function _canLoadExternalPyodide() {', 'function _heuristicSyllablesJs');
    const canLoad = (win) => new Function('window', `${fnSrc}\nreturn _canLoadExternalPyodide();`)(win);
    expect(canLoad({})).toBe(true);
    expect(canLoad({ _isDesktopBundledApp: true })).toBe(false);
    expect(canLoad({ __alloOfflineOnly: true })).toBe(false);
    expect(canLoad({ __alloStudentAiDisabled: true })).toBe(false);
  });

  it('pins liblouis_braille_loader versions/SRI and enforces desktop offline guard', async () => {
    const src = read('liblouis_braille_loader.js');
    expect(src).toContain('liblouis-build@3.2.0-rc/build-no-tables-utf16.js');
    expect(src).toContain('liblouis@0.4.0/easy-api.js');
    expect(src).toContain('SRI_BY_URL');
    expect(src).toContain('s.integrity = SRI_BY_URL[src]');
    expect(src).toContain('window._isDesktopBundledApp === true');
  });

  it('rejects floating branch tags in OptionalBrowserDeliveryPolicy and blocks desktop cross-origin fetch in RuntimeGraphDeliveryPolicy', async () => {
    const optSrc = read('optional_browser_delivery_policy.js');
    const createPolicy = new Function('URL', `${optSrc}\nreturn _alloCreateOptionalBrowserDeliveryPolicy;`)(URL);
    expect(() => createPolicy({
      schemaVersion: 1,
      libraries: {
        bad: {
          asset: null,
          integrity: null,
          bytes: null,
          mirrors: [{ url: 'https://cdn.jsdelivr.net/npm/foo@latest/foo.min.js', integrity: 'sha384-' + 'A'.repeat(64), bytes: 100 }],
        },
      },
    }, { baseUrl: 'https://alloflow-cdn.pages.dev/' })).toThrow(/unapproved mirror form/);

    const rtSrc = read('runtime_graph_delivery_policy.js');
    const fnSrc = sliceBetween(rtSrc, 'function runtimeCapabilities(table, types, original, workerMode, depth, desktop) {', '\n  function capabilityPrelude(');
    const nativeFetch = vi.fn().mockResolvedValue({ ok: true });
    const capsFactory = new Function('globalThis', 'URL', 'Blob', `${fnSrc}\nreturn runtimeCapabilities;`);
    const fakeGlobal = { fetch: nativeFetch, Worker: function () {} };
    const caps = capsFactory(fakeGlobal, URL, Blob)({}, {}, 'http://127.0.0.1:43115/app/', false, 0, true);
    await expect(caps.fetch('https://evil.example/data.json')).rejects.toThrow(/Desktop cross-origin runtime fetch is disabled/);
    await expect(caps.fetch('http://127.0.0.1:43115/app/extra.js')).rejects.toThrow();
    expect(nativeFetch).not.toHaveBeenCalled();
  });
});

describe('Pass-6 F-78, F-79, F-80 & F-85: Arcade/SEL hardening, mic cleanup, and image allowlists', () => {
  it('hardens Model UN mergeMunPatch, UID-bound castVote, and session-scoped DelegateNotes', () => {
    const src = read('arcade_mode_modelun.js');
    const mergeSrc = sliceBetween(src, 'function mergeMunPatch(baseState, patch) {', 'function updateMUN(');
    const mergeMunPatch = new Function(`${mergeSrc}\nreturn mergeMunPatch;`)();
    const merged = mergeMunPatch(
      { phase: 'DEBATE', positionPapers: { u1: { stance: 'A' } }, finalVotes: { USA: { vote: 'Y', uid: 'u1' } } },
      { positionPapers: { u2: { stance: 'B' } }, finalVotes: { FRA: { vote: 'N', uid: 'u2' } } }
    );
    expect(merged.phase).toBe('DEBATE');
    expect(merged.positionPapers).toEqual({ u1: { stance: 'A' }, u2: { stance: 'B' } });
    expect(merged.finalVotes).toEqual({ USA: { vote: 'Y', uid: 'u1' }, FRA: { vote: 'N', uid: 'u2' } });

    expect(src).toContain('if (!myCountry || iso !== myCountry.iso) return;');
    expect(src).toContain("var rec = { vote: vote, reasoning: reasoning || '', isAi: !!isAi, uid: isAi ? ('ai_' + iso) : (myUid || ''), at: Date.now() };");
    expect(src).toContain("var sessionCode = ctx.sessionCode || (ctx.session && ctx.session.code) || 'solo';");
  });

  it('restricts arcade_mode_boss_encounter and BrandProfile logos to bounded raster data URIs', () => {
    const bossSrc = read('arcade_mode_boss_encounter.js');
    const imgFnSrc = sliceBetween(bossSrc, 'function _isSafeClassImage(', 'function cleanClassDoc(');
    const isSafeClassImage = new Function(`var CLASS_IMAGE_LIMIT = 400000;\n${imgFnSrc}\nreturn _isSafeClassImage;`)();
    expect(isSafeClassImage('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeClassImage('https://evil.example/pixel.png')).toBe(false);
    expect(isSafeClassImage('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false);
    expect(isSafeClassImage('javascript:alert(1)')).toBe(false);

    loadAlloModule('brand_profile_module.js');
    const bp = window.AlloModules.BrandProfile;
    const r1 = bp.saveBrandProfile({
      name: 'Oak School 1',
      logo: { src: 'https://evil.example/tracker.png', alt: 'Logo' },
    });
    expect(bp.getBrandProfile(r1.id).logo).toBeNull();
    const r2 = bp.saveBrandProfile({
      name: 'Oak School 2',
      logo: { src: 'data:image/svg+xml;base64,PHN2Zy8+', alt: 'Logo' },
    });
    expect(bp.getBrandProfile(r2.id).logo).toBeNull();
    const r3 = bp.saveBrandProfile({
      name: 'Oak School 3',
      logo: { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Logo' },
    });
    expect(bp.getBrandProfile(r3.id).logo?.src).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('keeps sel_safety_layer crisis links as sibling DOM anchors and stops Open Groove microphone tracks on unmount', () => {
    const safetySrc = read('sel_hub/sel_safety_layer.js');
    expect(safetySrc).toContain("// Primary: 988 call + sibling SMS link (non-nested anchors, plain DOM textNodes)");
    expect(safetySrc).toContain("btn988.href = 'tel:988'");
    expect(safetySrc).toContain("btnSms988.href = 'sms:988'");
    expect(safetySrc).not.toContain('card.innerHTML');

    const grooveSrc = read('music_studio/open_groove_module.js');
    expect(grooveSrc).toContain("if (recorder.state && recorder.state !== 'inactive') recorder.stop();");
    expect(grooveSrc).toContain("activeStream.getTracks().forEach(function (track) { track.stop(); });");
  });
});

describe('Pass-6 F-81, F-82, F-83 & F-95: Identity scoping, Fluency/Dictionary gates, and local Lucide', () => {
  beforeEach(() => {
    delete globalThis.__alloActiveLearnerKey;
  });

  afterEach(() => {
    delete globalThis.__alloActiveLearnerKey;
    delete window.__alloStudentAiDisabled;
    delete window.__alloAiSecretsLocked;
    delete window._isDesktopBundledApp;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    vi.unstubAllGlobals();
  });

  it('scopes QuestionBoardTransport cached credentials by __alloActiveLearnerKey and keeps SharedActivity anonymous creds in sessionStorage', async () => {
    loadAlloModule('question_board_transport_module.js');
    const store = new Map();
    const storage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    let joinSeq = 0;
    const fakeCall = vi.fn(async (_url, payload) => {
      if (payload.a === 'joinactivity') {
        joinSeq += 1;
        return { ok: true, uid: `u${joinSeq}`, pt: `tok${joinSeq}` };
      }
      if (payload.a === 'getactivitysummary') {
        return { ok: true, items: [] };
      }
      return { ok: true };
    });

    globalThis.__alloActiveLearnerKey = 'learner_A';
    const clientA = window.AlloModules.QuestionBoardTransport.createMailboxTransport({
      call: fakeCall,
      url: 'https://script.google.com/macros/s/AKfycb/exec',
      packId: 'p1',
      packSecret: 'sec1',
      activityId: 'a1',
      storage,
    });
    const resA = await clientA.load();
    expect(resA.ok).toBe(true);
    expect([...store.keys()]).toEqual(['allo_question_board_v1:learner_A:p1:a1']);
    expect(JSON.parse(store.get('allo_question_board_v1:learner_A:p1:a1'))).toEqual({ uid: 'u1', pt: 'tok1' });

    globalThis.__alloActiveLearnerKey = 'learner_B';
    const clientB = window.AlloModules.QuestionBoardTransport.createMailboxTransport({
      call: fakeCall,
      url: 'https://script.google.com/macros/s/AKfycb/exec',
      packId: 'p1',
      packSecret: 'sec1',
      activityId: 'a1',
      storage,
    });
    const resB = await clientB.load();
    expect(resB.ok).toBe(true);
    expect([...store.keys()]).toEqual([
      'allo_question_board_v1:learner_A:p1:a1',
      'allo_question_board_v1:learner_B:p1:a1',
    ]);
    expect(JSON.parse(store.get('allo_question_board_v1:learner_B:p1:a1'))).toEqual({ uid: 'u2', pt: 'tok2' });

    const sharedSrc = read('shared_activity_source.jsx');
    expect(sharedSrc).toContain('allo_shared_activity_v1:${learnerScope}:${packId}:${activityId}');
    expect(sharedSrc).toContain("if (useSessionOnlyCredStore && typeof sessionStorage !== 'undefined') return sessionStorage;");
  });

  it('enforces fluency AI policy flags, system fonts, word cap, and dictionary offline/desktop block', async () => {
    const flSrc = read('fluency_module.js');
    expect(flSrc).toContain("headers['x-goog-api-key'] = apiKey");
    expect(flSrc).not.toContain('?key=');
    expect(flSrc).not.toContain('fonts.googleapis.com');
    expect(flSrc).toContain('if (ref.length > 2500) ref = ref.slice(0, 2500);');
    expect(flSrc).toContain('if (hyp.length > 2500) hyp = hyp.slice(0, 2500);');
    expect(flSrc).toContain('window.__alloStudentAiDisabled === true');
    expect(flSrc).toContain('window._isDesktopBundledApp === true');

    const dictSrc = read('dictionary_loader.js');
    expect(dictSrc).toContain("credentials: 'omit'");
    expect(dictSrc).toContain("result(null, 'not_available')");
    window._isDesktopBundledApp = true;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vm.runInThisContext(dictSrc);
    const out = await window.AlloDictionary.lookup('water');
    expect(out).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses local vendor Lucide across all 13 public HTML pages and mirrors it cleanly', () => {
    const pages = [
      'index.html', 'about.html', 'calculator.html', 'features.html',
      'feedback.html', 'for-districts.html', 'library.html', 'manuals.html',
      'remediation.html', 'students.html', 'tools.html', 'ways-to-use.html', 'whitepaper.html',
    ];
    for (const page of pages) {
      const html = read(page);
      expect(html, page).toContain('vendor/lucide-1.31.0.umd.min.js');
      expect(html, page).not.toContain('unpkg.com/lucide');
    }
    expect(existsSync(resolve(ROOT, 'vendor/lucide-1.31.0.umd.min.js'))).toBe(true);
    expect(readBytes('vendor/lucide-1.31.0.umd.min.js').equals(readBytes('desktop/web-app/public/vendor/lucide-1.31.0.umd.min.js'))).toBe(true);
  });
});

describe('Pass-6 F-84 & F-87..F-94: XSS/CSV/Packaging/Worker/Kernel/AgentCore/Preview/CI gates', () => {
  it('hardens print popups, SVG ingestion, and CSV formula cells (F-84, F-90)', () => {
    expect(read('poet_tree_module.js')).toContain('.opener = null');
    expect(read('poet_tree_module.js')).toContain("esc(tr('Selected Poems'))");
    const sym = read('symbol_studio_module.js');
    expect(sym).toContain("credentials: 'omit'");
    expect(sym).toContain('portablePackImage');
    expect(sym).toContain('exportGardenCSV');
    expect(read('view_dbq_source.jsx')).toContain('rel="noopener noreferrer"');
    expect(read('view_dbq_module.js')).toContain('.opener = null');
    expect(read('story_stage_module.js')).toContain('_safeStoryImgUrl');
    expect(read('sel_hub/sel_hub_module.js')).toContain('win.opener = null');

    const flSrc = read('fluency_module.js');
    const cellSrc = sliceBetween(flSrc, 'function _fluencyCsvCell(value) {', 'function exportFluencyCSV');
    const cellFn = new Function(`${cellSrc}\nreturn _fluencyCsvCell;`)();
    expect(cellFn('=CMD()')).toBe('"\'=CMD()"');
    expect(cellFn('\t+1+1')).toBe('"\'\t+1+1"');
  });

  it('tightens Pages/Electron/CI packaging exclusions and redacts outgoing feedback & traces (F-87, F-88)', () => {
    const cfg = read('_config.yml');
    for (const entry of ['apps_script', 'catalog/cloudflare-worker', 'services', 'docker', 'tts-server', 'agent_skills', 'plugins', '--quiet']) {
      expect(cfg).toContain(entry);
    }
    const eb = JSON.parse(read('desktop/electron-builder.json'));
    expect(eb.files).toEqual(expect.arrayContaining(['!mcp/**', '!scripts/**', '!*.md']));
    const dr = read('.github/workflows/desktop-release.yml');
    expect(dr).toContain('!desktop/dist/builder-*.yml');
    expect(dr).not.toContain('!desktop/dist/builder-debug.yml');

    const tf = read('translation_feedback_module.js');
    expect(tf).toContain('window._isDesktopBundledApp === true || window.__alloStudentView === true');
    expect(tf).toContain('scrubFeedbackText');
    const er = read('error_reporter_module.js');
    expect(er).not.toContain('redactSecrets(formatSessionTraceText');
    expect(er).toContain('redactOutgoing(buildSessionDiagText())');
    expect(er).toContain('redactOutgoing(buildTtsDiagText())');
  });

  it('requires Bearer header on Cloudflare Worker PD/Plugin lists, hashes IPs, and guards decodeSourceMetadata (F-89)', () => {
    const workerSrc = read('catalog/cloudflare-worker/src/index.js');
    const pdListSrc = sliceBetween(workerSrc, 'async function handlePdList(', 'const PLUGIN_LICENSES');
    expect(pdListSrc).toMatch(/Authorization[\s\S]*Bearer[\s\S]*timingSafeTokenEq/i);
    const pluginListSrc = sliceBetween(workerSrc, 'async function handlePluginList(', '// PD completion credentials');
    expect(pluginListSrc).toMatch(/Authorization[\s\S]*Bearer[\s\S]*timingSafeTokenEq/i);
    expect(workerSrc).not.toMatch(/url\.searchParams\.get\(['"]token['"]\)/);
    expect(workerSrc).toContain("'alloflow-search-rate:' + cleanIp");
    expect(workerSrc).toContain('function safeMetadataCodePoint');
    expect(workerSrc).toContain(".replace(/&amp;/gi, '&')");
  });

  it('enforces studio bounds (F-91), DuckDB/AgentCore hardening (F-92), and preview/launcher CSP (F-93)', () => {
    expect(read('studio_module.js')).toContain('stImportPptxFile');
    expect(read('cinematic_studio_module.js')).toContain('extractPcm16k');
    expect(read('printable_model_module.js')).toContain('MAX_STL_TRIANGLES=2000000');
    expect(read('printable_model_module.js')).toContain('Number.isFinite');

    const dkSrc = read('data_kernel_loader.js');
    const safeQuerySrc = sliceBetween(dkSrc, 'function safeQuery(sql) {', 'function safeResultValue');
    const safeQuery = new Function(`${safeQuerySrc}\nreturn safeQuery;`)();
    expect(() => safeQuery('SELECT 1; DROP TABLE data')).toThrow();
    expect(() => safeQuery('SELECT * FROM data -- comment')).toThrow();
    expect(() => safeQuery("SELECT * FROM read_csv_auto('secret.csv')")).toThrow();
    expect(safeQuery("SELECT 'a;b' AS x")).toBe("SELECT 'a;b' AS x");
    expect(dkSrc).toContain('.finally(function () {\n              return runtime.db.dropFile(fileName);');

    loadAlloModule('agent_core_contracts_module.js');
    const acc = window.AlloModules.AgentCoreContracts;
    const badScan = acc.validateArtifact({
      schemaVersion: acc.SCHEMA_VERSION,
      artifactId: 'art-1',
      type: 'quiz',
      data: {
        accessToken: 'abc',
        clientSecret: 'xyz',
        privateKey: 'pem',
        nested: { safeGrid: { gridKey: 'A1' } },
      },
    });
    const badPaths = badScan.errors.map((e) => e.path);
    expect(badPaths).toContain('data.accessToken');
    expect(badPaths).toContain('data.clientSecret');
    expect(badPaths).toContain('data.privateKey');
    expect(badPaths).not.toContain('data.nested.safeGrid.gridKey');

    const guardSrc = read('agent_core_openai_media_production_guard_module.js');
    expect(guardSrc).toContain('_isDesktopBundledApp');
    expect(guardSrc).toContain('__alloStudentAiDisabled');
    expect(guardSrc).toContain('__alloStudentView');
    expect(guardSrc).toContain('__alloAiSecretsLocked');

    const revSrc = read('remediation_review_component.jsx');
    expect(revSrc).toContain("default-src \\'none\\'; img-src data: blob:; style-src \\'unsafe-inline\\'; font-src data:;");
    expect(revSrc).toContain('http-equiv\\s*=\\s*(?:"\\s*refresh\\s*"');

    const launchSrc = read('launch.html');
    const fnSrc = sliceBetween(launchSrc, 'function isSafeCanvasUrl(u) {', 'function applyRelease');
    const isSafeCanvasUrl = new Function('URL', `${fnSrc}\nreturn isSafeCanvasUrl;`)(URL);
    expect(isSafeCanvasUrl('https://gemini.google.com/share/abc123')).toBe(true);
    expect(isSafeCanvasUrl('https://evil.example/share/abc123')).toBe(false);
    expect(isSafeCanvasUrl('javascript:alert(1)')).toBe(false);
    expect(readBytes('launch.html').equals(readBytes('desktop/web-app/public/launch.html'))).toBe(true);
  });
});
