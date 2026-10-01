// The /app/ web shell gets real files for the vendor scripts and fonts it asks for
// (fleet wave 2, lane K5).
//
// WHY: Cloudflare Pages answers a missing path with the site's HTML page (200,
// text/html, 382 KB), so a missing asset costs a full HTML download and then fails.
// Measured on the King PD path: /app/vendor/lz-string, /app/vendor/idb-keyval and
// /fonts/Inter-latin.woff2 all came back as HTML on every cold visit, and storage
// fell back to cdnjs (a host a district filter may block). The shell copy in build.js
// (STUDENT_SHELL_ENTRIES) had no vendor/ or fonts/, and the fonts were root-absolute.
// Live check 2026-09-28 (curl content-type): /vendor/lz-string-1.4.4.min.js and
// /vendor/idb-keyval-6.2.0.umd.min.js at the site root are application/javascript.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (env, rel) => readFileSync(process.env[env] || resolve(ROOT, rel), 'utf8');
const ANTI = read('ALLO_ANTI_CANDIDATE', 'AlloFlowANTI.txt');
const BUILD = read('ALLO_BUILD_CANDIDATE', 'build.js');
const INDEX = read('ALLO_INDEX_CANDIDATE', 'desktop/web-app/public/index.html');

const entries = (() => {
  const m = BUILD.match(/const STUDENT_SHELL_ENTRIES = (\[[\s\S]*?\]);/);
  expect(m, 'STUDENT_SHELL_ENTRIES not found').not.toBeNull();
  return vm.runInNewContext(m[1]);
})();

const vendorUrl = (() => {
  const line = ANTI.split('\n').find(l => l.includes('const _vendorUrl = url =>'));
  expect(line, '_vendorUrl not found in AlloFlowANTI.txt').toBeTruthy();
  return href => vm.runInNewContext(line + '; _vendorUrl', { window: { location: new URL(href) } });
})();

const storageList = lib => {
  const at = ANTI.indexOf(`"./vendor/${lib}`);
  expect(at, lib).toBeGreaterThan(-1);
  return ANTI.slice(at, ANTI.indexOf('], ', at)).split('\n').map(s => s.trim().replace(/[",]/g, '')).filter(Boolean);
};

describe('storage scripts under the /app/ web shell', () => {
  it('resolve to the site root /vendor/ on the hosted shell and stay app-relative elsewhere', () => {
    const lz = './vendor/lz-string-1.4.4.min.js';
    expect(vendorUrl('https://alloflow-cdn.pages.dev/app/')(lz)).toBe('/vendor/lz-string-1.4.4.min.js');
    expect(vendorUrl('https://alloflow-cdn.pages.dev/app/?allo_join=ABC')(lz)).toBe('/vendor/lz-string-1.4.4.min.js');
    // Desktop bundle and dev server serve their own vendor/ beside the shell.
    expect(vendorUrl('http://localhost:3000/app/')(lz)).toBe(lz);
    expect(vendorUrl('http://127.0.0.1:8123/app/')(lz)).toBe(lz);
    // Canvas and a root-hosted build are left alone (their fallbacks follow).
    expect(vendorUrl('https://abc.scf.usercontent.goog/canvas/')(lz)).toBe(lz);
    expect(vendorUrl('https://alloflow.example/')(lz)).toBe(lz);
    expect(vendorUrl('https://alloflow-cdn.pages.dev/app/')('https://cdnjs.cloudflare.com/x.js')).toBe('https://cdnjs.cloudflare.com/x.js');
  });

  it('the loader passes every candidate through that mapping', () => {
    // includes(), not toContain(): a failing toContain diffs the whole 2.8 MB host and hangs.
    expect(ANTI.includes('await _alloLoadScriptGlobal(\n                    _vendorUrl(url),'), 'loader does not map candidates').toBe(true);
  });

  it.each(['lz-string-1.4.4.min.js', 'idb-keyval-6.2.0.umd.min.js'])('%s: first-party copy before third-party hosts', lib => {
    const list = storageList(lib);
    expect(list[0]).toBe('./vendor/' + lib);
    expect(list[1]).toBe('https://alloflow-cdn.pages.dev/vendor/' + lib);
    expect(list.slice(2).every(u => /cdnjs|jsdelivr|unpkg/.test(u))).toBe(true);
    // The root copy the mapping points at is a real script, not an HTML fallback.
    const file = resolve(ROOT, 'vendor', lib);
    expect(existsSync(file), file).toBe(true);
    expect(readFileSync(file, 'utf8').trimStart().startsWith('<')).toBe(false);
  });
});

describe('the published /app/ shell carries the files it asks for', () => {
  it('copies vendor/ and fonts/ into the shell', () => {
    expect(entries).toEqual(expect.arrayContaining(['vendor', 'fonts', 'static', 'index.html']));
  });

  it('asks for fonts app-relative, and each one is a real font the shell copy includes', () => {
    expect(INDEX).not.toMatch(/(?:url\(['"]?|href=")(?:%PUBLIC_URL%)?\/fonts\//);
    const fonts = [...INDEX.matchAll(/(?:url\(['"]?|href=")\.\/fonts\/([^'")]+)/g)].map(m => m[1]);
    expect(fonts.length).toBeGreaterThanOrEqual(11);
    for (const f of new Set(fonts)) {
      const file = resolve(ROOT, 'desktop/web-app/public/fonts', f);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(1000);
      expect(readFileSync(file).subarray(0, 4).toString('latin1')).toBe('wOF2');
    }
  });

  it('every ./vendor/ script the host asks for exists in the vendor/ folder the shell copies', () => {
    const wanted = [...ANTI.matchAll(/["']\.\/vendor\/([^"'?]+)/g)].map(m => m[1]);
    expect(wanted).toEqual(expect.arrayContaining(['lz-string-1.4.4.min.js', 'idb-keyval-6.2.0.umd.min.js', 'jszip-3.10.1.min.js']));
    for (const f of new Set(wanted)) {
      const file = resolve(ROOT, 'desktop/web-app/public/vendor', f);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
