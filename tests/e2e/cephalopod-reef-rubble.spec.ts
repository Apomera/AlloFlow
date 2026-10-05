import {test,expect,Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
import {clickCephalopodControl} from './helpers/cephalopod_controls';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'}),errors=new WeakMap<Page,string[]>(),canvas='canvas[role=application]';
async function step(page:Page,count=1){await page.evaluate(async count=>{const w=window as any;for(let i=0;i<count;i++){w.__rrStep=.05;do{await new Promise<void>(r=>requestAnimationFrame(()=>r()));}while(w.__rrStep!==0);}},count);}
async function read(page:Page){return page.evaluate(()=>(window as any).__rrRead());}
async function mount(page:Page,phone:boolean){
 await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:phone?'low':'balanced',_threeLoaded:true}});
 if(phone)await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';window.dispatchEvent(new Event('resize'));});
 await page.evaluate(()=>{
  const w=window as any,T=w.THREE,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),scene=record.scene,mesh=scene.getObjectByName('cl-reef-rubble');
  if(!mesh?.isInstancedMesh||mesh.count===0)throw Error('Actual rendered rubble pool required');
  w.__rrScene=scene;w.__rrMesh=mesh;w.__rrPlayer=scene.getObjectByName('cl-player');w.__rrRocks=scene.children.filter((r:any)=>r.userData.substrate==='rock');w.__rrStep=0;T.Clock.prototype.getDelta=function(){const dt=w.__rrStep;w.__rrStep=0;return dt;};
  const g=mesh.geometry,m=mesh.material,matrices=mesh.instanceMatrix,colors=mesh.instanceColor,attributes=Object.entries(g.attributes).map(([name,a]:[string,any])=>({name,a,array:a.array,version:a.version,values:Array.from(a.array)})),matrixArray=matrices.array,colorArray=colors.array;
  w.__rrDisposed={geometry:0,material:0};g.addEventListener('dispose',()=>w.__rrDisposed.geometry++);m.addEventListener('dispose',()=>w.__rrDisposed.material++);
  mesh.onAfterRender=function(renderer:any,s:any,c:any,g:any,m:any){const gl=renderer.getContext(),p=gl.getParameter(gl.CURRENT_PROGRAM);w.__rrProgram={linked:gl.getProgramParameter(p,gl.LINK_STATUS),compiled:gl.getAttachedShaders(p).every((s:any)=>gl.getShaderParameter(s,gl.COMPILE_STATUS)),bound:['position','normal','color','instanceColor','instanceMatrix'].every(name=>{const loc=gl.getAttribLocation(p,name);return loc>=0&&!!gl.getVertexAttrib(loc,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);}),material:m.type,roughness:m.roughness};};
  w.__rrRead=()=>({count:mesh.count,capacity:matrices.count,colorCapacity:colors.count,colorValues:Array.from(colors.array.slice(0,mesh.count*3)).every((n:any)=>Number.isFinite(n)&&n>0&&n<=1),castShadow:mesh.castShadow,version:matrices.version,colorVersion:colors.version,matrices:Array.from(matrices.array),player:w.__rrPlayer.position.toArray(),rocks:w.__rrRocks.map((r:any)=>r.position.toArray()),prey:scene.children.filter((o:any)=>o.userData.alive!==undefined).map((o:any)=>[o.uuid,o.position.toArray(),o.quaternion.toArray(),o.userData.alive]),time:document.querySelector('[data-hud=time]')!.textContent,program:w.__rrProgram,retained:mesh.geometry===g&&mesh.material===m&&mesh.instanceMatrix===matrices&&mesh.instanceColor===colors&&matrices.array===matrixArray&&colors.array===colorArray&&attributes.every((r:any)=>g.attributes[r.name]===r.a&&r.a.array===r.array&&r.a.version===r.version&&r.values.every((n:any,i:number)=>n===r.array[i])),contextLost:record.ctx.isContextLost(),pageCreated:record.createdBy==='page'});
 });await step(page,3);
}
function healthy(row:any,phone:boolean){
 expect(row.count).toBeGreaterThan(30);expect(row.rocks.length).toBeGreaterThan(0);expect(row.capacity).toBe(row.rocks.length*(phone?4:8));expect(row.count).toBeLessThanOrEqual(row.capacity);expect(row.colorCapacity).toBe(row.capacity);expect(row.colorValues).toBe(true);expect(row.castShadow).toBe(!phone);expect(row.retained).toBe(true);expect(row.contextLost).toBe(false);expect(row.pageCreated).toBe(true);
 expect(row.program).toEqual({linked:true,compiled:true,bound:true,material:'MeshStandardMaterial',roughness:.96});
}
test.describe.configure({timeout:240000,retries:0,mode:'default'});test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.beforeEach(({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error')list.push(m.text());});});test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});
for(const phone of [false,true])test.describe(phone?'Phone low quality':'Desktop balanced quality',()=>{
 if(phone)test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('renders one retained rubble pool through movement, paused inspection and actual endless-world recycling',async({page},testInfo)=>{
  await mount(page,phone);
  if(phone){await clickCephalopodControl(page,'Help / settings');await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive',exact:true}).click();await step(page,2);}
  const initial=await read(page);healthy(initial,phone);await page.locator(canvas).focus();await page.keyboard.down('KeyW');await step(page,8);await page.keyboard.up('KeyW');const moving=await read(page);healthy(moving,phone);expect(moving.player).not.toEqual(initial.player);expect(moving.matrices).toEqual(initial.matrices);expect(moving.version).toBe(initial.version);
  await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await read(page);await step(page,25);const frozen=await read(page);for(const key of ['player','prey','time','matrices','version','colorVersion'])expect(frozen[key],key+' remains frozen').toEqual(paused[key]);healthy(frozen,phone);
  await clickCephalopodControl(page,'Inspect');await step(page,3);const inspected=await read(page);expect(inspected.player).toEqual(paused.player);expect(inspected.prey).toEqual(paused.prey);expect(inspected.version).toBe(initial.version);healthy(inspected,phone);
  await page.getByRole('button',{name:'Return to dive',exact:true}).click();await page.locator(canvas).focus();await page.keyboard.press('Escape');
  // Translate the actual player to request the production recycler; leave its RNG, rocks and update callback intact.
  await page.evaluate(()=>{const p=(window as any).__rrPlayer.position;p.x=250;p.z=170;});await step(page,20);const recycled=await read(page);healthy(recycled,phone);expect(recycled.rocks).not.toEqual(initial.rocks);expect(recycled.matrices).not.toEqual(initial.matrices);expect(recycled.version).toBe(initial.version+1);expect(recycled.colorVersion).toBe(initial.colorVersion+1);expect(recycled.count).toBeGreaterThan(initial.count);
  const grounding=await page.evaluate(()=>{const w=window as any,T=w.THREE,mesh=w.__rrMesh,matrix=new T.Matrix4(),p=new T.Vector3(),attr=mesh.geometry.attributes.position,rows=[];for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const root=w.__rrRocks[mesh.userData.rockIndices[i]];let lowest=Infinity;for(let v=0;v<attr.count;v++)lowest=Math.min(lowest,p.fromBufferAttribute(attr,v).applyMatrix4(matrix).y+55);rows.push({lowest,offset:Math.hypot(matrix.elements[12]-root.position.x,matrix.elements[14]-root.position.z)});}return rows;});
  expect(grounding.every((r:any)=>Math.abs(r.lowest+.009)<.00004&&r.offset<5)).toBe(true);await step(page,10);const settled=await read(page);expect(settled.version).toBe(recycled.version);healthy(settled,phone);
  const compact=(r:any)=>{const {matrices,...rest}=r;return rest;};await testInfo.attach('native-rubble-lifecycle',{body:JSON.stringify({initial:compact(initial),moving:compact(moving),frozen:compact(frozen),inspected:compact(inspected),recycled:compact(recycled),grounding},null,2),contentType:'application/json'});
  await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).__rrDisposed)).toEqual({geometry:1,material:1});
 });
});
