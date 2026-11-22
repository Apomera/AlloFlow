// tests/round16_waves54_56_hardening.test.js
//
// Round 16 (Waves 54–56) behavioral security, FERPA, Electron isolation,
// Desktop MCP toolchain, renderer/privacy hardening, and 4-way mirror parity suite.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

beforeAll(() => {
  if (!window.React) {
    window.React = {
      createElement: () => null,
      Fragment: Symbol('Fragment'),
      useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
      useRef: (init) => ({ current: init }),
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useId: () => 'r16-id',
      memo: (c) => c,
      forwardRef: (c) => c,
      Component: class {},
    };
  }
});

describe('Round 16 — Wave 54: Desktop Electron Shell, Preload/IPC & Command Center', () => {
  it('allosheet-request-auth rejects mismatched initiator/frameUrl on subresources and security.cjs rejects detached frames', () => {
    const auth = require(path.join(ROOT, 'desktop/electron/allosheet-request-auth.cjs'));
    const sec = require(path.join(ROOT, 'desktop/electron/security.cjs'));

    const companionOrigin = 'http://127.0.0.1:32170';
    const managedOrigin = 'http://127.0.0.1:41234';

    // Mismatched opaque initiator with managed frameUrl MUST fail closed
    expect(auth.isTrustedAlloSheetGristFrameRequest({
      url: managedOrigin + '/api/docs',
      resourceType: 'xhr',
      frame: { url: managedOrigin + '/doc/1' },
      initiator: 'null',
    }, companionOrigin, managedOrigin)).toBe(false);

    // Mismatched foreign frameUrl with managed initiator MUST fail closed
    expect(auth.isTrustedAlloSheetGristFrameRequest({
      url: managedOrigin + '/api/docs',
      resourceType: 'xhr',
      frame: { url: 'https://evil.example/widget' },
      initiator: managedOrigin,
    }, companionOrigin, managedOrigin)).toBe(false);

    // Exact matching managedOrigin still passes
    expect(auth.isTrustedAlloSheetGristFrameRequest({
      url: managedOrigin + '/api/docs',
      resourceType: 'xhr',
      frame: { url: managedOrigin + '/doc/1' },
      initiator: managedOrigin,
    }, companionOrigin, managedOrigin)).toBe(true);

    // Detached senderFrame must return empty string
    expect(sec.getIpcSenderUrl({ senderFrame: { url: 'http://127.0.0.1:32170/', detached: true } })).toBe('');
    expect(sec.getIpcSenderUrl({ senderFrame: { url: 'http://127.0.0.1:32170/', detached: false } })).toBe('http://127.0.0.1:32170/');
  });

  it('main.cjs, preload.cjs, command-center.js, and lan_session_adapter enforce Wave 54 isolation & reliability invariants', () => {
    const mainSrc = fs.readFileSync(path.join(ROOT, 'desktop/electron/main.cjs'), 'utf8');
    expect(mainSrc).toContain('if (parsed.origin !== commandOrigin) return false;');
    expect(mainSrc).toContain("target.pathname.startsWith('/api/allosheet/')");
    expect(mainSrc).toContain("const genericFeed = app.isPackaged ? '' :");
    expect(mainSrc).toContain("childWindow.webContents.on('will-attach-webview'");
    expect(mainSrc).toContain('approvedRemediationFiles.has(realTarget)');
    expect(mainSrc).toContain('isMainWindowContents(webContents)');
    expect(mainSrc).toContain('Promise.race([');

    const preloadSrc = fs.readFileSync(path.join(ROOT, 'desktop/electron/preload.cjs'), 'utf8');
    expect(preloadSrc).toContain('isDirectAppSubframe');
    expect(preloadSrc).toContain('if (isMainFrame && isTrustedLoopbackFrame)');

    const ccSrc = fs.readFileSync(path.join(ROOT, 'desktop/command-center/command-center.js'), 'utf8');
    expect(ccSrc).toContain('timeoutMs: 125000');
    expect(ccSrc).toContain("else if (eng.phase === 'error' || eng.lastError)");
    expect(ccSrc).toContain('if (!state.appBridgeReady) resetAppBridge();');

    const lanSrc = fs.readFileSync(path.join(ROOT, 'desktop/app-adapter/lan_session_adapter.snippet.js'), 'utf8');
    expect(lanSrc).toContain('const parsedUrl = new URL(rawBase);');
    expect(lanSrc).toContain('/^[A-Za-z0-9_-]{1,64}$/.test(safeCode)');
    expect(lanSrc).toContain('Object.create(null)');
  });
});

describe('Round 16 — Wave 55: Desktop MCP Stdio & Remediation Toolchain', () => {
  it('remediation_chromium_pdf safely handles $& and $\' in titles without replacement injection', () => {
    const chromiumPdf = require(path.join(ROOT, 'desktop/mcp/remediation_chromium_pdf.cjs'));
    const prepared = chromiumPdf.prepareHtmlForChromiumPdf(
      '<!doctype html><html><head></head><body><main><h1>Body</h1></main></body></html>',
      { title: "Budget $& $` $' 2026" }
    );
    expect(prepared.html).toContain("<title>Budget $&amp; $` $&apos; 2026</title>");
    expect(prepared.html).not.toContain('<title>Budget <head>');

    const src = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_chromium_pdf.cjs'), 'utf8');
    expect(src).toContain('maxOutputLength: 64 * 1024 * 1024');
    expect(src).toContain('maxOutputLength: 16 * 1024 * 1024');
  });

  it('remediation_narration, epub_archive, epub_validation, headless_driver, and remediation MCP enforce Wave 55 invariants', () => {
    const narSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_narration.cjs'), 'utf8');
    expect(narSrc).toContain("base-uri 'none'; form-action 'none'; object-src 'none'");
    expect(narSrc).toContain('base,template,meta[http-equiv="refresh" i]');
    expect(narSrc).toContain('wallController?.signal?.aborted');

    const archSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_epub_archive.cjs'), 'utf8');
    expect(archSrc).toContain('total > Math.max(1, bytes.length) * LIMITS.ratio');

    const valSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_epub_validation.cjs'), 'utf8');
    expect(valSrc).toContain('fs.constants.O_NOFOLLOW');
    expect(valSrc).toContain('key.toUpperCase()');
    expect(valSrc).toContain('SIGKILL');

    const drvSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    expect(drvSrc).toContain('Math.min(256, Math.max(1, Math.trunc(Number(co.columnSpan) || 1)))');
    expect(drvSrc).toContain('var numRefToId = Object.create(null);');
    expect(drvSrc).toContain("b.newContext({ serviceWorkers: 'block' })");
    expect(drvSrc).not.toContain('b.newContext()');

    const mcpSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(mcpSrc).toContain('function _claimExplicitOutputPath(');
    expect(mcpSrc).toContain("withSingleFlight('document_narration_preflight'");
    expect(mcpSrc).toContain('function isValidRpcId(');
    expect(mcpSrc).toContain("res.on('error', dropSse)");
  });
});

describe('Round 16 — Wave 56: AlloBot Privacy/Evidence, Classroom Import, Managed AI, Bridge, Renderer & Core Helpers', () => {
  it('doc_builder_renderer_module sanitizes docStyle colors/backgrounds, blocks /\\\\ open redirects, and tolerates non-string text', () => {
    loadAlloModule('doc_builder_renderer_module.js');
    const createRenderer = window.AlloModules.DocBuilderRenderer && window.AlloModules.DocBuilderRenderer.createRenderer;
    expect(typeof createRenderer).toBe('function');

    const noop = () => '';
    const render = createRenderer({
      docStyle: {
        headingColor: 'red" onclick="alert(1)',
        accentColor: 'blue; background:url(https://evil.test/x)',
        headerBg: 'url(https://evil.test/bg)',
        bgColor: '#ffffff',
        tableBg: '#ffffff',
        tableBorder: '#cbd5e1',
        sectionBorderColor: '#cbd5e1',
        bodyColor: '#1e293b',
        textColor: '#1e293b',
      },
      _accessibleHeaderColors: () => ({ bg: '#1e293b', fg: '#ffffff' }),
      _alloCellRichText: (v) => String(v || ''),
      _emitAccessibleTableHtml: noop,
      _pipeLog: noop,
      _sanitizeRawHtmlBlock: noop,
      _validateTableGrid: () => ({ ok: true }),
      renderWordArtHtml: noop,
      warnLog: noop,
    });

    const html = render([
      { type: 'h1', text: 'Title' },
      { type: 'p', text: '<a href="/\\evil.example/phish">Click</a>' },
      { type: 'p', text: 42 },
    ]);
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('evil.test');
    expect(html).toContain('href="#"');
    expect(html).toContain('42');
  });

  it('allobot_evidence (via udl_chat_module) blocks trailing-dot internal URLs, nested markdown links, unsafe source URLs, and PII without WebSearchProvider', async () => {
    loadAlloModule('udl_chat_module.js');
    const ev = window.AlloModules.UdlChat && window.AlloModules.UdlChat.evidence;
    expect(ev).toBeTruthy();

    expect(ev.safeUrl('https://intranet.local./secret')).toBe('');
    expect(ev.safeUrl('https://foo.localhost./x')).toBe('');
    expect(ev.safeUrl('https://udlguidelines.cast.org/')).toBe('https://udlguidelines.cast.org/');

    const cited = ev.cite('See [[label](x)](javascript:alert(1)) and [1]', {
      sources: [{ id: 1, url: 'javascript:alert(1)' }],
    });
    expect(cited).not.toContain('javascript:');

    const prevProvider = window.WebSearchProvider;
    try {
      delete window.WebSearchProvider;
      const planRes = ev.plan('search for jane.doe@school.edu');
      expect(planRes && planRes.status).toBe('private-query');
    } finally {
      window.WebSearchProvider = prevProvider;
    }
  });

  it('translate_loader does not misroute Estonian/Armenian to Spanish/Arabic and ready() is false before load', () => {
    delete window.AlloTranslate;
    loadAlloModule('translate_loader.js');
    expect(window.AlloTranslate.ready()).toBe(false);
    expect(window.AlloTranslate.supports('English', 'Estonian')).toBe(false);
    expect(window.AlloTranslate.supports('English', 'Armenian')).toBe(false);
    expect(window.AlloTranslate.supports('English', 'Frisian')).toBe(false);
    expect(window.AlloTranslate.supports('English', 'es-MX')).toBe(true);
    expect(window.AlloTranslate.supports('en-US', 'Spanish')).toBe(true);
  });

  it('tool_integration_sdk re-sanitizes captures mutated after prepare() and rejects invalid options.now', () => {
    const sdk = require(path.join(ROOT, 'tool_integration_sdk.js'));
    const contract = {
      schemaVersion: 1,
      id: 'wave56-tool',
      name: 'Wave 56 Tool',
      version: '1.0.0',
      reviewedAt: '2026-01-01T00:00:00Z',
      reviewAfter: '2027-01-01T00:00:00Z',
      license: { spdx: 'MIT' },
      citation: { text: 'Cite Wave 56 Tool' },
      supportedMethodPacks: ['scientific_investigation'],
      capabilities: { captureArtifact: true },
      privacy: { learnerApprovalRequired: true, sanitizerRequired: true, sanitizerId: 'strip-pii' },
      reproducibility: { requiredFields: ['softwareVersion', 'limitations'] },
    };

    const invalidClock = sdk.validateContract(contract, { now: 'not-a-date' });
    expect(invalidClock.ok).toBe(false);
    expect(invalidClock.errors).toContain('review clock is invalid');

    let sanitizeRuns = 0;
    const adapter = sdk.createAdapter({
      contract,
      buildCapture: (p) => ({
        title: 'Run',
        summary: p.summary,
        reproducibilityReceipt: { softwareVersion: '1.0', limitations: 'synthetic' },
      }),
      sanitizeCapture: (c) => {
        sanitizeRuns++;
        return { ...c, summary: String(c.summary || '').replace(/SECRET/g, '[REDACTED]') };
      },
    });

    const prepared = adapter.prepare({ summary: 'Clean summary' });
    expect(prepared.ok).toBe(true);
    expect(sanitizeRuns).toBe(1);

    // Mutate capture after prepare() to re-inject PII
    prepared.capture.summary = 'Leaked SECRET after prepare';
    const dl = adapter.download(prepared.capture, 'out.json');
    expect(sanitizeRuns).toBe(2);
    expect((dl.capture || dl.preparedCapture).summary).toBe('Leaked [REDACTED] after prepare');
  });

  it('classroom_import_config freezes nested arrays, managed_ai_policy rejects null args, and text_pipeline_helpers escapes bibliography markdown', async () => {
    loadAlloModule('classroom_import_config.js');
    expect(Object.isFrozen(window.ALLOFLOW_CLASSROOM_IMPORT_CONFIG.allowedOrigins)).toBe(true);
    expect(Object.isFrozen(window.ALLOFLOW_CLASSROOM_IMPORT_CONFIG.allowedAccountIds)).toBe(true);

    loadAlloModule('text_pipeline_helpers_module.js');
    const helpers = window.AlloModules.TextPipelineHelpers;
    const filtered = helpers.filterEducationalSources([
      { web: { uri: 'https://user:pass@example.edu/paper', title: 'Creds' } },
      { web: { uri: 'https://example.edu/paper(1)', title: 'Paper [Draft] <script>' } },
    ]);
    expect(filtered.length).toBe(1);
    const bib = helpers.generateBibliographyString({ groundingChunks: filtered });
    expect(bib).toContain('Paper \\[Draft\\] &lt;script&gt;');
    expect(bib).toContain('https://example.edu/paper%281%29');

    const managedSrc = fs.readFileSync(path.join(ROOT, 'managed_ai_policy.js'), 'utf8');
    const fn = new Function(managedSrc + '; return assertManagedAIConnection;')();
    await expect(fn(null)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
  });

  it('kokoro_tts_loader, video_studio_host_bridge, misc_handlers, and phase_o_misc_handlers enforce Wave 56 guards', () => {
    const kokoro = fs.readFileSync(path.join(ROOT, 'kokoro_tts_loader.js'), 'utf8');
    expect(kokoro).toContain('/^(?:af|am|bf|bm)_[a-z0-9]{1,24}$/');
    expect(kokoro).toContain("method === 'GET'");
    expect(kokoro).toContain('if (!_worker) return null;');
    expect(kokoro).toContain("audio.onerror = () => failChain(");

    const bridge = fs.readFileSync(path.join(ROOT, 'video_studio_host_bridge_module.js'), 'utf8');
    expect(bridge).toContain('ALLOWED_AUDIT_STRING_KEYS');
    expect(bridge).toContain('SENSITIVE_AUDIT_KEY_RE');

    const misc = fs.readFileSync(path.join(ROOT, 'misc_handlers_module.js'), 'utf8');
    expect(misc).toContain("localStorage.removeItem('alloflow_student_progress_summary')");
    expect(misc).toContain("Object.prototype.hasOwnProperty.call(vis, visitKey)");

    const phaseO = fs.readFileSync(path.join(ROOT, 'phase_o_misc_handlers_module.js'), 'utf8');
    expect(phaseO).toContain('_standardsSearchSeq');
    expect(phaseO).toContain('_fenceStandardsUntrusted');
  });
});

describe('Round 16 — 4-Way SHA-256 Mirror Parity (15 Wave 56 Deliverables)', () => {
  const deliverables = [
    'udl_chat_module.js',
    'view_misc_modals_module.js',
    'view_cold_path_surfaces_module.js',
    'video_studio_host_bridge_module.js',
    'classroom_import_service.js',
    'classroom_import_config.js',
    'ai_backend_module.js',
    'gemini_api_module.js',
    'doc_builder_renderer_module.js',
    'text_pipeline_helpers_module.js',
    'misc_handlers_module.js',
    'phase_o_misc_handlers_module.js',
    'translate_loader.js',
    'kokoro_tts_loader.js',
    'tool_integration_sdk.js',
  ];

  it('keeps all 15 Round 16 browser deliverables byte-identical across root and all 3 desktop mirrors', () => {
    expect(deliverables.length).toBe(15);
    for (const file of deliverables) {
      const rootPath = path.join(ROOT, file);
      expect(fs.existsSync(rootPath), `Missing root file: ${file}`).toBe(true);
      const expectedHash = sha256(rootPath);
      for (const dir of MIRROR_DIRS) {
        const mirrorPath = path.join(ROOT, dir, file);
        expect(fs.existsSync(mirrorPath), `Missing mirror: ${dir}/${file}`).toBe(true);
        expect(sha256(mirrorPath), `Hash mismatch for ${dir}/${file}`).toBe(expectedHash);
      }
    }
  });
});
