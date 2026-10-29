/* Physical mat placement and mushroom spacing share the existing action gateway. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_PLACEMENT_QA_OUT || path.join(root, 'reports/kitchen-studio-placement'));
const storageKey = 'alloflow-kitchen-studio-v1';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); response.end(data);
  });
});

function controls(page) {
  const canvas = page.locator('#scene canvas');
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  const current = async () => { const value = await saved(); return value.serviceActive ? value.service.work : value.drafts[value.current]; };
  const action = id => page.locator('[data-action="' + id + '"]').click();
  async function station(id) { await page.locator('[data-station="' + id + '"]').click(); await page.locator('#focusView').click(); await canvas.scrollIntoViewIfNeeded(); }
  async function point(id) {
    await canvas.scrollIntoViewIfNeeded();
    return canvas.evaluate((el, key) => {
      const target = JSON.parse(el.dataset.targets || '{}')[key], bounds = el.getBoundingClientRect();
      if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) throw new Error('Missing projected target: ' + key);
      if (target.x < 0 || target.x > bounds.width || target.y < 0 || target.y > bounds.height) throw new Error('Target outside the canvas: ' + key);
      return { x: bounds.left + target.x, y: bounds.top + target.y };
    }, id);
  }
  async function grab(id) { const at = await point(id); await page.mouse.move(at.x, at.y); await page.mouse.down(); assert.equal(await canvas.getAttribute('data-held'), id, id + ' picked up'); return at; }
  async function carry(id, destination) { const to = await point(destination); await grab(id); await page.mouse.move(to.x, to.y, { steps: 12 }); }
  async function drop(id, destination) { await carry(id, destination); await page.mouse.up(); }
  async function tap(id) { const at = await point(id); await page.mouse.click(at.x, at.y); }
  async function idle() { assert.equal(await canvas.getAttribute('data-held'), ''); assert.equal(await canvas.getAttribute('data-mat-preview'), 'false'); assert.equal(await canvas.getAttribute('data-spatula-preview'), ''); }
  return { canvas, saved, current, action, station, point, grab, carry, drop, tap, idle };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.KITCHEN_STUDIO_URL || 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/index.html';
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { checks: [], accessibility: [], screenshots: [], errors: [] };
  let page;
  async function open(options = {}) {
    const p = await browser.newPage({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce', ...options });
    p.setDefaultTimeout(20000); p.on('pageerror', error => result.errors.push(error.message));
    p.on('console', message => { if (message.type() === 'warning' && message.text().startsWith('Kitchen Studio')) result.errors.push(message.text()); });
    await p.goto(url); await p.locator('#scene canvas[data-targets]').waitFor(); return p;
  }
  async function shot(p, name) { await p.locator('.scene-card').screenshot({ path: path.join(out, name + '.png'), style: '.taskbar{visibility:hidden!important}' }); result.screenshots.push(name + '.png'); }
  async function audit(p, label) {
    await p.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    result.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility');
  }
  try {
    page = await open(); const ui = controls(page); await ui.station('knife');
    let before = await ui.current();
    assert.equal(await ui.canvas.getAttribute('data-mat-secured'), 'false');
    await ui.carry('nonslipMat', 'boardMat');
    assert.equal(await ui.canvas.getAttribute('data-mat-preview'), 'true'); assert.deepEqual(await ui.current(), before);
    await shot(page, 'mat-placement-preview');
    await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    assert.equal(await ui.canvas.getAttribute('data-mat-secured'), 'false');
    await ui.carry('nonslipMat', 'boardMat'); await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true }); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.tap('nonslipMat'); await ui.idle(); assert.deepEqual(await ui.current(), before, 'A mat tap alone does not place it');
    await ui.grab('nonslipMat'); const bounds = await ui.canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width + 20, bounds.y + 20, { steps: 10 }); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.carry('nonslipMat', 'boardMat'); await page.locator('#viewToggle').evaluate(node => node.click()); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await page.locator('#viewToggle').click(); await page.locator('#focusView').click();
    result.checks.push('Mat placement previews leave evidence unchanged and restore the original board on Escape, pointer cancellation, outside release or a switch to text view.');

    await ui.drop('nonslipMat', 'boardMat'); let after = await ui.current();
    assert.equal(after.log.length, before.log.length + 1); assert.equal(after.log.at(-1).action, 'secure'); assert.equal(after.log.at(-1).accepted, true); assert.equal(after.values.secure, true);
    await ui.idle(); assert.equal(await ui.canvas.getAttribute('data-mat-secured'), 'true');
    assert.equal(await page.locator('[data-studio-tool="nonslipMat"]').isDisabled(), true, 'The stowed mat is no longer offered after placement');
    await ui.canvas.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', bubbles: true }); assert.deepEqual(await ui.current(), after);
    await shot(page, 'board-secured');
    await ui.action('claw'); await ui.action('dice'); after = await ui.current(); assert.equal(after.done, true);
    assert.deepEqual(after.log.map(entry => entry.action), ['secure', 'claw', 'dice']); const knifeValues = after.values;
    result.checks.push('A deliberate mat drop records exactly one secure action and enables the same protected cutting sequence as the keyboard controls.');

    await page.locator('input[name=reason][value="2"]').check(); await page.locator('#submit').click();
    if (!(await page.locator('#replayPanel').evaluate(node => node.open))) await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await ui.canvas.getAttribute('data-mat-secured'), 'false'); assert.equal(await page.locator('[data-studio-tool="nonslipMat"]').isDisabled(), false);
    before = await ui.saved(); let from = await ui.point('nonslipMat'), to = await ui.point('boardMat');
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); assert.equal(await ui.canvas.getAttribute('data-mat-secured'), 'false');
    await page.locator('#replayStep').fill('1'); await page.locator('#replayStep').dispatchEvent('input'); assert.equal(await ui.canvas.getAttribute('data-mat-secured'), 'true');
    await page.locator('#returnLatest').click(); await ui.idle();
    result.checks.push('Historical knife replay restores the mat at the recorded stage and rejects physical changes to saved evidence.');

    await ui.station('heat'); await ui.action('dry'); await ui.action('medium'); before = await ui.current();
    await ui.carry('spatula', 'panEdge'); assert.equal(await ui.canvas.getAttribute('data-spatula-preview'), 'spread'); assert.deepEqual(await ui.current(), before);
    await shot(page, 'spatula-spread-preview');
    await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.carry('spatula', 'panCenter'); assert.equal(await ui.canvas.getAttribute('data-spatula-preview'), 'crowd'); assert.deepEqual(await ui.current(), before);
    await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true }); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.tap('spatula'); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.grab('spatula'); const heatBounds = await ui.canvas.boundingBox();
    await page.mouse.move(heatBounds.x + 10, heatBounds.y + 10, { steps: 10 }); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    result.checks.push('Spatula previews reversibly change mushroom spacing while preserving the heat setting, cooking time, drying and browning evidence.');

    await ui.drop('spatula', 'panEdge'); after = await ui.current();
    assert.equal(after.log.at(-1).action, 'spread'); assert.equal(after.values.spread, true); assert.equal(after.log.length, before.log.length + 1);
    assert.equal(after.values.seconds, before.values.seconds); assert.equal(after.values.brown, before.values.brown); assert.equal(after.values.heat, before.values.heat); assert.equal(after.values.dry, before.values.dry);
    await ui.drop('spatula', 'panCenter'); after = await ui.current(); assert.equal(after.log.at(-1).action, 'crowd'); assert.equal(after.values.spread, false);
    assert.equal(after.values.seconds, before.values.seconds); assert.equal(after.values.brown, before.values.brown);
    await ui.drop('spatula', 'panEdge'); await ui.idle(); await shot(page, 'mushrooms-spread');
    for (let i = 0; i < 3; i++) await ui.action('advance'); await ui.action('plate'); after = await ui.current(); assert.equal(after.done, true);
    assert.equal(after.values.brown, 3); assert.equal(after.values.seconds, 90); assert.equal(after.values.heat, null);
    const heatValues = after.values;
    result.checks.push('Spatula releases commit one spread or crowd decision; browning still requires deliberate cooking steps and plating still switches off the burner.');

    await page.locator('input[name=reason][value="0"]').check(); await page.locator('#submit').click();
    if (!(await page.locator('#replayPanel').evaluate(node => node.open))) await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    before = await ui.saved(); from = await ui.point('spatula'); to = await ui.point('panEdge');
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); assert.equal(await ui.canvas.getAttribute('data-spatula-preview'), '');
    await page.locator('#returnLatest').click(); await ui.idle(); await audit(page, 'Desktop mat and spatula controls');
    result.checks.push('Completed heat attempts and their historical stages remain read-only, with no lingering spacing preview.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(mobile); const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }] });
    async function touchDrop(id, destination, preview, expected) {
      const a = await phone.point(id), b = await phone.point(destination), initial = await phone.current(), scroll = await mobile.evaluate(() => scrollY);
      await touch('touchStart', a.x, a.y); assert.equal(await phone.canvas.getAttribute('data-held'), id);
      for (let i = 1; i <= 12; i++) await touch('touchMove', a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12);
      assert.deepEqual(await phone.current(), initial); assert.equal(await phone.canvas.getAttribute(preview), expected);
      await touch('touchEnd'); assert.equal(await mobile.evaluate(() => scrollY), scroll); await phone.idle();
    }
    await phone.station('knife'); await touchDrop('nonslipMat', 'boardMat', 'data-mat-preview', 'true');
    await phone.action('claw'); await phone.action('dice'); assert.deepEqual((await phone.current()).values, knifeValues);
    await phone.station('heat'); await phone.action('dry'); await phone.action('medium');
    await touchDrop('spatula', 'panEdge', 'data-spatula-preview', 'spread'); await touchDrop('spatula', 'panCenter', 'data-spatula-preview', 'crowd'); await touchDrop('spatula', 'panEdge', 'data-spatula-preview', 'spread');
    for (let i = 0; i < 3; i++) await phone.action('advance'); await phone.action('plate'); assert.deepEqual((await phone.current()).values, heatValues);
    await shot(mobile, 'tactile-placement-mobile');
    result.checks.push('Native phone touch places the mat and moves the spatula without page scrolling or premature actions, producing the same cooking results.');

    await mobile.setViewportSize({ width: 320, height: 844 }); assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit(mobile, '320px mat and spatula controls');
    await mobile.locator('#retry').click(); await mobile.locator('#viewToggle').click();
    for (const action of ['dry', 'medium', 'spread', 'crowd', 'spread', 'advance', 'advance', 'advance', 'plate']) { await mobile.locator('[data-action="' + action + '"]').focus(); await mobile.keyboard.press('Enter'); }
    assert.deepEqual((await phone.current()).values, heatValues);
    await mobile.locator('[data-station="knife"]').click(); await mobile.locator('#retry').click();
    for (const action of ['secure', 'claw', 'dice']) { await mobile.locator('[data-action="' + action + '"]').focus(); await mobile.keyboard.press('Enter'); }
    assert.deepEqual((await phone.current()).values, knifeValues); await mobile.close();
    result.checks.push('Narrow layouts pass overflow and accessibility checks, and keyboard/text actions remain equivalent to both physical tools.');
    assert.deepEqual(result.errors, []); result.pass = true;
  } catch (error) {
    result.failure = error.stack || error.message;
    if (page) {
      result.status = await page.locator('#studioTouchStatus').innerText().catch(() => null);
      result.targets = await page.locator('#scene canvas').getAttribute('data-targets').catch(() => null);
      await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
