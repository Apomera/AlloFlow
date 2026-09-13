// Run from the repository root: node dev-tools/companion_planting_atmosphere_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/companion-planting-enhancement');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const findings = { viewports: [], assertions: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => findings.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><title>Companion Planting Lab · experiment verification</title></head><body><main id="root"></main></body></html>');
    const cssDir = path.join(root, 'app/static/css');
    const css = fs.readdirSync(cssDir).find(file => /^main\..*\.css$/.test(file));
    await page.addStyleTag({ path: path.join(cssDir, css) });
    await page.addStyleTag({ content: 'body{margin:0;background:#eff3ef;font-family:system-ui}#root{max-width:1152px;margin:16px auto;padding:0 12px}button,select,input,textarea{font:inherit}@media(max-width:640px){#root{padding:0 6px;margin:6px auto}}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    let source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_companionplanting.js'), 'utf8');
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting };\n  window.StemLab.registerTool('companionPlanting', {");
    source = source.replace('          // Plant portraits and field-guide details', '          window.cpVisualQA.plants = CG_PLANTS;\n          // Plant portraits and field-guide details');
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      const R = window.React, h = R.createElement, noop = () => {};
      const icons = new Proxy({}, { get: () => () => h('span', { 'aria-hidden': true }) });
      function App() {
        const [data, setData] = R.useState({ companionPlanting: { gardenMode: 'community', communityGarden: {} } });
        window.cpData = data;
        window.cpSetData = setData;
        return window.StemLab._registry.companionPlanting.render({
          React: R, toolData: data, setToolData: setData, setStemLabTool: noop, setStemLabTab: noop,
          stemLabTool: 'companionPlanting', toolSnapshots: [], setToolSnapshots: noop, addToast: noop, icons,
          t: (key, fallback) => fallback || key, gradeLevel: '7th Grade', props: {},
          srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
          a11yClick: fn => ({ onClick: fn }), announceToSR: noop, canvasNarrate: noop,
          awardXP: noop, beep: noop, celebrate: noop, saveSnapshot: noop
        });
      }
      window.cpRoot = ReactDOM.createRoot(document.getElementById('root'));
      window.cpRoot.render(h(App));
    });

    await page.waitForFunction(() => window.cpSetData && window.cpVisualQA.plants);
    const ids = ['corn', 'dill', 'beans', 'tomato', 'marigold', 'borage', 'pepper', 'basil', 'cucumber', 'nasturtium', 'lettuce', 'carrot', 'lavender', 'strawberry', 'radish', 'rain_barrel'];
    await page.evaluate(ids => {
      const plants = cpVisualQA.plants;
      cpSetData({ companionPlanting: { gardenMode: 'community', communityGarden: { day: 44, phase: 'grow', moisture: 60, beneficialPop: 12, reducedMotion: true,
        grid: ids.map((plantId, i) => ({ plantId, growthDay: plants[plantId].days, health: 98, pests: 0, watered: i % 2 === 0 })) } } });
    }, ids);
    const canvas = page.locator('canvas[aria-describedby="community-plot-help"]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => __cgCanvasEl.dataset.gardenReadyCount === '15' && __cgCanvasEl._cgAnim === null);
    await canvas.screenshot({ path: path.join(out, 'garden-refined-desktop.png') });


    // Render representative seasons without advancing or altering the saved garden.
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 844 : 1000 });
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const el = __cgCanvasEl;
        return el._cgAnim === null && +el.dataset.gardenRenderWidth === el.width && +el.dataset.gardenRenderHeight === el.height;
      });
      const stateBefore = await page.evaluate(() => JSON.stringify(cpData));
      const signatures = [];
      for (const [season, name] of ['spring', 'summer', 'autumn', 'winter'].entries()) {
        const result = await canvas.evaluate((el, season) => {
          const ctx = el.getContext('2d');
          const frame = { ...el._cgFrameState, season, day: season * 30 + 14 };
          cpVisualQA.scene(ctx, el, React, frame, cpVisualQA.plants, [], 0, true);
          const signature = el.toDataURL();
          cpVisualQA.scene(ctx, el, React, frame, cpVisualQA.plants, [], 91, true);
          return {
            signature, still: signature === el.toDataURL(), transform: ctx.getTransform().isIdentity,
            alpha: ctx.globalAlpha, ready: el.dataset.gardenReadyCount, plants: el.dataset.gardenPlantedCount
          };
        }, season);
        assert.equal(result.still, true, 'reduced-motion scene is identical at different animation times');
        assert.equal(result.transform, true, 'painting restores all transforms');
        assert.equal(result.alpha, 1, 'painting restores opacity');
        assert.equal(result.plants, '16');
        assert.equal(result.ready, '15');
        signatures.push(result.signature);
        await canvas.screenshot({ path: path.join(out, 'garden-atmosphere-' + name + '-' + width + '.png') });
      }
      assert.equal(new Set(signatures).size, 4, 'each season has distinct artwork');
      await canvas.evaluate(el => {
        cpVisualQA.scene(el.getContext('2d'), el, React, el._cgFrameState, cpVisualQA.plants, [], 66, false);
      });
      await canvas.screenshot({ path: path.join(out, 'garden-atmosphere-night-' + width + '.png') });
      const stills = await canvas.evaluate(el => {
        const ctx = el.getContext('2d');
        cpVisualQA.scene(ctx, el, React, el._cgFrameState, cpVisualQA.plants, [], 0, false);
        const day = el.toDataURL();
        cpVisualQA.scene(ctx, el, React, el._cgFrameState, cpVisualQA.plants, [], 31, false);
        return day !== el.toDataURL();
      });
      assert.equal(stills, true, 'enabled ambient motion changes the scene');
      await canvas.evaluate(el => {
        const frame = { ...el._cgFrameState, phase: 'plan', season: 0, day: 0, moisture: 25,
          grid: Array.from({length:16}, () => ({plantId:null,growthDay:0,health:100,pests:0})) };
        cpVisualQA.scene(el.getContext('2d'), el, React, frame, cpVisualQA.plants, [], 0, true);
      });
      await canvas.screenshot({ path: path.join(out, 'garden-atmosphere-empty-' + width + '.png') });
      assert.equal(await page.evaluate(() => JSON.stringify(cpData)), stateBefore, 'artwork does not mutate saved garden data');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
      findings.viewports.push({width, seasons:4, night:true, empty:true, reducedMotionStable:true});
    }
    await page.setViewportSize({ width:1280, height:1000 });
    await page.getByRole('button', {name:'Maximize garden view', exact:true}).click();
    await page.waitForFunction(() => {
      const el = __cgCanvasEl;
      return el && el.offsetHeight > 650 && +el.dataset.gardenRenderWidth === el.width && +el.dataset.gardenRenderHeight === el.height;
    });
    await canvas.screenshot({path:path.join(out,'garden-atmosphere-maximized.png')});
    const bounds = await canvas.evaluate(el => ({
      fits: +el.dataset.gardenTileWidth * 4 < el.width && +el.dataset.gardenOriginY + +el.dataset.gardenTileHeight * 4 + 40 < el.height
    }));
    assert.equal(bounds.fits, true, 'maximized garden retains all beds');
    await page.getByRole('button', {name:'Exit maximized garden view', exact:true}).click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => +__cgCanvasEl.dataset.gardenRenderWidth === __cgCanvasEl.width && +__cgCanvasEl.dataset.gardenRenderHeight === __cgCanvasEl.height);

    findings.zeroSize = await canvas.evaluate(el => {
      const probe=document.createElement('canvas'), ctx=probe.getContext('2d');
      probe.width=0;probe.height=760;
      cpVisualQA.scene(ctx,probe,React,el._cgFrameState,cpVisualQA.plants,[],0,true);
      probe.width=760;probe.height=0;
      cpVisualQA.scene(ctx,probe,React,el._cgFrameState,cpVisualQA.plants,[],0,true);
      probe.height=760;
      cpVisualQA.scene(ctx,probe,React,el._cgFrameState,cpVisualQA.plants,[],0,true);
      return probe.dataset.gardenPlantedCount==='16'&&probe._cgBedLayer.canvas.width===760;
    });
    assert.equal(findings.zeroSize,true,'zero-size canvases safely resume at a visible size');

    findings.bedCache = await canvas.evaluate(el => {
      const frame = el._cgFrameState, savedHover = el._hoverCell;
      const entries = frame.grid.map((cell,index) => ({index,crop:index<15,tone:'critical',short:'Care'}));
      const cases = [
        ['normal', {}], ['dry soil', {moisture:12}],
        ['watered beds', {grid:frame.grid.map(cell=>({...cell,watered:!cell.watered}))}],
        ['winter edges', {season:3}], ['selected bed', {}, 0],
        ['placement outline', {placementPreview:{plot:2},previewModel:null}],
        ['empty beds', {phase:'plan',grid:frame.grid.map(()=>({plantId:null,watered:false}))}],
        ['care lens', {lens:{id:'care',entries}}],
        ['updated care tones', {lens:{id:'care',entries:entries.map(entry=>({...entry,tone:'healthy',short:'Healthy'}))}}]
      ];
      const results = cases.map(([name,patch,hover])=>{
        el._hoverCell = hover == null ? -1 : hover;
        const testFrame = {...frame,...patch};
        cpVisualQA.scene(el.getContext('2d'),el,React,testFrame,cpVisualQA.plants,[],0,true);
        const cached = el.toDataURL();
        el._cgBedLayer.key = null;
        cpVisualQA.scene(el.getContext('2d'),el,React,testFrame,cpVisualQA.plants,[],0,true);
        return {name,matchesFresh:cached===el.toDataURL()};
      });
      el._hoverCell = savedHover;
      cpVisualQA.scene(el.getContext('2d'),el,React,frame,cpVisualQA.plants,[],0,true);
      return results;
    });
    assert.ok(findings.bedCache.every(result=>result.matchesFresh), JSON.stringify(findings.bedCache));

    findings.paintTiming = await canvas.evaluate(el => {
      const times = [];
      for(let i=0; i<20; i++){
        const start = performance.now();
        cpVisualQA.scene(el.getContext('2d'), el, React, el._cgFrameState, cpVisualQA.plants, [], i, false);
        times.push(performance.now()-start);
      }
      times.sort((a,b)=>a-b);
      return {medianMs:times[10],p95Ms:times[18],width:el.width,height:el.height,nodeCache:el._cgBotanicalNodes.size,pathCache:el._cgBotanicalPaths.size};
    });
    assert.ok(findings.paintTiming.nodeCache <= 96);
    findings.assertions.push('Four seasons, night, and an empty garden captured at desktop and 320px',
      'Reduced motion produces identical frames at different times',
      'Enabled ambient motion changes the artwork',
      'Scene drawing preserves saved garden state and canvas context',
      'Maximized garden fits all 16 beds',
      'Scene cache remains bounded');
    await page.evaluate(() => { window.retiredGarden = __cgCanvasEl; cpRoot.unmount(); });
    await page.waitForFunction(() => retiredGarden._cgCanvasInit === false);
    assert.equal(await page.evaluate(() => retiredGarden._cgBedLayer), null, 'cached bitmap is released on unmount');
    findings.assertions.push('Cached bed artwork matches fresh painting after care, selection, placement, and view changes', 'Cached bitmap released on unmount');
    assert.deepEqual(findings.errors, []);
    fs.writeFileSync(path.join(out,'atmosphere-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
