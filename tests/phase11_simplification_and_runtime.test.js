import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadAlloModule } from './setup.js';

const read = (p) => readFileSync(p, 'utf8');

const PHASE11_MODULES = [
  'view_header_module.js',
  'view_project_settings_module.js',
  'view_export_preview_module.js',
  'view_submission_inbox_module.js',
  'view_share_session_surfaces_module.js',
  'view_sidebar_panels_module.js',
  'allobot_module.js',
  'app_styles_module.js',
  'tts_module.js',
  'export_handlers_module.js',
  'voice_module.js',
  'ai_backend_module.js',
  'dynamic_assessment_module.js',
  'educator_evaluation_module.js',
  'research_hub_module.js',
  'stem_lab/stem_lab_module.js',
  'stem_lab/stem_tool_brainatlas.js',
  'sel_hub/sel_hub_module.js',
  'sel_hub/sel_tool_cultureexplorer.js',
  'sel_hub/sel_tool_safety.js',
  'lingua_practice_module.js',
  'cinematic_studio_module.js',
  'behavior_lens_module.js',
  'report_writer_module.js',
  'allohaven_module.js',
  'video_studio_module.js',
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 11 Wave 1 — UI/UX simplification without losing functionality', () => {
  it('merges duplicate Document Builder / PDF and QR share buttons and fixes duplicate title in Header', () => {
    const src = read('view_header_source.jsx');
    expect(src.match(/openExportPreview\('print'\)/g)?.length).toBe(1);
    expect(src).toContain('data-help-key="export_pdf"');
    expect(src.match(/openRecentQrShares\(\)/g)?.length).toBe(1);
    expect(src).toContain('data-help-menu-tour-resume=""');
    // Expanded student session Disconnect button has only one title prop
    const statusIdx = src.indexOf('data-help-key="header_session_status"');
    const disconnectTag = src.slice(statusIdx - 220, statusIdx + 420);
    expect(disconnectTag.match(/\btitle=/g)?.length).toBe(1);
  });

  it('fixes Project Settings presetMatches(), folds Work Story/BYOK into disclosure, and stays hook-free', () => {
    const src = read('view_project_settings_source.jsx');
    const viewBody = src.slice(src.indexOf('function ProjectSettingsView'));
    expect(viewBody).not.toMatch(/\buse(?:State|Effect|Ref|Memo|Callback)\s*\(/);
    const presetBlock = src.slice(src.indexOf('var presetMatches ='), src.indexOf('var applyPreset ='));
    expect(presetBlock).not.toContain('workStoryEnabled');
    expect(src).toContain('Work Story &amp; adult BYOK AI options');
    expect(src).toContain('School connections stay on this device.');
    expect(src).toContain('var notifyWarning = function(msg)');
  });

  it('flattens Document Builder Export popover, gates readerWebFonts to HTML, and removes duplicate word-count card', () => {
    const src = read('view_export_preview_source.jsx');
    expect(src).not.toContain('♿ More export formats');
    expect(src).not.toContain('id="word-goal-input"');
    expect(src).toContain('id="builder-word-count-goal"');
    expect(src).toMatch(/\{exportPreviewMode === 'html' && \(\s*<label[^>]*>\s*<input[^>]*readerWebFonts/);
  });

  it('puts Student submission files first in Submission Inbox and folds optional Class key into auto-opening details', () => {
    const src = read('view_submission_inbox_source.jsx');
    const filesIdx = src.indexOf("tr('Student submission files')");
    const keyIdx = src.indexOf("tr('🔑 Class key file (only for encrypted .alloflow.html files)')");
    expect(filesIdx).toBeGreaterThan(0);
    expect(keyIdx).toBeGreaterThan(filesIdx);
    expect(src).toContain('open: (privateJwk || (counts.pending || 0) > 0) ? true : undefined');
    expect(src).toContain("'aria-label': tr('Class key file')");

    const shareSrc = read('view_share_session_surfaces_source.jsx');
    expect(shareSrc).toContain('Get submissions from Class Mailbox');
    expect(shareSrc).not.toContain('Check Class Mailbox');

    const sidebarSrc = read('view_sidebar_panels_source.jsx');
    expect(sidebarSrc).not.toContain('sidebar.reading_options_add_source');
  });
});

describe('Phase 11 Wave 2 — Core runtime, performance & reliability', () => {
  it('throttles AlloBot gaze mousemove via rAF + cached rect and stabilizes inactivity listeners with passive flags', () => {
    const src = read('allobot_source.jsx');
    expect(src).toContain('window.requestAnimationFrame(flushGaze)');
    expect(src).toContain("window.addEventListener('mousemove', handleMouseMove, { passive: true })");
    expect(src).toContain('const inactivityEnvRef = useRef(null)');
    expect(src).toContain("window.addEventListener('scroll', resetInactivity, { capture: true, passive: true })");
    expect(src).toContain("window.removeEventListener('scroll', resetInactivity, { capture: true })");
  });

  it('hoists static CSS in AppStylesStatic so typography changes only re-parse dynamic rules', () => {
    const src = read('app_styles_source.jsx');
    expect(src).toContain('const AppStylesStatic = React.memo(() => (');
    expect(src).toContain('<AppStylesStatic />');
    expect(src).toContain('<style data-allo-dynamic-typography="true">');
    expect(src).toContain('@media (forced-colors: active)');
  });

  it('refreshes live TTS API key via getApiKey() and stops 429 retry storms in callTTSDirect', async () => {
    delete window.AlloModules?.createTTS;
    loadAlloModule('tts_module.js');
    let currentKey = '';
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }));
    vi.stubGlobal('fetch', fetchMock);
    const state = { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 };
    const tts = window.AlloModules.createTTS({
      state,
      apiKey: '',
      getApiKey: () => currentKey,
      GEMINI_MODELS: { tts: 'gemini-2.5-flash-preview-tts' },
      AVAILABLE_VOICES: [{ id: 'Kore', label: 'Kore' }],
      _isCanvasEnv: false,
      languageToTTSCode: () => 'en-US',
      isGlobalMuted: () => false,
      warnLog: () => {},
      debugLog: () => {},
      getLeveledTextLanguage: () => 'English',
      getCurrentUiLanguage: () => 'English',
      getAiUserConfig: () => ({ backend: 'gemini' }),
      getAi: () => null,
      getSelectedVoice: () => 'Kore',
      getAvailableVoices: () => [{ id: 'Kore', label: 'Kore' }],
      setShowKokoroOfferModal: () => {},
    });
    // Without key, cloud TTS short-circuits to null without network call
    expect(await tts.callTTSDirect('Hello world', 'Kore', 1, { maxRetries: 2 })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    // Rotate key mid-session — live getter picks it up immediately; 429 breaks on first attempt (no retry storm)
    currentKey = 'live-rotated-key-123';
    await expect(tts.callTTSDirect('Hello world', 'Kore', 1, { maxRetries: 2 })).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('live-rotated-key-123');
    expect(state.rateLimitedUntil).toBeGreaterThan(Date.now());
  });

  it('hardens export audio compression, voice worker/AudioContext cleanup, and ai_backend NUL-byte + audio analysis', () => {
    const exp = read('export_handlers_module.js');
    expect(exp).toContain("if (/^blob:/i.test(cleanSrc))");
    expect(exp).toContain("if (ctx.state === 'suspended' && typeof ctx.resume === 'function')");
    expect(exp).toContain('const maxWaitMs = Math.max(5000');

    const voice = read('voice_module.js');
    expect(voice).toContain('}, function (err) {\n        try { context.close(); } catch (_) {}\n        throw err;');
    expect(voice).toContain('if (typeof whisperPipeline !== \'undefined\' && whisperPipeline && whisperPipeline.dispose === closeWorker)');

    const aiBuf = readFileSync('ai_backend_module.js');
    expect(aiBuf.includes(0)).toBe(false);
    const aiText = aiBuf.toString('utf8');
    expect(aiText).toContain(".replace(/[\\u0000-\\u001f\\u007f]+/g, '')");
    expect(aiText).toContain('SECURITY BOUNDARY: The attached audio contains untrusted spoken user input');
    expect(aiText).toContain('if (!response.ok) {\n            const errBody = await response.json()');

    const da = read('dynamic_assessment_module.js');
    expect(da).toContain('role: "presentation", className: "fixed inset-0 z-[60]');
    expect(da).toContain('role: "dialog", "aria-modal": "true", "aria-label": "Dynamic Assessment"');

    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const h = read(host);
      expect(h).toContain('getApiKey: () => _alloEffectiveGeminiApiKey()');
      expect(h).toContain('moduleKey="FocusReaderOverlay"');
      expect(h).toContain('moduleKey="PerspectiveCrawlOverlay"');
      expect(h).toContain('moduleKey="KaraokeReaderOverlay"');
      expect(h).toContain('window.alloCopyText(String(text))');
      expect(h).not.toContain('if (Ext) return React.createElement(Ext, this.props, this.props.children);');
    }
  });
});

describe('Phase 11 Wave 3 — Hub bugfixes, AI gating, IME/contrast & CI hygiene', () => {
  it('fixes AI gating in Educator Evaluation, Research Hub, STEM Lab, SEL Hub, Culture Explorer, Safety, Cinematic Studio, BehaviorLens, Report Writer, AlloHaven, and Video Studio', () => {
    const ee = read('educator_evaluation_source.jsx');
    expect(ee).toContain("window.__alloAiUsable('text', window.callGemini)");
    expect(ee).toContain("window.__alloAiUsable('text', ask)");

    const rh = read('research_hub_source.jsx');
    expect(rh).toContain("var rawAiTextFn = (ai && typeof ai.generateText === 'function') ? ai.generateText : null;");
    expect(rh).toContain("var aiText = _isUsableAiFn('text', rawAiTextFn) ? rawAiTextFn.bind(ai) : null;");

    const stem = read('stem_lab/stem_lab_module.js');
    expect(stem).toContain('var _aiPendingRef = React.useRef({});');
    expect(stem).toContain('if (!_stemAiText) callGemini = null;');
    expect(stem).toContain('window.__alloAiSecretsLocked === true');

    const sel = read('sel_hub/sel_hub_module.js');
    expect(sel).toContain('window.__alloAiSecretsLocked !== true');
    expect(sel).toContain('if (e.isComposing || e.keyCode === 229) return;');
    expect(sel).toContain('[showSelHub, showEphemeralExplainer, showForEducators, showClearSelConfirm, showSharePacket, selHubTool]');

    const ce = read('sel_hub/sel_tool_cultureexplorer.js');
    expect(ce).toContain("_ceAiOn && h('button', { type: 'button', onClick: function()");
    expect(ce).not.toContain("text-amber-500 hover:text-amber-700");

    const safety = read('sel_hub/sel_tool_safety.js');
    expect(safety).toContain("window.__alloAiUsable('text', fn)");

    const lp = read('lingua_practice_module.js');
    expect(lp.match(/isComposing\|\|.*?keyCode===229/g)?.length).toBeGreaterThanOrEqual(3);

    const cs = read('cinematic_studio_module.js');
    expect(cs).toContain('function csAiUsable(fn)');
    expect(cs).toContain('function escapeTripleQuotes(s)');
    expect(cs).toContain('var mountedRef = useRef(true);');
    expect(cs).toContain('mountedRef.current = false;\n        cancelRef.current = true;');

    const bl = read('behavior_lens_module.js');
    expect(bl).toContain('function blAiUsable(kind, provider)');
    expect(bl).toContain('if (!printWin || !printWin.document)');

    const rw = read('report_writer_module.js');
    expect(rw).toContain('const rwAiUsable = (fn) =>');
    expect(rw).toContain("const rawResult = String(result || '');");
    expect(rw).toContain("const translatedText = String(result || '').trim();");

    const ah = read('allohaven_module.js');
    expect(ah).toContain('Boolean(state.pomodoroState && state.pomodoroState.active)');
    expect(ah).toContain('var canUseNarrativeAi =');

    const vs = read('video_studio_module.js');
    expect(vs).toContain("if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') return;");
    expect(vs).toContain('if (!auditGeminiUsable)');
  });

  it('keeps static audit O(N) cached and brainatlas hover reads free of stale render-time window.innerWidth', () => {
    const sa = read('a11y-audit/static-audit.js');
    expect(sa).toContain('const staticAuditFileTextCache = new WeakMap();');
    const ba = read('stem_lab/stem_tool_brainatlas.js');
    expect(ba).toContain('document.documentElement.clientWidth');
  });

  it('maintains 4-way deployment mirror parity and host manifest SRI alignment for all 26 modified deliverables', () => {
    const anti = read('AlloFlowANTI.txt');
    const marker = 'const _alloBrowserDeliveryManifest = (() => {\n  const manifest = ';
    const start = anti.indexOf(marker) + marker.length;
    const manifest = JSON.parse(anti.slice(start, anti.indexOf(';\n', start)));

    for (const rel of PHASE11_MODULES) {
      const rootBuf = readFileSync(rel);
      const expectedSri = 'sha384-' + createHash('sha384').update(rootBuf).digest('base64');
      expect(manifest.assets[rel], `manifest entry for ${rel}`).toEqual({
        bytes: rootBuf.length,
        integrity: expectedSri,
      });
      for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        const dest = `${dir}/${rel}`;
        if (existsSync(dest)) {
          expect(readFileSync(dest).equals(rootBuf), `mirror parity ${dest}`).toBe(true);
        }
      }
    }
  });
});
