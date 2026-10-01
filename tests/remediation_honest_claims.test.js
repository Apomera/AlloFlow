// Honest remediation outputs (fleet G1, 2026-09-28).
//
// Every remediated HTML document used to end with "This document was automatically transformed for
// accessibility compliance (WCAG 2.2 AA) by AlloFlow." That is the kind of claim the FTC acted on
// (accessiBe) and the kind the DOJ's 2026 Title II rule warns about for AI remediation. AlloFlow
// helps a person remediate and reports what is left; automated checks cannot establish WCAG or
// PDF/UA conformance, so no output may claim compliance, conformance or certification.
//
// This file is the gate:
//   1. the new footer, from the real helper, wired into the real template (source AND built module);
//   2. both real report generators render no claim, and say they are not a certification;
//   3. right-to-left text in the source puts a plain "a person must check" notice in both reports
//      and in the app's results panel (tested on Arabic and Hebrew fixtures);
//   4. a claim scan over every string that ships in the remediation outputs (comments stripped),
//      sources, built modules and public mirrors, with a small explicit allowlist;
//   5. the same scan over both shipped UI-string banks, plus real translator checks showing that
//      old device-cached translations cannot restore retired claims or suppress the new fallbacks.
// The scanner itself is exercised on planted claims first, so it cannot pass by matching nothing.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const babelParser = require('@babel/parser'); // esbuild refuses to run under jsdom; babel is pure JS
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

// Claims about an output. Negative statements ("not conformant", "Non-Conformant") are not claims.
const CLAIM_PATTERNS = [
  ['old footer', /automatically transformed for accessibility compliance/i],
  ['"Conformant" label', /(?<!\b[Nn]on-|\b[Nn]ot |\bNOT |\bnot yet |\bnon)\b[Cc]onformant\b/],
  ['conformance report title', /\bConformance Report\b/i],
  ['compliance heading', /\bcompliance (dashboard|summary|statement)\b/i],
  ['passes PDF/UA', /(?<!\bnot )\bpass(es|ed)? PDF\/UA/i],
  ['fixed to PDF/UA', /\b(auto-?fix(ed|ing)?|remediated|fixed) to PDF\/UA/i],
  ['percent conformance', /%\s*conformance\b/i],
  ['is compliant', /\b(is|are|now|fully|100%)\s+(WCAG|ADA|Section 508|508|PDF\/UA)[\w .\-/]{0,20}?(compliant|conformant|certified)\b/i],
  ['standard-compliant', /(?<!\bnot )\b(WCAG|ADA|Section 508|PDF\/UA)(-1)?[- ](2\.[0-2][- ])?(Level )?(AA?[- ])?(compliant|certified|conformant)\b/i],
  ['certified accessible', /\bcertified (accessible|compliant|conformant)\b/i],
  ['fully accessible', /\b(fully|100%) accessible\b/i],
  ['guarantees compliance', /\bguarantee[sd]? (WCAG|accessibility|compliance|conformance)\b/i],
  ['transformed to accessible', /\btransformed (to|into|for) accessib/i],
  ['verified accessible', /\bverified (as )?accessible\b/i],
  ['now accessible', /\b(is|are) now accessible\b/i],
  ['remediated by AlloFlow', /\bremediated for accessibility by\b/i],
  ['accessible deck', /\baccessible slide deck generated\b/i],
];

// Strings that match a pattern but are not a claim about an AlloFlow output. Exact text, with why.
const ALLOWED = [
  // AI style-prompt text describing a colour's contrast; sent to the model, never rendered in an output.
  'Use #be185d for pink accents (WCAG AA compliant)',
  'Use #c1272d for red accents (WCAG AA compliant)',
  // A general statement in the ADA information panel about WCAG content, not about this document.
  'WCAG-compliant content adapts to new devices',
];

function claimHits(text, label) {
  const hits = [];
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [name, re] of CLAIM_PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      if (ALLOWED.some((ok) => line.includes(ok))) continue;
      hits.push(label + ' [' + name + '] ' + line.slice(Math.max(0, m.index - 70), m.index + 90).replace(/\s+/g, ' ').trim());
    }
  }
  return hits;
}

// Comments are not outputs: blank every comment the parser finds (JSX comment children included),
// keeping line breaks so a hit still points at its line, then scan what is left.
function shippedStrings(code, loader) {
  const ast = babelParser.parse(code, { sourceType: 'unambiguous', plugins: loader === 'jsx' ? ['jsx'] : [], allowReturnOutsideFunction: true });
  let out = '';
  let at = 0;
  for (const c of ast.comments) {
    out += code.slice(at, c.start) + code.slice(c.start, c.end).replace(/[^\n]/g, ' ');
    at = c.end;
  }
  return out + code.slice(at);
}

let pipeline;
let factory;
beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  factory = window.AlloModules.createDocPipeline;
  const stub = async () => '{}';
  pipeline = factory({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Document', state: {},
  });
});

describe('the claim scanner can fail (planted claims)', () => {
  it('catches a planted claim in shipped strings and ignores the same words in a comment', () => {
    const planted = 'const a = "This PDF is now WCAG 2.2 AA compliant";\n// This document is fully accessible\nconst b = 1;';
    const hits = claimHits(shippedStrings(planted, 'js'), 'planted');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => /WCAG 2\.2 AA compliant/.test(h))).toBe(true); // the comment line never counts
    expect(hits.some((h) => /fully accessible/.test(h))).toBe(false);
    for (const claim of [
      '<p>This document was automatically transformed for accessibility compliance (WCAG 2.2 AA) by AlloFlow.</p>',
      "label = 'Conformant (veraPDF verified)'", '<h1>Accessibility Conformance Report</h1>', 'Passes PDF/UA-1',
      '93% conformance (self-check)', 'Auto-fixed to PDF/UA-1', 'Accessibility Compliance Dashboard',
      'subject: "Remediated for accessibility by AlloFlow"', 'Certified accessible', 'ADA-compliant output',
    ]) expect(claimHits(claim, 'p').length, claim).toBeGreaterThan(0);
    for (const honest of ['Non-Conformant', 'not yet conformant', 'This is not a certification of WCAG conformance.',
      'No failures in veraPDF automated checks', 'before claiming compliance for filing']) {
      expect(claimHits(honest, 'h'), honest).toEqual([]);
    }
  });
});

describe('1. the provenance footer states what AlloFlow did, and nothing it cannot back', () => {
  it('the real helper renders the honest sentence', () => {
    const html = factory.outputProvenanceFooterHtml({ fileNameHtml: 'Parent &amp; Family Guide.pdf', pageCount: 3, date: new Date(2026, 8, 28) });
    expect(html).toBe('<p>Prepared with AlloFlow accessibility tools on September 28, 2026. '
      + "The accompanying report lists what was checked, what was changed, and what still needs a person's review. "
      + 'This is not a certification of WCAG conformance. Original file: Parent &amp; Family Guide.pdf (3 pages).</p>');
    expect(factory.outputProvenanceFooterHtml({ fileNameHtml: 'a.pdf', pageCount: 1 })).toMatch(/\(1 page\)\.<\/p>$/);
    expect(claimHits(html, 'footer')).toEqual([]);
  });
  for (const file of ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js']) {
    it(file + ' puts the helper in the contentinfo footer (English-marked) and the old claim is gone', () => {
      const src = read(file);
      const footer = sliceBetween(src, 'font-size:0.75rem;color:#475569;" lang="en" dir="ltr">', '</footer>', { file, label: 'provenance footer' });
      expect(footer).toContain('${_alloOutputProvenanceFooterHtml({ fileNameHtml: _safeFileNameHtml, pageCount: pageCount })}');
      expect(src).not.toMatch(/automatically transformed for accessibility compliance/i);
    });
  }
});

describe('2. both real report generators say what they are and claim no conformance', () => {
  const pdfUaAllPass = {
    checks: [{ category: 'Document', rule: 'Document title', status: 'pass', message: 'Title present' }],
    summary: { pass: 18, fail: 0, warn: 0, manual: 2, na: 1, conformancePct: 100 },
  };
  const fr = {
    afterScore: 96, beforeScore: 41, axeScore: 100, verificationAudit: { score: 96 }, axeAudit: { score: 100 },
    integrityCoverage: 100, accessibleHtml: '<html lang="en"><body><main><h1>Syllabus</h1><p>Office hours are Tuesday.</p></main></body></html>',
    sourceText: 'Syllabus. Office hours are Tuesday.',
  };
  it('the accessibility check report on a clean, veraPDF-passing export', () => {
    const html = pipeline.generateAccessibilityReportHtml(fr, { auditorCount: 3, scores: [40, 41, 42] }, pdfUaAllPass, {
      fileName: 'syllabus.pdf', veraPdf: { compliant: true, failedRules: [] },
      postExportValidator: { summary: { overall: 'PASS', pass: 14, fail: 0 }, checks: [{ status: 'pass', rule: 'StructTreeRoot' }] },
    });
    expect(claimHits(html, 'report B')).toEqual([]);
    expect(html).toContain('<h1>♿ Accessibility Check Report</h1>');
    expect(html).toContain('It is not a certification of WCAG or PDF/UA conformance.');
    expect(html).toContain('No failures in veraPDF automated checks (ISO 14289-1)');
    expect(html).toContain('100% of automated self-check rules passed');
    expect(html).toContain('automated checks cannot confirm conformance');
    expect(html).not.toContain('data-allo-rtl-review');
  });
  it('the accessibility check report with failures and no tagged PDF', () => {
    const failing = pipeline.generateAccessibilityReportHtml(fr, {}, { checks: pdfUaAllPass.checks, summary: { pass: 10, fail: 4, warn: 1, manual: 0, na: 0, conformancePct: 67 } }, { fileName: 'f.pdf' });
    expect(claimHits(failing, 'report B failing')).toEqual([]);
    expect(failing).toContain('Automated checks failed');
    const none = pipeline.generateAccessibilityReportHtml(fr, {}, null, { fileName: 'n.pdf' });
    expect(claimHits(none, 'report B none')).toEqual([]);
    expect(none).toContain('No tagged PDF available to check.');
  });
  it('the before/after audit report, including the AI-passed checks list', () => {
    const html = pipeline.generateAuditReportHtml({
      before: { score: 41, audit: { score: 41, critical: [], serious: [], moderate: [], minor: [], passes: [{ check: 'Document has a title' }] } },
      after: { score: 96, aiAudit: { score: 96, passes: [{ check: 'Headings are nested' }] }, axeCoreAudit: { score: 100 }, accessibleHtml: fr.accessibleHtml },
      beforeScore: 41, afterScore: 96, integrityCoverage: 100, summary: 'Syllabus.',
    }, 'syllabus.pdf', true);
    expect(claimHits(html, 'report A')).toEqual([]);
    expect(html).toContain('It is not a certification of WCAG conformance.');
    expect(html).not.toContain('AI-Verified Accessible');
  });
});

describe('3. right-to-left text earns a plain "a person must check" notice', () => {
  // Opening of the Portland Public Schools Arabic family letter (09-22 corpus) and UDHR Article 1 in Hebrew.
  const ARABIC = 'عائلات بورتلاند الأعزاء، نكتب إليكم بخصوص رعاية الأطفال.';
  const HEBREW = 'כל בני האדם נולדו בני חורין ושווים בערכם ובזכויותיהם.';
  it('detects Arabic and Hebrew, ignores Latin text and a stray letter or two', () => {
    expect(factory.detectRtlText(ARABIC)).toMatchObject({ detected: true, scripts: ['Arabic'] });
    expect(factory.detectRtlText(HEBREW)).toMatchObject({ detected: true, scripts: ['Hebrew'] });
    expect(factory.detectRtlText('Dear Portland families, CRF funding 2020.')).toMatchObject({ detected: false, letters: 0 });
    expect(factory.detectRtlText('Price: 5 ع')).toMatchObject({ detected: false });
    expect(factory.detectRtlText(HEBREW + ' ' + ARABIC).scripts).toEqual(['Hebrew', 'Arabic']);
  });
  it('the notice names the script, and mentions reversed lam-alef only for Arabic', () => {
    const ar = factory.rtlReviewNotice(ARABIC);
    expect(ar.title).toBe('Right-to-left text: a person needs to check reading order and letter shaping.');
    expect(ar.body).toContain('This document contains Arabic text.');
    expect(ar.body).toContain('lam-alef');
    expect(ar.body).toContain('ask someone who reads Arabic to compare the output with the original, line by line.');
    expect(factory.rtlReviewNotice(HEBREW).body).not.toContain('lam-alef');
    expect(factory.rtlReviewNotice('English only')).toBeNull();
  });
  it('the accessibility check report carries the notice when the SOURCE text is Arabic', () => {
    const html = pipeline.generateAccessibilityReportHtml({ sourceText: ARABIC, accessibleHtml: '<p dir="rtl">' + ARABIC + '</p>' }, {}, null, { fileName: 'pps-ar.pdf' });
    expect(html).toContain('data-allo-rtl-review="1"');
    expect(html).toContain('Right-to-left text: a person needs to check reading order and letter shaping.');
    const latin = pipeline.generateAccessibilityReportHtml({ sourceText: 'Dear families', accessibleHtml: '<p>Dear families</p>' }, {}, null, { fileName: 'pps-en.pdf' });
    expect(latin).not.toContain('data-allo-rtl-review');
  });
  it('the before/after audit report carries the notice from the output HTML when no source text rode along', () => {
    const html = pipeline.generateAuditReportHtml({
      before: { score: 30, audit: { score: 30 } },
      after: { score: 80, aiAudit: { score: 80 }, axeCoreAudit: { score: 90 }, accessibleHtml: '<html lang="he" dir="rtl"><body><p>' + HEBREW + '</p></body></html>' },
      beforeScore: 30, afterScore: 80,
    }, 'udhr-he.pdf', true);
    expect(html).toContain('data-allo-rtl-review="1"');
    expect(html).toContain('This document contains Hebrew text.');
  });
  it('view_pdf_audit_source.jsx wires the notice into the results panel', () => {
    const src = read('view_pdf_audit_source.jsx');
    expect(src).toMatch(/window\.AlloModules\.createDocPipeline\.rtlReviewNotice;/);
    expect(src).toContain("_rtlFn([pdfFixResult.sourceText, pdfFixResult.finalText]");
    expect(src).toContain('data-allo-rtl-review="1"');
  });
  // Run the SHIPPED compiled panel code (the IIFE the view module renders) with a stand-in React.
  for (const file of ['view_pdf_audit_module.js', 'desktop/web-app/public/view_pdf_audit_module.js']) {
    it(file + ' renders the notice for Arabic source text and nothing for Latin text', () => {
      const mod = read(file);
      const body = sliceBetween(mod, 'const _rtlFn', '\n    })(), (pdfFixResult.needsExpertReview', { file, label: 'RTL notice IIFE' });
      const run = new Function('window', 'React', 'pdfFixResult', body);
      const React = { createElement: (type, props, ...children) => ({ type, props, children }) };
      const text = (node) => (node == null ? '' : typeof node === 'string' ? node : node.children.map(text).join(' '));
      const el = run(window, React, { sourceText: ARABIC, finalText: '' });
      expect(el && el.props['data-allo-rtl-review']).toBe('1');
      expect(el.props.role).toBe('note');
      expect(text(el)).toContain('Right-to-left text: a person needs to check reading order and letter shaping.');
      expect(text(el)).toContain('This document contains Arabic text.');
      expect(run(window, React, { sourceText: 'Dear families', finalText: 'Dear families' })).toBeNull();
    });
  }
});

describe('4. no compliance claim survives in any shipped string (comments stripped)', () => {
  const FILES = [
    ['doc_pipeline_source.jsx', 'jsx'], ['doc_pipeline_module.js', 'js'], ['desktop/web-app/public/doc_pipeline_module.js', 'js'],
    ['view_pdf_audit_source.jsx', 'jsx'], ['view_pdf_audit_module.js', 'js'], ['desktop/web-app/public/view_pdf_audit_module.js', 'js'],
    ['desktop/mcp/remediation_headless_driver.cjs', 'js'], ['desktop/mcp/remediation_verification.cjs', 'js'],
    ['desktop/mcp/remediation_epub_validation.cjs', 'js'],
  ];
  const seenAllowed = new Set();
  for (const [file, loader] of FILES) {
    it(file, () => {
      const code = shippedStrings(read(file), loader);
      expect(code.length).toBeGreaterThan(1000); // a file that fails to load must not pass as clean
      for (const ok of ALLOWED) if (code.includes(ok)) seenAllowed.add(ok);
      expect(claimHits(code, file)).toEqual([]);
    });
  }
  it('every allowlisted string still exists (the allowlist can only shrink)', () => {
    expect([...seenAllowed].sort()).toEqual([...ALLOWED].sort());
  });
});

describe('5. shipped strings and cached translations carry no claim', () => {
  const retired = {
    'pdf_audit.verapdf.pass': 'pdf_audit.verapdf.automated_checks_pass',
    'pdf_audit.verapdf.fixed_pass': 'pdf_audit.verapdf.fixed_checks_pass',
    'pdf_audit.verapdf.fixing': 'pdf_audit.verapdf.applying_fixes',
    'pdf_audit.preview.print_style_title': 'pdf_audit.preview.print_copy_review_title',
    'toasts.accessibility_compliance_statement_added': 'toasts.provenance_note_added',
    'toasts.compliance_statement_removed': 'toasts.provenance_note_removed',
    'toasts.pdf_transformed_accessible_content': 'toasts.pdf_prepared_for_review',
    'toasts.pdf_transformed_accessible_html_verification': 'toasts.pdf_prepared_verification_incomplete',
  };
  const get = (obj, key) => key.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), obj);
  const set = (obj, key, value) => {
    const parts = key.split('.'); const last = parts.pop();
    const parent = parts.reduce((o, p) => (o[p] ||= {}), obj); parent[last] = value;
  };
  const liveFiles = ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js',
    'view_pdf_audit_source.jsx', 'view_pdf_audit_module.js', 'desktop/web-app/public/view_pdf_audit_module.js'];
  let keys;
  let displays;
  let translator;
  beforeAll(() => {
    keys = new Set(); displays = new Map();
    for (const file of liveFiles) {
      const source = read(file);
      for (const match of source.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) keys.add(match[1]);
      // Compile the actual display expressions, without walking six multi-megabyte ASTs.
      for (const newKey of Object.values(retired)) {
        const escaped = newKey.replace(/\./g, '\\.');
        const expression = new RegExp('t\\([\'\"]' + escaped + '[\'\"]\\)\\s*\\|\\|\\s*(?:"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')', 'g');
        for (const match of source.matchAll(expression)) {
          const parsed = babelParser.parseExpression(match[0]);
          expect(parsed.type).toBe('LogicalExpression');
          expect(parsed.right.type).toBe('StringLiteral');
          displays.set(file + ':' + newKey, new Function('t', 'return ' + match[0]));
        }
      }
    }
    const host = read('AlloFlowANTI.txt');
    const body = sliceBetween(host, '  const t = useCallback((keyString, params = {}) => {',
      '  return { t, isTranslating, progress, statusMessage, regenerateLanguage, exportLanguagePack, importLanguagePack };',
      { file: 'AlloFlowANTI.txt', label: 'live translation resolver' });
    translator = new Function('languagePack', 'UI_STRINGS', 'WORD_SOUNDS_STRINGS', 'window',
      'const useCallback = fn => fn; ' + body + '\nreturn t;');
  });
  for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
    it(file + ' has no claims in displayed values and no retired message keys', () => {
      const bank = JSON.parse(read(file));
      const values = [...keys].map(key => [key, get(bank, key)]).filter(([, value]) => typeof value === 'string');
      expect(values.length).toBeGreaterThan(500);
      expect(values.filter(([key, value]) => claimHits(value, key).length).map(([key, value]) => key + ' = ' + value)).toEqual([]);
      for (const [oldKey, newKey] of Object.entries(retired)) {
        expect(keys.has(oldKey), oldKey + ' must stay retired in sources and modules').toBe(false);
        expect(get(bank, oldKey), oldKey + ' must stay retired in the English bank').toBeUndefined();
        expect(keys.has(newKey), newKey + ' must be used').toBe(true);
        expect(typeof get(bank, newKey)).toBe('string');
      }
    });
  }
  for (const [oldKey, newKey] of Object.entries(retired)) {
    it(newKey + ' stays honest with old language packs and an old cached English bank', () => {
      const bank = JSON.parse(read('ui_strings.js'));
      const stale = {}; set(stale, oldKey, 'STALE: This document is fully accessible');
      const views = [...displays].filter(([id]) => id.endsWith(':' + newKey));
      expect(views.length).toBe(3); // source, built module, public module
      for (const [id, display] of views) {
        for (const english of [bank, stale]) {
          const t = translator(stale, english, {}, { location: { hostname: 'example.test' } });
          const shown = display(t);
          expect(shown, id).toBe(get(bank, newKey));
          expect(claimHits(shown, id)).toEqual([]);
          expect(shown).not.toContain('STALE');
        }
        const current = {}; set(current, newKey, 'Current translated review message');
        expect(display(translator(current, bank, {}, { location: { hostname: 'example.test' } })))
          .toBe('Current translated review message');
      }
    });
  }
});
