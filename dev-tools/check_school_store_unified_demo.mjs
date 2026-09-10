// Real Chromium + actual Portal/Code.gs, with fictional in-memory services only.
// Does not supply fake working speech recognition, grant permissions or use a mic.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';

const output = new URL('../reports/school-store-unified-demo-2026-09-09/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { ok: false, fictionalOnly: true, realMicrophoneUsed: false, surfaces: [], errors: [] };
const browser = await chromium.launch({ headless: true });

async function rpc(page, name, argument) {
  return page.evaluate(({ name, argument }) => new Promise((resolve, reject) => {
    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](argument);
  }), { name, argument });
}
async function settled(page) {
  await page.waitForFunction(() => !document.querySelector('#notice').classList.contains('busy'));
}
async function ready(page, role, step) {
  await page.waitForFunction(({ role, step }) => document.querySelector('#actor-pill').textContent === role.toUpperCase()
    && !document.querySelector('#demo-scene-' + step).hidden
    && document.querySelector('#demo-status').dataset.tone === 'ready', { role, step });
  await settled(page);
}

try {
  for (const width of [1280, 390]) {
    const store = await createDemoServer({ port: 0, unified: true });
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const result = { width, height: 900, passed: false, screenshots: [], pageErrors: [], externalRequests: [], unexpectedDialogs: [] };
    const calls = []; let dialogPlan = null, phase = 'startup';
    page.on('pageerror', error => result.pageErrors.push(error.message));
    page.on('request', request => { if (request.url() === store.url + '/rpc') calls.push(request.postDataJSON()); });
    page.on('dialog', async dialog => {
      const plan = dialogPlan; dialogPlan = null;
      if (!plan) { result.unexpectedDialogs.push(dialog.message()); await dialog.dismiss(); return; }
      const details = { type: dialog.type(), message: dialog.message() };
      await (plan.accept ? dialog.accept() : dialog.dismiss());
      plan.resolve(details);
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== store.url && !['data:', 'blob:', 'about:'].includes(url.protocol)) {
        result.externalRequests.push(url.origin + url.pathname);
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    await context.addInitScript(() => {
      window.__demoCaptureChecks = { speechConstructed: 0, availabilityChecked: 0, mediaRequested: 0 };
      // Only wrap already-present native speech APIs, failing closed if called.
      // No synthetic available()/successful recognizer or permission is provided.
      for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
        const Native = window[name];
        if (typeof Native !== 'function') continue;
        window[name] = new Proxy(Native, {
          construct() { window.__demoCaptureChecks.speechConstructed++; throw new Error('Browser QA forbids microphone capture'); },
          get(target, key, receiver) {
            if (key === 'available' && typeof Reflect.get(target, key, receiver) === 'function') {
              return function () { window.__demoCaptureChecks.availabilityChecked++; throw new Error('Browser QA forbids automatic speech checks'); };
            }
            return Reflect.get(target, key, receiver);
          },
        });
      }
      if (navigator.mediaDevices?.getUserMedia) navigator.mediaDevices.getUserMedia = function () {
        window.__demoCaptureChecks.mediaRequested++;
        return Promise.reject(new Error('Browser QA forbids microphone access'));
      };
    });
    async function checkSurface(label, screenshot = false) {
      const state = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, capture: window.__demoCaptureChecks }));
      assert.ok(state.width <= state.viewport, label + ' horizontal overflow: ' + JSON.stringify(state));
      assert.deepEqual(state.capture, { speechConstructed: 0, availabilityChecked: 0, mediaRequested: 0 }, label + ': nothing should listen or check speech automatically');
      assert.deepEqual(result.pageErrors, []);
      assert.deepEqual(result.externalRequests, []);
      assert.deepEqual(result.unexpectedDialogs, []);
      if (screenshot) {
        const name = label + '-' + width + '.png';
        await page.screenshot({ path: fileURLToPath(new URL(name, output)), fullPage: false });
        result.screenshots.push(name);
      }
    }
    async function confirmClick(selector, accept, expected) {
      let resolve;
      const seen = new Promise(done => { resolve = done; });
      dialogPlan = { accept, resolve };
      await page.locator(selector).click();
      const timer = setTimeout(() => resolve({ type: 'timeout', message: 'No confirmation appeared' }), 15000);
      let dialog;
      try { dialog = await seen; } finally { clearTimeout(timer); dialogPlan = null; }
      assert.equal(dialog.type, 'confirm'); assert.match(dialog.message, expected);
      return dialog.message;
    }
    const count = name => calls.filter(call => call.name === name).length;
    try {
      await page.goto(store.url + '/');
      await ready(page, 'staff', 'class');
      const metadata = await page.locator('#unified-demo').evaluate(element => JSON.parse(element.dataset.demoMetadata));
      const firstGeneration = await page.locator('body').getAttribute('data-demo-generation');
      assert.deepEqual(await page.locator('#demo-prepared-roster li').allTextContents(), ['Calm Otter', 'Brave Robin', 'Bright Fox']);
      assert.equal(count('listSchoolRewardsAlloFlowLinkedClasses'), 0, 'Prepared screen must not initiate identity lookups');
      const initial = await rpc(page, 'getSchoolRewardsBootstrap');
      assert.equal(initial.students.find(student => student.id === metadata.primaryStudentId).balance, 60);
      assert.equal(initial.catalog.find(item => item.id === metadata.notebookId).remaining, 5);
      await checkSurface('start', true);

      phase = 'start and draft protection';
      await page.locator('#demo-start').click(); await ready(page, 'staff', 'recognize');
      await page.waitForFunction(() => !document.querySelector('#demo-load-example').disabled);
      assert.equal(await page.locator('#linked-learner-card').evaluate(element => element.open), true);
      assert.equal(await page.locator('#demo-optional-voice').evaluate(element => element.open), false, 'Optional dictation is collapsed in the typed walkthrough');
      assert.equal(await page.locator('#typed-voice-start').isHidden(), true);
      assert.equal(await page.locator('#typed-recognition-input').inputValue(), '');
      assert.equal(count('listSchoolRewardsAlloFlowLinkedClasses'), 0, 'Start only opens the actual controls');
      const existingDraft = 'give Bright Fox 7 points for helping a classmate';
      await page.locator('#typed-recognition-input').fill(existingDraft);
      await page.locator('#demo-load-example').click();
      assert.equal(await page.locator('#typed-recognition-input').inputValue(), existingDraft);
      assert.match(await page.locator('#demo-status').textContent(), /not replaced/i);
      assert.equal(count('listSchoolRewardsAlloFlowLinkedClasses'), 0);
      result.existingDraftPreserved = true;
      await page.locator('#typed-recognition-input').fill('');

      phase = 'late class response';
      let release, markHeld, heldOnce = false;
      const gate = new Promise(resolve => { release = resolve; });
      const held = new Promise(resolve => { markHeld = resolve; });
      const holdClassRead = async route => {
        if (!heldOnce && route.request().postDataJSON()?.name === 'listSchoolRewardsAlloFlowLinkedClasses') {
          heldOnce = true; markHeld(); await gate;
        }
        await route.continue();
      };
      await page.route('**/rpc', holdClassRead);
      try {
        await page.locator('#demo-load-example').click(); await held;
        assert.equal(await page.locator('#demo-load-example').isDisabled(), true);
        const lateDraft = 'give Brave Robin 3 points for sharing materials';
        await page.locator('#typed-recognition-input').fill(lateDraft);
        await page.waitForFunction(() => !document.querySelector('#demo-load-example').disabled, undefined, { timeout: 3000 });
        assert.equal(await page.locator('#typed-recognition-input').inputValue(), lateDraft, 'Editing aborts preparation without replacing the draft while the old read is still held');
        const staleReply = page.waitForResponse(response => response.url() === store.url + '/rpc'
          && response.request().postDataJSON()?.name === 'listSchoolRewardsAlloFlowLinkedClasses');
        release();
        await (await staleReply).finished();
        await page.waitForFunction(() => !document.querySelector('#notice').classList.contains('busy'), undefined, { timeout: 3000 });
        assert.equal(await page.locator('#typed-recognition-input').inputValue(), lateDraft);
        assert.match(await page.locator('#demo-status').textContent(), /not replaced|current choices were kept/i);
        assert.equal(count('resolveSchoolRewardsAlloFlowLearner'), 0);
        assert.equal(count('awardSchoolRewardsPoints'), 0);
        result.lateResponseDraftPreserved = true;
        result.lateResponseReleasesBusyState = true;
      } finally { release(); await page.unroute('**/rpc', holdClassRead); }

      phase = 'load example and review';
      await page.locator('#typed-recognition-input').fill('');
      await page.locator('#demo-load-example').click();
      await page.waitForFunction(() => document.querySelector('#typed-recognition-input').value === 'give Calm Otter 5 points for helping');
      assert.equal(await page.locator('#linked-class').inputValue(), metadata.classId);
      assert.equal(await page.locator('#typed-recognition-category').inputValue(), metadata.categoryId);
      assert.equal(count('resolveSchoolRewardsAlloFlowLearner'), 0);
      assert.equal(count('awardSchoolRewardsPoints'), 0);
      await checkSurface('example', true);
      await page.locator('#typed-recognition-review').click();
      await page.locator('#typed-recognition-summary').waitFor({ state: 'visible' });
      const summary = await page.locator('#typed-recognition-summary').textContent();
      assert.match(summary, /Avery/); assert.match(summary, /Calm Otter/); assert.match(summary, /5 points/);
      assert.equal(count('resolveSchoolRewardsAlloFlowLearner'), 1);
      assert.equal(count('awardSchoolRewardsPoints'), 0);
      await page.locator('#typed-recognition-summary').scrollIntoViewIfNeeded();
      await checkSurface('review', true);

      phase = 'reviewed use and final confirmation';
      await page.locator('#linked-learner-use').click();
      await page.waitForFunction(id => document.querySelector('#award-student').value === id, metadata.primaryStudentId);
      assert.equal(count('resolveSchoolRewardsAlloFlowLearner'), 2, 'Use must resolve the canonical identity again');
      assert.equal(await page.locator('#award-amount').inputValue(), '5');
      assert.equal(await page.locator('#award-category').inputValue(), metadata.categoryId);
      assert.equal(await page.locator('#award-reason').inputValue(), 'helping');
      assert.equal(count('awardSchoolRewardsPoints'), 0);
      await confirmClick('#award-submit', false, /Avery/); await settled(page);
      assert.equal(count('awardSchoolRewardsPoints'), 0, 'Cancel cannot send an award');
      assert.equal((await rpc(page, 'getSchoolRewardsBootstrap')).students.find(student => student.id === metadata.primaryStudentId).balance, 60);
      const awarded = page.waitForResponse(response => response.url() === store.url + '/rpc' && response.request().postDataJSON()?.name === 'awardSchoolRewardsPoints');
      await confirmClick('#award-submit', true, /Avery/);
      const receipt = (await (await awarded).json()).result;
      assert.equal(receipt.entry.studentId, metadata.primaryStudentId); assert.equal(receipt.entry.amount, 5);
      await page.waitForFunction(() => !document.querySelector('#award-submit').disabled && document.querySelector('#award-student').value === '');
      assert.equal(count('awardSchoolRewardsPoints'), 1, 'Exactly one award request follows explicit confirmation');
      const afterAward = await rpc(page, 'getSchoolRewardsBootstrap');
      assert.equal(afterAward.students.find(student => student.id === metadata.primaryStudentId).balance, 65);
      assert.equal(afterAward.recentLedger.filter(entry => entry.kind === 'EARN').length, 2);
      result.award = { cancelledBalance: 60, confirmedBalance: 65, requests: 1, amount: 5 };
      await checkSurface('awarded');

      phase = 'student balance';
      await page.locator('[data-demo-step="balance"]').click(); await ready(page, 'student', 'balance');
      assert.equal(await page.locator('#metric-students').textContent(), '65 pts');
      assert.equal((await rpc(page, 'getSchoolRewardsBootstrap')).students[0].balance, 65);
      assert.equal(await page.locator('#linked-learner-card').isHidden(), true);
      await page.locator('#metric-students').scrollIntoViewIfNeeded();
      await checkSurface('student', true);

      phase = 'cashier checkout';
      await page.locator('[data-demo-step="shop"]').click(); await ready(page, 'cashier', 'shop');
      assert.equal(await page.locator('#checkout-student').inputValue(), '', 'Navigation cannot choose a checkout recipient');
      await page.locator('#checkout-student').selectOption(metadata.primaryStudentId);
      await page.locator('#store-catalog [aria-label="Add Notebook to cart"]').click();
      assert.equal(await page.locator('#cart-total').textContent(), '10 points');
      await page.locator('#checkout-submit').scrollIntoViewIfNeeded(); await checkSurface('checkout-review', true);
      const checkedOut = page.waitForResponse(response => response.url() === store.url + '/rpc' && response.request().postDataJSON()?.name === 'checkoutSchoolRewardsOrder');
      const confirmation = await confirmClick('#checkout-submit', true, /LIVE CHECK COMPLETE/);
      assert.match(confirmation, /Avery/); assert.match(confirmation, /1 x Notebook/); assert.match(confirmation, /65 -> 55/);
      assert.equal((await (await checkedOut).json()).ok, true);
      await page.locator('#checkout-receipt').waitFor({ state: 'visible' }); await settled(page);
      const afterCheckout = await rpc(page, 'getSchoolRewardsBootstrap');
      assert.equal(afterCheckout.students.find(student => student.id === metadata.primaryStudentId).balance, 55);
      assert.equal(afterCheckout.catalog.find(item => item.id === metadata.notebookId).remaining, 4);
      assert.equal(afterCheckout.recentOrders.length, 1); assert.equal(count('checkoutSchoolRewardsOrder'), 1);
      result.checkout = { balance: 55, notebookStock: 4, orders: 1 };
      await page.locator('#checkout-receipt').scrollIntoViewIfNeeded(); await checkSurface('checkout', true);

      phase = 'student receipt email preview';
      await page.locator('#demo-email-open').waitFor({ state: 'visible' });
      assert.match(await page.locator('#checkout-receipt .status-chip').textContent(), /NOT SENT/);
      assert.equal(await page.locator('#demo-email-preview').isHidden(), true);
      const beforePreview = await rpc(page, 'getSchoolRewardsBootstrap');
      await page.locator('#demo-email-open').click();
      await page.locator('#demo-email-preview iframe').waitFor();
      const frame = page.frameLocator('#demo-email-preview iframe');
      await frame.getByText('School store receipt', { exact: true }).waitFor();
      assert.match(await frame.locator('body').innerText(), /Notebook/);
      assert.match(await frame.locator('body').innerText(), /55 points/);
      assert.equal(await page.locator('#demo-email-preview iframe').getAttribute('sandbox'), '');
      await page.locator('#demo-email-preview details summary').click();
      assert.match(await page.locator('#demo-email-preview pre').textContent(), /1 x Notebook/);
      assert.match(await page.locator('#demo-email-preview pre').textContent(), /55 points/);
      assert.match(await page.locator('#demo-email-preview').textContent(), /Not sent/);
      assert.deepEqual(await rpc(page, 'getSchoolRewardsBootstrap'), beforePreview);
      await page.locator('#demo-email-preview').scrollIntoViewIfNeeded(); await checkSurface('email-preview', true);
      await page.getByRole('button', { name: 'Close email preview', exact: true }).click();
      assert.equal(await page.locator('#demo-email-preview').isHidden(), true);
      assert.equal(await page.locator('#demo-email-preview iframe').count(), 0);
      result.emailPreview = { exactReceipt: true, balance: 55, sent: false, sandboxed: true, ledgerUnchanged: true };

      phase = 'reset';
      await page.evaluate(() => {
        sessionStorage.setItem('unified_demo_qa_unrelated', 'keep this unrelated setting');
        sessionStorage.setItem('alloflow_school_rewards_retry_award', 'fictional stale retry marker');
      });
      await page.locator('#demo-advanced > summary').click();
      await confirmClick('#demo-reset', true, /Reset only the fictional demo records/);
      await ready(page, 'staff', 'class');
      const nextGeneration = await page.locator('body').getAttribute('data-demo-generation');
      assert.notEqual(nextGeneration, firstGeneration);
      const resetStorage = await page.evaluate(() => ({ unrelated: sessionStorage.getItem('unified_demo_qa_unrelated'),
        retry: sessionStorage.getItem('alloflow_school_rewards_retry_award') }));
      assert.deepEqual(resetStorage, { unrelated: 'keep this unrelated setting', retry: null });
      const reset = await rpc(page, 'getSchoolRewardsBootstrap');
      assert.equal(reset.students.find(student => student.id === metadata.primaryStudentId).balance, 60);
      assert.equal(reset.catalog.find(item => item.id === metadata.notebookId).remaining, 5);
      assert.equal(reset.recentOrders.length, 0); assert.equal(reset.recentLedger.length, 1);
      const classes = await rpc(page, 'listSchoolRewardsAlloFlowLinkedClasses');
      assert.equal(classes.enabled, true); assert.equal(classes.classes.length, 1);
      assert.equal(classes.classes[0].classId, metadata.classId);
      assert.deepEqual(classes.classes[0].learners.map(learner => learner.codename), ['Calm Otter', 'Brave Robin', 'Bright Fox']);
      assert.ok(calls.every(call => typeof call.demoGeneration === 'string' && call.demoGeneration.length > 20));
      result.reset = { balance: 60, notebookStock: 5, reviewedLinks: 3, freshGeneration: true, unrelatedStoragePreserved: true, staleRetryCleared: true };
      await page.evaluate(() => scrollTo(0, 0)); await checkSurface('reset', true);
      result.noAutomaticSpeechOrMicrophone = true;
      result.passed = true;
    } catch (error) {
      const failure = { width, phase, message: error.message };
      try {
        failure.ui = await page.evaluate(() => ({
          notice: document.querySelector('#notice')?.textContent,
          demoStatus: document.querySelector('#demo-status')?.textContent,
          exampleDisabled: document.querySelector('#demo-load-example')?.disabled,
          typedDraft: document.querySelector('#typed-recognition-input')?.value,
        }));
      } catch { /* preserve the original failure if navigation destroyed the page */ }
      report.errors.push(failure); result.failure = failure;
      try { await page.screenshot({ path: fileURLToPath(new URL('failure-' + width + '.png', output)), fullPage: false }); } catch { /* preserve original failure */ }
    } finally {
      report.surfaces.push(result);
      await context.close();
      await new Promise(resolve => store.server.close(resolve));
    }
  }
} finally {
  await browser.close();
  report.ok = report.errors.length === 0 && report.surfaces.length === 2 && report.surfaces.every(surface => surface.passed);
  await writeFile(new URL('browser-checks.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
