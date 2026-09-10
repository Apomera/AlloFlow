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
    if (process.argv.includes('--landmarks')) {
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(() => {
        document.getElementById('wrap').style.cssText='position:relative;width:390px;height:740px;margin:0;overflow:hidden';
        window.__sample.branches.push({title:'Crystal Room',items:['Storage','Return'],mnemonics:['A crystal holds a lake.','Water finds its way home.']});
      });
      for (const [stop,theme] of [[1,'gallery'],[3,'gallery'],[5,'pasture'],[7,'space']]) {
        await page.evaluate(theme => window.__mount({theme}),theme);
        await page.waitForSelector('#wrap canvas');
        await page.evaluate(stop => window.__handle.goTo(stop),stop);
        await page.locator('[data-palace-action="inspect-room"]').click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,'landmark-'+stop+'-'+theme+'.png')});
      }
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('All four landmark shapes captured across the three environments.'); return;
    }
    if (process.argv.includes('--cards')) {
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(() => { document.getElementById('wrap').style.cssText='position:relative;width:390px;height:740px;margin:0;overflow:hidden'; });
      for (const [stop,theme] of [[1,'gallery'],[2,'pasture'],[3,'space'],[4,'gallery']]) {
        await page.evaluate(theme => window.__mount({theme}),theme);
        await page.waitForSelector('#wrap canvas');
        await page.evaluate(stop => window.__handle.goTo(stop),stop);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,'numbered-card-'+stop+'-'+theme+'.png')});
      }
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('All four numbered-card compositions captured across the three environments.'); return;
    }
    if (process.argv.includes('--completion')) {
      await page.evaluate(() => window.__handle.goTo(6));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'completion-partial-desktop.png')});
      await page.setViewportSize({width:320,height:844});
      await page.evaluate(() => { document.getElementById('wrap').style.cssText='position:relative;width:320px;height:740px;margin:0;overflow:hidden'; document.documentElement.style.fontSize='24px'; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const summary = page.locator('[data-palace-overlay="completion"]');
      const bounds = await summary.boundingBox();
      const dock = await page.locator('[data-palace-overlay="dock"]').boundingBox();
      if(bounds.y < 0 || bounds.y + bounds.height > dock.y) throw new Error('Completion panel does not fit');
      await page.locator('#wrap').screenshot({path:path.join(output,'completion-partial-mobile.png')});
      await page.locator('[data-palace-action="visit-remaining"]').click();
      await page.evaluate(() => { for(let n=1;n<=6;n++) window.__handle.goTo(n); });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'completion-full-mobile.png')});
      await summary.getByRole('button',{name:'Dismiss completion message',exact:true}).click();
      if(await summary.isVisible()) throw new Error('Completion dismiss failed');
      if(!await page.locator('[data-palace-overlay="focus"]').isVisible()) throw new Error('Final cue was not restored');
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('Completion previews saved; partial/full routes and narrow-screen actions verified.'); return;
    }
    if (process.argv.includes('--explore')) {
      await page.setViewportSize({width:320,height:844});
      await page.evaluate(() => { document.getElementById('wrap').style.cssText='position:relative;width:320px;height:740px;margin:0;overflow:hidden'; document.documentElement.style.fontSize='24px'; window.__handle.goTo(1); });
      await page.locator('[data-palace-action="inspect-room"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const panel = page.locator('[data-palace-overlay="free-nav"]');
      const bounds = await panel.boundingBox();
      const dock = await page.locator('[data-palace-overlay="dock"]').boundingBox();
      if (bounds.y < 0 || bounds.y + bounds.height > dock.y) throw new Error('Exploration panel overlaps dock');
      for (const control of await panel.locator('button:visible').all()) {
        const rect = await control.boundingBox();
        if(rect.width < 44 || rect.height < 44 || rect.x < bounds.x || rect.x + rect.width > bounds.x + bounds.width + 1) throw new Error('Exploration control does not fit');
      }
      await page.locator('#wrap').screenshot({path:path.join(output,'exploration-large-text-320.png')});
      await page.getByRole('button',{name:'Return to guided route',exact:true}).click();
      if(!await page.locator('[data-palace-overlay="focus"]').isVisible()) throw new Error('Resume did not restore study card');
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('Narrow enlarged-text exploration controls fit and resume the guided stop.'); return;
    }
    if (process.argv.includes('--dock')) {
      await page.evaluate(() => window.__handle.goTo(1));
      for (const width of [390, 320]) {
        await page.setViewportSize({width,height:844});
        await page.evaluate(width => { document.getElementById('wrap').style.cssText='position:relative;width:'+width+'px;height:740px;margin:0;overflow:hidden'; document.documentElement.style.fontSize='24px'; }, width);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const dock = page.locator('[data-palace-overlay="dock"]');
        const bounds = await dock.boundingBox();
        for (const control of await dock.locator('button:visible').all()) {
          const rect = await control.boundingBox();
          if (rect.width < 44 || rect.height < 44 || rect.x < bounds.x || rect.x + rect.width > bounds.x + bounds.width + 1) throw new Error('Dock control does not fit at '+width);
        }
        const minus = await page.locator('[data-palace-action="zoom-out"]').boundingBox();
        const plus = await page.locator('[data-palace-action="zoom-in"]').boundingBox();
        if (Math.abs(minus.y-plus.y)>1) throw new Error('Zoom buttons separated at '+width);
        await page.locator('#wrap').screenshot({path:path.join(output,'dock-large-text-'+width+'.png')});
      }
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('Enlarged-text dock previews saved; controls fit at 390 and 320 pixels.'); return;
    }
    if (process.argv.includes('--journey')) {
      await page.evaluate(() => { window.__handle.goTo(1); window.__handle.goTo(3); });
      await page.locator('[data-palace-action="overview"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'journey-progress-desktop.png')});
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(() => { document.getElementById('wrap').style.cssText='position:relative;width:390px;height:740px;margin:0;overflow:hidden'; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'journey-progress-mobile.png')});
      await page.evaluate(() => { document.documentElement.style.fontSize='24px'; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'journey-progress-large-text.png')});
      await page.locator('[data-journey-index="6"]').click();
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('Journey progress previews saved; final stop remains reachable with enlarged text.'); return;
    }
    if (process.argv.includes('--cues')) {
      await page.setViewportSize({width:390,height:844});
      await page.evaluate(() => {
        document.getElementById('wrap').style.cssText='position:relative;width:390px;height:740px;margin:0;overflow:hidden';
        window.__sample.branches[0].mnemonics[0] = 'A kettle as tall as a house lifts a lake into golden steam. Hear its whistle, feel the warmth, and connect this scene to the frame beside the doorway. '.repeat(8);
        window.__mount();
      });
      await page.waitForSelector('#wrap canvas');
      await page.evaluate(() => window.__handle.goTo(1));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'mobile-cue-collapsed.png')});
      await page.locator('[data-palace-action="expand-cue"]').click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'mobile-cue-expanded.png')});
      await page.evaluate(() => { document.documentElement.style.fontSize='24px'; });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator('#wrap').screenshot({path:path.join(output,'mobile-cue-large-text.png')});
      const cueToggle = page.locator('[data-palace-action="expand-cue"]');
      await cueToggle.scrollIntoViewIfNeeded();
      await page.locator('#wrap').screenshot({path:path.join(output,'mobile-cue-large-text-end.png')});
      await cueToggle.click();
      if (await cueToggle.getAttribute('aria-expanded') !== 'false') throw new Error('Enlarged cue could not be collapsed');
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('Collapsed, expanded, and enlarged-text cue previews saved.'); return;
    }
    if (process.argv.includes('--gateways')) {
      for (const theme of ['gallery', 'pasture', 'space']) {
        await page.evaluate(theme => window.__mount({theme}), theme);
        await page.waitForSelector('#wrap canvas');
        await page.evaluate(() => window.__handle.goTo(1));
        await page.locator('[data-palace-action="inspect-room"]').click();
        for (let step=0;step<7;step++) await page.locator('[data-palace-action="step-back"]').click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,theme+'-gateway.png')});
      }
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('All three gateway approaches captured.'); return;
    }
    if (process.argv.includes('--themes')) {
      for (const theme of ['gallery', 'pasture', 'space']) {
        await page.setViewportSize({width:1440,height:1000});
        await page.evaluate(theme => { document.getElementById('wrap').style.cssText='position:relative;width:1280px;height:800px;margin:32px auto;overflow:hidden;border-radius:20px;border:1px solid #334155'; window.__mount({theme}); }, theme);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,theme+'-environment.png')});
        await page.evaluate(() => window.__handle.goTo(1));
        await page.locator('[data-palace-action="inspect-room"]').click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,theme+'-room.png')});
        await page.locator('[data-palace-action="overview"]').click();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,theme+'-overview.png')});
        await page.setViewportSize({width:390,height:844});
        await page.evaluate(() => { document.getElementById('wrap').style.cssText='position:relative;width:390px;height:740px;margin:0;overflow:hidden'; window.__handle.goTo(0); });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,theme+'-mobile-environment.png')});
        await page.evaluate(() => window.__handle.goTo(1));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.locator('#wrap').screenshot({path:path.join(output,theme+'-mobile-stop.png')});
      }
      if(errors.length) throw new Error(errors.join('\n'));
      await page.evaluate(() => window.__handle.destroy());
      console.log('All three themes captured on desktop and mobile.'); return;
    }
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
