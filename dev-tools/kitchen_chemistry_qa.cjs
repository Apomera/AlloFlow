/* Optional chemistry comparisons remain separate from scored cooking evidence. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.KITCHEN_CHEMISTRY_QA_OUT || path.join(root, 'reports/kitchen-chemistry'));
const studioKey = 'alloflow-kitchen-studio-v1';
const recipeKey = 'alloflow-kitchen-recipes-v1';
const benchKey = 'alloflow-kitchen-sauce-science-v1';
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
  const panel = page.locator('#kitchenChemistry');
  const disclosure = panel.locator(':scope > details');
  const pick = part => panel.locator('[data-chem-' + part + ']');
  async function expand() {
    if (!(await disclosure.evaluate(el => el.open))) await disclosure.locator(':scope > summary').click();
  }
  async function choose(topic) { await pick('topic').selectOption(topic); }
  async function compare(topic, prediction = '0') {
    await expand(); await choose(topic); await pick('predict').selectOption(prediction); await pick('compare').click();
    assert.equal(await pick('result').isVisible(), true, topic + ' comparison shown');
  }
  return { panel, disclosure, pick, expand, choose, compare };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/';
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { checks: [], accessibility: [], screenshots: [], errors: [] };
  let page;
  async function open(file, options = {}) {
    const p = await browser.newPage(Object.assign({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' }, options));
    p.setDefaultTimeout(20000); p.on('pageerror', error => result.errors.push(error.message));
    await p.goto(base + file); await p.locator('#kitchenChemistry [data-chem-topic]').waitFor({ state: 'attached' }); return p;
  }
  const saved = (p, key = studioKey) => p.evaluate(key => localStorage.getItem(key), key);
  async function shot(p, name) {
    await p.locator('#kitchenChemistry').screenshot({ path: path.join(out, name + '.png'), style: '.taskbar{visibility:hidden!important}' });
    result.screenshots.push(name + '.png');
  }
  async function audit(p, label) {
    await p.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    result.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility');
  }
  async function exported(p) {
    const downloading = p.waitForEvent('download'); await p.locator('#export').click();
    const download = await downloading, value = JSON.parse(fs.readFileSync(await download.path(), 'utf8')); delete value.exportedAt; return value;
  }
  try {
    page = await open('index.html'); const ui = controls(page), initial = await saved(page), evidence = await exported(page);
    assert.equal(await ui.disclosure.evaluate(el => el.open), false, 'Chemistry starts optional and closed');
    await ui.disclosure.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    assert.equal(await ui.pick('result').isVisible(), false); assert.equal(await ui.pick('compare').isDisabled(), true);
    await ui.pick('predict').selectOption('0'); await ui.pick('compare').focus(); await page.keyboard.press('Enter');
    assert.equal(await ui.pick('result').isVisible(), true);
    await ui.pick('molecular').locator(':scope > summary').click();
    assert.ok((await ui.pick('molecular').innerText()).length > 100);
    const links = await ui.pick('result').locator('a[href^="https://"]').evaluateAll(nodes => nodes.map(n => n.href));
    assert.ok(links.length > 0, 'Science explanation names its sources');
    assert.equal(await saved(page), initial); assert.deepEqual(await exported(page), evidence);
    result.checks.push('Optional keyboard-accessible prediction and explanation leave the current kitchen and exported evidence unchanged.');

    await ui.choose('salt-boiling');
    assert.match(await ui.pick('boiling').innerText(), /100\.18/);
    for (const [grams, expected] of [['0', '100.00'], ['20', '100.35'], ['10', '100.18']]) {
      await ui.pick('salt').fill(grams); await ui.pick('salt').dispatchEvent('input'); assert.ok((await ui.pick('boiling').innerText()).includes(expected));
      assert.equal(await ui.panel.locator('.chem-ion:visible').count(), grams === '0' ? 0 : 6, 'Dissolved ions are absent only when no salt is added');
    }
    const boilingBefore = await ui.pick('boiling').innerText(); await ui.pick('bubbles').click();
    assert.equal(await ui.pick('bubble-note').isVisible(), true); assert.match(await ui.pick('bubble-note').innerText(), /bubble|nucleat/i);
    assert.equal(await ui.pick('boiling').innerText(), boilingBefore, 'Bubbles do not masquerade as extra heat');
    assert.equal(await saved(page), initial); await shot(page, 'salt-and-bubbles');
    result.checks.push('The salt comparison shows a small boiling-point increase; the separate bubble explanation changes neither temperature nor cooking evidence.');

    for (const topic of ['browning', 'starch', 'emulsion']) {
      await ui.compare(topic, '1'); await ui.pick('molecular').locator(':scope > summary').click();
      assert.ok((await ui.pick('result').innerText()).length > 150); assert.ok(await ui.pick('result').locator('a[href^="https://"]').count());
    }
    await ui.choose('browning'); assert.equal(await ui.pick('predict').inputValue(), '1'); assert.equal(await ui.pick('result').isVisible(), true);
    await ui.pick('reset').click(); assert.equal(await ui.pick('predict').inputValue(), ''); assert.equal(await ui.pick('result').isVisible(), false);
    await ui.choose('starch'); assert.equal(await ui.pick('predict').inputValue(), '1'); assert.equal(await ui.pick('result').isVisible(), true);
    assert.equal(await saved(page), initial); await shot(page, 'starch-explanation'); await audit(page, 'Desktop chemistry comparison');
    result.checks.push('All four sourced topics reveal explanations and molecular views; resetting one topic preserves the other predictions.');

    await page.locator('#mode').selectOption('demonstrate');
    assert.equal(await ui.pick('result').isVisible(), false, 'Demonstrate mode hides explanations already opened in Practice');
    assert.equal(await ui.pick('predict').isVisible(), false, 'Prediction controls are unavailable during the unsubmitted demonstration');
    for (const action of ['wash', 'board', 'prepare']) await page.locator('[data-action="' + action + '"]').click();
    await page.locator('input[name=reason][value="1"]').check(); await page.locator('#submit').click();
    await ui.expand(); await ui.compare('browning', '2'); const submitted = await saved(page);
    await ui.pick('molecular').locator(':scope > summary').click(); assert.equal(await saved(page), submitted);
    await page.locator('#replayPanel>summary').click(); await page.locator('#replayStep').fill('0'); await page.locator('#replayStep').dispatchEvent('input');
    const replay = await saved(page); await ui.compare('emulsion', '0'); assert.equal(await saved(page), replay);
    result.checks.push('Unsubmitted demonstrations hide chemistry help; submitted attempts and historical replay can explore without changing their evidence.');
    await page.close();

    page = await open('recipe_lab.html'); const recipe = controls(page), recipeBefore = await saved(page, recipeKey);
    await recipe.compare('emulsion', '0'); assert.equal(await saved(page, recipeKey), recipeBefore);
    await recipe.disclosure.locator(':scope > summary').click(); await page.locator('#play').click();
    assert.equal(await page.locator('#play').innerText(), 'Pause kitchen'); await recipe.expand();
    await page.waitForFunction(() => document.querySelector('#play').textContent === 'Run kitchen');
    const pausedRecipe = await saved(page, recipeKey); await page.waitForTimeout(1100);
    assert.equal(await saved(page, recipeKey), pausedRecipe, 'Reading chemistry pauses the cooking clock');
    await page.locator('#play').click(); await page.locator('[data-open-chemistry]').first().click();
    await page.waitForFunction(() => document.querySelector('#play').textContent === 'Run kitchen');
    await page.locator('#play').click(); await recipe.pick('topic').focus();
    await page.waitForFunction(() => document.querySelector('#play').textContent === 'Run kitchen');
    // Running the clock may record a step before pause, which correctly locks
    // the attempt's mode. Start fresh before choosing a demonstration.
    await page.locator('#newCook').click(); await page.locator('#learningMode').selectOption('demonstrate');
    assert.equal(await recipe.pick('result').isVisible(), false); assert.equal(await recipe.pick('predict').isVisible(), false);
    const recipeLocked = await saved(page, recipeKey); await recipe.expand(); assert.equal(await saved(page, recipeKey), recipeLocked);
    await page.close();
    const R = require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
    page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => result.errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('alloflow-kitchen-recipes-v1', JSON.stringify(value)), { version: 1, current: R.start('mushroom', 2, 'demonstrate'), history: [], textView: false });
    let releaseCamera; const cameraGate = new Promise(resolve => { releaseCamera = resolve; });
    await page.route('**/OrbitControls.js', async route => { await cameraGate; await route.continue().catch(() => {}); });
    await page.goto(base + 'recipe_lab.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#kitchenChemistry[data-chem-locked="true"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#recipeScene canvas').count(), 0);
    await page.locator('#kitchenChemistry > details > summary').click();
    assert.equal(await page.locator('#kitchenChemistry [data-chem-locked]').isVisible(), true);
    assert.equal(await page.locator('[data-chem-body]').isVisible(), false);
    releaseCamera(); await page.waitForFunction(() => document.querySelector('#recipeTitle').textContent.length > 0);
    assert.equal(await page.locator('#kitchenChemistry').getAttribute('data-chem-locked'), 'true'); await page.close();
    page = await open('recipe_lab_investigation.html'); const bench = controls(page);
    await page.locator('#benchPrediction').selectOption('unsure'); await page.locator('#benchRun').click();
    const benchBefore = await saved(page, benchKey); await bench.compare('starch', '0'); assert.equal(await saved(page, benchKey), benchBefore);
    await audit(page, 'Sauce investigation chemistry');
    for (const [focus, wait] of [['starch', '0'], ['emulsion', '120']]) {
      await bench.compare(focus, '0'); await page.locator('[data-chem-experiment="' + focus + '"]').click();
      await page.waitForURL('**/recipe_lab_investigation.html?focus=' + focus + '#benchPlan');
      assert.equal(await page.locator('#benchWait').inputValue(), wait);
      assert.equal(await page.locator('#benchPrediction').inputValue(), '');
      assert.equal(await page.locator('#benchResults').isVisible(), false);
      assert.equal(await saved(page, benchKey), benchBefore, 'Lesson entry does not replace saved comparisons');
    }
    await page.close();
    result.checks.push('Recipe and sauce-investigation integrations preserve their cooking records; opening or returning to chemistry pauses cooking, and recipe demonstrations withhold explanations even before camera startup.');

    page = await open('index.html', { viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true }); const phone = controls(page);
    await page.locator('#viewToggle').click(); const phoneBefore = await saved(page);
    await phone.compare('salt-boiling', '2'); await phone.pick('molecular').locator(':scope > summary').tap();
    await phone.pick('salt').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    assert.equal(await phone.pick('salt').inputValue(), '1');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '320px page has no horizontal overflow');
    assert.equal(await saved(page), phoneBefore); await shot(page, 'chemistry-mobile'); await audit(page, '320px text-view chemistry');
    result.checks.push('Touch and keyboard exploration work in text view at320px without horizontal overflow or evidence changes.');
    assert.deepEqual(result.errors, []); result.pass = true;
  } catch (error) {
    result.failure = error.stack || error.message;
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
