import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test.describe.configure({timeout:240000});
test('drag orbits and tilts, pinch-style zoom, speed and loop keep the scene live',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});
  await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),distance=meadow.getByLabel('Meadow camera distance',{exact:true});
  await timeline.fill('60');await expect(canvas).toHaveAttribute('data-step','60');await canvas.scrollIntoViewIfNeeded();
  const focus=await meadow.locator('.efw-meadow-species button[aria-pressed=true]').textContent();
  const bearing=Number(await canvas.getAttribute('data-camera-bearing')),elevation=Number(await canvas.getAttribute('data-camera-elevation'));
  const box=(await canvas.boundingBox())!;
  // Drag across open ground: the view orbits and tilts, and the drag is not a pick.
  await page.mouse.move(box.x+box.width*0.5,box.y+box.height*0.85);await page.mouse.down();
  for(let k=1;k<=10;k++)await page.mouse.move(box.x+box.width*0.5-k*14,box.y+box.height*0.85+k*3);
  await page.mouse.up();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-bearing'))).toBeGreaterThan(bearing+0.5);
  expect(Number(await canvas.getAttribute('data-camera-elevation'))).toBeGreaterThan(elevation);
  await expect(meadow.locator('.efw-meadow-species button[aria-pressed=true]')).toHaveText(focus!);
  // Keyboard-operable equivalents of the tilt gesture.
  const raised=Number(await canvas.getAttribute('data-camera-elevation'));
  await meadow.getByRole('button',{name:'Lower view',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-elevation'))).toBeCloseTo(raised-0.12,6);
  await meadow.getByRole('button',{name:'Raise view',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-elevation'))).toBeCloseTo(raised,6);
  // Plain scrolling leaves the page in charge; Ctrl+wheel (trackpad pinch) zooms.
  const before=Number(await distance.inputValue());
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-200);await page.waitForTimeout(200);
  expect(Number(await distance.inputValue())).toBe(before);
  await page.keyboard.down('Control');await page.mouse.wheel(0,-120);await page.keyboard.up('Control');
  await expect.poll(async()=>Number(await distance.inputValue())).toBeLessThan(before);
  await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-camera-elevation','0.4');await expect(distance).toHaveValue('19');
  // Faster playback and looping.
  await meadow.getByLabel('Meadow playback speed',{exact:true}).selectOption('2');
  await timeline.fill('232');await meadow.getByRole('checkbox',{name:'Loop timeline'}).check();
  await meadow.getByRole('button',{name:'Play meadow timeline',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-playback-step-ms'))).toBe(50);
  await expect.poll(async()=>Number(await timeline.inputValue()),{timeout:60000}).toBeLessThan(100);
  await expect(meadow.getByRole('button',{name:'Pause meadow timeline',exact:true})).toBeVisible();
  await meadow.getByRole('button',{name:'Pause meadow timeline',exact:true}).click();
  const paused=await timeline.inputValue();await page.waitForTimeout(400);await expect(timeline).toHaveValue(paused);await expect(canvas).toHaveAttribute('data-step',paused);
  await meadow.getByRole('checkbox',{name:'Loop timeline'}).uncheck();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(meadow.getByLabel('Meadow playback speed',{exact:true})).toHaveCount(0);await expect(meadow.getByRole('checkbox',{name:'Loop timeline'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('live preview animates the starting community without changing populations',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});
  await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),watch=meadow.getByRole('button',{name:'Watch live behavior',exact:true});
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  const start=await canvas.getAttribute('data-representative-position');
  await watch.click();await expect(meadow.locator('[data-efw-scene-time]')).toHaveText('Live preview · starting community');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>await canvas.getAttribute('data-representative-position'),{timeout:60000}).not.toBe(start);
  await expect(canvas).toHaveAttribute('data-biomass-foxes','9');await expect(canvas).toHaveAttribute('data-glyphs-foxes','7');await expect(canvas).toHaveAttribute('data-step','0');
  await expect(meadow.locator('[data-efw-behavior]')).not.toContainText('Starting pose');
  await meadow.getByRole('button',{name:'Stop live behavior',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-representative-position',start!);await expect(meadow.locator('[data-efw-scene-time]')).toHaveText('Starting community');
  await watch.click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  await expect(meadow.locator('[data-efw-live-preview]')).toHaveCount(0);await expect(meadow.getByRole('button',{name:'Play meadow timeline',exact:true})).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

