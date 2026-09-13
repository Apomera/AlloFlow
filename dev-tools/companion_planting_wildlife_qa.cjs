// Run from the repository root: node dev-tools/companion_planting_wildlife_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
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
    ['corn','beans','sunflower','lavender','tomato','marigold','dill','carrot','squash','borage','lettuce','nasturtium','clover','pepper','yarrow','bee_hotel'].forEach((plantId,index)=>grid[index]={...grid[index],plantId,growthDay:85,pests:index===4?20:0});
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.stringify(cpData));
    await patch({grid,day:44,phase:'grow',moisture:60,nitrogen:50,budget:40,beneficialPop:35,playGardenLens:'natural',reducedMotion:true});
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&+__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenBees==='3');
    findings.eligibility=await page.evaluate(()=>{
      const plants=cpVisualQA.plants, flower=(id,growth,health=100,pests=0)=>({plantId:id,growthDay:plants[id].days*growth,health,pests});
      const probe=[flower('sunflower',.549),flower('marigold',.55),flower('lavender',1,20),flower('bee_hotel',1),flower('borage',1,20.1),flower('corn',1,100,40),{plantId:'unknown',growthDay:90,health:100,pests:100}];
      const before=JSON.stringify(probe), run=population=>cpVisualQA.wildlife(probe,plants,population,0);
      return {normal:run(18),zero:run(0),negative:run(-1),invalid:run(Infinity),missing:run(undefined),winter:cpVisualQA.wildlife(probe,plants,35,3),
        seed:cpVisualQA.wildlife([flower('marigold',0)],plants,35,0),structure:cpVisualQA.wildlife([flower('bee_hotel',1)],plants,35,0),
        shelter:cpVisualQA.wildlife([flower('corn',.19,100,99),flower('tomato',.2,100,15),flower('beans',1,20,100)],plants,11,0),
        counts:[7.99,8,16,17.99,18,100].map(population=>cpVisualQA.wildlife(['sunflower','marigold','borage','clover'].map(id=>flower(id,1)),plants,population,0)),unchanged:before===JSON.stringify(probe)};
    });
    assert.deepEqual(findings.eligibility.normal,{flowers:[1,4],bees:2,butterflies:1,ladybird:5});
    for(const key of ['zero','negative','invalid','missing']){assert.equal(findings.eligibility[key].bees,0);assert.equal(findings.eligibility[key].butterflies,0);assert.equal(findings.eligibility[key].ladybird,-1);}
    for(const key of ['winter','seed','structure'])assert.deepEqual(findings.eligibility[key],{flowers:[],bees:0,butterflies:0,ladybird:-1});
    assert.equal(findings.eligibility.shelter.ladybird,1);assert.equal(findings.eligibility.unchanged,true);
    assert.deepEqual(findings.eligibility.counts.map(item=>[item.bees,item.butterflies]),[[1,0],[2,0],[3,0],[3,0],[3,1],[3,1]]);
    findings.paths=await page.evaluate(()=>{
      const sites=[{x:100,y:200,index:0},{x:300,y:250,index:1}], pose=time=>cpVisualQA.pose(sites,0,time,200,false);
      const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), at=pose(0), rest=pose(1), flying=pose(6);
      return {rests:distance(at,rest)===0&&at.landed&&rest.landed,flying:!flying.landed&&flying.x>100&&flying.x<300&&flying.y<200,
        departureContinuous:distance(pose(9*.28-.0001),pose(9*.28+.0001))<.01,
        arrivalContinuous:distance(pose(9-.0001),pose(9+.0001))<.01,
        still:JSON.stringify(cpVisualQA.pose(sites,3,0,200,true))===JSON.stringify(cpVisualQA.pose(sites,3,100,200,true)),
        singleFlower:[0,2,4,6,9].every(time=>Number.isFinite(cpVisualQA.pose(sites.slice(0,1),0,time,200,false).y)),empty:cpVisualQA.pose([],0,0,200,false)===null};
    });
    assert.ok(Object.values(findings.paths).every(Boolean),JSON.stringify(findings.paths));
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await waitForCanvas();
      const before=await state();
      const check=await canvas.evaluate(el=>{
        const ctx=el.getContext('2d'),frame=el._cgFrameState,draw=(time,reduced,change={})=>cpVisualQA.scene(ctx,el,React,{...frame,...change},cpVisualQA.plants,cpVisualQA.relationships,time,reduced);
        draw(0,true);const still=el.toDataURL();draw(60,true);const stable=still===el.toDataURL();
        el._cgBedLayer.key=null;draw(0,true);const fresh=still===el.toDataURL();
        const model={bees:el.dataset.gardenBees,butterflies:el.dataset.gardenButterflies,ladybird:el.dataset.gardenLadybirdPlot,flowers:el.dataset.gardenFloweringPlots};
        draw(6,false);const motion=still!==el.toDataURL();
        return {stable,fresh,motion,...model,identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha,cache:el._cgBotanicalNodes.size};
      });
      assert.equal(check.stable,true);assert.equal(check.fresh,true);assert.equal(check.motion,true);assert.equal(check.identity,true);assert.equal(check.alpha,1);assert.ok(check.cache<=96);
      assert.equal(check.bees,'3');assert.equal(check.butterflies,'1');assert.equal(check.ladybird,'4');assert.equal(check.flowers,'2,3,5,6,9,11,12,14');
      await canvas.screenshot({path:path.join(out,`garden-wildlife-${width}.png`)});
      await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,66,false));
      assert.equal(await canvas.getAttribute('data-garden-bees'),'0');assert.equal(await canvas.getAttribute('data-garden-butterflies'),'0');assert.equal(await canvas.getAttribute('data-garden-ladybird-plot'),'-1');
      await canvas.screenshot({path:path.join(out,`garden-wildlife-night-${width}.png`)});
      await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,{...el._cgFrameState,season:3},cpVisualQA.plants,cpVisualQA.relationships,0,true));
      assert.equal(await canvas.getAttribute('data-garden-bees'),'0');assert.equal(await canvas.getAttribute('data-garden-flowering-plots'),'');
      await canvas.screenshot({path:path.join(out,`garden-wildlife-winter-${width}.png`)});
      assert.equal(await state(),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      findings.viewports.push({width,...check});
    }
    findings.transitions=await canvas.evaluate(el=>{
      const ctx=el.getContext('2d'),frame=el._cgFrameState,draw=change=>cpVisualQA.scene(ctx,el,React,{...frame,...change},cpVisualQA.plants,cpVisualQA.relationships,0,true);
      const seed=frame.grid.map(cell=>({...cell,growthDay:0}));draw({grid:seed});const seedsClear=el.dataset.gardenBees==='0'&&el.dataset.gardenLadybirdPlot==='-1';
      draw({beneficialPop:0});const populationClear=el.dataset.gardenBees==='0'&&el.dataset.gardenButterflies==='0';
      draw({grid:frame.grid.map(cell=>({...cell,health:20}))});const criticalClear=el.dataset.gardenBees==='0'&&el.dataset.gardenLadybirdPlot==='-1';
      draw({});return {seedsClear,populationClear,criticalClear,restored:el.dataset.gardenBees==='3'};
    });
    assert.ok(Object.values(findings.transitions).every(Boolean),JSON.stringify(findings.transitions));
    // Isolate the authored visitor illustrations at a readable review scale.
    await page.setViewportSize({width:1280,height:1000});
    await page.evaluate(()=>{
      const strip=document.createElement('canvas');strip.id='visitor-art-review';strip.width=960;strip.height=300;document.body.appendChild(strip);
      const ctx=strip.getContext('2d');ctx.fillStyle='#edf0df';ctx.fillRect(0,0,960,300);
      ['bee','butterfly','ladybird'].forEach((kind,index)=>{
        cpVisualQA.visitor(ctx,kind,{x:160+index*320,y:135,facing:1,angle:0,wing:.8,landed:false},4);
        ctx.fillStyle='#495b42';ctx.textAlign='center';ctx.font='600 20px system-ui';ctx.fillText(['Bee','Butterfly','Ladybird'][index],160+index*320,248);
      });
    });
    await page.locator('#visitor-art-review').screenshot({path:path.join(out,'garden-wildlife-artwork.png')});
    await page.evaluate(()=>document.getElementById('visitor-art-review').remove());
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();await waitForCanvas();
    await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,6,false));
    await canvas.screenshot({path:path.join(out,'garden-wildlife-maximized-1280.png')});
    await page.getByRole('button',{name:'Exit maximized garden view',exact:true}).click();await waitForCanvas();
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-play-garden-views]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    findings.paintTiming=await canvas.evaluate(el=>{
      const times=[];for(let i=0;i<20;i++){const start=performance.now();cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,i,false);times.push(performance.now()-start);}
      times.sort((a,b)=>a-b);return {medianMs:times[10],p95Ms:times[18]};
    });
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;cpRoot.unmount();});await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._cgAnim),null);assert.equal(await page.evaluate(()=>retiredGarden._cgBedLayer),null);
    assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Visitors follow flowering stage, crop health, beneficial population, and season','Structures and new seeds are not flower destinations','Ladybirds prefer living crops with higher pest pressure','Flight paths rest at blossoms and join continuously','Reduced motion is still; winter and night clear visitors','Desktop, phone, maximized scenes preserve saved garden data','Canvas state, cache equivalence, accessibility, and unmount cleanup pass');
    fs.writeFileSync(path.join(out,'wildlife-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});