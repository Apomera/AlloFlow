#!/usr/bin/env node
'use strict';

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

function reserveFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const desktopRoot = path.resolve(__dirname, '..');
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-electron-smoke-'));
  const port = await reserveFreePort();
  let electronApp;
  try {
    electronApp = await electron.launch({
      args: [
        path.join(desktopRoot, 'electron', 'main.cjs'),
        '--user-data-dir=' + path.join(tempHome, 'user-data'),
      ],
      cwd: desktopRoot,
      env: {
        ...process.env,
        ALLOFLOW_DESKTOP_HOME: path.join(tempHome, 'runtime'),
        ALLOFLOW_DESKTOP_PORT: String(port),
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      },
      timeout: 45000,
    });

    const page = await electronApp.firstWindow({ timeout: 45000 });
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    try {
      await page.waitForFunction(() => document.querySelector('#app-frame')?.dataset.bridgeReady === 'true', null, { timeout: 45000 });
    } catch (error) {
      const frameState = await page.evaluate(() => {
        const frame = document.querySelector('#app-frame');
        return {
          src: frame && frame.src,
          bridgeReady: frame && frame.dataset.bridgeReady,
        };
      }).catch(() => ({}));
      const frameUrls = page.frames().map((frame) => frame.url());
      throw new Error('Isolated app bridge did not become ready. Frame state: '
        + JSON.stringify(frameState)
        + '; frames: ' + JSON.stringify(frameUrls)
        + '; console errors: ' + consoleErrors.join(' | ')
        + '; wait error: ' + error.message);
    }
    await page.waitForFunction(() => {
      const status = document.querySelector('#voice-status')?.textContent?.trim().toLowerCase();
      return status && !['unchecked', 'bridge error', 'bundled app needed'].includes(status);
    }, null, { timeout: 15000 });
    const bridgedVoiceStatus = (await page.locator('#voice-status').textContent() || '').trim().toLowerCase();
    assert(bridgedVoiceStatus !== 'bridge error' && bridgedVoiceStatus !== 'bundled app needed',
      'The command center could not read capability status through the isolated app bridge.');

    const appFrame = page.frames().find((frame) => {
      try { return new URL(frame.url()).pathname.startsWith('/app/'); } catch (_) { return false; }
    });
    assert(appFrame, 'The isolated AlloFlow app frame did not load.');
    const commandOrigin = new URL(page.url()).origin;
    const appOrigin = new URL(appFrame.url()).origin;
    assert(commandOrigin !== appOrigin, 'The AlloFlow app still shares the privileged command-center origin.');

    const isolation = await appFrame.evaluate(async () => {
      let parentDomBlocked = false;
      try {
        void window.parent.document.body;
      } catch (error) {
        parentDomBlocked = error && error.name === 'SecurityError';
      }
      const safeStatus = await fetch('/api/engine/status').then((response) => response.status);
      const privilegedStatus = await fetch('/api/config').then((response) => response.status);
      const forgedTokenStatus = await fetch('/api/config', {
        headers: { 'X-Allo-Desktop-Token': 'forged-by-isolated-frame' },
      }).then((response) => response.status);
      let liveConfig = null;
      try { liveConfig = JSON.parse(localStorage.getItem('alloflow_live_session_config') || 'null'); } catch (_) {}
      return {
        parentDomBlocked,
        safeStatus,
        privilegedStatus,
        forgedTokenStatus,
        liveConfigSource: liveConfig && liveConfig.source,
      };
    });
    assert(isolation.parentDomBlocked, 'The isolated app frame could still read the command-center DOM.');
    assert(isolation.safeStatus === 200, 'The isolated app frame could not reach its safe API allowlist.');
    assert(isolation.privilegedStatus === 401, 'The isolated app frame reached a privileged API without a token.');
    assert(isolation.forgedTokenStatus === 401, 'The isolated app frame bypassed the token gate with a forged header.');
    assert(isolation.liveConfigSource === 'alloflow-desktop', 'The isolated app bridge did not synchronize classroom configuration.');

    await page.locator('.tab').first().waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#runtime-pill')?.textContent.includes('ready'), null, { timeout: 45000 });
    const setupLater = page.locator('#setup-later');
    if (await setupLater.isVisible()) {
      await setupLater.click();
    }

    const tabs = page.locator('.tab');
    assert(await tabs.count() >= 4, 'Command center did not render its navigation tabs.');
    await tabs.nth(1).click();
    assert(await tabs.nth(1).getAttribute('aria-selected') === 'true', 'Clicking a command-center tab did not select it.');
    assert(await page.locator('#pane-ai').isVisible(), 'The AI pane did not become visible after its tab was clicked.');

    await tabs.nth(1).focus();
    await page.keyboard.press('ArrowRight');
    assert(await tabs.nth(2).getAttribute('aria-selected') === 'true', 'Arrow-key tab navigation regressed.');

    await page.setViewportSize({ width: 1024, height: 760 });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    assert(layout.documentWidth <= layout.viewportWidth + 1, 'Command center overflows horizontally at its supported compact width.');
    assert(pageErrors.length === 0, 'Command center raised a page error: ' + pageErrors.join(' | '));

    console.log('[AlloFlow Desktop] Electron UI smoke passed (distinct app origin, narrow bridge, privileged API denial, tabs, keyboard, compact layout, no page errors)');
  } finally {
    if (electronApp) await electronApp.close().catch(() => {});
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('[AlloFlow Desktop] Electron UI smoke failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
