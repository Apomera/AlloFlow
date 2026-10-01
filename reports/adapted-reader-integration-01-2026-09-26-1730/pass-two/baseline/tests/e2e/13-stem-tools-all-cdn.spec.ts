import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Verify every STEM Lab tool's CDN module is reachable and is actually the
 * module, not the SPA fallback page.
 *
 * Two things this used to get wrong (fixed 2026-09-10):
 *
 * 1. The tool list was a hand-typed array of 104 ids while the app loaded 147.
 *    Forty-four tools shipped with no CDN check at all, among them gisstudio,
 *    arccity, spacestation, treelab, machinelab and geologyexplorer. The list is
 *    now read out of AlloFlowANTI.txt's stemToolModules, which is the exact set
 *    the running app requests, so a new tool is covered the moment it is wired.
 *
 * 2. The "looks like JS" assertion accepted the SPA fallback. Cloudflare Pages
 *    answers a missing path with the app shell — 200, text/html, ~380 KB — and
 *    that shell contains the word "React", so the regex matched it. One entry
 *    ('algebraCAS', a miscased name for stem_tool_algebracas.js) had been
 *    passing on exactly that fallback. A 404 dressed as HTML is the failure mode
 *    this spec exists to catch, so the content type is now asserted directly.
 */
const ROOT = resolve(__dirname, '..', '..');

function loaderList(): string[] {
  const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const start = anti.indexOf('var stemToolModules = [');
  if (start < 0) throw new Error('stemToolModules not found in AlloFlowANTI.txt');
  const seg = anti.slice(start, anti.indexOf('];', start));
  const ids = [...seg.matchAll(/stem_lab\/stem_tool_([A-Za-z0-9_]+)\.js/g)].map((m) => m[1]);
  return [...new Set(ids)].sort();
}

const STEM_TOOLS = loaderList();

test.describe('Every STEM Lab tool CDN file is reachable + valid', () => {
  test('the loader list itself was read, and is not suspiciously short', () => {
    // If the parse silently found nothing, every per-tool test below would be
    // skipped and the suite would go green by having nothing to check.
    expect(STEM_TOOLS.length).toBeGreaterThan(100);
  });

  for (const id of STEM_TOOLS) {
    test(`stem_tool_${id}.js`, async ({ request }) => {
      const url = `https://alloflow-cdn.pages.dev/stem_lab/stem_tool_${id}.js`;
      const resp = await request.get(url);
      expect(resp.ok(), `${id}: HTTP ${resp.status()}`).toBeTruthy();
      // The fallback is served as text/html with a 200. This is the check that
      // actually separates "the module is there" from "the CDN gave up".
      const type = resp.headers()['content-type'] || '';
      expect(type, `${id}: served as "${type}" — that is the SPA fallback, not the module`).toMatch(/javascript/i);
      const body = await resp.text();
      expect(body.length, `${id}: too small (${body.length} bytes)`).toBeGreaterThan(500);
      expect(body.trimStart().startsWith('<'), `${id}: body is HTML`).toBe(false);
      expect(/window\.StemLab|registerTool/.test(body), `${id}: doesn't register a STEM tool`).toBeTruthy();
    });
  }
});
