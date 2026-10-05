const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Real headless Chrome; canonical ATC source in the existing React host fixture; only test gameRef exposure.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
async function check(name, action) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /StemLab|Error rendering|uncaught|react component/i.test(message.text())) results.errors.push(message.text()); });
  try {
    await page.goto(fixture.url);
    await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).click();
    await page.locator('[data-atctower-playing]').waitFor();
    const detail = await action(page);
    results.checks.push({ name, pass: true, detail: detail || null });
    console.log('PASS ' + name);
  } catch (error) {
    results.checks.push({ name, pass: false, error: error.stack });
    console.error('FAIL ' + name + ': ' + error.message);
  } finally { await page.close(); }
}

async function setFleet(page, fleet, options = {}) {
  await page.evaluate(({ fleet, options }) => {
    const game = window.__atcGameRef.current;
    const template = game.aircraft[0];
    game.aircraft = fleet.map((patch, index) => {
      const ac = Object.assign({}, template, {
        id: 901 + index, callsign: 'Forecast ' + (901 + index),
        x: 300, y: 200, heading: 270, speed: 140, altitude: 5000, fuel: 30,
        type: Object.assign({}, template.type, { id: 'B738', cat: 'Medium' }),
        state: 'inbound', assignedRunway: null, approachStage: null,
        targetHeading: null, targetSpeed: null, targetAltitude: null,
        emergency: null, holdCenter: null, trail: [], touchdownReady: false, fuelWarningIssued: false
      }, patch);
      if (patch.runwayIndex != null) ac.assignedRunway = game.airport.runways[patch.runwayIndex];
      delete ac.runwayIndex;
      return ac;
    });
    game.paused = true; game.selected = null; game.time = 10;
    game.nextSpawn = 1000; game.mathChallenge = null; game.gameOver = false;
    game.conflicts = 0; game.conflictEpisodes = 0; game.conflictPairKeys = {};
    game.runwayBusyUntil = options.busyUntil || {};
  }, { fleet, options });
  await page.waitForFunction(ids => {
    const shown = Array.from(document.querySelectorAll('[data-atctower-aircraft]')).map(el => el.getAttribute('data-atctower-aircraft'));
    return shown.length === ids.length && ids.every(id => shown.includes(String(id)));
  }, fleet.map((_, index) => 901 + index));
}

async function capture(page, name) {
  const file = path.join(__dirname, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  results.screenshots.push(file);
}

(async () => {
  fixture = await createFixtureServer();
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });

    await check('Projected crossing exposes correct flight-time forecast and Inspect selects traffic', async page => {
      await setFleet(page, [
        { callsign: 'Crossing East', x: 150, y: 200, heading: 90, speed: 180 },
        { callsign: 'Crossing West', x: 186, y: 200, heading: 270, speed: 180 }
      ]);
      const watch = page.locator('[data-atctower-separation-watch]');
      await watch.getByText(/Projected spacing loss/).waitFor();
      const text = await watch.innerText();
      assert.match(text, /12\.0 nm/);
      assert.match(text, /~90 flight seconds until the spacing limit/);
      assert.match(text, /Next two flight minutes/);
      assert.doesNotMatch(text, /Spacing conflict now/);
      await watch.getByRole('button', { name: 'Inspect Crossing West', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 902);
      await capture(page, 'forecast-crossing-desktop');
      return { separationNm: 12, combinedClosingKnots: 360, breachFlightSeconds: 90, selected: 902 };
    });

    await check('Diverging aircraft and vertically separated traffic avoid false projected alerts', async page => {
      await setFleet(page, [
        { callsign: 'Diverging West', x: 150, y: 200, heading: 270, speed: 100 },
        { callsign: 'Diverging East', x: 159.6, y: 200, heading: 90, speed: 100 }
      ]);
      const watch = page.locator('[data-atctower-separation-watch]');
      await watch.getByText(/No spacing concerns detected/).waitFor();
      assert.equal(await watch.locator('li').count(), 0);
      await setFleet(page, [
        { callsign: 'Lower East', x: 150, y: 200, heading: 90, speed: 180 },
        { callsign: 'Upper West', x: 186, y: 200, heading: 270, speed: 180, altitude: 7000 }
      ]);
      await watch.getByText(/No spacing concerns detected/).waitFor();
      assert.equal(await watch.locator('li').count(), 0);
    });

    await check('Altitude closure appears before the current vertical separation fails', async page => {
      await setFleet(page, [
        { callsign: 'Level Five', x: 150, y: 200, speed: 0, altitude: 5000 },
        { callsign: 'Descending Eight', x: 156, y: 200, speed: 0, altitude: 8000, targetAltitude: 5000 }
      ]);
      const watch = page.locator('[data-atctower-separation-watch]');
      await watch.getByText(/Projected spacing loss/).waitFor();
      assert.match(await watch.innerText(), /3,000 ft vertical gap/);
      assert.match(await watch.innerText(), /~100 flight seconds until the spacing limit/);
    });

    await check('Held projected paths expose their changing-course qualifier', async page => {
      await setFleet(page, [
        { callsign: 'East Hold', x: 150, y: 200, heading: 90, speed: 180, state: 'holding' },
        { callsign: 'West Arrival', x: 186, y: 200, heading: 270, speed: 180 }
      ]);
      const watch = page.locator('[data-atctower-separation-watch]');
      await watch.getByText(/Turning or holding: the current-course estimate may change quickly/).waitFor();
      assert.match(await page.locator('[data-atctower-aircraft="901"]').innerText(), /ETA deferred/);
    });

    await check('Runway board renders tight pair names and the model occupancy spacing target', async page => {
      await setFleet(page, [
        { callsign: 'Final Lead', x: 200, y: 200, speed: 120, state: 'approach', approachStage: 'final', runwayIndex: 0 },
        { callsign: 'Final Follow', x: 206, y: 200, speed: 120, state: 'approach', approachStage: 'final', runwayIndex: 0 }
      ]);
      const plan = page.locator('[data-atctower-runway-plan]');
      await plan.getByText(/Final Lead \/ Final Follow: 1\.0 flight min gap/).waitFor();
      const text = await plan.innerText();
      assert.match(text, /Next estimated: Final Lead · ~5\.0 flight min/);
      assert.match(text, /teaching target 4\.0 min/);
      await capture(page, 'forecast-runway-gap-desktop');
      return { ordered: ['Final Lead', 'Final Follow'], etasFlightMinutes: [5, 6], gapFlightMinutes: 1, targetFlightMinutes: 4 };
    });

    await check('Runway occupancy caution compares the arrival ETA with the accelerated shift clock', async page => {
      await setFleet(page, [
        { callsign: 'Occupied Arrival', x: 176, y: 200, speed: 120, state: 'approach', approachStage: 'final', runwayIndex: 0 }
      ], { busyUntil: { 'runway-0': 12 } });
      const plan = page.locator('[data-atctower-runway-plan]');
      await plan.getByText(/Arrival estimate falls before the runway group clears/).waitFor();
      assert.match(await plan.innerText(), /RWY 27 · Occupied/);
      assert.match(await plan.innerText(), /~1\.0 flight min/);
      return { arrivalFlightMinutes: 1, occupancyShiftSeconds: 2, arrivalShiftSeconds: 0.5 };
    });

    await check('Flight strips order priority and low fuel before speed-derived ETA and keep stable ties', async page => {
      await setFleet(page, [
        { callsign: 'Close Slow', x: 200, speed: 90 },
        { callsign: 'Far Fast', x: 215, speed: 180 },
        { callsign: 'Low Fuel', x: 230, speed: 120, fuel: 8 },
        { callsign: 'Emergency Hold', state: 'holding', emergency: { label: 'Medical', priority: true } },
        { callsign: 'Critical Fuel', x: 240, speed: 140, fuel: 4 },
        { callsign: 'Fast Tie', x: 200, speed: 120 }
      ]);
      const stripIds = await page.locator('[data-atctower-aircraft]').evaluateAll(elements => elements.map(el => Number(el.dataset.atctowerAircraft)));
      assert.deepEqual(stripIds, [905, 904, 903, 902, 906, 901]);
      assert.match(await page.locator('[data-atctower-aircraft="905"]').innerText(), /Priority/);
      assert.match(await page.locator('[data-atctower-aircraft="904"]').innerText(), /ETA deferred/);
      const radar = page.getByRole('application');
      await radar.focus(); await radar.press('ArrowRight');
      const first = await page.evaluate(() => window.__atcGameRef.current.selected);
      assert.equal(first, 905);
      await radar.press('ArrowRight');
      assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 904);
      return { sortedAircraftIds: stripIds, tiedEtasPreserveInputOrder: [902, 906], radarSelectsSameOrder: [905, 904] };
    });

    await check('Forecast and tight schedule panels fit narrow screens without losing Inspect controls', async page => {
      await setFleet(page, [
        { callsign: 'Forecast Narrow Lead', x: 200, y: 200, heading: 90, speed: 120, state: 'approach', approachStage: 'final', runwayIndex: 0 },
        { callsign: 'Forecast Narrow Follow', x: 236, y: 200, heading: 270, speed: 240, state: 'approach', approachStage: 'final', runwayIndex: 0 }
      ]);
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.locator('[data-atctower-separation-watch]').getByText(/Projected spacing loss/).waitFor();
        await page.locator('[data-atctower-runway-plan]').getByText(/flight min gap/).waitFor();
        const dims = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
        assert.ok(dims.scroll <= dims.width + 1, JSON.stringify(dims));
        await page.getByRole('button', { name: 'Inspect Forecast Narrow Follow', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 902);
        await capture(page, 'forecast-narrow-' + width);
      }
      return { testedWidths: [390, 320] };
    });

    assert.deepEqual(results.errors, []);
  } catch (error) { results.errors.push(error.stack); console.error(error); }
  finally {
    results.finished = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'browser-qa-forecast-results.json'), JSON.stringify(results, null, 2) + '\n');
    if (browser) await browser.close();
    await new Promise(resolve => fixture.server.close(resolve));
    process.exitCode = results.errors.length || results.checks.some(check => !check.pass) ? 1 : 0;
  }
})();
