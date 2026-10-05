const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Installed Chrome, canonical source, React host contract. Test-only canvas instrumentation captures rendered label text and dimensions; actual controls complete exercises.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
let completedData;
const selected = process.argv.includes('--visual-only') ? /fits|labels|edge|prominence|zoom|colors|motion|keyboard/i : null;
async function check(name, action) {
  if (selected && !selected.test(name)) return;
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function makePage(data, width = 1440, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 1100 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const fillRect = proto.fillRect, fillText = proto.fillText, clearRect = proto.clearRect, conic = proto.createConicGradient, rotate = proto.rotate;
    window.__qaConicCount = 0;
    window.__qaRotations = [];
    proto.rotate = function(angle) {
      if (window.__qaRotations.length < 5000) window.__qaRotations.push({ angle, shiftTime: window.__atcGameRef?.current?.time || 0 });
      return rotate.apply(this, arguments);
    };
    proto.fillRect = function(x, y, width, height) {
      const transform = this.getTransform();
      if (x === 0 && y === 0 && width * Math.abs(transform.a) >= this.canvas.width - 1 && height * Math.abs(transform.d) >= this.canvas.height - 1) this.canvas.__qaTexts = [];
      return fillRect.apply(this, arguments);
    };
    proto.clearRect = function(x, y, width, height) {
      const transform = this.getTransform();
      if (x === 0 && y === 0 && width * Math.abs(transform.a) >= this.canvas.width - 1 && height * Math.abs(transform.d) >= this.canvas.height - 1) this.canvas.__qaTexts = [];
      return clearRect.apply(this, arguments);
    };
    proto.fillText = function(text, x, y) {
      const texts = this.canvas.__qaTexts || (this.canvas.__qaTexts = []);
      const transform = this.getTransform(), scale = Math.hypot(transform.a, transform.b);
      if (texts.length < 1000) texts.push({ text: String(text), x: x * transform.a + y * transform.c + transform.e, y: x * transform.b + y * transform.d + transform.f, width: this.measureText(String(text)).width * scale, font: this.font, scale, align: this.textAlign });
      return fillText.apply(this, arguments);
    };
    if (conic) proto.createConicGradient = function() { window.__qaConicCount++; return conic.apply(this, arguments); };
  });
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
async function start(page, id) {
  await page.locator('#stem-atctower-tab-practice').click();
  await page.locator('[data-atctower-practice-start="' + id + '"]').click();
  await page.locator('[data-atctower-playing]').waitFor();
  await page.locator('[data-atctower-exercise="' + id + '"]').waitFor();
  await page.waitForTimeout(100);
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
async function canvasData(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    return { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height, top: rect.top + scrollY, texts: canvas.__qaTexts || [], selected: window.__atcGameRef.current.aircraft.find(ac => ac.id === window.__atcGameRef.current.selected)?.callsign };
  });
}

(async () => {
  fixture = await createFixtureServer();
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    for (const width of [1440, 390, 320]) {
      await check('Menu fits ' + width + ' pixels with accessible onboarding and training choices', async () => {
        const page = await makePage(null, width);
        try { await fit(page); await axe(page); assert.equal(await page.getByRole('tab').count(), 5); await screenshot(page, 'menu-' + width); }
        finally { await page.close(); }
      });
      await check('Playing fits ' + width + ' pixels with readable labels and radar before controls', async () => {
        const page = await makePage(null, width);
        try {
          await start(page, 'crossing_priority'); await fit(page); await axe(page);
          const detail = await canvasData(page);
          assert.ok(detail.cssWidth >= (width >= 1000 ? 600 : width - 70), JSON.stringify(detail));
          assert.ok(detail.texts.every(item => Number.isFinite(item.x) && Number.isFinite(item.y) && !/undefined|NaN/.test(item.text)), 'Invalid radar text');
          const selectedLabel = detail.texts.find(item => item.text === detail.selected);
          assert.ok(selectedLabel, 'Selected callsign must be shown on radar: ' + detail.selected);
          const pixels = parseFloat(selectedLabel.font.match(/([\d.]+)px/)?.[1]) * selectedLabel.scale * detail.cssWidth / detail.width;
          assert.ok(pixels >= 10.9, 'Selected radar label was ' + pixels.toFixed(2) + ' CSS px');
          const order = await page.evaluate(() => {
            const radar = document.querySelector('canvas'), controls = document.querySelector('#atc-aircraft-controls-title').closest('section');
            return !!(radar.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING);
          });
          assert.equal(order, true);
          await screenshot(page, 'playing-' + width);
          return { radarCssWidth: detail.cssWidth, selectedLabelCssPixels: pixels, radarDocumentTop: detail.top };
        } finally { await page.close(); }
      });
      await check('Debrief fits ' + width + ' pixels with accessible objective evidence and retry', async () => {
        const page = await makePage(null, width);
        try {
          await start(page, 'first_landing'); await page.getByRole('button', { name: 'End shift', exact: true }).click();
          await page.locator('[data-atctower-debrief]').waitFor(); await fit(page); await axe(page);
          assert.equal(await page.locator('[data-atctower-exercise]').getAttribute('data-exercise-status'), 'in-progress');
          assert.equal(await page.locator('[data-atctower-practice-retry="first_landing"]').count(), 1);
          assert.equal(await page.locator('[data-atctower-exercise] .atc-pill').innerText(), 'Attempt recorded');
          assert.equal(await page.locator('.atc-debrief-actions button.atc-primary').count(), 1);
          assert.match(await page.locator('[data-atctower-practice-retry="first_landing"]').getAttribute('class'), /atc-primary/);
          await screenshot(page, 'debrief-' + width);
        } finally { await page.close(); }
      });
    }
    await check('Radar edge labels keep the selected callsign inside the scope', async () => {
      const page = await makePage(null, 320);
      try {
        await start(page, 'first_landing');
        for (const [x, y] of [[395, 5], [5, 395], [395, 395], [5, 5]]) {
          await page.evaluate(pos => { const game = window.__atcGameRef.current, ac = game.aircraft[0]; ac.x = pos[0]; ac.y = pos[1]; game.paused = true; }, [x, y]);
          await page.waitForTimeout(150);
          const data = await canvasData(page), text = data.texts.find(item => item.text === data.selected);
          assert.ok(text, 'Missing selected label near ' + x + ', ' + y);
          const left = text.align === 'center' ? text.x - text.width / 2 : text.align === 'right' ? text.x - text.width : text.x;
          assert.ok(left >= -1 && left + text.width <= data.width + 1 && text.y > 0 && text.y <= data.height, JSON.stringify({ x, y, text, bounds: [data.width, data.height] }));
          const details = data.texts.filter(item => /C172|90\s*kt|TRAIN101/.test(item.text));
          for (const line of details) {
            const lineLeft = line.align === 'center' ? line.x - line.width / 2 : line.align === 'right' ? line.x - line.width : line.x;
            assert.ok(lineLeft >= -1 && lineLeft + line.width <= data.width + 1 && line.y > 0 && line.y <= data.height, 'Clipped aircraft detail: ' + JSON.stringify(line));
          }
        }
        await screenshot(page, 'radar-edge-320');
      } finally { await page.close(); }
    });
    await check('High DPI phone radar stays crisp and preserves readable selected labels', async () => {
      const page = await makePage(null, 390, { deviceScaleFactor: 2 });
      try {
        await start(page, 'crossing_priority'); await fit(page);
        const detail = await canvasData(page);
        assert.ok(detail.width >= detail.cssWidth * 1.95, 'Radar backing width must match high DPI display: ' + JSON.stringify({ backing: detail.width, css: detail.cssWidth }));
        const text = detail.texts.find(item => item.text === detail.selected); assert.ok(text);
        const pixels = parseFloat(text.font.match(/([\d.]+)px/)?.[1]) * text.scale * detail.cssWidth / detail.width;
        assert.ok(pixels >= 10.9, 'Retina label was ' + pixels + ' CSS px');
        const radar = page.locator('canvas'); await radar.scrollIntoViewIfNeeded();
        const rect = await radar.boundingBox();
        await page.mouse.click(rect.x + 270 / 400 * rect.width, rect.y + 200 / 400 * rect.height);
        await page.waitForFunction(() => window.__atcGameRef.current.selected === 102);
        assert.equal(await page.locator('[data-atctower-aircraft="102"]').getAttribute('aria-pressed'), 'true');
        await screenshot(page, 'high-dpi-390');
        return { backingWidth: detail.width, cssWidth: detail.cssWidth, selectedLabelCssPixels: pixels };
      } finally { await page.close(); }
    });
    await check('Keyboard selection and forms preserve focused control access', async () => {
      const page = await makePage();
      try {
        await start(page, 'crossing_priority');
        const radar = page.getByRole('application'); await radar.focus(); await radar.press('ArrowRight');
        const selected = await page.evaluate(() => window.__atcGameRef.current.selected);
        assert.equal(selected, 102); await radar.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.tagName !== 'CANVAS'), true);
        await page.getByRole('button', { name: 'Set heading', exact: true }).click();
        const input = page.locator('[data-atctower-command-entry="heading"] input');
        await page.waitForFunction(() => document.activeElement?.id === 'atc-command-value');
        await input.press('Escape');
        await page.waitForFunction(() => document.activeElement?.getAttribute('data-atctower-command') === 'h');
        assert.equal(await page.locator('[data-atctower-command-entry]').count(), 0);
      } finally { await page.close(); }
    });
    await check('200 percent CSS zoom fits menu, practice, and debrief without horizontal scrolling', async () => {
      const page = await makePage();
      try {
        await page.evaluate(() => { document.body.style.zoom = '2'; }); await fit(page); await axe(page);
        await start(page, 'first_landing'); await fit(page); await axe(page); await screenshot(page, 'playing-200percent-zoom');
        await page.getByRole('button', { name: 'End shift', exact: true }).click(); await fit(page); await axe(page);
      } finally { await page.close(); }
    });
    await check('Reduced motion suppresses the radar sweep while flight controls still advance', async () => {
      const page = await makePage(null, 390, { reducedMotion: 'reduce' });
      try {
        await start(page, 'first_landing'); assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        await page.evaluate(() => { window.__qaRotations = []; });
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.time >= 0.25);
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__qaConicCount), 0);
        const rotations = await page.evaluate(() => window.__qaRotations);
        assert.equal(rotations.some(item => item.shiftTime > 0.05 && Math.abs(item.angle - item.shiftTime * 2) < 1e-7), false, 'Selected ring rotated under reduced motion');
        assert.ok(await page.evaluate(() => window.__atcGameRef.current.time > 0)); await screenshot(page, 'reduced-motion-390');
      } finally { await page.close(); }
    });
    await check('Forced colors retains selected states, named controls, and visible focus', async () => {
      const page = await makePage(null, 390, { forcedColors: 'active' });
      try {
        await start(page, 'crossing_priority'); await fit(page);
        await page.locator('[data-atctower-aircraft="101"]').focus();
        const state = await page.locator('[data-atctower-aircraft="101"]').evaluate(node => ({ pressed: node.getAttribute('aria-pressed'), outline: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth), background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color }));
        assert.equal(state.pressed, 'true'); assert.ok(state.outline !== 'none' && state.width >= 2, JSON.stringify(state));
        assert.notEqual(state.background, state.color); await screenshot(page, 'forced-colors-390'); await axe(page);
      } finally { await page.close(); }
    });
    await check('Quick practice starts a manageable paused first exercise directly from the briefing', async () => {
      const page = await makePage(null, 390);
      try {
        const quick = page.locator('[data-atctower-quick-practice]');
        assert.equal(await quick.count(), 1); assert.equal(await quick.getAttribute('data-atctower-quick-practice'), 'first_landing');
        const position = await quick.boundingBox(); assert.ok(position && position.y < 1100 && position.height >= 44, JSON.stringify(position));
        await quick.click(); await page.locator('[data-atctower-playing]').waitFor();
        await page.waitForFunction(() => document.activeElement?.id === 'atc-exercise-title');
        const seed = await page.evaluate(() => { const game = window.__atcGameRef.current; return { id: game.practice.id, paused: game.paused, time: game.time, aircraft: game.aircraft.map(ac => ac.callsign) }; });
        assert.deepEqual(seed, { id: 'first_landing', paused: true, time: 0, aircraft: ['TRAIN101'] });
        await fit(page);
      } finally { await page.close(); }
    });
    await check('Practice pathway recommends the first exercise and keeps all four exercises selectable', async () => {
      const page = await makePage(null, 320);
      try {
        await page.locator('#stem-atctower-tab-practice').click();
        const pathway = page.locator('[data-atctower-pathway]'); await pathway.waitFor();
        assert.equal(await pathway.locator('[data-atctower-pathway-card]').count(), 4);
        assert.equal(await pathway.locator('[data-atctower-pathway-card][data-practice-state="new"]').count(), 4);
        assert.equal(await page.locator('[data-atctower-pathway-count]').getAttribute('data-atctower-pathway-count'), '0');
        assert.equal(await page.locator('[data-atctower-recommended-start]').count(), 1);
        assert.equal(await page.locator('[data-atctower-recommended-start]').getAttribute('data-atctower-recommended-start'), 'first_landing');
        for (const id of ['first_landing', 'arrival_sequence', 'separation_recovery', 'crossing_priority']) assert.equal(await page.locator('[data-atctower-practice-start="' + id + '"]').isEnabled(), true);
        await fit(page); await axe(page); await screenshot(page, 'pathway-320');
      } finally { await page.close(); }
    });
    await check('Compact live objectives separate action progress from safety conditions and keep radar prominent', async () => {
      const page = await makePage(null, 320);
      try {
        await start(page, 'crossing_priority');
        const details = page.locator('[data-atctower-objective-details]');
        assert.equal(await details.count(), 1); assert.equal(await details.evaluate(node => node.open), false);
        const progress = await page.locator('[data-atctower-objective-progress]').evaluate(node => ({ value: node.value, max: node.max }));
        assert.equal(progress.value, 0); assert.ok(progress.max > 0 && progress.max < await page.locator('[data-atctower-exercise-criterion]').count(), JSON.stringify(progress));
        const data = await canvasData(page); assert.ok(data.top < 950, 'Radar began at ' + data.top.toFixed(1) + ' CSS px');
        await details.locator(':scope > summary').click(); assert.equal(await details.evaluate(node => node.open), true);
        assert.match(await details.innerText(), /briefing|MED101|clear so far|safety/i);
        const before = await page.evaluate(() => window.__atcGameRef.current.time); await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => window.__atcGameRef.current.time), before);
        await details.locator(':scope > summary').click(); assert.equal(await details.evaluate(node => node.open), false); await fit(page);
        return { actionProgress: progress, radarDocumentTop: data.top, detailsStartClosed: true };
      } finally { await page.close(); }
    });
    await check('A real touchdown unlocks measured completion, saves evidence, and recommends the next practice', async () => {
      const page = await makePage();
      try {
        await page.locator('[data-atctower-quick-practice="first_landing"]').click();
        await page.locator('[data-atctower-playing]').waitFor();
        await page.locator('[data-atctower-command="r"]').click();
        await page.getByRole('button', { name: 'Clear approach', exact: true }).click();
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.practice.completed === true, null, { timeout: 40000 });
        await page.locator('[data-atctower-exercise][data-exercise-status="complete"]').waitFor();
        const evidence = await page.evaluate(() => { const game = window.__atcGameRef.current; return { landed: game.landed, landedIds: game.practice.landedIds, conflictEpisodes: game.conflictEpisodes, paused: game.paused, shiftSeconds: game.time }; });
        assert.equal(evidence.landed, 1); assert.deepEqual(evidence.landedIds, [101]); assert.equal(evidence.conflictEpisodes, 0); assert.equal(evidence.paused, true);
        assert.equal(await page.getByRole('button', { name: 'Resume shift', exact: true }).isDisabled(), true);
        const progress = await page.locator('[data-atctower-objective-progress]').evaluate(node => ({ value: node.value, max: node.max }));
        assert.equal(progress.value, progress.max);
        await screenshot(page, 'measured-completion-desktop');
        await page.locator('[data-atctower-save-debrief]').click(); await page.locator('[data-atctower-debrief]').waitFor();
        completedData = await page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower)));
        fs.writeFileSync(path.join(__dirname, 'measured-completion-data.json'), JSON.stringify(completedData, null, 2) + '\n');
        assert.equal(completedData.activeShift, null); assert.equal(completedData.lastShift.exerciseResult.complete, true);
        assert.equal(completedData.practiceLearning.version, 1);
        const next = page.locator('[data-atctower-next-practice]'); assert.equal(await next.count(), 1);
        assert.equal(await next.getAttribute('data-atctower-next-practice'), 'arrival_sequence');
        assert.equal(await page.locator('.atc-debrief-actions button.atc-primary').count(), 1);
        assert.match(await next.getAttribute('class'), /atc-primary/);
        await fit(page); await axe(page); await screenshot(page, 'completed-debrief-desktop');
        await next.click(); await page.locator('[data-atctower-exercise="arrival_sequence"]').waitFor();
        await page.waitForFunction(() => document.activeElement?.id === 'atc-exercise-title');
        const nextSeed = await page.evaluate(() => { const game = window.__atcGameRef.current; return { paused: game.paused, time: game.time, roster: game.aircraft.map(ac => ac.callsign) }; });
        assert.deepEqual(nextSeed, { paused: true, time: 0, roster: ['NEAR101', 'FAST102'] });
        return { measuredOutcome: evidence, nextExercise: 'arrival_sequence' };
      } finally { await page.close(); }
    });
    await check('Recorded pathway progress survives reopening and remains complete after an unfinished retry', async () => {
      assert.ok(completedData, 'The real touchdown check did not provide a saved debrief');
      const initial = JSON.parse(JSON.stringify(completedData)); initial.view = 'menu'; initial.atcMenuPanel = 'practice';
      const page = await makePage(initial, 390);
      try {
        await page.locator('[data-atctower-pathway]').waitFor();
        assert.equal(await page.locator('[data-atctower-pathway-count]').getAttribute('data-atctower-pathway-count'), '1');
        assert.equal(await page.locator('[data-atctower-pathway-card="first_landing"]').getAttribute('data-practice-state'), 'complete');
        assert.equal(await page.locator('[data-atctower-recommended-start]').getAttribute('data-atctower-recommended-start'), 'arrival_sequence');
        await screenshot(page, 'earned-pathway-390');
        await page.locator('[data-atctower-practice-start="first_landing"]').click();
        await page.locator('[data-atctower-playing]').waitFor(); await page.getByRole('button', { name: 'End shift', exact: true }).click();
        await page.locator('[data-atctower-debrief]').waitFor();
        assert.equal(await page.locator('[data-atctower-exercise]').getAttribute('data-exercise-status'), 'in-progress');
        await page.getByRole('button', { name: 'Choose airport', exact: true }).click(); await page.locator('#stem-atctower-tab-practice').click();
        assert.equal(await page.locator('[data-atctower-pathway-card="first_landing"]').getAttribute('data-practice-state'), 'complete');
        assert.equal(await page.locator('[data-atctower-pathway-count]').getAttribute('data-atctower-pathway-count'), '1');
        await fit(page); await axe(page);
      } finally { await page.close(); }
    });
    await check('Live failed retry records the attempt and moves keyboard focus to the fresh exercise goal', async () => {
      const page = await makePage();
      try {
        await start(page, 'separation_recovery');
        const original = await page.evaluate(() => window.__atcGameRef.current.shiftId);
        await page.getByRole('button', { name: 'Resume shift', exact: true }).click();
        await page.waitForFunction(() => window.__atcGameRef.current.conflictEpisodes > 0, null, { timeout: 10000 });
        await page.getByRole('button', { name: 'Pause shift', exact: true }).click();
        await page.locator('[data-atctower-exercise="separation_recovery"][data-exercise-status="review"]').waitFor();
        await page.locator('[data-atctower-practice-retry="separation_recovery"]').click();
        await page.waitForFunction(previous => window.__atcGameRef.current.shiftId !== previous && document.activeElement?.id === 'atc-exercise-title', original);
        const state = await page.evaluate(() => { const game = window.__atcGameRef.current, data = window.__atcToolData.atcTower; return { paused: game.paused, time: game.time, conflictEpisodes: game.conflictEpisodes, altitudes: game.aircraft.map(ac => ac.altitude), recordedFailed: data.lastShift.exerciseResult.failed, historyLength: data.shiftHistory.length }; });
        assert.deepEqual(state, { paused: true, time: 0, conflictEpisodes: 0, altitudes: [5000, 5000], recordedFailed: true, historyLength: 1 });
        return state;
      } finally { await page.close(); }
    });
    await check('Debrief to Practice pathway restores the active tab for keyboard continuation', async () => {
      const page = await makePage();
      try {
        await start(page, 'first_landing'); await page.getByRole('button', { name: 'End shift', exact: true }).click();
        await page.locator('[data-atctower-debrief]').waitFor();
        const button = page.getByRole('button', { name: 'Practice pathway', exact: true });
        await button.focus(); await button.press('Enter');
        await page.locator('[data-atctower-pathway]').waitFor();
        await page.waitForFunction(() => document.activeElement?.id === 'stem-atctower-tab-practice');
        assert.equal(await page.locator('#stem-atctower-tab-practice').getAttribute('aria-selected'), 'true');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#stem-atctower-tab-ops').getAttribute('aria-selected'), 'true');
      } finally { await page.close(); }
    });
    await check('No uncaught runtime errors or unexpected native dialogs', async () => assert.deepEqual(results.errors, []));
  } catch (error) { results.errors.push(error.stack); console.error(error); }
  finally {
    results.finished = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
    if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve));
    process.exitCode = results.errors.length || results.checks.some(item => !item.pass) ? 1 : 0;
  }
})();
