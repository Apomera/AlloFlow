// Headless harness for the document remediation pipeline (Phases 1-2 of DECOUPLING_PLAN.md).
//
// Unlike the *_scoring / *_wcag golden masters (which mirror pure functions), this file
// loads the REAL built module, instantiates the factory with a STUB MODEL ADAPTER and an
// INJECTED STATE (no window.__docPipelineState, no live app), and exercises the REAL
// exported report generators + WCAG sanitizer. This is the proof that:
//   1. the pipeline factory runs outside the app (Phase 1 injected-state seam works),
//   2. the model calls are injectable (model-agnostic by construction),
//   3. the actual report-generation code carries the honest labels + split tiles +
//      content-integrity block and is free of the prior overclaims.
//
// NOTE ON SCOPE: the full PDF->audit path (pdf.js extraction + axe-core in iframes) is NOT
// exercised here — those need a real browser/canvas and stay covered by the Playwright e2e
// suite. This harness covers the logic + reporting layers, which is what runs headless.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let pipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const factory = window.AlloModules.createDocPipeline;
  if (typeof factory !== 'function') throw new Error('createDocPipeline factory did not register');

  // Stub model adapter: any async fn returning a string works. This is the seam that
  // makes the pipeline model-agnostic — swap for a Claude/GPT/local client in real use.
  const stubModel = async () => '{}';

  pipeline = factory({
    callGemini: stubModel,
    callGeminiVision: stubModel,
    callImagen: async () => null,
    addToast: () => {},
    t: (k) => k,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {}, // Phase 1: injected state — no window.__docPipelineState needed
  });
});

describe('pipeline factory runs headless with injected state (Phase 1 seam)', () => {
  it('instantiates and exposes the report generators', () => {
    expect(pipeline).toBeTruthy();
    expect(typeof pipeline.generateAuditReportHtml).toBe('function');
    expect(typeof pipeline.generateAccessibilityReportHtml).toBe('function');
    expect(typeof pipeline.sanitizeStyleForWCAG).toBe('function');
  });
});

// Synthetic before/after audit data (shape matches the live call site in
// view_pdf_audit_source.jsx). Structural (axe) 100 vs semantic (AI) 64 -> 36-pt divergence.
const beforeAfter = {
  before: {
    score: 55,
    audit: {
      score: 55, scores: [50, 55, 60], auditorCount: 3,
      scoreSD: 5, scoreSEM: 2.9, ci95: [50, 60],
      icc: 0.9, cronbachAlpha: 0.85, reliability: 'excellent',
      critical: [], serious: [], moderate: [], minor: [],
    },
  },
  after: { score: 82, aiAudit: { score: 64 }, axeCoreAudit: { score: 100 } },
  beforeScore: 55, afterScore: 82,
  integrityCoverage: 96, integrityWarning: null,
  summary: 'Synthetic test document.',
};

describe('REAL generateAuditReportHtml (Generator A) renders the honest, parity-extended report', () => {
  let html;
  beforeAll(() => { html = pipeline.generateAuditReportHtml(beforeAfter, 'test.pdf', true); });

  it('shows the structural vs semantic split tiles', () => {
    expect(html).toContain('Structural (axe-core)');
    expect(html).toContain('Semantic (AI rubric)');
  });
  it('flags the 36-point structural/semantic divergence', () => {
    expect(html).toContain('diverge by 36 points');
  });
  it('shows the content-integrity block with the coverage value', () => {
    expect(html).toContain('Content Integrity');
    expect(html).toContain('96%');
  });
  it('uses honest agreement labels, not psychometric coefficient names', () => {
    expect(html).toContain('Cross-pass agreement (heuristic index)');
    expect(html).toContain('Cross-pass agreement (consistency heuristic)');
  });
  it('contains none of the prior overclaims', () => {
    expect(html).not.toContain('inter-rater reliability');
    expect(html).not.toContain('(ICC, SEM, CV)');
    expect(html).not.toContain("Cronbach's α (pragmatic hybrid)");
    // Credibility sweep 2026-06-13: N passes of one AI model are self-consistency,
    // not independent triangulation. The report must not imply independent reviewers.
    expect(html).not.toContain('independent auditors');
    expect(html).not.toContain('triangulated across');
    expect(html).not.toContain('AI triangulation');
  });
});

describe('REAL generateAccessibilityReportHtml (Generator B, the conformance report)', () => {
  let html;
  beforeAll(() => {
    const fixResult = {
      afterScore: 82, beforeScore: 55,
      axeScore: 100,
      verificationAudit: { score: 64 },
      axeAudit: { score: 100 },
      integrityCoverage: 96, integrityWarning: null,
      issueResolution: null,
    };
    const auditResult = {
      auditorCount: 3, scores: [50, 55, 60],
      scoreSD: 5, scoreSEM: 2.9, ci95: [50, 60],
      icc: 0.9, cronbachAlpha: 0.85, reliability: 'excellent',
      _aiOnlyScore: 55, _baselineAxeScore: 60,
    };
    html = pipeline.generateAccessibilityReportHtml(fixResult, auditResult, null, { fileName: 'test.pdf' });
  });

  it('shows the structural vs semantic split tiles + divergence note', () => {
    expect(html).toContain('Structural (axe-core)');
    expect(html).toContain('Semantic (AI rubric)');
    expect(html).toContain('diverge by 36 points');
  });
  it('shows the content-integrity block', () => {
    expect(html).toContain('Content Integrity');
    expect(html).toContain('96%');
  });
  it('uses honest agreement labels and the reworded heuristics disclaimer', () => {
    expect(html).toContain('Cross-pass agreement (heuristic index)');
    expect(html).toContain('Cross-pass agreement (consistency heuristic)');
    expect(html).toContain('agreement heuristics computed across multiple AI audit passes');
  });
  it('contains none of the prior overclaims', () => {
    expect(html).not.toContain('inter-rater reliability');
    expect(html).not.toContain("Cronbach's α (pragmatic hybrid)");
  });
});

describe('REAL generateAuditReportHtml escapes the filename + AI fields (#10 XSS)', () => {
  it('a malicious filename and AI summary appear only escaped — no live <img>/<script>', () => {
    const data = {
      score: 72,
      summary: '</div><script>window.__pwned=1</script>',
      verificationAudit: { issues: [{ issue: '<img src=x onerror=alert(1)> missing alt', wcag: '1.1.1' }] },
    };
    const html = pipeline.generateAuditReportHtml(data, '<img src=x onerror=alert(2)>.pdf');
    // no executable injection survives
    expect(html).not.toContain('<script>window.__pwned');
    expect(html).not.toContain('<img src=x onerror');
    // the escaped forms are present (so content isn't dropped, just neutralized)
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;.pdf'); // filename in <title> + body
    expect(html).toContain('&lt;script&gt;window.__pwned');           // AI summary neutralized
  });
});

describe('batch Compliance Dashboard escapes user/AI fields (#9 XSS, anti-drift)', () => {
  const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
  it('the dashboard wraps filename, error, and violation strings in esc()', () => {
    expect(viewSrc).toContain('esc(f.fileName)');     // chart-bar title attr + table cell
    expect(viewSrc).toContain("esc(f.error || '')");  // status error
    expect(viewSrc).toContain('esc(v)');              // AI-derived violation string
    // and the raw (unescaped) sinks are gone
    expect(viewSrc).not.toContain("title=\"' + f.fileName");
    expect(viewSrc).not.toContain("'<span>' + v + '</span>");
  });
});

describe('REAL sanitizeStyleForWCAG runs headless', () => {
  it('returns sanitized HTML and preserves body content', () => {
    const input = '<!DOCTYPE html><html lang="en"><head><title>t</title><style>body{color:#999;background:#fff}</style></head><body><p>hello world</p></body></html>';
    const res = pipeline.sanitizeStyleForWCAG(input);
    expect(res).toBeTruthy();
    expect(typeof res.html).toBe('string');
    expect(res.html).toContain('hello world');
  });
});
