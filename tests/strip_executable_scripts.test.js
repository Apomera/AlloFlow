// Strip embedded EXECUTABLE <script> from a remediated document before audit + export (maintainer ask,
// 2026-06-24). An accessibility-remediated document is static content; an embedded <script> is active
// content that won't function out of context, is untrusted (the preview iframe + the axe audit already strip
// it), and makes the AI auditor flag colours that live in JavaScript rather than the rendered document — the
// "Apply Crop" image-editor widget in an uploaded doc that surfaced as a #737373-on-blue contrast finding.
// DATA scripts (JSON-LD / application/json) are kept; <noscript> is never a <script>.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── extract the self-contained, pure helper ──
const _s = dp.indexOf('function _stripExecutableScripts(html) {');
const _e = dp.indexOf('\n}', _s) + 2;
const _stripExecutableScripts = new Function(dp.slice(_s, _e) + '\nreturn _stripExecutableScripts;')();

describe('_stripExecutableScripts: removes active scripts, keeps data scripts + document content', () => {
  it('removes the embedded "Apply Crop" image-editor widget script', () => {
    const html = '<body><h1>Worksheet</h1><p>content</p>'
      + '<script>var applyBtn=document.createElement("button");applyBtn.textContent=" Apply Crop ";'
      + 'applyBtn.style.cssText="padding:8px 20px;background:#2563eb;color:white";</script></body>';
    const out = _stripExecutableScripts(html);
    expect(out).not.toMatch(/<script/i);            // the widget script is gone
    expect(out).not.toMatch(/Apply Crop|createElement|cssText/); // ...including its body
    expect(out).toMatch(/<h1>Worksheet<\/h1>/);     // real content preserved
    expect(out).toMatch(/<p>content<\/p>/);
  });

  it('removes executable scripts: no-type, text/javascript, application/javascript, module', () => {
    expect(_stripExecutableScripts('<script>x()</script>')).toBe('');
    expect(_stripExecutableScripts('<script type="text/javascript">x()</script>')).toBe('');
    expect(_stripExecutableScripts('<script type="application/javascript">x()</script>')).toBe('');
    expect(_stripExecutableScripts('<script type="module">import "./x.js"</script>')).toBe('');
    expect(_stripExecutableScripts('<script type=module>x()</script>')).toBe(''); // unquoted type
  });

  it('KEEPS non-executable DATA scripts (JSON-LD + application/json structured metadata)', () => {
    const ld = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script>';
    expect(_stripExecutableScripts(ld)).toBe(ld);
    const json = '<script type="application/json">{"a":1}</script>';
    expect(_stripExecutableScripts(json)).toBe(json);
    const tmpl = '<script type="text/template"><li>row</li></script>';
    expect(_stripExecutableScripts(tmpl)).toBe(tmpl);
  });

  it('leaves <noscript> untouched (it is not a <script>)', () => {
    const ns = '<noscript><p>Enable JavaScript to use this page.</p></noscript>';
    expect(_stripExecutableScripts(ns)).toBe(ns);
  });

  it('in a mixed document: removes the executable script, keeps the JSON-LD sibling + all content', () => {
    const html = '<head><title>Doc</title>'
      + '<script type="application/ld+json">{"x":1}</script>'
      + '<script>trackAnalytics()</script></head>'
      + '<body><h1>Doc</h1><script>renderWidget()</script><p>keep me</p></body>';
    const out = _stripExecutableScripts(html);
    expect(out).toMatch(/application\/ld\+json/);   // data script kept
    expect(out).toMatch(/\{"x":1\}/);
    expect(out).not.toMatch(/trackAnalytics|renderWidget/); // both executable scripts removed
    expect(out).toMatch(/<h1>Doc<\/h1>/);
    expect(out).toMatch(/<p>keep me<\/p>/);
  });

  it('is a byte-for-byte no-op when there are no scripts', () => {
    const html = '<body><h1>Hi</h1><p>no scripts here</p><figure><img alt="x"></figure></body>';
    expect(_stripExecutableScripts(html)).toBe(html);
  });

  it('handles uppercase SCRIPT / TYPE and removes multiple executable scripts', () => {
    expect(_stripExecutableScripts('<SCRIPT>x()</SCRIPT>')).toBe('');
    const ld = '<SCRIPT TYPE="application/ld+json">{}</SCRIPT>';
    expect(_stripExecutableScripts(ld)).toBe(ld);
    expect(_stripExecutableScripts('a<script>1</script>b<script>2</script>c')).toBe('abc');
  });

  it('does not run away on a non-string / empty input', () => {
    expect(_stripExecutableScripts('')).toBe('');
    expect(_stripExecutableScripts(null)).toBe(null);
    expect(_stripExecutableScripts(undefined)).toBe(undefined);
  });
});

describe('anti-drift: the script-strip is wired into the cleanup + the audit baseline', () => {
  it('_stripExecutableScripts is defined and documents keeping JSON-LD / data scripts', () => {
    expect(dp).toContain('function _stripExecutableScripts(html)');
    expect(dp).toContain('application/ld+json'); // named in the keep-list rationale comment
    expect(dp).toContain('ld\\+json|json'); // ...and in the keep-list regex (escaped-slash form in source)
  });
  it('runs on accessibleHtml in the Step 4b deterministic cleanup (covers the AI re-audit + export)', () => {
    expect(dp).toContain('const _deScripted = _stripExecutableScripts(accessibleHtml)');
  });
  it('runs in _stripChromeForAudit (the export-equivalent deterministic audit baseline)', () => {
    expect(dp).toContain('html = _stripExecutableScripts(html);');
  });
});
