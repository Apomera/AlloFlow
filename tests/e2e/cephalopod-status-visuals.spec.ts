import {test, expect, Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';
import {clickCephalopodControl} from './helpers/cephalopod_controls';

const source=(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g,'/');
const harness=new GlHarness({toolFile:source,toolId:'cephalopodLab',width:1280,height:1000,layout:'document'});
const failures=new WeakMap<Page,string[]>();
const profiles=[
  {id:'desktop',width:1280,height:900,touch:false,quality:'balanced',mode:'reefMission',species:'commonOcto',accessible:false},
  {id:'mobile',width:390,height:844,touch:true,quality:'low',mode:'observe',species:'commonOcto',accessible:false},
  {id:'mobile-small',width:320,height:568,touch:true,quality:'low',mode:'observe',species:'commonOcto',accessible:false},
  {id:'mobile-large-contrast',width:390,height:844,touch:true,quality:'low',mode:'observe',species:'giantPacific',accessible:true},
] as const;
type CaptureProfile={id:string;width:number;height:number;touch:boolean;quality:'low'|'balanced';mode:'reefMission'|'observe';species:'commonOcto'|'giantPacific';accessible:boolean};

test.describe.configure({timeout:180000,retries:0});
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{
  const errors:string[]=[];failures.set(page,errors);
  page.on('pageerror',error=>errors.push(error.message));
  await useCephalopodAudioFallback(page);
});
test.afterEach(async({page})=>{
  try{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);}
  finally{await harness.destroy(page);}
  expect(failures.get(page)).toEqual([]);
});

async function frames(page:Page,count=3){
  await page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));},count);
}

async function mount(page:Page,profile:CaptureProfile){
  await page.goto(harness.url+'/__harness');
  await page.waitForFunction(()=>typeof (window as any).__mount==='function'&&!!(window as any).StemLab?._registry?.cephalopodLab);
  await page.evaluate(({quality,mode,species})=>{
    // The standalone harness needs the host's normal responsive viewport before
    // mounting. Keep the actual clock, seeded scene, and native graphics intact.
    let meta=document.querySelector('meta[name="viewport"]') as HTMLMetaElement|null;
    if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta);}
    meta.content='width=device-width, initial-scale=1';
    document.getElementById('wrap')!.style.width='100%';
    (window as any).__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:mode,huntSeed:2741,huntQuality:quality,_threeLoaded:true}});
  },profile);
  await page.waitForFunction(()=>{
    const records=(window as any).__glRecorder?.records||[];
    return records.some((r:any)=>r.createdBy==='page'&&r.canvas.isConnected&&r.scene?.getObjectByName('cl-player')&&r.draws>0&&!r.ctx.isContextLost());
  },undefined,{timeout:90000});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  await frames(page);
  await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();
  await frames(page);
}

async function dimensions(page:Page){
  return page.evaluate(()=>{
    function bounds(el:Element){const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}
    const stage=document.querySelector('.cl-hunt-stage') as HTMLElement;
    const canvas=stage.querySelector('canvas[role="application"]')!;
    const hud=stage.querySelector('.cl-hunt-hud') as HTMLElement;
    const css=getComputedStyle(hud);
    const record=(window as any).__glRecorder.records.filter((r:any)=>r.canvas===canvas&&r.scene).at(-1);
    return {
      viewport:{width:innerWidth,height:innerHeight},stage:bounds(stage),canvas:bounds(canvas),
      hud:{...bounds(hud),clientWidth:hud.clientWidth,clientHeight:hud.clientHeight,scrollWidth:hud.scrollWidth,scrollHeight:hud.scrollHeight,overflowX:css.overflowX,overflowY:css.overflowY,fontSize:css.fontSize,lineHeight:css.lineHeight},
      readouts:[...stage.querySelectorAll('[data-hud]')].map(node=>({key:node.getAttribute('data-hud'),text:node.textContent,...bounds(node)})),
      panels:[...stage.querySelectorAll('.cl-hunt-mission,.cl-hunt-touch,.cl-hunt-controls')].map(node=>({className:node.className,...bounds(node)})),
      horizontalPageOverflow:document.documentElement.scrollWidth>innerWidth+1,
      compact:stage.classList.contains('cl-hunt-touch-enabled'),forcedEffects:!!(window as any).__alloForceFX,
      scene:{draws:record?.draws||0,connected:!!record?.canvas.isConnected,contextLost:record?record.ctx.isContextLost():true,species:record?.scene.getObjectByName('cl-player')?.userData.species},
    };
  });
}

for(const profile of profiles)test.describe(profile.id+' live status',()=>{
  test.use({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1});
  test('captures the real paused scene and readable status without horizontal overflow',async({page},info)=>{
    await mount(page,profile);
    if(profile.accessible){
      await clickCephalopodControl(page,'Help / settings');
      await page.getByLabel('Larger text',{exact:true}).check();
      await page.getByLabel('High contrast',{exact:true}).check();
      await page.getByRole('button',{name:'Return to dive',exact:true}).click();
      await expect(page.locator('.cl-hunt-stage')).toHaveClass(/cl-large-text/);
      await expect(page.locator('.cl-hunt-stage')).toHaveClass(/cl-high-contrast/);
      await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();await frames(page);
    }
    const pause=page.getByRole('button',{name:'Pause',exact:true});
    await expect(pause).toBeVisible();
    if(profile.touch)await pause.tap();else await pause.click();
    await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
    await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');
    await frames(page);
    const time=await page.locator('.cl-hunt-stage [data-hud=time]').textContent();
    const measure=await dimensions(page);
    expect(measure.forcedEffects).toBe(false);expect(measure.scene.connected).toBe(true);expect(measure.scene.contextLost).toBe(false);expect(measure.scene.draws).toBeGreaterThan(0);
    expect(measure.scene.species).toBe(profile.species);expect(measure.viewport.width).toBe(profile.width);
    expect(measure.horizontalPageOverflow).toBe(false);
    expect(measure.hud.width).toBeGreaterThan(100);expect(measure.hud.height).toBeGreaterThan(30);
    expect(measure.hud.left).toBeGreaterThanOrEqual(measure.stage.left-1);expect(measure.hud.right).toBeLessThanOrEqual(measure.stage.right+1);
    expect(measure.hud.top).toBeGreaterThanOrEqual(measure.stage.top-1);expect(measure.hud.bottom).toBeLessThanOrEqual(measure.stage.bottom+1);
    expect(measure.hud.scrollWidth).toBeLessThanOrEqual(measure.hud.clientWidth+1);
    // Compact status intentionally scrolls vertically when its contents need
    // more room. Do not treat that supported overflow as clipped information.
    if(measure.hud.scrollHeight>measure.hud.clientHeight+1)expect(['auto','scroll']).toContain(measure.hud.overflowY);
    if(profile.touch){
      expect(measure.compact).toBe(true);
      expect(measure.stage.top).toBeGreaterThanOrEqual(-1);expect(measure.stage.bottom).toBeLessThanOrEqual(profile.height+1);
    }
    for(const key of ['species','health','energy','stamina','camo','score','time','depth'])expect(measure.readouts.find(row=>row.key===key)?.text?.trim(),key+' status').toBeTruthy();
    const screenshot=info.outputPath('status-'+profile.id+'.png');
    await page.locator('.cl-hunt-stage').screenshot({path:screenshot});
    await info.attach('status-'+profile.id,{path:screenshot,contentType:'image/png'});
    await info.attach('status-'+profile.id+'-dimensions',{body:JSON.stringify({source,profile,...measure},null,2),contentType:'application/json'});
    expect(await page.locator('.cl-hunt-stage [data-hud=time]').textContent()).toBe(time);
    await page.getByRole('button',{name:'Resume',exact:true}).click();await frames(page);
    await page.locator('.cl-hunt-stage').screenshot({path:info.outputPath('live-'+profile.id+'.png')});
    if(profile.accessible){
      await page.emulateMedia({forcedColors:'active'});await frames(page);
      const forced=await dimensions(page);expect(forced.hud.scrollWidth).toBeLessThanOrEqual(forced.hud.clientWidth+1);
      await page.locator('.cl-hunt-stage').screenshot({path:info.outputPath('forced-colors-'+profile.id+'.png')});
    }
  });
});

async function meters(page:Page){
  return page.evaluate(()=>{
    const stage=document.querySelector('.cl-hunt-stage')!;
    const rows=[...stage.querySelectorAll<HTMLElement>('[data-hud-meter]')].map(fill=>{
      const key=fill.getAttribute('data-hud-meter')!,number=stage.querySelector('[data-hud="'+key+'"]')!;
      const maximum=fill.closest('.cl-hud-resource')?.querySelector('.cl-meter-maximum')?.textContent||'';
      const transform=fill.style.transform,match=/^scaleX\(([^)]+)\)$/.exec(transform);
      return {key,number:Number.parseFloat(number.textContent||''),maximum:maximum?Number.parseFloat(maximum.replace('/','')):100,fraction:match?Number(match[1]):NaN,transform,decorative:!!fill.closest('[aria-hidden="true"]')};
    });
    const record=(window as any).__glRecorder.records.filter((r:any)=>r.canvas.isConnected&&r.scene).at(-1);
    return {rows,time:stage.querySelector('[data-hud=time]')!.textContent,player:record.scene.getObjectByName('cl-player').position.toArray()};
  });
}

function expectMeters(snapshot:Awaited<ReturnType<typeof meters>>){
  expect(snapshot.rows.map(row=>row.key).sort()).toEqual(['camo','energy','health','stamina']);
  const maxima:Record<string,number>={health:150,energy:120,stamina:100,camo:100};
  for(const row of snapshot.rows){
    expect(row.maximum,row.key+' maximum').toBe(maxima[row.key]);
    expect(row.fraction,row.key+' finite fraction').toBeGreaterThanOrEqual(0);expect(row.fraction).toBeLessThanOrEqual(1);
    // Text rounds to whole units while the fill retains the current fraction.
    expect(Math.abs(row.fraction*row.maximum-row.number),row.key+' displayed value').toBeLessThanOrEqual(.501);
    expect(row.decorative,row.key+' redundant visual encoding').toBe(true);
  }
}

test.describe('native status meter updates',()=>{
  test.use({viewport:{width:1280,height:900},hasTouch:false,isMobile:false,deviceScaleFactor:1});
  test('species maxima and real jet use update the meters, then pause freezes their values',async({page},info)=>{
    await mount(page,{...profiles[0],species:'giantPacific',mode:'observe'});
    await expect(page.locator('[data-hud-meter]')).toHaveCount(4);
    await expect.poll(()=>page.locator('[data-hud-meter=stamina]').evaluate(node=>(node as HTMLElement).style.transform)).toMatch(/^scaleX\(/);
    const before=await meters(page);expectMeters(before);
    await page.locator('canvas[role=application]').focus();
    await page.keyboard.down('KeyW');await page.keyboard.down('Space');
    let used:Awaited<ReturnType<typeof meters>>;
    try{
      await expect.poll(async()=>Number(await page.locator('.cl-hunt-stage [data-hud=stamina]').textContent()),{timeout:15000}).toBeLessThan(80);
      used=await meters(page);expectMeters(used);
      // Escape is a native pause action and clears the held movement inputs.
      await page.keyboard.press('Escape');
    }finally{await page.keyboard.up('Space');await page.keyboard.up('KeyW');}
    expect(used!.rows.find(row=>row.key==='stamina')!.fraction).toBeLessThan(before.rows.find(row=>row.key==='stamina')!.fraction-.1);
    expect(Math.hypot(...used!.player.map((value:number,index:number)=>value-before.player[index]))).toBeGreaterThan(.05);
    await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await frames(page);
    const paused=await meters(page);expectMeters(paused);
    await page.waitForTimeout(500);
    expect(await meters(page)).toEqual(paused);
    await info.attach('native-jet-meter-values',{body:JSON.stringify({before,used:used!,paused},null,2),contentType:'application/json'});
  });
});
