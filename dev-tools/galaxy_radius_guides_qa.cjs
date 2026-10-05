const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,process.env.GALAXY_QA_OUTPUT||'reports/galaxy-radius-guides-2026-10-01');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const core=read('dev-tools/galaxy_core_clipping.cjs');
let shell=core.slice(core.indexOf('const SHELL = `')+15,core.indexOf('`;\n\n(async'));
shell=shell.replace('var pair = React.useState({ galaxy: state });',`var pair=React.useState({galaxy:state});window.__galaxyState=pair[0].galaxy;window.__patchGalaxy=p=>pair[1](prev=>({galaxy:{...prev.galaxy,...p}}));`);
const css='desktop/web-app/public/app/'+JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//,'');

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050},hasTouch:true});const errors=[],checks=[],layouts=[];
  const check=name=>{checks.push(name);console.log('Passed: '+name);};
  page.on('pageerror',e=>{errors.push(String(e));console.error('Browser page error: '+String(e));});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('Browser console error: '+m.text());}});
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
  await page.addStyleTag({path:path.join(ROOT,css)});
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:'window.__uiStrings='+read('ui_strings.js')+';'});await page.addScriptTag({content:shell});
  await page.evaluate(()=>{
   window.__geometryCounts={BufferGeometry:0,RingGeometry:0,Scene:0};
   for(const key of Object.keys(window.__geometryCounts)){const Original=THREE[key];THREE[key]=function(...args){window.__geometryCounts[key]++;return new Original(...args);};THREE[key].prototype=Original.prototype;}
  });
  await page.addScriptTag({content:read('stem_lab/stem_tool_galaxy.js')});
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const state=()=>page.evaluate(()=>window.__galaxyState);
  const patch=async p=>{await page.evaluate(p=>window.__patchGalaxy(p),p);await settle();};
  const mount=async p=>{await page.evaluate(p=>window.__mount({simMode:'galaxy',galaxyControlPanel:'motion',starCount:2500,galaxyQuality:'balanced',galaxyAutoRotate:false,...p}),p);await page.waitForFunction(()=>!!document.querySelector('[data-galaxy-canvas]')?._galaxyGetRadiusGuideState,null,{timeout:60000});await settle();};
  const canvas=()=>page.locator('[data-galaxy-canvas]');
  const guide=()=>canvas().evaluate(c=>c._galaxyGetRadiusGuideState());
  const counts=()=>page.evaluate(()=>window.__geometryCounts);
  const verify=async(radius,saved,visible=true)=>{
   const g=await guide();assert.equal(g.visible,visible);assert(Math.abs(g.probeRadiusKpc-radius)<1e-7);assert(Math.abs(g.probeScale-radius/15)<1e-7);assert.deepEqual(g.savedRadii,saved);assert.equal(g.slotCount,8);
   const displayed=saved.filter(r=>Math.abs(r-radius)>.050000001);assert.deepEqual(g.displayedSavedRadii.map(r=>r.radiusKpc),displayed);for(const item of g.displayedSavedRadii)assert(Math.abs(item.scale-item.radiusKpc/15)<1e-7);
  };
  const pointerRadius=async n=>{const chart=page.locator('[data-galaxy-rotation-chart]');await chart.scrollIntoViewIfNeeded();const b=await chart.boundingBox();await page.mouse.click(b.x+b.width*(38+n/15*270)/320,b.y+b.height*.5);await settle();};
  const saved=[{radiusKpc:6},{radiusKpc:12}],note='Keep my inner and outer comparison.';
  const preserved={galaxyEvidenceNote:'Keep observing evidence.',blackHoleNotebook:[{id:'keep',number:1,note:'Keep the launch.',settings:{blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:1,blackHoleRadialVelocity:0,blackHoleLaunchAngle:41}}]};
  await mount({rotationProbeRadius:12,rotationSamples:saved,rotationInvestigationNote:note,...preserved});await verify(12,[6,12]);check('shared-disk-scale-and-coincident-ring-handling');
  const initialCounts=await counts();
  const chart=page.locator('[data-galaxy-rotation-chart]');await chart.scrollIntoViewIfNeeded();const b=await chart.boundingBox(),at=n=>b.x+b.width*(38+n/15*270)/320;
  await page.mouse.move(at(12),b.y+b.height*.5);await page.mouse.down();await page.mouse.move(at(4),b.y+b.height*.5,{steps:16});await page.mouse.up();await settle();await verify(4,[6,12]);assert.deepEqual(await counts(),initialCounts);check('native-drag-reuses-geometry-and-scene');
  await page.locator('[data-galaxy-rotation-save]').click();await settle();await verify(4,[4,6,12]);
  await page.getByRole('button',{name:'Probe 6.0 kpc',exact:true}).click();await settle();await verify(6,[4,6,12]);
  await page.getByRole('button',{name:'Remove 4.0 kpc',exact:true}).click();await settle();await verify(6,[6,12]);await page.getByRole('button',{name:'Undo removal',exact:true}).click();await settle();await verify(6,[4,6,12]);assert.deepEqual(await counts(),initialCounts);check('collection-revisit-removal-and-undo-update-scene');
  await canvas().focus();await page.keyboard.press('PageDown');await settle();const selection=(await state()).selectedStarMeasurement;assert(selection);await verify(6,[4,6,12]);
  await page.getByRole('button',{name:'Follow selected star',exact:true}).click();await settle();await verify((await state()).selectedStarMeasurement.radiusNorm*15,[4,6,12]);assert.equal((await guide()).followingStar,true);
  await canvas().focus();await page.keyboard.press('PageDown');await settle();const nextSelection=(await state()).selectedStarMeasurement;assert.notDeepEqual(nextSelection,selection);await verify(nextSelection.radiusNorm*15,[4,6,12]);
  await pointerRadius(12);await canvas().focus();await page.keyboard.press('PageDown');await settle();await verify(12,[4,6,12]);assert.equal((await guide()).followingStar,false);check('native-star-following-and-fixed-probe');
  // Manual camera input takes over from the selected-star approach animation.
  // Capture the settled zoom before testing the inclination-only shortcut.
  await canvas().focus();await page.keyboard.press('ArrowRight');await settle();
  const fixedSelection=(await state()).selectedStarMeasurement,distance=await canvas().evaluate(c=>c._galaxyGetAdaptiveVisualState().distance);
  await page.getByRole('button',{name:'View disk from above',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-galaxy-radius-guide-face]')?.getAttribute('aria-pressed')==='true');await settle();assert.deepEqual((await state()).selectedStarMeasurement,fixedSelection);assert(Math.abs((await canvas().evaluate(c=>c._galaxyGetAdaptiveVisualState().distance))-distance)<1e-8);await verify(12,[4,6,12]);check('face-view-preserves-selection-zoom-and-radii');
  const toggle=page.getByRole('button',{name:'Show radius guides',exact:true});await toggle.focus();await page.keyboard.press('Space');await settle();await verify(12,[4,6,12],false);assert.equal((await state()).rotationGuides,false);assert.equal((await state()).rotationInvestigationNote,note);await toggle.click();await settle();await verify(12,[4,6,12]);check('keyboard-guide-toggle-preserves-investigation');
  await canvas().focus();await page.keyboard.press('h');await settle();assert.equal((await guide()).visible,false);await patch({rotationGuides:false,rotationProbeRadius:9});await page.keyboard.press('Escape');await settle();await verify(9,[4,6,12],false);
  await toggle.click();await settle();await verify(9,[4,6,12]);check('focus-view-restores-latest-guide-preference');
  await page.getByRole('tab',{name:/View/}).click();await settle();await verify(9,[4,6,12],false);await page.getByRole('tab',{name:/Motion/}).click();await settle();await verify(9,[4,6,12]);check('guides-follow-control-tab');
  for(const shape of ['elliptical','irregular']){await page.locator('[data-galaxy-shape="'+shape+'"]').click();await page.waitForFunction(shape=>document.querySelector('[data-galaxy-canvas]')?._galaxyRenderedType===shape,shape);await settle();assert.equal((await guide()).visible,false);assert.equal(await page.locator('[data-galaxy-radius-guide-controls]').count(),0);assert.deepEqual((await state()).rotationSamples,[{radiusKpc:4},{radiusKpc:6},{radiusKpc:12}]);}
  await page.locator('[data-galaxy-shape="grandDesign"]').click();await page.waitForFunction(()=>document.querySelector('[data-galaxy-canvas]')?._galaxyRenderedType==='grandDesign');await settle();await verify(9,[4,6,12]);check('morphology-scope-rebuild-and-return');
  const persisted=JSON.parse(JSON.stringify(await state()));await page.locator('[data-galaxy-mode="blackHole"]').click();await settle();await page.locator('[data-galaxy-mode="galaxy"]').click();await page.waitForFunction(()=>!!document.querySelector('[data-galaxy-canvas]')?._galaxyGetRadiusGuideState);await settle();await verify(9,[4,6,12]);
  await mount(persisted);await verify(9,[4,6,12]);for(const [key,value]of Object.entries(preserved))assert.deepEqual((await state())[key],value);check('mode-and-json-restoration-preserve-other-evidence');
  await patch({rotationSamples:saved,rotationProbeRadius:12,selectedStar:null,selectedStarMeasurement:null});await page.getByRole('button',{name:'View disk from above',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-galaxy-radius-guide-face]')?.getAttribute('aria-pressed')==='true');await settle();
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1050});await canvas().scrollIntoViewIfNeeded();await settle();await verify(12,[6,12]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.screenshot({animations:'disabled',path:path.join(OUT,'radius-guides-scene-'+width+'.png')});
   const controls=page.locator('[data-galaxy-radius-guide-controls]');await controls.scrollIntoViewIfNeeded();assert.equal(await controls.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
   for(const button of await controls.locator('button').all()){const box=await button.boundingBox();assert(box.height>=44);assert(box.x>=0&&box.x+box.width<=width+1);}
   await page.screenshot({animations:'disabled',path:path.join(OUT,'radius-guides-controls-'+width+'.png')});layouts.push({width,overflow:false,targets:true});
  }check('desktop-and-phone-scene-and-controls');
  await page.evaluate(()=>document.documentElement.dir='rtl');await toggle.scrollIntoViewIfNeeded();await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const tb=await toggle.boundingBox();await page.touchscreen.tap(tb.x+tb.width/2,tb.y+tb.height/2);await settle();await verify(12,[6,12],false);await page.touchscreen.tap(tb.x+tb.width/2,tb.y+tb.height/2);await settle();await verify(12,[6,12]);await page.screenshot({animations:'disabled',path:path.join(OUT,'radius-guides-rtl-320.png')});check('rtl-layout-and-native-touch-toggle');
  await page.evaluate(()=>document.documentElement.dir='ltr');await page.emulateMedia({reducedMotion:'reduce'});await mount({rotationProbeRadius:6,rotationSamples:saved});await verify(6,[6,12]);await pointerRadius(12);await verify(12,[6,12]);check('reduced-motion-radius-guides');
  await page.evaluate(()=>{window.__oldGuideCanvas=document.querySelector('[data-galaxy-canvas]');ReactDOM.unmountComponentAtNode(document.getElementById('slot'));});
  assert.equal(await page.evaluate(()=>window.__oldGuideCanvas._galaxyGetRadiusGuideState===null&&window.__oldGuideCanvas._galaxySetRadiusGuides===null),true);check('unmount-retires-guide-handles');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({checks,layouts,errors},null,2)+'\n');console.log(JSON.stringify({checks,layouts,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
