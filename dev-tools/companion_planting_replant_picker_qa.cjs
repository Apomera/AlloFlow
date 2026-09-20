// Run from the repository root: node dev-tools/companion_planting_replant_picker_qa.cjs
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
    const ids=['corn','onion','beans','carrot','squash','strawberry','rain_barrel','tomato','marigold','radish','yarrow','blueberry','lavender','lettuce','pepper','bee_hotel'];
    const grid=await page.evaluate(ids=>ids.map((plantId,index)=>({plantId,growthDay:[0,3,5,9,11,13].includes(index)?200:cpVisualQA.plants[plantId].isStructure?0:cpVisualQA.plants[plantId].days*.58,health:index===1?25:98,pests:0,watered:false})),ids);
    // Keep previously seen reflection prompts from asynchronously changing this garden-state fixture.
    await patch({grid,day:44,phase:'grow',moisture:60,nitrogen:50,budget:40,readableMode:false,reducedMotion:true,selectedPlant:'radish',seenReflections:{first_harvest:true,biodiversity_win:true,companion_discovery:true}});
    await page.locator('[data-play-primary]').click();
    const receipt=page.locator('[data-play-harvest-receipt]'),picker=page.locator('[data-harvest-replant-picker]'),summary=picker.locator('summary'),beds=picker.locator('[data-harvest-replant-bed]');
    await picker.waitFor();const collected=await state(),batch=collected.lastHarvestBatch;
    assert.equal(batch.cropCount,6);assert.equal(await summary.innerText(),'Choose from 4 open beds');assert.equal(await picker.getAttribute('open'),null);
    assert.deepEqual(await beds.evaluateAll(nodes=>nodes.filter(n=>!n.disabled).map(n=>Number(n.dataset.harvestReplantBed))),[0,3,9,13]);
    assert.equal(await beds.count(),16);
    assert.equal(await picker.locator('[data-harvest-replant-bed="5"] svg').getAttribute('data-botanical-stage'),'seed');
    assert.equal(await picker.locator('[data-harvest-replant-bed="11"] svg').getAttribute('data-botanical-stage'),'seed');
    assert.equal(await picker.locator('[data-harvest-replant-bed="6"] svg').getAttribute('data-botanical-stage'),'structure');
    assert.equal(await picker.locator('[data-harvest-replant-bed="1"] svg').getAttribute('data-botanical-condition'),'low');
    const capture=async(name,locator=picker)=>{
      const viewport=page.viewportSize(),bounds=await locator.boundingBox();
      await page.setViewportSize({...viewport,height:Math.max(viewport.height,Math.ceil(bounds.height)+180)});
      await locator.scrollIntoViewIfNeeded();await locator.screenshot({path:path.join(out,name),style:'.cp-play-nav{visibility:hidden!important}'});
      await page.setViewportSize(viewport);
    };
    const geometry=()=>picker.evaluate(el=>{
      const map=el.querySelector('.cp-replant-map'),bounds=map.getBoundingClientRect(),cells=[...map.querySelectorAll('button')],rects=cells.map(n=>n.getBoundingClientRect());
      return {overflow:document.documentElement.scrollWidth>innerWidth,columns:new Set(rects.map(r=>Math.round(r.left))).size,rows:new Set(rects.map(r=>Math.round(r.top))).size,targets:rects.every(r=>r.width>=44&&r.height>=44),clipped:cells.some(n=>{const r=n.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||n.scrollWidth>n.clientWidth+1;})};
    });
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      assert.equal(await beds.evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).length),0,'map is initially collapsed');
      await capture('harvest-replant-collapsed-'+width+'.png',receipt);
      await summary.focus();await page.keyboard.press('Enter');
      assert.deepEqual(await geometry(),{overflow:false,columns:4,rows:4,targets:true,clipped:false});
      assert.equal(await summary.evaluate(el=>document.activeElement===el),true);
      await capture('harvest-replant-map-'+width+'.png');await capture('harvest-replant-receipt-'+width+'.png',receipt);
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.harvestReplantBed),'0');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.harvestReplantBed),'3');
      await summary.focus();await page.keyboard.press('Enter');assert.equal(await picker.getAttribute('open'),null);
      assert.deepEqual(await state(),collected);findings.viewports.push({width,columns:4,rows:4,targets:true,overflow:false,clipped:false,keyboardDisclosure:true});
    }
    await patch({readableMode:true});await summary.click();assert.equal(await beds.first().locator('strong').evaluate(el=>getComputedStyle(el).fontSize),'12px');assert.deepEqual(await geometry(),{overflow:false,columns:4,rows:4,targets:true,clipped:false});await capture('harvest-replant-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-harvest-replant-picker]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await picker.locator('[data-harvest-replant-bed="13"]').focus();assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});
    const chosen=picker.locator('[data-harvest-replant-bed="13"]');await chosen.hover();
    await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[data-harvest-replant-bed="13"]')).transform).f< -1.9);
    await patch({reducedMotion:true});assert.equal(await chosen.evaluate(el=>getComputedStyle(el).transform),'none');
    await patch({reducedMotion:false});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await chosen.evaluate(el=>getComputedStyle(el).transform),'none');
    assert.equal(await picker.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    // A non-first bed routes to the exact planting target, without re-awarding or buying anything.
    await patch({reducedMotion:true,readableMode:false});const before=await state();await chosen.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.matches('[data-planting-dock-surface="simulation"]'));
    const routed=await state();assert.equal(routed.phase,'plan');assert.equal(routed.plantingTarget,13);assert.equal(routed.selectedPlant,null);assert.equal(routed.placementPreview,null);assert.equal(routed.playHarvestSeen,batch.id);assert.equal(await receipt.count(),0);
    for(const key of ['grid','day','budget','score','totalHarvested','lastHarvestBatch','harvestBatches'])assert.deepEqual(routed[key],before[key]);
    const dock=page.locator('[data-planting-dock-surface="simulation"]');await dock.locator('[data-planting-candidate="beans"]').click();
    assert.deepEqual((await state()).placementPreview,{plot:13,plantId:'beans'});assert.deepEqual((await state()).grid,before.grid);assert.equal((await state()).budget,before.budget);
    const seedCost=await page.evaluate(()=>cpVisualQA.plants.beans.cost*.1);
    await dock.locator('[data-confirm-placement-preview]').click();await page.waitForFunction(()=>document.activeElement===__cgCanvasEl);
    const planted=await state();assert.equal(planted.grid[13].plantId,'beans');assert.equal(planted.grid[13].growthDay,0);assert.equal(planted.day,before.day);assert.ok(Math.abs(planted.budget-(before.budget-seedCost))<.001);
    for(const index of [1,2,4,5,6,7,8,10,11,12,14,15])assert.deepEqual(planted.grid[index],before.grid[index]);
    // An active preview disables both quick and chosen-bed routes and keeps its instructions visible.
    await patch({...collected,phase:'plan',plantingTarget:3,selectedPlant:'radish',placementPreview:{plot:3,plantId:'radish'},playHarvestSeen:null});await picker.waitFor();await summary.click();
    assert.equal(await beds.evaluateAll(nodes=>nodes.every(n=>n.disabled)),true);assert.equal(await page.locator('[data-play-harvest-next]').isDisabled(),true);assert.equal(await picker.locator('[data-replant-preview-guard]').count(),1);
    const staged=await state();await summary.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');assert.deepEqual(await state(),staged);await capture('harvest-replant-preview-guard-320.png');
    await dock.locator('[data-preview-try-another]').click();assert.deepEqual(await beds.evaluateAll(nodes=>nodes.filter(n=>!n.disabled).map(n=>Number(n.dataset.harvestReplantBed))),[0,3,9,13]);
    // Live occupancy, rather than an old harvest record, determines what can be replanted.
    const changed=(await state()).grid.map((cell,index)=>index===13?{...cell,plantId:'carrot',growthDay:0}:cell);await patch({grid:changed});
    assert.equal(await picker.locator('[data-harvest-replant-bed="13"]').isDisabled(),true);assert.equal(await summary.innerText(),'Choose from 3 open beds');
    const full=changed.map(cell=>({...cell,plantId:'strawberry',growthDay:200}));await patch({grid:full,phase:'grow',plantingTarget:null,selectedPlant:null,placementPreview:null,lastCareAction:null,playHarvestSeen:null});
    await page.locator('[data-play-primary]').click();await receipt.waitFor();assert.equal(await picker.count(),0);assert.equal(await page.locator('[data-play-harvest-next]').innerText(),'Keep growing');
    const perennial=await state();await page.locator('[data-play-harvest-next]').click();assert.equal((await state()).phase,'grow');assert.deepEqual((await state()).grid,perennial.grid);assert.equal((await state()).budget,perennial.budget);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Real harvest maps show all 16 current beds, including regrowing perennials, habitat, and stressed standing crops','Only open beds are selectable; opening the map preserves the entire garden state','A chosen non-first bed leads to preview then exact-cost confirmation without repeated harvest rewards','Both replant routes protect an active preview and update when occupancy changes','Full perennial gardens stay in the growing loop without a bed chooser','Four-column desktop/phone maps, 44px targets, larger text, keyboard focus, forced colors, both motion preferences, accessibility, and cleanup pass');
    fs.writeFileSync(path.join(out,'replant-picker-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'replant-picker-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
