const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Real headless Chrome and unchanged React host contract. A test-only initial-state substitution exercises actual component mounts with saved data.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const clone = value => JSON.parse(JSON.stringify(value));

async function makePage(data, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
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
async function check(name, action) {
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function dataOf(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); }
async function flightOf(page) {
  return page.evaluate(() => {
    const game = window.__atcGameRef.current;
    return { shiftId: game.shiftId, time: game.time, paused: game.paused, mode: game.trainingMode, score: game.score, landed: game.landed, selected: game.selected,
      aircraft: game.aircraft.map(ac => ({ id: ac.id, callsign: ac.callsign, x: ac.x, y: ac.y, heading: ac.heading, altitude: ac.altitude, speed: ac.speed, fuel: ac.fuel, type: ac.type.id, runway: ac.assignedRunway && ac.assignedRunway.name, targetAltitude: ac.targetAltitude, state: ac.state })) };
  });
}
async function setPerformance(page, score, landed) {
  await page.evaluate(({ score, landed }) => { const g = window.__atcGameRef.current; g.paused = true; g.score = score; g.landed = landed; g.streak = landed; g.sessionBestStreak = landed; }, { score, landed });
}
async function screenshot(page, name) {
  const file = path.join(__dirname, name + '.png');
  await page.screenshot({ path: file, fullPage: true }); results.screenshots.push(file);
}

(async () => {
  fixture = await createFixtureServer();
  let savedData, savedFlight, finishedData;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });

    await check('Checkpoint records a JSON-safe draft with canonical IDs and decision evidence', async () => {
      const page = await makePage();
      try {
        await page.locator('[data-atctower-training-mode]').getByRole('radio', { name: /Guided practice/ }).check();
        await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).click();
        await page.locator('[data-atctower-playing]').waitFor();
        await page.locator('[data-atctower-aircraft]').first().click();
        await page.getByRole('button', { name: 'Assign runway', exact: true }).click();
        await page.getByRole('button', { name: 'Climb 1,000 ft', exact: true }).click();
        await setPerformance(page, 127, 3);
        await page.evaluate(() => { window.__atcGameRef.current.time = 73; window.dispatchEvent(new Event('pagehide')); });
        await page.waitForFunction(() => window.__atcToolData.atcTower.activeShift?.time === 73);
        savedData = await dataOf(page); savedFlight = await flightOf(page);
        assert.equal(savedData.activeShift.version, 1);
        assert.equal(savedData.activeShift.airportId, 'simple');
        assert.equal(savedData.activeShift.trainingMode, 'guided');
        assert.equal(savedData.activeShift.aircraft.length, 1);
        assert.ok(savedData.activeShift.aircraft[0].typeId);
        assert.equal(typeof savedData.activeShift.aircraft[0].runwayIndex, 'number');
        assert.ok(savedData.activeShift.decisionLog.length >= 2);
        assert.equal(savedData.activeShift.aircraft[0].type, undefined);
        assert.equal(savedData.totalScore, undefined);
        return { version: 1, draftBytes: JSON.stringify(savedData.activeShift).length, recordedInstructions: savedData.activeShift.decisionLog.length };
      } finally { await page.close(); }
    });

    await check('An actual component remount restores the same aircraft paused without advancing time or fuel', async () => {
      const page = await makePage(savedData);
      try {
        await page.locator('[data-atctower-playing]').waitFor();
        const flight = await flightOf(page);
        assert.deepEqual(flight, savedFlight);
        assert.equal(flight.paused, true);
        await sleep(600); assert.deepEqual(await flightOf(page), flight);
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await sleep(300); assert.ok((await flightOf(page)).time > flight.time);
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        return { shiftId: flight.shiftId, restoredShiftSeconds: flight.time, aircraft: flight.aircraft.length };
      } finally { await page.close(); }
    });

    await check('Menu Resume restores the saved shift paused and keeps its career totals uncommitted', async () => {
      const page = await makePage(Object.assign({}, savedData, { view: 'menu', totalScore: 900, totalLanded: 20 }));
      try {
        await page.locator('[data-atctower-recovery]').waitFor();
        assert.equal(await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).isDisabled(), true);
        await page.getByRole('button', { name: 'Resume saved shift', exact: true }).click();
        await page.locator('[data-atctower-playing]').waitFor();
        assert.deepEqual(await flightOf(page), savedFlight);
        const state = await dataOf(page); assert.equal(state.totalScore, 900); assert.equal(state.totalLanded, 20);
      } finally { await page.close(); }
    });

    await check('Discard removes an unfinished draft without committing its score, landings, or history', async () => {
      const page = await makePage(Object.assign({}, savedData, { view: 'menu', totalScore: 900, totalLanded: 20, bestStreak: 10, shiftHistory: [] }));
      try {
        await page.getByRole('button', { name: 'Discard saved shift', exact: true }).click();
        const state = await dataOf(page);
        assert.equal(state.activeShift, null); assert.equal(state.totalScore, 900); assert.equal(state.totalLanded, 20); assert.equal(state.bestStreak, 10);
        assert.deepEqual(state.shiftHistory, []);
        assert.equal(await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).isEnabled(), true);
      } finally { await page.close(); }
    });

    await check('Unsupported and invalid drafts safely return to the menu and can be discarded', async () => {
      for (const draft of [Object.assign({}, savedData.activeShift, { version: 999 }), Object.assign({}, savedData.activeShift, { airportId: 'unknown-airport' }), { version: 1, aircraft: [] }]) {
        const page = await makePage({ view: 'playing', activeShift: draft, totalScore: 900, totalLanded: 20 });
        try {
          await page.locator('[data-atctower-recovery]').waitFor();
          assert.match(await page.locator('[data-atctower-recovery]').innerText(), /cannot be restored/);
          assert.equal(await page.getByRole('button', { name: 'Resume saved shift', exact: true }).count(), 0);
          assert.equal(await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).isDisabled(), true);
          await page.getByRole('button', { name: 'Discard saved shift', exact: true }).click();
          const state = await dataOf(page); assert.equal(state.activeShift, null); assert.equal(state.totalScore, 900); assert.equal(state.totalLanded, 20);
        } finally { await page.close(); }
      }
      return { malformedDraftsTested: 3 };
    });

    await check('Completed and skipped math restore to their worked example without awarding points twice', async () => {
      for (const skipped of [false, true]) {
        const state = clone(savedData);
        state.activeShift.mathCorrect = skipped ? 0 : 1;
        state.activeShift.mathChallenge = { type: 'separation', d: 20, rate: 300, sep: 3, answer: 3.4, unit: 'minutes', explanation: 'Use (20 - 3) / 300 × 60 = 3.4 minutes.', answered: true, correct: !skipped, skipped };
        const page = await makePage(state);
        try {
          await page.locator('[data-atctower-math-challenge]').waitFor();
          assert.equal(await page.getByRole('button', { name: 'Check answer', exact: true }).count(), 0);
          assert.match(await page.locator('[data-atctower-math-challenge]').innerText(), skipped ? /Learn from the worked example/ : /Correct!/);
          await page.waitForFunction(() => document.activeElement?.hasAttribute('data-atctower-math-continue'));
          await page.getByRole('button', { name: 'Continue traffic', exact: true }).click();
          const game = await page.evaluate(() => ({ score: window.__atcGameRef.current.score, mathCorrect: window.__atcGameRef.current.mathCorrect, paused: window.__atcGameRef.current.paused, challenge: window.__atcGameRef.current.mathChallenge, xp: window.__atcXP }));
          assert.deepEqual(game, { score: 127, mathCorrect: skipped ? 0 : 1, paused: true, challenge: null, xp: [] });
        } finally { await page.close(); }
      }
      return { restoredStates: ['correct answer', 'skipped worked example'], duplicatePoints: 0 };
    });

    await check('Ending a restored shift commits once, clears the draft, and retains its decision evidence', async () => {
      const page = await makePage(Object.assign({}, savedData, { totalScore: 900, totalLanded: 20 }));
      try {
        await page.locator('[data-atctower-playing]').waitFor();
        await page.getByRole('button', { name: 'End shift', exact: true }).evaluate(button => { button.click(); button.click(); });
        await page.locator('[data-atctower-debrief]').waitFor();
        finishedData = await dataOf(page);
        assert.equal(finishedData.activeShift, null); assert.equal(finishedData.totalScore, 1027); assert.equal(finishedData.totalLanded, 23);
        assert.equal(finishedData.shiftHistory.length, 1); assert.equal(finishedData.lastShift.shiftId, savedFlight.shiftId);
        assert.deepEqual(finishedData.lastShift.decisionLog, savedData.activeShift.decisionLog);
        assert.equal(await page.locator('[data-atctower-decision-log] li').count(), savedData.activeShift.decisionLog.length);
        return { careerScore: finishedData.totalScore, totalLanded: finishedData.totalLanded, recordedShifts: 1 };
      } finally { await page.close(); }
    });

    await check('History reopens either debrief and restores a separate saved reflection for each shift', async () => {
      const page = await makePage(finishedData);
      try {
        await page.locator('[data-atctower-debrief]').waitFor();
        const firstNote = 'My climb made more vertical room. Next shift I will compare arrival estimates before clearing an approach.';
        await page.getByRole('textbox', { name: 'What will you try next?', exact: true }).fill(firstNote);
        await page.getByRole('button', { name: 'Try another shift', exact: true }).click();
        await page.locator('[data-atctower-playing]').waitFor();
        await setPerformance(page, 15, 1);
        await page.getByRole('button', { name: 'End shift', exact: true }).click();
        await page.locator('[data-atctower-debrief]').waitFor();
        const secondNote = 'I will add the next aircraft after reviewing runway spacing.';
        const secondId = (await dataOf(page)).lastShift.shiftId;
        await page.getByRole('textbox', { name: 'What will you try next?', exact: true }).fill(secondNote);
        assert.notEqual(secondId, savedFlight.shiftId);
        await page.getByRole('button', { name: 'Choose airport', exact: true }).click();
        const history = page.locator('[data-atctower-history]');
        await history.locator('summary').click();
        assert.equal(await history.locator('button').count(), 2);
        await history.locator('button').nth(1).click();
        assert.equal((await dataOf(page)).lastShift.shiftId, savedFlight.shiftId);
        assert.equal(await page.getByRole('textbox', { name: 'What will you try next?', exact: true }).inputValue(), firstNote);
        await page.getByRole('button', { name: 'Choose airport', exact: true }).click();
        await page.locator('[data-atctower-history] summary').click();
        await page.locator('[data-atctower-history] button').first().click();
        assert.equal((await dataOf(page)).lastShift.shiftId, secondId);
        assert.equal(await page.getByRole('textbox', { name: 'What will you try next?', exact: true }).inputValue(), secondNote);
        const state = await dataOf(page); assert.equal(state.totalScore, 1042); assert.equal(state.totalLanded, 24); assert.equal(state.shiftHistory.length, 2);
        const reopened = await makePage(state, 320);
        try {
          await reopened.locator('[data-atctower-debrief]').waitFor();
          assert.equal(await reopened.getByRole('textbox', { name: 'What will you try next?', exact: true }).inputValue(), secondNote);
          assert.ok(await reopened.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await screenshot(reopened, 'recovery-debrief-320');
        } finally { await reopened.close(); }
        return { separateReflectionIds: [savedFlight.shiftId, secondId], historyDoesNotRecommitTotals: true };
      } finally { await page.close(); }
    });

    await check('Viewing an earlier debrief cannot replace an unfinished active shift', async () => {
      const guarded = Object.assign({}, finishedData, { activeShift: clone(savedData.activeShift), view: 'debrief' });
      guarded.activeShift.shiftId = 'atc-unfinished-guard';
      const page = await makePage(guarded, 320);
      try {
        await page.locator('[data-atctower-debrief]').waitFor();
        const retry = page.getByRole('button', { name: 'Try another shift', exact: true });
        assert.equal(await retry.isDisabled(), true);
        await retry.evaluate(button => button.click());
        assert.equal((await dataOf(page)).activeShift.shiftId, 'atc-unfinished-guard');
        await page.getByRole('button', { name: 'Choose airport', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).isDisabled(), true);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await screenshot(page, 'recovery-menu-320');
        await page.getByRole('button', { name: 'Resume saved shift', exact: true }).click();
        await page.locator('[data-atctower-playing]').waitFor();
        assert.equal((await flightOf(page)).shiftId, 'atc-unfinished-guard'); assert.equal((await flightOf(page)).paused, true);
        const state = await dataOf(page); assert.equal(state.totalScore, 1027); assert.equal(state.totalLanded, 23);
      } finally { await page.close(); }
    });

    await check('Flight-strip priority order stays stable while focused, then updates after leaving the list', async () => {
      const page = await makePage(savedData);
      try {
        await page.locator('[data-atctower-playing]').waitFor();
        await page.evaluate(() => {
          const g = window.__atcGameRef.current, template = g.aircraft[0];
          g.aircraft = [200, 230, 250].map((x, index) => Object.assign({}, template, {
            id: 901 + index, callsign: 'Focus ' + (901 + index), x, y: 200, heading: 270, speed: 120,
            fuel: 30, assignedRunway: null, state: 'inbound', targetAltitude: null, targetHeading: null, targetSpeed: null, emergency: null
          }));
          g.selected = null; g.paused = true;
        });
        await page.waitForFunction(() => document.querySelectorAll('[data-atctower-aircraft]').length === 3);
        const ids = () => page.locator('[data-atctower-aircraft]').evaluateAll(items => items.map(item => item.dataset.atctowerAircraft));
        assert.deepEqual(await ids(), ['901', '902', '903']);
        await page.locator('[data-atctower-aircraft="901"]').focus();
        await page.evaluate(() => { window.__atcGameRef.current.aircraft[2].fuel = 4; });
        await sleep(650);
        assert.deepEqual(await ids(), ['901', '902', '903']);
        assert.equal(await page.evaluate(() => document.activeElement?.dataset.atctowerAircraft), '901');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.dataset.atctowerAircraft), '902');
        const radar = page.getByRole('application'); await radar.focus();
        await page.waitForFunction(() => document.querySelector('[data-atctower-aircraft]')?.dataset.atctowerAircraft === '903');
        assert.deepEqual(await ids(), ['903', '901', '902']);
        await radar.press('ArrowLeft');
        assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 902);
        await radar.press('ArrowRight');
        assert.equal(await page.evaluate(() => window.__atcGameRef.current.selected), 903);
        return { focusedOrder: ['901', '902', '903'], updatedPriorityOrder: ['903', '901', '902'], leftFromNoSelection: 902 };
      } finally { await page.close(); }
    });

    await check('Math, strips, and command controls precede forecasts in both DOM and visible layout', async () => {
      const page = await makePage(savedData);
      try {
        await page.locator('[data-atctower-playing]').waitFor();
        await page.evaluate(() => {
          const g = window.__atcGameRef.current;
          g.mathChallenge = { type: 'separation', d: 20, rate: 300, sep: 3, answer: 3.4, unit: 'minutes', explanation: 'Use (20 - 3) / 300 × 60 = 3.4 minutes.', answered: false };
        });
        await page.locator('[data-atctower-math-challenge]').waitFor();
        for (const width of [1440, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          const order = await page.evaluate(() => {
            const selectors = ['[data-atctower-math-challenge]', '#atc-flight-strips-title', '#atc-aircraft-controls-title', '[data-atctower-separation-watch]', '[data-atctower-runway-plan]'];
            const panels = selectors.map(selector => document.querySelector(selector).closest('section'));
            return { tops: panels.map(panel => panel.getBoundingClientRect().top), follows: panels.slice(0, -1).map((panel, index) => !!(panel.compareDocumentPosition(panels[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)), scroll: document.documentElement.scrollWidth, width: innerWidth };
          });
          assert.deepEqual(order.follows, [true, true, true, true]);
          for (let index = 1; index < order.tops.length; index++) assert.ok(order.tops[index] > order.tops[index - 1], JSON.stringify(order));
          assert.ok(order.scroll <= order.width + 1, JSON.stringify(order));
          await screenshot(page, 'recovery-control-order-' + width);
        }
        return { verifiedWidths: [1440, 320], order: ['math', 'flight strips', 'commands', 'separation watch', 'runway plan'] };
      } finally { await page.close(); }
    });

    await check('No uncaught browser errors or native prompt dialogs during recovery and history', async () => assert.deepEqual(results.errors, []));
  } catch (error) { results.errors.push(error.stack); console.error(error); }
  finally {
    results.finished = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'browser-qa-recovery-results.json'), JSON.stringify(results, null, 2) + '\n');
    if (browser) await browser.close();
    await new Promise(resolve => fixture.server.close(resolve));
    process.exitCode = results.errors.length || results.checks.some(check => !check.pass) ? 1 : 0;
  }
})();
