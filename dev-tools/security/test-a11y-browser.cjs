'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const audit = path.resolve(__dirname, '../../a11y-audit');
const requireAudit = createRequire(path.join(audit, 'package.json'));
const puppeteer = requireAudit('puppeteer');
const { AxePuppeteer } = requireAudit('@axe-core/puppeteer');
const { handleRequest, launchOptions } = require(path.join(audit, 'browser-policy.cjs'));
const checks = require(path.join(audit, 'runtime-audit.js'));
const scratch = path.join(audit, 'node_modules/.cache/security-tests');
fs.mkdirSync(scratch, { recursive: true });
const fixture = () => fs.mkdtempSync(path.join(scratch, 'browser-'));

const pageMarkup = (scripts = '') => `<!doctype html><html lang="en"><title>Audit fixture</title>
<style>body{font:18px sans-serif;color:#000;background:#fff}button,[role=button]{display:block;min-width:48px;min-height:48px;margin:10px;outline:3px solid blue}</style>
<main id="main"><h1>Accessibility fixture</h1><button id="named">Named button</button><button id="unnamed"></button>
<div id="working" role="button" tabindex="0">Working control</div><div id="inert" role="button" tabindex="0">Inert control</div>
<p role="status" id="status">Ready</p></main><script>
document.querySelector('#working').addEventListener('keydown', event => {
  if(event.key==='Enter'||event.key===' ') document.querySelector('#status').textContent='Changed';
});</script>${scripts}</html>`;

async function serve(t, handler) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return 'http://127.0.0.1:' + server.address().port;
}

test('real browser retains local modules and accessibility checks while blocking hostile requests', { timeout: 60000 }, async (t) => {
  const repoRoot = fixture();
  fs.writeFileSync(path.join(repoRoot, 'fixture.js'), 'globalThis.localAuditFixture = true;');
  fs.writeFileSync(path.join(repoRoot, 'private.json'), '{"synthetic":"private fixture"}');
  let trapRequests = 0;
  const trap = await serve(t, (_req, res) => { trapRequests++; res.end('unexpected'); });
  const hostile = [
    'https://alloflow-cdn.pages.dev.evil.invalid/fixture.js',
    'https://evil.invalid/alloflow-cdn.pages.dev/fixture.js',
    'https://alloflow-cdn.pages.dev/private.json',
    trap + '/track',
  ];
  const origin = await serve(t, (req, res) => {
    if (req.url === '/same-origin.js') { res.setHeader('Content-Type', 'text/javascript'); res.end('globalThis.sameOriginFixture = true;'); }
    else {
      res.setHeader('Content-Type', 'text/html');
      res.end(pageMarkup('<script src="/same-origin.js"></script><script src="https://alloflow-cdn.pages.dev/fixture.js"></script>' +
        hostile.map(url => '<script src="' + url + '"></script>').join('')));
    }
  });
  const browser = await puppeteer.launch(launchOptions());
  t.diagnostic('Fresh browser launched');
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const failed = new Set();
  page.on('requestfailed', req => failed.add(req.url()));
  await page.setRequestInterception(true);
  page.on('request', req => { void handleRequest(req, { targetOrigin: origin, repoRoot }); });
  await page.goto(origin, { waitUntil: 'networkidle0' });
  t.diagnostic('Fixture navigation and request blocking completed');
  assert.deepEqual(await page.evaluate(() => [globalThis.sameOriginFixture, globalThis.localAuditFixture]), [true, true]);
  for (const url of hostile) assert.ok(failed.has(url), 'Not blocked: ' + url);
  assert.equal(trapRequests, 0);
  const result = await new AxePuppeteer(page).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  t.diagnostic('axe analysis completed');
  const buttons = result.violations.find(entry => entry.id === 'button-name');
  assert.ok(buttons.nodes.some(entry => entry.target.includes('#unnamed')));
  assert.ok(!buttons.nodes.some(entry => entry.target.includes('#named')));
  const custom = await checks.runCustomChecks(page);
  assert.ok(!custom.some(entry => ['custom-lang', 'custom-main-landmark', 'custom-aria-live'].includes(entry.id)));
  const navigation = await checks.testKeyboardNavigation(page);
  assert.match(navigation.find(entry => entry.id === 'keyboard-info').description, /4 focusable/);
  const activation = await checks.testKeyboardActivation(page);
  t.diagnostic('Custom and keyboard checks completed');
  assert.match(activation.find(entry => entry.id === 'keyboard-activation-info').description, /1\/2 custom controls responded/);
  assert.match(activation.find(entry => entry.id === 'keyboard-activation-review').description, /Inert control/);
});

function runAudit(url, report) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(audit, 'runtime-audit.js'), url, '--json'], {
      cwd: audit, windowsHide: true, env: { ...process.env, ALLOFLOW_AUDIT_REPORT: report },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Audit CLI timed out: ' + output)); }, 45000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, output }); });
  });
}

test('shipped audit CLI writes its existing report format and exits cleanly on navigation failure', { timeout: 90000 }, async (t) => {
  const origin = await serve(t, (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(pageMarkup()); });
  const report = path.join(fixture(), 'runtime-report.json');
  const result = await runAudit(origin, report);
  assert.equal(result.code, 0, result.output);
  const data = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(data.url, origin);
  assert.equal(data.axe.violations, data.axe.details.length);
  assert.ok(data.axe.passes > 0);
  assert.ok(data.axe.details.some(entry => entry.id === 'button-name'));
  assert.ok(Array.isArray(data.custom));
  assert.ok(data.keyboard.some(entry => entry.id === 'keyboard-activation-review'));
  const unused = http.createServer();
  unused.listen(0, '127.0.0.1'); await once(unused, 'listening');
  const refused = 'http://127.0.0.1:' + unused.address().port;
  await new Promise(resolve => unused.close(resolve));
  const failure = await runAudit(refused, path.join(fixture(), 'failed-report.json'));
  assert.equal(failure.code, 1, failure.output);
  assert.match(failure.output, /Could not connect/);
});
