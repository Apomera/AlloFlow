/* Direct storage choices, physical readouts, and deliberate simulation stepping. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_STORAGE_QA_OUT || path.join(root, 'reports/kitchen-studio-storage'));
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
    page = await open(); const ui = controls(page); await ui.station('chill');
    let before = await ui.current();
    await page.locator('[data-studio-tool="labelCard"]').click();
    assert.deepEqual(await ui.current(), before, 'Finding the label does not label food');
    await ui.drag('tub', 'fridge');
    let after = await ui.current(); assert.equal(after.log.at(-1).action, 'chill'); assert.equal(after.log.at(-1).accepted, false);
    assert.equal(after.done, false); assert.equal(after.values.chilled, undefined);
    await ui.drag('tub', 'wasteBin'); after = await ui.current();
    assert.equal(after.log.at(-1).action, 'discard'); assert.equal(after.log.at(-1).accepted, false);
    assert.equal(after.values.discarded, undefined); assert.equal(await page.locator('[data-studio-tool="tub"]').isDisabled(), false);
    result.checks.push('Storage destinations record learner choices; early refrigeration and discarding fresh leftovers retain the engine corrections.');

    before = await ui.current(); const labelTarget = await ui.point('containerTarget'); await ui.grab('labelCard');
    await page.mouse.move(labelTarget.x, labelTarget.y, { steps: 10 });
    assert.deepEqual(await ui.current(), before, 'Label preview does not alter evidence');
    await page.keyboard.press('Escape'); await page.mouse.up(); assert.deepEqual(await ui.current(), before);
    const trayTarget = await ui.point('shallowTray'); await ui.grab('tub');
    await page.mouse.move(trayTarget.x, trayTarget.y, { steps: 10 });
    assert.deepEqual(await ui.current(), before, 'Portioning preview does not alter evidence');
    await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true });
    await page.mouse.up(); assert.deepEqual(await ui.current(), before);
    result.checks.push('Escaping a label placement or cancelling a tray carry restores the scene without recording an action.');

    await page.locator('#retry').click();
    await ui.drag('tub', 'shallowTray'); assert.equal((await ui.current()).values.shallow, true);
    await ui.drag('labelCard', 'containerTarget'); assert.equal((await ui.current()).values.label, true);
    await shot(page, 'labeled-shallow-leftovers');
    await ui.drag('tub', 'fridge'); after = await ui.current();
    assert.deepEqual(after.log.map(entry => entry.action), ['shallow', 'label', 'chill']);
    assert.ok(after.log.every(entry => entry.accepted)); assert.equal(after.done, true); assert.equal(after.values.chilled, true);
    const storageValues = after.values;
    result.checks.push('A full safe-storage sequence can be completed through three direct carries: shallow containers, label, and refrigerator.');

    await page.locator('input[name=reason][value="0"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click();
    await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await page.locator('[data-studio-tool="labelCard"]').isDisabled(), false, 'An unplaced historical label can be found even when the latest label is already applied');
    before = await ui.saved(); let p = await ui.point('labelCard'), q = await ui.point('containerTarget');
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 10 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); assert.equal(await page.locator('#replayBanner').isVisible(), true);
    await page.locator('#returnLatest').click();
    assert.equal(await page.locator('[data-studio-tool="labelCard"]').isDisabled(), true, 'Returning to the applied label disables its finder');
    await page.locator('#newChallenge').click(); assert.equal((await ui.current()).scenario, 'picnic');
    await ui.drag('tub', 'fridge'); assert.equal((await ui.current()).log.at(-1).accepted, false);
    await ui.drag('tub', 'wasteBin'); after = await ui.current();
    assert.equal(after.values.discarded, true); assert.equal(after.done, true); assert.equal(after.log.at(-1).accepted, true);
    assert.equal(await page.locator('[data-studio-tool="tub"]').isDisabled(), true);
    await page.locator('input[name=reason][value="0"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click();
    await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await page.locator('[data-studio-tool="tub"]').isDisabled(), false, 'Leftovers are discoverable in a replay before disposal');
    await page.locator('#returnLatest').click();
    assert.equal(await page.locator('[data-studio-tool="tub"]').isDisabled(), true, 'Returning to the discarded latest state disables its finder');
    result.checks.push('Recorded storage stays read-only; the picnic variant preserves the difference between late refrigeration and appropriate disposal.');

    await ui.station('heat'); await ui.action('medium'); before = await ui.current();
    await ui.tap('cookTimer'); after = await ui.current();
    assert.equal(after.log.length, before.log.length + 1); assert.equal(after.log.at(-1).action, 'advance'); assert.equal(after.values.seconds, 30);
    await page.waitForTimeout(650); assert.deepEqual(await ui.current(), after, 'The scene clock does not cook automatically');
    await ui.tap('cookTimer'); assert.equal((await ui.current()).values.seconds, 60);
    await shot(page, 'cook-timer-readout');
    result.checks.push('The physical cook timer advances one 30-second simulation step per tap and never runs cooking automatically.');

    await ui.station('measure'); await ui.tap('measureCheck'); after = await ui.current();
    assert.equal(after.log.at(-1).action, 'check'); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.done, false);
    for (let i = 0; i < 3; i++) await ui.action('add150');
    await ui.tap('measureCheck'); after = await ui.current();
    assert.equal(after.values.ml, 450); assert.equal(after.done, true); assert.equal(after.log.at(-1).accepted, true);
    result.checks.push('The measurement check validates the chosen quantity; an incorrect amount remains a correction and an exact recipe portion completes the station.');

    await ui.station('probe'); assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '—');
    await ui.drag('probe', 'probeCenter'); await ui.tap('probe');
    assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '150');
    await ui.action('cook'); assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '—');
    await ui.tap('probe'); assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '155');
    await ui.drag('probe', 'probeSurface'); assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '—');
    await ui.tap('probe'); assert.equal(await ui.canvas.getAttribute('data-probe-reading'), '180');
    await shot(page, 'thermometer-reading'); await audit(page, 'Desktop storage and readouts');
    result.checks.push('The thermometer display tracks explicit readings and clears stale evidence after more cooking or changed placement.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(mobile); await phone.station('chill');
    const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }] });
    async function carry(id, destination) {
      const from = await phone.point(id), to = await phone.point(destination), initial = await phone.current(), scrollBefore = await mobile.evaluate(() => scrollY);
      await touch('touchStart', from.x, from.y); assert.equal(await phone.canvas.getAttribute('data-held'), id);
      for (let i = 1; i <= 10; i++) await touch('touchMove', from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10);
      assert.deepEqual(await phone.current(), initial, 'Touch preview stays uncommitted');
      await touch('touchEnd'); assert.equal(await mobile.evaluate(() => scrollY), scrollBefore, 'Carrying stays in the scene instead of scrolling');
    }
    await carry('tub', 'shallowTray'); await carry('labelCard', 'containerTarget'); await carry('tub', 'fridge');
    assert.equal((await phone.current()).done, true); assert.deepEqual((await phone.current()).values, storageValues);
    await shot(mobile, 'storage-touch-mobile');
    await mobile.setViewportSize({ width: 320, height: 844 });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await audit(mobile, '320px storage controls');
    await mobile.locator('#retry').click(); await mobile.locator('#viewToggle').click();
    for (const id of ['shallow', 'label', 'chill']) { await mobile.locator('[data-action="' + id + '"]').focus(); await mobile.keyboard.press('Enter'); }
    assert.deepEqual((await phone.current()).values, storageValues); await mobile.close();
    result.checks.push('Real mobile touch completes storage without scrolling or premature commits; 320px controls and keyboard/text actions remain equivalent.');
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
