import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

// AlloFlow Packets as a site of its own (2026-11-23): dev-tools/build_packets_site.cjs copies the Packets pages and what
// they load into one folder with a _headers file. This builds the whole folder (about 400 MB, some seconds) into a temp
// folder outside the repository and reads it back. The browser check of the folder is
// node dev-tools/check_packets_smoke.cjs --root=<folder> (not part of this test).
const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(require.resolve('../dev-tools/build_packets_site.cjs')), '..');
const site = require('../dev-tools/build_packets_site.cjs');

let work, out, built;
beforeAll(() => {
  work = mkdtempSync(join(tmpdir(), 'packets-site-test-'));
  out = join(work, 'site');
  built = site.build({ out, quiet: true });
}, 300000);
afterAll(() => { if (work) rmSync(work, { recursive: true, force: true }); });

const walk = (dir, base = '') => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name), rel = base ? base + '/' + name : name;
  return statSync(full).isDirectory() ? walk(full, rel) : [rel];
});
const pages = () => readdirSync(ROOT).filter((f) => /^packets[\w-]*\.html$/.test(f)).sort();
// The rules for one route in _headers: { name: value }.
const rulesFor = (text, route) => {
  const lines = text.split('\n');
  const at = lines.indexOf(route);
  if (at < 0) return null;
  const out = {};
  for (let i = at + 1; i < lines.length && /^\s/.test(lines[i]); i++) { const t = lines[i].trim(); const c = t.indexOf(':'); out[t.slice(0, c)] = t.slice(c + 1).trim(); }
  return out;
};
const policy = (value) => Object.fromEntries(value.split(',').map((s) => s.trim().split('=')));

describe('the built folder', () => {
  it('has every Packets page, byte for byte, and index.html is packets.html', () => {
    for (const p of pages()) expect(readFileSync(join(out, p)).equals(readFileSync(join(ROOT, p))), p).toBe(true);
    expect(readFileSync(join(out, 'index.html')).equals(readFileSync(join(ROOT, 'packets.html')))).toBe(true);
    for (const f of ['LICENSE', 'THIRD_PARTY_LICENSES.md']) expect(existsSync(join(out, f)), f).toBe(true);
    for (const f of readdirSync(join(ROOT, 'licenses'))) expect(existsSync(join(out, 'licenses', f)), f).toBe(true);
  });

  it('has every file each copied page names in <script src> and <link href>', () => {
    const htmls = walk(out).filter((f) => f.endsWith('.html'));
    expect(htmls.length).toBe(pages().length + 1);
    let named = 0;
    for (const page of htmls) {
      const html = readFileSync(join(out, page), 'utf8');
      for (const m of html.matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="([^"#?]+)"/gi)) {
        if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(m[1])) continue;
        named++;
        expect(existsSync(join(out, m[1])), page + ' names ' + m[1]).toBe(true);
      }
    }
    expect(named).toBeGreaterThan(150);
  });

  it('has the files the pages load at run time: the word store, the shards, the voice runtime', () => {
    const index = JSON.parse(readFileSync(join(out, 'word_audio_shards/index.json'), 'utf8'));
    for (const s of Object.values(index.shards)) expect(existsSync(join(out, 'word_audio_shards', s.file)), s.file).toBe(true);
    expect(existsSync(join(out, 'word_audio_shards/review.txt'))).toBe(false);
    const cat = JSON.parse(readFileSync(join(out, 'engine_runtime_integrity.json'), 'utf8'));
    for (const id of cat.graphs.kokoro.assets) {
      const a = cat.assets[id];
      const bytes = readFileSync(join(out, a.path));
      expect(bytes.length).toBe(a.bytes);
      expect(createHash('sha384').update(bytes).digest('hex')).toBe(a.sha384);
    }
    for (const f of ['lame.min.js', 'kokoro_tts_loader.js', 'runtime_graph_host.js', 'runtime_graph_delivery_policy.js', 'audio_bank/phonemes.json', 'audio_bank/letters.json',
      'word_audio_kokoro_bank.json', 'vendor/pptxgenjs-3.12.0.bundle.js', 'vendor/jsqr-1.4.0.js', 'reading_symbols_ext_en.js', 'word_picture_semantic_en.js', 'packets_vocab/en-1.json', 'packets_vocab_ext/phrases.json'])
      expect(existsSync(join(out, f)), f).toBe(true);
  });

  it('copies nothing private, nothing from tests, reports, node_modules or .git, and nothing the app alone uses', () => {
    const all = walk(out);
    for (const f of all) {
      expect(site.EXCLUDED.some((re) => re.test(f)), f).toBe(false);
      expect(/^(tests|reports|node_modules|docs|\.git|dev-tools|desktop|sel_hub|stem_lab)\//.test(f), f).toBe(false);
    }
    for (const f of ['AlloFlowANTI.txt', 'word_sounds_module.js', 'math_fluency_module.js', '.env', 'package.json']) expect(all.includes(f), f).toBe(false);
  });

  it('writes a manifest whose sizes and sha256 match every file in the folder', () => {
    const m = JSON.parse(readFileSync(join(out, site.MANIFEST), 'utf8'));
    const all = walk(out).filter((f) => f !== site.MANIFEST).sort();
    expect(m.entries.map((e) => e.path)).toEqual(all);
    for (const e of m.entries) {
      const bytes = readFileSync(join(out, e.path));
      expect(bytes.length, e.path).toBe(e.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), e.path).toBe(e.sha256);
    }
    expect(m.files).toBe(all.length);
    expect(all.length + 1).toBeLessThanOrEqual(site.MAX_FILES);
    expect(Math.max(...m.entries.map((e) => e.bytes))).toBeLessThanOrEqual(site.MAX_FILE_BYTES);
  });
});

describe('_headers', () => {
  it('refuses framing, sniffing and the referrer on every path', () => {
    const text = readFileSync(join(out, '_headers'), 'utf8');
    const all = rulesFor(text, '/*');
    expect(all['X-Frame-Options']).toBe('DENY');
    expect(all['Content-Security-Policy']).toBe("frame-ancestors 'none'");
    expect(all['X-Content-Type-Options']).toBe('nosniff');
    expect(all['Referrer-Policy']).toBe('no-referrer');
    // No other rule loosens framing or adds a site-wide page rule: each page keeps its own meta CSP.
    const rules = text.split('\n').filter((l) => !l.startsWith('#')).join('\n');
    expect(rules.match(/Content-Security-Policy/g).length).toBe(1);
    expect(rules.match(/X-Frame-Options/g).length).toBe(1);
  });

  it('turns device features off on every page, but the camera on Collect by sealed QR and the microphone where a page records', () => {
    const text = readFileSync(join(out, '_headers'), 'utf8');
    const routes = pages().flatMap((p) => ['/' + p, '/' + p.replace(/\.html$/, '')]).concat(['/', '/index.html']);
    for (const route of routes) {
      const r = rulesFor(text, route);
      expect(r, route).not.toBeNull();
      const pp = policy(r['Permissions-Policy']);
      const page = route === '/' || route === '/index.html' ? 'packets.html' : route.slice(1).replace(/(\.html)?$/, '.html');
      expect(pp.camera, route).toBe(page === 'packets-qr.html' ? '(self)' : '()');
      expect(pp.microphone, route).toBe(['packets-make.html', 'packets-read-along.html'].includes(page) ? '(self)' : '()');
      for (const f of ['geolocation', 'payment', 'usb', 'display-capture']) expect(pp[f], route + ' ' + f).toBe('()');
    }
  });
});

describe('the guards', () => {
  it('needs --out, and refuses the repository or a folder in it git does not ignore', () => {
    expect(() => site.checkOut(null)).toThrow(/--out/);
    expect(() => site.checkOut(ROOT)).toThrow(/repository/);
    expect(() => site.checkOut(join(ROOT, 'packets-site-out'))).toThrow(/git does not ignore/);
    expect(() => site.checkOut(resolve(ROOT, '..'))).toThrow(/holds the repository/);
    expect(site.checkOut(join(work, 'elsewhere'))).toBe(join(work, 'elsewhere'));
  });

  it('will not empty a folder it did not make', () => {
    const other = join(work, 'not-mine');
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, 'keep.txt'), 'someone else');
    expect(() => site.build({ out: other, quiet: true, pages: ['packets.html'] })).toThrow(/Refusing to empty/);
    expect(readFileSync(join(other, 'keep.txt'), 'utf8')).toBe('someone else');
  });

  it('fails when a script stops naming a file it was said to load, or names a repository file that is not copied', () => {
    const kit = site.RUNTIME.find((e) => e.from === 'packets_audio_kit.js');
    const saved = kit.files;
    try {
      kit.files = ['no_such_file_anywhere.js'];
      expect(() => site.plan()).toThrow(/no longer names no_such_file_anywhere\.js/);
      kit.files = [];
      expect(() => site.plan()).toThrow(/packets_audio_kit\.js:\d+ names lame\.min\.js/);
    } finally { kit.files = saved; }
    expect(() => site.plan()).not.toThrow();
  });

  it('the plan reports where each run-time file is loaded (file:line)', () => {
    const r = built.plan.runtime;
    expect(r.find((x) => x.file === 'lame.min.js').from).toMatch(/^packets_audio_kit\.js:\d+$/);
    expect(r.find((x) => x.file === 'engine_runtime_integrity.json').from).toMatch(/^packets_voice_engine\.js:\d+$/);
    expect(r.some((x) => /word_audio_shards\/<\d+ files/.test(x.file))).toBe(true);
    expect(site.OTHER_SITES.some((s) => s.pages.includes('packets-feedback.html') && s.site.includes('alloflow-catalog-submit'))).toBe(true);
  });
});
