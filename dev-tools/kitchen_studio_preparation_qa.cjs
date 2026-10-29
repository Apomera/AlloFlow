/* Direct preparation, guide-hand motion, and reversible knife previews. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_PREPARATION_QA_OUT || path.join(root, 'reports/kitchen-studio-preparation'));
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
  async function grip(dy) {
    const p = await grab('grip'); await page.mouse.move(p.x, p.y + dy, { steps: 8 }); await page.mouse.up();
  }
  async function cut() {
    const p = await grab('knife'); await page.mouse.move(p.x, p.y + 60, { steps: 8 });
    await page.mouse.move(p.x, p.y, { steps: 8 }); await page.mouse.up();
  }
  return { canvas, saved, current, action, station, point, grab, tap, drag, grip, cut };
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
    page = await open(); const ui = controls(page); await ui.station('prep');
    const sanitizerFinder = page.locator('[data-studio-tool="sanitizer"]');
    assert.ok(!(await sanitizerFinder.count()) || await sanitizerFinder.isDisabled(), 'Foundation challenge does not offer a hidden sanitizer');
    await ui.tap('faucet'); let after = await ui.current();
    assert.equal(after.log.at(-1).action, 'rinse'); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.values.washed, false);
    await ui.drag('vegetableBasket', 'prepBoardTarget'); after = await ui.current();
    assert.equal(after.log.at(-1).action, 'prepare'); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.done, false);
    result.checks.push('The faucet and early basket transfer preserve the existing corrections for water-only washing and an unprepared workspace.');

    await page.locator('#retry').click(); await ui.tap('soap'); await ui.tap('prepBoard');
    let before = await ui.current(), target = await ui.point('prepBoardTarget'); await ui.grab('vegetableBasket');
    await page.mouse.move(target.x, target.y, { steps: 10 }); assert.deepEqual(await ui.current(), before, 'Basket preview does not prepare food');
    await page.keyboard.press('Escape'); await page.mouse.up(); assert.deepEqual(await ui.current(), before, 'Cancelled basket placement records nothing');
    await ui.drag('vegetableBasket', 'prepBoardTarget'); after = await ui.current();
    assert.equal(after.done, true); assert.deepEqual(after.log.map(entry => entry.action), ['wash', 'board', 'prepare']);
    assert.ok(after.log.every(entry => entry.accepted)); await shot(page, 'prepared-workspace');
    result.checks.push('Soap, clean board, and basket carry complete the foundation preparation directly, with reversible carrying previews.');

    await page.locator('#newChallenge').click(); assert.equal((await ui.current()).scenario, 'shared-board');
    assert.equal(await sanitizerFinder.isDisabled(), false, 'Shared-board challenge exposes sanitizing equipment');
    await ui.tap('sanitizer'); after = await ui.current(); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.values.clean, undefined);
    await page.locator('#retry').click(); await ui.tap('prepBoard');
    assert.equal((await ui.current()).values.cleaned, true); assert.equal((await ui.current()).values.clean, false);
    await ui.tap('sanitizer'); assert.equal((await ui.current()).values.clean, true); assert.equal((await ui.current()).values.washed, false);
    await ui.tap('soap'); await ui.drag('vegetableBasket', 'prepBoardTarget'); after = await ui.current();
    assert.equal(after.done, true); assert.deepEqual(after.log.map(entry => entry.action), ['board', 'sanitize', 'wash', 'prepare']);
    assert.ok(after.log.every(entry => entry.accepted)); await shot(page, 'shared-board-preparation');
    result.checks.push('Shared equipment still requires washing, sanitizing, and handwashing in order; direct actions never bypass those prerequisites.');

    await page.locator('input[name=reason][value="1"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    assert.equal(await sanitizerFinder.isDisabled(), false, 'Shared-board sanitizer remains discoverable in historical replay');
    before = await ui.saved(); let from = await ui.point('vegetableBasket'), to = await ui.point('prepBoardTarget');
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); assert.equal(await page.locator('#replayBanner').isVisible(), true);
    await page.locator('#returnLatest').click();
    result.checks.push('Historical preparation remains read-only while preserving the alternate challenge equipment.');

    await ui.station('knife'); await ui.tap('board'); before = await ui.current();
    let p = await ui.grab('grip'); await page.mouse.move(p.x, p.y - 36, { steps: 8 });
    assert.deepEqual(await ui.current(), before, 'Curling the hand is a preview until release');
    assert.ok(Number(await ui.canvas.getAttribute('data-grip-curl')) > 0, 'The articulated hand follows the preview');
    await page.keyboard.press('Escape'); await page.mouse.up(); assert.deepEqual(await ui.current(), before);
    assert.equal(await ui.canvas.getAttribute('data-grip-curl'), '0', 'Cancelling restores the extended hand');
    p = await ui.grab('grip'); await page.mouse.move(p.x + 60, p.y - 36, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await ui.current(), before, 'A sideways sweep cannot select a grip');
    await ui.grip(36); after = await ui.current(); assert.equal(after.values.claw, false); assert.equal(after.log.at(-1).action, 'flat');
    await ui.cut(); after = await ui.current(); assert.equal(after.log.at(-1).action, 'dice'); assert.equal(after.log.at(-1).accepted, false); assert.equal(after.values.cut, undefined);
    result.checks.push('Guide-hand previews cancel cleanly, sideways motion is ignored, and an extended grip still prevents the knife action from completing.');

    await page.locator('#retry').click(); await ui.tap('board'); await ui.grip(-36);
    after = await ui.current(); assert.equal(after.values.claw, true); assert.equal(after.log.at(-1).action, 'claw');
    await shot(page, 'claw-grip-ready'); before = await ui.current();
    p = await ui.grab('knife'); await page.mouse.move(p.x, p.y + 60, { steps: 8 });
    assert.deepEqual(await ui.current(), before, 'Cut preview leaves saved food unchanged');
    assert.equal(await ui.canvas.getAttribute('data-cut-preview'), '12', 'Prepared food visibly previews the downward cut');
    await page.keyboard.press('Escape'); await page.mouse.up(); assert.deepEqual(await ui.current(), before);
    assert.equal(await ui.canvas.getAttribute('data-cut-preview'), '0', 'Cancelling restores the uncut carrot');
    await ui.cut(); after = await ui.current();
    assert.equal(after.done, true); assert.deepEqual(after.log.map(entry => entry.action), ['secure', 'claw', 'dice']); assert.ok(after.log.every(entry => entry.accepted));
    const smallDiceValues = after.values; await shot(page, 'direct-small-dice');
    await page.locator('#newChallenge').click(); assert.equal((await ui.current()).scenario, 'stew');
    await ui.tap('board'); await ui.grip(-36); await page.locator('#studioCutSize').selectOption('largeDice'); await ui.cut();
    after = await ui.current(); assert.equal(after.values.cut, 'large'); assert.equal(after.done, true);
    result.checks.push('Board, claw grip, and a full knife pass complete cutting directly; cancellation restores food, and the stew supports the chosen large dice.');

    await page.locator('input[name=reason][value="2"]').check(); await page.locator('#submit').click();
    await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    before = await ui.saved(); p = await ui.point('grip'); await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(p.x, p.y - 36, { steps: 8 }); await page.mouse.up();
    assert.deepEqual(await ui.saved(), before); assert.equal(await page.locator('#replayBanner').isVisible(), true);
    assert.equal(await ui.canvas.getAttribute('data-grip-curl'), '0', 'Read-only contact preserves the historical extended hand pose');
    await page.locator('#returnLatest').click(); await page.locator('#newChallenge').click();
    assert.equal((await ui.current()).scenario, 'standard');
    assert.equal(await page.locator('#studioCutSize').inputValue(), 'dice', 'Returning from stew resets an unsupported cut choice');
    assert.equal(await page.locator('#studioCutSize option[value="largeDice"]').evaluate(option => option.disabled), true);
    await ui.tap('board'); await ui.grip(-36); await ui.cut(); assert.equal((await ui.current()).done, true);
    await audit(page, 'Desktop preparation and knife controls');
    result.checks.push('Recorded knife work stays read-only; returning from stew restores a supported cut choice and the controls pass desktop accessibility checks.');

    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = controls(mobile); await phone.station('knife'); await phone.tap('board');
    const cdp = await mobile.context().newCDPSession(mobile);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 4, radiusY: 4, force: 1 }] });
    p = await phone.point('grip'); before = await phone.current(); const scrollBefore = await mobile.evaluate(() => scrollY);
    await touch('touchStart', p.x, p.y); assert.equal(await phone.canvas.getAttribute('data-held'), 'grip');
    for (let i = 1; i <= 8; i++) await touch('touchMove', p.x, p.y - 36 * i / 8);
    assert.deepEqual(await phone.current(), before); await touch('touchEnd');
    assert.equal((await phone.current()).values.claw, true); assert.equal(await mobile.evaluate(() => scrollY), scrollBefore);
    await phone.cut(); assert.deepEqual((await phone.current()).values, smallDiceValues); await shot(mobile, 'knife-touch-mobile');
    await mobile.setViewportSize({ width: 320, height: 844 });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await audit(mobile, '320px preparation controls');
    await mobile.locator('#retry').click(); await mobile.locator('#viewToggle').click();
    for (const id of ['secure', 'claw', 'dice']) { await mobile.locator('[data-action="' + id + '"]').focus(); await mobile.keyboard.press('Enter'); }
    assert.deepEqual((await phone.current()).values, smallDiceValues); await mobile.close();
    result.checks.push('Real touch curls the guide hand without scrolling or premature commits; narrow-screen and keyboard/text controls remain equivalent.');
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
