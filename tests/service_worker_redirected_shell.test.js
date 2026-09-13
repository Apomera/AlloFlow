// The service worker must survive Cloudflare Pages' clean-URL redirect.
//
// Found 2026-09-13 on the live app: with the worker active, ANY second
// navigation in the same tab failed with net::ERR_FAILED, including a plain
// reload of /app/. Cause: the install step precached "./index.html", which
// Pages answers with a 308 to "./", so the cached shell was a REDIRECTED
// response. A navigation request's redirect mode is not "follow", and a
// redirected response may not be served to it, so Chrome failed the load. The
// background refetch then replaced the entry with a clean copy, which is why
// the THIRD navigation worked and nobody's fresh-context test ever saw it.
// Every returning visitor got one dead reload per deploy or update.
//
// This test serves the real worker behind a server that redirects exactly as
// Pages does, and drives a real Chromium: install, then reload. It fails on
// the worker as it was on 2026-09-13 morning and passes on the fixed one.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const WORKER = readFileSync(path.join(ROOT, 'app', 'sw.js'), 'utf8');
const PRECACHE = JSON.parse(WORKER.match(/const PRECACHE_PATHS = (\[[^\n]*\]);/)[1]);

const SHELL = '<!doctype html><html><head><meta charset="utf-8"><title>shell</title></head><body>shell<script>navigator.serviceWorker.register("./sw.js", { scope: "./" });</script></body></html>';

let server, base, browser;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/app/index.html') { res.writeHead(308, { Location: '/app/' }); res.end(); return; }
    if (url.pathname === '/app/' || url.pathname === '/app') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(SHELL); return; }
    if (url.pathname === '/app/sw.js') { res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end(WORKER); return; }
    if (url.pathname.startsWith('/app/')) { res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' }); res.end('/* asset */'); return; }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port + '/app/';
  browser = await chromium.launch();
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) { server.closeAllConnections(); await new Promise((r) => server.close(r)); } }, 30000);

describe('service worker vs the clean-URL redirect', () => {
  it('the worker precaches the shell by its .html path (the path Pages redirects)', () => {
    expect(PRECACHE[0]).toBe('./index.html');
  });

  it('a reload after the worker activates still loads, and the cached shell is not a redirected response', async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 30000 });
    // Let the install's precache settle.
    // Poll inside the page: install writes the precache after activation
    // reports, and the entry appears a moment later.
    const cached = await page.evaluate(async () => {
      const url = new URL('./index.html', location.href).toString();
      for (let i = 0; i < 100; i++) {
        for (const k of await caches.keys()) { const r = await (await caches.open(k)).match(url); if (r) return { redirected: r.redirected, status: r.status, cache: k }; }
        await new Promise((res) => setTimeout(res, 100));
      }
      return null;
    });
    expect(cached, 'the shell must be precached').not.toBeNull();
    expect(cached.redirected, 'a redirected response must never be stored as the shell').toBe(false);
    expect(cached.status).toBe(200);

    // The navigation that used to die.
    let failure = null;
    try { await page.reload({ waitUntil: 'load', timeout: 30000 }); } catch (e) { failure = e.message.split('\n')[0]; }
    expect(failure, 'second navigation').toBeNull();
    expect(await page.title()).toBe('shell');
    // And the one after it, served from the worker's cache again.
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    expect(await page.title()).toBe('shell');
    await ctx.close();
  }, 90000);
});
