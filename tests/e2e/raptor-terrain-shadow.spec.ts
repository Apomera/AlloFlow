import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.shadowScene=scene;window.shadowCamera=camera;window.shadowRenderer=renderer;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor terrain-following shadow',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const quality of ['low','high'])test('grounds low flight and settles without a duplicate pad: '+quality,async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepShadow=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    const low=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const step=(window as any).stepShadow;c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0,dayPhase:0.4,cloudCover:0.1});step(25);const high=c._rhSnapshot();c._rhCommand('hold',{key:'q',pressed:true});
      for(let i=0;i<220;i++){step(25);if(c._rhSnapshot().visualGroundClearance<5)break;}
      c._rhCommand('hold',{key:'q',pressed:false});return {high,low:c._rhSnapshot()};
    });
    expect(low.low.shadowVisible).toBe(quality==='low');if(quality==='low')expect(low.low.shadowShapeCompiled).toBe(true);expect(low.low.shadowVertexCount).toBe(121);expect(low.low.shadowDiffusion).toBeLessThan(low.high.shadowDiffusion);if(quality==='low')expect(low.low.shadowOpacity).toBeGreaterThan(low.high.shadowOpacity);else expect(low.low.shadowOpacity).toBe(0);
    const detail=await page.evaluate((quality)=>{
      const w=window as any,T=w.THREE,scene=w.shadowScene,renderer=w.shadowRenderer,originalCamera=w.shadowCamera,shadow=scene.getObjectByName('raptor-ground-shadow');
      const p=shadow.geometry.attributes.position,ys=Array.from({length:p.count},(_,i)=>p.getY(i)),originalSize=renderer.getSize(new T.Vector2()),size=Math.max(4,document.querySelector('[data-raptor-canvas]')!['_rhSnapshot']().shadowScale*0.7);
      renderer.setSize(640,480,false);const camera=new T.OrthographicCamera(-size*4/3,size*4/3,size,-size,0.1,200);camera.position.copy(shadow.position).add(new T.Vector3(0,40,0.01));camera.lookAt(shadow.position);renderer.render(scene,camera);
      const gl=renderer.getContext(),a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);const image=renderer.domElement.toDataURL('image/png');
      const wasVisible=shadow.visible,bird=scene.getObjectByName('raptor-head-rig').parent,casters:any[]=[];
      if(quality==='high'){bird.traverse((o:any)=>{if(o.isMesh){casters.push([o,o.castShadow]);o.castShadow=false;}});renderer.shadowMap.needsUpdate=true;}
      shadow.visible=false;renderer.render(scene,camera);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);shadow.visible=wasVisible;casters.forEach(([o,cast])=>{o.castShadow=cast;});if(casters.length)renderer.shadowMap.needsUpdate=true;
      let darkened=0;for(let i=0;i<a.length;i+=4)if(b[i]+b[i+1]+b[i+2]-a[i]-a[i+1]-a[i+2]>9)darkened++;
      renderer.setSize(originalSize.x,originalSize.y,false);renderer.render(scene,originalCamera);
      return {image,darkened,heightRange:Math.max(...ys)-Math.min(...ys),count:scene.children.filter((o:any)=>o.name==='raptor-ground-shadow').length};
    },quality);
    writeFileSync('scratch/raptor-flight-review/terrain-shadow-'+quality+'.png',Buffer.from(detail.image.split(',')[1],'base64'));
    console.log('Shadow render',quality,{low:low.low.visualGroundClearance,darkened:detail.darkened,heightRange:detail.heightRange});
    expect(detail.darkened).toBeGreaterThan(150);if(quality==='low')expect(detail.heightRange).toBeGreaterThan(0.005);expect(detail.count).toBe(1);
    const rest=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,step=w.stepShadow;c._rhCommand('hold',{key:'q',pressed:true});for(let i=0;i<240&&!c._rhSnapshot().landed;i++)step(25);c._rhCommand('hold',{key:'q',pressed:false});for(let i=0;i<40;i++)step(25);const before=c._rhSnapshot(),shadow=w.shadowScene.getObjectByName('raptor-ground-shadow'),vertices=Array.from(shadow.geometry.attributes.position.array);c._rhCommand('pause');step(60000);return {before,after:c._rhSnapshot(),sameVertices:JSON.stringify(vertices)===JSON.stringify(Array.from(shadow.geometry.attributes.position.array))};
    });
    expect(rest.before.landed).toBe(true);expect(rest.before.shadowSpan).toBeLessThan(0.25);expect(rest.sameVertices).toBe(true);expect(rest.before.shadowSpan).toBe(rest.after.shadowSpan);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const launch=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const step=(window as any).stepShadow;c._rhCommand('pause');c._rhCommand('hold',{key:' ',pressed:true});step(25);const first=c._rhSnapshot();for(let i=0;i<40;i++)step(25);c._rhCommand('hold',{key:' ',pressed:false});return {first,last:c._rhSnapshot()};});
    expect(launch.first.landed).toBe(false);expect(launch.first.shadowSpan).toBeGreaterThan(rest.before.shadowSpan);expect(launch.first.shadowSpan).toBeLessThan(0.5);expect(launch.last.shadowSpan).toBeGreaterThan(0.9);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
