// Run from the repository root: node dev-tools/companion_planting_life_cycle_qa.cjs
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
    const grid=empty();grid[0].plantId='corn';
    await patch({grid,phase:'plan',day:15,budget:41,moisture:60,nitrogen:50,reducedMotion:true,readableMode:false,plantingTarget:5,plantingDockFilter:'all',plantingDockSearch:'',seenReflections:{first_harvest:true,biodiversity_win:true,companion_discovery:true}});
    const dock=page.locator('[data-planting-dock-surface="simulation"]'),panel=dock.locator('[data-preview-cycle]'),search=dock.locator('[data-seed-search]'),summary=panel.locator('summary');
    await dock.waitFor();const catalog=await page.evaluate(()=>cpVisualQA.plants);
    assert.equal(await dock.locator('[data-seed-cycle]').count(),Object.keys(catalog).length);
    for(const [id,plant] of Object.entries(catalog))assert.equal(await dock.locator('[data-seed-cycle="'+id+'"]').getAttribute('data-cycle-kind'),plant.isStructure?'habitat':plant.perennial?'perennial':'annual');
    await dock.locator('[data-planting-candidate="radish"]').click();
    const initial=await state();
    for(const query of ['annual','perennial','habitat']){
      await search.fill(query);const candidates=await dock.locator('[data-seed-cycle]').evaluateAll(nodes=>nodes.map(n=>n.dataset.seedCycle));
      assert.deepEqual(candidates.sort(),Object.keys(catalog).filter(id=>(catalog[id].isStructure?'habitat':catalog[id].perennial?'perennial':'annual')===query).sort());
      assert.deepEqual(await state(),{...initial,plantingDockSearch:query});
    }
    await search.fill('');assert.equal(await panel.getAttribute('open'),null);
    const geometry=()=>panel.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,
      clipped:[...el.querySelectorAll('.cp-cycle-stage,.cp-cycle-copy,.cp-cycle-summary')].some(n=>n.scrollWidth>n.clientWidth+1),
      target:el.querySelector('summary').getBoundingClientRect().height>=44}));
    const capture=async(name,target=panel)=>{const viewport=page.viewportSize(),bounds=await target.boundingBox();await page.setViewportSize({...viewport,height:Math.max(viewport.height,Math.ceil(bounds.height)+180)});await target.scrollIntoViewIfNeeded();await target.screenshot({path:path.join(out,name),style:'.cp-play-nav{visibility:hidden!important}'});await page.setViewportSize(viewport);};
    await page.addScriptTag({path:require.resolve('axe-core')});findings.accessibility=[];
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await patch({readableMode:width===320});
      const unchanged=await state();await summary.focus();await page.keyboard.press('Enter');assert.notEqual(await panel.getAttribute('open'),null);
      assert.equal(await summary.evaluate(el=>document.activeElement===el),true);assert.deepEqual(await geometry(),{overflow:false,clipped:false,target:true});assert.deepEqual(await state(),unchanged);
      assert.equal(await panel.locator('[data-cycle-stage="after"] svg').getAttribute('data-botanical-crop'),'empty');
      await capture('garden-life-cycle-annual-'+width+'.png');await capture('garden-life-cycle-preview-'+width+'.png',dock.locator('[data-placement-preview]'));
      await capture('garden-life-cycle-seeds-'+width+'.png',dock.locator('[data-seed-browser]'));
      findings.viewports.push({width,readableMode:width===320,overflow:false,clipped:false,keyboardDisclosure:true});
      await summary.evaluate(el=>el.scrollIntoView({block:'center'}));findings.accessibility.push(...await page.evaluate(async()=>(await axe.run({include:['[data-planting-dock-surface="simulation"] [data-preview-cycle]','[data-seed-browser="simulation"]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations));
      await summary.focus();await page.keyboard.press('Enter');assert.equal(await panel.getAttribute('open'),null);
    }
    assert.equal(await panel.locator('.cp-cycle-summary').evaluate(el=>getComputedStyle(el).fontSize),'13px');
    await summary.click();const annualKey=await panel.getAttribute('data-preview-cycle-plant');
    await search.fill('perennial');await dock.locator('[data-planting-candidate="strawberry"]').click();assert.notEqual(await panel.getAttribute('data-preview-cycle-plant'),annualKey);assert.equal(await panel.getAttribute('open'),null);
    await summary.click();assert.equal(await panel.getAttribute('data-preview-cycle'),'perennial');assert.equal(await panel.locator('[data-cycle-stage="after"] svg').getAttribute('data-botanical-crop'),'strawberry');assert.equal(await panel.locator('[data-cycle-stage="after"] svg').getAttribute('data-botanical-stage'),'seed');
    assert.match(await panel.innerText(),/Health and pests carry over/);assert.deepEqual(await geometry(),{overflow:false,clipped:false,target:true});await capture('garden-life-cycle-perennial-320.png');
    await page.setViewportSize({width:1280,height:1000});await patch({readableMode:false});await capture('garden-life-cycle-perennial-1280.png');
    await search.fill('habitat');await dock.locator('[data-planting-candidate="bee_hotel"]').click();assert.equal(await panel.getAttribute('open'),null);await summary.click();
    assert.equal(await panel.getAttribute('data-preview-cycle'),'habitat');assert.equal(await panel.locator('[data-cycle-stage="after"]').count(),0);assert.equal(await panel.locator('svg').getAttribute('data-botanical-stage'),'structure');assert.doesNotMatch(await panel.innerText(),/Harvest requires/);
    await page.setViewportSize({width:320,height:844});await patch({readableMode:true});await capture('garden-life-cycle-habitat-320.png');assert.deepEqual(await geometry(),{overflow:false,clipped:false,target:true});
    await summary.evaluate(el=>el.scrollIntoView({block:'center'}));findings.accessibility.push(...await page.evaluate(async()=>(await axe.run({include:['[data-planting-dock-surface="simulation"] [data-preview-cycle]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations));assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await summary.focus();assert.equal(await summary.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});assert.equal(await panel.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    await patch({budget:0});assert.equal(await dock.locator('[data-confirm-placement-preview]').isDisabled(),true);assert.equal(await dock.locator('[data-planting-candidate="bee_hotel"]').isDisabled(),true);
    // Read-only life-cycle previews agree with actual purchase and harvest rules.
    for(const id of ['radish','strawberry']){
      await patch({grid:empty(),phase:'plan',day:15,plantingTarget:5,selectedPlant:null,placementPreview:null,plantingDockSearch:'',budget:41,lastHarvestBatch:null,harvestBatches:[],harvestReceiptDismissed:null,reducedMotion:true});
      await dock.locator('[data-planting-candidate="'+id+'"]').click();const staged=await state();await summary.click();assert.deepEqual(await state(),staged);
      await dock.locator('[data-confirm-placement-preview]').click();const planted=await state();assert.equal(planted.grid[5].plantId,id);assert.equal(planted.grid[5].growthDay,0);assert.equal(planted.budget,41-catalog[id].cost*.1);assert.equal(planted.day,15);assert.equal(planted.placementPreview,null);
      const ready=planted.grid.map((cell,index)=>index===5?{...cell,growthDay:catalog[id].days,health:80,pests:12,watered:true}:cell);await patch({grid:ready,phase:'grow'});
      const primary=page.locator('[data-play-primary]');assert.match(await primary.innerText(),/Harvest/);await primary.click();const harvested=await state();
      assert.deepEqual(harvested.grid[5],id==='radish'?{plantId:null,growthDay:0,health:100,pests:0,watered:false}:{plantId:id,growthDay:0,health:80,pests:12,watered:false});assert.equal(harvested.day,15);assert.ok(harvested.budget>planted.budget);
    }
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Every catalog choice has the simulation-correct annual, perennial, or habitat label','Trait search preserves the staged preview, target, funds, and garden','Illustrations match actual annual clearing and perennial regrowth, including retained health and pests','Habitat omits crop harvest stages; changing choices resets disclosure; unaffordable purchases remain disabled','Desktop and 320px layouts, larger text, keyboard disclosure, forced colors, static portraits, and scoped accessibility pass');
    fs.writeFileSync(path.join(out,'life-cycle-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});