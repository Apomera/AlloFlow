// Genuine React and WebGL scene with deterministic local investigation inputs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-rotation-probe-2026-10-01');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');


const kernel=read('stem_lab/stem_tool_galaxy.js').split('// BEGIN GALAXY ROTATION MODEL')[1].split('// END GALAXY ROTATION MODEL')[0];
const model=new Function(kernel+';return {speed:galaxyRotationSpeed,measure:orbitalMeasurementForModel,rate:galaxyRotationAngularRate};')();
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1050},hasTouch:true});
    const errors=[],checks=[],layouts=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({path:path.join(ROOT,cssAsset)});
    for(const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js'])await page.addScriptTag({content:read(f)});
    await page.addScriptTag({content:'window.__uiStrings='+read('ui_strings.js')+';'});
    await page.addScriptTag({content:shell});
    await page.addScriptTag({content:read('stem_lab/stem_tool_galaxy.js')});
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const state=()=>page.evaluate(()=>window.__galaxyState);
    const patch=async p=>{await page.evaluate(p=>window.__patchGalaxy(p),p);await settle();};
    const mount=async p=>{await page.evaluate(p=>window.__mount({simMode:'galaxy',galaxyControlPanel:'motion',starCount:2500,galaxyQuality:'balanced',galaxyAutoRotate:false,...p}),p);await page.waitForFunction(()=>!!document.querySelector('[data-galaxy-canvas]')?._galaxyGetStarVisualState,null,{timeout:60000});await settle();};
    const input=()=>page.locator('#galaxy-rotation-probe-radius');
    const checkValues=async radius=>{
      const points=await page.locator('[data-galaxy-rotation-point]').evaluateAll(all=>all.map(p=>({model:p.dataset.galaxyRotationPoint,radius:Number(p.dataset.radius),speed:Number(p.dataset.speed),x:Number(p.getAttribute('cx')),y:Number(p.getAttribute('cy'))})));
      assert.equal(points.length,3);
      for(const p of points){assert(Math.abs(p.radius-radius)<1e-6);assert(Math.abs(p.speed-model.speed(p.model,radius))<1e-6);assert(Math.abs(p.x-(38+radius/15*270))<1e-6);assert(Math.abs(p.y-(172-p.speed/440*147))<1e-6);assert((await page.locator('[data-galaxy-rotation-row="'+p.model+'"]').textContent()).includes(Math.round(p.speed)+' km/s'));}
      const massRatio=Number(await page.locator('[data-galaxy-rotation-mass-ratio]').getAttribute('data-galaxy-rotation-mass-ratio'));
      assert(Math.abs(massRatio-model.measure('flat',radius).enclosedMassSolar/model.measure('keplerian',radius).enclosedMassSolar)<1e-6);
    };
    const preserved={galaxyEvidenceNote:'Outer orbits need more enclosed mass.',blackHoleNotebook:[{id:'keep',number:1,note:'Keep my saved release.',settings:{blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:1,blackHoleRadialVelocity:0,blackHoleLaunchAngle:41}}]};
    await mount(preserved);await checkValues(8.2);
    await input().focus();await page.keyboard.press('Home');await settle();assert.equal((await state()).rotationProbeRadius,.6);await checkValues(.6);
    await page.keyboard.press('End');await settle();assert.equal((await state()).rotationProbeRadius,15);await checkValues(15);
    await page.keyboard.press('ArrowLeft');await settle();assert.equal((await state()).rotationProbeRadius,14.9);await checkValues(14.9);checks.push('native-keyboard-radius');
    const chart=page.locator('[data-galaxy-rotation-chart]');await chart.scrollIntoViewIfNeeded();
    const box=await chart.boundingBox(),at=r=>box.x+box.width*(38+r/15*270)/320;
    await page.mouse.move(at(12),box.y+box.height*.5);await page.mouse.down();await page.mouse.move(at(3),box.y+box.height*.5,{steps:8});await page.mouse.up();await settle();assert.equal((await state()).rotationProbeRadius,3);await checkValues(3);checks.push('native-pointer-drag');
    await page.mouse.click(box.x+2,box.y+box.height*.5);await settle();assert.equal((await state()).rotationProbeRadius,.6);
    await page.mouse.click(box.x+box.width-2,box.y+box.height*.5);await settle();assert.equal((await state()).rotationProbeRadius,15);checks.push('plot-edge-bounds');
    for(const key of ['rigid','keplerian','flat']) {
      await page.getByRole('button',{name:/Set rotation model:/}).filter({hasText:key==='rigid'?'Rigid disk':key==='keplerian'?'Keplerian':'Flat (observed)'}).click();await settle();
      assert.equal((await state()).rotMode,key);assert.equal((await state()).rotationProbeRadius,15);await checkValues(15);
      assert.equal(await page.locator('[data-galaxy-rotation-row][aria-current="true"]').getAttribute('data-galaxy-rotation-row'),key);
      const sample=await page.locator('[data-galaxy-canvas]').evaluate(c=>c._galaxyGetStarVisualState(40,10,true));
      const r=Math.hypot(sample.base.x,sample.base.z),index=key==='rigid'?0:key==='keplerian'?1:2;
      assert(Math.abs(sample.animated.angularRate-model.rate(index,r))<1e-8);
    }
    checks.push('model-switch-values-and-cpu-motion');
    assert.equal((await state()).galaxyEvidenceNote,preserved.galaxyEvidenceNote);assert.deepEqual((await state()).blackHoleNotebook,preserved.blackHoleNotebook);checks.push('other-investigations-preserved');
    // Native canvas keyboard selects a real star, rather than synthesizing a radius.
    const canvas=page.locator('[data-galaxy-canvas]');await canvas.focus();await page.keyboard.press('PageDown');await settle();
    let current=await state();assert(current.selectedStarMeasurement);const selected=current.selectedStarMeasurement;
    assert.equal(current.rotationProbeRadius,15);await checkValues(15);
    await page.getByRole('button',{name:'Follow selected star',exact:true}).click();await settle();current=await state();
    assert.equal(current.rotationProbeRadius,null);await checkValues(current.selectedStarMeasurement.radiusNorm*15);
    assert.equal(await page.locator('[data-galaxy-rotation-follow]').getAttribute('aria-pressed'),'true');
    await canvas.focus();await page.keyboard.press('PageDown');await settle();current=await state();
    assert.notDeepEqual(current.selectedStarMeasurement,selected);await checkValues(current.selectedStarMeasurement.radiusNorm*15);
    checks.push('native-star-selection-and-follow');
    await input().focus();await page.keyboard.press('End');await settle();const fixedSelection=(await state()).selectedStarMeasurement;
    await canvas.focus();await page.keyboard.press('PageDown');await settle();assert.notDeepEqual((await state()).selectedStarMeasurement,fixedSelection);await checkValues(15);checks.push('fixed-probe-keeps-radius');
    // State serializes through the host; changing modes preserves the probe and note.
    await page.locator('[data-galaxy-mode="blackHole"]').click();await settle();await page.locator('[data-galaxy-mode="galaxy"]').click();await settle();await checkValues(15);
    const saved=JSON.parse(JSON.stringify(await state()));await mount(saved);await checkValues(15);assert.equal((await state()).galaxyEvidenceNote,preserved.galaxyEvidenceNote);checks.push('mode-and-json-restore');
    for(const width of [1440,390,320]) {
      await page.setViewportSize({width,height:1050});await patch({rotationProbeRadius:12});await input().scrollIntoViewIfNeeded();await settle();
      await checkValues(12);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const internal=await page.locator('[data-galaxy-rotation-probe],[data-galaxy-rotation-measurement],[data-galaxy-rotation-mass]').evaluateAll(nodes=>nodes.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.outerHTML.slice(0,100)));
      assert.deepEqual(internal,[],JSON.stringify(internal));
      for(const control of await page.locator('[data-galaxy-rotation-probe] button,[data-galaxy-rotation-probe] input').all()) {const b=await control.boundingBox();assert(b.height>=44);assert(b.x>=0&&b.x+b.width<=width+1);}
      await page.screenshot({animations:'disabled',path:path.join(OUT,'rotation-probe-'+width+'.png')});
      await page.locator('#galaxy-panel-motion > div').first().screenshot({animations:'disabled',path:path.join(OUT,'rotation-workflow-'+width+'.png')});layouts.push({width,overflow:false,targets:true});
    }
    // Tap the plot in a real touch-enabled browser at phone width.
    await chart.scrollIntoViewIfNeeded();const touchBox=await chart.boundingBox();await page.touchscreen.tap(touchBox.x+touchBox.width*(38+6/15*270)/320,touchBox.y+touchBox.height*.5);await settle();assert.equal((await state()).rotationProbeRadius,6);await checkValues(6);checks.push('touch-radius');
    // A native vertical touch gesture scrolls past the plot without changing data.
    await chart.scrollIntoViewIfNeeded();const scrollBox=await chart.boundingBox(),beforeScroll=await page.evaluate(()=>scrollY),radiusBeforeScroll=(await state()).rotationProbeRadius;
    const cdp=await page.context().newCDPSession(page),touchX=scrollBox.x+scrollBox.width*.7,touchY=scrollBox.y+scrollBox.height*.8;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY}]});
    for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchX,y:touchY-i*12}]});await settle();}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.equal((await state()).rotationProbeRadius,radiusBeforeScroll);assert((await page.evaluate(()=>scrollY))>beforeScroll);await cdp.detach();checks.push('vertical-touch-scroll-preserves-probe');
    await page.evaluate(()=>document.documentElement.dir='rtl');await input().scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({animations:'disabled',path:path.join(OUT,'rotation-probe-rtl-320.png')});checks.push('rtl-layout');
    await page.evaluate(()=>document.documentElement.dir='ltr');
    for(const shape of ['elliptical','irregular']) {await page.locator('[data-galaxy-shape="'+shape+'"]').click();await settle();assert.equal(await page.locator('[data-galaxy-rotation-probe]').count(),0);assert.equal(await page.locator('[data-galaxy-rotation-mass]').count(),0);assert.equal(await page.locator('[data-galaxy-measurement]').count(),0);assert.equal(await page.locator('[data-galaxy-'+shape+'-kinematics]').count(),1);}
    checks.push('non-disk-scope');await page.locator('[data-galaxy-shape="barredSpiral"]').click();await settle();await checkValues(6);checks.push('spiral-return');
    await page.emulateMedia({reducedMotion:'reduce'});await mount({rotationProbeRadius:12,...preserved});await checkValues(12);checks.push('reduced-motion-controls');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({checks,layouts,errors},null,2)+'\n');console.log(JSON.stringify({checks,layouts,errors}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
