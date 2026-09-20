// Run from the repository root: node dev-tools/companion_planting_readiness_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { ready: companionHarvestReady, readiness: companionReadinessMoment, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, care: companionCareMoment, paintCare: companionPaintCare, moment: companionPlantingMoment, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
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
    for(const [index,plantId,growthDay,health,pests] of [[0,'corn',89.9,100,0],[1,'beans',200,100,0],[2,'sunflower',200,20,0],[4,'marigold',200,35,0],[5,'tomato',200,100,50],[6,'dill',4,100,0],[8,'squash',200,100,0],[9,'borage',200,100,0],[12,'clover',200,100,0],[14,'rain_barrel',200,100,0]])grid[index]={...grid[index],plantId,growthDay,health,pests};
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&+__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    await patch({grid,day:35,phase:'grow',moisture:60,nitrogen:50,phosphorus:50,potassium:50,organicMatter:5,budget:40,beneficialPop:18,playGardenLens:'natural',reducedMotion:true});
    await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenReadyPlots==='1,4,5,8,9,12');
    assert.equal(await page.locator('[data-play-ready-guide="6"]').count(),1);
    assert.match(await canvas.getAttribute('aria-label'),/6 crops are ready to harvest/);
    findings.lifecycle=await canvas.evaluate(el=>{
      const frame=el._cgFrameState,nativeNow=performance.now;let now=10000;performance.now=()=>now;
      const plots=[1,4,5,8,9,12],ready=frame.grid.map(cell=>cpVisualQA.ready(cpVisualQA.plants[cell.plantId],cell));
      const report={day:36,plotChanges:plots.map(index=>({index,beforeReady:false,afterReady:true,afterPlantId:frame.grid[index].plantId}))};
      const base={...frame,day:36,cg:{...frame.cg,lastDayReport:report}},make=()=>({_cgReadyDay:35});
      try{
        const c=make();const first=cpVisualQA.readiness(c,base,ready,false);now+=600;const middle=cpVisualQA.readiness(c,base,ready,false);now+=900;
        const expires=cpVisualQA.readiness(c,base,ready,false)===null&&c._cgReadyBurst===null;
        const quiet=(change={},canvas={})=>cpVisualQA.readiness(canvas,{...base,...change},ready,false)===null&&canvas._cgReadyBurst==null;
        const cancel=(change={},reduced=false,nextReady=ready)=>{const c=make();cpVisualQA.readiness(c,base,ready,false);return cpVisualQA.readiness(c,{...base,...change},nextReady,reduced)===null&&c._cgReadyBurst===null;};
        const changed=base.grid.map((cell,index)=>index===1?{...cell,plantId:'radish'}:index===4?{...cell,plantId:null}:cell),c2=make();
        cpVisualQA.readiness(c2,base,ready,false);const pruned=cpVisualQA.readiness(c2,{...base,grid:changed},ready,false).plots.map(item=>item.index);
        const malformed={...report,plotChanges:[null,{index:-1},{index:16},...report.plotChanges,report.plotChanges[0],{index:0,beforeReady:false,afterReady:true,afterPlantId:'corn'}]};
        const valid=cpVisualQA.readiness(make(),{...base,cg:{...base.cg,lastDayReport:malformed}},ready,false).plots.map(item=>item.index);
        return {starts:first.progress===0,advances:middle.progress===.4,expires,pruned,valid,
          restored:quiet(),sameDay:quiet({}, {_cgReadyDay:36}),rewind:quiet({}, {_cgReadyDay:37}),skippedDays:quiet({}, {_cgReadyDay:30}),
          noReport:quiet({cg:{...base.cg,lastDayReport:null}},make()),staleReport:quiet({cg:{...base.cg,lastDayReport:{...report,day:35}}},make()),yearReset:quiet({cg:{...base.cg,lastDayReport:{...report,yearReset:true}}},make()),
          reduced:cancel({},true),preview:cancel({placementPreview:{plot:3,plantId:'lettuce'}}),careLens:cancel({lens:{id:'care'}}),nextDay:cancel({day:37}),noLongerReady:cancel({},false,ready.map(()=>false))};
      }finally{performance.now=nativeNow;}
    });
    assert.deepEqual(findings.lifecycle.pruned,[5,8,9,12]);assert.deepEqual(findings.lifecycle.valid,[1,4,5,8,9,12]);
    for(const [key,value] of Object.entries(findings.lifecycle))if(!['pruned','valid'].includes(key))assert.equal(value,true,key);
    const drawChecks=()=>canvas.evaluate(el=>{
      const ctx=el.getContext('2d'),frame=el._cgFrameState,labels=[],native=ctx.fillText;
      ctx.fillText=function(text,x,y,...args){if(/^\d\d ✓/.test(text))labels.push({text,x,y,w:ctx.measureText(text).width+24,h:parseFloat(ctx.font.match(/([\d.]+)px/)[1])+18});return native.call(this,text,x,y,...args);};
      try{cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,0,true);}finally{ctx.fillText=native;}
      const still=el.toDataURL();cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,60,true);const reducedStable=still===el.toDataURL();
      el._cgBedLayer.key=null;cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,0,true);
      const overlap=labels.some((a,i)=>labels.slice(i+1).some(b=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2));
      return {labels:labels.map(item=>item.text),overlap,reducedStable,fresh:still===el.toDataURL(),identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha};
    });
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await waitForCanvas();
      const before=await state(),checks=await drawChecks();
      assert.equal(checks.labels.length,6);assert.ok(checks.labels.includes('05 ✓ · ! 35%'));assert.ok(checks.labels.includes('06 ✓ · Pests'));
      for(const key of ['reducedStable','fresh','identity'])assert.equal(checks[key],true,key);assert.equal(checks.alpha,1);assert.equal(checks.overlap,false);
      await canvas.screenshot({path:path.join(out,`garden-ready-${width}.png`),style:'.cp-play-nav{position:static!important}'});
      await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,66,false));
      await canvas.screenshot({path:path.join(out,`garden-ready-night-${width}.png`),style:'.cp-play-nav{position:static!important}'});
      const review=page.locator('[data-play-ready-review]');await review.focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-play-lens-inspect]'));
      const target=await page.locator('[data-play-lens-inspect]').getAttribute('data-play-lens-inspect');
      assert.ok([1,4,5,8,9,12].includes(Number(target)));await page.keyboard.press('Enter');await page.locator(`[data-play-focus="${target}"]`).waitFor();
      await page.locator('[data-play-focus-close]').click();await page.waitForFunction(()=>document.activeElement.matches('[data-play-lens-inspect]'));
      assert.ok(await page.evaluate(()=>document.activeElement.getBoundingClientRect().top>=document.querySelector('.cp-play-nav').getBoundingClientRect().bottom));
      for(const key of ['grid','day','budget','moisture'])assert.deepEqual((await state())[key],before[key]);
      await patch({playGardenLens:'natural'});await waitForCanvas();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.locator('[data-play-garden-views]').screenshot({path:path.join(out,`garden-ready-controls-${width}.png`),style:'.cp-play-nav{position:static!important}'});
      findings.viewports.push({width,...checks,keyboardRoundTrip:true});
    }
    const full=empty().map((cell,index)=>({...cell,plantId:['corn','beans','sunflower','tomato','marigold','lettuce','radish','carrot'][index%8],growthDay:200,health:index%3===0?35:100,pests:index%3===1?45:0}));
    await patch({grid:full});await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenReadyPlots.split(',').length===16);
    findings.dense=await drawChecks();assert.equal(findings.dense.labels.length,16);assert.equal(findings.dense.overlap,false);
    await canvas.screenshot({path:path.join(out,'garden-ready-dense-320.png'),style:'.cp-play-nav{position:static!important}'});
    await patch({phase:'plan',grid,plantingTarget:3,selectedPlant:'lettuce',placementPreview:{plot:3,plantId:'lettuce'}});await waitForCanvas();
    assert.equal(await page.locator('[data-play-ready-review]').count(),0);
    // A real next-day result starts the cue; freezing only its drawing clock makes the frame deterministic.
    await page.setViewportSize({width:1280,height:1000});
    const young=empty();young[5]={...young[5],plantId:'radish',growthDay:24.9};
    await patch({grid:young,day:0,year:1,phase:'grow',moisture:60,lastDayReport:null,placementPreview:null,plantingTarget:null,selectedPlant:null,relationshipFocus:null,activeEvent:null,reducedMotion:true});await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl._cgReadyDay===0&&__cgCanvasEl.dataset.gardenReadyPlots==='');
    await page.emulateMedia({reducedMotion:'no-preference'});await patch({reducedMotion:false});await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!__cgCanvasEl._cgFrameState.reducedMotion&&__cgCanvasEl._cgVisible);
    await page.evaluate(()=>{window.cpNativeNow=performance.now;window.cpFixedNow=performance.now();performance.now=()=>cpFixedNow;Math.random=()=>.99;document.querySelector('[data-play-primary]').click();});
    await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenNewlyReady==='5');
    const afterDay=await state();assert.equal(afterDay.day,1);assert.equal(afterDay.lastDayReport.plotChanges[5].beforeReady,false);assert.equal(afterDay.lastDayReport.plotChanges[5].afterReady,true);
    await page.evaluate(()=>{cpFixedNow+=600;__cgCanvasEl._cgRequestDraw();});await page.waitForFunction(()=>__cgCanvasEl._cgReadyBurst&&performance.now()-__cgCanvasEl._cgReadyBurst.t0===600);
    await canvas.screenshot({path:path.join(out,'garden-newly-ready-1280.png'),style:'.cp-play-nav{position:static!important}'});
    await page.evaluate(()=>{cpFixedNow+=901;__cgCanvasEl._cgRequestDraw();});await page.waitForFunction(()=>__cgCanvasEl._cgReadyBurst===null&&__cgCanvasEl.dataset.gardenNewlyReady==='');
    assert.deepEqual(await state(),afterDay);findings.realDayCue=true;
    await page.evaluate(()=>{performance.now=cpNativeNow;});await patch({reducedMotion:true});await waitForCanvas();
    // Real harvest immediately removes readiness and still leads into the replanting loop.
    await page.locator('[data-play-primary]').click();await page.locator('[data-play-harvest-receipt]').waitFor();await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenReadyPlots==='');assert.equal(await page.locator('[data-play-ready-review]').count(),0);
    await page.locator('[data-play-harvest-next]').click();await page.waitForFunction(()=>cpData.companionPlanting.communityGarden.phase==='plan');findings.harvestReplant=true;
    await patch({grid,phase:'grow',placementPreview:null,plantingTarget:null,selectedPlant:null,playGardenLens:'natural'});await waitForCanvas();
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-play-garden-views]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;retiredGarden._cgReadyBurst={day:1,t0:performance.now(),plots:[{index:1,plantId:'beans'}]};cpRoot.unmount();});await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._cgReadyBurst),null);assert.equal(await page.evaluate(()=>retiredGarden._cgReadyDay),null);assert.equal(await page.evaluate(()=>retiredGarden._cgAnim),null);assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Gold labels match exact harvest eligibility and coexist with health and pest tags','Keyboard harvest guidance and inspection preserve state and return focus below navigation','Mixed and 16-ready-crop gardens have no overlapping labels on a 320px screen','Only fresh sequential day reports start the finite readiness cue; saves, rewinds, skips, and year resets remain quiet','Reduced motion, views, previews, readiness loss, crop replacement, expiry, and unmount cancel safely','Real day advancement, harvest, and replant routes work with unchanged mechanics','Cached and fresh scenes agree, reduced motion is stable, and context state and mobile containment are preserved');
    fs.writeFileSync(path.join(out,'readiness-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});