// rawhtml-block sanitization hardening (2026-06-22), from the OSS-incorporation survey (DOMPurify lane).
// The 'rawhtml' block in renderJsonToHtml carries model-supplied / imported HTML that ends up in the
// distributed export (opened in recipients' NON-sandboxed browsers). The sanitizer now PREFERS DOMPurify
// (a real HTML parser — catches mutation-XSS, entity-encoded schemes, nested polyglots) when it's loaded,
// and falls through to the regex baseline otherwise (so node/SSR + pre-CDN-load stay safe). This extracts
// the real _sanitizeRawHtmlBlock from doc_pipeline_source.jsx and exercises BOTH paths.
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── Extract the real loader + config + _sanitizeRawHtmlBlock (closure in doc_pipeline) ──
const _s = dp.indexOf('var _domPurifyPromise = null;');
const _e = dp.indexOf('// Best-effort warm-up at module init');
const _slice = dp.slice(_s, _e);
const _sanitizeRawHtmlBlock = new Function('warnLog', _slice + '\nreturn _sanitizeRawHtmlBlock;')(() => {});

// Save/restore the global window.DOMPurify so the two paths don't leak into each other.
const _hadWindow = typeof globalThis.window !== 'undefined';
const _prevDP = _hadWindow ? globalThis.window.DOMPurify : undefined;
afterAll(() => {
  if (_hadWindow) { if (_prevDP === undefined) delete globalThis.window.DOMPurify; else globalThis.window.DOMPurify = _prevDP; }
});
const _noPurify = () => { if (globalThis.window) delete globalThis.window.DOMPurify; };

describe('_sanitizeRawHtmlBlock: regex baseline (DOMPurify not loaded — node/SSR + pre-CDN path)', () => {
  it('FAILS CLOSED on execution-shaped content (#16, 2026-07-10): script/iframe blocks are WITHHELD, not regex-trimmed', () => {
    // The regex baseline cannot prove parity with DOMPurify against mutation-XSS — a block that
    // carries execution vectors while DOMPurify is unavailable is withheld with a visible notice
    // instead of riding the weaker sanitizer into a distributed file.
    _noPurify();
    const out = _sanitizeRawHtmlBlock('<p>ok</p><script>alert(1)</script><iframe src=evil></iframe>');
    expect(out).toContain('data-allo-rawhtml-withheld');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/<iframe/i);
    expect(out).not.toContain('<p>ok</p>'); // the whole block is withheld, not partially trusted
  });
  it('still strips INERT forbidden tags (<style>, form controls) while keeping the content — offline benign export unchanged', () => {
    _noPurify();
    const out = _sanitizeRawHtmlBlock('<p>ok</p><style>x{}</style><input value="q">');
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toMatch(/<style|<input/i);
    expect(out).not.toContain('data-allo-rawhtml-withheld');
  });
  it('inline event handlers and javascript: schemes are execution-shaped → withheld (#16)', () => {
    _noPurify();
    expect(_sanitizeRawHtmlBlock('<img src=x onerror="alert(1)">')).toContain('data-allo-rawhtml-withheld');
    expect(_sanitizeRawHtmlBlock('<svg/onload=alert(1)>')).toContain('data-allo-rawhtml-withheld');
    expect(_sanitizeRawHtmlBlock('<a href="javascript:alert(1)">x</a>')).toContain('data-allo-rawhtml-withheld');
    expect(_sanitizeRawHtmlBlock('<img src=x onerror="alert(1)">')).not.toMatch(/onerror/i);
  });
  it('leaves benign semantic HTML intact', () => {
    _noPurify();
    const out = _sanitizeRawHtmlBlock('<h2>Title</h2><ul><li>one</li></ul>');
    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<li>one</li>');
  });
  it('coerces non-string input without throwing', () => {
    _noPurify();
    expect(_sanitizeRawHtmlBlock(null)).toBe('');
    expect(_sanitizeRawHtmlBlock(undefined)).toBe('');
  });
});

describe('_sanitizeRawHtmlBlock: routes through DOMPurify when it is present', () => {
  it('calls window.DOMPurify.sanitize with the rawhtml config (not the regex)', () => {
    let seenCfg = null;
    globalThis.window = globalThis.window || {};
    globalThis.window.DOMPurify = { sanitize: (html, cfg) => { seenCfg = cfg; return 'PURIFIED::' + html; } };
    const out = _sanitizeRawHtmlBlock('<p onclick="x">hi</p>');
    expect(out).toBe('PURIFIED::<p onclick="x">hi</p>'); // delegated verbatim to DOMPurify (which strips handlers itself)
    expect(seenCfg).toBeTruthy();
    expect(Array.isArray(seenCfg.ALLOWED_TAGS)).toBe(true);
    expect(seenCfg.FORBID_TAGS).toContain('script');
    expect(seenCfg.ALLOW_DATA_ATTR).toBe(true);
  });
  it('falls back if DOMPurify.sanitize throws — benign content sanitizes, execution-shaped content withholds (#16)', () => {
    globalThis.window = globalThis.window || {};
    globalThis.window.DOMPurify = { sanitize: () => { throw new Error('boom'); } };
    const benign = _sanitizeRawHtmlBlock('<p>ok</p><style>x{}</style>');
    expect(benign).toContain('<p>ok</p>');
    expect(benign).not.toMatch(/<style/i);
    const risky = _sanitizeRawHtmlBlock('<p>ok</p><script>alert(1)</script>');
    expect(risky).toContain('data-allo-rawhtml-withheld');
    expect(risky).not.toMatch(/<script/i);
  });
});

describe('anti-drift: source wiring + lazy-loader shape', () => {
  it("the rawhtml case delegates to _sanitizeRawHtmlBlock (no inline regex left)", () => {
    expect(dp).toMatch(/case 'rawhtml':[\s\S]*?return _sanitizeRawHtmlBlock\(block\.html\);/);
  });
  it('the loader has 3 CDN mirrors and a node/SSR guard', () => {
    expect((_slice.match(/https:\/\/[^']*dompurify[^']*|https:\/\/[^']*purify\.min\.js/gi) || []).length).toBeGreaterThanOrEqual(3);
    expect(_slice).toContain("typeof window === 'undefined'");
  });
});
