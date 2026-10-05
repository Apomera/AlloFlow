const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const results = { started: new Date().toISOString(), fixture: 'Installed Chrome, actual React host and canonical tool. Controls drive all interactions except two explicitly labeled occupancy and math-challenge presentation fixtures. Those fixtures do not claim an actual landing or automatically generated challenge.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
async function check(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  try { const detail = await run(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function pageAt(width = 1440, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  await page.goto(fixture.url);
  await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).waitFor();
  return page;
}
async function start(page, scenario = 'crossing_priority') {
  await page.locator('#stem-atctower-tab-practice').click();
  await page.locator('[data-atctower-practice-start="' + scenario + '"]').click();
  await page.locator('[data-atctower-playing]').waitFor();
}
async function command(page, key) { await page.locator('[data-atctower-command="' + key + '"]').click(); }
async function game(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcGameRef.current))); }
const board = page => page.locator('[data-atctower-runway-plan]');
const arrival = (page, id) => page.locator('[data-atctower-arrival="' + id + '"]');
const pending = (page, id) => page.locator('[data-atctower-pending-arrival="' + id + '"]');
async function order(page) { return board(page).locator('[data-atctower-arrival]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.atctowerArrival))); }
async function fit(page) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  assert.ok(sizes.document <= sizes.viewport + 1, JSON.stringify(sizes));
  return sizes;
}
async function axe(page) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
  assert.deepEqual(violations, []);
}
async function capture(page, name, target = board(page)) {
  const file = path.join(__dirname, name + '.png');
  if (target) await target.screenshot({ path: file }); else { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: file, fullPage: true }); }
  results.screenshots.push(file);
}
async function controlsFocused(page) {
  await page.waitForFunction(() => document.activeElement.id === 'atc-aircraft-controls-title');
  const rect = await page.locator('#atc-aircraft-controls-title').boundingBox();
  assert.ok(rect.y >= -2 && rect.y + rect.height <= 1002, JSON.stringify(rect));
}
async function setSpeed(page, id, speed) {
  await arrival(page, id).click();
  await command(page, 's');
  await page.locator('#atc-command-value').fill(String(speed));
  await page.getByRole('button', { name: 'Send instruction', exact: true }).click();
}
async function checks() {
  for (const width of [1440, 390, 320]) {
    await check('Shared crossing sequence, readable gaps, timeline alignment, and responsive geometry at ' + width + 'px', async () => {
      const page = await pageAt(width);
      try {
        await start(page);
        assert.equal(await board(page).locator('[data-atctower-arrival-group]').count(), 1);
        assert.deepEqual(await order(page), [101, 102]);
        assert.match(await board(page).innerText(), /RWY 27 \+ 18/);
        assert.match(await arrival(page, 101).innerText(), /Priority/);
        assert.match(await page.locator('[data-atctower-arrival-gap="102"]').innerText(), /Review gap.*2\.0 \/ 4\.0/s);
        const geometry = await board(page).evaluate(el => {
          const axis = el.querySelector('.atc-arrival-scale').getBoundingClientRect();
          const rows = [...el.querySelectorAll('[data-atctower-arrival]')].map(button => {
            const rect = button.getBoundingClientRect(), track = button.querySelector('.atc-arrival-track').getBoundingClientRect(), dot = button.querySelector('.atc-arrival-dot').getBoundingClientRect();
            return { width: rect.width, height: rect.height, start: track.left, end: track.right, dot: dot.x + dot.width / 2, label: button.textContent.trim() };
          });
          return { axis: { start: axis.left, end: axis.right }, rows };
        });
        assert.ok(geometry.rows.every(row => row.height >= 44 && row.width >= 44 && Math.abs(row.start - geometry.axis.start) <= 2 && Math.abs(row.end - geometry.axis.end) <= 2 && row.dot >= row.start && row.dot <= row.end), JSON.stringify(geometry));
        assert.ok(geometry.rows[1].dot > geometry.rows[0].dot);
        if (width < 500) assert.ok(await page.locator('canvas').evaluate(el => el.getBoundingClientRect().top + scrollY) < 950);
        await fit(page); await axe(page); await capture(page, 'after-board-' + width); await capture(page, 'after-playing-' + width, null);
        return { geometry, dimensions: await fit(page) };
      } finally { await page.close(); }
    });
  }
  await check('Distance and speed determine the initial order, and hold/release moves the same aircraft between estimated and pending lists', async () => {
    const page = await pageAt(390);
    try {
      await start(page, 'arrival_sequence'); assert.deepEqual(await order(page), [102, 101]);
      await arrival(page, 101).click(); const before = await game(page); await command(page, 'p');
      await pending(page, 101).waitFor(); assert.deepEqual(await order(page), [102]);
      assert.match(await pending(page, 101).innerText(), /Holding.*release the hold/s);
      assert.equal((await game(page)).time, before.time);
      await capture(page, 'after-held-arrival-390');
      await pending(page, 101).click(); await controlsFocused(page); await command(page, 'p');
      await arrival(page, 101).waitFor(); assert.deepEqual(await order(page), [102, 101]); assert.equal(await pending(page, 101).count(), 0);
      return { initialOrder: [102, 101], heldOrder: [102], releasedOrder: await order(page), pausedThroughout: (await game(page)).paused };
    } finally { await page.close(); }
  });
  await check('Unassigned and recovering arrivals explain the missing estimate and rejoin the board after real instructions', async () => {
    const page = await pageAt(320);
    try {
      await start(page, 'first_landing'); assert.equal(await arrival(page, 101).count(), 0);
      assert.match(await pending(page, 101).innerText(), /Assign a runway/);
      await capture(page, 'after-unassigned-320'); await pending(page, 101).click(); await controlsFocused(page); await command(page, 'r');
      await arrival(page, 101).waitFor(); assert.equal(await pending(page, 101).count(), 0);
      await command(page, 'c'); await command(page, 'g'); await pending(page, 101).waitFor();
      assert.match(await pending(page, 101).innerText(), /Going around.*recovery/s); assert.equal(await arrival(page, 101).count(), 0);
      await fit(page); await axe(page); await capture(page, 'after-go-around-320');
      return { state: (await game(page)).aircraft[0].state, pending: await pending(page, 101).innerText() };
    } finally { await page.close(); }
  });
  await check('Independent parallel runways have separate orders and share the same timeline scale', async () => {
    const page = await pageAt();
    try {
      await start(page, 'separation_recovery'); await pending(page, 101).click(); await page.locator('[data-atctower-runway-select]').selectOption('0');
      await pending(page, 102).click(); await page.locator('[data-atctower-runway-select]').selectOption('1');
      const groups = await board(page).locator('[data-atctower-arrival-group]').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.atctowerArrivalGroup, heading: node.querySelector('h4').textContent, aircraft: [...node.querySelectorAll('[data-atctower-arrival]')].map(n => n.dataset.atctowerArrival), axis: node.querySelector('.atc-arrival-scale').textContent })));
      assert.equal(groups.length, 2); assert.deepEqual(groups.map(g => g.aircraft), [['101'], ['102']]); assert.equal(groups[0].axis, groups[1].axis); assert.equal(await board(page).locator('[data-atctower-arrival-gap]').count(), 0);
      await axe(page); await capture(page, 'after-parallel-1440'); return groups;
    } finally { await page.close(); }
  });
  await check('Keyboard inspection moves focus to the correct controls without changing time or instructions', async () => {
    const page = await pageAt(320);
    try {
      await start(page); const button = arrival(page, 102); await button.focus(); await button.press('Tab'); await page.keyboard.press('Shift+Tab');
      const focus = await button.evaluate(el => ({ focused: document.activeElement === el, outline: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
      assert.ok(focus.focused && focus.outline === 'solid' && focus.width >= 2, JSON.stringify(focus));
      const description = await button.getAttribute('aria-describedby'); assert.ok(description); assert.match(await page.locator('#' + description).innerText(), /Review gap/);
      await capture(page, 'after-keyboard-focus-320');
      const before = await game(page); await button.press('Enter'); await controlsFocused(page); const after = await game(page);
      assert.equal(after.selected, 102); assert.equal(after.time, before.time); assert.deepEqual(after.aircraft, before.aircraft); assert.deepEqual(after.decisionLog, before.decisionLog);
      return { focus, selected: after.selected, changesInstructions: false };
    } finally { await page.close(); }
  });
  await check('Estimated and pending arrival controls lock together while an instruction draft preserves its recipient', async () => {
    const page = await pageAt(390);
    try {
      await start(page); await command(page, 'p'); await arrival(page, 102).click(); await command(page, 's');
      const buttons = board(page).locator('[data-atctower-inspect-aircraft]'); assert.equal(await buttons.count(), 2); assert.ok(await buttons.evaluateAll(nodes => nodes.every(node => node.disabled)));
      const before = await game(page); await page.waitForTimeout(250); const after = await game(page);
      assert.equal(after.selected, 102); assert.equal(after.time, before.time); assert.deepEqual(after.aircraft, before.aircraft);
      await page.locator('#atc-command-value').press('Escape'); assert.ok(await buttons.evaluateAll(nodes => nodes.every(node => !node.disabled))); assert.equal((await game(page)).selected, 102);
      return { lockedControls: 2, recipient: after.selected };
    } finally { await page.close(); }
  });
  await check('Real speed changes update estimated order without treating a pending speed target as achieved or forcing priority first', async () => {
    const page = await pageAt();
    try {
      await start(page); const beforeText = await arrival(page, 101).innerText();
      await setSpeed(page, 101, 60); const drafted = await game(page);
      assert.equal(drafted.aircraft[0].speed, 140); assert.equal(drafted.aircraft[0].targetSpeed, 60); assert.equal(await arrival(page, 101).innerText(), beforeText); assert.deepEqual(await order(page), [101, 102]);
      await command(page, 'pause'); await page.waitForFunction(() => window.__atcGameRef.current.aircraft.find(ac => ac.id === 101).speed <= 60); await command(page, 'pause');
      await page.waitForFunction(() => document.querySelector('[data-atctower-arrival]').dataset.atctowerArrival === '102'); assert.deepEqual(await order(page), [102, 101]); assert.match(await arrival(page, 101).innerText(), /Priority/);
      const after = await game(page); assert.equal(after.aircraft[0].speed, 60); assert.ok(after.time > 0); await capture(page, 'after-actual-speed-reorder-1440');
      return { beforeOrder: [101, 102], afterOrder: await order(page), actualSpeed: after.aircraft[0].speed, elapsed: after.time };
    } finally { await page.close(); }
  });
  await check('Occupancy bands and inside-window warnings use flight minutes in a labeled paused presentation fixture', async () => {
    const page = await pageAt(390);
    try {
      await start(page);
      await page.evaluate(() => {
        const g = window.__atcGameRef.current, ac = g.aircraft[0], rwy = ac.assignedRunway;
        g.runwayBusyUntil.intersection = g.time + 2;
        // Place the inbound aircraft one nautical mile before its threshold.
        const vx = Math.sin(rwy.hdg * Math.PI / 180), vy = -Math.cos(rwy.hdg * Math.PI / 180);
        ac.x = rwy.x - vx * (rwy.len / 2 + 3); ac.y = rwy.y - vy * (rwy.len / 2 + 3);
      });
      await board(page).locator('[data-occupied="true"]').waitFor();
      assert.match(await board(page).locator('.atc-arrival-occupancy').innerText(), /4\.0 flight min/);
      assert.equal(await board(page).locator('.atc-arrival-occupied-band').count(), 2);
      assert.match(await page.locator('[data-atctower-arrival-row="101"] .atc-arrival-alert').innerText(), /inside current runway occupancy/);
      assert.equal(await arrival(page, 101).getAttribute('aria-describedby'), 'atc-arrival-occupancy-101');
      const band = await board(page).locator('.atc-arrival-occupied-band').first().evaluate(el => ({ width: el.getBoundingClientRect().width, track: el.parentElement.getBoundingClientRect().width }));
      assert.ok(Math.abs(band.width / band.track - 4 / 15) < .01); await axe(page); await capture(page, 'after-occupancy-diagnostic-390');
      return { diagnostic: true, occupancyShiftSeconds: 2, occupancyFlightMinutes: 4, band };
    } finally { await page.close(); }
  });
  await check('Arrival selection stays locked during a labeled math-challenge fixture', async () => {
    const page = await pageAt();
    try {
      await start(page);
      await page.evaluate(() => { window.__atcGameRef.current.mathChallenge = { type: 'wind_correction', rwyHdg: 270, windDir: 270, windSpd: 10, answer: 0, unit: 'kts', precision: 0, explanation: 'Zero crosswind when aligned.', answered: false, inputBuffer: '' }; });
      await page.locator('[data-atctower-math-challenge]').waitFor(); assert.ok(await board(page).locator('[data-atctower-inspect-aircraft]').evaluateAll(nodes => nodes.length === 2 && nodes.every(node => node.disabled)));
      return { diagnostic: true, lockedControls: 2 };
    } finally { await page.close(); }
  });
  await check('Twelve actual guided aircraft remain reachable in the pending list without horizontal overflow', async () => {
    const page = await pageAt(320);
    try {
      await page.getByRole('button', { name: /O.Hare Challenge/ }).click(); await page.getByRole('radio', { name: /Guided practice/ }).check(); await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).click();
      await page.locator('[data-atctower-playing]').waitFor(); for (let i = 0; i < 11; i++) await command(page, 'add');
      const actual = await game(page); assert.equal(actual.aircraft.length, 12); assert.equal(await board(page).locator('[data-atctower-arrival-group]').count(), 4); assert.equal(await board(page).locator('[data-atctower-pending-arrival]').count(), 12);
      const last = board(page).locator('[data-atctower-pending-arrival]').last(), id = Number(await last.getAttribute('data-atctower-pending-arrival')); await last.focus(); await last.press('Enter'); await controlsFocused(page); assert.equal((await game(page)).selected, id);
      await fit(page); await axe(page); await capture(page, 'after-twelve-pending-320');
      return { aircraft: 12, lastInspected: id, dimensions: await fit(page) };
    } finally { await page.close(); }
  });
  await check('Arrival controls keep visible boundaries and readable high-contrast states', async () => {
    const page = await pageAt();
    try {
      await start(page);
      const contrast = await board(page).locator('[data-atctower-inspect-aircraft]').evaluateAll(nodes => {
        const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        return nodes.map(el => { const s = getComputedStyle(el), border = luminance(s.borderTopColor), background = luminance(s.backgroundColor); return (Math.max(border, background) + .05) / (Math.min(border, background) + .05); });
      });
      assert.ok(contrast.every(ratio => ratio >= 3)); await page.locator('[data-atctower-display-settings] summary').click(); await page.getByRole('button', { name: 'High contrast', exact: true }).click();
      assert.ok(await board(page).locator('.atc-arrival-button').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).backgroundColor === 'rgb(0, 0, 0)')));
      await fit(page); await axe(page); await capture(page, 'after-high-contrast-board'); return { boundaryContrast: contrast };
    } finally { await page.close(); }
  });
  await check('Forced colors at 200 percent zoom preserve timeline markers, pending reasons, and keyboard inspection', async () => {
    const page = await pageAt(1280, { forcedColors: 'active' });
    try {
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await start(page); await command(page, 'p');
      const dots = await board(page).locator('.atc-arrival-dot').evaluateAll(nodes => nodes.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, border: getComputedStyle(el).borderTopStyle })));
      assert.ok(dots.length === 1 && dots.every(dot => dot.width >= 10 && dot.height >= 10 && dot.border === 'solid'));
      await fit(page); await axe(page); await capture(page, 'after-forced-colors-200percent'); await pending(page, 101).focus(); await pending(page, 101).press('Enter'); await controlsFocused(page);
      return { dots, dimensions: await fit(page) };
    } finally { await page.close(); }
  });
}
async function main() {
  fixture = await createFixtureServer();
  const source = path.join(repo, 'stem_lab/stem_tool_atctower.js'), hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  results.sourceHash = hash();
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); await checks(); }
  finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  results.completed = new Date().toISOString(); results.passed = results.checks.filter(c => c.pass).length; results.failed = results.checks.filter(c => !c.pass).length; results.sourceStable = hash() === results.sourceHash;
  fs.writeFileSync(path.join(__dirname, process.argv[2] ? 'targeted-browser-results.json' : 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, errors: results.errors, sourceStable: results.sourceStable }));
  if (!results.checks.length || results.failed || results.errors.length || !results.sourceStable) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
