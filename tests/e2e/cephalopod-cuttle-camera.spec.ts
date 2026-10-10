import { useCephalopodAudioFallback } from './helpers/cephalopod_audio';
import {test,expect,Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
import {clickCephalopodControl} from './helpers/cephalopod_controls';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'}),canvas='canvas[role=application]',errors=new WeakMap<Page,string[]>();
async function step(page:Page,n=1){await page.evaluate(async n=>{const w=window as any;for(let i=0;i<n;i++){w.__ccStep=.05;do{await new Promise<void>(r=>requestAnimationFrame(()=>r()));}while(w.__ccStep!==0);}},n);}
async function read(page:Page){return page.evaluate(()=>(window as any).__ccRead());}
async function mount(page:Page,phone:boolean){
 await useCephalopodAudioFallback(page);await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'cuttlefish',huntMode:'observe',huntSeed:2743,huntQuality:phone?'low':'balanced',_threeLoaded:true}});
 if(phone)await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';window.dispatchEvent(new Event('resize'));});
 await page.evaluate(()=>{
  const w=window as any,T=w.THREE,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),scene=record.scene,player=scene.getObjectByName('cl-player'),siphon=player.getObjectByName('cl-siphon'),tube=siphon.getObjectByName('cl-siphon-tube'),halo=scene.getObjectByName('cl-target');
  w.__ccScene=scene;w.__ccPlayer=player;w.__ccTube=tube;w.__ccHalo=halo;w.__ccEvents=[];w.__ccStep=0;T.Clock.prototype.getDelta=function(){const dt=w.__ccStep;w.__ccStep=0;return dt;};
  const g=tube.geometry,m=tube.material;w.__ccOwned={g,m,index:g.index,indexArray:g.index.array,indexValues:Array.from(g.index.array),attrs:Object.entries(g.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array,version:a.version,values:Array.from(a.array)}))};
  w.__ccDisposal={geometry:0,material:0};g.addEventListener('dispose',()=>w.__ccDisposal.geometry++);m.addEventListener('dispose',()=>w.__ccDisposal.material++);
  w.__ccRead=()=>({camera:w.__ccCamera.position.toArray(),cameraQuaternion:w.__ccCamera.quaternion.toArray(),facingDot:Math.abs(halo.quaternion.dot(w.__ccCamera.quaternion)),halo:halo.position.toArray(),haloVisible:halo.visible,player:[player.position.toArray(),player.quaternion.toArray()],prey:scene.children.filter((o:any)=>o.userData.alive!==undefined).map((o:any)=>[o.uuid,o.position.toArray(),o.quaternion.toArray(),o.userData.alive]),time:document.querySelector('[data-hud=time]')!.textContent,score:document.querySelector('[data-hud=score]')!.textContent,program:w.__ccProgram,retained:tube.geometry===g&&tube.material===m&&g.index===w.__ccOwned.index&&g.index.array===w.__ccOwned.indexArray&&w.__ccOwned.indexValues.every((n:any,i:number)=>n===g.index.array[i])&&w.__ccOwned.attrs.every((r:any)=>g.attributes[r.name]===r.a&&r.a.array===r.array&&r.a.version===r.version&&r.values.every((n:any,i:number)=>n===r.array[i])),children:siphon.children.length,contextLost:record.ctx.isContextLost()});
  const after=scene.onAfterRender;scene.onAfterRender=function(renderer:any,s:any,camera:any){w.__ccCamera=camera;after.apply(this,arguments);};
  const rendered=tube.onAfterRender;tube.onAfterRender=function(renderer:any,s:any,c:any,g:any,m:any){rendered.apply(this,arguments);const gl=renderer.getContext(),p=gl.getParameter(gl.CURRENT_PROGRAM);w.__ccProgram={linked:gl.getProgramParameter(p,gl.LINK_STATUS),compiled:gl.getAttachedShaders(p).every((s:any)=>gl.getShaderParameter(s,gl.COMPILE_STATUS)),type:m.type,name:m.name,vertexColors:m.vertexColors,roughness:m.roughness,bound:['position','normal','color'].every(name=>{const at=gl.getAttribLocation(p,name);return at>=0&&!!gl.getVertexAttrib(at,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);})};};
  document.querySelector(canvasSelector())!.addEventListener('keydown',(e:any)=>{if(e.code==='KeyV')w.__ccEvents.push(w.__ccRead());});
  const view=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='View');if(!view)throw Error('Native View button required');view.addEventListener('click',()=>w.__ccEvents.push(w.__ccRead()));
  function canvasSelector(){return 'canvas[role=application]';}
 });await step(page,2);
}
function frozen(a:any,b:any){for(const key of ['player','prey','time','score','halo'])expect(a[key],key+' stays frozen').toEqual(b[key]);}
function surface(row:any){expect(row.retained).toBe(true);expect(row.children).toBe(1);expect(row.contextLost).toBe(false);expect(row.program).toEqual({linked:true,compiled:true,type:'MeshStandardMaterial',name:'cl-cuttle-siphon-material',vertexColors:true,roughness:.6,bound:true});}
test.describe.configure({timeout:240000,retries:0,mode:'default'});test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error')list.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});
for(const phone of [false,true])test.describe(phone?'Phone low quality':'Desktop balanced quality',()=>{
 if(phone)test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('renders the continuous cuttlefish funnel and changes paused views in the native event without advancing the dive',async({page},testInfo)=>{
  await mount(page,phone);
  if(phone){await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();await step(page,2);}
  const initial=await read(page);await page.locator(canvas).focus();await page.keyboard.down('KeyW');await step(page,4);await page.keyboard.up('KeyW');const moving=await read(page);expect(moving.player[0]).not.toEqual(initial.player[0]);surface(moving);
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.evaluate(()=>{const w=window as any,prey=w.__ccScene.children.filter((o:any)=>o.userData.alive),crab=prey.find((o:any)=>o.userData.cfg);if(!crab)throw Error('Actual seeded crab required');prey.forEach((o:any)=>o.position.set(80,o.position.y,80));crab.position.copy(w.__ccPlayer.position).add(new w.THREE.Vector3(0,0,2));});
  await page.locator(canvas).focus();await page.keyboard.press('KeyT');await step(page,1);const paused=await read(page);expect(paused.haloVisible).toBe(true);
  const views=[];let last=paused;
  for(let i=0;i<4;i++){
   if(phone){const button=page.getByRole('button',{name:'View',exact:true});if(!await button.isVisible())await page.getByRole('button',{name:'Tools',exact:true}).click();await button.click();}
   else{await page.locator(canvas).focus();await page.keyboard.press('KeyV');}
   const event=await page.evaluate(()=>(window as any).__ccEvents.at(-1));expect(event.camera).not.toEqual(last.camera);expect(event.facingDot).toBeGreaterThan(1-1e-8);frozen(event,paused);surface(event);views.push(event);last=event;
  }
  await step(page,25);const held=await read(page);frozen(held,paused);expect(held.camera).toEqual(last.camera);surface(held);
  await clickCephalopodControl(page,'Inspect');await step(page,2);const inspected=await read(page);expect(inspected.haloVisible).toBe(false);expect(inspected.player).toEqual(paused.player);expect(inspected.prey).toEqual(paused.prey);surface(inspected);
  await page.getByRole('button',{name:'Return to dive',exact:true}).click();await step(page,2);surface(await read(page));
  await testInfo.attach('native-paused-camera-and-cuttle-funnel',{body:JSON.stringify({initial,moving,paused,views,held,inspected},null,2),contentType:'application/json'});
  await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).__ccDisposal)).toEqual({geometry:1,material:1});
 });
});
