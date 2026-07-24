import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

const between = (startNeedle, endNeedle) => {
  const start = view.indexOf(startNeedle);
  const end = view.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end <= start) throw new Error(`Missing view markers: ${startNeedle} -> ${endNeedle}`);
  return view.slice(start, end);
};

const around = (needle, before = 300, after = 5000) => {
  const at = view.indexOf(needle);
  if (at < 0) throw new Error(`Missing view marker: ${needle}`);
  return view.slice(Math.max(0, at - before), Math.min(view.length, at + after));
};

const operationOwner = new Function(
  `${between(
    'function _alloCreateRemediationOperationOwner(options)',
    '// Prompt payloads are untrusted',
  )}
  return _alloCreateRemediationOperationOwner;`,
)();

const generatedContentHelpers = new Function(
  `${between(
    'function _viewNeutralizePromptFence(value)',
    '// _ensureDocxLib:',
  )}
  return {
    neutralize: _viewNeutralizePromptFence,
    restore: _viewRestoreNeutralizedPromptFences,
    render: _viewSafeSimpleMarkdownHtml,
  };`,
)();

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

describe('remaining remediation view async ownership', () => {
  it('drops deferred operation A after operation B takes ownership', async () => {
    let documentEpoch = 4;
    let html = '<main>A</main>';
    const writes = [];
    const owner = operationOwner({
      getDocumentEpoch: () => documentEpoch,
      isDocumentCurrent: (epoch) => epoch === documentEpoch,
      captureHtmlToken: () => ({ documentEpoch, html }),
    });
    const operationA = owner.begin({ kind: 'audio-job', sourceHtml: html });
    const gate = deferred();
    const lateA = (async () => {
      await gate.promise;
      if (owner.isCurrent(operationA) && operationA.htmlToken.html === html) writes.push('A');
      return owner.complete(operationA);
    })();

    html = '<main>B</main>';
    const operationB = owner.begin({ kind: 'preview-full-audit', sourceHtml: html });
    gate.resolve();

    expect(await lateA).toBe(false);
    expect(writes).toEqual([]);
    expect(operationA.controller.signal.aborted).toBe(true);
    expect(owner.isCurrent(operationB)).toBe(true);
    documentEpoch += 1;
    expect(owner.isCurrent(operationB)).toBe(false);
  });

  it('owns smart-table and companion transforms across result, progress, commit, and cleanup', () => {
    const smart = between('const _buildSmartTable = async', 'const [recoveryReviewOutcomes');
    expect(smart).toContain("_beginRemediationOperation('smart-table'");
    expect(smart).toContain('_smartTableCurrent()');
    expect(smart).toContain('_cancelRemediationOperation(_smartTableOperation)');
    expect(smart).toContain('_completeRemediationOperation(_smartTableOperation)');

    const translation = around('const _translationOperation =', 500, 5200);
    expect(translation).toContain('shouldAbort: () => !_remediationOperationSourceIsCurrent(_translationOperation)');
    expect(translation).toContain('if (_remediationOperationSourceIsCurrent(_translationOperation)) setPdfTranslateProgress');
    expect(translation).toContain('_viewSanitizeMarkupForExport(r && r.html, _docPipeline)');
    expect(translation).toContain('_commitAsyncHtmlIfCurrent(_translationToken');
    expect(translation).toContain('_completeRemediationOperation(_translationOperation)');

    const plain = around('const _plainOperation =', 500, 3500);
    expect(plain).toContain('shouldAbort: () => !_remediationOperationSourceIsCurrent(_plainOperation)');
    expect(plain).toContain('if (_remediationOperationSourceIsCurrent(_plainOperation)) setPlainLangProgress');
    expect(plain).toContain('_viewSanitizeMarkupForExport(r && r.html, _docPipeline)');
    expect(plain).toContain('_commitAsyncHtmlIfCurrent(_plainToken');
    expect(plain).toContain('_completeRemediationOperation(_plainOperation)');
  });

  it('owns glossary, legacy transforms, and easy-read output against their exact source', () => {
    const glossary = around("data-help-key=\"pdf_audit_glossary_appendix_btn\"", 200, 4500);
    expect(glossary).toContain("_beginRemediationOperation('glossary'");
    expect(glossary).toContain('_remediationOperationSourceIsCurrent(_glossaryOperation)');
    expect(glossary).toContain('_commitAsyncHtmlIfCurrent(_glossaryToken');
    expect(glossary).toContain('_viewEscapeGeneratedText(x.definition)');

    const legacy = around("id=\"pdf-translate-lang\"", 200, 15000);
    expect(legacy).toContain("_beginRemediationOperation('legacy-translate'");
    expect(legacy).toContain("_beginRemediationOperation('legacy-simplify'");
    expect(legacy).toContain('_viewSafeSimpleMarkdownHtml');
    expect(legacy).toContain('_commitAsyncHtmlIfCurrent(_legacyTranslationToken');
    expect(legacy).toContain('_commitAsyncHtmlIfCurrent(_legacySimplifyToken');

    const easyRead = around('const _easyReadOperation =', 500, 6500);
    expect(easyRead).toContain('_remediationOperationSourceIsCurrent(_easyReadOperation)');
    expect(easyRead).toContain('_toastForRemediationOperation(_easyReadOperation');
    expect(easyRead).toContain('_completeRemediationOperation(_easyReadOperation)');
  });

  it('owns preview audits and resumable audio after every async boundary', () => {
    const preview = between('const _runOwnedPreviewAudit = async', '// Pure single-occurrence block splice');
    expect(preview).toContain("const operationTicket = _beginRemediationOperation('preview-' + kind + '-audit'");
    expect(preview).toContain("getPdfPreviewHtml() === html");
    expect(preview.match(/if \(!previewIsCurrent\(\)\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(preview.match(/_commitAsyncHtmlIfCurrent\(operationTicket\.htmlToken/g)?.length).toBe(2);
    expect(preview).toContain('if (_completeRemediationOperation(operationTicket)) setPreviewAuditBusy');

    const audio = between('const _audioSourceSnapshotForJob =', '// Rebuild the job a saved project describes');
    expect(audio).toContain("sourceVariant: 'translation'");
    expect(audio).toContain("sourceVariant: 'plain'");
    expect(audio).toContain('fetch(url, { signal: operationTicket.controller');
    expect(audio.match(/_audioOperationIsCurrent\(operationTicket, j\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(audio).toContain('_commitAsyncHtmlIfCurrent(ticket.htmlToken');
    expect(audio).toContain('await _stitchAudioJob(true, operationTicket)');
    expect(audio).toContain('_completeRemediationOperation(operationTicket)');
  });
});

describe('remaining view prompt and executable-output security', () => {
  it('neutralizes fences reversibly and renders model text as inert markup', () => {
    const original = '"""\n```html\n<img src=x onerror=alert(1)>\n```\n"""';
    const neutralized = generatedContentHelpers.neutralize(original);
    expect(neutralized).not.toContain('"""');
    expect(neutralized).not.toContain('```');
    expect(generatedContentHelpers.restore(neutralized)).toBe(original);

    const rendered = generatedContentHelpers.render('# Heading\n<img src=x onerror=alert(1)>\n- **safe**');
    expect(rendered).toContain('<h3>Heading</h3>');
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(rendered).not.toContain('<img');
    expect(rendered).toContain('<strong>safe</strong>');
  });

  it('marks every remaining direct view prompt payload as untrusted and neutralized', () => {
    const blocks = [
      between('const _buildSmartTable = async', 'const [recoveryReviewOutcomes'),
      around("_beginRemediationOperation('legacy-translate'", 500, 8000),
      around("_beginRemediationOperation('legacy-simplify'", 500, 5000),
      around("_beginRemediationOperation('glossary'", 500, 4000),
      around("_beginRemediationOperation('easy-read-summary'", 500, 6500),
    ];
    for (const block of blocks) {
      expect(block).toMatch(/UNTRUSTED/);
      expect(block).toContain('_viewNeutralizePromptFence');
    }
  });

  it('sanitizes companion HTML and ePub content before executable use', () => {
    expect(view).toContain('const _safeTranslationHtml = _viewSanitizeMarkupForExport(r && r.html, _docPipeline);');
    expect(view).toContain('const _safePlainHtml = _viewSanitizeMarkupForExport(r && r.html, _docPipeline);');
    const epub = between('const _dlEpubMO = async', 'const _runAudioJob = async');
    expect(epub).toContain('html = _viewSanitizeMarkupForExport(html, _docPipeline)');
    expect(view).not.toContain('_wrapAsReaderApp(pdfFixResult.accessibleHtml)');
    expect(view).not.toContain('_wrapAsReaderApp(pdfFixResult._translation.html)');
    expect(view).not.toContain('_wrapAsReaderApp(pdfFixResult._plainLanguage.html)');
  });
});
