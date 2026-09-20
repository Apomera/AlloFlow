// Run from the repository root: node dev-tools/companion_planting_inspector_pairs_qa.cjs
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
    const grid=empty();for(const [index,plantId] of [[0,'corn'],[1,'onion'],[2,'squash'],[4,'onion'],[5,'beans'],[6,'potato'],[8,'marigold'],[9,'yarrow'],[10,'onion'],[15,'corn']])grid[index]={...grid[index],plantId,growthDay:index===1?0:100,health:index===4?25:95};
    await patch({grid,phase:'grow',day:35,budget:41,moisture:60,nitrogen:50,relationshipFocus:5,reducedMotion:true,readableMode:false});
    const panel=page.locator('[data-play-focus-panel]'),pairs=panel.locator('[data-play-neighbors]'),cards=pairs.locator('[data-play-neighbor-link]'),more=pairs.locator('[data-inspector-pairs-more]'),summary=more.locator('summary');
    await pairs.waitFor();const initial=await state();
    const expected=await page.evaluate(()=>[0,1,2,4,6,8,9,10].map(index=>({index,plantId:cpData.companionPlanting.communityGarden.grid[index].plantId})).map(item=>({...item,relationship:cpVisualQA.relationships.find(r=>r.a==='beans'&&r.b===item.plantId||r.b==='beans'&&r.a===item.plantId)})));
    assert.equal(await cards.count(),8);assert.equal(await pairs.locator('[data-inspector-pair-contribution="helpful"]').innerText(),'+58%');assert.equal(await pairs.locator('[data-inspector-pair-contribution="conflict"]').innerText(),'-45%');
    assert.equal(await pairs.locator('[data-play-neighbor-total]').innerText(),'+13% modeled growth effect');
    assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.playNeighborLink))),[1,4,10,8,6,9,2,0]);
    for(const item of expected){
      const card=pairs.locator(`[data-play-neighbor-link="${item.index}"]`);
      assert.equal(await card.locator('svg').getAttribute('data-botanical-crop'),item.plantId);
      assert.equal(await card.locator('[data-inspector-pair-bonus]').textContent(),(item.relationship.bonus>0?'+':'')+item.relationship.bonus+'%');
      assert.equal(await card.locator('[data-inspector-pair-reason]').textContent(),item.relationship.desc);
      assert.equal(await card.getAttribute('data-tone'),item.relationship.bonus>0?'helpful':'conflict');
      assert.equal(await card.locator('.cp-neighbor-compass>[data-center="true"]').count(),1);
      const position=(Math.floor(item.index/4)-1+1)*3+item.index%4-1+1;
      assert.equal(await card.locator('.cp-neighbor-compass').evaluate(el=>[...el.children].findIndex(n=>n.dataset.neighbor==='true')),position);
      assert.match(await card.getAttribute('aria-label'),new RegExp('row '+(Math.floor(item.index/4)+1)+', column '+(item.index%4+1)));
    }
    assert.equal(await pairs.locator('[data-inspector-pair-art="1"] svg').getAttribute('data-botanical-stage'),'seed');
    assert.equal(await pairs.locator('[data-inspector-pair-art="4"] svg').getAttribute('data-botanical-condition'),'low');
    assert.equal(await pairs.locator('[data-play-neighbor-link="15"]').count(),0);assert.equal(await summary.innerText(),'Show 4 more relationships');
    const geometry=()=>pairs.evaluate(el=>({overflow:document.documentElement.scrollWidth>innerWidth,
      clipped:[...el.querySelectorAll('.cp-specimen-link,.cp-neighbor-head,.cp-neighbor-name,.cp-neighbor-route,.cp-neighbor-contribution')].filter(n=>n.checkVisibility()).some(n=>n.scrollWidth>n.clientWidth+1),
      visible:[...el.querySelectorAll('[data-play-neighbor-link]')].filter(n=>n.checkVisibility()).length,
      targets:[...el.querySelectorAll('button,summary')].filter(n=>n.checkVisibility()).every(n=>n.getBoundingClientRect().height>=44),
      portraitColumns:getComputedStyle(el.querySelector('.cp-neighbor-head')).display==='grid'}));
    const capture=async(name,target=pairs)=>{const viewport=page.viewportSize(),bounds=await target.boundingBox();await page.setViewportSize({...viewport,height:Math.max(viewport.height,Math.ceil(bounds.height)+180)});await target.scrollIntoViewIfNeeded();await target.screenshot({path:path.join(out,name),style:'.cp-play-nav{visibility:hidden!important}'});await page.setViewportSize(viewport);};
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      assert.deepEqual(await geometry(),{overflow:false,clipped:false,visible:4,targets:true,portraitColumns:true});
      await capture('garden-inspector-pairs-'+width+'.png');
      if(width===1280)await capture('garden-inspector-companions-1280.png',panel);
      await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>document.activeElement===el),true);
      assert.deepEqual(await geometry(),{overflow:false,clipped:false,visible:8,targets:true,portraitColumns:true});await capture('garden-inspector-pairs-expanded-'+width+'.png');
      await page.keyboard.press('Enter');assert.deepEqual(await state(),initial);findings.viewports.push({width,collapsed:4,expanded:8,targets:true,overflow:false,clipped:false});
    }
    await patch({readableMode:true});assert.equal(await pairs.locator('.cp-neighbor-plot').first().evaluate(el=>getComputedStyle(el).fontSize),'13px');assert.equal(await pairs.locator('.cp-neighbor-route').first().evaluate(el=>getComputedStyle(el).fontSize),'13px');
    assert.deepEqual(await geometry(),{overflow:false,clipped:false,visible:4,targets:true,portraitColumns:true});await capture('garden-inspector-pairs-readable-320.png');
    await summary.click();await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-play-neighbors]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});await cards.first().focus();assert.equal(await cards.first().evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});await cards.first().hover();
    await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[data-play-neighbor-link] .cp-neighbor-art>svg')).transform).f< -1.9);
    await patch({reducedMotion:true});assert.equal(await cards.first().locator('svg').evaluate(el=>getComputedStyle(el).transform),'none');
    await patch({reducedMotion:false});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await cards.first().locator('svg').evaluate(el=>getComputedStyle(el).transform),'none');
    assert.equal(await pairs.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    // Inspect a real neighbor via keyboard; preserve garden contents, funds, time, and rewards.
    const beforeInspect=await state();await pairs.locator('[data-play-neighbor-link="4"]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.matches('[data-play-focus-panel]')&&cpData.companionPlanting.communityGarden.relationshipFocus===4);
    const inspected=await state();for(const key of ['grid','budget','day','phase','score','totalHarvested','lastHarvestBatch','harvestBatches'])assert.deepEqual(inspected[key],beforeInspect[key]);
    assert.equal(await panel.locator('#cp-specimen-title').innerText(),'Onion');
    await pairs.locator('[data-play-neighbor-link="5"]').click();await page.waitForFunction(()=>document.activeElement.matches('[data-play-focus="5"]'));assert.equal(await more.getAttribute('open'),null);
    // Live contribution updates, including the zero-conflict case.
    await patch({grid:grid.map((cell,index)=>[1,4,10].includes(index)?{...cell,plantId:null}:cell)});
    assert.equal(await pairs.locator('[data-inspector-pair-contribution="conflict"]').innerText(),'0%');assert.equal(await pairs.locator('[data-play-neighbor-total]').innerText(),'+58% modeled growth effect');assert.equal(await pairs.locator('[data-play-neighbor-link="1"]').count(),0);
    // Every conflict remains discoverable, even when more than four neighbors compete.
    const conflictGrid=empty();conflictGrid[5].plantId='beans';for(const index of [0,1,2,4,6,8,9,10])conflictGrid[index].plantId='onion';await patch({grid:conflictGrid,reducedMotion:true});
    assert.equal(await summary.innerText(),'Show 4 more relationships · 4 more conflicts');assert.equal(await pairs.locator('[data-play-neighbor-total]').innerText(),'-120% modeled growth effect');await capture('garden-inspector-pairs-conflicts-320.png');
    const corner=empty();for(const [index,plantId] of [[0,'beans'],[1,'corn'],[4,'squash'],[5,'onion'],[3,'onion'],[15,'corn']])corner[index].plantId=plantId;
    await patch({grid:corner,relationshipFocus:0});assert.equal(await cards.count(),3);assert.equal(await more.count(),0);assert.equal(await pairs.locator('[data-play-neighbor-total]').innerText(),'+15% modeled growth effect');
    assert.equal(await pairs.locator('[data-inspector-pair-direction="5"]').innerText(),'Southeast bed');assert.equal(await pairs.locator('[data-play-neighbor-link="3"]').count(),0);
    const isolated=empty();isolated[0].plantId='beans';isolated[1].plantId='bee_hotel';await patch({grid:isolated});assert.equal(await cards.count(),0);assert.equal(await pairs.locator('[data-inspector-pair-balance]').count(),0);assert.match(await pairs.innerText(),/No modeled companion pairs/);
    await patch({relationshipFocus:1});assert.equal(await pairs.count(),0);await patch({relationshipFocus:15});assert.equal(await panel.count(),0);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Exact support, conflict, and net effects agree with current modeled neighbors','All eight compass directions and current botanical stages/health reflect the actual garden','Keyboard inspection preserves plantings, funds, time, and harvest rewards; returning resets the disclosure','Live changes, hidden conflict counts, corner adjacency, empty pairs, habitat, and invalid selection pass','Desktop, 320px, larger text, 44px targets, forced colors, bounded hover, both reduced-motion settings, accessibility, and cleanup pass');
    fs.writeFileSync(path.join(out,'inspector-pairs-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  }catch(error){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'inspector-pairs-failure.png'),fullPage:false});throw error;}
  finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});