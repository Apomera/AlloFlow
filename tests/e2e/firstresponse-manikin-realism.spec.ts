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
      return { arms:projected, patientPoints,
        nearPalmUp:new THREE.Vector3(0,1,0).transformDirection(left.matrixWorld).y,
        farPalmOut:new THREE.Vector3(0,1,0).transformDirection(right.matrixWorld).dot(outward),
        farCheekGap:cheekHits.length?cheekHits[0].distance:null,
        headBounds, faceFacing:front.dot(towardsCamera), head:['fr-manikin-eye-left','fr-manikin-eye-right','fr-manikin-mouth'].map(function(n){
        var box=new THREE.Box3().setFromObject(scene.getObjectByName(n));return project(box.getCenter(new THREE.Vector3()));
      }), marker:scene.getObjectByName('fr-depth-marker').position.y,
        hands:hands.visible, count:hands.children.filter(h=>h.visible).length,
        mouth:scene.getObjectByName('fr-manikin-mouth').getWorldPosition(new THREE.Vector3()).toArray(),
        contrast:!scene.getObjectByName('fr-model-fill'), context:!!scene.getObjectByName('fr-manikin-torso') };
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
