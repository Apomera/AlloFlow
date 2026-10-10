const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');

const results = { started: new Date().toISOString(), fixture: 'Canonical ATC React component; native exploration controls and actual paused traffic steps.', checks: [], errors: [], screenshots: [] };
const artifactDir = process.env.ATC_QA_ARTIFACT_DIR || path.join(__dirname, 'runs', results.started.replace(/[^0-9A-Za-z]/g, ''));
fs.mkdirSync(artifactDir, { recursive: true });
let fixture, browser;

async function check(name, fn) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  try {
    const detail = await fn();
    results.checks.push({ name, pass: true, detail: detail || null });
    console.log('PASS ' + name);
  } catch (error) {
    results.checks.push({ name, pass: false, error: error.stack });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}

async function pageFor(width = 1440, initial = null) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  if (initial) {
    await page.addInitScript(data => { window.__explorationInitial = { atcTower: data }; }, initial);
    await page.route(fixture.url, async route => {
      const response = await route.fetch();
      const html = await response.text();
      const marker = "React.useState({atcTower:{view:'menu'}})";
      assert.ok(html.includes(marker), 'Fixture state initialization marker must exist');
      await route.fulfill({ response, body: html.replace(marker, 'React.useState(window.__explorationInitial)') });
    });
  }
  return page;
}

async function start(page, scenario = 'first_landing') {
  await page.goto(fixture.url);
  await page.locator('#stem-atctower-tab-practice').click();
  await page.locator('[data-atctower-practice-start="' + scenario + '"]').click();
  await page.locator('[data-atctower-playing]').waitFor();
  await page.locator('[data-atctower-flight-time]').waitFor();
}

async function onPage(fn, width = 1440, scenario = 'first_landing') {
  const page = await pageFor(width);
  try { await start(page, scenario); return await fn(page); }
  finally { await page.close(); }
}

async function state(page) {
  return page.evaluate(() => {
    const data = JSON.parse(JSON.stringify(window.__atcToolData));
    // The normal recovery checkpoint refreshes this timestamp every five seconds.
    // All persisted simulation and learning fields remain part of the comparison.
    if (data.atcTower && data.atcTower.activeShift) delete data.atcTower.activeShift.savedAt;
    return { game: JSON.parse(JSON.stringify(window.__atcGameRef.current)), data, xp: JSON.parse(JSON.stringify(window.__atcXP)) };
  });
}

async function game(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcGameRef.current))); }
async function command(page, key) { await page.locator('button[data-atctower-command="' + key + '"]').click(); }
async function draft(page, heading = 0) {
  await command(page, 'h');
  await page.locator('[data-atctower-command-entry] input').fill(String(heading));
  await page.locator('[data-atctower-path-focus="draft"]').waitFor();
}
async function send(page) { await page.locator('[data-atctower-command-entry] button[type=submit]').click(); }
async function cancel(page) { await page.locator('[data-atctower-command-entry] button').filter({ hasText: /Cancel/ }).click(); }
async function setTime(page, seconds) {
  await page.locator('[data-atctower-flight-time]').evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await page.waitForFunction(value => Number(document.querySelector('[data-atctower-flight-time]').value) === value, seconds);
}
async function projection(page, kind = 'current') {
  return page.locator('[data-atctower-projection="' + kind + '"]').evaluate(card => ({
    seconds: Number(card.getAttribute('data-atctower-path-seconds')),
    reason: card.getAttribute('data-atctower-path-end'),
    ...Object.fromEntries([...card.querySelectorAll('[data-atctower-path-value]')].map(node => [node.getAttribute('data-atctower-path-value'), Number(node.getAttribute('data-value'))]))
  }));
}
async function marker(page, kind = 'current') {
  return page.locator('[data-atctower-path-focus="' + kind + '"]').evaluate(node => Object.fromEntries(['seconds', 'x', 'y', 'heading'].map(key => [key, Number(node.getAttribute('data-' + key))])));
}
async function agree(page, kind = 'current', expectedSeconds = null) {
  const card = await projection(page, kind);
  const focus = await marker(page, kind);
  assert.ok([card.seconds, card.heading, card.altitude, card.speed, card.distance, focus.seconds, focus.x, focus.y, focus.heading].every(Number.isFinite), JSON.stringify({ card, focus }));
  assert.equal(card.seconds, focus.seconds);
  assert.ok(Math.abs(card.heading - focus.heading) < 1e-8, JSON.stringify({ card, focus }));
  if (expectedSeconds !== null) assert.equal(card.seconds, expectedSeconds);
  return { card, focus };
}
async function step(page) {
  const before = (await game(page)).time;
  await page.locator('[data-atctower-step="10"]').click();
  await page.waitForFunction(time => window.__atcGameRef.current.time > time, before);
  return game(page);
}
async function fit(page) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
  return dimensions;
}
async function axe(page) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
  assert.deepEqual(violations, []);
}
async function capture(page, name, selector = null) {
  const file = path.join(artifactDir, name + '.png');
  if (selector) await page.locator(selector).screenshot({ path: file });
  else { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: file, fullPage: true }); }
  results.screenshots.push(file);
}

async function checks() {
  await check('Time exploration defaults to the horizon endpoint with a labeled native range', () => onPage(async page => {
    const range = page.locator('[data-atctower-flight-time]');
    assert.equal(await range.getAttribute('type'), 'range');
    assert.equal(await range.getAttribute('min'), '0');
    assert.equal(await range.getAttribute('max'), '60');
    assert.equal(await range.getAttribute('step'), '5');
    assert.equal(await range.inputValue(), '60');
    const label = await range.evaluate(input => ({ labels: [...input.labels].map(n => n.textContent.trim()), name: input.getAttribute('aria-label'), text: input.getAttribute('aria-valuetext') }));
    assert.ok(label.labels.some(Boolean) || label.name, JSON.stringify(label));
    assert.ok(label.text && /60/.test(label.text), JSON.stringify(label));
    const reset = page.locator('[data-atctower-flight-time-reset]');
    assert.ok(await reset.isDisabled() || await reset.getAttribute('aria-disabled') === 'true');
    return agree(page, 'current', 60);
  }));

  await check('Native range keyboard explores zero, ten, and thirty seconds without simulation changes', () => onPage(async page => {
    const before = await state(page);
    const range = page.locator('[data-atctower-flight-time]');
    await range.focus();
    await page.keyboard.press('Home');
    assert.equal(await range.evaluate(node => node.matches(':focus-visible')), true);
    assert.equal(await range.inputValue(), '0');
    const zero = await agree(page, 'current', 0);
    assert.equal(zero.card.distance, 0);
    assert.equal(zero.focus.x, before.game.aircraft[0].x);
    assert.equal(zero.focus.y, before.game.aircraft[0].y);
    for (let index = 0; index < 2; index++) await page.keyboard.press('ArrowRight');
    assert.equal(await range.inputValue(), '10');
    assert.ok(Math.abs((await agree(page, 'current', 10)).card.distance - 0.25) < 1e-8);
    for (let index = 0; index < 4; index++) await page.keyboard.press('ArrowRight');
    assert.equal(await range.inputValue(), '30');
    assert.ok(Math.abs((await agree(page, 'current', 30)).card.distance - 0.75) < 1e-8);
    assert.deepEqual(await state(page), before);
    assert.equal(await range.evaluate(node => document.activeElement === node), true);
    await axe(page);
  }));

  await check('Current and draft markers follow their exact sampled turn at the same requested time', () => onPage(async page => {
    await setTime(page, 10);
    await draft(page, 0);
    const before = await state(page);
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '10');
    const active = await agree(page, 'current', 10);
    const proposed = await agree(page, 'draft', 10);
    assert.equal(active.card.heading, 270);
    assert.equal(proposed.card.heading, 300);
    assert.notDeepEqual([active.focus.x, active.focus.y], [proposed.focus.x, proposed.focus.y]);
    assert.ok(Math.abs(proposed.card.distance - 0.25) < 1e-8);
    await setTime(page, 0);
    const zeroActive = await agree(page, 'current', 0), zeroDraft = await agree(page, 'draft', 0);
    assert.deepEqual(zeroActive.focus, zeroDraft.focus);
    assert.equal(zeroActive.card.distance, 0); assert.equal(zeroDraft.card.distance, 0);
    await setTime(page, 30);
    assert.equal((await agree(page, 'draft', 30)).card.heading, 0);
    assert.deepEqual(await state(page), before);
    await page.locator('[data-atctower-command-entry] input').fill('90');
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '30');
    await agree(page, 'current', 30); await agree(page, 'draft', 30);
    await capture(page, 'after-draft-turn-scrub-1440', '.atc-flight-lab');
  }));

  await check('Ten-second sampled guidance agrees with actual whole-loop paused motion', () => onPage(async page => {
    await draft(page, 0); await send(page); await setTime(page, 10);
    const forecast = await agree(page, 'current', 10), before = await game(page), after = await step(page);
    const observed = after.aircraft.find(ac => ac.id === before.selected);
    for (const key of ['x', 'y', 'heading']) assert.ok(Math.abs(observed[key] - forecast.focus[key]) < 1e-8, key + ': ' + JSON.stringify({ observed, forecast }));
    for (const key of ['heading', 'speed', 'altitude']) assert.ok(Math.abs(observed[key] - forecast.card[key]) < 1e-8);
    assert.ok(Math.abs(after.time - before.time - 10 / 120) < 1e-10);
    assert.equal(after.paused, true);
    assert.deepEqual(await page.evaluate(() => window.__atcXP), []);
    return { forecast: forecast.focus, observed: { x: observed.x, y: observed.y, heading: observed.heading }, shiftSeconds: after.time };
  }));

  await check('Horizon and aircraft selection reset the cursor while hide and show preserve it', () => onPage(async page => {
    const before = await state(page);
    await setTime(page, 10);
    await page.locator('[data-atctower-flight-horizon="120"]').click();
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '120');
    await agree(page, 'current', 120);
    await setTime(page, 30);
    await page.locator('[data-atctower-flight-path-toggle]').click();
    assert.equal(await page.locator('[data-atctower-flight-time]').count(), 0);
    assert.equal(await page.locator('[data-atctower-path-focus]').count(), 0);
    await page.locator('[data-atctower-flight-path-toggle]').click();
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '30');
    await agree(page, 'current', 30);
    assert.deepEqual(await state(page), before);
    await page.locator('[data-atctower-aircraft="102"]').click();
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '120');
    const selected = await game(page);
    assert.equal(selected.selected, 102);
    assert.deepEqual(selected.aircraft, before.game.aircraft);
    assert.equal(selected.time, before.game.time);
    assert.equal(selected.score, before.game.score);
    assert.deepEqual(await page.evaluate(() => window.__atcXP), []);
  }, 1440, 'arrival_sequence'));

  await check('Endpoint reset reports availability and retains keyboard focus', () => onPage(async page => {
    const before = await state(page);
    await setTime(page, 10);
    const reset = page.locator('[data-atctower-flight-time-reset]');
    assert.equal(await reset.isDisabled(), false);
    assert.notEqual(await reset.getAttribute('aria-disabled'), 'true');
    await reset.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '60');
    assert.equal(await reset.getAttribute('aria-disabled'), 'true');
    assert.equal(await reset.evaluate(node => document.activeElement === node), true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '60');
    assert.deepEqual(await state(page), before);
    await agree(page, 'current', 60);
  }));

  await check('A short fuel path shows its actual non-grid endpoint at later requested times', async () => {
    let saved;
    await onPage(async page => { saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); });
    saved.activeShift.aircraft[0].fuel = 0.1;
    const page = await pageFor(390, saved);
    try {
      await page.goto(fixture.url); await page.locator('[data-atctower-flight-time]').waitFor();
      const before = await state(page);
      const endpoint = await agree(page, 'current', 6);
      assert.equal(endpoint.card.reason, 'fuel');
      assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '60');
      await setTime(page, 5); await agree(page, 'current', 5);
      await setTime(page, 10);
      assert.deepEqual(await agree(page, 'current', 6), endpoint);
      await draft(page, 0); const duringDraft = await state(page);
      await agree(page, 'draft', 6); await setTime(page, 30);
      await agree(page, 'current', 6); await agree(page, 'draft', 6);
      assert.deepEqual(await state(page), duringDraft);
      await cancel(page);
      assert.deepEqual((await game(page)).aircraft, before.game.aircraft);
      assert.equal((await game(page)).time, before.game.time);
      await fit(page); await axe(page); await capture(page, 'after-early-fuel-end-390', '.atc-flight-lab');
      return endpoint;
    } finally { await page.close(); }
  });

  await check('Independent active and draft boundary endpoints keep their own timestamps', async () => {
    let saved;
    await onPage(async page => { saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); });
    const aircraft = saved.activeShift.aircraft[0];
    Object.assign(aircraft, { x: 418.5, y: 200, heading: 90, targetHeading: null });
    const page = await pageFor(1440, saved);
    try {
      await page.goto(fixture.url); await page.locator('[data-atctower-flight-time]').waitFor();
      await draft(page, 0); await setTime(page, 30);
      const before = await state(page), active = await agree(page), proposed = await agree(page, 'draft');
      assert.equal(active.card.reason, 'airspace');
      assert.ok(active.card.seconds < 30);
      assert.equal(proposed.card.seconds, 30);
      assert.equal(proposed.card.reason, 'horizon');
      assert.ok(proposed.card.seconds > active.card.seconds);
      await setTime(page, 0); await agree(page, 'current', 0); await agree(page, 'draft', 0);
      await setTime(page, 30); assert.deepEqual(await state(page), before);
      return { active, proposed };
    } finally { await page.close(); }
  });

  await check('A matching shift retry resets exploration without carrying cursor state into recovery', () => onPage(async page => {
    await setTime(page, 10);
    await command(page, 'end'); await page.locator('[data-atctower-debrief]').waitFor();
    await page.locator('[data-atctower-practice-retry="first_landing"]').click();
    await page.locator('[data-atctower-flight-time]').waitFor();
    assert.equal(await page.locator('[data-atctower-flight-time]').inputValue(), '60');
    assert.equal((await game(page)).time, 0);
    assert.equal((await game(page)).paused, true);
    const keys = await page.evaluate(() => Object.keys(window.__atcToolData.atcTower.activeShift));
    assert.ok(!keys.some(key => /flightTime|flightCursor|exploration|scrub/i.test(key)), JSON.stringify(keys));
    await agree(page, 'current', 60);
  }));

  for (const width of [1440, 390, 320]) {
    await check('Exploration controls and draft detail fit accessibly at ' + width + 'px', () => onPage(async page => {
      await draft(page, 0); await setTime(page, 10);
      await agree(page, 'current', 10); await agree(page, 'draft', 10);
      await fit(page); await axe(page);
      const boxes = await page.locator('.atc-flight-lab button, [data-atctower-flight-time]').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => ({ tag: node.tagName, height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width })));
      assert.ok(boxes.length > 0 && boxes.every(box => box.height >= 44 && box.width >= 44), JSON.stringify(boxes));
      const details = page.locator('[data-atctower-flight-exploration]');
      assert.equal(await details.evaluate(node => node.tagName), 'DETAILS');
      assert.equal(await details.evaluate(node => node.open), false);
      await details.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await details.evaluate(node => node.open), true);
      await fit(page); await axe(page);
      await capture(page, 'after-exploration-draft-' + width, '.atc-flight-lab');
      await capture(page, 'after-playing-exploration-' + width);
      return { dimensions: await fit(page), controls: boxes.length };
    }, width));
  }

  await check('Forced colors and two hundred percent zoom preserve timeline access and distinct path shapes', () => onPage(async page => {
    await draft(page, 0); await setTime(page, 10);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.evaluate(() => document.body.style.zoom = '2');
    await fit(page); await axe(page);
    await agree(page, 'current', 10); await agree(page, 'draft', 10);
    const shapes = await page.locator('[data-atctower-path-detail]').evaluate(node => ({ current: node.querySelector('[data-atctower-path-focus="current"] .atc-flight-focus-ring').tagName, draft: node.querySelector('[data-atctower-path-focus="draft"] .atc-flight-focus-ring').tagName }));
    assert.notEqual(shapes.current, shapes.draft, JSON.stringify(shapes));
    const range = page.locator('[data-atctower-flight-time]');
    await range.focus(); await page.keyboard.press('Home');
    await agree(page, 'current', 0); await agree(page, 'draft', 0);
    await capture(page, 'after-forced-colors-exploration-200percent');
  }, 390));

  await check('Timeline and actual stepping remain usable without canvas drawing', async () => {
    const page = await pageFor(320);
    try {
      await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = function() { return null; }; });
      await start(page); await draft(page, 0); await setTime(page, 30);
      await agree(page, 'current', 30); await agree(page, 'draft', 30);
      assert.equal((await game(page)).radarAvailable, false);
      await send(page); await setTime(page, 10);
      const forecast = await agree(page, 'current', 10), observed = (await step(page)).aircraft[0];
      assert.equal(observed.heading, forecast.card.heading);
      await fit(page); await axe(page); await capture(page, 'after-no-canvas-exploration-320');
    } finally { await page.close(); }
  });

  await check('Paused automatic guidance hides stale targets while a manual speed instruction remains visible', () => onPage(async page => {
    await command(page, 'r'); await command(page, 'c');
    await command(page, 's');
    await page.locator('[data-atctower-command-entry] input').fill('120');
    await send(page);
    const before = await state(page), aircraft = before.game.aircraft[0];
    assert.equal(aircraft.state, 'approach');
    for (const id of ['heading', 'altitude']) {
      const instrument = page.locator('[data-atctower-instrument="' + id + '"]');
      assert.equal(await instrument.getAttribute('data-direction'), 'guided');
      assert.equal(await instrument.getAttribute('data-target'), '');
      assert.equal(Number(await instrument.getAttribute('data-current')), aircraft[id]);
      assert.equal(await instrument.locator('[data-atctower-readback-target]').textContent(), 'Guided');
      assert.equal(await instrument.locator('.atc-instrument-target').count(), 0);
      assert.equal(await instrument.locator('.atc-instrument-current circle').count(), 1);
    }
    const speed = page.locator('[data-atctower-instrument="speed"]');
    assert.equal(Number(await speed.getAttribute('data-target')), 120);
    assert.equal(await speed.getAttribute('data-direction'), 'accelerating');
    assert.equal(await speed.locator('[data-atctower-readback-target]').textContent(), '120 kt');
    assert.equal(await speed.locator('.atc-instrument-target polygon').count(), 1);
    await setTime(page, 10); await setTime(page, 30);
    assert.deepEqual(await state(page), before);
    await step(page);
    const actual = (await game(page)).aircraft[0];
    for (const id of ['heading', 'altitude', 'speed']) {
      const instrument = page.locator('[data-atctower-instrument="' + id + '"]');
      assert.equal(Number(await instrument.getAttribute('data-current')), actual[id]);
    }
    for (const id of ['heading', 'altitude']) assert.equal(await page.locator('[data-atctower-instrument="' + id + '"]').getAttribute('data-target'), '');
    assert.equal(Number(await speed.getAttribute('data-target')), actual.targetSpeed);
    await axe(page); await capture(page, 'after-paused-guided-instruments-390', '[data-atctower-aircraft-controls]');
  }, 390));

  await check('A north-crossing heading instruction uses the shortest unfilled arc and actual stepped readbacks', async () => {
    let saved;
    await onPage(async page => { saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); });
    saved.activeShift.aircraft[0].heading = 350;
    const page = await pageFor(1440, saved);
    try {
      await page.goto(fixture.url); await page.locator('[data-atctower-flight-time]').waitFor();
      await draft(page, 10); await send(page); await command(page, 'u');
      const heading = page.locator('[data-atctower-instrument="heading"]');
      assert.equal(Number(await heading.getAttribute('data-current')), 350);
      assert.equal(Number(await heading.getAttribute('data-target')), 10);
      assert.equal(await heading.getAttribute('data-direction'), 'right');
      const arc = heading.locator('.atc-instrument-arc');
      assert.equal(await arc.count(), 1);
      assert.match(await arc.getAttribute('d'), / A 32 32 0 0 1 /);
      assert.equal(await arc.evaluate(node => getComputedStyle(node).fill), 'none');
      assert.equal(await page.locator('[data-atctower-instrument="altitude"]').getAttribute('data-direction'), 'climbing');
      const actual = (await step(page)).aircraft[0];
      assert.equal(actual.heading, 10); assert.equal(actual.altitude, 5200);
      for (const id of ['heading', 'altitude', 'speed']) {
        const instrument = page.locator('[data-atctower-instrument="' + id + '"]');
        assert.equal(Number(await instrument.getAttribute('data-current')), actual[id]);
        const text = await instrument.locator('[data-atctower-readback-current]').textContent();
        assert.equal(text, id === 'heading' ? '010°' : Math.round(actual[id]).toLocaleString() + (id === 'altitude' ? ' ft' : ' kt'));
        const target = actual[id === 'heading' ? 'targetHeading' : id === 'altitude' ? 'targetAltitude' : 'targetSpeed'];
        assert.equal(await instrument.getAttribute('data-target'), target == null ? '' : String(target));
      }
      assert.equal(await heading.getAttribute('data-direction'), 'on-target');
      assert.equal(await heading.locator('.atc-instrument-arc').count(), 0);
      assert.equal((await game(page)).paused, true);
      await axe(page); await capture(page, 'after-stepped-manual-instruments-1440', '[data-atctower-aircraft-controls]');
    } finally { await page.close(); }
  });

  await check('Instrument circle and diamond shapes remain visible in normal and forced colors', () => onPage(async page => {
    await draft(page, 0); await send(page); await command(page, 'u');
    await command(page, 's'); await page.locator('[data-atctower-command-entry] input').fill('120'); await send(page);
    const before = await state(page);
    const inspect = async () => {
      const graphics = await page.locator('[data-atctower-instrument]').evaluateAll(nodes => nodes.map(node => {
        const current = node.querySelector('.atc-instrument-current circle');
        const target = node.querySelector('.atc-instrument-target polygon');
        const arc = node.querySelector('.atc-instrument-arc');
        const visible = shape => !!shape && getComputedStyle(shape).display !== 'none' && getComputedStyle(shape).visibility !== 'hidden' && Number(getComputedStyle(shape).opacity) > 0 && shape.getBoundingClientRect().width > 0 && shape.getBoundingClientRect().height > 0;
        return { id: node.getAttribute('data-atctower-instrument'), currentTag: current && current.tagName, targetTag: target && target.tagName, currentVisible: visible(current), targetVisible: visible(target), arcFill: arc && getComputedStyle(arc).fill };
      }));
      assert.equal(graphics.length, 3);
      assert.ok(graphics.every(graphic => graphic.currentTag === 'circle' && graphic.targetTag === 'polygon' && graphic.currentVisible && graphic.targetVisible), JSON.stringify(graphics));
      assert.ok(graphics.every(graphic => graphic.arcFill === null || graphic.arcFill === 'none'), JSON.stringify(graphics));
      return graphics;
    };
    const normal = await inspect(); await axe(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await inspect(); await fit(page); await axe(page);
    assert.deepEqual(await state(page), before);
    await capture(page, 'after-forced-colors-manual-instruments-320', '[data-atctower-aircraft-controls]');
    return { normal, forced };
  }, 320));
}

(async () => {
  const source = path.join(repo, 'stem_lab/stem_tool_atctower.js');
  const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  results.sourceHash = hash();
  fixture = await createFixtureServer();
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); await checks(); }
  finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  results.passed = results.checks.filter(check => check.pass).length;
  results.failed = results.checks.length - results.passed;
  results.sourceStable = hash() === results.sourceHash;
  results.completed = new Date().toISOString();
  fs.writeFileSync(process.env.ATC_QA_RESULTS_PATH || path.join(artifactDir, 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, errors: results.errors, sourceStable: results.sourceStable, artifactDir }));
  if (!results.checks.length || results.failed || results.errors.length || !results.sourceStable) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
