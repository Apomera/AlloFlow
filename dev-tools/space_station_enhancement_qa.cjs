#!/usr/bin/env node
'use strict';

// Working-tree preview and browser QA for the Space Station tool.
//   node dev-tools/space_station_enhancement_qa.cjs --serve --port=4179
//   node dev-tools/space_station_enhancement_qa.cjs --capture
//   node dev-tools/space_station_enhancement_qa.cjs --capture --out=reports/my-run --tabs=map,interior --widths=1440,390
//   node dev-tools/space_station_enhancement_qa.cjs --capture --tabs=orbit --orbit-labs=drag --accessibility
// Local React/Three assets only; no bundled release or authenticated shell needed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const argument = (name, fallback) => {
  const match = args.find((arg) => arg.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : fallback;
};
const SEED = {
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, orbitAlt: 420,
  seenModules: {}, seenHours: {}, mapView: 'overview', mapCutaway: false,
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
  interiorView: '3d', interiorRoom: 'harmony', interiorDone: {},
  interiorSeen: { harmony: true }, interiorChoices: {}, interiorInspected: {},
  interiorAttempts: {}, interiorDiscovery: null, interiorLog: [], interiorGuided: true,
  interiorNav: { hatches: {}, collisions: 0, railGrabs: 0, railPushOffs: 0,
    looseHits: 0, cargoCatches: 0, cargoSecures: 0, routeStep: 0 },
  lowGImpulse: 10, lowGResult: null, cabinStow: {}, cupolaTarget: 'day',
  cupolaCaptured: false, cupolaShutters: false,
};
const MIME = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.css': 'text/css' };

async function createPreview(port = 0) {
  const spec = await fs.readFile(path.join(ROOT, 'tests/e2e/18-space-station-gl.spec.ts'), 'utf8');
  const match = spec.match(/const HARNESS = `([\s\S]*?)`;/);
  assert(match, 'Could not locate the established Space Station host shim');
  let harness = match[1]
    .replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
    .replace(/#wrap\{[^}]+\}/, '#wrap{width:100%;max-width:1440px;min-height:100vh;margin:0 auto;position:relative}html,body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}')
    .replace('var toolData = st[0], setToolData = st[1];', 'var toolData = st[0], setToolData = st[1]; window.__toolData = toolData; window.__setToolData = setToolData;');
  const boot = `<script>window.AlloPostFXEnabled=false;</script>
<script src="/stem_lab/stem_tool_spacestation.js"></script>
<script>
  var query = new URLSearchParams(location.search);
  var seed = ${JSON.stringify(SEED)};
  seed.tab = query.get('tab') || seed.tab;
  seed.opsMode = query.get('mode') || 'integrated';
  seed.opsEclssLab = query.get('lab') || 'air';
  seed.interiorRoom = query.get('room') || seed.interiorRoom;
  seed.interiorSeen[seed.interiorRoom] = true;
  window.__mount(seed);
</script>`;
  harness = harness.replace('</body>', boot + '</body>');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/' || url.pathname === '/__harness') {
        res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
        res.end(harness); return;
      }
      const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch (_) { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function capture(base, output) {
  const accessibilityOnly = args.includes('--accessibility-only');
  const orbitLabs = argument('--orbit-labs', 'transfer,drag').split(',');
  const missionLabs = argument('--mission-labs', 'docking,eva').split(',');
  const operationLabs = argument('--operation-labs', 'power,thermal,attitude,air,water,pressure,debris').split(',');
  const { chromium } = require('playwright');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    const widths = argument('--widths', '1440,390').split(',').map(Number);
    const tabs = argument('--tabs', 'map,interior,orbit,missions').split(',');
    for (const width of widths) {
      const viewport = { width, height: width < 500 ? 844 : 1080 };
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1,
        isMobile: viewport.width < 500, hasTouch: viewport.width < 500, reducedMotion: 'reduce' });
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror', (error) => {
        const detail = error.stack || error.message;
        errors.push(detail);
        console.error(`Browser error at ${viewport.width}px: ${detail}`);
      });
      for (const tab of tabs) {
        console.log(`Checking ${tab} at ${viewport.width}px`);
        await page.goto(`${base}/?tab=${tab}`, { waitUntil: 'load' });
        await page.locator('.iss-root').waitFor();
        if (tab === 'map' || tab === 'interior') {
          await page.waitForFunction(() => {
            const canvas = document.querySelector('#wrap canvas');
            return canvas && (canvas._issInit || canvas.getAttribute('data-iss-webgl') === 'ready');
          }, null, { timeout: 45000 });
        }
        await page.waitForTimeout(700);
        const layout = await page.evaluate(() => ({
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          selected: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
          canvases: document.querySelectorAll('canvas').length,
          heading: document.querySelector('.iss-title')?.textContent,
        }));
        assert(layout.scrollWidth <= viewport.width + 1, `${tab} overflows at ${viewport.width}px: ${layout.scrollWidth}px`);
        assert.equal(layout.selected, `iss-tab-${tab}`);
        const filename = `${tab}-${viewport.width}.png`;
        if (!accessibilityOnly) await page.screenshot({ path: path.join(output, filename), fullPage: true });
        if (tab === 'map' && !accessibilityOnly) {
          const canvas = page.locator('canvas').first();
          await canvas.screenshot({ path: path.join(output, `map-canvas-${viewport.width}.png`) });
          const before = await canvas.screenshot();
          const box = await canvas.boundingBox();
          await page.mouse.move(box.x + box.width * .45, box.y + box.height * .55);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * .70, box.y + box.height * .42, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(250);
          assert.notEqual(Buffer.compare(before, await canvas.screenshot()), 0, 'Map drag should change rendered station view');
          await page.locator('#iss-tab-map').focus();
          await page.keyboard.press('End');
          assert.equal(await page.locator('#iss-tab-quiz').getAttribute('aria-selected'), 'true', 'End should select final tab');
          await page.keyboard.press('Home');
          assert.equal(await page.locator('#iss-tab-map').getAttribute('aria-selected'), 'true', 'Home should select first tab');
        }
        if (tab === 'interior' && !accessibilityOnly) {
          await page.locator('[data-iss-interior-canvas]').screenshot({ path: path.join(output, `interior-canvas-${viewport.width}.png`) });
          await page.locator('.iss-route-button').nth(2).click();
          await page.waitForFunction(() => document.querySelector('[data-iss-interior-canvas]')?._issInteriorState?.room === 'unity');
          await page.locator('[data-iss-interior-view="diagram"]').click();
          assert.equal(await page.locator('[data-iss-interior-canvas]').count(), 0);
          await page.locator('[data-iss-interior-view="3d"]').click();
          await page.waitForFunction(() => document.querySelector('[data-iss-interior-canvas]')?._issInteriorState?.room === 'unity');
          if (await page.locator('[data-iss-momentum-bench]').count()) {
            const bench = page.locator('[data-iss-momentum-bench]');
            const benchBounds = await bench.boundingBox();
            assert(benchBounds.x >= 0 && benchBounds.x + benchBounds.width <= viewport.width + 1, 'Momentum bench must fit inside the viewport, including its grid column');
            const trackBounds = await bench.locator('.iss-momentum-stage svg').boundingBox();
            assert(trackBounds.x >= 0 && trackBounds.x + trackBounds.width <= viewport.width + 1, 'The entire motion track must remain visible during playback');
            const mass = page.locator('#iss-momentum-mass');
            const initialMass = Number(await mass.inputValue());
            await mass.focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(Number(await mass.inputValue()), initialMass + 5, 'Keyboard should change experiment mass');
            const initialMomentum = await bench.locator('.iss-flight-reading strong').nth(0).textContent();
            await page.locator('[data-iss-momentum-contact]').click();
            assert.equal(await page.locator('[data-iss-momentum-phase]').getAttribute('data-iss-momentum-phase'), 'contact');
            assert.equal(await bench.locator('.iss-flight-reading strong').nth(0).textContent(), initialMomentum, 'Catching cargo should conserve total momentum');
            const catchHeat = parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent());
            assert(catchHeat > 0, 'An inelastic catch should dissipate kinetic energy');
            await page.locator('[data-iss-momentum-mode="elastic"]').click();
            await page.locator('[data-iss-momentum-contact]').click();
            assert.equal(parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent()), 0, 'Ideal elastic contact should conserve kinetic energy');
            await page.locator('[data-iss-momentum-mode="cushioned"]').click();
            const restitution = page.locator('#iss-momentum-restitution');
            assert.equal(Number(await restitution.inputValue()), 0.5, 'A cushioned bounce should begin at half relative rebound speed');
            assert.equal(await bench.locator('[data-iss-momentum-report]').getAttribute('data-iss-momentum-report'), 'predicted');
            await page.locator('[data-iss-momentum-contact]').click();
            const partialHeat = parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent());
            assert(Math.abs(partialHeat - catchHeat * 0.75) < 0.001, 'Half rebound speed should dissipate 75% of the energy lost in a catch');
            assert.equal(await bench.locator('.iss-flight-reading strong').nth(0).textContent(), initialMomentum, 'A partial rebound must conserve the same signed momentum');
            const crewImpulse = parseFloat(await bench.locator('[data-iss-momentum-crew-impulse] strong').textContent());
            const cargoImpulse = parseFloat(await bench.locator('[data-iss-momentum-cargo-impulse] strong').textContent());
            assert(crewImpulse < 0 && cargoImpulse > 0 && crewImpulse + cargoImpulse === 0, 'Contact report must show equal opposite impulses');
            assert.equal(await bench.locator('[data-iss-momentum-report]').getAttribute('data-iss-momentum-report'), 'measured');
            await page.locator('[data-iss-momentum-before]').click();
            assert.equal(await page.locator('[data-iss-momentum-phase]').getAttribute('data-iss-momentum-phase'), 'coast');
            assert.equal(parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent()), 0, 'Seeking before contact must restore undissipated energy');
            const centerBefore = Number(await bench.locator('[data-iss-momentum-center]').getAttribute('data-iss-momentum-center'));
            await page.locator('[data-iss-momentum-after]').click();
            assert.equal(await page.locator('[data-iss-momentum-phase]').getAttribute('data-iss-momentum-phase'), 'contact');
            assert(Number(await bench.locator('[data-iss-momentum-center]').getAttribute('data-iss-momentum-center')) > centerBefore, 'Center of mass must continue coasting after contact');
            await bench.getByRole('button', { name: 'Reset time', exact: true }).click();
            const momentumPlay = bench.locator('[data-iss-playback-toggle="momentum"]');
            await momentumPlay.click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-momentum-time').value) > 0.1);
            await momentumPlay.click();
            const pausedTime = await page.locator('#iss-momentum-time').inputValue();
            await page.waitForTimeout(250);
            assert.equal(await page.locator('#iss-momentum-time').inputValue(), pausedTime, 'Pause must hold the experiment time');
            await momentumPlay.click();
            await mass.focus();
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="momentum"]').getAttribute('aria-pressed') === 'false');
            assert.equal(Number(await mass.inputValue()), initialMass + 10, 'Mass should remain adjustable during playback');
            assert.equal(await momentumPlay.getAttribute('aria-pressed'), 'false', 'Changing a mass must pause playback');
            assert.equal(Number(await page.locator('#iss-momentum-time').inputValue()), 0, 'Changing the setup must restart the experiment timeline');
            await momentumPlay.click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-momentum-time').value) > 0.1);
            await restitution.focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(Number(await restitution.inputValue()), 0.55, 'Rebound ratio must be adjustable by keyboard');
            await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="momentum"]').getAttribute('aria-pressed') === 'false');
            assert.equal(await momentumPlay.getAttribute('aria-pressed'), 'false', 'Changing rebound must pause playback');
            assert.equal(Number(await page.locator('#iss-momentum-time').inputValue()), 0, 'Changing rebound must reset the trial');
            await page.waitForTimeout(250);
            assert.equal(Number(await page.locator('#iss-momentum-time').inputValue()), 0, 'The reset clock must remain stopped after a rebound change');
            await page.locator('[data-iss-momentum-after]').click();
            await bench.screenshot({ path: path.join(output, `momentum-${viewport.width}.png`) });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflow, false, 'Momentum experiment should fit the viewport');
            await mass.focus();
            await page.keyboard.press('End');
            await page.locator('#iss-momentum-impulse').focus();
            await page.keyboard.press('Home');
            await page.locator('#iss-momentum-drift').focus();
            await page.keyboard.press('End');
            assert.equal(await bench.locator('[data-iss-momentum-report]').getAttribute('data-iss-momentum-report'), 'unreachable');
            assert.equal(await page.locator('[data-iss-momentum-contact]').isDisabled(), true, 'Receding cargo must not offer an invented contact');
            assert.equal(await page.locator('[data-iss-momentum-before]').isDisabled(), true);
            assert.equal(await page.locator('[data-iss-momentum-after]').isDisabled(), true);
            await mass.focus();
            await page.keyboard.press('Home');
            await page.locator('#iss-momentum-impulse').focus();
            await page.keyboard.press('End');
            await page.locator('[data-iss-momentum-contact]').click();
            if (viewport.width < 620) {
              const trajectory = page.locator('[data-iss-lowg-trajectory]');
              await trajectory.focus();
              await page.keyboard.press('ArrowRight');
              await page.waitForFunction(() => document.querySelector('[data-iss-lowg-trajectory]').scrollLeft > 0);
              assert.equal(await trajectory.evaluate(node => document.activeElement === node), true, 'The Unity trajectory diagram must be keyboard scrollable');
            }
          }
        }
        if (tab === 'orbit' && !accessibilityOnly && orbitLabs.includes('transfer')) {
          const transferBounds = await page.locator('.iss-transfer-visual svg').boundingBox();
          assert(transferBounds.x >= 0 && transferBounds.x + transferBounds.width <= viewport.width + 1, 'The complete transfer diagram must fit inside the viewport');
          await page.locator('[data-iss-transfer-action="inject"]').click();
          assert.equal(await page.locator('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage'), '1');
          const transferPlay = page.locator('[data-iss-playback-toggle="transfer"]');
          await page.locator('[data-iss-playback-speed="transfer"]').selectOption('300');
          await transferPlay.click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-transfer-time').value) > 0);
          await transferPlay.click();
          const coastPaused = await page.locator('#iss-transfer-time').inputValue();
          await page.waitForTimeout(250);
          assert.equal(await page.locator('#iss-transfer-time').inputValue(), coastPaused, 'Orbital playback must pause without drifting');
          const timeSlider = page.locator('#iss-transfer-time');
          const profile = page.locator('[data-iss-transfer-profile="altitude"]');
          await profile.scrollIntoViewIfNeeded();
          const profileBounds = await profile.boundingBox();
          assert(profileBounds.x >= 0 && profileBounds.x + profileBounds.width <= viewport.width + 1, 'Flight profile must fit the viewport');
          await transferPlay.click();
          await profile.scrollIntoViewIfNeeded();
          const dragBounds = await profile.boundingBox();
          const profileX = fraction => dragBounds.x + dragBounds.width * (8 + fraction * 584) / 600;
          if (viewport.width < 500) {
            await page.touchscreen.tap(profileX(.5), dragBounds.y + dragBounds.height / 2);
          } else {
            await page.mouse.move(profileX(.25), dragBounds.y + dragBounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(profileX(.5), dragBounds.y + dragBounds.height / 2, { steps: 8 });
            await page.mouse.up();
          }
          assert(Math.abs(Number(await timeSlider.inputValue()) - 500) <= 2, 'Profile inspection must seek by elapsed time');
          assert.equal(await transferPlay.getAttribute('aria-pressed'), 'false', 'Inspecting the profile must pause playback');
          const inspected = await timeSlider.inputValue();
          await page.waitForTimeout(250);
          assert.equal(await timeSlider.inputValue(), inspected, 'The inspected state must remain paused');
          await timeSlider.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(Number(await timeSlider.inputValue()), Number(inspected) + 1, 'The keyboard time slider must inspect the same flight');
          const inspectedKeyboard = await timeSlider.inputValue();
          const velocity = page.locator('[data-iss-transfer-vector="velocity"]');
          assert.equal(await velocity.count(), 1);
          await page.locator('[data-iss-transfer-overlay="vectors"]').click();
          assert.equal(await velocity.count(), 0);
          await page.locator('[data-iss-transfer-overlay="vectors"]').click();
          await page.locator('[data-iss-transfer-overlay="marks"]').click();
          assert.equal(await page.locator('[data-iss-transfer-time-marks]').count(), 0);
          await page.locator('[data-iss-transfer-overlay="marks"]').click();
          assert.equal(await page.locator('[data-iss-transfer-time-marks] circle').count(), 9);
          assert.equal(await timeSlider.inputValue(), inspectedKeyboard, 'Diagram overlays must not alter elapsed time');
          assert(parseFloat(await page.locator('[data-iss-transfer-reading="radial"] strong').textContent()) > 0, 'A raising coast must show outward radial speed');
          await page.locator('[data-iss-transfer-stage]').screenshot({ path: path.join(output, `transfer-profile-${viewport.width}.png`) });
          await page.locator('[data-iss-transfer-action="coast"]').click();
          assert(Number(await page.locator('#iss-transfer-time').inputValue()) > 0, 'Coast should advance elapsed transfer time');
          await page.locator('[data-iss-transfer-action="arrive"]').click();
          assert.equal(await page.locator('#iss-transfer-time').inputValue(), '1000');
          await page.locator('[data-iss-transfer-action="circularize"]').click();
          assert.equal(await page.locator('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage'), '2');
          await page.locator('[data-iss-transfer-stage]').screenshot({ path: path.join(output, `transfer-${viewport.width}.png`) });
          await page.getByRole('button', { name: 'Lower 100 km', exact: true }).click();
          await page.locator('[data-iss-transfer-action="inject"]').click();
          await timeSlider.focus();
          await page.keyboard.press('End');
          await page.keyboard.press('Home');
          assert.equal(await timeSlider.inputValue(), '0');
          await page.locator('[data-iss-transfer-action="coast"]').click();
          assert.match(await page.locator('[data-iss-transfer-reading="radial"] strong').textContent(), /^−/, 'A lowering coast must show inward radial speed');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Flight instruments must not create horizontal overflow');
          if (viewport.width < 500) {
            for (const selector of ['.iss-orbit-visual', '[data-iss-ground-track]']) {
              await page.locator(selector).focus();
              await page.keyboard.press('ArrowRight');
              await page.waitForFunction(selector => document.querySelector(selector).scrollLeft > 0, selector);
            }
          }
        }
        if (tab === 'orbit' && !accessibilityOnly && orbitLabs.includes('drag')) {
          const dragLab = page.locator('#iss-drag-lab');
          const dragDay = page.locator('#iss-drag-day');
          const dragPlay = page.locator('[data-iss-playback-toggle="drag"]');
          const dragAction = name => page.locator('[data-iss-drag-action="' + name + '"]');
          const dragReading = async name => parseFloat(await page.locator('[data-iss-drag-reading="' + name + '"] strong').textContent());
          await dragAction('before').click();
          assert.equal(await dragDay.inputValue(), '20');
          assert.equal(await dragReading('fuel'), 0);
          const beforeRaise = await dragReading('altitude');
          await dragAction('after').click();
          assert.equal(await dragDay.inputValue(), '20');
          assert(Math.abs(await dragReading('altitude') - beforeRaise - 5) < .001, 'Before/after must inspect the exact reboost discontinuity');
          assert(await dragReading('fuel') > 0, 'Completed burns must account for propellant');
          await page.locator('[data-iss-drag-reference-toggle]').click();
          assert.equal(await page.locator('[data-iss-drag-reference]').count(), 0);
          assert.equal(await dragDay.inputValue(), '20', 'The comparison overlay must not change time');
          await page.locator('[data-iss-drag-reference-toggle]').click();
          await dragAction('reset').click();
          await page.locator('[data-iss-playback-speed="drag"]').selectOption('432000');
          await dragPlay.click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-drag-day').value) > 0);
          const dragPlot = page.locator('[data-iss-drag-plot]');
          await dragPlot.scrollIntoViewIfNeeded();
          const plotBounds = await dragPlot.boundingBox();
          assert(plotBounds.x >= 0 && plotBounds.x + plotBounds.width <= viewport.width + 1, 'The drag chart must fit the viewport');
          if (viewport.width < 500) {
            await page.touchscreen.tap(plotBounds.x + plotBounds.width / 2, plotBounds.y + plotBounds.height / 2);
          } else {
            await page.mouse.move(plotBounds.x + plotBounds.width / 4, plotBounds.y + plotBounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(plotBounds.x + plotBounds.width / 2, plotBounds.y + plotBounds.height / 2, { steps: 8 });
            await page.mouse.up();
          }
          assert(Math.abs(Number(await dragDay.inputValue()) - 15) < .1, 'Pointer inspection must use the plotted time scale');
          if (viewport.width >= 500) assert.equal(await page.evaluate(() => String(window.getSelection())), '', 'Graph inspection must not select page text');
          assert.equal(await dragPlay.getAttribute('aria-pressed'), 'false');
          const dayInspected = Number(await dragDay.inputValue());
          await dragDay.focus();
          await page.keyboard.press('ArrowRight');
          assert(Number(await dragDay.inputValue()) > dayInspected, 'Keyboard inspection must advance the drag lab');
          for (const selector of ['#iss-drag-mass', '#iss-drag-gain']) {
            await dragPlay.click();
            await page.locator(selector).focus();
            await page.keyboard.press('End');
            // The parent resets time first; wait for the child's pause effect.
            await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="drag"]').getAttribute('aria-pressed') === 'false');
            assert.equal(await dragDay.inputValue(), '0', 'A changed setup must reset the drag experiment');
            assert.equal(await dragPlay.getAttribute('aria-pressed'), 'false', 'A changed setup must pause drag playback');
            assert.equal(await dragReading('fuel'), 0);
          }
          await dragAction('after').click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          await dragLab.screenshot({ path: path.join(output, `drag-lab-${viewport.width}.png`) });
          await page.locator('[data-iss-reboost-plan="0"]').click();
          assert.equal(await dragAction('before').isDisabled(), true);
          assert.equal(await dragAction('after').isDisabled(), true);
          assert.equal(await page.locator('#iss-drag-gain').isDisabled(), true);
          await page.locator('[data-iss-reboost-plan="20"]').click();
          await page.locator('#iss-orbit-alt').focus();
          await page.keyboard.press('Home');
          await page.locator('[data-iss-solar-mode="high"]').click();
          await page.locator('#iss-drag-frontal-area').focus();
          await page.keyboard.press('End');
          await page.locator('#iss-drag-mass').focus();
          await page.keyboard.press('Home');
          assert(Number(await dragDay.getAttribute('max')) < 20, 'The time control must end before an unreachable burn');
          await dragAction('end').click();
          assert.equal(await dragReading('altitude'), 180);
          assert.equal(await dragReading('fuel'), 0);
          assert.equal(await dragAction('after').isDisabled(), true);
          assert.equal(await dragPlay.isDisabled(), true);
          assert.match(await dragLab.textContent(), /Model limit reached/);
          await dragLab.screenshot({ path: path.join(output, `drag-limit-${viewport.width}.png`) });
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('power')) {
          console.log('Checking the finite-capacity power lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="power"]').click();
          const lab = page.locator('[data-iss-power-lab]');
          const clock = lab.locator('#iss-power-time');
          const playing = lab.locator('[data-iss-playback-toggle="power"]');
          const reading = name => lab.locator('[data-power-reading="' + name + '"]').textContent();
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const event = id => lab.locator('[data-power-event="' + id + '"]').click();
          async function capturePower(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await lab.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, 'power-' + name + '-' + viewport.width + '.png'), fullPage: true, clip, animations: 'disabled' });
          }
          await lab.locator('[data-power-preset="balanced"]').click();
          await event('full');
          assert.match(await reading('stored'), /210.0 kWh/);
          assert.match(await reading('battery-flow'), /0.0 kW/);
          const fullTime = await time();
          assert(fullTime > 0 && fullTime < 57);
          await capturePower('full');
          await event('eclipse');
          assert.equal(await time(), 57);
          assert.equal(await lab.locator('[data-power-phase]').getAttribute('data-power-phase'), 'eclipse');
          assert.match(await reading('solar'), /0.0 kW/);
          assert.match(await reading('battery-flow'), /Out of the battery.*92.4 kW/);
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 57.3);
          assert.equal(await playing.getAttribute('aria-pressed'), 'true');
          await playing.click();
          const paused = await time();
          await lab.locator('[data-power-reference]').click();
          assert.equal(await time(), paused);
          assert.equal(await lab.locator('[data-power-reference-path]').count(), 0);
          await lab.locator('[data-power-reference]').click();
          const plot = lab.locator('[data-power-plot]');
          await plot.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'center', behavior: 'instant' }); });
          const bounds = await plot.boundingBox();
          if (viewport.width < 500) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          else {
            await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
            await page.mouse.up();
          }
          assert(Math.abs(await time() - 46) <= .2, 'Plot inspection uses the plotted time scale');
          assert.equal(await playing.getAttribute('aria-pressed'), 'false');
          await event('eclipse');
          await clock.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await time(), 57.1);
          await playing.click();
          await lab.locator('#iss-power-angle').focus();
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle=\"power\"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await time(), 0);
          assert.equal(await playing.getAttribute('aria-pressed'), 'false');
          assert.equal(await lab.locator('[data-power-arrays]').getAttribute('data-power-arrays'), '85');
          await lab.locator('[data-power-preset="full"]').click();
          await event('end');
          assert.match(await reading('stored'), /153.3 kWh/);
          await capturePower('eclipse');
          await lab.locator('[data-power-preset="low"]').click();
          assert.equal(await lab.locator('[data-power-outcome]').getAttribute('data-power-outcome'), 'shortfall');
          await event('empty');
          assert.match(await reading('stored'), /0.0 kWh/);
          assert.match(await reading('battery-flow'), /0.0 kW/);
          assert.match(await reading('load'), /cannot be supplied/);
          await event('end');
          assert(!/\b0.0 kWh/.test(await reading('unserved')), 'An empty battery must record unmet energy demand');
          await capturePower('shortfall');
          await lab.locator('[data-power-preset="balanced"]').click();
          await event('eclipse');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Power lab stays within the viewport');
          console.log('Power events, playback, pointer, keyboard and energy readings passed at ' + viewport.width + 'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('thermal')) {
          console.log('Checking the coupled thermal lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="thermal"]').click();
          const lab = page.locator('[data-iss-thermal-lab]');
          const clock = lab.locator('#iss-thermal-time');
          const playing = lab.locator('[data-iss-playback-toggle="thermal"]');
          const reading = async name => parseFloat((await lab.locator('[data-thermal-reading="' + name + '"] strong').textContent()).replace('−','-'));
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const event = id => lab.locator('[data-thermal-event="' + id + '"]').click();
          const flow = () => lab.locator('[data-thermal-hot-flow]').getAttribute('stroke-dashoffset');
          async function captureThermal(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await lab.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, 'thermal-' + name + '-' + viewport.width + '.png'), fullPage: true, clip, animations: 'disabled' });
          }
          await lab.locator('[data-thermal-preset="balanced"]').click();
          assert.equal(await reading('cabin'), 22);
          assert.equal(await reading('radiator'), 4);
          assert.equal(await lab.locator('[data-thermal-event="limit"]').isDisabled(), true);
          await event('end');
          assert((await reading('cabin')) >= 18 && (await reading('cabin')) <= 27);
          assert.equal(await lab.locator('[data-thermal-outcome]').getAttribute('data-thermal-outcome'), 'comfortable');
          await event('eclipse');
          assert.equal(await time(), 57);
          assert.equal(await lab.locator('[data-thermal-phase]').getAttribute('data-thermal-phase'), 'eclipse');
          assert((await reading('radiated')) > 0, 'The radiator still emits heat in eclipse');
          const eclipseTemperature = await reading('cabin'), eclipseFlow = await flow();
          await clock.focus();
          await page.keyboard.press('ArrowLeft');
          assert.equal(await time(), 56.9);
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 57.3);
          assert.equal(await playing.getAttribute('aria-pressed'), 'true');
          assert.notEqual(await flow(), eclipseFlow);
          assert(Math.abs((await reading('cabin')) - eclipseTemperature) < .1, 'Temperatures must not jump at eclipse');
          await playing.click();
          const paused = await time(), pausedFlow = await flow();
          await lab.locator('[data-thermal-reference]').click();
          assert.equal(await time(), paused);
          assert.equal(await lab.locator('[data-thermal-reference-path]').count(), 0);
          await lab.locator('[data-thermal-reference]').click();
          await lab.locator('[data-thermal-part="radiator"]').click();
          assert.equal(await time(), paused);
          assert.match(await lab.locator('[data-thermal-part-note]').textContent(), /fourth-power/);
          assert.equal(await flow(), pausedFlow, 'Coolant markers share the paused simulation clock');
          const plot = lab.locator('[data-thermal-plot]');
          await plot.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'center', behavior: 'instant' }); });
          const bounds = await plot.boundingBox();
          if (viewport.width < 500) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          else {
            await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
            await page.mouse.up();
          }
          assert(Math.abs(await time() - 46) <= .2, 'Graph inspection must share the time axis');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="thermal"]').getAttribute('aria-pressed') === 'false');
          await event('eclipse');
          await clock.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await time(), 57.1);
          await playing.click();
          await lab.locator('#iss-thermal-flow').focus();
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="thermal"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await time(), 0);
          assert.equal(await reading('cabin'), 22);
          await lab.locator('[data-thermal-preset="balanced"]').click();
          await event('eclipse');
          await captureThermal('balanced');
          await lab.locator('[data-thermal-preset="restricted"]').click();
          await event('limit');
          assert.equal(await reading('cabin'), 27);
          assert((await time()) > 47 && (await time()) < 49);
          await event('end');
          assert((await reading('cabin')) > 31);
          assert.equal(await lab.locator('[data-thermal-outcome]').getAttribute('data-thermal-outcome'), 'outside');
          const generated = await reading('generated-energy'), absorbed = await reading('absorbed-energy');
          const emitted = await reading('radiated-energy'), stored = await reading('stored-energy');
          assert(Math.abs(generated + absorbed - emitted - stored) <= .21, 'Rounded heat ledger must balance');
          await captureThermal('restricted');
          await lab.locator('[data-thermal-preset="strong"]').click();
          await event('limit');
          assert.equal(await reading('cabin'), 18);
          await event('end');
          assert((await reading('cabin')) < 18);
          await captureThermal('strong');
          await lab.locator('[data-thermal-preset="balanced"]').click();
          await event('eclipse');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Thermal lab stays within the viewport');
          console.log('Thermal events, heat budget, playback, pointer and keyboard passed at ' + viewport.width + 'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('air')) {
          console.log('Checking the two-zone cabin-air lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="eclss"]').first().click();
          const lab = page.locator('[data-iss-air-lab]');
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const reading = async id => parseFloat(await lab.locator('[data-air-reading="' + id + '"] strong').textContent());
          const event = id => lab.locator('[data-air-event="' + id + '"]').click();
          const playing = lab.locator('[data-iss-playback-toggle="air"]');
          async function captureAir(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block:'start', behavior:'instant' }); });
            const clip = await lab.evaluate(node => { const b=node.getBoundingClientRect(); return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height}; });
            await page.screenshot({path:path.join(output,'air-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          await lab.locator('[data-air-preset="pocket"]').click();
          assert.equal(await reading('local'),2600);
          await event('limit');
          assert.equal(await reading('local'),4000);
          assert((await time())>48 && (await time())<49);
          const restrictedFan = await lab.locator('[data-air-fan]').getAttribute('transform');
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute>49);
          await playing.click();
          assert((await reading('local'))>4000);
          assert.notEqual(await lab.locator('[data-air-fan]').getAttribute('transform'),restrictedFan,'The fan follows circulated air during playback');
          await event('end');
          assert.equal(await reading('local'),5042);
          assert.equal(await reading('cabin'),2539);
          assert((await reading('average'))<2700);
          assert.equal(await lab.locator('[data-air-outcome]').getAttribute('data-air-outcome'),'crossed');
          await captureAir('pocket');
          await lab.locator('[data-air-preset="restore"]').click();
          await event('restore');
          assert.equal(await time(),45);
          assert.equal(await reading('flow'),90);
          assert.equal(await reading('local'),3914);
          assert.equal(await lab.locator('[data-air-phase]').getAttribute('data-air-phase'),'restored');
          await captureAir('recovery');
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute>45.4);
          await lab.locator('[data-air-part="fan"]').click();
          assert.equal(await playing.getAttribute('aria-pressed'),'true');
          await playing.click();
          const paused=await time();
          await lab.locator('[data-air-reference]').click();
          assert.equal(await time(),paused);
          assert.equal(await lab.locator('[data-air-reference-path]').count(),0);
          await lab.locator('[data-air-reference]').click();
          await event('after');
          assert.equal(await time(),50);
          assert((await reading('local'))<3914);
          await event('end');
          assert.equal(await reading('local'),2860);
          const sum=await reading('initial')+await reading('exhaled')-await reading('removed')-await reading('remaining');
          assert(Math.abs(sum)<=.21,'Displayed CO2 mass ledger must balance within rounding');
          await captureAir('cleared');
          const plot=lab.locator('[data-air-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500) await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
          else { await page.mouse.move(bounds.x+bounds.width*.4,bounds.y+bounds.height/2); await page.mouse.down(); await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2,{steps:6}); await page.mouse.up(); }
          assert(Math.abs(await time()-46)<=.2,'Air chart pointer/touch inspection uses the shared clock');
          await event('restore');
          await lab.locator('#iss-air-time').focus(); await page.keyboard.press('ArrowRight');
          assert.equal(await time(),45.1);
          await playing.click();
          await lab.locator('#iss-air-activity').focus(); await page.keyboard.press('ArrowRight');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="air"]').getAttribute('aria-pressed')==='false');
          assert.equal(await time(),0);
          assert.equal(await lab.locator('#iss-air-activity').getAttribute('aria-valuetext'),'1.25 × baseline');
          await lab.locator('[data-air-restore-toggle]').click();
          assert.equal(await lab.locator('#iss-air-restore-time').isDisabled(),true);
          assert.equal(await lab.locator('[data-air-event="restore"]').isDisabled(),true);
          await lab.locator('#iss-air-flow').focus(); await page.keyboard.press('Home');
          assert.equal(await reading('flow'),0);
          assert.equal(await lab.locator('[data-air-flow-markers]').count(),0);
          await page.locator('[data-flight-rule="power"]').click();
          await page.locator('#iss-power-angle').focus(); await page.keyboard.press('Home');
          await page.locator('#iss-power-battery').focus(); await page.keyboard.press('Home');
          await page.locator('[data-flight-rule="eclss"]').first().click();
          assert.equal(await lab.locator('[data-air-phase]').getAttribute('data-air-phase'),'unpowered');
          assert.equal(await reading('removal'),0);
          const unpoweredFan = await lab.locator('[data-air-fan]').getAttribute('transform');
          await event('end');
          assert.equal(await reading('removed'),0);
          assert.equal(await lab.locator('[data-air-fan]').getAttribute('transform'),unpoweredFan,'An unpowered fan remains stationary');
          await captureAir('unpowered');
          await lab.locator('[data-air-preset="restore"]').click();
          await event('restore');
          await captureAir('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Air lab stays within the viewport');
          console.log('Air mass budget, local pockets, recovery, power loss, playback, pointer and keyboard passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('water')) {
          console.log('Checking finite water reserves at '+viewport.width+'px');
          await page.locator('[data-iss-scenario="nominal"]').click();
          await page.locator('[data-flight-rule="eclss"]').filter({hasText:'Water loop'}).click();
          const lab=page.locator('[data-iss-water-lab]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsWaterDay||0);
          const reading=async id=>parseFloat(await lab.locator('[data-water-reading="'+id+'"] strong').textContent());
          const event=id=>lab.locator('[data-water-event="'+id+'"]').click();
          const playing=lab.locator('[data-iss-playback-toggle="water"]');
          async function captureWater(name) {
            await lab.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'start',behavior:'instant'});});
            const clip=await lab.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'water-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          assert.equal(await reading('clean'),120);
          await lab.locator('[data-water-preset="outage"]').click();
          await event('empty');assert.equal(await reading('clean'),0);
          assert((await time())>13 && (await time())<14);
          assert.equal(await reading('process'),0);
          const stoppedRotor=await lab.locator('[data-water-rotor]').getAttribute('transform');
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsWaterDay>14);await playing.click();
          assert.equal(await lab.locator('[data-water-rotor]').getAttribute('transform'),stoppedRotor,'Offline processor motion stays frozen');
          assert.equal(await lab.locator('[data-water-flow="return"]').count(),0);
          await event('end');assert.equal(await reading('unmet'),75.1);
          assert.equal(await lab.locator('[data-water-outcome]').getAttribute('data-water-outcome'),'shortfall');
          await captureWater('shortage');
          await lab.locator('[data-water-preset="bridge"]').click();
          await event('before');const before=await reading('clean');assert.equal(await reading('accepted'),0);
          assert.equal(await time(),12);await captureWater('before-delivery');
          await event('after');assert(Math.abs(await reading('clean')-before-100)<.11);
          assert.equal(await reading('accepted'),100);assert.equal(await time(),12);
          await captureWater('delivery');
          await event('overflow');assert.equal(await reading('waste'),100);
          assert.equal(await lab.locator('[data-water-phase]').getAttribute('data-water-phase'),'overflow');
          await event('end');assert.equal(await reading('unmet'),0);assert.equal(await reading('overflow'),59.6);
          assert.equal(await lab.locator('[data-water-outcome]').getAttribute('data-water-outcome'),'overflow');
          const balance=await reading('initial')+await reading('accepted')-await reading('remaining')-await reading('loss')-await reading('overflow');
          assert(Math.abs(balance)<.26,'Rounded water inventory accounts for input, tanks and all losses');
          await event('repair');const rotor=await lab.locator('[data-water-rotor]').getAttribute('transform');
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsWaterDay>16.2);
          await lab.locator('[data-water-part="processor"]').click();
          assert.equal(await playing.getAttribute('aria-pressed'),'true');await playing.click();
          assert.notEqual(await lab.locator('[data-water-rotor]').getAttribute('transform'),rotor,'Treatment volume drives processor motion');
          const paused=await time();await lab.locator('[data-water-reference]').click();assert.equal(await time(),paused);
          assert.equal(await lab.locator('[data-water-reference-path]').count(),0);await lab.locator('[data-water-reference]').click();
          const plot=lab.locator('[data-water-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
          else {await page.mouse.move(bounds.x+bounds.width*.4,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2,{steps:6});await page.mouse.up();}
          assert(Math.abs(await time()-15)<=.2,'Water graph supports pointer and touch inspection');
          await event('after');await lab.locator('#iss-water-time').focus();await page.keyboard.press('ArrowRight');assert.equal(await time(),12.1);
          await playing.click();await lab.locator('#iss-water-throughput').focus();await page.keyboard.press('ArrowRight');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="water"]').getAttribute('aria-pressed')==='false');assert.equal(await time(),0);
          await lab.locator('[data-water-outage-toggle]').click();assert.equal(await lab.locator('#iss-water-outage-start').isDisabled(),true);
          await lab.locator('[data-water-delivery-toggle]').click();assert.equal(await lab.locator('#iss-water-delivery-day').isDisabled(),true);
          assert.equal(await lab.locator('[data-water-event="before"]').isDisabled(),true);
          await lab.locator('[data-water-preset="steady"]').click();
          await lab.locator('#iss-water-clean').focus();await page.keyboard.press('End');
          await lab.locator('#iss-water-waste').focus();await page.keyboard.press('End');
          await lab.locator('[data-water-delivery-toggle]').click();await event('after');
          assert.equal(await reading('clean'),300);assert.equal(await reading('accepted'),0);
          assert.match(await lab.locator('[data-water-receipt]').textContent(),/100.0 L stays aboard/);
          await captureWater('full-tank');
          await playing.click();await page.locator('[data-eclss-lab="air"]').click();const waterDay=await time();
          await page.waitForTimeout(200);assert.equal(await time(),waterDay);
          await page.locator('[data-open-water-lab]').click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await lab.locator('[data-water-preset="bridge"]').click();await event('after');await captureWater('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Water lab stays within the viewport');
          console.log('Water inventory, outages, deliveries, tank limits, playback, mouse/touch and keyboard passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('pressure')) {
          console.log('Checking the airlock pressure lab at '+viewport.width+'px');
          await page.locator('[data-flight-rule="eclss"]').first().click();
          await page.locator('[data-eclss-lab="pressure"]').click();
          const lab=page.locator('[data-iss-pressure-lab]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsPressureMinute||0);
          const reading=async id=>parseFloat(await lab.locator('[data-pressure-reading="'+id+'"] strong').textContent());
          const event=id=>lab.locator('[data-pressure-event="'+id+'"]').click();
          const playing=lab.locator('[data-iss-playback-toggle="pressure"]');
          async function capturePressure(name) {
            await lab.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'start',behavior:'instant'});});
            const clip=await lab.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'pressure-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          assert.equal(await reading('lock'),101.3);
          await event('vent-end');assert.equal(await time(),6);assert.equal(await reading('vent'),0);
          assert.equal(await lab.locator('[data-pressure-phase]').getAttribute('data-pressure-phase'),'hold');
          const held=await reading('lock');await event('fill-start');assert.equal(await reading('lock'),held);
          assert.match(await lab.locator('[data-pressure-reading="transfer"]').textContent(),/sonic limit/);
          await capturePressure('refill');
          await event('subsonic');assert((await time())>11 && (await time())<12);
          await event('equal');assert.equal(await reading('inner-force'),.05);
          await event('end');assert.equal(await reading('transfer'),0);assert((await reading('outer-force'))>99);
          const balance=await reading('initial')-await reading('cabin-mass')-await reading('lock-mass')-await reading('vented');
          assert(Math.abs(balance)<.0021,'Rounded gas inventory conserves both reservoirs and vented mass');
          await capturePressure('equalized');
          await lab.locator('[data-pressure-preset="leak"]').click();
          const plot=lab.locator('[data-pressure-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(bounds.x+bounds.width*.2,bounds.y+bounds.height/2);
          else {await page.mouse.move(bounds.x+bounds.width*.1,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height/2,{steps:6});await page.mouse.up();}
          assert(Math.abs(await time()-4)<=.1,'Pressure graph supports mouse and touch inspection');
          const cabin=await reading('cabin'),lock=await reading('lock'),vented=await reading('vented');
          await lab.locator('[data-pressure-isolate]').click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          assert.equal(await reading('cabin'),cabin);assert.equal(await reading('lock'),lock);assert.equal(await reading('vented'),vented);
          assert.equal(await reading('transfer'),0);assert((await reading('vent'))>0);
          assert.equal(await lab.locator('[data-pressure-flow="equalize"]').count(),0);
          assert.equal(await lab.locator('[data-pressure-valve]').getAttribute('data-pressure-valve'),'closed');
          await capturePressure('isolate');
          await event('end');assert.equal(await reading('cabin'),cabin);assert((await reading('lock'))<lock);
          assert.equal(await lab.locator('[data-pressure-outcome]').getAttribute('data-pressure-outcome'),'isolated');
          await capturePressure('protected');
          await event('isolate');await lab.locator('#iss-pressure-time').focus();await page.keyboard.press('ArrowRight');
          assert(Math.abs(await time()-4.1)<.11);
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsPressureMinute>4.3);
          const hotspot=lab.locator('[data-pressure-hotspot="outer"]');
          await hotspot.scrollIntoViewIfNeeded();
          if(viewport.width<500)await hotspot.tap();
          else {
            const beforeHover=await hotspot.boundingBox();await hotspot.hover();
            const afterHover=await hotspot.boundingBox();
            assert(Math.abs(afterHover.x-beforeHover.x)<.5&&Math.abs(afterHover.y-beforeHover.y)<.5,'Hardware inspection target must stay under the pointer');
            await hotspot.click();
          }
          await page.waitForFunction(()=>document.querySelector('[data-pressure-part="outer"]').getAttribute('aria-pressed')==='true');
          assert.equal(await playing.getAttribute('aria-pressed'),'true');
          assert.equal(await lab.locator('[data-pressure-part="outer"]').getAttribute('aria-pressed'),'true');
          await playing.click();const paused=await time();await lab.locator('[data-pressure-reference]').click();assert.equal(await time(),paused);
          assert.equal(await lab.locator('[data-pressure-reference-path]').count(),0);
          await lab.locator('[data-pressure-clear-isolation]').click();assert.equal(await time(),0);
          await playing.click();await lab.locator('#iss-pressure-fill').focus();await page.keyboard.press('ArrowRight');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="pressure"]').getAttribute('aria-pressed')==='false');assert.equal(await time(),0);
          await lab.locator('#iss-pressure-start').focus();await page.keyboard.press('End');
          assert.match(await lab.locator('[data-pressure-reading="transfer"]').textContent(),/Airlock → cabin/);
          await capturePressure('reverse');
          await playing.click();await page.locator('[data-eclss-lab="water"]').click();const previousTime=await time();await page.waitForTimeout(200);assert.equal(await time(),previousTime);
          await page.locator('[data-eclss-lab="pressure"]').click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await lab.locator('[data-pressure-preset="cycle"]').click();await event('fill-start');await capturePressure('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Airlock lab stays within the viewport');
          console.log('Pressure cycles, gas budget, hatch loads, live isolation, reversed flow, playback, hardware hotspots, touch and keyboard passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('debris') && !args.includes('--debris-detector-only')) {
          console.log('Checking the hypervelocity shield lab at '+viewport.width+'px');
          await page.locator('.iss-ops-mode').filter({hasText:'Debris'}).click();
          const lab=page.locator('[data-iss-debris-lab]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsDebrisTime||0);
          const reading=async id=>parseFloat(await lab.locator('[data-debris-reading="'+id+'"] strong').textContent());
          const event=id=>lab.locator('[data-debris-event="'+id+'"]').click();
          const playing=lab.locator('[data-iss-playback-toggle="debris"]');
          async function captureDebris(name){
            await lab.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'start',behavior:'instant'});});
            const clip=await lab.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'debris-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          assert.equal(await reading('mass'),1.414);assert.equal(await reading('incoming'),101.8);
          await event('impact');assert.equal(await lab.locator('[data-debris-phase]').getAttribute('data-debris-phase'),'impact');
          assert.equal(await reading('incoming'),0);assert.equal(await reading('translation'),58.2);
          const sum=await reading('translation')+await reading('expansion')+await reading('internal');
          assert(Math.abs(sum-await reading('energy'))<.2,'Rounded energy partition balances');
          await event('wall');const arrival=await time();assert(await playing.isDisabled());
          await captureDebris('contact');
          await event('start');const plot=lab.locator('[data-debris-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(bounds.x+bounds.width*.6,bounds.y+bounds.height/2);
          else {await page.mouse.move(bounds.x+bounds.width*.3,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height/2,{steps:6});await page.mouse.up();}
          assert(Math.abs(await time()-arrival*.6)<arrival*.01,'Graph supports mouse and touch inspection');
          const selected=await time();await lab.locator('#iss-debris-time').focus();await page.keyboard.press('ArrowRight');assert(Math.abs(await time()-selected-.05)<1e-8);
          await captureDebris('cloud');
          await lab.locator('[data-debris-preset="compact"]').click();assert.equal(await time(),0);
          assert.match(await lab.locator('[data-debris-comparison]').textContent(),/1.00× the area; 0.0%/);
          await event('wall');await captureDebris('compact');
          await lab.locator('[data-debris-preset="dense"]').click();assert.equal(await lab.locator('#iss-debris-material').inputValue(),'steel');assert((await reading('mass'))>30);
          await lab.locator('#iss-debris-size').focus();await page.keyboard.press('Home');
          await lab.locator('#iss-debris-bumper').focus();await page.keyboard.press('End');
          await lab.locator('#iss-shield-gap').focus();await page.keyboard.press('End');
          await lab.locator('#iss-debris-material').selectOption('aluminum');
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsDebrisTime>.5);
          const inspector=lab.locator('[data-debris-part="wall"]');if(viewport.width<500)await inspector.tap();else await inspector.click();
          await page.waitForFunction(()=>document.querySelector('[data-debris-part="wall"]').getAttribute('aria-pressed')==='true');
          assert.equal(await playing.getAttribute('aria-pressed'),'true');await playing.click();
          const paused=await time();await lab.locator('[data-debris-compare]').click();assert.equal(await time(),paused);assert.equal(await lab.locator('[data-debris-reference-footprint]').count(),0);
          await playing.click();await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="debris"]').getAttribute('aria-pressed')==='false');
          assert.equal(await time(),0);assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await event('wall');assert.equal(await reading('spread'),0);await captureDebris('no-spread');
          await event('start');await playing.click();await page.locator('[data-flight-rule="power"]').click();const leaving=await time();await page.waitForTimeout(200);assert.equal(await time(),leaving);
          await page.locator('.iss-ops-mode').filter({hasText:'Debris'}).click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await lab.locator('[data-debris-preset="spaced"]').click();await lab.locator('[data-debris-compare]').click();
          const handle=lab.locator('[data-debris-wall-handle]');
          await handle.focus();await page.keyboard.press('Home');assert.equal(await handle.getAttribute('aria-valuenow'),'2');
          const near=await handle.boundingBox();await page.keyboard.press('End');const far=await handle.boundingBox();
          assert.equal(await handle.getAttribute('aria-valuenow'),'20');
          const perCm=(far.x-near.x)/18;assert(perCm>0,'Wall changes position on a stable spatial scale');
          await lab.locator('[data-debris-preset="spaced"]').click();
          await handle.evaluate(node=>{node.scrollIntoView({block:'center',behavior:'instant'});});
          const before=await handle.boundingBox(),x=before.x+before.width/2,y=before.y+before.height/2;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});
            for(let step=1;step<=4;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+perCm*step,y,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{
            await handle.hover();const hovered=await handle.boundingBox();assert(Math.abs(hovered.x-before.x)<.5,'Drag handle stays under the pointer on hover');
            await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+perCm*4,y,{steps:8});await page.mouse.up();
          }
          await page.waitForFunction(()=>window.__toolData.spaceStation.opsShieldGap===14);
          assert.equal(await handle.getAttribute('aria-valuenow'),'14');assert.equal(await lab.locator('#iss-shield-gap').inputValue(),'14');
          assert.equal(await time(),0);assert.equal(await handle.getAttribute('data-dragging'),null);
          const moved=await handle.boundingBox();assert(Math.abs(moved.x-before.x-perCm*4)<1,'Captured dragging tracks pointer displacement');
          await handle.focus();await page.keyboard.press('ArrowRight');assert.equal(await handle.getAttribute('aria-valuenow'),'15');
          await page.keyboard.press('ArrowLeft');assert.equal(await handle.getAttribute('aria-valuenow'),'14');
          await event('cloud');await playing.click();await lab.locator('[data-debris-pin]').click();
          assert.equal(await playing.getAttribute('aria-pressed'),'true');await playing.click();
          const pinned=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline));
          assert.match(await lab.locator('[data-debris-reference-status]').textContent(),/14 cm gap/);
          const inspected=await time();await lab.locator('[data-debris-vectors-toggle]').click();assert.equal(await time(),inspected);assert.equal(await lab.locator('[data-debris-vectors]').count(),0);
          await lab.locator('[data-debris-vectors-toggle]').click();assert.equal(await lab.locator('[data-debris-vector="radial-up"]').count(),1);
          await lab.locator('#iss-debris-speed').focus();await page.keyboard.press('End');
          await lab.locator('#iss-shield-gap').focus();await page.keyboard.press('End');
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),pinned);
          assert.equal(await lab.locator('[data-debris-setting][data-changed="true"]').count(),2);
          assert.equal(await lab.locator('[data-debris-setting="speed"] td').last().textContent(),'12 km/s');
          assert.equal(await lab.locator('[data-debris-setting="gap"] td').last().textContent(),'14 cm');
          await event('cloud');
          const probe=lab.locator('[data-debris-probe]'),probeStage=lab.locator('[data-debris-probe-stage]');
          const probeClock=await time(),probeMass=await reading('probe-mass');
          assert.equal(await probe.locator('[data-debris-tracer]').count(),64,'The transverse view samples the same live cloud');
          assert.match(await probe.locator('[data-debris-probe-insight]').textContent(),/75.00% of the mass carries 93.75%/);
          const fixedRadius=Number(await probe.locator('[data-debris-probe-cloud]').getAttribute('r'));
          await probe.locator('[data-debris-probe-magnify]').click();
          assert.equal(Number(await probe.locator('[data-debris-probe-cloud]').getAttribute('r')),110);
          assert.equal(await reading('probe-mass'),probeMass);assert.equal(await time(),probeClock);
          await probeStage.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
          const probeBox=await probeStage.locator('svg').boundingBox(),pcx=probeBox.x+probeBox.width/2,pcy=probeBox.y+probeBox.height/2,pr=110*probeBox.width/320;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pcx+pr*.25,y:pcy,id:0}]});
            for(let i=1;i<=4;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pcx+pr*(.25+i*.125),y:pcy,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{
            await page.mouse.move(pcx+pr*.25,pcy);await page.mouse.down();await page.mouse.move(pcx+pr*.75,pcy,{steps:8});await page.mouse.up();
          }
          assert.equal(await probeStage.getAttribute('aria-valuenow'),'75');
          assert.equal(await probe.locator('#iss-debris-probe-radius').inputValue(),'75');
          assert.equal(await time(),probeClock);assert.equal(await probeStage.getAttribute('data-dragging'),null);
          await probeStage.focus();await page.keyboard.press('Home');assert.equal(await reading('probe-mass'),0);
          await page.keyboard.press('End');assert.equal(await probeStage.getAttribute('aria-valuenow'),'100');
          await probe.locator('[data-debris-probe-preset="core"]').click();
          await probe.locator('#iss-debris-probe-radius').focus();await page.keyboard.press('ArrowRight');assert.equal(await probeStage.getAttribute('aria-valuenow'),'51');
          await page.keyboard.press('ArrowLeft');assert.equal(await probeStage.getAttribute('aria-valuenow'),'50');
          await probe.locator('[data-debris-probe-magnify]').click();
          assert.equal(Number(await probe.locator('[data-debris-probe-cloud]').getAttribute('r')),fixedRadius);
          assert.equal(await time(),probeClock);assert.equal(await reading('probe-mass'),probeMass);
          await probe.locator('[data-debris-probe-event="wall"]').click();assert.equal(await time(),Number(await lab.locator('#iss-debris-time').getAttribute('max')));
          assert.equal(await playing.isDisabled(),true);assert.equal(await reading('probe-mass'),probeMass);
          await probe.locator('[data-debris-probe-event="cloud"]').click();await probe.locator('[data-debris-probe-magnify]').click();
          await probe.screenshot({path:path.join(output,'debris-probe-'+viewport.width+'.png'),animations:'disabled'});
          const sweep=lab.locator('[data-debris-sweep]'),sweepPlot=sweep.locator('[data-debris-sweep-plot]');
          const sweepTime=await time(),value=()=>sweep.locator('[data-debris-sweep-selected] strong').textContent();
          const energyValue=await value();
          await sweep.locator('[data-debris-sweep-metric="flight"]').click();
          assert(Math.abs(parseFloat(await value())-await reading('flight'))<.01);assert.equal(await time(),sweepTime);
          await sweep.locator('[data-debris-sweep-metric="diameter"]').click();assert.match(await value(),/mm/);assert.equal(await time(),sweepTime);
          await sweep.locator('[data-debris-sweep-metric="fluence"]').click();await sweep.locator('[data-debris-sweep-scale]').click();
          assert.equal(await sweep.getAttribute('data-log'),'false');assert.equal(await value(),energyValue);assert.equal(await time(),sweepTime);
          await sweep.locator('[data-debris-sweep-scale]').click();assert.equal(await sweep.getAttribute('data-log'),'true');
          const savedCurve=await sweep.locator('[data-debris-sweep-reference-curve]').getAttribute('d');
          await sweepPlot.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
          const sweepBox=await sweepPlot.locator('svg').boundingBox(),sx=gap=>sweepBox.x+(16+(gap-2)/18*688)/720*sweepBox.width,sy=sweepBox.y+sweepBox.height/2;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx(6),y:sy,id:0}]});
            for(let gap=8;gap<=14;gap+=2)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx(gap),y:sy,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{
            await page.mouse.move(sx(6),sy);await page.mouse.down();await page.mouse.move(sx(14),sy,{steps:8});await page.mouse.up();
          }
          assert.equal(await sweepPlot.getAttribute('aria-valuenow'),'14');assert.equal(await lab.locator('#iss-shield-gap').inputValue(),'14');assert.equal(await time(),0);
          assert.equal(await sweepPlot.getAttribute('data-dragging'),null);assert.equal(await sweep.locator('[data-debris-sweep-reference-curve]').getAttribute('d'),savedCurve);
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),pinned);
          await sweepPlot.focus();await page.keyboard.press('Home');assert.equal(await sweepPlot.getAttribute('aria-valuenow'),'2');
          await page.keyboard.press('End');assert.equal(await sweepPlot.getAttribute('aria-valuenow'),'20');
          await sweep.locator('#iss-debris-sweep-gap').focus();await page.keyboard.press('ArrowLeft');assert.equal(await lab.locator('#iss-shield-gap').inputValue(),'19');
          await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');
          const flatValue=await value();await sweep.locator('#iss-debris-sweep-gap').focus();await page.keyboard.press('Home');assert.equal(await value(),flatValue);
          assert.match(await sweep.locator('[data-debris-sweep-note]').textContent(),/leaves cloud diameter and energy per area unchanged/);
          await sweep.screenshot({path:path.join(output,'debris-sweep-zero-spread-'+viewport.width+'.png'),animations:'disabled'});
          await lab.locator('[data-debris-preset="spaced"]').click();
          await lab.locator('#iss-debris-bumper').focus();await page.keyboard.press('End');
          await sweep.locator('#iss-debris-sweep-gap').focus();await page.keyboard.press('End');for(let i=0;i<4;i++)await page.keyboard.press('ArrowLeft');
          await event('cloud');
          await sweep.screenshot({path:path.join(output,'debris-sweep-'+viewport.width+'.png'),animations:'disabled'});
          const pair=lab.locator('[data-debris-pair]'),pairCurrent=lab.locator('[data-debris-pair-shot="current"]'),pairRef=lab.locator('[data-debris-pair-shot="reference"]');
          assert.equal(await pair.getAttribute('data-mode'),'contact');
          assert.equal(await pairCurrent.getAttribute('data-phase'),'contact');assert.equal(await pairRef.getAttribute('data-phase'),'contact');
          assert.notEqual(await pairCurrent.getAttribute('data-time'),await pairRef.getAttribute('data-time'));
          assert.equal(await pair.locator('[data-debris-pair-scene="current"]').getAttribute('data-scale'),await pair.locator('[data-debris-pair-scene="reference"]').getAttribute('data-scale'));
          const pairClock=await time(),navigation=lab.locator('[data-debris-nav]');
          for(const target of ['setup','probe-title','sweep-title','compare-title']){
            const link=navigation.locator('a[href="#iss-debris-'+target+'"]');
            if(viewport.width<500)await link.tap();else{await link.focus();await page.keyboard.press('Enter');}
            assert.equal(await page.evaluate(()=>document.activeElement.id),'iss-debris-'+target);
            assert.equal(await time(),pairClock,'Section navigation must preserve the shot clock');
            const head=await lab.locator('#iss-debris-'+target).boundingBox(),navBox=await navigation.boundingBox();
            assert(head.y>=navBox.y+navBox.height-1,'Navigation must not cover the destination');
          }
          await pair.locator('[data-debris-pair-mode="clock"]').click();assert.equal(await time(),pairClock);
          assert.equal(Number(await pairCurrent.getAttribute('data-time')),pairClock);
          assert.equal(await pairRef.getAttribute('data-held'),'true');assert.match(await pair.locator('[data-debris-pair-phase="reference"]').textContent(),/held/);
          const pairTime=pair.locator('#iss-debris-pair-time');
          await pairTime.focus();await page.keyboard.press('ArrowRight');assert(Math.abs(await time()-pairClock-.05)<1e-8);
          assert.equal(Number(await lab.locator('#iss-debris-time').inputValue()),await time());
          await pair.locator('[data-debris-pair-event="start"]').click();assert.equal(await time(),0);
          assert.equal(await pairCurrent.getAttribute('data-phase'),'approach');assert.equal(await pairRef.getAttribute('data-phase'),'approach');
          await pair.locator('[data-debris-pair-event="impact"]').click();assert.equal(await pairCurrent.getAttribute('data-phase'),'impact');
          await pairTime.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
          const pairBox=await pairTime.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(pairBox.x+pairBox.width*.65,pairBox.y+pairBox.height/2);
          else{await page.mouse.move(pairBox.x+pairBox.width*.25,pairBox.y+pairBox.height/2);await page.mouse.down();await page.mouse.move(pairBox.x+pairBox.width*.65,pairBox.y+pairBox.height/2,{steps:5});await page.mouse.up();}
          assert(await time()>Number(await pairTime.getAttribute('max'))*.6&&await time()<Number(await pairTime.getAttribute('max'))*.7);
          assert.equal(Number(await pairCurrent.getAttribute('data-time')),await time());assert.equal(await playing.getAttribute('aria-pressed'),'false');
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),pinned);
          async function capturePair(name){
            await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
            const clip=await pair.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'debris-pair-'+name+'-'+viewport.width+'.png'),clip,fullPage:true,animations:'disabled'});
          }
          await capturePair('clock');
          await pair.locator('[data-debris-pair-mode="contact"]').click();await capturePair('contact');
          await captureDebris('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Debris lab stays within the viewport');
          console.log('Impact phases, energy budget, captured wall dragging, saved references, velocity vectors, live cloud probing, magnification, standoff sweeps, reference curves, paired physical-time comparisons, section navigation, playback, mouse/touch and keyboard passed at '+viewport.width+'px');
        }
        if(tab==='operations'&&!accessibilityOnly&&operationLabs.includes('debris')){
          console.log('Checking the virtual footprint aperture at '+viewport.width+'px');
          await page.locator('.iss-ops-mode').filter({hasText:'Debris'}).click();
          const lab=page.locator('[data-iss-debris-lab]'),detector=lab.locator('[data-debris-detector]'),stage=detector.locator('[data-debris-detector-stage]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsDebrisTime||0);
          const energy=id=>detector.locator('[data-debris-detector-energy="'+id+'"]').textContent();
          async function captureAperture(name){
            await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
            const clip=await detector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'debris-aperture-'+name+'-'+viewport.width+'.png'),clip,fullPage:true,animations:'disabled'});
          }
          await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();
          await lab.locator('[data-debris-preset="spaced"]').click();
          await lab.locator('[data-debris-event="cloud"]').click();const inspected=await time();
          const saved=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline));
          await detector.locator('[data-debris-detector-preset="center"]').click();
          const center=await energy('current');assert(parseFloat(center)>0);assert.equal(await detector.locator('[data-debris-detector-status="current"]').textContent(),'Aperture fully inside');
          assert.equal(await detector.locator('[data-debris-detector-status="reference"]').textContent(),'Entire footprint sampled');
          await captureAperture('center');
          await detector.locator('[data-debris-detector-preset="current"]').click();assert.equal(await time(),inspected);
          assert(parseFloat(await energy('current'))<parseFloat(center));assert.equal(await energy('reference'),'0 J');
          assert.equal(await detector.locator('[data-debris-detector-status="current"]').textContent(),'Partial overlap');
          await captureAperture('edge');
          await stage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
          const box=await stage.locator('svg').boundingBox(),scale=Number(await stage.locator('svg').getAttribute('data-debris-detector-scale'));
          const sx=mm=>box.x+(180+mm/1000*scale)/550*box.width,sy=box.y+190/380*box.height;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx(5),y:sy,id:0}]});
            for(let mm=10;mm<=25;mm+=5)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx(mm),y:sy,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{await page.mouse.move(sx(5),sy);await page.mouse.down();await page.mouse.move(sx(25),sy,{steps:8});await page.mouse.up();}
          assert.equal(Number(await stage.getAttribute('aria-valuenow')),25);assert.equal(await stage.getAttribute('data-dragging'),null);assert.equal(await time(),inspected);
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),saved);
          await stage.focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await stage.getAttribute('aria-valuenow')),25.5);
          await page.keyboard.press('PageUp');assert.equal(Number(await stage.getAttribute('aria-valuenow')),30.5);
          await page.keyboard.press('End');assert.equal(await energy('current'),'0 J');assert.equal(await energy('reference'),'0 J');
          await page.keyboard.press('Home');assert.equal(await energy('current'),center);
          const profile=detector.locator('[data-debris-scan]'),scanStage=profile.locator('[data-debris-scan-stage]');
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),await energy('current'));
          const scanHigh=await profile.getAttribute('data-high'),scanCurve=await profile.locator('[data-debris-scan-curve="current"]').getAttribute('d');
          await profile.locator('[data-debris-scan-metric="mass"]').click();
          assert.equal(await profile.getAttribute('data-metric'),'mass');assert((await scanStage.getAttribute('aria-valuetext')).includes('mg'));
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),await detector.locator('[data-debris-detector-mass="current"]').textContent());
          await captureAperture('scan-mass');await profile.locator('[data-debris-scan-metric="energy"]').click();
          await scanStage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
          const scanBox=await scanStage.locator('svg').boundingBox(),maxOffset=Number(await scanStage.getAttribute('aria-valuemax'));
          const scanX=mm=>scanBox.x+(12+mm/maxOffset*576)/600*scanBox.width,scanY=scanBox.y+scanBox.height/2;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scanX(12),y:scanY,id:0}]});
            for(let mm=15;mm<=35;mm+=5)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:scanX(mm),y:scanY,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{await page.mouse.move(scanX(12),scanY);await page.mouse.down();await page.mouse.move(scanX(35),scanY,{steps:8});await page.mouse.up();}
          assert.equal(Number(await scanStage.getAttribute('aria-valuenow')),35);assert.equal(Number(await stage.getAttribute('aria-valuenow')),35);assert.equal(await detector.locator('#iss-debris-detector-offset').inputValue(),'35');
          assert.equal(await scanStage.getAttribute('data-dragging'),null);assert.equal(await profile.getAttribute('data-high'),scanHigh);
          assert.equal(await profile.locator('[data-debris-scan-curve="current"]').getAttribute('d'),scanCurve);
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),await energy('current'));assert.equal(await time(),inspected);
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),saved);
          await scanStage.focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await stage.getAttribute('aria-valuenow')),35.5);
          await page.keyboard.press('PageDown');assert.equal(Number(await stage.getAttribute('aria-valuenow')),30.5);
          await captureAperture('scan-energy');await scanStage.focus();await page.keyboard.press('End');assert.equal(await energy('current'),'0 J');assert.equal(await energy('reference'),'0 J');
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),'0 J');await page.keyboard.press('Home');assert.equal(await energy('current'),center);
          const radius=detector.locator('#iss-debris-detector-radius');await radius.focus();await page.keyboard.press('Home');assert.equal(await radius.inputValue(),'0.5');
          assert(parseFloat(await energy('current'))>0);assert.equal(await time(),inspected);
          const smallScanHigh=await profile.getAttribute('data-high');
          await lab.locator('[data-debris-compare]').click();assert.equal(await detector.locator('[data-debris-detector-result="reference"]').count(),0);
          assert.equal(await profile.getAttribute('data-high'),smallScanHigh);assert.equal(await profile.locator('[data-debris-scan-curve="reference"]').count(),0);
          assert.equal(Number(await stage.locator('svg').getAttribute('data-debris-detector-scale')),scale);
          await lab.locator('[data-debris-compare]').click();assert.equal(await detector.locator('[data-debris-detector-result="reference"]').count(),1);
          await radius.focus();await page.keyboard.press('End');assert.equal(await radius.inputValue(),'30');
          await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');
          assert.equal(await detector.locator('[data-debris-detector-status="current"]').textContent(),'Entire footprint sampled');
          await captureAperture('whole-cloud');
          await lab.locator('[data-debris-pin]').click();await radius.focus();await page.keyboard.press('Home');
          const ruler=Number(await detector.locator('[data-debris-detector-ruler]').getAttribute('data-length'));
          const rulerScale=Number(await stage.locator('svg').getAttribute('data-debris-detector-scale'));
          assert(ruler*1000<1);assert(430+ruler*rulerScale<550);assert(Math.abs(parseFloat(await detector.locator('.iss-debris-map-label.is-ruler').textContent())/1000-ruler)<ruler*1e-12);
          await captureAperture('small-scale');
          await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();
          await lab.locator('[data-debris-preset="spaced"]').click();
          await radius.focus();await page.keyboard.press('Home');for(let i=0;i<19;i++)await page.keyboard.press('ArrowRight');
          await detector.locator('[data-debris-detector-preset="current"]').click();await captureAperture('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Aperture lab fits viewport');
          console.log('Aperture overlap, linked radial energy/mass profiles, stable common axes, first-contact readings, captured pointer/touch movement, keyboard limits, independent clock, reference preservation and small-footprint states passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('attitude')) {
          console.log('Checking the momentum-management lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="attitude"]').click();
          const lab = page.locator('[data-iss-attitude-lab]');
          const clock = lab.locator('#iss-attitude-time');
          const playing = lab.locator('[data-iss-playback-toggle="attitude"]');
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const reading = async name => parseFloat((await lab.locator('[data-attitude-reading="' + name + '"] strong').textContent()).replace('−','-'));
          const event = id => lab.locator('[data-attitude-event="' + id + '"]').click();
          async function captureAttitude(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await lab.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, 'attitude-' + name + '-' + viewport.width + '.png'), fullPage: true, clip, animations: 'disabled' });
          }
          await lab.locator('[data-attitude-preset="hold"]').click();
          assert.equal(await lab.locator('#iss-attitude-torque').getAttribute('aria-valuetext'), '0.35 N·m');
          await event('end');
          assert.equal(await reading('angle'), 0);
          assert.equal(await reading('fuel'), 0);
          assert.equal(await lab.locator('[data-attitude-event="capacity"]').isDisabled(), true);
          await lab.locator('[data-attitude-preset="drift"]').click();
          await event('capacity');
          assert(Math.abs((await time()) - 19.7916666667) < 1e-6);
          assert.equal(await reading('angle'), 0);
          const beforeRotation = await lab.locator('[data-attitude-station]').getAttribute('transform');
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 20.1);
          assert.equal(await playing.getAttribute('aria-pressed'), 'true');
          assert.notEqual(await lab.locator('[data-attitude-station]').getAttribute('transform'), beforeRotation);
          await playing.click();
          const paused = await time();
          await lab.locator('[data-attitude-part="gyros"]').click();
          assert.equal(await time(), paused);
          assert.match(await lab.locator('[data-attitude-part-note]').textContent(), /constant-speed rotors/);
          await event('end');
          assert((await reading('angle')) > 16 && (await reading('angle')) < 17);
          assert((await reading('rate')) > 0);
          assert.equal(await lab.locator('[data-attitude-phase]').getAttribute('data-attitude-phase'), 'drifting');
          const transform = await lab.locator('[data-attitude-station]').getAttribute('transform');
          const angle = Number(transform.match(/rotate\(([^)]+)\)/)[1]);
          assert(Math.abs(angle - await reading('angle')) < .0051, 'Station orientation must use the actual displayed angle');
          await captureAttitude('drift');
          for (const [control,key] of [['#iss-cmg-load','End'],['#iss-attitude-torque','End'],['#iss-attitude-inertia','Home']]) {
            await lab.locator(control).focus();
            await page.keyboard.press(key);
          }
          await lab.locator('[data-attitude-part="station"]').click();
          await event('end');
          assert((await reading('angle')) > 80, 'The full allowed drift angle remains available');
          const wideAngle = await lab.locator('[data-attitude-station]').getAttribute('transform');
          assert(Math.abs(Number(wideAngle.match(/rotate\(([^)]+)\)/)[1]) - await reading('angle')) < .0051, 'Camera fit must preserve actual orientation');
          for (const part of ['station','gyros','thrusters']) {
            await lab.locator('[data-attitude-part="' + part + '"]').click();
            const frame = await lab.locator('.iss-attitude-scene > svg').boundingBox();
            const hardware = await lab.locator('[data-attitude-station]').boundingBox();
            assert(hardware.x >= frame.x && hardware.y >= frame.y && hardware.x + hardware.width <= frame.x + frame.width && hardware.y + hardware.height <= frame.y + frame.height, 'The rotating station must fit inside the scene at maximum drift');
          }
          await captureAttitude('wide-drift');
          await lab.locator('[data-attitude-preset="unload"]').click();
          await event('burn-start');
          assert.equal(await time(), 10);
          assert.equal(await lab.locator('[data-attitude-plumes]').count(), 1);
          assert.equal(await reading('fuel'), 0);
          assert.equal(await reading('thruster-torque'), -80);
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 10.4);
          await playing.click();
          assert((await reading('fuel')) > 0);
          const during = await time();
          await lab.locator('[data-attitude-reference]').click();
          assert.equal(await time(), during);
          assert.equal(await lab.locator('[data-attitude-reference-path]').count(), 0);
          await lab.locator('[data-attitude-reference]').click();
          await captureAttitude('unloading');
          await event('burn-end');
          assert.equal(await lab.locator('[data-attitude-load]').textContent(), '8.0%');
          assert.equal(await lab.locator('[data-attitude-plumes]').count(), 0);
          const used = await reading('fuel');
          await event('end');
          assert.equal(await reading('fuel'), used);
          assert.equal(await reading('angle'), 0);
          assert.equal(await lab.locator('[data-attitude-outcome]').getAttribute('data-attitude-outcome'), 'held');
          for (const id of ['momentum','angle']) {
            const plot = lab.locator('[data-attitude-plot="' + id + '"]');
            await plot.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'center', behavior: 'instant' }); });
            const bounds = await plot.boundingBox();
            if (viewport.width < 500) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            else {
              await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
              await page.mouse.down();
              await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
              await page.mouse.up();
            }
            assert(Math.abs(await time() - 46) <= .2, 'Both charts must share the inspection time');
          }
          await event('burn-start');
          await clock.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await time(), 10.1);
          await playing.click();
          await lab.locator('#iss-attitude-inertia').focus();
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="attitude"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await time(), 0);
          assert.equal(await lab.locator('#iss-attitude-inertia').inputValue(), '90');
          await lab.locator('#iss-attitude-fuel').focus();
          await page.keyboard.press('Home');
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('ArrowRight');
          assert.equal(await lab.locator('#iss-attitude-fuel').inputValue(), '0.1');
          await event('burn-end');
          assert.equal(await reading('fuel'), .1);
          assert.equal(await lab.locator('[data-attitude-plumes]').count(), 0);
          assert.match(await lab.locator('[data-attitude-burn-note]').textContent(), /propellant runs out/);
          await event('end');
          assert.equal(await lab.locator('[data-attitude-outcome]').getAttribute('data-attitude-outcome'), 'drifting');
          await captureAttitude('fuel-limited');
          await lab.locator('[data-attitude-preset="drift"]').click();
          await lab.locator('[data-attitude-burn-toggle]').click();
          await event('burn-start');
          assert.equal(await reading('cmg-torque'), 0, 'A late burn brakes the body before gyro storage falls');
          assert((await reading('rate')) > 0);
          await event('burn-end');
          assert.equal(await reading('rate'), 0);
          assert((await reading('angle')) > 2);
          assert.equal(await lab.locator('[data-attitude-outcome]').getAttribute('data-attitude-outcome'), 'offset');
          await lab.locator('[data-attitude-preset="unload"]').click();
          await lab.locator('#iss-attitude-burn-time').focus();
          await page.keyboard.press('Home');
          await page.keyboard.press('ArrowRight');
          await lab.locator('[data-attitude-burn-toggle]').click();
          assert.equal(await lab.locator('#iss-attitude-fuel').isDisabled(), true);
          assert.equal(await lab.locator('[data-attitude-event="burn-start"]').isDisabled(), true);
          await lab.locator('[data-attitude-preset="unload"]').click();
          await event('burn-start');
          await captureAttitude('ready');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Attitude lab stays within the viewport');
          console.log('Attitude drift, finite burns, fuel, comparison, playback, pointer and keyboard passed at ' + viewport.width + 'px');
        }
        if (tab === 'missions' && !accessibilityOnly && missionLabs.includes('docking')) {
          const dockCanvasBounds = await page.locator('[data-dock-canvas]').boundingBox();
          const thrusterBounds = await page.locator('[data-dock-thrusters]').boundingBox();
          assert(thrusterBounds.y >= dockCanvasBounds.y + dockCanvasBounds.height && thrusterBounds.y - dockCanvasBounds.y - dockCanvasBounds.height <= 12, 'Thrusters must stay directly below the flight display');
          const state = () => page.locator('[data-dock-canvas]').evaluate((canvas) => {
            const s = canvas._dockState;
            return { t: s.t, x: s.x, y: s.y, vx: s.vx, vy: s.vy, propellant: s.propellant, paused: s.paused, precision: s.precision, damp: s.damp };
          });
          await page.locator('[data-dock-pause]').click();
          const paused = await state();
          await page.waitForTimeout(350);
          assert.deepEqual(await state(), paused, 'Pause must freeze position, velocity, clock and propellant');
          await page.locator('[data-dock-precision]').click();
          assert.equal((await state()).precision, true);
          assert.equal(await page.locator('[data-dock-precision]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-dock-precision]').click();
          await page.getByRole('combobox', { name: 'Docking simulation clock speed' }).selectOption('1');
          await page.locator('[data-dock-pause]').click();
          const beforeThrust = await state();
          await page.getByRole('button', { name: 'Thrust Forward.', exact: false }).focus();
          await page.keyboard.down('Space');
          await page.waitForTimeout(600);
          await page.keyboard.up('Space');
          const afterThrust = await state();
          assert(afterThrust.propellant < beforeThrust.propellant, 'Held keyboard thrust must consume propellant');
          assert(afterThrust.vy > beforeThrust.vy, 'Forward thrust must increase along-track velocity');
          await page.locator('[data-dock-damp]').click();
          const beforeHold = await state();
          await page.waitForTimeout(600);
          const afterHold = await state();
          assert.equal(afterHold.damp, true);
          assert(afterHold.propellant < beforeHold.propellant, 'Rate hold must consume propellant');
          assert(Math.hypot(afterHold.vx, afterHold.vy) < Math.hypot(beforeHold.vx, beforeHold.vy), 'Rate hold must reduce relative speed');
          await page.locator('[data-dock-pause]').click();
          await page.locator('[data-dock-canvas]').screenshot({ path: path.join(output, `docking-${viewport.width}.png`) });
          const forecastPanel = page.locator('[data-dock-forecast-panel]');
          await page.locator('[data-dock-scenario="final"]').focus();
          await page.keyboard.press('Enter');
          assert.equal((await state()).paused, true, 'Practice starts must open paused');
          assert.equal((await state()).y, -25);
          assert.equal((await state()).propellant, 80, 'Practice starts must restore fuel');
          assert.equal(await page.locator('[data-dock-scenario="final"]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-dock-horizon]').selectOption('30');
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'coast');
          assert.equal(await forecastPanel.locator('[data-dock-forecast-reading="time"]').textContent(), '+30.0 s');
          const beforeForecast = await state();
          await page.locator('[data-dock-horizon]').selectOption('120');
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'capture');
          assert.match(await forecastPanel.getAttribute('aria-label'), /Soft capture forecast.*all thrusters off/i);
          assert.deepEqual(await state(), beforeForecast, 'Forecast controls must not move the spacecraft or spend fuel');
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="time"]').textContent()) < 120, 'Forecast must stop at first contact');
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="speed"]').textContent()) <= .6);
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="offset"]').textContent()) < 2.5);
          const forecastBounds = await forecastPanel.boundingBox();
          assert(forecastBounds.x >= 0 && forecastBounds.x + forecastBounds.width <= viewport.width + 1, 'Forecast must fit on screen');
          await page.locator('[data-iss-dock-panel]').screenshot({ path: path.join(output, `docking-forecast-${viewport.width}.png`) });
          const closeCanvas = page.locator('[data-dock-canvas]');
          const closeView = await closeCanvas.screenshot();
          const beforeCamera = await state();
          await page.locator('[data-dock-camera="wide"]').click();
          assert.equal(await page.locator('[data-dock-camera="wide"]').getAttribute('aria-pressed'), 'true');
          assert.notEqual(Buffer.compare(closeView, await closeCanvas.screenshot()), 0, 'Wide camera must change the actual rendered geometry');
          await page.locator('[data-dock-camera="approach"]').click();
          assert.deepEqual(await state(), beforeCamera, 'Changing cameras must not change the flight state');
          const meterView = await closeCanvas.evaluate(canvas => canvas._dockViewSnapshot());
          assert(meterView.scale > 6, 'Close approach must magnify the docking opening');
          await closeCanvas.screenshot({ path: path.join(output, `docking-camera-${viewport.width}.png`) });
          assert.equal(await page.locator('[data-dock-pulse-seconds]').inputValue(), '0.5', 'Displayed default must match the model pulse duration');
          await page.locator('[data-dock-pulse-seconds]').selectOption('0.25');
          const beforePulse = await state();
          await page.locator('[data-dock-maneuver="fwd"]').focus();
          await page.keyboard.press('Enter');
          const afterPulse = await state();
          assert.equal(afterPulse.paused, true);
          assert(Math.abs(afterPulse.t - beforePulse.t - .25) < 1e-8, 'A pulse must advance exactly the selected simulation time');
          assert(afterPulse.vy > beforePulse.vy);
          const fullPulseFuel = beforePulse.propellant - afterPulse.propellant;
          assert(fullPulseFuel > 0);
          assert.equal(await page.locator('[data-dock-maneuver-reading="elapsed"]').textContent(), '0.25 s');
          assert.equal(await page.locator('[data-dock-maneuver-report]').isVisible(), true);
          await page.locator('[data-dock-precision]').click();
          const beforeFine = await state();
          await page.locator('[data-dock-maneuver="fwd"]').click();
          const fineFuel = beforeFine.propellant - (await state()).propellant;
          assert(Math.abs(fineFuel * 4 - fullPulseFuel) < 1e-9, 'Precision pulses must use quarter thrust and propellant');
          const beforeCoast = await state();
          await page.locator('[data-dock-maneuver="coast"]').click();
          const afterCoast = await state();
          assert(Math.abs(afterCoast.t - beforeCoast.t - 5) < 1e-8);
          assert.equal(afterCoast.propellant, beforeCoast.propellant);
          assert.equal(await page.locator('[data-dock-maneuver-reading="fuel"]').textContent(), '0.000 kg');
          await page.waitForTimeout(250);
          assert.deepEqual(await state(), afterCoast, 'Stepped maneuvers must stay paused without residual thrust');
          const maneuverBounds = await page.locator('[data-dock-maneuver-panel]').boundingBox();
          assert(maneuverBounds.x >= 0 && maneuverBounds.x + maneuverBounds.width <= viewport.width + 1, 'Maneuver controls and readings must fit on screen');
          await page.locator('[data-iss-dock-panel]').screenshot({ path: path.join(output, `docking-maneuver-${viewport.width}.png`) });
          await page.locator('[data-dock-scenario="drift"]').click();
          assert.equal(await page.locator('[data-dock-maneuver-report]').isVisible(), false, 'A practice reset must clear the previous step');
          assert.equal((await state()).paused, true);
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'contact');
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="offset"]').textContent()) >= 2.5, 'Cross-drift practice must reveal the missed alignment');
          await page.getByRole('button', { name: 'New approach', exact: false }).click();
          assert.equal((await state()).paused, false, 'A retry should start the selected practice');
          assert.equal(await page.locator('[data-dock-scenario="drift"]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-dock-pause]').click();
        }
        if (tab === 'missions' && !accessibilityOnly && missionLabs.includes('eva')) {
          const dockingPaused = await page.locator('[data-dock-canvas]').evaluate(canvas => canvas._dockState.paused);
          if (!dockingPaused) await page.locator('[data-dock-pause]').click();
          const eva = page.locator('[data-iss-eva-mechanics]');
          // Capture document coordinates directly: element screenshots can
          // repeatedly auto-scroll a tall lab around its focused control.
          const captureEva = async filename => {
            await eva.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await eva.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, filename), fullPage: true, clip, animations: 'disabled' });
          };
          const rate = async () => parseFloat(await eva.locator('[data-eva-angular-rate] strong').textContent());
          if (!args.includes('--eva-posture-only')) {
            await eva.getByRole('button', { name: 'Foot restraint locked', exact: false }).click();
            assert.equal(await rate(), 0, 'Releasing a restraint alone must not create rotation');
            await eva.locator('[data-eva-pulse-action="pulse-end"]').click();
            const freeRate = await rate();
            const cutoffAngle = Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'));
            assert(freeRate > 0, 'An unrestrained torque pulse must produce angular velocity');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await rate(), freeRate, 'The astronaut must keep the same angular velocity during the coast');
            assert(Math.abs(Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'))) > Math.abs(cutoffAngle), 'Rotation must continue while the wrench is off');
            assert.equal(parseFloat(await eva.locator('[data-eva-net-torque] strong').textContent()), 0, 'Coasting must apply no net body torque');
            await eva.locator('#iss-eva-torque').focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(Number(await eva.locator('#iss-eva-time').inputValue()), 0, 'Changing torque starts a fresh trial');
            await eva.locator('[data-eva-pulse-action="pulse-end"]').click();
            const higherRate = await rate();
            assert(higherRate > freeRate, 'More tool torque must increase reaction angular velocity');
            await eva.locator('#iss-eva-inertia').focus();
            await page.keyboard.press('ArrowRight');
            await eva.locator('[data-eva-pulse-action="pulse-end"]').click();
            assert((await rate()) < higherRate, 'Higher rotational inertia must lower the response to the same torque');
            await eva.locator('[data-eva-pulse-action="reset"]').click();
            await eva.locator('[data-iss-playback-toggle="eva"]').click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > 0.1);
            await eva.locator('[data-iss-playback-toggle="eva"]').click();
            const pausedPulse = await eva.locator('#iss-eva-time').inputValue();
            await page.waitForTimeout(250);
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), pausedPulse, 'EVA playback must pause its clock');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            const evaBounds = await eva.boundingBox();
            assert(evaBounds.x >= 0 && evaBounds.x + evaBounds.width <= viewport.width + 1, 'The reaction lab must fit on screen');
            await captureEva(`eva-${viewport.width}.png`);
            await eva.getByRole('button', { name: 'Astronaut unrestrained', exact: false }).click();
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await rate(), 0, 'A locked foot restraint must transfer reaction to the station');
            await eva.locator('[data-eva-counter-preset="stop"]').focus();
            await page.keyboard.press('Enter');
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0', 'A counterpulse preset must reset the trial');
            assert.equal(await eva.locator('#iss-eva-counter-ratio').inputValue(), '100');
            assert.equal(await eva.getByRole('button', { name: 'Astronaut unrestrained', exact: false }).getAttribute('aria-pressed'), 'false', 'Counterpulse presets must release the model restraint');
            await eva.locator('[data-eva-pulse-action="counter-end"]').click();
            const stoppedAngle = Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'));
            assert.equal(await rate(), 0, 'Matched opposite impulses must cancel spin');
            assert(Math.abs(stoppedAngle) > 1, 'Stopping spin must not restore the initial orientation');
            assert.equal(await eva.locator('[data-eva-spin-direction]').getAttribute('data-eva-spin-direction'), 'stopped');
            assert.match(await eva.locator('[data-eva-angular-momentum] strong').textContent(), /^0\.0 /);
            assert.match(await eva.locator('[data-eva-rotational-energy]').textContent(), /0\.000 J/);
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle')), stoppedAngle, 'The stopped astronaut must hold the new orientation');
            await captureEva(`eva-stopped-${viewport.width}.png`);
            await eva.locator('[data-eva-counter-preset="reverse"]').click();
            await eva.locator('[data-eva-pulse-action="counter-end"]').click();
            const reversedAngle = Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'));
            const reverseRate = await rate();
            assert(reverseRate > 0);
            assert.equal(await eva.locator('[data-eva-spin-direction]').getAttribute('data-eva-spin-direction'), 'reverse');
            assert.match(await eva.locator('[data-eva-angular-momentum] strong').textContent(), /^\+/);
            assert.equal(await eva.locator('[data-eva-free-coast-path]').count(), 1, 'A counterpulse must show the free-coast comparison');
            assert(Number(await eva.locator('[data-eva-rate-plot] circle').getAttribute('cy')) < 100, 'Reversed angular velocity must plot above the zero line');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await rate(), reverseRate);
            assert(Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle')) > reversedAngle, 'Reverse spin must rotate the drawn body in the new direction');
            await captureEva(`eva-reversed-${viewport.width}.png`);
            await eva.locator('[data-eva-pulse-action="reset"]').click();
            await eva.locator('[data-iss-playback-toggle="eva"]').click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > .1);
            await eva.locator('#iss-eva-counter-ratio').focus();
            await page.keyboard.press('Home');
            for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowRight');
            assert.equal(await eva.locator('#iss-eva-counter-ratio').inputValue(), '50');
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0', 'Changing counter torque must reset time');
            assert.equal(await eva.locator('[data-iss-playback-toggle="eva"]').getAttribute('aria-pressed'), 'false', 'Changing counter torque must stop playback');
            await page.waitForTimeout(250);
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await eva.locator('[data-eva-spin-direction]').getAttribute('data-eva-spin-direction'), 'original', 'An underpowered counterpulse must leave original spin');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'EVA controls must not create horizontal overflow');
          }
          console.log(`Checking EVA posture at ${viewport.width}px`);
          await eva.locator('[data-eva-counter-preset="coast"]').click();
          await eva.locator('[data-eva-posture-preset="tuck"]').click();
          await eva.locator('[data-eva-pulse-action="posture-start"]').click();
          const postureStartRate = await rate();
          const postureStartInertia = parseFloat(await eva.locator('[data-eva-current-inertia] strong').textContent());
          const postureMomentum = await eva.locator('[data-eva-angular-momentum] strong').textContent();
          const extendedLimbs = await eva.locator('[data-eva-limbs]').getAttribute('d');
          await eva.locator('[data-eva-pulse-action="posture-end"]').click();
          assert.equal(await eva.locator('#iss-eva-time').inputValue(), '1.25');
          assert.equal(parseFloat(await eva.locator('[data-eva-current-inertia] strong').textContent()), 16);
          assert.equal(await eva.locator('[data-eva-angular-momentum] strong').textContent(), postureMomentum, 'A posture change must conserve angular momentum');
          assert(Math.abs(await rate() / postureStartRate - postureStartInertia / 16) < .02, 'Tucking must change spin inversely with inertia');
          assert(parseFloat(await eva.locator('[data-eva-posture-work] strong').textContent()) > 0, 'Tucking must account for added rotational energy');
          assert.equal(parseFloat(await eva.locator('[data-eva-net-torque] strong').textContent()), 0);
          assert.notEqual(await eva.locator('[data-eva-limbs]').getAttribute('d'), extendedLimbs, 'Changing posture must change the rendered limbs');
          await eva.locator('[data-eva-posture-compare]').click();
          assert.equal(await eva.locator('[data-eva-held-posture-path]').count(), 0);
          assert.equal(await eva.locator('#iss-eva-time').inputValue(), '1.25');
          await eva.locator('[data-eva-posture-compare]').click();
          await eva.locator('[data-eva-pulse-action="reset"]').click();
          await eva.locator('[data-iss-playback-toggle="eva"]').click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > 1.25);
          const ratePlot = eva.locator('[data-eva-rate-plot]');
          await ratePlot.scrollIntoViewIfNeeded();
          const rateBox = await ratePlot.boundingBox();
          const inspectX = seconds => rateBox.x + rateBox.width * (4 + seconds / 2.5 * 335) / 343;
          if (viewport.width < 500) {
            await page.touchscreen.tap(inspectX(1), rateBox.y + rateBox.height / 2);
          } else {
            await page.mouse.move(inspectX(.8), rateBox.y + rateBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(inspectX(1), rateBox.y + rateBox.height / 2, { steps: 6 });
            await page.mouse.up();
          }
          assert(Math.abs(Number(await eva.locator('#iss-eva-time').inputValue()) - 1) < .02, 'The graph must inspect the selected posture time');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="eva"]').getAttribute('aria-pressed') === 'false');
          const inspectedTime = Number(await eva.locator('#iss-eva-time').inputValue());
          await eva.locator('#iss-eva-time').focus();
          await page.keyboard.press('ArrowRight');
          assert(Math.abs(Number(await eva.locator('#iss-eva-time').inputValue()) - inspectedTime - .01) < 1e-8);
          await eva.locator('[data-eva-pulse-action="posture-end"]').click();
          await captureEva(`eva-posture-tuck-${viewport.width}.png`);
          console.log(`Captured tucked posture at ${viewport.width}px`);
          await eva.locator('[data-eva-pulse-action="reset"]').click();
          await eva.locator('[data-iss-playback-toggle="eva"]').click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > .1);
          await eva.locator('[data-eva-posture-preset="extend"]').click();
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="eva"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0');
          await eva.locator('#iss-eva-posture-inertia').focus();
          await page.keyboard.press('ArrowLeft');
          assert.equal(await eva.locator('#iss-eva-posture-inertia').inputValue(), '60');
          await page.keyboard.press('End');
          await eva.locator('[data-eva-pulse-action="posture-end"]').click();
          assert((await rate()) < postureStartRate, 'Extending must slow the spin');
          assert.match(await eva.locator('[data-eva-posture-work] strong').textContent(), /^−/);
          await captureEva(`eva-posture-extend-${viewport.width}.png`);
          await eva.locator('[data-eva-counter-preset="stop"]').click();
          await eva.locator('[data-eva-pulse-action="counter-end"]').click();
          assert.equal(await rate(), 0, 'Equal opposite pulses must still stop a changed posture');
          assert.equal(parseFloat(await eva.locator('[data-eva-rotational-energy] strong').textContent()), 0);
          await captureEva(`eva-posture-stop-${viewport.width}.png`);
          console.log(`Checked posture and counterpulse at ${viewport.width}px`);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          if (viewport.width < 620) {
            const route = page.locator('.iss-eva-visual');
            await route.focus();
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(() => document.querySelector('.iss-eva-visual').scrollLeft > 0);
            assert.equal(await route.evaluate(node => document.activeElement === node), true, 'The scrollable route must be keyboard reachable');
          }
        }
        const accessibility = [];
        if (args.includes('--accessibility') || accessibilityOnly) {
          if (accessibilityOnly && tab === 'interior') {
            await page.locator('.iss-route-button').nth(2).click();
            await page.locator('[data-iss-momentum-bench]').waitFor();
          }
          await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
          async function audit(label) {
            const result = await page.evaluate(async () => {
              const scan = await window.axe.run(document.querySelector('.iss-root'), {
                rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
              });
              return { passes: scan.passes.length, violations: scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) };
            });
            assert.deepEqual(result.violations, [], `${label} structural accessibility violations`);
            accessibility.push({ state: label, ...result });
          }
          await audit(tab);
          if (tab === 'quiz') {
            await page.locator('[data-iss-quiz-option="0"]').click();
            await page.waitForFunction(() => document.activeElement === document.querySelector('[data-iss-quiz-next]'));
            await audit('quiz answered');
            await page.locator('[data-iss-quiz-next]').click();
            await page.waitForFunction(() => document.activeElement === document.querySelector('#iss-quiz-option-1-0'));
          }
        }
        results.push({ tab, viewport: viewport.width, ...layout, ...(!accessibilityOnly ? { screenshot: filename } : {}), ...(accessibility.length ? { accessibility } : {}) });
        await page.evaluate(() => window.__destroy?.());
      }
      assert.deepEqual(errors, [], `Browser errors at ${viewport.width}px`);
      await page.close();
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: true, results }, null, 2));
    console.log(JSON.stringify({ ok: true, output, checks: results.length, screenshots: results.map((r) => r.screenshot).filter(Boolean) }, null, 2));
  } finally { await browser.close(); }
}

async function main() {
  const port = Number(argument('--port', args.includes('--serve') ? 4179 : 0));
  const { server, base } = await createPreview(port);
  console.log(`Space Station working-tree preview: ${base}`);
  if (args.includes('--serve')) {
    process.on('SIGINT', () => server.close(() => process.exit(0)));
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
    return;
  }
  try { await capture(base, path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa'))); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { createPreview, capture };
