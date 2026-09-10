import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1100,height:900,appStyles:true});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:320,height:850,appStyles:true});
const base={tutorialDismissed:true,orreryMode:true,orr_tab:5,orr_paused:true};
test.beforeAll(async()=>{await wide.start();await phone.start();});test.afterAll(async()=>{await wide.stop();await phone.stop();});test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:180000});test.use({video:'off',trace:'off'});
for(const compact of [false,true])test('dashboard selection, restoration and Mars resume '+(compact?'phone':'desktop'),async({page},info)=>{
 const harness=compact?phone:wide;await page.setViewportSize(compact?{width:320,height:850}:{width:1100,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{solarSystem:base},undefined,{expectCanvas:false});const panel=page.getByRole('region',{name:'Mission dashboard',exact:true});
 await expect(panel.locator('[data-solar-journey]')).toHaveCount(6);await expect(panel).toContainText('0/6 journeys complete');
 const orbit=panel.locator('[data-solar-journey="orbits"]');await orbit.focus();await orbit.press('Enter');await expect(orbit).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>(window as any).__toolData.solarSystem.orr_mission_progress)).toBeUndefined();
 await panel.locator('[data-solar-journey="mars"]').click();
 const bounds=await panel.evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,overflow:el.scrollWidth>el.clientWidth+1};});expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(compact?320:1100);expect(bounds.overflow).toBe(false);
 if(!compact) await page.evaluate(()=>{(window as any).__ctx.isDark=true;(window as any).__rerender();});
 await panel.screenshot({path:info.outputPath(compact?'dashboard-phone.png':'dashboard-desktop.png')});
 await panel.getByRole('button',{name:'Start Earth-to-Mars mission',exact:true}).click();await expect(page.locator('#mars-launch-prediction')).toBeFocused();await expect(panel.locator('#solar-mission-dashboard-content')).toBeHidden();
 await page.locator('#mars-launch-prediction').selectOption('miss');await panel.getByRole('button',{name:'Open mission dashboard',exact:true}).click();await expect(page.locator('#solar-mission-dashboard-title')).toBeFocused();await expect(panel.locator('[data-journey-next]')).toContainText('Record the aligned');
 const saved=await page.evaluate(()=>(window as any).__toolData);await harness.destroy(page);await harness.mount(page,saved,undefined,{expectCanvas:false});
 await expect(panel.locator('[data-solar-journey="mars"]')).toHaveAttribute('aria-pressed','true');await panel.locator('[data-journey-continue]').click();await expect(page.locator('[data-transfer-flight] canvas')).toBeFocused();expect(await page.evaluate(()=>(window as any).__toolData.solarSystem.marsMission.prediction)).toBe('miss');
 expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
});
test('orbital progress resumes the next challenge without awarding it',async({page})=>{
 const progress={earth_distance:{started:true,correct:true,detail:'Distance evidence'},mercury_speed:{started:true}};
 await wide.mount(page,{solarSystem:{...base,orr_mission_progress:progress}},undefined,{expectCanvas:false});await expect(page.locator('[data-selected-solar-journey="orbits"]')).toBeVisible();await page.locator('[data-journey-continue]').click();
 await expect(page.locator('#orrery-guided-objective')).toBeFocused();const d=await page.evaluate(()=>(window as any).__toolData.solarSystem);expect(d.orr_mission_idx).toBe(1);expect(d.orr_mission_progress).toEqual(progress);
});
test('seasonal resume keeps predictions, phase and recorded evidence',async({page})=>{
 const guide={prediction:'opposite',records:{25:{world:'Earth',phase:25,northHours:15,southHours:9,northNoon:68,southNoon:21}},explanation:'My ongoing explanation'};
 await wide.mount(page,{solarSystem:{...base,solarMissionFocus:'seasons',seasonsGuide:guide,seasonsPhase:75,seasonsPrediction:'same'}},undefined,{expectCanvas:false});await page.locator('[data-journey-continue]').click();await expect(page.locator('#solar-season-guide-title')).toBeFocused({timeout:30000});
 const d=await page.evaluate(()=>(window as any).__toolData.solarSystem);expect(d.seasonsGuide).toEqual(guide);expect(d.seasonsPhase).toBe(75);expect(d.seasonsPrediction).toBe('same');
});
test('linked lab evidence resumes in its journal without overwriting records',async({page})=>{
 const entries=[{planet:'stem.solar_sys.earth',observation:'Measured a light travel delay.',investigation:{id:'signal',prediction:'The farther world takes longer.'},timestamp:100}];
 await wide.mount(page,{solarSystem:{...base,solarMissionFocus:'labs',journalEntries:entries}},undefined,{expectCanvas:false});await expect(page.locator('[data-journey-next]')).toContainText('Add your explanation: Signal Delay');await page.locator('[data-journey-continue]').click();await expect(page.locator('#solar-journal-filter')).toBeFocused({timeout:30000});await expect(page.locator('#solar-journal-filter')).toHaveValue('signal');expect(await page.evaluate(()=>(window as any).__toolData.solarSystem.journalEntries)).toEqual(entries);
});
test('fieldwork resumes a saved specimen in its own world',async({page})=>{
 const entries=[{planet:'stem.solar_sys.jupiter',source:'drone',kind:'Sample',title:'Cloud sample',timestamp:100,observation:'Modeled atmospheric material.',specimen:{mode:'gas',name:'Cloud sample',color:'#aabbcc',type:'cloud'}}];
 await wide.mount(page,{solarSystem:{...base,solarMissionFocus:'field',journalEntries:entries}},undefined,{expectCanvas:false});await page.locator('[data-journey-continue]').click({timeout:90000});const bench=page.getByRole('region',{name:'Specimen review',exact:true});await expect(bench).toBeVisible({timeout:60000});await expect(bench.getByRole('heading',{name:'Specimen review',exact:true})).toBeFocused();const d=await page.evaluate(()=>(window as any).__toolData.solarSystem);expect(d.selectedPlanet).toBe('stem.solar_sys.jupiter');expect(d.journalEntries).toEqual(entries);
});
test('comparison launch opens its guided path without completing view checkpoints',async({page})=>{
 await wide.mount(page,{solarSystem:{...base,solarMissionFocus:'comparison'}},undefined,{expectCanvas:false});await page.locator('[data-journey-continue]').click({timeout:60000});await expect(page.locator('[data-solarsystem-evidence-mission]')).toBeFocused({timeout:30000});const d=await page.evaluate(()=>(window as any).__toolData.solarSystem);expect(d.evidenceMissionActive).toBe(true);expect(d.evidenceMissionObserved).toBeFalsy();expect(d.evidenceMissionCompared).toBeFalsy();expect(d.evidenceMissionOrbitSeen).toBeFalsy();
});
