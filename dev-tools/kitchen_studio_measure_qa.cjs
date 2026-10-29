/* Stock pours preview a measured transfer and commit only on deliberate release. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_MEASURE_QA_OUT || path.join(root, 'reports/kitchen-studio-measure'));
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
  async function carry() {
    const end = await point('jugFill'); await grab('stockCarton'); await page.mouse.move(end.x, end.y, { steps: 10 });
  }
  async function pour() { await carry(); await page.mouse.up(); }
  async function stroke(dy) {
    const p = await grab('jug'); await page.mouse.move(p.x, p.y + dy, { steps: 8 }); await page.mouse.up();
  }
  async function idle() {
    assert.equal(await canvas.getAttribute('data-measure-preview'), '', 'Preview cleared');
    assert.equal(await canvas.getAttribute('data-stock-stream'), 'false', 'Stream cleared');
    assert.equal(await canvas.getAttribute('data-held'), '', 'Tool released');
  }
  return { canvas, saved, current, action, station, point, grab, tap, carry, pour, stroke, idle };
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
      result.startup = await p.evaluate(() => ({ status: document.querySelector('#sceneStatus')?.textContent }));
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
    page = await open(); const ui = controls(page); await ui.station('measure');
    let before = await ui.current(); await ui.carry();
    assert.deepEqual(await ui.current(), before, 'Carrying the carton never commits early');
    assert.equal(await ui.canvas.getAttribute('data-stock-stream'), 'true');
    assert.equal(await ui.canvas.getAttribute('data-measure-preview'), '150');
    assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '0');
    await shot(page, 'stock-pour-preview');
    await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.carry(); await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true }); await page.mouse.up();
    await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.carry(); const bounds = await ui.canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width + 20, bounds.y + bounds.height / 2, { steps: 8 }); await page.mouse.up();
    await ui.idle(); assert.deepEqual(await ui.current(), before);
    await ui.carry(); await page.locator('#viewToggle').evaluate(el => el.click()); await page.mouse.up();
    await ui.idle(); assert.deepEqual(await ui.current(), before); await page.locator('#viewToggle').click(); await page.locator('#focusView').click();
    await page.locator('#studioInteractionMode').click(); let p = await ui.point('stockCarton'), q = await ui.point('jugFill');
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 8 }); await page.mouse.up();
    await ui.idle(); assert.deepEqual(await ui.current(), before); await page.locator('#studioInteractionMode').click(); await page.locator('#focusView').click();
    result.checks.push('The stock stream and 150 mL fill preview are reversible; Escape, pointer cancellation, outside release, text view, and camera mode preserve evidence.');

    await ui.pour(); let after = await ui.current();
    assert.equal(after.log.length, before.log.length + 1); assert.equal(after.log.at(-1).action, 'add150'); assert.equal(after.values.ml, 150);
    await ui.idle(); assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '150');
    await page.waitForTimeout(650); assert.deepEqual(await ui.current(), after, 'The carton does not continue filling on its own');
    p = await ui.grab('jug'); await page.mouse.move(p.x, p.y - 65, { steps: 8 });
    assert.equal(await ui.canvas.getAttribute('data-measure-preview'), '200'); assert.deepEqual(await ui.current(), after);
    await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle(); assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '150');
    await ui.stroke(-65); assert.equal((await ui.current()).values.ml, 200); await ui.stroke(65); assert.equal((await ui.current()).values.ml, 150);
    await ui.action('empty'); await ui.stroke(65); assert.equal((await ui.current()).values.ml, 0); await ui.idle();
    result.checks.push('Each carton release adds exactly one 150 mL step; existing 50 mL jug adjustments retain cancellable numeric previews and a zero floor.');

    for (let i = 0; i < 6; i++) await ui.action('add150'); await ui.action('add50');
    before = await ui.current(); assert.equal(before.values.ml, 950); await ui.carry();
    assert.equal(await ui.canvas.getAttribute('data-measure-preview'), '1000'); assert.deepEqual(await ui.current(), before);
    await page.mouse.up(); after = await ui.current(); assert.equal(after.values.ml, 1000); assert.equal(after.log.length, before.log.length + 1);
    assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '1000'); await ui.idle();
    await ui.carry(); assert.equal(await ui.canvas.getAttribute('data-measure-preview'), '1000');
    assert.equal(await ui.canvas.getAttribute('data-stock-stream'), 'false', 'An already-full jug does not show a false liquid transfer');
    assert.deepEqual(await ui.current(), after); await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle();
    result.checks.push('The fill preview and committed quantity both honor the jug capacity when a 150 mL step starts at 950 mL.');

    await page.locator('#retry').click(); await page.locator('#focusView').click();
    for (let i = 0; i < 3; i++) await ui.pour();
    after = await ui.current(); assert.equal(after.values.ml, 450); assert.equal(after.done, false, 'Filling does not silently check the recipe');
    await ui.tap('measureCheck'); after = await ui.current(); assert.equal(after.done, true); const foundationValues = after.values;
    assert.deepEqual(after.log.map(entry => entry.action), ['add150', 'add150', 'add150', 'check']);
    await shot(page, 'measured-stock'); await audit(page, 'Desktop measuring controls');
    result.checks.push('Three direct stock pours reach 450 mL; an explicit tap on the check card completes the foundation recipe.');

    await page.locator('input[name=reason][value="2"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '0'); before = await ui.saved();
    p = await ui.point('stockCarton'); q = await ui.point('jugFill');
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); await ui.idle(); assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '0');
    await page.locator('#replayStep').fill('1'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '150'); await ui.idle();
    await page.locator('#returnLatest').click(); await page.locator('#focusView').click();
    assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '450'); await ui.idle();
    result.checks.push('Replay restores historical fill quantities and remains read-only; returning to the latest attempt clears all preview state.');

    await page.locator('#newChallenge').click(); await page.locator('#focusView').click(); assert.equal((await ui.current()).scenario, 'four');
    await ui.pour(); await ui.pour(); await ui.tap('measureCheck'); after = await ui.current();
    assert.equal(after.values.ml, 300); assert.equal(after.done, true); assert.deepEqual(after.log.map(entry => entry.action), ['add150', 'add150', 'check']);
    result.checks.push('The four-serving variation completes with two pours and the same explicit measurement check.');

    await page.locator('#resetView').click(); await shot(page, 'measurement-overview'); await page.locator('#focusView').click();
    await ui.station('probe'); await ui.action('thick'); await ui.tap('probe');
    assert.equal((await ui.current()).values.reading, 150); assert.equal((await ui.current()).log.at(-1).action, 'read');
    await shot(page, 'focused-temperature-readout'); await ui.station('measure');
    assert.equal(await ui.canvas.getAttribute('data-measure-ml'), '300'); await ui.idle();
    result.checks.push('Overview and station focus restore the relevant instrument labels; the thermometer remains directly usable after leaving the measuring station.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(mobile); await phone.station('measure'); const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }] });
    for (let step = 0; step < 3; step++) {
      const from = await phone.point('stockCarton'), to = await phone.point('jugFill'), initial = await phone.current(), scrollBefore = await mobile.evaluate(() => scrollY);
      await touch('touchStart', from.x, from.y); assert.equal(await phone.canvas.getAttribute('data-held'), 'stockCarton');
      for (let i = 1; i <= 10; i++) await touch('touchMove', from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10);
      assert.deepEqual(await phone.current(), initial); assert.equal(await phone.canvas.getAttribute('data-measure-preview'), String((step + 1) * 150));
      assert.equal(await phone.canvas.getAttribute('data-stock-stream'), 'true');
      if (!step) {
        // Capture the viewport without screenshot auto-scroll moving an active touch target.
        await mobile.screenshot({ path: path.join(out, 'stock-pour-mobile.png'), style: '.taskbar { visibility: hidden !important; }' }); result.screenshots.push('stock-pour-mobile.png');
      }
      await touch('touchEnd'); assert.equal(await mobile.evaluate(() => scrollY), scrollBefore); await phone.idle();
    }
    await phone.tap('measureCheck'); assert.equal((await phone.current()).done, true); assert.deepEqual((await phone.current()).values, foundationValues);
    result.checks.push('Real mobile touch pours preview before release, avoid page scrolling, and reach the same measured result.');

    await mobile.setViewportSize({ width: 320, height: 844 }); assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit(mobile, '320px measuring controls'); await mobile.locator('#retry').click(); await mobile.locator('#viewToggle').click();
    for (const id of ['add150', 'add150', 'add150', 'check']) { await mobile.locator('[data-action="' + id + '"]').focus(); await mobile.keyboard.press('Enter'); }
    assert.deepEqual((await phone.current()).values, foundationValues); await mobile.close();
    result.checks.push('Keyboard/text controls produce the same result, and the 320px interface passes accessibility and overflow checks.');
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
