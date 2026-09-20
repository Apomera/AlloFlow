// Run from the repository root: node dev-tools/companion_planting_harvest_receipt_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { harvestArt: companionHarvestArt, ready: companionHarvestReady, readiness: companionReadinessMoment, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, care: companionCareMoment, paintCare: companionPaintCare, moment: companionPlantingMoment, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    const ids=['corn','corn','tomato','carrot','radish','beans','strawberry','lettuce','pepper','potato','garlic','blueberry','lavender','squash','borage','rain_barrel'];
    const grid=ids.map(plantId=>({plantId,growthDay:200,health:98,pests:0,watered:false}));
    await patch({grid,day:44,phase:'grow',moisture:60,nitrogen:50,budget:40,reducedMotion:true});
    await page.locator('[data-play-primary]').click();
    const receipt=page.locator('[data-play-harvest-receipt]');await receipt.waitFor();
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-harvest-receipt'));
    const collected=await state(),batch=collected.lastHarvestBatch,more=receipt.locator('[data-harvest-receipt-more]'),summary=more.locator('summary');
    assert.equal(batch.cropCount,15);assert.equal(batch.items.length,14);

    for(const item of batch.items){
      const row=receipt.locator(`[data-harvest-receipt-crop="${item.plantId}"]`);
      assert.equal(await row.count(),1);assert.equal(await row.locator('[data-harvest-produce]').getAttribute('data-harvest-produce'),item.plantId);
      assert.equal(await row.locator('[data-harvest-receipt-value]').textContent(),'$'+item.revenue.toFixed(2));
      assert.equal(await row.locator('[data-harvest-receipt-count]').textContent(),item.count+' crop'+(item.count===1?'':'s')+' · '+item.points+' pts');
    }
    assert.match(await receipt.locator('[data-harvest-next-note]').textContent(),/13 open beds/);
    assert.match(await receipt.locator('[data-harvest-next-note]').textContent(),/Perennial crops remain planted/);
    assert.equal(collected.grid[6].plantId,'strawberry');assert.equal(collected.grid[6].growthDay,0);
    assert.equal(collected.grid[11].plantId,'blueberry');assert.equal(collected.grid[15].plantId,'rain_barrel');
    const capture=async name=>{
      const viewport=page.viewportSize();await page.setViewportSize({...viewport,height:1600});
      await receipt.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});
      await page.setViewportSize(viewport);
    };
    const layout=()=>receipt.evaluate(el=>({width:el.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth,
      clipped:[...el.querySelectorAll('.cp-harvest-item')].filter(row=>row.getBoundingClientRect().height).some(row=>row.scrollWidth>row.clientWidth+1),
      visibleItems:[...el.querySelectorAll('.cp-harvest-item')].filter(row=>row.checkVisibility()).length}));
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await receipt.scrollIntoViewIfNeeded();
      if(await more.getAttribute('open')!==null)await summary.click();
      let shape=await layout();assert.equal(shape.overflow,false);assert.equal(shape.clipped,false);assert.equal(shape.visibleItems,4);
      await capture(`harvest-receipt-${width}.png`);
      await summary.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-harvest-receipt-more]').open);
      shape=await layout();assert.equal(shape.visibleItems,14);assert.equal(shape.overflow,false);assert.equal(shape.clipped,false);
      assert.equal(await summary.evaluate(el=>document.activeElement===el),true);
      await capture(`harvest-receipt-expanded-${width}.png`);
      await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('[data-harvest-receipt-more]').open);
      const reviewed=await state();for(const key of ['grid','day','budget','score','totalHarvested','lastHarvestBatch','harvestBatches'])assert.deepEqual(reviewed[key],collected[key],'reading the receipt preserves '+key);
      findings.viewports.push({width,expandedTypes:14,collapsedTypes:4,...shape,keyboardDisclosure:true});
    }
    await page.addScriptTag({path:require.resolve('axe-core')});
    await summary.click();
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-play-harvest-receipt]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    assert.equal(await receipt.locator('.cp-harvest-sparks').evaluate(el=>getComputedStyle(el).display),'none');
    await page.locator('[data-play-harvest-next]').click();
    await page.waitForFunction(()=>document.activeElement.matches('[data-planting-dock-surface="simulation"]'));
    const replanted=await state();assert.equal(replanted.phase,'plan');assert.equal(replanted.plantingTarget,0);assert.equal(replanted.budget,collected.budget);assert.equal(replanted.day,collected.day);assert.deepEqual(replanted.grid,collected.grid);
    // Older saved harvests have no per-item financial detail; missing is not zero.
    const legacy={id:'legacy-art-receipt',cropCount:1,items:[{plantId:'carrot',count:1},null,{plantId:'rain_barrel',count:1},{plantId:'unknown',count:1},{plantId:'corn',count:-1}]};
    await patch({lastHarvestBatch:legacy,harvestBatches:[legacy],lastCareAction:{id:'harvest'},playHarvestSeen:null});await receipt.waitFor();
    assert.equal(await receipt.locator('[data-harvest-receipt-crop]').count(),1);assert.equal(await more.count(),0);
    assert.equal(await receipt.locator('[data-harvest-receipt-value]').innerText(),'Value not recorded');assert.doesNotMatch(await receipt.innerText(),/undefined|NaN|\$0\.00/);
    assert.equal((await layout()).overflow,false);assert.equal((await layout()).clipped,false);await capture('harvest-receipt-legacy-320.png');
    const beforeDismiss=await state();await page.locator('[data-play-harvest-dismiss]').click();assert.equal(await receipt.count(),0);
    for(const key of ['budget','day','grid','lastHarvestBatch'])assert.deepEqual((await state())[key],beforeDismiss[key]);
    // A full perennial garden still routes back to growing, without choosing an occupied bed.
    await patch({grid:grid.map(cell=>({...cell,plantId:'strawberry'})),phase:'grow',plantingTarget:null,placementPreview:null,selectedPlant:null,lastCareAction:null,playHarvestSeen:null});
    await page.locator('[data-play-primary]').click();await receipt.waitFor();
    assert.equal(await more.count(),0);assert.match(await receipt.locator('[data-harvest-next-note]').innerText(),/All beds are planted/);
    assert.equal(await page.locator('[data-play-harvest-next]').innerText(),'Keep growing');const perennials=await state();
    await page.locator('[data-play-harvest-next]').click();assert.equal((await state()).phase,'grow');assert.deepEqual((await state()).grid,perennials.grid);assert.equal((await state()).budget,perennials.budget);
    // Review every authored crop illustration together, including cut flowers and herbs.
    await page.setViewportSize({width:1280,height:1000});
    await page.evaluate(()=>{
      const host=document.createElement('section');host.id='harvest-art-sheet';document.body.appendChild(host);window.artRoot=ReactDOM.createRoot(host);
      const h=React.createElement,plants=cpVisualQA.plants;
      artRoot.render(h('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10,padding:18,background:'#f2efdf',width:1040}},
        Object.keys(plants).filter(id=>!plants[id].isStructure).map(id=>h('div',{key:id,style:{display:'grid',placeItems:'center',background:'#fffdf5',border:'1px solid #ddd4b8',borderRadius:12,padding:8}},h('div',{style:{width:112,height:94}},cpVisualQA.harvestArt(React,id)),h('strong',{style:{fontSize:12,color:'#45513a'}},plants[id].label)))));
    });
    await page.locator('#harvest-art-sheet svg').first().waitFor();await page.locator('#harvest-art-sheet').screenshot({path:path.join(out,'harvest-produce-artwork.png'),style:'.cp-play-nav{position:static!important}'});
    await page.evaluate(()=>{artRoot.unmount();document.getElementById('harvest-art-sheet').remove();cpRoot.unmount();});assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Actual harvest records show exact per-type counts, points, and funds with distinct gathered produce','Four initial crop types expand to every harvested type through a keyboard-operable disclosure','Desktop and 320px cards fit with readable text and unchanged saved state','Annual beds lead to planting; full perennial beds stay in the growing loop','Missing financial details remain explicitly unrecorded, and malformed saved entries do not crash hidden history','Reduced-motion receipt, focus handoff, dismiss, and scoped accessibility pass');
    fs.writeFileSync(path.join(out,'harvest-receipt-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});