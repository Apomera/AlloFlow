import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Verify every SEL Hub tool's CDN module is reachable and is actually the
 * module, not the SPA fallback page.
 *
 * Fixed 2026-09-10, the same two defects as the STEM sibling (13-):
 *
 * 1. The tool list was hand-typed (70 ids) while the repo ships 72. The list
 *    is now every sel_tool_*.js in sel_hub/, which is exactly what the deploy
 *    mirrors to the CDN, so a new file is covered the moment it exists.
 *
 *    Note for the SEL owners: AlloFlowANTI.txt's selToolModules loads only 33
 *    of these on the web; the other 39 are in build.js (desktop) and were
 *    edited as recently as August. Whether they are reachable in the web app
 *    is a separate question this spec does not answer — it only proves the
 *    files are served.
 *
 * 2. The "looks like a SEL tool" regex accepted the SPA fallback. Cloudflare
 *    Pages answers a missing path with the app shell — 200, text/html,
 *    ~380 KB — and that shell contains the word "React", so the check passed
 *    for files that did not exist. The content type is now asserted directly.
 */
const ROOT = resolve(__dirname, '..', '..');

function shippedSelTools(): string[] {
  return readdirSync(resolve(ROOT, 'sel_hub'))
    .filter((f) => /^sel_tool_[a-z0-9_]+\.js$/.test(f))
    .map((f) => f.replace(/^sel_tool_|\.js$/g, ''))
    .sort();
}

const SEL_TOOLS = shippedSelTools();

test.describe('Every SEL Hub tool CDN file is reachable + valid', () => {
  test('the shipped list itself was read, and is not suspiciously short', () => {
    // If the directory scan silently found nothing, every per-tool test below
    // would be skipped and the suite would go green by having nothing to check.
    expect(SEL_TOOLS.length).toBeGreaterThan(50);
  });

  for (const id of SEL_TOOLS) {
    test(`sel_tool_${id}.js`, async ({ request }) => {
      const url = `https://alloflow-cdn.pages.dev/sel_hub/sel_tool_${id}.js`;
      const resp = await request.get(url);
      expect(resp.ok(), `${id}: HTTP ${resp.status()}`).toBeTruthy();
      // The fallback is served as text/html with a 200. This is the check that
      // actually separates "the module is there" from "the CDN gave up".
      const type = resp.headers()['content-type'] || '';
      expect(type, `${id}: served as "${type}" — that is the SPA fallback, not the module`).toMatch(/javascript/i);
      const body = await resp.text();
      expect(body.length, `${id}: response too small (${body.length} bytes)`).toBeGreaterThan(300);
      expect(body.trimStart().startsWith('<'), `${id}: body is HTML`).toBe(false);
      expect(/window\.SelHub|registerTool/.test(body), `${id}: doesn't register a SEL tool`).toBeTruthy();
    });
  }
});
