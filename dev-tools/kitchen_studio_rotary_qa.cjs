/* Native burner turns in the Skills Studio. Run with node dev-tools/kitchen_studio_rotary_qa.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {createInterface} = require('node:readline');
const {chromium} = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/kitchen-studio-rotary');
const checks = [], accessibility = [], errors = [];
let preview, browser;

async function previewUrl() {
  if (process.env.KITCHEN_STUDIO_URL) return process.env.KITCHEN_STUDIO_URL;
  preview = spawn(process.execPath, [path.join(__dirname, 'kitchen_studio_preview.cjs')], {
    cwd: root, env: {...process.env, KITCHEN_PREVIEW_PORT: '0'}, stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true
  });
  return new Promise((resolve, reject) => {
    const lines = createInterface({input: preview.stdout});
    preview.once('error', reject);
    preview.once('exit', code => reject(new Error('Preview server exited with code ' + code)));
    lines.on('line', line => {
      const match = /^Kitchen Studio preview: (http:\/\/127\.0\.0\.1:\d+\/.*)$/.exec(line);
      if (match) resolve(match[1]);
    });
  });
}

async function open(url, options = {}) {
  const page = await browser.newPage({viewport: {width: 1360, height: 1000}, reducedMotion: 'reduce', ...options});
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  const canvas = page.locator('#scene canvas[data-targets]');
  await canvas.waitFor();
  await page.locator('[data-station="heat"]').click();
  await page.locator('#focusView').click();
  const state = () => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('alloflow-kitchen-studio-v1'));
    return saved.drafts[saved.current];
  });
  async function targets() {
    await canvas.scrollIntoViewIfNeeded();
    return canvas.evaluate(el => {
      const points = JSON.parse(el.dataset.targets), bounds = el.getBoundingClientRect();
      const names = ['dial', ...Array.from({length: 16}, (_, i) => 'dialRim' + i)];
      return Object.fromEntries(names.map(name => {
        const p = points[name];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Missing projected point ' + name);
        return [name, {x: bounds.left + p.x, y: bounds.top + p.y}];
      }));
    });
  }
  async function assertIdle(setting) {
    assert.equal(await canvas.getAttribute('data-held'), '');
    assert.equal(await canvas.getAttribute('data-dial-preview'), '');
    assert.equal(await canvas.getAttribute('data-dial-heat'), setting);
    assert.equal(await page.locator('#studioDialScale').isVisible(), false);
  }
  return {page, canvas, state, targets, assertIdle};
}

function rim(points, index) { return points['dialRim' + ((index % 16 + 16) % 16)]; }
async function mouseHold(ui, start, offsets, allowLocked = false) {
  const points = await ui.targets(), first = rim(points, start);
  await ui.page.mouse.move(first.x, first.y);
  await ui.page.mouse.down();
  if (!allowLocked) assert.equal(await ui.canvas.getAttribute('data-held'), 'dial');
  for (const offset of offsets) {
    const p = rim(points, start + offset);
    await ui.page.mouse.move(p.x, p.y, {steps: 2});
  }
  return points;
}
function arc(steps) { return Array.from({length: Math.abs(steps)}, (_, i) => Math.sign(steps) * (i + 1)); }
async function turn(ui, start, steps, expected) {
  const initial = await ui.state();
  await mouseHold(ui, start, arc(steps));
  assert.equal(await ui.canvas.getAttribute('data-dial-preview'), expected);
  const scale = ui.page.locator('#studioDialScale');
  assert.equal(await scale.isVisible(), true);
  assert.deepEqual(await scale.locator('span').allTextContents(), ['Off', 'Low', 'Medium', 'High']);
  assert.deepEqual(await scale.locator('.selected').allTextContents(), [expected[0].toUpperCase()+expected.slice(1)]);
  assert.deepEqual(await ui.state(), initial, 'A held turn only previews the setting');
  await ui.page.mouse.up();
  await ui.assertIdle(expected);
  const result = await ui.state();
  assert.deepEqual(result.log.map(entry => entry.action), [...initial.log.map(entry => entry.action), expected]);
  assert.equal(result.log.at(-1).accepted, true);
  assert.equal(result.done, initial.done);
  assert.equal(result.values.heat, expected === 'off' ? null : expected);
  assert.deepEqual({...result.values, heat: null}, {...initial.values, heat: null}, 'Only the burner setting can change');
}
async function retraceStop(ui, initial, direction) {
  const saved = await ui.state();
  await mouseHold(ui, 0, [1, 2, 3, 4, 3, 2, 1, 0].map(step => step*direction));
  assert.equal(await ui.canvas.getAttribute('data-dial-preview'), initial);
  await ui.page.mouse.up(); await ui.assertIdle(initial);
  assert.deepEqual(await ui.state(), saved, 'Retracing past '+initial+' leaves the original setting and log intact');
}
async function audit(page, name) {
  await page.addScriptTag({path: path.join(root, 'node_modules/axe-core/axe.min.js')});
  const issues = await page.evaluate(async () => (await axe.run(document, {runOnly: {
    type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','best-practice']
  }})).violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})));
  accessibility.push({name, issues}); assert.deepEqual(issues, [], name);
}
async function shot(page, name) {
  await page.locator('.scene-card').screenshot({path: path.join(out, name + '.png'), style: '.taskbar{visibility:hidden!important}'});
}

async function main() {
  fs.mkdirSync(out, {recursive: true});
  const url = await previewUrl();
  browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const ui = await open(url), page = ui.page;
  await retraceStop(ui, 'off', -1);
  await turn(ui, 14, 4, 'low');
  await turn(ui, 2, 4, 'medium');
  const medium = await ui.state();
  await mouseHold(ui, 0, arc(4));
  assert.equal(await ui.canvas.getAttribute('data-dial-preview'), 'high');
  assert.equal(await page.locator('#studioPlacementHint').isVisible(), true);
  await shot(page, 'rim-preview');
  await page.keyboard.press('Escape'); await page.mouse.up();
  await ui.assertIdle('medium'); assert.deepEqual(await ui.state(), medium);
  checks.push('Clockwise rim turns across the angle wrap preview Low and Medium and commit one setting on release. Escape restores Medium.');

  for (const offsets of [[1], [1, 2, 3, 4, 3, 2, 1, 0]]) {
    await mouseHold(ui, 8, offsets); await page.mouse.up();
    await ui.assertIdle('medium'); assert.deepEqual(await ui.state(), medium);
  }
  const bounds = await ui.canvas.boundingBox();
  await mouseHold(ui, 4, arc(-4));
  await page.mouse.move(bounds.x + 5, bounds.y + 5); await page.mouse.up();
  await ui.assertIdle('medium'); assert.deepEqual(await ui.state(), medium);
  await mouseHold(ui, 4, arc(-4));
  await ui.canvas.dispatchEvent('pointerdown', {pointerId: 31, pointerType: 'touch', isPrimary: false, button: 0});
  await page.mouse.up(); await ui.assertIdle('medium'); assert.deepEqual(await ui.state(), medium);
  checks.push('A partial turn, reversal, movement away from the dial or a second contact cancels without changing the recorded cook.');

  const dialPoints = await mouseHold(ui, 0, arc(4));
  await page.mouse.move(dialPoints.dial.x, dialPoints.dial.y, {steps: 4});
  for (const i of [12, 13, 14, 15, 0, 1, 2, 3, 4]) {
    const p = rim(dialPoints, i); await page.mouse.move(p.x, p.y, {steps: 2});
  }
  assert.equal(await ui.canvas.getAttribute('data-phase'), 'retry');
  await page.mouse.up(); await ui.assertIdle('medium'); assert.deepEqual(await ui.state(), medium);
  checks.push('Crossing the knob centre drops rim contact. Returning to the rim cannot revive that stroke.');

  await turn(ui, 4, -4, 'low'); await turn(ui, 4, -4, 'off');
  const source = (await ui.targets()).dial;
  await page.mouse.move(source.x, source.y); await page.mouse.down();
  await page.mouse.move(source.x, source.y - 45, {steps: 8}); await page.mouse.up();
  await ui.assertIdle('medium'); assert.equal((await ui.state()).log.at(-1).action, 'medium');
  await audit(page, 'Desktop burner controls');
  checks.push('Counterclockwise turns reach Off without plating, and dragging upward from the knob centre still selects Medium.');

  await page.locator('#retry').click();
  await page.locator('#scenario').selectOption('hot-pan'); await ui.assertIdle('high');
  await retraceStop(ui, 'high', 1);
  checks.push('Retracing turns beyond both Off and High restores the starting detent. The four-setting preview highlights the candidate and clears when the gesture ends.');
  await turn(ui, 4, -4, 'medium'); await turn(ui, 8, -8, 'off'); await turn(ui, 14, 8, 'medium');
  assert.equal((await ui.state()).values.seconds, 30); assert.equal((await ui.state()).values.brown, 2);
  await page.locator('[data-action="advance"]').click(); await page.locator('[data-action="plate"]').click();
  const done = await ui.state(); assert.equal(done.done, true); assert.equal(done.values.seconds, 60);
  await mouseHold(ui, 0, arc(4), true); await page.mouse.up(); assert.deepEqual(await ui.state(), done);
  await page.locator('input[name="reason"][value="0"]').check(); await page.locator('#submit').click();
  await page.locator('#replayPanel > summary').click();
  const submitted = await ui.state();
  for (const [index, setting] of [[0, 'high'], [2, 'off'], [3, 'medium']]) {
    await page.locator('#replayStep').fill(String(index)); await page.locator('#replayStep').dispatchEvent('input');
    await ui.assertIdle(setting);
  }
  await mouseHold(ui, 0, arc(4), true); await page.mouse.up(); assert.deepEqual(await ui.state(), submitted);
  await page.locator('#returnLatest').click();
  checks.push('The hot-pan challenge can pause and resume at unchanged time and browning. Replay shows the historical setting and keeps finished evidence read-only.');
  await page.close();

  const phone = await open(url, {viewport:{width: 390,height: 844}, isMobile: true, hasTouch: true});
  const points = await phone.targets(), cdp = await phone.page.context().newCDPSession(phone.page);
  const beforeTouch = await phone.state(), scroll = await phone.page.evaluate(() => scrollY);
  async function touch(type, point) {
    await cdp.send('Input.dispatchTouchEvent', {type, touchPoints:point ? [{...point, id:1, radiusX:3, radiusY:3, force:1}] : []});
  }
  await touch('touchStart', rim(points, 12));
  for (const step of arc(4)) await touch('touchMove', rim(points, 12 + step));
  assert.equal(await phone.canvas.getAttribute('data-dial-preview'), 'low'); assert.deepEqual(await phone.state(), beforeTouch);
  await phone.page.screenshot({path: path.join(out, 'phone-rim-preview.png')});
  await touch('touchEnd'); await phone.assertIdle('low');
  assert.equal(await phone.page.evaluate(() => scrollY), scroll);
  await phone.page.setViewportSize({width:320,height:844}); await phone.page.locator('#viewToggle').click();
  const offButton = phone.page.locator('[data-action="off"]'); await offButton.focus(); await phone.page.keyboard.press('Enter');
  const text = await phone.state(); assert.equal(text.values.heat, null); assert.equal(text.done, false); assert.deepEqual(text.log.map(entry => entry.action), ['low', 'off']);
  assert.ok(await phone.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await audit(phone.page, '320px keyboard burner controls');
  checks.push('Native phone touch commits once without scrolling. The text-view Off button supports keyboard operation at 320px.');
  await phone.page.close(); assert.deepEqual(errors, []);
}

let failure;
main().catch(error => {failure = error; console.error(error); process.exitCode = 1;}).finally(async () => {
  if (browser) await browser.close();
  if (preview) preview.kill();
  const report = {pass: !failure, checks, accessibility, errors, ...(failure ? {failure: failure.stack} : {})};
  fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
