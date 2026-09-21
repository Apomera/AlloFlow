import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,width:1280,height:1000});
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(async()=>{mkdirSync('scratch/butterfly-habitat',{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:any,fallback=false,saved:any={}){await page.goto(harness.url+'/__harness');await page.evaluate(({fallback,saved})=>{const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test fallback'));w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},{fallback,saved});await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');}
async function audit(page:any){const violations=await page.evaluate(async()=>{const w=window as any,r=await w.axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));});expect(violations).toEqual([]);}
async function visit(page:any,name:string){await page.getByRole('button',{name:new RegExp(name)}).click();await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true',{timeout:70000});await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Examine patch',exact:true}).click();}
test('3D flight responds to keyboard, pauses exactly, and changes camera without changing the session',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const stage=page.locator('.bf-stage');
 await page.locator('.bfl').screenshot({path:'scratch/butterfly-habitat/desktop.png'});await audit(page);
 const before=await stage.getAttribute('data-position');await page.getByRole('button',{name:'Take flight',exact:true}).click();await stage.focus();await page.keyboard.down('ArrowLeft');await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(before);await page.keyboard.up('ArrowLeft');await page.keyboard.press('Space');await expect(stage).toHaveAttribute('data-bf-paused','true');
 const clock=await stage.getAttribute('data-clock'),position=await stage.getAttribute('data-position');await page.getByRole('button',{name:'Meadow view',exact:true}).click();await page.getByRole('button',{name:'Map',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','map');await page.waitForTimeout(400);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await stage.getAttribute('data-position')).toBe(position);
 await page.getByRole('button',{name:'Map',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-renderer','three');expect(errors).toEqual([]);
});
test('all three guided visits create distinct evidence and survive paused WebGL loss',async({page})=>{
 await mount(page);await visit(page,'Common milkweed');await visit(page,'Wild bergamot');await visit(page,'Mown lawn');
 await expect(page.getByRole('heading',{name:'3 of 3 patches investigated'})).toBeVisible();expect(await page.evaluate(()=>(window as any).__toolData.butterfly.observations)).toEqual(['milkweed','bergamot','lawn']);
 // Resource comparisons alone must not be reported as a tested claim: the
 // panel withholds a verdict until a generation has actually been followed.
 await page.getByRole('button',{name:'Monarchs need nectar for adults and milkweed for caterpillars'}).click();
 await expect(page.locator('.bf-verdict')).toHaveAttribute('data-bf-tested','false');
 await expect(page.locator('.bf-question [role="status"]')).toContainText('You have not tested this claim yet.');
 await expect(page.locator('.bf-evidence li[data-evidence="patch"]')).toHaveCount(3);
 await page.locator('.bf-gl').evaluate((cv:HTMLCanvasElement)=>cv.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');await expect(page.getByRole('heading',{name:'3 of 3 patches investigated'})).toBeVisible();await expect(page.locator('.bf-map')).toBeVisible();await audit(page);
});
test('mobile fallback retains learning, touch control, saved evidence, and readable layouts',async({page})=>{
 await page.setViewportSize({width:375,height:900});await mount(page,true,{observations:['milkweed']});await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.locator('.bfl').screenshot({path:'scratch/butterfly-habitat/mobile-map.png'});await audit(page);
 await page.getByRole('button',{name:'Take flight',exact:true}).click();const right=page.locator('[data-direction="right"]');await right.scrollIntoViewIfNeeded();const position=await page.locator('.bf-stage').getAttribute('data-position');const box=(await right.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect.poll(()=>page.locator('.bf-stage').getAttribute('data-position')).not.toBe(position);await page.mouse.up();
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__rerender();});await audit(page);
});


async function planHabitat(page:any,plan:string,prediction:string){
 const panel=page.getByRole('region',{name:'Habitat design activity'});
 await panel.getByRole('button',{name:new RegExp('^'+plan)}).click();
 await panel.getByRole('combobox',{name:/Predict the resources/}).selectOption(prediction);
 await panel.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
}
async function visitRestoration(page:any){
 await page.getByRole('button',{name:'Visit restoration plot',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true',{timeout:70000});
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();
}
test('restoration plans update the same 3D world and require a visit before recording comparisons',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
 await page.evaluate(()=>{const w=window as any,after=w.THREE.Scene.prototype.onAfterRender;w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){if(this.getObjectByName('restoration-plots')){w.__restorationScene=this;w.__restorationRenderer=renderer;}return after.call(this,renderer,scene,camera);};});
 await page.getByRole('button',{name:'Meadow view',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__restorationScene)).toBe(true);
 await page.getByRole('button',{name:'Follow view',exact:true}).click();
 await page.locator('.bf-gl').evaluate((cv:any)=>cv.__sameHabitat=true);
 const snapshot=await page.locator('.bf-stage').getAttribute('data-position'),clock=await page.locator('.bf-stage').getAttribute('data-clock');
 await planHabitat(page,'Plant wild bergamot','both');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','flowers');
 expect(await page.locator('.bf-stage').getAttribute('data-position')).toBe(snapshot);expect(await page.locator('.bf-stage').getAttribute('data-clock')).toBe(clock);
 await expect(page.locator('[data-design-record="flowers"]')).toContainText('Not examined');
 await expect.poll(()=>page.evaluate(()=>(window as any).__restorationScene.getObjectByName('restoration-flowers').visible)).toBe(true);
 const pausedFrames=await page.evaluate(()=>(window as any).__restorationRenderer.info.render.frame);await page.waitForTimeout(400);expect(await page.evaluate(()=>(window as any).__restorationRenderer.info.render.frame)).toBe(pausedFrames);
 await visitRestoration(page);
 await expect(page.locator('.bf-design-feedback')).toContainText('Different from your prediction.');
 await expect(page.locator('[data-design-record="flowers"] td').nth(0)).toContainText('Present');await expect(page.locator('[data-design-record="flowers"] td').nth(1)).toHaveText('Absent');
 const geometryCount=await page.evaluate(()=>(window as any).__restorationRenderer.info.memory.geometries);
 await planHabitat(page,'Plant milkweed','both');await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-landed','');
 await expect(page.locator('[data-design-record="flowers"] td').nth(1)).toHaveText('Absent');
 await visitRestoration(page);await expect(page.locator('.bf-design-feedback')).toContainText('Prediction matched.');
 await expect(page.locator('[data-design-record="mixed"] td').nth(1)).toHaveText('Present');
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-habitat/restoration-mixed-3d.png'});
 await page.getByRole('region',{name:'Habitat design activity'}).screenshot({path:'scratch/butterfly-habitat/restoration-comparison-desktop.png'});
 await planHabitat(page,'Keep it mown','neither');await visitRestoration(page);
 await expect(page.locator('.bf-comparison caption')).toContainText('3 of 3 examined');
 await expect(page.locator('.bf-gl')).toHaveJSProperty('__sameHabitat',true);
 expect(await page.evaluate(()=>(window as any).__restorationRenderer.info.memory.geometries)).toBeLessThanOrEqual(geometryCount+2);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.observations)).toEqual([]);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.restoration.trials.length)).toBe(3);
 await audit(page);expect(errors).toEqual([]);
});
test('restoration predictions survive a restored mobile session and work in the fallback map',async({page})=>{
 await page.setViewportSize({width:375,height:900});
 await mount(page,true,{version:2,observations:['milkweed'],restoration:{design:'mixed',prediction:'both',trials:[{design:'flowers',prediction:'both'}]}});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','mixed');
 await expect(page.locator('.bf-design')).toContainText('Prediction saved.');
 await expect(page.locator('[data-design-record="mixed"]')).toContainText('Not examined');
 await visitRestoration(page);await expect(page.locator('.bf-comparison caption')).toContainText('2 of 3 examined');
 await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('region',{name:'Habitat design activity'}).screenshot({path:'scratch/butterfly-habitat/restoration-mobile.png'});
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-habitat/restoration-map-mobile.png'});
 await audit(page);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);
 await page.getByRole('button',{name:/^Keep it mown/}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'Apply habitat plan',exact:true})).toBeDisabled();
 await page.getByRole('combobox',{name:/Predict the resources/}).selectOption('neither');await page.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-design','lawn');await expect(page.locator('[data-design-record="mixed"] td').nth(1)).toHaveText('Present');
});

async function followGeneration(page:any,patch:string,prediction:string){
 const panel=page.getByRole('region',{name:'Life cycle investigation'});
 await panel.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption(patch);
 await panel.getByRole('combobox',{name:/Predict how far it gets/}).selectOption(prediction);
 await panel.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 const next=panel.getByRole('button',{name:'Next stage',exact:true});
 while(await next.isEnabled())await next.click();
 await panel.getByRole('button',{name:'Record result',exact:true}).click();
}
test('a generation stops without milkweed and completes with it, and the claim panel follows the evidence',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // The map fallback exercises the same investigation without waiting on WebGL.
 await mount(page,true,{version:3,observations:['milkweed','bergamot','lawn']});
 const cycle=page.getByRole('region',{name:'Life cycle investigation'});
 const claim=page.getByRole('region',{name:'Habitat evidence question'});

 // Before any generation is followed, the correct claim is still not "tested".
 await claim.getByRole('button',{name:'Monarchs need nectar for adults and milkweed for caterpillars'}).click();
 await expect(page.locator('.bf-verdict')).toHaveAttribute('data-bf-tested','false');
 await expect(page.locator('.bf-evidence li[data-evidence="brood"]')).toHaveCount(0);

 // Nectar without milkweed: the generation stalls at the caterpillar stage.
 await followGeneration(page,'bergamot','complete');
 await expect(page.locator('.bf-cycle-feedback')).toContainText('Different from your prediction.');
 await expect(page.locator('.bf-cycle-feedback')).toContainText('adult nectar cannot substitute');
 await expect(page.locator('[data-brood-record="bergamot"] td').nth(1)).toContainText('Stops before becoming an adult');
 await expect(cycle.locator('li[data-stage="caterpillar"]')).toHaveAttribute('data-state','blocked');

 // With milkweed the same steps carry the generation through to an adult.
 await followGeneration(page,'milkweed','complete');
 await expect(page.locator('.bf-cycle-feedback')).toContainText('Prediction matched.');
 await expect(page.locator('[data-brood-record="milkweed"] td').nth(1)).toContainText('Reaches the adult stage');
 await expect(page.locator('.bf-broods caption')).toContainText('2 recorded');

 // Now the claim is tested, and the unsound ones are refused on the same evidence.
 await claim.getByRole('button',{name:'Monarchs need nectar for adults and milkweed for caterpillars'}).click();
 await expect(page.locator('.bf-verdict')).toHaveAttribute('data-bf-tested','true');
 await expect(page.locator('.bf-verdict strong')).toHaveText('Your records support that claim.');
 await expect(page.locator('.bf-evidence li[data-evidence="brood"]')).toHaveCount(2);
 for(const label of ['Flowers with nectar are enough to support monarchs here','Any green, planted patch will do']){
  await claim.getByRole('button',{name:label}).click();
  await expect(page.locator('.bf-verdict strong')).toHaveText('Your records do not support that claim.');
 }
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly.lifecycle.broods.length)).toBe(2);
 await audit(page);expect(errors).toEqual([]);
});
test('a running generation is abandoned when its plot is replanted, and survives a restored session',async({page})=>{
 await page.setViewportSize({width:375,height:900});
 await mount(page,true,{version:3,observations:['milkweed'],
   restoration:{design:'mixed',prediction:null,trials:[{design:'mixed',prediction:'both'}]},
   lifecycle:{patch:'milkweed',prediction:'complete',stage:'caterpillar',broods:[{patch:'lawn',prediction:'stalls',result:'stalls'}]}});
 const cycle=page.getByRole('region',{name:'Life cycle investigation'});
 await expect(cycle).toContainText('Generation at: Common milkweed');
 await expect(page.locator('.bf-broods caption')).toContainText('1 recorded');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await cycle.screenshot({path:'scratch/butterfly-habitat/lifecycle-mobile.png'});
 await audit(page);

 // A generation on a reference patch is unaffected by replanting the plot.
 await planHabitat(page,'Plant wild bergamot','nectar');
 await expect(cycle).toContainText('Generation at: Common milkweed');

 // Both choosers lock while a generation runs, so there must be a way out.
 await expect(cycle.getByRole('combobox',{name:/Choose where to lay eggs/})).toBeDisabled();
 await cycle.getByRole('button',{name:'Start over',exact:true}).click();
 await expect(page.locator('.bf-cycle-feedback')).toContainText('Nothing was recorded');
 await expect(cycle).toContainText('No generation started');
 await expect(cycle.getByRole('combobox',{name:/Choose where to lay eggs/})).toBeEnabled();
 await expect(page.locator('.bf-broods caption')).toContainText('1 recorded');

 await followGeneration(page,'milkweed','complete');
 await expect(page.locator('[data-brood-record="milkweed"] td').nth(1)).toContainText('Reaches the adult stage');

 // Replanting the plot a generation lives on WOULD leave it running against
 // plants that are gone, so that one is dropped rather than allowed to finish.
 await visitRestoration(page);
 await cycle.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption('restoration');
 await cycle.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');
 await cycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await expect(cycle).toContainText('Generation at: Restoration plot');
 await planHabitat(page,'Keep it mown','neither');
 await expect(cycle).toContainText('No generation started');
 await expect(page.locator('[data-brood-record="restoration"] td').nth(1)).toContainText('Not followed');
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});
 await cycle.screenshot({path:'scratch/butterfly-habitat/lifecycle-contrast.png'});
 await audit(page);
});

// The season panel is the only place TIMING is testable. These drive it through
// the real selects, because a disabled/enabled rule or a stale select value
// cannot fail in an SSR string test.
test('a season cannot be run on an unexamined patch, and the run button gates on a prediction',async({page})=>{
 await mount(page);
 const season=page.locator('.bf-season');
 await expect(season.getByRole('heading',{name:'Does it matter WHEN the patch is cut?'})).toBeVisible();
 // Nothing examined yet: the patch select offers no patches at all.
 await expect(season.locator('#bf-season-site option')).toHaveCount(1);
 await expect(season.getByRole('button',{name:'Run the season',exact:true})).toBeDisabled();
 await visit(page,'Common milkweed');
 await expect(season.locator('#bf-season-site option')).toHaveCount(2);
 await season.locator('#bf-season-site').selectOption('milkweed');
 // A patch alone is not enough; the prediction still gates the run.
 await expect(season.getByRole('button',{name:'Run the season',exact:true})).toBeDisabled();
 await season.locator('#bf-season-guess').selectOption('complete');
 await expect(season.getByRole('button',{name:'Run the season',exact:true})).toBeEnabled();
 await audit(page);
});

test('the same patch completes or fails on mowing date alone, and only a matched pair tests the timing claim',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await mount(page);await visit(page,'Common milkweed');
 const season=page.locator('.bf-season');
 await season.locator('#bf-season-site').selectOption('milkweed');
 await season.locator('#bf-season-mow').selectOption('never');
 await season.locator('#bf-season-guess').selectOption('complete');
 await season.getByRole('button',{name:'Run the season',exact:true}).click();
 await expect(season.locator('.bf-season-feedback')).toContainText('Prediction matched.');
 await expect(season.locator('[data-season-record="milkweed-never"] td').nth(2)).toContainText('Ran the whole cycle');
 // One run cannot isolate timing, so the callout must stay absent.
 await expect(season.locator('[data-bf-timing-pair]')).toHaveCount(0);
 await page.getByRole('button',{name:'If the right plants are there, when the patch is mown does not matter'}).click();
 await expect(page.locator('.bf-verdict')).toHaveAttribute('data-bf-tested','false');
 // Same patch, same plants, earlier cut -> the outcome flips.
 await season.locator('#bf-season-mow').selectOption('early');
 await season.locator('#bf-season-guess').selectOption('complete');
 await season.getByRole('button',{name:'Run the season',exact:true}).click();
 await expect(season.locator('.bf-season-feedback')).toContainText('Different from your prediction.');
 await expect(season.locator('.bf-season-feedback')).toContainText('before week 3');
 await expect(season.locator('[data-season-record="milkweed-early"] td').nth(2)).toContainText('Stopped early');
 await expect(season.locator('[data-bf-timing-pair]')).toHaveCount(1);
 // Now the pair exists, the timing claim becomes judgeable from it.
 await page.getByRole('button',{name:'If the right plants are there, when the patch is mown does not matter'}).click();
 await expect(page.locator('.bf-verdict')).toHaveAttribute('data-bf-tested','true');
 await expect(page.locator('.bf-evidence li[data-evidence="timing"]')).toHaveCount(1);
 await expect(page.locator('.bf-evidence li[data-evidence="season"]')).toHaveCount(2);
 expect(errors).toEqual([]);
 await season.screenshot({path:'scratch/butterfly-habitat/season.png'});
 await audit(page);
});

test('the week track shows why a stage failed, and season records survive a restored session',async({page})=>{
 await mount(page,false,{version:4,observations:['milkweed'],
   restoration:{design:'lawn',prediction:null,trials:[]},
   lifecycle:{patch:null,prediction:null,stage:null,broods:[]},
   season:{mowing:'never',prediction:null,runs:[{patch:'milkweed',mowing:'never',prediction:'complete',result:'complete'}]}});
 const season=page.locator('.bf-season');
 await expect(season.locator('[data-season-record="milkweed-never"]')).toBeVisible();
 await season.locator('#bf-season-site').selectOption('milkweed');
 await season.locator('#bf-season-mow').selectOption('mid');
 // The track must name the CUT as the reason, not a missing plant.
 await expect(season.locator('.bf-weeks li[data-stage="caterpillar"]')).toHaveAttribute('data-state','cleared');
 await expect(season.locator('.bf-weeks li[data-stage="chrysalis"]')).toHaveAttribute('data-state','cut');
 await expect(season.locator('.bf-weeks li[data-stage="chrysalis"]')).toContainText('already cut');
 // A patch with no milkweed fails for the other reason entirely.
 await visit(page,'Wild bergamot');
 await season.locator('#bf-season-site').selectOption('bergamot');
 await season.locator('#bf-season-mow').selectOption('never');
 await expect(season.locator('.bf-weeks li[data-stage="caterpillar"]')).toHaveAttribute('data-state','missing');
 await expect(season.locator('.bf-weeks li[data-stage="caterpillar"]')).toContainText('Nothing here');
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});
 await season.screenshot({path:'scratch/butterfly-habitat/season-contrast.png'});
 await audit(page);
});

test('the field report appears only once there is evidence, and copies through the shell',async({page})=>{
 await mount(page);
 const report=page.locator('.bf-report');
 await expect(report.getByRole('heading',{name:'Field report'})).toBeVisible();
 // Nothing recorded: no report body, and the copy button is not offered.
 await expect(report.locator('[data-bf-report]')).toHaveCount(0);
 await expect(report.getByRole('button',{name:/Copy my field report/})).toBeDisabled();
 await visit(page,'Common milkweed');
 await expect(report.locator('[data-bf-report]')).toHaveCount(1);
 await expect(report.locator('[data-bf-report]')).toContainText('PATCHES EXAMINED (1 of 3)');
 // Capture what the shell is handed, rather than trusting the clipboard.
 await page.evaluate(()=>{const w=window as any;w.__copied=null;w.alloCopyText=(t:string)=>{w.__copied=t;return true;};});
 await report.getByRole('button',{name:/Copy my field report/}).click();
 await expect(report.getByRole('button',{name:/Report copied/})).toBeVisible();
 const copied=await page.evaluate(()=>(window as any).__copied);
 expect(copied).toContain('Butterfly Habitat Lab');
 expect(copied).toContain('Common milkweed (Asclepias syriaca)');
 expect(copied).toContain('does not count butterflies, estimate survival');
 await report.screenshot({path:'scratch/butterfly-habitat/report.png'});
 await audit(page);
});

test('a blocked copy offers the report as selectable text instead of failing silently',async({page})=>{
 await mount(page);await visit(page,'Common milkweed');
 const report=page.locator('.bf-report');
 // Every copy route refuses, the way a locked-down embed behaves.
 await page.evaluate(()=>{const w=window as any;w.alloCopyText=()=>false;
   try{Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});}catch(e){}
   document.execCommand=()=>false;});
 await report.getByRole('button',{name:/Copy my field report/}).click();
 const area=report.getByRole('textbox',{name:'Field report text to copy manually'});
 await expect(area).toBeVisible();
 await expect(area).toHaveValue(/PATCHES EXAMINED/);
 await audit(page);
});
