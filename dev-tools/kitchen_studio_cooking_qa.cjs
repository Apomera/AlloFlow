/* Browser evidence for cloth preparation, pan carrying, and direct thermometer readings. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_COOKING_QA_OUT || path.join(root, 'reports/kitchen-studio-cooking'));
const storageKey = 'alloflow-kitchen-studio-v1';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});

function controls(page) {
  const canvas = page.locator('#scene canvas');
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  const current = async () => { const s = await saved(); return s.serviceActive ? s.service.work : s.drafts[s.current]; };
  const action = id => page.locator('[data-action="' + id + '"]').click();
  async function station(id) {
    await page.locator('[data-station="' + id + '"]').click();
    await page.locator('#focusView').click();
    await canvas.scrollIntoViewIfNeeded();
  }
  async function point(id) {
    await canvas.scrollIntoViewIfNeeded();
    return canvas.evaluate((el, key) => {
      const target = JSON.parse(el.dataset.targets || '{}')[key], rect = el.getBoundingClientRect();
      if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) throw Error('Missing projected target: ' + key);
      if (target.x < 0 || target.x > rect.width || target.y < 0 || target.y > rect.height) throw Error('Target outside canvas: ' + key);
      return { x: rect.left + target.x, y: rect.top + target.y };
    }, id);
  }
  async function grab(id) {
    const p = await point(id);
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    assert.equal(await canvas.getAttribute('data-held'), id, id + ' picked up');
    return p;
  }
  async function tap(id) { const p = await point(id); await page.mouse.click(p.x, p.y); }
  async function drag(id, destination) {
    const end = await point(destination); await grab(id);
    await page.mouse.move(end.x, end.y, { steps: 10 }); await page.mouse.up();
  }
  async function rub(p, passes = 3) {
    for (let i = 0; i < passes; i++) await page.mouse.move(p.x + (i % 2 ? 0 : 36), p.y, { steps: 8 });
  }
  return { canvas, saved, current, action, station, point, grab, tap, drag, rub };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.KITCHEN_STUDIO_URL || 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/index.html';
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const result = { checks: [], accessibility: [], screenshots: [], errors: [] };
  let page;
  async function open(options) {
    const p = await browser.newPage(Object.assign({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' }, options));
    p.setDefaultTimeout(15000); p.on('pageerror', error => result.errors.push(error.message));
    p.on('console', message => { if (message.type() === 'warning' && message.text().startsWith('Kitchen Studio')) result.errors.push(message.text()); });
    await p.goto(url); await p.locator('#scene canvas[data-targets]').waitFor(); return p;
  }
  async function shot(p, name) {
    await p.locator('.scene-card').screenshot({ path: path.join(out, name + '.png') }); result.screenshots.push(name + '.png');
  }
  async function audit(p, label) {
    await p.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    result.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility');
  }
  try {
    page = await open(); const ui = controls(page);
    await ui.station('heat');
    let before = await ui.current();
    await page.locator('[data-studio-tool="towel"]').click();
    await page.locator('[data-studio-tool="pan"]').click();
    assert.deepEqual(await ui.current(), before, 'Finding tools does not execute cooking actions');
    let p = await ui.grab('towel');
    await ui.rub(p, 1);
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.waitForFunction(() => document.querySelector('#scene canvas').dataset.held === '');
    await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Resizing interrupts a cloth gesture without drying');
    await page.setViewportSize({ width: 1360, height: 1000 });
    p = await ui.grab('towel');
    await ui.rub(p, 1); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'One cloth pass is incomplete');
    p = await ui.grab('towel'); await ui.rub(p);
    assert.deepEqual(await ui.current(), before, 'Completed cloth preview does not alter evidence');
    await page.keyboard.press('Escape'); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Escape cancels the full cloth gesture');
    p = await ui.grab('towel'); await ui.rub(p); await page.mouse.up();
    let after = await ui.current();
    assert.equal(after.values.dry, true); assert.equal(after.log.length, before.log.length + 1);
    assert.equal(after.log.at(-1).action, 'dry'); assert.equal(after.values.seconds || 0, 0);
    assert.equal(await ui.canvas.getAttribute('data-feedback'), 'idle', 'Reduced motion skips animated contact feedback');
    result.checks.push('Cloth needs alternating passes, preserves state during preview/cancellation, and records one drying decision without advancing time.');

    await ui.action('medium'); before = await ui.current();
    const target = await ui.point('servingPlate'); await ui.grab('pan');
    await page.mouse.move(target.x, target.y, { steps: 10 });
    assert.deepEqual(await ui.current(), before, 'Carrying a pan does not cook or serve during preview');
    await page.keyboard.press('Escape'); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Cancelling pan carry leaves heat and food intact');
    await ui.drag('pan', 'servingPlate'); after = await ui.current();
    assert.equal(after.log.at(-1).action, 'plate'); assert.equal(after.log.at(-1).accepted, false);
    assert.equal(after.values.heat, null); assert.equal(after.done, false);
    result.checks.push('Pan carry cancels cleanly; an early serving decision turns off heat but cannot bypass the browning requirements.');

    await page.locator('#retry').click();
    p = await ui.grab('towel'); await ui.rub(p); await page.mouse.up();
    await ui.action('spread'); await ui.action('medium');
    for (let i = 0; i < 3; i++) await ui.action('advance');
    before = await ui.current(); assert.equal(before.values.brown, 3);
    await ui.drag('pan', 'servingPlate'); after = await ui.current();
    assert.equal(after.done, true); assert.equal(after.values.heat, null);
    assert.equal(after.values.seconds, before.values.seconds); assert.equal(after.log.length, before.log.length + 1);
    assert.equal(after.log.at(-1).accepted, true); await shot(page, 'served-mushrooms');
    result.checks.push('A golden pan can be carried to the plate with a single accepted action, preserving its actual cooking history.');
    await page.locator('input[name=reason][value="0"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click();
    await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    const recorded = await ui.saved(); p = await ui.point('towel');
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await ui.rub(p); await page.mouse.up();
    assert.deepEqual(await ui.saved(), recorded); assert.equal(await page.locator('#replayBanner').isVisible(), true);
    result.checks.push('Historical replay stays read-only under the new cloth interaction.');

    await page.locator('#retry').click(); await ui.action('dry'); await ui.action('spread'); await ui.action('high');
    for (let i = 0; i < 3; i++) await ui.action('advance');
    before = await ui.current(); assert.equal(before.values.brown, 6);
    await ui.drag('pan', 'servingPlate'); after = await ui.current();
    assert.equal(after.values.brown, 6); assert.equal(after.values.heat, null); assert.equal(after.done, false);
    assert.equal(after.log.at(-1).accepted, false);
    result.checks.push('Burnt food remains burnt after a carry-to-plate decision; the original correction and retry semantics are preserved.');

    await ui.station('probe'); await ui.tap('probe');
    after = await ui.current(); assert.equal(after.log.at(-1).action, 'read'); assert.equal(after.log.at(-1).accepted, false);
    await ui.drag('probe', 'probeSurface'); await ui.tap('probe');
    assert.equal((await ui.current()).values.reading, 180);
    await ui.drag('probe', 'probeCenter'); assert.equal((await ui.current()).values.reading, null);
    await ui.tap('probe'); assert.equal((await ui.current()).values.reading, 150);
    await ui.action('cook'); assert.equal((await ui.current()).values.reading, null);
    await ui.tap('probe'); assert.equal((await ui.current()).values.reading, 155);
    result.checks.push('Tapping the thermometer takes a deliberate reading; absent, surface, internal, and stale readings retain their different meanings.');
    await ui.station('chill'); await page.locator('#scenario').selectOption('picnic'); await ui.action('discard');
    assert.equal(await page.locator('[data-studio-tool="tub"]').isDisabled(), true, 'Discarded leftovers cannot be located as a visible object');
    await audit(page, 'Desktop direct cooking tools');

    const animated = await open({ reducedMotion: 'no-preference' }), motion = controls(animated);
    await motion.station('measure'); before = await motion.current();
    await motion.action('add50');
    assert.equal(await motion.canvas.getAttribute('data-feedback'), 'accepted');
    await animated.waitForFunction(() => document.querySelector('#scene canvas').dataset.feedback === 'idle');
    after = await motion.current(); assert.equal(after.log.length, before.log.length + 1); assert.equal(after.values.ml, 50);
    await animated.close();
    result.checks.push('Tool finders only identify objects; resize cancels a hold, and optional contact feedback settles without additional cooking actions.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(mobile); await phone.station('heat');
    const cdp = await mobile.context().newCDPSession(mobile); p = await phone.point('towel');
    const scrollBefore = await mobile.evaluate(() => scrollY);
    const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }] });
    await touch('touchStart', p.x, p.y);
    assert.equal(await phone.canvas.getAttribute('data-held'), 'towel');
    for (const offset of [36, 0, 36]) await touch('touchMove', p.x + offset, p.y);
    assert.equal((await phone.current()).values.dry, undefined, 'Real touch preview stays uncommitted');
    await touch('touchEnd'); assert.equal((await phone.current()).values.dry, true);
    assert.equal(await mobile.evaluate(() => scrollY), scrollBefore, 'Cloth gestures do not become browser scrolling');
    await shot(mobile, 'cloth-touch-mobile');
    await mobile.setViewportSize({ width: 320, height: 844 });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit(mobile, '320px direct cooking tools');
    await mobile.locator('#viewToggle').click();
    await mobile.locator('[data-action=medium]').focus(); await mobile.keyboard.press('Enter');
    assert.equal((await phone.current()).values.heat, 'medium');
    await mobile.close();
    result.checks.push('Real mobile touch scrubbing commits on release without scrolling; 320px layout and keyboard/text alternatives remain usable.');
    assert.deepEqual(result.errors, []); result.pass = true;
  } catch (error) {
    result.failure = error.stack || error.message;
    if (page) { result.status = await page.locator('#studioTouchStatus').innerText().catch(() => null); await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); }
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
