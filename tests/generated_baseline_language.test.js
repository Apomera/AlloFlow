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
    bodyContent: prose,
    pageCount: 1,
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
  expect(result.inputs[0].html).toBe(result.inputs[1].html);
  expect(result.html).toBe(result.inputs[1].html);
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
