import {test,expect} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-everest');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js']});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
const canvas=(page:any)=>page.locator('[data-atlas-ready]');
async function mount(page:any,phone=false){
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
 const diagnostics:string[]=[];const log=(m:any)=>{if(m.type()==='error')diagnostics.push(m.text());};page.on('console',log);page.on('pageerror',e=>diagnostics.push(e.message));
 try{await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');}catch(e){throw new Error(String(e)+'\n'+diagnostics.join('\n'));}finally{page.off('console',log);}
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);}
async function ready(page:any){await expect(canvas(page)).toHaveAttribute('data-atlas-terrain','ready');}
async function feature(page:any,name:string,id:string){await page.locator('.sx-details').getByRole('button',{name,exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail',id);}
async function terrain(page:any){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
 r.scene.traverse((n:any)=>{if(n.userData.itemId==='everest')root=n;});const g=root.userData.model,land=g.userData.everest.land,p=land.geometry.attributes.position;
 let max=-Infinity,min=Infinity;for(let i=0;i<p.count;i++){max=Math.max(max,p.getY(i));min=Math.min(min,p.getY(i));}
 const aim=g.worldToLocal(new T.Vector3().fromArray(r.canvas.dataset.atlasAim.split(',').map(Number)));
 return {scale:root.scale.x,normalization:g.scale.y,offset:g.position.y,max,min,vertices:p.count,width:land.geometry.boundingBox.max.x-land.geometry.boundingBox.min.x,datum:g.userData.everest.datum.visible,aim:aim.toArray()};
});}
test('real elevation preserves metres, supports ridge inspection and restores the saved light and viewpoint',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);await fly(page,'everest');await ready(page);
 await expect(canvas(page)).toHaveAttribute('data-atlas-habitat','alpine');const state=await terrain(page);
 expect(state.vertices).toBe(58081);expect(state.normalization).toBe(1);expect(state.offset).toBe(-.5);
 expect(state.max*8849).toBeCloseTo(8744,2);expect(state.min*8849).toBeCloseTo(4477,2);expect(state.width*8849).toBeCloseTo(18000,2);
 await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-overview.png')});expect(looksBlank(await harness.glPixels(page))).toBe(false);
 await feature(page,'The summit ridge','everest-summit');await page.getByRole('button',{name:'Eastern light',exact:true}).click();
 await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-summit.png')});const summit=await terrain(page);expect(summit.aim[1]*8849).toBeGreaterThan(8650);
 const saved=await canvas(page).evaluate((c:HTMLElement)=>({zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}));
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('The valleys are already above sea level.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await feature(page,'Height above sea level','everest-datum');expect((await terrain(page)).datum).toBe(true);
 await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-height-datum.png')});
 await page.getByRole('button',{name:'Western light',exact:true}).click();await fly(page,'moon');
 await book.locator('[data-observation="everest:everest-summit"]').getByRole('button',{name:/^Return to/}).click();await ready(page);
 await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}))).toEqual(saved);
 await expect(page.getByRole('slider',{name:'Light direction',exact:true})).toHaveValue('155');expect((await terrain(page)).datum).toBe(false);expect(errors).toEqual([]);
});
test('Earth entry, accessible viewpoints and return work on a narrow phone',async({page})=>{
 await mount(page,true);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','ready');
 await feature(page,'Everest & the Himalaya','himalaya');const earth=await canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}));
 await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();await ready(page);
 await feature(page,'Valleys below the summit','everest-valley');await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-phone-valley.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await feature(page,'An atlas from above','everest-overview');await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-phone-overhead.png')});
 await page.getByRole('button',{name:'Return to The Earth',exact:true}).click();
 await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}))).toEqual(earth);await expect(canvas(page)).toBeFocused();
});
test('a failed or corrupt elevation asset disables landmarks and retry recovers',async({page})=>{
 let attempt=0;await page.route('**/everest-elevation.json',route=>{attempt++;return attempt===1?route.fulfill({contentType:'application/json',body:'{"version":1,"width":241,"elevations":[]}'}):route.continue();});
 await mount(page);await fly(page,'everest');await expect(canvas(page)).toHaveAttribute('data-atlas-terrain','failed');
 await expect(page.locator('.sx-details').getByRole('button',{name:'The summit ridge',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Retry terrain',exact:true}).click();await ready(page);await feature(page,'The eastern face','everest-east');expect(attempt).toBe(2);
});
test('WebGL 1 renders terrain and comparisons keep height above the datum on one shared scale',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(type==='webgl2')return null;return(get as any).call(this,type,...args);};});
 await mount(page);await fly(page,'everest');await ready(page);await feature(page,'The eastern face','everest-east');
 expect(looksBlank(await harness.glPixels(page))).toBe(false);
 const compare=page.locator('.sx-comparison-workbench');await compare.locator(':scope > summary').click();
 await compare.getByRole('combobox',{name:'First thing',exact:true}).selectOption('everest');await compare.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('earth');await compare.getByRole('button',{name:'Compare them',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-projection','orthographic');const state=await terrain(page);
 expect(state.scale/3).toBeCloseTo(8849/12742000,10);expect(state.normalization).toBe(1);expect(state.datum).toBe(true);expect(errors).toEqual([]);
});

test('batched visibility updates keep the canvas live after a quick scroll away and back',async({page})=>{
 await page.addInitScript(()=>{
   const w=window as any,Original=window.IntersectionObserver;
   w.IntersectionObserver=new Proxy(Original,{construct(target,args){
     const observer=Reflect.construct(target,args),observe=observer.observe.bind(observer);
     observer.observe=function(element:HTMLElement){
       if(element.tagName==='CANVAS'&&element.getAttribute('aria-label')?.startsWith('Interactive scale atlas')){
         w.__deliverScaleVisibility=()=>args[0]([{target:element,isIntersecting:false},{target:element,isIntersecting:true}],observer);
       }
       return observe(element);
     };
     return observer;
   }});
 });
 await mount(page,true);await fly(page,'everest');await ready(page);
 await feature(page,'Valleys below the summit','everest-valley');
 await canvas(page).scrollIntoViewIfNeeded();
 await page.evaluate(()=>(window as any).__deliverScaleVisibility());
 await page.getByRole('button',{name:'Next landmark',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-detail','everest-overview');
});

test('free terrain exploration tracks map, keyboard and scene picks and restores a notebook position',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await mount(page);await fly(page,'everest');await ready(page);await feature(page,'Explore freely','everest-explore');
 const map=page.getByRole('group',{name:'Interactive terrain map',exact:true}),position=page.locator('.sx-terrain-position');
 await map.press('Home');await map.press('ArrowRight');await map.press('Shift+ArrowDown');
 await expect(position).toHaveAttribute('data-terrain-east','250');await expect(position).toHaveAttribute('data-terrain-north','-100');
 await expect.poll(async()=>Math.round((await terrain(page)).aim[0]*8849)).toBeCloseTo(250,0);
 await map.click({position:{x:39,y:117}});const before=await position.getAttribute('data-terrain-east');
 await page.getByRole('button',{name:'Move east 250 metres',exact:true}).click();
 await expect(position).toHaveAttribute('data-terrain-east',String(Number(before)+250));
 await canvas(page).scrollIntoViewIfNeeded();const viewport=(await canvas(page).boundingBox())!;
 const prior=await position.textContent();await page.mouse.click(viewport.x+viewport.width/2+35,viewport.y+viewport.height/2);
 await expect(position).not.toHaveText(prior!);
 const saved=await canvas(page).evaluate((c:HTMLElement)=>({aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom}));
 const coords=await position.textContent(),book=page.getByRole('region',{name:'Field notebook',exact:true});
 await book.getByRole('textbox').fill('A viewpoint I found by exploring the terrain.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await fly(page,'moon');await book.locator('[data-observation="everest:everest-explore"]').getByRole('button',{name:/^Return to/}).click();await ready(page);
 await expect(position).toHaveText(coords!);
 await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom}))).toEqual(saved);
 await page.locator('.sx-stage').screenshot({path:path.resolve('reports/scale-explorer-traverse/everest-explore.png')});
 await map.press('Escape');await expect(canvas(page)).toHaveAttribute('data-atlas-detail','everest-overview');
 expect(errors).toEqual([]);
});

test('phone terrain map supports dragging, bounded movement and a readable elevation panel',async({page})=>{
 await mount(page,true);await fly(page,'everest');await ready(page);await feature(page,'Explore freely','everest-explore');
 const map=page.getByRole('group',{name:'Interactive terrain map',exact:true}),position=page.locator('.sx-terrain-position');
 await map.scrollIntoViewIfNeeded();const box=(await map.boundingBox())!;
 await page.mouse.move(box.x+box.width*.3,box.y+box.height*.4);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.7,box.y+box.height*.8,{steps:6});await page.mouse.up();
 expect(Number(await position.getAttribute('data-terrain-east'))).toBeGreaterThan(3000);
 expect(Number(await position.getAttribute('data-terrain-north'))).toBeLessThan(-4000);
 await map.press('Home');for(let i=0;i<12;i++)await map.press('Shift+ArrowRight');
 await expect(position).toHaveAttribute('data-terrain-east','9000');await expect(page.getByRole('button',{name:'Move east 250 metres',exact:true})).toBeDisabled();
 await map.press('Home');
 await expect(page.locator('[data-terrain-elevation]')).toContainText('m');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const height=await canvas(page).evaluate((c:HTMLElement)=>c.getBoundingClientRect().height);expect(height).toBeGreaterThan(350);
 await page.locator('.sx-stage').screenshot({path:path.resolve('reports/scale-explorer-traverse/everest-explore-phone.png')});
 await page.getByRole('button',{name:'Whole landscape',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','everest-overview');await expect(canvas(page)).toBeFocused();
});

test('terrain camera glides without losing its orbit and navigation recovers after an interrupted drag',async({page})=>{
 await mount(page);await fly(page,'everest');await ready(page);await feature(page,'Explore freely','everest-explore');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Pause ambience',exact:true}).click();
 await canvas(page).scrollIntoViewIfNeeded();const box=(await canvas(page).boundingBox())!;
 await page.mouse.move(box.x+box.width*.55,box.y+box.height*.65);await page.mouse.down();await page.mouse.move(box.x+box.width*.62,box.y+box.height*.65,{steps:6});await page.mouse.up();
 const yaw=await canvas(page).getAttribute('data-atlas-yaw'),map=page.getByRole('group',{name:'Interactive terrain map',exact:true});
 await map.press('Home');await map.press('ArrowRight');
 await expect.poll(async()=>Math.abs((await terrain(page)).aim[0]*8849-250)).toBeLessThan(2);
 await expect(canvas(page)).toHaveAttribute('data-atlas-yaw',yaw!);
 const b=(await map.boundingBox())!;await page.mouse.move(b.x+b.width*.35,b.y+b.height*.4);await page.mouse.down();await page.keyboard.press('Escape');await page.mouse.up();
 await expect(canvas(page)).toHaveAttribute('data-atlas-detail','everest-overview');await feature(page,'Explore freely','everest-explore');
 await map.click({position:{x:40,y:40}});expect(Number(await page.locator('.sx-terrain-position').getAttribute('data-terrain-east'))).toBeLessThan(-3000);
});
