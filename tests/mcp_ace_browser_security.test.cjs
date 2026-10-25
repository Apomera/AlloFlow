'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const http = require('node:http');
const serverRoot = path.resolve(process.env.SECURITY_MCP_SERVER || path.join(__dirname, '../desktop/mcp'));
const { install } = require(path.join(serverRoot, 'remediation_ace_browser.cjs'));

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-ace-policy-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('alloflow-ace-policy-'));
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  const epubRoot = path.join(dir, 'epub'), trustedScriptRoot = path.join(dir, 'runtime');
  fs.mkdirSync(epubRoot); fs.mkdirSync(trustedScriptRoot);
  const chapter = path.join(epubRoot, 'chapter.html'), outside = path.join(dir, 'outside.html');
  fs.writeFileSync(chapter, '<h1>Safe chapter</h1>'); fs.writeFileSync(outside, 'OUTSIDE_SYNTHETIC_CONTENT');
  return { dir, epubRoot, trustedScriptRoot, chapter, outside };
}

function fakeBrowser() {
  const pages = [], launches = [];
  const browser = { close: async () => {}, newPage: async () => {
    const page = new EventEmitter(); page.settings = []; page.evaluated = [];
    for (const name of ['setJavaScriptEnabled', 'setBypassCSP', 'setOfflineMode', 'setBypassServiceWorker', 'setRequestInterception']) {
      page[name] = async value => page.settings.push([name, value]);
    }
    page.evaluate = async source => page.evaluated.push(source);
    page.createCDPSession = async () => ({ send: async (method, options) => {
      if (method === 'Network.emulateNetworkConditions') {
        assert.equal(options.offline, true); page.settings.push(['setOfflineMode', true]);
      } else assert.equal(method, 'Network.enable');
    } });
    page.evaluateHandle = async () => ({ syntheticElement: true }); page.close = async () => {};
    pages.push(page); return page;
  } };
  return { pages, launches, puppeteer: { launch: async options => { launches.push(options); return browser; } } };
}

test('restores Chromium sandbox and locks every new page offline with enforced document CSP', async t => {
  const options = fixture(t), fake = fakeBrowser(); install(fake.puppeteer, options);
  const browser = await fake.puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--safe-option'] });
  assert.deepEqual(fake.launches[0].args, ['--safe-option']);
  assert.equal(fake.launches[0].ignoreDefaultArgs, false);
  for (let i = 0; i < 2; i++) {
    const page = await browser.newPage();
    assert.deepEqual(page.settings, [['setJavaScriptEnabled', true], ['setBypassCSP', false], ['setOfflineMode', true],
      ['setBypassServiceWorker', true], ['setRequestInterception', true]]);
    assert.throws(() => page.setJavaScriptEnabled(false)); assert.throws(() => page.setBypassCSP(true)); assert.throws(() => page.setOfflineMode(false));
    assert.throws(() => page.setBypassServiceWorker(false)); assert.throws(() => page.setRequestInterception(false));
  }
});

test('denies external/encoded local paths and active schemes before upstream file readers run', async t => {
  const options = fixture(t), fake = fakeBrowser(), policy = install(fake.puppeteer, options);
  const page = await (await fake.puppeteer.launch()).newPage();
  let upstreamReads = 0;
  page.on('request', request => { upstreamReads++; request.continue(); });
  const denied = [pathToFileURL(options.outside).href, pathToFileURL(options.epubRoot).href + '/%2e%2e/outside.html',
    'file://remote-host/share/private.html', 'file:///bad%2fencoded.html', 'http://127.0.0.1/private',
    'https://example.invalid/', 'ws://127.0.0.1/', 'data:text/html,<script>unsafe()</script>', 'blob:https://example.invalid/value'];
  for (const url of denied) {
    let handled = false, aborted = false;
    page.emit('request', { url: () => url, resourceType: () => 'document',
      isInterceptResolutionHandled: () => handled, abort: async () => { handled = true; aborted = true; },
      continue: () => { throw Error('Denied request resumed'); } });
    assert.equal(aborted, true, url);
    assert.equal(policy.allowed(url, 'document'), false);
  }
  assert.equal(upstreamReads, 0);
  assert.equal(policy.allowed(pathToFileURL(options.chapter).href, 'document'), true);
  assert.equal(policy.allowed('data:image/png;base64,iVBORw0KGgo=', 'image'), true);
  assert.equal(policy.allowed('data:image/png;base64,iVBORw0KGgo=', 'document'), false);
});

test('realpath containment rejects symlink escapes', t => {
  const options = fixture(t), fake = fakeBrowser(), policy = install(fake.puppeteer, options);
  const link = path.join(options.epubRoot, 'escaped');
  try { fs.symlinkSync(path.dirname(options.outside), link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform === 'win32' && process.env.ALLOFLOW_REQUIRE_SYMLINK_TESTS !== '1'
        && ['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip('Host does not permit test symlinks');
    throw error;
  }
  assert.equal(policy.allowed(pathToFileURL(path.join(link, path.basename(options.outside))).href, 'document'), false);
});

test('local document responses enforce CSP before upstream code can read files', async t => {
  const options = fixture(t), fake = fakeBrowser(); install(fake.puppeteer, options);
  const page = await (await fake.puppeteer.launch()).newPage(); let response, handled = false, upstreamReads = 0;
  page.on('request', () => { upstreamReads++; });
  page.emit('request', { url: () => pathToFileURL(options.chapter).href, resourceType: () => 'document',
    isInterceptResolutionHandled: () => handled, respond: async value => { handled = true; response = value; },
    abort: async () => { throw Error('Allowed chapter was blocked'); } });
  assert.equal(upstreamReads, 0); assert.equal(response.body, '<h1>Safe chapter</h1>');
  for (const directive of ["script-src 'none'", "connect-src 'none'", "frame-src 'none'", "worker-src 'none'", "object-src 'none'"])
    assert.ok(response.headers['Content-Security-Policy'].includes(directive));
});

test('trusted Ace script injection remains available without bypassing document CSP', async t => {
  const options = fixture(t), fake = fakeBrowser(); install(fake.puppeteer, options);
  const page = await (await fake.puppeteer.launch()).newPage();
  const script = path.join(options.trustedScriptRoot, 'axe.js'); fs.writeFileSync(script, 'window.trustedAce = true;');
  await page.addScriptTag({ path: script }); await page.addScriptTag({ content: 'window.trustedHelper = true;' });
  assert.deepEqual(page.evaluated, ['window.trustedAce = true;', 'window.trustedHelper = true;']);
  await assert.rejects(page.addScriptTag({ path: options.outside }), /escaped/);
  await assert.rejects(page.addScriptTag({ url: 'https://example.invalid/script.js' }), /Unsupported/);
  assert.ok(!page.settings.some(([name, value]) => name === 'setBypassCSP' && value));
});

test('sandbox launch failure is returned without an unsafe retry', async t => {
  const options = fixture(t); let launches = 0;
  const puppeteer = { launch: async () => { launches++; throw Error('Synthetic sandbox unavailable'); } };
  install(puppeteer, options);
  await assert.rejects(puppeteer.launch({ args: ['--no-sandbox'] }), /sandbox unavailable/);
  assert.equal(launches, 1);
});

test('real Chromium blocks EPUB scripts/network/file escapes while trusted Ace timers work',
  { skip: process.env.ALLOFLOW_TEST_ACE_BROWSER !== '1', timeout: 90000 }, async t => {
    const options = fixture(t);
    const runtime = fs.realpathSync(path.resolve(process.env.SECURITY_MCP_RUNTIME || path.join(__dirname, '../desktop/mcp/runtime')));
    const runtimeRequire = createRequire(path.join(runtime, 'package.json'));
    const insideRuntime = file => {
      const relative = path.relative(runtime, fs.realpathSync(file));
      assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
      return file;
    };
    const runnerRequire = createRequire(insideRuntime(runtimeRequire.resolve('@daisy/ace-axe-runner-puppeteer')));
    const puppeteer = { ...runnerRequire(insideRuntime(runnerRequire.resolve('puppeteer'))) };
    install(puppeteer, options);
    let httpRequests = 0, webSockets = 0;
    const server = http.createServer((request, response) => { httpRequests++; response.end('Unexpected network access'); });
    server.on('upgrade', (request, socket) => { webSockets++; socket.destroy(); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = 'http://127.0.0.1:' + server.address().port;
    const browser = await puppeteer.launch({ executablePath: runtimeRequire(insideRuntime(runtimeRequire.resolve('playwright'))).chromium.executablePath(), timeout: 60000 });
    try {
      assert.ok(!browser.process().spawnargs.some(arg => /^--(?:no-sandbox|disable-.*sandbox)(?:=|$)/.test(arg)));
      fs.writeFileSync(options.chapter, '<!doctype html><title>Policy fixture</title><script>window.epubRan=true;window.open("' + address + '/popup")</script>'
        + '<img src="' + address + '/image" onerror="window.eventRan=true"><iframe src="' + pathToFileURL(options.outside).href + '"></iframe>'
        + '<img id="passive" alt="Test pixel" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">');
      const page = await browser.newPage(); page.on('request', request => request.continue());
      await page.goto(pathToFileURL(options.chapter).href);
      assert.deepEqual(await page.evaluate(() => [!!window.epubRan, !!window.eventRan]), [false, false]);
      await page.addScriptTag({ content: 'window.trustedAce = true;' });
      assert.equal(await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve(window.trustedAce), 20))), true);
      assert.equal(await page.$eval('#passive', image => image.naturalWidth), 1);
      const network = await page.evaluate(async address => {
        let fetched = false; try { await fetch(address + '/fetch'); fetched = true; } catch (_) {}
        const socket = await new Promise(resolve => {
          const client = new WebSocket(address.replace('http:', 'ws:') + '/socket');
          client.onopen = () => { client.close(); resolve('opened'); };
          client.onerror = () => resolve('blocked');
          setTimeout(() => { client.close(); resolve('timed-out'); }, 750);
        });
        return { fetched, socket };
      }, address);
      assert.equal(network.fetched, false); assert.notEqual(network.socket, 'opened');
      assert.equal(httpRequests, 0); assert.equal(webSockets, 0);
      assert.equal((await browser.pages()).length, 2); // initial blank + the one explicit page
      for (const frame of page.frames()) {
        const text = await frame.evaluate(() => document.body?.textContent || '').catch(() => '');
        assert.ok(!text.includes('OUTSIDE_SYNTHETIC_CONTENT'));
      }
    } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
  });
