const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Installed Chrome, canonical source and actual React host. New evidence and reflection behavior is exercised through controls; alternate history states are derived from an actual recorded attempt.', checks: [], errors: [], screenshots: [] };
let browser, fixture, attemptData;
const clone = value => JSON.parse(JSON.stringify(value));
const note = 'I cleared TRAIN101 after runway assignment. Next time I will resume traffic and watch the descent.';
async function check(name, action) {
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function makePage(width = 1440, data = null, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  if (data) {
    await page.addInitScript(initial => { window.__qaInitialToolData = initial; }, { atcTower: clone(data) });
    await page.route(fixture.url, async route => {
      const response = await route.fetch(), source = await response.text(), marker = "React.useState({atcTower:{view:'menu'}})";
      assert.ok(source.includes(marker));
      await route.fulfill({ response, body: source.replace(marker, "React.useState(window.__qaInitialToolData || {atcTower:{view:'menu'}})") });
    });
  }
  await page.goto(fixture.url);
  return page;
}
async function start(page, id = 'first_landing') {
  await page.locator('#stem-atctower-tab-practice').click();
  await page.locator('[data-atctower-practice-start="' + id + '"]').click();
  await page.locator('[data-atctower-playing]').waitFor();
}
async function dataOf(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); }
async function gameOf(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcGameRef.current))); }
async function fit(page) {
  const value = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  assert.ok(value.document <= value.width + 1, JSON.stringify(value)); return value;
}
async function axe(page) {
  await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(item => ['serious','critical'].includes(item.impact)).map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })));
  assert.deepEqual(violations, []);
}
async function capture(page, name, locator = null) {
  const file = path.join(__dirname, name + '.png');
  if (locator) await locator.screenshot({ path: file }); else await page.screenshot({ path: file, fullPage: true });
  results.screenshots.push(file);
}
function notedData(view = 'debrief') {
  assert.ok(attemptData, 'The real recorded attempt is required');
  const data = clone(attemptData); data.view = view; data.atcMenuPanel = 'practice';
  data.shiftReflections = { [data.lastShift.shiftId]: note }; return data;
}
function entryFrom(base, id, practiceId = 'first_landing') {
  const entry = clone(base); entry.shiftId = id;
  if (practiceId) { entry.practice.id = practiceId; entry.exerciseResult.id = practiceId; }
  else { delete entry.practice; delete entry.exerciseResult; }
  return entry;
}
async function openCarried(page) {
  const carried = page.locator('[data-atctower-carried-reflection]'); await carried.waitFor();
  assert.equal(await carried.getAttribute('open'), null); await carried.locator('summary').click();
  assert.match(await carried.innerText(), /TRAIN101/); return carried;
}
async function checkpoint(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForFunction(() => !!window.__atcToolData.atcTower.activeShift && JSON.stringify(window.__atcToolData.atcTower.activeShift.reviewNote) === JSON.stringify(window.__atcGameRef.current.reviewNote));
  return dataOf(page);
}

async function runChecks() {
  await check('An actual recorded attempt supplies preserved instruction evidence and an initially empty optional reflection cue', async () => {
    const page = await makePage();
    try {
      await start(page); await page.locator('[data-atctower-command="r"]').click(); await page.locator('[data-atctower-command="c"]').click();
      const before = await gameOf(page); await page.getByRole('button', { name: 'End shift', exact: true }).click(); await page.locator('[data-atctower-debrief]').waitFor();
      const select = page.locator('#atc-reflection-event'); assert.equal(await select.inputValue(), '');
      assert.equal(await page.locator('#atc-shift-reflection').inputValue(), ''); assert.equal(await page.locator('[data-atctower-reflection-context]').count(), 0);
      attemptData = await dataOf(page); assert.deepEqual(attemptData.lastShift.decisionLog, before.decisionLog);
      fs.writeFileSync(path.join(__dirname, 'measured-attempt-data.json'), JSON.stringify(attemptData, null, 2) + '\n');
    } finally { await page.close(); }
  });
  for (const width of [1440,390,320]) {
    await check('Evidence-linked reflection appears before detailed evidence and fits accessibly at ' + width + 'px', async () => {
      const page = await makePage(width, notedData());
      try {
        await page.locator('[data-atctower-debrief]').waitFor(); const field = page.locator('#atc-shift-reflection');
        assert.equal(await field.inputValue(), note);
        const order = await field.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('[data-atctower-decision-log]')) & Node.DOCUMENT_POSITION_FOLLOWING));
        assert.equal(order, true); await page.locator('#atc-reflection-event').selectOption('0');
        assert.match(await page.locator('[data-atctower-reflection-context]').innerText(), /TRAIN101 assigned runway 27/);
        assert.equal(await field.inputValue(), note); const dimensions = await fit(page); await axe(page); await capture(page, 'after-debrief-' + width);
        return { ...dimensions, reflectionTop: await field.evaluate(el => Math.round(el.getBoundingClientRect().top + scrollY)) };
      } finally { await page.close(); }
    });
  }
  for (const width of [1440,390,320]) {
    await check('Retry carries a closed readable saved-plan disclosure without changing traffic at ' + width + 'px', async () => {
      const page = await makePage(width, notedData());
      try {
        await page.locator('[data-atctower-practice-retry="first_landing"]').click(); await page.locator('[data-atctower-playing]').waitFor();
        const initial = await gameOf(page); assert.equal(initial.paused, true); assert.equal(initial.time, 0);
        const carried = await openCarried(page); assert.match(await carried.innerText(), new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        await page.waitForTimeout(650); assert.equal(await carried.count(), 1); assert.ok((await carried.innerText()).includes(note));
        assert.ok(JSON.stringify(initial.reviewNote).includes(note)); assert.deepEqual((await gameOf(page)).aircraft, initial.aircraft);
        await fit(page); await axe(page); await capture(page, 'after-retry-' + width); await capture(page, 'after-carried-plan-' + width, carried);
      } finally { await page.close(); }
    });
  }
  await check('Reflection cues retain full chronological event context without changing a saved learner note', async () => {
    const page = await makePage(390, notedData());
    try {
      const select = page.locator('#atc-reflection-event'), field = page.locator('#atc-shift-reflection');
      const values = await select.locator('option').evaluateAll(items => items.map(el => el.value));
      assert.deepEqual(values, ['', ...attemptData.lastShift.decisionLog.map((_, i) => String(i))]);
      for (let index = 0; index < attemptData.lastShift.decisionLog.length; index++) {
        await select.selectOption(String(index)); assert.ok((await page.locator('[data-atctower-reflection-context]').innerText()).includes(attemptData.lastShift.decisionLog[index].text));
        assert.equal(await field.inputValue(), note);
      }
      await select.selectOption(''); assert.equal(await page.locator('[data-atctower-reflection-context]').count(), 0);
      assert.equal((await dataOf(page)).shiftReflections[attemptData.lastShift.shiftId], note);
    } finally { await page.close(); }
  });
  await check('Evidence filtering does not shrink the optional reflection cue or erase its selected event', async () => {
    const page = await makePage(390, notedData());
    try {
      await page.locator('#atc-reflection-event').selectOption('1'); const before = await page.locator('[data-atctower-reflection-context]').innerText();
      await page.locator('[data-atctower-evidence-filter]').selectOption('math'); assert.equal(await page.locator('[data-atctower-evidence-events] li').count(), 0);
      assert.equal(await page.locator('#atc-reflection-event').inputValue(), '1'); assert.equal(await page.locator('[data-atctower-reflection-context]').innerText(), before);
      assert.equal(await page.locator('#atc-reflection-event option').count(), 3); assert.equal(await page.locator('#atc-shift-reflection').inputValue(), note);
    } finally { await page.close(); }
  });
  await check('Dismissing a carried plan affects only this new attempt and preserves the original saved reflection', async () => {
    const page = await makePage(390, notedData());
    try {
      await page.locator('[data-atctower-practice-retry="first_landing"]').click(); const initial = await gameOf(page); await openCarried(page);
      await page.locator('[data-atctower-dismiss-reflection]').click(); await page.locator('[data-atctower-carried-reflection]').waitFor({ state: 'detached' });
      await page.waitForTimeout(650); assert.equal(await page.locator('[data-atctower-carried-reflection]').count(), 0);
      const after = await gameOf(page); assert.deepEqual(after.aircraft, initial.aircraft); assert.deepEqual(after.decisionLog, initial.decisionLog);
      assert.equal((await dataOf(page)).shiftReflections[attemptData.lastShift.shiftId], note);
      await page.getByRole('button', { name: 'End shift', exact: true }).click(); assert.equal((await dataOf(page)).shiftReflections[attemptData.lastShift.shiftId], note);
    } finally { await page.close(); }
  });
  await check('A carried plan and its dismissed state survive checkpoint restoration with traffic paused', async () => {
    const page = await makePage(390, notedData()); let restored;
    try {
      await page.locator('[data-atctower-practice-retry="first_landing"]').click(); await page.locator('[data-atctower-carried-reflection]').waitFor();
      const current = await gameOf(page); const saved = await checkpoint(page); assert.deepEqual(saved.activeShift.reviewNote, current.reviewNote);
      restored = await makePage(320, saved); await restored.locator('[data-atctower-playing]').waitFor();
      assert.equal((await gameOf(restored)).paused, true); await openCarried(restored); await restored.locator('[data-atctower-dismiss-reflection]').click();
      const dismissed = await gameOf(restored), savedDismissed = await checkpoint(restored); assert.deepEqual(savedDismissed.activeShift.reviewNote, dismissed.reviewNote);
      await restored.close(); restored = await makePage(320, savedDismissed); await restored.locator('[data-atctower-playing]').waitFor();
      assert.equal(await restored.locator('[data-atctower-carried-reflection]').count(), 0); assert.equal((await dataOf(restored)).shiftReflections[attemptData.lastShift.shiftId], note);
    } finally { await page.close(); if (restored) await restored.close(); }
  });
  await check('A latest matching attempt with no note never borrows an older note', async () => {
    const initial = notedData('menu'), older = clone(initial.lastShift), newest = entryFrom(older, 'qa-latest-empty');
    initial.lastShift = newest; initial.shiftHistory = [newest, older];
    const page = await makePage(390, initial);
    try { await start(page); assert.equal(await page.locator('[data-atctower-carried-reflection]').count(), 0); assert.ok(!(await gameOf(page)).reviewNote); }
    finally { await page.close(); }
  });
  await check('A different exercise cannot inherit the first-arrival reflection', async () => {
    const page = await makePage(390, notedData('menu'));
    try { await start(page, 'arrival_sequence'); assert.equal(await page.locator('[data-atctower-carried-reflection]').count(), 0); assert.ok(!(await gameOf(page)).reviewNote); }
    finally { await page.close(); }
  });
  await check('Standard guided shifts carry only a same-airport non-exercise reflection', async () => {
    const initial = notedData('menu'), exercise = clone(initial.lastShift), standard = entryFrom(exercise, 'qa-standard-note', null);
    const standardNote = 'Compare direct arrival estimates before issuing the first approach clearance.';
    initial.atcMenuPanel = 'airports'; initial.lastShift = standard; initial.shiftHistory = [exercise, standard]; initial.shiftReflections[standard.shiftId] = standardNote; initial.trainingMode = 'guided';
    const page = await makePage(390, initial);
    try {
      await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).click(); await page.locator('[data-atctower-playing]').waitFor();
      const carried = page.locator('[data-atctower-carried-reflection]'); await carried.locator('summary').click(); assert.ok((await carried.innerText()).includes(standardNote)); assert.ok(!(await carried.innerText()).includes(note));
      assert.ok((await gameOf(page)).practice == null);
    } finally { await page.close(); }
  });
  await check('Practice history distinguishes the scenario and saved plan then reopens the actual latest debrief', async () => {
    const page = await makePage(390, notedData('menu'));
    try {
      await capture(page, 'after-pathway-390');
      const history = page.locator('[data-atctower-history]'); await history.locator('summary').click();
      assert.match(await history.innerText(), /Guide one arrival/); assert.match(await history.innerText(), /reflection|note|plan/i);
      await capture(page, 'after-history-390', history);
      const review = page.locator('[data-atctower-review-practice="first_landing"]'); assert.equal(await review.count(), 1); await review.click();
      await page.locator('[data-atctower-debrief]').waitFor(); assert.equal((await dataOf(page)).lastShift.shiftId, attemptData.lastShift.shiftId);
      assert.equal(await page.locator('#atc-shift-reflection').inputValue(), note); await fit(page); await axe(page); await capture(page, 'after-reviewed-attempt-390');
    } finally { await page.close(); }
  });
  await check('Verified completion persists while a newer unfinished attempt has its own accurate result and review link', async () => {
    const completed = JSON.parse(fs.readFileSync(path.join(repo, 'reports/atc-visual-engagement-2026-10-03/measured-completion-data.json'), 'utf8'));
    const initial = clone(completed); initial.view = 'menu'; initial.atcMenuPanel = 'practice';
    const page = await makePage(320, initial);
    try {
      await start(page); await page.getByRole('button', { name: 'End shift', exact: true }).click(); await page.locator('[data-atctower-debrief]').waitFor();
      const newest = (await dataOf(page)).lastShift; assert.equal(newest.exerciseResult.complete, false);
      await page.getByRole('button', { name: 'Practice pathway', exact: true }).click(); await page.locator('[data-atctower-pathway]').waitFor();
      const card = page.locator('[data-atctower-pathway-card="first_landing"]'); assert.equal(await card.getAttribute('data-practice-state'), 'complete');
      assert.match(await page.locator('[data-atctower-last-attempt="first_landing"]').innerText(), /unfinished|recorded/i);
      await capture(page, 'after-practice-with-new-attempt-320');
      await page.locator('[data-atctower-review-practice="first_landing"]').click(); assert.equal((await dataOf(page)).lastShift.shiftId, newest.shiftId);
      assert.equal(await page.locator('[data-atctower-exercise]').getAttribute('data-exercise-status'), 'in-progress');
    } finally { await page.close(); }
  });
  await check('A completion retained beyond the eight full debriefs does not fabricate a review destination', async () => {
    const completed = JSON.parse(fs.readFileSync(path.join(repo, 'reports/atc-visual-engagement-2026-10-03/measured-completion-data.json'), 'utf8'));
    const initial = notedData('menu'); initial.practiceLearning = clone(completed.practiceLearning);
    initial.shiftHistory = Array.from({ length: 8 }, (_, i) => entryFrom(initial.lastShift, 'qa-other-history-' + i, 'arrival_sequence')); initial.lastShift = initial.shiftHistory[0];
    const page = await makePage(390, initial);
    try {
      assert.equal(await page.locator('[data-atctower-pathway-card="first_landing"]').getAttribute('data-practice-state'), 'complete');
      assert.equal(await page.locator('[data-atctower-review-practice="first_landing"]').count(), 0); await fit(page);
    } finally { await page.close(); }
  });
  await check('Editing an existing saved reflection preserves all eight notes while a ninth shift remains bounded to eight', async () => {
    const initial = notedData(); initial.shiftReflections = {};
    for (let index = 0; index < 7; index++) initial.shiftReflections['qa-note-' + index] = 'Earlier saved reflection ' + index;
    const currentKey = initial.lastShift.shiftId; initial.shiftReflections[currentKey] = 'Original current reflection';
    const page = await makePage(390, initial);
    try {
      const field = page.locator('#atc-shift-reflection'); await field.fill('Edited current reflection');
      let notes = (await dataOf(page)).shiftReflections; assert.equal(Object.keys(notes).length, 8); assert.equal(notes[currentKey], 'Edited current reflection');
      for (let index = 0; index < 7; index++) assert.equal(notes['qa-note-' + index], initial.shiftReflections['qa-note-' + index]);
      await page.evaluate(() => window.__fixtureSetData(previous => ({ ...previous, atcTower: { ...previous.atcTower, lastShift: { ...previous.atcTower.lastShift, shiftId: 'qa-ninth-note' } } })));
      await page.waitForFunction(() => document.querySelector('#atc-shift-reflection').value === ''); await field.fill('Ninth saved reflection');
      notes = (await dataOf(page)).shiftReflections; assert.equal(Object.keys(notes).length, 8); assert.equal(notes['qa-ninth-note'], 'Ninth saved reflection');
      assert.equal(notes[currentKey], 'Edited current reflection'); assert.equal(notes['qa-note-0'], undefined);
      for (let index = 1; index < 7; index++) assert.equal(notes['qa-note-' + index], initial.shiftReflections['qa-note-' + index]);
    } finally { await page.close(); }
  });
  await check('Reflection and carried-plan controls work at 200 percent zoom in forced colors', async () => {
    const page = await makePage(1280, notedData(), { forcedColors: 'active' });
    try {
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      await page.locator('#atc-reflection-event').selectOption('0'); await fit(page); await axe(page); await capture(page, 'after-debrief-forced-colors-200percent');
      await page.locator('[data-atctower-practice-retry="first_landing"]').click(); const carried = await openCarried(page); await fit(page); await axe(page);
      await capture(page, 'after-carried-plan-forced-colors-200percent', carried); assert.equal((await gameOf(page)).paused, true);
    } finally { await page.close(); }
  });
}

async function main() {
  fixture = await createFixtureServer();
  const sourceFile = path.join(repo, 'stem_lab/stem_tool_atctower.js');
  const initialHash = crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
  results.sourceHash = initialHash;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); await runChecks(); }
  finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  results.completed = new Date().toISOString(); results.passed = results.checks.filter(item => item.pass).length; results.failed = results.checks.filter(item => !item.pass).length;
  results.sourceStable = initialHash === crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');
  fs.writeFileSync(path.join(__dirname, 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, runtimeErrors: results.errors, sourceStable: results.sourceStable }));
  if (results.failed || results.errors.length || !results.sourceStable) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
