import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';

const output = new URL(process.env.SCHOOL_STORE_REVIEW_OUTPUT || '../reports/school-store-review-2026-09-07/', import.meta.url);
await mkdir(output, { recursive: true });
const { server, url } = await createDemoServer();
const browser = await chromium.launch({ headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async dialog => { await dialog.accept(dialog.type() === 'prompt' ? 'Fictional demo: exact hash and 20 mm dimensions checked; slicer review simulated.' : undefined); });
  async function role(name) {
    await page.goto(url + '/?role=' + name);
    await page.waitForFunction(expected => document.querySelector('#actor-pill').textContent === expected, name.toUpperCase());
    await settled();
  }
  async function settled() { await page.waitForFunction(() => !document.querySelector('#notice').classList.contains('busy')); }
  async function click(selector) { await page.locator(selector).click(); await settled(); }
  async function state(name = 'getSchoolRewardsBootstrap') {
    return page.evaluate(async name => {
      const res = await fetch('/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: demoRole, name }) });
      const out = await res.json(); if (!out.ok) throw Error(out.error); return out.result;
    }, name);
  }
  const sample = Buffer.from(await (await fetch(url + '/sample.stl')).arrayBuffer());
  const handoff = Buffer.from(await (await fetch(url + '/sample-handoff.json')).arrayBuffer());
  const outside = await fetch(url + '/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://outside.example' }, body: '{}' });
  assert.equal(outside.status, 403);

  await role('staff'); await click('#tab-award');
  await page.getByRole('radio', { name: /Avery/ }).click();
  await page.locator('#award-amount').fill('20');
  await page.locator('#award-reason').fill('Included a classmate in the design project.');
  await click('#award-submit');
  assert.equal((await state()).students[0].balance, 80);

  await role('student'); await click('#tab-print');
  await page.locator('#print-package-file').setInputFiles({ name: 'admin-demo-token.alloflow-print.json', mimeType: 'application/json', buffer: handoff });
  await page.locator('#print-asset-label').waitFor({ state: 'visible' });
  await page.locator('#print-asset-file').setInputFiles({ name: 'admin-demo-token.stl', mimeType: 'model/stl', buffer: sample });
  await page.waitForFunction(() => document.querySelector('#print-asset-summary').textContent.includes('SHA-256 matched'));
  await page.locator('#print-material').fill('PLA');
  await click('#print-submit');
  assert.equal((await state('getSchoolRewardsPrintBootstrap')).requests[0].status, 'SUBMITTED');

  await role('staff'); await click('#tab-print');
  const downloadPromise = page.waitForEvent('download');
  await click('[data-asset-download]');
  const download = await downloadPromise;
  const parts = []; for await (const chunk of await download.createReadStream()) parts.push(chunk);
  assert.deepEqual(Buffer.concat(parts), sample);
  await click('[data-asset-action="VERIFY"]');
  await page.locator('[name="quotePoints"]').fill('15');
  await page.locator('[name="approvedMaterialId"]').fill('PLA');
  await page.locator('[name="printerProfileId"]').fill('DEMO-SIMULATED');
  await page.locator('[name="estimatedGrams"]').fill('2');
  await page.locator('[name="estimatedMinutes"]').fill('20');
  await click('[data-print-review-action="QUOTE"]');

  await role('student'); await click('#tab-print'); await click('[data-print-confirm]');
  const reserved = (await state('getSchoolRewardsPrintBootstrap')).balance;
  assert.deepEqual([reserved.balance, reserved.reservedPoints, reserved.availableBalance], [80, 15, 65]);
  await page.screenshot({ path: new URL('student-reservation.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });

  await role('cashier'); await click('#tab-store');
  await page.locator('#checkout-student').selectOption({ label: await page.locator('#checkout-student option').nth(1).textContent() });
  await click('#store-catalog [data-add]'); await click('#checkout-submit');
  let main = await state();
  assert.deepEqual([main.students[0].balance, main.students[0].reservedPoints, main.students[0].availableBalance], [70, 15, 55]);
  assert.equal(main.catalog[0].remaining, 4);

  await role('staff'); await click('#tab-print');
  for (const action of ['QUEUE', 'START_PRINT', 'MARK_READY']) await click('[data-print-advance="' + action + '"]');
  await page.screenshot({ path: new URL('staff-ready.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  await click('[data-print-fulfill]');
  await role('student'); main = await state();
  assert.deepEqual([main.students[0].balance, main.students[0].reservedPoints], [55, 0]);

  await role('admin'); await click('#tab-print'); await click('[data-print-refund]');
  main = await state(); assert.equal(main.students[0].balance, 70);
  await click('#tab-admin');
  await page.locator('#panel-admin article.card').filter({ has: page.locator('#run-integrity') }).locator('.section-toggle').click();
  await click('#run-integrity');
  assert.match(await page.locator('#integrity-summary').textContent(), /Ready/);
  await page.screenshot({ path: new URL('admin-integrity.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await role('student'); await click('#tab-print');
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(width.page <= width.viewport, JSON.stringify(width));
  await page.screenshot({ path: new URL('student-mobile.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  assert.deepEqual(errors, []);
  const result = { ok: true, awardBalance: 80, reservedPoints: 15, storeBalance: 70, storeAvailable: 55, stock: 4, fulfilledBalance: 55, refundedBalance: 70, exactAssetDownload: true, crossOriginRejected: true, mobile: width, pageErrors: errors };
  await writeFile(new URL('full-demo-results.json', output), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (page) {
    console.error('Demo page state:', await page.locator('#notice').textContent());
    await page.screenshot({ path: new URL('failure.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  }
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
