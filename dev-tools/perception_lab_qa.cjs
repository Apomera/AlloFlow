'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("qa-profile");window.__profile=pp[0];window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
  .replace('setStemLabTool: function(){}', 'setStemLabTool: function(id){window.__navigation=id;}');
(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_artstudio.js', 'stem_lab/stem_tool_optics.js', 'stem_lab/stem_tool_perception.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: shell });
    const mount = async (state, dark = false) => page.evaluate(({ state, dark }) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); document.getElementById('slot').className = dark ? 'theme-dark' : 'theme-default'; __mount('perceptionLab', dark, state || {}); }, { state, dark });
    const stage = page.locator('#perception-stage-current'), state = () => page.evaluate(() => __state.perceptionLab);
    const choose = async id => { const tab = page.locator('[data-perception-experiment="' + id + '"]'); if (await tab.isVisible()) await tab.click(); else await page.locator('#perception-experiment-picker').selectOption(id); };
    const slider = async (key, value) => page.locator('#perception-' + key).evaluate((el, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, String(value));
    const button = name => page.getByRole('button', { name, exact: true });
    const targetGeometry = () => stage.locator('[data-perception-target]').evaluateAll(nodes => nodes.map(n => ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'fill'].map(k => n.getAttribute(k))));
    const reveal = button('Reveal measurements'), remove = button('Remove surroundings');
    const modes = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire'];
    await mount({}); await stage.waitFor();
    assert.equal(await page.locator('[data-perception-experiment]').count(), 6);
    assert.equal(await page.locator('[data-perception-result]').count(), 0);
    checks.push({ firstOpen: 'static six-experiment lab with measurement reveal hidden' });
    await page.screenshot({ path: path.join(out, 'perception-lab-desktop.png'), fullPage: true });
    for (const id of modes) {
      await choose(id);
      const before = await targetGeometry();
      await page.locator('[data-perception-choice]').first().click();
      await reveal.click(); assert.equal(await page.locator('[data-perception-result]').count(), 1);
      await remove.click(); assert.equal(await stage.locator('[data-perception-context]').count(), 0);
      assert.deepEqual(await targetGeometry(), before);
      await remove.click();
      const meta = await page.evaluate(id => StemLab.PerceptionEngine.experiments.find(e => e.id === id), id);
      for (const c of meta.controls) { await slider(c.key, c.min); await slider(c.key, c.max); }
      assert(!/NaN|Infinity|undefined/.test(await stage.innerHTML()));
      if (id === 'cafeWall') assert(await stage.locator('[data-perception-guide]').evaluateAll(nodes => nodes.length === 6 && nodes.every(n => +n.getAttribute('y1') === +n.getAttribute('y2') && +n.getAttribute('y1') < 480)));
      if (id === 'necker') {
        const edges = await stage.locator('[data-perception-edge]').evaluateAll(nodes => nodes.map(n => n.outerHTML));
        await page.locator('#perception-cue').selectOption('front');
        assert.deepEqual(await stage.locator('[data-perception-edge]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), edges);
        await page.locator('#perception-cue').selectOption('back');
        assert.deepEqual(await stage.locator('[data-perception-edge]').evaluateAll(nodes => nodes.map(n => n.outerHTML)), edges);
      }
      const lightAxe = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length })));
      assert.deepEqual(lightAxe, [], id + ' light accessibility');
      await page.screenshot({ path: path.join(out, 'perception-' + id + '.png'), fullPage: true });
      checks.push({ experiment: id, prediction: true, reveal: true, contextRemovalPreservesTargets: true, sliderExtremes: true, lightAxe });
    }
    // Real native keyboard slider interaction and bounded notebook persistence.
    await choose('brightness'); await slider('contrast', 40); await page.locator('#perception-contrast').focus(); await page.keyboard.press('ArrowRight');
    assert.equal((await state()).models.brightness.contrast, 41);
    await button('Pin comparison').click(); await slider('contrast', 90);
    assert.equal((await state()).comparison.model.contrast, 41);
    assert.equal((await state()).models.brightness.contrast, 90);
    assert.equal(await page.locator('#perception-stage-reference').count(), 1);
    await page.locator('#perception-note').fill('Context changes my impression; the drawing values stay fixed.');
    await button('Save observation').click();
    const saved = await state(); assert.equal(saved.studies.length, 1); assert.equal(saved.studies[0].model.contrast, 90);
    await slider('contrast', 0); await button('Restore observation').click(); assert.equal((await state()).models.brightness.contrast, 90);
    const svgBefore = await stage.evaluate(n => n.outerHTML);
    const downloadPromise = page.waitForEvent('download'); await button('Export SVG').click(); const download = await downloadPromise;
    await download.saveAs(path.join(out, 'perception-export.svg'));
    const markup = read(path.join(out, 'perception-export.svg'));
    assert(markup.includes('viewBox="0 0 800 480"')); assert(markup.includes('Brightness &amp; context')); assert(markup.includes('RGB ' + saved.models.brightness.target)); assert(markup.includes('width="800"')); assert(markup.includes('height="480"'));
    await mount(saved); await stage.waitFor(); assert.equal((await state()).studies.length, 1); assert.equal((await state()).comparison.model.contrast, 41);
    assert.equal(await stage.locator('[data-perception-target="left"]').getAttribute('fill'), 'rgb(' + [saved.models.brightness.target, saved.models.brightness.target, saved.models.brightness.target].join(',') + ')');
    checks.push({ keyboardSlider: true, pinnedSettingsIndependent: true, saveRestoreRemount: true, standaloneSVG: download.suggestedFilename(), visibleSVGBytes: svgBefore.length });
    await button('Clear comparison').click();
    const compact = await stage.boundingBox(); await button('Expand viewing area').click(); const expanded = await stage.boundingBox();
    assert(expanded.width > compact.width + 100); assert.equal(await page.locator('.perception-controls details').getAttribute('open'), null);
    await page.screenshot({ path: path.join(out, 'perception-lab-expanded.png'), fullPage: true });
    await page.keyboard.press('Escape'); assert.equal((await state()).expanded, false);
    checks.push({ compactStage: compact, expandedStage: expanded, escapeRestoresLayout: true });
    // Animation is explicit, stops with visibility/reduced-motion, and persists the paused angle.
    await choose('moire'); await slider('angle', 5);
    const initial = await stage.locator('[data-perception-grid="overlay"]').getAttribute('transform');
    await page.waitForTimeout(180); assert.equal(await stage.locator('[data-perception-grid="overlay"]').getAttribute('transform'), initial);
    await button('Play slow rotation').click(); await page.waitForTimeout(300);
    const moving = await stage.locator('[data-perception-grid="overlay"]').getAttribute('transform'); assert.notEqual(moving, initial);
    await button('Pause rotation').click(); const paused = await stage.locator('[data-perception-grid="overlay"]').getAttribute('transform');
    await page.waitForTimeout(180); assert.equal(await stage.locator('[data-perception-grid="overlay"]').getAttribute('transform'), paused);
    await button('Play slow rotation').click(); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(120); assert.equal(await button('Play slow rotation').getAttribute('aria-pressed'), 'false');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await button('Play slow rotation').click(); await page.evaluate(() => __setProfile('second-profile'));
    assert.equal(await button('Play slow rotation').getAttribute('aria-pressed'), 'false');
    checks.push({ animationOptIn: true, exactPause: true, reducedMotionChangeStops: true, profileChangeStops: true });
    await choose('cafeWall'); await slider('offset', 75); await button('Open Art Studio').click();
    assert.equal(await page.evaluate(() => __navigation), 'artStudio'); assert.equal(await page.evaluate(() => __state.artStudio.opStyle), 'cafeWall'); assert.equal(await page.evaluate(() => __state.artStudio.opCafeOffset), 75);
    await button('Open Optics Lab').click(); assert.equal(await page.evaluate(() => __navigation), 'opticsLab');
    checks.push({ artHandoff: true, opticsNavigationRegistered: await page.evaluate(() => !!StemLab._registry[__navigation]) });
    await mount({}, true); await choose('necker'); await reveal.click(); await page.screenshot({ path: path.join(out, 'perception-lab-dark.png'), fullPage: true });
    const axe = await page.evaluate(async () => (await axe.run(document.querySelector('[data-perception-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length })));
    assert.deepEqual(axe, []); checks.push({ darkAxe: axe });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 }); await mount({});
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, stage: document.getElementById('perception-stage-current').getBoundingClientRect().width }));
      assert(dimensions.page <= width, JSON.stringify(dimensions));
      const targets = await page.locator('[data-perception-lab] button').evaluateAll(nodes => nodes.filter(n => n.offsetWidth && n.offsetHeight).map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
      assert(targets.every(t => t.width >= 44 && t.height >= 44));
      await choose('cafeWall'); await reveal.click(); await button('Expand viewing area').click();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, 'perception-lab-phone-' + width + '.png'), fullPage: true });
      checks.push({ phone: width, dimensions, targets44: true, expandedNoOverflow: true });
    }
    await page.emulateMedia({ forcedColors: 'active' });
    await page.screenshot({ path: path.join(out, 'perception-lab-forced-colors.png'), fullPage: true });
    assert.equal(await stage.evaluate(n => getComputedStyle(n).forcedColorAdjust), 'none');
    checks.push({ forcedColorsStimulusPreserved: true });
    await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 1440, height: 1000 }); await mount({});
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, 'perception-lab-large-text.png'), fullPage: true });
    checks.push({ largeText200PercentNoOverflow: true });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'perception-lab-browser-results.json'), JSON.stringify({ checks, errors, sourceSHA256: require('node:crypto').createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex') }, null, 2));
    console.log(JSON.stringify({ groups: checks.length, errors, passed: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
