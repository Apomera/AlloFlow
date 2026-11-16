import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const fixStart = source.indexOf('  const fixAndVerifyPdf = async (batchOverrides = null) => {');
const helperStart = source.indexOf('    const _applyDetectedLang = (html) => {', fixStart);
const helperEnd = source.indexOf('\n    };', helperStart) + 7;
const generationStart = source.indexOf('      // Wrap in full HTML document', helperEnd);
const baselineEnd = source.indexOf('      // ── Step 4a:', generationStart);
if ([fixStart, helperStart, generationStart, baselineEnd].some(index => index < 0) || helperEnd < 7) {
  throw new Error('Generated-document language regression extraction boundaries changed');
}
const helperSource = source.slice(helperStart, helperEnd);
// The wrapper's contentinfo footer calls a module-level helper (fleet G1, 2026-09-28): run the real one.
const footerStart = source.indexOf('var _alloOutputProvenanceFooterHtml = function (opts) {');
const footerEnd = source.indexOf('\n};', footerStart) + 3;
if (footerStart < 0 || footerEnd < 3) throw new Error('Provenance footer helper extraction boundaries changed');
const provenanceFooterHtml = new Function(source.slice(footerStart, footerEnd) + '\nreturn _alloOutputProvenanceFooterHtml;')();
// The wrapper names the page with the real h1 + subtitle helper (2026-10-27).
const titleStart = source.indexOf('function _alloTitleFromHeading(html) {');
const titleEnd = source.indexOf('\n}', titleStart) + 2;
const titleFromHeading = new Function(source.slice(titleStart, titleEnd) + '\nreturn _alloTitleFromHeading;')();
// Step 3a marks the English skip link and Step 3b strips scripts/editor chrome for export-equivalent AI scoring (2026-11-05).
const auditPrepStart = source.indexOf('function _stripGeneratedImageEditorControls(html, stripFileHandlers) {');
const chromeStart = source.indexOf('function _stripChromeForAudit(html) {', auditPrepStart);
const auditPrepEnd = source.indexOf('\n}', chromeStart) + 2;
if (auditPrepStart < 0 || chromeStart < 0 || auditPrepEnd < 2) {
  throw new Error('Audit-prep helper extraction boundaries changed');
}
const { _alloSkipLinkLang, _stripExecutableScripts, _stripChromeForAudit } = new Function(
  source.slice(auditPrepStart, auditPrepEnd) + '\nreturn { _alloSkipLinkLang, _stripExecutableScripts, _stripChromeForAudit };',
)();
// Execute the real wrapper and both initial audit calls, stopping before unrelated fixes.
// The deterministic-text fixture bypasses the OCR spelling branch in this production segment.
const baselineSource = source.slice(generationStart, baselineEnd);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const prose = '<h1>Guía para familias</h1><p>Este documento explica cómo solicitar apoyo para estudiantes.</p>';

async function captureInitialAudits(documentLanguage, rtl = false) {
  const inputs = [];
  const isRtlLang = vi.fn(() => rtl);
  const noop = () => {};
  const deps = {
    _auditResult: { documentLanguage },
    isRtlLang,
    _fileName: 'guia-familias.pdf',
    _alloEscapePromptDisplayText: text => String(text),
    _alloOutputProvenanceFooterHtml: provenanceFooterHtml,
    _alloTitleFromHeading: titleFromHeading,
    batchOverrides: null,
    _alloSkipLinkLang,
    _stripExecutableScripts,
    _stripChromeForAudit,
    bodyContent: prose,
    pageCount: 1,
    _pageRange: null, // (2026-10-28) the footer names a page-range slice
    fullPageCount: 1,
    extractedLength: prose.length,
    window: { __lastGroundTruthMethod: 'pdfjs-text' },
    warnLog: noop,
    _pipeLog: noop,
    _pipeStepStart: noop,
    _pipeStepEnd: noop,
    _runTelemetry: {},
    updateProgress: noop,
    runAxeAudit: async html => { inputs.push({ kind: 'axe', html }); return { score: 100 }; },
    auditOutputAccessibility: async (html, options) => {
      inputs.push({ kind: 'ai', html, options }); return { score: 100 };
    },
  };
  const run = new AsyncFunction(...Object.keys(deps), helperSource + baselineSource + '\nreturn accessibleHtml;');
  const html = await run(...Object.values(deps));
  return { html, inputs, isRtlLang };
}
const documentElement = html => new DOMParser().parseFromString(html, 'text/html').documentElement;

function expectBothAudits(result, language, direction = null) {
  expect(result.inputs.map(input => input.kind)).toEqual(['axe', 'ai']);
  expect(result.inputs[1].options).toEqual({ trigger: 'primary-baseline-verification' });
  for (const { html } of result.inputs) {
    expect(documentElement(html).getAttribute('lang')).toBe(language);
    expect(documentElement(html).getAttribute('dir')).toBe(direction);
    expect(html).toContain(prose);
  }
  expect(result.inputs[0].html).toBe(result.html);
  expect(result.inputs[1].html).toBe(_stripChromeForAudit(result.html));
  expect(result.inputs[1].html).not.toContain('<script');
  // The English provenance footer is marked as English inside any document language.
  const footer = new DOMParser().parseFromString(result.html, 'text/html').querySelector('footer[role="contentinfo"]');
  expect(footer && footer.getAttribute('lang')).toBe('en');
  expect(footer.textContent).toContain('This is not a certification of WCAG conformance.');
}

describe('generated language reaches the first axe and AI audits', () => {
  it('uses the Spanish source-audit language before either initial audit', async () => {
    expectBothAudits(await captureInitialAudits('es'), 'es');
  });
  it('keeps the existing English fallback when detection is missing', async () => {
    expectBothAudits(await captureInitialAudits(undefined), 'en');
  });
  it('keeps the existing fallback for invalid language metadata', async () => {
    expectBothAudits(await captureInitialAudits('es" onload="bad'), 'en');
  });
  it('retains the detected region using the helper’s existing normalization', async () => {
    expectBothAudits(await captureInitialAudits('es-MX'), 'es-mx');
  });
  it('sets RTL direction before both audits through the existing language dependency', async () => {
    const result = await captureInitialAudits('ar', true);
    expectBothAudits(result, 'ar', 'rtl');
    expect(result.isRtlLang).toHaveBeenCalledWith('ar');
  });
  it('preserves an existing same-language region when the audit reports only its base', () => {
    const apply = new Function('_auditResult', 'warnLog', 'isRtlLang', helperSource + '\nreturn _applyDetectedLang;')(
      { documentLanguage: 'es' }, () => {}, () => false,
    );
    const html = '<html lang="es-MX"><body>' + prose + '</body></html>';
    expect(apply(html)).toBe(html);
    expect(apply(apply(html))).toBe(html);
  });
});
