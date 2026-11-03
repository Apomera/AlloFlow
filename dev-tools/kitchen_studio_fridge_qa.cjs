/* Native refrigerator handling uses the studio's normal HTML entry point. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'reports/kitchen-studio-fridge');
const storageKey = 'alloflow-kitchen-studio-v1';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(data);
  });
});

function assertViewOnly(before, after) {
  assert.deepEqual(after, before, 'Opening or previewing the refrigerator must not change recorded cooking evidence');
}

function assertDoor(opening, expected) {
  assert.ok(Number.isFinite(opening) && Math.abs(opening - expected) < .00001,
    'The refrigerator door should be at opening ' + expected + ', received ' + opening);
}

function selftest() {
  const original = { values: { shallow: true }, log: [{ action: 'shallow', accepted: true }] };
  assertViewOnly(original, JSON.parse(JSON.stringify(original)));
  assert.throws(() => assertViewOnly(original, { ...original, log: [...original.log, { action: 'chill' }] }));
  assert.throws(() => assertViewOnly(original, { ...original, values: { shallow: false } }));
  assertDoor(0, 0); assertDoor(1, 1);
  assert.throws(() => assertDoor(.5, 1));
  assert.throws(() => assertDoor(NaN, 0));
  console.log('Fridge QA oracle self-test passed, including evidence and door-pose mutations.');
}

if (process.argv.includes('--selftest')) {
  selftest();
} else {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/index.html';
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { checks: [], accessibility: [], screenshots: [], errors: [] };
  let page;

  async function open(options = {}) {
    const next = await browser.newPage({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce', ...options });
    next.setDefaultTimeout(20000);
    next.on('pageerror', error => result.errors.push(error.message));
    next.on('console', message => {
      if (message.type() === 'warning' && message.text().startsWith('Kitchen Studio')) result.errors.push(message.text());
    });
    await next.goto(url);
    await next.locator('#scene canvas[data-targets]').waitFor();
    await next.locator('[data-station="chill"]').click();
    await next.locator('#focusView').click();
    return next;
  }

  function controls(currentPage) {
    const canvas = currentPage.locator('#scene canvas');
    const saved = () => currentPage.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
    const state = async () => { const data = await saved(); return data.serviceActive ? data.service.work : data.drafts[data.current]; };
    const opening = async () => Number(await canvas.getAttribute('data-fridge-opening'));
    const action = name => currentPage.locator('[data-action="' + name + '"]').click();
    async function point(name) {
      await canvas.evaluate(node => node.scrollIntoView({ block: "center", behavior: "auto" }));
      return canvas.evaluate((node, id) => {
        const at = JSON.parse(node.dataset.targets || '{}')[id], box = node.getBoundingClientRect();
        if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) throw new Error('Missing projected point ' + id);
        if (at.x < 0 || at.x > box.width || at.y < 0 || at.y > box.height) throw new Error('Projected point outside canvas ' + id);
        return { x: box.left + at.x, y: box.top + at.y };
      }, name);
    }
    async function grab(name) {
      const at = await point(name); await currentPage.mouse.move(at.x, at.y); await currentPage.mouse.down();
      assert.equal(await canvas.getAttribute('data-held'), name, name + ' should be held'); return at;
    }
    async function tap(name) { const at = await point(name); await currentPage.mouse.click(at.x, at.y); }
    async function carry(name, destination) {
      const target = await point(destination); await grab(name);
      await currentPage.mouse.move(target.x, target.y, { steps: 12 });
    }
    async function drop(name, destination) { await carry(name, destination); await currentPage.mouse.up(); }
    async function idle(expectedOpening) {
      assert.equal(await canvas.getAttribute('data-held'), '');
      assert.equal(await canvas.getAttribute('data-storage-preview'), '');
      if (expectedOpening !== undefined) assertDoor(await opening(), expectedOpening);
    }
    return { canvas, saved, state, opening, point, grab, tap, carry, drop, idle, action };
  }

  async function shot(currentPage, name) {
    const options = { path: path.join(output, name + ".png"), style: ".taskbar{visibility:hidden!important}" };
    if (await currentPage.locator("#scene canvas").getAttribute("data-held")) await currentPage.screenshot(options);
    else await currentPage.locator(".scene-card").screenshot(options);
    result.screenshots.push(name + '.png');
  }
  async function audit(currentPage, name) {
    await currentPage.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await currentPage.evaluate(async () => (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }
    })).violations.map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) })));
    result.accessibility.push({ name, issues }); assert.deepEqual(issues, [], name + ' accessibility');
  }

  try {
    page = await open(); const ui = controls(page);
    let before = await ui.saved();
    await ui.idle(0); assert.equal(await ui.canvas.getAttribute('data-storage-location'), 'counter');
    await ui.tap('fridgeHandle'); await ui.idle(1); assertViewOnly(before, await ui.saved());
    await shot(page, 'open-fridge-interior');
    await ui.tap('fridgeHandle'); await ui.idle(0); assertViewOnly(before, await ui.saved());

    let handle = await ui.grab('fridgeHandle');
    await page.mouse.move(handle.x, handle.y + 60, { steps: 10 });
    assert.ok(await ui.opening() > .5); assertViewOnly(before, await ui.saved());
    await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle(0); assertViewOnly(before, await ui.saved());
    for (const distance of [10, 60]) {
      handle = await ui.grab('fridgeHandle'); await page.mouse.move(handle.x, handle.y + distance, { steps: 8 });
      if (distance === 60) await page.mouse.move(handle.x, handle.y, { steps: 8 });
      await page.mouse.up(); await ui.idle(0); assertViewOnly(before, await ui.saved());
    }
    handle = await ui.grab('fridgeHandle'); await page.mouse.move(handle.x, handle.y + 60, { steps: 8 });
    await ui.canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true });
    await page.mouse.up(); await ui.idle(0); assertViewOnly(before, await ui.saved());
    handle = await ui.grab('fridgeHandle'); await page.mouse.move(handle.x, handle.y + 60, { steps: 8 }); await page.mouse.up();
    await ui.idle(1); assertViewOnly(before, await ui.saved());
    handle = await ui.grab('fridgeHandle'); await page.mouse.move(handle.x, handle.y - 60, { steps: 8 }); await page.mouse.up();
    await ui.idle(0); assertViewOnly(before, await ui.saved());
    result.checks.push('Native handle taps and pull/push gestures change only the refrigerator view. Partial, reversed, escaped and cancelled pulls restore the previous door pose.');

    await ui.carry('tub', 'fridge');
    assert.equal(await ui.canvas.getAttribute('data-storage-preview'), 'fridge'); assertDoor(await ui.opening(), 1);
    assertViewOnly(before, await ui.saved()); await shot(page, 'refrigerator-placement-preview');
    await page.keyboard.press('Escape'); await page.mouse.up(); await ui.idle(0); assertViewOnly(before, await ui.saved());
    await ui.drop('tub', 'fridge');
    let state = await ui.state(); assert.equal(state.log.at(-1).action, 'chill'); assert.equal(state.log.at(-1).accepted, false);
    assert.equal(await ui.canvas.getAttribute('data-storage-location'), 'counter');
    before = await ui.saved(); await page.locator('#studioFridgeToggle').click(); await ui.idle(1);
    await ui.carry('tub', 'wasteBin'); await page.keyboard.press('Escape'); await page.mouse.up();
    await ui.idle(1); assertViewOnly(before, await ui.saved());
    await ui.carry('tub', 'shallowTray');
    await page.locator('#studioFridgeToggle').evaluate(button => button.click()); await page.mouse.up();
    await ui.idle(0); assertViewOnly(before, await ui.saved());
    result.checks.push('Shelf placement previews are reversible, early refrigeration retains its correction, and door controls cancel a held container before toggling.');

    await page.locator('#retry').click();
    await ui.carry('tub', 'shallowTray');
    assert.equal(await ui.canvas.getAttribute('data-storage-preview'), 'shallowTray'); await page.mouse.up();
    await ui.drop('labelCard', 'containerTarget');
    await ui.carry('tub', 'fridge'); await shot(page, 'shallow-containers-on-shelf-preview'); await page.mouse.up();
    state = await ui.state();
    assert.deepEqual(state.log.map(entry => entry.action), ['shallow', 'label', 'chill']);
    assert.ok(state.log.every(entry => entry.accepted)); assert.equal(state.done, true);
    assert.equal(await ui.canvas.getAttribute('data-storage-location'), 'fridge'); await ui.idle(1);
    await shot(page, 'refrigerated-shallow-containers');
    const completeValues = state.values;
    before = await ui.saved(); await page.locator('#studioFridgeToggle').click(); await ui.idle(0);
    await page.locator('[data-studio-tool="tub"]').click(); await ui.idle(1); assertViewOnly(before, await ui.saved());
    await ui.tap('fridgeHandle'); await ui.idle(0); await ui.tap('fridgeHandle'); await ui.idle(1);
    assertViewOnly(before, await ui.saved());
    result.checks.push('Three deliberate storage decisions place labeled shallow containers inside the refrigerator. Finished attempts still allow view-only inspection.');

    await page.locator('input[name="reason"][value="0"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel > summary').click();
    await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await ui.canvas.getAttribute('data-storage-location'), 'counter');
    before = await ui.saved(); await page.locator('#studioFridgeToggle').click();
    assertViewOnly(before, await ui.saved());
    await ui.idle(1);
    handle = await ui.grab('fridgeHandle');
    await page.mouse.move(handle.x, handle.y - 60, { steps: 8 });
    await page.locator('#replayStep').fill('3'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await ui.canvas.getAttribute('data-storage-location'), 'fridge'); await ui.idle(1);
    await page.mouse.up(); await ui.idle(1); assertViewOnly(before, await ui.saved());
    before = await ui.saved(); await ui.tap('fridgeHandle'); await ui.tap('fridgeHandle'); assertViewOnly(before, await ui.saved());
    await page.locator('#returnLatest').click(); await page.locator('#newChallenge').click();
    assert.equal((await ui.state()).scenario, 'picnic');
    await ui.drop('tub', 'fridge'); assert.equal((await ui.state()).log.at(-1).accepted, false);
    await ui.drop('tub', 'wasteBin'); state = await ui.state(); assert.equal(state.done, true); assert.equal(state.values.discarded, true);
    assert.equal(await ui.canvas.getAttribute('data-storage-location'), 'discarded');
    await audit(page, 'Desktop refrigerator and storage controls');
    result.checks.push('Replay shows historical counter and shelf locations, cancels a held door before a stage change, and keeps door exploration read-only. The picnic challenge preserves the rejected refrigeration and accepted discard decisions.');
    await page.close();

    page = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(page), cdp = await page.context().newCDPSession(page);
    const touch = (type, at) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: at ? [{ ...at, id: 1, radiusX: 3, radiusY: 3, force: 1 }] : []
    });
    before = await phone.saved(); handle = await phone.point('fridgeHandle'); const scroll = await page.evaluate(() => scrollY);
    await touch('touchStart', handle); await touch('touchEnd'); await phone.idle(1); assertViewOnly(before, await phone.saved());
    handle = await phone.point('fridgeHandle'); await touch('touchStart', handle);
    for (let i = 1; i <= 10; i++) await touch('touchMove', { x: handle.x, y: handle.y - i * 6 });
    assertViewOnly(before, await phone.saved()); await touch('touchEnd'); await phone.idle(0);
    assert.equal(await page.evaluate(() => scrollY), scroll);
    async function touchCarry(name, target) {
      const from = await phone.point(name), to = await phone.point(target), initial = await phone.saved();
      await touch('touchStart', from);
      for (let i = 1; i <= 10; i++) await touch('touchMove', { x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 });
      assertViewOnly(initial, await phone.saved()); await touch('touchEnd');
    }
    await touchCarry('tub', 'shallowTray'); await touchCarry('labelCard', 'containerTarget'); await touchCarry('tub', 'fridge');
    assert.deepEqual((await phone.state()).values, completeValues); await phone.idle(1);
    await shot(page, 'phone-refrigerator-storage');
    await page.setViewportSize({ width: 320, height: 844 });
    before = await phone.saved(); await page.locator('#studioFridgeToggle').focus(); await page.keyboard.press('Enter'); await phone.idle(0);
    await page.keyboard.press('Enter'); await phone.idle(1); assertViewOnly(before, await phone.saved());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit(page, '320px refrigerator controls');
    await page.locator('#viewToggle').click(); assert.equal(await page.locator('#studioFridgeToggle').isVisible(), false);
    result.checks.push('Native phone taps, door pushes and container carries work without scrolling or premature decisions. Keyboard door controls remain available after completion at 320px.');
    assert.deepEqual(result.errors, []); result.pass = true;
  } catch (error) {
    result.failure = error.stack || error.message;
    if (page && !page.isClosed()) {
      result.status = await page.locator('#studioTouchStatus').textContent().catch(() => null);
      result.targets = await page.locator('#scene canvas').getAttribute('data-targets').catch(() => null);
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(result, null, 2));
}
