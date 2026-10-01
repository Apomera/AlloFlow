// stem_deep_links.test.js — the generated STEM deep-link surface stays coherent.
//
// Three artifacts must agree, all generated from tool_index.json by
// dev-tools/build_stem_deep_links.cjs:
//   1. _redirects (+ the desktop/web-app/public mirror): /<slug> -> /app/?tool=<id>
//   2. AlloFlowANTI.txt's _ALLO_STEM_DEEP_LINK_MAP: normalized request -> id
//   3. the reader _alloReadShellDeepLinkTool, which resolves through the map
//
// A slug that redirects but does not resolve strands a visitor on the launch pad
// with no explanation, which is worse than a 404 — so coherence is the contract.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const index = JSON.parse(readFileSync(resolve(ROOT, 'tool_index.json'), 'utf8'));

const grab = (startMark) => {
  const s = anti.indexOf(startMark);
  expect(s, startMark + ' present in ANTI').toBeGreaterThan(-1);
  const e = anti.indexOf('\n};', s) + 3;
  return anti.slice(s, e);
};

const readerFor = (pathname, search) => {
  const code = grab('const _ALLO_STEM_DEEP_LINK_MAP') + '\n' +
    grab('const _alloReadShellDeepLinkTool') + '\nreturn _alloReadShellDeepLinkTool;';
  global.window = { location: { pathname, search } };
  return new Function(code)();
};

const redirects = readFileSync(resolve(ROOT, '_redirects'), 'utf8');
const mirror = readFileSync(resolve(ROOT, 'desktop/web-app/public/_redirects'), 'utf8');
const redirectRules = redirects.split('\n').filter((l) => /^\/\S+ \/app\/\?tool=/.test(l));

describe('STEM deep links', () => {
  it('generator reports current (no drift between tool_index.json and the artifacts)', () => {
    const out = execFileSync('node', ['dev-tools/build_stem_deep_links.cjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toContain('current');
  }, 30_000);

  it('every redirect slug resolves through the reader to its own tool id', () => {
    expect(redirectRules.length).toBeGreaterThan(100);
    for (const rule of redirectRules) {
      const [slug, target] = rule.split(' ');
      const id = target.split('tool=')[1];
      expect(readerFor(slug, '')(), slug).toBe(id);
      expect(readerFor('/app/', '?tool=' + id)(), '?tool=' + id).toBe(id);
    }
  });

  it('every tool in the index has a redirect', () => {
    const targets = new Set(redirectRules.map((r) => r.split(' ')[1].split('tool=')[1]));
    for (const tool of index.tools) expect(targets.has(tool.id), tool.id).toBe(true);
  });

  it('the two _redirects copies are identical', () => {
    expect(mirror).toBe(redirects);
  });

  it('unknown and reserved paths return null (normal app, no phantom tool)', () => {
    for (const [p, s] of [['/app/', ''], ['/guide', ''], ['/launch.html', ''], ['/app/', '?tool=notARealTool'], ['/', '']]) {
      expect(readerFor(p, s)(), p + s).toBe(null);
    }
  });

  it('the waterCycle fallback survives even without the map', () => {
    const code = grab('const _alloReadShellDeepLinkTool') + '\nreturn _alloReadShellDeepLinkTool;';
    global.window = { location: { pathname: '/water-cycle', search: '' } };
    expect(new Function(code)()()).toBe('waterCycle');
  });

  it('visitor banner strings exist', () => {
    const ui = readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8');
    for (const k of ['banner_aria', 'banner_text', 'banner_open', 'banner_dismiss']) {
      expect(ui).toContain('"' + k + '"');
    }
    expect(anti).toContain('shellDeepLinkBannerDismissed');
  });
});
