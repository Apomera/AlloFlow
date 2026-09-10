// Browser regression checks of SHIPPED product files. Google services and records are fictional.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('../reports/classroom-store-product-2026-09-08/', import.meta.url);
await mkdir(output, { recursive: true });
const allowedFiles = new Set(['classroom-import.html', 'classroom_import_config.js', 'classroom_import_service.js', 'classroom_import_app.js', 'school-rewards-practice.html']);
const server = http.createServer((req, res) => {
  const file = new URL(req.url, 'http://127.0.0.1').pathname.slice(1);
  if (!allowedFiles.has(file)) { res.writeHead(file === 'favicon.ico' ? 204 : 404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'application/javascript', 'Cache-Control': 'no-store' });
  res.end(readFileSync(new URL(file, root)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const store = await createDemoServer({ port: 0 });
const browser = await chromium.launch({ headless: true });
const report = { surfaces: [], errors: [] };
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
    const errors = [], external = [], googleCalls = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await page.goto(base + '/classroom-import.html');
    await page.waitForFunction(() => document.querySelector('#import-status').textContent.includes('Not configured'));
    assert.equal(await page.locator('#connect-classroom').isDisabled(), true);
    assert.deepEqual(external, [], 'Unconfigured product must make no Google requests');
    await page.screenshot({ path: new URL('classroom-unconfigured-' + width + '.png', output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    await page.route('**/classroom_import_config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.ALLOFLOW_CLASSROOM_IMPORT_CONFIG=' + JSON.stringify({
      enabled: true, reviewedDeployment: true, clientId: '123-fixture.apps.googleusercontent.com',
      allowedOrigins: [base], allowedAccountIds: ['900000001']
    }) }));
    await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: [
      'window.google={accounts:{oauth2:{',
      'hasGrantedAllScopes:()=>true,',
      'initTokenClient:options=>({requestAccessToken:()=>options.callback({access_token:"fictional-token-only",expires_in:3600})}),',
      'revoke:(token,callback)=>callback({successful:true})',
      '}}};'
    ].join('') }));
    await page.route('https://classroom.googleapis.com/**', route => {
      const url = new URL(route.request().url()), request = route.request();
      googleCalls.push(url.pathname);
      assert.equal(request.headers().authorization, 'Bearer fictional-token-only');
      let body;
      if (url.pathname.endsWith('/userProfiles/me')) body = { id: '900000001' };
      else if (url.pathname.endsWith('/courses')) body = { courses: [{ id: '800000001', name: 'Fictional Makers', section: 'Advisory A', courseState: 'ACTIVE' }] };
      else if (url.pathname.endsWith('/teachers')) body = { teachers: [{ courseId: '800000001', userId: '900000001' }] };
      else if (url.pathname.endsWith('/students')) body = { students: [
        { courseId: '800000001', userId: '700000001', profile: { id: '700000001', name: { fullName: 'Fictional Avery' } } },
        { courseId: '800000001', userId: '700000002', profile: { id: '700000002', name: { fullName: 'Fictional Jordan' } } }
      ] };
      else throw Error('Unexpected Google route');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#connect-classroom').disabled);
    await page.locator('#connect-classroom').click();
    await page.waitForFunction(() => document.querySelector('#classroom-course').options.length === 2);
    await page.locator('#classroom-course').selectOption('800000001');
    await page.locator('#read-classroom').click();
    await page.waitForFunction(() => !document.querySelector('#preview-section').hidden);
    assert.equal(await page.locator('#roster-preview tr').count(), 2);
    assert.equal(await page.locator('#download-classroom').isDisabled(), true);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    await page.screenshot({ path: new URL('classroom-review-' + width + '.png', output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    await page.locator('#confirm-new-class').check();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-classroom').click();
    const download = await downloadPromise;
    const exported = readFileSync(await download.path(), 'utf8');
    for (const privateValue of ['Fictional Avery', 'Fictional Jordan', '700000001', '700000002', '900000001', '800000001', 'fictional-token-only']) assert.ok(!exported.includes(privateValue), 'Private value in export');
    assert.equal(JSON.parse(exported).exportVersion, 4);
    await page.locator('#clear-classroom').click();
    assert.equal(await page.locator('#roster-preview tr').count(), 0);
    assert.equal(await page.locator('#course-section').isHidden(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    report.surfaces.push({ surface: 'shipped-classroom-helper', width, result: 'passed', googleRequestsMocked: googleCalls.length });
    await page.close();
  }
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], awards = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url() === store.url + '/rpc') {
        const input = request.postDataJSON();
        if (input && input.name === 'awardSchoolRewardsPoints') awards.push(input.argument);
      }
    });
    let accept = false;
    page.on('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
    await page.goto(store.url + '/?role=staff');
    await page.waitForFunction(() => document.querySelector('#actor-pill').textContent === 'STAFF');
    await page.locator('#tab-award').click();
    await page.locator('[data-quick-points="5"]').click();
    assert.equal(await page.locator('#award-amount').inputValue(), '5');
    assert.equal(awards.length, 0);
    await page.getByRole('radio', { name: /Avery/ }).click();
    await page.locator('#award-reason').fill('Fictional design revision after testing');
    await page.locator('#award-submit').click();
    assert.equal(awards.length, 0, 'Cancelled review cannot award');
    accept = true;
    await page.locator('#award-submit').click();
    await page.waitForFunction(() => !document.querySelector('#reuse-award').disabled && !document.querySelector('#award-submit').disabled);
    assert.equal(awards.length, 1);
    assert.equal(await page.locator('#award-student').inputValue(), '');
    await page.locator('#reuse-award').click();
    assert.equal(await page.locator('#award-reason').inputValue(), 'Fictional design revision after testing');
    assert.equal(awards.length, 1, 'Reuse shortcut cannot award automatically');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: new URL('store-quick-recognition-' + width + '.png', output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
    assert.deepEqual(errors, []);
    report.surfaces.push({ surface: 'actual-apps-script-portal', width, result: 'passed' });
    await page.close();
  }
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(base + '/school-rewards-practice.html');
    await page.waitForFunction(() => document.querySelector('#actor-pill').textContent === 'STAFF');
    await page.locator('#tab-award').click();
    await page.locator('[data-tile-student]').first().click();
    await page.locator('[data-quick-points="3"]').click();
    await page.locator('#award-reason').fill('Fictional practice recognition');
    await page.locator('#award-submit').click();
    await page.waitForFunction(() => !document.querySelector('#reuse-award').disabled && !document.querySelector('#award-submit').disabled);
    assert.equal(await page.locator('#retry-award').isHidden(), true);
    assert.equal(await page.locator('#award-student').inputValue(), '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    report.surfaces.push({ surface: 'shipped-practice-page', width, result: 'passed' });
    await page.close();
  }
  await writeFile(new URL('browser-checks.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => store.server.close(resolve))]);
}
