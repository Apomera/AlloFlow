import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const report = process.env.FIRST_RESPONSE_REALISM_REPORT || 'reports/firstresponse-manikin-realism';
const axe = readFileSync('node_modules/axe-core/axe.min.js','utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width:1160, height:1080, layout:'document', appStyles:true,
  probes:`var BaseCamera=THREE.PerspectiveCamera;
    THREE.PerspectiveCamera=class extends BaseCamera { constructor(...args){super(...args);window.__realismCamera=this;} };
    window.__realismPose=function(){
      var canvas=document.querySelector('#wrap canvas'), rec=canvas&&window.__glRecorder.forCanvas(canvas);
      if(!rec||!rec.scene)return null;
      var scene=rec.scene, camera=window.__realismCamera, hands=scene.getObjectByName('fr-depth-hands'), projected=[];
      scene.updateMatrixWorld(true);
      function project(p){return p.project(camera).toArray();}
      var headBox=new THREE.Box3().setFromObject(scene.getObjectByName('fr-manikin-head')), headBounds=[];
      var headPivot=scene.getObjectByName('fr-manikin-head-pivot');
      var front=new THREE.Vector3(0,1,0).transformDirection(headPivot.matrixWorld);
      var towardsCamera=camera.position.clone().sub(headPivot.getWorldPosition(new THREE.Vector3())).normalize();
      var left=scene.getObjectByName('fr-patient-left-hand'), right=scene.getObjectByName('fr-patient-right-hand');
      var rightPalm=scene.getObjectByName('fr-patient-right-palm').getWorldPosition(new THREE.Vector3());
      var outward=rightPalm.clone().sub(headPivot.getWorldPosition(new THREE.Vector3())).normalize();
      var farNormal=new THREE.Vector3(0,1,0).transformDirection(right.matrixWorld);
      var back=rightPalm.clone().addScaledVector(farNormal,-scene.getObjectByName('fr-patient-right-palm').getWorldScale(new THREE.Vector3()).y);
      var cheekHits=new THREE.Raycaster(back,farNormal.clone().negate()).intersectObject(scene.getObjectByName('fr-manikin-head'),false);
      var patientPoints=[left,right].map(h=>project(h.getWorldPosition(new THREE.Vector3())));
      for(var x of [headBox.min.x,headBox.max.x]) for(var y of [headBox.min.y,headBox.max.y]) for(var z of [headBox.min.z,headBox.max.z])
        headBounds.push(project(new THREE.Vector3(x,y,z)));
      hands.children.filter(h=>h.visible).forEach(function(h){
        var heel=h.getObjectByName(h.name+'-heel'), sleeve=h.getObjectByName(h.name+'-sleeve');
        projected.push(project(heel.getWorldPosition(new THREE.Vector3())));
        projected.push(project(new THREE.Vector3(0,sleeve.geometry.parameters.height/2,0).applyMatrix4(sleeve.matrixWorld)));
      });
      var bodyBox=new THREE.Box3().setFromObject(scene.getObjectByName('fr-training-manikin')),bodyBounds=[];
      for(var x of [bodyBox.min.x,bodyBox.max.x])for(var y of [bodyBox.min.y,bodyBox.max.y])for(var z of [bodyBox.min.z,bodyBox.max.z])bodyBounds.push(project(new THREE.Vector3(x,y,z)));
      function end(mesh,sign){return new THREE.Vector3(0,sign*mesh.geometry.parameters.height/2,0).applyMatrix4(mesh.matrixWorld);}
      var nearUpper=scene.getObjectByName('fr-patient-left-upper-arm'),nearFore=scene.getObjectByName('fr-patient-left-forearm');
      var shoulder=end(nearUpper,-1),elbow=end(nearUpper,1),wrist=end(nearFore,1);
      var nearAngle=shoulder.clone().sub(elbow).angleTo(wrist.clone().sub(elbow))*180/Math.PI;
      return {modelScale:scene.getObjectByName('fr-training-manikin').getWorldScale(new THREE.Vector3()).x,bodyBounds,nearAngle,nearPoints:[shoulder,elbow,wrist].map(project),nearLengths:[nearUpper.geometry.parameters.height,nearFore.geometry.parameters.height], arms:projected, patientPoints,
        nearPalmUp:new THREE.Vector3(0,1,0).transformDirection(left.matrixWorld).y,
        farPalmOut:new THREE.Vector3(0,1,0).transformDirection(right.matrixWorld).dot(outward),
        farCheekGap:cheekHits.length?cheekHits[0].distance:null,
        headBounds, faceFacing:front.dot(towardsCamera), head:['fr-manikin-eye-left','fr-manikin-eye-right','fr-manikin-mouth'].map(function(n){
        var box=new THREE.Box3().setFromObject(scene.getObjectByName(n));return project(box.getCenter(new THREE.Vector3()));
      }), marker:scene.getObjectByName('fr-depth-marker').position.y,
        hands:hands.visible, count:hands.children.filter(h=>h.visible).length,
        mouth:scene.getObjectByName('fr-manikin-mouth').getWorldPosition(new THREE.Vector3()).toArray(),
        contrast:!scene.getObjectByName('fr-model-fill'), context:!!scene.getObjectByName('fr-manikin-torso') };
    };
    window.__armGuideProjection=function(){
      var canvas=document.querySelector('#wrap canvas'),rec=canvas&&window.__glRecorder.forCanvas(canvas);
      if(!rec||!rec.scene)return null;rec.scene.updateMatrixWorld(true);
      var scene=rec.scene,guide=scene.getObjectByName('fr-recovery-arm-guides'),camera=window.__realismCamera;
      if(!guide)return {present:false};
      var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],p=new THREE.Vector3(),vertices=0;
      guide.traverseVisible(function(mesh){if(!mesh.geometry)return;var positions=mesh.geometry.attributes.position;
        for(var i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}vertices++;}
      });
      var stem=scene.getObjectByName('fr-recovery-palm-arrow-stem');
      var arrowStart=new THREE.Vector3(0,-.10,0).applyMatrix4(stem.matrixWorld).project(camera),arrowEnd=new THREE.Vector3(0,.10,0).applyMatrix4(stem.matrixWorld).project(camera);
      var arrowPixels=Math.hypot((arrowEnd.x-arrowStart.x)*canvas.clientWidth/2,(arrowEnd.y-arrowStart.y)*canvas.clientHeight/2);
      return {present:true,points:[min,max],vertices,arrowPixels,direction:new THREE.Vector3(0,1,0).transformDirection(stem.matrixWorld).toArray(),
        roll:scene.getObjectByName('fr-training-manikin').rotation.z,white:guide.children.every(m=>m.material.color.getHex()===0xffffff)};
    };
    window.__faceDetails=function(){
      var canvas=document.querySelector('#wrap canvas'),rec=canvas&&window.__glRecorder.forCanvas(canvas);
      if(!rec||!rec.scene)return null;rec.scene.updateMatrixWorld(true);
      var names=['fr-manikin-nose','fr-manikin-eye-left','fr-manikin-eye-right','fr-manikin-upper-lid-left','fr-manikin-upper-lid-right','fr-manikin-brow-left','fr-manikin-brow-right','fr-manikin-ear-left-helix','fr-manikin-ear-right-helix'];
      var points=[],flat=true,vertices=0;
      names.forEach(function(name){var mesh=rec.scene.getObjectByName(name);flat=flat&&mesh.material.type==='MeshBasicMaterial';var p=mesh.geometry.attributes.position;
        for(var i=0;i<p.count;i++){var v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(window.__realismCamera);points.push([v.x,v.y,v.z]);vertices++;}
      });
      return {points,vertices,flat};
    };
    window.__wholeBodyProjection=function(){
      var canvas=document.querySelector('#wrap canvas'),rec=canvas&&window.__glRecorder.forCanvas(canvas);
      if(!rec||!rec.scene)return null;
      rec.scene.updateMatrixWorld(true);
      var body=rec.scene.getObjectByName('fr-training-manikin'),camera=window.__realismCamera;
      var minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity],point=new THREE.Vector3(),vertices=0;
      body.traverseVisible(function(mesh){
        if(!mesh.geometry||!mesh.geometry.attributes.position)return;
        var positions=mesh.geometry.attributes.position;
        for(var i=0;i<positions.count;i++) {
          point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);
          var values=[point.x,point.y,point.z];for(var axis=0;axis<3;axis++){minimum[axis]=Math.min(minimum[axis],values[axis]);maximum[axis]=Math.max(maximum[axis],values[axis]);}
          vertices++;
        }
      });
      return {points:[minimum,maximum],vertices};
    };`
});
test.describe.configure({mode:'serial',retries:0,timeout:150000});
test.beforeAll(async()=>{mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
async function mount(page:Page,width=1280,extra={}) {
  await page.setViewportSize({width,height:width<760?840:1080});
  await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'depth',...extra}});
  await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});
}
const pose=(page:Page)=>page.evaluate(()=>(window as any).__realismPose());
const wholePose=(page:Page)=>page.evaluate(()=>(window as any).__wholeBodyProjection());
const guidePose=(page:Page)=>page.evaluate(()=>(window as any).__armGuideProjection());
const visible=(points:number[][])=>points.every(p=>Math.abs(p[0])<.94&&Math.abs(p[1])<.94&&p[2]>-1&&p[2]<1);
const span=(points:number[][],axis:number)=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
async function audit(page:Page) {
  await page.addScriptTag({content:axe});
  const violations=await page.evaluate(async()=>(await (window as any).axe.run('.fr-body3d',{
    runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},
    rules:matchMedia('(forced-colors:active)').matches?{'color-contrast':{enabled:false}}:{},
  })).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));
  expect(violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
}
test('full arm inspection frames the heels and sleeves for every age and keeps mechanics live',async({page})=>{
  await mount(page);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/whole-manikin.png'});
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('button',{name:label}).click();
    if(age==='child') await page.getByRole('radio',{name:'Two stacked hands',exact:true}).check();
    await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
    await expect.poll(async()=>visible((await pose(page)).arms)).toBe(true);
    await expect.poll(async()=>span((await pose(page)).arms,1)).toBeGreaterThan(.55);
    const resting=(await pose(page)).marker;
    await page.getByRole('button',{name:'Show compression',exact:true}).click();
    await expect.poll(async()=>(await pose(page)).marker).toBeLessThan(resting);
    const peak=(await pose(page)).marker;
    await page.getByRole('button',{name:'Show release',exact:true}).click();
    await expect.poll(async()=>(await pose(page)).marker).toBeGreaterThan(peak);
    await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-arms.png'});
  }
  await page.getByRole('checkbox',{name:'Show rescuer hands and arms',exact:true}).uncheck();
  await expect(page.getByRole('button',{name:'Hands + arms',exact:true})).toBeDisabled();
  await audit(page);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('head close-up reveals age-specific facial features and follows recovery orientation',async({page})=>{
  await mount(page,1280,{b3dTab:'coach'});
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('button',{name:label}).click();
    await page.getByRole('button',{name:'Head close-up',exact:true}).click();
    await expect.poll(async()=>visible((await pose(page)).head)).toBe(true);
    await expect.poll(async()=>span((await pose(page)).headBounds,1)).toBeGreaterThan(.5);
    await expect.poll(async()=>(await pose(page)).faceFacing).toBeGreaterThan(.45);
    await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-face.png'});
  }
  await page.getByRole('button',{name:/^Adult —/}).click();
  await page.getByRole('tab',{name:/Recovery position/}).click();
  const before=(await pose(page)).mouth;
  const steps=page.locator('.fr-body3d-content ol button');
  const count=await steps.count();
  expect(count).toBeGreaterThan(0);
  for(let i=0;i<count;i++) {
    await expect(steps.nth(i)).toBeEnabled();
    await steps.nth(i).click();
    if(i===1) {
      await expect.poll(async()=>(await pose(page)).nearPalmUp).toBeGreaterThan(.9);
      await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
      await expect.poll(async()=>visible((await pose(page)).patientPoints)).toBe(true);
      await page.locator('.fr-body3d-stage').screenshot({path:report+'/recovery-palm-up.png'});
    }
  }
  await expect(page.getByText('Positioned — now keep watching',{exact:true})).toBeVisible();
  await expect.poll(async()=>JSON.stringify((await pose(page)).mouth)).not.toBe(JSON.stringify(before));
  await expect.poll(async()=>(await pose(page)).nearPalmUp).toBeGreaterThan(.9);
  await expect.poll(async()=>(await pose(page)).farPalmOut).toBeGreaterThan(.5);
  await expect.poll(async()=>(await pose(page)).farCheekGap).not.toBeNull();
  await expect.poll(async()=>(await pose(page)).farCheekGap).toBeLessThan(.02);
  await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
  await expect.poll(async()=>visible((await pose(page)).patientPoints)).toBe(true);
  await expect.poll(async()=>{
    const points=(await pose(page)).patientPoints;
    return Math.max(span(points,0),span(points,1));
  }).toBeGreaterThan(.55);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/recovery-arms.png'});
  await page.getByRole('button',{name:'Head close-up',exact:true}).click();
  await expect.poll(async()=>visible((await pose(page)).head)).toBe(true);
  await expect.poll(async()=>span((await pose(page)).headBounds,1)).toBeGreaterThan(.5);
  await expect.poll(async()=>(await pose(page)).faceFacing).toBeGreaterThan(.45);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/recovery-head.png'});
  await page.getByRole('button',{name:'Whole manikin',exact:true}).click();
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/recovery-body.png'});
  await audit(page);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('phone arm view preserves keyboard access, placement gating, and contrast surfaces',async({page})=>{
  await mount(page,320,{b3dAge:'child',b3dChildHands:'two'});
  await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
  await expect.poll(async()=>visible((await pose(page)).arms)).toBe(true);
  await expect.poll(async()=>span((await pose(page)).arms,1)).toBeGreaterThan(.55);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/phone-arms.png'});
  await page.locator('.fr-body3d-stage').focus();await page.keyboard.press('ArrowRight');
  await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
  await audit(page);
  await page.emulateMedia({forcedColors:'active'});await audit(page);
  await page.emulateMedia({forcedColors:'none'});
  await page.getByRole('tab',{name:/Hand placement/}).click();
  await expect(page.getByRole('button',{name:'Hands + arms',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Centre of the chest',exact:true}).click();
  await expect(page.getByRole('button',{name:'Hands + arms',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
  await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});
  await expect.poll(async()=>(await pose(page))?.contrast).toBe(true);
  await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/contrast-arms.png'});await audit(page);
});


test('recovery near elbow bends with palm up and whole-body framing stays useful at every age',async({page})=>{
  test.setTimeout(240000);
  await mount(page);
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('tab',{name:/Depth/}).click();await page.getByRole('button',{name:label}).click();
    await page.getByRole('tab',{name:/Recovery position/}).click();
    const reset=page.getByRole('button',{name:/Start again/});if(await reset.count())await reset.click();
    await expect.poll(async()=>(await pose(page))?.modelScale).toBeCloseTo(age === 'infant' ? .46 : age === 'child' ? .72 : 1,6);
    const lengths=(await pose(page)).nearLengths;const steps=page.locator('.fr-body3d-content ol button');
    for(let i=0;i<8;i++) {
      await steps.nth(i).click();
      if(i===1||i===4||i===7) {
        await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
        await expect.poll(async()=>visible((await pose(page)).nearPoints)).toBe(true);
        const p=await pose(page);expect((await wholePose(page)).vertices).toBeGreaterThan(1000);expect(p.nearAngle).toBeGreaterThan(80);expect(p.nearAngle).toBeLessThan(105);expect(p.nearPalmUp).toBeGreaterThan(.98);
        for(let j=0;j<2;j++)expect(p.nearLengths[j]).toBeCloseTo(lengths[j],9);
        await expect(page.locator('.fr-recovery-arm-cue')).toContainText('elbow bent, palm facing up');
        await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-near-arm-'+(i+1)+'.png'});
        await page.getByRole('button',{name:'Whole manikin',exact:true}).click();
        await expect.poll(async()=>(await pose(page))?.modelScale).toBeCloseTo(age === 'infant' ? .46 : age === 'child' ? .72 : 1,6);
        await expect.poll(async()=>visible((await wholePose(page)).points)).toBe(true);
        await expect.poll(async()=>Math.max(span((await wholePose(page)).points,0),span((await wholePose(page)).points,1))).toBeGreaterThan(1.0);
        await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-whole-'+(i+1)+'.png'});
      }
    }
    const select=page.getByLabel('Pose to inspect',{exact:true});await select.selectOption('2');
    await page.getByRole('button',{name:'Whole manikin',exact:true}).click();
    await expect.poll(async()=>visible((await wholePose(page)).points)).toBe(true);
    await select.selectOption('8');await expect.poll(async()=>visible((await wholePose(page)).points)).toBe(true);
    expect(await page.locator('#wrap canvas').count()).toBe(1);
  }
  await audit(page);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('phone whole-body framing and near-arm cue support keyboard review, text spacing and contrast',async({page})=>{
  await mount(page,320,{b3dAge:'infant',b3dTab:'recovery'});
  const steps=page.locator('.fr-body3d-content ol button');for(let i=0;i<8;i++)await steps.nth(i).click();
  const home=page.getByRole('button',{name:'Whole manikin',exact:true});await home.focus();await page.keyboard.press('Enter');
  await expect.poll(async()=>visible((await wholePose(page)).points)).toBe(true);
  await expect.poll(async()=>Math.max(span((await wholePose(page)).points,0),span((await wholePose(page)).points,1))).toBeGreaterThan(1.0);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/phone-whole-infant.png'});
  await page.locator('.fr-body3d-stage').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('0');
  await expect.poll(async()=>visible((await wholePose(page)).points)).toBe(true);
  await page.getByLabel('Pose to inspect',{exact:true}).selectOption('2');await home.click();
  await page.locator('.fr-recovery-review').screenshot({path:report+'/phone-arm-cue.png'});
  await page.addStyleTag({content:'.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}'});
  await audit(page);
  await page.emulateMedia({forcedColors:'active'});await home.click();await audit(page);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/forced-colors-whole-infant.png'});
  await page.emulateMedia({forcedColors:'none'});await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});
  await expect.poll(async()=>(await pose(page))?.contrast).toBe(true);await home.click();await audit(page);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/contrast-whole-infant.png'});
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});


test('arm guides follow the elbow and upward palm through recovery review at every age',async({page})=>{
  test.setTimeout(240000);await mount(page);
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('tab',{name:/Depth/}).click();await page.getByRole('button',{name:label}).click();await page.getByRole('tab',{name:/Recovery position/}).click();
    const reset=page.getByRole('button',{name:/Start again/});if(await reset.count())await reset.click();
    const steps=page.locator('.fr-body3d-content ol button');await steps.nth(0).click();await steps.nth(1).click();
    const canvas=await page.locator('#wrap canvas').elementHandle(),control=page.getByRole('checkbox',{name:'Show arm positioning guides',exact:true});
    await expect(control).not.toBeChecked();await control.check();await expect.poll(async()=>(await guidePose(page))?.present).toBe(true);
    for(let i=2;i<=8;i++) {
      if(i>2)await steps.nth(i-1).click();
      if(i===2||i===5||i===8) {
        await page.getByRole('button',{name:'Hands + arms',exact:true}).click();
        await expect.poll(async()=>{const g=await guidePose(page);return !!g?.present&&visible(g.points);}).toBe(true);
        const g=await guidePose(page);expect(g.vertices).toBeGreaterThan(300);expect(g.arrowPixels).toBeGreaterThan(8);expect(g.direction[1]).toBeGreaterThan(.98);
        await expect.poll(async()=>(await guidePose(page))?.roll).toBeGreaterThan(i>=5?.9:-.01);
        await expect.poll(async()=>(await pose(page))?.modelScale).toBeCloseTo(age==='infant'?.46:age==='child'?.72:1,6);
        await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-guides-'+i+'.png'});
      }
    }
    await page.getByLabel('Pose to inspect',{exact:true}).selectOption('1');await expect.poll(async()=>(await guidePose(page))?.present).toBe(false);await expect(control).toHaveCount(0);
    await page.getByLabel('Pose to inspect',{exact:true}).selectOption('2');await expect(control).toBeChecked();await expect.poll(async()=>(await guidePose(page))?.present).toBe(true);
    await control.uncheck();await expect.poll(async()=>(await guidePose(page))?.present).toBe(false);expect(await canvas!.evaluate(el=>el===document.querySelector('#wrap canvas'))).toBe(true);
    expect(await steps.count()).toBe(8);for(let i=0;i<8;i++)await expect(steps.nth(i)).toBeDisabled();
  }
  await audit(page);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('phone arm guides support keyboard toggling, pose review, text spacing and contrast',async({page})=>{
  await mount(page,320,{b3dAge:'infant',b3dTab:'recovery'});
  const steps=page.locator('.fr-body3d-content ol button');for(let i=0;i<8;i++)await steps.nth(i).click();
  const control=page.getByRole('checkbox',{name:'Show arm positioning guides',exact:true});await control.focus();await page.keyboard.press('Space');await expect(control).toBeChecked();
  const arms=page.getByRole('button',{name:'Hands + arms',exact:true});await arms.click();
  await expect.poll(async()=>{const g=await guidePose(page);return !!g?.present&&visible(g.points);}).toBe(true);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/phone-guides-8.png'});
  await page.locator('.fr-recovery-guides').screenshot({path:report+'/phone-guide-key.png'});await audit(page);
  await page.getByLabel('Pose to inspect',{exact:true}).selectOption('2');await arms.click();
  await expect.poll(async()=>{const g=await guidePose(page);return !!g?.present&&visible(g.points);}).toBe(true);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/phone-guides-2.png'});
  await page.addStyleTag({content:'.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}'});await audit(page);
  await page.emulateMedia({forcedColors:'active'});await arms.click();await audit(page);await page.locator('.fr-recovery-guides').screenshot({path:report+'/forced-colors-guide-key.png'});
  await page.emulateMedia({forcedColors:'none'});await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});
  await arms.click();await expect.poll(async()=>(await guidePose(page))?.white).toBe(true);await audit(page);await page.locator('.fr-body3d-stage').screenshot({path:report+'/contrast-phone-guides.png'});
  await control.focus();await page.keyboard.press('Space');await arms.click();await expect.poll(async()=>(await guidePose(page))?.present).toBe(false);await expect(page.locator('.fr-recovery-guide-key')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});


test('sculpted facial details stay framed for every age before and after recovery review',async({page})=>{
  test.setTimeout(240000);await mount(page,1280,{b3dTab:'coach'});
  const canvas=await page.locator('#wrap canvas').elementHandle();
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('tab',{name:/30:2 coach/}).click();await page.getByRole('button',{name:label}).click();
    await page.getByRole('button',{name:'Head close-up',exact:true}).click();
    await expect.poll(async()=>{const f=await page.evaluate(()=>(window as any).__faceDetails());return !!f&&visible(f.points);}).toBe(true);
    await expect.poll(async()=>(await pose(page))?.faceFacing).toBeGreaterThan(.45);
    expect((await page.evaluate(()=>(window as any).__faceDetails())).vertices).toBeGreaterThan(1500);
    await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-face-detail.png'});
    await page.getByRole('tab',{name:/Recovery position/}).click();const reset=page.getByRole('button',{name:/Start again/});if(await reset.count())await reset.click();
    const steps=page.locator('.fr-body3d-content ol button');for(let i=0;i<8;i++)await steps.nth(i).click();
    await page.getByRole('button',{name:'Head close-up',exact:true}).click();
    await expect.poll(async()=>{const f=await page.evaluate(()=>(window as any).__faceDetails());return !!f&&visible(f.points);}).toBe(true);
    await expect.poll(async()=>(await pose(page))?.farCheekGap).not.toBeNull();await expect.poll(async()=>(await pose(page))?.farCheekGap).toBeLessThan(.02);
    await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-recovery-face-detail.png'});
    expect(await canvas!.evaluate(el=>el===document.querySelector('#wrap canvas'))).toBe(true);
  }
  await audit(page);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('phone facial detail supports keyboard viewing, text spacing and contrast',async({page})=>{
  await mount(page,320,{b3dTab:'coach',b3dAge:'child'});
  const camera=page.getByRole('button',{name:'Head close-up',exact:true});await camera.focus();await page.keyboard.press('Enter');
  await expect.poll(async()=>{const f=await page.evaluate(()=>(window as any).__faceDetails());return !!f&&visible(f.points);}).toBe(true);
  const canvas=await page.locator('#wrap canvas').elementHandle();await page.locator('.fr-body3d-stage').screenshot({path:report+'/phone-face-detail.png'});
  await page.locator('.fr-body3d-stage').focus();await page.keyboard.press('ArrowLeft');await camera.focus();await page.keyboard.press('Enter');
  await expect.poll(async()=>{const f=await page.evaluate(()=>(window as any).__faceDetails());return !!f&&visible(f.points);}).toBe(true);
  await page.addStyleTag({content:'.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}'});await audit(page);
  await page.emulateMedia({forcedColors:'active'});await camera.click();await audit(page);await page.locator('.fr-body3d-stage').screenshot({path:report+'/forced-colors-phone-face.png'});
  expect(await canvas!.evaluate(el=>el===document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({forcedColors:'none'});await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});await camera.click();
  await expect.poll(async()=>(await page.evaluate(()=>(window as any).__faceDetails()))?.flat).toBe(true);await audit(page);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/contrast-phone-face.png'});
  await expect.poll(async()=>canvas!.evaluate(el=>(window as any).__glRecorder.forCanvas(el)?.ctx.isContextLost())).toBe(true);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await expect.poll(async()=>page.evaluate(()=>(window as any).__glRecorder.records.filter((r:any)=>r.canvas.isConnected&&r.canvas.closest('#wrap')&&!r.ctx.isContextLost()).length)).toBe(1);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
