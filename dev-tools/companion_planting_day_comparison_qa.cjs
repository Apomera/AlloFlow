// Run from the repository root: node dev-tools/companion_planting_day_comparison_qa.cjs
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
    await page.evaluate(()=>{Math.random=()=>.99;});
    const grid=empty();grid[0]={...grid[0],plantId:'radish',growthDay:4.9,health:95};
    grid[1]={...grid[1],plantId:'carrot',growthDay:20,health:35};grid[4]={...grid[4],plantId:'corn',growthDay:89.9,health:88};
    grid[5]={...grid[5],plantId:'strawberry',growthDay:14,health:94};
    await patch({grid,phase:'grow',day:0,year:1,budget:41,totalHarvested:7,moisture:60,nitrogen:50,pH:8.5,reducedMotion:true});
    const primary=page.locator('[data-play-primary]');await primary.click();
    const report=page.locator('[data-play-day-result]');await report.waitFor();
    const afterDay=await state(),saved=afterDay.lastDayReport;
    const snapshot=(index,side)=>report.locator(`[data-day-snapshot="${index}-${side}"]`);
    for(const change of saved.plotChanges.filter(change=>change.plantId)){
      for(const side of ['before','after']){
        const portrait=snapshot(change.index,side);
        assert.equal(await portrait.getAttribute('data-snapshot-plant'),change[side+'PlantId']);
        assert.equal(Number(await portrait.getAttribute('data-snapshot-maturity')),change[side+'Maturity']);
        assert.equal(Number(await portrait.getAttribute('data-snapshot-health')),change[side+'Health']);
        assert.equal(await portrait.getAttribute('data-snapshot-ready'),String(change[side+'Ready']));
        assert.equal(await portrait.locator('svg').getAttribute('aria-hidden'),'true');
      }
    }
    assert.equal(await snapshot(0,'before').locator('svg').getAttribute('data-botanical-stage'),'sprout');
    assert.equal(await snapshot(0,'after').locator('svg').getAttribute('data-botanical-stage'),'leafing');
    assert.equal(await snapshot(4,'before').getAttribute('data-snapshot-ready'),'false');
    assert.equal(await snapshot(4,'after').getAttribute('data-snapshot-ready'),'true');
    const geometry=()=>report.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,
      clipped:[...el.querySelectorAll('.cp-day-highlight,.cp-day-snapshot')].filter(n=>n.getBoundingClientRect().height).some(n=>n.scrollWidth>n.clientWidth+1),
      paired:[...el.querySelectorAll('.cp-day-comparison')].filter(n=>n.getBoundingClientRect().height).every(n=>n.children[0].getBoundingClientRect().right<=n.children[2].getBoundingClientRect().left),
      targets:[...el.querySelectorAll('button,summary')].filter(n=>n.getBoundingClientRect().height).every(n=>n.getBoundingClientRect().height>=44)}));
    const capture=async name=>{const viewport=page.viewportSize();await page.setViewportSize({...viewport,height:2000});await report.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});await page.setViewportSize(viewport);};
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await page.locator('[data-play-review-day]').click();
      await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-day-result'));
      const check=await geometry();assert.deepEqual(check,{overflow:false,clipped:false,paired:true,targets:true});
      await capture('garden-day-comparison-'+width+'.png');
      const more=report.locator('.cp-day-more summary');await more.focus();await page.keyboard.press('Enter');
      assert.equal(await snapshot(0,'before').isVisible(),true);assert.deepEqual(await geometry(),check);
      await capture('garden-day-comparison-expanded-'+width+'.png');await page.keyboard.press('Enter');
      assert.equal(await more.evaluate(el=>document.activeElement===el),true);
      findings.viewports.push({width,...check,keyboardDisclosure:true});
    }
    // Historical artwork stays unchanged after care and after a new crop takes the bed.
    const beforePortrait=await snapshot(0,'before').innerHTML(),afterPortrait=await snapshot(0,'after').innerHTML();
    await page.locator('[data-play-day-return]').click();await page.locator('[data-play-water]').click();
    assert.deepEqual((await state()).lastDayReport,saved);assert.equal(await snapshot(0,'after').innerHTML(),afterPortrait);
    await patch({grid:afterDay.grid.map((cell,index)=>index===0?{...cell,plantId:'tomato',growthDay:90,health:5}:cell)});
    assert.equal(await snapshot(0,'before').innerHTML(),beforePortrait);assert.equal(await snapshot(0,'after').innerHTML(),afterPortrait);
    assert.equal(await report.locator('[data-play-day-focus="0"]').count(),0);assert.deepEqual((await state()).lastDayReport,saved);
    await patch({grid:afterDay.grid,moisture:afterDay.moisture});
    const funds=(await state()).budget;await report.locator('[data-play-day-focus="4"]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='4');assert.equal((await state()).budget,funds);assert.equal((await state()).day,1);
    await page.locator('[data-play-focus-close]').click();
    await patch({readableMode:true});assert.deepEqual(await geometry(),{overflow:false,clipped:false,paired:true,targets:true});
    await capture('garden-day-comparison-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    const axeScope=()=>page.evaluate(async()=>(await axe.run({include:['[data-play-day-result]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    findings.accessibility=await axeScope();assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({reducedMotion:'no-preference'});await patch({reducedMotion:false,readableMode:false});
    assert.equal(await report.locator('.cp-day-comparison').first().evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'saved portraits do not animate into new growth');
    await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await report.locator('[data-play-day-focus="4"]').focus();
    assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
    const winter=empty();winter[0]={...winter[0],plantId:'corn',growthDay:30};winter[1]={...winter[1],plantId:'strawberry',growthDay:10};winter[2].plantId='bee_hotel';
    await patch({grid:winter,day:119,year:1,phase:'grow',pH:6.5,moisture:60,nitrogen:50,lastDayReport:null,lastCareAction:null,lastFeedback:null,predictionResult:null,relationshipFocus:null,reducedMotion:true});
    await primary.click();await page.waitForFunction(()=>document.querySelector('[data-play-day-result="120"]'));
    assert.equal(await snapshot(0,'before').getAttribute('data-snapshot-plant'),'corn');
    assert.equal(await snapshot(0,'after').getAttribute('data-snapshot-state'),'empty');assert.match(await snapshot(0,'after').textContent(),/Open bed/);
    assert.equal(await snapshot(0,'after').locator('svg').getAttribute('data-botanical-crop'),'empty');
    assert.equal(await snapshot(1,'before').getAttribute('data-snapshot-plant'),'strawberry');assert.equal(await snapshot(1,'after').getAttribute('data-snapshot-plant'),'strawberry');
    assert.equal(await snapshot(2,'before').count(),0,'structures are not presented as crop changes');
    for(const width of [320,1280]){await page.setViewportSize({width,height:1000});await capture('garden-day-comparison-year-'+width+'.png');assert.equal((await geometry()).overflow,false);}
    findings.rolloverAccessibility=await axeScope();assert.deepEqual(findings.rolloverAccessibility,[]);
    const yearState=await state();await report.locator('[data-play-day-replant="0"]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.plantingDockSurface==='simulation');
    assert.equal((await state()).plantingTarget,0);assert.equal((await state()).day,120);assert.equal((await state()).budget,yearState.budget);
    const legacy={day:4,season:'Spring',plotChanges:[{index:0,plantId:'corn',beforeHealth:90,afterHealth:30,afterGrowth:80},{index:1,plantId:'radish',beforeGrowth:99,afterGrowth:100}]};
    await patch({lastDayReport:legacy,grid:empty(),day:4,phase:'plan',plantingTarget:null,lastFeedback:null});
    assert.equal(await snapshot(0,'before').locator('svg').count(),0);assert.match(await snapshot(0,'before').textContent(),/Stage not recorded/);
    assert.match(await snapshot(1,'after').textContent(),/Health not recorded/);assert.equal(await snapshot(1,'after').getAttribute('data-snapshot-ready'),'false');
    assert.doesNotMatch(await report.textContent(),/undefined|NaN/);assert.deepEqual((await state()).lastDayReport,legacy);
    await page.setViewportSize({width:320,height:844});await capture('garden-day-comparison-legacy-320.png');assert.equal((await geometry()).clipped,false);
    const changed={day:7,season:'Spring',plotChanges:[{index:0,plantId:'tomato',beforePlantId:'corn',afterPlantId:'tomato',beforeMaturity:70,afterMaturity:5,beforeHealth:95,afterHealth:100},{index:1,plantId:'carrot',beforePlantId:null,afterPlantId:'carrot',beforeMaturity:0,afterMaturity:0,beforeHealth:100,afterHealth:100}]};
    await patch({lastDayReport:changed});assert.equal(await report.locator('[data-play-day-highlight="0"]').getAttribute('data-play-highlight-kind'),'changed');
    assert.equal(await snapshot(0,'before').getAttribute('data-snapshot-plant'),'corn');assert.equal(await snapshot(0,'after').getAttribute('data-snapshot-plant'),'tomato');
    assert.equal(await snapshot(1,'before').getAttribute('data-snapshot-state'),'empty');assert.equal(await snapshot(1,'after').locator('svg').getAttribute('data-botanical-stage'),'seed');
    assert.deepEqual(await axeScope(),[]);assert.equal((await geometry()).overflow,false);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Actual daily reports render exact before and after crop identities, stages, health, and readiness','Historical portraits remain unchanged after tending or replacing live crops','Annual clearing, perennial carryover, habitat exclusion, empty-to-seed, and crop replacements are distinct','Missing legacy stage and health values are explicit; full maturity alone does not imply readiness','Desktop and 320px paired cards, expandable evidence, inspection, and replanting preserve gameplay','Readable text, still snapshots, forced-color focus, scoped accessibility, and cleanup pass');
    fs.writeFileSync(path.join(out,'day-comparison-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'day-comparison-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
