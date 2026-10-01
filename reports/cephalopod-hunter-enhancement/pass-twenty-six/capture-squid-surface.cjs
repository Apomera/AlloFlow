'use strict';
// Run only by the integration/root agent, with one browser worker. Example:
// node capture-squid-surface.cjs --repo=<repo> --baseline=<frozen-source> --current=<source> --out=<report-directory>
// Default baseline can be reconstructed from the exact committed current source using baseline-reversal.json.
// Actors are never repositioned. Inspection orbit/zoom uses native controls and counted camera-only deltas
// while the production dive stays paused. Native inspection may hide intervening rocks. A single
// complete-stage scroll is allowed; individual controls are never scrolled.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { createRequire } = require('node:module');
function argument(name, fallback) { const prefix = '--' + name + '='; return process.argv.find(s => s.startsWith(prefix))?.slice(prefix.length) || fallback; }
const repo = path.resolve(argument('repo', path.join(__dirname, '../../..')));
const baselineWasExplicit=process.argv.some(s=>s.startsWith('--baseline='));
let baseline = path.resolve(argument('baseline', path.join(__dirname, 'baseline.source.cjs')));
let derivedBaselineDirectory=null,baselineOrigin='saved snapshot';
const current = path.resolve(argument('current', path.join(repo, 'stem_lab/stem_tool_cephalopodlab.js')));
const out = path.resolve(argument('out', path.join(__dirname, 'squid-surface-comparison')));
const requireRepo = createRequire(path.join(repo, 'package.json'));
const { chromium } = requireRepo('playwright'), esbuild = requireRepo('esbuild');
fs.mkdirSync(out, { recursive: true }); process.chdir(repo);
const generated = path.join(out, 'mobile-comparison-harness.generated.cjs');
esbuild.buildSync({ entryPoints: [path.join(repo, 'tests/e2e/helpers/stem_gl_harness.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: generated, external: ['@playwright/test'] });
const { GlHarness, looksBlank } = require(generated);
const canonical = 'stem_lab/stem_tool_cephalopodlab.js';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function prepareDefaultBaseline(){
  if(fs.existsSync(baseline))return;
  assert.equal(baselineWasExplicit,false,'Explicit baseline path must exist; only the missing default can be derived');
  const reversal=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline-reversal.json'),'utf8'));
  assert.equal(reversal.version,1);assert.equal(reversal.changes.length,11);
  assert.equal(sha(current),reversal.candidateSHA,'Baseline derivation requires the exact approved current source');
  let original=fs.readFileSync(current,'utf8');
  for(const change of [...reversal.changes].reverse()){
    assert.equal(typeof change.before,'string');assert.equal(typeof change.after,'string');assert.ok(change.before&&change.after&&change.before!==change.after);
    assert.equal(original.split(change.after).length-1,1,'Reverse guard must match once: '+(change.label||change.id));
    original=original.replace(change.after,change.before);
  }
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),reversal.baselineSHA,'Reversed baseline bytes must match the approved pass25 source');
  derivedBaselineDirectory=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'cl-hunt-pass26-baseline-'));
  baseline=path.join(derivedBaselineDirectory,'baseline.source.cjs');fs.writeFileSync(baseline,original);
  baselineOrigin='derived by 11 exact approved guards from matching committed source';
}
function removeDerivedBaseline(){
  if(!derivedBaselineDirectory)return;
  const directory=path.resolve(derivedBaselineDirectory),temporaryRoot=path.resolve(require('node:os').tmpdir());
  assert.equal(path.dirname(directory),temporaryRoot);assert.ok(path.basename(directory).startsWith('cl-hunt-pass26-baseline-'),'Only this runner-created temporary directory may be removed');
  fs.rmSync(directory,{recursive:true,force:true});derivedBaselineDirectory=null;
}
const profiles = [
  { name: 'squid-follow', width: 1280, height: 1000, largeText: false, touch: false, quality: 'balanced', inspect: false },
  { name: 'squid-phone', width: 390, height: 844, largeText: false, touch: true, quality: 'low', inspect: false },
  { name: 'squid-inspection', width: 1280, height: 1000, largeText: false, touch: false, quality: 'balanced', inspect: true },
  { name: 'squid-phone-inspection', width: 390, height: 844, largeText: false, touch: true, quality: 'low', inspect: true },
];

async function frame(page, n = 3) { await page.evaluate(async n => { for (let i = 0; i < n; i++) await new Promise(resolve => requestAnimationFrame(resolve)); }, n); }

async function mountNatural(page, harness, profile) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!window.THREE?.Clock && typeof window.__mount === 'function');
  await page.evaluate(() => { const meta = document.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1'; document.head.appendChild(meta); }); await frame(page, 2);
  await page.evaluate(profile => {
    const w = window, T = w.THREE; document.getElementById('wrap').style.width = '100%';
    localStorage.setItem('allo.cephalopodlab.a11y.v1', JSON.stringify({ colorPalette: 'default', highContrast: false, captionMode: false, reducedMotion: false, largeText: profile.largeText }));
    w.__comparisonStep = 0; w.__comparisonTicks = 0; w.__comparisonPaused = false;
    w.__comparisonVisualStep=0;w.__comparisonVisualTicks=0;
    function pauseVeil() {
      const c = document.querySelector('canvas[role=application]');
      const hits = [...c.parentElement.children].filter(el => el.children.length === 3 && el.children[1].textContent === 'Paused' && el.children[2].textContent === 'Press Esc to resume');
      if (hits.length !== 1) throw new Error('Expected one existing native pause veil');
      return hits[0];
    }
    function togglePause() {
      pauseVeil().style.visibility = 'hidden';
      document.querySelector('canvas[role=application]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
      w.__comparisonPaused = !w.__comparisonPaused;
    }
    // Match the exact number of active production steps. Actual native pause
    // between steps avoids zero-delta live-world random draws drifting with
    // screenshot wall time. Only the ordinary pause veil is hidden.
    T.Clock.prototype.getDelta = function () {
      const visualDt=w.__comparisonVisualStep;w.__comparisonVisualStep=0;
      if(visualDt>0){
        if(!w.__comparisonPaused||!document.querySelector('.cl-hunt-stage.cl-inspecting'))throw Error('Camera-only deltas require the native paused inspection');
        w.__comparisonVisualTicks++;return visualDt;
      }
      const dt = w.__comparisonStep; w.__comparisonStep = 0;
      if ((dt > 0 && w.__comparisonPaused) || (dt === 0 && !w.__comparisonPaused)) togglePause();
      if (dt) { w.__comparisonTicks++; queueMicrotask(() => { if (!w.__comparisonPaused) togglePause(); }); }
      return dt;
    };
    // Observe the production camera passed to real renders; never change it.
    const Original = T.WebGLRenderer;
    T.WebGLRenderer = new Proxy(Original, { construct(target, args, newTarget) {
      const renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) { if (scene?.isScene) w.__comparisonCamera = camera; return render.apply(this, arguments); };
      return renderer;
    } });
    w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid', huntMode: 'observe', huntSeed: 2741, huntQuality: profile.quality, _threeLoaded: true } });
  }, profile);
  await page.waitForFunction(() => window.__glRecorder.records.some(r => r.scene?.getObjectByName('cl-player') && r.canvas.isConnected && r.draws > 0));
  await page.evaluate(async () => {
    const w = window;
    for (let n = 0; n < 20; n++) {
      const prior = w.__comparisonTicks; w.__comparisonStep = .05;
      for (let tries = 0; tries < 120 && w.__comparisonTicks === prior; tries++) await new Promise(resolve => requestAnimationFrame(resolve));
      if (w.__comparisonTicks !== prior + 1) throw new Error('Requested natural step must be consumed once');
    }
  });
  await frame(page); await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded(); await frame(page, 5);
  if (profile.inspect) {
    await page.locator('canvas[role=application]').focus(); await page.keyboard.press('KeyF');
    await page.getByRole('region', { name: 'Specimen inspection', exact: true }).waitFor({ state: 'visible' });
    for (const action of ['Orbit right', 'Orbit right', 'Closer', 'Closer']) {
      const button=page.getByRole('button',{name:action,exact:true}),rect=await button.boundingBox();
      assert(rect&&rect.x>=0&&rect.y>=0&&rect.x+rect.width<=profile.width+.5&&rect.y+rect.height<=profile.height+.5,'Inspection action must already fit without scrolling');
      const priorCamera=await page.evaluate(()=>window.__comparisonCamera.position.toArray());
      const frozen=await worldFixture(page);delete frozen.camera;delete frozen.native;frozen.actors.forEach(actor=>delete actor.visible);
      await button.click();
      await page.evaluate(async()=>{
        const w=window;
        for(let n=0;n<20;n++){
          const prior=w.__comparisonVisualTicks;w.__comparisonVisualStep=.05;
          for(let tries=0;tries<120&&w.__comparisonVisualTicks===prior;tries++)await new Promise(resolve=>requestAnimationFrame(resolve));
          if(w.__comparisonVisualTicks!==prior+1)throw Error('Requested camera-only step must be consumed once');
        }
      });
      const settled=await worldFixture(page);delete settled.camera;delete settled.native;settled.actors.forEach(actor=>delete actor.visible);
      assert.deepEqual(JSON.parse(JSON.stringify(settled)),JSON.parse(JSON.stringify(frozen)),'Native orbit/zoom must retain every recorded actor phase/readout and 20 active ticks');
      const afterCamera=await page.evaluate(()=>window.__comparisonCamera.position.toArray());
      // Closer may legitimately be clamped at the native 3.6-body-scale minimum.
      if(action.startsWith('Orbit'))assert(Math.hypot(...afterCamera.map((v,i)=>v-priorCamera[i]))>.0001,'Native orbit must visibly move its production camera');
    }
    await frame(page,5);
  }
  await page.evaluate(() => {
    if (!window.__comparisonPaused || document.querySelector('[data-hud=burn]')?.textContent !== 'Paused') throw new Error('Comparison must capture an actually paused production dive');
  });
}

async function worldFixture(page) {
  return page.evaluate(() => {
    const w = window, rec = w.__glRecorder.records.filter(r => r.scene && r.canvas.isConnected).at(-1), scene = rec.scene, camera = w.__comparisonCamera;
    scene.updateMatrixWorld(true);
    const state = o => ({ name: o.name, type: o.type, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(),visible:o.visible });
    const player = scene.getObjectByName('cl-player');
    return { seed: 2741, ticks: w.__comparisonTicks, player: state(player), camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov },
      // UUIDs differ between mounts, so compare structural state/phase instead.
      actors: scene.children.map(o => ({ ...state(o), state: o.userData.state, wanderAngle: o.userData.wanderAngle, wanderTimer: o.userData.wanderTimer, pulsePhase: o.userData.pulsePhase, driftAngle: o.userData.driftAngle, verticalPhase: o.userData.verticalPhase, phase: o.userData.phase })),
      readouts: ['time', 'energy', 'score'].map(k => [k, document.querySelector('[data-hud=' + k + ']')?.textContent]),
      native: { context: rec.id, draws: rec.draws, renders: rec.renders, pageCreated: rec.creator.length > 0, lost: rec.ctx.isContextLost(), cameraAspect: camera.aspect,
        projectionFinite: [camera.aspect, ...camera.projectionMatrix.elements].every(Number.isFinite), canvasAspect: rec.canvas.clientWidth / rec.canvas.clientHeight, canvasCssAspect: rec.canvas.getBoundingClientRect().width / rec.canvas.getBoundingClientRect().height,visualTicks:w.__comparisonVisualTicks } };
  });
}

async function paintedOverlayGrid(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas[role=application]'), stage = c.parentElement, canvas = c.getBoundingClientRect();
    function visible(el) {
      let opacity = 1;
      for (let p = el; p && p !== stage.parentElement; p = p.parentElement) { const s = getComputedStyle(p); opacity *= Number(s.opacity); if (p.hidden || s.display === 'none' || s.visibility === 'hidden' || opacity < .05) return false; }
      const r = el.getBoundingClientRect(); return r.width > .5 && r.height > .5;
    }
    function paintRect(el) {
      const original = el.getBoundingClientRect(), r = { x: original.x, y: original.y, right: original.right, bottom: original.bottom };
      for (let p = el.parentElement; p && p !== stage.parentElement; p = p.parentElement) {
        const s = getComputedStyle(p), parent = p.getBoundingClientRect();
        if (/^(hidden|clip|auto|scroll)$/.test(s.overflowX)) { r.x = Math.max(r.x, parent.x); r.right = Math.min(r.right, parent.right); }
        if (/^(hidden|clip|auto|scroll)$/.test(s.overflowY)) { r.y = Math.max(r.y, parent.y); r.bottom = Math.min(r.bottom, parent.bottom); }
      }
      return { ...r, width: Math.max(0, r.right - r.x), height: Math.max(0, r.bottom - r.y) };
    }
    function alpha(color) { const match = color.match(/^rgba?\(([^)]+)\)/); if (!match) return 0; const parts = match[1].split(',').map(Number); return parts.length === 3 ? 1 : parts[3]; }
    const elements = [...stage.querySelectorAll('*')].filter(el => {
      if (el === c || ['STYLE', 'SCRIPT'].includes(el.tagName) || !visible(el)) return false;
      const s = getComputedStyle(el);
      // Transparent layout containers are not obstacles: their actual buttons
      // are counted individually. This handles pointer-events:none HUDs, which
      // elementsFromPoint alone silently omits. Decorative gradients are not
      // treated as full opaque rectangles.
      const leafText = el.children.length === 0 && !!el.textContent?.trim() && !['CANVAS', 'INPUT', 'SELECT'].includes(el.tagName);
      return el.matches('button,input,select,.cl-hunt-hud,.cl-hunt-mission,.cl-hunt-map,.cl-hunt-action-prompt') || alpha(s.backgroundColor) >= .2 || leafText;
    });
    const obstacles = elements.map(el => ({ name: el.getAttribute('aria-label') || el.className || el.textContent?.trim().slice(0, 60), ...paintRect(el) })).filter(r => r.width > .5 && r.height > .5);
    const columns = 40, rows = 64, grid = [], centerRows = []; let clear = 0, visibleCells = 0, clearCanvas = 0, centerClear = 0, centerTotal = 0;
    for (let row = 0; row < rows; row++) {
      const line = [], y = canvas.y + (row + .5) * canvas.height / rows; let centralClear = true;
      for (let col = 0; col < columns; col++) {
        const x = canvas.x + (col + .5) * canvas.width / columns, onScreen = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight;
        const painted = obstacles.some(r => x >= r.x && x < r.right && y >= r.y && y < r.bottom), available = onScreen && !painted;
        if (onScreen) visibleCells++; if (!painted) clearCanvas++; if (available) clear++;
        if (col >= 12 && col < 28) { centerTotal++; if (available) centerClear++; else centralClear = false; }
        line.push(available ? 1 : 0);
      }
      grid.push(line); centerRows.push(centralClear);
    }
    let run = 0, longest = 0; centerRows.forEach(clear => { run = clear ? run + 1 : 0; longest = Math.max(longest, run); });
    return { viewport: { width: innerWidth, height: innerHeight }, canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height, right: canvas.right, bottom: canvas.bottom }, scrollY,
      canvasFitsViewport: canvas.x >= -.5 && canvas.y >= -.5 && canvas.right <= innerWidth + .5 && canvas.bottom <= innerHeight + .5,
      clearFraction: clear / (columns * rows), clearFractionIgnoringViewport: clearCanvas / (columns * rows), visibleCanvasFraction: visibleCells / (columns * rows), clearVisibleFraction: visibleCells ? clear / visibleCells : 0,
      centerClearFraction: centerClear / centerTotal, longestClearCentralHeight: longest * canvas.height / rows, longestClearCentralFraction: longest / rows,
      grid: { columns, rows, values: grid }, obstacles };
  });
}

(async () => {
  let browser=null;
  const sources=[{name:'baseline',file:baseline},{name:'current',file:current}],results=[],errors=[];
  const originalSubstitute=process.env.STEM_GL_SUBSTITUTE;
  try {
    prepareDefaultBaseline();sources[0].file=baseline;
    browser=await chromium.launch({headless:true});
    const reuseBaseline=argument('reuse-baseline','false')==='true';
    if(reuseBaseline){const cached=JSON.parse(fs.readFileSync(path.join(out,'mobile-world-comparison.json'),'utf8'));for(const profile of profiles){const row=cached.results.find(r=>r.source==='baseline'&&r.profile.name===profile.name);assert(row);assert.equal(row.sha256,sha(baseline));assert.deepEqual(row.profile,profile);assert.deepEqual(row.leaks,[]);assert.deepEqual(row.errors,[]);results.push(row);}}
    for (const source of sources) {
      if(reuseBaseline&&source.name==='baseline')continue;
      process.env.STEM_GL_SUBSTITUTE = canonical + '=' + source.file;
      const harness = new GlHarness({ toolFile: canonical, toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
      await harness.start();
      try {
        for (const profile of profiles) {
          const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1 });
          const page = await context.newPage(), failures = []; page.setDefaultTimeout(90000);
          page.on('pageerror', e => failures.push(e.message)); page.on('console', m => { if (m.type() === 'error') failures.push(m.text()); });
          try {
            await mountNatural(page, harness, profile);
            const fixture = await worldFixture(page), metric = await paintedOverlayGrid(page);
            assert.equal(metric.viewport.width, profile.width, 'Mobile layout viewport must match the requested phone width');
            const served = await page.evaluate(async canonical => { const body = await (await fetch('/' + canonical)).arrayBuffer(); const bytes = [...new Uint8Array(await crypto.subtle.digest('SHA-256', body))]; return bytes.map(b => b.toString(16).padStart(2, '0')).join(''); }, canonical);
            assert.equal(served, sha(source.file), 'Measured served source must match the selected frozen/current file');
            assert.equal(fixture.native.pageCreated, true); assert.equal(fixture.native.lost, false); assert.ok(fixture.native.draws > 0);
            assert.equal(fixture.native.projectionFinite, true); assert.ok(Math.abs(fixture.native.cameraAspect - fixture.native.canvasAspect) < .00001, 'Camera aspect must follow the resized CSS canvas');
            const image = source.name + '-' + profile.name + '.png'; await page.screenshot({ path: path.join(out, image) });
            const pixels = await harness.glPixels(page); assert.ok(pixels && !looksBlank(pixels), 'Overlay-free native pixels must be nonblank');
            fs.writeFileSync(path.join(out, source.name + '-' + profile.name + '-gl.png'), pixels.png);
            await harness.unmount(page); const leaks = await harness.leakedAfterUnmount(page); assert.deepEqual(leaks, []); assert.deepEqual(failures, []);
            results.push({ source: source.name, profile, sha256: served, fixture, metric, screenshot: image, glPixels: { ...pixels, png: undefined }, leaks, errors: failures });
            fs.writeFileSync(path.join(out, 'captures.partial.json'), JSON.stringify(results, null, 2) + '\n');
          } finally { await harness.destroy(page); await context.close(); }
        }
      } finally { await harness.stop(); }
    }
    const pairs = profiles.map(profile => {
      const before = results.find(r => r.source === 'baseline' && r.profile.name === profile.name), after = results.find(r => r.source === 'current' && r.profile.name === profile.name);
      const { native: ignoredBefore, ...worldBefore } = before.fixture, { native: ignoredAfter, ...worldAfter } = after.fixture;
      // Cached baseline rows passed through JSON; apply the same representation
      // to both sides so absent optional phase fields match undefined fields.
      assert.deepEqual(JSON.parse(JSON.stringify(worldAfter)), JSON.parse(JSON.stringify(worldBefore)), 'Natural actor/phase/camera/readout state must match exactly: ' + profile.name);
      return { profile: profile.name, worldMatched: true, before: before.metric, after: after.metric, delta: { clearFraction: after.metric.clearFraction - before.metric.clearFraction,
        centerClearFraction: after.metric.centerClearFraction - before.metric.centerClearFraction, longestClearCentralHeight: after.metric.longestClearCentralHeight - before.metric.longestClearCentralHeight } };
    });
    assert.equal(pairs.length,4);
    const summary = { baselineOrigin,reusedUnchangedBaseline:reuseBaseline, scope: 'Matched natural Humboldt squid seed2741, low/balanced quality,20 active .05-second production steps, native pause. Both sources use profile-matched touch/pointer,DPR1 and the same standard width=device-width,initial-scale=1 viewport metadata missing from standalone GlHarness. Same player/actor phases/camera position and orientation/readouts; responsive canvas aspect may differ and must stay finite/correct. Only native pause veil hidden; DOM overlays remain visible. One whole-stage entry scroll; inspection uses visible native orbit/zoom controls without scrolling and 20 counted .05-second camera-only deltas after each action while native dive remains paused. Actor transforms/phase/readouts are checked unchanged across those deltas. Native inspection may hide intervening rocks; capture code never changes actor visibility. Final native actor visibility must match across sources. Grid40x64 counts visible opaque panel/button/map/text rectangles, including pointer-events:none HUD; ancestor clipping/combined opacity respected and decorative translucent gradients excluded. Fractions count off-viewport canvas samples as unavailable. No performance claim. Fine pigment/grain/roughness shader appearance is the only visual change; no actors or cameras are edited.', sources: sources.map(s => ({ name: s.name, file: s.file, sha256: sha(s.file) })), pairs, results, errors };
    fs.writeFileSync(path.join(out, 'mobile-world-comparison.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(JSON.stringify({ pairs: pairs.map(p => ({ profile: p.profile, worldMatched: p.worldMatched, delta: p.delta })), errors }));
  } catch (e) { fs.writeFileSync(path.join(out, 'comparison-failure.json'), JSON.stringify({ message: e.message, stack: e.stack, results, errors }, null, 2) + '\n'); throw e; }
  finally { if (originalSubstitute === undefined) delete process.env.STEM_GL_SUBSTITUTE; else process.env.STEM_GL_SUBSTITUTE = originalSubstitute;try{if(browser)await browser.close();}finally{removeDerivedBaseline();} }
})().catch(error => { console.error(error); process.exitCode = 1; });
