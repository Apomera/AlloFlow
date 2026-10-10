const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const result = { started: new Date().toISOString(), fixture: 'Installed Chrome, actual React host and canonical ATC source. All aircraft, command, exercise, airport-choice, and debrief checks use real product controls. Completion is a real six-second separation exercise.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; try { const detail = await run(); result.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); } catch (e) { result.checks.push({ name, pass: false, error: e.stack }); console.error('FAIL ' + name + ': ' + e.message); } }
async function makePage(width = 1440, options = {}) { const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options }); page.setDefaultTimeout(30000); page.on('pageerror', e => result.errors.push(e.message)); page.on('dialog', async d => { result.errors.push('Unexpected native dialog: ' + d.message()); await d.dismiss(); }); await page.goto(fixture.url); await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).waitFor(); return page; }
async function capture(page, name, target = null) { const file = path.join(process.env.ATC_QA_ARTIFACT_DIR || __dirname, name + '.png'); if (target) await target.screenshot({ path: file }); else await page.screenshot({ path: file, fullPage: true }); result.screenshots.push(file); }
async function fit(page) { const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, zoom: getComputedStyle(document.documentElement).zoom })); assert.ok(dimensions.document <= dimensions.width + 1, JSON.stringify(dimensions)); return dimensions; }
async function axe(page) { if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ url: new URL('axe.js', fixture.url).href }); const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))); assert.deepEqual(violations, []); }
async function box(locator) { return locator.evaluate(el => { const rect = el.getBoundingClientRect(); return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height }; }); }
async function start(page, id = 'crossing_priority') { await page.locator('#stem-atctower-tab-practice').click(); await page.locator('[data-atctower-practice-start="' + id + '"]').click(); await page.locator('[data-atctower-playing]').waitFor(); }
async function command(page, key) { await page.locator('[data-atctower-command="' + key + '"]').click(); }
async function state(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcGameRef.current))); }
async function minimumHeight(locator, height = 44) { const sizes = await locator.evaluateAll(nodes => nodes.map(el => ({ text: el.textContent.trim(), height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width }))); assert.ok(sizes.length); assert.ok(sizes.every(s => s.height >= height), JSON.stringify(sizes)); return sizes; }
async function complete(page) { await start(page, 'separation_recovery'); await command(page, 'u'); await command(page, 'pause'); await page.locator('[data-atctower-exercise][data-exercise-status="complete"]').waitFor(); const actual = await state(page); assert.ok(actual.practice.completed && actual.time >= 6 && actual.conflictEpisodes === 0); await page.locator('[data-atctower-save-debrief]').click(); await page.locator('[data-atctower-debrief]').waitFor(); return { time: actual.time, verticalGap: Math.abs(actual.aircraft[0].altitude - actual.aircraft[1].altitude) }; }
async function checks() {
  for (const width of [1440, 390, 320]) {
    await check('Welcome airport diagrams, visual hierarchy, and touch targets at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        const choices = page.locator('[data-atctower-airport-choice]'); assert.equal(await choices.count(), 4); assert.equal(await choices.locator('svg').count(), 4);
        assert.equal(await choices.filter({ has: page.locator('svg:not([aria-hidden="true"])') }).count(), 0);
        assert.equal(await page.locator('[data-atctower-airport-choice][aria-pressed="true"]').count(), 1);
        const touch = await minimumHeight(choices); await fit(page); await axe(page); await capture(page, 'after-welcome-' + width);
        return { dimensions: await fit(page), airportChoiceTouchTargets: touch };
      } finally { await page.close(); }
    });
    await check('Airport selection updates the visual airport summary without starting traffic at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        const choices = page.locator('[data-atctower-airport-choice]'), configurations = [];
        for (let i = 0; i < 4; i++) {
          const choice = choices.nth(i), id = await choice.getAttribute('data-atctower-airport-choice'); await choice.click(); assert.equal(await choice.getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('[data-atctower-airport-choice][aria-pressed="true"]').count(), 1); assert.equal(await page.locator('[data-atctower-playing]').count(), 0);
          const diagram = await page.evaluate(() => [...document.querySelectorAll('[data-atctower-airport-diagram]')].filter(el => !el.closest('[data-atctower-airport-choice]')).map(el => ({ id: el.getAttribute('data-atctower-airport-diagram'), runwayCount: el.querySelectorAll('[data-atctower-runway-symbol]').length, labels: [...el.querySelectorAll('text')].map(n => n.textContent), hidden: el.getAttribute('aria-hidden') })));
          assert.equal(diagram.length, 1); assert.equal(diagram[0].id, id); assert.equal(diagram[0].runwayCount, { simple: 1, parallel: 2, crossing: 2, busy: 4 }[id]); assert.equal(diagram[0].hidden, 'true'); assert.equal(await choice.locator('[data-atctower-runway-symbol]').count(), diagram[0].runwayCount); await fit(page); configurations.push({ id, text: await choice.innerText(), diagram: diagram[0] });
        }
        assert.match(await page.locator('#atc-shift-launch-description').innerText(), /Hare/); await axe(page); await capture(page, 'after-selected-expert-' + width);
        await page.getByRole('button', { name: 'Start Tower Shift', exact: true }).click(); await page.locator('[data-atctower-playing]').waitFor(); const actual = await state(page); assert.match(actual.airport.name, /Hare/); assert.equal(actual.trainingMode, 'standard');
        return { configurations, actualAirport: actual.airport.name };
      } finally { await page.close(); }
    });
    await check('Practice skill illustrations and preview disclosures fit accessibly at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        await page.locator('#stem-atctower-tab-practice').click(); const cards = page.locator('[data-atctower-pathway-card]'); assert.equal(await cards.count(), 4); assert.equal(await cards.locator('svg').count(), 4); assert.equal(await cards.locator('svg:not([aria-hidden="true"])').count(), 0);
        await fit(page); await axe(page); await capture(page, 'after-pathway-' + width);
        const preview = page.locator('[data-atctower-practice-preview="crossing_priority"]'); await preview.locator('summary').click(); assert.notEqual(await preview.getAttribute('open'), null); assert.match(await preview.innerText(), /MED101/); await fit(page); await axe(page); await capture(page, 'after-pathway-preview-' + width);
        return { dimensions: await fit(page), previewContainsActualPriorityAircraft: true };
      } finally { await page.close(); }
    });
    await check('Playing radar, flight controls, and operations have clear responsive geometry at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        await start(page); const radar = await box(page.locator('canvas')); const controls = await box(page.locator('#atc-aircraft-controls-title')); const strips = await box(page.locator('#atc-flight-strips-title')); const watch = await box(page.locator('#atc-watch-title')); const runway = await box(page.locator('#atc-runway-title')); const operations = await box(page.locator('.atc-operations-panel'));
        if (width < 500) { assert.ok(radar.y < 950, JSON.stringify(radar)); assert.ok(strips.y > radar.y + radar.height); assert.ok(controls.y > strips.y); assert.ok(watch.y > controls.y); assert.ok(runway.y > watch.y); }
        else {
          const scopePanel = await box(page.locator('.atc-radar-panel'));
          assert.ok(operations.y >= scopePanel.y + scopePanel.height - 2);
          assert.ok(Math.abs(operations.x - scopePanel.x) < 2);
          assert.ok(Math.abs(operations.width - scopePanel.width) < 2);
          assert.ok(runway.y > watch.y); assert.ok(controls.x > operations.x + operations.width);
          const dimensions = await fit(page);
          const motion = await page.locator('.atc-flight-lab').evaluate(node => ({ box: Object.assign(node.getBoundingClientRect().toJSON(), { y: node.getBoundingClientRect().y + scrollY }), row: getComputedStyle(node).gridRow, column: getComputedStyle(node).gridColumn, readouts: node.querySelector('.atc-flight-readouts') && getComputedStyle(node.querySelector('.atc-flight-readouts')).gridTemplateColumns, draft: node.querySelector('.atc-flight-readouts')?.dataset.draft }));
          await capture(page, 'after-desktop-layout-probe');
          assert.ok(dimensions.height < 2350, 'The desktop console should avoid the previous 2539px document height: ' + JSON.stringify({ dimensions, scopePanel, operations, controls, motion }));
        }
        const touch = await minimumHeight(page.locator('[data-atctower-command]')); assert.equal(await page.locator('[data-atctower-aircraft][aria-pressed="true"]').count(), 1); assert.match(await page.locator('[data-atctower-aircraft="101"]').innerText(), /6,000 ft/); assert.match(await page.locator('[data-atctower-aircraft="101"]').innerText(), /140 kt/);
        await fit(page); await axe(page); await page.evaluate(() => scrollTo(0, 0)); await capture(page, 'after-playing-' + width); await capture(page, 'after-controls-' + width, page.locator('#atc-aircraft-controls-title').locator('..').locator('..'));
        return { dimensions: await fit(page), radar, strips, controls, watch, runway, operations, touchTargets: touch };
      } finally { await page.close(); }
    });
    await check('A real completed debrief presents reflection and evidence in a responsive workspace at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        const completion = await complete(page); const reflection = await box(page.locator('[data-atctower-reflection-card]')), evidence = await box(page.locator('[data-atctower-evidence-events]').locator('..'));
        assert.ok(evidence.y >= reflection.y, JSON.stringify({ reflection, evidence }));
        if (width >= 1000) assert.ok(evidence.x > reflection.x + reflection.width, JSON.stringify({ reflection, evidence })); else assert.ok(evidence.y > reflection.y + reflection.height, JSON.stringify({ reflection, evidence }));
        await page.locator('[data-atctower-reflection-card] textarea').fill('I used the actual altitude gap to check my plan.');
        assert.match(await page.locator('[data-atctower-evidence-events]').innerText(), /maintain 6000 feet/); await fit(page); await axe(page); await page.evaluate(() => scrollTo(0, 0)); await capture(page, 'after-completed-debrief-' + width);
        return { completion, reflection, evidence, dimensions: await fit(page) };
      } finally { await page.close(); }
    });
  }
  await check('Airport artwork and keyboard selection retain visible focus and correct selected state', async () => {
    const page = await makePage(390);
    try {
      const choice = page.locator('[data-atctower-airport-choice]').nth(2); await choice.focus(); await choice.press('Enter'); assert.equal(await choice.getAttribute('aria-pressed'), 'true');
      const focus = await choice.evaluate(el => ({ focused: document.activeElement === el, outlineStyle: getComputedStyle(el).outlineStyle, outlineWidth: getComputedStyle(el).outlineWidth })); assert.ok(focus.focused); assert.notEqual(focus.outlineStyle, 'none'); assert.ok(parseFloat(focus.outlineWidth) >= 2);
      await page.locator('#stem-atctower-tab-practice').click(); const summary = page.locator('[data-atctower-practice-preview="arrival_sequence"] summary'); await summary.focus(); await summary.press('Space'); assert.notEqual(await summary.locator('..').getAttribute('open'), null); await summary.press('Enter'); assert.equal(await summary.locator('..').getAttribute('open'), null); await capture(page, 'after-keyboard-focus-390');
      return focus;
    } finally { await page.close(); }
  });
  await check('Command entry keeps readable previews, cancel behavior, and keyboard focus within the visual layout', async () => {
    const page = await makePage(320);
    try {
      await start(page); const before = await state(page); await command(page, 'h'); const entry = page.locator('[data-atctower-command-entry="heading"]'); await entry.waitFor(); assert.match(await entry.innerText(), /Heading|heading/); assert.equal(await page.locator('#atc-command-value').evaluate(el => document.activeElement === el), true); await fit(page); await axe(page); await capture(page, 'after-heading-entry-320'); const lockedList = page.locator('.atc-aircraft-list[role="region"]'); await lockedList.focus(); await lockedList.press('End'); await page.waitForTimeout(150); const scrolling = await lockedList.evaluate(el => ({ focused:document.activeElement === el, scroll:el.scrollTop, height:el.clientHeight, totalHeight:el.scrollHeight, outline: getComputedStyle(el).outlineStyle })); assert.ok(scrolling.focused); assert.equal(scrolling.outline, 'solid'); assert.ok(scrolling.totalHeight <= scrolling.height || scrolling.scroll > 0, JSON.stringify(scrolling)); await page.locator('#atc-command-value').press('Escape'); assert.equal(await entry.count(), 0); const after = await state(page); assert.equal(after.paused, true); assert.equal(after.aircraft[0].targetHeading, before.aircraft[0].targetHeading); return { dimensions: await fit(page), lockedStripScrolling: scrolling, canceledWithoutChangingUserPause: true, canceledWithoutChangingInstruction: true };
    } finally { await page.close(); }
  });
  await check('Default controls have distinct boundaries and the custom high-contrast console uses black and yellow', async () => {
    const page = await makePage();
    try {
      await start(page);
      const contrast = await page.locator('.atc-aircraft-list button, .atc-command-grid button').evaluateAll(nodes => {
        function luminance(rgb) { return rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0); }
        return nodes.map(el => { const style = getComputedStyle(el), border = luminance(style.borderTopColor), surface = luminance(style.backgroundColor); return { label: el.textContent.trim(), ratio: (Math.max(border,surface) + .05) / (Math.min(border,surface) + .05) }; });
      });
      assert.ok(contrast.length); assert.ok(contrast.every(item => item.ratio >= 3), JSON.stringify(contrast));
      await page.locator('[data-atctower-display-settings] summary').click(); await page.getByRole('button', { name: 'High contrast', exact: true }).click();
      const surfaces = await page.locator('.atc-aircraft-list button, .atc-command-grid button, .atc-stat, .atc-readback-head, .atc-local-coaching').evaluateAll(nodes => nodes.map(el => { const s=getComputedStyle(el); return { background:s.backgroundColor, border:s.borderTopColor, label:el.textContent.trim() }; }));
      assert.ok(surfaces.every(item => item.background === 'rgb(0, 0, 0)'), JSON.stringify(surfaces));
      const selected = await page.locator('.atc-aircraft-list button[aria-pressed="true"]').evaluate(el => ({ outline:getComputedStyle(el).outlineStyle, width:parseFloat(getComputedStyle(el).outlineWidth) })); assert.equal(selected.outline, 'solid'); assert.ok(selected.width >= 2);
      await axe(page); await capture(page, 'after-custom-high-contrast-1440'); return { contrast, selected, customSurfaces: surfaces.length };
    } finally { await page.close(); }
  });
  await check('Forced colors at 200 percent zoom preserve all major views and actual exercise progress', async () => {
    const page = await makePage(1280, { forcedColors: 'active' });
    try {
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await fit(page); await axe(page); await capture(page, 'after-forced-colors-welcome-200percent');
      await page.locator('#stem-atctower-tab-practice').click(); await page.locator('[data-atctower-practice-preview="crossing_priority"] summary').click(); await fit(page); await axe(page); await capture(page, 'after-forced-colors-pathway-200percent');
      await page.locator('[data-atctower-practice-start="separation_recovery"]').click(); await page.locator('[data-atctower-playing]').waitFor(); await command(page, 'u'); await fit(page); await axe(page); await capture(page, 'after-forced-colors-playing-200percent'); await command(page, 'pause'); await page.locator('[data-atctower-exercise][data-exercise-status="complete"]').waitFor(); await page.locator('[data-atctower-save-debrief]').click(); await page.locator('[data-atctower-debrief]').waitFor(); await fit(page); await axe(page); await capture(page, 'after-forced-colors-debrief-200percent');
      return { dimensions: await fit(page), forcedColors: true, completedActualExercise: true };
    } finally { await page.close(); }
  });
  await check('Reduced motion retains static diagrams and visible focus while genuine traffic still moves when resumed', async () => {
    const page = await makePage(390);
    try {
      const before = await page.locator('[data-atctower-airport-choice] svg').first().evaluate(el => ({ animation: getComputedStyle(el).animationName, transition: getComputedStyle(el).transitionDuration })); assert.equal(before.animation, 'none');
      await start(page, 'separation_recovery'); const beforeFlight = await state(page); await command(page, 'u'); await command(page, 'pause'); await page.waitForFunction(() => window.__atcGameRef.current.time >= 1); await command(page, 'pause'); const after = await state(page); assert.ok(after.time > beforeFlight.time); assert.ok(after.aircraft[0].altitude > beforeFlight.aircraft[0].altitude); await capture(page, 'after-reduced-motion-progress-390'); return { art: before, actualElapsed: after.time, actualAltitude: after.aircraft[0].altitude };
    } finally { await page.close(); }
  });
  for (const width of [1440,320]) {
    await check('Ops, lessons, and badge routes retain readable shared visual tokens at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        const views = [];
        for (const id of ['ops','lessons','badges']) { await page.locator('#stem-atctower-tab-' + id).click(); const panel = page.locator('#stem-atctower-panel-' + id); await panel.waitFor(); assert.ok((await panel.innerText()).trim().length > 30); await fit(page); await axe(page); await capture(page, 'after-' + id + '-' + width); views.push({ id, dimensions: await fit(page) }); }
        return views;
      } finally { await page.close(); }
    });
  }
}
async function main() {
  fixture = await createFixtureServer(); const source = path.join(repo, 'stem_lab/stem_tool_atctower.js'); const hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'); const initialHash = hash(); result.sourceHash = initialHash;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); await checks(); } finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); }
  result.completed = new Date().toISOString(); result.passed = result.checks.filter(c => c.pass).length; result.failed = result.checks.filter(c => !c.pass).length; result.sourceStable = initialHash === hash(); fs.writeFileSync(process.env.ATC_QA_RESULTS_PATH || path.join(__dirname, process.argv[2] ? 'targeted-browser-results.json' : 'browser-qa-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: result.passed, failed: result.failed, errors: result.errors, sourceStable: result.sourceStable })); if (!result.checks.length || result.failed || result.errors.length || !result.sourceStable) process.exitCode = 1;
}
main().catch(e => { console.error(e.stack); process.exitCode = 1; });
