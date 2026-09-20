// Run from the repository root: node dev-tools/companion_planting_preview_pairs_qa.cjs
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
    const grid=empty();for(const [index,plantId] of [[0,'corn'],[1,'onion'],[2,'squash'],[4,'onion'],[6,'potato'],[8,'marigold'],[9,'yarrow'],[10,'onion'],[15,'corn']])grid[index]={...grid[index],plantId,growthDay:index===1?0:100,health:index===4?25:95};
    await patch({grid,phase:'plan',day:35,budget:41,moisture:60,nitrogen:50,plantingTarget:5,selectedPlant:'radish',placementPreview:{plot:5,plantId:'beans'},reducedMotion:true});
    const dock=page.locator('[data-planting-dock-surface="simulation"]'),preview=dock.locator('[data-placement-preview]'),pairs=dock.locator('[data-preview-pairs]'),cards=pairs.locator('[data-preview-pair-plot]');
    await pairs.waitFor();const initial=await state();
    const expected=await page.evaluate(()=>[0,1,2,4,6,8,9,10].map(index=>({index,plantId:cpData.companionPlanting.communityGarden.grid[index].plantId})).map(item=>({...item,relationship:cpVisualQA.relationships.find(r=>r.a==='beans'&&r.b===item.plantId||r.b==='beans'&&r.a===item.plantId)})));
    assert.equal(await cards.count(),8);assert.match(await pairs.locator('.cp-preview-pairs-heading').textContent(),/How Beans fits here/);
    assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.previewPairPlot))),[1,4,10,0,2,6,9,8]);
    assert.equal(await pairs.locator('[data-preview-pairs-net]').textContent(),'+13% net pair effect');
    for(const item of expected){
      const card=pairs.locator(`[data-preview-pair-plot="${item.index}"]`);
      assert.equal(await card.locator('svg').getAttribute('data-botanical-crop'),item.plantId);
      assert.equal(await card.locator('[data-preview-pair-bonus]').textContent(),(item.relationship.bonus>0?'+':'')+item.relationship.bonus+'%');
      assert.equal(await card.locator('[data-preview-pair-reason]').textContent(),item.relationship.desc);
      assert.equal(await card.getAttribute('data-preview-relationship'),item.relationship.bonus>0?'helpful':'conflict');
    }
    assert.equal(await pairs.locator('[data-preview-pair-plot="1"] svg').getAttribute('data-botanical-stage'),'seed');
    assert.equal(await pairs.locator('[data-preview-pair-plot="4"] svg').getAttribute('data-botanical-condition'),'low');
    assert.equal(await pairs.locator('[data-preview-pair-plot="15"]').count(),0);
    const more=pairs.locator('[data-preview-pair-more]'),summary=more.locator('summary');
    assert.equal(await summary.textContent(),'Show 6 more relationships · 1 more conflict');
    const geometry=()=>pairs.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,
      clipped:[...el.querySelectorAll('.cp-preview-pair-card,.cp-preview-pair-head,.cp-preview-pair-name')].filter(n=>n.checkVisibility()).some(n=>n.scrollWidth>n.clientWidth+1),
      visible:[...el.querySelectorAll('[data-preview-pair-plot]')].filter(n=>n.checkVisibility()).length,
      target:el.querySelector('summary')?.getBoundingClientRect().height>=44}));
    const capture=async(name,target=pairs)=>{const viewport=page.viewportSize();await page.setViewportSize({...viewport,height:2200});await target.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});await page.setViewportSize(viewport);};
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await pairs.scrollIntoViewIfNeeded();
      assert.deepEqual(await geometry(),{overflow:false,clipped:false,visible:2,target:true});
      await capture('garden-preview-pairs-'+width+'.png');
      await capture('garden-planting-review-'+width+'.png',preview);
      await summary.focus();await page.keyboard.press('Enter');
      assert.deepEqual(await geometry(),{overflow:false,clipped:false,visible:8,target:true});
      assert.equal(await summary.evaluate(el=>document.activeElement===el),true);
      await capture('garden-preview-pairs-expanded-'+width+'.png');await page.keyboard.press('Enter');
      assert.deepEqual(await state(),initial);findings.viewports.push({width,collapsed:2,expanded:8,overflow:false,clipped:false,keyboardDisclosure:true});
    }
    await patch({readableMode:true});await summary.click();assert.deepEqual(await geometry(),{overflow:false,clipped:false,visible:8,target:true});
    await capture('garden-preview-pairs-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-preview-pairs="simulation"]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await summary.focus();
    assert.equal(await summary.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});
    assert.equal(await pairs.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,'neighbor portraits stay still');
    await page.emulateMedia({reducedMotion:'reduce'});await patch({reducedMotion:true,readableMode:false});
    // Current neighbor changes recompute the cards, without touching the staged crop.
    await patch({grid:grid.map((cell,index)=>[1,4,10].includes(index)?{...cell,plantId:null}:cell)});
    assert.equal(await pairs.locator('[data-preview-relationship="conflict"]').count(),0);
    assert.equal(await pairs.locator('[data-preview-pairs-net]').textContent(),'+58% net pair effect');assert.deepEqual((await state()).placementPreview,initial.placementPreview);
    // Edge plots include diagonals but never wrap across a row or reach distant beds.
    const corner=empty();for(const [index,plantId] of [[1,'corn'],[4,'squash'],[5,'onion'],[3,'onion'],[15,'corn']])corner[index]={...corner[index],plantId,growthDay:40};
    await patch({grid:corner,plantingTarget:0,selectedPlant:'beans',placementPreview:{plot:0,plantId:'beans'}});
    assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.previewPairPlot))),[5,1,4]);
    assert.equal(await pairs.locator('[data-preview-pairs-net]').textContent(),'+15% net pair effect');
    const beforeChange=await state();await dock.locator('[data-preview-try-another]').click();assert.equal(await pairs.count(),0);
    for(const key of ['grid','budget','day'])assert.deepEqual((await state())[key],beforeChange[key]);
    await dock.locator('[data-planting-candidate="beans"]').click();await pairs.waitFor();
    await page.waitForFunction(()=>document.activeElement.matches('[data-planting-dock-surface="simulation"] [data-confirm-placement-preview]'));
    const beforePlant=await state(),cost=await page.evaluate(()=>cpVisualQA.plants.beans.cost*.1);
    await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement===__cgCanvasEl&&cpData.companionPlanting.communityGarden.grid[0].plantId==='beans');
    assert.equal(await pairs.count(),0);const planted=await state();assert.equal(planted.grid[0].growthDay,0);assert.equal(planted.day,beforePlant.day);assert.ok(Math.abs(planted.budget-(beforePlant.budget-cost))<.001);
    // A preview may show conflicts even when unaffordable; it still cannot commit.
    await patch({grid:corner,phase:'plan',budget:0,plantingTarget:0,selectedPlant:'beans',placementPreview:{plot:0,plantId:'beans'}});await pairs.waitFor();
    assert.equal(await dock.locator('[data-confirm-placement-preview]').isDisabled(),true);assert.equal((await state()).grid[0].plantId,null);
    await patch({grid:empty(),budget:41,selectedPlant:'rain_barrel',placementPreview:{plot:0,plantId:'rain_barrel'}});
    assert.equal(await pairs.count(),0);assert.equal(await dock.locator('[data-confirm-placement-preview]').isDisabled(),false);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Exact modeled relationships use the staged crop identity, include diagonals, and exclude distant beds','Conflicts appear first and the disclosure names additional hidden conflicts','Each neighbor shows its current stage, health, signed effect, and model explanation','Reading or expanding pair evidence preserves the complete staged garden state','Neighbor changes, cancellation, real confirmation, insufficient funds, and empty habitat previews remain correct','Desktop, 320px, larger text, keyboard disclosure, still artwork, forced-color focus, accessibility, and cleanup pass');
    fs.writeFileSync(path.join(out,'preview-pairs-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'preview-pairs-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
