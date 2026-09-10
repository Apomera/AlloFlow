// Actual Portal + Code.gs browser checks against simulated Google services only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';
import { STAFF } from '../tests/helpers/school_rewards_repository.js';

const output = new URL('../reports/school-store-class-links-2026-09-09/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { surfaces: [], errors: [] };
const browser = await chromium.launch({ headless: true });
async function rpcAfter(page, name, action) {
  const response = page.waitForResponse(r => r.url().endsWith('/rpc') && r.request().postDataJSON()?.name === name);
  await action();
  const envelope = await (await response).json();
  assert.equal(envelope.ok, true, envelope.error || name);
  assert.equal(envelope.result.ok, true, name);
  return envelope.result;
}
async function role(page, url, name) {
  await page.goto(url + '/?role=' + name);
  await page.waitForFunction(expected => document.querySelector('#actor-pill').textContent === expected, name.toUpperCase());
}
try {
  for (const width of [1280, 390]) {
    const store = await createDemoServer({ port: 0 });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], calls = [];
    let accept = true;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => accept ? d.accept() : d.dismiss());
    page.on('request', r => { if (r.url() === store.url + '/rpc') calls.push(r.postDataJSON()); });
    try {
      await role(page, store.url, 'admin');
      await page.locator('#tab-admin').click();
      const card = page.locator('#class-links-card');
      if (await card.evaluate(e => e.classList.contains('collapsed'))) await card.locator('.section-toggle').click();
      const initial = await rpcAfter(page, 'getSchoolRewardsAlloFlowLinkContext', () => page.locator('#class-links-load').click());
      assert.equal(initial.enabled, false);
      await page.locator('#class-links-policy').check();
      await rpcAfter(page, 'adminConfigureSchoolRewardsClassLinks', () => page.locator('#class-links-enable').click());
      await rpcAfter(page, 'getSchoolRewardsAlloFlowLinkContext', () => page.locator('#class-links-load').click());
      await page.locator('#class-links-file').waitFor({ state: 'visible' });
      const manifest = { format: 'alloflow-store-roster', version: 1, classId: 'CLS-browser-' + width,
        learners: [{ learnerId: 'LRN-browser-' + width, codename: 'Calm Otter' }] };
      await page.locator('#class-links-file').setInputFiles({ name: 'class.alloflow-store-roster.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(manifest)) });
      await page.locator('#class-link-learner-map').selectOption(manifest.learners[0].learnerId);
      const studentId = await page.locator('#class-link-student-map').evaluate(e => [...e.options].find(o => /Avery/.test(o.textContent))?.value);
      assert.ok(studentId, 'Fictional canonical student is selectable');
      await page.locator('#class-link-student-map').selectOption(studentId);
      await page.locator('#class-link-set').click();
      await page.locator('[data-class-link-staff][value="' + STAFF + '"]').check();
      const preview = await rpcAfter(page, 'previewSchoolRewardsAlloFlowLinks', () => page.locator('#class-links-preview').click());
      assert.equal(preview.canApply, true);
      await page.locator('#class-links-review').waitFor({ state: 'visible' });
      assert.match(await page.locator('#class-links-review').textContent(), /Calm Otter/);
      assert.match(await page.locator('#class-links-review').textContent(), /Avery/);
      assert.equal(calls.filter(c => c.name === 'applySchoolRewardsAlloFlowLinks').length, 0);
      await page.screenshot({ path: fileURLToPath(new URL('admin-review-' + width + '.png', output)), fullPage: true });
      await card.screenshot({ path: fileURLToPath(new URL('admin-card-' + width + '.png', output)) });
      await page.locator('#class-links-reviewed').check();
      accept = false;
      await page.locator('#class-links-apply').click();
      assert.equal(calls.filter(c => c.name === 'applySchoolRewardsAlloFlowLinks').length, 0, 'Cancelled final review cannot save links');
      accept = true;
      const saved = await rpcAfter(page, 'applySchoolRewardsAlloFlowLinks', () => page.locator('#class-links-apply').click());
      assert.equal(saved.classId, manifest.classId);
      assert.equal(saved.count, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      report.surfaces.push({ surface: 'actual-admin-link-review', width, result: 'passed' });
      await role(page, store.url, 'staff');
      await page.locator('#tab-award').click();
      await page.locator('#linked-learner-card summary').click();
      const linked = await rpcAfter(page, 'listSchoolRewardsAlloFlowLinkedClasses', () => page.locator('#linked-classes-load').click());
      assert.ok(linked.classes.some(c => c.classId === manifest.classId));
      await page.locator('#linked-class').selectOption(manifest.classId);
      await page.locator('#linked-learner').selectOption(manifest.learners[0].learnerId);
      const resolved = await rpcAfter(page, 'resolveSchoolRewardsAlloFlowLearner', () => page.locator('#linked-learner-resolve').click());
      assert.equal(resolved.student.id, studentId);
      await page.locator('#linked-learner-use').waitFor({ state: 'visible' });
      assert.match(await page.locator('#linked-learner-preview').textContent(), /Avery/);
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 0, 'Lookup cannot award');
      await page.screenshot({ path: fileURLToPath(new URL('staff-recipient-' + width + '.png', output)), fullPage: true });
      await page.locator('#linked-learner-card').screenshot({ path: fileURLToPath(new URL('staff-card-' + width + '.png', output)) });
      await page.locator('#linked-learner-use').click();
      await page.waitForFunction(id => document.querySelector('#award-student').value === id, studentId);
      assert.equal(await page.locator('#award-student').inputValue(), studentId);
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 0, 'Prefill cannot award');
      await page.locator('[data-quick-points="5"]').click();
      await page.locator('#award-reason').fill('Fictional revision after feedback');
      accept = false;
      await page.locator('#award-submit').click();
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 0);
      accept = true;
      const award = await rpcAfter(page, 'awardSchoolRewardsPoints', () => page.locator('#award-submit').click());
      assert.equal(award.entry.studentId, studentId);
      assert.equal(award.entry.amount, 5);
      await page.waitForFunction(() => !document.querySelector('#reuse-award').disabled && !document.querySelector('#award-submit').disabled);
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 1);
      assert.equal(await page.locator('#award-student').inputValue(), '');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
      for (const value of [manifest.classId, manifest.learners[0].learnerId, 'Calm Otter', studentId]) assert.ok(!storage.includes(value), 'Private linking context persisted in browser storage');
      report.surfaces.push({ surface: 'actual-staff-linked-award', width, result: 'passed' });
      await role(page, store.url, 'student');
      assert.equal(await page.locator('#class-links-card').isHidden(), true);
      assert.equal(await page.locator('#linked-learner-card').isHidden(), true);
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
      await new Promise(resolve => store.server.close(resolve));
    }
  }
  await writeFile(new URL('browser-checks.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
