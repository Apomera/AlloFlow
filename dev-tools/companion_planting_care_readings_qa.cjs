// Run from the repository root: node dev-tools/companion_planting_care_readings_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { readings: companionCareReadings, cropCare: companionCropCare, journey: companionGrowthJourney, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, condition: companionCropCondition };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const initial={grid,day:12,phase:'grow',moisture:22.5,nitrogen:12,phosphorus:40,potassium:45,organicMatter:3,budget:40,reducedMotion:true,relationshipLens:true,relationshipFocus:0,lastCompostDay:null,lastCareAction:null};
    await patch(initial);
    const care=page.locator('[data-crop-care]'),readings=page.locator('[data-care-readings]'),panel=page.locator('[data-play-focus-panel]');await readings.waitFor();
    const baseline=await state();
    const capture=async(name,locator=care)=>{await locator.scrollIntoViewIfNeeded();await locator.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});};
    const geometry=()=>readings.evaluate(el=>{
      const bounds=el.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,cards:el.querySelectorAll('[data-care-reading]').length,
        clipped:[...el.querySelectorAll('[data-care-reading],header,strong,b,p')].some(n=>{const r=n.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||n.scrollWidth>n.clientWidth+1;})};
    });
    const values=()=>readings.locator('[role="meter"]').evaluateAll(nodes=>nodes.map(el=>Number(el.getAttribute('aria-valuenow'))));
    const alerts=()=>readings.locator('[data-care-reading]').evaluateAll(nodes=>nodes.map(el=>el.dataset.careAttention==='true'));
    assert.deepEqual(await values(),[22.5,43.5,12]);assert.deepEqual(await alerts(),[true,true,true]);
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      assert.deepEqual(await geometry(),{overflow:false,cards:3,clipped:false});
      await capture('garden-care-readings-'+width+'.png');await capture('garden-care-readings-inspector-'+width+'.png',panel);
      assert.deepEqual(await state(),baseline);findings.viewports.push({width,overflow:false,cards:3,clipped:false});
    }
    await patch({readableMode:true});assert.deepEqual(await geometry(),{overflow:false,cards:3,clipped:false});await capture('garden-care-readings-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-crop-care]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    const stages=[['water',[47.5,43.5,12],[false,true,true]],['weed',[47.5,23.5,12],[false,false,true]],['compost',[47.5,23.5,27],[false,false,false]]];
    for(const [action,expected,expectedAlerts] of stages){
      await care.locator('[data-crop-care-action="'+action+'"]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-crop-care="0"]'));
      assert.deepEqual(await values(),expected);assert.deepEqual(await alerts(),expectedAlerts);
      assert.deepEqual(await geometry(),{overflow:false,cards:3,clipped:false});
      const saved=await state();assert.equal(saved.grid[0].health,25);assert.equal(saved.grid[0].growthDay,40);assert.equal(saved.day,baseline.day);assert.equal(saved.budget,baseline.budget);
      await capture('garden-care-readings-after-'+action+'-320.png');
    }
    // Nitrogen ranges follow the selected crop, while missing measurements never become a zero-valued meter.
    await patch({nitrogen:2});await page.locator('[data-play-focus-step="1"]').focus();await page.keyboard.press('Enter');
    assert.equal(await readings.getAttribute('data-care-readings'),'1');
    const nitrogen=readings.locator('[data-care-reading="nitrogen"]');assert.equal(await nitrogen.getAttribute('data-care-attention'),'false');assert.equal(await nitrogen.locator('.cp-care-reading-range').count(),0);
    assert.equal(await nitrogen.locator('[data-care-reading-status]').innerText(),'Not limiting this crop');await capture('garden-care-readings-fixer-320.png');
    const current=await state();await patch({grid:current.grid.map((c,i)=>i===1?{...c,pests:null}:c)});
    const pests=readings.locator('[data-care-reading="pests"]');assert.equal(await pests.locator('[role="meter"]').count(),0);assert.equal(await pests.locator('[data-care-reading-value]').innerText(),'—');assert.equal(await pests.locator('[data-care-reading-status]').innerText(),'Not recorded');assert.equal(await care.locator('[data-crop-care-title]').innerText(),'Some care readings are missing');await capture('garden-care-readings-unknown-320.png');
    await page.locator('[data-play-focus-step="1"]').focus();await page.keyboard.press('Enter');assert.equal(await readings.count(),0);
    // Validate exact boundaries, out-of-range saved values, and the nitrogen rule for all species.
    findings.rules=await page.evaluate(()=>{
      const p=cpVisualQA.plants,cell={pests:0},base={moisture:60,nitrogen:50},get=(c,s)=>cpVisualQA.readings(p.corn,{...cell,...c},{...base,...s});
      for(const [value,attention] of [[29.99,true],[30,false],[90,false],[90.01,true]])if(get({}, {moisture:value})[0].attention!==attention)throw Error('Moisture boundary');
      for(const [value,attention] of [[30,false],[30.01,true]])if(get({pests:value},{})[1].attention!==attention)throw Error('Pest boundary');
      for(const [value,attention] of [[14.99,true],[15,false]])if(get({}, {nitrogen:value})[2].attention!==attention)throw Error('Nitrogen boundary');
      for(const missing of [undefined,null,NaN,Infinity,-1]){
        const r=get({pests:missing},{moisture:missing,nitrogen:missing});if(!r.every(x=>x.value===null&&!x.attention&&x.status==='Not recorded'&&x.range===null))throw Error('Invalid measurement invented a value');
      }
      if(get({pests:130},{})[1].max!==130||get({pests:130},{})[1].value!==130)throw Error('Legacy high reading clipped');
      let crops=0,structures=0;
      for(const plant of Object.values(p)){
        const result=cpVisualQA.readings(plant,cell,{...base,nitrogen:2});
        if(plant.isStructure){if(result.length)throw Error('Habitat got crop readings');structures++;}
        else{if(result[2].attention!==(plant.nEffect<0)||!!result[2].range!==(plant.nEffect<0))throw Error('Wrong nitrogen role');crops++;}
      }
      return {crops,structures,thresholds:true,unknownValues:true,legacyHighValues:true};
    });
    await patch({...initial,readableMode:true});await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await care.focus();
    assert.equal(await care.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal(await readings.locator('.cp-care-reading-range').first().evaluate(el=>getComputedStyle(el).borderTopStyle),'dashed');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});
    const fill=readings.locator('[data-care-reading="moisture"] .cp-care-reading-fill');assert.equal(await fill.evaluate(el=>getComputedStyle(el).transitionDuration),'0.35s');
    await patch({moisture:60});await page.waitForFunction(()=>document.querySelector('[data-care-reading="moisture"] [role="meter"]').getAttribute('aria-valuenow')==='60');
    await page.waitForFunction(()=>document.querySelector('[data-care-readings]').getAnimations({subtree:true}).every(a=>a.playState!=='running'));
    assert.equal(await fill.evaluate(el=>el.style.width),'60%');
    await patch({reducedMotion:true});assert.equal(await fill.evaluate(el=>getComputedStyle(el).transitionProperty),'none');assert.ok(await fill.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=.00001));
    await patch({reducedMotion:false});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await fill.evaluate(el=>getComputedStyle(el).transitionProperty),'none');assert.ok(await fill.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=.00001));
    await patch({phase:'plan',plantingTarget:3,selectedPlant:'beans',placementPreview:{plot:3,plantId:'beans'}});assert.equal(await readings.count(),0);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('All concurrent care needs remain visible and only addressed signals clear after real actions','Meters retain exact values, scopes, and accessible care ranges with no false health recovery','Nitrogen guidance follows each of 31 crops; habitat and unknown values are excluded','Desktop, 320px, larger text, keyboard focus, forced colors, and accessibility pass','Value transitions finish and respect both reduced-motion preferences','Planning and preview guards, stale-crop navigation, and cleanup remain correct');
    fs.writeFileSync(path.join(out,'care-readings-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'care-readings-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
