// Actual compiled Allobot guard and Store Portal, fictional services only.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';
import { STAFF } from '../tests/helpers/school_rewards_repository.js';

const voiceMode = process.argv.includes('--voice');
const output = new URL('../reports/school-store-' + (voiceMode ? 'voice' : 'typed') + '-recognition-2026-09-09/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { surfaces: [], errors: [] }, browser = await chromium.launch({ headless: true });
async function call(page, name, argument) {
  return page.evaluate(({ name, argument }) => new Promise((resolve, reject) => google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](argument)), { name, argument });
}
async function dictate(page, text, language) {
  await page.locator('#typed-recognition-input').fill('');
  await page.locator('#typed-voice-language').selectOption(language);
  await page.locator('#typed-voice-start').click();
  await page.waitForFunction(() => window.__voiceFixture.current?.started === true);
  const properties = await page.evaluate(() => { const r = window.__voiceFixture.current; return [r.processLocally, r.lang, r.continuous, r.interimResults, r.maxAlternatives]; });
  assert.deepEqual(properties, [true, language, false, false, 1]);
  await page.evaluate(text => {
    const r = window.__voiceFixture.current;
    r.onresult({ resultIndex: 0, results: [{ isFinal: true, length: 1, 0: { transcript: text, confidence: 0.9 } }] });
  }, text);
  assert.equal(await page.locator('#typed-recognition-input').inputValue(), text);
  assert.equal(await page.locator('#typed-recognition-summary').isHidden(), true, 'Dictation only fills an editable draft');
  assert.equal(await page.evaluate(() => window.__voiceFixture.current.started), false);
}
try {
  for (const width of [1280, 390]) {
    const store = await createDemoServer({ port: 0 }), page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], calls = []; let accept = false;
    if (voiceMode) await page.addInitScript(() => {
      window.__voiceFixture = { current: null, starts: 0, status: 'available' };
      window.SpeechRecognition = class {
        constructor() { this.processLocally = false; this.started = false; window.__voiceFixture.current = this; }
        static async available(options) { if (options.processLocally !== true) throw Error('Remote speech forbidden'); return window.__voiceFixture.status; }
        start() { if (this.processLocally !== true) throw Error('Remote speech forbidden'); this.started = true; window.__voiceFixture.starts++; this.onstart?.(); }
        stop() { this.started = false; }
        abort() { this.started = false; }
      };
    });
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => accept ? d.accept() : d.dismiss());
    page.on('request', r => { if (r.url() === store.url + '/rpc') calls.push(r.postDataJSON()); });
    try {
      await page.goto(store.url + '/?role=admin');
      await page.waitForFunction(() => document.querySelector('#actor-pill').textContent === 'ADMIN');
      await call(page, 'adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true });
      const context = await call(page, 'getSchoolRewardsAlloFlowLinkContext');
      const student = context.students.find(s => s.firstName === 'Avery'); assert.ok(student);
      const roster = { format: 'alloflow-store-roster', version: 1, classId: 'CLS-typed-' + width, learners: [{ learnerId: 'LRN-typed-' + width, codename: 'Calm Otter' }] };
      const proposal = { roster, bindings: [{ learnerId: roster.learners[0].learnerId, studentId: student.id }], staffEmails: [STAFF], expectedRepositoryId: context.repositoryId, expectedYearKey: context.yearKey };
      const preview = await call(page, 'previewSchoolRewardsAlloFlowLinks', proposal); assert.equal(preview.canApply, true);
      await call(page, 'applySchoolRewardsAlloFlowLinks', { ...proposal, expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, expectedLinksRevision: preview.linksRevision, confirmed: true, idempotencyKey: 'fictional-typed-link-' + width });
      await page.goto(store.url + '/?role=staff&view=recognition');
      await page.locator('#linked-classes-load').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#linked-learner-card').evaluate(e => e.open), true);
      assert.equal(calls.filter(c => c.name === 'listSchoolRewardsAlloFlowLinkedClasses').length, 0, 'View hint cannot load identities');
      await page.locator('#linked-classes-load').click();
      await page.waitForFunction(id => [...document.querySelector('#linked-class').options].some(o => o.value === id), roster.classId);
      await page.locator('#linked-class').selectOption(roster.classId);
      const categoryId = await page.locator('#typed-recognition-category').evaluate(e => e.options[1].value);
      await page.locator('#typed-recognition-category').selectOption(categoryId);
      const request = 'give Calm Otter 5 points for helping revise a design';
      await page.locator('#typed-recognition-input').fill('give Fictional Wrong 5 points for helping');
      await page.locator('#typed-recognition-review').click();
      await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('No exact linked codename'));
      assert.equal(calls.filter(c => c.name === 'resolveSchoolRewardsAlloFlowLearner').length, 0, 'Unknown codename cannot guess a recipient');
      if (voiceMode) {
        const before = calls.length;
        await dictate(page, request, 'en-US');
        assert.equal(calls.length, before, 'Voice input cannot lookup, prefill or award');
      } else await page.locator('#typed-recognition-input').fill(request);
      await page.locator('#typed-recognition-review').click();
      await page.locator('#typed-recognition-summary').waitFor({ state: 'visible' });
      assert.match(await page.locator('#typed-recognition-summary').textContent(), /Avery/);
      assert.match(await page.locator('#typed-recognition-summary').textContent(), /5 points/);
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 0);
      await page.locator('#linked-learner-card').screenshot({ path: fileURLToPath(new URL('typed-review-' + width + '.png', output)) });
      await page.locator('#typed-recognition-input').fill(request + ' again');
      assert.equal(await page.locator('#typed-recognition-summary').isHidden(), true, 'Editing invalidates the review');
      await page.locator('#typed-recognition-input').fill(request);
      await page.locator('#typed-recognition-review').click();
      await page.locator('#typed-recognition-summary').waitFor({ state: 'visible' });
      await page.locator('#linked-learner-use').click();
      await page.waitForFunction(id => document.querySelector('#award-student').value === id && document.querySelector('#award-reason').value === 'helping revise a design', student.id);
      assert.equal(await page.locator('#award-amount').inputValue(), '5');
      assert.equal(await page.locator('#award-category').inputValue(), categoryId);
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 0, 'Prefill cannot award');
      await page.locator('#award-submit').click();
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 0, 'Cancelling final confirmation cannot award');
      accept = true;
      const reply = page.waitForResponse(r => r.url().endsWith('/rpc') && r.request().postDataJSON()?.name === 'awardSchoolRewardsPoints');
      await page.locator('#award-submit').click();
      const award = (await (await reply).json()).result;
      assert.equal(award.entry.studentId, student.id); assert.equal(award.entry.amount, 5); assert.equal(award.entry.categoryId, categoryId);
      await page.waitForFunction(() => !document.querySelector('#award-submit').disabled && document.querySelector('#award-student').value === '');
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 1);
      const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
      for (const privateValue of [request, 'Calm Otter', 'helping revise a design', roster.classId, student.id]) assert.ok(!storage.includes(privateValue));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      report.surfaces.push({ surface: voiceMode ? 'actual-store-simulated-voice-recognition' : 'actual-store-typed-recognition', width, result: 'passed' });
      await page.goto(store.url + '/?role=staff&view=recognition');
      await page.locator('#linked-classes-load').waitFor({ state: 'visible' });
      await page.locator('#lang-select').selectOption('es');
      await page.waitForFunction(() => document.querySelector('#typed-recognition-review').textContent === 'Revisar el reconocimiento escrito');
      await page.locator('#linked-classes-load').click();
      await page.waitForFunction(id => [...document.querySelector('#linked-class').options].some(o => o.value === id), roster.classId);
      await page.locator('#linked-class').selectOption(roster.classId);
      await page.locator('#typed-recognition-category').selectOption(categoryId);
      if (voiceMode) {
        const before = calls.length;
        await dictate(page, 'da Calm Otter 5 puntos por ayudar', 'es-ES');
        assert.equal(calls.length, before, 'Spanish voice input cannot lookup or award');
      } else await page.locator('#typed-recognition-input').fill('da Calm Otter 5 puntos por ayudar');
      await page.locator('#typed-recognition-review').click();
      await page.waitForFunction(() => document.querySelector('#typed-recognition-summary').textContent.includes('5 puntos | Categoría:'));
      assert.match(await page.locator('#typed-recognition-summary').textContent(), /Seudónimo: Calm Otter/);
      assert.match(await page.locator('#typed-recognition-summary').textContent(), /Motivo: ayudar/);
      await page.locator('#linked-learner-card').screenshot({ path: fileURLToPath(new URL('typed-review-es-' + width + '.png', output)) });
      await page.locator('#typed-recognition-cancel').click();
      assert.equal(await page.locator('#typed-recognition-input').inputValue(), '');
      assert.equal(await page.locator('#typed-recognition-summary').isHidden(), true);
      assert.equal(calls.filter(c => c.name === 'awardSchoolRewardsPoints').length, 1, 'Spanish review/cancel cannot award');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      report.surfaces.push({ surface: voiceMode ? 'actual-store-simulated-voice-spanish' : 'actual-store-typed-recognition-spanish', width, result: 'passed' });
      await page.locator('#lang-select').selectOption('en');
      await page.evaluate(() => { window.AlloModules = {}; });
      await page.addScriptTag({ path: fileURLToPath(new URL('../udl_chat_module.js', import.meta.url)) });
      const guard = await page.evaluate(async () => {
        let messages = [], aiCalls = 0, launches = [];
        const deps = { udlInput: 'give Fictional Private Name 5 points for helping',
          setUdlInput() {}, setUdlMessages(next) { messages = typeof next === 'function' ? next(messages) : next; },
          _alloCmdCtx: () => ({ isTeacherMode: true, commandAudience: 'teacher', openSchoolStoreRecognition: (...args) => launches.push(args) }),
          _sendUdlToChat() { aiCalls++; }, answerUdlQuestion() { aiCalls++; }, callGemini() { aiCalls++; }
        };
        await window.AlloModules.UdlChat.planAndSendUdlMessage(null, deps);
        const automaticLaunches = launches.length;
        await window.AlloModules.UdlChat.planAndSendUdlMessage('__allo_store_open', deps);
        return { messages, aiCalls, automaticLaunches, launches };
      });
      assert.equal(guard.aiCalls, 0); assert.equal(guard.automaticLaunches, 0); assert.deepEqual(guard.launches, [[]]);
      assert.ok(!JSON.stringify(guard.messages).includes('Fictional Private Name'));
      report.surfaces.push({ surface: 'compiled-allobot-local-guard-runtime', width, result: 'passed' });
      await page.goto(store.url + '/?role=student&view=recognition');
      await page.waitForFunction(() => document.querySelector('#actor-pill').textContent === 'STUDENT');
      assert.equal(await page.locator('#linked-learner-card').isHidden(), true);
      assert.deepEqual(errors, []);
    } finally { await page.close(); await new Promise(resolve => store.server.close(resolve)); }
  }
  await writeFile(new URL('browser-checks.json', output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
