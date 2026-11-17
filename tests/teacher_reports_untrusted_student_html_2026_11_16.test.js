// Teacher dashboard reports built from student files (2026-11-16).
//
// A student file is untrusted. "Export notebooks PDF" built HTML from the
// student's nickname (unescaped, straight from the imported file) and from
// rendered notebook entries, then assigned it to innerHTML in the teacher's live
// page so the PDF library could draw it. A crafted file could run script in the
// teacher's session. Only the single-student preview had been sanitized, and
// that one fell back to raw HTML when the sanitizer was missing.
//
// These tests run the two helpers out of the SHIPPED teacher_module.js with the
// real host sanitizer, and check that every report sink goes through them.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const MODULE = read('teacher_module.js');
const SOURCE = read('teacher_source.jsx');
const ANTI = read('AlloFlowANTI.txt');

const sanitizerBlock = sliceBetween(ANTI, '// __ALLO_SANITIZE_HTML_BEGIN__', '// __ALLO_SANITIZE_HTML_END__', { file: 'AlloFlowANTI.txt' });
// eslint-disable-next-line no-new-func
const hostSanitizeHtml = new Function('DOMParser', sanitizerBlock + '\nreturn sanitizeHtml;')(globalThis.DOMParser);

function helpers(sanitizer, { noDomParser = false } = {}) {
  const helperCode = sliceBetween(MODULE, 'function _tdEscapeHtml(', 'function alloTeacherStableId(', { file: 'teacher_module.js' });
  const fakeWindow = sanitizer ? { sanitizeHtml: sanitizer } : {};
  // eslint-disable-next-line no-new-func
  return new Function('window', 'DOMParser', helperCode + '\nreturn { escape: _tdEscapeHtml, safe: _tdSafeReportHtml };')(fakeWindow, noDomParser ? undefined : globalThis.DOMParser);
}

// Put the string in a page the way the dashboard does and list anything that could run.
function executable(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  const found = [];
  host.querySelectorAll('*').forEach((el) => {
    if (/^(script|iframe|object|embed|form|base|meta|link|frame)$/i.test(el.tagName)) found.push('<' + el.tagName.toLowerCase() + '>');
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.replace(/[\x00-\x20]+/g, '').toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') found.push(name);
      else if (/href|src|action/.test(name) && /^(javascript|vbscript):/.test(value)) found.push(name + '=' + value.slice(0, 20));
    }
  });
  return found;
}

const HOSTILE_NAME = 'Sam<img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script>';
const HOSTILE_ENTRY = '<div style="color:#111">Notes<svg onload="window.__pwned=3"></svg><a href="javascript:window.__pwned=4">x</a><iframe srcdoc="<script>1</script>"></iframe></div>';

describe('teacher dashboard reports treat student files as untrusted', () => {
  it('a hostile nickname becomes text', () => {
    const { escape } = helpers(hostSanitizeHtml);
    const out = escape(HOSTILE_NAME);
    expect(out).not.toContain('<');
    const host = document.createElement('div');
    host.innerHTML = '<h2>' + out + '</h2>';
    expect(host.querySelectorAll('img, script').length).toBe(0);
    expect(host.textContent).toBe(HOSTILE_NAME);
  });

  it('a report with hostile entry HTML has nothing left that can run, and keeps its layout styles', () => {
    const { escape, safe } = helpers(hostSanitizeHtml);
    const report = '<div style="font-family:Helvetica; padding:30px;"><h2 style="font-size:18px;">' + escape(HOSTILE_NAME) + ' — Notebook</h2>' + HOSTILE_ENTRY + '</div>';
    // The unsanitized report really is dangerous: the check below is not vacuous.
    expect(executable('<h2>' + HOSTILE_NAME + '</h2>' + HOSTILE_ENTRY).length).toBeGreaterThan(2);
    const out = safe(report);
    expect(executable(out)).toEqual([]);
    expect(out).toContain('font-family:Helvetica');
    expect(out).toContain('Notes');
  });

  it('on an older host with no sanitizer, the module strips what can run and the report still renders', () => {
    const { safe } = helpers(null);
    const out = safe('<div style="padding:30px"><h2>' + HOSTILE_NAME + '</h2>' + HOSTILE_ENTRY + '</div>');
    expect(executable(out)).toEqual([]);
    expect(out).toContain('padding:30px');
    expect(out).toContain('<h2>');
    expect(out).toContain('Notes');
  });

  it('with no sanitizer and no DOM parser the report is shown as text, never passed through raw', () => {
    const { safe } = helpers(null, { noDomParser: true });
    const out = safe('<h2>' + HOSTILE_NAME + '</h2>' + HOSTILE_ENTRY);
    expect(out).not.toContain('<');
    expect(executable(out)).toEqual([]);
  });

  it('every report sink in the dashboard goes through the helper', () => {
    for (const [name, text] of [['teacher_source.jsx', SOURCE], ['teacher_module.js', MODULE]]) {
      const sinks = text.match(/container\.innerHTML = [^;]+;/g) || [];
      expect(sinks.length, name + ': four PDF report sinks').toBe(4);
      sinks.forEach((sink) => expect(sink, name).toBe('container.innerHTML = _tdSafeReportHtml(reportHtml);'));
    }
    // The single-student preview uses the same helper, so it has no raw fallback either.
    expect(SOURCE).not.toMatch(/:\s*generateResourceHTML\(item, true, selectedStudent\.responses \|\| \{\}\)\)/);
    expect(SOURCE).toContain('_tdSafeReportHtml(generateResourceHTML(item, true, selectedStudent.responses || {}))');
    // Names taken from a student file are escaped where they are written into report HTML.
    expect(SOURCE).not.toMatch(/\$\{\(?student\.studentNickname(?: \|\| 'Anonymous')?\)?\}/);
    expect(SOURCE).not.toContain('${r.name}');
  });
});
