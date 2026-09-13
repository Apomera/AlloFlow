// Run from the repository root: node dev-tools/companion_planting_placement_scene_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, moment: companionPlantingMoment, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
    source = source.replace('          // Plant portraits and field-guide details', '          window.cpVisualQA.plants = CG_PLANTS;\n          // Plant portraits and field-guide details');
    source = source.replace('          function getCellBonus(grid, idx) {', '          window.cpVisualQA.relationships = CG_COMPANIONS;\n          function getCellBonus(grid, idx) {');
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
    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    const grid=empty();
    for(const [index,plantId] of [[0,'corn'],[1,'onion'],[2,'sunflower'],[5,'tomato'],[6,'marigold'],[8,'squash'],[9,'basil'],[13,'lavender']])grid[index]={...grid[index],plantId,growthDay:45};
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    await patch({grid,day:35,phase:'plan',moisture:60,nitrogen:50,budget:40,beneficialPop:15,plantingTarget:4,selectedPlant:'beans',placementPreview:{plot:4,plantId:'beans'},playGardenLens:'natural',reducedMotion:true});
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]'),dock=page.locator('[data-planting-dock-surface="simulation"]');
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&+__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenPreviewPlant==='beans');
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await waitForCanvas();
      const before=await state();
      await dock.locator('[data-preview-show-garden]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement===__cgCanvasEl);
      assert.match(await canvas.getAttribute('aria-label'),/Previewing Beans in Plot 5. Not planted/);
      const check=await canvas.evaluate(el=>{
        const ctx=el.getContext('2d'),frame=el._cgFrameState,draw=(time,reduced,change={})=>cpVisualQA.scene(ctx,el,React,{...frame,...change},cpVisualQA.plants,cpVisualQA.relationships,time,reduced);
        draw(0,true);const still=el.toDataURL();draw(60,true);const stable=still===el.toDataURL();
        el._cgBedLayer.key=null;draw(0,true);return {stable,fresh:still===el.toDataURL(),identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha,preview:el.dataset.gardenPreviewPlot,selected:el.dataset.gardenSelectedPlot};
      });
      assert.equal(check.stable,true);assert.equal(check.fresh,true);assert.equal(check.identity,true);assert.equal(check.alpha,1);assert.equal(check.preview,'4');assert.equal(check.selected,'-1');
      await canvas.screenshot({path:path.join(out,`garden-placement-preview-${width}.png`)});
      await page.locator('[data-play-preview-return="4"]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-planting-dock-surface="simulation"] [data-confirm-placement-preview]'));
      const focusTop=await page.evaluate(()=>document.activeElement.getBoundingClientRect().top-document.querySelector('.cp-play-nav').getBoundingClientRect().bottom);
      assert.ok(focusTop>=0,'preview return clears the sticky navigation');assert.deepEqual(await state(),before);
      await dock.locator('[data-placement-preview]').screenshot({path:path.join(out,`garden-placement-controls-${width}.png`),style:'.cp-play-nav{position:static!important}'});
      await waitForCanvas();await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,66,false));
      await canvas.screenshot({path:path.join(out,`garden-placement-night-${width}.png`)});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      findings.viewports.push({width,keyboardRoundTrip:true,focusTop,...check});
    }
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();await waitForCanvas();
    await page.locator('[data-play-preview-return="4"]').click();
    await page.waitForFunction(()=>cpData.companionPlanting.communityGarden.maximized===false&&document.activeElement.matches('[data-confirm-placement-preview]'));
    assert.equal((await state()).grid[4].plantId,null);
    // A restored preview owns its crop identity even if the last selected packet differs.
    await patch({selectedPlant:'radish'});await waitForCanvas();
    assert.equal(await canvas.getAttribute('data-garden-preview-plant'),'beans');
    findings.previewGuards=await canvas.evaluate(el=>{
      const frame=el._cgFrameState,draw=change=>{cpVisualQA.scene(el.getContext('2d'),el,React,{...frame,...change},cpVisualQA.plants,cpVisualQA.relationships,0,true);return el.dataset.gardenPreviewPlot;};
      const occupied=frame.grid.map((cell,index)=>index===4?{...cell,plantId:'lettuce'}:cell);
      const results=[draw({phase:'grow'}),draw({placementPreview:{plot:99,plantId:'beans'}}),draw({placementPreview:{plot:4,plantId:'unknown'}}),draw({grid:occupied})];draw({});return results;
    });assert.deepEqual(findings.previewGuards,['-1','-1','-1','-1']);
    // First planting has the same return route even without any other crops.
    await patch({grid:empty(),selectedPlant:'beans'});await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenPlantedCount==='0');
    assert.equal(await page.locator('[data-play-preview-return="4"]').isVisible(),true);
    const beforePlant=await state();await dock.locator('[data-confirm-placement-preview]').click();
    await page.waitForFunction(()=>cpData.companionPlanting.communityGarden.grid[4].plantId==='beans'&&document.activeElement===__cgCanvasEl);
    await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenPreviewPlot==='-1');
    const planted=await state();assert.equal(planted.grid[4].growthDay,0);assert.equal(planted.day,beforePlant.day);assert.ok(planted.budget<beforePlant.budget);
    assert.equal(await canvas.evaluate(el=>el._plantBurst),null,'reduced motion clears the moment');
    assert.equal(await page.locator('[data-play-preview-return]').count(),0);
    // Deterministic checkpoints show the seed descending, soil settling, and the scene returning to stillness.
    await patch({grid:grid.map((cell,index)=>index===4?{plantId:'beans',growthDay:0,health:100,watered:false,pests:0}:cell)});
    await page.setViewportSize({width:1280,height:1000});await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenPlantedCount==='9');
    const saved=await state();
    findings.moment=await canvas.evaluate(el=>{
      const ctx=el.getContext('2d'),frame=el._cgFrameState,nativeNow=performance.now;let clock=10000;
      performance.now=()=>clock;
      try{
        const burst=()=>({idx:4,plantId:'beans',day:frame.day,t0:null}),draw=(change={},reduced=false)=>cpVisualQA.scene(ctx,el,React,{...frame,...change},cpVisualQA.plants,cpVisualQA.relationships,0,reduced);
        el._cgGrowthStates[4]={id:"beans",value:1,from:1,to:1,started:clock};
        el._plantBurst=burst();draw();const starts=el._plantBurst.t0===clock,seedStage=el._cgGrowthStates[4].value===0,first=el.toDataURL();
        clock+=620;draw();const settles=first!==el.toDataURL();clock+=800;draw();const expires=el._plantBurst===null&&el.dataset.gardenPlantingPlot==='-1';
        const canceled=change=>{el._plantBurst=burst();draw(change);return el._plantBurst===null;};
        const results={starts,seedStage,settles,expires,changedCrop:canceled({grid:frame.grid.map((cell,index)=>index===4?{...cell,plantId:'radish'}:cell)}),
          removed:canceled({grid:frame.grid.map((cell,index)=>index===4?{...cell,plantId:null}:cell)}),dayAdvanced:canceled({day:frame.day+1}),
          growthAdvanced:canceled({grid:frame.grid.map((cell,index)=>index===4?{...cell,growthDay:.1}:cell)}),preview:canceled({placementPreview:{plot:10,plantId:'radish'}})};
        el._plantBurst=burst();draw({},true);results.reduced=el._plantBurst===null;
        // Structures have the same finite installation response without a falling seed.
        el._plantBurst={idx:4,plantId:'bee_hotel',day:frame.day,t0:null};draw({grid:frame.grid.map((cell,index)=>index===4?{...cell,plantId:'bee_hotel'}:cell)});results.structure=el.dataset.gardenPlantingPlot==='4';
        el._plantBurst=null;draw({},true);results.identity=ctx.getTransform().isIdentity;results.alpha=ctx.globalAlpha;return results;
      }finally{performance.now=nativeNow;}
    });
    assert.ok(Object.entries(findings.moment).every(([key,value])=>key==='alpha'?value===1:value===true),JSON.stringify(findings.moment));assert.deepEqual(await state(),saved);
    for(const [name,age] of [['seed-fall',.18],['seed-settle',.55],['seed-planted',1]]){
      await canvas.evaluate((el,age)=>{
        const now=performance.now();el._plantBurst={idx:4,plantId:'beans',day:el._cgFrameState.day,t0:now-age*1400};
        cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,0,false);
      },age);
      await canvas.screenshot({path:path.join(out,`garden-${name}-1280.png`)});
    }
    // Exercise the real confirmation-to-canvas handoff with animation enabled.
    await page.emulateMedia({reducedMotion:'no-preference'});
    await patch({grid:empty(),plantingTarget:4,selectedPlant:'beans',placementPreview:{plot:4,plantId:'beans'},reducedMotion:false});
    await dock.locator('[data-confirm-placement-preview]').click();
    await page.waitForFunction(()=>document.activeElement===__cgCanvasEl&&__cgCanvasEl._plantBurst&&typeof __cgCanvasEl._plantBurst.t0==='number');
    await page.waitForFunction(()=>__cgCanvasEl._plantBurst===null);
    assert.equal(await canvas.getAttribute('data-garden-planting-plot'),'-1');
    findings.liveConfirmation=true;
    await page.emulateMedia({reducedMotion:'reduce'});await patch({reducedMotion:true});
    await patch({grid:empty(),plantingTarget:4,selectedPlant:'bee_hotel',placementPreview:{plot:4,plantId:'bee_hotel'},readableMode:true});
    await page.setViewportSize({width:320,height:844});await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenPreviewPlant==='bee_hotel');
    await canvas.screenshot({path:path.join(out,'garden-placement-habitat-320.png')});
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-play-garden-views]','[data-placement-preview]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;retiredGarden._plantBurst={idx:4,plantId:'beans',day:35,t0:null};cpRoot.unmount();});await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._plantBurst),null);assert.equal(await page.evaluate(()=>retiredGarden._cgAnim),null);assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Preview identity, dashed outline, and future-shape label remain distinct from planted crops','Keyboard preview-to-garden round trip preserves state and exits maximized view','First planting keeps a visible return route','Only confirmed planting spends funds and keeps seed growth at zero','Seed descent and soil settling expire after 1.4 seconds','Changed crop, growth, day, preview, reduced motion, and unmount cancel effects','Desktop, phone, large text, night, habitat, caches, and accessibility pass');
    fs.writeFileSync(path.join(out,'placement-scene-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});