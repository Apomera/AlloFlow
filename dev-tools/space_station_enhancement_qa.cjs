#!/usr/bin/env node
'use strict';

// Working-tree preview and browser QA for the Space Station tool.
//   node dev-tools/space_station_enhancement_qa.cjs --serve --port=4179
//   node dev-tools/space_station_enhancement_qa.cjs --capture
//   node dev-tools/space_station_enhancement_qa.cjs --capture --out=reports/my-run --tabs=map,interior --widths=1440,390
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
      page.on('pageerror', (error) => errors.push(error.message));
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
            await bench.screenshot({ path: path.join(output, `momentum-${viewport.width}.png`) });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflow, false, 'Momentum experiment should fit the viewport');
          }
        }
        if (tab === 'orbit' && !accessibilityOnly) {
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
          await page.locator('[data-iss-transfer-action="coast"]').click();
          assert(Number(await page.locator('#iss-transfer-time').inputValue()) > 0, 'Coast should advance elapsed transfer time');
          await page.locator('[data-iss-transfer-action="arrive"]').click();
          assert.equal(await page.locator('#iss-transfer-time').inputValue(), '1000');
          await page.locator('[data-iss-transfer-action="circularize"]').click();
          assert.equal(await page.locator('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage'), '2');
          await page.locator('[data-iss-transfer-stage]').screenshot({ path: path.join(output, `transfer-${viewport.width}.png`) });
        }
        if (tab === 'missions' && !accessibilityOnly) {
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
          await page.locator('[data-dock-scenario="drift"]').click();
          assert.equal((await state()).paused, true);
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'contact');
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="offset"]').textContent()) >= 2.5, 'Cross-drift practice must reveal the missed alignment');
          await page.getByRole('button', { name: 'New approach', exact: false }).click();
          assert.equal((await state()).paused, false, 'A retry should start the selected practice');
          assert.equal(await page.locator('[data-dock-scenario="drift"]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-dock-pause]').click();
          const eva = page.locator('[data-iss-eva-mechanics]');
          await eva.getByRole('button', { name: 'Foot restraint locked', exact: false }).click();
          const rate = async () => parseFloat(await eva.locator('[data-eva-angular-rate] strong').textContent());
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
          await eva.screenshot({ path: path.join(output, `eva-${viewport.width}.png`) });
          await eva.getByRole('button', { name: 'Astronaut unrestrained', exact: false }).click();
          await eva.locator('[data-eva-pulse-action="coast-end"]').click();
          assert.equal(await rate(), 0, 'A locked foot restraint must transfer reaction to the station');
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
