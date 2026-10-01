import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const sliceBetween = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`missing source markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
};

afterEach(() => {
  vi.useRealTimers();
});

describe('canonical remediation residual fixes', () => {
  it('suppresses contradictions only from strict rule provenance, never issue prose', () => {
    const helperSource = sliceBetween(
      'function _suppressContradictedIssues(issues, html) {',
      '// Normalize HTML to matchable VISIBLE TEXT',
    );
    const suppress = new Function(`${helperSource}\nreturn _suppressContradictedIssues;`)();
    const html = '<html lang="en"><head><title>Guide</title></head><body><main><h1>Guide</h1></main></body></html>';

    expect(suppress([{
      ruleId: 'document-title',
      claimKind: 'absence',
      issue: 'Falta por completo el título requerido.',
    }], html).suppressed).toHaveLength(1);
    expect(suppress([{
      ruleId: 'document-title',
      claimKind: 'quality',
      issue: 'The document title is missing and absent.',
    }], html).kept).toHaveLength(1);
    expect(suppress([{
      ruleId: 'other',
      claimKind: 'absence',
      issue: 'The document title is missing.',
    }], html).kept).toHaveLength(1);
    expect(helperSource).not.toMatch(/_absNear|const QUALITY|issue\s*\|\|\s*i\.description/);
  });

  it('uses one BCP-47 validator in strict parsing and majority voting', () => {
    const validatorSource = sliceBetween(
      'const _AUDIT_LANGUAGE_TAG_RE',
      'const _auditIssueRecordIsValid',
    );
    const isValid = new Function(`${validatorSource}\nreturn _auditLanguageTagIsValid;`)();

    expect(isValid('en')).toBe(true);
    expect(isValid('zh-Hant-TW')).toBe(true);
    expect(isValid('sr-Latn-RS')).toBe(true);
    expect(isValid('en_US')).toBe(true);
    expect(isValid('english')).toBe(false);
    expect(isValid('en<script>')).toBe(false);
    expect(source).toContain('if (_auditLanguageTagIsValid(code)) _votes[code]');
    expect(source).not.toContain('const _validLangPat');
  });

  it('enforces the baseline-audit invariant inside the exported remediation core', () => {
    const guard = sliceBetween(
      'const _auditResult = batchOverrides?.auditResult || _run.auditResult;',
      '// Claim the generation before the digest await.',
    );
    expect(guard).toContain('const _auditEvidenceFailed = !_auditResult');
    expect(guard).toContain('Number(_auditResult.score) < 0');
    expect(guard).toContain("throw _auditError");
    expect(guard).toContain("BaselineAuditRequiredError");
    expect(guard).not.toContain('if (!_silentMode && !_auditResult)');
  });

  it('guards every Vision attachment centrally and neutralizes embedded document fields', () => {
    const transport = sliceBetween(
      'var callGeminiVision = _rawCallGeminiVision ? function() {',
      'var callImagen = deps.callImagen;',
    );
    expect(transport).toContain('args[0] = _withUntrustedAttachmentBoundary(args[0]);');
    expect(transport).toContain('_rawCallGeminiVision.apply(null, args)');
    expect(source).toContain("const _altData = _untrustedPromptDataBlock('DOCUMENT ALT TEXT'");
    expect(source).toContain("var listing = _untrustedPromptDataBlock('DOCUMENT BLOCK LIST'");
    expect(source.match(/_untrustedPromptDataBlock\('SOURCE TAG TREE HEADING OUTLINE'/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('_stripCodeFence(_restoreNeutralizedPromptFences(jsonResult))');
    expect(source).toContain('_stripCodeFence(_restoreNeutralizedPromptFences(chunkResult))');
    expect(source).not.toContain('alt text: "\' + c.alt.slice(0, 300)');
  });

  it('sanitizes model body markup before the trusted wrapper and escapes filenames', () => {
    const sanitizerSource = sliceBetween(
      'var _ALLO_MAX_IMPORTED_HTML_CHARS',
      'function _alloSanitizeRemediationProject',
    );
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const sanitizeBody = new Function(
      'DOMParser',
      `${sanitizerSource}\nreturn _alloSanitizeRemediationBodyFragment;`,
    )(dom.window.DOMParser);
    const clean = sanitizeBody(
      '<p onclick="steal()">Safe text</p>'
      + '<script>window.pwned=1</script>'
      + '<img src="https://evil.invalid/x" onerror="steal()">'
      + '<style>@import "https://evil.invalid/x.css"; .ok{color:red;background:url(https://evil.invalid/x)}</style>'
      + '<svg><animate attributeName="href" values="javascript:steal()"></animate></svg>',
    );

    expect(clean).toContain('Safe text');
    expect(clean).not.toMatch(/<script|onclick|onerror|evil\.invalid|javascript:|<animate/i);
    const bodySanitizeAt = source.indexOf('bodyContent = _alloSanitizeRemediationBodyFragment(bodyContent);');
    const wrapperAt = source.indexOf('// Wrap in full HTML document', bodySanitizeAt);
    expect(bodySanitizeAt).toBeGreaterThan(0);
    expect(wrapperAt).toBeGreaterThan(bodySanitizeAt);
    expect(source).toContain('<title>Accessible Document — ${_safeDocumentTitleHtml}</title>');
    expect(source).toContain('Original: ${_safeFileNameHtml}');
    expect(source).not.toContain("Original: ${(_fileName || 'unknown')}");
  });

  it('times out one SheetJS mirror, retries once, settles shared callers, and clears ownership', async () => {
    vi.useFakeTimers();
    const loaderSource = sliceBetween(
      'var _sheetJsPromise = null;',
      'const convertXlsxToMarkdownTables',
    );
    const scripts = [];
    const fakeWindow = {};
    const fakeDocument = {
      head: {
        appendChild(script) {
          scripts.push(script);
          return script;
        },
      },
      createElement() {
        return { remove: vi.fn(), onload: null, onerror: null, async: false, src: '' };
      },
    };
    const runtime = new Function(
      'window',
      'document',
      'setTimeout',
      'clearTimeout',
      `${loaderSource}\nreturn { load: _lazyLoadSheetJS, state: () => ({ pending: !!_sheetJsPromise, owner: _sheetJsOwner }) };`,
    )(fakeWindow, fakeDocument, setTimeout, clearTimeout);

    const first = runtime.load();
    const duplicate = runtime.load();
    expect(duplicate).toBe(first);
    await Promise.resolve();
    expect(scripts).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(12000);
    expect(scripts).toHaveLength(2);
    expect(scripts[0].remove).toHaveBeenCalledTimes(1);

    fakeWindow.XLSX = { read: vi.fn() };
    scripts[1].onload();
    await expect(first).resolves.toBeUndefined();
    expect(scripts[1].remove).toHaveBeenCalledTimes(1);
    expect(runtime.state()).toEqual({ pending: false, owner: 0 });

    await expect(runtime.load()).resolves.toBeUndefined();
    expect(scripts).toHaveLength(2);
  });
});
