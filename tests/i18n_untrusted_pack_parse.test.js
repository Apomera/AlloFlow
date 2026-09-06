// Fetched language packs and help strings are parsed, never evaluated.
// Background: AlloFlowANTI.txt used to run `new Function('return ' + text)()` on the body
// of every fetched pack and on help_strings.js. A compromised CDN, a bad file landing in
// lang/ on main, or an LLM translation would have had code execution in every client.
// This suite pins both halves of the fix: the eval is gone from every orchestrator copy,
// and the replacement parser accepts what the real files contain without running them.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const digest = (s) => crypto.createHash('sha256').update(s).digest('hex');
const COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const BEGIN = '// __ALLO_UNTRUSTED_PARSE_BEGIN__';
const END = '// __ALLO_UNTRUSTED_PARSE_END__';

function loadHelpers(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const start = src.indexOf(BEGIN);
  const end = src.indexOf(END);
  if (start < 0 || end < 0) throw new Error(file + ': helper block markers missing');
  const block = src.slice(start, end);
  // The block is plain function declarations; evaluating OUR OWN source in a test is fine.
  // The point of the fix is that FETCHED text never reaches anything like this line.
  const factory = new Function(
    block + '\nreturn { _alloParseUntrustedObject, _alloRelaxObjectLiteral, sanitizeLanguagePack, _sanitizeI18nString };'
  );
  return { src, helpers: factory() };
}

describe('orchestrator copies never evaluate fetched text', () => {
  for (const file of COPIES) {
    it(`${file} has no new Function( and wires the parser at all three fetch sites`, () => {
      const { src } = loadHelpers(file);
      expect(src).not.toMatch(/new Function\s*\(/);
      expect(src).not.toMatch(/\beval\s*\(\s*(text|hsText)\b/);
      // HELP_STRINGS refresh, pack loader, and the translation-init help strings.
      expect((src.match(/_alloParseUntrustedObject\(/g) || []).length).toBeGreaterThanOrEqual(4);
      // Every pack that reaches state is sanitized (PR #4's eight sites minus the two null resets).
      expect((src.match(/setLanguagePack\(sanitizeLanguagePack\(/g) || []).length).toBe(7);
      expect(src).not.toMatch(/setLanguagePack\((json|cachedPack|pack|finalPack|partialPack|accumulatedPack)\);/);
    });
  }

  it('the helper block is byte-identical across the three copies', () => {
    const blocks = COPIES.map((f) => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      return src.slice(src.indexOf(BEGIN), src.indexOf(END));
    });
    expect(blocks[1]).toBe(blocks[0]);
    expect(blocks[2]).toBe(blocks[0]);
  });
});

describe('_alloParseUntrustedObject', () => {
  const { helpers } = loadHelpers('AlloFlowANTI.txt');
  const parse = helpers._alloParseUntrustedObject;

  it('parses every shipped language pack identically to JSON.parse', () => {
    const dir = path.join(ROOT, 'lang');
    const packs = fs.readdirSync(dir).filter((f) => /^[a-z_]+\.js$/.test(f));
    expect(packs.length).toBeGreaterThan(50);
    const mismatched = [];
    for (const f of packs) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      // Hashes, not the multi-megabyte strings: a mismatch names the pack instead of dumping it.
      if (digest(JSON.stringify(parse(text))) !== digest(JSON.stringify(JSON.parse(text)))) mismatched.push(f);
    }
    expect(mismatched).toEqual([]);
  }, 120000);

  it('parses help_strings.js (comments, single quotes, trailing commas) without running it', () => {
    const text = fs.readFileSync(path.join(ROOT, 'help_strings.js'), 'utf8');
    expect(() => JSON.parse(text.replace(/^\s*\/\/.*$/gm, '').trim())).toThrow(); // strict JSON is NOT enough
    const parsed = parse(text);
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed).length).toBeGreaterThan(900);
    expect(typeof parsed.dispro_panel).toBe('string'); // the single-quoted key that broke strict JSON
    const mirror = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/help_strings.js'), 'utf8');
    expect(JSON.stringify(parse(mirror))).toBe(JSON.stringify(parsed));
  });

  it('handles the relaxed literal forms and nothing more', () => {
    expect(parse("// c\n{ 'a': 'it\\'s \"q\"', b: [1, 2,], c: true, /* note */ d: null, }"))
      .toEqual({ a: 'it\'s "q"', b: [1, 2], c: true, d: null });
    expect(parse('{"a":"x // not a comment"}')).toEqual({ a: 'x // not a comment' });
    expect(parse('{"a":"/* not a comment */"}')).toEqual({ a: '/* not a comment */' });
  });

  it('returns null for anything executable instead of running it', () => {
    globalThis.__alloPwned = false;
    const payloads = [
      '(function(){ globalThis.__alloPwned = true; return {} })()',
      '{ "a": (globalThis.__alloPwned = true) }',
      "{ a: 'x' + (globalThis.__alloPwned = true) }",
      '{ "a": 1 }; globalThis.__alloPwned = true',
      'globalThis.__alloPwned = true',
      '1 + 1',
      '"just a string"',
      '',
      'null',
    ];
    for (const p of payloads) expect(parse(p)).toBeNull();
    expect(globalThis.__alloPwned).toBe(false);
    delete globalThis.__alloPwned;
  });

  it('drops prototype-polluting keys at every depth', () => {
    const v = parse('{ "__proto__": { "polluted": true }, "nested": { "constructor": 1, "prototype": 2, "ok": 3 } }');
    expect(Object.prototype.hasOwnProperty.call(v, '__proto__')).toBe(false);
    expect(v.nested).toEqual({ ok: 3 });
    expect({}.polluted).toBeUndefined();
  });
});

describe('sanitizeLanguagePack', () => {
  const { helpers } = loadHelpers('AlloFlowANTI.txt');
  const sanitize = helpers.sanitizeLanguagePack;

  it('removes executable markup and event handlers but keeps ordinary text and inline markup', () => {
    const pack = sanitize({
      a: 'Hello <strong>world</strong>',
      b: 'x<script>alert(1)</script>y',
      c: '<img src=x onerror="alert(1)">',
      d: '<a href="javascript:alert(1)">link</a>',
      e: '<svg/onload=alert(1)>',
      f: '10 ones = 1 ten',
      g: { deep: ['<iframe src="https://evil"></iframe>ok'] },
    });
    expect(pack.a).toBe('Hello <strong>world</strong>');
    expect(pack.b).toBe('xy');
    expect(pack.c).not.toMatch(/onerror/i);
    expect(pack.d).not.toMatch(/javascript:/i);
    expect(pack.e).not.toMatch(/onload/i);
    expect(pack.f).toBe('10 ones = 1 ten');
    expect(pack.g.deep[0]).toBe('ok');
  });

  it('leaves every shipped pack byte-identical', () => {
    // Guards the Educator Evaluation export template too: its <style> and <meta charset>
    // fragments ride through t() in every pack and must not be stripped.
    const dir = path.join(ROOT, 'lang');
    const changed = [];
    for (const f of fs.readdirSync(dir).filter((x) => /^[a-z_]+\.js$/.test(x))) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const before = digest(JSON.stringify(JSON.parse(text)));
      if (digest(JSON.stringify(sanitize(JSON.parse(text)))) !== before) changed.push(f);
    }
    expect(changed).toEqual([]);
  }, 120000);

  it('neutralizes a meta refresh without touching <meta charset> or <style>', () => {
    const out = helpers._sanitizeI18nString('<meta http-equiv="refresh" content="0;url=https://evil"><meta charset="utf-8"><style>b{}</style>');
    expect(out).not.toMatch(/http-equiv/i);
    expect(out).toContain('<meta charset="utf-8">');
    expect(out).toContain('<style>b{}</style>');
  });

  it('strips __proto__ keys from packs', () => {
    const pack = sanitize(JSON.parse('{"__proto__": {"polluted": true}, "k": "v"}'));
    expect(Object.prototype.hasOwnProperty.call(pack, '__proto__')).toBe(false);
    expect(pack.k).toBe('v');
  });
});
