import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

const between = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(to, `missing end marker: ${end}`).toBeGreaterThan(from);
  return source.slice(from, to);
};

describe('canonical remediation actions', () => {
  it('routes preview full re-audit and Additional Sweep through the canonical reducer', () => {
    const preview = between('const _runOwnedPreviewAudit = async', '// Pure single-occurrence block splice');
    expect(preview).toContain('const result = await _reauditAndScore(html, null, operationTicket)');
    expect(preview).not.toContain('afterScore: aiResult.score');

    const sweep = between("const _sweepOperation = _beginRemediationOperation('additional-sweep')", '/* Fix Remaining');
    expect(sweep).toContain('const recheck = await _reauditAndScore(html, null, _sweepOperation)');
    expect(sweep).not.toContain('commitOrRevertPdfFix');
  });

  it('uses one canonical result per Fix Remaining candidate without regex structure rewrites or score averaging', () => {
    const fix = between("const _fixRemainingOperation = _beginRemediationOperation('fix-remaining')", "finally { _finishPdfRemediationOperation(_fixRemainingOperation, true); }");
    expect(fix).toContain('canonical verification');
    expect(fix).toContain('_reauditAndScore(html, null, _fixRemainingOperation)');
    expect(fix).not.toContain('commitOrRevertPdfFix');
    expect(fix).not.toContain('averaging 3 audits');
    expect(fix).not.toContain('bestAiScores');
    expect(fix).not.toMatch(/replace\(\/<th/);
    expect(fix).not.toContain('finalAiResult.score =');
  });

  it('owns exact HTML and propagates cancellation in the canonical re-audit', () => {
    const reaudit = between('const _reauditAndScore = async', 'const _commitRefixedSection = async');
    expect(reaudit).toContain("_beginRemediationOperation('canonical-re-audit'");
    expect(reaudit).toContain('_reauditHtmlToken');
    expect(reaudit).toContain('_commitAsyncHtmlIfCurrent(_reauditHtmlToken');
    expect(reaudit).toContain('signal: _reauditSignal');
  });
});

describe('view output and CSS hardening', () => {
  it('rejects fetch-capable or executable AI CSS values', () => {
    const colorBody = between('function _viewSafeCssColor', 'function _viewSafeCssFontFamily');
    const fontBody = between('function _viewSafeCssFontFamily', 'function _viewAuditCanStartRemediation');
    const safeColor = new Function(`${colorBody}; return _viewSafeCssColor;`)();
    const safeFont = new Function(`${fontBody}; return _viewSafeCssFontFamily;`)();
    expect(safeColor('#123abc', '#fff', false)).toBe('#123abc');
    expect(safeColor('url(https://tracker.invalid/x)', '#fff', true)).toBe('#fff');
    expect(safeColor('@import "https://tracker.invalid/x"', '#fff', true)).toBe('#fff');
    expect(safeColor('linear-gradient(90deg,#fff,#000)', '#fff', true)).toBe('linear-gradient(90deg,#fff,#000)');
    expect(safeFont('Lexend, system-ui', 'system-ui')).toBe('Lexend, system-ui');
    expect(safeFont('x;src:url(https://tracker.invalid/font)', 'system-ui')).toBe('system-ui');
  });

  it('sanitizes report and compare markup and disallows scripts in the same-origin preview', () => {
    expect((source.match(/_viewSanitizeMarkupForExport\(generateAuditReportHtml/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('_safeCompareAfterHtml = _viewSanitizeMarkupForExport(pdfFixResult.accessibleHtml, _docPipeline)');
    expect(source).toContain('sandbox="allow-same-origin allow-forms allow-modals"');
    expect(source).not.toContain('sandbox="allow-same-origin allow-scripts allow-forms allow-modals"');
    expect(source).not.toContain('brand.extraCSS');
    expect(source).toContain('_viewSafeCssColor(brand.headerBg');
    expect(source).toContain('_viewSafeCssFontFamily(brand.bodyFont');
  });
});

describe('delivery and resource safety', () => {
  it('vetoes incomplete OCR text-layer delivery', () => {
    const body = between('function _alloTaggedPdfDeliveryVerdict', 'function _alloExecutableActiveContentFindings');
    const verdict = new Function(`${body}; return _alloTaggedPdfDeliveryVerdict;`)();
    const delivery = (ocrTextLayer) => ({ roundTrip: { ok: true }, postExportValidator: { summary: { overall: 'PASS' } }, ocrTextLayer });
    expect(verdict(delivery({ scanned: true, coveragePct: 100, pagesWithText: 2, pagesCovered: 2, pagesIncomplete: 0, pagesEmpty: 0, droppedChars: 0 })).ok).toBe(true);
    expect(verdict(delivery({ scanned: true, coveragePct: 100, pagesWithText: 2, pagesCovered: 1, pagesIncomplete: 1, pagesEmpty: 0, droppedChars: 0 }))).toMatchObject({ ok: false, code: 'ocr-text-layer-incomplete' });
    expect(verdict(delivery({ scanned: true, coveragePct: 0, pagesWithText: 0, pagesCovered: 0, pagesIncomplete: 0, pagesEmpty: 1, droppedChars: 0 })).ok).toBe(false);
  });

  it('preserves scoped verification without treating it as fully verified', () => {
    expect(source).toContain('complete-for-tested-scope|review-required');
    expect(source).toContain("value.verificationState === 'complete-for-tested-scope' && derived.verificationState === 'complete'");
    expect(source).toContain('fullyVerifiedSuccess: false');
  });

  it('uses adaptive batch budgets and persists a paused audio checkpoint', () => {
    expect(source).toContain('_BATCH_EFFECTIVE_MAX_FILE_BYTES');
    expect(source).toContain('_BATCH_EFFECTIVE_MAX_TOTAL_BYTES');
    expect(source).toContain('navigator.deviceMemory');
    const audio = between('const _beginAudioOperation =', 'const _audioOperationIsCurrent =');
    expect(audio).toContain('_saveAudioMeta(job, false, job.operationTicket)');
    expect(audio).toContain("status: 'paused'");
    expect(audio).not.toContain('audioJobRef.current = null;\n          setAudioJob(null);');
  });
});
