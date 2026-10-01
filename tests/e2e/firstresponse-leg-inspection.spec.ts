import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_LEG_REPORT || 'reports/firstresponse-leg-inspection';
const axe = readFileSync('node_modules/axe-core/axe.min.js','utf8');
const harness = new GlHarness({ toolFile:'stem_lab/stem_tool_firstresponse.js',toolId:'firstResponse',
  preScripts:['stem_lab/stem_lab_module.js'],width:1160,height:1080,layout:'document',appStyles:true,
  probes:`var BaseCamera=THREE.PerspectiveCamera;
    THREE.PerspectiveCamera=class extends BaseCamera { constructor(...args){super(...args);window.__legCamera=this;} };
    window.__legPose=function(){
      var canvas=document.querySelector('#wrap canvas'), rec=canvas&&window.__glRecorder.forCanvas(canvas);
      if(!rec||!rec.scene)return null;
      var scene=rec.scene,camera=window.__legCamera,legs=scene.getObjectByName('fr-patient-legs');
      scene.updateMatrixWorld(true);
      function project(p){return p.clone().project(camera).toArray();}
      function end(mesh,sign){return new THREE.Vector3(0,sign*mesh.geometry.parameters.height/2,0).applyMatrix4(mesh.matrixWorld);}
      var points=[],bounds=[],box=new THREE.Box3().setFromObject(legs),rightThigh=scene.getObjectByName('fr-patient-right-thigh');
      for(var side of ['left','right']) {
        var prefix='fr-patient-'+side,thigh=scene.getObjectByName(prefix+'-thigh');
        var foot=scene.getObjectByName(prefix+'-foot'),shoe=scene.getObjectByName(prefix+'-shoe');
        points.push(project(end(thigh,-1)),project(end(thigh,1)),project(foot.getWorldPosition(new THREE.Vector3())));
        points.push(project(new THREE.Vector3(0,-.04,.335).applyMatrix4(shoe.matrixWorld)));
      }
      for(var x of [box.min.x,box.max.x])for(var y of [box.min.y,box.max.y])for(var z of [box.min.z,box.max.z])
        bounds.push(project(new THREE.Vector3(x,y,z)));
      var knee=end(rightThigh,1),hip=end(rightThigh,-1),ankle=scene.getObjectByName('fr-patient-right-foot').getWorldPosition(new THREE.Vector3());
      return {points,bounds,joints:[hip,knee,ankle].map(project),
        lengths:[rightThigh.geometry.parameters.height,scene.getObjectByName('fr-patient-right-shin').geometry.parameters.height],
        roll:scene.getObjectByName('fr-training-manikin').rotation.z,
        camera:camera.position.toArray(),contrast:!scene.getObjectByName('fr-model-fill')};
    };`
});

test.describe.configure({mode:'serial',retries:0,timeout:150000});
test.beforeAll(async()=>{mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
async function mount(page:Page,width=1280) {
  await page.setViewportSize({width,height:width<760?900:1080});
  await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'depth'}});
  await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});
}
const pose=(page:Page)=>page.evaluate(()=>(window as any).__legPose());
const visible=(points:number[][])=>points.every(p=>Math.abs(p[0])<.94&&Math.abs(p[1])<.94&&p[2]>-1&&p[2]<1);
const span=(points:number[][],axis:number)=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]));
function angle(joints:number[][]) {
  const [hip,knee,ankle]=joints;
  const a=[hip[0]-knee[0],hip[1]-knee[1]],b=[ankle[0]-knee[0],ankle[1]-knee[1]];
  return Math.acos(Math.max(-1,Math.min(1,(a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))))*180/Math.PI;
}
async function inspect(page:Page,name:string) {
  await page.getByRole('button',{name:'Legs + feet',exact:true}).click();
  await expect.poll(async()=>visible((await pose(page)).points)).toBe(true);
  await expect.poll(async()=>Math.max(span((await pose(page)).bounds,0),span((await pose(page)).bounds,1))).toBeGreaterThan(.65);
  await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+name+'.png'});
}
async function audit(page:Page) {
  await page.addScriptTag({content:axe});
  const violations=await page.evaluate(async()=>(await (window as any).axe.run('.fr-body3d',{
    runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},
    rules:matchMedia('(forced-colors:active)').matches?{'color-contrast':{enabled:false}}:{},
  })).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));
  expect(violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
}

test('leg camera reveals the raised knee and final support without stretching any age',async({page})=>{
  await mount(page);
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('tab',{name:/Depth/}).click();
    await page.getByRole('button',{name:label}).click();
    await page.getByRole('tab',{name:/Recovery position/}).click();
    const reset=page.getByRole('button',{name:/Start again/});
    if(await reset.count())await reset.click();
    await inspect(page,age+'-resting-legs');
    const lengths=(await pose(page)).lengths;
    const steps=page.locator('.fr-body3d-content ol button');
    for(let i=0;i<8;i++) {
      await expect(steps.nth(i)).toBeEnabled();await steps.nth(i).click();
      if(i===3||i===6) {
        await inspect(page,age+(i===3?'-raised-knee':'-support-leg'));
        const current=await pose(page);
        for(let j=0;j<2;j++)expect(current.lengths[j]).toBeCloseTo(lengths[j],10);
        expect(angle(current.joints)).toBeGreaterThan(35);
        expect(angle(current.joints)).toBeLessThan(145);
      }
    }
    await page.getByRole('button',{name:'Whole manikin',exact:true}).click();
    await expect.poll(async()=>visible((await pose(page)).points)).toBe(true);
    await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-whole-recovery.png'});
  }
  await audit(page);
});

test('leg inspection supports phone keyboard controls, text spacing and contrast',async({page})=>{
  await mount(page,320);
  await page.getByRole('button',{name:/^Child —/}).click();
  await page.getByRole('tab',{name:/Recovery position/}).click();
  const steps=page.locator('.fr-body3d-content ol button');
  for(let i=0;i<7;i++)await steps.nth(i).click();
  const camera=page.getByRole('button',{name:'Legs + feet',exact:true});
  await camera.focus();await page.keyboard.press('Enter');
  await expect.poll(async()=>visible((await pose(page)).points)).toBe(true);
  const before=(await pose(page)).camera;
  await page.getByRole('button',{name:'Rotate view left',exact:true}).focus();await page.keyboard.press('Enter');
  await expect.poll(async()=>(await pose(page)).camera).not.toEqual(before);
  await inspect(page,'phone-support-leg');
  await page.addStyleTag({content:'.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}'});
  await audit(page);
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await inspect(page,'forced-colors-support-leg');await audit(page);
  await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
  await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});
  await expect.poll(async()=>(await pose(page))?.contrast).toBe(true);
  await inspect(page,'contrast-support-leg');await audit(page);
  await page.getByRole('tab',{name:/Depth/}).click();
  await expect(camera).toHaveCount(0);
});


test('completed recovery poses can be reviewed across ages without losing progress',async({page})=>{
  await mount(page);
  for(const [label,age] of [[/^Adult —/,'adult'],[/^Child —/,'child'],[/^Infant —/,'infant']] as const) {
    await page.getByRole('tab',{name:/Depth/}).click();await page.getByRole('button',{name:label}).click();
    await page.getByRole('tab',{name:/Recovery position/}).click();
    const reset=page.getByRole('button',{name:/Start again/});if(await reset.count())await reset.click();
    const steps=page.locator('.fr-body3d-content ol button');
    for(let i=0;i<8;i++)await steps.nth(i).click();
    const select=page.getByLabel('Pose to inspect',{exact:true});
    await expect(select.locator('option')).toHaveCount(9);
    const canvas=await page.locator('#wrap canvas').elementHandle();
    await select.selectOption('4');await expect.poll(async()=>(await pose(page))?.roll).toBe(0);
    await expect(page.getByText('Positioned — now keep watching',{exact:true})).toHaveCount(0);
    await inspect(page,age+'-review-raised-knee');
    await page.getByRole('button',{name:'Next pose',exact:true}).click();
    await expect.poll(async()=>(await pose(page))?.roll).toBeGreaterThan(.8);
    await inspect(page,age+'-review-roll');
    await page.getByRole('button',{name:'Previous pose',exact:true}).click();
    await expect(select).toHaveValue('4');await inspect(page,age+'-review-before-roll');
    await page.getByRole('button',{name:'Latest completed pose',exact:true}).click();
    await expect(select).toHaveValue('8');await expect(steps).toHaveCount(8);
    for(let i=0;i<8;i++)await expect(steps.nth(i)).toBeDisabled();
    await expect(page.getByText('Positioned — now keep watching',{exact:true})).toBeVisible();
    expect(await canvas!.evaluate(el=>el===document.querySelector('#wrap canvas'))).toBe(true);
    await page.getByRole('button',{name:'Whole manikin',exact:true}).click();
    await page.locator('.fr-body3d-stage').screenshot({path:report+'/'+age+'-review-completed.png'});
  }
  await audit(page);
});

test('pose review works by keyboard on a phone and resumes from an earlier pose',async({page})=>{
  await mount(page,320);await page.getByRole('tab',{name:/Recovery position/}).click();
  const steps=page.locator('.fr-body3d-content ol button');for(let i=0;i<4;i++)await steps.nth(i).click();
  const select=page.getByLabel('Pose to inspect',{exact:true});await expect(select.locator('option')).toHaveCount(5);
  await select.focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(select).toHaveValue('0');
  await expect(page.getByRole('button',{name:'Previous pose',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Next pose',exact:true}).focus();await page.keyboard.press('Enter');await expect(select).toHaveValue('1');
  await select.selectOption('2');await steps.nth(4).click();await expect(select).toHaveValue('5');
  await expect(select.locator('option')).toHaveCount(6);await expect(steps.nth(5)).toBeEnabled();
  await select.selectOption('4');await inspect(page,'phone-review-raised-knee');
  await page.locator('.fr-recovery-review').screenshot({path:report+'/phone-review-controls.png'});
  await page.addStyleTag({content:'.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}'});
  await audit(page);
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await audit(page);
  await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
  await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});
  await expect.poll(async()=>(await pose(page))?.contrast).toBe(true);await audit(page);
  await page.getByRole('button',{name:/Start again/}).click();await expect(select).toHaveCount(0);await expect(steps.nth(0)).toBeEnabled();
});
