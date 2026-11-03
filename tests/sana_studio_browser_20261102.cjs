'use strict';
// Finite browser test: every HTTP request is intercepted; no image server/model runs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tmp/security-sana-studio-01a199e2');
const TOKEN = 'synthetic-test-token-only-01234567890123456789';
const ORIGIN = 'http://localhost:7860';
const SELFTEST = process.argv.includes('--selftest');
const canonical = fs.readFileSync(path.join(ROOT, 'docker/flux-server/studio.html'), 'utf8').replace(/\r\n?/g, '\n');
const serverHeaders = JSON.parse(execFileSync('python', ['-B', '-c', "import sys,json;sys.path.insert(0,'docker/flux-server');from studio import studio_headers;print(json.dumps(studio_headers()))"], { cwd: ROOT, encoding: 'utf8' }));

function png(width = 512, height = 512) {
  function chunk(type, bytes) {
    const name = Buffer.from(type), data = Buffer.concat([name, bytes]); let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const size = Buffer.alloc(4), sum = Buffer.alloc(4); size.writeUInt32BE(bytes.length); sum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, data, sum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * (width * 3 + 1) + 1 + x * 3;
    const sun = (x - width * .7) ** 2 + (y - height * .25) ** 2 < (width * .1) ** 2;
    const hill = y > height * (.64 + Math.sin(x / width * 6) * .1);
    [raw[i], raw[i + 1], raw[i + 2]] = sun ? [231, 188, 91] : hill ? [99, 150, 113] : [220, 234, 208];
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const fixture = png();
const payload = JSON.stringify({ data: [{ b64_json: fixture.toString('base64') }] });
const results = [], pages = [];
let browser;
async function test(name, fn) { await fn(); results.push(name); console.log('PASS', name); }
async function visible(page, id, value = true) { assert.equal(await page.locator('#' + id).isVisible(), value, id); }
async function ready(page) { await page.waitForFunction(() => document.querySelector('#status').dataset.kind === 'success'); }
async function setup(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1240, height: 1000 }, acceptDownloads: true, ...options.context });
  await context.addCookies([{ name: 'synthetic_cookie', value: 'must-not-be-sent', url: ORIGIN }]);
  const page = await context.newPage(), requests = [], errors = [], unexpected = [], pending = [];
  const state = { mode: 'ok', edits: true, health: 200, backend: 'sana-sprint' };
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/Content Security Policy|Refused to/.test(message.text())) errors.push(message.text()); });
  let html = options.html || canonical;
  const headers = { ...serverHeaders, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  // Mutation checks retain a valid CSP so a deliberately changed behavior can actually execute.
  if (options.html) headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace(/script-src 'sha256-[^']+'/, "script-src 'sha256-" + crypto.createHash('sha256').update(html.match(/<script>([\s\S]*?)<\/script>/)[1]).digest('base64') + "'");
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== ORIGIN) { unexpected.push(request.url()); await route.abort(); return; }
    if (url.pathname === '/' && request.method() === 'GET') return route.fulfill({ contentType: 'text/html; charset=utf-8', headers, body: html });
    if (url.pathname === '/health') return route.fulfill({ status: state.health, contentType: 'application/json', body: JSON.stringify({ backend: state.backend, device: 'cuda', txt2img: true, img2img: state.edits }) });
    if (['/v1/images/generations', '/v1/images/edits'].includes(url.pathname)) {
      requests.push({ url: request.url(), method: request.method(), headers: await request.allHeaders(), body: request.postDataJSON() });
      if (state.mode === 'pending') { await new Promise(resolve => pending.push(resolve)); if (page.isClosed()) return; }
      const status = typeof state.mode === 'number' ? state.mode : 200;
      const body = state.mode === 'bad' ? JSON.stringify({ data: [{ b64_json: 'bm90LWFuLWltYWdl' }] }) : state.mode === 'large' ? ' '.repeat(8 * 1024 * 1024 + 1) : status !== 200 ? '{"detail":"PRIVATE-ERROR-NEVER-REFLECT"}' : payload;
      return route.fulfill({ status, contentType: 'application/json', body }).catch(() => {});
    }
    unexpected.push(request.url()); await route.abort();
  });
  await page.goto(ORIGIN);
  await page.waitForFunction(() => !document.querySelector('#server-state').textContent.startsWith('Checking'));
  const item = { context, page, requests, errors, unexpected, state, release: () => pending.splice(0).forEach(resolve => resolve()) };
  pages.push(item); return item;
}
async function prepare(item) {
  await item.page.locator('#token').fill(TOKEN);
  await item.page.getByRole('button', { name: 'A colorful landscape' }).click();
}
async function submit(item) { await item.page.getByRole('button', { name: /^(Generate|Edit) image$/ }).click(); }
async function waitError(page, text) { await page.waitForFunction(text => document.querySelector('#status').textContent.includes(text), text); }
async function assertAuth(item) {
  await prepare(item); await submit(item); await ready(item.page);
  assert.equal(item.requests[0].headers.authorization, `Bearer ${TOKEN}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const installed = 'C:/Users/cabba/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe';
  const executablePath = process.env.SANA_TEST_CHROMIUM || (fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : installed);
  assert.ok(fs.existsSync(executablePath), 'An existing Chromium is required; this test never downloads one.');
  browser = await chromium.launch({ executablePath, headless: true, downloadsPath: OUT });
  const item = await setup(), { page, requests, state } = item;
  await test('Initial page: CSP executes, ready state, exact-origin help and no token persistence', async () => {
    assert.match(await page.locator('#server-state').innerText(), /SANA-Sprint.*Server ready/);
    assert.equal(await page.locator('#page-origin').textContent(), ORIGIN);
    await visible(page, 'result', false); await visible(page, 'download', false);
    assert.deepEqual(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)]), [[], []]);
    await page.screenshot({ path: path.join(OUT, 'studio-desktop.png'), fullPage: true });
  });
  await test('Required and short tokens cannot send requests; example button supplies a prompt', async () => {
    await submit(item); assert.equal(requests.length, 0);
    await page.locator('#token').fill('short'); await page.getByRole('button', { name: 'A colorful landscape' }).click(); await submit(item);
    await waitError(page, 'at least 32'); assert.equal(requests.length, 0);
    assert.match(await page.locator('#prompt').inputValue(), /watercolor/);
  });
  await test('Generate uses separate auth, no cookies/referrer, correct settings and a valid preview', async () => {
    await assertAuth(item);
    assert.equal(requests[0].url, ORIGIN + '/v1/images/generations');
    assert.equal(requests[0].method, 'POST'); assert.equal(requests[0].headers.cookie, undefined); assert.equal(requests[0].headers.referer, undefined);
    assert.deepEqual(requests[0].body, { model: 'sana-sprint', prompt: await page.locator('#prompt').inputValue(), size: '512x512', n: 1, num_inference_steps: 2, response_format: 'b64_json' });
    await visible(page, 'result'); await visible(page, 'download'); assert.equal(await page.locator('#result').evaluate(img => img.naturalWidth), 512);
    assert.equal(page.url(), ORIGIN + '/');
    assert.deepEqual(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)]), [[], []]);
    await page.screenshot({ path: path.join(OUT, 'studio-result.png'), fullPage: true });
  });
  await test('Save PNG downloads the exact generated bytes', async () => {
    const downloaded = page.waitForEvent('download'); await page.getByRole('link', { name: 'Save PNG' }).click();
    const download = await downloaded; assert.match(download.suggestedFilename(), /^alloflow-image-\d+\.png$/);
    const target = path.join(OUT, 'synthetic-download.png'); await download.saveAs(target); assert.deepEqual(fs.readFileSync(target), fixture);
  });
  await test('Upload/edit preserves input picture and prompt; Remove restores generation', async () => {
    await page.locator('#source').setInputFiles({ name: 'synthetic-source.png', mimeType: 'image/png', buffer: fixture });
    await page.getByRole('button', { name: 'Edit image', exact: true }).waitFor();
    await page.locator('#prompt').fill('Make the sky blue'); await submit(item); await ready(page);
    assert.equal(requests.at(-1).url, ORIGIN + '/v1/images/edits'); assert.equal(requests.at(-1).body.image, 'data:image/png;base64,' + fixture.toString('base64')); assert.equal(requests.at(-1).body.strength, .75);
    await page.getByRole('button', { name: 'Remove', exact: true }).click(); await visible(page, 'source-row', false);
    assert.equal(await page.locator('#generate').innerText(), 'Generate image');
  });
  await test('Invalid/oversized source files are rejected before network use', async () => {
    const before = requests.length;
    for (const file of [{ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') }, { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024 + 1) }]) {
      await page.locator('#source').setInputFiles(file); await waitError(page, 'Choose a PNG'); await visible(page, 'source-row', false);
    }
    assert.equal(requests.length, before);
  });
  for (const [code, text] of [[401, 'token was not accepted'], [403, 'allowed origins'], [408, 'upload timed out'], [413, 'too large'], [422, 'could not use those settings'], [429, 'server is busy'], [503, 'server is not ready'], [500, 'could not be completed']]) {
    await test(`HTTP ${code}: actionable error, no server-detail reflection, retry available`, async () => {
      state.mode = code; await submit(item); await waitError(page, text);
      assert.ok(!(await page.locator('#status').innerText()).includes('PRIVATE-ERROR')); assert.equal(await page.locator('#generate').isEnabled(), true);
    });
  }
  for (const [mode, text] of [['bad', 'did not return a PNG'], ['large', 'response was too large']]) await test(`Reject ${mode} image response`, async () => {
    state.mode = mode; await submit(item); await waitError(page, text); assert.equal(await page.locator('#generate').isEnabled(), true);
  });
  await test('Cancel ignores late responses, prevents duplicate submits and retains earlier image', async () => {
    state.mode = 'pending'; const before = requests.length, oldSrc = await page.locator('#result').getAttribute('src');
    await submit(item); await page.waitForFunction(() => document.querySelector('#cancel').hidden === false);
    await page.waitForFunction(() => document.querySelector('#generate').disabled);
    await page.locator('#studio-form').dispatchEvent('submit');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    item.release(); await waitError(page, 'Request cancelled');
    assert.equal(requests.length, before + 1); assert.equal(await page.locator('#result').getAttribute('src'), oldSrc); await visible(page, 'result');
  });
  await test('Token change and Forget cancel in-flight work; Forget clears input and focuses it', async () => {
    state.mode = 'pending'; await submit(item); await page.locator('#cancel').waitFor();
    await page.locator('#token').fill(TOKEN + 'x'); item.release(); await waitError(page, 'Token changed');
    await submit(item); await page.locator('#cancel').waitFor(); await page.getByRole('button', { name: 'Forget', exact: true }).click(); item.release();
    await waitError(page, 'Token forgotten'); assert.equal(await page.locator('#token').inputValue(), '');
    assert.equal(await page.locator('#token').evaluate(input => document.activeElement === input), true);
  });
  await test('Unavailable editing and health failure have recovery messages', async () => {
    state.edits = false; await page.locator('summary').click(); await page.getByRole('button', { name: 'Check server again' }).click();
    await page.locator('#token').fill(TOKEN);
    await page.locator('#source').setInputFiles({ name: 'source.png', mimeType: 'image/png', buffer: fixture });
    await page.getByRole('button', { name: 'Edit image', exact: true }).waitFor(); const before = requests.length; await submit(item); await waitError(page, 'editing available'); assert.equal(requests.length, before);
    state.health = 503; await page.getByRole('button', { name: 'Check server again' }).click(); await page.waitForFunction(() => document.querySelector('#server-state').textContent.includes('unavailable'));
    state.health = 200; state.edits = true; await page.getByRole('button', { name: 'Check server again' }).click();
    await page.waitForFunction(() => document.querySelector('#server-state').textContent.includes('Server ready'));
  });
  await test('Page exit clears token, source and preview, including back/forward cache state', async () => {
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    assert.equal(await page.locator('#token').inputValue(), ''); await visible(page, 'source-row', false); await visible(page, 'result', false); await visible(page, 'download', false); await visible(page, 'empty');
  });
  await test('Mobile layout has no horizontal overflow at 320px and 390px', async () => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(OUT, `studio-mobile-${width}.png`), fullPage: true });
    }
  });
  if (SELFTEST) await test('Behavior gate rejects missing Authorization (negative control)', async () => {
    const mutant = canonical.replace('Authorization: `Bearer ${token.value}`', "'X-Removed-Authorization': 'synthetic'"); assert.notEqual(mutant, canonical);
    const changed = await setup({ html: mutant }); await assert.rejects(() => assertAuth(changed), /authorization|Bearer|undefined/i);
  });
  await test('All requests remain on image origin and bundled CSP has no violations', async () => {
    for (const item of pages) { assert.deepEqual(item.unexpected, []); assert.deepEqual(item.errors, []); }
    assert.equal(fs.readFileSync(path.join(ROOT, 'docker/flux-server/studio.html'), 'utf8').replace(/\r\n?/g, '\n'), canonical);
  });
  fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify({ passed: results.length, cases: results, modelCalls: 0, realServerStarted: false, htmlSha256: crypto.createHash('sha256').update(canonical).digest('hex') }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { for (const item of pages) { item.release(); await item.context.close(); } if (browser) await browser.close(); });
