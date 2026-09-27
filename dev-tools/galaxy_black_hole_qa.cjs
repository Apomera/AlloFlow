// Real WebGL interaction and screenshot checks for the black-hole experiment.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/galaxy-black-hole-review');
const before = process.argv.includes('--before');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const shell = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const assets = {
    '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js',
    '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
    '/three.js': 'vendor/three-r128/three.min.js',
    '/galaxy.js': 'stem_lab/stem_tool_galaxy.js',
    '/styles.css': 'desktop/web-app/public/app/static/css/main.99f5a409.css',
  };
  if (process.argv.includes('--serve')) {
    const http = require('node:http');
    const server = http.createServer((req,res) => {
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('Cache-Control','no-store');
      if (url.pathname === '/') {
        res.setHeader('Content-Type','text/html; charset=utf-8');
        res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Black Hole Lab — local preview</title><link rel="stylesheet" href="/styles.css"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script>window.__uiStrings={};'+shell+'</script><script src="/galaxy.js"></script><script>window.__mount({simMode:"blackHole",blackHolePaused:true});</script></body></html>');
      } else if(assets[url.pathname]) {
        res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8');
        res.end(read(assets[url.pathname]));
      } else {res.statusCode=404;res.end('Not found');}
    });
    server.listen(0,'127.0.0.1',()=>console.log('BLACK_HOLE_PREVIEW=http://127.0.0.1:'+server.address().port));
    return;
  }
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ path: path.join(ROOT, 'desktop/web-app/public/app/static/css/main.99f5a409.css') });
    for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(p) });
    await page.addScriptTag({ content: 'window.__uiStrings = ' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    await page.evaluate(() => window.__mount({ simMode: 'blackHole', blackHolePaused: true }));
    await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
    const canvas = page.locator('[data-black-hole-canvas]');
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, before ? 'before-desktop.png' : 'after-desktop.png') });
    await page.getByRole('button', { name: 'Drop object into black hole', exact: true }).click();
    if (before) {
      await page.getByRole('button', { name: 'Start animation', exact: true }).click();
      await page.waitForTimeout(2200);
      await canvas.screenshot({ path: path.join(OUT, 'before-drop.png') });
    } else {
      const stateOf = () => canvas.evaluate(c => c._blackHoleExperimentState());
      const act = name => page.getByRole('button', { name, exact: true }).click();
      const seek = async value => {
        await page.locator('#black-hole-timeline').evaluate((el, v) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
      };
      await page.getByRole('button', { name: 'Step forward', exact: true }).click();
      const state = await stateOf();
      assert(state.time > 0 && state.radius < state.releaseRadius, 'Stepping must move the released object inward');
      assert(state.paused, 'Step must pause automatic playback');
      await page.waitForTimeout(200);
      assert.equal((await stateOf()).time, state.time, 'Paused time must stay fixed');
      await canvas.screenshot({ path: path.join(OUT, 'after-step.png') });
      await seek(65);
      const middle = await stateOf();
      await canvas.screenshot({ path: path.join(OUT, 'after-tidal-stretch.png') });
      await seek(100);
      assert((await stateOf()).complete && (await stateOf()).radius === 1, 'Capture stops at the horizon');
      assert.match(await page.locator('#black-hole-status').textContent(), /Captured/);
      await seek(65);
      assert.equal((await stateOf()).radius, middle.radius, 'Backwards scrubbing must restore the same position');
      await act('Replay experiment');
      assert.equal((await stateOf()).time, 0);
      assert.equal((await stateOf()).radius, 5);
      await act('Start animation');
      await page.waitForTimeout(450);
      await act('Pause animation');
      assert((await stateOf()).time > 0, 'Play must advance the experiment');
      const pausedAt = (await stateOf()).time;
      await page.waitForTimeout(250);
      assert.equal((await stateOf()).time, pausedAt);

      for (const [preset, expected] of [['Orbit','orbit'],['Escape','escaped']]) {
        await act(preset);
        assert.equal((await stateOf()).released, false, 'Changing settings must reset the previous run');
        await act('Drop object into black hole');
        await seek(100);
        assert.equal((await stateOf()).outcome, expected);
        assert((await stateOf()).radius > 1);
        await canvas.screenshot({ path: path.join(OUT, 'after-'+preset.toLowerCase()+'.png') });
      }
      await act('Direct fall');
      await page.selectOption('#black-hole-mass', 'supermassive');
      await act('Drop object into black hole');
      await seek(95);
      assert.match(await page.locator('#black-hole-run-readout').textContent(), /1\.0×/);
      await canvas.screenshot({ path: path.join(OUT, 'after-supermassive-probe.png') });
      await page.selectOption('#black-hole-object', 'star');
      await act('Drop object into black hole');
      await seek(60);
      await canvas.screenshot({ path: path.join(OUT, 'after-star-disruption.png') });
      await page.selectOption('#black-hole-object', 'astronaut');
      await page.selectOption('#black-hole-mass', 'stellar');
      await act('Drop object into black hole');
      await seek(75);
      await canvas.screenshot({ path: path.join(OUT, 'after-astronaut.png') });

      // Changes to appearance must preserve an experiment and its canvas.
      await page.getByText('Relativistic controls', { exact: true }).click();
      const beforeAppearance = await stateOf();
      await page.locator('#black-hole-spin').fill('0.3');
      assert.equal((await stateOf()).time, beforeAppearance.time);
      const restored = await canvas.evaluate(async c => {
        const gl=c.getContext('webgl2')||c.getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context');
        if(!ext)return 'unsupported';
        await new Promise(resolve=>{c.addEventListener('webglcontextlost',resolve,{once:true});ext.loseContext();});
        await new Promise(resolve=>setTimeout(resolve,150));
        if(!document.getElementById('black-hole-status').textContent.includes('interrupted'))throw Error('Context-loss feedback was overwritten');
        const done=new Promise(resolve=>c.addEventListener('webglcontextrestored',resolve,{once:true}));ext.restoreContext();await done;
        return true;
      });
      assert.equal(restored, true, 'WebGL context recovery was exercised');
      await page.waitForTimeout(100);
      assert.equal((await stateOf()).time, beforeAppearance.time);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.__mount({ simMode:'blackHole' }));
      await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
      assert((await stateOf()).paused, 'Reduced motion starts paused');
      await act('Drop object into black hole');
      await act('Step forward');
      assert((await stateOf()).time > 0 && (await stateOf()).paused);

      // Both release extremes stay in frame on desktop and phone after reset.
      for (const width of [1440,390,320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => window.__mount({ simMode:'blackHole',blackHoleReleaseRadius:8,blackHolePaused:true }));
        await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
        await canvas.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !document.getElementById('black-hole-object-marker').hidden);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,'No overflow at '+width);
      }
      await page.getByRole('button', { name:'Drop object into black hole',exact:true }).click();
      const inView=await canvas.evaluate(c=>{const r=c.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;});
      assert(inView,'Phone release returns to the object');
      await page.setViewportSize({width:1440,height:1050});
      await page.emulateMedia({ reducedMotion:'no-preference' });
      await page.evaluate(() => window.__mount({ simMode:'blackHole',blackHolePaused:true }));
      await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._dropIntoBlackHole);
      await canvas.scrollIntoViewIfNeeded();
      await page.screenshot({ path:path.join(OUT,'after-desktop.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, before ? 'before-phone.png' : 'after-phone.png') });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    const result = { before, errors, overflow };
    fs.writeFileSync(path.join(OUT, before ? 'before.json' : 'browser-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(overflow, false, 'No horizontal phone overflow');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
