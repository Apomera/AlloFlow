// Run from the repository root: node dev-tools/companion_planting_crop_care_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { cropCare: companionCropCare, journey: companionGrowthJourney, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, condition: companionCropCondition };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const grid=empty();grid[0]={...grid[0],plantId:'corn',growthDay:40,health:25,pests:43.5};grid[1]={...grid[1],plantId:'beans',growthDay:20,health:90,pests:8};grid[2]={...grid[2],plantId:'rain_barrel'};
    const initial={grid,day:12,phase:'grow',moisture:22.5,nitrogen:12,phosphorus:40,potassium:45,organicMatter:3,budget:40,playGardenLens:'natural',reducedMotion:true,relationshipLens:true,relationshipFocus:0,lastCompostDay:null,lastCareAction:null};
    await patch(initial);
    const care=page.locator('[data-crop-care]'),panel=page.locator('[data-play-focus-panel]');await care.waitFor();
    const baseline=await state();
    const capture=async(name,locator=care)=>{await locator.scrollIntoViewIfNeeded();await locator.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});};
    const geometry=()=>care.evaluate(el=>{
      const bounds=el.getBoundingClientRect(),buttons=[...el.querySelectorAll('button')];
      return {overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...el.querySelectorAll('.cp-crop-care-copy,.cp-crop-care-preview,button')].some(n=>{const r=n.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||n.scrollWidth>n.clientWidth+1;}),targets:buttons.every(n=>n.getBoundingClientRect().height>=44)};
    });
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      assert.deepEqual(await geometry(),{overflow:false,clipped:false,targets:true});
      assert.match(await care.locator('[data-crop-care-preview]').innerText(),/22.5% → 47.5%/);
      await capture('garden-crop-care-'+width+'.png');await capture('garden-crop-care-inspector-'+width+'.png',panel);
      assert.deepEqual(await state(),baseline);findings.viewports.push({width,overflow:false,clipped:false,targets:true});
    }
    await patch({readableMode:true});assert.deepEqual(await geometry(),{overflow:false,clipped:false,targets:true});await capture('garden-crop-care-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-crop-care]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    // Each real keyboard action returns focus to the updated care check and leaves the day paused.
    for(const action of ['water','weed','compost']){
      const before=await state();await care.locator('[data-crop-care-action="'+action+'"]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-crop-care="0"]'));
      const after=await state();for(const key of ['day','budget','phase','relationshipFocus'])assert.deepEqual(after[key],before[key]);
      assert.deepEqual(after.grid.map(c=>[c.plantId,c.growthDay,c.health]),before.grid.map(c=>[c.plantId,c.growthDay,c.health]));
      assert.equal(await care.locator('[data-crop-care-result="'+action+'"]').count(),1);
      if(action==='water'){assert.equal(after.moisture,47.5);assert.equal(await care.getAttribute('data-crop-care-kind'),'weed');assert.match(await care.locator('[data-crop-care-preview]').innerText(),/43.5 → 23.5/);}
      if(action==='weed'){assert.equal(after.grid[0].pests,23.5);assert.equal(after.grid[1].pests,0);assert.equal(await care.getAttribute('data-crop-care-kind'),'compost');assert.match(await care.locator('[data-crop-care-preview]').innerText(),/12 → 27/);}
      if(action==='compost'){assert.equal(after.nitrogen,27);assert.equal(after.phosphorus,48);assert.equal(after.potassium,50);assert.equal(after.organicMatter,3.3);assert.equal(after.lastCompostDay,12);assert.equal(await care.getAttribute('data-crop-care-kind'),'health');assert.equal(await care.locator('button').count(),0);}
      assert.deepEqual(await geometry(),{overflow:false,clipped:false,targets:true});await capture('garden-crop-care-after-'+action+'-320.png');
    }
    assert.match(await care.locator('[data-crop-care-result]').innerText(),/N 12 → 27/);
    assert.match(await care.innerText(),/does not instantly restore health/);
    // Existing saturation and daily compost protections remain explicit and cannot be bypassed here.
    await patch({nitrogen:2,lastCompostDay:12});assert.equal(await care.locator('[data-crop-care-action="compost"]').isDisabled(),true);assert.equal(await care.locator('[data-crop-care-preview]').count(),0);
    await capture('garden-crop-care-compost-used-320.png');
    await patch({nitrogen:50,moisture:95});assert.equal(await care.getAttribute('data-crop-care-kind'),'drain');assert.equal(await care.locator('button').count(),0);await capture('garden-crop-care-drain-320.png');
    await patch({phase:'plan',plantingTarget:3,selectedPlant:'beans',placementPreview:{plot:3,plantId:'beans'}});assert.equal(await care.count(),0);const staged=await state();assert.equal(staged.grid[3].plantId,null);assert.equal(staged.budget,baseline.budget);assert.equal(staged.day,baseline.day);
    await patch({phase:'grow',plantingTarget:null,selectedPlant:null,placementPreview:null,moisture:60,nitrogen:2,relationshipFocus:1});assert.equal(await care.getAttribute('data-crop-care-kind'),'steady','nitrogen-fixing beans do not receive heavy-feeder advice');
    await page.locator('[data-play-focus-step="1"]').focus();await page.keyboard.press('Enter');assert.equal(await care.count(),0,'habitat structures have no crop care recommendation');
    await page.locator('[data-play-focus-step="-1"]').focus();await page.keyboard.press('Enter');assert.equal(await care.getAttribute('data-crop-care'),'1');
    await patch({day:13});assert.equal(await care.locator('[data-crop-care-result]').count(),0,'prior-day care receipts do not appear as fresh actions');
    // Model boundaries, recommendation priority, repeated weed needs, and all species' nitrogen roles.
    findings.rules=await page.evaluate(()=>{
      const plants=cpVisualQA.plants,base={phase:'grow',previewPending:false,moisture:60,nitrogen:50,day:12,lastCompostDay:null},cell={plantId:'corn',growthDay:40,health:100,pests:0},model=(c,s)=>cpVisualQA.cropCare(plants.corn,{...cell,...c},{...base,...s});
      if(model({}, {moisture:29.99}).id!=='water'||model({}, {moisture:30}).id!=='steady'||model({}, {moisture:90}).id!=='steady'||model({}, {moisture:90.01}).id!=='drain')throw Error('Moisture thresholds');
      if(model({pests:30},{}).id!=='steady'||model({pests:30.01},{}).id!=='weed'||model({pests:80},{}).after!==60)throw Error('Pest thresholds');
      if(model({health:40},{}).id!=='health'||model({health:40.01},{}).id!=='steady')throw Error('Health threshold');
      if(model({}, {nitrogen:15}).id!=='steady'||model({}, {nitrogen:14.99}).id!=='compost')throw Error('Nitrogen threshold');
      if(model({}, {previewPending:true})!==null||model({}, {phase:'plan'})!==null)throw Error('Preview/phase guard');
      let crops=0,structures=0;
      for(const plant of Object.values(plants)){
        const value=cpVisualQA.cropCare(plant,cell,{...base,nitrogen:2});
        if(plant.isStructure){if(value!==null)throw Error('Habitat guidance');structures++;}
        else{if(value.id!==(plant.nEffect<0?'compost':'steady'))throw Error('Wrong nitrogen role: '+plant.label);crops++;}
      }
      return {crops,structures,thresholds:true,previewGuard:true};
    });
    await patch({...initial,readableMode:true});await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await care.focus();
    assert.equal(await care.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});
    assert.equal(await care.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'care evidence is stationary');
    await page.emulateMedia({reducedMotion:'reduce'});await patch({reducedMotion:true});
    await page.locator('[data-play-focus-close]').click();assert.equal(await care.count(),0);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Care follows the inspected crop, with correct shared scope and exact predicted effects','Real water, weed, and compost actions preserve health, maturity, day, funds, and selection','Keyboard focus returns to the updated recommendation and reports the recorded garden effect','Wet soil, same-day compost, preview/planning, habitat, stale receipts, and nitrogen-fixing crops remain correctly guarded','All species and exact care thresholds are covered','Desktop, 320px, larger text, 44px buttons, forced-color focus, stationary evidence, accessibility, and cleanup pass');
    fs.writeFileSync(path.join(out,'crop-care-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'crop-care-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
