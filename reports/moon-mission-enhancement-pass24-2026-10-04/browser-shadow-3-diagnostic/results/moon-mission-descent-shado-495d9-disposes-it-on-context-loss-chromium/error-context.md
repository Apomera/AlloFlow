# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-shadow.spec.ts >> reduced-motion WebGL casts one actual-hardware shadow and disposes it on context loss
- Location: tests\e2e\moon-mission-descent-shadow.spec.ts:109:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 30
Received:   0
```

# Test source

```ts
  49  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time',result.recording.samples[row].t.toFixed(3));
  50  |   return result.recording.samples[row];
  51  | }
  52  | async function sidePose(page:Page,row?:any){
  53  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-side-pivot-y',/^-?\d/);
  54  |   const value=await page.locator('[data-descent-canvas]').evaluate((c:any)=>({pivot:Number(c.dataset.descentSidePivotY),
  55  |     surface:Number(c.dataset.descentSideSurfaceY),clearance:Number(c.dataset.descentSideClearance)}));
  56  |   const tilt=row?row.tilt:(await flight(page)).tilt;
  57  |   const pose=await page.evaluate(({surface,clearance,tilt})=>(window as any).MoonMissionPure.descentSidePose(surface,clearance,tilt),{...value,tilt});
  58  |   expect(value.pivot).toBeCloseTo(pose.pivotY,9);
  59  |   const gaps=pose.pads.map(p=>value.surface-p.y-p.radius);
  60  |   expect(Math.min(...gaps)).toBeCloseTo(value.clearance,8);expect(gaps.every(g=>g>=value.clearance-1e-8)).toBe(true);
  61  |   return {value,pose,gaps};
  62  | }
  63  | async function capture(page:Page,info:TestInfo,name:string){
  64  |   await mkdir(REPORT,{recursive:true});const path=join(REPORT,name+'.png');
  65  |   const clip=await page.locator('[data-descent-canvas]').evaluate((c:HTMLElement)=>{
  66  |     const b=c.parentElement!.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
  67  |   });await page.screenshot({path,fullPage:true,clip,animations:'disabled'});await info.attach(name,{path,contentType:'image/png'});
  68  | }
  69  | async function notes(page:Page,name:string){
  70  |   const note=page.locator('[data-descent-shadow-note]');await note.locator('..').locator('summary').click();await expect(note).toBeVisible();
  71  |   await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});
  72  |   const violations=await note.evaluate(async n=>(await (window as any).axe.run(n.parentElement,
  73  |     {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations);
  74  |   await mkdir(REPORT,{recursive:true});await writeFile(join(REPORT,name+'-axe.json'),JSON.stringify({violations},null,2));expect(violations).toEqual([]);
  75  | }
  76  | 
  77  | test.describe('side-view landing support',()=>{
  78  |   test.beforeEach(async({page})=>page.addInitScript(()=>{
  79  |     const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){
  80  |       if(/webgl/i.test(type))return null;return (original as any).apply(this,[type,...args]);
  81  |     };
  82  |   }));
  83  |   test('recorded left and right banks preserve visible pad clearance through contact',async({page},info)=>{
  84  |     await mount(page);const evidence=[];
  85  |     for(const right of [false,true]){
  86  |       const result=await physicalRecording(page,right);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
  87  |       const held=await flight(page),saved=await receipts(page),row=await inspectNearSurface(page,result);
  88  |       evidence.push(await sidePose(page,row));await capture(page,info,right?'right-bank-approach':'left-bank-approach');
  89  |       await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();
  90  |       await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time','');
  91  |       const contact=await sidePose(page);expect(contact.value.clearance).toBe(0);evidence.push(contact);
  92  |       await capture(page,info,right?'right-bank-contact':'left-bank-contact');expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  93  |     }
  94  |     await notes(page,'desktop');await writeFile(join(REPORT,'side-support-evidence.json'),JSON.stringify(evidence,null,2));
  95  |   });
  96  |   test('320 px fallback keeps tilted pads clear and explains high-contrast shadow limits',async({page},info)=>{
  97  |     await page.setViewportSize({width:320,height:850});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);
  98  |     const result=await physicalRecording(page,true);await mount(page,seed({landingResult:result,landingAttempts:[result]}));
  99  |     const saved=await receipts(page),held=await flight(page);await sidePose(page);await capture(page,info,'phone-tilted-contact');
  100 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  101 |     await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await notes(page,'phone-forced');
  102 |     const note=page.locator('[data-descent-shadow-note]');const clip=await note.locator('..').evaluate((n:HTMLElement)=>{
  103 |       const b=n.getBoundingClientRect();return {x:b.left+scrollX,y:b.top+scrollY,width:b.width,height:b.height};
  104 |     });await page.screenshot({path:join(REPORT,'phone-shadow-notes-forced.png'),fullPage:true,clip});
  105 |     await page.waitForTimeout(250);expect(await receipts(page)).toEqual(saved);expect(await flight(page)).toEqual(held);
  106 |   });
  107 | });
  108 | 
  109 | test('reduced-motion WebGL casts one actual-hardware shadow and disposes it on context loss',async({page},info)=>{
  110 |   const errors:string[]=[],shaderErrors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  111 |   page.on('console',m=>{if(m.type()==='error'&&/shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text()))shaderErrors.push(m.text());});
  112 |   await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4}));
  113 |   await page.emulateMedia({reducedMotion:'reduce'});await mount(page,seed(),true);
  114 |   const result=await physicalRecording(page,false);await mount(page,seed({landingResult:result,landingAttempts:[result]}),true);
  115 |   const row=await inspectNearSurface(page,result),held=await flight(page),saved=await receipts(page);
  116 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-shadow-mode','projected-plane');
  117 |   await page.locator('select[data-descent-camera]').selectOption('landing');
  118 |   const measured=await page.evaluate(()=>{
  119 |     const w=(window as any).__shadowGL,T=(window as any).THREE,P=(window as any).MoonMissionPure,shadow=w.shadow;
  120 |     w.scene.updateMatrixWorld(true);const p=shadow.geometry.attributes.position,n=shadow.material.uniforms.groundPlane.value;
  121 |     const plane={x:n.x,y:n.y,z:n.z,constant:n.w};let maximumResidual=0,inspected=0;
  122 |     for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/80))){
  123 |       const point=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(shadow.matrixWorld);
  124 |       const q=P.projectDescentShadow(point,plane);if(!q)continue;
  125 |       maximumResidual=Math.max(maximumResidual,Math.abs(plane.x*q.x+plane.y*q.y+plane.z*q.z+plane.constant));inspected++;
  126 |     }
  127 |     (window as any).__shadowDisposed={geometry:0,material:0};
  128 |     shadow.geometry.addEventListener('dispose',()=>{(window as any).__shadowDisposed.geometry++;});
  129 |     shadow.material.addEventListener('dispose',()=>{(window as any).__shadowDisposed.material++;});
  130 |     let shadowMeshes=0;w.scene.traverse((n:any)=>{if(n.name==='moon-descent-projected-shadow')shadowMeshes++;});
  131 |     return {vertices:p.count,shadowMeshes,visible:shadow.visible,
  132 |       maximumResidual,inspected,plane,sun:shadow.material.uniforms.sunDirection.value.toArray(),shadowMap:w.renderer.shadowMap.enabled,
  133 |       lander:w.lander.position.toArray(),camera:w.camera.position.toArray(),target:!!w.renderer.getRenderTarget()};
  134 |   });
  135 |   expect(measured.vertices).toBeGreaterThan(3000);expect(measured.shadowMeshes).toBe(1);expect(measured.inspected).toBeGreaterThan(20);
  136 |   expect(measured.maximumResidual).toBeLessThan(1e-8);expect(measured.shadowMap).toBe(false);
  137 |   const pixels=await page.evaluate(()=>{
  138 |     const {renderer,scene,camera,shadow}=(window as any).__shadowGL,gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
  139 |     function read(){const a=new Uint8Array(width*height*4);renderer.render(scene,camera);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;}
  140 |     const before=read();shadow.visible=false;const after=read();shadow.visible=true;
  141 |     shadow.material.depthTest=false;const unoccluded=read();shadow.material.depthTest=true;renderer.render(scene,camera);
  142 |     let changed=0,delta=0;for(let i=0;i<before.length;i+=4){const d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);if(d){changed++;delta+=d;}}
  143 |     let depthDisabledChanged=0,nonzero=0;for(let i=0;i<before.length;i+=4){if(before[i]+before[i+1]+before[i+2])nonzero++;
  144 |       if(unoccluded[i]!==after[i]||unoccluded[i+1]!==after[i+1]||unoccluded[i+2]!==after[i+2])depthDisabledChanged++;}
  145 |     return {width,height,changed,delta,depthDisabledChanged,nonzero,glError:gl.getError()};
  146 |   });
  147 |   await capture(page,info,'reduced-motion-landing-shadow');
  148 |   await writeFile(join(REPORT,'projection-diagnostic.json'),JSON.stringify({measured,pixels,shaderErrors},null,2));
> 149 |   expect(pixels.changed).toBeGreaterThan(30);expect(pixels.delta).toBeGreaterThan(100);
      |                          ^ Error: expect(received).toBeGreaterThan(expected)
  150 |   await page.getByRole('button',{name:'Return to touchdown',exact:true}).click();await capture(page,info,'reduced-motion-contact-shadow');
  151 |   expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  152 |   await page.evaluate(()=>(window as any).__shadowGL.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  153 |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d','lost');await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  154 |   await expect.poll(()=>page.evaluate(()=>(window as any).__shadowDisposed)).toEqual({geometry:1,material:1});
  155 |   await sidePose(page);await capture(page,info,'shadow-context-loss-support');expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);
  156 |   expect(errors).toEqual([]);expect(shaderErrors).toEqual([]);
  157 |   await writeFile(join(REPORT,'projected-shadow-evidence.json'),JSON.stringify({row,measured,pixels,errors,shaderErrors,held,disposed:{geometry:1,material:1}},null,2));
  158 | });
  159 | 
  160 | test('full-detail WebGL retains terrain shadow maps and a held physical flight',async({page},info)=>{
  161 |   await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:8}));
  162 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page,seed(),true);
  163 |   const held=await flight(page),saved=await receipts(page);
  164 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-shadow-mode','shadow-map');
  165 |   const detail=await page.evaluate(()=>{
  166 |     const w=(window as any).__shadowGL;let casters=0;w.lander.traverse((n:any)=>{if(n.isMesh&&n.castShadow)casters++;});
  167 |     return {shadowMap:w.renderer.shadowMap.enabled,projected:!!w.shadow,casters};
  168 |   });expect(detail.shadowMap).toBe(true);expect(detail.projected).toBe(false);expect(detail.casters).toBeGreaterThan(20);
  169 |   await page.locator('select[data-descent-camera]').selectOption('overhead');await page.setViewportSize({width:1000,height:900});
  170 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera','overhead');
  171 |   await page.waitForTimeout(250);expect(await flight(page)).toEqual(held);expect(await receipts(page)).toEqual(saved);expect(errors).toEqual([]);
  172 |   await capture(page,info,'full-detail-shadow-map');await writeFile(join(REPORT,'full-detail-evidence.json'),JSON.stringify({detail,errors,held},null,2));
  173 | });
  174 | 
```