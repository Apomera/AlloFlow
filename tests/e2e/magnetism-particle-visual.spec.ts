import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {GlHarness} from './helpers/stem_gl_harness';
const physics=createRequire(join(process.cwd(),'package.json'))('./stem_lab/stem_tool_magnetism.js');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_magnetism.js',toolId:'magnetism',width:1080,height:1000,layout:'document',appStyles:true});
const before=process.env.MAG_PARTICLE_STAGE==='before';
const dir=join(process.cwd(),'tmp','magnetism-particle-visual-20261101',process.env.MAG_PARTICLE_STAGE==='mutant'?'mutant':'');
test.describe.configure({mode:'serial',timeout:120000,retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(dir,{recursive:true});});
test.afterAll(async()=>await harness.stop());
test.afterEach(async({page})=>await harness.destroy(page));
for(const p of [{name:'desktop',width:1080,theme:'dark'},{name:'phone',width:390,theme:'dark'},{name:'light',width:1080,theme:'light'},{name:'forced-colors',width:320,theme:'contrast'}])test('readable particle direction and radius · '+p.name,async({page})=>{
  test.skip(before&&p.theme!=='dark');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:p.width,height:1000});await page.emulateMedia({reducedMotion:'reduce',forcedColors:p.theme==='contrast'?'active':'none'});
  await harness.mount(page,{magnetism:{tab:'motor',motorMode:'particle',chargeView:'2d',chargeSign:1,chargeField:1,chargeSpeed:5,chargeB:4,learningMode:'guided',labShellPanel:'',notebookOpen:false,notebookTrials:[],charge3dReference:null}},undefined,{expectCanvas:false});
  await page.locator('#wrap').evaluate((el,w)=>(el as HTMLElement).style.width=w+'px',p.width);
  if(p.theme!=='dark')await page.evaluate(theme=>{const colors=theme==='light'?{panel:'#f8fafc',deeper:'#e2e8f0',text:'#0f172a','text-soft':'#475569',border:'#cbd5e1'}:{panel:'#000000',deeper:'#000000',text:'#ffff00','text-soft':'#ffff00',border:'#ffff00'};const el=document.getElementById('wrap')!;el.setAttribute('data-stem-tool-shell','magnetism');document.body.classList.add('theme-'+theme);for(const[k,v]of Object.entries(colors))el.style.setProperty('--allo-stem-'+k,v);},p.theme);
  const card=page.getByRole('region',{name:'Charged-particle beam — Lorentz force',exact:true});await expect(card).toBeVisible();
  if(before){await card.locator('svg[role="img"]').screenshot({path:join(dir,'before-'+p.name+'.png')});return;}
  const stage=card.locator('[data-particle-stage]');await expect(stage).toBeVisible();
  const state=()=>page.evaluate(()=>(window as any).__toolData.magnetism);
  async function correspond(){
    const s=await state(),direction=physics.chargedParticleBendDirection(s.chargeSign,s.chargeField),up=direction==='up';
    const points=physics.chargedParticleTrajectory(s.chargeSign,s.chargeField,s.chargeSpeed,s.chargeB,36).map((pt:any)=>(32+pt.x*1.35).toFixed(1)+','+(110-pt.y*.55).toFixed(1)).join(' ');
    await expect(stage.locator('[data-particle-path]')).toHaveAttribute('points',points);
    await expect(stage.locator('[data-particle-force]')).toHaveAttribute('y2',up?'66':'154');
    await expect(stage.locator('[data-particle-velocity]')).toHaveAttribute('x2','70');
    await expect(stage.locator('[data-particle-reading="bend"]')).toHaveText(up?'↑ Upward':'↓ Downward');
    await expect(stage.locator('[data-particle-reading="radius"]')).toHaveText((s.chargeSpeed/Math.max(.1,s.chargeB)).toFixed(2));
    await expect(stage.getByRole('img')).toHaveAttribute('aria-label',new RegExp('curving '+direction));
    const frame=(await stage.locator('[data-particle-plane]').getAttribute('viewBox'))!.split(' ').map(Number);
    for(const pair of points.split(' ')){const[x,y]=pair.split(',').map(Number);expect(x).toBeGreaterThan(frame[0]+2);expect(x).toBeLessThan(frame[0]+frame[2]-2);expect(y).toBeGreaterThan(frame[1]+2);expect(y).toBeLessThan(frame[1]+frame[3]-2);}
  }
  await correspond();await stage.screenshot({path:join(dir,p.name+'.png'),style:'.mag-root .mag-passport{visibility:hidden!important}'});
  const layout=await stage.evaluate(el=>{const box=el.getBoundingClientRect(),readout=el.querySelector('[data-particle-reading="radius"]')!;return{left:box.left,right:box.right,width:box.width,viewport:innerWidth,document:document.documentElement.scrollWidth,radiusFont:parseFloat(getComputedStyle(readout).fontSize)};});
  expect(layout.left).toBeGreaterThanOrEqual(-1);expect(layout.right).toBeLessThanOrEqual(p.width+1);expect(layout.document).toBeLessThanOrEqual(p.width+1);expect(layout.radiusFont).toBeGreaterThanOrEqual(20);
  if(p.name==='desktop'){await page.addScriptTag({path:join(process.cwd(),'desktop/web-app/node_modules/axe-core/axe.min.js')});const violations=await stage.evaluate(async el=>(await(window as any).axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));await writeFile(join(dir,'axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);}
  for(const[charge,field]of [[1,1],[-1,1],[-1,-1],[1,-1]]){await card.getByRole('button',{name:charge>0?'+ Positive':'− Negative',exact:true}).click();await card.getByRole('button',{name:field>0?'⊙ Out':'⊗ Into',exact:true}).click();await correspond();}
  for(const[speed,field]of [[2,8],[8,1]]){await card.getByRole('slider',{name:'Particle speed (v)',exact:true}).fill(String(speed));await card.getByRole('slider',{name:'Magnetic field strength (B)',exact:true}).fill(String(field));for(const[charge,direction]of [[1,1],[-1,1],[-1,-1],[1,-1]]){await card.getByRole('button',{name:charge>0?'+ Positive':'− Negative',exact:true}).click();await card.getByRole('button',{name:direction>0?'⊙ Out':'⊗ Into',exact:true}).click();await correspond();}if(speed===2)await stage.screenshot({path:join(dir,'strong-'+p.name+'.png'),style:'.mag-root .mag-passport{visibility:hidden!important}'});}
  await card.getByRole('button',{name:'− Negative',exact:true}).focus();await page.keyboard.press('Enter');await correspond();
  await stage.screenshot({path:join(dir,'reversed-'+p.name+'.png'),style:'.mag-root .mag-passport{visibility:hidden!important}'});
  const saved=await state();expect(saved.notebookTrials).toEqual([]);expect(saved.charge3dReference).toBeNull();expect(errors).toEqual([]);
  await writeFile(join(dir,p.name+'-layout.json'),JSON.stringify(layout,null,2));
});
