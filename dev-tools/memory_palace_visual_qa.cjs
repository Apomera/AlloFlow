const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const sample = { main: 'The Water Cycle', branches: [
  { title: 'Sky Observatory', items: ['Evaporation', 'Condensation'], mnemonics: ['A kettle the size of a house boils a lake into golden steam.', 'A cloud knitting itself from silver wool.'] },
  { title: 'Rain Gallery', items: ['Precipitation', 'Collection'], mnemonics: ['Umbrellas raining upward.', 'A bathtub swallowing a river.'] },
  { title: 'River Studio', items: ['Runoff', 'Infiltration'], mnemonics: ['A skateboard of water racing downhill.', 'A sponge city drinking a storm.'] }
] };
(async () => {
  const output = path.join(root, 'reports', 'memory-palace-enhancement', process.argv.includes('--before') ? 'before' : 'after');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<!doctype html><html><head><style>body{margin:0;background:#080e1b;font-family:system-ui}#wrap{position:relative;width:1280px;height:800px;margin:32px auto;overflow:hidden;border-radius:20px;border:1px solid #334155}</style></head><body><div id="wrap"></div></body></html>');
    await page.addScriptTag({ path: path.join(root, 'vendor/three-r128/three.min.js') });
    await page.addScriptTag({ path: path.join(root, 'memory_palace_module.js') });
    await page.evaluate(data => {
      window.__sample = data;
      window.__mount = opts => { if (window.__handle) window.__handle.destroy(); window.__handle = window.AlloModules.MemoryPalace.render(document.getElementById('wrap'), data, opts || {}); };
      window.__mount();
    }, sample);
    await page.waitForSelector('#wrap canvas');
    await page.waitForTimeout(800);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#wrap').screenshot({ path: path.join(output, 'entrance.png') });
    if (process.argv.includes('--entry')) {
      await page.evaluate(() => { document.getElementById('wrap').style.cssText='position:relative;width:390px;height:740px;margin:0;overflow:hidden'; });
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'mobile-entrance.png')});
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('Desktop and mobile entrance previews saved.');return;
    }
    await page.evaluate(() => window.__handle.goTo(1));
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#wrap').screenshot({ path: path.join(output, 'walk.png') });
    if (!process.argv.includes('--before')) {
      await page.locator('[data-palace-action="inspect-room"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({ path: path.join(output, 'room.png') });
      await page.getByRole('button', { name: 'Return to guided route', exact: true }).click();
    }
    await page.locator('[data-palace-action="overview"]').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#wrap').screenshot({ path: path.join(output, 'overview.png') });
    if (!process.argv.includes('--before')) {
      for (const theme of ['pasture', 'space']) {
        await page.evaluate(theme => window.__mount({ theme }), theme);
        await page.waitForSelector('#wrap canvas'); await page.waitForTimeout(300);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#wrap').screenshot({ path: path.join(output, theme + '.png') });
      }
      await page.evaluate(() => { window.__mount(); document.getElementById('wrap').style.cssText = 'position:relative;width:390px;height:740px;margin:0;overflow:hidden'; });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForSelector('#wrap canvas'); await page.waitForTimeout(300);
      await page.evaluate(() => window.__handle.goTo(1));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#wrap').screenshot({ path: path.join(output, 'mobile.png') });
      await page.locator('[data-palace-action="overview"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({ path: path.join(output, 'mobile-overview.png') });
      await page.evaluate(() => window.__handle.goTo(1));
      await page.locator('[data-palace-action="inspect-room"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({ path: path.join(output, 'mobile-room.png') });
      await page.locator('[data-palace-action="turn-left"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({ path: path.join(output, 'mobile-look-left.png') });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await page.evaluate(() => window.__handle.destroy());
    console.log('Visual captures saved: ' + output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
