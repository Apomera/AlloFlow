const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const reportDir = __dirname;
const results = { started: new Date().toISOString(), fixture: 'Real Chrome with canonical ATC source, React host contract, and test-only gameRef access.', checks: [], errors: [] };
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function check(name, action) {
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function setAircraft(page, overrides = {}) {
  const openEntry = page.locator('[data-atctower-command-entry]');
  if (await openEntry.count()) await openEntry.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate((patch) => {
    const game = window.__atcGameRef.current;
    const template = game.aircraft[0];
    const aircraft = Object.assign({}, template, {
      id: 901, callsign: 'Quality 901', x: 300, y: 200, heading: 270, altitude: 5000,
      speed: 90, targetHeading: null, targetSpeed: null, targetAltitude: null,
      state: 'inbound', assignedRunway: null, approachStage: null, touchdownReady: false,
      holdCenter: null, fuel: 40, fuelWarningIssued: false, emergency: null, trail: []
    }, patch);
    if (patch.runwayIndex != null) aircraft.assignedRunway = game.airport.runways[patch.runwayIndex];
    delete aircraft.runwayIndex;
    game.paused = true; game.aircraft = [aircraft]; game.selected = 901;
    game.nextSpawn = 1000; game.mathChallenge = null; game.gameOver = false;
    game.conflicts = 0; game.conflictEpisodes = 0; game.conflictPairKeys = {};
  }, overrides);
  await page.locator('[data-atctower-aircraft="901"]').waitFor();
  await sleep(320);
}
async function submitNumber(page, kind, value) {
  const form = page.locator('[data-atctower-command-entry="' + kind + '"]');
  await form.getByRole('spinbutton').fill(value);
  await form.evaluate((element) => element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
async function capture(page) {
  return page.evaluate(() => {
    const game = window.__atcGameRef.current;
    const aircraft = game.aircraft.find((item) => item.id === 901);
    return { time: game.time, x: aircraft.x, y: aircraft.y, altitude: aircraft.altitude, fuel: aircraft.fuel };
  });
}

(async () => {
  fs.mkdirSync(reportDir, { recursive: true });
  const fixture = await createFixtureServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => results.errors.push(error.message));
    page.on('dialog', async (dialog) => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
    await page.goto(fixture.url);
    await check('Guided practice starts paused and only adds arrivals when requested', async () => {
      const guided = await browser.newPage({ viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce' });
      guided.on('pageerror', (error) => results.errors.push(error.message));
      try {
        await guided.goto(fixture.url);
        await guided.locator('[data-atctower-training-mode]').getByRole('radio', { name: /Guided practice/ }).check();
        await guided.getByRole('button', { name: 'Start Tower Shift', exact: true }).click();
        await guided.locator('[data-atctower-playing]').waitFor();
        const initial = await guided.evaluate(() => {
          const g = window.__atcGameRef.current; g.nextSpawn = 0;
          return { mode: g.trainingMode, paused: g.paused, traffic: g.aircraft.length };
        });
        assert.equal(initial.mode, 'guided'); assert.equal(initial.paused, true);
        await guided.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await sleep(600);
        assert.equal(await guided.evaluate(() => window.__atcGameRef.current.aircraft.length), initial.traffic);
        await guided.getByRole('button', { name: 'Add next aircraft', exact: true }).click();
        assert.equal(await guided.evaluate(() => window.__atcGameRef.current.aircraft.length), initial.traffic + 1);
        await guided.evaluate(() => { const g = window.__atcGameRef.current; g.conflicts = 16; });
        await sleep(350); assert.equal(await guided.evaluate(() => window.__atcGameRef.current.gameOver), false);
        assert.ok(await guided.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        return initial;
      } finally { await guided.close(); }
    });
    await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).click();
    await page.locator('[data-atctower-playing]').waitFor();

    await check('Speed form freezes all flight state and validates the full teaching range', async () => {
      await setAircraft(page);
      await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      await page.getByRole('button', { name: 'Set speed', exact: true }).click();
      const before = await capture(page); await sleep(500); const after = await capture(page);
      assert.deepEqual(after, before);
      for (const invalid of ['59', '251', '120.5', '']) {
        await submitNumber(page, 'speed', invalid);
        assert.equal(await page.evaluate(() => window.__atcGameRef.current.aircraft[0].targetSpeed), null, invalid);
        assert.equal(await page.locator('[data-atctower-command-entry="speed"]').count(), 1);
      }
      await submitNumber(page, 'speed', '145');
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.aircraft[0].targetSpeed), 145);
      await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
      return { invalidValues: [59, 251, 120.5, ''], assigned: 145 };
    });

    await check('Heading 360 normalizes to north and restores focus after the form closes', async () => {
      await setAircraft(page);
      await page.getByRole('button', { name: 'Set heading', exact: true }).click();
      await submitNumber(page, 'heading', '360');
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.aircraft[0].targetHeading), 0);
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-atctower-command') === 'h');
    });

    await check('Manual climb cancels automatic descent and then stacks manual altitude steps', async () => {
      await setAircraft(page, { state: 'approach', approachStage: 'final', runwayIndex: 0, targetAltitude: 1200 });
      await page.getByRole('button', { name: 'Climb 1,000 ft', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => {
        const a = window.__atcGameRef.current.aircraft[0]; return { state: a.state, target: a.targetAltitude };
      }), { state: 'inbound', target: 6000 });
      await page.getByRole('button', { name: 'Climb 1,000 ft', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.aircraft[0].targetAltitude), 7000);
      await setAircraft(page, { state: 'approach', approachStage: 'final', runwayIndex: 0, targetAltitude: 3800 });
      await page.getByRole('button', { name: 'Descend 1,000 ft', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.aircraft[0].targetAltitude), 4000);
    });

    await check('Manual go-around is counted and discards the old touchdown flag', async () => {
      await setAircraft(page, { state: 'approach', approachStage: 'final', runwayIndex: 0, altitude: 1200, touchdownReady: true });
      const before = await page.evaluate(() => window.__atcGameRef.current.goArounds || 0);
      await page.getByRole('button', { name: 'Go around', exact: true }).click();
      const state = await page.evaluate(() => {
        const g = window.__atcGameRef.current, a = g.aircraft[0];
        return { state: a.state, stage: a.approachStage, touchdown: a.touchdownReady, altitude: a.targetAltitude, heading: a.targetHeading, count: g.goArounds };
      });
      assert.deepEqual(state, { state: 'goAround', stage: null, touchdown: false, altitude: 3000, heading: 270, count: before + 1 });
      return state;
    });

    await check('Holding aircraft continue moving and a manual heading releases the hold', async () => {
      await setAircraft(page);
      await page.getByRole('button', { name: 'Hold', exact: true }).click();
      await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      const before = await capture(page); await sleep(500); const after = await capture(page);
      assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 0.1);
      assert.ok(after.fuel < before.fuel);
      await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
      await page.getByRole('button', { name: 'Set heading', exact: true }).click();
      await submitNumber(page, 'heading', '90');
      assert.deepEqual(await page.evaluate(() => {
        const a = window.__atcGameRef.current.aircraft[0]; return { state: a.state, holdCenter: a.holdCenter, heading: a.targetHeading };
      }), { state: 'inbound', holdCenter: null, heading: 90 });
    });

    await check('Controls help freezes the running shift and resumes it when closed', async () => {
      await setAircraft(page);
      await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      await page.getByRole('button', { name: 'Controls & rules', exact: true }).click();
      const before = await capture(page); await sleep(500); assert.deepEqual(await capture(page), before);
      await page.getByRole('button', { name: 'Controls & rules', exact: true }).click();
      await sleep(350); assert.ok((await capture(page)).time > before.time);
      await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
    });

    await check('Movement and fuel consumption share the same accelerated flight-time units', async () => {
      await setAircraft(page);
      await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      const before = await capture(page); await sleep(750); const after = await capture(page);
      await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
      const elapsed = after.time - before.time;
      assert.ok(elapsed > 0);
      assert.ok(Math.abs((before.x - after.x) - 9 * elapsed) < 0.03, JSON.stringify({ before, after }));
      assert.ok(Math.abs((before.fuel - after.fuel) - 2 * elapsed) < 0.03, JSON.stringify({ before, after }));
      assert.ok(Math.abs(after.y - before.y) < 0.01);
      return { elapsedSeconds: elapsed, worldDistance: before.x - after.x, fuelMinutes: before.fuel - after.fuel };
    });

    await check('Radar shortcuts respect browser modifier keys', async () => {
      await setAircraft(page);
      await page.getByRole('application').focus();
      const intercepted = await page.getByRole('application').evaluate((canvas) => {
        const key = new KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true, cancelable: true });
        canvas.dispatchEvent(key);
        return key.defaultPrevented;
      });
      assert.equal(intercepted, false);
      assert.equal(await page.locator('[data-atctower-command-entry]').count(), 0);
      assert.equal(await page.evaluate(() => !!window.__atcGameRef.current.commandEntry), false);
    });

    await check('Radar click selection remains correct after desktop and narrow-screen resizing', async () => {
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await setAircraft(page);
        const point = await page.evaluate(() => {
          const g = window.__atcGameRef.current; g.selected = null;
          const a = g.aircraft[0], canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
          const scale = Math.min(canvas.width, canvas.height) / 400;
          return { x: rect.left + a.x * scale * rect.width / canvas.width, y: rect.top + a.y * scale * rect.height / canvas.height };
        });
        await page.mouse.click(point.x, point.y);
        assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 901);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    });

    await check('Priority and ETA order, projected spacing, and tight runway gaps render together', async () => {
      await setAircraft(page, { runwayIndex: 0 });
      await page.evaluate(() => {
        const game = window.__atcGameRef.current;
        const first = game.aircraft[0];
        first.type = { id: 'C172', name: 'Cessna 172', cat: 'Light', speed: 90, color: '#60a5fa', size: 4 };
        game.runwayBusyUntil = {};
        game.aircraft = [first,
          Object.assign({}, first, { id: 902, callsign: 'Quality 902', x: 315, speed: 180, trail: [] }),
          Object.assign({}, first, { id: 903, callsign: 'Quality 903', x: 250, speed: 60, altitude: 10000, fuel: 4, trail: [] })];
      });
      await page.waitForFunction(() => document.querySelectorAll('[data-atctower-aircraft]').length === 3);
      assert.deepEqual(await page.locator('[data-atctower-aircraft]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-atctower-aircraft'))), ['903', '902', '901']);
      const watch = page.locator('[data-atctower-separation-watch]');
      assert.match(await watch.textContent(), /Projected spacing loss: Quality (?:901 \/ Quality 902|902 \/ Quality 901)/);
      const board = page.locator('[data-atctower-runway-plan]');
      assert.match(await board.textContent(), /Quality 903 \/ Quality 901/);
      assert.match(await board.textContent(), /teaching target/);
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('button', { name: 'Inspect Quality 902', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 902);
    });

    await check('A pending math challenge freezes aircraft and stays readable during resize', async () => {
      await setAircraft(page);
      await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
      await page.evaluate(() => { window.__atcGameRef.current.mathChallenge = { type: 'separation', d: 20, rate: 300, sep: 3, answer: 3.4, unit: 'minutes', explanation: 'Use (20 - 3) / 300 × 60 = 3.4 minutes.', answered: false }; });
      await page.locator('[data-atctower-math-challenge]').waitFor();
      await page.waitForFunction(() => document.activeElement?.id === 'atc-math-answer');
      const before = await capture(page); await sleep(500); assert.deepEqual(await capture(page), before);
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      await page.locator('[data-atctower-math-challenge]').getByRole('spinbutton').fill('3.4');
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-atctower-math-continue'));
      await page.getByRole('button', { name: 'Continue traffic', exact: true }).click();
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'CANVAS');
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
    });

    await check('Go-around count persists into the shift review', async () => {
      const count = await page.evaluate(() => window.__atcGameRef.current.goArounds);
      await page.getByRole('button', { name: 'End shift', exact: true }).click();
      await page.locator('[data-atctower-debrief]').waitFor();
      assert.equal(await page.evaluate(() => window.__atcToolData.atcTower.lastShift.goArounds), count);
    });

    await check('Flight strips and instructions continue when no 2D rendering context is available', async () => {
      const fallback = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      fallback.on('pageerror', (error) => results.errors.push(error.message));
      try {
        await fallback.addInitScript(() => { HTMLCanvasElement.prototype.getContext = function() { return null; }; });
        await fallback.goto(fixture.url);
        await fallback.getByRole('button', { name: 'Start Tower Shift', exact: true }).click();
        await fallback.locator('[data-atctower-playing]').waitFor();
        await fallback.locator('[data-atctower-aircraft]').first().waitFor();
        const before = await fallback.evaluate(() => window.__atcGameRef.current.time);
        await sleep(500);
        assert.ok(await fallback.evaluate((time) => window.__atcGameRef.current.time > time, before));
        await fallback.getByRole('button', { name: 'Pause shift', exact: true }).click();
        await fallback.locator('[data-atctower-aircraft]').first().click();
        await fallback.getByRole('button', { name: 'Assign runway', exact: true }).click();
        assert.ok(await fallback.evaluate(() => window.__atcGameRef.current.aircraft[0].assignedRunway));
        await fallback.getByRole('button', { name: 'Clear approach', exact: true }).click();
        assert.equal(await fallback.evaluate(() => window.__atcGameRef.current.aircraft[0].state), 'approach');
      } finally { await fallback.close(); }
    });

    await check('No uncaught browser errors or native prompt dialogs', async () => assert.deepEqual(results.errors, []));
  } catch (error) {
    results.errors.push(error.stack); console.error(error);
  } finally {
    results.finished = new Date().toISOString();
    fs.writeFileSync(path.join(reportDir, 'browser-qa-extended-results.json'), JSON.stringify(results, null, 2) + '\n');
    if (browser) await browser.close();
    await new Promise((resolve) => fixture.server.close(resolve));
    process.exitCode = results.errors.length || results.checks.some((item) => !item.pass) ? 1 : 0;
  }
})();
