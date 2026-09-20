// Run from the repository root: node dev-tools/companion_planting_care_motion_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, care: companionCareMoment, paintCare: companionPaintCare, moment: companionPlantingMoment, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
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
    for(const [index,plantId,pests] of [[0,'corn',43],[1,'beans',0],[2,'sunflower',0],[4,'marigold',12],[5,'tomato',0],[6,'dill',0],[8,'squash',0],[9,'borage',7],[12,'clover',0],[14,'rain_barrel',0]])grid[index]={...grid[index],plantId,growthDay:38,pests};
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    await patch({grid,day:35,phase:'grow',moisture:35,nitrogen:40,phosphorus:40,potassium:40,organicMatter:3,budget:40,beneficialPop:15,playGardenLens:'natural',reducedMotion:true});
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]'),tray=page.locator('[data-care-tray]');
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&+__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    await waitForCanvas();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenPlantedCount==='10');
    const beforeCare=await state();
    await tray.locator('[data-play-water]').click();await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl._cgFrameState.cg.lastCareAction?.id==='water'&&__cgCanvasEl._actionBurst===null);
    assert.equal((await state()).moisture,60);
    assert.equal(await canvas.getAttribute('data-garden-care-kind'),'');
    await tray.locator('[data-play-weed]').click();await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl._cgFrameState.cg.lastCareAction?.id==='weed');
    assert.deepEqual((await state()).grid.map(cell=>cell.pests),[23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    await tray.locator('[data-play-compost]').click();await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl._cgFrameState.cg.lastCareAction?.id==='compost');
    const afterCare=await state();assert.equal(afterCare.nitrogen,55);assert.equal(afterCare.day,beforeCare.day);assert.equal(afterCare.budget,beforeCare.budget);
    assert.deepEqual(afterCare.grid.map(cell=>[cell.growthDay,cell.health]),beforeCare.grid.map(cell=>[cell.growthDay,cell.health]));
    // Advance only the drawing clock to verify deferred start, expiry, and state guards.
    findings.lifecycle=await canvas.evaluate(el=>{
      const frame=el._cgFrameState,ctx=el.getContext('2d'),nativeNow=performance.now;let now=10000;performance.now=()=>now;
      try{
        const record={day:frame.day,id:'weed'},base={...frame,cg:{...frame.cg,lastCareAction:record}};
        const make=()=>({kind:'weed',day:frame.day,t0:null,plots:[{index:0,plantId:'corn'},{index:4,plantId:'marigold'},{index:9,plantId:'borage'}]});
        el._actionBurst=make();now+=20000;const beforeFirstDraw=el._actionBurst.t0===null;
        const first=cpVisualQA.care(el,base,false),starts=first.age===0&&el._actionBurst.t0===now;
        now+=800;const advances=cpVisualQA.care(el,base,false).age===.8;
        now+=1400;const expires=cpVisualQA.care(el,base,false)===null&&el._actionBurst===null;
        const cancels=(change,reduced=false)=>{el._actionBurst=make();const result=cpVisualQA.care(el,{...base,...change},reduced);return result===null&&el._actionBurst===null;};
        const changed=base.grid.map((cell,index)=>index===0?{...cell,plantId:'radish'}:index===9?{...cell,plantId:null}:cell);
        el._actionBurst=make();const pruned=cpVisualQA.care(el,{...base,grid:changed},false).plots.map(item=>item.index);
        el._actionBurst={...make(),plots:[null,{index:-1},{index:16},{index:4,plantId:'marigold'},{index:4,plantId:'marigold'}]};
        const valid=cpVisualQA.care(el,base,false).plots.map(item=>item.index);
        const result={beforeFirstDraw,starts,advances,expires,pruned,valid,reduced:cancels({},true),
          nextDay:cancels({day:frame.day+1}),receiptChanged:cancels({cg:{...base.cg,lastCareAction:{day:frame.day,id:'water'}}}),
          receiptCleared:cancels({cg:{...base.cg,lastCareAction:null}}),preview:cancels({placementPreview:{plot:7,plantId:'lettuce'}}),
          allRemoved:cancels({grid:base.grid.map(cell=>({...cell,plantId:null}))})};
        el._actionBurst={kind:'harvest',t0:now};cpVisualQA.care(el,base,true);result.harvestUntouched=el._actionBurst.kind==='harvest';el._actionBurst=null;return result;
      }finally{performance.now=nativeNow;}
    });
    assert.deepEqual(findings.lifecycle.pruned,[4]);assert.deepEqual(findings.lifecycle.valid,[4]);
    for(const [key,value] of Object.entries(findings.lifecycle))if(!['pruned','valid'].includes(key))assert.equal(value,true,key);
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await waitForCanvas();
      const saved=await state(),signatures=[];
      for(const kind of ['water','weed','compost']){
        const check=await canvas.evaluate((el,kind)=>{
          const ctx=el.getContext('2d'),frame=el._cgFrameState;
          const testFrame={...frame,cg:{...frame.cg,lastCareAction:{id:kind,day:frame.day}}};
          const plots=kind==='weed'?[{index:0,plantId:'corn'},{index:4,plantId:'marigold'},{index:9,plantId:'borage'}]:Array.from({length:16},(_,index)=>({index}));
          const draw=(age,reduced)=>{el._actionBurst={kind,day:frame.day,t0:performance.now()-age*1000,plots};cpVisualQA.scene(ctx,el,React,testFrame,cpVisualQA.plants,cpVisualQA.relationships,0,reduced);};
          const nativeNow=performance.now,fixedNow=nativeNow.call(performance);performance.now=()=>fixedNow;
          try{
            draw(.55,false);const animated=el.toDataURL();const targeted=el.dataset.gardenCarePlots;
            draw(.95,false);const changed=animated!==el.toDataURL();
            draw(.55,false);const cached=el.toDataURL();el._cgBedLayer.key=null;draw(.55,false);const fresh=cached===el.toDataURL();
            draw(.55,true);const still=el.toDataURL();draw(1.1,true);const reducedStable=still===el.toDataURL()&&el._actionBurst===null;
            draw(kind==='compost'?.75:.55,false);
            return {kind,targeted,changed,fresh,reducedStable,identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha,signature:el.toDataURL().slice(-320)};
          }finally{performance.now=nativeNow;}
        },kind);
        assert.equal(check.targeted,kind==='weed'?'0,4,9':Array.from({length:16},(_,i)=>i).join(','));
        for(const key of ['changed','fresh','reducedStable','identity'])assert.equal(check[key],true,kind+' '+key);assert.equal(check.alpha,1);
        signatures.push(check.signature);delete check.signature;
        await canvas.screenshot({path:path.join(out,`garden-care-${kind}-${width}.png`),style:".cp-play-nav{position:static!important}"});
        findings.viewports.push({width,...check});
      }
      assert.equal(new Set(signatures).size,3);assert.deepEqual(await state(),saved);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    // Detail sheet is built from the same rendering helper, so each treatment can be reviewed closely.
    await page.setViewportSize({width:1280,height:1000});
    await page.evaluate(()=>{
      const sheet=document.createElement('canvas');sheet.id='care-art-review';sheet.width=960;sheet.height=330;document.body.appendChild(sheet);const ctx=sheet.getContext('2d');
      ctx.fillStyle='#edf0df';ctx.fillRect(0,0,960,330);
      ['water','weed','compost'].forEach((kind,index)=>{
        const x=index*320+160,y=185;ctx.beginPath();ctx.moveTo(x,y-70);ctx.lineTo(x+145,y);ctx.lineTo(x,y+70);ctx.lineTo(x-145,y);ctx.closePath();ctx.fillStyle='#b79a6b';ctx.fill();
        ctx.beginPath();ctx.moveTo(x,y-60);ctx.lineTo(x+128,y);ctx.lineTo(x,y+60);ctx.lineTo(x-128,y);ctx.closePath();ctx.fillStyle='#70563a';ctx.fill();
        cpVisualQA.paintCare(ctx,kind,{x,y},290,140,0,kind==='weed'?.28:kind==='water'?.38:.55);
        ctx.fillStyle='#40533a';ctx.textAlign='center';ctx.font='600 20px system-ui';ctx.fillText(['Water · soak and splash','Weed · lift and clear','Compost · crumble and settle'][index],x,290);
      });
    });
    await page.locator('#care-art-review').screenshot({path:path.join(out,'garden-care-motion-artwork.png')});
    await page.evaluate(()=>document.getElementById('care-art-review').remove());
    // Test a real action while the canvas is offscreen, then let the observer resume it.
    await page.setViewportSize({width:320,height:844});await patch({moisture:35,lastCompostDay:null,reducedMotion:false});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>!__cgCanvasEl._cgFrameState.reducedMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
    await tray.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgVisible===false);
    const deferred=await page.evaluate(()=>{
      // Activate the real button without Playwright scrolling it back toward the canvas first.
      document.querySelector('[data-play-water]').click();
      return {visible:__cgCanvasEl._cgVisible,kind:__cgCanvasEl._actionBurst?.kind,t0:__cgCanvasEl._actionBurst?.t0};
    });
    assert.deepEqual(deferred,{visible:false,kind:'water',t0:null});
    await page.waitForFunction(()=>cpData.companionPlanting.communityGarden.moisture===60);
    await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenCareKind==='water'&&typeof __cgCanvasEl._actionBurst?.t0==='number');
    await page.waitForFunction(()=>__cgCanvasEl._actionBurst===null&&__cgCanvasEl.dataset.gardenCareKind==='');
    findings.offscreenStart=true;
    await patch({reducedMotion:true});await waitForCanvas();
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-care-tray]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;retiredGarden._actionBurst={kind:'water',day:35,t0:null,plots:[{index:0}]};cpRoot.unmount();});await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._actionBurst),null);assert.equal(await page.evaluate(()=>retiredGarden._cgAnim),null);assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Care keeps real moisture, nutrient, and pest changes with unchanged health, time, and funds','Whole-soil treatments reach all beds; weeds animate only changed plots','Distinct water, weed, and compost artwork at desktop and 320px','Deferred care starts when the offscreen garden becomes visible and expires after 2.2 seconds','Changed receipt, day, preview, reduced motion, removed crops, and unmount cancel safely','Cached and fresh scenes match and restore canvas transforms and opacity','Scoped accessibility and mobile containment pass');
    fs.writeFileSync(path.join(out,'care-motion-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});