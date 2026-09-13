import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000 });
test.use({ video: 'off', trace: 'off' });
const report = 'reports/dinolab-3d-size-reference';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true,
  probes: "var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__sizeScene=s;window.__sizeCamera=c;window.__sizeRenderer=r;return render(s,c);};return r;};" });
test.beforeAll(async () => { fs.mkdirSync(report, {recursive:true}); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({page}) => harness.destroy(page));
async function settle(page) { await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))); }
async function mount(page, species, state = {}) {
  await page.setViewportSize({width:1180,height:920}); await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,
    field3dWorkflowStarted:false,field3dShowBody:true,field3dShowSkeleton:false,field3dShowHuman:false,field3dShowEvidence:true,field3dBodyOpacity:100,...state}},undefined,{expectCanvas:false});
  const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');
  await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
  await page.evaluate(() => {document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
  await expect.poll(() => page.evaluate(() => !!(window as any).__sizeScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page, view='size') {
  return page.evaluate(view => {
    const w=window as any,T=w.THREE,s=w.__sizeScene,c=w.__sizeCamera,r=w.__sizeRenderer,m=s.getObjectByName('dinolab-specimen');
    const g=m.getObjectByName('dinolab-size-reference'),tray=m.getObjectByName('dinolab-fossil-tray');
    s.updateMatrixWorld(true);c.updateMatrixWorld(true);
    const b=view==='full'?m.userData.overviewBounds:m.userData.studyBounds[view];let outside=0,invalid=0;
    if(b)for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){
      const p=new T.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(c);
      if(!Number.isFinite(p.length()))invalid++;if(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))>1.001)outside++;
    }
    function axis(name){const base=g?.getObjectByName('size-'+name+'-baseline');if(!base)return null;
      const a=new T.Vector3().fromArray(base.userData.dinoReferenceStart),b=new T.Vector3().fromArray(base.userData.dinoReferenceEnd);
      return {span:a.distanceTo(b),worldSpan:a.clone().applyMatrix4(g.matrixWorld).distanceTo(b.clone().applyMatrix4(g.matrixWorld)),start:a.toArray(),end:b.toArray(),geometry:base.geometry.parameters.height,
        ticks:g.children.filter(p=>p.name==='size-'+name+'-tick').map(p=>p.userData.dinoMeters)};}
    const labels=g?.children.filter(p=>p.isSprite&&p.visible&&g.visible).map(p=>({text:p.userData.dinoLabel,axis:p.userData.dinoMeasurement,endpoint:p.userData.dinoMeasurementEndpoint}))||[];
    return {guides:!!g,visible:g?.visible,parent:g?.parent.name,length:axis('length'),height:axis('height'),lengthScale:g?.userData.dinoLength,heightScale:g?.userData.dinoHeight,
      labels,surveyVisible:s.getObjectByName('dinolab-survey-decorations').visible,outside,invalid,rotation:m.rotation.y,trayVisible:tray?.visible,human:!!m.getObjectByName('human-scale-reference'),bounds:b,
      memory:{...r.info.memory},errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
  },view);
}
function check(result){expect(result.errors).toEqual([]);expect(result.lost).toBe(false);expect(result.shaderFailures).toBe(0);expect(result.invalid).toBe(0);expect(result.outside).toBe(0);
  expect(result.guides).toBe(true);expect(result.parent).toBe('dinolab-specimen');
  for(const axis of ['length','height']) {const a=result[axis],plan=result[axis+'Scale'];if(!plan){expect(a).toBeNull();continue;}expect(a.span).toBeCloseTo(plan.span,9);expect(a.worldSpan).toBeCloseTo(plan.span,9);expect(a.geometry).toBeCloseTo(plan.span,9);
    expect(a.ticks).toEqual(plan.ticks.map(t=>t.meters));expect(a.ticks.length).toBeLessThanOrEqual(8);}
}
for(const species of ['anchiornis','microraptor','tyrannosaurus','brachiosaurus','mosasaurus'])test(species+' has calibrated rotating size references',async({page})=>{
  await mount(page,species);check(await inspect(page,'full'));
  const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));
  const button=page.getByRole('button',{name:'Study size reference',exact:true});await button.focus();await page.keyboard.press('Enter');await settle(page);
  await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('.dinolab-size-controls')).toContainText('catalog estimates');
  if(species==='mosasaurus') await expect(page.locator('.dinolab-size-controls')).toContainText('height not listed');
  const result=await inspect(page);check(result);expect(result.visible).toBe(true);expect(result.surveyVisible).toBe(false);expect(result.labels.length).toBeGreaterThanOrEqual(2);
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-size.png'});
  const canvas=page.locator('.dinolab-3d-canvas');await canvas.focus();await page.keyboard.press('ArrowRight');await settle(page);
  const rotated=await inspect(page);check(rotated);expect(rotated.rotation).not.toBe(result.rotation);
  for(const region of ['head','body','tail']){await page.getByRole('button',{name:'Study '+region+' details',exact:true}).click();await settle(page);expect((await inspect(page,region)).visible).toBe(false);}
  await canvas.focus();await page.keyboard.press('Home');await settle(page);const home=await inspect(page,'full');check(home);expect(home.visible).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);
  fs.writeFileSync(report+'/'+species+'.json',JSON.stringify({result,rotated,home},null,2));
});

test('phone reference fits human comparison and hides interval labels',async({page})=>{
  await mount(page,'anchiornis',{field3dShowHuman:true,field3dShowEvidence:false});
  await page.getByRole('button',{name:'Study size reference',exact:true}).click();await settle(page);
  const desktop=await inspect(page);check(desktop);expect(desktop.human).toBe(true);
  await page.setViewportSize({width:390,height:844});await settle(page);
  const canvasRect=await page.locator('.dinolab-3d-canvas').boundingBox();
  for(const selector of ['.dinolab-fit-model','.dinolab-3d-camera-readout','.dinolab-3d-status']) { const box=await page.locator(selector).boundingBox();expect(box!.y).toBeGreaterThanOrEqual(canvasRect!.y+canvasRect!.height-1); }
  const phone=await inspect(page);check(phone);expect(phone.labels.some(p=>!/^0 (cm|m)$/.test(p.text))).toBe(true);expect(phone.labels.every(p=>p.endpoint)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.dinolab-3d-shell').screenshot({path:report+'/anchiornis-human-mobile.png'});
  await page.locator('.dinolab-3d-controls-disclosure > summary').click();
  await page.getByRole('button',{name:'Overhead camera view',exact:true}).click();await settle(page);check(await inspect(page));
  fs.writeFileSync(report+'/phone.json',JSON.stringify({desktop,phone},null,2));
});

test('size study separates the fossil tray and resets when reference layers disappear',async({page})=>{
  await mount(page,'microraptor',{field3dWorkflowStarted:true,field3dScanLogged:{skull:true,shoulder:true,hip:true},field3dScanSpecies:'microraptor',field3dAssemblyPlaced:{},field3dAssemblySpecies:'microraptor'});
  await page.getByRole('button',{name:'Study size reference',exact:true}).click();await settle(page);
  const size=await inspect(page);check(size);expect(size.trayVisible).toBe(false);
  await page.getByRole('button',{name:'Study fossil tray',exact:true}).click();await settle(page);
  const tray=await inspect(page,'tray');expect(tray.visible).toBe(false);expect(tray.trayVisible).toBe(true);
  await page.getByRole('button',{name:'Study size reference',exact:true}).click();
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);
  await expect(page.getByRole('button',{name:'Study size reference',exact:true})).toHaveAttribute('aria-pressed','true');check(await inspect(page));
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);
  await expect(page.getByRole('button',{name:'Study size reference',exact:true})).toHaveCount(0);
  expect((await inspect(page,'full')).guides).toBe(false);
  await expect(page.getByRole('button',{name:'Study whole animal',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('label preferences and habitat keep a readable phone size reference',async({page})=>{
  await mount(page,'microraptor');
  await page.getByRole('button',{name:'Study size reference',exact:true}).click();await settle(page);
  await page.getByLabel('Model labels',{exact:true}).selectOption('all');await settle(page);
  const all=await inspect(page);check(all);expect(all.labels.some(p=>!p.endpoint)).toBe(true);
  await page.getByLabel('Model labels',{exact:true}).selectOption('off');await settle(page);expect((await inspect(page)).labels).toHaveLength(0);
  await page.getByLabel('Model labels',{exact:true}).selectOption('key');await settle(page);
  expect((await inspect(page)).labels.every(p=>p.endpoint)).toBe(true);
  await page.getByRole('group',{name:'Scene lighting',exact:true}).getByRole('button',{name:'Habitat',exact:true}).click();await settle(page);
  const habitat=await inspect(page);check(habitat);expect(habitat.length.start[1]).toBeCloseTo(.065,8);
  await expect(page.getByRole('button',{name:'Study size reference',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.setViewportSize({width:320,height:844});await settle(page);
  await page.getByLabel('Model labels',{exact:true}).selectOption('all');await settle(page);
  const phone=await inspect(page);check(phone);expect(phone.labels.every(p=>p.endpoint)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.dinolab-3d-shell').screenshot({path:report+'/microraptor-habitat-mobile.png'});
  fs.writeFileSync(report+'/labels-habitat.json',JSON.stringify({all,habitat,phone},null,2));
});
