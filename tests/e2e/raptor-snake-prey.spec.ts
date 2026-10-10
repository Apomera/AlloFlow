import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_SNAKE_SCREENSHOTS||resolve('scratch/raptor-snake-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','buildSnakePreyParts','advanceSnakeSlither','updateSnakePreySurface','buildPreyVisual','createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.snakeReview={build:buildPreyVisual,advance:advanceSnakeSlither,surface:updateSnakePreySurface,create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.snakeRenderer=r;r.render=function(scene,camera){window.snakeScene=scene;window.snakeCamera=camera;if(!window.skipSnakeRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor snake prey',()=>{
  test.describe.configure({timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:1140,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepSnake=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,species='redTail',quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders a continuous patterned snake with a travelling wave and terrain contact',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.snakeReview;
      const panel=document.createElement('section');panel.id='snake-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:780px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,780);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const camera=new T.PerspectiveCamera(35,540/260,.1,100);camera.position.set(2.6,3.3,4.5);camera.lookAt(0,.15,-.1);
      const rows=[{label:'Resting on level ground',phase:0,height:(x:number,z:number)=>0},{label:'Moving over a gentle ridge',phase:2.1,height:(x:number,z:number)=>.20*Math.cos(z*1.3)+x*.09},{label:'Travelling wave · next pose',phase:4.3,height:(x:number,z:number)=>.20*Math.cos(z*1.3)+x*.09}];
      const scenes:any[]=[],evidence:any[]=[];
      rows.forEach((row,r)=>{for(let col=0;col<2;col++){
        const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.85));const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
        const floorGeometry=new T.PlaneGeometry(5,5,40,40);floorGeometry.rotateX(-Math.PI/2);const fp=floorGeometry.attributes.position;for(let i=0;i<fp.count;i++)fp.setY(i,row.height(fp.getX(i),fp.getZ(i)));floorGeometry.computeVertexNormals();scene.add(new T.Mesh(floorGeometry,new T.MeshStandardMaterial({color:new T.Color(0x8a9b74).convertSRGBToLinear(),roughness:1})));
        const size=2.2,root=new T.Group();root.position.y=row.height(0,0)+size*.15;scene.add(root);
        if(col===0){const material=new T.MeshStandardMaterial({color:0x365314,roughness:.72,emissive:0x365314,emissiveIntensity:.08});for(let i=0;i<6;i++){const segment=new T.Mesh(new T.SphereGeometry(size*(.15-i*.01),7,5),material);segment.position.set(Math.sin(i*.9)*size*.13,0,(i-2.5)*size*.28);root.add(segment);}}
        else{const model=api.build({id:'snake',color:0x365314},size);model.slither.phase=row.phase;model.slither.amplitude=r===0?.14:.22;api.surface(model.slither,0,root.position.y,0,0,size*.15,row.height);root.add(model.root);}
        const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});api.write(geometry,0,0,0,0,api.profile({},size,0,'snake',0),row.height);api.finish(geometry,1);const shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;scene.add(shadow);
        scenes.push(scene);renderer.setViewport(col*540,(2-r)*260,540,260);renderer.setScissor(col*540,(2-r)*260,540,260);renderer.render(scene,camera);
        root.updateMatrixWorld(true);let clearance=Infinity;const point=new T.Vector3();root.traverse((o:any)=>{if(!o.geometry)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);clearance=Math.min(clearance,point.y-row.height(point.x,point.z));}});
        evidence.push({label:row.label,updated:col===1,minimumClearance:clearance,calls:renderer.info.render.calls,phase:row.phase});
        const label=document.createElement('div');label.textContent=(col?'UPDATED':'PREVIOUS')+' · '+row.label;label.style.cssText=`position:absolute;left:${col*540+18}px;top:${r*260+225}px;width:504px;padding:7px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.05em`;panel.appendChild(label);
      }});
      w.closeSnakeStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {evidence,textures:renderer.info.memory.textures};
    });
    expect(study.textures).toBe(0);for(const sample of study.evidence){expect(sample.calls).toBe(sample.updated?4:8);if(sample.updated)expect(sample.minimumClearance).toBeGreaterThan(.01);}
    await page.locator('#snake-study').screenshot({path:resolve(output,'snake-before-after.png'),timeout:90000});await testInfo.attach('snake-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeSnakeStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'day-desktop',species:'redTail',width:880,quality:'high',phase:.44},{label:'night-mobile',species:'kestrel',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} snake motion and identity through pause, reduced motion and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.species,model.quality);}catch(error){await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;}
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.snakeRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,phase)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});for(let i=0;i<8;i++)w.stepSnake(25);
      const scene=w.snakeScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-snake-body'));
      if(!chosen)throw Error('Seeded session has no snake');
      const visual=chosen.children.find((o:any)=>o.name.startsWith('prey-'));w.snakeChosen=chosen;w.snakeRoots=roots;w.snakeVisual=visual;w.snakeDisposed=[];
      visual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.snakeDisposed.push(o.geometry.uuid));});w.snakeIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      const g=chosen.getObjectByName('prey-snake-body').geometry;w.snakeBuffer=g.attributes.position;w.snakeNormal=g.attributes.normal;
      w.flightCamera=w.snakeCamera.clone();const box=new T.Box3().setFromObject(visual),v=box.getSize(new T.Vector3()),radius=Math.max(v.x,v.y,v.z)*.5,angle=Math.tan(w.snakeCamera.fov*Math.PI/360),distance=Math.max(11,radius/Math.min(angle,angle*w.snakeCamera.aspect)*1.45);
      const h=visual.rotation.y,offset=new T.Vector3(Math.cos(h)*.6+Math.sin(h)*.7,.80,-Math.sin(h)*.6+Math.cos(h)*.7).normalize().multiplyScalar(distance),p=chosen.position;
      w.snakeCamera.position.copy(p).add(offset);w.snakeCamera.lookAt(p.x,p.y-radius*.05,p.z);c._rhCommand('scenic',true);w.snakeRenderer.render(scene,w.snakeCamera);
      return {poses:c._rhSnapshot().snakeSlitherPoses,identity:w.snakeIdentity(),calls:w.snakeRenderer.info.render.calls,textures:w.snakeRenderer.info.memory.textures};
    },model.phase);
    expect(review.identity).toHaveLength(2);expect(review.poses.length).toBeGreaterThan(0);expect(review.poses.some((s:any)=>s.phase>0)).toBe(true);for(const p of review.poses)expect(p.visualY).toBe(0);
    await stage.screenshot({path:resolve(output,model.label+'-snake.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipSnakeRender=true;c._rhCommand('pause');const before=c._rhSnapshot().snakeSlitherPoses,positions=Array.from(w.snakeBuffer.array);w.stepSnake(60000);return {before,after:c._rhSnapshot().snakeSlitherPoses,sameVertices:JSON.stringify(positions)===JSON.stringify(Array.from(w.snakeBuffer.array))};});expect(paused.after).toEqual(paused.before);expect(paused.sameVertices).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().snakeSlitherPoses;c._rhCommand('pause');for(let i=0;i<20;i++)w.stepSnake(25);const g=w.snakeChosen.getObjectByName('prey-snake-body').geometry;return {before,after:c._rhSnapshot().snakeSlitherPoses,samePosition:g.attributes.position===w.snakeBuffer,sameNormal:g.attributes.normal===w.snakeNormal};});
    expect(quiet.after).toEqual(quiet.before);expect(quiet.samePosition&&quiet.sameNormal).toBe(true);
    if(model.width!==320){
      await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
      const resumed=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().snakeSlitherPoses;w.stepSnake(25);return {before,after:c._rhSnapshot().snakeSlitherPoses};});
      expect(resumed.after.some((p:any,i:number)=>Math.abs(p.phase-resumed.before[i].phase)>.001)).toBe(true);
      for(let i=0;i<resumed.after.length;i++){const d=resumed.after[i].phase-resumed.before[i].phase;expect(Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))).toBeLessThan(.31);}
    }
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.snakeIdentity();w.snakeCamera.copy(w.flightCamera);c._rhCommand('scenic',false);const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.snakeRoots.forEach((o:any,i:number)=>o.position.set(o===w.snakeChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.snakeChosen?p.y+Math.sin(pitch)*3:2000,o===w.snakeChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));
      c._rhCommand('strike');w.stepSnake(25);const after=c._rhSnapshot(),head=w.snakeChosen.getObjectByName('prey-snake-head');return {catchDelta:after.missionCatches-before.missionCatches,carried:after.carriedPreyMs,sameIdentity:JSON.stringify(identity)===JSON.stringify(w.snakeIdentity()),headPitch:head.rotation.x,headRoll:head.rotation.z,offset:w.snakeVisual.position.y,label:after.carriedPreyLabel};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.label).toBe('Snake');expect(caught.sameIdentity).toBe(true);expect(caught.headPitch).toBeCloseTo(0,10);expect(caught.headRoll).toBeCloseTo(0,10);expect(caught.offset).toBe(0);
    await canvas.evaluate(()=>{const w=window as any;w.skipSnakeRender=false;w.snakeRenderer.render(w.snakeScene,w.snakeCamera);});await stage.screenshot({path:resolve(output,model.label+'-snake-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipSnakeRender=true;for(let i=0;i<28;i++)w.stepSnake(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.snakeDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(2);expect(new Set(expired.disposed).size).toBe(2);
    await testInfo.attach('snake-lifecycle',{body:JSON.stringify({snakes:review.poses.length,meshCount:review.identity.length,catchDelta:caught.catchDelta,sameIdentity:caught.sameIdentity,neutralCarry:true,disposed:expired.disposed.length,paused:true,reducedMotion:true,catchWithReducedMotion:model.width===320,smoothResume:model.width!==320,reusedBuffers:quiet.samePosition&&quiet.sameNormal}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
