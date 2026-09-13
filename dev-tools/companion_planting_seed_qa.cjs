// Run from the repository root: node dev-tools/companion_planting_seed_qa.cjs
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
    await page.setContent('<!doctype html><html lang="en"><head><title>Companion Planting Lab · gameplay verification</title></head><body><main id="root"></main></body></html>');
    const cssDir = path.join(root, 'app/static/css');
    const css = fs.readdirSync(cssDir).find(file => /^main\..*\.css$/.test(file));
    await page.addStyleTag({ path: path.join(cssDir, css) });
    await page.addStyleTag({ content: 'body{margin:0;background:#eff3ef;font-family:system-ui}#root{max-width:1152px;margin:16px auto;padding:0 12px}button,select,input,textarea{font:inherit}@media(max-width:640px){#root{padding:0 6px;margin:6px auto}}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_companionplanting.js') });
    await page.evaluate(() => {
      const NativeObserver=window.IntersectionObserver;
      window.IntersectionObserver=class extends NativeObserver {
        constructor(callback,options){super(callback,options);this.qaCallback=callback;}
        observe(target){
          if(target.getAttribute('aria-describedby')==='community-plot-help')window.cpGardenVisibility={callback:this.qaCallback,observer:this,target};
          return super.observe(target);
        }
      };
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

    await page.locator('[data-play-console]').waitFor();
    const primary=page.locator('[data-play-primary]');
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    const patch=async change=>{await page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);};
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    const measure=()=>page.evaluate(()=>({height:document.documentElement.scrollHeight,canvasTop:document.querySelector('canvas[aria-describedby="community-plot-help"]').getBoundingClientRect().top+scrollY,primaryTop:document.querySelector('[data-play-primary]').getBoundingClientRect().top+scrollY,overflow:document.documentElement.scrollWidth>innerWidth}));

    const grid=Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    grid[0]={...grid[0],plantId:'corn',growthDay:30};
    grid[1]={...grid[1],plantId:'tomato',growthDay:22};
    grid[5]={...grid[5],plantId:'basil',growthDay:18};
    await patch({grid,phase:'plan',day:35,budget:41,plantingTarget:4,selectedPlant:null,placementPreview:null,relationshipFocus:null,reducedMotion:true});
    const dock=page.locator('[data-planting-dock-surface="simulation"]');
    const chooser=dock.locator('[data-seed-browser]');
    const search=dock.locator('[data-seed-search]');
    const strip=dock.locator('.cp-seed-strip');
    await chooser.waitFor();
    await chooser.scrollIntoViewIfNeeded();
    const before=await state();
    const total=await dock.locator('[data-planting-candidate]').count();
    assert.ok(total>25);
    assert.equal(await dock.locator('[data-planting-candidate] svg').count(),total,'each packet shows a botanical portrait');
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      await chooser.scrollIntoViewIfNeeded();
      await strip.evaluate(el=>el.scrollLeft=0);
      await chooser.screenshot({path:path.join(out,'garden-seed-packets-'+width+'.png'),style:'.cp-play-nav{position:static!important}'});
      assert.equal((await measure()).overflow,false);
      const first=await strip.evaluate(el=>el.scrollLeft);
      await dock.locator('[data-seed-scroll="1"]').click();
      await page.waitForFunction(()=>document.querySelector('#cp-seed-choices-simulation').scrollLeft>0);
      assert.ok(await strip.evaluate(el=>el.scrollLeft)>first,'arrow browses the shelf');
      // Focusing a distant packet reveals it without a pointer or a page-wide scroll.
      await dock.locator('[data-planting-candidate]').last().focus();
      const keyboard=await dock.locator('[data-planting-candidate]').last().evaluate(el=>{
        const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();
        return a.left>=b.left-1 && a.right<=b.right+1;
      });
      assert.equal(keyboard,true,'keyboard focus reveals the last packet');
      findings.viewports.push({width,overflow:false,keyboardReveal:true});
    }
    await search.fill('  RaDiSh  ');
    assert.ok(await dock.locator('[data-planting-candidate="radish"]').count());
    assert.equal(await dock.locator('[data-planting-candidate="rain_barrel"]').count(),0);
    assert.equal(await strip.evaluate(el=>el.scrollLeft),0,'search resets horizontal position');
    const afterSearch=await state();
    assert.deepEqual(afterSearch.grid,before.grid);assert.equal(afterSearch.budget,before.budget);assert.equal(afterSearch.day,before.day);
    await search.fill('no-such-seed-193');
    await dock.locator('[data-seed-reset]').click();
    assert.equal(await search.inputValue(),'');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'cp-seed-search-simulation');
    assert.equal(await dock.locator('[data-planting-candidate]').count(),total);
    await search.fill('beans');
    await dock.locator('[data-planting-candidate="beans"]').click();
    const preview=structuredClone((await state()).placementPreview);
    assert.equal((await state()).budget,before.budget);
    await search.fill('lavender');
    assert.deepEqual((await state()).placementPreview,preview,'search retains staged placement');
    assert.equal((await state()).selectedPlant,'beans');
    await dock.locator('[data-placement-preview] .cp-preview-portrait svg').waitFor();
    await dock.locator('[data-placement-preview]').screenshot({path:path.join(out,'garden-seed-preview-320.png'),style:'.cp-play-nav{position:static!important}'});
    await dock.locator('[data-confirm-placement-preview]').click();
    const planted=await state();assert.equal(planted.grid[4].plantId,'beans');assert.ok(planted.budget<before.budget);
    assert.equal(planted.day,before.day);
    // Both category and text filters apply, and reset is a path back from an empty combination.
    await patch({plantingTarget:8,selectedPlant:null,placementPreview:null,plantingDockSearch:'',plantingDockFilter:'structures'});
    assert.ok(await dock.locator('[data-planting-candidate="rain_barrel"]').count());
    assert.equal(await dock.locator('[data-planting-candidate="corn"]').count(),0);
    assert.match(await dock.locator('[data-planting-candidate="rain_barrel"]').innerText(),/Habitat structure/);
    assert.doesNotMatch(await dock.locator('[data-planting-candidate="rain_barrel"]').innerText(),/growth days/);
    await patch({budget:0});
    assert.equal(await dock.locator('[data-planting-candidate="rain_barrel"]').isDisabled(),true);
    assert.match(await dock.locator('[data-planting-candidate="rain_barrel"]').innerText(),/Need funds/);
    await patch({budget:41,plantingDockFilter:'helpers',readableMode:true,day:95});
    await chooser.scrollIntoViewIfNeeded();
    await chooser.screenshot({path:path.join(out,'garden-seed-helpers-320.png'),style:'.cp-play-nav{position:static!important}'});
    assert.match(await chooser.locator('.cp-seed-note').innerText(),/Winter pauses/);
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-seed-browser="simulation"]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await patch({reducedMotion:false});
    assert.notEqual(await dock.locator('.cp-seed-packet').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
    await patch({reducedMotion:true});
    const still=await dock.locator('.cp-seed-packet').first().evaluate(el=>getComputedStyle(el).transitionDuration);
    assert.ok(still==='0s'||still==='1e-05s',still);
    await patch({reducedMotion:false});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(parseFloat(await dock.locator('.cp-seed-packet').first().evaluate(el=>getComputedStyle(el).transitionDuration))<=.01);
    findings.assertions.push('Botanical packets for every choice','Phone containment and keyboard shelf navigation','Case-insensitive search and empty-result reset',
      'Search preserves funds, time, and staged previews','Planting still requires confirmation','Category filters, structure labels, and affordability',
      'Winter guidance, larger text, and both reduced-motion preferences');
    assert.deepEqual(findings.errors,[]);
    fs.writeFileSync(path.join(out,'seed-packet-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
