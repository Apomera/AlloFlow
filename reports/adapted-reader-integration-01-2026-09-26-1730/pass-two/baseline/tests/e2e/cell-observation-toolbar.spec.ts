import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const width of [280,320,390,1200])test('observation toolbar retains four usable actions at '+width,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'plantcell',paused:true,zoom:2}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const canvas=page.locator('[data-cell-sim-canvas]'),stage=page.locator('[data-cell-stage]'),actions=stage.getByRole('group',{name:'Inspect selected specimen'});
 await stage.scrollIntoViewIfNeeded();await expect(actions.getByRole('button')).toHaveCount(4);
 const controls=await actions.getByRole('button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
 expect(controls.every(r=>r.w>=44&&r.h>=44)).toBe(true);
 expect(controls.every(r=>Math.abs(r.y-controls[0].y)<1)).toBe(true);
 for(let i=1;i<controls.length;i++)expect(controls[i].x).toBeGreaterThanOrEqual(controls[i-1].x+controls[i-1].w);
 // Utility headings have their own space even at maximum magnification/speed.
 const zoom=stage.getByRole('slider',{name:'Microscope zoom level'}),speed=stage.getByRole('slider',{name:'Simulation speed'});
 await zoom.focus();await page.keyboard.press('End');await expect(zoom).toHaveValue('10');
 await expect(stage.locator('[data-cell-control-value=zoom]')).toHaveText('400×');
 expect(await canvas.evaluate((c:any)=>c._cellSimGetObservationView().camera.zoom)).toBe(10);
 await speed.focus();await page.keyboard.press('End');await expect(speed).toHaveValue('5');
 await expect(stage.locator('[data-cell-control-value=speed]')).toHaveText('5×');
 for(const utility of await stage.locator('[data-cell-stage-utility]').all()){
  const label=(await utility.locator('[data-cell-control-label]').boundingBox())!,value=(await utility.locator('output').boundingBox())!,slider=(await utility.locator('input').boundingBox())!,button=(await utility.locator('button').boundingBox())!,card=(await utility.boundingBox())!;
  expect(label.x+label.width+4).toBeLessThanOrEqual(value.x);
  expect(value.x+value.width).toBeLessThanOrEqual(card.x+card.width);
  expect(slider.x+slider.width).toBeLessThanOrEqual(button.x);
  expect(button.width).toBeGreaterThanOrEqual(44);expect(button.height).toBeGreaterThanOrEqual(44);
  if(width<=390){expect(card.height).toBeLessThanOrEqual(74);expect(slider.height).toBeGreaterThanOrEqual(44);expect(button.y).toBeGreaterThanOrEqual(value.y+value.height);}
 }
 await stage.getByRole('button',{name:'Reset microscope view',exact:true}).click();
 await expect.poll(async()=>Number(await zoom.inputValue())).toBe(await canvas.evaluate((c:any)=>c._cellSimGetObservationView().camera.zoom));
 await speed.focus();await page.keyboard.press('Home');await expect(speed).toHaveValue('1');
 await stage.getByRole('button',{name:'Play simulation',exact:true}).click();await expect(stage.getByRole('button',{name:'Pause simulation',exact:true})).toHaveAttribute('aria-pressed','true');
 await stage.getByRole('button',{name:'Pause simulation',exact:true}).click();await expect(stage.getByRole('button',{name:'Play simulation',exact:true})).toHaveAttribute('aria-pressed','false');
 const hud=stage.locator('[data-cell-stage-hud]'),initialHud=(await hud.boundingBox())!;
 if(width<=390){expect(initialHud.height).toBeLessThan(160);await expect(actions.locator('[data-cell-tool-short-label]').first()).toBeVisible();}
 else await expect(actions.locator('[data-cell-tool-full-label]').last()).toBeVisible();
 const follow=actions.getByRole('button',{name:'Follow selected specimen',exact:true});
 await follow.focus();await page.keyboard.press('Enter');await expect(follow).toHaveAttribute('aria-pressed','true');await expect(follow).toBeFocused();
 expect(await canvas.evaluate((c:any)=>c._cellSimGetObservationView().following)).toBe(true);
 expect((await hud.boundingBox())!.height).toBe(initialHud.height);
 await follow.click();await expect(follow).toHaveAttribute('aria-pressed','false');
 await actions.getByRole('button',{name:'Hide labels',exact:true}).click();
 await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels().length)).toBe(0);
 await actions.getByRole('button',{name:'Show labels',exact:true}).click();
 await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels().length)).toBeGreaterThan(0);
 await actions.getByRole('button',{name:'Center',exact:true}).click();await expect(canvas).toBeFocused();
 expect(await canvas.evaluate((c:any)=>c._cellSimGetObservationView().camera.zoom)).toBe(3);
 // The newly available area must remain above the label rows rather than cover them.
 await expect.poll(async()=>{const c=(await canvas.boundingBox())!,h=(await hud.boundingBox())!;return canvas.evaluate((e:any,top:number)=>e._cellSimGetAnatomyLabels().every((b:any)=>b.y>=top),h.y+h.height-c.y);}).toBe(true);
 await stage.screenshot({path:'reports/cell-structure-explorer/compact-toolbar-'+width+'.png'});
 await actions.getByRole('button',{name:'Specimen notes',exact:true}).click();
 await expect(page.locator('[data-cell-selected-organism-card]')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
