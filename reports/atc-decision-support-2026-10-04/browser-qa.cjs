const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Installed Chrome with canonical ATC source and React host. Exercise outcomes use actual controls and simulation; browser readback assertions inspect the live game without replacing physics.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
async function check(name, action) {
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function makePage(width = 1440, options = {}, data = null) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  if (data) {
    await page.addInitScript(initial => { window.__qaInitialToolData = initial; }, { atcTower: JSON.parse(JSON.stringify(data)) });
    await page.route(fixture.url, async route => {
      const response = await route.fetch(), source = await response.text();
      const marker = "React.useState({atcTower:{view:'menu'}})";
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
  await page.locator('[data-atctower-exercise="' + id + '"]').waitFor();
}
async function state(page) {
  return page.evaluate(() => {
    const game = window.__atcGameRef.current, ac = game.aircraft.find(item => item.id === game.selected);
    return { paused: game.paused, time: game.time, ac: ac && JSON.parse(JSON.stringify(ac)), practice: JSON.parse(JSON.stringify(game.practice)) };
  });
}
async function fit(page) {
  const detail = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(detail.document <= detail.width + 1, JSON.stringify(detail));
  return detail;
}
async function axe(page) {
  await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(item => ['serious', 'critical'].includes(item.impact)).map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })));
  assert.deepEqual(violations, []);
}
async function screenshot(page, name) {
  const file = path.join(__dirname, name + '.png');
  await page.screenshot({ path: file, fullPage: true }); results.screenshots.push(file);
}
function controlPanel(page) { return page.locator('[data-atctower-aircraft-controls="true"]'); }
async function command(page, key) { await page.locator('[data-atctower-command="' + key + '"]').click(); }
async function send(page, value) {
  await page.locator('#atc-command-value').fill(String(value));
  await page.getByRole('button', { name: 'Send instruction', exact: true }).click();
  await page.locator('[data-atctower-command-entry]').waitFor({ state: 'detached' });
}
async function feedback(page, status, text) {
  const locator = page.locator('[data-atctower-command-feedback][data-feedback-status="' + status + '"]');
  await locator.waitFor(); if (text) assert.match(await locator.innerText(), text);
}
async function log(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcGameRef.current.decisionLog || []))); }

async function main() {
  fixture = await createFixtureServer();
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    await runChecks();
  } finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  results.completed = new Date().toISOString();
  results.passed = results.checks.filter(item => item.pass).length;
  results.failed = results.checks.filter(item => !item.pass).length;
  fs.writeFileSync(path.join(__dirname, 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, runtimeErrors: results.errors }));
  if (results.failed || results.errors.length) process.exitCode = 1;
}

async function runChecks() {
  for (const width of [1440, 390, 320]) {
    await check('Current/target controls and heading/speed previews fit accessibly at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        await start(page); const panel = controlPanel(page); await fit(page);
        assert.match(await panel.locator('[data-atctower-readback-current="altitude"]').innerText(), /5,000 ft/);
        assert.match(await panel.locator('[data-atctower-readback-current="speed"]').innerText(), /90 kt/);
        assert.equal(await panel.locator('[data-atctower-coaching]').count(), 1);
        const order = await panel.evaluate(el => !!(el.querySelector('[data-atctower-coaching]').compareDocumentPosition(el.querySelector('.atc-command-grid')) & Node.DOCUMENT_POSITION_FOLLOWING));
        assert.equal(order, true); await axe(page); await screenshot(page, 'after-playing-' + width);
        await panel.screenshot({ path: path.join(__dirname, 'after-controls-' + width + '.png') });
        await command(page, 'h'); await page.locator('[data-atctower-command-preset="0"]').click();
        await fit(page); await axe(page); await panel.screenshot({ path: path.join(__dirname, 'after-heading-' + width + '.png') });
        const headingWidths = await page.locator('[data-atctower-command-entry="heading"] button').evaluateAll(items => items.map(el => ({ text: el.textContent, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
        assert.ok(headingWidths.every(item => item.height >= 44), JSON.stringify(headingWidths));
        await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await command(page, 's');
        await page.locator('[data-atctower-command-preset="120"]').click(); await fit(page); await axe(page);
        await panel.screenshot({ path: path.join(__dirname, 'after-speed-' + width + '.png') });
        return { width, headingButtonMeasurements: headingWidths };
      } finally { await page.close(); }
    });
  }
  await check('Manual heading altitude and speed instructions retain current values while displaying new targets', async () => {
    const page = await makePage();
    try {
      await start(page); await command(page, 'h'); await send(page, 360); await feedback(page, 'sent', /heading 360/);
      const panel = controlPanel(page); assert.match(await panel.locator('[data-atctower-readback-current="heading"]').innerText(), /270°/);
      assert.match(await panel.locator('[data-atctower-readback-target="heading"]').innerText(), /000°/);
      await command(page, 'u'); assert.match(await panel.locator('[data-atctower-readback-current="altitude"]').innerText(), /5,000 ft/);
      assert.match(await panel.locator('[data-atctower-readback-target="altitude"]').innerText(), /6,000 ft/);
      await command(page, 's'); await send(page, 120); assert.match(await panel.locator('[data-atctower-readback-target="speed"]').innerText(), /120 kt/);
      assert.match(await panel.locator('[data-atctower-readback-current="speed"]').innerText(), /90 kt/);
      assert.equal((await state(page)).ac.targetHeading, 0); assert.equal((await state(page)).ac.targetSpeed, 120);
    } finally { await page.close(); }
  });
  await check('Heading compass and shortest-turn presets preview an instruction without changing aircraft or log', async () => {
    const page = await makePage();
    try {
      await start(page); const before = await state(page), beforeLog = await log(page); await command(page, 'h');
      await page.locator('[data-atctower-command-preset="0"]').click();
      assert.match(await page.locator('[data-atctower-draft-preview="heading"]').innerText(), /Turn right 90°/);
      assert.equal(await page.locator('.atc-preview-compass').count(), 1);
      assert.equal(await page.locator('#atc-command-value').inputValue(), '0');
      await page.locator('#atc-command-value').fill('360');
      assert.match(await page.locator('[data-atctower-draft-preview="heading"]').innerText(), /Turn right 90°/);
      await page.locator('[data-atctower-command-preset="180"]').click();
      assert.match(await page.locator('[data-atctower-draft-preview="heading"]').innerText(), /Turn left 90°/);
      assert.deepEqual((await state(page)).ac, before.ac); assert.deepEqual(await log(page), beforeLog);
    } finally { await page.close(); }
  });
  await check('Invalid draft and Escape preserve the model and restore the initiating command focus', async () => {
    const page = await makePage();
    try {
      await start(page); const before = await state(page); await command(page, 'h');
      await page.locator('#atc-command-value').fill('361'); assert.equal(await page.locator('[data-atctower-draft-preview="invalid"]').count(), 1);
      await page.getByRole('button', { name: 'Send instruction', exact: true }).click();
      assert.equal(await page.locator('[data-atctower-command-entry="heading"]').count(), 1);
      assert.deepEqual((await state(page)).ac, before.ac);
      await page.locator('#atc-command-value').press('Escape');
      await page.locator('[data-atctower-command-entry]').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement.getAttribute('data-atctower-command') === 'h');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-atctower-command')), 'h');
      assert.deepEqual((await state(page)).ac, before.ac);
    } finally { await page.close(); }
  });
  await check('Blocked clearance and repeated runway approach and go-around visibly explain unchanged instructions without duplicate evidence', async () => {
    const page = await makePage();
    try {
      await start(page); const initial = await state(page), initialLog = await log(page);
      await command(page, 'c'); await feedback(page, 'blocked', /runway/i);
      assert.deepEqual((await state(page)).ac, initial.ac); assert.deepEqual(await log(page), initialLog);
      await command(page, 'r'); await feedback(page, 'sent'); let saved = await state(page), savedLog = await log(page);
      await command(page, 'r'); await feedback(page, 'unchanged'); assert.deepEqual((await state(page)).ac, saved.ac); assert.deepEqual(await log(page), savedLog);
      await command(page, 'c'); await feedback(page, 'sent'); saved = await state(page); savedLog = await log(page);
      await command(page, 'c'); await feedback(page, 'unchanged'); assert.deepEqual((await state(page)).ac, saved.ac); assert.deepEqual(await log(page), savedLog);
      await command(page, 'g'); await feedback(page, 'sent'); saved = await state(page); savedLog = await log(page);
      await command(page, 'g'); await feedback(page, 'unchanged'); assert.deepEqual((await state(page)).ac, saved.ac); assert.deepEqual(await log(page), savedLog);
    } finally { await page.close(); }
  });
  await check('Paused approach targets show Guided and heading preview explains cancellation before committing current altitude', async () => {
    const page = await makePage();
    try {
      await start(page); await command(page, 'r'); await command(page, 'c');
      assert.equal(await page.locator('[data-atctower-readback="approach"]').count(), 1);
      assert.match(await page.locator('[data-atctower-readback-target="heading"]').innerText(), /Guided/);
      assert.match(await page.locator('[data-atctower-readback-target="altitude"]').innerText(), /Guided/);
      const before = await state(page); await command(page, 'h'); await page.locator('#atc-command-value').fill('180');
      assert.match(await page.locator('[data-atctower-preview-consequence="approach"]').innerText(), /cancels approach guidance.*5,000 ft/);
      assert.deepEqual((await state(page)).ac, before.ac); await send(page, 180);
      const after = await state(page); assert.equal(after.ac.state, 'inbound'); assert.equal(after.ac.targetAltitude, before.ac.altitude);
      assert.equal(after.ac.targetHeading, 180); assert.equal(await page.locator('[data-atctower-readback="manual"]').count(), 1);
    } finally { await page.close(); }
  });
  await check('Holding defers speed arrival estimates and heading preview releases the hold only on send', async () => {
    const page = await makePage();
    try {
      await start(page); await command(page, 'p'); assert.equal(await page.locator('[data-atctower-readback="hold"]').count(), 1);
      assert.match(await page.locator('[data-atctower-readback-target="heading"]').innerText(), /Guided/);
      await command(page, 's'); assert.equal(await page.locator('[data-atctower-preview-eta]').count(), 0);
      assert.match(await page.locator('[data-atctower-draft-preview="speed"]').innerText(), /deferred during a hold/); await send(page, 120);
      assert.equal((await state(page)).ac.state, 'holding'); await command(page, 'h');
      assert.match(await page.locator('[data-atctower-preview-consequence="hold"]').innerText(), /releases the teaching hold/);
      assert.equal((await state(page)).ac.state, 'holding'); await send(page, 270); assert.equal((await state(page)).ac.state, 'inbound');
    } finally { await page.close(); }
  });
  await check('Go-around readback is numeric and speed preview defers estimates while preserving recovery mode', async () => {
    const page = await makePage();
    try {
      await start(page); await command(page, 'r'); await command(page, 'g');
      assert.equal(await page.locator('[data-atctower-readback="goAround"]').count(), 1);
      assert.match(await page.locator('[data-atctower-readback-target="altitude"]').innerText(), /6,000 ft/);
      await command(page, 's'); assert.equal(await page.locator('[data-atctower-preview-eta]').count(), 0); await send(page, 120);
      assert.equal((await state(page)).ac.state, 'goAround'); assert.equal((await state(page)).ac.targetSpeed, 120);
    } finally { await page.close(); }
  });
  await check('Speed preview qualifies distance divided by speed comparison without confusing it with planned arrival', async () => {
    const page = await makePage();
    try {
      await start(page); const before = await state(page); await command(page, 's'); await page.locator('#atc-command-value').fill('60');
      const eta = await page.locator('[data-atctower-preview-eta]').innerText();
      assert.match(eta, /Direct constant-speed comparison/); assert.match(eta, /Distance ÷ speed to the runway threshold/);
      assert.match(eta, /Acceleration, turns and sequencing change the actual arrival/);
      const minutes = eta.match(/([\d.]+) → ([\d.]+) flight min/); assert.ok(minutes, eta); assert.ok(Number(minutes[2]) > Number(minutes[1]));
      assert.deepEqual((await state(page)).ac, before.ac);
      assert.match(await page.locator('[data-atctower-preview-consequence="speed"]').innerText(), /new approach clearance sets/);
    } finally { await page.close(); }
  });
  await check('Real final approach shows automatic targets and speed stays on final while a heading ends guidance', async () => {
    const page = await makePage();
    try {
      await start(page); await command(page, 'r'); await command(page, 'c'); await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      await page.waitForFunction(() => window.__atcGameRef.current.aircraft[0].approachStage === 'final', null, { timeout: 40000 });
      assert.match(await page.locator('[data-atctower-readback-target="heading"]').innerText(), /Auto/);
      await page.getByRole('button', { name: 'Pause shift', exact: true }).click(); await command(page, 's');
      assert.equal(await page.locator('[data-atctower-preview-consequence="approach"]').count(), 0); await send(page, 120);
      const speed = await state(page); assert.equal(speed.ac.state, 'approach'); assert.equal(speed.ac.approachStage, 'final'); assert.equal(speed.ac.targetSpeed, 120);
      await command(page, 'h'); assert.equal(await page.locator('[data-atctower-preview-consequence="approach"]').count(), 1); await send(page, 180);
      const heading = await state(page); assert.equal(heading.ac.state, 'inbound'); assert.equal(heading.ac.targetAltitude, speed.ac.altitude);
      return { actualFinalAltitude: speed.ac.altitude, speedTarget: speed.ac.targetSpeed };
    } finally { await page.close(); }
  });
  await check('Draft locks flight-strip selection and preserves the addressed aircraft through send', async () => {
    const page = await makePage(390);
    try {
      await start(page, 'arrival_sequence'); await page.locator('[data-atctower-aircraft="101"]').click();
      await command(page, 'h'); const before = await state(page); assert.equal(before.ac.callsign, 'NEAR101');
      assert.equal(await page.locator('[data-atctower-aircraft="102"]').isDisabled(), true);
      assert.equal(await page.locator('[data-atctower-jump-controls]').isDisabled(), true); assert.equal(await page.locator('[data-atctower-jump-radar]').isDisabled(), true);
      await send(page, 180); assert.equal((await state(page)).ac.callsign, 'NEAR101');
      await page.locator('[data-atctower-aircraft="102"]').click(); assert.equal((await state(page)).ac.callsign, 'FAST102');
    } finally { await page.close(); }
  });
  await check('Mobile navigation focuses and scrolls between radar and commands with keyboard follow-through', async () => {
    const page = await makePage(320);
    try {
      await start(page); await page.locator('[data-atctower-jump-controls]').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'atc-aircraft-controls-title');
      const heading = await page.locator('#atc-aircraft-controls-title').boundingBox(); assert.ok(heading.y >= -1 && heading.y < 150, JSON.stringify(heading));
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-atctower-jump-radar')), 'true');
      await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.tagName), 'CANVAS');
      const canvas = await page.locator('canvas').boundingBox(); assert.ok(canvas.y >= -1 && canvas.y < 150, JSON.stringify(canvas));
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-atctower-jump-controls')), 'true');
      await fit(page);
    } finally { await page.close(); }
  });
  await check('Decision form remains usable at 200 percent zoom and in forced colors with reduced motion', async () => {
    const page = await makePage(1280, { forcedColors: 'active' });
    try {
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await start(page); await command(page, 'h');
      await page.locator('[data-atctower-command-preset="0"]').click(); await fit(page); await axe(page);
      assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches && matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      await controlPanel(page).screenshot({ path: path.join(__dirname, 'after-heading-forced-colors-200percent.png') });
      assert.equal(await page.locator('#atc-command-value').inputValue(), '0'); await send(page, 0); await feedback(page, 'sent');
    } finally { await page.close(); }
  });
  await check('Debrief evidence filters retain chronology include recovery in both relevant views and reset for another attempt', async () => {
    const page = await makePage(390);
    try {
      await start(page); await command(page, 'r'); await command(page, 'c'); await command(page, 'g'); await command(page, 's'); await send(page, 120);
      const evidence = await log(page); await page.getByRole('button', { name: 'End shift', exact: true }).click(); await page.locator('[data-atctower-debrief]').waitFor();
      const filter = page.locator('[data-atctower-evidence-filter]'), events = page.locator('[data-atctower-evidence-events] li');
      assert.equal(await filter.inputValue(), 'all'); assert.equal(await events.count(), evidence.length);
      await filter.selectOption('instructions'); const instructions = evidence.filter(e => ['command','goAround'].includes(e.type));
      assert.equal(await events.count(), instructions.length); assert.ok((await events.allInnerTexts()).some(text => /go around/i.test(text)));
      await filter.selectOption('outcomes'); const outcomes = evidence.filter(e => ['landing','missed','fuel','conflict','exercise','goAround'].includes(e.type));
      assert.equal(await events.count(), outcomes.length); assert.ok((await events.allInnerTexts()).some(text => /go around/i.test(text)));
      await filter.selectOption('math'); assert.equal(await events.count(), 0); assert.equal(await page.locator('[data-atctower-evidence-empty]').count(), 1);
      await filter.selectOption('all'); const all = await events.allInnerTexts();
      assert.deepEqual(all.map(text => text.replace(/^\d+:\d+ · /, '')), evidence.map(e => e.text));
      await fit(page); await axe(page); await screenshot(page, 'after-filtered-debrief-390');
      await filter.selectOption('instructions'); await page.locator('[data-atctower-practice-retry="first_landing"]').click();
      await page.locator('[data-atctower-playing]').waitFor(); await page.getByRole('button', { name: 'End shift', exact: true }).click();
      await page.locator('[data-atctower-debrief]').waitFor();
      await page.waitForFunction(() => document.querySelector('[data-atctower-evidence-filter]').value === 'all');
      assert.equal(await page.locator('[data-atctower-evidence-filter]').inputValue(), 'all');
    } finally { await page.close(); }
  });
  await check('Speed presets are valid unique sorted and include the selected aircraft approach speed', async () => {
    const page = await makePage(320);
    try {
      await start(page, 'crossing_priority'); await page.locator('[data-atctower-aircraft="101"]').click(); await command(page, 's');
      const values = await page.locator('[data-atctower-command-preset]').evaluateAll(items => items.map(item => Number(item.getAttribute('data-atctower-command-preset'))));
      assert.deepEqual(values, [90,120,140,180]); assert.equal(values.length, new Set(values).size);
      assert.ok(values.every(value => value >= 60 && value <= 250)); const before = await state(page);
      await page.locator('[data-atctower-command-preset="140"]').click(); assert.equal(await page.locator('#atc-command-value').inputValue(), '140');
      assert.deepEqual((await state(page)).ac, before.ac); await fit(page);
      await controlPanel(page).screenshot({ path: path.join(__dirname, 'after-priority-speed-320.png') });
    } finally { await page.close(); }
  });
  await check('Live traffic freezes during preview without changing the pause setting and resumes after cancellation', async () => {
    const page = await makePage();
    try {
      await start(page); await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      await page.waitForFunction(() => window.__atcGameRef.current.time > 0.1); await command(page, 'h');
      await page.waitForTimeout(100); const before = await state(page); assert.equal(before.paused, false);
      await page.locator('[data-atctower-command-preset="0"]').click(); await page.waitForTimeout(250); const frozen = await state(page);
      assert.equal(frozen.time, before.time); assert.deepEqual(frozen.ac, before.ac);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.waitForFunction(time => window.__atcGameRef.current.time > time, before.time); assert.equal((await state(page)).paused, false);
    } finally { await page.close(); }
  });
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
