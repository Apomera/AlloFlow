// Genuine React and WebGL scene with deterministic local investigation inputs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/galaxy-hr-exploration-2026-09-30');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, hasTouch: true });
    const errors = [], checks = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ path: path.join(ROOT, cssAsset) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => page.evaluate(() => window.__galaxyState);
    const patch = async data => { await page.evaluate(data => window.__patchGalaxy(data), data); await settle(); };
    const click = async name => { await page.getByRole('button', { name, exact: true }).click(); await settle(); };

    const selected=async id=>{
      assert.equal((await state()).activeStage,id);
      assert.equal(await page.locator('[data-star-life-canvas]').evaluate(e=>e._stellarStage),id);
      assert.equal(await page.locator('[data-galaxy-hr-stage][aria-pressed="true"]').getAttribute('data-galaxy-hr-stage'),id);
    };
    const point=async id=>{
      const dot=page.locator('[data-galaxy-hr-stage="'+id+'"] [data-galaxy-hr-dot]');await dot.scrollIntoViewIfNeeded();await settle();
      return dot.evaluate(e=>{const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};});
    };
    await page.evaluate(()=>window.__mount({simMode:'star',lifecycleMass:1,activeStage:'main_sequence',metalHunt:{hypothesis:'Preserve my notes.'}}));await settle();
    await page.waitForFunction(()=>document.querySelector('[data-star-life-canvas]')._stellarStage==='main_sequence');
    let p=await point('red_giant');await page.mouse.click(p.x,p.y);await settle();await selected('red_giant');
    await page.locator('[data-galaxy-hr-stage="red_giant"]').focus();await page.keyboard.press('ArrowRight');await settle();await selected('planetary_nebula');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.galaxyHrStage),'planetary_nebula');
    for(const [key,id] of [['End','white_dwarf'],['ArrowRight','white_dwarf'],['Home','protostar'],['ArrowLeft','protostar'],['ArrowDown','main_sequence'],['Space','main_sequence'],['Enter','main_sequence']]){await page.keyboard.press(key);await settle();await selected(id);}
    checks.push('Native mouse and bounded keyboard stage selection update plot and star scene, preserving focus.');
    p=await point('red_giant');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+12,p.y+12);await page.mouse.up();await settle();await selected('main_sequence');
    await page.locator('[data-galaxy-hr-svg]').evaluate(svg=>{
      const b=svg.querySelector('[data-galaxy-hr-stage="red_giant"] [data-galaxy-hr-dot]').getBoundingClientRect();const init={bubbles:true,pointerId:8,button:0,clientX:b.x+b.width/2,clientY:b.y+b.height/2};
      svg.dispatchEvent(new PointerEvent('pointerdown',init));svg.dispatchEvent(new PointerEvent('pointercancel',init));svg.dispatchEvent(new PointerEvent('pointerup',init));
    });await settle();await selected('main_sequence');
    const box=await page.locator('[data-galaxy-hr-svg]').boundingBox();await page.mouse.click(box.x+box.width*.95,box.y+box.height*.65);await settle();await selected('main_sequence');
    checks.push('Drags, canceled pointers, and empty plot space preserve the stage.');
    await page.locator('[data-galaxy-star-keep]').click();await settle();assert.equal((await state()).stellarMassReference,1);
    const kept=await page.locator('[data-galaxy-hr-reference]').getAttribute('d');assert.equal(await page.locator('[data-galaxy-star-comparison-ratios]').textContent(),'Current / kept: 1× luminosity · 1× radius · 1× hydrogen-burning time');
    await page.getByRole('slider',{name:'Star or brown dwarf mass in solar masses',exact:true}).focus();await page.keyboard.press('End');await settle();
    assert.equal((await state()).lifecycleMass,50);assert.equal((await state()).stellarMassReference,1);assert.equal(await page.locator('[data-galaxy-hr-reference]').getAttribute('d'),kept);
    await page.locator('[data-galaxy-mode="metalHunt"]').click();await settle();await page.locator('[data-galaxy-mode="star"]').click();await settle();assert.equal((await state()).stellarMassReference,1);assert.equal((await state()).metalHunt.hypothesis,'Preserve my notes.');
    await page.locator('[data-galaxy-star-keep]').click();await settle();assert.equal((await state()).stellarMassReference,50);
    await page.locator('[data-galaxy-star-use-sun]').click();await settle();assert.equal((await state()).stellarMassReference,1);
    await page.locator('[data-galaxy-star-clear-reference]').click();await settle();assert.equal((await state()).stellarMassReference,null);assert.equal(await page.locator('[data-galaxy-hr-reference]').count(),0);
    checks.push('Keep, Sun, and Clear use native controls; reference survives mass and mode changes while investigation notes remain.');
    const sizes=[];
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:1100});await patch({lifecycleMass:1,activeStage:'main_sequence',stellarMassReference:0.3});
      await page.evaluate(()=>document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).forEach(a=>a.finish()));
      await page.locator('[data-galaxy-hr-diagram]').scrollIntoViewIfNeeded();await settle();
      p=await point('red_giant');await page.touchscreen.tap(p.x-15,p.y);await settle();await selected('red_giant');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const labels=await page.locator('[data-galaxy-hr-svg]').evaluate(svg=>{const v=svg.getBoundingClientRect();return[...svg.querySelectorAll('text')].filter(t=>getComputedStyle(t).display!=='none').map(t=>{const b=t.getBoundingClientRect();return{text:t.textContent,size:parseFloat(getComputedStyle(t).fontSize)*v.width/svg.viewBox.baseVal.width,fits:b.left>=v.left-1&&b.right<=v.right+1&&b.top>=v.top-1&&b.bottom<=v.bottom+1};});});
      assert.deepEqual(labels.filter(t=>!t.fits),[],'Labels fit at '+width);assert(labels.every(t=>t.size>=10),'Readable labels at '+width+': '+JSON.stringify(labels));
      const targets=await page.locator('[data-galaxy-star-comparison] button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(targets.every(h=>h>=44));
      await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>getComputedStyle(e).position==='sticky').forEach(e=>e.style.position='static'));await page.locator('[data-galaxy-hr-diagram]').scrollIntoViewIfNeeded();await settle();await page.setViewportSize({width,height:2100});await page.locator('[data-galaxy-hr-diagram]').scrollIntoViewIfNeeded();await settle();await page.locator('[data-galaxy-hr-diagram]').screenshot({animations:'disabled',path:path.join(OUT,'hr-comparison-'+width+'.png')});await page.setViewportSize({width,height:1100});await settle();
      sizes.push({width,noOverflow:true,readableLabels:true,touchTargets:true,nearPointTouch:true});
    }
    const expanded=await page.locator('[data-galaxy-hr-svg]').evaluate(svg=>{
      const v=svg.getBoundingClientRect(),labels=[...svg.querySelectorAll('text')].filter(t=>/sequence|Giants|Supergiants|White Dwarfs|Sun/.test(t.textContent));
      labels.forEach(t=>{t.dataset.original=t.textContent;t.textContent+='W'.repeat(Math.ceil(t.textContent.length*.4));});
      const outside=labels.filter(t=>{const b=t.getBoundingClientRect();return b.left<v.left-1||b.right>v.right+1;}).map(t=>t.textContent);
      labels.forEach(t=>t.textContent=t.dataset.original);return outside;
    });assert.deepEqual(expanded,[],'Longer translated region labels fit the plot.');checks.push('Region labels retain space with 40% wider text on the smallest layout.');
    await page.evaluate(()=>document.documentElement.dir='rtl');await settle();assert.equal(await page.locator('[data-galaxy-hr-svg]').getAttribute('dir'),'ltr');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator('[data-galaxy-hr-diagram]').scrollIntoViewIfNeeded();await settle();await page.locator('[data-galaxy-hr-diagram]').screenshot({animations:'disabled',path:path.join(OUT,'hr-comparison-320-rtl.png')});
    checks.push('1440, 390, 320 px and RTL preserve readable labels, axis directions, targets, and near-point touch selection.');
    const branches=[];
    for(const m of [0.03,0.3,1,12,30,50]){
      await patch({lifecycleMass:m,activeStage:'main_sequence',stellarMassReference:1});const ids=await page.locator('[data-galaxy-hr-stage]').evaluateAll(es=>es.map(e=>e.dataset.galaxyHrStage));await page.locator('[data-galaxy-hr-stage="main_sequence"]').focus();await page.keyboard.press('End');await settle();await selected(ids[ids.length-1]);
      assert.equal(await page.locator('[data-galaxy-hr-stage][tabindex="0"]').count(),1);assert.equal(await page.locator('[data-galaxy-star-keep]').isDisabled(),m<0.08);assert.equal((await state()).stellarMassReference,1);branches.push({mass:m,plottedStages:ids});
    }
    await patch({lifecycleMass:0.03,activeStage:'main_sequence'});assert.equal(await page.locator('[data-galaxy-star-model="current"] dd').count(),1);assert.equal(await page.locator('[data-galaxy-star-comparison-ratios]').count(),0);assert.equal(await page.locator('[data-galaxy-hr-clipped]').count(),1);
    await page.locator('[data-galaxy-hr-diagram]').scrollIntoViewIfNeeded();await settle();await page.locator('[data-galaxy-hr-diagram]').screenshot({animations:'disabled',path:path.join(OUT,'hr-brown-dwarf-320.png')});
    await patch({lifecycleMass:12,activeStage:'neutron_star'});assert(await page.getByText('Neutron stars radiate as they cool.',{exact:false}).isVisible());assert.equal(await page.locator('[data-galaxy-hr-stage][tabindex="0"]').getAttribute('data-galaxy-hr-stage'),'protostar');
    checks.push('Six mass cases retain one keyboard entry point; brown dwarfs and unmodeled remnants show explicit model limits.');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({passed:true,checks,sizes,branches,errors},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,sizes,errors}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
