/* Direct oven and serving carries preserve explicit temperature evidence. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_OVEN_QA_OUT || path.join(root, 'reports/kitchen-studio-oven'));
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
    await page.locator('#focusView').click(); await canvas.scrollIntoViewIfNeeded();
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
    const p = await point(id); await page.mouse.move(p.x, p.y); await page.mouse.down();
    assert.equal(await canvas.getAttribute('data-held'), id, id + ' picked up'); return p;
  }
  async function tap(id) { const p = await point(id); await page.mouse.click(p.x, p.y); }
  async function drag(id, destination) {
    const end = await point(destination); await grab(id);
    await page.mouse.move(end.x, end.y, { steps: 10 }); await page.mouse.up();
  }
  return { canvas, saved, current, action, station, point, grab, tap, drag };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.KITCHEN_STUDIO_URL || 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/index.html';
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { checks: [], accessibility: [], screenshots: [], errors: [] };
  let page;
  async function open(options) {
    const p = await browser.newPage(Object.assign({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' }, options));
    p.setDefaultTimeout(15000); p.on('pageerror', error => result.errors.push(error.message));
    p.on('console', message => { if (message.type() === 'warning' && message.text().startsWith('Kitchen Studio')) result.errors.push(message.text()); });
    await p.goto(url);
    try { await p.locator('#scene canvas[data-targets]').waitFor(); }
    catch (error) {
      result.startup = await p.evaluate(key => ({ status: document.querySelector('#sceneStatus')?.textContent, state: localStorage.getItem(key) }), storageKey);
      await p.screenshot({ path: path.join(out, 'startup-failure.png'), fullPage: true }).catch(() => {}); throw error;
    }
    return p;
  }
  async function shot(p, name) {
    await p.locator('.scene-card').screenshot({ path: path.join(out, name + '.png'), style: '.taskbar { visibility: hidden !important; }' }); result.screenshots.push(name + '.png');
  }
  async function audit(p, label) {
    await p.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    result.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility');
  }
  try {
    page = await open(); const ui = controls(page); await ui.station('probe');
    await ui.drag('chickenPlate', 'serveDrop'); let after = await ui.current();
    assert.equal(after.log.at(-1).action, 'serve'); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.done, false);
    await ui.drag('probe', 'probeSurface'); await ui.tap('probe'); assert.equal((await ui.current()).values.reading, 180);
    await ui.drag('chickenPlate', 'serveDrop'); after = await ui.current();
    assert.equal(after.values.probe, 'surface'); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.done, false);
    result.checks.push('Carrying food to serve cannot bypass the need for a fresh internal reading, including a misleadingly hot surface reading.');

    await page.locator('#retry').click(); await ui.drag('probe', 'probeCenter'); await ui.tap('probe');
    assert.equal((await ui.current()).values.reading, 150);
    let before = await ui.current(), target = await ui.point('ovenDrop'); await ui.grab('chickenPlate');
    await page.mouse.move(target.x, target.y, { steps: 10 });
    assert.deepEqual(await ui.current(), before, 'Moving into the open oven previews without cooking or discarding a reading');
    assert.equal(await ui.canvas.getAttribute('data-oven-open'), 'true');
    assert.equal(await ui.canvas.getAttribute('data-platter-target'), 'oven');
    await shot(page, 'oven-carry-preview');
    await page.keyboard.press('Escape'); await page.mouse.up();
    assert.deepEqual(await ui.current(), before); assert.equal(await ui.canvas.getAttribute('data-held'), '');
    assert.equal(await ui.canvas.getAttribute('data-oven-open'), 'false');
    target = await ui.point('serveDrop'); await ui.grab('chickenPlate');
    await page.mouse.move(target.x, target.y, { steps: 10 });
    await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true }); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'Pointer cancellation restores the platter and attached probe');
    await ui.grab('chickenPlate'); const bounds = await ui.canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width + 20, bounds.y + bounds.height / 2, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'An off-canvas release never cooks or serves');
    result.checks.push('Oven and serving previews are reversible; Escape, pointer cancellation, and off-canvas release preserve the food and temperature evidence.');

    await ui.drag('chickenPlate', 'ovenDrop'); after = await ui.current();
    assert.equal(after.log.length, before.log.length + 1); assert.equal(after.log.at(-1).action, 'cook');
    assert.equal(after.values.temp, 155); assert.equal(after.values.reading, null);
    assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '—');
    await page.waitForTimeout(650); assert.deepEqual(await ui.current(), after, 'The oven does not keep cooking after release');
    await ui.tap('probe'); assert.equal((await ui.current()).values.reading, 155);
    await ui.drag('chickenPlate', 'ovenDrop'); assert.equal((await ui.current()).values.temp, 160);
    await ui.drag('chickenPlate', 'ovenDrop'); assert.equal((await ui.current()).values.temp, 165);
    assert.equal((await ui.current()).values.reading, null);
    result.checks.push('Each deliberate oven delivery advances one cooking step, invalidates the old reading, and returns control without a background timer.');

    await ui.drag('chickenPlate', 'serveDrop'); after = await ui.current();
    assert.equal(after.log.at(-1).accepted, false); assert.equal(after.done, false, 'The now-hot food still needs a fresh reading');
    await ui.tap('probe'); assert.equal((await ui.current()).values.reading, 165);
    await ui.drag('chickenPlate', 'serveDrop'); after = await ui.current();
    assert.equal(after.done, true); assert.equal(after.log.at(-1).accepted, true);
    assert.equal(after.values.probe, 'thick'); const foundationValues = after.values;
    await shot(page, 'served-chicken'); await audit(page, 'Desktop oven and serving controls');
    result.checks.push('The entire foundation temperature check can finish through platter carries and an explicit final thermometer reading.');

    await page.locator('input[name=reason][value="1"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    before = await ui.saved(); let p = await ui.point('chickenPlate'), q = await ui.point('ovenDrop');
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 10 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); assert.equal(await page.locator('#replayBanner').isVisible(), true);
    assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '—', 'Historical unread food stays unread');
    await page.locator('#returnLatest').click(); await page.locator('#focusView').click();
    assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '165');
    result.checks.push('Historical platter movement is read-only and returning to the latest attempt restores its recorded reading.');

    await page.locator('#newChallenge').click(); await page.locator('#focusView').click();
    assert.equal((await ui.current()).scenario, 'ready');
    await ui.drag('probe', 'probeCenter'); await ui.tap('probe'); await ui.drag('chickenPlate', 'serveDrop');
    after = await ui.current(); assert.equal(after.done, true);
    assert.deepEqual(after.log.map(entry => entry.action), ['thick', 'read', 'serve']);
    assert.ok(after.log.every(entry => entry.accepted));
    result.checks.push('The already-ready challenge can be served from adequate evidence without an unnecessary oven step.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(mobile); await phone.station('probe');
    const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }] });
    async function carry(destination) {
      const from = await phone.point('chickenPlate'), to = await phone.point(destination), initial = await phone.current(), scrollBefore = await mobile.evaluate(() => scrollY);
      await touch('touchStart', from.x, from.y); assert.equal(await phone.canvas.getAttribute('data-held'), 'chickenPlate');
      for (let i = 1; i <= 10; i++) await touch('touchMove', from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10);
      assert.deepEqual(await phone.current(), initial, 'Touch carrying does not commit early');
      await touch('touchEnd'); assert.equal(await mobile.evaluate(() => scrollY), scrollBefore, 'Carrying remains in the scene instead of scrolling');
    }
    await carry('ovenDrop'); assert.equal((await phone.current()).values.temp, 155);
    await carry('ovenDrop'); await carry('ovenDrop');
    await phone.drag('probe', 'probeCenter'); await phone.tap('probe'); await carry('serveDrop');
    assert.equal((await phone.current()).done, true); assert.deepEqual((await phone.current()).values, foundationValues);
    await shot(mobile, 'oven-touch-mobile');
    result.checks.push('Real mobile touch carries food into the oven and serving area without scrolling or premature commits.');

    await mobile.setViewportSize({ width: 320, height: 844 });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await audit(mobile, '320px oven and serving controls');
    await mobile.locator('#retry').click(); await mobile.locator('#viewToggle').click();
    for (const id of ['thick', 'cook', 'cook', 'cook', 'read', 'serve']) { await mobile.locator('[data-action="' + id + '"]').focus(); await mobile.keyboard.press('Enter'); }
    assert.deepEqual((await phone.current()).values, foundationValues); await mobile.close();
    result.checks.push('The completed result is equivalent through keyboard/text controls, and the narrow-screen interface passes accessibility checks.');
    assert.deepEqual(result.errors, []); result.pass = true;
  } catch (error) {
    result.failure = error.stack || error.message;
    if (page) { result.status = await page.locator('#studioTouchStatus').innerText().catch(() => null); result.targets = await page.locator('#scene canvas').getAttribute('data-targets').catch(() => null); await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {}); }
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
