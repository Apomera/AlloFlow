import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
const starting='Sound is starting. You can mute while you wait.';
const playing='Listening · soft rustles and distant birds.';
const interrupted='Sound is paused by the browser. Mute and unmute to try again.';
const soundGroup=(page:Page)=>page.getByRole('group',{name:'Meadow sounds',exact:true});
const toggle=(page:Page)=>page.locator('[data-bf-sound-toggle]');
const status=(page:Page)=>soundGroup(page).getByRole('status');
async function mount(page:Page){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const w=window as any,Native=w.AudioContext||w.webkitAudioContext,connect=AudioNode.prototype.connect;
  w.__audioStates=[];w.__audioRejections=[];window.addEventListener('unhandledrejection',event=>w.__audioRejections.push(String(event.reason)));
  // Keep real Web Audio nodes; control only hardware-state promises so delayed
  // startup and interruptions are deterministic. Route output to an unconnected
  // analyser so these interaction tests never send sound to the speakers.
  function ControlledAudio(){
   const context=new Native(),nativeClose=context.close.bind(context),nativeGain=context.createGain.bind(context),sink=context.createAnalyser();
   const record:any={context,sink,phase:'suspended',requests:[],suspends:[],closeCalls:0,deferSuspend:false};
   record.report=(phase:string)=>{record.phase=phase;context.dispatchEvent(new Event('statechange'));};
   Object.defineProperty(context,'state',{configurable:true,get:()=>record.phase});
   context.resume=()=>new Promise<void>((resolve,reject)=>record.requests.push({resolve:()=>{if(record.phase!=='closed')record.report('running');resolve();},reject}));
   context.suspend=()=>record.deferSuspend?new Promise<void>(resolve=>record.suspends.push(()=>{record.report('suspended');resolve();})):(record.report('suspended'),Promise.resolve());
   context.close=()=>{record.closeCalls++;record.report('closed');return nativeClose();};
   if(w.__failAudioSetup)context.createGain=()=>{throw new Error('Audio node unavailable');};else context.createGain=nativeGain;
   w.__audioStates.push(record);return context;
  }
  ControlledAudio.prototype=Native.prototype;Object.setPrototypeOf(ControlledAudio,Native);w.AudioContext=ControlledAudio;if(w.webkitAudioContext)w.webkitAudioContext=ControlledAudio;
  AudioNode.prototype.connect=function(destination:any,...args:any[]){const record=w.__audioStates.find((item:any)=>item.context===this.context);return (connect as any).call(this,record&&destination===record.context.destination?record.sink:destination,...args);};
 });
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated view'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');return errors;
}
async function enable(page:Page){await toggle(page).focus();await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>(window as any).__audioStates.length)).toBe(1);}
async function finish(page:Page,context=0,request=0){await page.evaluate(({context,request})=>(window as any).__audioStates[context].requests[request].resolve(),{context,request});}
async function countRequests(page:Page,context=0){return page.evaluate(context=>(window as any).__audioStates[context].requests.length,context);}

test('pending startup reports its actual state and shares one resume request across volume changes',async({page})=>{
 const errors=await mount(page);await enable(page);await expect(status(page)).toHaveText(starting,{timeout:2500});await expect(toggle(page)).toBeFocused();await expect(toggle(page)).toBeEnabled();await expect(toggle(page)).toHaveAccessibleName('Mute meadow sounds');await expect(toggle(page)).toHaveAccessibleDescription(starting);
 await page.keyboard.press('Tab');const volume=page.getByRole('slider',{name:'Meadow volume',exact:true});await expect(volume).toBeFocused();await expect(volume).toHaveAccessibleDescription(starting);await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(volume).toHaveValue('37');expect(await countRequests(page)).toBe(1);
 await finish(page);await expect(status(page)).toHaveText(playing);await expect(volume).toBeFocused();await expect(volume).toHaveAccessibleDescription(playing);expect(errors).toEqual([]);
});

for(const action of ['mute','pause','zero'])test('a delayed startup respects '+action+' and does not restore unwanted sound',async({page})=>{
 await mount(page);await enable(page);let expected:string;
 if(action==='mute'){await page.keyboard.press('Enter');expected='Muted · your volume is saved.';}
 else if(action==='pause'){await page.getByRole('button',{name:'Pause all motion',exact:true}).focus();await page.keyboard.press('Enter');expected='Paused with the meadow.';}
 else{await page.getByRole('slider',{name:'Meadow volume',exact:true}).focus();await page.keyboard.press('Home');expected='Volume is at zero.';}
 await expect(status(page)).toHaveText(expected);const focused=await page.evaluate(()=>document.activeElement?.outerHTML);
 await page.evaluate(()=>{const w=window as any,node=document.querySelector('.bf-sound-copy [role="status"]')!;w.__soundStatusChanges=[];w.__soundObserver=new MutationObserver(()=>w.__soundStatusChanges.push(node.textContent));w.__soundObserver.observe(node,{childList:true,subtree:true,characterData:true});});
 await finish(page);await expect.poll(()=>page.evaluate(()=>(window as any).__audioStates[0].phase)).toBe('suspended');await expect(status(page)).toHaveText(expected);expect(await page.evaluate(()=>document.activeElement?.outerHTML)).toBe(focused);expect(await countRequests(page)).toBe(1);expect(await page.evaluate(()=>(window as any).__soundStatusChanges)).not.toContain(playing);
});

test('a startup failure preserves writing and volume, closes the failed engine, and supports keyboard retry',async({page})=>{
 const errors=await mount(page);await enable(page);const volume=page.getByRole('slider',{name:'Meadow volume',exact:true});await volume.focus();await page.keyboard.press('End');await page.keyboard.press('ArrowLeft');await expect(volume).toHaveValue('99');
 const notes=page.locator('#bf-notebook-reasoning');await notes.fill('Compare the two habitats.');await notes.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(2,15,'backward'));
 await page.evaluate(()=>(window as any).__audioStates[0].requests[0].reject(new Error('Audio startup failed')));await expect(status(page)).toHaveText('Sound could not start. Try enabling it again.');await expect(notes).toBeFocused();expect(await notes.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([2,15,'backward']);
 expect(await page.evaluate(()=>(window as any).__audioStates[0].closeCalls)).toBe(1);await expect(volume).toHaveValue('99');await toggle(page).focus();await page.keyboard.press('Enter');await expect(status(page)).toHaveText(starting);await expect(toggle(page)).toBeFocused();await finish(page,1);await expect(status(page)).toHaveText(playing);await expect(toggle(page)).toBeFocused();await expect(volume).toHaveValue('99');expect(await page.evaluate(()=>(window as any).__audioRejections)).toEqual([]);expect(errors).toEqual([]);
});

test('browser interruptions update the status without automatically restarting sound',async({page})=>{
 await mount(page);await enable(page);await finish(page);await expect(status(page)).toHaveText(playing);await page.evaluate(()=>(window as any).__audioStates[0].report('interrupted'));
 await expect(status(page)).toHaveText(interrupted,{timeout:2500});await expect(toggle(page)).toBeFocused();await expect(toggle(page)).toHaveAccessibleDescription(interrupted);expect(await countRequests(page)).toBe(1);
 await page.keyboard.press('Enter');await expect(status(page)).toHaveText('Muted · your volume is saved.');await page.keyboard.press('Enter');await expect(status(page)).toHaveText(starting);expect(await countRequests(page)).toBe(2);await finish(page,0,1);await expect(status(page)).toHaveText(playing);await expect(toggle(page)).toBeFocused();
});

test('unmuting during an outstanding suspension resumes once after suspension completes',async({page})=>{
 await mount(page);await enable(page);await finish(page);await expect(status(page)).toHaveText(playing);await page.evaluate(()=>(window as any).__audioStates[0].deferSuspend=true);
 await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>(window as any).__audioStates[0].suspends.length)).toBe(1);await page.keyboard.press('Enter');
 await page.evaluate(()=>(window as any).__audioStates[0].suspends[0]());await expect(status(page)).toHaveText(starting,{timeout:2500});expect(await countRequests(page)).toBe(2);
 const volume=page.getByRole('slider',{name:'Meadow volume',exact:true});await volume.focus();await page.keyboard.press('ArrowRight');expect(await countRequests(page)).toBe(2);await finish(page,0,1);await expect(status(page)).toHaveText(playing);await expect(volume).toBeFocused();
});

test('closing the tool disposes pending audio and late completion cannot disturb the next tool',async({page})=>{
 const errors=await mount(page);await enable(page);await page.evaluate(()=>{const w=window as any;w.__destroy();const notes=document.createElement('textarea');notes.id='next-tool-notes';notes.value='Continue in the next tool.';document.body.appendChild(notes);notes.focus();notes.setSelectionRange(3,14,'backward');});
 expect(await page.evaluate(()=>(window as any).__audioStates[0].closeCalls)).toBe(1);await finish(page);await expect(page.locator('.bfl')).toHaveCount(0);await expect(page.locator('#next-tool-notes')).toBeFocused();expect(await page.locator('#next-tool-notes').evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([3,14,'backward']);expect(await countRequests(page)).toBe(1);expect(await page.evaluate(()=>(window as any).__audioRejections)).toEqual([]);expect(errors).toEqual([]);
});

test('failed audio-node construction releases the new context before retrying',async({page})=>{
 const errors=await mount(page);await page.evaluate(()=>(window as any).__failAudioSetup=true);await enable(page);await expect(status(page)).toHaveText('Sound could not start. Try enabling it again.');await expect(toggle(page)).toBeFocused();expect(await page.evaluate(()=>(window as any).__audioStates[0].closeCalls)).toBe(1);
 await page.evaluate(()=>(window as any).__failAudioSetup=false);await page.keyboard.press('Enter');await expect(status(page)).toHaveText(starting);await finish(page,1);await expect(status(page)).toHaveText(playing);await expect(toggle(page)).toBeFocused();expect(errors).toEqual([]);
});


test('localized startup and interruption guidance reflows with narrow text spacing',async({page})=>{
 await page.setViewportSize({width:320,height:900});await mount(page);const pending='El sonido se está iniciando. Puedes silenciarlo mientras esperas.',waiting='El navegador ha pausado el sonido. Silencia y vuelve a activar el sonido para intentarlo de nuevo.';
 await page.evaluate(({pending,waiting})=>{const w=window as any,translations:Record<string,string>={'stem.butterfly.sound_starting':pending,'stem.butterfly.sound_interrupted':waiting};w.__ctx.t=(key:string,fallback:string)=>translations[key]||fallback;w.__rerender();},{pending,waiting});
 await page.addStyleTag({content:'.bfl *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.bfl p{margin-bottom:2em!important}'});await enable(page);await expect(status(page)).toHaveText(pending);await expect(toggle(page)).toHaveAccessibleDescription(pending);
 await finish(page);await page.evaluate(()=>(window as any).__audioStates[0].report('interrupted'));await expect(status(page)).toHaveText(waiting);await expect(toggle(page)).toHaveAccessibleDescription(waiting);await expect(toggle(page)).toBeFocused();
 const overflowing=await soundGroup(page).evaluate(group=>Array.from(group.querySelectorAll('button,input,[role="status"]')).filter(node=>{const box=node.getBoundingClientRect();return box.left<0||box.right>321||node.scrollWidth>node.clientWidth+1;}).map(node=>node.textContent||node.getAttribute('aria-label')));expect(overflowing).toEqual([]);
 await soundGroup(page).screenshot({path:'scratch/butterfly-audio-state-mobile.png'});
});
