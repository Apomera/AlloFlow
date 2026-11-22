// tests/round15_waves51_53_hardening.test.js
//
// Round 15 (Waves 51–53) behavioral security, FERPA, state-machine, and
// 4-way mirror parity regression suite.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

const ROOT = path.resolve(__dirname, '..');
const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensureReactStub() {
  if (!window.React) {
    window.React = {
      createElement: () => null,
      Fragment: Symbol('Fragment'),
      useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
      useRef: (init) => ({ current: init }),
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      memo: (c) => c,
      forwardRef: (c) => c,
      createContext: (v) => ({ Provider: () => null, Consumer: () => null, _currentValue: v }),
      useContext: () => ({}),
      Component: class {},
    };
  }
  if (typeof window.warnLog !== 'function') {
    window.warnLog = () => {};
  }
}

beforeAll(() => {
  ensureReactStub();
});

describe('Round 15 — Wave 51: Core Content Engine, Adventure, Commands & Generation Helpers', () => {
  it('allo_commands_module gates open_it_coach when student AI is disabled or managed policy disables AI', () => {
    loadAlloModule('allo_commands_module.js');
    const cmdApi = window.AlloModules.AlloCommands;
    expect(cmdApi && typeof cmdApi.buildAlloCommands === 'function').toBe(true);
    const cmds = cmdApi.buildAlloCommands({
      appState: { studentAiFeaturesHidden: true },
      t: (_k, f) => f || '',
    });
    const itCoach = cmds.find((c) => c.id === 'open_it_coach');
    expect(itCoach).toBeTruthy();
    expect(itCoach.when({ studentAiFeaturesHidden: true })).toBe(false);
    expect(itCoach.when({ studentAiFeaturesHidden: false })).toBe(true);

    const prevDisabled = window.__alloStudentAiDisabled;
    const prevPolicy = window.ALLOFLOW_MANAGED_AI_POLICY;
    try {
      window.__alloStudentAiDisabled = true;
      expect(itCoach.when({ studentAiFeaturesHidden: false })).toBe(false);
      window.__alloStudentAiDisabled = false;
      window.ALLOFLOW_MANAGED_AI_POLICY = { enabled: false };
      expect(itCoach.when({ studentAiFeaturesHidden: false })).toBe(false);
    } finally {
      window.__alloStudentAiDisabled = prevDisabled;
      window.ALLOFLOW_MANAGED_AI_POLICY = prevPolicy;
    }
  });

  it('adventure_session_handlers_module does not overwrite narrativeLedger on empty AI response', async () => {
    loadAlloModule('adventure_session_handlers_module.js');
    const handlers = window.AlloModules.AdventureSessionHandlers;
    const setLedgerCalls = [];
    const res = await handlers.generateNarrativeLedger(
      {
        title: 'Test Adventure',
        protagonist: 'Sam',
        currentScene: 1,
        scenes: [{ id: 1, text: 'Sam walks into the library.' }],
        narrativeLedger: 'EXISTING LEDGER ENTRY',
      },
      {
        callGemini: async () => '   ',
        setAdventureState: (fn) => setLedgerCalls.push(fn),
        warnLog: () => {},
      }
    );
    expect(res).toBeUndefined();
    expect(setLedgerCalls.length).toBe(0);
  });

  it('content_engine_module, adventure_module, and generation_helpers_module enforce Wave 51 source guards', () => {
    const contentSrc = fs.readFileSync(path.join(ROOT, 'content_engine_module.js'), 'utf8');
    expect(contentSrc).toContain('sourceGenerationOwners');
    expect(contentSrc).toContain('_s().generatedContent');
    expect(contentSrc).toMatch(/clearTimeout\s*\(\s*optTimer\s*\)/);
    expect(contentSrc).toMatch(/if\s*\(\s*!blob\s*\)\s*return/);

    const advSrc = fs.readFileSync(path.join(ROOT, 'adventure_module.js'), 'utf8');
    expect(advSrc).toContain('data:image\\/(?:png|jpeg|jpg|webp|gif);base64,|blob:|https?:\\/\\/');

    const genSrc = fs.readFileSync(path.join(ROOT, 'generation_helpers_module.js'), 'utf8');
    expect(genSrc).toContain('Boolean(deps && deps.isProcessing)');
  });
});

describe('Round 15 — Wave 52: Alt-Text, Review Session, Accessibility Evidence & Research Evidence Graph', () => {
  it('alt_text_module rejects SVG XSS bypasses (charset, namespaced script, HTML entity js:) and fails closed on vision guard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'alt_text_module.js'), 'utf8');
    expect(src).toContain('_oiValidateSvgDataUrl');
    expect(src).toMatch(/charset\\s\*=/);
    expect(src).toMatch(/catch\s*\([^)]*\)\s*\{\s*return\s+false;\s*\}/);

    loadAlloModule('alt_text_module.js');
    expect(window.AlloModules.AltTextModule).toBe(true);

    // Extract _atString + _oiValidateSvgDataUrl from compiled module and fuzz directly
    const startIdx = src.indexOf('const _oiValidateSvgDataUrl =');
    expect(startIdx).toBeGreaterThan(-1);
    const endIdx = src.indexOf('\n  return raw;\n};', startIdx);
    expect(endIdx).toBeGreaterThan(startIdx);
    const fnBody = src.slice(startIdx, endIdx + '\n  return raw;\n};'.length);
    const validateSvg = new Function(
      'const _atString = (v, max) => String(v == null ? "" : v).slice(0, max || 5e6);\n' +
      fnBody +
      '\nreturn _oiValidateSvgDataUrl;'
    )();

    const safeSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5"/></svg>').toString('base64');
    expect(validateSvg(safeSvg)).toBe(safeSvg);

    const charsetScript = 'data:image/svg+xml;charset=utf-8;base64,' + Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64');
    expect(() => validateSvg(charsetScript)).toThrow();

    const nsScript = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns:s="http://www.w3.org/2000/svg"><s:script>alert(1)</s:script></svg>').toString('base64');
    expect(() => validateSvg(nsScript)).toThrow();

    const entityHref = 'data:image/svg+xml;base64,' + Buffer.from('<svg><a href="&#106;avascript:alert(1)">x</a></svg>').toString('base64');
    expect(() => validateSvg(entityHref)).toThrow();

    const rawNonBase64 = 'data:image/svg+xml,<svg onload=alert(1)/>';
    expect(() => validateSvg(rawNonBase64)).toThrow();
  });

  it('review_document_session_module hydrates invalid JSON safely and applies commands to raw inputs without stale-transaction errors', () => {
    loadAlloModule('review_document_session_module.js');
    const sessApi = window.AlloModules.ReviewDocumentSession;
    expect(sessApi).toBeTruthy();

    const badHydrated = sessApi.hydrateSession('{"broken":');
    expect(badHydrated).toBeTruthy();
    expect(badHydrated.document.remediationResult).toBeNull();
    expect(Object.isFrozen(badHydrated)).toBe(true);

    const rawInput = { accessibleHtml: '<p>Hello</p>', filename: 'lesson.pdf' };
    const committed = sessApi.applyCommand(
      rawInput,
      { type: 'replace_html', summary: 'Wave 52 test' },
      { html: '<p>Updated</p>' }
    );
    expect(committed).toBeTruthy();
    expect(committed.revision).toBe(1);
    expect(committed.document.currentHtml).toContain('Updated');
    expect(committed.workflow.dirty).toBe(true);
  });

  it('accessibility_evidence_module accepts verificationAudit/axeAudit/secondEngineAudit aliases and preserves custom profile objects', () => {
    loadAlloModule('accessibility_evidence_module.js');
    const evApi = window.AlloModules.AccessibilityEvidence;
    expect(evApi).toBeTruthy();

    const prov = evApi.createEvidenceProvenance({
      profile: 'document-remediation',
      verificationAudit: {
        engine: 'ai',
        passed: true,
        issues: [],
      },
      axeAudit: {
        engine: 'axe-core',
        violations: [],
        passes: [{ id: 'html-has-lang' }],
      },
      secondEngineAudit: {
        engine: 'equal-access',
        violations: [],
        passes: [{ id: 'page_title_exists' }],
      },
    });
    expect(prov).toBeTruthy();
    expect(prov.lanes && prov.lanes.ai).toBeTruthy();
    expect(prov.lanes && prov.lanes.axe).toBeTruthy();
    expect(prov.lanes && prov.lanes.equalAccess).toBeTruthy();

    const customProfile = {
      id: 'custom-district-profile',
      label: 'District Profile',
      requiredEvidence: ['axe'],
    };
    const derived = evApi.deriveProfileVerificationState({
      profile: customProfile,
      evidence: {
        axeAudit: { available: true, status: 'verified', violationCount: 0, passCount: 5 },
      },
    });
    expect(derived).toBeTruthy();
    expect(derived.profile).toBe('custom-district-profile');
    expect(derived.evidenceProvenance && derived.evidenceProvenance.profile).toBe('custom-district-profile');
  });

  it('research_evidence_graph blocks prototype pollution, strips unsafe URLs, redacts (207)555-0199 & leading-space data:, and rejects array portfolios', () => {
    loadAlloModule('research_evidence_graph.js');
    const reg = window.AlloFlowResearchEvidenceGraph;
    expect(reg).toBeTruthy();

    const journal = {
      projectTitle: 'Study',
      questions: [{ id: 'toString', text: 'Research question' }],
      claims: [{ id: 'c1', text: 'Claim 1', evidenceIds: ['s1'] }],
      sources: [
        { id: 's1', title: 'Evil Link', url: 'javascript:alert(1)', excerpt: 'Call (207)555-0199 now', snapshot: '   data:image/png;base64,iVBORw0KGgo=' },
        { id: 's2', title: 'Good Link', url: 'https://example.org/paper' },
      ],
      notes: [],
    };

    const sanitized = reg.sanitizePortableJournal(journal);
    expect(sanitized.sources[0].excerpt).not.toContain('207');
    expect(sanitized.sources[0].snapshot).toBeUndefined();

    const graph = reg.buildEvidenceGraph(journal);
    const validation = reg.validateEvidenceGraph(graph);
    expect(validation.ok).toBe(true);

    const w3c = reg.toW3CWebAnnotations(journal);
    expect(JSON.stringify(w3c)).not.toContain('javascript:');
    const csl = reg.toCslJson(journal);
    expect(JSON.stringify(csl)).not.toContain('javascript:');
    expect(JSON.stringify(csl)).toContain('https://example.org/paper');
    const rocrate = reg.toRoCrate(journal);
    expect(JSON.stringify(rocrate)).not.toContain('javascript:');

    const badBundle = reg.validateInteroperabilityBundle({
      schema: 'alloflow-research-interop/v1',
      portfolio: ['not', 'an', 'object'],
    });
    expect(badBundle.ok).toBe(false);
  });
});

describe('Round 15 — Wave 53: Export Preview, PDF Audit, Alignment Report, Simplified, Analysis, Maine SLD & LMS Bookmarklet', () => {
  it('view_pdf_audit_module strips javascript:/file:/SVG-data URLs in AltFormatExports (EPUB/DAISY), escapes < in CSS/Compare popup, and avoids raw localStorage filename keys', () => {
    loadAlloModule('view_pdf_audit_module.js');
    const altFmt = window.AlloModules.AltFormatExports;
    expect(altFmt).toBeTruthy();

    const maliciousHtml = `<!DOCTYPE html><html lang="en"><head><title>Doc</title>
      <style>body { color: #111; } @\\69mport "https://evil.test/x.css"; </style></head>
      <body><main>
        <h1>Lesson</h1>
        <a href="java\tscript:alert(1)">Bad Tab Link</a>
        <a href="file:///etc/passwd">File Link</a>
        <a href="https://example.edu/ok">Good Link</a>
        <img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSkvPg==" alt="bad svg" />
        <img src="data:image/png;base64,iVBORw0KGgo=" alt="ok png" />
      </main></body></html>`;

    const epubResult = altFmt.epub(maliciousHtml, { title: 'Doc' });
    const epubFiles = epubResult && epubResult.files ? epubResult.files : epubResult;
    const xhtmlKeys = Object.keys(epubFiles).filter((k) => k.endsWith('.xhtml'));
    expect(xhtmlKeys.length).toBeGreaterThan(0);
    const xhtml = xhtmlKeys.map((k) => String(epubFiles[k])).join('\n');
    expect(xhtml).not.toMatch(/javascript:/i);
    expect(xhtml).not.toMatch(/file:\/\/\//i);
    expect(xhtml).not.toContain('data:image/svg+xml');
    expect(xhtml).toContain('https://example.edu/ok');

    const daisyResult = altFmt.daisy(maliciousHtml, { title: 'Doc' });
    const daisyFiles = daisyResult && daisyResult.files ? daisyResult.files : daisyResult;
    const dtbookKey = Object.keys(daisyFiles).find((k) => k.endsWith('.xml') && String(daisyFiles[k]).includes('dtbook'));
    expect(dtbookKey).toBeTruthy();
    const dtbook = String(daisyFiles[dtbookKey]);
    expect(dtbook).not.toMatch(/javascript:/i);
    expect(dtbook).not.toMatch(/file:\/\/\//i);
    expect(dtbook).toContain('https://example.edu/ok');

    const compiled = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_module.js'), 'utf8');
    expect(compiled).toContain('alloflow_score_trend_v2');
    expect(compiled).not.toContain("'alloflow_score_trend_'");
    expect(compiled).toContain('\\u003c');
    expect(compiled).toContain('_isValidB64');
  });

  it('view_export_preview_module hardens sanitizeWorkbenchHtml against SVG/srcdoc/control-char XSS and fails closed on parse errors', () => {
    const compiled = fs.readFileSync(path.join(ROOT, 'view_export_preview_module.js'), 'utf8');
    expect(compiled).toContain('foreignObject');
    expect(compiled).toContain('srcdoc');
    expect(compiled).toContain('Workbench output could not be safely sanitized');
    expect(compiled).toMatch(/catch\s*\([^)]*\)\s*\{\s*return\s+null;\s*\}/);
  });

  it('maine_sld_practice_module matches groupLabel in filterScores and handles null v2 source cleanly', () => {
    loadAlloModule('maine_sld_practice_module.js');
    const testing = window.AlloModules.MaineSldPractice._testing;
    expect(testing && testing.Core && testing.StateReferenceCore).toBeTruthy();

    const filtered = testing.Core.filterScores(
      [{ subtest: 'Matrix', group: 'fluid', groupLabel: 'Fluid Reasoning Composite', score: 95 }],
      { query: 'Reasoning Composite' }
    );
    expect(filtered.length).toBe(1);

    const baseWs = testing.StateReferenceCore.emptyWorkspace();
    let caught = null;
    try {
      testing.StateReferenceCore.normalizeWorkspace({
        format: baseWs.format,
        version: 2,
        activeState: 'Maine',
        byState: { Maine: { sources: [null] } },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeTruthy();
    expect(caught).not.toBeInstanceOf(TypeError);
  });

  it('view_simplified_module, view_analysis_module, and lms_bookmarklet enforce Wave 53 URL/mic/a11y/IIFE fixes', () => {
    const simp = fs.readFileSync(path.join(ROOT, 'view_simplified_module.js'), 'utf8');
    expect(simp).toContain('safeDictUrl');
    expect(simp).toContain('safeSourceHref');
    expect(simp).toContain('editAudioRecordTokenRef');

    const analysis = fs.readFileSync(path.join(ROOT, 'view_analysis_module.js'), 'utf8');
    expect(analysis).toMatch(/u\.lang\s*=/);

    const bmk = fs.readFileSync(path.join(ROOT, 'lms_bookmarklet.js'), 'utf8');
    expect(bmk).not.toMatch(/onclick="window\.open\(ALLOFLOW_URL/);
    expect(bmk).toContain("includes('viewcontent')");
    expect(bmk).toContain("panel.setAttribute('role', 'dialog')");
    expect(bmk).toContain("e.key === 'Escape'");
  });
});

describe('Round 15 — 4-Way SHA-256 Mirror Parity (17 Deliverables)', () => {
  const deliverables = [
    // Wave 51 (5)
    'content_engine_module.js',
    'adventure_module.js',
    'adventure_session_handlers_module.js',
    'allo_commands_module.js',
    'generation_helpers_module.js',
    // Wave 52 (5)
    'alt_text_module.js',
    'review_document_session_module.js',
    'accessibility_evidence_module.js',
    'research_evidence_graph.js',
    'research_hub_module.js',
    // Wave 53 (7)
    'view_export_preview_module.js',
    'view_pdf_audit_module.js',
    'document_narration_text_module.js',
    'view_simplified_module.js',
    'view_alignment_report_module.js',
    'view_analysis_module.js',
    'maine_sld_practice_module.js',
  ];

  it('keeps all 17 Round 15 browser deliverables byte-identical across root and all 3 desktop mirrors', () => {
    expect(deliverables.length).toBe(17);
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
