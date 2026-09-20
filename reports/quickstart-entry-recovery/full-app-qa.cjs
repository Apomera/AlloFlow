'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const { chromium } = require('@playwright/test');

// Run from the checkout whose compiled app/ output is under test.
// Only the Canvas storage transport is replaced; app UI/state/handlers are real.
const root = process.cwd();
const phase = process.argv.includes('--before') ? 'before' : 'after';
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm' };
function localAsset(urlPath) {
  const file = path.resolve(root, '.' + decodeURIComponent(urlPath));
  return file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

(async () => {
  const server = http.createServer((req, res) => {
    let urlPath = new URL(req.url, 'http://local').pathname;
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = localAsset(urlPath);
    if (!file) { res.statusCode = 404; res.end('missing'); return; }
    if (types[path.extname(file)]) res.setHeader('Content-Type', types[path.extname(file)]);
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  // The hostname activates the canonical Canvas entry path without changing app code.
  const origin = 'http://code-server.localhost:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'code-server.localhost') return route.continue();
      const relative = url.pathname.replace(/^\/gh\/Apomera\/AlloFlow@[^/]+\//, '/');
      if (url.hostname === 'alloflow-cdn.pages.dev' || url.hostname.endsWith('jsdelivr.net')) {
        const file = localAsset(relative);
        if (file) return route.fulfill({ path: file, contentType: types[path.extname(file)] });
      }
      if (/googleapis|firebaseio|cloudfunctions/.test(url.hostname) && !url.pathname.endsWith('.js')) return route.abort();
      return route.continue();
    });
    await page.addInitScript(() => {
      localStorage.setItem('allo_wizard_completed', 'true');
      const store = { version: 1, legacyMigrated: true, snapshots: [{ version: 1,
        id: 'saved-probe', savedAt: '2026-09-20T10:00:00Z', title: 'Saved reading', resourceCount: 1,
        workspace: { history: [{ id: 'reading', type: 'source', data: { text: 'Keep this original reading.' } }] }
      }] };
      window.alloDeviceStorage = { ready: async () => {},
        get: async namespace => namespace === 'workspace_recovery' ? store : null,
        set: async () => {}, remove: async () => {} };
    });
    await page.goto(origin + '/app/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click({ timeout: 30000 });
    await page.getByRole('button', { name: /Full Platform/ }).click();
    await page.getByRole('button', { name: /^Teacher.*Build accessible lessons/ }).click();
    if (phase === 'after') await page.locator('#quickstart-wizard-title').waitFor({ timeout: 30000 });
    else await page.waitForTimeout(2500);
    const result = { phase, checkedAt: new Date().toISOString(),
      wizardVisible: await page.locator('#quickstart-wizard-title').isVisible(),
      completed: await page.evaluate(() => localStorage.getItem('allo_wizard_completed')), errors };
    assert.equal(result.wizardVisible, phase === 'after');
    assert.equal(result.completed, phase === 'after' ? null : 'true');
    assert.deepEqual(errors, []);
    if (phase === 'after') await page.waitForTimeout(6500); // Let entry animations and success toasts settle for visual review.
    await page.screenshot({ path: path.join(__dirname, 'full-app-' + phase + '.png'), animations: 'disabled' });
    if (phase === 'after') {
      const wizard = page.getByRole('dialog', { name: 'Quick Start', exact: true });
      await wizard.getByRole('button', { name: 'Next', exact: true }).click();
      await wizard.getByText('Find on the Web', { exact: true }).waitFor();
      result.advancedToSources = true;
    }
    fs.writeFileSync(path.join(__dirname, 'full-app-' + phase + '.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
