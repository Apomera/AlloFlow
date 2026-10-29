/* Real pointer integration checks for the hands-on Skills Studio. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_TACTILE_QA_OUT || path.join(root, 'reports/kitchen-studio-tactile'));
const storageKey = 'alloflow-kitchen-studio-v1';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

function controls(page) {
  const canvas = page.locator('#scene canvas');
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  const current = async () => { const data = await saved(); return data.serviceActive ? data.service.work : data.drafts[data.current]; };
  const action = id => page.locator('[data-action="' + id + '"]').click();
  async function station(id) {
    await page.locator('[data-station="' + id + '"]').click();
    await page.locator('#focusView').click();
    await canvas.scrollIntoViewIfNeeded();
  }
  async function point(id) {
    await canvas.scrollIntoViewIfNeeded();
    return canvas.evaluate((element, name) => {
      const target = JSON.parse(element.dataset.targets || '{}')[name];
      if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) throw new Error('Missing projected target: ' + name);
      const bounds = element.getBoundingClientRect();
      if (target.x < 0 || target.x > bounds.width || target.y < 0 || target.y > bounds.height) throw new Error('Target outside the focused canvas: ' + name);
      return { x: bounds.left + target.x, y: bounds.top + target.y };
    }, id);
  }
  async function grab(id) {
    const start = await point(id);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    assert.equal(await canvas.getAttribute('data-held'), id, id + ' can be picked up');
    return start;
  }
  async function tap(id) { const at = await point(id); await page.mouse.click(at.x, at.y); }
  async function drag(id, destination) {
    const end = typeof destination === 'string' ? await point(destination) : destination;
    await grab(id);
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
  }
  async function stroke(id, dx, dy) {
    const at = await grab(id);
    await page.mouse.move(at.x + dx, at.y + dy, { steps: 8 });
    await page.mouse.up();
  }
  return { canvas, saved, current, action, station, point, grab, tap, drag, stroke };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.KITCHEN_STUDIO_URL || 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/index.html';
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const results = { checks: [], accessibility: [], errors: [], screenshots: [] };
  let page;
  async function open(options) {
    const opened = await browser.newPage(Object.assign({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' }, options));
    opened.setDefaultTimeout(15000);
    opened.on('pageerror', error => results.errors.push(error.message));
    await opened.goto(url);
    await opened.locator('#scene canvas[data-targets]').waitFor();
    return opened;
  }
  async function audit(target, label) {
    await target.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await target.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }
    })).violations.map(issue => ({ id: issue.id, impact: issue.impact, targets: issue.nodes.map(node => node.target) })));
    results.accessibility.push({ label, issues });
    assert.deepEqual(issues, [], label + ' accessibility');
  }
  async function screenshot(target, name) {
    await target.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    results.screenshots.push(name + '.png');
  }
  try {
    page = await open();
    const ui = controls(page);
    assert.equal(await page.locator('#studioInteractionMode').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#studioTouchStatus').getAttribute('role'), 'status');
    assert.equal(await page.locator('#studioTouchProgress').isVisible(), false);
    assert.ok((await page.locator('#studioTouchHint').innerText()).trim());
    await audit(page, 'Desktop hands-on controls');

    await ui.station('prep');
    await ui.tap('soap');
    assert.equal((await ui.current()).values.washed, true);
    assert.equal((await ui.current()).log.at(-1).action, 'wash');
    await ui.tap('prepBoard');
    assert.equal((await ui.current()).values.clean, true);
    results.checks.push('Tapping soap and the preparation board records the same modeled actions as the accessible controls.');

    await ui.station('knife');
    await ui.tap('board');
    assert.equal((await ui.current()).values.secure, true);
    await ui.action('claw');
    let before = await ui.current();
    let at = await ui.grab('knife');
    await page.mouse.move(at.x, at.y + 52, { steps: 8 });
    assert.deepEqual(await ui.current(), before, 'Knife preview does not record a cut');
    assert.equal(await page.locator('#studioTouchProgress').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Escape restores the knife without a cut');
    assert.equal(await ui.canvas.getAttribute('data-held'), '');
    at = await ui.grab('knife');
    await page.mouse.move(at.x, at.y + 52, { steps: 8 });
    await page.mouse.move(at.x, at.y, { steps: 8 });
    await page.mouse.up();
    assert.equal((await ui.current()).values.cut, 'even');
    assert.equal((await ui.current()).log.length, before.log.length + 1, 'One complete knife stroke records one action');
    before = await ui.current();
    await ui.tap('knife');
    assert.deepEqual(await ui.current(), before, 'Completed station rejects new scene actions');
    results.checks.push('Knife down-and-up movement previews before release, cancels with Escape, and commits exactly once with safe setup.');

    // The chosen cut remains a learner choice, including alternate challenges.
    await page.locator('#newChallenge').click();
    assert.equal(await page.locator('#scenario').inputValue(), 'stew');
    await ui.action('secure'); await ui.action('claw');
    await page.locator('#studioCutSize').selectOption('largeDice');
    at = await ui.grab('knife');
    await page.mouse.move(at.x, at.y + 52, { steps: 8 });
    await page.mouse.move(at.x, at.y, { steps: 8 });
    await page.mouse.up();
    assert.equal((await ui.current()).values.cut, 'large');
    assert.equal((await ui.current()).done, true);
    results.checks.push('The learner-selected large cut works for the stew scenario.');

    await ui.station('measure');
    before = await ui.current();
    at = await ui.grab('jug');
    await page.mouse.move(at.x, at.y - 36, { steps: 8 });
    assert.deepEqual(await ui.current(), before, 'Jug preview does not alter saved evidence');
    await screenshot(page, 'jug-held-preview');
    await page.mouse.up();
    assert.equal((await ui.current()).values.ml, 50);
    assert.equal((await ui.current()).log.length, before.log.length + 1);
    await ui.stroke('jug', 0, 36);
    assert.equal((await ui.current()).values.ml, 0);
    before = await ui.current();
    at = await ui.grab('jug');
    await page.mouse.move(at.x, at.y - 36, { steps: 8 });
    await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true });
    await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Pointer cancellation records no pour');
    at = await ui.grab('jug');
    await page.mouse.move(at.x, at.y - 36, { steps: 8 });
    const bounds = await ui.canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width + 25, bounds.y + bounds.height / 2, { steps: 8 });
    await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Release outside the canvas records no pour');
    assert.equal(await page.locator('#studioTouchProgress').isVisible(), false);
    await page.locator('#studioInteractionMode').click();
    assert.equal(await page.locator('#studioInteractionMode').getAttribute('aria-pressed'), 'false');
    at = await ui.point('jug');
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(at.x + 45, at.y - 36, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Camera mode cannot pour');
    await page.locator('#studioInteractionMode').click();
    await page.locator('#focusView').click();
    results.checks.push('Jug adds/removes 50 mL on release; preview, pointer cancellation, off-canvas release, and camera mode preserve evidence.');

    await ui.station('heat');
    await ui.stroke('dial', 0, -25);
    assert.equal((await ui.current()).values.heat, 'medium');
    assert.equal((await ui.current()).values.seconds || 0, 0, 'Turning heat does not advance modeled cooking');
    await ui.stroke('mushroom', 48, 0);
    assert.equal((await ui.current()).values.spread, true);
    results.checks.push('Burner detents change heat without advancing time, and moving mushrooms outward spreads them.');

    await ui.station('probe');
    await ui.drag('probe', 'probeSurface');
    assert.equal((await ui.current()).values.probe, 'surface');
    await ui.drag('probe', 'probeCenter');
    assert.equal((await ui.current()).values.probe, 'thick');
    assert.equal((await ui.current()).values.reading, null, 'Placement still requires a deliberate fresh reading');
    await ui.action('read');
    assert.equal((await ui.current()).values.reading, 150);
    results.checks.push('Dragging the thermometer chooses surface or center; reading remains a separate evidence action.');

    await ui.station('chill');
    await ui.action('shallow'); await ui.action('label');
    await ui.drag('tub', 'fridge');
    assert.equal((await ui.current()).values.chilled, true);
    assert.equal((await ui.current()).done, true);
    results.checks.push('A prepared, labeled container can be carried into the refrigerator.');

    await ui.station('measure');
    for (let i = 0; i < 3; i++) await ui.action('add150');
    await ui.action('check');
    await page.locator('input[name=reason][value="2"]').check();
    await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click();
    await page.locator('#replayStep').fill('0');
    await page.locator('#replayStep').dispatchEvent('input');
    const recorded = await ui.saved();
    at = await ui.point('jug');
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(at.x, at.y - 36, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), recorded, 'Replay scene gestures leave all saved evidence intact');
    assert.equal(await page.locator('#replayBanner').isVisible(), true, 'Scene contact does not exit replay');
    await audit(page, 'Read-only replay');
    results.checks.push('Submitted historical replay remains read-only under direct scene gestures.');

    const dinner = await open();
    const meal = controls(dinner);
    await dinner.locator('#serviceCard>summary').click();
    await dinner.locator('#serviceStart').click();
    await dinner.locator('#focusView').click();
    const stationDrafts = (await meal.saved()).drafts;
    await meal.tap('soap'); await meal.tap('prepBoard');
    const service = await meal.saved();
    assert.equal(service.serviceActive, true, 'Handling current rehearsal objects must not switch to station practice');
    assert.equal(service.service.work.values.washed, true);
    assert.equal(service.service.work.values.clean, true);
    assert.deepEqual(service.drafts, stationDrafts, 'Rehearsal gestures do not alter independent station drafts');
    await dinner.close();
    results.checks.push('Direct actions update the active dinner rehearsal without abandoning it or altering station drafts.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const phone = controls(mobile);
    await mobile.locator('#focusView').click();
    const soap = await phone.point('soap');
    await mobile.touchscreen.tap(soap.x, soap.y);
    assert.equal((await phone.current()).values.washed, true, 'Touch tap uses the same action path');
    await phone.station('measure');
    await phone.stroke('jug', 0, -36);
    assert.equal((await phone.current()).values.ml, 50, 'A narrow viewport supports the same drag distance');
    await screenshot(mobile, 'hands-on-mobile');
    await mobile.setViewportSize({ width: 320, height: 844 });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at 320px');
    await audit(mobile, '320px hands-on controls');
    await mobile.locator('#viewToggle').click();
    assert.equal(await mobile.locator('#fallback').isVisible(), true);
    await mobile.locator('[data-action=add50]').focus();
    await mobile.keyboard.press('Enter');
    assert.equal((await phone.current()).values.ml, 100, 'Text/keyboard alternative remains equivalent');
    await mobile.close();
    results.checks.push('Touch, reduced motion, narrow-screen dragging, 320px layout, and keyboard/text alternatives work.');

    assert.deepEqual(results.errors, [], 'No browser runtime errors');
    results.pass = true;
  } catch (error) {
    results.failure = error.stack || error.message;
    if (page) {
      results.status = await page.locator('#studioTouchStatus').innerText().catch(() => null);
      results.targets = await page.locator('#scene canvas').getAttribute('data-targets').catch(() => null);
      await screenshot(page, 'failure').catch(() => {});
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(results, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
