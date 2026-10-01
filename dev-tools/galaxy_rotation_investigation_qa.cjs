// Exercise collection in a real React host and WebGL scene using native controls.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-rotation-investigation-2026-10-01');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const source = read('stem_lab/stem_tool_galaxy.js');
const kernel = source.split('// BEGIN GALAXY ROTATION MODEL')[1].split('// END GALAXY ROTATION MODEL')[0];
const model = new Function(kernel + ';return {measure:orbitalMeasurementForModel};')();

(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const browser = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});
    const errors=[], checks=[], layouts=[];
    checks.push=function(name){Array.prototype.push.call(this,name);console.log('Passed: '+name);};
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({path:path.join(ROOT,cssAsset)});
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js']) await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:'window.__uiStrings='+read('ui_strings.js')+';'});
    await page.addScriptTag({content:shell});
    await page.addScriptTag({content:source});
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const state=()=>page.evaluate(()=>window.__galaxyState);
    const patch=async p=>{await page.evaluate(p=>window.__patchGalaxy(p),p);await settle();};
    const mount=async p=>{await page.evaluate(p=>window.__mount({simMode:'galaxy',galaxyControlPanel:'motion',starCount:2500,galaxyQuality:'balanced',galaxyAutoRotate:false,...p}),p);await page.waitForFunction(()=>!!document.querySelector('[data-galaxy-canvas]')?._galaxyGetStarVisualState,null,{timeout:60000});await settle();};
    const save=()=>page.locator('[data-galaxy-rotation-save]');
    const radius=async n=>{
      const chart=page.locator('[data-galaxy-rotation-chart]');await chart.scrollIntoViewIfNeeded();const b=await chart.boundingBox();
      await page.mouse.click(b.x+b.width*(38+n/15*270)/320,b.y+b.height*.5);
      await settle();assert(Math.abs((await state()).rotationProbeRadius-n)<1e-8);
    };
    const collect=async n=>{await radius(n);await save().click();await settle();};
    const verifySamples=async (radii,name,checkState=true)=>{
      const current=await state();if(checkState)assert.deepEqual(current.rotationSamples,radii.map(radiusKpc=>({radiusKpc})));
      const cards=await page.locator('[data-galaxy-rotation-sample]').evaluateAll(nodes=>nodes.map(n=>({radius:Number(n.dataset.galaxyRotationSample),speed:Number(n.dataset.speed),period:Number(n.dataset.period),mass:Number(n.dataset.mass)})));
      assert.equal(cards.length,radii.length);
      for(const card of cards){const orbit=model.measure(name,card.radius);assert(Math.abs(card.speed-orbit.speed)<1e-8);assert(Math.abs(card.period-orbit.periodMyr)<1e-8);assert(Math.abs(card.mass-orbit.enclosedMassSolar)<1e-3);}
      const marks=await page.locator('[data-galaxy-rotation-saved-point]').evaluateAll(nodes=>nodes.map(n=>({radius:Number(n.dataset.galaxyRotationSavedPoint),model:n.dataset.model,speed:Number(n.dataset.speed)})));
      assert.deepEqual(marks.map(m=>m.radius),radii);for(const mark of marks){assert.equal(mark.model,name);assert(Math.abs(mark.speed-model.measure(name,mark.radius).speed)<1e-8);}
    };
    const preserved={galaxyEvidenceNote:'Keep my observing evidence.',blackHoleNotebook:[{id:'keep',number:1,note:'Keep my black hole release.',settings:{blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:1,blackHoleRadialVelocity:0,blackHoleLaunchAngle:41}}],blackHoleComparison:{blackHoleDropObject:'star',blackHoleMassMode:'stellar',blackHoleReleaseRadius:6,blackHoleSideways:.4,blackHoleRadialVelocity:0,blackHoleLaunchAngle:31}};
    await mount(preserved);
    assert.equal(await page.locator('[data-galaxy-rotation-download]').isDisabled(),true);
    await collect(12);assert.equal(await page.locator('[data-galaxy-rotation-trend]').count(),0);
    await collect(6);await verifySamples([6,12],'flat');
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-galaxy-rotation-revisit')==='6');
    assert.equal(await save().isDisabled(),true);assert((await page.locator('#galaxy-rotation-save-help').textContent()).includes('already saved'));
    checks.push('native-chart-collection-sorted-duplicate-protection-and-focus');
    const note='At 6 and 12 kpc, speed stays constant while enclosed mass doubles.';
    await page.locator('#galaxy-rotation-investigation-note').fill(note);await settle();assert.equal((await state()).rotationInvestigationNote,note);
    assert.equal(await page.locator('#galaxy-rotation-investigation-note').getAttribute('maxlength'),'600');checks.push('persisted-evidence-note');
    for(const [name,massRatio] of [['rigid',8],['keplerian',1],['flat',2]]) {
      await page.getByRole('button',{name:/Set rotation model:/}).filter({hasText:name==='rigid'?'Rigid disk':name==='keplerian'?'Keplerian':'Flat (observed)'}).click();await settle();await verifySamples([6,12],name);
      assert(Math.abs(Number(await page.locator('[data-galaxy-rotation-trend]').getAttribute('data-mass-ratio'))-massRatio)<1e-8);
      assert.equal((await state()).rotationInvestigationNote,note);assert.equal((await state()).rotationProbeRadius,6);
    }
    checks.push('same-radii-switch-model-values-chart-and-trends');
    const selectionBefore=(await state()).selectedStarMeasurement;
    await page.locator('[data-galaxy-canvas]').focus();await page.keyboard.press('PageDown');await settle();
    const selection=(await state()).selectedStarMeasurement;assert(selection);assert.notDeepEqual(selection,selectionBefore);
    await page.getByRole('button',{name:'Probe 12.0 kpc',exact:true}).click();await settle();assert.equal((await state()).rotationProbeRadius,12);assert.deepEqual((await state()).selectedStarMeasurement,selection);
    checks.push('revisit-preserves-real-star-selection');
    await page.getByRole('button',{name:'Remove 6.0 kpc',exact:true}).click();await settle();await verifySamples([12],'flat');
    await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-galaxy-rotation-undo'));
    await collect(9);const editedNote=note+' Keep the later addition.';await page.locator('#galaxy-rotation-investigation-note').fill(editedNote);
    await page.getByRole('button',{name:'Undo removal',exact:true}).click();await settle();await verifySamples([6,9,12],'flat');assert.equal((await state()).rotationInvestigationNote,editedNote);
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-galaxy-rotation-revisit')==='6');
    checks.push('undo-preserves-later-radius-and-note');
    const downloadPromise=page.waitForEvent('download');await page.locator('[data-galaxy-rotation-download]').click();const download=await downloadPromise;
    assert.equal(download.suggestedFilename(),'galaxy-rotation-investigation.csv');const csvPath=path.join(OUT,'rotation-investigation.csv');await download.saveAs(csvPath);
    const csv=fs.readFileSync(csvPath,'utf8');assert(csv.startsWith('\ufeff'));assert.equal(csv.trim().split('\r\n').length,10);assert(csv.includes('"flat","6.0","220.000000"'));assert(csv.includes(editedNote));assert(csv.includes('not observed data'));checks.push('native-csv-download-all-models-units-and-note');
    await page.evaluate(()=>{window.__oldCreateURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error('Download unavailable');};});
    await page.locator('[data-galaxy-rotation-download]').click();await settle();assert((await page.locator('[data-galaxy-rotation-book-status]').textContent()).includes('could not be downloaded'));await verifySamples([6,9,12],'flat');assert.equal((await state()).rotationInvestigationNote,editedNote);
    await page.evaluate(()=>{URL.createObjectURL=window.__oldCreateURL;delete window.__oldCreateURL;});checks.push('download-failure-preserves-work');
    await page.locator('[data-galaxy-mode="blackHole"]').click();await settle();await page.locator('[data-galaxy-mode="galaxy"]').click();await settle();await verifySamples([6,9,12],'flat');
    const persisted=JSON.parse(JSON.stringify(await state()));await mount(persisted);await verifySamples([6,9,12],'flat');assert.equal((await state()).rotationInvestigationNote,editedNote);
    for(const [key,value] of Object.entries(preserved)) assert.deepEqual((await state())[key],value);
    checks.push('mode-json-remount-and-other-investigations-preserved');
    for(const shape of ['elliptical','irregular']) {
      await page.locator('[data-galaxy-shape="'+shape+'"]').click();await settle();assert.equal(await page.locator('[data-galaxy-rotation-investigation]').count(),0);assert.deepEqual((await state()).rotationSamples,persisted.rotationSamples);
    }
    await page.locator('[data-galaxy-shape="barredSpiral"]').click();await settle();await verifySamples([6,9,12],'flat');checks.push('non-disk-scope-and-return');
    await patch({rotationSamples:[{radiusKpc:1.2},{radiusKpc:2.4}]});assert.equal(await page.locator('[data-galaxy-rotation-trend-explanation]').getAttribute('data-galaxy-rotation-trend-explanation'),'core');
    await patch({rotationSamples:[{radiusKpc:1.2},{radiusKpc:6}]});assert.equal(await page.locator('[data-galaxy-rotation-trend-explanation]').getAttribute('data-galaxy-rotation-trend-explanation'),'crossing');checks.push('core-boundary-explanation');
    await patch({rotationSamples:Array.from({length:8},(_,i)=>({radiusKpc:i+1})),rotationProbeRadius:12});assert.equal(await save().isDisabled(),true);
    await page.getByRole('button',{name:'Remove 4.0 kpc',exact:true}).click();await settle();await save().click();await settle();assert.equal((await state()).rotationSamples.length,8);assert.equal(await page.locator('[data-galaxy-rotation-undo]').isDisabled(),true);
    await page.getByRole('button',{name:'Remove 5.0 kpc',exact:true}).click();await settle();await page.getByRole('button',{name:'Undo removal',exact:true}).click();await settle();assert.equal((await state()).rotationSamples.length,8);checks.push('capacity-and-safe-undo');
    for(const width of [1440,390,320]) {
      await page.setViewportSize({width,height:1100});await patch({rotationSamples:[{radiusKpc:6},{radiusKpc:12}],rotationProbeRadius:12,rotationInvestigationNote:note});
      const book=page.locator('[data-galaxy-rotation-investigation]');await book.scrollIntoViewIfNeeded();await settle();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const internal=await book.evaluateAll(nodes=>nodes.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.outerHTML.slice(0,100)));assert.deepEqual(internal,[]);
      for(const control of await page.locator('[data-galaxy-rotation-investigation] button,[data-galaxy-rotation-save]').all()){await control.scrollIntoViewIfNeeded();const b=await control.boundingBox();assert(b.height>=44);assert(b.x>=0&&b.x+b.width<=width+1);}
      await book.scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(OUT,'rotation-investigation-'+width+'.png')});layouts.push({width,overflow:false,targets:true});
    }
    checks.push('desktop-and-phone-layouts');
    await page.evaluate(()=>document.documentElement.dir='rtl');await page.locator('[data-galaxy-rotation-investigation]').scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const slider=page.locator('#galaxy-rotation-probe-radius');await slider.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await settle();assert.equal((await state()).rotationProbeRadius,14.9);assert.equal(await slider.getAttribute('dir'),'ltr');
    await radius(9);await save().focus();await page.keyboard.press('Enter');await settle();await verifySamples([6,9,12],'flat');
    await page.locator('[data-galaxy-rotation-investigation]').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(OUT,'rotation-investigation-rtl-320.png')});checks.push('rtl-layout-and-spatial-radius-keyboard');
    await page.evaluate(()=>document.documentElement.dir='ltr');
    const remove=page.getByRole('button',{name:'Remove 9.0 kpc',exact:true});await remove.scrollIntoViewIfNeeded();const rb=await remove.boundingBox();await page.touchscreen.tap(rb.x+rb.width/2,rb.y+rb.height/2);await settle();await verifySamples([6,12],'flat');
    const undo=page.getByRole('button',{name:'Undo removal',exact:true});await undo.scrollIntoViewIfNeeded();const ub=await undo.boundingBox();await page.touchscreen.tap(ub.x+ub.width/2,ub.y+ub.height/2);await settle();await verifySamples([6,9,12],'flat');checks.push('native-touch-removal-and-undo');
    await page.emulateMedia({reducedMotion:'reduce'});await mount({rotationSamples:[{radiusKpc:6},{radiusKpc:12}],rotationInvestigationNote:note,...preserved});await verifySamples([6,12],'flat');await collect(9);await verifySamples([6,9,12],'flat');checks.push('reduced-motion-collection');
    await mount({rotationSamples:[null,{radiusKpc:'bad'},{radiusKpc:Infinity},{radiusKpc:6}],rotationInvestigationNote:{bad:true}});await verifySamples([6],'flat',false);assert.equal(await page.locator('#galaxy-rotation-investigation-note').inputValue(),'');checks.push('malformed-persisted-state-recovery');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({checks,layouts,errors},null,2)+'\n');console.log(JSON.stringify({checks,layouts,errors}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
