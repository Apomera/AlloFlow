const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Chrome, canonical ATC source, actual React host contract, and test-only access to game state. Real-time completion tests issue the learner controls.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
const selectedChecks = process.argv.includes('--debug') ? /One arrival|Completed exercise|completed exercise debrief|Untreated|Lesson/ : null;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const clone = value => JSON.parse(JSON.stringify(value));
async function check(name, action) {
  if (selectedChecks && !selectedChecks.test(name)) return;
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function makePage(data, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1100 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected dialog: ' + dialog.message()); await dialog.dismiss(); });
  if (data) {
    await page.addInitScript(initial => { window.__qaInitialToolData = initial; }, { atcTower: clone(data) });
    await page.route(fixture.url, async route => {
      const response = await route.fetch();
      const source = await response.text();
      const marker = "React.useState({atcTower:{view:'menu'}})";
      assert.ok(source.includes(marker), 'Fixture initial-state marker missing');
      await route.fulfill({ response, body: source.replace(marker, "React.useState(window.__qaInitialToolData || {atcTower:{view:'menu'}})") });
    });
  }
  await page.goto(fixture.url);
  return page;
}
async function dataOf(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); }
async function gameOf(page) { return page.evaluate(() => {
  const game = window.__atcGameRef.current;
  return { shiftId: game.shiftId, mode: game.trainingMode, time: game.time, paused: game.paused, landed: game.landed, conflicts: game.conflictEpisodes, goArounds: game.goArounds, practice: game.practice,
    aircraft: game.aircraft.map(ac => ({ id: ac.id, callsign: ac.callsign, x: ac.x, y: ac.y, heading: ac.heading, altitude: ac.altitude, speed: ac.speed, state: ac.state, targetAltitude: ac.targetAltitude, runway: ac.assignedRunway && ac.assignedRunway.name })) };
}); }
async function start(page, id) {
  await page.locator('#stem-atctower-tab-practice').click();
  await page.locator('[data-atctower-practice-start="' + id + '"]').click();
  await page.locator('[data-atctower-playing]').waitFor();
  await page.locator('[data-atctower-exercise="' + id + '"]').waitFor();
}
async function fit(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal document overflow'); }
async function axe(page) {
  await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('main'))).violations.filter(item => ['serious', 'critical'].includes(item.impact)).map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })));
  assert.deepEqual(violations, []);
}
async function screenshot(page, name) {
  const file = path.join(__dirname, name + '.png'); await page.screenshot({ path: file, fullPage: true }); results.screenshots.push(file);
}

(async () => {
  fixture = await createFixtureServer();
  let completeData, incompleteData;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });

    await check('Four purposeful exercises expose paused deterministic rosters and measurable criteria', async () => {
      const summaries = [];
      for (const id of ['first_landing', 'arrival_sequence', 'separation_recovery', 'crossing_priority']) {
        const page = await makePage();
        try {
          await start(page, id);
          const game = await gameOf(page);
          assert.equal(game.paused, true); assert.equal(game.mode, 'guided'); assert.equal(game.time, 0);
          assert.equal(game.practice.id, id); assert.equal(game.practice.completed, false);
          assert.deepEqual(game.aircraft.map(ac => ac.id), id === 'first_landing' ? [101] : [101, 102]);
          assert.equal(await page.getByRole('button', { name: 'Add next aircraft', exact: true }).count(), 0);
          assert.equal(await page.locator('[data-atctower-exercise="' + id + '"]').getAttribute('data-exercise-status'), 'in-progress');
          assert.ok(await page.locator('[data-atctower-exercise-criterion]').count() >= 3);
          const before = await gameOf(page); await sleep(400); assert.deepEqual(await gameOf(page), before);
          summaries.push({ id, criteria: await page.locator('[data-atctower-exercise-criterion]').count(), roster: game.aircraft.map(ac => ac.callsign) });
        } finally { await page.close(); }
      }
      return summaries;
    });

    await check('One arrival completes by actual runway assignment, clearance, descent, and touchdown', async () => {
      const page = await makePage();
      try {
        await start(page, 'first_landing');
        await page.locator('[data-atctower-command="r"]').click();
        await page.getByRole('button', { name: 'Clear approach', exact: true }).click();
        assert.match(await page.locator('[data-atctower-coaching]').innerText(), /entry|capture|final/i);
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.practice.completed === true, null, { timeout: 40000 });
        const game = await gameOf(page);
        assert.equal(game.paused, true); assert.equal(game.landed, 1); assert.equal(game.conflicts, 0);
        assert.deepEqual(game.practice.landedIds, [101]); assert.deepEqual(game.practice.lostIds, []);
        assert.ok(game.time > 1 && game.time < 15, JSON.stringify(game));
        await page.waitForFunction(() => document.querySelector('[data-atctower-exercise]')?.dataset.exerciseStatus === 'complete');
        assert.equal(await page.locator('[data-atctower-exercise-criterion][data-complete="false"]').count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Resume shift', exact: true }).isDisabled(), true);
        const terminal = await gameOf(page);
        const radar = page.getByRole('application'); await radar.focus();
        for (const key of ['g', 'h', 'Space']) await radar.press(key);
        assert.deepEqual(await gameOf(page), terminal);
        assert.equal(await page.locator('[data-atctower-command-entry]').count(), 0);
        const before = await gameOf(page); await sleep(500); assert.deepEqual(await gameOf(page), before);
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        await page.waitForFunction(() => window.__atcToolData.atcTower.activeShift?.practice?.completed === true);
        completeData = await dataOf(page);
        assert.deepEqual(completeData.activeShift.practice.landedIds, [101]);
        assert.equal(completeData.activeShift.aircraft.length, 0);
        await screenshot(page, 'exercise-complete-desktop');
        return { touchdownShiftSeconds: game.time, landedIds: game.practice.landedIds, pausedAtCompletion: true };
      } finally { await page.close(); }
    });

    await check('Completed exercise remount preserves outcomes after the landed aircraft leaves its draft', async () => {
      assert.ok(completeData, 'Previous real-time landing did not provide a completed draft');
      const page = await makePage(completeData, 390);
      try {
        await page.locator('[data-atctower-exercise="first_landing"][data-exercise-status="complete"]').waitFor();
        const game = await gameOf(page);
        assert.equal(game.paused, true); assert.equal(game.aircraft.length, 0);
        assert.deepEqual(game.practice.landedIds, [101]); assert.equal(game.practice.completed, true);
        assert.equal(await page.getByRole('button', { name: 'Resume shift', exact: true }).isDisabled(), true);
        await sleep(400); assert.deepEqual(await gameOf(page), game);
        await fit(page);
      } finally { await page.close(); }
    });

    await check('The completed exercise debrief retains each criterion and retries fresh paused seeds', async () => {
      assert.ok(completeData, 'Missing completed draft');
      const page = await makePage(completeData);
      try {
        await page.locator('[data-atctower-playing]').waitFor();
        await page.getByRole('button', { name: 'End shift', exact: true }).click();
        await page.locator('[data-atctower-debrief]').waitFor();
        const ended = await dataOf(page);
        assert.equal(ended.activeShift, null); assert.equal(ended.lastShift.exerciseResult.complete, true);
        assert.equal(ended.lastShift.exerciseResult.failed, false);
        assert.equal(ended.lastShift.exerciseResult.checks.every(item => item.done), true);
        assert.equal(await page.locator('[data-atctower-exercise]').getAttribute('data-exercise-status'), 'complete');
        await page.locator('[data-atctower-practice-retry="first_landing"]').click();
        await page.locator('[data-atctower-playing]').waitFor();
        const retry = await gameOf(page);
        assert.notEqual(retry.shiftId, ended.lastShift.shiftId); assert.equal(retry.paused, true); assert.equal(retry.time, 0);
        assert.equal(retry.aircraft[0].altitude, 5000); assert.equal(retry.aircraft[0].state, 'inbound');
        assert.deepEqual(retry.practice.landedIds, []); assert.equal(retry.practice.completed, false);
        assert.equal((await dataOf(page)).shiftHistory.length, 1);
      } finally { await page.close(); }
    });

    await check('A progressive climb protects the converging tracks and auto-pauses after six shift seconds', async () => {
      const page = await makePage();
      try {
        await start(page, 'separation_recovery');
        await page.locator('[data-atctower-command="u"]').click();
        assert.equal((await gameOf(page)).aircraft[0].targetAltitude, 6000);
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.practice.completed === true, null, { timeout: 25000 });
        const game = await gameOf(page);
        assert.equal(game.paused, true); assert.equal(game.conflicts, 0);
        assert.ok(game.time >= 6 && game.time < 6.2, JSON.stringify(game));
        assert.equal(Math.abs(game.aircraft[0].altitude - game.aircraft[1].altitude), 1000);
        assert.deepEqual(game.practice.lostIds, []);
        await page.waitForFunction(() => document.querySelector('[data-atctower-exercise]')?.dataset.exerciseStatus === 'complete');
        assert.equal(await page.getByRole('button', { name: 'Resume shift', exact: true }).isDisabled(), true);
        const terminal = await gameOf(page);
        const radar = page.getByRole('application'); await radar.focus();
        for (const key of ['g', 'h', 'Space']) await radar.press(key);
        assert.deepEqual(await gameOf(page), terminal);
        assert.equal(await page.locator('[data-atctower-command-entry]').count(), 0);
        return { protectedShiftSeconds: game.time, finalVerticalFeet: 1000, conflictEpisodes: 0 };
      } finally { await page.close(); }
    });

    await check('Untreated converging traffic records a real alert and cannot complete after a later climb', async () => {
      const page = await makePage();
      try {
        await start(page, 'separation_recovery');
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.conflictEpisodes > 0, null, { timeout: 8000 });
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        await page.locator('[data-atctower-command="u"]').click();
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        try { await page.waitForFunction(() => window.__atcGameRef.current.time >= 6, null, { timeout: 20000 }); }
        catch (error) { console.error('UNTREATED_STATE ' + JSON.stringify(await gameOf(page))); throw error; }
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        const game = await gameOf(page);
        assert.equal(game.practice.completed, false); assert.ok(game.conflicts >= 1);
        await page.waitForFunction(() => document.querySelector('[data-atctower-exercise]')?.dataset.exerciseStatus === 'review');
        assert.match(await page.locator('[data-atctower-exercise]').innerText(), /alert occurred|act earlier/i);
        await page.locator('[data-atctower-practice-retry="separation_recovery"]').click();
        await page.waitForFunction(id => window.__atcGameRef.current.shiftId !== id && window.__atcGameRef.current.practice?.id === 'separation_recovery', game.shiftId);
        const retry = await gameOf(page);
        assert.equal(retry.paused, true); assert.equal(retry.time, 0); assert.equal(retry.conflicts, 0);
        assert.deepEqual(retry.practice.landedIds, []); assert.deepEqual(retry.practice.lostIds, []);
        assert.deepEqual(retry.aircraft.map(ac => ac.altitude), [5000, 5000]);
        const ended = await dataOf(page);
        assert.equal(ended.shiftHistory.length, 1);
        const result = ended.lastShift.exerciseResult;
        assert.equal(result.failed, true); assert.equal(result.complete, false);
      } finally { await page.close(); }
    });

    await check('A saved completion claim cannot skip auto-pause when measured objectives are actually reached', async () => {
      const seed = await makePage();
      let claimedData;
      try {
        await start(seed, 'separation_recovery');
        await seed.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        await seed.waitForFunction(() => window.__atcToolData.atcTower.activeShift?.practice?.id === 'separation_recovery');
        claimedData = await dataOf(seed);
        claimedData.activeShift.practice.completed = true;
        claimedData.activeShift.practice.completedAt = 0;
      } finally { await seed.close(); }
      const page = await makePage(claimedData);
      try {
        await page.locator('[data-atctower-exercise="separation_recovery"][data-exercise-status="in-progress"]').waitFor();
        await page.locator('[data-atctower-command="u"]').click();
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.locator('[data-atctower-exercise="separation_recovery"][data-exercise-status="complete"]').waitFor({ timeout: 25000 });
        const game = await gameOf(page);
        assert.equal(game.paused, true); assert.equal(game.practice.completed, true);
        assert.ok(game.practice.completedAt >= 6, JSON.stringify(game.practice));
      } finally { await page.close(); }
    });

    await check('Early End shift preserves unfinished criteria without claiming completion', async () => {
      const page = await makePage();
      try {
        await start(page, 'arrival_sequence');
        await page.getByRole('button', { name: 'End shift', exact: true }).click();
        await page.locator('[data-atctower-debrief]').waitFor();
        incompleteData = await dataOf(page);
        assert.equal(incompleteData.lastShift.exerciseResult.complete, false); assert.equal(incompleteData.lastShift.exerciseResult.failed, false);
        assert.equal(incompleteData.lastShift.exerciseResult.checks.find(item => item.id === 'landings').done, false);
        assert.equal(incompleteData.lastShift.exerciseResult.checks.find(item => item.id === 'order').done, false);
        assert.equal(await page.locator('[data-atctower-exercise]').getAttribute('data-exercise-status'), 'in-progress');
      } finally { await page.close(); }
    });

    await check('Wrong arrival order from an actual touchdown cannot be overridden by a completion claim', async () => {
      const page = await makePage();
      try {
        await start(page, 'arrival_sequence');
        await page.locator('[data-atctower-aircraft="102"]').click();
        await page.getByRole('button', { name: 'Hold', exact: true }).click();
        await page.locator('[data-atctower-aircraft="101"]').click();
        await page.getByRole('button', { name: 'Clear approach', exact: true }).click();
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.practice.landedIds.includes(101), null, { timeout: 40000 });
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        assert.deepEqual((await gameOf(page)).practice.landedIds, [101]);
        await page.waitForFunction(() => document.querySelector('[data-atctower-exercise]')?.dataset.exerciseStatus === 'review');
        assert.match(await page.locator('[data-atctower-exercise]').innerText(), /order differed/i);
        await page.evaluate(() => { const g = window.__atcGameRef.current; g.practice.landedIds.push(102); g.practice.completed = true; g.landed = 2; });
        await sleep(400);
        assert.equal(await page.locator('[data-atctower-exercise]').getAttribute('data-exercise-status'), 'review');
        await page.getByRole('button', { name: 'End shift', exact: true }).click();
        const result = (await dataOf(page)).lastShift.exerciseResult;
        assert.equal(result.failed, true); assert.equal(result.complete, false);
        assert.equal(result.checks.find(item => item.id === 'order').done, false);
      } finally { await page.close(); }
    });

    for (const width of [390, 320]) {
      await check('Practice menu fits ' + width + ' pixels and passes axe serious/critical checks', async () => {
        const page = await makePage(null, width);
        try {
          await page.locator('#stem-atctower-tab-practice').click(); await fit(page); await axe(page);
          assert.equal(await page.locator('[data-atctower-practice-start]').count(), 4);
          await screenshot(page, 'practice-menu-' + width);
        } finally { await page.close(); }
      });
      await check('Exercise controls fit ' + width + ' pixels with matching visual and document order', async () => {
        const page = await makePage(null, width);
        try {
          await start(page, 'crossing_priority'); await fit(page); await axe(page);
          const order = await page.evaluate(() => {
            const radar = document.querySelector('canvas');
            const controls = document.querySelector('#atc-aircraft-controls-title').closest('section');
            const review = document.querySelector('[data-atctower-coaching]');
            return { follows: [!!(radar.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING), !!(controls.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING)], top: [radar, controls, review].map(node => node.getBoundingClientRect().top) };
          });
          assert.deepEqual(order.follows, [true, true]); assert.ok(order.top[0] < order.top[1] && order.top[1] < order.top[2], JSON.stringify(order));
          await screenshot(page, 'practice-playing-' + width);
        } finally { await page.close(); }
      });
      await check('Exercise debrief fits ' + width + ' pixels and retains unfinished criteria accessibly', async () => {
        assert.ok(incompleteData, 'Missing early-End debrief');
        const page = await makePage(incompleteData, width);
        try {
          await page.locator('[data-atctower-debrief]').waitFor(); await fit(page); await axe(page);
          assert.ok(await page.locator('[data-atctower-exercise-criterion][data-complete="false"]').count() > 0);
          await screenshot(page, 'practice-debrief-' + width);
        } finally { await page.close(); }
      });
    }

    await check('Heading and speed forms focus their own input, freeze traffic, and return focus to their command', async () => {
      const page = await makePage();
      try {
        await start(page, 'first_landing');
        for (const [kind, command, value, expected] of [['heading', 'h', '360', 0], ['speed', 's', '100', 100]]) {
          await page.locator('[data-atctower-command="' + command + '"]').click();
          const form = page.locator('[data-atctower-command-entry="' + kind + '"]');
          const input = form.getByRole('spinbutton');
          await page.waitForFunction(key => {
            const form = document.querySelector('[data-atctower-command-entry="' + key + '"]');
            return form && form.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
          }, kind);
          const before = await gameOf(page); await sleep(400); assert.deepEqual(await gameOf(page), before);
          await input.fill(value);
          await form.getByRole('button', { name: 'Send instruction', exact: true }).click();
          await page.waitForFunction(key => document.activeElement?.getAttribute('data-atctower-command') === key, command);
          const target = await page.evaluate(key => window.__atcGameRef.current.aircraft[0][key === 'heading' ? 'targetHeading' : 'targetSpeed'], kind);
          assert.equal(target, expected);
        }
      } finally { await page.close(); }
    });

    await check('Coaching follows approach entry, final, holding, and go-around phases', async () => {
      const page = await makePage();
      try {
        await start(page, 'first_landing');
        const coaching = page.locator('[data-atctower-coaching]');
        assert.match(await coaching.innerText(), /assign.*runway/i);
        await page.locator('[data-atctower-command="r"]').click();
        await page.getByRole('button', { name: 'Clear approach', exact: true }).click();
        await page.waitForFunction(() => /entry point/.test(document.querySelector('[data-atctower-coaching]')?.textContent));
        await page.evaluate(() => { window.__atcGameRef.current.aircraft[0].approachStage = 'final'; });
        await page.waitForFunction(() => /on final/.test(document.querySelector('[data-atctower-coaching]')?.textContent));
        assert.match(await coaching.innerText(), /cancels approach guidance/i);
        await page.getByRole('button', { name: 'Go around', exact: true }).click();
        await page.waitForFunction(() => /gain altitude/.test(document.querySelector('[data-atctower-coaching]')?.textContent));
        await page.getByRole('button', { name: 'Hold', exact: true }).click();
        await page.waitForFunction(() => /deliberately holding/.test(document.querySelector('[data-atctower-coaching]')?.textContent));
        assert.match(await coaching.innerText(), /uses fuel/i);
      } finally { await page.close(); }
    });

    await check('Manual heading cancellation of approach replaces the old descent with current-altitude hold', async () => {
      const page = await makePage();
      try {
        await start(page, 'first_landing');
        await page.locator('[data-atctower-command="r"]').click();
        await page.getByRole('button', { name: 'Clear approach', exact: true }).click();
        await page.evaluate(() => {
          const ac = window.__atcGameRef.current.aircraft[0];
          ac.approachStage = 'final'; ac.altitude = 4200; ac.targetAltitude = 1500;
        });
        await page.getByRole('button', { name: 'Set heading', exact: true }).click();
        const form = page.locator('[data-atctower-command-entry="heading"]');
        await form.getByRole('spinbutton').fill('180');
        await form.getByRole('button', { name: 'Send instruction', exact: true }).click();
        const canceled = await page.evaluate(() => {
          const ac = window.__atcGameRef.current.aircraft[0];
          return { state: ac.state, stage: ac.approachStage, targetHeading: ac.targetHeading, targetAltitude: ac.targetAltitude, altitude: ac.altitude };
        });
        assert.deepEqual(canceled, { state: 'inbound', stage: null, targetHeading: 180, targetAltitude: 4200, altitude: 4200 });
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.time >= 0.4, null, { timeout: 10000 });
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        assert.equal((await gameOf(page)).aircraft[0].altitude, 4200);
      } finally { await page.close(); }
    });

    await check('Lesson links open the matching exercise and Back restores the lesson card focus', async () => {
      const mappings = { separation: 'separation_recovery', sequencing: 'arrival_sequence', vectors: 'first_landing', communication: 'first_landing', weather: null };
      for (const [lesson, scenario] of Object.entries(mappings)) {
        const page = await makePage();
        try {
          await page.getByRole('tab', { name: /Lessons/ }).click();
          await page.locator('[data-atctower-lesson="' + lesson + '"]').click();
          const view = page.locator('[data-atctower-lesson-view]');
          await view.waitFor();
          await page.waitForFunction(() => document.activeElement?.hasAttribute('data-atctower-lesson-view'));
          await view.getByRole('button', { name: /Back/ }).click();
          await page.waitForFunction(key => document.activeElement?.getAttribute('data-atctower-lesson') === key, lesson);
          assert.equal(await page.getByRole('tab', { name: /Lessons/ }).getAttribute('aria-selected'), 'true', 'Back must select Lessons for ' + lesson);
          await page.locator('[data-atctower-lesson="' + lesson + '"]').click();
          await page.locator('[data-atctower-lesson-practice="' + lesson + '"]').click();
          if (scenario) {
            await page.locator('[data-atctower-exercise="' + scenario + '"]').waitFor();
            assert.equal((await gameOf(page)).paused, true);
          } else {
            assert.equal(await page.locator('#stem-atctower-tab-practice').getAttribute('aria-selected'), 'true', 'Weather CTA must select Practice');
            assert.equal(await page.locator('[data-atctower-practice-start]').count(), 4);
          }
        } finally { await page.close(); }
      }
      return mappings;
    });

    await check('No uncaught runtime errors or native dialogs throughout purposeful practice', async () => assert.deepEqual(results.errors, []));
  } catch (error) { results.errors.push(error.stack); console.error(error); }
  finally {
    results.finished = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, selectedChecks ? 'browser-qa-debug-results.json' : 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
    if (browser) await browser.close();
    await new Promise(resolve => fixture.server.close(resolve));
    process.exitCode = results.errors.length || results.checks.some(item => !item.pass) ? 1 : 0;
  }
})();
