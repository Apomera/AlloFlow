// Run from the repository root: node dev-tools/companion_planting_botanical_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const ids=['corn','tomato','carrot','lettuce','beans','pepper','squash','lavender','cucumber','radish','onion','basil','strawberry','marigold','borage','rain_barrel'];
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    await page.evaluate(ids=>{
      const plants=cpVisualQA.plants;
      cpSetData({companionPlanting:{gardenMode:'community',communityGarden:{day:44,phase:'grow',moisture:60,nitrogen:50,beneficialPop:12,budget:40,totalHarvested:5,reducedMotion:true,
        grid:ids.map((plantId,i)=>({plantId,growthDay:i===13?0:plants[plantId].days,health:i===14?20:98,pests:0,watered:false}))}}});
    },ids);
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenReadyCount==='13'&&__cgCanvasEl._cgAnim===null);
    await canvas.screenshot({path:path.join(out,'garden-harvest-before-1280.png')});
    await page.emulateMedia({reducedMotion:'no-preference'});await patch({reducedMotion:false});
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenMotion==='animated');
    // Trigger the actual control without scrolling the garden away during the collection.
    await page.evaluate(()=>document.querySelector('[data-play-primary]').click());
    await page.waitForFunction(()=>__cgCanvasEl._actionBurst&&__cgCanvasEl._actionBurst.kind==='harvest');
    const snapshot=await page.evaluate(()=>{
      window.harvestSceneBurst=JSON.parse(JSON.stringify(__cgCanvasEl._actionBurst));
      return {plots:harvestSceneBurst.plots,batch:cpData.companionPlanting.communityGarden.lastHarvestBatch,grid:cpData.companionPlanting.communityGarden.grid};
    });
    assert.deepEqual(snapshot.plots.map(p=>p.index),Array.from({length:13},(_,i)=>i));
    assert.equal(snapshot.batch.cropCount,13);
    assert.equal(snapshot.grid[12].plantId,'strawberry');assert.equal(snapshot.grid[12].growthDay,0);
    assert.equal(snapshot.grid[13].plantId,'marigold');assert.equal(snapshot.grid[14].health,20);assert.equal(snapshot.grid[15].plantId,'rain_barrel');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl._cgFrameState.cg.lastHarvestBatch&&__cgCanvasEl._cgFrameState.cg.lastHarvestBatch.id===harvestSceneBurst.batchId);
    const freeze=async(age,reduced=false,time=0)=>canvas.evaluate((el,{age,reduced,time})=>{
      cancelAnimationFrame(el._cgAnim);el._cgAnim=null;el._cgVisible=false;
      el._actionBurst={...harvestSceneBurst,t0:performance.now()-age*1000};
      cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,[],time,reduced);
      return {count:+el.dataset.gardenBasketCount,collecting:+el.dataset.gardenCollectionCount,label:el.dataset.gardenBasketLabel,transform:el.getContext('2d').getTransform().isIdentity,alpha:el.getContext('2d').globalAlpha};
    },{age,reduced,time});
    const initialState=await page.evaluate(()=>JSON.stringify(cpData));
    for(const age of [.15,.65,1.25,2.3]){
      const result=await freeze(age);
      assert.equal(result.count,13);assert.equal(result.transform,true);assert.equal(result.alpha,1);
      assert.equal(result.collecting,age<2.2?13:0);
      await canvas.screenshot({path:path.join(out,'garden-collecting-'+String(age).replace('.','-')+'-1280.png')});
    }
    await freeze(0,true);
    const still=await canvas.evaluate(el=>el.toDataURL());
    await freeze(1.1,true,78);
    assert.equal(await canvas.evaluate(el=>el.toDataURL()),still,'reduced-motion harvest has a still basket');
    assert.equal(await canvas.evaluate(el=>el._actionBurst),null);
    assert.equal(await page.evaluate(()=>JSON.stringify(cpData)),initialState,'rendering leaves the saved garden unchanged');
    assert.match(await canvas.getAttribute('aria-label'),/Last harvest:.*Corn.*Strawberry/);
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>__cgCanvasEl.width===__cgCanvasEl.offsetWidth*2);
      await freeze(2.3,true);
      await canvas.screenshot({path:path.join(out,'garden-harvest-basket-'+width+'.png')});
      const box=await canvas.boundingBox();
      const basketBounds=await canvas.evaluate(el=>{
        const tw=+el.dataset.gardenTileWidth,th=+el.dataset.gardenTileHeight,oy=+el.dataset.gardenOriginY,s=Math.max(.95,Math.min(2.15,tw/150));
        const x=el.width/2+(2.9-4.85)*tw/2,y=oy+(4.85+2.9)*th/2;
        return {left:x-45*s,right:x+45*s,top:y-60*s,bottom:y+45*s,width:el.width,height:el.height};
      });
      assert.ok(basketBounds.left>=0&&basketBounds.right<=basketBounds.width&&basketBounds.top>=0&&basketBounds.bottom<=basketBounds.height,JSON.stringify(basketBounds));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      findings.viewports.push({width,canvas:box,basket:basketBounds});
    }
    await freeze(.65,false);
    await canvas.screenshot({path:path.join(out,'garden-collecting-mobile-320.png')});
    await freeze(2.3,false,66);
    await canvas.screenshot({path:path.join(out,'garden-harvest-night-320.png')});
    // Invalidated records cancel a previous collection, rather than painting it over a reset garden.
    const mismatch=await canvas.evaluate(el=>{
      el._actionBurst={...harvestSceneBurst,t0:performance.now()};
      const frame={...el._cgFrameState,cg:{...el._cgFrameState.cg,lastHarvestBatch:null,harvestBatches:[]}};
      cpVisualQA.scene(el.getContext('2d'),el,React,frame,cpVisualQA.plants,[],0,false);
      return {count:el.dataset.gardenBasketCount,collecting:el.dataset.gardenCollectionCount,burst:el._actionBurst};
    });
    assert.deepEqual(mismatch,{count:'0',collecting:'0',burst:null});
    await patch({reducedMotion:true,phase:'plan'});
    await canvas.evaluate(el=>{el._cgVisible=true;el._cgRequestDraw();});
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenBasketCount==='13'&&__cgCanvasEl._cgAnim===null);
    const restored=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    await page.evaluate(data=>cpSetData(data),restored);
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenBasketCount==='13');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenBasketCount==='13'&&__cgCanvasEl._cgAnim===null);
    assert.equal(await canvas.evaluate(el=>el._actionBurst||null),null,'remount does not replay a saved harvest');
    await canvas.screenshot({path:path.join(out,'garden-harvest-maximized-320.png')});
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;retiredGarden._actionBurst={kind:'harvest',plots:[{index:0,plantId:'corn'}]};cpRoot.unmount();});
    await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._actionBurst),null);
    findings.assertions.push('Only 13 eligible crop plots are collected; unready, low-health, and habitat plots remain','Distinct produce travels from actual plot centers into the basket','Basket contents survive planning and restored saves without replaying animation','Collection expires, cancels on reset, and releases references on unmount','Reduced-motion frames are identical at different scene times','Desktop, mobile, night, and maximized visuals fit; garden state and canvas context stay unchanged');
    assert.deepEqual(findings.errors,[]);
    fs.writeFileSync(path.join(out,'harvest-scene-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error){fs.writeFileSync(path.join(out,'harvest-scene-results.json'),JSON.stringify({...findings,failure:error.stack},null,2));console.error(error);process.exitCode=1;}
  finally {await browser.close();}
})();