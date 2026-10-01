const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const dir = __dirname;
buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], outfile: path.join(dir, 'harness.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const baseline = process.argv.includes('--before');
const results = [];
const baselineFile = path.join(dir, 'baseline-tool.js');
if (baseline) {
  fs.writeFileSync(baselineFile, execFileSync('git', ['show', 'HEAD:stem_lab/stem_tool_solarsystem.js'], { maxBuffer: 8 * 1024 * 1024 }));
  process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_solarsystem.js=' + baselineFile;
}
const probes = `const solarRender = window.StemLab._registry.solarSystem.render;
const planetNames = { mercury: 'Mercury', venus: 'Venus', earth: 'Earth', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
window.StemLab._registry.solarSystem.render = function(ctx) { return solarRender(Object.assign({}, ctx, { t: function(key, fallback) { return planetNames[key.replace('stem.solar_sys.', '')] || fallback || key; } })); };`;

function contrast(a, b) {
  const luminance = value => {
    const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

(async () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 1000, appStyles: true, layout: 'document', probes });
  await harness.start();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 1000 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    for (const [width, dark] of baseline ? [[1180, true]] : [[1180, true], [1180, false], [390, true], [320, false]]) {
      await page.setViewportSize({ width, height: 1000 });
      await harness.mount(page, { solarSystem: { tutorialDismissed: true, paused: true, isDark: dark, selectedPlanet: 'Earth', solarMissionDashboardOpen: false } }, undefined, { expectCanvas: false });
      await page.addStyleTag({ content: 'body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' });
      await page.locator('#wrap').evaluate((el, w) => { el.style.width = w + 'px'; }, width);
      const picker = page.locator('[data-solarsystem-canvas-world-picker]');
      await picker.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(dir, `${baseline ? 'before' : 'after'}-${width}-${dark ? 'dark' : 'light'}.png`) });
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: window.__events.errors, buttons: [...document.querySelectorAll('[data-solarsystem-canvas-world-picker] button')].map(b => ({ name: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })), portraits: document.querySelectorAll('[data-solarsystem-canvas-world-picker] .solar-world-thumb').length }));
      assert.equal(metrics.buttons.length, 9);
      assert.ok(metrics.scrollWidth <= width + 1, JSON.stringify(metrics));
      assert.deepEqual(metrics.errors, []);
      if (!baseline) {
        assert.equal(metrics.portraits, 9);
        assert.ok(metrics.buttons.every(b => b.height >= 44));
        for (const name of ['Mercury', 'Venus', 'Uranus']) {
          const button = picker.getByRole('button', { name: 'Select planet: ' + name, exact: true });
          await button.click();
          await page.waitForFunction(name => document.querySelector('[data-solarsystem-planet-detail="' + name + '"]'), name);
          const colors = await button.evaluate(b => ({ background: getComputedStyle(b).backgroundColor, texts: [...b.querySelectorAll('.solar-canvas-world-name,.solar-canvas-world-kind')].map(el => getComputedStyle(el).color) }));
          for (const color of colors.texts) assert.ok(contrast(color, colors.background) >= 4.5, name + ': ' + JSON.stringify(colors));
        }
        await picker.getByRole('button', { name: 'Select planet: Saturn', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('[data-solarsystem-planet-detail="Saturn"]'));
        assert.equal(await picker.getByRole('button', { name: 'Select planet: Saturn', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.locator('[data-solarsystem-planet-detail]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(dir, `after-saturn-${width}-${dark ? 'dark' : 'light'}.png`) });
        const headerColors = await page.locator('.solar-detail-name').evaluate(el => ({ foreground: getComputedStyle(el).color, background: getComputedStyle(el.closest('[data-solarsystem-planet-detail]')).backgroundColor }));
        assert.ok(contrast(headerColors.foreground, headerColors.background) >= 4.5);
        const scene = await harness.glScene(page);
        assert.ok(scene && scene.meshes > 9 && scene.renders > 0, JSON.stringify(scene));
        metrics.scene = { meshes: scene.meshes, renders: scene.renders };
        metrics.minimumPickerContrast = Math.min(...await picker.locator('button').evaluateAll(buttons => buttons.map(b => { const cs = getComputedStyle(b); return [cs.color, cs.backgroundColor]; })).then(pairs => pairs.map(([fg, bg]) => contrast(fg, bg))));
        const tabs = page.locator('[data-solarsystem-world-view-tabs] button');
        await tabs.nth(1).click();
        assert.equal(await page.locator('[data-solarsystem-overview-metrics]').count(), 0);
        await tabs.nth(2).click();
        assert.equal(await page.locator('.solar-detail-name').innerText(), 'Saturn');
        await tabs.nth(0).click();
        assert.equal(await page.locator('[data-solarsystem-overview-metrics] dt').count(), 8);
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        const outline = await picker.getByRole('button', { name: 'Select planet: Saturn', exact: true }).evaluate(b => getComputedStyle(b).outlineWidth);
        assert.ok(parseFloat(outline) >= 2, 'Selected world needs an outline in forced colors');
        metrics.forcedColorsOutline = outline;
        await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
        assert.deepEqual(await page.evaluate(() => window.__events.errors), []);
      }
      results.push({ dark, ...metrics });
      console.log('Checked ' + width + 'px ' + (dark ? 'dark' : 'light') + ' layout');
      await harness.destroy(page);
    }
    fs.writeFileSync(path.join(dir, `${baseline ? 'before' : 'after'}-metrics.json`), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.map(r => ({ width: r.width, dark: r.dark, scrollWidth: r.scrollWidth, portraits: r.portraits, errors: r.errors }))));
  } finally {
    await page.close(); await browser.close(); await harness.stop();
    if (baseline && fs.existsSync(baselineFile)) fs.unlinkSync(baselineFile);
    fs.unlinkSync(path.join(dir, 'harness.cjs'));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
