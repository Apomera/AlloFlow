import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

// The illustrated fallback shares the animation loop and pause controls without
// requiring a GPU. The immersion suite separately checks the moving 3D scenery.
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 await expect(page.locator('.bf-gl')).toHaveCount(0);
 return errors;
}

async function frozen(page:Page,attribute:string){
 const stage=page.locator('.bf-stage'),snapshot=await stage.getAttribute(attribute);
 const flight=await stage.getAttribute('data-clock'),meadow=await stage.getAttribute('data-bf-meadow-clock'),position=await stage.getAttribute('data-position');
 await page.waitForTimeout(220);
 expect(await stage.getAttribute(attribute)).toBe(snapshot);
 expect(await stage.getAttribute('data-clock')).toBe(flight);
 expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(meadow);
 expect(await stage.getAttribute('data-position')).toBe(position);
 return Number(snapshot);
}

async function showFeedingStill(page:Page){
 await page.getByRole('button',{name:'Show step still',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding-progress','1.000');
}

test('global pause controls feeding, while replay preserves the selected comparison',async({page})=>{
 const errors=await mount(page),stage=page.locator('.bf-stage');
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await page.getByRole('button',{name:'Visit Common milkweed without flying',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await expect(stage).toHaveAttribute('data-bf-feeding-progress','0.000');
 await frozen(page,'data-bf-feeding-progress');
 await expect(page.getByRole('button',{name:'Pause feeding motion',exact:true})).toBeDisabled();

 await page.getByRole('button',{name:'Resume motion',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-feeding-progress'))).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 const paused=await frozen(page,'data-bf-feeding-progress');
 await page.getByRole('button',{name:'Continue feeding motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-feeding-progress'))).toBeGreaterThan(paused);
 await stage.focus();await stage.press('Space');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await frozen(page,'data-bf-feeding-progress');

 // Switching steps while everything is paused must not start playback.
 await showFeedingStill(page);await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-feeding-progress','0.000');await frozen(page,'data-bf-feeding-progress');
 await showFeedingStill(page);await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-feeding','deposit');
 await page.getByRole('button',{name:'Misses receptive surface',exact:true}).click();
 await page.getByRole('button',{name:'Pollen close-up',exact:true}).click();
 const speed=page.getByRole('combobox',{name:'Playback speed',exact:true});await speed.selectOption('0.5');
 await page.getByRole('button',{name:'Replay feeding motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect(stage).toHaveAttribute('data-bf-feeding-contact','false');
 await expect(stage).toHaveAttribute('data-bf-feeding-focus','pollen');await expect(speed).toHaveValue('0.5');
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-feeding-progress'))).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();await frozen(page,'data-bf-feeding-progress');
 await page.getByRole('button',{name:'Restart flower visit',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect(stage).toHaveAttribute('data-bf-feeding','sip');
 await expect(stage).toHaveAttribute('data-bf-feeding-contact','true');
 await expect(stage).toHaveAttribute('data-bf-feeding-focus','whole');await expect(speed).toHaveValue('1');
 expect(errors).toEqual([]);
});

test('global pause also gates life-cycle playback and respects blur and reduced motion',async({page})=>{
 const errors=await mount(page),stage=page.locator('.bf-stage');
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 const panel=page.getByRole('region',{name:'Life cycle investigation',exact:true});
 await panel.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption('milkweed');
 await panel.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');
 await panel.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await page.getByRole('button',{name:'Watch next stage',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-life-stage','caterpillar');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await expect(stage).toHaveAttribute('data-bf-life-progress','0.000');await frozen(page,'data-bf-life-progress');
 await page.getByRole('combobox',{name:'Stage playback speed',exact:true}).selectOption('0.5');

 await page.getByRole('button',{name:'Resume motion',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(0);
 await stage.focus();await stage.press('Space');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 const paused=await frozen(page,'data-bf-life-progress');
 await expect(page.getByRole('button',{name:'Pause stage motion',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Continue stage motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(paused);

 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await frozen(page,'data-bf-life-progress');
 const slider=page.getByRole('slider',{name:'Stage illustration progress',exact:true});await slider.focus();await slider.press('Home');
 await page.getByRole('button',{name:'Continue stage motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-life-progress'))).toBeGreaterThan(0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Replay stage motion',exact:true})).toBeDisabled();
 await frozen(page,'data-bf-life-progress');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(page.getByRole('button',{name:'Continue stage motion',exact:true})).toBeEnabled();
 expect(errors).toEqual([]);
});
