import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const desktop=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1060,height:1000,appStyles:true});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:320,height:850,appStyles:true});
test.beforeAll(async()=>{await desktop.start();await phone.start();});test.afterAll(async()=>{await desktop.stop();await phone.stop();});test.afterEach(async({page})=>desktop.destroy(page));
test.describe.configure({timeout:150000});test.use({video:'off',trace:'off'});
const base={tutorialDismissed:true,solarMissionDashboardOpen:false,orreryMode:true,orr_tab:5,orr_trf:'earth',orr_trt:'mars',orr_paused:true};
for(const compact of [false,true])test('synchronized comparison '+(compact?'phone':'desktop'),async({page},info)=>{
 const harness=compact?phone:desktop;await page.setViewportSize(compact?{width:320,height:850}:{width:1060,height:1000});await page.emulateMedia({reducedMotion:compact?'reduce':'no-preference'});await harness.mount(page,{solarSystem:base},undefined,{expectCanvas:false});
 if(!compact)await page.evaluate(()=>{(window as any).__ctx.isDark=true;(window as any).__rerender();});
 const panel=page.getByRole('region',{name:'Transfer rendezvous experiment'}),canvas=panel.locator('canvas'),reading=panel.locator('#orrery-transfer-comparison-reading');
 await canvas.scrollIntoViewIfNeeded();await page.evaluate(()=>(window as any).__comparisonCanvas=document.querySelector('[data-transfer-flight] canvas'));
 await panel.getByRole('button',{name:'Compare launch alignments',exact:true}).click();await expect(page.getByLabel('Launch alignment offset:',{exact:false})).toHaveValue('30');await expect(reading).toContainText('Same flight time');
 await panel.getByRole('button',{name:'Show transfer arrival',exact:true}).click();await expect(reading).toContainText('aligned 0° gap: 0.000 AU');await expect(reading).toContainText('test +30° gap: 0.789 AU');
 await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-transfer-comparison','true');await expect(canvas).toHaveAttribute('data-transfer-reference-separation','0.00000000');await canvas.screenshot({path:info.outputPath(compact?'comparison-phone-arrival.png':'comparison-desktop-arrival.png')});
 await page.getByLabel('Launch alignment offset:',{exact:false}).fill('-30');await expect(reading).toContainText('test -30° gap: 0.789 AU');
 await panel.getByRole('button',{name:'Show transfer departure',exact:true}).click();await expect(reading).not.toContainText('aligned 0° gap: 0.000 AU');
 await page.getByLabel('Launch alignment offset:',{exact:false}).fill('30');await canvas.scrollIntoViewIfNeeded();await canvas.screenshot({path:info.outputPath(compact?'comparison-phone-departure.png':'comparison-desktop-departure.png')});
 const slider=page.getByLabel('Flight progress',{exact:true});await slider.focus();await slider.press('End');await expect(reading).toContainText('test +30° gap: 0.789 AU');
 if(compact)await expect(panel.getByRole('button',{name:'Replay flight',exact:true})).toBeDisabled();
 else {await panel.getByRole('button',{name:'Replay flight',exact:true}).click();await canvas.scrollIntoViewIfNeeded();await expect.poll(async()=>Number(await canvas.getAttribute('data-transfer-progress'))).toBeGreaterThan(0.02);await panel.getByRole('button',{name:'Pause flight',exact:true}).click();await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-transfer-playing','false');const paused=await canvas.getAttribute('data-transfer-progress');await page.waitForTimeout(250);await expect(canvas).toHaveAttribute('data-transfer-progress',paused!);}
 expect(await page.evaluate(()=>(window as any).__comparisonCanvas===document.querySelector('[data-transfer-flight] canvas'))).toBe(true);
 const bounds=await panel.evaluate(el=>({right:el.getBoundingClientRect().right,overflow:el.scrollWidth>el.clientWidth+1}));expect(bounds.right).toBeLessThanOrEqual(compact?320:1060);expect(bounds.overflow).toBe(false);
 await panel.locator('[data-transfer-comparison-controls]').screenshot({path:info.outputPath(compact?'comparison-phone-controls.png':'comparison-desktop-controls.png')});
 await panel.getByRole('button',{name:'Hide alignment comparison',exact:true}).click();await expect(reading).toHaveCount(0);await page.evaluate(()=>(window as any).__ctx.updateMulti('solarSystem',{orr_trf:'earth',orr_trt:'earth'}));await expect(panel.getByRole('button',{name:'Compare launch alignments',exact:true})).toBeDisabled();expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('saved Mars comparison preserves evidence and can be replayed repeatedly',async({page})=>{
 const mission={active:true,startedAt:100,prediction:'miss',trials:{aligned:{offset:0,separation:0,days:258.9,timestamp:110},offset:{offset:30,separation:0.78888045,days:258.9,timestamp:120}},surfacePrediction:'A modeled mineral sample.'};const entries=[{source:'drone',kind:'Scan',planet:'stem.solar_sys.mars',timestamp:200,observation:'Existing evidence'}];
 await page.emulateMedia({reducedMotion:'reduce'});await desktop.mount(page,{solarSystem:{...base,marsMission:mission,journalEntries:entries}},undefined,{expectCanvas:false});
 const launch=page.getByRole('button',{name:'Compare recorded flights',exact:true}),panel=page.getByRole('region',{name:'Transfer rendezvous experiment'}),canvas=panel.locator('canvas');
 await launch.click();await expect(canvas).toBeFocused();await expect(page.getByLabel('Flight progress',{exact:true})).toHaveValue('0');await expect(panel.getByRole('button',{name:'Hide alignment comparison',exact:true})).toBeVisible();
 await panel.getByRole('button',{name:'Show transfer arrival',exact:true}).click();await expect(panel.locator('#orrery-transfer-comparison-reading')).toContainText('0.789 AU');await launch.click();await expect(page.getByLabel('Flight progress',{exact:true})).toHaveValue('0');
 const saved=await page.evaluate(()=>(window as any).__toolData);expect(saved.solarSystem.marsMission).toEqual(mission);expect(saved.solarSystem.journalEntries).toEqual(entries);
 await desktop.destroy(page);await desktop.mount(page,saved,undefined,{expectCanvas:false});await expect(panel.getByRole('button',{name:'Hide alignment comparison',exact:true})).toBeVisible();expect((await page.evaluate(()=>(window as any).__toolData.solarSystem)).marsMission).toEqual(mission);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
