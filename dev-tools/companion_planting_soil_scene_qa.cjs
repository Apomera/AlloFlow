// Run from the repository root: node dev-tools/companion_planting_soil_scene_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, soil: companionSoilCondition, reflections: companionPaintSoilReflections };\n  window.StemLab.registerTool('companionPlanting', {");
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



    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.stringify(cpData.companionPlanting.communityGarden));
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null && +__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    const baseGrid=await page.evaluate(()=>cpData.companionPlanting.communityGarden.grid.map((cell,i)=>({...cell,plantId:i%3===0?null:cell.plantId,growthDay:cell.growthDay*.55,watered:false})));
    await patch({grid:baseGrid,relationshipLens:false,playGardenLens:'natural',activeEvent:null,day:44});
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      const signatures=[];
      for(const [name,moisture,watered] of [['dry',12,false],['moist',60,false],['watered',60,true],['saturated',98,false]]){
        await patch({moisture,grid:baseGrid.map(cell=>({...cell,watered:!!cell.plantId&&watered}))});
        await waitForCanvas();
        await page.waitForFunction(id=>__cgCanvasEl.dataset.gardenSoilCondition===id,name==='watered'?'moist':name);
        const before=await state();
        const result=await canvas.evaluate(el=>{
          const ctx=el.getContext('2d'),frame=el._cgFrameState;
          cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,[],0,true);
          const signature=el.toDataURL(),bedLayer=el._cgBedLayer,key=bedLayer.key;
          cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,[],42,true);
          const still=signature===el.toDataURL();
          cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,[],42,false);
          const reusesBed=bedLayer===el._cgBedLayer&&key===el._cgBedLayer.key;
          cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,[],0,true);
          el._cgBedLayer.key=null;
          cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,[],0,true);
          return {signature,still,reusesBed,freshMatches:signature===el.toDataURL(),identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha};
        });
        assert.equal(result.still,true);assert.equal(result.reusesBed,true);assert.equal(result.freshMatches,true);
        assert.equal(result.identity,true);assert.equal(result.alpha,1);assert.equal(await state(),before);
        signatures.push(result.signature);
        await canvas.screenshot({path:path.join(out,`garden-soil-${name}-${width}.png`)});
      }
      assert.equal(new Set(signatures).size,4,'dry, moist, freshly watered, and saturated materials differ');
      await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,[],66,false));
      await canvas.screenshot({path:path.join(out,`garden-soil-night-${width}.png`)});
      await patch({day:104});await waitForCanvas();
      await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenRenderDay==='104');
      await canvas.screenshot({path:path.join(out,`garden-soil-winter-${width}.png`)});
      await patch({day:44});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      findings.viewports.push({width,conditions:4,night:true,winter:true,reducedMotionStable:true,bedCacheMatches:true});
    }
    // Verify the water surface itself, independently of wind, clouds, or night lighting.
    findings.reflections=await canvas.evaluate(()=>{
      const c=document.createElement('canvas');c.width=360;c.height=180;const ctx=c.getContext('2d');
      const draw=(moisture,season,time)=>{ctx.clearRect(0,0,360,180);cpVisualQA.reflections(ctx,{x:180,y:90},300,140,5,cpVisualQA.soil(moisture),season,time);return c.toDataURL();};
      const dry0=draw(29,1,0),dry1=draw(29,1,2),wet0=draw(98,1,0),wet1=draw(98,1,2),frost0=draw(98,3,0),frost1=draw(98,3,2);
      return {dryStill:dry0===dry1,wetMoves:wet0!==wet1,winterStill:frost0===frost1,identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha};
    });
    assert.deepEqual(findings.reflections,{dryStill:true,wetMoves:true,winterStill:true,identity:true,alpha:1});
    // Care changes materials in the live garden without spending time or money.
    await page.setViewportSize({width:1280,height:1000});
    await patch({moisture:22.5,grid:baseGrid,day:14});await waitForCanvas();
    const before=JSON.parse(await state());
    await page.locator('[data-play-water]').click();await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenSoilCondition==='moist');
    const after=JSON.parse(await state());
    assert.equal(after.moisture,47.5);assert.equal(after.day,before.day);assert.equal(after.budget,before.budget);
    assert.deepEqual(after.grid.map(c=>c.growthDay),before.grid.map(c=>c.growthDay));
    assert.match(await canvas.getAttribute('aria-label'),/Moist soil, 48% moisture/);
    await canvas.screenshot({path:path.join(out,'garden-soil-after-care-1280.png')});
    await patch({moisture:90});await waitForCanvas();
    assert.equal(await page.locator('[data-play-water]').isDisabled(),true);
    assert.match(await canvas.getAttribute('aria-label'),/Saturated soil.*Let the soil drain/);
    await page.evaluate(()=>{window.savedRandom=Math.random;Math.random=()=>.99;});
    await page.locator('[data-play-primary]').click();await waitForCanvas();
    await page.evaluate(()=>{Math.random=window.savedRandom;});
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenSoilCondition==='moist');
    const drained=JSON.parse(await state());
    assert.ok(drained.moisture<90&&drained.moisture>85);assert.equal(drained.day,15);
    assert.equal(await page.locator('[data-play-water]').isDisabled(),false);
    await patch({moisture:98,playGardenLens:'care'});await waitForCanvas();
    await canvas.screenshot({path:path.join(out,'garden-soil-care-lens-1280.png')});
    await patch({playGardenLens:'natural'});
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();await waitForCanvas();
    await canvas.screenshot({path:path.join(out,'garden-soil-maximized-1280.png')});
    await page.getByRole('button',{name:'Exit maximized garden view',exact:true}).click();
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-care-tray]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;cpRoot.unmount();});
    await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._cgBedLayer),null);
    assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Materials follow real moisture and watered plots without changing garden state','Dry and saturated guidance shares the watering cutoff','Actual watering removes dry soil immediately without growth, time, or budget changes','Next day drainage clears saturation','Independent water reflections stop in winter','Cached materials match fresh painting and release on unmount','Desktop, phone, night, winter, care lens, and maximized views');
    fs.writeFileSync(path.join(out,'soil-scene-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});