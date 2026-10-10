const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const results = { started: new Date().toISOString(), fixture: 'Installed Chrome with the actual React host and canonical source. Lesson interactions use product buttons and native keyboard slider input. AI unavailability uses the fixture host with no AI connector.', checks: [], errors: [], screenshots: [] };
const topics = ['separation', 'sequencing', 'vectors', 'communication', 'weather'];
let fixture, browser;
async function check(name, action) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  try { const detail = await action(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); }
  catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function makePage(width = 1440, options = {}, initial = null) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options });
  page.setDefaultTimeout(30000); page.on('pageerror', e => results.errors.push(e.message));
  page.on('dialog', async dialog => { results.errors.push('Unexpected native dialog: ' + dialog.message()); await dialog.dismiss(); });
  if (initial) {
    await page.addInitScript(value => { window.__lessonInitial = value; }, { atcTower: initial });
    await page.route(fixture.url, async route => {
      const response = await route.fetch(), source = await response.text(), marker = "React.useState({atcTower:{view:'menu'}})";
      assert.ok(source.includes(marker));
      await route.fulfill({ response, body: source.replace(marker, "React.useState(window.__lessonInitial || {atcTower:{view:'menu'}})") });
    });
  }
  await page.goto(fixture.url); await page.locator('#stem-atctower-tab-lessons').click(); return page;
}
async function lesson(page, kind) {
  const inLesson = await page.locator('[data-atctower-lesson-view]').count();
  await page.locator(inLesson ? '[data-atctower-lesson-topic="' + kind + '"]' : '[data-atctower-lesson="' + kind + '"]').click();
  await page.locator('[data-atctower-explorer="' + kind + '"]').waitFor();
}
async function range(page, key, value) {
  const input = page.locator('[data-atctower-explorer-input="' + key + '"]');
  const bounds = await input.evaluate(el => ({ min: Number(el.min), max: Number(el.max), step: Number(el.step) }));
  assert.ok(value >= bounds.min && value <= bounds.max);
  const left = Math.round((value - bounds.min) / bounds.step), right = Math.round((bounds.max - value) / bounds.step);
  await input.focus(); await input.press(left <= right ? 'Home' : 'End');
  for (let i = 0; i < Math.min(left, right); i++) await input.press(left <= right ? 'ArrowRight' : 'ArrowLeft');
  assert.equal(Number(await input.inputValue()), value);
}
async function fit(page) { const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })); assert.ok(size.document <= size.viewport + 1, JSON.stringify(size)); return size; }
async function axe(page) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ url: new URL('axe.js', fixture.url).href });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
  assert.deepEqual(violations, []);
}
async function capture(page, name) { const file = path.join(process.env.ATC_QA_ARTIFACT_DIR || __dirname, name + '.png'); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: file, fullPage: true }); results.screenshots.push(file); }
async function metric(page, key) { return page.locator('[data-atctower-explorer-metric="' + key + '"] strong').innerText(); }
async function data(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); }
async function summary(page) { return page.locator('[data-atctower-explorer-summary]').innerText(); }
async function checks() {
  for (const width of [1440, 390, 320]) {
    await check('Visual lesson library and all five workbenches fit with accessible controls at ' + width + 'px', async () => {
      const page = await makePage(width), layouts = [];
      try {
        assert.equal(await page.locator('[data-atctower-lesson]').count(), 5); await fit(page); await axe(page); await capture(page, 'after-index-' + width);
        for (const kind of topics) {
          await lesson(page, kind); assert.equal(await page.locator('[data-atctower-lesson-topic][aria-current="page"]').count(), 1);
          const sizes = await page.locator('[data-atctower-lesson-view] button, [data-atctower-lesson-view] input').evaluateAll(nodes => nodes.map(el => ({ label: el.getAttribute('aria-label') || el.textContent || el.id, height: el.getBoundingClientRect().height })));
          assert.ok(sizes.every(item => item.height >= 44), JSON.stringify(sizes));
          assert.equal(await page.locator('[data-atctower-explorer] svg:not([aria-hidden="true"])').count(), 0);
          await axe(page); const dimensions = await fit(page); layouts.push({ kind, dimensions, controls: sizes.length }); await capture(page, 'after-' + kind + '-' + width);
          if (width < 500) {
            const positions = await page.evaluate(() => ({ explorer: document.querySelector('[data-atctower-explorer]').getBoundingClientRect().top + scrollY, reading: document.querySelector('.atc-lesson-reading').getBoundingClientRect().top + scrollY }));
            assert.ok(positions.explorer < positions.reading);
          }
        }
        return layouts;
      } finally { await page.close(); }
    });
  }
  await check('Separation responds to exact boundaries, wake category, and keyboard altitude changes', async () => {
    const page = await makePage(390);
    try {
      await lesson(page, 'separation'); assert.match(await summary(page), /Model conflict/);
      await range(page, 'horizontal', 3); assert.match(await summary(page), /maintained/);
      await page.getByRole('button', { name: 'Includes heavy / super', exact: true }).click(); assert.match(await summary(page), /Model conflict/);
      await range(page, 'vertical', 1000); assert.match(await summary(page), /maintained/); assert.equal(await metric(page, 'vertical'), '1,000 ft');
      await range(page, 'vertical', 500); await range(page, 'horizontal', 6); assert.match(await summary(page), /maintained/);
      await page.locator('[data-atctower-explorer-reset]').click(); assert.equal(await metric(page, 'horizontal'), '2.0 nm'); assert.match(await summary(page), /Model conflict/);
      return { boundariesChecked: ['3 nm', '6 nm with heavy', '1,000 ft'], resetRestoredNormalPair: await page.getByRole('button', { name: 'Light / medium', exact: true }).getAttribute('aria-pressed') };
    } finally { await page.close(); }
  });
  await check('Sequencing shows a farther arrival first, a true tie, changed order, and bounded markers', async () => {
    const page = await makePage();
    try {
      await lesson(page, 'sequencing'); assert.match(await summary(page), /Aircraft B arrives first/);
      assert.equal(await page.locator('[data-atctower-explorer-eta="A"]').innerText(), '20.0 min'); assert.equal(await page.locator('[data-atctower-explorer-eta="B"]').innerText(), '15.0 min');
      await range(page, 'speedA', 120); assert.match(await summary(page), /Both estimates are equal/);
      await range(page, 'speedA', 240); assert.match(await summary(page), /Aircraft A arrives first/);
      await range(page, 'distanceA', 60); await range(page, 'speedA', 60);
      assert.equal(await page.locator('[data-atctower-explorer-eta="A"]').innerText(), '60.0 min');
      const marks = await page.locator('.atc-explorer-point').evaluateAll(nodes => nodes.map(el => Number.parseFloat(el.style.left))); assert.ok(marks.every(x => x >= 0 && x <= 100));
      await capture(page, 'after-sequencing-changed-1440'); return { positionsPercent: marks };
    } finally { await page.close(); }
  });
  await check('Heading compass follows the short route across north and handles equal and half-turn headings', async () => {
    const page = await makePage(390);
    try {
      await lesson(page, 'vectors'); assert.equal(await metric(page, 'turn'), '20°'); assert.equal(await metric(page, 'turnTime'), '6.7 s'); assert.match(await summary(page), /right/);
      await range(page, 'current', 10); await range(page, 'target', 350); assert.match(await summary(page), /left/);
      assert.match(await page.locator('[data-atctower-explorer-vector="heading"]').getAttribute('transform'), /rotate\(350\)/);
      await range(page, 'current', 0); await range(page, 'target', 360); assert.equal(await metric(page, 'turn'), '0°'); assert.match(await summary(page), /Already/);
      await range(page, 'target', 180); assert.match(await summary(page), /Either direction/); assert.equal(await metric(page, 'turnTime'), '60.0 s');
    } finally { await page.close(); }
  });
  await check('Wind-from diagrams match headwind, crosswind, tailwind, and calm calculations', async () => {
    const page = await makePage(320);
    try {
      await lesson(page, 'weather'); await range(page, 'windFrom', 270); assert.equal(await metric(page, 'headwind'), '20.0 kt'); assert.equal(await metric(page, 'crosswind'), '0.0 kt');
      await range(page, 'windFrom', 0); assert.equal(await metric(page, 'headwind'), '0.0 kt'); assert.equal(await metric(page, 'crosswind'), '20.0 kt');
      await range(page, 'windFrom', 90); assert.match(await page.locator('[data-atctower-explorer-metric="headwind"]').innerText(), /Tailwind/);
      await range(page, 'windSpeed', 0); assert.equal(await metric(page, 'headwind'), '0.0 kt'); assert.equal(await metric(page, 'crosswind'), '0.0 kt'); assert.equal(await page.locator('[data-atctower-explorer-vector="wind"]').count(), 0); assert.match(await summary(page), /Calm/);
      await fit(page); await axe(page); await capture(page, 'after-calm-wind-320');
    } finally { await page.close(); }
  });
  await check('Readback comparison explains mismatches and clears earlier feedback when the example changes', async () => {
    const page = await makePage(390);
    try {
      await lesson(page, 'communication'); assert.equal(await page.locator('[data-atctower-readback-feedback]').count(), 0);
      for (const [sample, answer, pattern] of [['heading', 'match', /all match/], ['altitude', 'callsign', /TRAIN101 to TRAIN110/], ['runway', 'instruction', /27 to 18/]]) {
        await page.locator('[data-atctower-readback-sample="' + sample + '"]').click(); assert.equal(await page.locator('[data-atctower-readback-feedback]').count(), 0);
        await page.locator('[data-atctower-readback-response="' + (answer === 'match' ? 'callsign' : 'match') + '"]').click(); assert.equal(await page.locator('[data-atctower-readback-feedback]').getAttribute('data-atctower-readback-feedback'), 'review');
        await page.locator('[data-atctower-readback-response="' + answer + '"]').click(); assert.equal(await page.locator('[data-atctower-readback-feedback]').getAttribute('data-atctower-readback-feedback'), 'correct'); assert.match(await page.locator('[data-atctower-readback-feedback]').innerText(), pattern);
      }
      await fit(page); await axe(page); await capture(page, 'after-readback-feedback-390');
      assert.deepEqual(await page.evaluate(() => window.__atcXP), []); assert.equal((await data(page)).practiceLearning, undefined);
    } finally { await page.close(); }
  });
  await check('Each lesson retains its own example while reset changes only the current lesson', async () => {
    const page = await makePage();
    try {
      await lesson(page, 'sequencing'); await range(page, 'speedA', 240);
      await lesson(page, 'vectors'); await range(page, 'target', 180);
      await lesson(page, 'sequencing'); assert.equal(await page.locator('[data-atctower-explorer-input="speedA"]').inputValue(), '240');
      await page.locator('[data-atctower-explorer-reset]').click(); assert.equal(await page.locator('[data-atctower-explorer-input="speedA"]').inputValue(), '90');
      await lesson(page, 'vectors'); assert.equal(await page.locator('[data-atctower-explorer-input="target"]').inputValue(), '180');
      await page.getByRole('button', { name: '← Back to Tower', exact: true }).click(); assert.equal(await page.locator('[data-atctower-lesson="vectors"]').evaluate(el => document.activeElement === el), true);
      await lesson(page, 'vectors'); assert.equal(await page.locator('[data-atctower-explorer-input="target"]').inputValue(), '180');
      const saved = await data(page); assert.equal(saved.activeShift, undefined); assert.equal(saved.totalScore, undefined); assert.equal(saved.lessonExplorers, undefined);
    } finally { await page.close(); }
  });
  await check('Exploring every topic preserves a real saved shift and leaves it ready to resume', async () => {
    const original = await makePage(); let saved;
    try {
      await original.locator('#stem-atctower-tab-practice').click();
      await original.locator('[data-atctower-practice-start="first_landing"]').click();
      await original.locator('[data-atctower-playing]').waitFor();
      await original.waitForFunction(() => !!window.__atcToolData.atcTower.activeShift);
      saved = await data(original);
    } finally { await original.close(); }
    const page = await makePage(390, {}, { ...saved, view: 'menu' });
    try {
      for (const kind of topics) {
        await lesson(page, kind);
        if (kind === 'communication') await page.locator('[data-atctower-readback-response="match"]').click();
        else { const input = page.locator('[data-atctower-explorer-input]').first(); await input.focus(); await input.press('End'); }
        assert.deepEqual((await data(page)).activeShift, saved.activeShift);
        await page.locator('[data-atctower-explorer-reset]').click();
        assert.equal(await page.locator('[data-atctower-lesson-practice]').isDisabled(), kind !== 'weather');
      }
      const after = await data(page);
      assert.deepEqual(after.activeShift, saved.activeShift);
      for (const key of ['lastShift', 'totalScore', 'practiceLearning', 'lastCommittedShiftId', 'shiftHistory']) assert.deepEqual(after[key], saved[key]);
      assert.deepEqual(await page.evaluate(() => window.__atcXP), []);
      await page.getByRole('button', { name: '← Back to Tower', exact: true }).click();
      await page.locator('[data-atctower-resume]').click(); await page.locator('[data-atctower-playing]').waitFor();
      const resumed = await page.evaluate(() => window.__atcGameRef.current);
      assert.equal(resumed.practice.id, 'first_landing'); assert.equal(resumed.time, 0); assert.equal(resumed.paused, true);
      return { checkpoint: 'Captured from a real paused exercise, restored in a fresh host, explored all five topics, then resumed through the product control', practice: resumed.practice.id, time: resumed.time, paused: resumed.paused };
    } finally { await page.close(); }
  });
  await check('Keyboard navigation announces the new lesson and slider arrows stay on the active control', async () => {
    const page = await makePage(320);
    try {
      const card = page.locator('[data-atctower-lesson="separation"]'); await card.focus(); await card.press('Enter');
      assert.equal(await page.locator('[data-atctower-lesson-view]').evaluate(el => document.activeElement === el), true);
      const nav = page.locator('[data-atctower-lesson-topic="vectors"]'); await nav.focus(); await nav.press('Enter'); assert.equal(await page.locator('[data-atctower-lesson-view="vectors"]').evaluate(el => document.activeElement === el), true);
      const input = page.locator('[data-atctower-explorer-input="target"]'); await input.focus(); await input.press('ArrowRight'); assert.equal(await input.inputValue(), '20');
      const focused = await input.evaluate(el => ({ focused: document.activeElement === el, outline: getComputedStyle(el).outlineStyle, width: Number.parseFloat(getComputedStyle(el).outlineWidth) })); assert.ok(focused.focused && focused.outline === 'solid' && focused.width >= 2);
      assert.equal((await data(page)).view, 'lesson'); await capture(page, 'after-keyboard-320'); return focused;
    } finally { await page.close(); }
  });
  await check('Lesson-to-practice actions launch the actual matching paused exercise and weather opens the pathway', async () => {
    const matched = [];
    for (const [kind, practice] of [['separation','separation_recovery'], ['sequencing','arrival_sequence'], ['vectors','first_landing'], ['communication','first_landing'], ['weather',null]]) {
      const page = await makePage();
      try {
        await lesson(page, kind); await page.locator('[data-atctower-lesson-practice="' + kind + '"]').click();
        if (practice) { await page.locator('[data-atctower-playing]').waitFor(); const g = await page.evaluate(() => window.__atcGameRef.current); assert.equal(g.practice.id, practice); assert.equal(g.paused, true); assert.equal(g.time, 0); matched.push({ kind, practice }); }
        else { await page.locator('#stem-atctower-panel-practice').waitFor(); assert.equal(await page.locator('[data-atctower-playing]').count(), 0); }
      } finally { await page.close(); }
    }
    return matched;
  });
  await check('The visual workbenches remain usable when the optional AI tutor is unavailable', async () => {
    const page = await makePage(320);
    try {
      await lesson(page, 'separation'); await page.getByRole('button', { name: 'Generate AI explanation at Grade 5 level', exact: true }).click(); assert.match(await page.getByRole('alert').innerText(), /not available/);
      await range(page, 'vertical', 1000); assert.match(await summary(page), /maintained/);
      await page.getByRole('button', { name: /Reading level: Plain/ }).click(); assert.equal(await page.getByRole('alert').count(), 0);
      await fit(page); await axe(page); return { worksWithoutAI: true };
    } finally { await page.close(); }
  });
  await check('Custom high contrast follows all five topics and keeps diagrams and selected controls visible', async () => {
    const page = await makePage();
    try {
      await lesson(page, 'separation'); await page.getByRole('button', { name: 'High contrast', exact: true }).click();
      for (const kind of topics) {
        await lesson(page, kind); assert.equal(await page.locator('[data-atctower-lesson-view]').getAttribute('data-contrast'), 'true'); await axe(page); await fit(page);
        const colors = await page.locator('[data-atctower-explorer]').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color })); assert.deepEqual(colors, { background: 'rgb(0, 0, 0)', color: 'rgb(255, 255, 255)' });
      }
      await capture(page, 'after-high-contrast-weather');
    } finally { await page.close(); }
  });
  await check('Forced colors and 200 percent zoom preserve every topic without horizontal overflow', async () => {
    const page = await makePage(1280, { forcedColors: 'active' });
    try {
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await fit(page); await axe(page);
      for (const kind of topics) { await lesson(page, kind); await fit(page); await axe(page); }
      await capture(page, 'after-forced-colors-weather-200percent');
      await lesson(page, 'sequencing'); await range(page, 'speedA', 120); assert.match(await summary(page), /Both estimates are equal/); await fit(page); await capture(page, 'after-forced-colors-sequencing-200percent');
    } finally { await page.close(); }
  });
}
async function main() {
  fixture = await createFixtureServer(); const source = path.join(repo, 'stem_lab/stem_tool_atctower.js'); const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'); results.sourceHash = hash();
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); await checks(); }
  finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  results.passed = results.checks.filter(c => c.pass).length; results.failed = results.checks.filter(c => !c.pass).length; results.sourceStable = results.sourceHash === hash(); results.completed = new Date().toISOString();
  fs.writeFileSync(process.env.ATC_QA_RESULTS_PATH || path.join(__dirname, process.argv[2] ? 'targeted-browser-results.json' : 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, errors: results.errors, sourceStable: results.sourceStable }));
  if (!results.checks.length || results.failed || results.errors.length || !results.sourceStable) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
