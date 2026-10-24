import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

// The fallback exercises the same sound controls without spending the suite's
// time rendering the meadow through software WebGL. Audio remains real Web Audio.
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-meadow-audio';
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(()=>{mkdirSync(shots,{recursive:true});return harness.start();});
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,unsupported=false){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({unsupported})=>{
  const w=window as any;
  w.__meadowAudio=[];
  if(unsupported){w.AudioContext=undefined;w.webkitAudioContext=undefined;return;}
  const Native=w.AudioContext||w.webkitAudioContext,originalConnect=AudioNode.prototype.connect;
  const RecordingContext=function(options?:AudioContextOptions){
   const context:AudioContext=new Native(options),analyser=context.createAnalyser();
   analyser.fftSize=2048;
   w.__meadowAudio.push({context,analyser});
   return context;
  };
  RecordingContext.prototype=Native.prototype;
  Object.setPrototypeOf(RecordingContext,Native);
  w.AudioContext=RecordingContext;
  if(w.webkitAudioContext)w.webkitAudioContext=RecordingContext;
  // Observe the actual signal reaching the speakers. This does not replace the
  // sound generator or add any signal; the analyser branch has no output.
  AudioNode.prototype.connect=function(destination:any,...rest:any[]){
   const result=(originalConnect as any).call(this,destination,...rest);
   const record=w.__meadowAudio.find((entry:any)=>entry.context===this.context);
   if(record&&destination===record.context.destination)(originalConnect as any).call(this,record.analyser);
   return result;
  } as typeof AudioNode.prototype.connect;
 },{unsupported});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 await expect(page.getByRole('group',{name:'Meadow sounds',exact:true})).toBeVisible();
 return errors;
}

async function audio(page:Page){
 return page.evaluate(()=>(window as any).__meadowAudio.map(({context,analyser}:any)=>{
  const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
  return {state:context.state,rms:Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length)};
 }));
}

async function expectAudioState(page:Page,state:string){
 await expect.poll(async()=>(await audio(page)).map((entry:any)=>entry.state)).toEqual([state]);
}

async function volumeTo(page:Page,value:number){
 const slider=page.getByRole('slider',{name:'Meadow volume',exact:true});
 await slider.evaluate((element,value)=>{
  const input=element as HTMLInputElement;
  // Range inputs cannot use Playwright.fill. The native setter and bubbling
  // input event reproduce the value change a pointer drag sends to React.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,String(value));
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 },value);
 await expect(slider).toHaveValue(String(value));
}

test('meadow sounds require opt-in, respect volume and mute, and release their audio context',async({page})=>{
 const errors=await mount(page),slider=page.getByRole('slider',{name:'Meadow volume',exact:true});
 await expect(slider).toHaveAttribute('min','0');await expect(slider).toHaveAttribute('max','100');
 await expect(slider).toHaveValue('35');expect(await audio(page)).toEqual([]);
 await volumeTo(page,60);expect(await audio(page)).toEqual([]);
 await page.getByRole('button',{name:'Enable meadow sounds',exact:true}).click();
 await expectAudioState(page,'running');
 // This is an audible-signal assertion, not merely a context or icon assertion.
 await expect.poll(async()=>(await audio(page))[0].rms).toBeGreaterThan(0.00001);
 await page.getByRole('button',{name:'Mute meadow sounds',exact:true}).click();
 await expectAudioState(page,'suspended');
 await volumeTo(page,25);await expectAudioState(page,'suspended');
 await expect(page.getByRole('button',{name:'Unmute meadow sounds',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Unmute meadow sounds',exact:true}).click();
 await expectAudioState(page,'running');await expect(slider).toHaveValue('25');
 await volumeTo(page,0);await expectAudioState(page,'suspended');
 await volumeTo(page,45);await expectAudioState(page,'running');
 await page.setViewportSize({width:390,height:844});
 const group=page.getByRole('group',{name:'Meadow sounds',exact:true});
 const bounds=await group.boundingBox();expect(bounds).not.toBeNull();
 expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);
 await group.screenshot({path:shots+'/mobile-sound-controls.png'});
 expect(await page.evaluate(async()=>{
  const audit=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
  return audit.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>node.failureSummary)}));
 })).toEqual([]);
 await harness.destroy(page);await expectAudioState(page,'closed');
 await page.evaluate(()=>(window as any).__mount({butterfly:{observations:['milkweed']}}));
 await expect(page.getByRole('button',{name:'Enable meadow sounds',exact:true})).toBeVisible();
 await expectAudioState(page,'closed');
 expect(errors).toEqual([]);
});

test('global pause and blur silence the meadow without losing mute or volume preferences',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors=await mount(page),stage=page.locator('.bf-stage');
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await page.getByRole('button',{name:'Enable meadow sounds',exact:true}).click();
 await expectAudioState(page,'suspended');await volumeTo(page,48);
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();await expectAudioState(page,'running');
 // Click twice in one task so the second click beats the delayed fade/suspend.
 await page.getByRole('group',{name:'Meadow sounds',exact:true}).evaluate(element=>{
  const button=element.querySelector('button')!;button.click();button.click();
 });
 await page.waitForTimeout(300);await expectAudioState(page,'running');
 await expect(page.getByRole('button',{name:'Mute meadow sounds',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await expectAudioState(page,'suspended');
 await expect(page.getByRole('slider',{name:'Meadow volume',exact:true})).toHaveValue('48');
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();await expectAudioState(page,'running');
 await page.getByRole('button',{name:'Mute meadow sounds',exact:true}).click();await expectAudioState(page,'suspended');
 await stage.focus();await stage.press('Space');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await stage.press('Space');await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expectAudioState(page,'suspended');
 await expect(page.getByRole('button',{name:'Unmute meadow sounds',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Unmute meadow sounds',exact:true}).click();await expectAudioState(page,'running');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await expectAudioState(page,'suspended');
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();await expectAudioState(page,'running');
 await expect(page.getByRole('slider',{name:'Meadow volume',exact:true})).toHaveValue('48');
 expect(errors).toEqual([]);
});

test('unavailable Web Audio leaves a clear, disabled sound control',async({page})=>{
 const errors=await mount(page,true),group=page.getByRole('group',{name:'Meadow sounds',exact:true});
 await expect(group.getByRole('button')).toBeDisabled();
 await expect(group).toContainText(/unavailable|not supported|does not support/i);
 await expect(group.getByRole('slider',{name:'Meadow volume',exact:true})).toBeDisabled();
 expect(await audio(page)).toEqual([]);
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','false');
 expect(errors).toEqual([]);
});
