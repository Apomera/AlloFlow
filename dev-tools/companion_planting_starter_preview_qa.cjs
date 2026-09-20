// Run from the repository root: node dev-tools/companion_planting_starter_preview_qa.cjs
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
    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,pests:0,watered:false}));
    await patch({grid:empty(),phase:'plan',day:0,budget:50,moisture:60,nitrogen:50,reducedMotion:true});
    const preview=page.locator('[data-starter-preview]'),select=page.locator('[data-play-starter]'),primary=page.locator('[data-play-primary]');
    assert.equal(await preview.count(),0);
    const toggle=page.locator('[data-play-starter-preview-toggle]');await toggle.focus();await page.keyboard.press('Enter');
    await preview.waitFor();await page.waitForFunction(()=>document.activeElement.matches('[data-starter-preview]'));
    const plans=['sisters','pollinator','salad','soil'];
    const layout=()=>preview.evaluate(el=>{
      const beds=[...el.querySelectorAll('[data-starter-bed]')].map(bed=>bed.getBoundingClientRect());
      const map=el.querySelector('[data-starter-map]').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,clipped:el.scrollWidth>el.clientWidth+1,
        rows:new Set(beds.map(b=>Math.round(b.top))).size,columns:new Set(beds.map(b=>Math.round(b.left))).size,
        contained:beds.every(b=>b.left>=map.left&&b.right<=map.right&&b.top>=map.top&&b.bottom<=map.bottom),
        controls:[...el.querySelectorAll('button,select,summary')].map(control=>({tag:control.tagName,height:control.getBoundingClientRect().height}))};
    });
    const capture=async name=>{
      const viewport=page.viewportSize();await page.setViewportSize({...viewport,height:1600});
      await preview.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});
      await page.setViewportSize(viewport);
    };
    findings.recipes=[];
    for(const id of plans){
      await select.selectOption(id);await page.waitForFunction(id=>document.querySelector('[data-starter-preview]').dataset.starterPreview===id,id);
      const before=await state(),price=Number(await preview.locator('[data-starter-price]').getAttribute('data-starter-price'));
      const illustrated=await preview.locator('[data-starter-bed]').evaluateAll(beds=>beds.map(b=>b.dataset.starterPlant==='empty'?null:b.dataset.starterPlant));
      assert.equal(illustrated.length,16);assert.ok(illustrated.some(Boolean));
      assert.equal(await preview.locator('[data-starter-bed] svg').count(),illustrated.filter(Boolean).length);
      assert.deepEqual(before.grid,empty());assert.equal(before.budget,50);assert.equal(before.day,0);
      const modelCounts=illustrated.reduce((counts,id)=>{if(id)counts[id]=(counts[id]||0)+1;return counts;},{});
      assert.equal(await preview.locator('[data-starter-crop-count]').count(),Object.keys(modelCounts).length);
      for(const [crop,count] of Object.entries(modelCounts))assert.equal(await preview.locator(`[data-starter-crop-count="${crop}"] strong`).textContent(),'× '+count);
      assert.match(await primary.textContent(),new RegExp('\\$'+price.toFixed(2).replace('.','\\.')));
      await capture('garden-starter-'+id+'-1280.png');
      await primary.click();await page.waitForFunction(()=>!document.querySelector('[data-starter-preview]'));
      await page.waitForFunction(()=>document.activeElement.matches('[data-play-primary]'));
      const focusClearance=await primary.evaluate(el=>el.getBoundingClientRect().top-document.querySelector('.cp-play-nav').getBoundingClientRect().bottom);
      assert.ok(focusClearance>=0,'planting hands focus to Start growing below the navigation');
      const planted=await state();assert.deepEqual(planted.grid.map(c=>c.plantId),illustrated);assert.ok(planted.grid.every(c=>c.growthDay===0));
      assert.equal(planted.budget,Math.round((50-price)*100)/100);assert.equal(planted.day,0);
      assert.match(await primary.textContent(),/Start growing/);await primary.click();assert.equal((await state()).phase,'grow');
      findings.recipes.push({id,price,occupied:illustrated.filter(Boolean).length,exactPlacement:true,startsAsSeeds:true});
      await patch({grid:empty(),phase:'plan',day:0,budget:50,expenses:0,lastFeedback:null,lastPlacement:null,relationshipFocus:null});await preview.waitFor();
    }
    await select.selectOption('salad');
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      await preview.scrollIntoViewIfNeeded();const before=await state();
      const geometry=await layout();assert.equal(geometry.overflow,false);assert.equal(geometry.clipped,false);assert.equal(geometry.contained,true);assert.equal(geometry.rows,4);assert.equal(geometry.columns,4);
      assert.ok(geometry.controls.every(c=>c.height>=44));
      await capture('garden-starter-preview-'+width+'.png');
      const summary=preview.locator('[data-starter-inventory] summary');await summary.focus();await page.keyboard.press('Enter');
      assert.equal(await preview.locator('[data-starter-inventory]').getAttribute('open'),'');
      assert.equal(await summary.evaluate(el=>document.activeElement===el),true);assert.equal((await layout()).overflow,false);
      await capture('garden-starter-inventory-'+width+'.png');await page.keyboard.press('Enter');
      assert.equal(await preview.locator('[data-starter-inventory]').getAttribute('open'),null);assert.deepEqual(await state(),before);
      // Native select changes the preview by keyboard and leaves focus on the choice.
      await select.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      assert.equal(await select.inputValue(),'pollinator');assert.equal(await preview.getAttribute('data-starter-preview'),'pollinator');
      assert.equal(await select.evaluate(el=>document.activeElement===el),true);
      const changed=await state();for(const key of ['grid','day','budget','expenses'])assert.deepEqual(changed[key],before[key]);
      await select.selectOption('salad');findings.viewports.push({width,...geometry,keyboardSelection:true,keyboardInventory:true});
    }
    await preview.locator('[data-starter-close]').click();assert.equal(await preview.count(),0);
    await page.waitForFunction(()=>document.activeElement.matches('[data-play-starter-preview-toggle]'));
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    const beforeReopen=await state();await toggle.click();await preview.waitFor();
    for(const key of ['grid','budget','day'])assert.deepEqual((await state())[key],beforeReopen[key]);
    await patch({budget:3.8});assert.equal(await primary.isDisabled(),false);assert.equal(await preview.locator('[data-starter-balance]').textContent(),'$0.00 left after planting');
    await primary.click();assert.equal((await state()).budget,0);assert.equal((await state()).grid.filter(c=>c.plantId).length,14);
    await patch({grid:empty(),budget:1,phase:'plan',day:95,lastFeedback:null});await preview.waitFor();
    assert.equal(await primary.isDisabled(),true);assert.equal(await preview.locator('[data-starter-balance]').textContent(),'Need $2.80 more');
    assert.match(await preview.locator('#cp-starter-note').textContent(),/growth pauses during winter/);
    await page.locator('[data-play-edit]').click();await page.waitForFunction(()=>document.activeElement.matches('[data-play-plot-tray]'));
    assert.equal((await state()).budget,1);assert.ok((await state()).grid.every(c=>c.plantId===null));
    await patch({budget:50,plantingTarget:4,selectedPlant:'beans',placementPreview:{plot:4,plantId:'beans'}});
    assert.equal(await primary.isDisabled(),true);assert.equal(await select.isDisabled(),true);
    await patch({plantingTarget:null,selectedPlant:null,placementPreview:null,readableMode:true,day:0});
    assert.equal(await select.isDisabled(),false);assert.equal((await layout()).overflow,false);
    await capture('garden-starter-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-starter-preview]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});await select.focus();
    assert.equal(await select.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await layout()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});
    assert.equal(await preview.locator('[data-starter-map]').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'layout miniatures stay still');
    await patch({budget:0});assert.equal(await preview.count(),0);assert.equal(await primary.isDisabled(),false);assert.match(await primary.textContent(),/free/);
    await primary.click();assert.equal((await state()).grid.filter(c=>c.plantId).length,1);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('All four layouts preview sixteen exact beds and use the actual rounded purchase price','Choosing a plan and expanding its inventory preserve funds, time, and planting','Mature illustrations become zero-day seeds only after purchase','Desktop and 320px layouts fit with 44px controls and keyboard selection','Exact-budget, insufficient-funds, custom preview, winter, and recovery routes remain playable','Readable text, reduced motion, forced-color focus, cleanup, and scoped accessibility pass');
    fs.writeFileSync(path.join(out,'starter-preview-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'starter-preview-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
