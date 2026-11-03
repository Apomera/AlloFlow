import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const factory = require('../runtime_assets/document/dompurify-3.4.17/purify.min.js');
const purifier = factory.sanitize ? factory : factory(window);
const XLSX = require('../runtime_assets/document/sheetjs-0.20.3/xlsx.full.min.js');
const previous = window.DOMPurify;
afterEach(() => { if (previous === undefined) delete window.DOMPurify; else window.DOMPurify = previous; });
const sha384 = bytes => createHash('sha384').update(bytes).digest('hex');
function loaderFixture(kind, initial, replacement) {
  const source = readFileSync(kind === 'backup' ? 'view_export_preview_source.jsx' : 'doc_pipeline_source.jsx', 'utf8');
  const boundaries = kind === 'sheet' ? ['  var _sheetJsPromise =', '  const convertXlsxToMarkdownTables =']
    : kind === 'backup' ? ['const _BUILDER_BACKUP_MAX_BYTES =', 'function _builderSanitizeBackupDocument(']
    : ['  var _domPurifyPromise =', '  // Best-effort warm-up at module init'];
  const start = source.indexOf(boundaries[0]), end = source.indexOf(boundaries[1], start);
  if (start < 0 || end <= start) throw Error('Missing loader boundary');
  const target = { setTimeout, clearTimeout }, scripts = [];
  target[kind === 'sheet' ? 'XLSX' : 'DOMPurify'] = initial;
  const document = { querySelector: () => null, createElement: () => ({ remove() {}, setAttribute() {} }),
    head: { appendChild(script) {
      scripts.push(script);
      queueMicrotask(() => {
        if (replacement) { target[kind === 'sheet' ? 'XLSX' : 'DOMPurify'] = replacement; script.onload(); }
        else script.onerror();
      });
    } } };
  const context = vm.createContext({ window: target, document, Promise, setTimeout, clearTimeout, warnLog() {},
    _configureTrustedDocumentScript(script, url) { script.integrity = 'synthetic-reviewed'; script.src = url; } });
  const api = kind === 'sheet' ? '({ load: _lazyLoadSheetJS })' : kind === 'backup'
    ? '({ load: _builderLoadBackupPurifier })' : '({ load: _ensureDOMPurify, sanitize: _sanitizeRawHtmlBlock })';
  vm.runInContext(source.slice(start, end) + '\nthis.api=' + api + ';', context);
  return { ...context.api, target, scripts };
}

describe('reviewed document dependency security updates', () => {
  it.each(['0.18.5', '0.20.1'])('does not reuse preloaded SheetJS %s and returns a captured approved reader', async version => {
    const old = { version, read() { throw Error('obsolete reader used'); } }, current = { version: '0.20.3', read() {} };
    const f = loaderFixture('sheet', old, current);
    const loaded = await f.load();
    expect(loaded).toBe(current); expect(f.scripts).toHaveLength(1);
    expect(f.scripts[0].src).toContain('sheetjs-0.20.3');
    f.target.XLSX = old; expect(loaded.version).toBe('0.20.3');
  });

  it('rejects a script that loads only obsolete SheetJS and permits a later retry', async () => {
    const old = { version: '0.20.1', read() {} };
    const f = loaderFixture('sheet', old, old);
    await expect(f.load()).rejects.toThrow('all mirrors');
    expect(f.scripts).toHaveLength(2);
    f.target.XLSX = { version: '0.20.3', read() {} };
    await expect(f.load()).resolves.toBe(f.target.XLSX);
  });

  it.each(['purifier', 'backup'])('%s refuses a preloaded obsolete sanitizer and keeps an approved captured instance', async kind => {
    const old = { version: '3.1.7', sanitize() { throw Error('obsolete sanitizer used'); } };
    const current = { version: '3.4.17', sanitize: html => 'safe:' + html };
    const f = loaderFixture(kind, old, current);
    expect(await f.load()).toBe(current); expect(f.scripts).toHaveLength(1);
    f.target.DOMPurify = old;
    expect(await f.load()).toBe(current);
    if (f.sanitize) expect(f.sanitize('text')).toBe('safe:text');
    if (kind === 'backup') expect(f.scripts[0].integrity).toBe('sha384-' + Buffer.from(sha384(readFileSync('runtime_assets/document/dompurify-3.4.17/purify.min.js')), 'hex').toString('base64'));
  });

  it('withholds active raw HTML when only an obsolete sanitizer exists and approved loads fail', async () => {
    let obsoleteCalls = 0;
    const f = loaderFixture('purifier', { version: '3.1.7', sanitize: html => { obsoleteCalls++; return html; } }, null);
    expect(f.sanitize('<script>synthetic()</script>')).toContain('data-allo-rawhtml-withheld');
    expect(await f.load()).toBeNull(); expect(obsoleteCalls).toBe(0);
    expect(f.scripts).toHaveLength(4);
  });
  it('runs the maintained official versions with matching approved local/public bytes', () => {
    expect(purifier.version).toBe('3.4.17'); expect(XLSX.version).toBe('0.20.3');
    const manifest = JSON.parse(readFileSync('document_runtime_integrity.json', 'utf8'));
    expect(manifest.assets['sheetjs.0.18.5']).toBeUndefined();
    expect(manifest.assets['sheetjs.0.20.1']).toBeUndefined();
    for (const id of ['dompurify', 'sheetjs.0.20.3']) {
      const record = manifest.assets[id], bytes = readFileSync(record.path);
      expect(record.bytes).toBe(bytes.length); expect(record.sha384).toBe(sha384(bytes));
      for (const prefix of ['desktop/web-app/public/', 'app/', 'desktop/web-app/public/app/']) {
        expect(readFileSync(prefix + record.path).equals(bytes)).toBe(true);
      }
      for (const mirror of record.mirrors) expect(mirror.sha384).toBe(record.sha384);
    }
  });

  it('uses the actual raw HTML settings to remove active content and preserve semantic tables', () => {
    window.DOMPurify = purifier;
    const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
    const start = source.indexOf('var _domPurifyPromise = null;');
    const end = source.indexOf('// Best-effort warm-up at module init', start);
    const sanitize = new Function('warnLog', source.slice(start, end) + '\nreturn _sanitizeRawHtmlBlock;')(() => {});
    const output = sanitize('<h2>Lesson</h2><table><caption>Results</caption><tr><th scope="col">Name</th><td>Sample</td></tr></table><a href="java&#x09;script:synthetic()">Link</a><img src="x" onerror="synthetic()"><svg><foreignObject><p onclick="synthetic()">unsafe</p></foreignObject></svg><script>synthetic()</script>');
    const doc = new DOMParser().parseFromString(output, 'text/html');
    expect(doc.querySelector('script,svg,foreignObject,[onerror],[onclick]')).toBeNull();
    expect(doc.querySelector('a').hasAttribute('href')).toBe(false);
    expect(doc.querySelector('caption').textContent).toBe('Results');
    expect(doc.querySelector('th').getAttribute('scope')).toBe('col');
  });

  it('preserves spreadsheet import with a small synthetic workbook and no prototype mutation', () => {
    const before = Object.getOwnPropertyNames(Object.prototype);
    const sheet = XLSX.utils.aoa_to_sheet([['label', 'value'], ['synthetic', 42], ['__proto__', 'text']]);
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Sample');
    const data = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const imported = XLSX.read(data, { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(imported.Sheets.Sample, { header: 1 })).toEqual([['label', 'value'], ['synthetic', 42], ['__proto__', 'text']]);
    expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(before);
  });

  it('keeps the vendor PDF.js eval workaround at all application and MCP getDocument sites', () => {
    const files = ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js',
      'view_pdf_audit_source.jsx', 'view_pdf_audit_module.js', 'desktop/web-app/public/view_pdf_audit_module.js',
      'desktop/mcp/remediation_headless_driver.cjs'];
    for (const file of files) {
      const calls = [...readFileSync(file, 'utf8').matchAll(/\b(?:pdfjsLib|pdfjs)\.getDocument\(\{([\s\S]*?)\}\)/g)];
      expect(calls.length, file).toBeGreaterThan(0);
      for (const call of calls) expect(call[1], file + ': ' + call[0]).toMatch(/isEvalSupported\s*:\s*false/);
    }
  });
});
