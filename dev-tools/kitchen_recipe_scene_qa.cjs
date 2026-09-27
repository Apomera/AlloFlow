const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-spatial-2026-09-26');fs.mkdirSync(out,{recursive:true});
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html';
const result={checks:[],accessibility:[],errors:[]};
(async()=>{const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});page.setDefaultTimeout(15000);page.on('pageerror',e=>result.errors.push(e.message));await page.goto(url);await page.locator('#sceneKitchenTool').waitFor();
 const current=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current);
 let camera='bench';
 async function view(id){camera=id;await page.locator('[data-view='+id+']').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();}
 async function project(pos){return page.evaluate(({id,pos})=>{const b=document.querySelector('#recipeScene canvas').getBoundingClientRect(),t=id==='prep'?[1.35,1.2,-1.43]:id==='pot'?[-1.1,1.4,-.45]:id==='pan'?[1.02,1.4,-.45]:[0,1,0],c=new THREE.PerspectiveCamera(38,b.width/b.height,.1,100);c.position.set(t[0]+(id==='bench'?6:2.3),id==='bench'?5.6:4.2,t[2]+(id==='bench'?7:3.2));c.lookAt(...t);c.updateMatrixWorld();const p=new THREE.Vector3(...pos).project(c);return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2};},{id:camera,pos});}
 async function drag(from,to,hold){await page.locator('#recipeScene').scrollIntoViewIfNeeded();const a=await project(from),b=await project(to);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:18});if(hold)await hold();await page.mouse.up();}
 async function tool(name){await page.locator('#sceneKitchenTool').selectOption(name);await page.locator('#recipeScene').scrollIntoViewIfNeeded();}
 await view('bench');await tool('move');await drag([-2.35,1.5,-1.35],[1.02,1.5,-.45]);assert.equal((await current()).pan.oil,true);assert.equal((await current()).log.at(-1).interaction,'scene-drag');
 await drag([-2.4,1.55,-.8],[-1.1,1.5,-.45]);assert.equal((await current()).pot.pasta,false);assert.equal((await current()).log.at(-1).accepted,false);
 result.checks.push('The actual 3D oil bottle moves into the pan; the pasta packet still obeys weighing and boiling prerequisites.');
 for(const a of ['wash','rinse'])await page.locator('[data-bench-action='+a+']').click();
 await view('prep');await tool('cut');let count=(await current()).log.length;
 await drag([.95125,1.285,-1.5],[1.2,1.285,-1.12]);assert.equal((await current()).log.length,count);
 for(let mm=5;mm<40;mm+=5){const x=.82+mm/40*1.05;await drag([x,1.285,-1.5],[x,1.285,-1.12]);}
 assert.deepEqual((await current()).prep.cuts,Array(8).fill(5));assert.equal((await current()).log.at(-1).interaction,'scene-cut');await page.locator('#useCuts').click();
 for(const a of ['dry','garlicPrep'])await page.locator('[data-bench-action='+a+']').click();await page.locator('#showPrepScale').click();await page.locator('#scaleAmount').fill('160');await page.locator('#scaleConfirm').click();console.log('3D transfers and seven knife strokes passed.');
 await page.locator('[data-bench=pot]').click();await page.locator('#handsShortcuts').evaluate(e=>e.open=true);await page.locator('[data-bench-action=fill]').click();await page.locator('#quickPotHeat').selectOption('3');await page.locator('#quickPanHeat').selectOption('2');
 for(let i=0;i<15&&(await current()).pot.temp<96;i++)await page.locator('#advance').click();assert.ok((await current()).pot.temp>=96);
 await view('bench');await tool('move');await drag([-2.4,1.55,-.8],[-1.1,1.5,-.45]);assert.equal((await current()).pot.pasta,true);
 await drag([.885,1.32,-1.43],[1.02,1.5,-.45]);assert.equal((await current()).pan.produce,true);
 await drag([-.12,1.34,-1.36],[1.02,1.5,-.45]);assert.equal((await current()).pan.garlic,true);
 result.checks.push('Seven straight 3D knife strokes create eight equal pieces; prepared produce, weighed pasta, and minced garlic transfer through the scene.');
 await view('pan');await tool('stir');let before=await current();const circle=[];for(let i=0;i<=40;i++)circle.push(await project([1.02+.42*Math.cos(i*2*Math.PI/38),1.5,-.45+.42*Math.sin(i*2*Math.PI/38)]));await page.mouse.move(circle[0].x,circle[0].y);await page.mouse.down();for(const p of circle.slice(1))await page.mouse.move(p.x,p.y);await page.mouse.up();let after=await current();assert.equal(after.log.at(-1).interaction,'scene-stir');assert.notDeepEqual(after.pan.pieces,before.pan.pieces);
 await page.locator('#advance').click();await page.locator('#advance').click();await view('pan');await tool('arrange');before=await current();const index=before.pan.pieces.map((p,i)=>({i,depth:p.x+p.z})).sort((a,b)=>b.depth-a.depth)[0].i,p=before.pan.pieces[index];const pos=await project([1.02+p.x,1.54,-.45+p.z]);await page.mouse.click(pos.x,pos.y);after=await current();assert.equal(after.log.at(-1).action,'flipPiece');assert.equal(after.log.at(-1).value,index);assert.equal(after.pan.pieces[index].down,1-before.pan.pieces[index].down);
 await drag([1.02+p.x,1.54,-.45+p.z],[1.57,1.5,-.45]);after=await current();assert.equal(after.log.at(-1).action,'movePiece');assert.equal(after.pan.pieces[index].x,.55);assert.equal(after.pan.pieces[index].z,0);
 result.checks.push('A full circle in the 3D pan redistributes and turns food; tapping and dragging an individual piece changes its surface and position.');
 await page.locator('[data-bench=pot]').click();await page.locator('#handsShortcuts').evaluate(e=>e.open=true);await page.locator('[data-bench-action=reserve]').click();await view('bench');await tool('pour');const waterBefore=(await current()).pan.waterAdded;
 await drag([-1.2,1.43,1.06],[1.02,1.5,-.45],async()=>{await page.waitForFunction(n=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current.pan.waterAdded>=n,waterBefore+30,{polling:10});});
 after=await current();assert.ok(after.pan.waterAdded>=waterBefore+30);assert.equal(after.log.at(-1).interaction,'scene-pour');const poured=after.pan.waterAdded;await page.waitForTimeout(350);assert.equal((await current()).pan.waterAdded,poured);
 await view('pan');await page.screenshot({path:path.join(out,'direct-pan-desktop.png')});
 result.checks.push('Holding the actual saved-water jug over the pan transfers water; release stops flow and preserves the transferred amount.');
 await tool('camera');const logCount=(await current()).log.length;await drag([1.02,1.5,-.45],[1.3,1.5,-.4]);assert.equal((await current()).log.length,logCount);
 await page.locator('[data-bench=pan]').click();await page.locator('#panPieceChoice').selectOption('0');before=await current();await page.locator('#turnPanPiece').focus();await page.keyboard.press('Enter');assert.equal((await current()).pan.pieces[0].down,1-before.pan.pieces[0].down);await page.locator('[data-piece-dx="-12"]').click();assert.equal((await current()).log.at(-1).action,'movePiece');
 await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});async function audit(label){const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));result.accessibility.push({label,issues});assert.deepEqual(issues,[]);}
 await audit('3D tools and accessible individual-piece controls');await page.setViewportSize({width:320,height:844});await page.locator('#textView').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await audit('320px text view');await page.locator('#panSurfaceTitle').scrollIntoViewIfNeeded();await page.locator('.pan-surface-panel').screenshot({path:path.join(out,'piece-controls-mobile.png')});
 result.checks.push('Camera gestures do not cook; keyboard piece controls share model effects; desktop and 320px text view pass automated accessibility checks.');
 assert.deepEqual(result.errors,[]);result.pass=true;
}catch(e){if(page){result.failure=e.message;result.status=await page.locator('#sceneActionStatus').innerText().catch(()=>null);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}throw e;}finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));await browser.close();}console.log(JSON.stringify(result,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
