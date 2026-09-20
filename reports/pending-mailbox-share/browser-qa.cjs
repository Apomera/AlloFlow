'use strict';
// Local generated-view QA. Connection/upload lifecycle belongs to separate host tests.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const moduleFile = 'view_share_session_surfaces_module.js';
const cssDir = path.join(root, 'desktop/web-app/build/static/css');
const cssName = fs.readdirSync(cssDir).filter(name => /^main\..*\.css$/.test(name)).sort().at(-1);
assert(cssName, 'Built desktop CSS must be available');
const assets = [moduleFile, 'desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'desktop/web-app/build/static/css/' + cssName];
const assetBodies = Object.fromEntries(assets.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const hashes = Object.fromEntries(assets.map(file => [file, sha(assetBodies[file])]));
const pageErrors = [], externalRequests = [], scenarios = [];
let browser;
async function main() {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local pending mailbox share check</title></head><body style="margin:0"><main id="root"></main></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch({ headless: true });
    async function setup(name, width, options = {}) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => pageErrors.push({ name, message: error.message }));
      await page.route('**/*', route => {
        if (route.request().url().startsWith(origin + '/')) return route.continue();
        externalRequests.push(route.request().url()); return route.abort();
      });
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: assetBodies[assets[3]] });
      for (const file of [assets[1], assets[2], moduleFile]) await page.addScriptTag({ content: assetBodies[file] });
      await page.evaluate(options => {
        const noop = () => {};
        const Icon = ({ size = 16 }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, React.createElement('path', { d: 'M6 4h12v16H6z', fill: 'none', stroke: 'currentColor' }));
        const originalPending = { title: 'Macbeth Act 1: original reading, carefully selected word supports, and a prepared companion for tomorrow', resourceCount: 2, aiPolicy: options.aiPolicy || 'off', sharedActivityTitle: options.configured ? 'Class reflection on language and imagery' : '', requiredMailboxVersion: options.configured ? 24 : 0 };
        window.__calls = { connect: [], cancel: 0, close: 0, legacyClose: 0 };
        window.__fixture = {};
        function Fixture() {
          const [pending, setPending] = React.useState(options.pending === false ? null : originalPending);
          const [open, setOpen] = React.useState(true);
          const [url, setUrl] = React.useState('https://script.google.com/macros/s/local-fixture/exec');
          const [admin, setAdmin] = React.useState('');
          const cancel = () => { __calls.cancel++; setPending(null); };
          const close = () => { __calls.close++; setPending(null); setOpen(false); };
          __fixture.snapshot = () => ({ pending, open, busy: !!options.busy });
          const props = {
            ClipboardList: Icon, Copy: Icon, ExternalLink: Icon, Eye: Icon, EyeOff: Icon, FolderDown: Icon, Maximize: Icon, Printer: Icon, Sparkles: Icon, X: Icon,
            addDirectionsToPack: noop, alloPersistMailboxConfig: noop, closeAllMailboxSessions: noop,
            connectMailbox: () => __calls.connect.push(pending ? { ...pending } : null),
            copyMailboxScriptSource: noop, copyToClipboard: noop, deriveDirectionsDraft: noop, directionsDeriving: false, exportMailboxConfig: noop, importMailboxConfig: noop,
            mailboxScriptState: { status: 'ready' }, mbAdminInput: admin, mbBusy: !!options.busy,
            mbConfig: options.configured ? { url: 'https://script.google.com/macros/s/local-fixture/exec', admin: 'fixture-only', v: 23, latencyMs: 0 } : null,
            mbDirectionsDraft: null, mbHwEvidence: {}, mbLive: null, mbMode: 'sync', mbNow: Date.now(), mbQrSvg: '', mbResumable: [], mbRoster: {}, mbShowAdmin: false, mbStatus: '', mbUrlInput: url,
            openStudentQrPreview: noop, printQrSheet: noop, requestEndLiveSession: noop, resumeMailboxLiveSession: noop, retryMailboxScriptSource: noop, rotateMailboxAdmin: noop, sendPackHome: noop,
            setMbAdminInput: setAdmin, setMbConfig: noop, setMbDirectionsDraft: noop, setMbMode: noop,
            setMbPanelOpen: () => { __calls.legacyClose++; }, setMbResumable: noop, setMbShowAdmin: noop, setMbStatus: noop, setMbUrlInput: setUrl,
            setShowDirectionsComposer: noop, setShowSessionModal: noop, shareFullPackToMailbox: noop, startMailboxLiveSession: noop, t: () => undefined,
            pendingMailboxShare: pending, cancelPendingMailboxShare: cancel, closeMailboxSetup: close
          };
          return open ? React.createElement('div', { 'data-mailbox-fixture-host': true, role: 'dialog', 'aria-modal': true, 'aria-label': 'Class Mailbox live session',
            style: { position: 'fixed', inset: 0, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' } },
            React.createElement(window.AlloModules.ClassMailboxSetupView, props)) : React.createElement('p', { role: 'status' }, 'Local setup fixture closed');
        }
        window.__root = ReactDOM.createRoot(document.getElementById('root'));
        __root.render(React.createElement(Fixture));
      }, options);
      await page.getByRole('heading', { name: /Live class without accounts/ }).waitFor();
      return page;
    }
    const card = page => page.locator('[data-pending-mailbox-share]');
    const action = page => page.getByRole('button', { name: /^(?:Reconnect|Connect) and share$/ });
    async function keyboardActivate(page, button) {
      await button.focus();
      assert.equal(await button.evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Enter');
    }
    async function layout(page) {
      return page.evaluate(() => {
        const panel = document.querySelector('[data-mailbox-fixture-host] > div');
        const box = panel.getBoundingClientRect();
        return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, panelScrollWidth: panel.scrollWidth, panelClientWidth: panel.clientWidth, left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: innerHeight };
      });
    }
    function assertLayout(value) {
      assert(value.documentWidth <= value.width + 1 && value.panelScrollWidth <= value.panelClientWidth + 1, JSON.stringify(value));
      assert(value.left >= -1 && value.right <= value.width + 1 && value.top >= -1 && value.bottom <= value.height + 1, JSON.stringify(value));
    }
    for (const width of [1280, 320]) {
      const name = 'pending-' + width, page = await setup(name, width);
      await card(page).waitFor();
      const copy = await card(page).innerText();
      assert(copy.includes('Waiting to share'));
      assert(copy.includes('Macbeth Act 1: original reading'));
      assert(copy.includes('2') && copy.includes('Student AI off'));
      assert(copy.includes('Closing setup cancels the pending share.'));
      assert.equal(await page.getByRole('button', { name: 'Cancel pending share', exact: true }).isEnabled(), true);
      const dimensions = await layout(page); assertLayout(dimensions);
      await page.screenshot({ path: path.join(__dirname, name + '.png') });
      await action(page).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(__dirname, name + '-connect.png') });
      await keyboardActivate(page, action(page));
      assert.equal((await page.evaluate(() => __calls.connect)).length, 1);
      await keyboardActivate(page, page.getByRole('button', { name: 'Cancel pending share', exact: true }));
      await card(page).waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Connect & self-test');
      assert.equal(await page.getByRole('button', { name: 'Connect & self-test', exact: true }).count(), 1);
      const state = await page.evaluate(() => ({ ...__fixture.snapshot(), calls: __calls }));
      assert.equal(state.pending, null); assert.equal(state.open, true); assert.equal(state.calls.cancel, 1);
      assert.equal(state.calls.close, 0); assert.equal(state.calls.legacyClose, 0);
      scenarios.push({ name, passed: true, layout: dimensions, keyboardConnectAndCancel: true, focusReturnsToConnect: true, calls: state.calls });
      await page.close();
    }
    {
      const page = await setup('pending-keyboard-close', 320);
      await keyboardActivate(page, page.getByRole('button', { name: 'Close', exact: true }));
      await page.getByRole('status').filter({ hasText: 'Local setup fixture closed' }).waitFor();
      const state = await page.evaluate(() => ({ ...__fixture.snapshot(), calls: __calls }));
      assert.equal(state.pending, null); assert.equal(state.open, false); assert.equal(state.calls.close, 1);
      assert.equal(state.calls.legacyClose, 0); assert.deepEqual(state.calls.connect, []);
      scenarios.push({ name: 'pending-keyboard-close', passed: true, calls: state.calls }); await page.close();
    }
    {
      const page = await setup('connecting-cancel', 320, { busy: true });
      assert.equal(await page.getByRole('button', { name: 'Connecting…', exact: true }).isDisabled(), true);
      const cancel = page.getByRole('button', { name: 'Cancel pending share', exact: true });
      assert.equal(await cancel.isEnabled(), true);
      await keyboardActivate(page, cancel); await card(page).waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Close');
      const state = await page.evaluate(() => ({ ...__fixture.snapshot(), calls: __calls }));
      assert.equal(state.pending, null); assert.equal(state.open, true); assert.equal(state.calls.cancel, 1); assert.deepEqual(state.calls.connect, []);
      scenarios.push({ name: 'connecting-cancel', passed: true, focusReturnsToClose: true, calls: state.calls }); await page.close();
    }
    {
      const page = await setup('configured-pending-version-update', 320, { configured: true, aiPolicy: 'student-byok' });
      const copy = await card(page).innerText();
      assert(copy.includes('Personal AI optional')); assert(copy.includes('Class reflection on language and imagery'));
      const dimensions = await layout(page); assertLayout(dimensions);
      assert.equal(await action(page).count(), 1);
      await action(page).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(__dirname, 'configured-pending-320.png') });
      await keyboardActivate(page, action(page));
      const calls = await page.evaluate(() => __calls);
      assert.equal(calls.connect.length, 1); assert.equal(calls.connect[0].requiredMailboxVersion, 24); assert.equal(calls.connect[0].aiPolicy, 'student-byok');
      scenarios.push({ name: 'configured-pending-version-update', passed: true, layout: dimensions, calls }); await page.close();
    }
    {
      const page = await setup('no-pending', 320, { pending: false });
      assert.equal(await card(page).count(), 0); assert.equal(await page.getByRole('button', { name: 'Cancel pending share', exact: true }).count(), 0);
      await keyboardActivate(page, page.getByRole('button', { name: 'Connect & self-test', exact: true }));
      assert.deepEqual(await page.evaluate(() => __calls.connect), [null]);
      scenarios.push({ name: 'no-pending', passed: true, ordinaryConnectPreserved: true }); await page.close();
    }
    assert.deepEqual(pageErrors, []); assert.deepEqual(externalRequests, []);
    for (const file of assets) assert.equal(sha(fs.readFileSync(path.join(root, file), 'utf8')), hashes[file], 'Asset changed during run: ' + file);
    const result = { status: 'passed', checkedAt: new Date().toISOString(), browser: browser.version(), hashes, scenarios, pageErrors, externalRequests,
      scope: 'Actual generated ClassMailboxSetupView with local React/CSS; stateful callback adapters. No full shell, focus trap/Escape integration, live connection, authentication, upload, cancellation race, deployment, or native screen-reader validation.' };
    fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => {
  fs.writeFileSync(path.join(__dirname, 'browser-results.json'), JSON.stringify({ status: 'failed', checkedAt: new Date().toISOString(), scenarios, pageErrors, externalRequests, error: error.stack }, null, 2) + '\n');
  console.error(error); process.exitCode = 1;
});
