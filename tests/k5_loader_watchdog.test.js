// The slow-load notice in the app shell never deletes saved work on its own
// (fleet wave 2, lane K5).
//
// WHY: after 20 s on the first screen, desktop/web-app/public/index.html offered one
// button, "Clear All Data & Reload", which cleared localStorage and deleted every
// IndexedDB database (student work saved on the device) with no confirmation. A slow
// school network is the usual reason for a slow first load, and wiping the device is
// never the right first remedy. The King PD runs came within 14.8 s of showing it,
// and a late interval tick could inject it into the hidden loader.
//
// These tests load the REAL shell HTML (the React bundle is absent, so the load stalls)
// in Chromium with a fake clock, seed localStorage and IndexedDB, and check what each
// button does to them. ALLO_INDEX_CANDIDATE points at a scratch copy for mutation runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const HTML = readFileSync(process.env.ALLO_INDEX_CANDIDATE || resolve(process.cwd(), 'desktop/web-app/public/index.html'), 'utf8')
  .replace(/%PUBLIC_URL%/g, '');
const ORIGIN = 'https://k5-shell.test';

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function open() {
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await context.route(`${ORIGIN}/**`, route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/app/' ) return route.fulfill({ status: 200, contentType: 'text/html', body: HTML });
    if (url.pathname === '/seed') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>seed</title>' });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: '' });
  });
  await page.goto(ORIGIN + '/seed');
  await page.evaluate(() => new Promise((ok, fail) => {
    localStorage.setItem('alloflow_k5_probe', 'keep me');
    const req = indexedDB.open('k5-student-work', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('work');
    req.onerror = () => fail(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction('work', 'readwrite');
      tx.objectStore('work').put({ essay: 'My saved essay' }, 'student-1');
      tx.oncomplete = () => { req.result.close(); ok(); };
    };
  }));
  await page.clock.install();
  await page.goto(ORIGIN + '/app/');
  const saved = () => page.evaluate(() => new Promise(ok => {
    const local = localStorage.getItem('alloflow_k5_probe');
    indexedDB.databases().then(list => {
      if (!list.some(d => d.name === 'k5-student-work')) return ok({ local, idb: null });
      const req = indexedDB.open('k5-student-work');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('work')) { db.close(); return ok({ local, idb: null }); }
        const get = db.transaction('work').objectStore('work').get('student-1');
        get.onsuccess = () => { db.close(); ok({ local, idb: get.result ? get.result.essay : null }); };
      };
    });
  }));
  const stall = async () => { await page.clock.fastForward(21000); await page.waitForSelector('#loader-reload', { timeout: 5000 }); };
  return { context, page, saved, stall, errors };
}

const KEPT = { local: 'keep me', idb: 'My saved essay' };

describe('slow-load notice in the app shell', () => {
  it('offers Reload first, and Reload keeps localStorage and IndexedDB', async () => {
    const t = await open();
    expect(await t.page.locator('#loader-reload').count()).toBe(0);
    await t.stall();
    const buttons = await t.page.locator('#loader-help button:visible').allTextContents();
    expect(buttons).toEqual(['Reload', 'Troubleshoot']);
    expect(await t.page.locator('#loader-status').textContent()).toContain('Everything saved on this device is still here');
    expect(await t.saved()).toEqual(KEPT);
    await Promise.all([t.page.waitForNavigation(), t.page.click('#loader-reload')]);
    expect(await t.saved()).toEqual(KEPT);
    expect(t.errors).toEqual([]);
    await t.context.close();
  }, 60000);

  it('keeps saved work through Troubleshoot, the first clear click and Cancel; only the second confirmation deletes it', async () => {
    const t = await open();
    await t.stall();
    await t.page.click('#loader-troubleshoot-toggle');
    expect(await t.page.getAttribute('#loader-troubleshoot-toggle', 'aria-expanded')).toBe('true');
    expect(await t.page.isVisible('#loader-troubleshoot')).toBe(true);
    expect(await t.saved()).toEqual(KEPT);
    await t.page.click('#loader-clear');
    expect(await t.page.isVisible('#loader-clear-confirm')).toBe(true);
    expect(await t.page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('loader-clear-warning');
    await t.page.clock.fastForward(5000);
    expect(await t.saved()).toEqual(KEPT);
    await t.page.click('#loader-clear-cancel');
    expect(await t.page.isVisible('#loader-clear-confirm')).toBe(false);
    expect(await t.saved()).toEqual(KEPT);
    await t.page.click('#loader-clear');
    await Promise.all([t.page.waitForNavigation(), t.page.click('#loader-clear-confirmed')]);
    expect(await t.saved()).toEqual({ local: null, idb: null });
    await t.context.close();
  }, 60000);

  it('downloads a copy of saved work before anything is cleared', async () => {
    const t = await open();
    await t.stall();
    await t.page.click('#loader-troubleshoot-toggle');
    const [download] = await Promise.all([t.page.waitForEvent('download'), t.page.click('#loader-backup')]);
    expect(download.suggestedFilename()).toMatch(/^alloflow-saved-data-\d{4}-\d{2}-\d{2}\.json$/);
    const body = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(body.localStorage.alloflow_k5_probe).toBe('keep me');
    const db = body.indexedDB.find(d => d.name === 'k5-student-work');
    expect(db.stores.work.values[0].essay).toBe('My saved essay');
    expect(db.stores.work.keys[0]).toBe('student-1');
    expect(await t.saved()).toEqual(KEPT);
    await t.context.close();
  }, 60000);

  it('never shows the notice once the app has rendered, even on a late timer tick', async () => {
    const t = await open();
    await t.page.clock.fastForward(19000);
    await t.page.evaluate(() => { document.getElementById('root').appendChild(document.createElement('div')); });
    await t.page.clock.fastForward(3000);
    expect(await t.page.isVisible('#alloflow-loader')).toBe(false);
    expect(await t.page.locator('#loader-help button').count()).toBe(0);
    expect(await t.page.locator('#alloflow-loader button').count()).toBe(0);
    await t.context.close();
  }, 60000);
});
