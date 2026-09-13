// Run from the repository root: node dev-tools/companion_planting_health_scene_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, condition: companionCropCondition };\n  window.StemLab.registerTool('companionPlanting', {");
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
    for(const [index,id,health,pests] of [[0,'corn',100,0],[1,'corn',35,0],[2,'corn',18,0],[4,'tomato',100,0],[5,'tomato',35,0],[6,'tomato',18,0],[8,'beans',100,50],[9,'squash',100,0],[10,'lettuce',100,0],[12,'rain_barrel',10,60],[14,'marigold',100,0]])grid[index]={...grid[index],plantId:id,growthDay:48,health,pests};
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    await patch({grid,day:44,phase:'grow',moisture:60,nitrogen:50,budget:40,playGardenLens:'natural',reducedMotion:true});
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]'),guide=page.locator('[data-play-crop-condition-guide]');
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&+__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await waitForCanvas();
      await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenCareMarkers==='5');
      assert.equal(await guide.getAttribute('data-play-crop-condition-guide'),'5');
      const before=await state();
      const checks=await canvas.evaluate(el=>{
        const ctx=el.getContext('2d'),frame=el._cgFrameState;
        cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,0,true);const still=el.toDataURL();
        cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,60,true);
        const matches=still===el.toDataURL();el._cgBedLayer.key=null;
        cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,0,true);
        return {still:matches,freshMatches:still===el.toDataURL(),identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha,cache:el._cgBotanicalNodes.size};
      });
      assert.equal(checks.still,true);assert.equal(checks.freshMatches,true);assert.equal(checks.identity,true);assert.equal(checks.alpha,1);assert.ok(checks.cache<=96);
      assert.deepEqual(await state(),before);
      await canvas.screenshot({path:path.join(out,`garden-health-${width}.png`)});
      await guide.screenshot({path:path.join(out,`garden-health-guide-${width}.png`),style:'.cp-play-nav{position:static!important}'});
      await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,66,false));
      await canvas.screenshot({path:path.join(out,`garden-health-night-${width}.png`)});
      await page.locator('[data-play-care-review]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-play-lens-inspect="2"]'));
      await page.keyboard.press('Enter');await page.locator('[data-play-focus="2"]').waitFor();
      assert.equal(await page.locator('[data-play-focus="2"] [data-botanical-condition="critical"]').count(),1);
      await page.locator('[data-play-focus-close]').click();
      await page.waitForFunction(()=>document.activeElement.matches('[data-play-lens-inspect="2"]'));
      const focusTop=await page.evaluate(()=>document.activeElement.getBoundingClientRect().top-document.querySelector('.cp-play-nav').getBoundingClientRect().bottom);
      assert.ok(focusTop>=0,'returned control clears sticky navigation');
      assert.deepEqual((await state()).grid,before.grid);
      await patch({playGardenLens:'natural'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      findings.viewports.push({width,markers:5,keyboardCareReview:true,inspectionFocusReturn:true,...checks});
    }
    await page.locator('[data-play-weed]').click();await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenCareMarkers==='4');
    const weeded=await state();assert.equal(weeded.grid[8].pests,30);assert.equal(weeded.grid[2].health,18);assert.equal(weeded.day,44);
    // A restored health change at the same growth stage must update the botanical variant.
    const variants=[];
    for(const health of [100,35,18,100]){
      await patch({grid:grid.map((cell,i)=>i===2?{...cell,health}:cell)});await waitForCanvas();
      variants.push(await canvas.evaluate(el=>{
        cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,0,true);return el.toDataURL();
      }));
    }
    assert.notEqual(variants[0],variants[1]);assert.notEqual(variants[1],variants[2]);assert.equal(variants[0],variants[3]);
    await patch({grid:grid.map(cell=>({...cell,health:100,pests:0}))});await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenCareMarkers==='0');
    assert.equal(await guide.count(),0);assert.doesNotMatch(await canvas.getAttribute('aria-label'),/low health or high pest pressure/);
    // Compare the shared portraits; structures retain normal artwork at every health value.
    await page.setViewportSize({width:1280,height:1000});
    await page.evaluate(()=>{
      const R=React,h=R.createElement,host=document.createElement('section');host.id='health-review';document.body.appendChild(host);
      window.healthReviewRoot=ReactDOM.createRoot(host);
      healthReviewRoot.render(h('div',{style:{padding:20,background:'#e9eee1',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}},
        ['corn','tomato','lettuce','rain_barrel'].flatMap(id=>[100,35,18,0].map(health=>h('article',{key:id+health,'data-review-crop':id,'data-review-health':health,style:{textAlign:'center',padding:12,background:'#fffdf4',borderRadius:12}},
          h('div',{style:{width:130,height:160,margin:'auto'}},cpVisualQA.art(R,id,cpVisualQA.plants[id],.9,{health,roots:false})),
          h('strong',null,cpVisualQA.plants[id].label+' · '+health+'% health'))))));
    });
    await page.locator('[data-review-crop="corn"][data-review-health="18"]').waitFor();
    for(const id of ['corn','tomato','lettuce'])for(const [health,band] of [[100,'healthy'],[35,'low'],[18,'critical'],[0,'critical']]){
      const article=page.locator(`[data-review-crop="${id}"][data-review-health="${health}"]`);
      assert.equal(await article.locator('svg').getAttribute('data-botanical-condition'),band);
      assert.equal(await article.locator('.cp-botanical-growth').evaluate(el=>getComputedStyle(el).opacity),'1');
    }
    assert.equal(await page.locator('[data-review-crop="rain_barrel"] [data-botanical-condition="healthy"]').count(),4);
    await page.locator('#health-review').screenshot({path:path.join(out,'botanical-health-comparison.png')});
    await page.evaluate(()=>{healthReviewRoot.unmount();document.getElementById('health-review').remove();});
    await patch({grid,playGardenLens:'natural'});await waitForCanvas();
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();await waitForCanvas();
    await canvas.screenshot({path:path.join(out,'garden-health-maximized-1280.png')});
    await page.getByRole('button',{name:'Exit maximized garden view',exact:true}).click();
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-play-garden-views]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;cpRoot.unmount();});await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._cgBedLayer),null);assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Opaque health-colored crops match portraits and keep habitat artwork unchanged','Health variants update without growth changes and caches stay bounded','Natural tags preserve plot numbers and disappear when their condition resolves','Keyboard Care review and inspection restore focus below sticky navigation','Weeding does not invent health recovery','Reduced motion, night, maximized layout, fresh-cache equivalence, and cleanup');
    fs.writeFileSync(path.join(out,'health-scene-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});