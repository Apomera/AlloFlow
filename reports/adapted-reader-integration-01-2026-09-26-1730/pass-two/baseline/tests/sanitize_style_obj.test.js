// Tests for _sanitizeStyleObj (2026-06-15 security fix): AI-parsed doc-style
// color/font values are interpolated into style="…" attributes in the
// script-enabled preview iframe, so a prompt-injected PDF must not break out.
// Runtime-extracted from doc_pipeline_source.jsx (anti-drift).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _sanitizeStyleObj(obj) {');
const end = src.indexOf('\nvar createDocPipeline = function(deps) {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _sanitizeStyleObj missing');
const _sanitizeStyleObj = new Function(src.slice(start, end) + '; return _sanitizeStyleObj;')();

describe('_sanitizeStyleObj — XSS-safe brand-color/font merge', () => {
  it('keeps legitimate hex colors, rgb, gradients, and font stacks', () => {
    const ok = {
      headingColor: '#1e3a5f', accentColor: 'rgb(37,99,235)',
      headerBg: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
      bodyFont: "'Georgia', 'Times New Roman', serif",
    };
    expect(_sanitizeStyleObj(ok)).toEqual(ok);
  });

  it('drops a value that breaks out of the style attribute', () => {
    const r = _sanitizeStyleObj({ headingColor: 'red"><img src=x onerror=alert(1)>', accentColor: '#2563eb' });
    expect(r.headingColor).toBeUndefined();        // dropped → default survives the spread
    expect(r.accentColor).toBe('#2563eb');
  });

  it('drops style-injection chars (semicolon, braces, backslash)', () => {
    const r = _sanitizeStyleObj({ a: 'red;position:fixed', b: 'x}{', c: 'a\\b', d: '#abc' });
    expect(r).toEqual({ d: '#abc' });
  });

  it('drops CSS injection vectors (url(), expression, javascript:, @import)', () => {
    const r = _sanitizeStyleObj({
      a: 'url(javascript:alert(1))', b: 'expression(alert(1))',
      c: 'javascript:alert(1)', e: '@import "evil.css"', good: '#fff',
    });
    expect(r).toEqual({ good: '#fff' });
  });

  it('drops over-long values and non-strings; tolerates junk input', () => {
    expect(_sanitizeStyleObj({ a: 'x'.repeat(201), b: 5, c: null, d: '#0a0' })).toEqual({ d: '#0a0' });
    expect(_sanitizeStyleObj(null)).toEqual({});
    expect(_sanitizeStyleObj('nope')).toEqual({});
  });
});
